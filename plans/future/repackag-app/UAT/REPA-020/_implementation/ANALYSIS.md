# Elaboration Analysis - REPA-020

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | **Critical** | Story depends on REPA-009 but REPA-009 is already implemented with breaking changes that break existing cards |
| 2 | Internal Consistency | FAIL | High | Story architecture examples show `actions` prop which has been removed by REPA-009 |
| 3 | Reuse-First | PASS | — | Factory pattern follows column-helpers.tsx pattern |
| 4 | Ports & Adapters | PASS | — | No backend, frontend-only factory functions |
| 5 | Local Testability | PASS | — | Unit tests specified, no HTTP dependencies |
| 6 | Decision Completeness | PASS | — | Clear decisions on factory approach, no blocking TBDs |
| 7 | Risk Disclosure | FAIL | **Critical** | Missing critical risk: REPA-009 breaking changes have NOT been migrated in existing cards |
| 8 | Story Sizing | PASS | — | 3 SP appropriate for 4 factories + tests + Storybook |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **BLOCKING: REPA-009 Already Implemented with Breaking Changes** | **Critical** | REPA-009 removed `actions` prop from GalleryCard, but InstructionCard and SetCard still use `actions`. Story cannot proceed until existing cards migrate to `hoverOverlay` prop |
| 2 | Story Architecture Examples Use Removed API | **Critical** | Story shows `actions` prop in factory examples (lines 265-300), but this prop was removed by REPA-009. Must update to use `hoverOverlay` |
| 3 | Dependency Status Mismatch | High | Story lists REPA-009 as dependency in "ready-to-work" status, but REPA-009 is already implemented in GalleryCard (has REPA-009 comments). Stories index may be stale |
| 4 | Missing Migration Story for Existing Cards | High | No story exists to migrate InstructionCard/SetCard/WishlistCard from `actions` to `hoverOverlay`. This migration must happen before REPA-020 factories can be tested |
| 5 | Factory Return Type Mismatch | High | Factories return `GalleryCardProps` with `hoverOverlay`, but story examples show `actions` prop. Schema validation will fail |
| 6 | Test Coverage Not Specified for Package | Medium | Story requires "Minimum 45% test coverage maintained for @repo/gallery package" (AC-19) but doesn't specify current baseline coverage |
| 7 | Storybook Configuration Ambiguous | Low | Story mentions both `packages/core/gallery/src/__stories__/` and `packages/core/app-component-library/src/__stories__/` without clear decision |

## Split Recommendation

Not applicable - story is appropriately scoped at 3 SP with 21 ACs for 4 factory functions.

## Preliminary Verdict

**Verdict**: **FAIL - BLOCKING DEPENDENCY ISSUES**

### Critical Blockers

1. **REPA-009 Breaking Changes Not Migrated**: GalleryCard has been enhanced with REPA-009 features (selection, draggable, hoverOverlay) and the `actions` prop has been **REMOVED**. However:
   - InstructionCard (line 87) uses `actions={...}`
   - SetCard (line 165) uses `actions={actions}`
   - Story assumes `actions` prop still exists (architecture examples lines 265-300)

2. **Factory API Targets Removed Prop**: All factory examples in the story show returning props with `actions` slot:
   ```typescript
   return {
     // ... other props
     actions: (
       <div className="flex gap-1">
         {/* action buttons */}
       </div>
     )
   }
   ```
   This prop no longer exists in GalleryCardPropsSchema.

### Required Actions Before Implementation

1. **Create Migration Story**: Add REPA-019.5 or similar to migrate InstructionCard, SetCard, WishlistCard from `actions` to `hoverOverlay`
2. **Update Story Examples**: Replace all `actions` prop references with `hoverOverlay` in REPA-020 architecture section
3. **Update Factory Signatures**: Change factory return structure to use `hoverOverlay` instead of `actions`
4. **Verify Stories Index**: Update stories.index.md to reflect REPA-009 completion status

### Implementation Risk

Without fixing these blockers, this story will fail immediately during implementation:
- Factories will create props with non-existent `actions` field
- GalleryCardPropsSchema validation will reject factory output
- Tests will fail when rendering GalleryCard with factory props
- Existing card implementations will break if they try to use factories

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | REPA-009 breaking changes not migrated in existing cards | Core factory testing - cannot verify factories work with actual GalleryCard until existing cards are migrated | Create migration story to update InstructionCard, SetCard, WishlistCard from `actions` to `hoverOverlay` |
| 2 | Factory API targets removed `actions` prop | All factory implementations - factories will return invalid GalleryCardProps | Update all factory examples and implementation guidance to use `hoverOverlay` instead of `actions` |
| 3 | Missing baseline test coverage data | AC-19 verification - cannot verify coverage maintained without baseline | Document current @repo/gallery test coverage percentage before implementation |

---

## Worker Token Summary

- Input: ~59,000 tokens (files read: REPA-020.md, STORY-SEED.md, stories.index.md, GalleryCard.tsx, domain card implementations, column-helpers.tsx, package.json, schemas)
- Output: ~5,000 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Analysis: Deep dive into codebase revealed critical breaking change mismatch between story assumptions and reality
