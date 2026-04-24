# Requirements Document

## Introduction

User Profile Pages provide a public-facing page at `/profile/[address]` for each Stellar wallet address. The page displays campaigns created by that address, their contribution history across all known campaigns, aggregate statistics (total raised and total contributed), and optional profile customization (avatar, bio, social links). Profile metadata is stored in localStorage for the connected user's own profile, with optional IPFS persistence via Pinata.

## Glossary

- **Profile_Page**: The Next.js route at `/profile/[address]` that renders a user's public profile.
- **Address**: A Stellar public key (G... format) that uniquely identifies a user.
- **Profile_Metadata**: User-controlled data including avatar image URI, bio text, and social links, stored in localStorage or IPFS.
- **Campaign**: A crowdfunding campaign deployed as a Soroban smart contract, as defined in `types/campaign.ts`.
- **Contribution_Record**: A record of a single contribution made by an address to a campaign, including amount and timestamp.
- **Profile_Store**: The client-side storage layer (localStorage) responsible for persisting and retrieving Profile_Metadata.
- **Stats_Aggregator**: The logic component that computes total raised and total contributed from campaign and contribution data.
- **IPFS**: InterPlanetary File System, used via Pinata for decentralized storage of profile avatars.

## Requirements

### Requirement 1: Profile Route and Address Resolution

**User Story:** As a visitor, I want to navigate to `/profile/[address]` for any Stellar address, so that I can view that user's public profile.

#### Acceptance Criteria

1. WHEN a visitor navigates to `/profile/[address]` with a valid Stellar address, THE Profile_Page SHALL render the profile for that address.
2. WHEN a visitor navigates to `/profile/[address]` with an invalid Stellar address format, THE Profile_Page SHALL display an error message indicating the address is invalid.
3. THE Profile_Page SHALL display the wallet address in a truncated, human-readable format (first 6 and last 4 characters).
4. WHEN the connected wallet address matches the profile address, THE Profile_Page SHALL display edit controls for profile customization.
5. WHEN the connected wallet address does not match the profile address, THE Profile_Page SHALL display the profile in read-only mode.

---

### Requirement 2: Campaigns Created by User

**User Story:** As a visitor, I want to see all campaigns created by a user, so that I can evaluate their track record as a campaign creator.

#### Acceptance Criteria

1. WHEN the Profile_Page loads, THE Profile_Page SHALL fetch and display all campaigns whose `creator` field matches the profile address.
2. WHEN no campaigns are found for the address, THE Profile_Page SHALL display an empty state message indicating no campaigns have been created.
3. WHEN campaigns are found, THE Profile_Page SHALL display each campaign as a card showing title, status, raised amount, goal, and deadline.
4. WHEN a campaign card is clicked, THE Profile_Page SHALL navigate to `/campaigns/[contractId]`.
5. WHILE campaigns are loading, THE Profile_Page SHALL display a loading skeleton in place of the campaign list.

---

### Requirement 3: Contribution History

**User Story:** As a visitor, I want to see a user's contribution history, so that I can understand their participation as a backer.

#### Acceptance Criteria

1. WHEN the Profile_Page loads, THE Profile_Page SHALL fetch and display all contributions made by the profile address across all known campaigns.
2. WHEN no contributions are found, THE Profile_Page SHALL display an empty state message indicating no contributions have been made.
3. WHEN contributions are found, THE Profile_Page SHALL display each contribution showing campaign title, contributed amount in XLM, and contribution timestamp.
4. THE Profile_Page SHALL display contributions sorted by timestamp in descending order (most recent first).
5. WHILE contribution history is loading, THE Profile_Page SHALL display a loading skeleton in place of the contribution list.

---

### Requirement 4: Aggregate Statistics

**User Story:** As a visitor, I want to see summary statistics for a user, so that I can quickly assess their overall activity on the platform.

#### Acceptance Criteria

1. THE Stats_Aggregator SHALL compute total raised as the sum of `raised` amounts across all campaigns created by the address.
2. THE Stats_Aggregator SHALL compute total contributed as the sum of all contribution amounts made by the address.
3. THE Profile_Page SHALL display total raised and total contributed in XLM with two decimal places.
4. THE Profile_Page SHALL display the count of campaigns created and the count of campaigns backed.
5. WHEN campaign or contribution data is unavailable, THE Stats_Aggregator SHALL treat missing values as zero and continue computing.

---

### Requirement 5: Profile Customization

**User Story:** As a connected user, I want to customize my profile with an avatar, bio, and social links, so that I can present myself to the community.

#### Acceptance Criteria

1. WHEN the connected wallet address matches the profile address, THE Profile_Page SHALL display an edit button to open the profile editor.
2. WHEN a user submits a valid profile form, THE Profile_Store SHALL persist the avatar URI, bio, and social links to localStorage keyed by the address.
3. WHEN a user uploads an avatar image, THE Profile_Page SHALL upload the image to IPFS via Pinata and store the resulting `ipfs://` URI in Profile_Metadata.
4. IF the Pinata upload fails, THEN THE Profile_Page SHALL display an error message and retain the previous avatar.
5. THE Profile_Store SHALL accept a bio of at most 280 characters.
6. THE Profile_Store SHALL accept at most 5 social links, each a valid URL.
7. WHEN the profile editor is saved, THE Profile_Page SHALL reflect the updated metadata immediately without a full page reload.

---

### Requirement 6: Social Links Display

**User Story:** As a visitor, I want to see a user's social links on their profile, so that I can connect with them on other platforms.

#### Acceptance Criteria

1. WHEN Profile_Metadata contains social links, THE Profile_Page SHALL render each social link as a clickable anchor that opens in a new tab.
2. WHEN a social link URL matches a known platform pattern (Twitter/X, GitHub, LinkedIn), THE Profile_Page SHALL display the corresponding platform icon alongside the link.
3. WHEN Profile_Metadata contains no social links, THE Profile_Page SHALL not render the social links section.
4. THE Profile_Page SHALL set `rel="noopener noreferrer"` on all external social link anchors.

---

### Requirement 7: Profile Metadata Persistence and Loading

**User Story:** As a user, I want my profile customization to persist across sessions, so that visitors always see my latest profile information.

#### Acceptance Criteria

1. WHEN the Profile_Page loads for a given address, THE Profile_Store SHALL attempt to load Profile_Metadata from localStorage using the address as the key.
2. WHEN no Profile_Metadata exists in localStorage for an address, THE Profile_Store SHALL return a default empty Profile_Metadata object.
3. WHEN Profile_Metadata is saved, THE Profile_Store SHALL serialize it to JSON and write it to localStorage.
4. FOR ALL valid Profile_Metadata objects, serializing then deserializing SHALL produce an equivalent object (round-trip property).
5. IF localStorage is unavailable (e.g., in a private browsing context), THEN THE Profile_Store SHALL handle the error gracefully and operate with in-memory defaults.
