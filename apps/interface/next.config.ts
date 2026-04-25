import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy for standard app routes.
 *
 * default-src 'self'          — baseline: only same-origin resources allowed
 * script-src  'self' + eval  — 'unsafe-eval' required by Next.js HMR in dev
 * style-src   'self' 'unsafe-inline' — Tailwind injects inline styles
 * connect-src 'self' + RPC   — Soroban RPC, Horizon, CoinGecko price feed
 * img-src     'self' data:   — data URIs; Unsplash & IPFS for campaign images
 * font-src    'self'          — self-hosted fonts only
 * frame-ancestors 'none'     — prevents clickjacking
 * object-src  'none'          — disables Flash / legacy plugin embeds
 */
const cspDefault = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-eval'" : "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  [
    "connect-src 'self'",
    "https://soroban-testnet.stellar.org",
    "https://horizon-testnet.stellar.org",
    "https://api.coingecko.com",
  ].join(" "),
  "img-src 'self' data: https://images.unsplash.com https://ipfs.io",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

/**
 * Relaxed CSP for the /embed/* route.
 * frame-ancestors is set to '*' so any external site can embed the widget.
 * X-Frame-Options is intentionally omitted for this route (set to ALLOWALL).
 */
const cspEmbed = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-eval'" : "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  [
    "connect-src 'self'",
    "https://soroban-testnet.stellar.org",
    "https://horizon-testnet.stellar.org",
    "https://api.coingecko.com",
  ].join(" "),
  "img-src 'self' data: https://images.unsplash.com https://ipfs.io",
  "font-src 'self'",
  "frame-ancestors *",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.ipfs.io" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "cloudflare-ipfs.com" },
    ],
  },

  async headers() {
    return [
      // ── Embed widget route — allow framing from any origin ──────────────────
      {
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspEmbed },
          // Explicitly allow framing (overrides the DENY set on all other routes)
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      // ── All other routes — strict security headers ──────────────────────────
      {
        source: "/((?!embed).*)",
        headers: [
          { key: "Content-Security-Policy", value: cspDefault },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
