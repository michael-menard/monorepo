# Elaboration Report - REPA-020

**Date**: 2026-02-11
**Verdict**: CONDITIONAL PASS

## Summary

Story REPA-020 proposes creating factory functions for domain-specific cards in @repo/gallery package. While the story had critical issues stemming from a dependency status mismatch with REPA-009, all blocking issues have been resolved through corrective acceptance criteria and documentation updates. The story is approved to proceed to implementation with added constraints.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS (corrected) | — | Story depends on REPA-009 which is already implemented; story updated to target current GalleryCard API |
| 2 | Internal Consistency | PASS (corrected) | — | Factory examples updated to use hoverOverlay prop instead of removed actions prop |
| 3 | Reuse-First | PASS | — | Factory pattern follows column-helpers.tsx pattern |
| 4 | Ports & Adapters | PASS | — | No backend, frontend-only factory functions |
| 5 | Local Testability | PASS | — | Unit tests specified, no HTTP dependencies |
| 6 | Decision Completeness | PASS | — | Clear decisions on factory approach, no blocking TBDs |
| 7 | Risk Disclosure | PASS (corrected) | — | Added implementation notes about existing card migration need (non-blocking) |
| 8 | Story Sizing | PASS | — | 3 SP appropriate for 4 factories + tests + Storybook |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Factory API targets removed `actions` prop | Critical | Add AC-22: Enforce factories use `hoverOverlay` prop instead of removed `actions`. All factories must follow GalleryCard.tsx pattern (lines 119-133). | RESOLVED |
| 2 | Missing baseline test coverage data | Medium | Add AC-23: Document current @repo/gallery test coverage percentage before implementation. Enables verification of AC-19 (maintain 45% minimum coverage). | RESOLVED |
| 3 | Existing cards still use removed API | High (non-blocking) | Implementation note added: InstructionCard and SetCard use removed `actions` prop. This is NOT blocking for factory implementation - factories will use current API. Existing cards need separate migration story. | DOCUMENTED |

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Factory API targets removed `actions` prop | Add as AC-22 | Story examples show `actions` prop which was removed by REPA-009. Factories must use `hoverOverlay` instead. Correctable by updating factory signatures and examples. |
| 2 | Missing baseline test coverage data | Add as AC-23 | AC-19 requires maintaining 45% coverage but story doesn't specify current baseline. Must document before implementation. |
| 3 | REPA-009 breaking changes not migrated in existing cards | Logged to KB | InstructionCard and SetCard still use removed `actions` prop. NOT blocking for factory implementation - factories will target current API. Existing cards need separate migration story. |

### Enhancement Opportunities

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Factory memoization not documented | KB-logged | Non-blocking optimization guidance for large galleries. Consider useMemo wrapper in caller code. |
| 2 | Price formatting utility not shared | KB-logged | Duplication opportunity for future refactoring. Recommend extracting shared currency formatter. |
| 3 | Image fallback logic duplicated | KB-logged | Extract utility function in future iteration for DRY principle. |
| 4 | Badge variant mapping not standardized | KB-logged | Future enhancement for consistent badge colors across all factories. |
| 5 | Storybook accessibility tests not mentioned | KB-logged | Add @storybook/addon-a11y for automated a11y checks in future iteration. |

### Follow-up Stories Suggested

- [ ] REPA-020.1: Migrate existing cards (InstructionCard, SetCard, WishlistCard) from removed `actions` prop to `hoverOverlay`
- [ ] REPA-020.2: Extract shared utilities (currency formatter, image fallback logic)
- [ ] REPA-020.3: Add Storybook accessibility addon testing

### Items Marked Out-of-Scope

None. All findings are either resolved as ACs or logged for future work.

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Factory API targets removed `actions` prop | Add as AC: Enforce factories use `hoverOverlay` | AC-22 |
| 2 | Missing baseline test coverage data | Add as AC: Document current coverage before implementation | AC-23 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | Factory memoization not documented | Performance | KB entry created |
| 2 | Price formatting utility not shared | Code Reuse | KB entry created |
| 3 | Image fallback logic duplicated | Code Reuse | KB entry created |
| 4 | Badge variant mapping not standardized | UX Consistency | KB entry created |
| 5 | Storybook accessibility tests not mentioned | Quality | KB entry created |

### Implementation Notes

**Critical API Update**: REPA-009 has already been implemented in GalleryCard.tsx and removed the `actions` prop, replacing it with `hoverOverlay`. All factory functions in this story must use the `hoverOverlay` pattern enforced by AC-22.

**Existing Cards Status**: InstructionCard (app-instructions-gallery) and SetCard (app-sets-gallery) still use the removed `actions` prop. This is not blocking for factory implementation - factories will use the current GalleryCard API. Existing cards require migration in a separate story (suggested REPA-020.1).

**Architecture Examples Updated**: All factory architecture examples in REPA-020.md have been updated to use `hoverOverlay` instead of `actions`, following the pattern from GalleryCard.tsx lines 119-133.

### Summary

- ACs added: 2 (AC-22 for API compliance, AC-23 for coverage baseline)
- KB entries created: 5 (non-blocking optimization and quality findings)
- Story corrections: 3 (architecture examples, implementation notes)
- Mode: autonomous
- Audit checks resolved: 3 (all critical issues corrected)

## Proceed to Implementation?

**YES - Story may proceed**

Story REPA-020 is approved for implementation with CONDITIONAL PASS verdict. All blocking issues have been resolved:
- AC-22 enforces correct `hoverOverlay` API usage
- AC-23 requires documenting test coverage baseline
- Architecture examples updated to use current GalleryCard API
- Implementation notes document existing card migration need (non-blocking)

The story is well-scoped (3 SP), follows established patterns (column-helpers.tsx), and has clear acceptance criteria. Implementation may proceed once these two new acceptance criteria are reviewed and approved.

---

**Elaboration completed by**: elab-completion-leader
**Story ready for**: Implementation after AC-22 and AC-23 review
