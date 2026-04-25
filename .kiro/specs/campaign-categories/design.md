# Design Document: Campaign Categories

## Overview

This feature adds a frontend-only category system. Categories are defined in a static taxonomy, stored in localStorage alongside existing campaign metadata, and surfaced via badges, filters, and landing pages. No contract changes are required.

## Architecture

```
src/lib/categories.ts          ← taxonomy constant + lookup helpers
src/types/campaign.ts          ← add optional `category` field
src/app/create/page.tsx        ← add category selector to Step 1
src/components/ui/CampaignCard.tsx  ← add CategoryBadge
src/app/campaigns/page.tsx     ← add category filter control
src/app/campaigns/category/[slug]/page.tsx  ← new landing page
```

No new external dependencies are required.

## Components and Interfaces

### `src/lib/categories.ts`

```typescript
export interface Category {
  slug: string;   // e.g. "environment"
  label: string;  // e.g. "Environment"
  emoji: string;  // e.g. "🌱"
  description: string; // short blurb for landing page
}

export const CATEGORY_TAXONOMY: readonly Category[] = [
  { slug: "technology",    label: "Technology",    emoji: "💻", description: "..." },
  { slug: "environment",   label: "Environment",   emoji: "🌱", description: "..." },
  { slug: "education",     label: "Education",     emoji: "📚", description: "..." },
  { slug: "health",        label: "Health",        emoji: "❤️", description: "..." },
  { slug: "arts-culture",  label: "Arts & Culture",emoji: "🎨", description: "..." },
  { slug: "community",     label: "Community",     emoji: "��", description: "..." },
  { slug: "science",       label: "Science",       emoji: "🔬", description: "..." },
  { slug: "other",         label: "Other",         emoji: "✨", description: "..." },
] as const;

export function getCategoryBySlug(slug: string): Category | undefined;
export function isValidCategorySlug(slug: string): boolean;
```

### `Campaign` type update (`src/types/campaign.ts`)

Add one optional field:
```typescript
category?: string; // category slug
```

### `CategoryBadge` (inline in `CampaignCard.tsx`)

```typescript
function CategoryBadge({ slug }: { slug: string }) // renders emoji + label chip
```

Positioned `absolute top-3 right-3` on the card image. Uses indigo/purple tones to distinguish from the green/gray status badges.

### Category selector in CreateFlow Step 1

A `<select>` (or styled button group) added below the description field. Stores value in `FormData.category: string`. Validation in `validateStep(0)` returns an error if empty.

### Category filter on `/campaigns`

A horizontal scrollable row of pill buttons (similar to the existing status filter tabs) placed above the status tabs. Uses `category` URL param. Composes with existing `filter`, `sort`, and `q` params.

### `/campaigns/category/[slug]` landing page

Static params generated from `CATEGORY_TAXONOMY`. Renders:
- Category hero (emoji + label + description)
- Back link to `/campaigns`
- Filtered campaign grid (reuses `CampaignCard`)
- Empty state if no campaigns match

## Data Flow

```
CreateFlow (Step 1)
  └─ user picks category slug
  └─ stored in FormData.category
  └─ on deploy: saved to localStorage key "fmc:campaign-meta:{contractId}"
       as JSON { category: slug }

CampaignsPage / CategoryLandingPage
  └─ fetchAllCampaigns() returns on-chain data
  └─ for each campaign, read localStorage "fmc:campaign-meta:{contractId}"
  └─ merge { category } into Campaign object

CampaignCard
  └─ reads campaign.category
  └─ looks up CATEGORY_TAXONOMY via getCategoryBySlug
  └─ renders CategoryBadge if found
```

## Correctness Properties

### Property 1: Taxonomy slug uniqueness
All slugs in CATEGORY_TAXONOMY are unique — no two entries share the same slug.

**Validates: Requirement 1.4**

### Property 2: getCategoryBySlug round-trip
For every category `c` in CATEGORY_TAXONOMY, `getCategoryBySlug(c.slug)` returns `c`.

**Validates: Requirement 1.5**

### Property 3: getCategoryBySlug rejects unknown slugs
For any arbitrary string not in the taxonomy, `getCategoryBySlug` returns `undefined`.

**Validates: Requirement 1.5**

### Property 4: isValidCategorySlug is consistent with getCategoryBySlug
`isValidCategorySlug(s) === (getCategoryBySlug(s) !== undefined)` for all strings `s`.

**Validates: Requirements 1.4, 1.5**

### Property 5: Category filter composes correctly
Given a list of campaigns with mixed categories, filtering by slug `X` returns exactly the campaigns whose `category === X`, regardless of other campaign fields.

**Validates: Requirement 4.2, 4.8**

### Property 6: Unknown category slug degrades gracefully
When `campaign.category` is an arbitrary string not in the taxonomy, `getCategoryBySlug` returns `undefined` and no badge is rendered.

**Validates: Requirement 3.2, 6.4**

## Testing Strategy

- **Unit tests**: taxonomy shape, `getCategoryBySlug`, `isValidCategorySlug`, category filter logic, URL param parsing.
- **Property-based tests** (fast-check): Properties 1–6 above.
- **Component tests**: `CategoryBadge` renders/hides correctly; category selector appears in Step 1; filter pills update URL params.

Testing framework: **Vitest** + **fast-check** (already used in the project).
