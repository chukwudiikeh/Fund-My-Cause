# Requirements Document

## Introduction

This feature enhances the campaign image upload experience in the Next.js frontend. Creators can upload custom images for their campaigns via drag-and-drop or file picker, preview and crop the image before upload, validate file constraints client-side, upload to IPFS via the existing Pinata integration, and store the resulting IPFS hash in campaign metadata. Campaigns without a custom image display a deterministic fallback image so the UI never renders broken image elements.

## Glossary

- **ImageUploader**: The React component responsible for accepting, validating, cropping, previewing, and uploading campaign images.
- **ImageValidator**: The module that enforces file-type and file-size constraints before any upload is attempted.
- **CropTool**: The in-browser image cropping interface presented after a file is selected.
- **Pinata**: The IPFS pinning service used to store campaign images; accessed via `apps/interface/src/lib/pinata.ts`.
- **IPFS_URI**: A string of the form `ipfs://<CID>` returned by Pinata after a successful upload.
- **FallbackImage**: A deterministic placeholder image rendered when a campaign has no custom image.
- **Campaign**: The data model defined in `apps/interface/src/types/campaign.ts`.
- **CreateFlow**: The multi-step campaign creation wizard at `apps/interface/src/app/create/page.tsx`.

---

## Requirements

### Requirement 1: Image File Validation

**User Story:** As a creator, I want invalid files rejected immediately with a clear message, so that I do not waste time waiting for a failed upload.

#### Acceptance Criteria

1. WHEN a user selects or drops a file whose MIME type is not `image/png`, `image/jpeg`, or `image/webp`, THEN THE ImageValidator SHALL reject the file and return the error message "Only PNG, JPG, or WebP images are allowed."
2. WHEN a user selects or drops a file whose size exceeds 5 MB, THEN THE ImageValidator SHALL reject the file and return the error message "Image must be under 5 MB."
3. WHEN a user selects or drops a file that passes both type and size checks, THEN THE ImageValidator SHALL return a success result with no error message.
4. IF both the MIME type and the file size are invalid, THEN THE ImageValidator SHALL return the type error first.

---

### Requirement 2: Drag-and-Drop Upload

**User Story:** As a creator, I want to drag and drop an image onto the upload area, so that I can add a campaign image without opening a file picker.

#### Acceptance Criteria

1. WHEN a user drags a file over the ImageUploader drop zone, THEN THE ImageUploader SHALL apply a visual highlight to the drop zone to indicate it is active.
2. WHEN a user drags a file away from the drop zone without dropping, THEN THE ImageUploader SHALL remove the visual highlight from the drop zone.
3. WHEN a user drops a valid file onto the drop zone, THEN THE ImageUploader SHALL process the file identically to a file selected via the file picker.
4. WHEN a user drops an invalid file onto the drop zone, THEN THE ImageUploader SHALL display the validation error returned by the ImageValidator.
5. WHILE an upload is in progress, THE ImageUploader SHALL disable the drop zone and file picker to prevent concurrent uploads.

---

### Requirement 3: Image Preview and Crop

**User Story:** As a creator, I want to preview and crop my image before it is uploaded, so that I can control how the campaign image appears.

#### Acceptance Criteria

1. WHEN a valid file is selected or dropped, THEN THE CropTool SHALL display the image in a crop interface before any upload begins.
2. WHEN a user confirms the crop, THEN THE ImageUploader SHALL upload only the cropped region of the image to Pinata.
3. WHEN a user cancels the crop, THEN THE ImageUploader SHALL discard the selected file and return to the idle state with no upload initiated.
4. THE CropTool SHALL enforce a fixed 16:9 aspect ratio for all crops.
5. WHEN the cropped image is produced, THE ImageUploader SHALL convert it to a `image/webp` blob before uploading, regardless of the original file format.

---

### Requirement 4: IPFS Upload via Pinata

**User Story:** As a creator, I want my campaign image stored on IPFS, so that the image is decentralised and permanently accessible.

#### Acceptance Criteria

1. WHEN a user confirms the crop, THEN THE ImageUploader SHALL call `uploadToPinata` with the cropped image blob.
2. WHEN `uploadToPinata` resolves successfully, THEN THE ImageUploader SHALL store the returned IPFS_URI in the CreateFlow form state field `imageUrl`.
3. WHEN `uploadToPinata` resolves successfully, THEN THE ImageUploader SHALL display the IPFS_URI to the user as confirmation.
4. IF `uploadToPinata` throws an error, THEN THE ImageUploader SHALL display the error message and return to the idle state so the user can retry.
5. WHILE `uploadToPinata` is in progress, THE ImageUploader SHALL display an uploading indicator and disable all interactive controls.

---

### Requirement 5: IPFS Hash in Campaign Metadata

**User Story:** As a creator, I want the IPFS image URI stored in campaign metadata, so that the image is retrievable when the campaign is displayed.

#### Acceptance Criteria

1. WHEN the CreateFlow submits a campaign with a non-empty `imageUrl`, THE CreateFlow SHALL pass the IPFS_URI as the first element of the `socialLinks` array in the `buildInitializeTx` call.
2. WHEN the CreateFlow submits a campaign with an empty `imageUrl`, THE CreateFlow SHALL pass `undefined` for `socialLinks` in the `buildInitializeTx` call.
3. THE Campaign type's `image` field SHALL accept an IPFS_URI string or `undefined`.

---

### Requirement 6: Fallback Images for Campaigns Without Uploads

**User Story:** As a visitor, I want campaigns without a custom image to display a placeholder, so that the UI never shows broken image elements.

#### Acceptance Criteria

1. WHEN a `Campaign` object has an `image` field that is `undefined`, empty, or not a valid URI, THEN THE CampaignCard SHALL render a fallback image instead of the campaign image.
2. THE CampaignCard SHALL derive the fallback image deterministically from the campaign `id` so that the same campaign always shows the same fallback.
3. WHEN a `Campaign` object has a valid `image` URI, THEN THE CampaignCard SHALL render that image and SHALL NOT render the fallback.
4. IF the campaign image URI fails to load at runtime, THEN THE CampaignCard SHALL fall back to the deterministic fallback image.
