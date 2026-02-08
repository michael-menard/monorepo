# Phase 1 Analysis Report: INST-1101

**Story:** View MOC Details
**Analyst:** elab-analyst worker agent
**Date:** 2026-02-06
**Status:** CONDITIONAL PASS

---

## Executive Summary

INST-1101 defines a comprehensive MOC detail page with sidebar, draggable dashboard cards, and full data display. The story demonstrates strong technical specification and alignment with index scope. However, several MVP-critical gaps were identified related to architectural decisions, reuse patterns, and testing scope.

**Key Findings:**
- Strong scope alignment with stories.index.md definition
- Comprehensive acceptance criteria covering FE/BE/DB layers
- Missing explicit architecture decisions (service layer, ports/adapters)
- Insufficient reuse-first specification for dashboard cards
- Risk disclosure needs enhancement (localStorage, drag-drop state management)
- Story sizing is appropriate (5 points, 19 ACs)

---

## Audit Results

| Criterion | Status | Evidence | Issues |
|-----------|--------|----------|--------|
| **1. Scope Alignment** | PASS | Story scope matches index entry exactly: detail page at `/mocs/:mocId`, sidebar, main area, dashboard cards, mobile responsive | None |
| **2. Internal Consistency** | PASS | Goals (view MOC details), ACs (19 items), and testing all align. Non-goals correctly exclude download/edit/delete | None |
| **3. Reuse-First** | CONDITIONAL | References @dnd-kit for drag-drop, existing detail pages for patterns, but lacks specifics on dashboard card composition | **ISSUE-1**: Dashboard card component architecture undefined |
| **4. Ports & Adapters** | FAIL | No mention of service layer for `GET /mocs/:id`. Route handler approach not specified | **ISSUE-2**: Missing service layer specification, **ISSUE-3**: Missing ports/adapters pattern |
| **5. Local Testability** | PASS | Concrete test cases defined for unit, integration, and E2E with MSW and Playwright/Cucumber | None |
| **6. Decision Completeness** | CONDITIONAL | Missing: service layer pattern, localStorage state management, drag-drop library choice (mentions @dnd-kit but not confirmed) | **ISSUE-4**: localStorage persistence strategy undefined |
| **7. Risk Disclosure** | CONDITIONAL | Mentions drag-drop and localStorage but doesn't call out risks (state sync, conflicts, migration) | **ISSUE-5**: localStorage risk disclosure missing |
| **8. Story Sizing** | PASS | 19 ACs, 2 endpoints (GET /mocs/:id), primarily FE with some BE work, 4 components, 3 test scenarios. Appropriate for 5 points | None |

---

## Issues Found (MVP-Critical Only)

| ID | Severity | Category | Description | Blocking? |
|----|----------|----------|-------------|-----------|
| ISSUE-1 | HIGH | Reuse-First | Dashboard card composition undefined. Should reuse CardContainer from app-component-library or create new abstraction? | YES |
| ISSUE-2 | CRITICAL | Architecture | No service layer specified for `GET /mocs/:id` endpoint. Violates ports & adapters requirement from api-layer.md | YES |
| ISSUE-3 | CRITICAL | Architecture | Missing ports/adapters pattern specification. Need MocRepository interface and implementation | YES |
| ISSUE-4 | MEDIUM | Technical Decisions | localStorage card order persistence strategy undefined. No schema, versioning, or conflict resolution specified | YES |
| ISSUE-5 | LOW | Risk Disclosure | localStorage risks not disclosed: what if user clears data? Migration path for schema changes? State sync issues? | NO (document only) |

---

## Split Recommendation

**Recommendation:** DO NOT SPLIT

**Rationale:**
- 19 ACs is within acceptable range (threshold: 20+)
- Single endpoint (GET /mocs/:id) with related data joins
- Dashboard cards are cohesive feature, not independent
- All components serve single page goal
- Testing scenarios are integrated (page load, card interaction, responsive)

Story is appropriately sized for single vertical slice. Issues identified are **definitional gaps**, not scope bloat.

---

## Preliminary Verdict

**CONDITIONAL PASS** - Story can proceed to elaboration with required fixes.

### Required Actions Before Implementation:

1. **ISSUE-2 & ISSUE-3**: Define service layer architecture
   - Create `MocService` with `getMoc(userId, mocId)` method
   - Define `MocRepository` port interface
   - Specify adapter implementation with Drizzle
   - Update AC-12 to reference service layer

2. **ISSUE-1**: Specify dashboard card composition
   - Identify reuse opportunity from existing detail pages
   - Define DraggableCard component API
   - Specify if using Card from @repo/ui or custom component
   - Update AC-7 with component spec

3. **ISSUE-4**: Define localStorage persistence strategy
   - Schema: `{ [mocId]: { cardOrder: string[] } }`
   - Versioning: Include schema version in storage
   - Fallback: Use default order if localStorage unavailable
   - Update AC-8 with technical spec

4. **ISSUE-5**: Add risk disclosure section
   - localStorage limitations (5-10MB, user can clear, no sync)
   - Drag-drop state management complexity
   - Mobile responsive layout testing burden
   - Update story with "Technical Risks" section

### MVP-Critical Gaps Summary

**Architecture (Critical):**
- Service layer pattern missing
- Ports/adapters specification absent
- Backend architectural decisions undefined

**Component Design (High):**
- Dashboard card abstraction not specified
- Reuse opportunities not evaluated

**Technical Decisions (Medium):**
- localStorage strategy incomplete
- No fallback/migration path defined

---

## Recommended Next Steps

1. **Immediate**: PM or Tech Lead addresses ISSUE-2, ISSUE-3 (architecture)
2. **Before Elaboration**: Address ISSUE-1 (component design)
3. **During Elaboration**: Flesh out ISSUE-4, ISSUE-5 (risks, persistence)
4. **Code Review**: Verify ports/adapters implementation matches api-layer.md

Story has strong foundation but needs architectural clarification before implementation begins.
