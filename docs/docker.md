# Docker Deployment Guide

Complete guide for building and deploying the Fund-My-Cause frontend using Docker.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.20+ (bundled with Docker Desktop)
- A deployed Soroban crowdfund contract ID and RPC endpoint

---

## Quick Start

```bash
# 1. Copy and fill in environment variables
cp apps/interface/.env.example apps/interface/.env.local

# 2. Build and start
docker compose up --build

# App is available at http://localhost:3000
```

---

## Environment Variable Setup

All runtime configuration is injected via environment variables. The container reads them from two sources, in order of precedence:

1. `apps/interface/.env.local` — loaded via `env_file` in `docker-compose.yml`
2. Shell environment / CI secrets — override individual variables inline

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONTRACT_ID` | Crowdfund contract address | `CAABC...XYZ` |
| `NEXT_PUBLIC_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Stellar network passphrase | `Test SDF Network ; September 2015` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_HORIZON_URL` | Horizon REST API endpoint | `https://horizon-testnet.stellar.org` |
| `NEXT_PUBLIC_PINATA_API_KEY` | Pinata IPFS API key (for image uploads) | — |
| `NEXT_PUBLIC_PINATA_SECRET_API_KEY` | Pinata IPFS secret key | — |
| `NEXT_PUBLIC_FEATURED_CAMPAIGNS` | Comma-separated featured campaign IDs | — |

### Minimal `.env.local` for Testnet

```bash
NEXT_PUBLIC_CONTRACT_ID=<YOUR_CROWDFUND_CONTRACT_ID>
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
```

### Mainnet `.env.local`

```bash
NEXT_PUBLIC_CONTRACT_ID=<YOUR_MAINNET_CONTRACT_ID>
NEXT_PUBLIC_RPC_URL=https://mainnet.sorobanrpc.com
NEXT_PUBLIC_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
NEXT_PUBLIC_HORIZON_URL=https://horizon.stellar.org
```

> **Security:** Never commit `.env.local` to version control. It is already listed in `.gitignore`. In CI/CD, inject secrets via your platform's secret manager (GitHub Actions secrets, AWS Secrets Manager, etc.) rather than storing them in files.

---

## docker-compose.yml Explained

```yaml
services:
  interface:
    build:
      context: .                              # Repo root — needed for monorepo npm workspaces
      dockerfile: apps/interface/Dockerfile
    ports:
      - "3000:3000"                           # host:container
    environment:
      - NODE_ENV=production
      # Defaults shown; overridden by .env.local values below
      - NEXT_PUBLIC_SOROBAN_RPC_URL=${NEXT_PUBLIC_SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}
      - NEXT_PUBLIC_CONTRACT_ID=${NEXT_PUBLIC_CONTRACT_ID:-}
      - NEXT_PUBLIC_NETWORK_PASSPHRASE=${NEXT_PUBLIC_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}
    env_file:
      - apps/interface/.env.local             # Loaded last; values here win over environment: block
```

Key points:

- **Build context is the repo root** because `npm ci` needs the root `package.json` and `package-lock.json` to resolve workspace dependencies.
- The `environment:` block provides fallback defaults so the container starts even without a `.env.local` (useful for CI smoke tests).
- `env_file` values override the `environment:` block, so your local file always takes precedence.

### Common Compose Commands

```bash
# Build and start in foreground (see logs)
docker compose up --build

# Start in background
docker compose up --build -d

# View logs
docker compose logs -f interface

# Stop and remove containers
docker compose down

# Rebuild without cache
docker compose build --no-cache
```

---

## Multi-Stage Build

The `Dockerfile` uses a two-stage build to produce a minimal production image.

```dockerfile
# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies using the lockfile for reproducible builds
COPY package.json package-lock.json ./
COPY apps/interface/package.json ./apps/interface/
RUN npm ci

# Copy source and build Next.js in standalone output mode
COPY apps/interface ./apps/interface
RUN npm run build --workspace=apps/interface

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Only the standalone output is copied — no node_modules, no source
COPY --from=builder /app/apps/interface/.next/standalone ./
COPY --from=builder /app/apps/interface/.next/static     ./apps/interface/.next/static
COPY --from=builder /app/apps/interface/public           ./apps/interface/public

EXPOSE 3000
CMD ["node", "apps/interface/server.js"]
```

### Why standalone output?

Next.js `output: 'standalone'` (configured in `next.config.js`) traces and bundles only the files actually used at runtime. The result:

| | Full build | Standalone |
|---|---|---|
| Typical image size | ~1 GB | ~150–250 MB |
| `node_modules` in runner | All deps | Only used deps |
| Cold-start time | Slower | Faster |

The builder stage is discarded after the copy — it never appears in the final image, so build tools, dev dependencies, and source files are not shipped to production.

---

## Health Check Configuration

Docker does not know whether the Next.js server is ready to serve traffic. Add a health check so orchestrators (Compose, Kubernetes, ECS) can wait for readiness before routing requests.

### In docker-compose.yml

```yaml
services:
  interface:
    build:
      context: .
      dockerfile: apps/interface/Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - apps/interface/.env.local
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s   # Give Next.js time to boot before first check
```

`wget` is available in the `node:20-alpine` base image without installing anything extra. Alternatively use `curl` if you add it to the runner stage:

```dockerfile
RUN apk add --no-cache curl
```

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/"]
```

### Checking health status

```bash
docker compose ps          # Shows health column
docker inspect <container> --format='{{.State.Health.Status}}'
```

---

## Production Deployment Considerations

### 1. Never bake secrets into the image

`NEXT_PUBLIC_*` variables are embedded into the JavaScript bundle at **build time** by Next.js. This means:

- Do **not** pass production secrets as `ARG` or `ENV` in the Dockerfile.
- Build the image with placeholder values and inject real values at **runtime** via environment variables or a secrets manager.
- For truly sensitive values (API keys, private keys), use server-side environment variables (without the `NEXT_PUBLIC_` prefix) and access them only in API routes or server components — they will not be exposed to the browser.

### 2. Run as a non-root user

Add a dedicated user to the runner stage to reduce the blast radius of a container escape:

```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/interface/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/interface/.next/static     ./apps/interface/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/interface/public           ./apps/interface/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/interface/server.js"]
```

### 3. Pin the base image version

Replace `node:20-alpine` with a digest-pinned tag in production to prevent unexpected upstream changes:

```dockerfile
FROM node:20.19.1-alpine3.21 AS builder
```

### 4. Put a reverse proxy in front

The standalone Next.js server is not hardened for direct internet exposure. Place it behind **nginx** or a cloud load balancer to handle:

- TLS termination (HTTPS)
- HTTP → HTTPS redirect
- Gzip / Brotli compression
- Rate limiting
- Static asset caching headers

Minimal nginx snippet:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass         http://interface:3000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Add an `nginx` service to `docker-compose.yml` and make it depend on `interface`:

```yaml
services:
  interface:
    # ... existing config ...
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/ssl:ro
    depends_on:
      interface:
        condition: service_healthy
```

### 5. Resource limits

Set memory and CPU limits to prevent a single container from starving the host:

```yaml
services:
  interface:
    # ...
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          memory: 256M
```

### 6. Logging

By default Docker captures stdout/stderr. For production, configure a log driver to ship logs to a centralised system:

```yaml
services:
  interface:
    # ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Or use `driver: awslogs`, `driver: fluentd`, etc. for cloud environments.

---

## Building the Image Manually

If you need to build and push the image without Compose (e.g. in a CI pipeline):

```bash
# Build
docker build \
  -f apps/interface/Dockerfile \
  -t fund-my-cause:latest \
  .

# Run locally
docker run -p 3000:3000 \
  --env-file apps/interface/.env.local \
  fund-my-cause:latest

# Tag and push to a registry
docker tag fund-my-cause:latest ghcr.io/<org>/fund-my-cause:latest
docker push ghcr.io/<org>/fund-my-cause:latest
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Build fails with `Cannot find module` | Root `package-lock.json` out of sync | Run `npm install` locally, commit the updated lockfile |
| Container starts but app shows blank page | `NEXT_PUBLIC_CONTRACT_ID` not set | Check `.env.local` exists and has the correct value |
| `EACCES` permission error on startup | Files owned by root in runner stage | Add the non-root user snippet from the production section above |
| Health check stays `starting` | Next.js taking >15 s to boot | Increase `start_period` in the healthcheck config |
| Port 3000 already in use | Another process on the host | Change host port: `"3001:3000"` in `docker-compose.yml` |
