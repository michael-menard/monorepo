# Autonomous Decision Summary - REPA-019

**Generated:** 2026-02-10T22:00:00Z
**Mode:** autonomous
**Story ID:** REPA-019
**Final Verdict:** CONDITIONAL PASS

---

## Executive Summary

The analysis found **2 MVP-critical gaps** that block the core authentication error handling journey, **3 medium issues** requiring clarification, and **13 non-blocking opportunities** for future enhancement.

**Actions Taken:**
- ✅ Added 2 new Acceptance Criteria (AC-11, AC-12) to address MVP-critical gaps
- ✅ Updated story description to fix error code count mismatch (27+ → 21)
- ✅ Updated 4 ACs to reflect accurate error code listings
- ✅ Added import verification step to implementation checklist
- ✅ Documented 13 KB write requests for non-blocking findings
- ✅ Resolved 3 audit issues (Internal Consistency, Decision Completeness, Reuse-First)

---

## MVP-Critical Gaps (Added as ACs)

### Gap 1: Error Code Accuracy → AC-11
**Issue:** Story claimed "27+ error codes" but actual count is 21.

**Impact:** Developer may create wrong test cases or miss edge cases during migration.

**Resolution:** Added AC-11 requiring verification of all 21 error codes with explicit list and removal of INVALID_TOKEN reference (which doesn't exist in current code).

**Updated Sections:**
- AC-1: Updated to "all 21 error codes"
- AC-4: Replaced generic "27+" with complete list of 21 error codes
- Test Plan: Updated test categories to reflect 21 error codes
- Story description: Updated from "27+ error code mappings" to "21 error code mappings" with complete list

### Gap 2: API Reset Coordination → AC-12
**Issue:** authFailureHandler dynamically imports API slices for cache clearing. Story doesn't specify how this works after refactor.

**Impact:** 401 handling may break after migration if API reset mechanism not clarified.

**Resolution:** Added AC-12 requiring clear documentation of chosen approach:
- Option A: Keep dynamic import pattern
- Option B: Use callback injection for resetApiState
- Option C: Document as consumer responsibility

**Core Journey Protected:** User makes authenticated request → receives 401 → authFailureHandler clears auth state, resets API cache, redirects to login with return URL.

---

## Medium Issues (Resolved via Implementation Notes)

### Issue 1: Missing Import Verification
**Issue:** AC-6 states "No imports from old paths" but doesn't specify how to verify.

**Resolution:** Added explicit verification step to Phase 4 implementation checklist:
```bash
grep -r "services/api/errorMapping\|services/api/authFailureHandler" apps/web/main-app/src/
```
Ensure zero results after deletion.

### Issue 2: Line Count Discrepancy
**Issue:** Story seed says "~200 lines" and "~150 lines" but actual is 494 and 138.

**Status:** No action required - story front matter already correctly lists "494 lines" and "138 lines". Seed estimates are approximate by design.

### Issue 3: Auth Page Detection Coordination
**Issue:** Story mentions REPA-013 coordination but doesn't clarify if this is blocking.

**Status:** Already documented in Architecture Notes section. AUTH_PAGES constant stays in @repo/api-client/errors/auth-failure for now, may move to @repo/auth-utils in future (out of scope for REPA-019).

---

## Non-Blocking Findings (KB Write Requests)

### Edge Cases (5 findings)

1. **Legacy Error Format Support**
   - Current code supports legacy 'type' field instead of 'code'
   - Recommendation: Review API logs, remove if unused
   - Tags: edge-case, future-work, legacy-support

2. **Frontend/Backend Schema Sync**
   - Frontend may have 21 codes while backend has different set
   - Recommendation: Generate frontend schema from backend OpenAPI
   - Tags: edge-case, schema-sync, future-work

3. **Correlation ID Dual Sources**
   - Extracts from both headers (X-Correlation-Id) and body (correlationId)
   - Recommendation: Document canonical source or priority order
   - Tags: edge-case, future-work

4. **Auth Page List Consolidation**
   - AUTH_PAGES constant duplicated across modules
   - Recommendation: Coordinate with REPA-013 to consolidate in @repo/auth-utils
   - Tags: future-work, coordination, repa-013

5. **Sophisticated Retry Logic**
   - Current retry delays are hardcoded
   - Recommendation: Support Retry-After date parsing, exponential backoff, jitter
   - Tags: enhancement, future-work

### UX Polish Enhancements (6 findings)

1. **Shared Error UI Components** (HIGH IMPACT)
   - Create ErrorAlert, ErrorToast, ErrorBoundary in @repo/app-component-library
   - Eliminates ~100-200 lines per app
   - Depends on REPA-019 completion
   - Tags: ux-polish, enhancement, depends-repa-019

2. **Error Recovery Suggestions** (MEDIUM IMPACT)
   - Provide actionable steps instead of generic "try again"
   - Example: "Check your internet connection", "Verify file size is under 10MB"
   - Tags: ux-polish, enhancement

3. **Contextual Error Messages** (MEDIUM IMPACT)
   - Expand getContextualMessage() pattern to more error types
   - Use error details to enrich messages (e.g., "Title 'My MOC' already exists")
   - Tags: ux-polish, enhancement

4. **Auth Failure Handler Improvements** (MEDIUM IMPACT)
   - Show toast explaining redirect
   - Preserve form data/drafts before redirect
   - Support configurable redirect URL per app
   - Handle concurrent 401s gracefully (debounce)
   - Tags: ux-polish, enhancement, auth

5. **Error Retry UI with Countdown** (LOW IMPACT)
   - Show countdown timer and auto-retry button for retryable errors
   - Tags: ux-polish, enhancement

6. **Offline Error Detection** (MEDIUM IMPACT)
   - Distinguish offline (no connectivity) vs server errors
   - Use navigator.onLine + custom detection
   - Tags: ux-polish, enhancement, network

### Observability (1 finding)

1. **Error Telemetry and Analytics** (HIGH IMPACT)
   - Track error rates, correlation IDs, user impact
   - Critical for production debugging and API monitoring
   - Requires analytics service infrastructure
   - Tags: observability, monitoring, enhancement

### Developer Experience (1 finding)

1. **Error Code Documentation** (QUICK WIN)
   - Generate markdown docs from ERROR_MAPPINGS constant
   - Include in Storybook or developer portal
   - Useful for support teams and QA
   - Tags: documentation, enhancement

---

## Audit Resolutions

| Check | Status | Resolution |
|-------|--------|------------|
| Internal Consistency | ✅ RESOLVED | Added AC-11 to verify exact error code count (21) and remove INVALID_TOKEN reference |
| Decision Completeness | ✅ RESOLVED | Added AC-12 to clarify API slice reset coordination mechanism |
| Reuse-First | ✅ RESOLVED | Added import verification step to implementation checklist |
| Scope Alignment | ✅ PASS | No changes required |
| Ports & Adapters | ✅ PASS | No changes required |
| Local Testability | ✅ PASS | No changes required |
| Risk Disclosure | ✅ PASS | No changes required |
| Story Sizing | ✅ PASS | No changes required |

---

## High-Impact Future Opportunities

### Quick Wins (Low Effort, High Value)
1. **Error Code Documentation** - Generate from ERROR_MAPPINGS, useful for support/QA
2. **Auth Page Consolidation** - Coordinate with REPA-013 during implementation

### High-Impact Enhancements (Depend on REPA-019)
1. **Shared Error UI Components** - Eliminate ~100-200 lines per app, high code reuse
2. **Error Telemetry** - Critical for production observability, requires analytics infrastructure

---

## Files Modified

### Story File Updates
- `/plans/future/repackag-app/elaboration/REPA-019/REPA-019.md`
  - Added AC-11: Error code accuracy verification
  - Added AC-12: API slice reset coordination
  - Updated AC-1: Changed "27+" to "21" error codes
  - Updated AC-4: Complete list of 21 error codes, removed INVALID_TOKEN
  - Updated Test Plan: Accurate error code counts
  - Updated Current State: "21 error code mappings" with complete list
  - Updated Success Criteria: "All 21 error code mappings preserved exactly"
  - Updated Implementation Notes: Added import verification step

### New Files Created
- `/plans/future/repackag-app/elaboration/REPA-019/_implementation/DECISIONS.yaml`
- `/plans/future/repackag-app/elaboration/REPA-019/_implementation/AUTONOMOUS-DECISION-SUMMARY.md`

---

## Completion Metrics

| Metric | Count |
|--------|-------|
| ACs Added | 2 |
| Story Sections Updated | 6 |
| KB Entries Planned | 13 |
| Audit Issues Resolved | 3 |
| Audit Issues Flagged | 0 |

---

## Next Steps

### For Implementation Phase
1. Implement AC-11: Verify all 21 error codes exactly, remove INVALID_TOKEN references
2. Implement AC-12: Choose and document API slice reset coordination approach
3. Follow Phase 4 checklist: Run import verification grep command before completion
4. Review KB findings for potential future stories (especially high-impact opportunities)

### For Knowledge Base
13 KB write requests are documented in DECISIONS.yaml. These should be persisted to the Knowledge Base for:
- Future epic planning (high-impact enhancements)
- Quick wins during REPA-013 coordination (auth page consolidation)
- Post-REPA-019 follow-up stories (shared error UI components)

---

## Token Summary

**Worker Usage:**
- Input: ~39,000 tokens (ANALYSIS.md, FUTURE-OPPORTUNITIES.md, story file, agent instructions)
- Output: ~6,500 tokens (DECISIONS.yaml, AUTONOMOUS-DECISION-SUMMARY.md, story updates)
- Total: ~45,500 tokens

**Expected vs Actual:**
- Expected Input: ~2,000 tokens
- Actual Input: ~39,000 tokens (19.5x - due to comprehensive story file and analysis)
- Expected Output: ~1,500 tokens
- Actual Output: ~6,500 tokens (4.3x - due to detailed KB write requests and story updates)

---

**End of Autonomous Decision Summary**
