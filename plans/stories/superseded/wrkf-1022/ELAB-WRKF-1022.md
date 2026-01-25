# ELAB-WRKF-1022: Node Middleware Hooks

**Elaboration Date:** 2026-01-24
**QA Agent:** Claude Opus 4.5
**Story:** wrkf-1022
**Elaboration Cycle:** 3 (Fresh elaboration after PM fixes applied)

---

## Verdict: SPLIT REQUIRED

The story MUST be split before implementation can proceed.

**Reason:** After applying 9 new acceptance criteria from QA discovery (interactive discussion), the total AC count reaches **30**, significantly exceeding the "too large" threshold of 8 ACs. The story contains two distinct feature sets that can be independently tested and delivered.

**Previous Elaboration Status:** The PM applied all required fixes from the previous CONDITIONAL PASS / FAIL cycle:
- AC-15 through AC-21 have been added
- Non-Goals async/sync clarification applied
- Test Plan updated with new test cases
- File Touch List updated with middleware subdirectory

This elaboration cycle conducted NEW discovery analysis which identified additional gaps and enhancements. User opted to add 9 new ACs, triggering the split requirement.

---

## Proposed Split Structure

### WRKF-1022-A: Core Middleware Infrastructure

**Scope:** Foundational middleware types, hooks, composition, and integration with node factory.

**Acceptance Criteria Allocation (24 ACs):**

| AC | Description | Source |
|----|-------------|--------|
| AC-1 | NodeMiddleware Zod schema/type | Original |
| AC-2 | beforeNode hook signature | Original |
| AC-3 | afterNode hook signature | Original |
| AC-4 | onError hook signature | Original |
| AC-5 | Node factory accepts middleware array | Original |
| AC-6 | Middleware execution ordering | Original |
| AC-7 | Middleware is optional | Original |
| AC-8 | beforeNode state transformation | Original |
| AC-9 | beforeNode throw skips node | Original |
| AC-10 | afterNode result merging | Original |
| AC-11 | onError replacement behavior | Original |
| AC-12 | Export surface | Original |
| AC-13 | Unit test coverage 80%+ | Original |
| AC-14 | Integration test | Original |
| AC-15 | Context sharing (ctx object) | QA Finding G2 |
| AC-16 | Conditional execution (shouldRun) | QA Finding G3 |
| AC-17 | Type safety (NodeConfigSchema) | QA Finding G4 |
| AC-18 | Validation (composeMiddleware) | QA Finding G5 |
| AC-19 | Observability (logging) | QA Finding G6 |
| AC-20 | State protection (deep clone) | QA Finding G7 |
| AC-22 | shouldRun error handling | Discovery G3 |
| AC-23 | shouldRun evaluation timing | Discovery G5 |
| AC-24 | Middleware execution during retry | Discovery G6 |
| AC-25 | Async shouldRun support | Discovery E4 |

**Dependency:** wrkf-1020

### WRKF-1022-B: Middleware Extensions & Utilities

**Scope:** Built-in middleware, convenience utilities, and testing helpers.

**Acceptance Criteria Allocation (6 ACs):**

| AC | Description | Source |
|----|-------------|--------|
| AC-B1 | Built-in loggingMiddleware and validationMiddleware | Original AC-21 |
| AC-B2 | filterMiddleware utility | Discovery G1 |
| AC-B3 | Middleware naming (unique/auto-generated) | Discovery G2 |
| AC-B4 | skipClone configuration option | Discovery G4 |
| AC-B5 | Pattern factories (forNodes, whenFlag) | Discovery E1 |
| AC-B6 | Testing utilities (createMockMiddleware) | Discovery E2 |

**Dependency:** WRKF-1022-A

### Recommended Dependency Order

```
wrkf-1020 (Node Runner Infrastructure)
    |
    v
wrkf-1022-A (Core Middleware Infrastructure)
    |
    v
wrkf-1022-B (Middleware Extensions & Utilities)
```

---

## Audit Checklist Results

### 1) Scope Alignment

| Check | Result | Notes |
|-------|--------|-------|
| Scope matches stories.index.md | PARTIAL | Index mentions hooks + composition; story adds built-in middleware |
| No extra endpoints | PASS | Pure TypeScript library, no endpoints |
| No extra infrastructure | PASS | Only modifies `@repo/orchestrator` |

**Issues:**
- **[Medium]** Story scope expanded beyond index (built-in middleware). Justified by QA elaboration of parent story.

### 2) Internal Consistency

| Check | Result | Notes |
|-------|--------|-------|
| Goals vs Non-Goals | PASS | No contradictions |
| Decisions vs Non-Goals | PASS | Async middleware clarified |
| AC matches Scope | PASS | All ACs relate to middleware infrastructure |
| Test Plan matches AC | PASS | All ACs have test coverage |

**Issues:** None

### 3) Reuse-First Enforcement

| Check | Result | Notes |
|-------|--------|-------|
| Shared packages reused | PASS | zod, @repo/logger, @repo/orchestrator |
| No one-off utilities | PASS | All utilities are shared exports |
| New shared code justified | PASS | Middleware is a reusable pattern |

**Issues:**
- **[High]** AC-17 references `NodeConfigSchema` from wrkf-1020. wrkf-1020 is `status: backlog` and must be implemented first.

### 4) Ports & Adapters Compliance

| Check | Result | Notes |
|-------|--------|-------|
| Core logic transport-agnostic | PASS | Middleware is pure TypeScript |
| Adapters explicitly identified | N/A | No adapters in this story |
| Platform-specific isolation | PASS | No platform-specific code |

**Issues:** None

### 5) Local Testability

| Check | Result | Notes |
|-------|--------|-------|
| Backend tests defined | PASS | Unit tests with 80% coverage requirement |
| .http tests defined | N/A | No API endpoints |
| Playwright tests defined | N/A | No UI |
| Tests are executable | PASS | `pnpm test --filter @repo/orchestrator` |

**Issues:** None

### 6) Decision Completeness

| Check | Result | Notes |
|-------|--------|-------|
| No blocking TBDs | PASS | Open Questions: "None" |
| PM Decisions Log complete | PASS | 5 decisions documented |

**Issues:** None

### 7) Risk Disclosure

| Check | Result | Notes |
|-------|--------|-------|
| Auth risks | N/A | No auth involved |
| DB risks | N/A | No database involved |
| Infrastructure risks | PASS | None identified |
| Hidden dependencies | PASS | wrkf-1020 dependency explicit |

**Issues:** None

### 8) Story Sizing

| Indicator | Triggered | Notes |
|-----------|-----------|-------|
| >8 Acceptance Criteria | YES | 21 original + 9 discovery = 30 ACs |
| >5 endpoints | NO | 0 endpoints |
| Frontend AND backend | NO | Backend only |
| Multiple independent features | YES | Core + built-ins + utilities |
| >3 distinct test scenarios | YES | 13+ happy path tests |
| >2 packages touched | NO | 1 package |

**Result:** 3 indicators triggered. **SPLIT REQUIRED.**

---

## Issues Summary

| # | Severity | Issue | Required Fix |
|---|----------|-------|--------------|
| 1 | Critical | Story too large (30 ACs after discovery) | Split into wrkf-1022-A and wrkf-1022-B |
| 2 | High | wrkf-1020 dependency not implemented | wrkf-1020 must be completed before wrkf-1022-A |
| 3 | Medium | Scope expanded beyond index | Update stories.index.md after split |

---

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| G1 | No middleware removal/unregistration mechanism | **Add as AC** | filterMiddleware utility (wrkf-1022-B) |
| G2 | Middleware naming not unique/auto-generated | **Add as AC** | Unique or auto-generated names (wrkf-1022-B) |
| G3 | shouldRun error handling not explicit in AC | **Add as AC** | Exceptions caught, logged, middleware skipped (wrkf-1022-A) |
| G4 | Deep clone performance impact | **Add as AC** | skipClone configuration option (wrkf-1022-B) |
| G5 | shouldRun evaluation timing unclear | **Add as AC** | Receives state after previous middleware (wrkf-1022-A) |
| G6 | Middleware behavior during retry unspecified | **Add as AC** | Executes on each retry attempt (wrkf-1022-A) |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| E1 | Middleware factory with common patterns | **Add as AC** | forNodes, whenFlag factories (wrkf-1022-B) |
| E2 | Middleware testing utilities | **Add as AC** | createMockMiddleware (wrkf-1022-B) |
| E3 | Advanced composition operators | **Out-of-scope** | Array composition sufficient for V1 |
| E4 | Async shouldRun predicate | **Add as AC** | Support Promise<boolean> (wrkf-1022-A) |

### Follow-up Stories Suggested

- [x] **wrkf-1022-A: Core Middleware Infrastructure** - Split from wrkf-1022
- [x] **wrkf-1022-B: Middleware Extensions & Utilities** - Split from wrkf-1022
- [ ] **wrkf-1023: Middleware Metrics Integration** - Already documented in previous QA notes

### Items Marked Out-of-Scope

- **E3 (Advanced composition operators):** Array composition is sufficient for V1; pipe/parallel operators are over-engineering for initial release.
- **E1 (Debug mode logging):** From previous elaboration - handled by logging package
- **E2 (Timing metrics):** From previous elaboration - belongs in wrkf-1021

---

## What Is Acceptable As-Is

The following aspects of the story are well-defined and require no changes:

1. **Core middleware types** (AC-1 through AC-4) - Well-specified hook signatures
2. **Middleware ordering** (AC-6) - Clear first-to-last / last-to-first semantics
3. **Export surface** (AC-12) - Complete export list
4. **Test coverage requirement** (AC-13, AC-14) - 80% coverage with integration tests
5. **Architecture notes** - Clear package structure and interface definitions
6. **Reuse plan** - Properly references existing packages
7. **PM Decisions Log** - Key design choices documented

---

## Statement: May WRKF-1022 Proceed to Implementation?

**NO.** WRKF-1022 may NOT proceed to implementation.

**Blockers:**
1. **Story must be split** into wrkf-1022-A (Core) and wrkf-1022-B (Extensions)
2. **wrkf-1020 must be implemented first** - The story depends on `NodeConfigSchema` and node factory integration

**Required Actions:**
1. PM must create split stories in stories.index.md
2. PM must generate wrkf-1022-A and wrkf-1022-B via `/pm-generate-story`
3. Original wrkf-1022 must be marked `status: superseded`
4. wrkf-1020 must be completed before wrkf-1022-A can be implemented

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: wrkf-1022.md | input | 17,355 | ~4,339 |
| Read: wrkf.stories.index.md | input | 8,424 | ~2,106 |
| Read: wrkf.plan.exec.md | input | 5,312 | ~1,328 |
| Read: wrkf.plan.meta.md | input | 2,904 | ~726 |
| Read: qa.agent.md | input | 2,488 | ~622 |
| Read: wrkf-1020.md | input | 18,712 | ~4,678 |
| Read: orchestrator package files (5 files) | input | 8,200 | ~2,050 |
| Read: ELAB-WRKF-1022.md (previous) | input | 6,810 | ~1,703 |
| Interactive discussion (10 questions) | input/output | — | ~2,000 |
| Write: ELAB-WRKF-1022.md | output | ~9,500 | ~2,375 |
| **Total Input** | — | ~70,205 | **~19,552** |
| **Total Output** | — | ~9,500 | **~2,375** |

---

*QA Elaboration completed 2026-01-24*
