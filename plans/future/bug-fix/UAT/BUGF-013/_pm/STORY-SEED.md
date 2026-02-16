---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-013

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline reality file exists at the expected path. Story seed generated from codebase scanning and ADR context.

### Relevant Existing Features

**Upload Infrastructure (Recently Implemented)**
- BUGF-032 (ready-for-qa): Frontend integration for presigned URL upload complete with RTK Query mutation, session refresh handling, 16 unit tests passing
- BUGF-031 (ready-to-work): Backend API endpoint POST /api/uploads/presigned-url for generating presigned S3 URLs
- Shared @repo/upload package with comprehensive test coverage (18 test files for hooks, components, types)

**Current Test Coverage**
- Total source files in app-instructions-gallery: 50 files
- Total test files: 18 test files
- Approximate coverage: ~36% (below 45% minimum threshold)

**Untested Components (High Priority)**
1. SessionProvider/index.tsx - Context provider for upload session state
2. UploaderFileItem/index.tsx - Individual file item with progress, retry, cancel
3. UploaderList/index.tsx - Grouped file list with aggregate progress
4. ConflictModal/index.tsx - 409 conflict resolution dialog
5. RateLimitBanner/index.tsx - 429 rate limit countdown display
6. SessionExpiredBanner/index.tsx - Session expiry warning with refresh
7. upload-page.tsx - Main upload page with presigned URL integration (789 lines)
8. EditForm.tsx - MOC edit form with Zod validation (270 lines)
9. SlugField.tsx - Slug generation and validation field
10. TagInput.tsx - Tag input component
11. MocDetailDashboard components (7 cards) - CoverCard, GalleryCard, MetaCard, etc.

### Active In-Progress Work

**No Conflicts Detected**
- BUGF-012 (in-progress): Add Test Coverage for Inspiration Gallery Components (different app)
- BUGF-010 (in-progress): Fix Hub.listen Mocking in Auth Tests (auth-specific, no upload overlap)
- No active stories modifying app-instructions-gallery components

### Constraints to Respect

**Architecture Constraints (from ADR-005)**
- UAT tests must use real services (no MSW mocking)
- Unit tests must use MSW for API mocking
- Presigned URL API calls must be mocked with MSW handlers in unit tests
- S3 PUT requests must be mocked in unit tests (not real S3)

**Test Infrastructure Constraints (from ADR-006)**
- E2E tests are recommended but not required during dev phase
- E2E tests split to BUGF-051 for presigned URL upload flow

**Package Structure Constraints (from CLAUDE.md)**
- All new tests must use Vitest + React Testing Library
- Semantic queries required: getByRole, getByLabelText (not getByTestId)
- Minimum 45% global coverage threshold
- Component tests follow structure: Component/__tests__/Component.test.tsx

---

## Retrieved Context

### Related Endpoints

**Presigned URL API (BUGF-032)**
- POST /api/uploads/presigned-url - Generate presigned S3 URL
- Request: { fileName, mimeType, fileSize, category }
- Response: { presignedUrl, key, expiresAt }

**Session Refresh API (BUGF-004 - backlog)**
- POST /api/uploads/refresh-session - Refresh expired presigned URLs
- Not yet implemented (dependency for session tests)

**Finalize API (app-specific)**
- POST /api/instructions/finalize - Finalize upload session
- Handles 409 conflict, 429 rate limit, per-file validation errors

### Related Components

**@repo/upload Package (Comprehensive Test Coverage)**
```
packages/core/upload/src/
├── hooks/
│   ├── useUpload.ts (tested: useUpload.test.tsx)
│   ├── useUploadManager.ts (tested: useUploadManager.test.tsx)
│   └── useUploaderSession.ts (tested: useUploaderSession.test.tsx)
├── components/
│   ├── ConflictModal (tested: ConflictModal.test.tsx)
│   ├── RateLimitBanner (tested: RateLimitBanner.test.tsx)
│   ├── SessionExpiredBanner (tested: SessionExpiredBanner.test.tsx)
│   ├── UnsavedChangesDialog (tested: UnsavedChangesDialog.test.tsx)
│   ├── UploaderFileItem (tested: UploaderFileItem.test.tsx)
│   └── UploaderList (tested: UploaderList.test.tsx)
├── client/
│   ├── xhr.ts (tested: xhr.test.ts)
│   ├── manager.ts (tested: manager.test.ts)
│   └── finalize.ts (tested: finalize.test.ts)
└── types/
    ├── session.ts (tested: session.test.ts)
    ├── upload.ts (tested: upload.test.ts)
    ├── validation.ts (tested: validation.test.ts)
    └── slug.ts (tested: slug.test.ts)
```

**App-Specific Components (Thin Wrappers - Need Tests)**
- SessionProvider - Wraps @repo/upload/hooks/useUploaderSession with context
- upload-page.tsx - Integrates presigned URL API with upload manager
- EditForm.tsx - Uses react-hook-form + Zod validation
- MocDetailDashboard/* - Display components (low test priority)

### Reuse Candidates

**Test Patterns from @repo/upload**
1. MSW handlers for presigned URL mocking (existing in packages/core/upload/src/__tests__/setup.ts)
2. Upload state mocking utilities
3. File upload simulation helpers
4. Session restoration testing patterns

**Test Patterns from BUGF-032**
- RTK Query mutation testing (apps/web/app-instructions-gallery/src/components/MocEdit/__tests__/EditForm.test.tsx)
- Presigned URL API mocking with MSW
- Error handling test cases (status codes: 409, 429, 400, 500)

**Existing Test Setup**
- apps/web/app-inspiration-gallery/src/test/setup.ts - Standard MSW + DOM mocking setup
- Reusable for instructions gallery tests

---

## Knowledge Context

### Lessons Learned

**No lessons loaded** - KB search not performed (baseline missing, proceeding with ADR-only guidance)

### Blockers to Avoid (from past stories)

**Not available** - No baseline or lesson data loaded

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy - UAT Must Use Real Services | Unit tests use MSW mocking; UAT uses real services |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story (optional for test stories) |
| ADR-001 | API Path Schema | Frontend: /api/v2/uploads/*, Backend: /uploads/* (Vite proxy required) |

### Patterns to Follow

**Test Organization (from @repo/upload)**
- Component tests in Component/__tests__/Component.test.tsx
- Hook tests in hooks/__tests__/hookName.test.tsx
- Integration tests for multi-component flows
- Separate test files for accessibility, validation, error handling

**MSW Mocking Pattern (from ADR-005)**
```typescript
// Mock presigned URL generation
http.post('/api/v2/uploads/presigned-url', () => {
  return HttpResponse.json({
    presignedUrl: 'https://s3.mock.com/bucket/key',
    key: 'uploads/user-123/file.pdf',
    expiresAt: Date.now() + 3600000,
  })
})

// Mock S3 PUT upload
http.put('https://s3.mock.com/bucket/*', () => {
  return new HttpResponse(null, { status: 200 })
})
```

**Error Scenario Testing (from BUGF-032)**
- 409 conflict: Mock finalize API response with conflict error
- 429 rate limit: Mock with retryAfterSeconds field
- Per-file validation errors: Mock with fileErrors array
- Session expiry: Simulate expired presigned URL (401/403)

### Patterns to Avoid

**From ADR-005**
- Do NOT use real S3 in unit tests (MSW mock required)
- Do NOT skip UAT testing for upload flows (real backend validation needed)

**From CLAUDE.md**
- Do NOT use getByTestId - use semantic queries (getByRole, getByLabelText)
- Do NOT create barrel files (index.ts re-exports)
- Do NOT use console.log - use @repo/logger (already mocked in test setup)

---

## Conflict Analysis

**No conflicts detected.**

All related stories are either in different apps (BUGF-012) or different domains (BUGF-010). No overlapping file modifications expected.

---

## Story Seed

### Title

Add Test Coverage for Instructions Gallery Upload Components

### Description

**Context**

The app-instructions-gallery upload flow was recently integrated with the presigned URL API (BUGF-032), but several critical components lack test coverage. Current test coverage is approximately 36%, below the 45% minimum threshold. The shared @repo/upload package has comprehensive test coverage (18 test files), but app-specific integration points are untested.

**Problem**

The following high-value components have zero test coverage:
1. **Upload Flow Components** - SessionProvider, UploaderFileItem, UploaderList (thin wrappers around @repo/upload)
2. **Error Handling Components** - ConflictModal, RateLimitBanner, SessionExpiredBanner
3. **Main Upload Page** - upload-page.tsx (789 lines, presigned URL integration, finalize flow)
4. **Edit Form Components** - EditForm.tsx, SlugField.tsx, TagInput.tsx (Zod validation)

Without tests, regressions in upload state management, error handling, and form validation can go undetected. The presigned URL integration (BUGF-032) added complex error scenarios (409, 429, per-file validation) that need test coverage.

**Solution Direction**

Create unit tests for untested upload components, focusing on:
1. Integration points with @repo/upload package
2. Presigned URL API mocking with MSW
3. Error handling scenarios (409 conflict, 429 rate limit, session expiry)
4. Form validation with react-hook-form + Zod
5. Session state persistence and restoration
6. Accessibility (ARIA labels, keyboard navigation)

Reuse test patterns from @repo/upload package and existing BUGF-032 test implementations.

### Initial Acceptance Criteria

**Upload Flow Components**
- [ ] AC-1: SessionProvider context provides session state correctly
- [ ] AC-2: SessionProvider restores persisted session on mount
- [ ] AC-3: UploaderFileItem renders file info, progress, and status correctly
- [ ] AC-4: UploaderFileItem handles cancel, retry, remove actions
- [ ] AC-5: UploaderList groups files by category and shows aggregate progress

**Error Handling Components**
- [ ] AC-6: ConflictModal displays current title and allows new title input
- [ ] AC-7: ConflictModal validates new title differs from original
- [ ] AC-8: RateLimitBanner displays countdown timer and retry button
- [ ] AC-9: SessionExpiredBanner displays expired count and refresh action

**Upload Page Integration**
- [ ] AC-10: upload-page.tsx renders form with file upload buttons
- [ ] AC-11: upload-page.tsx calls presigned URL API when files selected
- [ ] AC-12: upload-page.tsx handles presigned URL API errors (mocked with MSW)
- [ ] AC-13: upload-page.tsx handles session expiry and refresh flow
- [ ] AC-14: upload-page.tsx handles finalize flow with 409/429 errors

**Form Validation**
- [ ] AC-15: EditForm validates title (required, 3-120 chars)
- [ ] AC-16: EditForm validates description (required, 10-2000 chars)
- [ ] AC-17: EditForm detects form changes and enables save button
- [ ] AC-18: SlugField validates slug format and uniqueness
- [ ] AC-19: TagInput validates tag count (max 10) and length (max 30 chars)

**Accessibility**
- [ ] AC-20: All upload components have proper ARIA labels and roles
- [ ] AC-21: Error messages linked to inputs with aria-describedby
- [ ] AC-22: Upload progress announced to screen readers (aria-live)

### Non-Goals

**Out of Scope**
- E2E testing of upload flow (split to BUGF-051)
- Backend API implementation (already complete in BUGF-031)
- Testing @repo/upload package components (already have 18 test files)
- Testing MocDetailDashboard display components (low priority, deferred)
- Real S3 upload testing (use MSW mocks per ADR-005)
- Session refresh API testing (API not implemented, blocked by BUGF-004)

**Protected Features**
- Do NOT modify @repo/upload package tests (already comprehensive)
- Do NOT modify existing BUGF-032 tests (passing, ready for QA)

**Deferred Work**
- MocDetailDashboard component tests (CoverCard, GalleryCard, etc.) - visual components, low test value
- Edit page route integration tests - covered by existing edit-page.test.tsx

### Reuse Plan

**Components from @repo/upload**
- useUploaderSession hook (tested in @repo/upload)
- useUploadManager hook (tested in @repo/upload)
- UnsavedChangesDialog (tested in @repo/upload)

**Test Patterns from @repo/upload**
- MSW setup for presigned URL API (packages/core/upload/src/__tests__/setup.ts)
- File upload state mocking utilities
- Session restoration test patterns

**Test Patterns from BUGF-032**
- RTK Query mutation mocking (apps/web/app-instructions-gallery/src/components/MocEdit/__tests__/EditForm.test.tsx)
- Error handling test cases (409, 429, 400, 500 status codes)

**Shared Test Setup**
- apps/web/app-inspiration-gallery/src/test/setup.ts - MSW + DOM mocking template
- @repo/logger mocking (already configured)
- TanStack Router mocking (already configured)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Priorities**
1. **High Priority**: upload-page.tsx integration tests (presigned URL flow, error handling, finalize)
2. **High Priority**: Error handling components (ConflictModal, RateLimitBanner, SessionExpiredBanner)
3. **Medium Priority**: SessionProvider context tests (state management, persistence)
4. **Medium Priority**: Form validation tests (EditForm, SlugField, TagInput)
5. **Low Priority**: UploaderFileItem/UploaderList (thin wrappers, low complexity)

**Test Setup Requirements**
- MSW handlers for POST /api/v2/uploads/presigned-url (success + error cases)
- MSW handlers for S3 PUT requests (mock upload to S3)
- MSW handlers for POST /api/instructions/finalize (409, 429, success)
- Mock file creation utilities (PDF, images with correct MIME types)

**Coverage Gaps**
- Session refresh flow (blocked by BUGF-004 - API not implemented)
- Real S3 interaction (intentionally excluded per ADR-005)

### For UI/UX Advisor

**Accessibility Validation**
- Verify all error messages have aria-describedby linking to inputs
- Verify upload progress uses aria-live="polite" for screen reader announcements
- Verify file upload buttons have clear aria-labels
- Verify keyboard navigation works for all upload actions (cancel, retry, remove)

**Form UX Validation**
- Validate real-time validation feedback for form fields
- Validate character count displays for title/description
- Validate disabled state messaging for submit button ("No changes", "Fix errors")

### For Dev Feasibility

**Technical Constraints**
- MSW mocking required for presigned URL API (cannot hit real backend in unit tests)
- S3 PUT requests must be mocked (no real S3 interaction)
- Session refresh tests blocked until BUGF-004 API is implemented
- E2E tests split to BUGF-051 (not in scope for this story)

**Implementation Notes**
- Reuse @repo/upload test patterns extensively (avoid reinventing mocks)
- Focus on integration points between app and @repo/upload package
- Test error scenarios thoroughly (409, 429 most critical)
- Use existing test setup from app-inspiration-gallery as template

**Estimated Complexity**
- Upload page integration: High (complex flow, multiple error paths)
- Error components: Medium (UI logic, countdown timers)
- Form validation: Medium (Zod schema testing, react-hook-form integration)
- SessionProvider: Low (thin wrapper around @repo/upload hook)
- UploaderFileItem/List: Low (thin wrappers, mostly rendering)

**Risk Areas**
- MSW handler configuration for presigned URL flow (multi-step: generate URL → upload to S3)
- File upload simulation (creating mock File objects with correct types)
- Timer testing for RateLimitBanner countdown (use vi.useFakeTimers)

---

STORY-SEED COMPLETE WITH WARNINGS: 1 warning

**Warning**: No baseline reality file exists. Story seed generated from codebase scanning, ADR analysis, and related story inspection. Recommendation: Generate baseline reality file before starting story elaboration to ensure full context awareness.
