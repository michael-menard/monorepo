# Planning Summary - INST-1104

**Story**: Upload Instructions (Direct ≤10MB)
**Date**: 2026-02-07
**Autonomy Level**: Conservative
**Agent**: dev-plan-leader v4.0.0

---

## Executive Summary

Planning is COMPLETE for INST-1104. The story implements PDF instruction file upload functionality for MOC Instructions, enabling users to upload PDF files (≤10MB) for their custom LEGO builds. The implementation is a vertical slice covering backend validation refinement, frontend component development, and comprehensive testing.

**Key Finding**: Backend infrastructure already exists (route, service, RTK mutation). Primary work is frontend InstructionsUpload component (6 hours) and backend PDF validation utilities (2 hours). Low risk, high confidence.

---

## Artifacts Created

1. **PLAN.yaml**: Detailed 7-phase implementation plan with 24-hour effort estimate
2. **KNOWLEDGE-CONTEXT.yaml**: Codebase knowledge, patterns, and reusable code
3. **FILE-CHANGES.md**: Line-by-line file modifications and new file specifications

---

## Implementation Strategy

### Phases Overview

| Phase | Name | Duration | Key Outputs |
|-------|------|----------|-------------|
| 1 | Backend PDF Validation Utilities | 2 hours | validatePdfFile() in file-validation.ts |
| 2 | Backend Service Layer Updates | 2 hours | Refined service with 10MB limit |
| 3 | Frontend InstructionsUpload Component | 6 hours | Upload component with validation |
| 4 | Frontend Integration | 2 hours | Component in MOC detail page |
| 5 | Frontend Unit/Integration Tests | 5 hours | Component and MSW tests |
| 6 | E2E Tests (Playwright) | 4 hours | Upload flow E2E tests |
| 7 | Documentation and Cleanup | 1 hours | README, API docs, linting |

**Total Effort**: 24 hours (3 story points)

---

## Key Decisions

### Backend Validation Approach
- **Decision**: Add validatePdfFile() utility following existing validateMimeType() pattern
- **Rationale**: Consistent validation approach, reusable across endpoints, security-focused
- **Impact**: 2 hours effort, resolves AC72-74

### File Size Limit
- **Decision**: Enforce 10MB limit for direct upload (not 100MB)
- **Rationale**: Story requirement, existing 100MB is for presigned upload (INST-1105)
- **Impact**: Critical fix, prevents accepting files that should use presigned flow

### Structured Error Codes
- **Decision**: Return specific error codes (INVALID_MIME_TYPE, INVALID_EXTENSION, FILE_TOO_LARGE)
- **Rationale**: Enables frontend to display user-friendly messages per AC46-47
- **Impact**: Better UX, clearer error handling

### Sequential Upload
- **Decision**: Upload files one at a time (not parallel)
- **Rationale**: Simpler implementation, easier progress tracking, acceptable for MVP
- **Impact**: Most users upload 1-2 files, parallel upload deferred to INST-2036

---

## Files to Modify

1. **apps/api/lego-api/core/utils/file-validation.ts**
   - Add ALLOWED_PDF_MIME_TYPES, ALLOWED_PDF_EXTENSIONS constants
   - Add validatePdfMimeType(), validatePdfExtension(), validatePdfFile()
   - Update ValidationResult schema with INVALID_EXTENSION code

2. **apps/api/lego-api/domains/instructions/application/services.ts**
   - Replace inline validation with validatePdfFile() call
   - Enforce 10MB limit (use MAX_FILE_SIZE constant)
   - Add security logging with createSecurityEvent()
   - Return structured error codes

3. **apps/api/lego-api/domains/instructions/routes.ts**
   - Update error mapping to handle new error codes
   - Map error codes to user-friendly messages (AC46-47)

4. **apps/web/app-instructions-gallery/src/components/MocDetailDashboard/InstructionsCard.tsx**
   - Import and render InstructionsUpload component
   - Add authorization check (only show for MOC owner)
   - Pass mocId and onSuccess callback

---

## Files to Create

1. **InstructionsUpload Component** (~350 lines)
   - File picker with PDF validation
   - Sequential upload with progress indicator
   - Success/error toast notifications

2. **Component Types** (~60 lines)
   - Zod schemas for props and validation
   - Constants (ALLOWED_FILE_TYPES, MAX_FILE_SIZE)

3. **Unit Tests** (~250 lines)
   - Component rendering, validation, file selection

4. **Integration Tests** (~200 lines)
   - MSW handlers, cache invalidation

5. **E2E Tests** (~300 lines)
   - Happy path, multiple files, error cases

6. **Test Fixtures** (2 PDF files)
   - 5MB PDF for happy path
   - 15MB PDF for rejection test

7. **Documentation** (~150 lines)
   - Component README with usage examples

---

## Acceptance Criteria Coverage

**Total ACs**: 74

**By Phase**:
- Backend validation: AC72-74 (3 ACs)
- Backend refinement: AC24-47 (24 ACs)
- Frontend component: AC1-23 (23 ACs)
- Frontend tests: AC51-64 (14 ACs)
- E2E tests: AC65-71 (7 ACs)
- Database: AC48-50 (3 ACs - already satisfied by existing schema)

**Coverage**: 100% (all 74 ACs mapped to implementation phases)

---

## Dependencies

### External Dependencies
- **INST-1102 (Create Basic MOC)**: In QA, E2E tests use MOC creation flow
- Non-blocking, existing MOC creation works

### Internal Dependencies
- **useUploadInstructionFileMutation**: Already exists in @repo/api-client
- **POST /mocs/:id/files/instruction**: Already exists in routes.ts
- **ThumbnailUpload component**: Provides pattern to follow

**Status**: All dependencies satisfied, no blockers

---

## Risk Assessment

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| PDF validation missing | Low | Phase 1 adds utilities (2 hours) | Mitigated |
| Sequential upload UX | Medium | Show progress, allow cancel | Accepted for MVP |
| S3 transaction safety | Low | Existing cleanup pattern works | Mitigated |

**Overall Risk**: Low

---

## Testing Strategy

### Unit Tests
- **Frontend**: 80% coverage target
  - Component rendering (AC51)
  - File validation (AC52-53)
  - File selection/removal (AC54-55)

- **Backend**: 90% coverage target
  - PDF MIME type validation (AC56)
  - File size validation (AC57)
  - PDF extension validation (AC58)
  - Authorization check (AC59)

### Integration Tests
- MSW handlers for API mocking
- POST endpoint success/error cases (AC60-62)
- Schema validation (AC63)
- Cache invalidation (AC64)

### E2E Tests
- Upload single PDF (AC65-66)
- Upload multiple PDFs (AC67-68)
- Reject oversized file (AC69)
- Reject invalid file type (AC70)
- Download functionality (AC71)

**Test Coverage**: Comprehensive (unit, integration, E2E per ADR-006)

---

## Key Patterns to Follow

### Backend Validation
Follow existing validateMimeType() pattern in file-validation.ts:
```typescript
export function validatePdfFile(
  mimeType: string | undefined | null,
  filename: string | undefined | null,
  sizeBytes: number | undefined | null,
): ValidationResult {
  // Check MIME type, extension, size
  // Return structured ValidationResult
}
```

### Frontend Upload Component
Follow ThumbnailUpload component pattern:
```typescript
const [uploadInstructionFile, { isLoading }] = useUploadInstructionFileMutation()

const handleUpload = async () => {
  try {
    const result = await uploadInstructionFile({ mocId, file }).unwrap()
    showSuccessToast('Instructions uploaded!')
    if (onSuccess) onSuccess(result)
  } catch (error) {
    showErrorToast(error?.data?.message || 'Upload failed')
  }
}
```

### Zod-First Types
Never use TypeScript interfaces:
```typescript
// CORRECT
const PropsSchema = z.object({
  mocId: z.string().uuid(),
})
type Props = z.infer<typeof PropsSchema>

// WRONG
interface Props {
  mocId: string
}
```

---

## Confidence Assessment

**Confidence Level**: Very High

**Rationale**:
1. Backend infrastructure already exists (route, service, RTK mutation)
2. Frontend follows established ThumbnailUpload pattern
3. Database schema supports requirements without changes
4. Clear acceptance criteria (74 ACs)
5. Existing validation patterns to follow
6. Low risk, minimal unknowns

**Unknowns**: None blocking

---

## Next Steps

### Immediate (Phase 1)
1. Begin backend PDF validation utilities
2. Create validatePdfMimeType(), validatePdfExtension(), validatePdfFile()
3. Add unit tests for validation functions
4. Estimated: 2 hours

### After Phase 1
1. Refine backend service to use new validation
2. Enforce 10MB limit, add structured error codes
3. Estimated: 2 hours

### After Phase 2
1. Build InstructionsUpload frontend component
2. Follow ThumbnailUpload pattern for consistency
3. Estimated: 6 hours

---

## Success Criteria

Story is complete when:
- ✅ All 74 acceptance criteria passing
- ✅ Unit tests: 80% frontend, 90% backend coverage
- ✅ Integration tests: MSW handlers for success/error
- ✅ E2E tests: 1 happy path + 3 error cases (ADR-006)
- ✅ Code review approved
- ✅ Security review: PDF validation, authorization
- ✅ ESLint and Prettier passing
- ✅ Deployed to staging and QA verified

---

## References

**Planning Artifacts**:
- PLAN.yaml - Detailed 7-phase implementation plan
- KNOWLEDGE-CONTEXT.yaml - Codebase knowledge and patterns
- FILE-CHANGES.md - Line-by-line file modifications

**Story Files**:
- INST-1104.md - Story specification with 74 ACs
- ANALYSIS.md - Elaboration analysis
- DECISIONS.yaml - MVP-critical gaps and resolutions

**Key Code Files**:
- apps/api/lego-api/core/utils/file-validation.ts
- apps/api/lego-api/domains/instructions/routes.ts
- apps/api/lego-api/domains/instructions/application/services.ts
- packages/core/api-client/src/rtk/instructions-api.ts
- apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx

---

**Signal**: PLANNING COMPLETE

**Readiness**: Ready for implementation phase (setup)

**Estimated Delivery**: 3 story points (24 hours / 3 days)
