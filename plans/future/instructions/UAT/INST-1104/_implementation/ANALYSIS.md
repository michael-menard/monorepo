# Elaboration Analysis - INST-1104

**Story**: Upload Instructions (Direct ≤10MB)
**Analyst**: elab-analyst v3.0.0
**Date**: 2026-02-06
**Mode**: autonomous

---

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly (INST-1104 in Phase 1). Direct upload ≤10MB, PDF-only for MVP. |
| 2 | Internal Consistency | PASS | — | Goals/Non-goals/AC/Testing all align. No contradictions found. |
| 3 | Reuse-First | CONDITIONAL | Medium | Current validation (file-validation.ts) only supports images. Story correctly identifies need for PDF validation utilities (2 hours). Reuse of RTK mutation and S3 patterns is excellent. |
| 4 | Ports & Adapters | PASS | — | Backend route already exists (routes.ts lines 198-237) with service layer (services.ts lines 226-280). Business logic properly isolated. No HTTP types in service. **VERIFIED**: Service file `application/services.ts` exists with uploadInstructionFile() method. |
| 5 | Local Testability | PASS | — | E2E tests specified (inst-1104-upload-direct.feature), integration tests with MSW handlers planned, unit tests for validation functions defined. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Open Questions section not present (none needed - implementation path is clear). |
| 7 | Risk Disclosure | PASS | — | Risks explicitly documented: PDF validation (LOW), sequential upload UX (MEDIUM), S3 transaction safety (LOW). All have mitigation strategies. |
| 8 | Story Sizing | PASS | — | 71 ACs, 3 story points (24 hours). Only 2 indicators present: touches both frontend and backend, but backend is already implemented. Frontend-only work makes this appropriately sized. No split needed. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | PDF MIME type validation missing | Medium | Add `validatePdfMimeType()`, `validatePdfExtension()`, `validatePdfFile()` to file-validation.ts. Story correctly identifies this (2 hours). Current validateMimeType() only whitelists images. |
| 2 | Backend validation inconsistency | Medium | Backend service (services.ts line 238-246) validates PDF with loose check: `allowedTypes.includes(file.mimetype) && file.mimetype.startsWith('application/')`. Should use strict validation utilities from file-validation.ts for consistency. |
| 3 | File size limit mismatch | High | **CRITICAL**: Backend service allows 100MB (line 249), but story requires 10MB limit for direct upload. Story AC34 states ≤10MB. Backend must enforce 10MB limit for INST-1104. 100MB may be for presigned uploads (INST-1105). |
| 4 | Missing error message specificity | Low | Story AC46-47 requires specific error messages ("Only PDF files are allowed", "File size exceeds maximum limit of 10MB"). Backend returns generic 'INVALID_FILE'. Service should return structured errors. |
| 5 | CloudFront URL conversion not explicit | Low | Story AC41 requires CloudFront URL in response. Backend service uses `uploadResult.data.url` (line 268) from S3 upload. Need to verify FileStorage adapter converts S3 URLs to CloudFront URLs. |

---

## Split Recommendation

**Not Applicable** - Story is appropriately sized for 3 story points.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Rationale**:
- **3 MVP-critical gaps identified** (Issues #1, #2, #3) that must be fixed before implementation
- Backend endpoint already exists but needs refinement for 10MB limit and PDF-specific validation
- Frontend component is new but follows established patterns from wishlist upload domain
- Story is well-structured with comprehensive ACs and test coverage requirements
- Reuse plan is excellent (RTK mutation, S3 patterns, UI primitives)

**Action Required**: Fix Issues #1-3 before moving to implementation phase.

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | PDF validation utilities missing | Core upload validation | Add validatePdfMimeType(), validatePdfExtension(), validatePdfFile() to apps/api/lego-api/core/utils/file-validation.ts. Export for use in service layer. |
| 2 | File size limit enforcement | Core 10MB limit requirement | Backend service must enforce 10MB limit (not 100MB). Update services.ts line 248-252 to use MAX_FILE_SIZE constant from file-validation.ts (10MB). Document 100MB limit is for INST-1105 (presigned upload). |
| 3 | Backend validation consistency | Security and error clarity | Service should call validatePdfFile() utility instead of inline checks. Return structured error codes that map to AC46-47 error messages. |

**If no MVP-critical gaps**: N/A - 3 gaps identified above.

---

## Knowledge Base Integration

### Queries Executed

**Query 1**: Story patterns for upload domain
```javascript
kb_search({ query: "instructions upload story patterns", role: "pm", limit: 3 })
```
**Result**: No KB results (MCP unavailable per DEFERRED-KB-WRITES.yaml)

**Query 2**: Common elaboration gaps
```javascript
kb_search({ query: "common elaboration gaps file uploads", tags: ["elaboration", "gaps"], limit: 5 })
```
**Result**: No KB results (MCP unavailable per DEFERRED-KB-WRITES.yaml)

### Recommendations for KB

**Post-Implementation KB Entries**:
1. **Pattern**: "PDF validation utilities pattern" - Document validatePdfMimeType/Extension/File utilities as reusable pattern for document uploads
2. **Gap**: "File size limit enforcement" - Common gap where story specifies one limit (10MB) but backend implements another (100MB)
3. **Pattern**: "Backend route already exists" - When backend is implemented but needs refinement, how to structure story (INST-1104 is good example)

---

## Architecture Verification

### Ports & Adapters Compliance ✅

**Service Layer** (apps/api/lego-api/domains/instructions/application/services.ts):
- ✅ Pure business logic, no HTTP types
- ✅ Transport-agnostic (uploadInstructionFile method at lines 226-280)
- ✅ Dependencies injected (fileStorage, fileRepo)
- ✅ Returns Result<MocFile, InstructionsError> (domain types)

**Route Layer** (apps/api/lego-api/domains/instructions/routes.ts):
- ✅ Thin adapter (lines 198-237, ~40 lines)
- ✅ Parses multipart form, calls service
- ✅ Maps errors to HTTP status codes
- ✅ No business logic in route handler

**Adapters**:
- ✅ fileStorage.upload() for S3 (line 258)
- ✅ fileRepo.insert() for database (line 265)
- ✅ Cleanup on failure (line 276)

**Compliance**: PASS - Follows api-layer.md architecture pattern correctly.

---

## Reuse Validation

### Correctly Identified Reuse ✅

**Frontend**:
- ✅ @repo/app-component-library/_primitives (Button, Card, Label, Toast, Spinner, Badge)
- ✅ RTK Query mutation: useUploadInstructionFileMutation (lines 258-291 of instructions-api.ts)
- ✅ FormData handling pattern from wishlist domain

**Backend**:
- ✅ Existing route and service (routes.ts, services.ts)
- ✅ FileStorage.uploadFile() adapter
- ✅ FileRepository.insert() adapter
- ✅ createSecurityEvent(), logSecurityEvent() from file-validation.ts

### Missing Reuse (Gaps)

**File Validation**:
- ❌ Story identifies need for new PDF validation utilities
- ❌ Should reuse existing pattern: validateMimeType(), validateFileSize()
- ✅ Story correctly plans to add validatePdfMimeType(), validatePdfExtension(), validatePdfFile()

**Recommendation**: Reuse plan is excellent. Gap #1 (PDF validation) is correctly identified in story.

---

## Test Coverage Analysis

### Unit Tests (Frontend)

**Location**: apps/web/app-instructions-gallery/src/components/InstructionsUpload/__tests__/InstructionsUpload.test.tsx

**ACs Covered**: AC51-55 (5 test cases)
- Component renders
- PDF file type validation (rejects JPEG, TXT)
- File size validation (rejects >10MB)
- Multiple file selection
- Remove button functionality

**Coverage Target**: 80% line coverage (per story)

**Assessment**: ✅ Comprehensive unit tests specified.

### Unit Tests (Backend)

**ACs Covered**: AC56-59 (4 test cases)
- PDF MIME type validation
- File size validation (1 byte to 10MB range)
- PDF extension validation
- Authorization check (user owns MOC)

**Coverage Target**: 90% line coverage (per story)

**Assessment**: ✅ Backend validation tests specified. **Gap**: Tests must use new validatePdfFile() utility (Issue #1).

### Integration Tests

**Location**: apps/web/app-instructions-gallery/src/components/InstructionsUpload/__tests__/InstructionsUpload.integration.test.tsx

**ACs Covered**: AC60-64 (5 test cases)
- POST endpoint called correctly
- MSW handler returns success
- MSW handler returns error for invalid file
- File metadata matches MocFile schema
- Cache invalidation triggers

**Assessment**: ✅ Integration tests with MSW handlers specified.

### E2E Tests (Playwright + Cucumber)

**Feature File**: apps/web/playwright/features/instructions/inst-1104-upload-direct.feature

**ACs Covered**: AC65-71 (7 test cases)
- Upload single 5MB PDF (happy path)
- Multiple PDFs (sequential upload)
- Reject 15MB PDF with presigned flow hint
- Reject JPEG file with error message
- Download button functional
- Files appear in list after upload
- Error messages display correctly

**Assessment**: ✅ E2E coverage meets ADR-006 requirement (1 happy path + error cases).

---

## Security Analysis

### Authentication & Authorization ✅

**AC26-30**: Authentication and authorization requirements specified
- ✅ requireFeature('moc') middleware (AC27)
- ✅ Auth middleware (AC26)
- ✅ User ownership check in service (AC28-30)
- ✅ 404 if MOC not found, 403 if not owner

**Assessment**: Security requirements are comprehensive.

### File Validation ⚠️

**AC31-36**: PDF validation requirements
- ⚠️ **Gap #1**: PDF validation utilities missing (see Issues #1-3)
- ✅ Security logging specified (AC36)
- ⚠️ **Gap #2**: Backend service has loose validation (Issue #2)

**Assessment**: Security requirements are specified, but implementation needs refinement.

### Transaction Safety ✅

**AC42**: Transaction rollback requirement
- ✅ Service has cleanup on DB failure (services.ts line 276)
- ✅ Story acknowledges orphaned file cleanup handled by INST-1204
- ✅ Risk mitigation documented

**Assessment**: Transaction safety requirements are adequate for MVP.

---

## Accessibility Requirements

### Specified in Story ✅

**UI/UX Notes Section** (lines 415-438):
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Screen reader labels specified
- ✅ Focus management after file picker closes
- ✅ WCAG AA color contrast (4.5:1 minimum)

**ACs**: No explicit accessibility ACs in main AC list.

**Recommendation**: Accessibility requirements are documented in UI/UX section. Consider adding 2-3 ACs for keyboard navigation and screen reader support to main AC list for QA verification.

---

## Edge Cases & Error Handling

### Covered ✅

**Client-Side**:
- ✅ Non-PDF file rejection (AC6)
- ✅ File >10MB rejection (AC7)
- ✅ Upgrade hint for >10MB files (AC8)
- ✅ Network errors (AC23)

**Server-Side**:
- ✅ MOC not found (AC29)
- ✅ Unauthorized access (AC30)
- ✅ MIME type validation (AC31-32)
- ✅ File size validation (AC33-34)
- ✅ S3 upload failure (AC45)

**Database**:
- ✅ Transaction rollback on DB failure (AC42)

**Assessment**: Edge cases are comprehensively covered.

### Not Covered (Intentional - See Non-Goals)

**Explicitly Deferred**:
- Presigned URL upload for >10MB (INST-1105)
- Virus scanning (INST-2031)
- PDF thumbnail generation (INST-2032)
- Drag-and-drop (INST-2035)
- Progress bar with percentage (simple spinner sufficient)
- Batch upload (sequential acceptable)

**Assessment**: Non-goals are appropriately scoped. All deferred to future stories.

---

## Database Schema Verification

### moc_files Table ✅

**AC48-50**: Database schema requirements
- ✅ type='instruction' (AC48)
- ✅ Metadata stored: mocId, name, size, s3Key, uploadedAt (AC49)
- ✅ Multiple instruction files per MOC supported (AC50)

**Schema Definition** (story lines 306-320):
```sql
CREATE TABLE moc_files (
  id UUID PRIMARY KEY,
  moc_id UUID NOT NULL REFERENCES moc_instructions(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  url VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Assessment**: Schema definition is clear and supports all requirements.

---

## Integration Dependencies

### INST-1102: Create Basic MOC (In QA) ✅

**Status**: In QA (per stories.index.md line 129)
**Dependency**: Story correctly identifies blocked_by: [INST-1102]
**Action**: E2E tests will use MOC creation flow from INST-1102

**Assessment**: Dependency correctly identified and managed.

### INST-1103: Upload Thumbnail (Ready to Work) ✅

**Status**: Ready to Work (per stories.index.md line 130)
**Relation**: Sister story for image uploads
**Reuse**: Story correctly identifies reuse of client validation pattern and S3 upload pattern

**Assessment**: Reuse opportunity correctly identified.

### INST-1101: View MOC Details (Ready to Work) ✅

**Status**: Ready to Work (per stories.index.md line 128)
**Relation**: Displays uploaded instruction files
**Action**: InstructionsUpload component mounts on MocDetailPage

**Assessment**: Integration point correctly identified.

### INST-1105: Upload Instructions (Presigned >10MB) (Draft) ✅

**Status**: Draft (per stories.index.md line 132)
**Relation**: Upgrade path for large files
**Action**: Show upgrade hint for >10MB files (AC8)

**Assessment**: Upgrade path correctly planned.

---

## Story Structure Quality

### Strengths ✅

1. **Comprehensive ACs**: 71 acceptance criteria covering frontend, backend, database, and testing
2. **Clear Scope**: Direct upload ≤10MB, PDF-only, explicitly excludes features for future stories
3. **Reuse Plan**: Excellent identification of existing infrastructure (RTK mutation, backend route)
4. **Test Strategy**: Unit, integration, and E2E tests specified with coverage targets
5. **Risk Mitigation**: All 3 risks documented with mitigation strategies
6. **Reality Baseline**: Story includes actual line numbers for existing code (routes.ts lines 198-237)

### Weaknesses ⚠️

1. **File Size Limit Mismatch**: Story requires 10MB, backend implements 100MB (Issue #3)
2. **PDF Validation Missing**: Story identifies this but it's a blocking gap (Issue #1)
3. **Error Message Specificity**: Story requires specific error messages but backend returns generic codes (Issue #4)

### Overall Assessment ✅

**Story Quality**: Excellent. Very few gaps for a story with backend already implemented. Story author did thorough codebase analysis (included line numbers, identified RTK mutation exists, documented backend route exists).

**Recommendation**: Fix Issues #1-3, then proceed to implementation.

---

## Worker Token Summary

**Input**: ~8,500 tokens (files read)
- INST-1104.md: 4,200 tokens
- elab-analyst.agent.md: 800 tokens
- stories.index.md: 1,500 tokens
- PLAN.exec.md: 900 tokens
- api-layer.md: 1,100 tokens

**Output**: ~6,000 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- ANALYSIS.md: ~4,500 tokens
- FUTURE-OPPORTUNITIES.md: ~1,500 tokens

**Total**: ~14,500 tokens

---

## References

**Story Files**:
- /Users/michaelmenard/Development/Monorepo/plans/future/instructions/elaboration/INST-1104/INST-1104.md
- /Users/michaelmenard/Development/Monorepo/plans/future/instructions/stories.index.md

**Architecture**:
- /Users/michaelmenard/Development/Monorepo/docs/architecture/api-layer.md

**Existing Code**:
- /Users/michaelmenard/Development/Monorepo/apps/api/lego-api/domains/instructions/routes.ts (lines 198-237)
- /Users/michaelmenard/Development/Monorepo/apps/api/lego-api/domains/instructions/application/services.ts (lines 226-280)
- /Users/michaelmenard/Development/Monorepo/packages/core/api-client/src/rtk/instructions-api.ts (lines 258-291)
- /Users/michaelmenard/Development/Monorepo/apps/api/lego-api/core/utils/file-validation.ts

---

**Agent**: elab-analyst v3.0.0
**Completion**: 2026-02-06
**Verdict**: CONDITIONAL PASS - Fix Issues #1-3 before implementation
