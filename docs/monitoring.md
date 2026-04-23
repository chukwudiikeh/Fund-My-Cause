# Monitoring

This document covers observability for deployed Fund-My-Cause contracts and the Next.js frontend.

## Stellar Network Monitoring

### Stellar Expert

[stellar.expert](https://stellar.expert/explorer/public) provides a no-setup contract explorer:

- Search by contract ID to view all invocations, events, and storage state.
- Subscribe to contract events via the "Alerts" feature (email or webhook).
- Use the "Events" tab to track `campaign:initialized`, `contribution:made`, `funds:withdrawn`, and `refund:claimed` events.

### Horizon Event Stream

Poll or stream contract events via Horizon:

```bash
# Stream all events for a contract (replace CONTRACT_ID)
curl "https://horizon.stellar.org/contracts/CONTRACT_ID/events?order=asc&cursor=now" \
  -H "Accept: text/event-stream"
```

In the frontend, use `@stellar/stellar-sdk` to subscribe:

```ts
// lib/events.ts
import { Horizon } from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon.stellar.org");

export function watchContractEvents(
  contractId: string,
  onEvent: (event: Horizon.ServerApi.ContractEventRecord) => void
) {
  return server
    .contractEvents(contractId)
    .cursor("now")
    .stream({ onmessage: onEvent });
}
```

### Stellar Status Page

Monitor network-wide outages at [status.stellar.org](https://status.stellar.org). Subscribe to incident notifications to be alerted before users report issues.

## Frontend Error Tracking (Sentry)

### Setup

```bash
cd apps/interface
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

The wizard creates `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`. Minimal client config:

```ts
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,       // 20 % of transactions
  replaysOnErrorSampleRate: 1, // full replay on errors
  replaysSessionSampleRate: 0, // no session replays (privacy)
  environment: process.env.NODE_ENV,
});
```

Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.local` and your deployment environment.

### Capturing Contract Errors

Wrap RPC calls so Sentry receives structured context:

```ts
import * as Sentry from "@sentry/nextjs";

export async function contribute(contractId: string, amount: bigint) {
  try {
    return await withRetry(() => contract.contribute({ amount }));
  } catch (err) {
    Sentry.captureException(err, {
      tags: { contractId, action: "contribute" },
      extra: { amount: amount.toString() },
    });
    throw err;
  }
}
```

## RPC Endpoint Health Monitoring

Run a lightweight health check against your RPC URL on a schedule (e.g., every 60 s via a cron job or uptime service):

```ts
// scripts/rpc-health.ts
const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!;

async function check() {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
  });
  const { result } = await res.json();
  if (result?.status !== "healthy") {
    throw new Error(`RPC unhealthy: ${JSON.stringify(result)}`);
  }
  console.log("RPC healthy");
}

check().catch((e) => { console.error(e); process.exit(1); });
```

Plug this into an uptime monitor (Better Uptime, UptimeRobot, or a GitHub Actions schedule) and alert on failure.

## Transaction Success / Failure Tracking

Log every user-initiated transaction with its outcome:

```ts
// lib/tx-tracker.ts
type TxResult = { hash: string; success: boolean; action: string };

export function trackTx(result: TxResult) {
  // Send to your analytics backend or Sentry breadcrumb
  if (typeof window !== "undefined") {
    console.info("[tx]", result);
    // Optional: POST to /api/analytics (server-side, no PII)
  }
}

// Usage after contribution
trackTx({ hash: txHash, success: true, action: "contribute" });
```

Track these metrics over time:

| Metric | Target |
|--------|--------|
| Transaction success rate | > 98 % |
| Simulation failure rate | < 2 % |
| Median confirmation time | < 10 s |

## User Analytics (Privacy-Focused)

Avoid collecting personally identifiable information. Recommended approach:

- **[Plausible](https://plausible.io)** or **[Umami](https://umami.is)** — cookieless, GDPR-compliant, self-hostable.
- Track page views and anonymous events only (e.g., "campaign page viewed", "contribute button clicked").
- Never log wallet addresses or contribution amounts in analytics.

```ts
// lib/analytics.ts — Umami example
export function trackEvent(name: string, data?: Record<string, string>) {
  if (typeof window !== "undefined" && (window as any).umami) {
    (window as any).umami.track(name, data);
  }
}

// Usage
trackEvent("contribute_clicked", { campaignId: contractId });
```

Add the Umami script tag to `app/layout.tsx`:

```tsx
<script
  defer
  src="https://your-umami-instance/script.js"
  data-website-id={process.env.NEXT_PUBLIC_UMAMI_ID}
/>
```

**Do not** pass wallet addresses, transaction hashes, or contribution amounts to any third-party analytics service.

## References

- [Stellar Expert](https://stellar.expert)
- [Stellar Status](https://status.stellar.org)
- [Horizon Streaming](https://developers.stellar.org/docs/data/horizon/api-reference/streaming)
- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Plausible Analytics](https://plausible.io/docs)
- [Umami Analytics](https://umami.is/docs)
