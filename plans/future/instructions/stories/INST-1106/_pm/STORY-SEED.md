---
generated: "2026-02-08"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: INST-1106

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No active baseline file exists. Seed generated from codebase scanning.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| POST /mocs/:id/files/instruction | `apps/api/lego-api/domains/mocs/routes.ts` (not found in current file) | Unknown | Similar file upload pattern |
| POST /mocs/:id/thumbnail | `apps/api/lego-api/domains/mocs/routes.ts` (lines 286-361) | Completed (INST-1103) | Proven direct upload pattern for files ≤10MB |
| RTK Query mutations | `packages/core/api-client/src/rtk/instructions-api.ts` | Completed (INST-1008) | `uploadInstructionFile` mutation exists (lines 265-294) |
| File validation utilities | `apps/api/lego-api/core/utils/file-validation.ts` | Completed | PDF validation functions exist: `validatePdfFile()`, `validatePdfMimeType()`, `validatePdfExtension()` |
| S3 + CloudFront storage | `apps/api/lego-api/domains/mocs/adapters/storage.ts` | Completed | Proven storage pattern from INST-1103 |

### Active In-Progress Work

| Story | Status | Overlap/Impact |
|-------|--------|----------------|
| INST-1102 (Create Basic MOC) | In QA | No overlap - MOC creation is separate from file upload |
| INST-1103 (Upload Thumbnail) | Completed (2026-02-08) | No overlap - different file type (images vs parts lists) |
| INST-1104 (Upload Instructions) | UAT (2026-02-07) | STRONG PATTERN REUSE - Same POST /mocs/:id/files endpoint pattern, just different file types |
| INST-1107 (Download Files) | Ready to Work | No overlap - download vs upload |

### Constraints to Respect

- **ADR-001 (API Path Schema)**: Frontend uses `/api/v2/mocs/:id/files`, Backend uses `/mocs/:id/files`
- **ADR-003 (Image/CDN)**: Not applicable - parts lists are not images, but S3 storage pattern applies
- **ADR-005 (Testing)**: UAT must use real services, not mocks
- **ADR-006 (E2E Tests)**: At least one happy-path E2E test required in dev phase
- **CLAUDE.md**: All types use Zod schemas with `z.infer<>`, no TypeScript interfaces
- **CLAUDE.md**: Use `@repo/app-component-library` for all UI components
- **CLAUDE.md**: NO barrel files - import directly from source files

---

## Retrieved Context

### Related Endpoints

From codebase scanning:
- **POST /mocs/:id/thumbnail** (lines 286-361 in routes.ts) - Direct upload pattern (≤10MB) with multipart/form-data
- **GET /mocs/:id/files/:fileId/download** (lines 368-415 in routes.ts) - Presigned download URL generation
- **Pattern**: `uploadInstructionFile` mutation exists in instructions-api.ts (lines 265-294) for instruction file uploads

**Key Observation**: The backend endpoint for parts list upload (`POST /mocs/:id/files`) likely doesn't exist yet OR exists but needs to differentiate by file type parameter. INST-1104 uses `/mocs/:id/files/instruction`, so parts list would use `/mocs/:id/files/parts-list` or similar.

### Related Components

From codebase scanning:
- **ThumbnailUpload** (`apps/web/app-instructions-gallery/src/components/ThumbnailUpload/`) - Completed in INST-1103, demonstrates file picker pattern
- **ImageUploadZone** (`apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`) - Referenced in INST-1103 as reuse source
- **Button, Card, Label, Toast, Spinner** from `@repo/app-component-library/_primitives` - Standard UI components

**Key Pattern**: Create a new `PartsListUpload` component following the same structure as `ThumbnailUpload` but with:
- Different file types accepted: CSV, XML, PDF
- Single file only (replace if exists) vs multiple files
- Different validation logic

### Reuse Candidates

#### High-Confidence Reuse (95%+)
- **File validation**: `validateFileSize()` from `file-validation.ts` - Direct reuse
- **Security logging**: `logSecurityEvent()`, `createSecurityEvent()` from `file-validation.ts` - Direct reuse
- **S3 storage adapter**: Pattern from `domains/mocs/adapters/storage.ts` (used in INST-1103)
- **Direct upload pattern**: POST with multipart/form-data from INST-1103 thumbnail upload

#### Medium Reuse (70-80%)
- **RTK Query mutation pattern**: Adapt `uploadInstructionFile` mutation for parts lists
- **File picker component**: Adapt ThumbnailUpload component structure

#### New Implementation Required
- **Parts list validation**: New validation function for CSV/XML/PDF MIME types (similar to `validatePdfFile` but with different allowed types)
- **Backend route**: POST /mocs/:id/files with type='parts-list' query param or POST /mocs/:id/files/parts-list endpoint
- **Single file replacement logic**: Backend checks if existing parts list exists and replaces it

---

## Knowledge Context

### Lessons Learned

No lessons loaded - knowledge base unavailable.

### Blockers to Avoid (from past stories)

From index analysis:
- **INST-1103/INST-1104 pattern**: Backend route already existed but needed validation additions. Check if parts list endpoint exists before assuming new implementation.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/mocs/:id/files`, Backend: `/mocs/:id/files` |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required | At least one happy-path E2E test in dev phase |

### Patterns to Follow

From INST-1103 (Upload Thumbnail):
- **Direct upload pattern**: Multipart/form-data POST endpoint for files ≤10MB
- **Validation sequence**: MIME type → File size → Extension → Upload
- **Security logging**: Log rejected uploads with userId, filename, reason
- **Response format**: Return `{ fileUrl: string }` on success (or similar parts list response)
- **Error handling**: Return 400 with specific error code

From INST-1104 (Upload Instructions):
- **Sequential uploads**: For multiple files, upload one at a time
- **Multiple files support**: Instructions allow multiple PDFs, but parts list is SINGLE FILE ONLY
- **PDF validation**: Use existing `validatePdfFile()` utility

### Patterns to Avoid

- Do NOT use presigned URL pattern for files ≤10MB (that's for INST-1105)
- Do NOT allow multiple parts lists per MOC (spec says single file, replace if exists)
- Do NOT skip backend validation even if frontend validates (trust nothing from client)

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title

Upload Parts List

### Description

**Context**: Users can create MOCs (INST-1102) and upload thumbnails (INST-1103) and instruction PDFs (INST-1104). To complete the MOC management vertical slice, users need to upload parts lists to track which LEGO pieces are required to build their MOC.

**Problem**: Without parts list upload, users must manually track parts elsewhere. The MOC detail page has a placeholder for parts list but no way to upload the file.

**Solution**: Implement parts list upload as a vertical slice:
- **Frontend**: File picker component for CSV, XML, or PDF selection with validation (single file only)
- **Backend**: POST `/mocs/:id/files` with `type=parts-list` query param (or separate endpoint `/mocs/:id/files/parts-list`)
- **Storage**: Upload to S3 with key `mocs/{userId}/{mocId}/parts-list/{filename}` (no UUID needed since single file)
- **Database**: Insert/replace `moc_files` record with `type='parts-list'`
- **Validation**: Server-side MIME type validation (CSV, XML, PDF), file size (≤10MB)
- **Single file enforcement**: If parts list already exists, replace it (delete old S3 object, update DB record)

**Key Differences from INST-1103/1104**:
- **File types**: CSV, XML, or PDF (not just images or just PDFs)
- **File count**: Single file only (replace if exists) vs multiple files allowed
- **Use case**: Parts inventory tracking vs visual appeal (thumbnails) vs building instructions (PDFs)

### Initial Acceptance Criteria

#### Frontend (apps/web/app-instructions-gallery)
- [ ] **AC1**: Parts list upload component renders on MOC detail page (`/mocs/:id`) in "Parts List" card
- [ ] **AC2**: "Add Parts List" button visible (or "Replace Parts List" if one exists)
- [ ] **AC3**: File picker accepts CSV, XML, or PDF files (`accept=".csv,.xml,.pdf,application/pdf,text/csv,text/xml"`)
- [ ] **AC4**: Client-side validation rejects non-CSV/XML/PDF files
- [ ] **AC5**: Client-side validation rejects files >10MB
- [ ] **AC6**: Selected file displays with filename and size
- [ ] **AC7**: "Upload" button triggers RTK mutation
- [ ] **AC8**: Loading state shows during upload
- [ ] **AC9**: Success shows toast "Parts list uploaded!" and updates UI
- [ ] **AC10**: If existing parts list, new upload replaces it (no multiple files)

#### Backend (apps/api/lego-api/domains/mocs)
- [ ] **AC11**: Endpoint `POST /mocs/:id/files` with `type=parts-list` (or separate `/mocs/:id/files/parts-list`)
- [ ] **AC12**: Endpoint accepts multipart/form-data
- [ ] **AC13**: Requires authentication and feature gate `requireFeature('moc')`
- [ ] **AC14**: Authorization check: user owns MOC
- [ ] **AC15**: Validate MIME type: `['text/csv', 'application/xml', 'text/xml', 'application/pdf']`
- [ ] **AC16**: Validate file size: 1 byte ≤ size ≤ 10MB
- [ ] **AC17**: If existing parts list, delete old S3 object before uploading new
- [ ] **AC18**: Upload to S3 with key `mocs/{userId}/{mocId}/parts-list/{sanitizedFilename}`
- [ ] **AC19**: Insert/replace `moc_files` record with `type='parts-list'`
- [ ] **AC20**: Return 200 with `{ id, mocId, type, name, size, url, uploadedAt }`
- [ ] **AC21**: Transaction ensures DB update only if S3 upload succeeds

#### Database
- [ ] **AC22**: `moc_files` record with `type='parts-list'`
- [ ] **AC23**: Single parts list per MOC enforced (replace logic)

#### Testing
- [ ] **AC24**: Unit test: PartsListUpload component renders, validates file types
- [ ] **AC25**: Unit test: Backend validates CSV/XML/PDF MIME types
- [ ] **AC26**: Integration test: POST endpoint called, success updates UI
- [ ] **AC27**: E2E test: Upload CSV file, verify in parts list section
- [ ] **AC28**: E2E test: Replace existing parts list with new XML file

### Non-Goals

- Parsing parts list contents (just upload the file, parsing is INST-3040)
- Parts inventory integration (covered by INST-2041)
- Multiple parts lists per MOC (single file only)
- Presigned URL upload for >10MB (use direct upload, defer large files)
- Drag-and-drop upload zone (covered by INST-2035)
- File preview/thumbnails (covered by INST-2032)
- Automatic parts counting from file contents (future enhancement)

### Reuse Plan

#### Components
- `Button`, `Card`, `Label`, `Toast`, `Spinner` from `@repo/app-component-library/_primitives`
- **NEW**: `PartsListUpload` component (adapt from ThumbnailUpload structure)

#### Backend Utilities
- `validateFileSize()` from `file-validation.ts` - Direct reuse
- `logSecurityEvent()`, `createSecurityEvent()` from `file-validation.ts` - Direct reuse
- **NEW**: `validatePartsListFile()` - New validation function for CSV/XML/PDF MIME types

#### Patterns
- Direct upload pattern from INST-1103 (multipart/form-data POST)
- S3 storage adapter from INST-1103
- RTK Query mutation pattern from INST-1008/INST-1104

#### Packages
- `@repo/app-component-library` - UI primitives
- `@repo/logger` - Structured logging
- `@repo/api-client` - RTK Query mutations

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Areas**:
1. **File type validation**: CSV, XML, PDF accepted; JPEG, PNG rejected
2. **Single file enforcement**: Uploading second file replaces first (no duplicates)
3. **File size validation**: 10MB limit enforced on both frontend and backend
4. **Replace flow**: Verify old S3 object deleted when new file uploaded
5. **Error handling**: Invalid MIME type, oversized file, unauthorized access

**Coverage Targets**: 80% frontend, 90% backend (same as INST-1103/1104)

**E2E Scenarios**:
- Upload CSV parts list, verify in detail page
- Replace existing parts list with XML file
- Reject JPEG file with error message
- Reject 15MB file with error message

### For UI/UX Advisor

**Component Structure**: Adapt ThumbnailUpload component pattern but with:
- File type label: "CSV, XML, or PDF · Max 10MB"
- Single file display (no list of multiple files)
- Replace button if file exists (not "Add another")

**Visual Design**:
- Empty state: "Upload parts list" with file type hint
- Preview state: Filename + size + "Replace" button
- Success state: File info + "Download" button + "Replace" button

**Accessibility**: Same standards as INST-1103 (keyboard nav, screen reader support, WCAG AA contrast)

### For Dev Feasibility

**Implementation Checks**:
1. Verify if backend endpoint exists for parts list uploads (check routes.ts thoroughly)
2. Determine endpoint structure: `/mocs/:id/files?type=parts-list` vs `/mocs/:id/files/parts-list`
3. Check if service layer needs new method or can reuse existing file upload logic
4. Confirm S3 key pattern for parts lists (consistency with instructions/thumbnails)
5. Verify database schema supports `type='parts-list'` in `moc_files` table

**Feasibility Estimate**: HIGH (similar to INST-1103/1104, proven patterns)

**Effort Estimate**: 2-3 days (1 day frontend, 1 day backend, 0.5-1 day testing)
