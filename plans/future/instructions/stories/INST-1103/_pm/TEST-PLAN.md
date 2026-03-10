# Test Plan: INST-1103 - Upload Thumbnail

## Scope Summary

### Endpoints Touched
- `POST /api/v2/mocs/:id/thumbnail` (frontend)
- `POST /mocs/:id/thumbnail` (backend)

### UI Touched
Yes - ThumbnailUpload component with drag-drop zone, file picker, preview, validation

### Data/Storage Touched
- **Database**: `moc_instructions.thumbnailUrl` field update
- **S3**: Image storage at `mocs/{userId}/{mocId}/thumbnail/{uuid}-{filename}`
- **CloudFront**: URL conversion for responses

---

## Happy Path Tests

### Test 1: Upload JPEG thumbnail via file picker
- **Setup**:
  - User authenticated
  - MOC exists with id `test-moc-123`
  - Valid JPEG image (2MB, 1024x768)
- **Action**:
  1. Navigate to MOC detail page `/mocs/test-moc-123`
  2. Click thumbnail upload area
  3. Select JPEG file from file picker
  4. Click "Upload" button
- **Expected Outcome**:
  - Image preview displays before upload
  - Loading spinner shows during upload
  - Success toast: "Thumbnail uploaded!"
  - Thumbnail displays in cover image card
  - Gallery card shows new thumbnail
- **Evidence**:
  - POST /api/v2/mocs/test-moc-123/thumbnail returns 200 with `{ thumbnailUrl: "https://cdn.example.com/..." }`
  - S3 object created at `mocs/{userId}/test-moc-123/thumbnail/{uuid}-image.jpg`
  - Database `moc_instructions.thumbnailUrl` updated
  - UI re-renders with new thumbnail URL

### Test 2: Upload PNG thumbnail via drag-and-drop
- **Setup**:
  - User authenticated
  - MOC exists
  - Valid PNG image (5MB, 2048x2048)
- **Action**:
  1. Navigate to MOC detail page
  2. Drag PNG file over upload zone
  3. Drop file
  4. Confirm upload
- **Expected Outcome**:
  - Drag-over visual feedback (border color change, opacity)
  - Image preview displays
  - Upload succeeds
  - Thumbnail replaces any existing image
- **Evidence**:
  - Drag events fire correctly
  - POST /api/v2/mocs/:id/thumbnail called
  - Response contains CloudFront URL
  - Old S3 object deleted (if existed)
  - New S3 object created

### Test 3: Replace existing thumbnail
- **Setup**:
  - MOC exists with existing thumbnail
  - New valid WebP image (3MB)
- **Action**:
  1. Upload new WebP image
- **Expected Outcome**:
  - Old thumbnail deleted from S3
  - New thumbnail uploaded
  - Database updated with new URL
  - UI shows new image immediately
- **Evidence**:
  - Old S3 key logged for deletion
  - New S3 object created
  - Single thumbnailUrl in database (not duplicated)
  - Gallery and detail page both show new image

### Test 4: Upload on create page after MOC creation
- **Setup**:
  - User on `/mocs/new` page
  - MOC form filled out
- **Action**:
  1. Submit MOC form
  2. Redirect to detail page
  3. Upload thumbnail immediately
- **Expected Outcome**:
  - MOC created successfully
  - Thumbnail upload available on new detail page
  - Upload succeeds
- **Evidence**:
  - POST /api/v2/mocs creates MOC
  - Redirect to /mocs/{newMocId}
  - POST /api/v2/mocs/{newMocId}/thumbnail succeeds
  - Thumbnail visible in UI

---

## Error Cases

### Error 1: Reject non-image file (PDF)
- **Setup**: User attempts to upload PDF file
- **Action**: Select PDF in file picker or drag PDF to upload zone
- **Expected Outcome**:
  - Client-side validation blocks upload
  - Error toast: "Only images allowed (JPEG, PNG, WebP)"
  - Upload button disabled
- **Evidence**:
  - File input accept="image/*" enforced
  - MIME type validation prevents POST
  - No network request made

### Error 2: Reject oversized file (>10MB)
- **Setup**: User attempts to upload 15MB JPEG
- **Action**: Select oversized file
- **Expected Outcome**:
  - Client-side validation warns: "File too large. Max 10MB"
  - Upload button disabled
  - No upload attempted
- **Evidence**:
  - File size validation runs
  - No POST request sent
  - Toast notification displays

### Error 3: Backend rejects invalid MIME type
- **Setup**: Client validation bypassed (e.g., file renamed .jpg but is actually .exe)
- **Action**: Upload file
- **Expected Outcome**:
  - POST /api/v2/mocs/:id/thumbnail returns 400
  - Error response: `{ code: "INVALID_MIME_TYPE", message: "..." }`
  - Error toast displays backend message
  - Security log entry created
- **Evidence**:
  - Backend validates actual MIME type (not filename)
  - file-type library verifies content
  - 400 response logged
  - CloudWatch security event logged

### Error 4: Backend rejects oversized file (>10MB)
- **Setup**: Client validation bypassed
- **Action**: Upload 12MB file
- **Expected Outcome**:
  - POST returns 400
  - Error response: `{ code: "FILE_TOO_LARGE", message: "..." }`
  - Toast: "File too large. Max 10MB"
- **Evidence**:
  - Backend file size validation enforces 10MB limit
  - No S3 upload attempted
  - Database not updated

### Error 5: Unauthorized upload (wrong user)
- **Setup**: User A attempts to upload thumbnail to User B's MOC
- **Action**: POST /api/v2/mocs/{userB-moc-id}/thumbnail
- **Expected Outcome**:
  - 403 Forbidden
  - Error: "You do not own this MOC"
- **Evidence**:
  - Auth middleware verifies userId
  - Authorization check: userId from token must match MOC owner
  - No S3 upload
  - No DB update

### Error 6: MOC not found
- **Setup**: Upload thumbnail to non-existent MOC
- **Action**: POST /api/v2/mocs/invalid-id/thumbnail
- **Expected Outcome**:
  - 404 Not Found
  - Error: "MOC not found"
- **Evidence**:
  - Database query for MOC returns null
  - 404 response before file processing
  - No S3 upload attempted

### Error 7: S3 upload failure
- **Setup**: S3 service temporarily unavailable
- **Action**: Upload valid image
- **Expected Outcome**:
  - 500 Internal Server Error
  - Error: "Upload failed. Please try again"
  - Database NOT updated (transaction rollback)
  - CloudWatch error logged
- **Evidence**:
  - S3 upload throws error
  - Transaction rolled back
  - No thumbnailUrl in database
  - Error logged with mocId, userId, filename

### Error 8: Network failure during upload
- **Setup**: Network disconnects mid-upload
- **Action**: Start upload, disconnect network
- **Expected Outcome**:
  - Frontend shows error toast: "Network error. Please try again"
  - Retry button available
  - Upload state resets
- **Evidence**:
  - Fetch API catches network error
  - Error boundary prevents crash
  - User can retry without page reload

---

## Edge Cases

### Edge 1: Very small image (100x100 pixels)
- **Setup**: Upload 100x100 pixel thumbnail (10KB)
- **Action**: Upload file
- **Expected Outcome**:
  - Upload succeeds
  - Image stored as-is (no resize if <800x800)
  - Display in gallery card may be upscaled
- **Evidence**:
  - No validation error for small dimensions
  - S3 object created
  - CloudFront URL returned

### Edge 2: Very large image (8000x6000 pixels, 9.8MB)
- **Setup**: Upload high-resolution image just under 10MB
- **Action**: Upload file
- **Expected Outcome**:
  - Upload succeeds
  - Optional: Backend resizes to 800x800 before S3 upload
  - Thumbnail displays correctly
- **Evidence**:
  - File size validation passes (9.8MB < 10MB)
  - Optional: Sharp library resizes image
  - S3 object created
  - CloudFront URL returned

### Edge 3: Image with special characters in filename
- **Setup**: Upload file named `My MOC (2024) - Final [v2].jpg`
- **Action**: Upload file
- **Expected Outcome**:
  - Filename sanitized: `{uuid}-my-moc-2024-final-v2.jpg`
  - Upload succeeds
- **Evidence**:
  - Backend sanitizes filename (remove special chars)
  - S3 key: `mocs/{userId}/{mocId}/thumbnail/{uuid}-my-moc-2024-final-v2.jpg`
  - Original filename preserved in metadata (optional)

### Edge 4: Concurrent uploads (replace in progress)
- **Setup**: User uploads Image A, then immediately uploads Image B before A completes
- **Action**: Start upload A, start upload B mid-upload
- **Expected Outcome**:
  - Image B replaces Image A
  - Only one thumbnail stored
  - No orphaned S3 objects
- **Evidence**:
  - Backend handles concurrent requests
  - Last write wins
  - S3 cleanup deletes Image A if B succeeds
  - Database has single thumbnailUrl (Image B)

### Edge 5: Mobile file picker (no drag-drop)
- **Setup**: User on mobile device
- **Action**: Tap upload zone
- **Expected Outcome**:
  - Native file picker opens
  - User selects image from camera roll
  - Upload proceeds normally
- **Evidence**:
  - File input triggers on tap
  - Mobile file picker works
  - Upload completes

### Edge 6: Zero-byte file
- **Setup**: Upload 0-byte file
- **Action**: Select file
- **Expected Outcome**:
  - Client validation rejects: "Invalid file"
  - Backend validation rejects if client bypassed
- **Evidence**:
  - File size validation: size >= 1 byte
  - 400 error: FILE_TOO_SMALL
  - No S3 upload

---

## Coverage Targets

| Component | Target | Why |
|-----------|--------|-----|
| ThumbnailUpload.tsx | 80% | All validation paths, preview, upload states |
| Backend route handler | 90% | All validation, auth, S3 upload, error paths |
| File validation utilities | 95% | Critical security boundary |
| S3 storage adapter | 85% | Upload, delete, CloudFront conversion |

---

## Test Data Requirements

### Valid Test Images
- `test-thumbnail-small.jpg` - 100KB, 512x512, JPEG
- `test-thumbnail-medium.png` - 2MB, 1024x1024, PNG
- `test-thumbnail-large.webp` - 9MB, 4096x4096, WebP
- `test-thumbnail-wide.jpg` - 3MB, 1920x1080, JPEG (16:9 aspect ratio)

### Invalid Test Files
- `test-invalid.pdf` - 500KB, PDF document
- `test-invalid.svg` - 100KB, SVG image (vector, not raster)
- `test-oversized.jpg` - 12MB, 8000x6000, JPEG (exceeds 10MB limit)
- `test-zero.jpg` - 0 bytes, empty file
- `test-malformed.jpg` - Corrupted JPEG header

---

## Test Execution Notes

### Unit Tests (Vitest + React Testing Library)
- Location: `apps/web/app-instructions-gallery/src/components/__tests__/ThumbnailUpload.test.tsx`
- Run: `pnpm test ThumbnailUpload.test.tsx`
- Mocks: MSW handlers for POST /api/v2/mocs/:id/thumbnail

### Integration Tests (Vitest + MSW)
- Location: `apps/web/app-instructions-gallery/src/components/__tests__/ThumbnailUpload.integration.test.tsx`
- Run: `pnpm test ThumbnailUpload.integration.test.tsx`
- Mocks: MSW with success/error scenarios

### E2E Tests (Playwright + Cucumber)
- Location: `apps/web/playwright/features/instructions/inst-1103-thumbnail.feature`
- Run: `pnpm test:e2e --grep "INST-1103"`
- Environment: Test S3 bucket, test database
- **IMPORTANT**: Per ADR-005, E2E tests MUST use real S3, not mocks

### Backend Unit Tests (Vitest)
- Location: `apps/api/lego-api/domains/mocs/__tests__/thumbnail-upload.test.ts`
- Run: `cd apps/api/lego-api && pnpm test thumbnail-upload.test.ts`
- Mocks: S3 client (but validate calls)

---

## Success Criteria

- [ ] All happy path tests pass
- [ ] All error cases handled gracefully
- [ ] Edge cases covered
- [ ] Coverage targets met
- [ ] At least one E2E happy path test passes (per ADR-006)
- [ ] No security validation bypasses
- [ ] Mobile upload works
- [ ] Keyboard navigation functional
