# CI/CD Setup and Workflows

This document explains the continuous integration and deployment setup for Fund-My-Cause.

## Overview

The project has two GitHub Actions workflows:

| Workflow | File | Triggers |
|---|---|---|
| Rust CI | `.github/workflows/rust_ci.yml` | Push/PR to `main` |
| Frontend CI | `.github/workflows/frontend_ci.yml` | Push/PR to `main` |

Both workflows run on `ubuntu-latest` and are independent — they run in parallel on each push or pull request.

## Rust CI

**File:** `.github/workflows/rust_ci.yml`

```yaml
name: Rust CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown
      - name: Build contracts
        run: cargo build --release --target wasm32-unknown-unknown
      - name: Run tests
        run: cargo test --workspace
```

### Steps Explained

**`dtolnay/rust-toolchain@stable`** — Installs the stable Rust toolchain and adds the `wasm32-unknown-unknown` target, which is required to compile Soroban contracts to WebAssembly.

**`cargo build --release --target wasm32-unknown-unknown`** — Compiles all contracts in the workspace to optimized WASM. The release profile in `Cargo.toml` is configured for minimal binary size:
- `opt-level = "z"` — optimize for size
- `lto = true` — link-time optimization
- `strip = "symbols"` — remove debug symbols
- `codegen-units = 1` — single codegen unit for better optimization

**`cargo test --workspace`** — Runs all unit and integration tests across every crate in the workspace. This includes the snapshot tests in `contracts/crowdfund/test_snapshots/`.

### What's Not Yet Covered

The Rust CI currently does not run:
- `cargo clippy` — Rust linter. Add with: `cargo clippy --workspace -- -D warnings`
- `cargo fmt --check` — Format check. Add with: `cargo fmt --all -- --check`

Recommended additions to the workflow:

```yaml
- name: Clippy
  run: cargo clippy --workspace --all-targets -- -D warnings

- name: Format check
  run: cargo fmt --all -- --check
```

## Frontend CI

**File:** `.github/workflows/frontend_ci.yml`

```yaml
name: Frontend CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Cache node_modules
        id: cache-node-modules
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            apps/interface/node_modules
          key: ${{ runner.os }}-node20-modules-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node20-modules-

      - name: Install dependencies (root)
        run: npm ci

      - name: Lint (root)
        run: npm run lint

      - name: Typecheck (apps/interface)
        working-directory: apps/interface
        run: npx tsc --noEmit
```

### Steps Explained

**`actions/setup-node@v4` with Node.js 20** — Pins the Node.js version to 20 (LTS) for reproducible builds.

**`actions/cache@v4`** — Caches both the root `node_modules` and `apps/interface/node_modules`. The cache key is derived from the OS, Node version, and a hash of all `package-lock.json` files. If any lock file changes, the cache is invalidated and dependencies are reinstalled from scratch. The `restore-keys` fallback allows partial cache hits when only some packages changed.

**`npm ci`** — Installs dependencies from `package-lock.json` exactly, without updating it. Faster and more reliable than `npm install` in CI.

**`npm run lint`** — Runs ESLint via `eslint-config-next`. Catches common React and Next.js anti-patterns.

**`npx tsc --noEmit`** — Type-checks the entire `apps/interface` TypeScript project without emitting output files. Catches type errors that ESLint might miss.

### What's Not Yet Covered

The frontend CI currently does not run tests. Add a test step after typecheck:

```yaml
- name: Run tests (apps/interface)
  working-directory: apps/interface
  run: npm run test:vitest
```

The project uses both Jest (`jest.config.js`) and Vitest (`vitest.config.ts`). Vitest is the preferred runner — use `test:vitest` for CI.

Coverage enforcement is configured at 80% thresholds (lines, branches, functions, statements) in both `jest.config.js` and `vitest.config.ts`. To enforce coverage in CI:

```yaml
- name: Test with coverage
  working-directory: apps/interface
  run: npm run test:vitest:coverage
```

## Playwright E2E Testing

The project does not currently have a Playwright E2E workflow. When added, it would typically:

1. Build the Next.js app.
2. Start the app in a test environment.
3. Run Playwright tests against the running server.

A basic workflow structure:

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        working-directory: apps/interface
        run: npm ci

      - name: Install Playwright browsers
        working-directory: apps/interface
        run: npx playwright install --with-deps chromium

      - name: Build app
        working-directory: apps/interface
        run: npm run build

      - name: Run E2E tests
        working-directory: apps/interface
        run: npx playwright test
        env:
          NEXT_PUBLIC_SOROBAN_RPC_URL: https://soroban-testnet.stellar.org
          NEXT_PUBLIC_CAMPAIGN_CONTRACT_IDS: ${{ secrets.TESTNET_CONTRACT_IDS }}

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/interface/playwright-report/
```

## Testnet Deployment Automation

There is no automated deployment workflow currently. When added, a testnet deployment would trigger after the Rust CI passes on `main`:

```yaml
name: Deploy to Testnet

on:
  workflow_run:
    workflows: ["Rust CI"]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown

      - name: Build WASM
        run: cargo build --release --target wasm32-unknown-unknown

      - name: Install Stellar CLI
        run: cargo install stellar-cli --locked

      - name: Upload and deploy contract
        env:
          STELLAR_SECRET_KEY: ${{ secrets.TESTNET_DEPLOYER_KEY }}
        run: |
          stellar contract upload \
            --wasm target/wasm32-unknown-unknown/release/crowdfund.wasm \
            --source $STELLAR_SECRET_KEY \
            --network testnet
```

Store sensitive values (deployer keys, contract IDs) as GitHub Actions secrets, never in the workflow file.

## Branch Protection Recommendations

To enforce CI before merging, configure branch protection rules on `main`:

- Require status checks: `test` (Rust CI) and `frontend` (Frontend CI)
- Require branches to be up to date before merging
- Require at least one approving review
- Dismiss stale reviews when new commits are pushed
