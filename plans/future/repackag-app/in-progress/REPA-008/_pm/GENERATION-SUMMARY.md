# REPA-008 Story Generation Summary

**Generated:** 2026-02-10
**Story ID:** REPA-008
**Title:** Add Gallery Keyboard Hooks
**Epic:** REPACKAG - App Consolidation & Repackaging
**Phase:** Phase 2 - Gallery Enhancement

## Generation Metadata

- **Experiment Variant:** control (no active experiments)
- **Story Points:** 2
- **Priority:** P1 - High
- **Dependencies:** None
- **Status:** Generated → Ready for Elaboration

## Seed Analysis

The story seed (1,085 lines) provided comprehensive context:

### Duplicate Code Identified
- **useRovingTabIndex:** Exact duplicate in both galleries (363 + 325 lines)
- **useAnnouncer:** Exact duplicate in both galleries (180 + 154 lines)
- **useKeyboardShortcuts vs useGalleryKeyboard:** Divergent implementations (212 + 186 lines)
- **Total duplicate/divergent code:** ~1,420 lines
- **Expected reduction:** ~470 lines (33% savings)

### Proposed Solution
1. Move `useRovingTabIndex` to `@repo/gallery` with `ariaLabel` parameter
2. Move `useAnnouncer` to `@repo/accessibility`
3. Move `useKeyboardShortcuts` to `@repo/gallery` (generic primitive)
4. Create new `useGalleryKeyboard` (opinionated wrapper built on primitive)
5. Create new `useGallerySelection` (multi-select logic, optional)

### No Blocking Conflicts
- REPA-007 (SortableGallery) is independent
- REPA-010 (Inspiration refactor) depends on this story
- No overlapping file modifications with active work

## Story Structure

Generated story file includes:

### Required Sections
✅ YAML frontmatter with metadata
✅ Context (grounded in codebase reality)
✅ Goal and Non-Goals
✅ Scope (packages, apps, files)
✅ 8 Acceptance Criteria (detailed, testable)
✅ Reuse Plan (existing implementations to consolidate)
✅ Architecture Notes (layered hook approach)
✅ Test Plan (unit, integration, manual)
✅ UI/UX Notes (accessibility, WCAG compliance)
✅ Reality Baseline (file locations, usage, dependencies)

### Quality Gates Verified
✅ Seed integrated - Story incorporates comprehensive seed analysis
✅ No blocking conflicts - All conflicts reviewed and resolved
✅ Index fidelity - Scope matches index entry exactly
✅ Reuse-first - Uses existing @repo/gallery and @repo/accessibility packages
✅ Test plan present - Detailed hook-level and integration testing strategy
✅ ACs verifiable - All 8 ACs have clear verification criteria
✅ Experiment variant assigned - "control" (no active experiments)

## Acceptance Criteria Breakdown

**AC1:** useRovingTabIndex in @repo/gallery (11 sub-criteria)
**AC2:** useAnnouncer in @repo/accessibility (9 sub-criteria)
**AC3:** useKeyboardShortcuts in @repo/gallery (9 sub-criteria)
**AC4:** useGalleryKeyboard in @repo/gallery (10 sub-criteria)
**AC5:** useGallerySelection in @repo/gallery (7 sub-criteria, OPTIONAL)
**AC6:** Wishlist Gallery Integration (7 sub-criteria)
**AC7:** Inspiration Gallery Integration (7 sub-criteria)
**AC8:** Quality Gates (6 sub-criteria)

**Total sub-criteria:** 66

## Test Strategy

### Migrated Tests
- useRovingTabIndex.test.tsx (from wishlist)
- useAnnouncer.test.tsx (from wishlist)
- useKeyboardShortcuts.test.tsx (from wishlist)

### New Tests Required
- useGalleryKeyboard.test.ts (new hook)
- useGallerySelection.test.ts (new hook, optional)

### Integration Tests
- Wishlist gallery keyboard navigation
- Inspiration gallery keyboard navigation
- Screen reader announcements
- Keyboard shortcuts (both apps)

### Coverage Target
- Minimum 45% global (project standard)
- Hook tests ~95% coverage (existing standard)
- No regression from baseline

## Migration Impact

### Files to Update (4)
- apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx
- apps/web/app-wishlist-gallery/src/pages/main-page.tsx
- apps/web/app-inspiration-gallery/src/components/DraggableInspirationGallery/index.tsx
- apps/web/app-inspiration-gallery/src/pages/main-page.tsx

### Files to Delete (9)
- 6 duplicate hook files (3 from each app)
- 3 duplicate test files (wishlist only, inspiration has 1)

### Import Changes
```typescript
// Before
import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'
import { useAnnouncer } from '../../hooks/useAnnouncer'

// After
import { useRovingTabIndex } from '@repo/gallery'
import { useAnnouncer } from '@repo/accessibility'
```

## Risk Assessment

**Low Risk:**
- Moving well-tested hooks
- Updating imports (straightforward)
- No breaking changes to APIs

**Medium Risk:**
- Creating new useGalleryKeyboard (mitigated: built on proven primitive)
- Creating new useGallerySelection (mitigated: optional for this story)

**High Risk:** None identified

## Implementation Phases

**Phase 1:** Move core hooks (useRovingTabIndex, useAnnouncer, useKeyboardShortcuts)
**Phase 2:** Create new hooks (useGalleryKeyboard, useGallerySelection)
**Phase 3:** Update app imports and add ariaLabel parameter
**Phase 4:** Cleanup duplicate files

## KB Persistence

Status: Deferred (KB unavailable)
Queue file: DEFERRED-KB-WRITES.yaml

Story record queued for KB with:
- story_id: REPA-008
- feature: repackag-app
- story_type: feature
- points: 2
- priority: high
- touches_frontend: true

## Index Update

✅ Index updated: plans/future/repackag-app/stories.index.md
✅ Status changed: pending → Generated
✅ Story file reference added
✅ Progress summary updated: generated count 0 → 1, pending count 19 → 18

## Related Stories

**Depends On This Story:**
- REPA-010: Refactor app-inspiration-gallery to Use @repo/gallery

**Related (Independent):**
- REPA-007: Add SortableGallery Component
- REPA-015: Enhance @repo/accessibility

**Original Implementations:**
- WISH-2006: Wishlist Accessibility
- INSP-019: Inspiration Keyboard Navigation & A11y

## Next Steps

1. Review generated story with team
2. Validate technical approach
3. Approve for elaboration phase
4. Developer can begin implementation following 4-phase plan

---

**Generation Time:** < 1 minute
**Seed Quality:** Excellent (1,085 lines of detailed analysis)
**Story Completeness:** 100%
**Ready for Elaboration:** Yes
