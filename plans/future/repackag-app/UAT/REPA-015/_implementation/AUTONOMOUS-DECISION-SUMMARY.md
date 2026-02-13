# Autonomous Decision Summary - REPA-015

**Story**: REPA-015: Extract Generic A11y Utilities to @repo/accessibility
**Decision Date**: 2026-02-10
**Mode**: Autonomous
**Decider**: elab-autonomous-decider agent

---

## Executive Summary

**Verdict**: CONDITIONAL PASS ✅

Story REPA-015 is **ready for implementation** with 2 low-severity documentation fixes recommended (non-blocking).

### Key Findings

- ✅ All 8 audit checks passed
- ✅ No MVP-critical gaps found
- ✅ Story is well-scoped, internally consistent, and follows reuse-first principles
- ⚠️ 2 low-severity documentation issues flagged (non-blocking)
- 📋 10 non-blocking findings documented for future work

---

## Analysis Results

### Audit Performance

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Scope Alignment | ✅ PASS | — | Matches stories.index.md exactly |
| Internal Consistency | ✅ PASS | — | Goals, Non-goals, Decisions, ACs consistent |
| Reuse-First | ✅ PASS | — | Reuses @repo/accessibility from REPA-008 |
| Ports & Adapters | ✅ PASS | — | Pure functions, no transport coupling |
| Local Testability | ✅ PASS | — | Unit tests + manual checklist specified |
| Decision Completeness | ✅ PASS | — | No blocking TBDs |
| Risk Disclosure | ✅ PASS | — | Risks disclosed with mitigations |
| Story Sizing | ✅ PASS | — | Appropriately sized at 1 SP |

**Score**: 8/8 (100%)

### MVP-Critical Gaps

**None found** - Core journey is complete.

The story clearly identifies:
- ✅ Generic utilities to migrate (~50 LOC)
- ✅ Domain-specific functions to keep in app (~200 LOC)
- ✅ Target package exists and proven (@repo/accessibility)
- ✅ Consumer files identified
- ✅ Tests specified (~80 LOC)
- ✅ No dependencies on domain types
- ✅ Build and quality gate verification in ACs
- ✅ Rollback plan documented

---

## Decisions Made

### Issue Resolution

#### Issue 1: Test Expectation Inconsistency (Low Severity)
**Finding**: AC-1 references "priority 5 of 5" in test expectation, but implementation comment says no "of 5" since redundant.

**Decision**: Documentation fix recommended
- **Action**: None (non-blocking)
- **Rationale**: Actual code implementation is clear. Test expectation needs update or clarification, but this doesn't block implementation since the working code shows the correct behavior.
- **Severity**: Low

#### Issue 2: Story Path Mismatch (Low Severity)
**Finding**: stories.index.md shows path as "backlog/REPA-015" but actual location is "elaboration/REPA-015".

**Decision**: Documentation fix recommended
- **Action**: None (non-blocking)
- **Rationale**: Story location is correct (in elaboration folder). Index needs update to reflect reality.
- **Severity**: Low

### Acceptance Criteria Additions

**None required** - No MVP-critical gaps identified.

All necessary acceptance criteria already present in story (AC-1 through AC-7).

---

## Future Opportunities Logged

### Non-Blocking Gaps (4 items)

1. **Unused Keyboard Label Utility** (Low impact, Low effort)
   - getKeyboardShortcutLabel() migrated but not currently consumed
   - Future: Add keyboard shortcut help modal

2. **Unused Contrast Validation Schema** (Low impact, Low effort)
   - ContrastRatioSchema defined but not actively used
   - Future: Design system lint rules or build-time WCAG checks

3. **Limited Keyboard Label Coverage** (Medium impact, Low effort)
   - Only covers basic keys (arrows, Delete, Enter, Escape, etc.)
   - Missing: Modifier keys, function keys, media keys, numpad
   - Extend incrementally as needed

4. **Hardcoded Focus Ring Color** (Low impact, Medium effort)
   - focusRingClasses uses sky-500 (works but inflexible)
   - Future: Theme variants or CSS custom properties

### Enhancement Opportunities (6 items)

5. **Generic ARIA Label Builder Framework** (Medium impact, High effort)
   - ~200 LOC domain-specific ARIA generators follow similar patterns
   - Future: Create generic builder utilities to reduce duplication
   - Defer until pattern emerges in multiple apps

6. **Keyboard Shortcut Help Component** (Medium impact, Medium effort)
   - Foundation exists with getKeyboardShortcutLabel()
   - Create reusable component in @repo/app-component-library
   - Triggered by "?" or help menu

7. **Screen Reader Text Utilities** (Medium impact, Low effort) ⭐ HIGH PRIORITY
   - Add srOnlyClasses constant and VisuallyHidden component
   - Complements existing accessibility utilities
   - High value, low effort

8. **Keyboard Event Utilities** (Medium impact, Low effort) ⭐ HIGH PRIORITY
   - Add isNavigationKey(), isActionKey(), isModifierPressed()
   - Complements getKeyboardShortcutLabel()
   - Reduces boilerplate in keyboard handlers

9. **ARIA Live Region Hook** (High impact, Medium effort) ⭐ HIGH PRIORITY
   - Create useAriaLive() for polite/assertive live regions
   - Complements existing useAnnouncer
   - More granular announcement control

10. **Contrast Validation CLI Tool** (Medium impact, Medium effort)
    - Build on ContrastRatioSchema
    - Validates Tailwind color combinations meet WCAG AA
    - Can run as pre-commit hook or in CI

### Priority Recommendations

**High Value, Low Effort (Do Next)**:
1. Screen Reader Text Utilities (#7)
2. Keyboard Event Utilities (#8)
3. Extend keyboardShortcutLabels to cover modifier keys (#3)

**High Value, Medium Effort (Plan for Future Sprint)**:
4. Keyboard Shortcut Help Component (#6)
5. ARIA Live Region Hook (#9)
6. Contrast Validation CLI Tool (#10)

**Medium Value, Lower Priority**:
7. Generic ARIA Label Builder Framework (#5) - only if pattern emerges in multiple apps
8. Focus Ring Variants (#4)

**Nice to Have (Defer Until Demand)**:
9. Symbol-based arrow labels (#1 variation)
10. Focus ring theme variants (#4)

---

## Knowledge Base Status

**KB System**: Unavailable

**Entries Planned**: 10 (documented in KB-ENTRIES.md)

All future opportunities have been documented in `/Users/michaelmenard/Development/monorepo/plans/future/repackag-app/elaboration/REPA-015/_implementation/KB-ENTRIES.md` for integration when KB system becomes available.

---

## Implementation Readiness

### ✅ Ready to Proceed

Story is **ready for implementation** following the phased approach:

1. **Phase 1**: Create utilities (~30 min)
   - focus-styles.ts
   - keyboard-labels.ts
   - contrast-validation.ts

2. **Phase 2**: Migrate tests (~30 min)
   - Extract tests from app-wishlist-gallery
   - Verify all tests pass in new location

3. **Phase 3**: Update exports (~10 min)
   - Update @repo/accessibility index.ts
   - Build and verify package

4. **Phase 4**: Update app imports (~20 min)
   - Update GotItModal imports
   - Update WishlistCard imports
   - Build and test app

5. **Phase 5**: Cleanup (~10 min)
   - Remove migrated utilities from app
   - Final verification

**Estimated Duration**: 1.5-2 hours active development

### Quality Gates

All quality gates defined in story:
- ✅ Package tests pass
- ✅ App tests pass
- ✅ TypeScript compiles
- ✅ Linting passes
- ✅ Coverage maintained at 45% minimum
- ✅ No circular dependencies
- ✅ Manual testing: Focus rings visible, keyboard labels work

### Recommended Pre-Implementation Actions

**Optional (Low Priority)**:
1. Fix test expectation inconsistency in AC-1
2. Update story path in stories.index.md

These are documentation improvements that do NOT block implementation.

---

## Risk Assessment

### Overall Risk: LOW ✅

**Confidence**: High
- Small, well-defined scope (~50 LOC + tests)
- Proven migration pattern (REPA-008 already migrated useAnnouncer successfully)
- No new dependencies required
- Clear boundaries (generic vs. domain-specific)
- High test coverage (257 lines of tests in source)
- No breaking changes

### Mitigations in Place

| Risk | Mitigation |
|------|------------|
| Import path changes break apps | Update all imports before deleting from source |
| Tests fail in new location | Migrate tests with utilities, verify locally |
| Package build fails | Run build before committing |
| Coverage drops below 45% | Migrate tests maintain coverage |
| Merge conflict with REPA-008 | useAnnouncer already complete - no overlap |

---

## Token Usage

### Autonomous Decision Phase

- **Input**: ~38,000 tokens
  - Agent instructions: ~2,000
  - Story file: ~8,000
  - ANALYSIS.md: ~2,500
  - FUTURE-OPPORTUNITIES.md: ~2,500
  - Source files: ~20,000
  - Index files: ~3,000

- **Output**: ~3,500 tokens
  - DECISIONS.yaml: ~1,500
  - KB-ENTRIES.md: ~1,500
  - AUTONOMOUS-DECISION-SUMMARY.md: ~500

**Total Phase Cost**: ~41,500 tokens

### Cumulative Story Cost (Elaboration)

- **Seed Analysis**: ~5,000 tokens (estimated)
- **Implementation Analysis**: ~40,500 tokens (from ANALYSIS.md)
- **Autonomous Decisions**: ~41,500 tokens (this phase)

**Total Elaboration**: ~87,000 tokens
**Predicted Range**: 80,000-120,000 tokens
**Status**: On track ✅

---

## Outputs Generated

### Primary Outputs

1. **DECISIONS.yaml**
   - Path: `/Users/michaelmenard/Development/monorepo/plans/future/repackag-app/elaboration/REPA-015/_implementation/DECISIONS.yaml`
   - Content: Structured decisions for completion phase
   - Verdict: CONDITIONAL_PASS
   - Summary: 0 ACs added, 10 KB entries planned, 2 low-severity issues flagged

2. **KB-ENTRIES.md**
   - Path: `/Users/michaelmenard/Development/monorepo/plans/future/repackag-app/elaboration/REPA-015/_implementation/KB-ENTRIES.md`
   - Content: 10 KB entries ready for integration
   - Categories: Future opportunities, enhancement opportunities
   - Tags: Accessibility, keyboard-navigation, WCAG, ARIA, theming, ux-polish

3. **AUTONOMOUS-DECISION-SUMMARY.md** (this file)
   - Path: `/Users/michaelmenard/Development/monorepo/plans/future/repackag-app/elaboration/REPA-015/_implementation/AUTONOMOUS-DECISION-SUMMARY.md`
   - Content: Comprehensive summary of autonomous decisions
   - Audience: PM, completion phase orchestrator

### Story Modifications

**None** - No ACs added (no MVP-critical gaps)

Story file remains unchanged. All decisions documented in _implementation/ directory.

---

## Next Steps

### For Completion Phase (Orchestrator)

1. ✅ Proceed to completion phase
2. Review DECISIONS.yaml
3. Validate CONDITIONAL_PASS verdict
4. Optionally address low-severity documentation issues
5. Move story to ready-to-work when completion phase passes

### For Implementation Team

1. Begin implementation following story's phased approach
2. Reference DECISIONS.yaml for context on findings
3. Review KB-ENTRIES.md for future enhancement ideas
4. Follow all 7 acceptance criteria (AC-1 through AC-7)
5. Run quality gates before merge

### For Knowledge Base Integration

When KB system becomes available:
1. Read KB-ENTRIES.md
2. Spawn kb-writer agent for each entry
3. Track entry IDs back to DECISIONS.yaml
4. Update DECISIONS.yaml with actual entry IDs

---

## Appendices

### A. Related Stories

- **REPA-008**: Add Gallery Keyboard Hooks
  - Status: Complete (useAnnouncer migration done)
  - Relationship: Established migration pattern
  - No conflicts with REPA-015

- **WISH-2006**: Wishlist Accessibility
  - Status: Complete
  - Relationship: Created source file (a11y.ts)
  - REPA-015 extracts generic utilities from this work

- **REPA-011**: GalleryFilterBar Standardization
  - Status: In Progress
  - Relationship: May use focusRingClasses after REPA-015 completes
  - No blocking dependency

### B. File Inventory

**Files to Create**:
- packages/core/accessibility/src/utils/focus-styles.ts
- packages/core/accessibility/src/utils/keyboard-labels.ts
- packages/core/accessibility/src/utils/contrast-validation.ts
- packages/core/accessibility/src/utils/__tests__/focus-styles.test.ts
- packages/core/accessibility/src/utils/__tests__/keyboard-labels.test.ts
- packages/core/accessibility/src/utils/__tests__/contrast-validation.test.ts

**Files to Modify**:
- packages/core/accessibility/src/index.ts (add exports)
- apps/web/app-wishlist-gallery/src/utils/a11y.ts (remove migrated utilities)
- apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts (remove migrated tests)
- apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx (update import)
- apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx (update import)

**Files Not Modified**:
- packages/core/accessibility/package.json (dependencies already present)
- packages/core/accessibility/src/test/setup.ts (works for new utils)

### C. Dependency Constraints

**Critical Constraint**: @repo/accessibility MUST NOT depend on @repo/api-client

**Verification**:
- ✅ focusRingClasses: String constant (no types)
- ✅ keyboardShortcutLabels: Plain object (built-in types)
- ✅ getKeyboardShortcutLabel(): String input/output (no types)
- ✅ ContrastRatioSchema: Zod primitives only (no domain types)

**Domain Exclusion**:
Domain functions that reference WishlistItem stay in app:
- generateItemAriaLabel(item: WishlistItem, ...) ← References WishlistItem
- All other generate*Announcement functions ← Wishlist-specific logic

---

**Generated**: 2026-02-10T00:00:00Z
**Agent**: elab-autonomous-decider v1.0.0
**Mode**: Autonomous
**Confidence**: High ✅
