---
created: 2026-02-05T21:00:00Z
feature: instructions
prefix: INST
---

# Epic: MOC Instructions (INST)

## Context

Feature directory for elaboration and implementation of the MOC Instructions epic.

## Key Information

- **Prefix**: INST
- **Feature Directory**: plans/future/instructions
- **Total Stories**: 18
- **Status**: Ready for epic elaboration

## Testing Requirements (CRITICAL)

**ALL STORIES IN THIS EPIC MUST INCLUDE:**

1. **Unit Tests** (Vitest) - Minimum 45% coverage for new code
   - Component unit tests
   - Utility function tests
   - Hook tests

2. **Integration Tests** (Vitest) - For backend endpoints and complex flows
   - API endpoint integration tests
   - Database integration tests
   - Service layer integration tests

3. **Playwright + Cucumber E2E Tests** - For user-facing features
   - Happy path flows
   - Error scenarios
   - Accessibility verification
   - Required structure:
     - Feature files in `apps/web/playwright/features/`
     - Step definitions in `apps/web/playwright/steps/`
     - Test specs in `apps/web/playwright/tests/`

## Story Phases

### Phase 0: Foundation (6 stories)
- INST-1000: Expiry & Interrupted Uploads
- INST-1001: E2E A11y Perf Testing
- INST-1002: Deploy Presigned URL Endpoints
- INST-1003: Extract Upload Types Package
- INST-1004: Extract Upload Config Package
- INST-1008: Wire RTK Query Mutations

### Phase 1: Edit Backend (3 stories)
- INST-1005: Validate Edit Endpoint
- INST-1006: Edit Rate Limiting Observability
- INST-1007: S3 Cleanup Failed Edit Uploads

### Phase 2: Edit Frontend (7 stories)
- INST-1009: Edit Page and Data Fetching
- INST-1010: Edit Form and Validation
- INST-1011: File Management UI
- INST-1012: Save Flow Presigned URL Upload
- INST-1013: Cancel Unsaved Changes Guard
- INST-1014: Session Persistence Error Recovery
- INST-1015: Accessibility and Polish

### Phase 3: Testing & Validation (2 stories)
- INST-1028: Upload Session Test Coverage
- INST-1029: Create MOC Flow Validation

## Documentation Artifacts

- `stories.index.md` - Story index and details
- `PLAN.meta.md` - Meta plan with epic goals
- `PLAN.exec.md` - Execution plan with artifact rules
- `roadmap.md` - Execution waves and critical path
