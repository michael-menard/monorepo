# Dev Feasibility: INST-1104 - Upload Instructions (Direct ≤10MB)

## Feasibility Summary
- **Feasible for MVP**: Yes
- **Confidence**: Very High
- **Why**: Backend route and RTK mutation already implemented. Only frontend component needs to be created. Direct upload pattern (≤10MB) proven in INST-1103 thumbnail upload. PDF validation is straightforward extension of existing image validation utilities.

---

## Likely Change Surface (Core Only)

### Frontend Changes
- **New Component**: `apps/web/app-instructions-gallery/src/components/InstructionsUpload/index.tsx`
  - File picker with PDF accept filter
  - Selected files list display
  - Client-side validation (PDF type, ≤10MB size)
  - Upload button with loading state
  - Toast notifications for success/error
- **Existing Component Update**: `apps/web/app-instructions-gallery/src/pages/MocDetailPage.tsx`
  - Integrate InstructionsUpload component
  - Display uploaded files in InstructionsFileList component
  - Add "Add Instructions" button

### Backend Changes (Minimal - Already Implemented)
- **Verify Existing Route**: `apps/api/lego-api/domains/instructions/routes.ts` (lines 198-237)
  - POST /mocs/:id/files/instruction already exists
  - Validates multipart/form-data
  - Calls instructionsService.uploadInstructionFile()
- **New Validation**: `apps/api/lego-api/core/utils/file-validation.ts`
  - Add `validatePdfMimeType()` function
  - MIME type whitelist: `['application/pdf']`
  - Extension whitelist: `['.pdf']`
  - Reuse existing size validation (1 byte to 10MB)

### Database Changes
None - `moc_files` table already supports `type='instruction'`

### RTK Query Changes
None - `useUploadInstructionFileMutation` already implemented in `packages/core/api-client/src/rtk/instructions-api.ts`

---

## MVP-Critical Risks

### Risk 1: PDF MIME Type Validation (LOW - Simple Extension)
- **Description**: Current `file-validation.ts` only validates image MIME types. PDF validation needs to be added.
- **Why it could block MVP**: Without PDF validation, backend will reject all PDF uploads as `INVALID_MIME_TYPE`
- **Required Mitigation**:
  - Create `validatePdfMimeType()` function in `file-validation.ts`
  - Whitelist: `['application/pdf']`
  - Extension check: `filename.toLowerCase().endsWith('.pdf')`
  - Update backend service to use PDF validator instead of image validator
- **Effort**: 1-2 hours (including tests)
- **Blocking for MVP**: Yes (but trivial to implement)

### Risk 2: Frontend Component Integration (LOW - Standard Pattern)
- **Description**: InstructionsUpload component must integrate with MocDetailPage without breaking existing layout
- **Why it could block MVP**: Poor integration could break detail page rendering
- **Required Mitigation**:
  - Follow established card layout pattern from MocDetailPage
  - Use `@repo/app-component-library/_primitives` components
  - Test component in isolation before integration
  - Use Storybook for visual regression testing (optional)
- **Effort**: 4-6 hours (component + integration)
- **Blocking for MVP**: No (standard component pattern, low complexity)

### Risk 3: Sequential Upload UX (MEDIUM - Acceptable for MVP)
- **Description**: Multiple files upload sequentially (one at a time), which may feel slow for users uploading many files
- **Why it could block MVP**: Poor UX might deter users from uploading multiple files
- **Required Mitigation**:
  - Show progress indicator for each file
  - Display "Uploading 2 of 5..." status
  - Allow cancellation of remaining uploads
  - Document as known limitation, defer parallel upload to INST-2036
- **Effort**: 2-3 hours (progress UI)
- **Blocking for MVP**: No (sequential is acceptable, parallel upload is enhancement)

---

## Missing Requirements for MVP

### Requirement 1: PDF Validation Error Codes
- **Missing**: Backend error codes for PDF-specific validation failures not defined
- **Needed**: Align error codes with existing validation pattern
- **Recommendation**:
  - Reuse `INVALID_FILE` error code (already used in routes.ts)
  - Return specific error message: "Only PDF files are allowed" or "File size exceeds 10MB limit"
  - Client displays error message from server response
- **PM Decision**: Use `INVALID_FILE` error code for both MIME type and file size failures (consistent with thumbnail upload)

### Requirement 2: Multiple File Upload Behavior
- **Missing**: Clarify if files upload in parallel or sequentially
- **Needed**: Define UX expectation for users uploading 5-10 files
- **Recommendation**:
  - **MVP**: Sequential upload (simpler implementation, avoids rate limiting)
  - **Future**: Parallel upload with concurrency limit (INST-2036)
- **PM Decision**: Sequential upload for MVP, show progress for each file

### Requirement 3: File Size Limit Upgrade Path
- **Missing**: User experience when selecting file >10MB
- **Needed**: Error message should hint at presigned upload (INST-1105)
- **Recommendation**:
  - Client validation error: "File too large. Max 10MB per file. Use presigned upload for larger files (coming soon)."
  - For MVP, simply reject >10MB files
  - INST-1105 will implement presigned URL flow for >10MB files
- **PM Decision**: Reject >10MB with upgrade hint in error message

---

## MVP Evidence Expectations

### Backend Verification
1. **Route Exists**: Verify POST /mocs/:id/files/instruction route functional
   - `.http` file test: Upload 5MB PDF, expect 201 with MocFile response
   - Assert S3 object created at `mocs/{userId}/{mocId}/instructions/{uuid}-{filename}`
   - Assert database record inserted with `type='instruction'`

2. **PDF Validation**: Verify MIME type and file size validation
   - Upload JPEG file, expect 400 `INVALID_FILE`
   - Upload 15MB PDF, expect 400 `INVALID_FILE`
   - Upload 0-byte PDF, expect 400 `INVALID_FILE`
   - Upload valid 5MB PDF, expect 201 success

3. **Authorization**: Verify ownership check
   - User A uploads to User B's MOC, expect 403
   - User A uploads to own MOC, expect 201

### Frontend Verification
1. **Component Renders**: InstructionsUpload component displays on MocDetailPage
   - "Add Instructions" button visible
   - Click button opens file picker with `accept="application/pdf"`

2. **Client Validation**: File type and size validation before upload
   - Select JPEG file, expect error "Only PDF files allowed"
   - Select 15MB PDF, expect error "File too large. Max 10MB per file"
   - Select valid PDF, file appears in selected files list

3. **Upload Flow**: End-to-end upload with RTK mutation
   - Select 2 PDFs, click Upload
   - Loading state shows during upload
   - Success toast appears after completion
   - Files appear in instructions list with download buttons

### E2E Verification (Playwright)
1. **Happy Path**: Upload single PDF file
   - Navigate to MOC detail page
   - Click "Add Instructions"
   - Select `sample-5mb.pdf`
   - Click "Upload Instructions"
   - Assert: Success toast appears
   - Assert: File appears in instructions list

2. **Multiple Files**: Upload 3 PDFs sequentially
   - Select 3 PDF files
   - Upload button triggers sequential uploads
   - All 3 files appear in list after completion

3. **Error Case**: Reject invalid file
   - Attempt to select JPEG file
   - Assert error message appears
   - Upload button disabled or no file selected

---

## Architecture Assessment

### Backend Route (Already Implemented)

**Existing Code**: `apps/api/lego-api/domains/instructions/routes.ts` lines 198-237

```typescript
instructions.post('/mocs/:id/files/instruction', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  // Parse multipart form
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  // Convert File to buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await instructionsService.uploadInstructionFile(userId, mocId, {
    buffer,
    filename: file.name,
    mimetype: file.type,
    size: file.size,
  })

  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'INVALID_FILE'
            ? 400
            : result.error === 'UPLOAD_FAILED'
              ? 500
              : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})
```

**Assessment**:
- ✅ Route exists and functional
- ✅ Multipart parsing implemented
- ✅ Service layer abstraction clean
- ✅ Error handling comprehensive
- ⚠️ **Action Required**: Verify `instructionsService.uploadInstructionFile()` validates PDF MIME type

### RTK Query Mutation (Already Implemented)

**Existing Code**: `packages/core/api-client/src/rtk/instructions-api.ts` lines 258-291

```typescript
uploadInstructionFile: builder.mutation<MocFile, { mocId: string; file: File }>({
  query: ({ mocId, file }) => {
    logger.debug('Uploading instruction file', undefined, {
      mocId,
      fileName: file.name,
      fileSize: file.size,
    })

    const formData = new FormData()
    formData.append('file', file)

    return {
      url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPLOAD_INSTRUCTION, { id: mocId }),
      method: 'POST',
      body: formData,
    }
  },
  transformResponse: (response: unknown) => {
    const validated = MocFileSchema.parse(response)
    logger.info('Instruction file uploaded', undefined, {
      fileId: validated.id,
      mocId: validated.mocId,
    })
    return validated
  },
  invalidatesTags: (_result, _error, { mocId }) => [
    { type: 'Moc', id: mocId },
    { type: 'MocFile', id: mocId },
  ],
})
```

**Assessment**:
- ✅ Mutation hook exists: `useUploadInstructionFileMutation`
- ✅ FormData handling correct
- ✅ Cache invalidation configured
- ✅ Response validation with Zod schema
- ✅ Error handling via RTK Query
- **Action Required**: None - ready to use

### Frontend Component (New - Needs Implementation)

**Component**: `InstructionsUpload/index.tsx`

**Required Features**:
1. File input with `accept="application/pdf"` and `multiple`
2. Selected files list (filename, size, remove button)
3. Client-side validation (PDF type, ≤10MB size)
4. Upload button with loading state
5. RTK mutation integration
6. Toast notifications (success/error)

**Effort Estimate**: 6-8 hours
- File picker UI: 2 hours
- Selected files list: 2 hours
- Validation logic: 1 hour
- RTK integration: 1 hour
- Upload flow: 2 hours
- Error handling: 1 hour

**Reuse Opportunities**:
- `Button`, `Card`, `Label`, `Toast` from `@repo/app-component-library/_primitives`
- File size formatting utility from existing codebase
- Client-side validation pattern from INST-1103 thumbnail upload

**Confidence**: High - Standard file upload component with existing mutation hook

---

## Technical Considerations

### PDF MIME Type Validation

**Current State**: `file-validation.ts` only validates images

**Required Addition**:

```typescript
// apps/api/lego-api/core/utils/file-validation.ts

export const ALLOWED_PDF_MIME_TYPES = ['application/pdf'] as const

export const ALLOWED_PDF_EXTENSIONS = ['.pdf'] as const

/**
 * Validates PDF MIME type against whitelist
 */
export function validatePdfMimeType(mimeType: string | undefined | null): ValidationResult {
  if (!mimeType || mimeType.trim() === '') {
    return {
      valid: false,
      error: 'MIME type is required',
      code: 'MISSING_MIME_TYPE',
    }
  }

  const normalizedType = mimeType.toLowerCase().trim()

  if (ALLOWED_PDF_MIME_TYPES.includes(normalizedType as typeof ALLOWED_PDF_MIME_TYPES[number])) {
    return { valid: true }
  }

  return {
    valid: false,
    error: 'Only PDF files are allowed',
    code: 'INVALID_MIME_TYPE',
  }
}

/**
 * Validates PDF file extension
 */
export function validatePdfExtension(filename: string): ValidationResult {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))

  if (ALLOWED_PDF_EXTENSIONS.includes(ext as typeof ALLOWED_PDF_EXTENSIONS[number])) {
    return { valid: true }
  }

  return {
    valid: false,
    error: 'Only PDF files are allowed',
    code: 'INVALID_FILE',
  }
}

/**
 * Validates both PDF MIME type and extension
 */
export function validatePdfFile(
  mimeType: string | undefined | null,
  filename: string,
  sizeBytes: number | undefined | null,
): ValidationResult {
  const mimeResult = validatePdfMimeType(mimeType)
  if (!mimeResult.valid) {
    return mimeResult
  }

  const extResult = validatePdfExtension(filename)
  if (!extResult.valid) {
    return extResult
  }

  return validateFileSize(sizeBytes)
}
```

**Effort**: 2 hours (including tests)

**Service Layer Update**:

```typescript
// apps/api/lego-api/domains/instructions/application/services.ts

import { validatePdfFile } from '../../core/utils/file-validation.js'

async uploadInstructionFile(
  userId: string,
  mocId: string,
  file: UploadedFile,
): Promise<Result<MocFile, InstructionsError>> {
  // Authorization check
  const moc = await instructionRepo.findById(mocId)
  if (!moc) return err('NOT_FOUND')
  if (moc.userId !== userId) return err('FORBIDDEN')

  // Validate PDF file
  const validation = validatePdfFile(file.mimetype, file.filename, file.size)
  if (!validation.valid) {
    logSecurityEvent({
      userId,
      fileName: file.filename,
      rejectionReason: validation.error,
      fileSize: file.size,
      mimeType: file.mimetype,
      sourceMethod: 'uploadInstructionFile',
    })
    return err('INVALID_FILE')
  }

  // Generate S3 key
  const s3Key = generateInstructionFileKey(userId, mocId, file.filename)

  try {
    // Upload to S3
    const s3Url = await fileStorage.uploadFile(file.buffer, s3Key, file.mimetype)

    // Insert database record
    const fileRecord = await fileRepo.insert({
      mocId,
      type: 'instruction',
      name: file.filename,
      size: file.size,
      s3Key,
      url: toCloudFrontUrl(s3Url),
      uploadedAt: new Date(),
    })

    return ok(fileRecord)
  } catch (error) {
    logger.error('Failed to upload instruction file', error)
    return err('UPLOAD_FAILED')
  }
}
```

---

## Deployment Considerations

### S3 Bucket Configuration
- **Bucket**: Reuse existing MOC instructions bucket
- **Path Structure**: `mocs/{userId}/{mocId}/instructions/{uuid}-{filename}`
- **CORS**: Already configured for multipart uploads
- **Permissions**: Lambda execution role has S3 write access

### CloudFront Distribution
- **CDN**: CloudFront distribution already configured
- **URL Conversion**: `toCloudFrontUrl()` utility exists
- **Cache Behavior**: PDF files cached for 1 year (immutable)

### Database Schema
- **Table**: `moc_files` already exists
- **Columns**: `id`, `mocId`, `type`, `name`, `size`, `s3Key`, `url`, `uploadedAt`
- **Migration**: None required

### CI/CD Pipeline
- **Lint**: ESLint passes for new component
- **Tests**: Unit tests for validation, integration tests for upload flow
- **Build**: Vite build includes new component
- **Deploy**: No infrastructure changes required

---

## Effort Estimate

| Task | Effort | Confidence |
|------|--------|-----------|
| PDF validation utilities | 2 hours | Very High |
| InstructionsUpload component | 6 hours | High |
| Integration with MocDetailPage | 2 hours | High |
| Unit tests (frontend) | 3 hours | High |
| Unit tests (backend) | 1 hour | High |
| Integration tests (MSW) | 2 hours | High |
| E2E tests (Playwright) | 4 hours | Medium |
| Bug fixes and polish | 4 hours | Medium |
| **Total** | **24 hours (3 days)** | **High** |

**Breakdown by Role**:
- Backend: 3 hours (PDF validation already mostly done)
- Frontend: 14 hours (component + integration + tests)
- E2E: 4 hours (Playwright tests)
- Polish: 3 hours (bug fixes, UX refinements)

---

## Integration Points

### INST-1102: Create Basic MOC
- **Status**: In QA
- **Dependency**: Need POST /mocs endpoint functional
- **Current State**: Endpoint exists and is functional
- **Action**: E2E tests can use MOC creation flow from INST-1102
- **Risk**: None - endpoint available for integration

### INST-1103: Upload Thumbnail
- **Relation**: Sister story for image uploads
- **Reuse**: Client validation pattern, S3 upload pattern
- **Difference**: PDF validation instead of image validation
- **Action**: Reference INST-1103 component structure

### INST-1101: View MOC Details
- **Relation**: Displays uploaded instruction files
- **Integration**: InstructionsUpload mounts on MocDetailPage
- **Files List**: InstructionsFileList component shows uploaded PDFs
- **Action**: Coordinate layout with detail page design

### INST-1105: Upload Instructions (Presigned >10MB)
- **Relation**: Upgrade path for large files
- **Integration**: Client shows upgrade hint for >10MB files
- **Future**: INST-1105 replaces direct upload for >10MB
- **Action**: Include upgrade hint in error message

---

## Summary

**Feasibility**: Very High

**Confidence**: Very High - Backend already implemented, frontend is standard file upload component

**Key Strengths**:
- Backend route exists and functional (routes.ts lines 198-237)
- RTK mutation implemented (instructions-api.ts lines 258-291)
- Multipart parsing proven in thumbnail upload (INST-1103)
- S3 infrastructure already configured
- Database schema supports instruction files

**Key Risks**:
- PDF MIME validation needs to be added (2 hours, trivial)
- Sequential upload UX acceptable for MVP (parallel upload deferred)
- E2E tests depend on INST-1102 (already in QA, non-blocking)

**Recommendation**: Proceed with implementation. Backend verification minimal, focus effort on frontend component and E2E tests.
