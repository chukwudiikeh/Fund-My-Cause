# Requirements Document

## Introduction

Adds a category system to Fund-My-Cause. Creators assign a category during campaign creation. Visitors can filter by category, see badges on cards, and browse category landing pages. Categories are stored as frontend metadata (off-chain), keeping the Soroban contract unchanged.

## Glossary

- **Category**: A predefined label classifying a campaign (e.g. Technology, Environment).
- **CategoryBadge**: A visual chip on a `CampaignCard` showing the campaign's category.
- **CategoryFilter**: UI control on the campaigns page to filter by category.
- **CategoryLandingPage**: Page at `/campaigns/category/[slug]` listing campaigns for one category.
- **CategorySlug**: URL-safe lowercase string derived from the category name.
- **CATEGORY_TAXONOMY**: Authoritative list of categories in `src/lib/categories.ts`.

---

## Requirements

### Requirement 1: Category Taxonomy

**User Story:** As a platform operator, I want a fixed set of categories defined in one place so that categories are consistent across the app.

#### Acceptance Criteria

1. THE CATEGORY_TAXONOMY SHALL define at least: Technology, Environment, Education, Health, Arts & Culture, Community, Science, and Other.
2. EACH category SHALL have a `label`, a `slug` (URL-safe lowercase), and an `emoji`.
3. THE CATEGORY_TAXONOMY SHALL be exported as a readonly constant from `src/lib/categories.ts`.
4. ALL slugs SHALL be unique within the taxonomy.
5. WHEN a slug is looked up, THE system SHALL return the matching category or `undefined`.

---

### Requirement 2: Category Field in Campaign Creation

**User Story:** As a creator, I want to select a category during campaign creation so backers can discover my campaign through category browsing.

#### Acceptance Criteria

1. WHEN a user is on Step 1 of the CreateFlow, THE form SHALL display a category selector with all CATEGORY_TAXONOMY entries.
2. WHEN a user selects a category, THE form state SHALL store the selected slug.
3. THE category field SHALL be required — the CreateFlow SHALL NOT advance past Step 1 without a selection.
4. WHEN the CreateFlow submits, THE category slug SHALL be persisted in campaign metadata.
5. THE selector SHALL display each category's emoji and label.

---

### Requirement 3: Category Badge on Campaign Cards

**User Story:** As a visitor, I want to see a category badge on each campaign card so I can quickly identify what a campaign is about.

#### Acceptance Criteria

1. WHEN a `Campaign` has a valid `category` slug, THE `CampaignCard` SHALL render a `CategoryBadge` showing the emoji and label.
2. WHEN a `Campaign` has no `category` or an unrecognised slug, THE `CampaignCard` SHALL NOT render a `CategoryBadge`.
3. THE `CategoryBadge` SHALL be visually distinct from the Funded/Ended status badges.
4. THE `CategoryBadge` SHALL be positioned in the top-right corner of the card image area.

---

### Requirement 4: Category Filter on Campaigns Page

**User Story:** As a visitor, I want to filter campaigns by category so I can browse only campaigns relevant to my interests.

#### Acceptance Criteria

1. THE campaigns page SHALL display a category filter with all CATEGORY_TAXONOMY entries plus an "All" option.
2. WHEN a visitor selects a category, THE grid SHALL show only matching campaigns.
3. WHEN "All" is selected, THE grid SHALL show all campaigns regardless of category.
4. THE active category filter SHALL be reflected in the URL as a `category` query parameter.
5. WHEN the page loads with a valid `category` param, THE corresponding filter SHALL be pre-selected.
6. WHEN the `category` param is unknown, THE filter SHALL default to "All".
7. WHEN a filter is active and no campaigns match, THE empty state SHALL be shown with a "Clear filters" action.
8. THE category filter SHALL compose with the existing status filter, sort, and search controls.

---

### Requirement 5: Category Landing Pages

**User Story:** As a visitor, I want a dedicated page per category so I can share a direct link to campaigns in a specific area.

#### Acceptance Criteria

1. THE app SHALL serve `/campaigns/category/[slug]` for each slug in CATEGORY_TAXONOMY.
2. THE page SHALL display only campaigns belonging to that category.
3. THE page SHALL show the category's emoji, label, and a short description at the top.
4. WHEN no campaigns exist for a category, THE empty state component SHALL be shown.
5. WHEN the slug is unknown, THE page SHALL return a 404.
6. THE page SHALL include a link back to the main campaigns page.

---

### Requirement 6: Category Metadata Storage

**User Story:** As a developer, I want the category stored consistently so the frontend can display it reliably across all pages.

#### Acceptance Criteria

1. THE `Campaign` type SHALL include an optional `category` field of type `string`.
2. THE category slug SHALL persist across page reloads and be retrievable by listing and detail pages.
3. Category retrieval logic SHALL be encapsulated in a single helper used by all pages.
4. WHEN a stored slug does not match any CATEGORY_TAXONOMY entry, THE system SHALL treat the campaign as having no category.
