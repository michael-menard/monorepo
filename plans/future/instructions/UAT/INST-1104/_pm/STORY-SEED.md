---
generated: "2026-02-06"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: INST-1104

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline file found. Seed generated from codebase scanning and reference from INST-1103 (Upload Thumbnail).

### Relevant Existing Features

| Feature | Status | Files |
|---------|--------|-------|
| Instructions Route POST /files/instruction | Production | `apps/api/lego-api/domains/instructions/routes.ts` (lines 198-237) |
| Upload Thumbnail Route | Production | `apps/api/lego-api/domains/instructions/routes.ts` (lines 282-321) |
| File Validation Utilities | Production | `apps/api/lego-api/core/utils/file-validation.ts` |
| RTK Query uploadInstructionFileMutation | Production | `packages/core/api-client/src/rtk/instructions-api.ts` (lines 258-291) |
| Multipart Form Parsing | Production | Hono `c.req.formData()` pattern established |
| MOC GET /mocs/:id Route | Production | `apps/api/lego-api/domains/instructions/routes.ts` |
| MOC POST /mocs Route | Production | `apps/api/lego-api/domains/instructions/routes.ts` |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| INST-1102 | Create Basic MOC | In QA | DEPENDENCY - MOC must exist before uploading instruction files |
| INST-1103 | Upload Thumbnail | Ready to Work | Sister story for image uploads, similar patterns |
| INST-1101 | View MOC Details | Ready to Work | Will display uploaded instruction files |
| INST-1008 | Wire RTK Query Mutations | UAT | Provides RTK infrastructure (completed) |

### Constraints to Respect

From codebase:
- **CLAUDE.md**: All types MUST use Zod schemas with `z.infer<>` - no TypeScript interfaces
- **CLAUDE.md**: NO barrel files - import directly from source files
- **CLAUDE.md**: Use `@repo/app-component-library` for all UI components
- **Project structure**: React 19, Tailwind CSS, Hono backend, Vitest + Playwright testing
- **File validation**: PDF only, max 10MB for direct upload (established in index)
- **MIME type**: `application/pdf` for instruction files

---

## Retrieved Context

### Related Endpoints

| Endpoint | Method | File | Notes |
|----------|--------|------|-------|
| `/mocs/:id/files/instruction` | POST | `apps/api/lego-api/domains/instructions/routes.ts` | Pattern for instruction file upload |
| `/mocs/:id/thumbnail` | POST | `apps/api/lego-api/domains/instructions/routes.ts` | Similar upload pattern for images |
| `/mocs/:id/files` | GET | `apps/api/lego-api/domains/instructions/routes.ts` | List files for MOC |
| `/mocs/:id` | GET | `apps/api/lego-api/domains/instructions/routes.ts` | MOC detail with files |

### Related Components

| Component | Path | Reuse Potential |
|-----------|------|-----------------|
| InstructionsService.uploadInstructionFile | `apps/api/lego-api/domains/instructions/application/services.ts` | HIGH - Backend business logic |
| FileStorage.uploadFile | `apps/api/lego-api/domains/instructions/adapters/storage.ts` | HIGH - S3 upload pattern |
| FileValidation utilities | `apps/api/lego-api/core/utils/file-validation.ts` | MEDIUM - Adapt for PDF validation |
| RTK useUploadInstructionFileMutation | `packages/core/api-client/src/rtk/instructions-api.ts` | HIGH - Already implemented |

### Reuse Candidates

**Backend Patterns (from instructions/routes.ts):**
- **Multipart parsing**: `const formData = await c.req.formData(); const file = formData.get('file')`
- **Buffer conversion**: `const buffer = Buffer.from(await file.arrayBuffer())`
- **Service call**: `await instructionsService.uploadInstructionFile(userId, mocId, { buffer, filename, mimetype, size })`
- **Error handling**: Discriminated union with `NOT_FOUND | FORBIDDEN | INVALID_FILE | UPLOAD_FAILED`
- **Auth middleware**: `auth`, `loadPermissions`, `requireFeature('moc')`

**RTK Query Mutation (already implemented):**
```typescript
useUploadInstructionFileMutation: builder.mutation<MocFile, { mocId: string; file: File }>({
  query: ({ mocId, file }) => {
    const formData = new FormData()
    formData.append('file', file)

    return {
      url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPLOAD_INSTRUCTION, { id: mocId }),
      method: 'POST',
      body: formData,
    }
  },
  invalidatesTags: (_result, _error, { mocId }) => [
    { type: 'Moc', id: mocId },
    { type: 'MocFile', id: mocId },
  ],
})
```

**File Validation (adapt from file-validation.ts):**
- Current validation is image-only: `['image/jpeg', 'image/png', 'image/webp']`
- **NEED**: PDF validation with MIME type `application/pdf`
- **Pattern**: Create PDF-specific validator or extend existing utilities
- **Max size**: 10MB (same as images)
- **Min size**: 1 byte (reject zero-byte files)

**Frontend Component Patterns:**
- File picker: `<input type="file" accept="application/pdf" />`
- Multiple file support: `<input multiple />`
- Display list of selected files before upload
- Show filename, size for each file
- Upload button triggers mutation for each file sequentially or in parallel

---

## Knowledge Context

### Lessons Learned

No knowledge base available - lessons loaded: false

### Blockers to Avoid (from patterns observed)

From instructions routes implementation:
- **API path mismatch**: Frontend uses `/api/v2/mocs/:id/files/instruction`, backend uses `/mocs/:id/files/instruction`
- **Schema drift**: Keep frontend/backend Zod schemas in sync
- **Missing auth middleware**: All routes require `auth`, `loadPermissions`, `requireFeature`
- **File validation**: Server-side validation is REQUIRED even if client validates
- **MIME type spoofing**: Validate MIME type from request, not just filename extension
- **Zero-byte files**: Explicitly reject files < 1 byte
- **Multiple files**: Backend must handle multiple sequential uploads or client batches requests

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/mocs/:id/files/instruction`, Backend: `/mocs/:id/files/instruction` |
| ADR-003 | Image Storage and CDN Architecture | Use S3 + CloudFront, convert URLs on read |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test required |

### Patterns to Follow

From ADR-001:
- Frontend RTK Query endpoints use `/api/v2/mocs/:id/files/instruction`
- Backend Hono routes use `/mocs/:id/files/instruction`
- Vite proxy rewrites for local dev

From ADR-003:
- Store in S3 with key pattern: `mocs/{userId}/{mocId}/instructions/{uuid}-{filename}`
- Return CloudFront URL in response
- Convert S3 URLs to CloudFront URLs in repository mapper

From instructions upload implementation (routes.ts lines 198-237):
- **Direct upload pattern**: Use multipart/form-data for files ≤10MB
- **Validation sequence**: MIME type → File size → Upload
- **Response format**: Return `MocFile` with `{ id, mocId, type, name, size, url, uploadedAt }`
- **Error handling**: Return 400/403/404/500 with specific error codes
- **Security logging**: Log rejected uploads with userId, filename, reason

### Patterns to Avoid

- Do NOT use TypeScript interfaces - use Zod schemas
- Do NOT create barrel files (index.ts re-exports)
- Do NOT skip server-side validation even if client validates
- Do NOT trust client-provided MIME types without verification
- Do NOT allow files without proper authentication and authorization
- Do NOT use image validation for PDFs - needs separate PDF validator

---

## Conflict Analysis

### Conflict: Non-Blocking Dependency
- **Severity**: non-blocking
- **Description**: INST-1102 (Create Basic MOC) is in QA. This story requires a MOC to exist before instruction files can be uploaded. However, the POST /mocs endpoint is already functional and available for integration testing. The backend route for instruction upload already exists in production code (`routes.ts` lines 198-237).
- **Resolution Hint**: Story generation can proceed. For implementation, coordinate E2E tests to use the MOC creation flow from INST-1102. Backend service already handles instruction file uploads.

---

## Story Seed

### Title
Upload Instructions (Direct ≤10MB)

### Description

**Context:**
The MOC Instructions feature allows users to manage their custom LEGO builds. After creating a MOC (INST-1102), users need to upload PDF instruction files so others can build their designs. The `moc_files` database table is designed to store file metadata with `type='instruction'`. The backend already has:
- `POST /mocs/:id/files/instruction` endpoint (routes.ts lines 198-237)
- `InstructionsService.uploadInstructionFile()` method (services.ts)
- `FileStorage.uploadFile()` for S3 uploads
- RTK Query mutation `useUploadInstructionFileMutation` (instructions-api.ts lines 258-291)

**Problem:**
Users need to upload PDF instruction files for their MOCs. Without this capability, the MOC Instructions gallery is incomplete - users can create MOCs and add thumbnails (INST-1103) but cannot share the actual building instructions. Limiting to 10MB for direct upload keeps the flow simple and avoids presigned URL complexity for most use cases.

**Solution:**
Implement instruction file upload functionality as a vertical slice:
- **Frontend**: File picker component for PDF selection with validation
- **Backend**: POST `/mocs/:id/files/instruction` endpoint (already exists, verify implementation)
- **Storage**: Upload to S3 with key `mocs/{userId}/{mocId}/instructions/{uuid}-{filename}`
- **Database**: Insert `moc_files` record with `type='instruction'`
- **Validation**: Server-side PDF MIME type, file size (≤10MB), and extension validation
- **Multiple files**: Support uploading multiple instruction PDFs per MOC

### Initial Acceptance Criteria

**Frontend (apps/web/app-instructions-gallery)**

- [ ] **AC1**: Instructions upload component renders on MOC detail page (`/mocs/:id`)
- [ ] **AC2**: File picker accepts PDF files only (`accept="application/pdf"`)
- [ ] **AC3**: File picker supports multiple file selection (`multiple` attribute)
- [ ] **AC4**: Client-side validation rejects non-PDF files (alert: "Only PDF files allowed")
- [ ] **AC5**: Client-side validation rejects files >10MB (alert: "File too large. Max 10MB per file")
- [ ] **AC6**: Selected files display in list with filename and size
- [ ] **AC7**: Each file shows "Remove" button before upload
- [ ] **AC8**: "Upload" button triggers `useUploadInstructionFileMutation` for each file
- [ ] **AC9**: Upload progress shows for each file (loading spinner or percentage)
- [ ] **AC10**: Success shows toast "Instructions uploaded!" and updates file list
- [ ] **AC11**: Errors from API display as toast notifications with specific error message
- [ ] **AC12**: Multiple files upload sequentially (one at a time to avoid rate limits)
- [ ] **AC13**: Uploaded files appear in instructions list on detail page immediately
- [ ] **AC14**: Loading state shows during upload with disabled upload button

**Backend (apps/api/lego-api/domains/instructions)**

- [ ] **AC15**: Verify `POST /mocs/:id/files/instruction` endpoint exists and is functional
- [ ] **AC16**: Endpoint accepts multipart/form-data with `file` field
- [ ] **AC17**: Endpoint requires authentication (auth middleware)
- [ ] **AC18**: Endpoint requires feature gate `requireFeature('moc')`
- [ ] **AC19**: Authorization check: userId from auth context must match MOC owner
- [ ] **AC20**: Return 404 if MOC not found
- [ ] **AC21**: Return 403 if user does not own the MOC
- [ ] **AC22**: Validate MIME type: `application/pdf` only
- [ ] **AC23**: Return 400 with code `INVALID_FILE` if MIME type is not PDF
- [ ] **AC24**: Validate file size: 1 byte ≤ size ≤ 10MB
- [ ] **AC25**: Return 400 with code `INVALID_FILE` if file too large or too small
- [ ] **AC26**: Validate file extension: `.pdf` only
- [ ] **AC27**: Upload file to S3 with key pattern: `mocs/{userId}/{mocId}/instructions/{uuid}-{filename}`
- [ ] **AC28**: Insert `moc_files` record with `type='instruction'`, filename, size, S3 key, uploadedAt
- [ ] **AC29**: Return 201 with response: `MocFile { id, mocId, type, name, size, url, uploadedAt }`
- [ ] **AC30**: Log security events for rejected uploads (invalid type, oversized, etc.)
- [ ] **AC31**: Handle S3 upload failures gracefully with 500 error and logging
- [ ] **AC32**: Support multiple instruction files per MOC (no replacement, append to list)

**Database**

- [ ] **AC33**: `moc_files` record inserted with `type='instruction'`
- [ ] **AC34**: File metadata stored: `mocId`, `name`, `size`, `s3Key`, `uploadedAt`
- [ ] **AC35**: Transaction ensures DB insert only if S3 upload succeeds
- [ ] **AC36**: Multiple instruction files per MOC supported (no unique constraint on type)

**Testing**

- [ ] **AC37**: Unit test: `InstructionsUpload.test.tsx` - Component renders, validates file type/size
- [ ] **AC38**: Unit test: Backend service validates PDF MIME type and file size
- [ ] **AC39**: Integration test: `InstructionsUpload.integration.test.tsx` - POST endpoint called, success updates UI
- [ ] **AC40**: Integration test: MSW handler for `/api/v2/mocs/:id/files/instruction` returns success/error
- [ ] **AC41**: E2E test: `inst-1104-upload-direct.feature` - Upload 5MB PDF, verify file list shows file
- [ ] **AC42**: E2E test: Reject 15MB PDF with error message (should trigger presigned flow in INST-1105)
- [ ] **AC43**: E2E test: Upload multiple PDFs (2-3 files) and verify all appear in list

### Non-Goals

- Presigned URL upload for >10MB files (covered by INST-1105)
- Virus scanning (covered by INST-2031)
- PDF thumbnail generation/preview (covered by INST-2032)
- Drag-and-drop upload zone (covered by INST-2035)
- Progress bar with percentage (simple loading spinner sufficient for MVP)
- File reordering (covered by INST-3020)
- Batch upload with single request (sequential individual uploads acceptable)
- Gallery image uploads (covered by INST-2030)
- Parts list uploads (covered by INST-1106)

### Reuse Plan

**Components (from @repo/app-component-library):**
- `Button`, `Card`, `Label`

**Backend Utilities:**
- `validateFileSize()` from `core/utils/file-validation.ts`
- **NEW**: Create `validatePdfMimeType()` function for PDF-specific validation
  - MIME type: `application/pdf`
  - Extensions: `['.pdf']`
- `createSecurityEvent()`, `logSecurityEvent()` from `core/utils/file-validation.ts`

**Backend Implementation (already exists):**
- `instructionsService.uploadInstructionFile()` - Business logic
- `fileStorage.uploadFile()` - S3 upload adapter
- `fileRepo.insert()` - Database insert

**RTK Query Mutation (already implemented):**
- `useUploadInstructionFileMutation` from `@repo/api-client/rtk/instructions-api.ts`
- Cache invalidation: `['Moc', 'MocFile']`

**Database Patterns:**
- Insert query: `INSERT INTO moc_files (mocId, type, name, size, s3Key, uploadedAt) VALUES (...)`
- Transaction wrapper to rollback on S3 failure

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Unit Tests**: Focus on `InstructionsUpload` component validation logic, PDF type/size rejection
- **Integration Tests**: Mock MSW handler for POST /mocs/:id/files/instruction with success/error scenarios
- **E2E Tests**: Use Playwright with real S3 upload (test environment bucket)
- **Test Data**: Prepare test PDFs (small 5MB, large 15MB) and invalid files (JPEG, TXT) for validation tests
- **Coverage Target**: Minimum 80% for upload component, 90% for backend route validation
- **Multiple files**: Test uploading 2-3 PDFs sequentially and verify all appear in file list

### For UI/UX Advisor

- **Placement**: Instructions upload should appear on MOC detail page below thumbnail
- **Visual Design**: List view for selected files (filename, size, remove button)
- **File Picker**: Standard file input with "Add Instructions" button
- **Error Messaging**: Use toast notifications for errors, not inline (to avoid cluttering upload zone)
- **Loading State**: Show spinner on "Upload" button during submission
- **Success Feedback**: Auto-update file list without page reload
- **Multiple Files**: Show count "3 files selected" and list each file separately
- **Accessibility**: Ensure keyboard navigation (Tab to focus, Enter/Space to open file picker)
- **Mobile**: Ensure file picker works on mobile devices

### For Dev Feasibility

- **Backend Complexity**: LOW - Direct upload pattern already implemented
- **S3 Setup**: Ensure S3 bucket has correct CORS policy for multipart uploads
- **Multipart Handling**: Hono's `c.req.formData()` already used in thumbnail upload
- **PDF Validation**: Create new validator function for PDF MIME type
- **Transaction Safety**: Wrap DB insert in transaction, rollback on S3 upload failure
- **CloudFront Conversion**: Reuse existing S3→CloudFront URL conversion
- **Multiple Files**: Client uploads files one at a time (sequential) to avoid concurrency issues
- **Estimated Effort**: 2-3 days (0.5 day frontend component, 0.5 day PDF validation, 1 day E2E tests, 1 day polish)
- **Dependencies**: Requires INST-1102 (POST /mocs) to be completed - currently in QA

**Technical Considerations:**
- **Backend route exists**: `POST /mocs/:id/files/instruction` already implemented (lines 198-237 in routes.ts)
- **PDF MIME validation**: Add `ALLOWED_PDF_MIME_TYPES = ['application/pdf']` to validation utils
- **Filename Sanitization**: Use UUID prefix to avoid collisions: `${uuid()}-${sanitizedFilename}`
- **Error Recovery**: If S3 upload fails, ensure DB is not updated (use transaction)
- **File extension check**: Verify filename ends with `.pdf` (case-insensitive)

**Integration Points:**
- **Detail (INST-1101)**: Display instruction files in Instructions card
- **Create (INST-1102)**: Add instruction upload section after MOC creation
- **Presigned (INST-1105)**: Upgrade path for >10MB files

**Future Enhancements (out of scope):**
- Drag-and-drop upload zone (INST-2035)
- Progress bar with percentage (INST-2036)
- File preview/thumbnail (INST-2032)
- Batch upload endpoint (single request for multiple files)

---

## STORY-SEED COMPLETE WITH WARNINGS: 0 warnings

Backend implementation already exists. Frontend component needs to be created to leverage existing RTK mutation.
