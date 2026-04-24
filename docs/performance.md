# Frontend Performance Best Practices

This document covers performance optimization strategies for the Fund-My-Cause Next.js frontend.

## Next.js Optimization Strategies

### App Router and Server Components

The app uses Next.js 16 with the App Router. Prefer React Server Components (RSC) for pages and layouts that don't need interactivity — they ship zero client-side JavaScript by default.

- Mark components with `"use client"` only when they need browser APIs, event handlers, or React hooks.
- Currently, most components are client components. Audit each one and move static rendering logic to the server where possible.
- Campaign list pages (`/campaigns`) are good candidates for server-side rendering since the data can be fetched at request time without wallet interaction.

### Static Generation for Campaign Pages

Campaign detail pages (`/campaigns/[id]`) can benefit from static generation when campaign data is relatively stable:

```ts
// apps/interface/src/app/campaigns/[id]/page.tsx
export async function generateStaticParams() {
  // Pre-render known campaign IDs at build time
  const ids = process.env.NEXT_PUBLIC_CAMPAIGN_CONTRACT_IDS?.split(",").map(id => id.trim()) ?? [];
  return ids.map(id => ({ id }));
}

export const revalidate = 60; // ISR: revalidate every 60 seconds
```

Use Incremental Static Regeneration (ISR) with a short `revalidate` interval so campaign stats stay reasonably fresh without hitting the RPC on every request.

For highly dynamic data (live contribution counts, current raised amount), fetch that client-side after the static shell loads.

## Caching Strategies for RPC Calls

Soroban RPC calls are the main performance bottleneck. Each `simulateView` call involves an HTTP round-trip to the RPC node.

### In-Memory Cache for View Functions

Wrap read-only calls with a simple time-based cache:

```ts
const cache = new Map<string, { value: unknown; expiresAt: number }>();

async function cachedSimulateView(
  contractId: string,
  method: string,
  args: unknown[] = [],
  ttlMs = 30_000,
): Promise<unknown> {
  const key = `${contractId}:${method}:${JSON.stringify(args)}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }
  const value = await simulateView(contractId, method, args);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
```

Recommended TTLs:
- Campaign info (title, description, goal): 5 minutes — rarely changes
- Campaign stats (total raised, contributor count): 30 seconds — changes with contributions
- Campaign status: 60 seconds

### Parallel Fetching

The existing `fetchCampaignView` already fetches info, stats, and social links in parallel using `Promise.all`. Maintain this pattern — never chain sequential awaits for independent RPC calls.

```ts
// Good — parallel
const [info, stats, links] = await Promise.all([
  simulateView(id, "get_info"),
  simulateView(id, "get_stats"),
  simulateView(id, "get_social_links"),
]);

// Bad — sequential (3x slower)
const info = await simulateView(id, "get_info");
const stats = await simulateView(id, "get_stats");
const links = await simulateView(id, "get_social_links");
```

### Request Deduplication

If multiple components on the same page request the same campaign data, deduplicate with a pending-request map:

```ts
const pending = new Map<string, Promise<unknown>>();

async function deduplicatedFetch(key: string, fetcher: () => Promise<unknown>) {
  if (pending.has(key)) return pending.get(key)!;
  const promise = fetcher().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
```

## Bundle Size Optimization

### Analyze the Bundle

Run the Next.js bundle analyzer to identify large dependencies:

```bash
npm install --save-dev @next/bundle-analyzer
```

```ts
// next.config.ts
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({});
```

```bash
ANALYZE=true npm run build
```

### Known Heavy Dependencies

| Package | Size (approx) | Notes |
|---|---|---|
| `@stellar/stellar-sdk` | ~1.5 MB | Core dependency, hard to reduce |
| `framer-motion` | ~150 KB | Use lazy imports for animation-heavy pages |
| `lucide-react` | ~50 KB (tree-shaken) | Already tree-shaken via named imports |

### Lazy Loading

Defer heavy components that aren't needed on initial render:

```ts
import dynamic from "next/dynamic";

// PledgeModal is only shown on user interaction — load it lazily
const PledgeModal = dynamic(
  () => import("@/components/ui/PledgeModal").then(m => ({ default: m.PledgeModal })),
  { ssr: false }
);
```

Apply `ssr: false` for any component that uses wallet APIs (`@stellar/freighter-api`) since those are browser-only.

### Tree Shaking

Import only what you need from large packages:

```ts
// Good
import { TransactionBuilder, BASE_FEE, Networks } from "@stellar/stellar-sdk";

// Avoid default/namespace imports that prevent tree shaking
import * as StellarSdk from "@stellar/stellar-sdk";
```

## Image Optimization with next/image

The current codebase uses plain `<img>` tags (with `eslint-disable-next-line @next/next/no-img-element` comments). Replace these with the `next/image` component for automatic optimization.

### Why next/image

- Automatic WebP/AVIF conversion
- Responsive `srcset` generation
- Lazy loading by default
- Prevents Cumulative Layout Shift (CLS) via reserved space

### Migration Example

In `CampaignCard.tsx`:

```tsx
// Before
<img src={campaign.image} alt={campaign.title} className="w-full h-48 object-cover" />

// After
import Image from "next/image";

<div className="relative w-full h-48">
  <Image
    src={campaign.image}
    alt={campaign.title}
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
</div>
```

### Remote Image Domains

If campaign images are hosted externally (e.g., via Pinata/IPFS), configure allowed domains in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
    ],
  },
};
```

### Placeholder Blur

For a better loading experience, use a blur placeholder:

```tsx
<Image
  src={campaign.image}
  alt={campaign.title}
  fill
  className="object-cover"
  placeholder="blur"
  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
/>
```

## Core Web Vitals Targets

| Metric | Target | Current Risk |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | Campaign images loaded without optimization |
| FID / INP (Interaction to Next Paint) | < 200ms | Wallet connection triggers re-renders |
| CLS (Cumulative Layout Shift) | < 0.1 | `<img>` without dimensions causes layout shift |

Monitor these with `next build` output and Vercel Analytics or Lighthouse CI.
