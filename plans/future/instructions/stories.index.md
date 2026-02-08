---
doc_type: story_index
title: "INST - MOC Instructions Story Index"
status: active
story_prefix: "INST"
created_at: "2026-01-24T15:00:00-07:00"
updated_at: "2026-02-08T04:10:00-07:00"
total_stories: 39
---

# INST - MOC Instructions Story Index

## Summary

| Metric | Count |
|--------|-------|
| Total Stories | 39 |
| Completed | 6 |
| Ready to Work | 2 |
| In Elaboration | 0 |
| Ready for QA | 0 |
| In Progress | 0 |
| In QA | 1 |
| Approved | 0 |
| Created | 1 |
| Draft | 29 |

### Story Distribution by Phase

| Phase | Stories | Focus |
|-------|---------|-------|
| 0: Infrastructure | 3 | Package extraction, RTK mutations |
| 1: Core Vertical Slices | 11 | Full-stack user journeys |
| 2: UX & Reliability | 5 | Polish, error handling, accessibility |
| 3: Testing & Validation | 2 | Test coverage, flow validation |
| 4: Files & Security | 5 | Gallery images, virus scan, optimization |
| 5: Upload UX | 4 | Drag-drop, progress, preview |
| 6: Search | 2 | Sort, autocomplete |
| 7: Parts Integration | 2 | Inventory, shopping list |
| 8: UI Polish | 4 | Shortcuts, empty states |
| 9: Moderation | 1 | Content flagging |

## Architecture: Vertical Slices

Each story in Phase 1 delivers **end-to-end user value** with:
- **Frontend**: React components, pages, forms
- **Backend**: API endpoints, validation, business logic
- **Database**: Schema changes, queries, migrations

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│  Gallery Page │ Detail Page │ Create Form │ Edit Form       │
├─────────────────────────────────────────────────────────────┤
│                     RTK QUERY                               │
│  useGetMocs │ useGetMoc │ useCreateMoc │ useUpdateMoc       │
├─────────────────────────────────────────────────────────────┤
│                     API LAYER                               │
│  GET /mocs │ GET /mocs/:id │ POST /mocs │ PATCH /mocs/:id   │
├─────────────────────────────────────────────────────────────┤
│                     DATABASE                                │
│  mocs table │ moc_files table │ upload_sessions table       │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Infrastructure (3 stories)

These foundational stories enable the vertical slices. Complete first.

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-1003 | Extract Upload Types Package | Completed (2024-12-26) | None |
| INST-1004 | Extract Upload Config Package | Completed (2025-12-09) | None |
| INST-1008 | Wire RTK Query Mutations | UAT (2026-02-05) | None |

### Infrastructure Story Details

**INST-1003: Extract Upload Types Package**
- Create `@repo/upload-types` package
- Move shared types from main-app and API
- Includes: UploadSession, FileMetadata, UploadStatus schemas
- Zod schemas with TypeScript inference
- Files: `packages/core/upload-types/`

#### Testing Requirements
- Unit tests: Schema validation, type inference
- Integration tests: Cross-package imports work
- E2E: N/A (infrastructure)

**INST-1004: Extract Upload Config Package**
- Create `@repo/upload-config` package
- Configuration: part sizes, TTL, rate limits, file size thresholds
- Environment variable mapping
- Files: `packages/backend/upload-config/`

#### Testing Requirements
- Unit tests: Config loading, defaults, validation
- Integration tests: Config used by API correctly
- E2E: N/A (infrastructure)

**INST-1008: Wire RTK Query Mutations**
- Add to `@repo/api-client/rtk/mocs-api.ts`:
  - `useGetMocsQuery` - GET /mocs
  - `useGetMocQuery` - GET /mocs/:id
  - `useCreateMocMutation` - POST /mocs
  - `useUpdateMocMutation` - PATCH /mocs/:id
  - `useDeleteMocMutation` - DELETE /mocs/:id
  - `useUploadFileMutation` - POST /mocs/:id/files
  - `useDeleteFileMutation` - DELETE /mocs/:id/files/:fileId
- Cache invalidation on mutations
- Optimistic updates where appropriate

#### Testing Requirements
- Unit tests: Mutation configs, cache tags
- Integration tests: MSW handlers, cache invalidation
- E2E: N/A (infrastructure)

---

## Phase 1: Core Vertical Slices (11 stories)

Each story is a full-stack vertical slice delivering user value.

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-1100 | View MOC Gallery | Completed (2026-02-07) | INST-1008 |
| INST-1101 | View MOC Details | Ready to Work | (cleared by INST-1100) |
| INST-1102 | Create Basic MOC | In QA (2026-02-07) | INST-1008 |
| INST-1103 | Upload Thumbnail | Completed (2026-02-08) | none |
| INST-1104 | Upload Instructions (Direct) | Completed (2026-02-07) | INST-1102 |
| INST-1105 | Upload Instructions (Presigned) | Draft | INST-1003, INST-1004 |
| INST-1106 | Upload Parts List | Draft | none |
| INST-1107 | Download Files | Ready to Work (2026-02-07) | INST-1101 |
| INST-1108 | Edit MOC Metadata | Draft | INST-1101 |
| INST-1109 | Delete MOC | Draft | INST-1101 |
| INST-1110 | Remove Individual File | Draft | INST-1101 |

### Vertical Slice Story Details

---

**INST-1100: View MOC Gallery**

> As a user, I can see all my MOCs in a gallery view so I can browse my collection.

#### Frontend
- Gallery page at `/mocs`
- Grid layout with MOC cards (thumbnail, title, piece count, theme)
- Empty state with "Create your first MOC" CTA
- Loading skeleton states
- Responsive: 1 col mobile, 2 col tablet, 3-4 col desktop
- Files: `apps/web/app-instructions-gallery/src/pages/GalleryPage.tsx`

#### Backend
- `GET /mocs` - List user's MOCs
- Query params: sort (newest, oldest, name), limit, offset
- Response: array of MOC summaries with thumbnail URLs
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Query `mocs` table filtered by userId
- Include thumbnail URL from `moc_files` or `mocs.thumbnailUrl`

#### Testing Requirements

**Unit Tests**
- Location: `apps/web/app-instructions-gallery/src/pages/__tests__/GalleryPage.test.tsx`
- Test Cases:
  - Renders grid layout
  - Empty state when no MOCs
  - Cards display correct data
  - Loading skeletons show

**Integration Tests**
- Location: `apps/web/app-instructions-gallery/src/pages/__tests__/GalleryPage.integration.test.tsx`
- Framework: Vitest + MSW
- Test Cases:
  - API call fetches MOC list
  - Error state on API failure
  - Sort parameter passed correctly

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1100-gallery.feature`
```gherkin
Feature: View MOC Gallery
  Scenario: Display user's MOC collection
    Given user has 5 MOCs
    When user navigates to /mocs
    Then gallery displays 5 MOC cards
    And each card shows thumbnail, title, piece count

  Scenario: Empty gallery state
    Given user has no MOCs
    When user navigates to /mocs
    Then empty state displays
    And "Create your first MOC" button visible
```

---

**INST-1101: View MOC Details**

> As a user, I can view the details of a MOC so I can see all its information and files.

#### Frontend
- **Design Reference**: `__design__/v0-examples/moc-detail-page/`
- Detail page at `/mocs/:mocId`
- 12-column grid: sticky sidebar (4 cols) + main area (8 cols)
- Sidebar: Cover image card, Metadata card
- Main: Stats, Parts gauge, draggable dashboard cards (Instructions, Parts List, Gallery)
- Card order persisted to localStorage
- Mobile: stacked layout
- Files: `apps/web/app-instructions-gallery/src/pages/MocDetailPage.tsx`

#### Backend
- `GET /mocs/:id` - Get MOC with all related data
- Response: MOC metadata + files array + stats
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Query `mocs` table by id
- Join `moc_files` for instructions, parts list, gallery images
- Include file metadata (name, size, type, uploadedAt)

#### Testing Requirements

**Unit Tests**
- Location: `apps/web/app-instructions-gallery/src/pages/__tests__/MocDetailPage.test.tsx`
- Test Cases:
  - Page renders with correct layout
  - Sidebar sticky on desktop
  - Dashboard cards render, collapse, drag-drop
  - localStorage saves card order

**Integration Tests**
- Location: `apps/web/app-instructions-gallery/src/pages/__tests__/MocDetailPage.integration.test.tsx`
- Framework: Vitest + MSW
- Test Cases:
  - MOC data fetched and displayed
  - Files listed correctly
  - 404 handling for invalid mocId

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1101-detail.feature`
```gherkin
Feature: View MOC Details
  Scenario: View MOC with files
    Given MOC "Castle MOC" exists with instructions and parts list
    When user navigates to /mocs/{mocId}
    Then cover image displays
    And metadata shows title, description, theme
    And instructions file listed with download button
    And parts list file listed with download button

  Scenario: Navigate from gallery
    Given gallery page with MOC cards
    When user clicks "Castle MOC" card
    Then detail page loads
    And URL is /mocs/{mocId}
```

---

**INST-1102: Create Basic MOC**

> As a user, I can create a new MOC with basic metadata so I can start building my collection.

#### Frontend
- Create button on gallery page (INST-1100)
- Create page at `/mocs/new`
- Form fields: title (required, min 3 chars), description (optional), theme (select), tags (multi-select)
- Validation: inline errors, submit disabled until valid
- On success: redirect to detail page
- Files: `apps/web/app-instructions-gallery/src/pages/CreateMocPage.tsx`

#### Backend
- `POST /mocs` - Create new MOC
- Request body: { title, description, theme, tags }
- Validation: Zod schema
- Response: created MOC with id
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Insert into `mocs` table
- Set userId from auth context
- Generate slug from title

#### Testing Requirements

**Unit Tests**
- Location: `apps/web/app-instructions-gallery/src/pages/__tests__/CreateMocPage.test.tsx`
- Test Cases:
  - Form renders all fields
  - Validation enforced (title required, min 3 chars)
  - Submit button disabled when invalid
  - Loading state during submission

**Integration Tests**
- Location: `apps/web/app-instructions-gallery/src/pages/__tests__/CreateMocPage.integration.test.tsx`
- Framework: Vitest + MSW
- Test Cases:
  - POST /mocs called with correct body
  - Success redirects to detail page
  - Validation errors from API displayed

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1102-create.feature`
```gherkin
Feature: Create Basic MOC
  Scenario: Create MOC with metadata
    Given user on gallery page
    When user clicks "Create MOC" button
    And enters title "My Castle"
    And selects theme "Castle"
    And clicks Create
    Then MOC is created
    And user redirected to detail page

  Scenario: Validation prevents incomplete submission
    Given create page is open
    When user leaves title empty
    And clicks Create
    Then error "Title is required" displays
    And form not submitted
```

---

**INST-1103: Upload Thumbnail**

> As a user, I can upload a cover image for my MOC so it looks good in the gallery.

#### Frontend
- Thumbnail upload on create page and detail page
- Drag-drop zone or file picker
- Image preview before save
- Replace existing thumbnail
- Validation: JPEG/PNG/WebP, max 10MB
- Files: `apps/web/app-instructions-gallery/src/components/ThumbnailUpload.tsx`

#### Backend
- `POST /mocs/:id/thumbnail` - Upload thumbnail (direct upload ≤10MB)
- Accept multipart/form-data
- Process: validate image, resize if needed, store in S3
- Update `mocs.thumbnailUrl`
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Update `mocs.thumbnailUrl` with S3 URL
- Optional: store in `moc_files` with type='thumbnail'

#### Testing Requirements

**Unit Tests**
- Location: `apps/web/app-instructions-gallery/src/components/__tests__/ThumbnailUpload.test.tsx`
- Test Cases:
  - Upload zone renders
  - Validates file type (rejects non-images)
  - Validates file size (rejects >10MB)
  - Preview displays selected image

**Integration Tests**
- Location: `apps/web/app-instructions-gallery/src/components/__tests__/ThumbnailUpload.integration.test.tsx`
- Framework: Vitest + MSW
- Test Cases:
  - POST /mocs/:id/thumbnail called
  - Success updates MOC display
  - Error handling for failed uploads

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1103-thumbnail.feature`
```gherkin
Feature: Upload Thumbnail
  Scenario: Upload cover image
    Given MOC detail page
    When user clicks thumbnail upload area
    And selects JPEG image (2MB)
    Then preview shows image
    When user saves
    Then thumbnail uploaded
    And gallery card shows new image

  Scenario: Reject invalid file
    When user selects PDF file for thumbnail
    Then error "Only images allowed" displays
```

---

**INST-1104: Upload Instructions (Direct ≤10MB)**

> As a user, I can upload instruction PDFs up to 10MB so I can store my building guides.

#### Frontend
- Instructions upload section on create/edit page
- File picker for PDF files
- Display file name + size after selection
- Multiple files supported
- Validation: PDF only, max 10MB per file
- Files: `apps/web/app-instructions-gallery/src/components/InstructionsUpload.tsx`

#### Backend
- `POST /mocs/:id/files` - Upload file (direct upload)
- Accept multipart/form-data
- Body: file + type ('instructions')
- Validate: PDF, ≤10MB
- Store in S3, create `moc_files` record
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Insert into `moc_files`: mocId, type='instructions', name, size, s3Key, uploadedAt

#### Testing Requirements

**Unit Tests**
- Test Cases:
  - Upload component renders
  - Validates PDF type
  - Validates file size ≤10MB
  - Multiple files supported

**Integration Tests**
- Framework: Vitest + MSW
- Test Cases:
  - POST /mocs/:id/files called correctly
  - File metadata returned
  - Error handling

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1104-upload-direct.feature`
```gherkin
Feature: Upload Instructions (Direct)
  Scenario: Upload small PDF
    Given MOC detail page
    When user clicks "Add Instructions"
    And selects PDF file (5MB)
    Then file uploads directly
    And instructions list shows file

  Scenario: Reject oversized file for direct upload
    When user selects 15MB PDF
    Then presigned URL flow triggered (INST-1105)
```

---

**INST-1105: Upload Instructions (Presigned >10MB)**

> As a user, I can upload large instruction PDFs up to 50MB using presigned URLs.

#### Frontend
- Same UI as INST-1104, but for files >10MB
- Progress bar during upload
- Status: "Uploading... X%"
- Cancel button
- Retry on failure
- Files: `apps/web/app-instructions-gallery/src/components/PresignedUpload.tsx`

#### Backend
- `POST /mocs/:id/upload-sessions` - Create presigned URL
- Request: { filename, fileSize, fileType }
- Response: { sessionId, presignedUrl, expiresAt }
- `POST /mocs/:id/upload-sessions/:sessionId/complete` - Verify and finalize
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Insert `upload_sessions`: id, mocId, status, s3Key, expiresAt
- On complete: Insert `moc_files`, update session status

#### Testing Requirements

**Unit Tests**
- Test Cases:
  - Presigned flow triggered for >10MB
  - Progress bar updates
  - Cancel aborts upload

**Integration Tests**
- Framework: Vitest + MSW
- Test Cases:
  - Session created with presigned URL
  - Upload to S3 (mocked)
  - Complete endpoint creates file record
  - Expiry handled

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1105-upload-presigned.feature`
```gherkin
Feature: Upload Instructions (Presigned)
  Scenario: Upload large PDF via presigned URL
    Given MOC detail page
    When user selects 30MB PDF
    Then presigned URL requested
    And progress bar shows during upload
    When upload completes
    Then completion endpoint called
    And instructions list shows file

  Scenario: Handle upload failure
    Given presigned upload in progress
    When network error occurs
    Then error message displays
    And retry button available
```

---

**INST-1106: Upload Parts List**

> As a user, I can upload a parts list so I can track what pieces I need.

#### Frontend
- Parts list upload section
- Single file per MOC (replace if exists)
- File picker: CSV, XML, or PDF
- Display file name + size
- Validation: max 10MB
- Files: `apps/web/app-instructions-gallery/src/components/PartsListUpload.tsx`

#### Backend
- `POST /mocs/:id/files` with type='parts-list'
- Validate: CSV/XML/PDF, ≤10MB
- Store in S3, create `moc_files` record
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Insert/replace `moc_files` where type='parts-list'

#### Testing Requirements

**Unit Tests**
- Test Cases:
  - Upload component renders
  - Validates file types (CSV, XML, PDF)
  - Single file only (replace existing)

**Integration Tests**
- Test Cases:
  - POST /mocs/:id/files called
  - Replaces existing parts list

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1106-parts-list.feature`
```gherkin
Feature: Upload Parts List
  Scenario: Upload CSV parts list
    Given MOC detail page
    When user clicks "Add Parts List"
    And selects CSV file
    Then file uploads
    And parts list section shows file

  Scenario: Replace existing parts list
    Given MOC with existing parts list
    When user uploads new CSV
    Then new file replaces old
```

---

**INST-1107: Download Files**

> As a user, I can download my instruction PDFs and parts lists.

#### Frontend
- Download button on each file in detail page
- Click triggers browser download
- Show loading state while generating URL
- Files: `apps/web/app-instructions-gallery/src/components/FileDownloadButton.tsx`

#### Backend
- `GET /mocs/:id/files/:fileId/download` - Get download URL
- Generate presigned S3 URL for download
- Set Content-Disposition for filename
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Query `moc_files` for s3Key
- Verify file belongs to user's MOC

#### Testing Requirements

**Unit Tests**
- Test Cases:
  - Download button renders for each file
  - Loading state during URL generation

**Integration Tests**
- Test Cases:
  - Download URL generated correctly
  - Auth check prevents unauthorized download

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1107-download.feature`
```gherkin
Feature: Download Files
  Scenario: Download instructions PDF
    Given MOC detail page with instructions file
    When user clicks Download on instructions
    Then PDF file downloads
    And filename matches original

  Scenario: Download parts list
    Given MOC with parts list
    When user clicks Download on parts list
    Then file downloads
```

---

**INST-1108: Edit MOC Metadata**

> As a user, I can edit my MOC's title, description, and other metadata.

#### Frontend
- Edit button on detail page
- Edit page at `/mocs/:mocId/edit`
- Pre-populated form with current values
- Same validation as create
- Save button calls update mutation
- Cancel returns to detail page
- Files: `apps/web/app-instructions-gallery/src/pages/EditMocPage.tsx`

#### Backend
- `PATCH /mocs/:id` - Update MOC metadata
- Request body: { title?, description?, theme?, tags? }
- Validate: same rules as create
- Response: updated MOC
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Update `mocs` table
- Update `updatedAt` timestamp
- Re-index in OpenSearch if title/description changed

#### Testing Requirements

**Unit Tests**
- Test Cases:
  - Form pre-populates with current values
  - Validation enforced
  - Save triggers mutation

**Integration Tests**
- Test Cases:
  - PATCH /mocs/:id called with changes only
  - Success updates UI
  - Optimistic update works

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1108-edit.feature`
```gherkin
Feature: Edit MOC Metadata
  Scenario: Edit title and description
    Given MOC detail page
    When user clicks Edit button
    Then edit page loads with current values
    When user changes title to "Updated Castle"
    And clicks Save
    Then MOC updated
    And detail page shows new title

  Scenario: Cancel edit
    Given edit page with changes
    When user clicks Cancel
    Then returns to detail page
    And changes not saved
```

---

**INST-1109: Delete MOC**

> As a user, I can delete a MOC I no longer want.

#### Frontend
- Delete button on detail page
- Confirmation modal: "Delete [MOC Name]? This will remove all files."
- Buttons: Cancel | Delete (destructive)
- On delete: redirect to gallery
- Files: `apps/web/app-instructions-gallery/src/components/DeleteMocModal.tsx`

#### Backend
- `DELETE /mocs/:id` - Delete MOC
- Cascade: delete all `moc_files` records
- Delete S3 objects (async job or sync)
- Response: 204 No Content
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Delete from `mocs` table
- Cascade delete `moc_files`
- Remove from OpenSearch index

#### Testing Requirements

**Unit Tests**
- Test Cases:
  - Delete button renders
  - Modal shows with MOC name
  - Cancel closes modal
  - Confirm triggers delete

**Integration Tests**
- Test Cases:
  - DELETE /mocs/:id called
  - Cache invalidated
  - Redirect to gallery

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1109-delete.feature`
```gherkin
Feature: Delete MOC
  Scenario: Delete MOC with confirmation
    Given MOC detail page for "My Castle"
    When user clicks Delete
    Then modal shows "Delete My Castle?"
    When user clicks Delete in modal
    Then MOC deleted
    And user redirected to gallery
    And MOC not in list

  Scenario: Cancel delete
    Given delete confirmation modal
    When user clicks Cancel
    Then modal closes
    And MOC not deleted
```

---

**INST-1110: Remove Individual File**

> As a user, I can remove a file from my MOC without deleting the whole MOC.

#### Frontend
- Remove button (X or trash icon) on each file
- Confirmation: "Remove [filename]?"
- On confirm: call delete mutation
- Update file list immediately
- Files: `apps/web/app-instructions-gallery/src/components/FileListItem.tsx`

#### Backend
- `DELETE /mocs/:id/files/:fileId` - Remove file
- Delete from S3
- Delete `moc_files` record
- Response: 204 No Content
- Files: `apps/api/lego-api/domains/mocs/routes.ts`

#### Database
- Delete from `moc_files` by id
- Verify file belongs to MOC and user

#### Testing Requirements

**Unit Tests**
- Test Cases:
  - Remove button on each file
  - Confirmation modal shows filename
  - Confirm removes file from list

**Integration Tests**
- Test Cases:
  - DELETE /mocs/:id/files/:fileId called
  - File removed from UI
  - S3 cleanup triggered

**E2E Tests (Playwright + Cucumber)**
- Feature File: `apps/web/playwright/features/instructions/inst-1110-remove-file.feature`
```gherkin
Feature: Remove Individual File
  Scenario: Remove instructions file
    Given MOC with 2 instruction files
    When user clicks remove on first file
    Then confirmation shows filename
    When user confirms
    Then file removed from list
    And 1 instruction file remains

  Scenario: Cancel remove
    Given remove confirmation modal
    When user clicks Cancel
    Then modal closes
    And file not removed
```

---

## Phase 2: UX & Reliability (5 stories)

Polish and error handling after core functionality works.

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-1200 | Unsaved Changes Guard | Draft | INST-1108 |
| INST-1201 | Session Persistence & Error Recovery | Draft | INST-1105 |
| INST-1202 | Accessibility & Keyboard Navigation | Draft | INST-1101 |
| INST-1203 | Rate Limiting & Observability | Draft | INST-1102 |
| INST-1204 | S3 Cleanup for Failed Uploads | Draft | INST-1105 |

### UX & Reliability Story Details

**INST-1200: Unsaved Changes Guard**
- Navigation guard on edit/create pages
- Detect form changes
- Modal: "You have unsaved changes. Leave without saving?"
- Buttons: Stay (primary) | Leave (secondary)
- Clear guard on successful save

**INST-1201: Session Persistence & Error Recovery**
- localStorage backup of form state during create/edit
- Restore on page reload
- Retry with exponential backoff on network errors
- Presigned URL refresh on expiry
- Clear persisted state on success

**INST-1202: Accessibility & Keyboard Navigation**
- Keyboard navigation throughout (Tab, Enter, Escape)
- ARIA labels on all interactive elements
- Focus management on modals
- Screen reader announcements for state changes
- Color contrast compliance

**INST-1203: Rate Limiting & Observability**
- Rate limit middleware on mutation endpoints
- 429 response with Retry-After header
- CloudWatch metrics for rate limit hits
- User-friendly error message in UI

**INST-1204: S3 Cleanup for Failed Uploads**
- Background job to find orphaned S3 objects
- Delete objects with no corresponding `moc_files` record
- Delete expired `upload_sessions`
- Run on schedule (daily)
- CloudWatch logs for cleanup actions

---

## Phase 3: Testing & Validation (2 stories)

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-1300 | Upload Session Test Coverage | Draft | INST-1105 |
| INST-1301 | End-to-End Flow Validation | Draft | Phase 1 complete |

**INST-1300: Upload Session Test Coverage**
- Integration tests for complete upload flow
- Edge cases: concurrent uploads, max files, session expiry
- Performance benchmarks for large files

**INST-1301: End-to-End Flow Validation**
- Audit all user journeys
- Verify frontend/backend schema alignment
- Fix any request/response mismatches
- Document API contracts

---

## Phase 4: Files & Security (5 stories)

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-2030 | Gallery Image Uploads | Draft | INST-1101 |
| INST-2031 | File Virus Scanning | Draft | INST-1104 |
| INST-2032 | File Preview/Thumbnails | Draft | INST-2030 |
| INST-2033 | Image Optimization (WebP, resize) | Draft | INST-2030 |
| INST-2034 | Database Transaction Safety | Draft | INST-1104 |

### Phase 4 Story Details

**INST-2030: Gallery Image Uploads**
- Upload multiple gallery images beyond thumbnail
- Display in gallery card on detail page
- Lightbox viewer with navigation
- Drag-to-reorder images

**INST-2031: File Virus Scanning**
- ClamAV or AWS integration
- Scan uploaded files before S3 storage
- Reject infected files with error message

**INST-2032: File Preview/Thumbnails**
- Generate PDF thumbnail previews
- Show preview in file list
- Cache generated thumbnails

**INST-2033: Image Optimization**
- Resize images to standard dimensions
- Convert to WebP
- Generate responsive srcset

**INST-2034: Database Transaction Safety**
- Wrap file + DB operations in transactions
- Rollback on partial failures
- Prevent orphaned files

---

## Phase 5: Upload UX (4 stories)

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-2035 | Drag-and-Drop Upload Zone | Draft | INST-1103 |
| INST-2036 | Chunked Upload Progress | Draft | INST-1105 |
| INST-2037 | File Preview Before Upload | Draft | INST-2035 |
| INST-2038 | Error Recovery Flows | Draft | INST-1201 |

---

## Phase 6: Search & Discovery (2 stories)

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-2039 | Sort Options | Draft | INST-1100 |
| INST-2040 | Autocomplete Search | Draft | INST-2039 |

---

## Phase 7: Parts Integration (2 stories)

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-2041 | Inventory Integration | Draft | INST-3040 (Parts Parsing) |
| INST-2042 | Shopping List Generator | Draft | INST-2041 |

---

## Phase 8: UI Polish (4 stories)

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-2043 | Keyboard Shortcuts Modal | Draft | INST-1202 |
| INST-2044 | Bottom Sheet Component | Draft | INST-1101 |
| INST-2045 | Empty State Illustrations | Draft | INST-1100 |
| INST-2046 | Loading State Consistency | Draft | INST-1100 |

---

## Phase 9: Moderation (1 story)

| ID | Title | Status | Blocked By |
|----|-------|--------|------------|
| INST-2047 | Content Flagging | Draft | INST-1101 |

---

## Deferred to Post-MVP (Future Backlog)

| Feature | Reason | Future Story |
|---------|--------|--------------|
| Multipart upload (>100MB) | Presigned URL handles up to 50MB | INST-3010 |
| File reordering | Requires backend displayOrder field | INST-3020 |
| Full-Text Search (OpenSearch) | Basic query is fine for personal use | INST-3030 |
| Parts List Parsing | Manual entry acceptable initially | INST-3040 |
| Rebrickable Import | Manual entry acceptable | INST-3050 |
| Mobile-Optimized Upload | Desktop-first acceptable | INST-3060 |
| PWA Offline Support | Online-only acceptable | INST-3061 |
| Instructions Viewer Component | Browser PDF viewer is fine | INST-3070 |

---

## Execution Waves

| Wave | Stories | Parallel Slots | Notes |
|------|---------|----------------|-------|
| 1 | INST-1003, INST-1008 | 2 | Infrastructure |
| 2 | INST-1004, INST-1100, INST-1102 | 3 | Config + first slices |
| 3 | INST-1101, INST-1103, INST-1104, INST-1106 | 4 | Core file operations |
| 4 | INST-1105, INST-1107, INST-1108, INST-1109, INST-1110 | 5 | Complete CRUD |
| 5 | INST-1200, INST-1201, INST-1202, INST-1203, INST-1204 | 5 | UX & Reliability |
| 6 | INST-1300, INST-1301 | 2 | Testing |
| 7+ | Phase 4-9 stories | varies | Extended features |

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-24 | Claude Opus 4.5 | Initial index creation |
| 2026-01-30 | Claude Opus 4.5 | Story cleanup and gap analysis |
| 2026-02-05 | Claude Opus 4.5 | Added Core Views, Create flow, Download, file type stories |
| 2026-02-05 | Claude Opus 4.5 | **Major restructure**: Converted to vertical slice model. Consolidated 45 horizontal stories into 39 vertical slices. Each Phase 1 story now delivers full-stack user value (frontend + backend + database). Renumbered core slices to INST-1100 series. |
| 2026-02-05 22:30 | Claude Sonnet 4.5 | **INST-1003 Completed**: Generated retrospective documentation story for already-implemented @repo/upload-types package. Detected completion via seed analysis. Updated status to Completed (2024-12-26). Unblocked INST-1004. |
| 2026-02-05 23:15 | Claude Sonnet 4.5 | **INST-1008 Created**: Generated infrastructure story for RTK Query mutations. Spawned Test Plan and Dev Feasibility workers. Story synthesized from seed with comprehensive test strategy and reuse patterns from wishlist-gallery-api.ts. Status: Created (ready for elaboration). |
| 2026-02-05 23:45 | Claude Sonnet 4.5 | **INST-1004 Created**: Generated retrospective documentation story for @repo/upload-config package (implemented December 9, 2025). Detected existing package with 285 passing tests. Documented config types, schemas, environment loader, and public API endpoint. Story type: Retrospective. Status: Created. |
| 2026-02-06 | Claude Opus 4.5 | **INST-1004 Elaboration Bypassed**: Retrospective story - package already implemented Dec 9, 2025 with 285 tests, all 15 ACs satisfied. Elaboration not applicable. Status updated: Created → Completed (2025-12-09). |
| 2026-02-06 00:45 | Claude Sonnet 4.5 | **INST-1100 Created**: Generated story for View MOC Gallery. Created STORY-SEED.md from codebase scanning (no baseline available). Spawned Test Plan, UI/UX, and Dev Feasibility workers. Synthesized complete story with comprehensive ACs, test plan, and reuse strategy. Blocked by INST-1008 (RTK Query mutations). Status: Created. |
| 2026-02-06 01:15 | Claude Sonnet 4.5 | **INST-1102 Created**: Generated story for Create Basic MOC. Executed PM story generation leader workflow: (1) Created STORY-SEED.md from codebase scanning with established patterns from AddItemPage/WishlistForm, (2) Generated comprehensive TEST-PLAN.md with unit/integration/E2E coverage per ADR-006, (3) Generated UIUX-NOTES.md with component specs and accessibility checklist, (4) Generated DEV-FEASIBILITY.md confirming feasibility with 3-4 day estimate, (5) Synthesized complete INST-1102.md story with 15 ACs and reuse plan. Blocked by INST-1008 (UAT - non-blocking for story creation). Status: Created (ready for elaboration). |
| 2026-02-06 21:35 | Claude Sonnet 4.5 | **INST-1103 Created**: Generated story for Upload Thumbnail. Executed PM story generation leader workflow: (1) Loaded STORY-SEED.md with existing patterns from ImageUploadZone and wishlist upload domain, (2) Generated comprehensive TEST-PLAN.md with 8 happy path tests, 8 error cases, 6 edge cases, and coverage targets (80% frontend, 90% backend), (3) Generated UIUX-NOTES.md with component architecture (adapt ImageUploadZone for single-image mode), visual design specs, and MVP-critical accessibility requirements, (4) Generated DEV-FEASIBILITY.md confirming HIGH feasibility with 3-4 day estimate and 95% component reuse potential, (5) Synthesized complete INST-1103.md story with 48 ACs covering frontend/backend/testing. Direct upload pattern (≤10MB) reuses proven wishlist domain patterns. Blocked by INST-1102 (Create Basic MOC - dependency for E2E tests). Status: Created (ready for elaboration). |
| 2026-02-07 05:00 | Claude Haiku 4.5 | **INST-1100 QA Verification Completed**: Phase 2 completion executed. QA verdict: PASS. All 21 automated ACs verified, 45/45 unit tests passing, 13/13 E2E tests passing, 96.5% coverage. Fixed 5 high-severity code review findings (PERF-001, A11Y-001, TEST-001/002, QUAL-001). Story status updated: in-qa → uat. Completion report generated. Story index updated. 4 lessons learned captured for Knowledge Base. INST-1100 now unblocks INST-1101. Status: Completed (ready for merge). |
| 2026-02-06 23:00 | Claude Sonnet 4.5 | **INST-1104 Created**: Generated story for Upload Instructions (Direct ≤10MB). Executed PM story generation leader workflow: (1) Created STORY-SEED.md from codebase scanning - discovered backend route already implemented (routes.ts lines 198-237) and RTK mutation exists (instructions-api.ts lines 258-291), (2) Generated comprehensive TEST-PLAN.md with 18 happy path tests, 7 error cases, 7 edge cases, and coverage targets (80% frontend, 90% backend), (3) Generated UIUX-NOTES.md with file picker component specs, sequential upload UX, and MVP-critical accessibility requirements, (4) Generated DEV-FEASIBILITY.md confirming VERY HIGH feasibility with 3-day estimate - backend already functional, only frontend component needed, (5) Synthesized complete INST-1104.md story with 71 ACs covering frontend/backend/testing. PDF validation needs to be added to file-validation.ts (2 hours). Backend route verified functional. Blocked by INST-1102 (In QA - non-blocking for story creation). KB write deferred (MCP unavailable). Status: Created (ready for elaboration). |
| 2026-02-06 23:15 | Claude Haiku 4.5 | **INST-1104 Elaboration Completed**: Phase 2 completion executed. Autonomous mode verdict: PASS. Elaboration analysis identified 3 MVP-critical gaps - all resolved by adding 3 acceptance criteria (AC72-74) for PDF validation consistency, 10MB file size enforcement, and structured error codes. Story upgraded from 71 to 74 ACs. Generated ELAB-INST-1104.md report. Appended QA Discovery Notes to story frontmatter. Updated story status: elaboration → ready-to-work. Moved directory from elaboration/ to ready-to-work/. Updated story index counts (Ready to Work: 3→4, In Elaboration: 1→0). Story ready for implementation phase. |
| 2026-02-07 18:45 | Claude Sonnet 4.5 | **INST-1107 Created**: Generated story for Download Files. Executed PM story generation leader workflow: (1) Created STORY-SEED.md from codebase scanning (no baseline available) - discovered S3 presigned URL pattern in inspiration domain, MOC detail page with file list, RTK Query framework in place, (2) Generated comprehensive TEST-PLAN.md with 3 happy path tests, 6 error cases, 6 edge cases, coverage targets (90% backend, 80% frontend), (3) Generated UIUX-NOTES.md confirming MVP-feasible with FileDownloadButton component reusing Button primitive, loading states, accessibility requirements, (4) Generated DEV-FEASIBILITY.md confirming HIGH feasibility with 2-3 day estimate - 80% pattern reuse from existing presigned URL code, (5) Synthesized complete INST-1107.md story with 72 ACs covering backend endpoint, frontend component, RTK Query integration, security, error handling. Presigned S3 download URL pattern (GetObjectCommand) mirrors upload pattern (PutObjectCommand). Blocked by INST-1101 (View MOC Details - for E2E testing). Status: Created (ready for elaboration). |
