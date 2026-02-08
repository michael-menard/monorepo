---
generated: "2026-02-06"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: INST-1103

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline file found. Seed generated from codebase scanning and ADR review.

### Relevant Existing Features

| Feature | Status | Files |
|---------|--------|-------|
| ImageUploadZone Component | Production | `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx` |
| Wishlist Presigned Upload | Production | `apps/api/lego-api/domains/wishlist/routes.ts`, `adapters/storage.ts` |
| File Validation Utilities | Production | `apps/api/lego-api/core/utils/file-validation.ts` |
| Image Optimizer Service | Production | `apps/api/lego-api/core/image-processing/optimizer.ts` |
| MOC POST /mocs Route | Production | `apps/api/lego-api/domains/mocs/routes.ts` |
| MOC GET /mocs/:id Route | Production | `apps/api/lego-api/domains/mocs/routes.ts` |
| Database moc_instructions table | Exists | Schema with thumbnailUrl field |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| INST-1102 | Create Basic MOC | In Progress | BLOCKING - Need base MOC creation before thumbnail upload |
| INST-1101 | View MOC Details | In Progress | Will display uploaded thumbnail |
| INST-1100 | View MOC Gallery | Ready for QA | Will display thumbnail in gallery cards |
| INST-1008 | Wire RTK Query Mutations | UAT | Provides RTK infrastructure |

### Constraints to Respect

From codebase:
- **CLAUDE.md**: All types MUST use Zod schemas with `z.infer<>` - no TypeScript interfaces
- **CLAUDE.md**: NO barrel files - import directly from source files
- **CLAUDE.md**: Use `@repo/app-component-library` for all UI components
- **Project structure**: React 19, Tailwind CSS, Hono backend, Vitest + Playwright testing
- **File validation**: JPEG/PNG/WebP only, max 10MB (established in wishlist domain)
- **Sharp processing**: Image optimization with resize/WebP conversion available

---

## Retrieved Context

### Related Endpoints

| Endpoint | Method | File | Notes |
|----------|--------|------|-------|
| `/wishlist/presign` | POST | `apps/api/lego-api/domains/wishlist/routes.ts` | Pattern for presigned URL generation |
| `/wishlist/:id` | POST (body) | `apps/api/lego-api/domains/wishlist/routes.ts` | Pattern for image upload with validation |
| `/mocs` | POST | `apps/api/lego-api/domains/mocs/routes.ts` | MOC creation endpoint |
| `/mocs/:id` | GET | `apps/api/lego-api/domains/mocs/routes.ts` | MOC detail endpoint |

### Related Components

| Component | Path | Reuse Potential |
|-----------|------|-----------------|
| ImageUploadZone | `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx` | HIGH - Complete drag-drop upload with preview |
| WishlistImageStorage | `apps/api/lego-api/domains/wishlist/adapters/storage.ts` | HIGH - Presigned URL pattern, validation |
| FileValidation | `apps/api/lego-api/core/utils/file-validation.ts` | HIGH - MIME type, file size validation |
| ImageOptimizer | `apps/api/lego-api/core/image-processing/optimizer.ts` | MEDIUM - Resize/optimize if needed |

### Reuse Candidates

**Components (from existing codebase):**
- `ImageUploadZone` - Full drag-drop zone with preview, validation, and reordering
  - Supports maxImages limit
  - File type filtering (image/*)
  - Preview with remove/reorder buttons
  - Drag-over state management
- `Button`, `Card` from `@repo/app-component-library`
- File validation utilities from `core/utils/file-validation.ts`

**Patterns:**
- **Direct upload for ≤10MB**: Multipart/form-data POST endpoint (simpler than presigned)
- **File validation**: MIME type whitelist (image/jpeg, image/png, image/webp)
- **Security logging**: Structured CloudWatch logs for rejected files
- **S3 storage**: Direct upload to S3 with key pattern `mocs/{userId}/{mocId}/thumbnail/{filename}`
- **Database update**: Update `moc_instructions.thumbnailUrl` with S3/CloudFront URL
- **Image optimization**: Optional resize to standard dimensions (e.g., 800x800 for thumbnails)

**Established Validation Rules (from wishlist domain):**
- MIME types: `['image/jpeg', 'image/png', 'image/webp']`
- File size: 1 byte minimum, 10MB maximum
- Extension validation: `['jpg', 'jpeg', 'png', 'webp']`
- Security: Whitelist validation with rejection logging

---

## Knowledge Context

### Lessons Learned

No knowledge base available - lessons loaded: false

### Blockers to Avoid (from patterns observed)

From wishlist implementation:
- **API path mismatch**: Frontend uses `/api/v2/{domain}`, backend uses `/{domain}` - must align with ADR-001
- **Schema drift**: Keep frontend/backend Zod schemas in sync
- **Missing auth middleware**: All routes require `auth`, `loadPermissions`, `requireFeature`
- **File validation**: Server-side validation is REQUIRED even if client validates
- **MIME type spoofing**: Validate MIME type from request, not just filename extension
- **Zero-byte files**: Explicitly reject files < 1 byte

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/mocs/:id/thumbnail`, Backend: `/mocs/:id/thumbnail` |
| ADR-003 | Image Storage and CDN Architecture | Use S3 + CloudFront, convert URLs on read |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test required |

### Patterns to Follow

From ADR-001:
- Frontend RTK Query endpoints use `/api/v2/mocs/:id/thumbnail`
- Backend Hono routes use `/mocs/:id/thumbnail`
- Vite proxy rewrites for local dev

From ADR-003:
- Store in S3 with key pattern: `mocs/{userId}/{mocId}/thumbnail/{filename}`
- Return CloudFront URL in response
- Convert S3 URLs to CloudFront URLs in repository mapper

From wishlist upload implementation:
- **Direct upload pattern**: Use multipart/form-data for files ≤10MB
- **Validation sequence**: MIME type → File size → Extension → Upload
- **Security logging**: Log rejected uploads with userId, filename, reason
- **Response format**: Return `{ thumbnailUrl: string }` on success
- **Error handling**: Return 400 with specific error code (INVALID_MIME_TYPE, FILE_TOO_LARGE, etc.)

### Patterns to Avoid

- Do NOT use TypeScript interfaces - use Zod schemas
- Do NOT create barrel files (index.ts re-exports)
- Do NOT skip server-side validation even if client validates
- Do NOT trust client-provided MIME types without verification
- Do NOT allow files without proper authentication and authorization

---

## Conflict Analysis

### Conflict: Blocking Dependency
- **Severity**: blocking
- **Description**: INST-1102 (Create Basic MOC) is in progress. This story requires a MOC to exist before a thumbnail can be uploaded. The POST /mocs endpoint must be functional and the MOC detail page should be accessible to test thumbnail upload functionality.
- **Resolution Hint**: Wait for INST-1102 to complete backend implementation (POST /mocs route) before starting this story. Alternatively, coordinate with INST-1102 to ensure the endpoint is available for integration testing.

---

## Story Seed

### Title
Upload Thumbnail

### Description

**Context:**
The MOC Instructions feature allows users to manage their custom LEGO builds. MOCs are displayed in a gallery (INST-1100) and detail page (INST-1101) where thumbnails provide visual appeal. The `moc_instructions` database table has a `thumbnailUrl` field ready to store the image URL. The codebase has proven patterns for image upload from the wishlist domain, including:
- `ImageUploadZone` component with drag-drop, preview, and validation
- File validation utilities with MIME type whitelist and size limits
- S3 storage with CloudFront CDN integration
- Security logging for rejected uploads

**Problem:**
Users need to upload a cover image for their MOCs to make them visually identifiable in the gallery. Without thumbnails, MOCs appear as generic placeholders, reducing user engagement and making it harder to find specific MOCs at a glance.

**Solution:**
Implement thumbnail upload functionality as a vertical slice:
- **Frontend**: Adapt `ImageUploadZone` component for single-image thumbnail upload
- **Backend**: `POST /mocs/:id/thumbnail` endpoint for direct upload (≤10MB)
- **Storage**: Upload to S3 with key `mocs/{userId}/{mocId}/thumbnail/{filename}`
- **Database**: Update `moc_instructions.thumbnailUrl` with CloudFront URL
- **Validation**: Server-side MIME type, file size, and extension validation
- **Optional**: Image resize/optimization to standard thumbnail dimensions (e.g., 800x800)

### Initial Acceptance Criteria

**Frontend (apps/web/app-instructions-gallery)**

- [ ] **AC1**: Thumbnail upload component renders on create page (`/mocs/new`) after MOC creation
- [ ] **AC2**: Thumbnail upload component renders on detail page (`/mocs/:id`) with "Change Thumbnail" action
- [ ] **AC3**: Upload zone supports drag-and-drop for image files
- [ ] **AC4**: Upload zone supports file picker (click to select)
- [ ] **AC5**: Client-side validation rejects non-image files (alert: "Only images allowed")
- [ ] **AC6**: Client-side validation rejects files >10MB (alert: "File too large. Max 10MB")
- [ ] **AC7**: Image preview displays selected file before upload
- [ ] **AC8**: Preview shows filename and file size
- [ ] **AC9**: "Remove" button clears selected image before upload
- [ ] **AC10**: "Upload" button triggers multipart/form-data POST to `/api/v2/mocs/:id/thumbnail`
- [ ] **AC11**: Success shows toast "Thumbnail uploaded!" and updates UI with new thumbnail
- [ ] **AC12**: Existing thumbnail is replaced (not appended) on new upload
- [ ] **AC13**: Errors from API (e.g., "File too large") display as toast notifications
- [ ] **AC14**: Loading state shows during upload with disabled upload button

**Backend (apps/api/lego-api/domains/mocs)**

- [ ] **AC15**: `POST /mocs/:id/thumbnail` endpoint accepts multipart/form-data
- [ ] **AC16**: Endpoint requires authentication (auth middleware)
- [ ] **AC17**: Endpoint requires feature gate `requireFeature('moc')`
- [ ] **AC18**: Authorization check: userId from auth context must match MOC owner
- [ ] **AC19**: Return 404 if MOC not found
- [ ] **AC20**: Return 403 if user does not own the MOC
- [ ] **AC21**: Validate MIME type against whitelist: `['image/jpeg', 'image/png', 'image/webp']`
- [ ] **AC22**: Return 400 with code `INVALID_MIME_TYPE` if validation fails
- [ ] **AC23**: Validate file size: 1 byte ≤ size ≤ 10MB
- [ ] **AC24**: Return 400 with code `FILE_TOO_LARGE` or `FILE_TOO_SMALL` if validation fails
- [ ] **AC25**: Upload file to S3 with key pattern: `mocs/{userId}/{mocId}/thumbnail/{uuid}-{filename}`
- [ ] **AC26**: Update `moc_instructions.thumbnailUrl` with CloudFront URL (via S3→CloudFront conversion)
- [ ] **AC27**: If existing thumbnail exists, delete old S3 object before uploading new one
- [ ] **AC28**: Return 200 with response: `{ thumbnailUrl: string }`
- [ ] **AC29**: Log security events for rejected uploads (invalid type, oversized, etc.)
- [ ] **AC30**: Handle S3 upload failures gracefully with 500 error and logging

**Database**

- [ ] **AC31**: `moc_instructions.thumbnailUrl` updated with S3 URL
- [ ] **AC32**: Transaction ensures DB update only if S3 upload succeeds
- [ ] **AC33**: Optional: Store thumbnail metadata in `moc_files` table with `type='thumbnail'`

**Testing**

- [ ] **AC34**: Unit test: `ThumbnailUpload.test.tsx` - Component renders, validates file type/size, shows preview
- [ ] **AC35**: Unit test: Backend route validates MIME type and file size
- [ ] **AC36**: Integration test: `ThumbnailUpload.integration.test.tsx` - POST endpoint called, success updates UI
- [ ] **AC37**: Integration test: MSW handler for `/api/v2/mocs/:id/thumbnail` returns success/error
- [ ] **AC38**: E2E test: `inst-1103-thumbnail.feature` - Upload JPEG, verify gallery/detail page shows thumbnail
- [ ] **AC39**: E2E test: Reject PDF file with error message
- [ ] **AC40**: E2E test: Replace existing thumbnail with new image

### Non-Goals

- Multiple gallery images (covered by INST-2030)
- Image optimization/resize (optional for this story, can defer to INST-2033)
- Presigned URL upload for >10MB files (not needed for thumbnails)
- Virus scanning (covered by INST-2031)
- PDF thumbnail generation (covered by INST-2032)
- Drag-to-reorder images (only one thumbnail, no ordering needed)
- Automatic thumbnail generation from uploaded instructions (future enhancement)

### Reuse Plan

**Components (from @repo/app-component-library):**
- `Button`, `Card`, `Label`

**Components (from app-sets-gallery):**
- `ImageUploadZone` - Adapt for single-image mode
  - Set `maxImages={1}` to enforce single thumbnail
  - Remove reorder button (not needed for single image)
  - Adapt labels to "Thumbnail" instead of "Images"

**Backend Utilities:**
- `validateMimeType()`, `validateFileSize()` from `core/utils/file-validation.ts`
- `toCloudFrontUrl()` from `core/cdn/cloudfront.ts`
- `createSecurityEvent()`, `logSecurityEvent()` from `core/utils/file-validation.ts`

**Backend Patterns (from wishlist storage):**
- S3 upload with `@repo/api-core` utilities
- Presigned URL generation (if needed for future >10MB support)
- MIME type validation with whitelist
- Error discriminated unions for validation failures

**Database Patterns:**
- Update query: `UPDATE moc_instructions SET thumbnailUrl = $1, updatedAt = NOW() WHERE id = $2`
- Transaction wrapper to rollback on S3 failure

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Unit Tests**: Focus on `ThumbnailUpload` component validation logic, file type/size rejection
- **Integration Tests**: Mock MSW handler for POST /mocs/:id/thumbnail with success/error scenarios
- **E2E Tests**: Use Playwright with real S3 upload (test environment bucket)
- **Test Data**: Prepare test images (JPEG, PNG, WebP) and invalid files (PDF, SVG) for validation tests
- **Coverage Target**: Minimum 80% for upload component, 90% for backend route validation

### For UI/UX Advisor

- **Placement**: Thumbnail upload should appear on both create page (after MOC creation) and detail page
- **Visual Design**: Match gallery card aspect ratio (e.g., 16:9 or 1:1) for preview
- **Drag-Drop UX**: Provide clear visual feedback on drag-over (border color change, opacity)
- **Error Messaging**: Use toast notifications for errors, not inline (to avoid cluttering upload zone)
- **Loading State**: Show spinner on upload button during submission
- **Success Feedback**: Auto-update preview and gallery/detail page without page reload
- **Accessibility**: Ensure keyboard navigation (Tab to focus, Enter/Space to open file picker)
- **Mobile**: Ensure file picker works on mobile devices (no drag-drop, but tap to select)

### For Dev Feasibility

- **Backend Complexity**: LOW - Direct upload pattern is simpler than presigned URLs
- **S3 Setup**: Ensure S3 bucket has correct CORS policy for multipart uploads
- **Multipart Handling**: Use Hono's built-in body parser for multipart/form-data
- **File Cleanup**: Implement S3 object deletion for old thumbnails before uploading new ones
- **Transaction Safety**: Wrap DB update in transaction, rollback on S3 upload failure
- **CloudFront Conversion**: Reuse existing `toCloudFrontUrl()` utility from wishlist domain
- **Image Optimization**: Optional - can use Sharp to resize to 800x800 before S3 upload
- **Estimated Effort**: 2-3 days (1 day frontend, 1 day backend, 0.5 day E2E tests)
- **Dependencies**: Requires INST-1102 (POST /mocs) to be completed first

**Technical Considerations:**
- **Hono Multipart**: Use `c.req.parseBody()` to extract file from multipart request
- **Buffer Handling**: File will be a Buffer, pass directly to S3 upload utility
- **MIME Detection**: Use `file-type` library to verify actual MIME type (don't trust client)
- **Filename Sanitization**: Use UUID prefix to avoid collisions: `${uuid()}-${sanitizedFilename}`
- **Error Recovery**: If S3 upload fails, ensure DB is not updated (use transaction)

**Integration Points:**
- **Gallery (INST-1100)**: Update card component to display `thumbnailUrl` from API response
- **Detail (INST-1101)**: Display thumbnail in sidebar cover image card
- **Create (INST-1102)**: Add thumbnail upload section after form submission

**Future Enhancements (out of scope):**
- Auto-generate thumbnail from first page of instructions PDF
- Multiple thumbnail sizes (small, medium, large)
- Thumbnail cropping/editing before upload
- Bulk thumbnail upload for multiple MOCs

---

## STORY-SEED COMPLETE WITH WARNINGS: 1 warning

**Warning 1**: INST-1102 (Create Basic MOC) must complete backend implementation before INST-1103 can begin. Coordinate with INST-1102 to ensure POST /mocs endpoint is functional.
