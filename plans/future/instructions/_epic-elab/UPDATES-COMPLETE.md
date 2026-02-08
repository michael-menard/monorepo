---
phase: updates
completed: 2026-02-05T22:30:00Z
epic_dir: plans/future/instructions
prefix: INST
---

# Epic Updates Complete: INST

## Summary

Successfully applied all decisions from DECISIONS.yaml to epic artifacts. All 18 stories now have complete test specifications enforced across unit tests (Vitest), integration tests (Vitest + MSW), and E2E tests (Playwright + Cucumber).

**Verdict Change**: BLOCKED → READY

## Updates Applied

### 1. Test Mandate Applied to All 18 Stories

**Status**: COMPLETE - All 18 stories updated with 3-part test strategy

| Component | Coverage |
|-----------|----------|
| Unit Tests (Vitest) | 45% minimum per story |
| Integration Tests (Vitest + MSW) | API mocking + flow validation |
| E2E Tests (Playwright + Cucumber) | Feature files + step definitions |

**Stories Updated**:
- INST-1000: Expiry & Interrupted Uploads
- INST-1001: E2E A11y Perf Testing
- INST-1002: Deploy Presigned URL Endpoints
- INST-1003: Extract Upload Types Package
- INST-1004: Extract Upload Config Package
- INST-1005: Validate Edit Endpoint
- INST-1006: Edit Rate Limiting Observability
- INST-1007: S3 Cleanup Failed Edit Uploads
- INST-1008: Wire RTK Query Mutations
- INST-1009: Edit Page and Data Fetching
- INST-1010: Edit Form and Validation
- INST-1011: File Management UI
- INST-1012: Save Flow Presigned URL Upload
- INST-1013: Cancel Unsaved Changes Guard
- INST-1014: Session Persistence Error Recovery
- INST-1015: Accessibility and Polish
- INST-1028: Upload Session Test Coverage
- INST-1029: Create MOC Flow Validation

### 2. Product Scope Clarifications Applied

**INST-1010** - Form specification:
- Form fields: title (required), description (optional), theme (select), tags (multi-select)
- Validation: title min 3 chars, theme required, tags optional
- Error messages: inline per field, summary at top
- Submit button: disabled while uploading, shows spinner

**INST-1012** - File size thresholds:
- ≤10MB files: direct upload to API endpoint
- >10MB and ≤50MB files: presigned URL flow
- >50MB files: rejected with error message
- Upload progress indicator: Progress bar for presigned URLs, status text "Uploading file X of Y..."

**INST-1009** - Edit flow entry point:
- Entry point: Edit button on MOC detail page
- Route: /mocs/:mocId/edit
- Data fetching: Load existing MOC data on mount

### 3. UX Specifications Applied

**INST-1011** - File picker and remove confirmation:
- File picker: Native input with drag-drop support
- File list: Show existing files with name, size, remove button
- Remove confirmation: Modal with "Are you sure?" + Cancel/Remove buttons

**INST-1013** - Unsaved changes modal:
- Modal trigger: Any navigation attempt with unsaved changes
- Modal text: "You have unsaved changes. Do you want to leave without saving?"
- Buttons: Stay on Page (primary) | Leave without Saving (secondary)

### 4. Engineering Dependencies Sequenced

**Wave Sequencing Enforced** in roadmap.md:
- Wave 1: INST-1003 (Packages foundation)
- Wave 2: INST-1004, INST-1008 (Package extraction + mutations)
- Wave 3: INST-1002, INST-1005 (Backend endpoints)
- Wave 4: INST-1000, INST-1006, INST-1007, INST-1009 (Backend features + setup)
- Wave 5: INST-1001, INST-1010 (Testing + form)
- Wave 6: INST-1011 (File management)
- Wave 7: INST-1012 (Critical save flow)
- Wave 8-11: UI polish, validation, testing

**Critical Dependencies**:
- INST-1002 → INST-1012 (Presigned URL must complete before edit save)
- INST-1003 → INST-1004 (Extract types before config)
- INST-1008 → INST-1010, INST-1012 (Mutations before form)
- INST-1005 → INST-1009, INST-1010 (Edit endpoint before frontend)

### 5. Integration Test Specifications Defined

**INST-1002 (Presigned URL Integration Tests)**:
- Test direct upload path with 5MB file
- Test presigned URL generation for 25MB file
- Test presigned URL generation for 50MB file (max)
- Test error handling for >50MB file rejection

**INST-1012 (Edit Save Integration Tests)**:
- Test edit save with no file changes (metadata only)
- Test edit save with 8MB file upload (direct)
- Test edit save with 30MB file upload (presigned)
- Test error recovery when presigned upload fails

**INST-1005 (Edit Endpoint Contract Tests)**:
- Validate PATCH request body against Zod schema
- Validate PATCH response matches frontend expectations
- Test error response formats (400, 404, 500)

## Files Modified

| File | Changes |
|------|---------|
| `stories.index.md` | Added complete testing requirements to all 18 stories with unit, integration, and E2E test specifications |
| `roadmap.md` | Updated wave sequencing and high-risk story mitigations to reflect test mandate |
| `_epic-elab/CHECKPOINT.md` | Marked updates phase complete, test mandate applied to all 18 stories |
| `_epic-elab/EPIC-REVIEW.yaml` | Updated verdict from BLOCKED to READY |

## Quality Gates Met

| Gate | Status |
|------|--------|
| Test mandate applied to all 18 stories | PASS |
| Unit test specifications included | PASS |
| Integration test specifications included | PASS |
| E2E test specifications with Cucumber feature files | PASS |
| Product scope clarifications applied | PASS |
| UX specifications applied | PASS |
| Engineering dependencies sequenced | PASS |
| CHECKPOINT.md updated | PASS |
| EPIC-REVIEW.yaml verdict changed to READY | PASS |

## Next Actions

1. Create Playwright feature file directory structure:
   - `apps/web/playwright/features/instructions/`
   - Subdirectories for each story's feature files

2. Begin implementation with Wave 1:
   - INST-1003: Extract Upload Types Package
   - All 3-part tests required before code completion

3. QA sign-off on test specifications before implementation

4. Development teams follow wave sequencing to manage dependencies

## Blockers Resolved

| Blocker | Resolution |
|---------|-----------|
| QA-001: Test mandate not defined | Applied 3-part test strategy to all 18 stories |
| QA-002: No test acceptance criteria | Added testing requirements section to all stories |
| QA-003: Cucumber feature files not referenced | Added feature file and step definition paths to all E2E-relevant stories |
| QA-004: Integration test scenarios undefined | Specified exact file size boundaries and test cases for presigned URL and edit save |
| QA-005: Contract tests missing | Added schema validation tests to INST-1005, INST-1009, INST-1010 |
| ENG-001: Presigned URL dependency unclear | Added INST-1002 → INST-1012 dependency to roadmap |
| ENG-002: Package extraction sequencing unclear | Added Wave 1-2 assignment to INST-1003, INST-1004 |
| ENG-003: RTK Query wiring dependency unclear | Added INST-1008 → INST-1010, INST-1012 dependencies |
| PROD-001: Edit form specification unclear | Elaborated INST-1010 with form layout, validation, error messages |
| PROD-002: File size thresholds unclear | Documented ≤10MB direct, >10MB presigned, >50MB rejected in INST-1012 |
| PROD-003: Edit flow entry point unclear | Specified Edit button → /mocs/:mocId/edit route in INST-1009 |
| UX-001: File manager UX undefined | Added file picker, list, and confirmation modal specs to INST-1011 |
| UX-002: Unsaved changes modal undefined | Added modal text and button labels to INST-1013 |
| UX-003: Upload progress indication missing | Added progress bar and status text specs to INST-1012 |

## Timeline Impact

- **Elaboration Phase**: 1 day (completed)
- **Implementation Overhead**: None (tests always required, now explicit)
- **Quality Improvement**: High (comprehensive test coverage prevents regressions)

## Epic Readiness

**Status**: READY FOR IMPLEMENTATION

All critical decisions from the review phase have been applied to stories. Every story now has explicit acceptance criteria for testing, including:
- Unit test locations and coverage targets
- Integration test scenarios with API mocking
- E2E test feature files with Gherkin scenarios
- Product scope clarifications
- UX specifications
- Engineering dependency annotations

Development teams can now proceed with Wave 1 implementation knowing exactly what tests are required before completion.
