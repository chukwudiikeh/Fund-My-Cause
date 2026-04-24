# Campaign Embed Widget — Creator Guide

Embed a live campaign widget on any external website — your blog, portfolio, or project page — with a single `<iframe>` tag. The widget fetches live on-chain data and updates automatically.

---

## Quick Start

1. Open your campaign page on Fund-My-Cause.
2. Click **Embed Widget** below the share buttons.
3. Customise the theme, size, and accent colour.
4. Copy the generated `<iframe>` code and paste it into your site's HTML.

---

## Embed URL

The widget is served from:

```
https://fund-my-cause.app/embed/<CONTRACT_ID>
```

Query parameters let you customise the appearance without touching the iframe code:

| Parameter   | Values                            | Default    | Description                                                                    |
| ----------- | --------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| `theme`     | `dark` \| `light` \| `auto`       | `dark`     | Colour scheme. `auto` follows the visitor's OS preference.                     |
| `size`      | `compact` \| `standard` \| `wide` | `standard` | Widget dimensions (see table below).                                           |
| `accent`    | 6-digit hex, e.g. `6366f1`        | `6366f1`   | Accent colour for the progress bar and CTA button. Do **not** include the `#`. |
| `hideImage` | `1`                               | _(unset)_  | Set to `1` to hide the hero image.                                             |

### Size Dimensions

| Size       | Width | Height | Notes                                  |
| ---------- | ----- | ------ | -------------------------------------- |
| `compact`  | 320px | 200px  | Title, progress bar, raised/goal only. |
| `standard` | 380px | 320px  | + contributor count and countdown.     |
| `wide`     | 480px | 400px  | + description excerpt.                 |

---

## Example Embed Code

```html
<iframe
  src="https://fund-my-cause.app/embed/CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?theme=dark&size=standard&accent=6366f1"
  width="380"
  height="320"
  style="border:none;border-radius:16px;overflow:hidden;"
  title="My Campaign — Fund-My-Cause"
  loading="lazy"
  allow="payment"
></iframe>
```

Replace `CXXXXXXX…` with your campaign's contract ID.

---

## Customisation Examples

### Light theme, wide, rose accent

```html
<iframe
  src="https://fund-my-cause.app/embed/CXXX...?theme=light&size=wide&accent=f43f5e"
  width="480"
  height="400"
  style="border:none;border-radius:16px;overflow:hidden;"
  title="My Campaign — Fund-My-Cause"
  loading="lazy"
></iframe>
```

### Compact, no image, custom green accent

```html
<iframe
  src="https://fund-my-cause.app/embed/CXXX...?theme=dark&size=compact&accent=10b981&hideImage=1"
  width="320"
  height="200"
  style="border:none;border-radius:16px;overflow:hidden;"
  title="My Campaign — Fund-My-Cause"
  loading="lazy"
></iframe>
```

---

## Responsive Embedding

To make the widget scale with its container, wrap it in a responsive div:

```html
<div style="max-width:480px;width:100%;">
  <iframe
    src="https://fund-my-cause.app/embed/CXXX...?theme=dark&size=wide"
    width="100%"
    height="400"
    style="border:none;border-radius:16px;overflow:hidden;display:block;"
    title="My Campaign — Fund-My-Cause"
    loading="lazy"
  ></iframe>
</div>
```

---

## WordPress / Webflow / Squarespace

Most website builders support embedding raw HTML. Look for an **HTML block**, **Embed block**, or **Custom Code** section and paste the `<iframe>` tag there.

- **WordPress**: Use the _Custom HTML_ block in the block editor.
- **Webflow**: Add an _Embed_ element and paste the code.
- **Squarespace**: Use a _Code Block_ in any page section.
- **Ghost**: Use an _HTML card_ in the post editor.
- **Notion**: Notion does not support arbitrary iframes. Link to your campaign page instead.

---

## Security & Privacy

- The widget is served from `fund-my-cause.app` and only reads public on-chain data — no wallet connection, no cookies, no tracking.
- The widget links to your campaign page when clicked; it does not process payments itself.
- The embed route sets `frame-ancestors *` in its Content Security Policy, which is required for cross-origin embedding. All other Fund-My-Cause pages remain protected with `frame-ancestors 'none'`.

---

## Data Freshness

Widget data is cached with a 60-second ISR (Incremental Static Regeneration) window. Raised amounts and contributor counts update within ~1 minute of an on-chain contribution.

---

## Troubleshooting

| Issue                             | Fix                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Widget shows "Campaign not found" | Double-check the contract ID in the URL.                                                           |
| Widget is blank / white           | Your site's CSP may be blocking the iframe. Add `frame-src https://fund-my-cause.app` to your CSP. |
| Widget doesn't fit                | Adjust the `width` and `height` attributes, or use the responsive wrapper above.                   |
| Image doesn't load                | The IPFS gateway may be slow. Set `hideImage=1` for a faster load.                                 |
