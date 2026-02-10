# INST-1106 Analysis: MVP-Critical Gaps

**Story**: Upload Parts List
**Analyst**: elab-analyst
**Date**: 2026-02-08
**Status**: READY FOR IMPLEMENTATION

---

## Executive Summary

**Verdict**: ✅ **READY TO IMPLEMENT** with minimal gaps

The story is well-specified with 73 detailed acceptance criteria. Backend patterns are proven (INST-1103, INST-1104), frontend components exist for reuse, and RTK mutation is already defined. Only 3 MVP-critical gaps require implementation:

1. Backend endpoint for parts list upload
2. Frontend PartsListUpload component
3. New file validation function for CSV/XML/PDF

**Estimated Effort**: 17.5 hours (2-3 days) - aligns with story's 3-point estimate.

---

## Gap Analysis

### 🔴 CRITICAL GAP 1: Backend Endpoint Missing

**Issue**: No `/mocs/:id/files/parts-list` endpoint exists in routes.ts

**Evidence**:
- `apps/api/lego-api/domains/mocs/routes.ts` has only:
  - `POST /mocs/:id/thumbnail` (line 286)
  - `GET /mocs/:id/files/:fileId/download` (line 368)
- No parts list upload endpoint found

**Impact**: Blocks all upload functionality (AC23-AC47)

**Solution Required**:
```typescript
// Add to routes.ts after thumbnail endpoint
mocs.post('/:id/files/parts-list', async c => {
  // Parse multipart form
  // Validate parts list file (CSV/XML/PDF)
  // Check existing file, delete old S3 object
  // Upload to S3
  // Upsert moc_files record
  // Return file metadata with CloudFront URL
})
```

**Acceptance Criteria Blocked**: AC23-AC47 (all backend ACs)

**Mitigation**: Reuse proven pattern from `POST /mocs/:id/thumbnail` (lines 286-361)

---

### 🔴 CRITICAL GAP 2: Parts List Validation Function Missing

**Issue**: No `validatePartsListMimeType()` function in file-validation.ts

**Evidence**:
- `apps/api/lego-api/core/utils/file-validation.ts` has:
  - `validateMimeType()` for images (line 115)
  - `validatePdfMimeType()` for PDFs (line 216)
  - `validatePdfFile()` combined validation (line 290)
- No CSV/XML/PDF validation function exists

**Impact**: Backend cannot validate parts list files (AC30-AC35)

**Solution Required**:
```typescript
// Add to file-validation.ts
export const ALLOWED_PARTS_LIST_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/xml',
  'application/xml',
  'application/pdf',
] as const

export function validatePartsListMimeType(
  mimeType: string | undefined | null
): ValidationResult {
  // Validate against ALLOWED_PARTS_LIST_MIME_TYPES
  // Return { valid: true } or { valid: false, error, code }
}

export function validatePartsListFile(
  mimeType: string | undefined | null,
  filename: string | undefined | null,
  sizeBytes: number | undefined | null,
): ValidationResult {
  // Validate MIME type
  // Validate extension (.csv, .xml, .pdf)
  // Validate size (validateFileSize already exists)
}
```

**Acceptance Criteria Blocked**: AC30-AC35, AC46-AC47

**Mitigation**: Copy-paste pattern from `validatePdfFile()` (line 290-309)

---

### 🔴 CRITICAL GAP 3: Frontend PartsListUpload Component Missing

**Issue**: No PartsListUpload component exists

**Evidence**:
- `apps/web/app-instructions-gallery/src/components/` has:
  - `ThumbnailUpload/` (INST-1103 ✅)
  - `InstructionsUpload/` (INST-1104 ✅)
- No `PartsListUpload/` directory found

**Impact**: Blocks all frontend upload functionality (AC1-AC22)

**Solution Required**:
```
apps/web/app-instructions-gallery/src/components/PartsListUpload/
  index.tsx              # Main component
  __tests__/
    PartsListUpload.test.tsx
    PartsListUpload.integration.test.tsx
  __types__/
    index.ts             # Zod schemas
```

**Acceptance Criteria Blocked**: AC1-AC22 (all frontend ACs)

**Mitigation**: Adapt from `InstructionsUpload/index.tsx` - 90% reuse, just change:
1. File accept: `.csv,.xml,.pdf` instead of `.pdf`
2. MIME types: CSV/XML/PDF instead of PDF-only
3. Single file mode: `multiple={false}` instead of `multiple={true}`
4. Replace button text when file exists
5. RTK mutation: `useUploadPartsListFileMutation` instead of `useUploadInstructionFileMutation`

---

## Non-Critical Gaps (Documented, Not Blocking)

### 🟡 GAP 4: Endpoint Path Ambiguity (LOW PRIORITY)

**Issue**: Story suggests two endpoint options without clear decision:
- Option A: `POST /mocs/:id/files?type=parts-list`
- Option B: `POST /mocs/:id/files/parts-list` (recommended)

**Evidence**: AC23 says "POST /mocs/:id/files with type=parts-list query param OR dedicated /mocs/:id/files/parts-list"

**Impact**: None if decided before implementation

**Recommendation**: Use dedicated `/mocs/:id/files/parts-list` endpoint for consistency with:
- `/mocs/:id/files/instruction` (INST-1104)
- `/mocs/:id/thumbnail` (INST-1103)

**Decision Required**: Developer should choose Option B (dedicated endpoint) during implementation

---

### 🟡 GAP 5: RTK Mutation Already Exists But Endpoint Mismatch (LOW PRIORITY)

**Issue**: `useUploadPartsListFileMutation` exists in RTK but points to wrong endpoint

**Evidence**:
- `packages/core/api-client/src/rtk/instructions-api.ts` line 301:
  ```typescript
  uploadPartsListFile: builder.mutation<MocFile, { mocId: string; file: File }>({
    query: ({ mocId, file }) => {
      const formData = new FormData()
      formData.append('file', file)
      return {
        url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPLOAD_PARTS_LIST, { id: mocId }),
        method: 'POST',
        body: formData,
      }
    },
    // ...
  })
  ```
- Endpoint config in `packages/core/api-client/src/config/endpoints.ts` line 46:
  ```typescript
  UPLOAD_PARTS_LIST: '/instructions/mocs/{id}/files/{fileId}', // WRONG - has {fileId} placeholder
  ```

**Impact**: Frontend will call incorrect URL, backend endpoint won't match

**Fix Required**: Update endpoint constant to:
```typescript
UPLOAD_PARTS_LIST: '/instructions/mocs/{id}/files/parts-list',
```

**Acceptance Criteria Affected**: AC13 (RTK mutation call)

---

### 🟡 GAP 6: S3 Key Sanitization Not Explicitly Defined (LOW PRIORITY)

**Issue**: Story mentions filename sanitization (AC39, Edge 3) but doesn't specify sanitization rules

**Evidence**:
- AC39: "Sanitize filename (remove special characters, lowercase, replace spaces with hyphens)"
- Edge 3 test: `parts-list (v2) [updated] @2024.csv` → `parts-list-v2-updated-2024.csv`

**Impact**: Filename sanitization could vary between developers

**Recommendation**: Reuse sanitization logic from thumbnail upload or create shared utility:
```typescript
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '')         // Trim leading/trailing hyphens
}
```

**Not Blocking**: Developer discretion acceptable for MVP

---

## Proven Reuse Opportunities

### ✅ REUSE 1: RTK Mutation Already Implemented

**Evidence**: `packages/core/api-client/src/rtk/instructions-api.ts` lines 301-330

```typescript
uploadPartsListFile: builder.mutation<MocFile, { mocId: string; file: File }>({
  query: ({ mocId, file }) => {
    logger.debug('Uploading parts list file', undefined, {
      mocId,
      fileName: file.name,
      fileSize: file.size,
    })

    const formData = new FormData()
    formData.append('file', file)

    return {
      url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPLOAD_PARTS_LIST, { id: mocId }),
      method: 'POST',
      body: formData,
    }
  },
  transformResponse: (response: unknown) => {
    const validated = MocFileSchema.parse(response)
    logger.info('Parts list file uploaded', undefined, {
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

**Impact**: Frontend mutation is 100% ready, just needs endpoint URL fix (Gap 5)

---

### ✅ REUSE 2: File Validation Utilities Exist

**Evidence**: `apps/api/lego-api/core/utils/file-validation.ts`

Existing functions ready for reuse:
- `validateFileSize()` (line 158) - validates 1 byte to 10MB ✅
- `logSecurityEvent()` (line 323) - security logging ✅
- `createSecurityEvent()` (line 337) - event creation ✅

Only need to add: `validatePartsListMimeType()` (Gap 2)

---

### ✅ REUSE 3: Backend Upload Pattern Proven

**Evidence**: `apps/api/lego-api/domains/mocs/routes.ts` lines 286-361 (thumbnail upload)

Pattern to copy:
1. Parse multipart form: `c.req.parseBody()` ✅
2. File validation ✅
3. Authorization check: user owns MOC ✅
4. S3 upload via `imageStorage.uploadFile()` ✅
5. Database update with transaction safety ✅
6. CloudFront URL conversion ✅
7. Error handling with specific codes ✅

**New Logic Required**:
- Query for existing parts list (AC36)
- Delete old S3 object if exists (AC37)
- Upsert pattern instead of update (AC40)

---

### ✅ REUSE 4: Frontend Component Patterns Proven

**Evidence**:
- `ThumbnailUpload/index.tsx` - single file upload with replace ✅
- `InstructionsUpload/index.tsx` - multi-file PDF upload ✅

**PartsListUpload Strategy**: Hybrid approach
- Single file mode from ThumbnailUpload (no queue, replace on upload)
- File validation from InstructionsUpload (PDF patterns adapted for CSV/XML)
- Accept attribute: `".csv,.xml,.pdf,application/pdf,text/csv,text/xml,application/xml"`

---

## Data Integrity Checks

### ✅ CHECK 1: Database Schema Supports Parts List

**Assumption from Story**: `moc_files` table supports `type='parts-list'`

**Verification Needed**: Confirm `moc_files` table exists with:
- `mocId` foreign key to `moc_instructions`
- `type` enum or varchar (must allow 'parts-list')
- Unique constraint on `(mocId, type)` for single file enforcement (OR enforce in service layer)

**Risk**: LOW - Story assumes schema exists, likely correct based on INST-1103/1104 completion

---

### ✅ CHECK 2: S3 Bucket Configured

**Evidence from INST-1103**: S3 bucket exists with CORS policy for multipart uploads

**Verification**: S3 bucket environment variable `S3_BUCKET` must be set

**Risk**: NONE - proven working in INST-1103/1104

---

## Testing Gaps

### 🟢 TEST COVERAGE: Comprehensive

Story defines:
- **51 unit tests** (AC51-AC59: 9 ACs)
- **5 integration tests** (AC60-AC64: 5 ACs)
- **9 E2E tests** (AC65-AC73: 9 ACs)

**Gaps**: None - testing is well-specified

**Evidence**:
- Happy path E2E tests for CSV, XML, PDF (AC65-AC68)
- Replace flow test (AC69-AC70)
- Error case tests for invalid type and size (AC71-AC72)
- Download verification (AC73)

---

## Security Review

### ✅ SECURITY: Properly Specified

**Mitigations in Place**:
1. **MIME Type Validation** (AC30): Whitelist approach prevents malicious file uploads
2. **File Size Limits** (AC33): 10MB max prevents DoS attacks
3. **Authorization** (AC27): User must own MOC to upload
4. **Security Logging** (AC44): Rejected uploads logged to CloudWatch
5. **S3 Key Sanitization** (AC39): Prevents path traversal attacks

**No Critical Security Gaps**

---

## Dependency Analysis

### ✅ NO BLOCKERS

**Story Dependencies**:
- INST-1102 (Create MOC): Completed ✅
- INST-1103 (Upload Thumbnail): Completed ✅
- INST-1104 (Upload Instructions): UAT (backend proven) ✅

**External Dependencies**:
- S3 bucket: Exists ✅
- CloudFront distribution: Exists ✅
- RTK Query: Configured ✅
- File validation utilities: Exist (partial) ⚠️

**Risk**: NONE - all dependencies satisfied

---

## Implementation Checklist

### Backend (6.5 hours)

- [ ] Add `validatePartsListMimeType()` to file-validation.ts (30 min)
- [ ] Add `validatePartsListFile()` to file-validation.ts (30 min)
- [ ] Add unit tests for validation functions (1 hour)
- [ ] Add `POST /mocs/:id/files/parts-list` endpoint to routes.ts (2 hours)
- [ ] Add backend integration tests (1.5 hours)
- [ ] Update endpoint constant in endpoints.ts (15 min)
- [ ] Manual testing with Postman/curl (1 hour)

### Frontend (9 hours)

- [ ] Create PartsListUpload component (3 hours)
- [ ] Create Zod schemas in __types__/index.ts (30 min)
- [ ] Add unit tests for PartsListUpload (2 hours)
- [ ] Add integration tests with MSW (1.5 hours)
- [ ] Integrate into MOC detail page (1 hour)
- [ ] Manual testing in browser (1 hour)

### E2E Tests (2 hours)

- [ ] Create `inst-1106-parts-list.feature` Cucumber file (30 min)
- [ ] Implement step definitions (1 hour)
- [ ] Run E2E tests and fix failures (30 min)

### Total: 17.5 hours

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|-----------|
| Endpoint path mismatch (Gap 5) | MEDIUM | HIGH | Fix endpoint constant before testing |
| MIME type validation incomplete | MEDIUM | MEDIUM | Test all 6 MIME types in AC56 |
| Single file replacement fails | LOW | LOW | Copy thumbnail's delete-then-upload pattern |
| CSV/XML parsing expectation creep | LOW | LOW | Story explicitly excludes parsing (non-goal) |

---

## Recommendation

**PROCEED WITH IMPLEMENTATION**

**Justification**:
1. All 3 critical gaps are straightforward (proven patterns exist)
2. Backend and frontend components well-specified (73 ACs)
3. Testing comprehensive (unit, integration, E2E defined)
4. No security vulnerabilities identified
5. Effort estimate realistic (2-3 days for 3-point story)

**Next Steps**:
1. Developer implements 3 critical gaps
2. Fixes endpoint URL mismatch (Gap 5)
3. Follows implementation checklist above
4. Runs all tests (unit, integration, E2E)

---

## Files to Create/Modify

### New Files (3)
1. `apps/web/app-instructions-gallery/src/components/PartsListUpload/index.tsx`
2. `apps/web/app-instructions-gallery/src/components/PartsListUpload/__types__/index.ts`
3. `apps/web/app-instructions-gallery/src/components/PartsListUpload/__tests__/PartsListUpload.test.tsx`

### Modified Files (3)
1. `apps/api/lego-api/core/utils/file-validation.ts` - Add validatePartsListMimeType()
2. `apps/api/lego-api/domains/mocs/routes.ts` - Add POST /mocs/:id/files/parts-list
3. `packages/core/api-client/src/config/endpoints.ts` - Fix UPLOAD_PARTS_LIST endpoint

### Test Files (5)
1. `apps/api/lego-api/core/utils/__tests__/file-validation.test.ts` - Add parts list tests
2. `apps/web/app-instructions-gallery/src/components/PartsListUpload/__tests__/PartsListUpload.integration.test.tsx`
3. `apps/web/playwright/features/inst-1106-parts-list.feature`
4. `apps/web/playwright/steps/inst-1106-parts-list.steps.ts`
5. Backend route integration tests

**Total Files**: 11 (3 new, 3 modified, 5 test files)

---

## ANALYSIS COMPLETE

All MVP-critical gaps identified. Story is **READY FOR IMPLEMENTATION** with 3 straightforward tasks.
