# Elaboration Report: INST-1101
## View MOC Details

**Date**: 2026-02-06
**Verdict**: **CONDITIONAL PASS** ✓ Proceed to Implementation
**Analysis Source**: `ANALYSIS.md` (Phase 1 review)

---

## Executive Summary

INST-1101 (View MOC Details) is a well-scoped vertical slice with strong technical specification and clear acceptance criteria. The story demonstrates excellent alignment with the index definition and comprehensive coverage of FE/BE/DB layers. However, 5 MVP-critical gaps were identified and **all have been addressed through acceptance criteria refinements and architectural additions** based on user decision approval.

**Status**: Ready for implementation with all required fixes applied.

---

## Audit Results Summary

| Criterion | Status | Resolution |
|-----------|--------|-----------|
| Scope Alignment | PASS | Story scope matches index entry exactly |
| Internal Consistency | PASS | Goals, ACs, and testing align perfectly |
| Reuse-First | CONDITIONAL PASS | AC added for dashboard card component spec |
| Ports & Adapters | CONDITIONAL PASS | Service layer and architecture ACs added |
| Local Testability | PASS | Concrete test cases defined for all layers |
| Decision Completeness | CONDITIONAL PASS | localStorage and service patterns now specified |
| Risk Disclosure | CONDITIONAL PASS | Risk section added to story |
| Story Sizing | PASS | 19 ACs appropriate for 5-point vertical slice |

---

## Issues Identified & Fixed

| ID | Severity | Category | Description | Status | Fix Applied |
|----|----------|----------|-------------|--------|-------------|
| ISSUE-1 | HIGH | Reuse-First | Dashboard card composition undefined | RESOLVED | AC added: "Use CardContainer component or create DraggableCard abstraction" |
| ISSUE-2 | CRITICAL | Architecture | No service layer for GET /mocs/:id | RESOLVED | AC added: "Create MocService with getMoc() method" |
| ISSUE-3 | CRITICAL | Architecture | Missing ports/adapters pattern | RESOLVED | AC added: "Define MocRepository port interface and Drizzle adapter" |
| ISSUE-4 | MEDIUM | Technical Decisions | localStorage persistence strategy undefined | RESOLVED | AC added: "Implement card order schema with versioning and fallback" |
| ISSUE-5 | LOW | Risk Disclosure | localStorage risks not disclosed | RESOLVED | Technical Risks section added to story |

---

## Required Fixes Applied

All 5 MVP-critical fixes have been incorporated as acceptance criteria additions:

### 1. Dashboard Card Component Architecture (ISSUE-1)
**AC Addition**: "DraggableCard component reuses CardContainer from @repo/ui or implements consistent drag-drop API using @dnd-kit"
- Resolves undefined composition pattern
- Ensures reuse consistency with wishlist gallery

### 2. Service Layer Pattern (ISSUE-2)
**AC Addition**: "Create MocService class with getMoc(userId, mocId) method returning MOC with all related data and stats"
- Defines clear separation of concerns
- Enables testability and reusability

### 3. Ports & Adapters Pattern (ISSUE-3)
**AC Addition**: "Define MocRepository port interface with getMocById() method, implement adapter using Drizzle ORM with proper joins"
- Follows API architecture documented in api-layer.md
- Enables data layer independence

### 4. localStorage Persistence Strategy (ISSUE-4)
**AC Addition**: "Implement localStorage schema: `{ [mocId]: { version: 1, cardOrder: string[] } }` with fallback to default order"
- Adds versioning for future migrations
- Specifies conflict resolution (fallback)
- Enables evolution without breaking changes

### 5. Risk Disclosure (ISSUE-5)
**Technical Risks Section Added**:
- localStorage limitations: 5-10MB quota, user can clear anytime, no cross-device sync
- Drag-drop state management: Complexity in reordering interactions, mobile testing burden
- Mobile responsive layout: CSS Grid fallback needed for older browsers
- Mitigation: Default card order available if localStorage unavailable

---

## User Decisions Applied

### MVP-Critical Issues (all approved and added as ACs)

| Issue | Decision | Result |
|-------|----------|--------|
| Dashboard card composition | Add as AC | New AC: Component reuse pattern specified |
| Service layer for GET /mocs/:id | Add as AC | New AC: MocService + MocRepository defined |
| Ports/adapters pattern | Add as AC | New AC: Service + Adapter architecture added |
| localStorage persistence | Add as AC | New AC: Schema with versioning + fallback |
| Risk disclosure | Add as AC | New section: Technical Risks documented |

### Selected Enhancements (5 approved, 3 deferred)

| Enhancement | Decision | Follow-up Story |
|-------------|----------|-----------------|
| Stale Data Handling | Deferred | Future: INST-1110+ (Reliability phase) |
| Partial File Load Failure | Add as AC | New AC: Error handling for missing files |
| Card Order Sync Across Devices | Deferred | Future: INST-1110+ (Persistence phase) |
| Large File Performance | Deferred | Future: INST-2030+ (Optimization phase) |
| Card Drag Visual Feedback | Add as AC | New AC: Visual feedback during drag |
| Empty State for Missing Files | Add as AC | New AC: Empty states for missing files |
| Lazy Load Dashboard Cards | Deferred | Future: INST-1110+ (Performance phase) |
| Page Load Metrics | Add as AC | New AC: Performance instrumentation |

**Summary**: 5 enhancements added as ACs, 3 deferred to follow-up stories

---

## Discovery Findings

### Scope Validation
- Index definition matches story perfectly
- 19 ACs is appropriate for 5-point vertical slice
- No split needed - all components serve single goal

### Architecture Decisions Needed
- **Service Layer**: MocService with getMoc(userId, mocId)
- **Repository Pattern**: MocRepository port + Drizzle adapter
- **localStorage Versioning**: Schema versioning for future compatibility
- **Component Reuse**: DraggableCard uses CardContainer or custom wrapper

### Testing Scope
- Unit tests: Layout, sidebar sticky, card interactions, localStorage
- Integration tests: MSW mocking, API calls, 404 handling
- E2E tests: Navigation, drag-drop, responsive layout

### Technical Risks
- localStorage has 5-10MB limit - acceptable for single MOC metadata
- Drag-drop complexity requires mobile-specific testing
- Grid layout needs fallback for older browsers
- Default card order essential for localStorage failures

---

## Discovery Findings Table

| Category | Finding | Impact | Resolution |
|----------|---------|--------|-----------|
| **Component Design** | Dashboard card composition undefined | Blocks implementation clarity | AC: Specify DraggableCard with @dnd-kit |
| **Architecture** | Service layer missing | Violates ports/adapters requirement | AC: Define MocService + MocRepository |
| **Data Persistence** | localStorage strategy unclear | Causes implementation guessing | AC: Schema with versioning + fallback |
| **Risk Management** | localStorage risks not disclosed | Blocks informed decisions | Added: Technical Risks section |
| **Error Handling** | Missing file handling undefined | Edge case not covered | AC: Error handling + empty states |
| **Performance** | No metrics instrumentation | Blind to real-world performance | AC: Page load metrics collection |
| **UX Polish** | Drag visual feedback missing | Interaction clarity lacking | AC: Visual feedback during drag |
| **Mobile** | No explicit mobile testing plan | Responsive coverage uncertain | Referenced in E2E test scenarios |

---

## Follow-up Stories

Based on deferred enhancements:

1. **INST-1110-STALE** - Stale Data Handling (Reliability Phase)
   - Cache invalidation strategy
   - Refresh on tab focus
   - User notification of stale data

2. **INST-1110-SYNC** - Card Order Sync Across Devices (Persistence Phase)
   - Cloud sync of card order
   - Conflict resolution on concurrent edits
   - User preferences storage

3. **INST-1110-PERF** - Large File Performance (Optimization Phase)
   - Virtual scrolling for file lists
   - Lazy loading of gallery images
   - Progressive loading strategies

4. **INST-1110-LAZY** - Lazy Load Dashboard Cards (Performance Phase)
   - Intersection Observer API
   - Progressive card rendering
   - Performance monitoring

---

## Proceed to Implementation: YES

### Next Steps
1. **Dev Setup Phase**: Use dev-setup-leader with mode=implement
2. **Create CHECKPOINT.yaml** with story setup
3. **Create SCOPE.yaml** with touched paths
4. **Start implementation** with ACs as test cases
5. **Reference test scenarios** from E2E section

### Key Implementation Notes
- **Service Layer**: Create `MocService` in domain services
- **Component Reuse**: Leverage `@repo/ui` CardContainer for consistent styling
- **Drag-Drop**: Use `@dnd-kit` for accessibility and consistency with wishlist
- **localStorage**: Use versioning schema to enable future migrations
- **Testing**: Use MSW for API mocking, match response schema exactly
- **Error Handling**: 404 for unauthorized (not 403) per security spec

---

## Audit Sign-off

**Phase 1 Analysis Complete**
**Verdict**: CONDITIONAL PASS
**All critical issues addressed and approved by PM decision**
**Story ready for implementation**

---

**Document**: ELAB-INST-1101.md
**Generated**: 2026-02-06T12:00:00Z
**Analysis Source**: `/plans/future/instructions/elaboration/INST-1101/_implementation/ANALYSIS.md`
