# Social Sharing

This document explains how Fund-My-Cause implements Open Graph and Twitter Card metadata for campaign pages, how dynamic OG images are generated, and how to test social previews.

---

## Overview

When a campaign URL is shared on social platforms (Twitter/X, Facebook, LinkedIn, iMessage, etc.), crawlers read `<meta>` tags from the page's `<head>` to build a rich preview card. Fund-My-Cause uses the [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata) to generate these tags server-side for every campaign.

---

## Open Graph Tags

Open Graph (OG) is the standard used by Facebook, LinkedIn, Slack, and most other platforms.

### Static metadata (layout level)

`apps/interface/src/app/layout.tsx` sets site-wide defaults:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Fund-My-Cause",
    template: "%s | Fund-My-Cause",
  },
  description: "Decentralized crowdfunding on the Stellar network.",
  openGraph: {
    siteName: "Fund-My-Cause",
    type: "website",
    locale: "en_US",
    url: "https://fundmycause.xyz",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Fund-My-Cause — Decentralized Crowdfunding on Stellar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@FundMyCause",
  },
};
```

### Dynamic metadata (campaign pages)

Each campaign page at `apps/interface/src/app/campaigns/[id]/page.tsx` exports a `generateMetadata` function that fetches on-chain data and returns campaign-specific tags:

```tsx
import type { Metadata } from "next";
import { getCampaignInfo } from "@/lib/contract";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const campaign = await getCampaignInfo(params.id);

  const title = campaign.title;
  const description = campaign.description.slice(0, 160);
  const ogImage = `/api/og?id=${params.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://fundmycause.xyz/campaigns/${params.id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
```

The tags this produces:

```html
<!-- Open Graph -->
<meta property="og:title" content="Eco-Friendly Water Purification" />
<meta property="og:description" content="A compact, solar-powered water purification system…" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://fundmycause.xyz/campaigns/CABC…" />
<meta property="og:image" content="https://fundmycause.xyz/api/og?id=CABC…" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Eco-Friendly Water Purification" />
<meta name="twitter:description" content="A compact, solar-powered water purification system…" />
<meta name="twitter:image" content="https://fundmycause.xyz/api/og?id=CABC…" />
```

---

## Dynamic OG Image Generation

Next.js supports generating images on-the-fly via the `ImageResponse` API (`next/og`). Create a route handler at `apps/interface/src/app/api/og/route.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getCampaignInfo } from "@/lib/contract";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";

  const campaign = await getCampaignInfo(id).catch(() => null);
  const title = campaign?.title ?? "Fund-My-Cause";
  const raised = campaign ? (campaign.raised / 1e7).toFixed(1) : "0";
  const goal = campaign ? (campaign.goal / 1e7).toFixed(1) : "0";
  const pct = campaign ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700, marginBottom: 16 }}>{title}</div>
        <div style={{ fontSize: 24, opacity: 0.8, marginBottom: 32 }}>
          {raised} / {goal} XLM raised · {pct}% funded
        </div>
        {/* Progress bar */}
        <div style={{ display: "flex", height: 12, background: "rgba(255,255,255,0.2)", borderRadius: 6 }}>
          <div style={{ width: `${pct}%`, background: "#6366f1", borderRadius: 6 }} />
        </div>
        <div style={{ marginTop: 24, fontSize: 18, opacity: 0.6 }}>fundmycause.xyz</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

The image is generated at request time and cached by the CDN. It shows the campaign title, funding progress, and a visual progress bar — giving sharers a compelling preview without any manual image uploads.

---

## Twitter Card Configuration

Twitter supports four card types. Fund-My-Cause uses `summary_large_image` for campaign pages because it renders a full-width 1200×630 image above the tweet text.

| Card type | When to use |
|-----------|-------------|
| `summary` | Small thumbnail, good for generic pages |
| `summary_large_image` | Large hero image — used for campaign pages |
| `app` | Mobile app install cards |
| `player` | Embedded video/audio |

The `twitter:site` tag should be set to your verified Twitter handle so the card is attributed correctly. If you have a `twitter:creator` (the author of the specific page), add it too:

```tsx
twitter: {
  card: "summary_large_image",
  site: "@FundMyCause",
  creator: "@campaignCreatorHandle", // optional, per-page
},
```

> Twitter requires the image to be publicly accessible (no auth). During local development use [ngrok](https://ngrok.com/) or deploy to a preview environment before testing.

---

## IPFS Image Hosting for Campaign Metadata

Campaign creators can upload a cover image when creating a campaign. The image is pinned to IPFS via [Pinata](https://pinata.cloud/) and the resulting CID is stored in the contract's `social_links` field.

### Upload flow

`apps/interface/src/lib/pinata.ts` handles uploads:

```ts
export async function uploadImageToPinata(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_API_KEY}` },
    body: formData,
  });

  const data = await res.json();
  // Returns the IPFS CID, e.g. "QmXyz..."
  return data.IpfsHash;
}
```

### Resolving IPFS images

When rendering a campaign image, resolve the CID through a public gateway:

```ts
export function ipfsToHttp(cid: string): string {
  if (cid.startsWith("http")) return cid; // already a URL
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
```

Use this helper when building the `og:image` URL so crawlers can fetch the image:

```tsx
const imageUrl = campaign.imageCid
  ? ipfsToHttp(campaign.imageCid)
  : `/api/og?id=${params.id}`; // fall back to generated image
```

### Environment variable

```bash
# apps/interface/.env.local
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_jwt_here
```

---

## Testing Social Previews

Use these tools to validate your metadata before publishing:

| Tool | URL | Notes |
|------|-----|-------|
| Open Graph Debugger (Facebook) | https://developers.facebook.com/tools/debug/ | Scrapes and caches OG tags; use "Scrape Again" to refresh |
| Twitter Card Validator | https://cards-dev.twitter.com/validator | Requires Twitter login; shows live card preview |
| LinkedIn Post Inspector | https://www.linkedin.com/post-inspector/ | Validates OG tags for LinkedIn shares |
| OpenGraph.xyz | https://www.opengraph.xyz | No login required; quick visual preview |
| Meta Tags | https://metatags.io | Previews across multiple platforms simultaneously |

### Local testing with ngrok

Social crawlers cannot reach `localhost`. Use ngrok to expose your dev server:

```bash
# Start Next.js dev server
npm run dev

# In another terminal, expose port 3000
npx ngrok http 3000
```

Paste the ngrok URL (e.g. `https://abc123.ngrok.io/campaigns/<id>`) into any of the tools above.

### Verifying tags with curl

```bash
curl -s https://fundmycause.xyz/campaigns/<CONTRACT_ID> \
  | grep -E 'og:|twitter:'
```

Expected output includes `og:title`, `og:image`, `twitter:card`, etc.

---

## Checklist

- [ ] `og:title` — campaign title (≤ 60 chars recommended)
- [ ] `og:description` — campaign description (≤ 160 chars)
- [ ] `og:image` — 1200×630 px, publicly accessible URL
- [ ] `og:url` — canonical campaign URL
- [ ] `twitter:card` — set to `summary_large_image`
- [ ] `twitter:site` — your Twitter handle
- [ ] OG image tested in Facebook Debugger
- [ ] Twitter Card tested in Card Validator
- [ ] IPFS images resolve via public gateway
