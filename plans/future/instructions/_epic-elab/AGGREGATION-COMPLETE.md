# INST Epic Elaboration - Aggregation Phase Complete

**Date**: 2026-02-05
**Time**: 21:30 UTC
**Feature**: MOC Instructions (INST)
**Phase**: Aggregation Complete

---

## Executive Summary

The aggregation phase has successfully consolidated reviews from 6 specialist perspectives across the 18-story INST epic.

**VERDICT: BLOCKED** - Epic cannot proceed to development until critical test mandate is defined across all stories.

---

## Review Phase Results

### Specialist Reviews Completed

| Perspective | Verdict | Status | File |
|-------------|---------|--------|------|
| Engineering | CONCERNS | Complete | REVIEW-engineering.yaml |
| Product | CONCERNS | Complete | REVIEW-product.yaml |
| QA | BLOCKED | Complete | REVIEW-qa.yaml |
| UX | CONCERNS | Complete | REVIEW-ux.yaml |
| Platform | READY | Complete | REVIEW-platform.yaml |
| Security | READY | Complete | REVIEW-security.yaml |

---

## Critical Findings

### TEST MANDATE ENFORCEMENT - HIGHEST PRIORITY

The user's critical requirement that **EVERY story MUST have unit tests, integration tests, AND Playwright+Cucumber E2E tests** has revealed the most significant blocker:

**All 18 stories currently lack explicit test strategy definitions.**

This is not a minor gap - this is a fundamental blocker preventing development from starting:

```
CRITICAL-001: TEST MANDATE NOT DEFINED
- Scope: All 18 stories
- Impact: BLOCKED - core journey completely untestable
- Action: REQUIRED - Return to elaboration for complete test strategy
```

### Test Strategy Gaps by Category

**Unit Tests**: Not defined in any story
**Integration Tests**: Only informal mention (50MB file for INST-1002)
**E2E Tests**: Only INST-1001 mentions, no feature files referenced
**Cucumber Feature Files**: Completely missing from all E2E-relevant stories
**Contract Tests**: Missing entirely (frontend/backend schema validation)

### Why This Matters

1. **Instructions feature is core to platform** - Users can lose work if upload/edit flows fail
2. **MVP cannot launch untestable** - Need verification that critical path works end-to-end
3. **Cucumber provides executable spec** - Feature files serve as acceptance criteria AND tests
4. **3-part strategy non-negotiable** - Unit (code correctness) + Integration (flow) + E2E (user journey)

---

## Aggregated Blockers (13 Total)

### CRITICAL (Test Mandate Related - 4)

| ID | Source | Issue | Stories | Action |
|----|--------|-------|---------|--------|
| CRITICAL-001 | QA | All 18 stories lack unit/integration/E2E test strategy | All 18 | Add complete test specs to every story |
| CRITICAL-002 | QA | Cucumber feature files not referenced - E2E spec missing | 10 E2E stories | Add feature file paths to acceptance criteria |
| CRITICAL-003 | QA | Integration test scope undefined for presigned URL and edit save flows | INST-1002, INST-1012 | Define file size boundaries and upload scenarios |
| CRITICAL-004 | QA | Contract tests missing for edit endpoint - schema alignment not verifiable | INST-1005, INST-1009, INST-1010 | Add request/response schema tests |

### HIGH (Engineering/Product/UX - 9)

| ID | Source | Scope | Stories | Action |
|----|--------|-------|---------|--------|
| ENG-001 | Engineering | Package extraction must sequence as Wave 1-2 | INST-1003, INST-1004 | Update roadmap wave sequencing |
| ENG-002 | Engineering | INST-1002 presigned URL critical dependency | INST-1002, INST-1012 | Ensure 50MB integration test in INST-1002 |
| ENG-003 | Engineering | RTK Query mutations required before edit frontend | INST-1008 | Complete INST-1008 before edit stories |
| PROD-001 | Product | Edit form validation lacks clear AC | INST-1010 | Define form layout and validation rules |
| PROD-002 | Product | Presigned URL size thresholds undocumented | INST-1012 | Document ≤10MB direct vs >10MB presigned |
| PROD-003 | Product | Edit flow entry point unclear | INST-1009 | Specify navigation from MOC detail to edit |
| UX-001 | UX | File management UI lacks UX spec | INST-1011 | Add wireframe for file add/remove flows |
| UX-002 | UX | Unsaved changes guard lacks modal UX | INST-1013 | Specify confirmation modal behavior |
| UX-003 | UX | Upload progress indication missing | INST-1012 | Add progress bar during file upload |

---

## Missing MVP Stories (4)

1. **Complete test strategy definition for all 18 stories** (QA)
   - Each story must have: unit test location, integration test location, E2E feature file path

2. **Cucumber feature file paths for E2E scenarios** (QA)
   - Specification files at: `apps/web/playwright/features/inst-*.feature`

3. **Edit flow integration test scenarios** (QA)
   - End-to-end test covering edit page → form → save → API → database flow

4. **Upload progress indication UX** (UX)
   - Visual feedback during file upload in save flow (INST-1012)

---

## Verdict Consolidation

### Overall Epic Verdict: **BLOCKED**

**Rationale**: QA blocker (test mandate) takes precedence. Cannot proceed to implementation without knowing how to verify core functionality works.

### Verdict by Perspective

| Perspective | Verdict | Reason | Weight |
|-------------|---------|--------|--------|
| QA | BLOCKED | Test strategy completely missing | 🔴 Critical |
| Engineering | CONCERNS | 3 dependency/sequencing issues | 🟡 High |
| Product | CONCERNS | 3 scope clarification issues | 🟡 High |
| UX | CONCERNS | 3 UX specification gaps | 🟡 High |
| Platform | READY | All infra requirements satisfied | 🟢 Clear |
| Security | READY | Baseline practices adequate | 🟢 Clear |

**Conflict Resolution**: QA blocker prevents entire epic from proceeding. Test strategy is prerequisite, not optional enhancement.

---

## Aggregation Metrics

| Category | Count |
|----------|-------|
| Total MVP Blockers | 13 |
| Critical (Test Mandate) | 4 |
| High (Other) | 9 |
| Missing MVP Stories | 4 |
| Stories Affected by Blockers | 18 |
| Perspectives Ready | 2 (Platform, Security) |
| Perspectives with Concerns | 3 (Engineering, Product, UX) |
| Perspectives Blocked | 1 (QA) |

---

## What Happens Next

### Recommended Actions (In Order)

1. **RETURN TO ELABORATION PHASE** (Days 1-2)
   - Update all 18 story documents with complete test strategy
   - Define test template: unit test location + integration test location + E2E feature file path
   - Add Cucumber feature files to acceptance criteria

2. **QA SIGN-OFF** (Day 3)
   - QA reviews test specs for all 18 stories
   - Confirms unit, integration, and E2E testing is verifiable
   - Sign-off before any implementation begins

3. **RESOLVE ENGINEERING BLOCKERS** (Day 3)
   - Add INST-1003, INST-1004 to Wave 1-2 with test specs
   - Confirm INST-1002 includes 50MB integration test
   - Sequence INST-1008 before edit frontend stories

4. **RESOLVE PRODUCT/UX BLOCKERS** (Day 3)
   - Add AC to INST-1010 for form layout and validation
   - Add AC to INST-1012 for file size thresholds
   - Add UX wireframes to INST-1011, INST-1013
   - Add progress indicator to INST-1012

5. **RE-RUN AGGREGATION** (Day 4)
   - Engineering, Product, UX should move from CONCERNS to READY
   - QA should move from BLOCKED to READY with complete test specs
   - Epic verdict should become READY to proceed to implementation

### Estimated Timeline

- Elaboration updates: 1-2 days
- QA review and sign-off: 1 day
- Resolution of other blockers: Parallel with elaboration
- Re-run aggregation: 1 day
- **Total**: 3-4 days to READY verdict

---

## Output Artifacts

### Created Files

| File | Purpose | Status |
|------|---------|--------|
| REVIEW-engineering.yaml | Engineering perspective analysis | ✓ Created |
| REVIEW-product.yaml | Product perspective analysis | ✓ Created |
| REVIEW-qa.yaml | QA perspective analysis | ✓ Created |
| REVIEW-ux.yaml | UX perspective analysis | ✓ Created |
| REVIEW-platform.yaml | Platform perspective analysis | ✓ Created |
| REVIEW-security.yaml | Security perspective analysis | ✓ Created |
| EPIC-REVIEW.yaml | Consolidated MVP-critical findings | ✓ Created |
| FUTURE-ROADMAP.yaml | Post-MVP enhancements tracked | ✓ Created |
| AGGREGATION-COMPLETE.md | This summary document | ✓ Created |

### Key Documents for Reference

- **EPIC-REVIEW.yaml**: Single source of truth for MVP blockers and next phase actions
- **FUTURE-ROADMAP.yaml**: Complete catalog of post-MVP enhancements (24 suggestions, 10 future stories)
- **CHECKPOINT.md**: Updated to mark aggregation complete, resume from interactive phase

---

## Quality Gate Decision

**GATE STATUS: FAILED - BLOCKED FOR ELABORATION**

### Fail Criteria Met

✓ Critical test mandate not defined (CRITICAL-001)
✓ Cannot verify core journey testable (CRITICAL-002, CRITICAL-003, CRITICAL-004)
✓ 3+ perspectives with open concerns (Engineering, Product, UX)

### Pass Criteria Not Met

✗ QA verdict READY (currently BLOCKED)
✗ All stories with defined test strategy (currently missing)
✗ Epic-level concerns resolved (13 blockers remain)

---

## Test Mandate Enforcement - Action Items

The user's critical requirement has been elevated to top priority. Create specific tasks:

### Task Template: Add Test Strategy to [STORY]

**Story**: INST-[ID]: [Title]
**Action**: Add to acceptance criteria:
```
Testing:
- Unit tests: <path/to/test/file.test.ts>
- Integration tests: <path/to/integration/test.test.ts>
- E2E tests: <path/to/feature/file.feature>
- Steps: <path/to/steps/file.steps.ts>
```

### Test Coverage Checklist

Each story must address:
- [ ] Unit test location defined and referenced
- [ ] Integration test location defined and referenced
- [ ] E2E feature file path defined (should exist in `apps/web/playwright/features/`)
- [ ] Step definitions path defined
- [ ] Test data setup documented
- [ ] Success criteria for tests defined

---

## Post-MVP Opportunities

### High-Value Enhancements (6)

1. Multipart upload for >100MB files (Engineering - P1)
2. Retry with exponential backoff (Engineering - P1)
3. S3 lifecycle policies for cleanup (Platform - P1)
4. Edit operation audit logging (Security - P1)
5. Presigned URL refresh logic (Engineering - P1)
6. File drag-to-reorder (UX - P1)

See FUTURE-ROADMAP.yaml for complete 24-item enhancement roadmap.

---

## Critical Success Factors for Next Phase

1. **Test strategy clarity**: Every story must have explicit, verifiable test requirements
2. **Cucumber adoption**: Feature files become executable specification and acceptance tests
3. **Engineering sequencing**: INST-1003/1004 → INST-1002 → INST-1005 → INST-1008 → Edit stories
4. **Product/UX alignment**: Edit form, file management, and error recovery UX locked down
5. **QA sign-off**: Before any code is written, tests must be reviewable

---

## Aggregation Phase Complete

**Duration**: ~15 minutes
**Timestamp**: 2026-02-05 21:30 UTC
**Specialists Reviewed**: 6/6 perspectives
**Artifacts Generated**: 9 files
**Blockers Identified**: 13 (4 critical, 9 high)
**Missing Stories**: 4
**Next Phase**: Elaboration (with test strategy focus)

---

**Document**: AGGREGATION-COMPLETE.md
**Created**: 2026-02-05 21:30 UTC
**Status**: Ready for Leadership Review
