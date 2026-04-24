# Requirements Document

## Introduction

This feature allows campaign creators to post, edit, and delete text updates on their campaigns. Updates are stored as JSON objects on IPFS via the existing Pinata integration and referenced by a local index persisted in `localStorage`. Contributors visiting a campaign detail page can read all updates in chronological order. The existing `NotificationContext` is extended with a new `"campaign_update"` notification type so contributors who have previously interacted with a campaign are notified when a new update is posted.

## Glossary

- **Update**: A creator-authored post attached to a campaign, containing a title, body text, an optional image URI, and metadata (author address, timestamp, campaign ID). Stored as a JSON file on IPFS.
- **UpdateRecord**: The lightweight index entry stored in `localStorage` that maps a campaign ID to an ordered list of IPFS CIDs for its updates.
- **UpdateStore**: The client-side module (`src/lib/updateStore.ts`) responsible for reading and writing `UpdateRecord` entries in `localStorage` and uploading/fetching Update JSON via Pinata.
- **PostUpdateModal**: The React modal component (`src/components/ui/PostUpdateModal.tsx`) that collects update content from the creator and triggers the upload flow.
- **UpdateFeed**: The React component (`src/components/ui/UpdateFeed.tsx`) that fetches and renders all updates for a given campaign in reverse-chronological order.
- **UpdateCard**: The sub-component within `UpdateFeed` that renders a single update entry.
- **Pinata**: The IPFS pinning service accessed via `src/lib/pinata.ts`.
- **IPFS_URI**: A string of the form `ipfs://<CID>` returned by Pinata after a successful upload.
- **Campaign**: The data model defined in `src/types/campaign.ts`.
- **Dashboard**: The creator dashboard page at `src/app/dashboard/page.tsx`.
- **CampaignDetailPage**: The public campaign page at `src/app/campaigns/[id]/page.tsx`.
- **NotificationContext**: The existing context at `src/context/NotificationContext.tsx` that manages in-app notifications.

---

## Requirements

### Requirement 1: Update Data Structure and Storage

**User Story:** As a developer, I want a well-defined update data structure stored on IPFS, so that updates are decentralised, immutable, and retrievable by any client.

#### Acceptance Criteria

1. THE UpdateStore SHALL define an `Update` type with fields: `campaignId: string`, `title: string`, `body: string`, `imageUri?: string`, `authorAddress: string`, `createdAt: number` (Unix ms timestamp).
2. WHEN an update is created, THE UpdateStore SHALL serialise the `Update` object to JSON and upload it to IPFS via `uploadToPinata`, returning the resulting IPFS_URI.
3. WHEN an IPFS_URI for an update is provided, THE UpdateStore SHALL fetch the JSON from the IPFS gateway and deserialise it back into an `Update` object.
4. THE UpdateStore SHALL maintain an `UpdateRecord` in `localStorage` keyed by campaign ID, storing an ordered array of IPFS CIDs (most-recent first) for that campaign's updates.
5. WHEN an update is successfully uploaded, THE UpdateStore SHALL prepend its CID to the campaign's `UpdateRecord` array in `localStorage`.
6. WHEN an update is deleted, THE UpdateStore SHALL remove its CID from the campaign's `UpdateRecord` array in `localStorage`.
7. IF `localStorage` is unavailable or corrupted, THEN THE UpdateStore SHALL return an empty array for any campaign's update list without throwing.

---

### Requirement 2: Post Update Button on Dashboard

**User Story:** As a creator, I want a "Post Update" button on my dashboard campaign cards, so that I can quickly navigate to posting an update for a specific campaign.

#### Acceptance Criteria

1. WHEN a campaign card is rendered on the Dashboard and the campaign status is `"Active"`, THE Dashboard SHALL display a "Post Update" button on that card.
2. WHEN a creator clicks the "Post Update" button, THE Dashboard SHALL open the `PostUpdateModal` pre-filled with the corresponding campaign ID.
3. WHILE the `PostUpdateModal` is open, THE Dashboard SHALL disable the "Post Update" button to prevent duplicate modal instances.
4. WHEN the `PostUpdateModal` is closed (either by submission or cancellation), THE Dashboard SHALL re-enable the "Post Update" button.

---

### Requirement 3: Update Creation Modal

**User Story:** As a creator, I want a modal form to compose and submit a campaign update, so that I can communicate progress to my contributors.

#### Acceptance Criteria

1. THE PostUpdateModal SHALL contain a required `title` text input (maximum 100 characters) and a required `body` textarea (maximum 2000 characters).
2. WHEN a creator submits the modal with an empty `title` or empty `body`, THE PostUpdateModal SHALL display a validation error and SHALL NOT initiate an upload.
3. WHEN a creator submits a valid update, THE PostUpdateModal SHALL call `UpdateStore.createUpdate` and display an uploading indicator while the upload is in progress.
4. WHILE an upload is in progress, THE PostUpdateModal SHALL disable all form controls and the submit button.
5. WHEN `UpdateStore.createUpdate` resolves successfully, THE PostUpdateModal SHALL close and THE Dashboard SHALL reflect the new update count without a full page reload.
6. IF `UpdateStore.createUpdate` throws an error, THEN THE PostUpdateModal SHALL display the error message and remain open so the creator can retry.
7. WHEN a creator clicks the cancel button or presses Escape, THE PostUpdateModal SHALL close without initiating any upload.

---

### Requirement 4: Display Updates on Campaign Detail Page

**User Story:** As a contributor or visitor, I want to see all updates posted by the creator on the campaign detail page, so that I can follow the campaign's progress.

#### Acceptance Criteria

1. WHEN the `CampaignDetailPage` renders, THE UpdateFeed SHALL fetch all update CIDs for the campaign from `localStorage` and resolve each to an `Update` object via the IPFS gateway.
2. THE UpdateFeed SHALL display updates in reverse-chronological order (most recent first).
3. WHEN updates are loading, THE UpdateFeed SHALL display a loading skeleton in place of the update list.
4. WHEN a campaign has no updates, THE UpdateFeed SHALL display an empty-state message: "No updates yet."
5. WHEN an individual update fails to load from IPFS, THE UpdateFeed SHALL display an error placeholder for that update and continue rendering the remaining updates.
6. EACH UpdateCard SHALL display the update `title`, `body`, and a human-readable relative timestamp (e.g. "3 days ago").

---

### Requirement 5: Update Notifications for Contributors

**User Story:** As a contributor, I want to receive an in-app notification when a campaign I have contributed to posts a new update, so that I stay informed about campaign progress.

#### Acceptance Criteria

1. WHEN `UpdateStore.createUpdate` completes successfully, THE UpdateStore SHALL call `addNotification` from `NotificationContext` with `type: "campaign_update"`, the campaign title, and a preview of the update title.
2. THE `NotificationContext` SHALL support a `"campaign_update"` notification type in addition to the existing types.
3. WHEN a `"campaign_update"` notification is displayed in the `NotificationDropdown`, THE NotificationDropdown SHALL render a distinct icon for the `"campaign_update"` type.
4. WHEN a contributor clicks a `"campaign_update"` notification, THE NotificationDropdown SHALL navigate the user to the corresponding campaign detail page.

---

### Requirement 6: Update Editing

**User Story:** As a creator, I want to edit an update I have already posted, so that I can correct mistakes or add information.

#### Acceptance Criteria

1. WHEN an `UpdateCard` is rendered and the currently connected wallet address matches the update's `authorAddress`, THE UpdateCard SHALL display an "Edit" button.
2. WHEN a creator clicks "Edit" on an `UpdateCard`, THE Dashboard or `CampaignDetailPage` SHALL open the `PostUpdateModal` pre-populated with the existing update's `title` and `body`.
3. WHEN a creator submits an edited update, THE UpdateStore SHALL upload a new IPFS object with the updated content and replace the old CID with the new CID in the campaign's `UpdateRecord`.
4. WHEN an edit is submitted, THE UpdateStore SHALL preserve the original `createdAt` timestamp and set an `editedAt: number` field on the new `Update` object.
5. WHEN an edited `UpdateCard` is rendered, THE UpdateCard SHALL display an "Edited" label alongside the timestamp.

---

### Requirement 7: Update Deletion

**User Story:** As a creator, I want to delete an update I have posted, so that I can remove outdated or incorrect information.

#### Acceptance Criteria

1. WHEN an `UpdateCard` is rendered and the currently connected wallet address matches the update's `authorAddress`, THE UpdateCard SHALL display a "Delete" button.
2. WHEN a creator clicks "Delete", THE UpdateCard SHALL display a confirmation prompt before proceeding.
3. WHEN a creator confirms deletion, THE UpdateStore SHALL remove the update's CID from the campaign's `UpdateRecord` in `localStorage`.
4. WHEN deletion completes, THE UpdateFeed SHALL remove the deleted `UpdateCard` from the rendered list without a full page reload.
5. IF deletion fails, THE UpdateCard SHALL display an error message and retain the update in the list.
