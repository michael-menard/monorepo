# Elaboration Analysis - INST-1108

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. Edit MOC metadata only (title, description, theme, tags). Files, thumbnail, slug, visibility, status explicitly excluded. |
| 2 | Internal Consistency | PASS | — | Goals align with scope. Non-goals clearly exclude navigation guards, optimistic updates, edit history, bulk edit, file management, concurrent edit detection. ACs match scope precisely. |
| 3 | Reuse-First | PASS | — | Excellent reuse strategy: MocForm component (100% reuse from INST-1102), RTK Query hooks (`useUpdateMocMutation` already exists), validation schemas (reuse from CreateMocInputSchema), localStorage form recovery pattern (from CreateMocPage). Only new code: PATCH backend route, EditMocPage container. |
| 4 | Ports & Adapters | FAIL | Critical | **DEFECT**: Story plans PATCH /mocs/:id endpoint without service layer. Backend implementation section (lines 389-425) shows business logic in route handler (authorization check, partial update logic, error handling). Per `docs/architecture/api-layer.md`, MUST create service file in `apps/api/lego-api/domains/mocs/application/services.ts`. Current routes.ts has no service layer - only thin adapters to mocService for existing endpoints. **REQUIRED FIX**: Extract update logic to `mocService.updateMoc()` method. Route handler must call service, not implement business logic directly. |
| 5 | Local Testability | PASS | — | Backend: `.http` test files planned for AC-35 to AC-42 (8 tests). Frontend: Unit tests (AC-43 to AC-52, 10 tests), integration tests (AC-53 to AC-56, 4 tests), E2E with Playwright (AC-57 to AC-63, 6 scenarios). Tests are concrete and executable. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. "updatedAt Timestamp" decision documented (Option A: DB trigger, Option B: manual set). INST-1101 dependency acknowledged with mitigation (test direct navigation). All design decisions documented in Architecture Notes section. |
| 7 | Risk Disclosure | CONDITIONAL | Medium | Risks partially disclosed. Story mentions 5 MVP-critical risks in DEV-FEASIBILITY.md (PATCH endpoint missing, INST-1101 dependency, MocForm compatibility, validation schema alignment, test data setup) with mitigations. **GAP**: No explicit disclosure of concurrent edit risk (last write wins) in main story - only mentioned in Non-Goals. **SUGGESTION**: Add "Risk: Concurrent Edits" section to story with explicit "last write wins" behavior and future mitigation path. |
| 8 | Story Sizing | PASS | — | Story is appropriately sized for 3 points (8-10 hours). Indicators: 5 ACs for backend, 15 for frontend, 3 for integration, 6 for E2E testing = 74 total ACs (within guideline of ≤100). Backend work: 2-3 hours (1 endpoint, reuses validation). Frontend work: 3-4 hours (1 page, reuses MocForm). Testing: 2-3 hours (reuses test patterns from INST-1102). No split indicators present (not bundling multiple features, touches 2 packages within guideline). |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Backend violates Ports & Adapters architecture | Critical | Extract business logic to `mocService.updateMoc()` method in `apps/api/lego-api/domains/mocs/application/services.ts`. Route handler must be thin adapter (lines 389-425 in story show service logic in route). Service should: (1) Accept userId, mocId, UpdateMocInput, (2) Call mocRepo.findById() for authorization check, (3) Return Result<Moc, 'NOT_FOUND' \| 'FORBIDDEN' \| 'VALIDATION_ERROR'>, (4) Call mocRepo.update() with partial update. Route wires service and maps errors to HTTP status codes. |
| 2 | Concurrent edit risk not explicitly disclosed in main story | Medium | Add "Risk: Concurrent Edits" section after "Dependencies" (line 711). Document: "MVP uses last-write-wins semantics. No optimistic locking or conflict detection. If two users edit same MOC simultaneously, last save overwrites previous changes. Future enhancement: Add `version` field + optimistic locking (compare-and-swap)." |
| 3 | UpdateMocInputSchema definition ambiguous | Low | Story mentions "UpdateMocInputSchema" (lines 104-110) but doesn't specify if it's a new schema or reuses CreateMocInputSchema. **CLARIFY**: Backend Patterns section (line 276) says "Adaptation: All fields optional" but implementation details don't show how to derive from CreateMocInputSchema. **FIX**: Add to "Phase 1: Backend Implementation" checklist: "Define UpdateMocInputSchema = CreateMocInputSchema.partial() in @repo/api-client/schemas/instructions". |

## Split Recommendation

Not applicable - story is appropriately sized for 3 points.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Rationale**: Story is well-structured with excellent reuse strategy (95% frontend, 70% backend) and comprehensive test plan. However, backend implementation violates Ports & Adapters architecture (Critical severity) by planning business logic in route handler instead of service layer. This MUST be fixed before implementation to maintain codebase consistency and testability.

**Action Required**: Fix Issue #1 (service layer extraction) before moving to "Ready to Work". Issues #2 and #3 are lower severity and can be addressed during implementation.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Service layer not planned for PATCH endpoint | Core architecture compliance | Extract update business logic to `mocService.updateMoc()` method per `docs/architecture/api-layer.md`. Service should handle authorization check (userId matches moc.userId), partial update logic, and error handling. Route handler calls service and maps Result to HTTP status codes. This is MVP-critical because it blocks code review and merge - architecture violations cannot be accepted into main branch. |

---

## Worker Token Summary

- Input: ~66K tokens (files read: INST-1108.md [901 lines], stories.index.md [1008 lines], api-layer.md [1081 lines], elab-analyst.agent.md [282 lines], instructions-api.ts [partial], mocs/routes.ts [partial], MocForm/index.tsx [partial])
- Output: ~3K tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
