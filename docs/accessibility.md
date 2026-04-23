# Accessibility Guide

This document covers the accessibility features implemented in Fund-My-Cause and provides guidance for maintaining and improving WCAG 2.1 compliance.

> **Note:** Full WCAG compliance validation requires manual testing with assistive technologies and expert accessibility review. The findings below reflect a code audit; they do not substitute for hands-on testing with screen readers and keyboard-only navigation.

## ARIA Labels and Semantic HTML

### Current Implementation

The codebase uses semantic HTML elements and ARIA labels in several places:

**Navigation (`Navbar.tsx`)**
```tsx
<nav className="flex items-center justify-between ...">
  {/* Semantic <nav> landmark */}
</nav>

<button aria-label="Toggle theme">
  {/* Icon-only button — aria-label provides text alternative */}
</button>

<button aria-label="Toggle menu">
  {/* Mobile hamburger — aria-label provides text alternative */}
</button>
```

**Modal (`PledgeModal.tsx`)**
```tsx
<button aria-label="Close" onClick={onClose}>
  <X size={20} />
</button>
```

**Campaign Cards (`CampaignCard.tsx`)**
```tsx
<img src={campaign.image} alt={campaign.title} />
{/* alt text derived from campaign title */}
```

### Gaps and Recommendations

**ProgressBar** — The progress bar has no ARIA role or value attributes. Screen readers cannot convey the funding progress:

```tsx
// Current — not accessible
<div className="w-full bg-gray-800 rounded-full h-2">
  <div style={{ width: `${clamped}%` }} />
</div>

// Recommended
<div
  role="progressbar"
  aria-valuenow={Math.round(clamped)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Campaign funding progress"
  className="w-full bg-gray-800 rounded-full h-2"
>
  <div style={{ width: `${clamped}%` }} />
</div>
```

**CampaignCard pledge button** — The button text changes based on state but doesn't announce the campaign name to screen readers. Users navigating a list of cards can't distinguish which campaign each button belongs to:

```tsx
// Recommended
<button
  aria-label={
    isFunded
      ? `${campaign.title} — Successfully Funded`
      : isEnded
      ? `${campaign.title} — Campaign Ended`
      : `Pledge to ${campaign.title}`
  }
  disabled={isDisabled}
>
  {isFunded ? "Successfully Funded" : isEnded ? "Campaign Ended" : "Pledge Now"}
</button>
```

**PledgeModal** — The modal lacks `role="dialog"`, `aria-modal`, and `aria-labelledby`, which are required for screen readers to identify it as a modal dialog:

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="pledge-modal-title"
>
  <h2 id="pledge-modal-title">Pledge to {campaignTitle}</h2>
  ...
</div>
```

**Form inputs** — Ensure all `<input>` elements have associated `<label>` elements (not just placeholder text):

```tsx
// Recommended
<label htmlFor="pledge-amount" className="sr-only">
  Pledge amount in XLM
</label>
<input
  id="pledge-amount"
  type="number"
  placeholder={`Min ${minXlm} XLM`}
  ...
/>
```

**Status badges** — The colored status badges in `CampaignCard` convey meaning through color alone. Add a visually hidden text alternative:

```tsx
<span className="bg-green-500/90 text-white ...">
  Funded
  <span className="sr-only"> — this campaign has reached its goal</span>
</span>
```

## Keyboard Navigation Support

### Current State

- All interactive elements use native `<button>` and `<input>` elements, which are keyboard-focusable by default.
- The `disabled` attribute is used correctly on buttons, which removes them from the tab order.
- The mobile menu toggle uses a `<button>`, so it's keyboard accessible.

### Gaps

**Modal focus trap** — When `PledgeModal` opens, focus should move into the modal and be trapped there until it closes. Without this, keyboard users can tab behind the modal overlay:

```tsx
// Use a library like focus-trap-react, or implement manually:
useEffect(() => {
  if (isOpen) {
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }
}, [isOpen]);
```

**Escape key to close modal** — Add keyboard handler:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [onClose]);
```

**Focus-visible styles** — The current Tailwind classes don't include explicit `focus-visible` outlines. Add them to ensure keyboard focus is visible:

```tsx
// In globals.css or component classes
className="... focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2"
```

Or globally in `globals.css`:

```css
:focus-visible {
  outline: 2px solid #6366f1; /* indigo-500 */
  outline-offset: 2px;
}
```

## Screen Reader Testing

Screen reader testing has not been formally conducted. The following tools and procedures are recommended:

### Recommended Tools

| Tool | Platform | Cost |
|---|---|---|
| NVDA | Windows | Free |
| JAWS | Windows | Commercial |
| VoiceOver | macOS / iOS | Built-in |
| TalkBack | Android | Built-in |
| Orca | Linux | Free |

### Testing Procedure

1. **Navigation flow** — Tab through the page from top to bottom. Verify every interactive element receives focus in a logical order and has a meaningful label.
2. **Campaign list** — Navigate the campaign cards. Verify each card's title, description, progress, and pledge button are announced correctly.
3. **Pledge flow** — Open the pledge modal. Verify focus moves into the modal, the title is announced, the amount input is labeled, and the submit/close buttons are identifiable.
4. **Error states** — Trigger validation errors. Verify error messages are announced (use `aria-live="polite"` or `role="alert"` for dynamic error messages).
5. **Wallet connection** — Connect and disconnect the wallet. Verify status changes are announced.

### Dynamic Content Announcements

For status updates that appear after user actions (transaction submitted, error occurred), use `aria-live`:

```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>
```

Use `aria-live="assertive"` only for critical errors that require immediate attention.

## Color Contrast Compliance

### WCAG 2.1 Requirements

- **Level AA:** 4.5:1 contrast ratio for normal text, 3:1 for large text (18pt / 14pt bold)
- **Level AAA:** 7:1 for normal text, 4.5:1 for large text

### Current Color Usage

The app uses Tailwind CSS with a dark-first design and a light mode toggle. Key color pairings:

| Foreground | Background | Context | Notes |
|---|---|---|---|
| `text-white` | `bg-indigo-600` | Primary buttons | Passes AA (~4.6:1) |
| `text-gray-400` | `bg-gray-900` | Card descriptions | Borderline — verify |
| `text-green-400` | `bg-gray-900` | Funded progress % | May fail AA |
| `text-indigo-400` | `bg-gray-900` | Progress % | May fail AA |
| `text-red-500` | `bg-white` | Error messages | Passes AA |
| `text-gray-600` | `bg-white` | Wallet address (light mode) | Passes AA |

### Checking Contrast

Use these tools to verify contrast ratios:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/) (desktop app)
- Browser DevTools accessibility panel

### Recommendations

- Replace `text-gray-400` on dark backgrounds with `text-gray-300` for better contrast.
- Replace `text-green-400` and `text-indigo-400` with `text-green-300` and `text-indigo-300` on `bg-gray-900` backgrounds.
- Avoid conveying information through color alone (e.g., the green/gray status badges also include text labels, which is correct).

## Accessibility Testing Tools and Procedures

### Automated Testing

**axe-core** — Integrates with Jest/Vitest to catch common accessibility violations in component tests:

```bash
npm install --save-dev @axe-core/react jest-axe
```

```tsx
// Example test
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { ProgressBar } from "@/components/ui/ProgressBar";

expect.extend(toHaveNoViolations);

test("ProgressBar has no accessibility violations", async () => {
  const { container } = render(<ProgressBar progress={50} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**eslint-plugin-jsx-a11y** — Catches accessibility issues at lint time:

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

Add to ESLint config:
```json
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

**Lighthouse** — Run accessibility audits as part of CI:

```bash
npx lighthouse http://localhost:3000 --only-categories=accessibility --output=json
```

### Manual Testing Checklist

Before each release, verify:

- [ ] All images have meaningful `alt` text (or `alt=""` for decorative images)
- [ ] All icon-only buttons have `aria-label`
- [ ] All form inputs have associated labels
- [ ] Modal dialogs have `role="dialog"`, `aria-modal`, and `aria-labelledby`
- [ ] Progress indicators have `role="progressbar"` with `aria-valuenow/min/max`
- [ ] Dynamic status messages use `aria-live`
- [ ] Focus is visible on all interactive elements
- [ ] Modal focus is trapped while open
- [ ] Escape key closes modals
- [ ] Tab order follows visual reading order
- [ ] Color is not the only means of conveying information
- [ ] Text contrast meets WCAG AA minimums
