---
doc_type: dev_feasibility
story_id: REPA-015
created_at: "2026-02-10"
agent_version: "pm-dev-feasibility-v1.0"
verdict: PASS
---

# REPA-015: Enhance @repo/accessibility - Dev Feasibility Review

## Overall Verdict: PASS

**Recommendation:** Proceed with implementation

**Confidence:** High

**Estimated Effort:** 1 SP (Small)

**Key Risks:** Low - straightforward utility extraction with clear boundaries

---

## Executive Summary

This story extracts generic accessibility utilities from `app-wishlist-gallery/src/utils/a11y.ts` to the existing `@repo/accessibility` package. The scope has been refined from the original index entry to focus only on generic utilities (~50 LOC) rather than attempting to migrate domain-specific ARIA generators (~200 LOC).

**Key Findings:**
- ✅ Target package already exists with established structure (REPA-008)
- ✅ Clear separation between generic and domain-specific utilities
- ✅ No new dependencies required
- ✅ Migration pattern already proven (useAnnouncer in REPA-008)
- ✅ Low risk of breaking changes (well-tested utilities)
- ⚠️ Index entry is outdated (mentions useAnnouncer, already completed)

**Blockers:** None

**Dependencies:** None (REPA-008's useAnnouncer work is already complete)

---

## Technical Feasibility

### Package Architecture

**Target Package:** `@repo/accessibility`
**Status:** ✅ Already exists (created/enhanced by REPA-008)

**Current Structure:**
```
packages/core/accessibility/
  src/
    components/
      KeyboardDragDropArea/
    hooks/
      useKeyboardDragAndDrop.ts
      useAnnouncer.tsx              ← Added by REPA-008
    __tests__/
    test/setup.ts
    index.ts
  package.json
```

**Proposed Structure After REPA-015:**
```
packages/core/accessibility/
  src/
    components/
      KeyboardDragDropArea/
    hooks/
      useKeyboardDragAndDrop.ts
      useAnnouncer.tsx
    utils/                           ← NEW
      focus-styles.ts                ← NEW
      keyboard-labels.ts             ← NEW
      contrast-validation.ts         ← NEW
      __tests__/                     ← NEW
        focus-styles.test.ts
        keyboard-labels.test.ts
        contrast-validation.test.ts
    index.ts                         ← UPDATE (add util exports)
```

**Assessment:** ✅ Clean extension of existing package structure. Follows established patterns.

### Dependencies Analysis

**Current Dependencies (package.json):**
```json
{
  "dependencies": {
    "react": "19.1.0",
    "zod": "3.22.4",
    "framer-motion": "12.23.22",
    "lucide-react": "0.468.0"
  }
}
```

**New Dependencies Required:** ✅ None

**Utilities to Migrate:**
- `focusRingClasses` - Pure string constant (no deps)
- `keyboardShortcutLabels` - Plain object (no deps)
- `getKeyboardShortcutLabel()` - Pure function (no deps)
- `ContrastRatioSchema` - Zod schema (Zod already in package)

**Assessment:** ✅ All utilities can be migrated with zero new dependencies.

### Type Dependencies

**Critical Constraint:** `@repo/accessibility` MUST NOT depend on `@repo/api-client`

**Analysis:**
- ✅ Generic utilities have no type dependencies on domain types
- ✅ `focusRingClasses` is a string constant
- ✅ `keyboardShortcutLabels` uses built-in types
- ✅ `getKeyboardShortcutLabel()` uses string input/output
- ✅ `ContrastRatioSchema` uses Zod primitives only

**Domain-Specific Functions (NOT migrating):**
- ❌ `generateItemAriaLabel()` - References `WishlistItem` from `@repo/api-client`
- ❌ `generatePriorityChangeAnnouncement()` - Wishlist-specific logic
- ❌ Other generate*Announcement functions - Domain-specific

**Assessment:** ✅ Scope correctly excludes functions with domain dependencies. No risk of circular dependencies.

---

## Reuse Analysis

### Existing Package Reuse

**Package:** `@repo/accessibility`
**Reuse Level:** High

**Reusable Components:**
- ✅ Test setup (`src/test/setup.ts`) - Already configured for Vitest
- ✅ Build configuration - TypeScript, ESLint, Vitest already configured
- ✅ Export pattern - Established in `src/index.ts`
- ✅ Migration pattern - Proven with useAnnouncer in REPA-008

**Assessment:** Package infrastructure fully ready. No setup work required.

### Pattern Reuse from REPA-008

**Story:** REPA-008: Add Gallery Keyboard Hooks
**Status:** In Progress (useAnnouncer completion confirmed)

**Reusable Patterns:**
1. ✅ Hook migration from apps to package
2. ✅ Test migration strategy
3. ✅ Import path updates in consuming apps
4. ✅ Export configuration in package index

**Lessons Learned:**
- useAnnouncer successfully moved from apps to @repo/accessibility
- Tests migrated alongside hook
- No issues with package exports or imports

**Assessment:** ✅ Direct precedent for utility migration. Low implementation risk.

### Source Code Reuse

**Source File:** `apps/web/app-wishlist-gallery/src/utils/a11y.ts`
**Size:** 257 lines total

**Migration Breakdown:**
```
Generic utilities (MIGRATE):
  - focusRingClasses             ~5 lines
  - keyboardShortcutLabels       ~20 lines
  - getKeyboardShortcutLabel()   ~10 lines
  - ContrastRatioSchema          ~15 lines
  Total: ~50 lines

Domain-specific (KEEP in app):
  - generateItemAriaLabel()           ~20 lines
  - generatePriorityChangeAnnouncement() ~15 lines
  - generateDeleteAnnouncement()      ~10 lines
  - generateAddAnnouncement()         ~10 lines
  - generateFilterAnnouncement()      ~25 lines
  - generateEmptyStateAnnouncement()  ~15 lines
  - generateModalOpenAnnouncement()   ~20 lines
  - generateDragAnnouncement()        ~30 lines
  - Supporting types and docs         ~60 lines
  Total: ~200 lines
```

**Test File:** `apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts`
**Size:** 257 lines

**Test Migration:**
- ~80 lines for generic utilities → MIGRATE to package
- ~170 lines for domain-specific → KEEP in app

**Assessment:** ✅ Clear delineation. Straightforward extraction.

---

## Implementation Complexity

### Effort Estimate: 1 SP (Small)

**Breakdown:**
- Create utils/ directory structure (5 min)
- Extract focusRingClasses to focus-styles.ts (15 min)
- Extract keyboard labels to keyboard-labels.ts (15 min)
- Extract ContrastRatioSchema to contrast-validation.ts (10 min)
- Migrate tests (~80 LOC) (30 min)
- Update package exports (index.ts) (10 min)
- Update app imports (GotItModal, WishlistCard) (20 min)
- Verify builds and tests (30 min)
- Documentation (JSDoc, README) (30 min)

**Total Estimated Time:** ~2.5 hours (1 SP)

### Technical Complexity: Low

**Complexity Factors:**
- ✅ Pure utility functions (no side effects)
- ✅ Well-tested source code (257 lines of tests)
- ✅ No state management
- ✅ No React component concerns
- ✅ No API interactions
- ✅ No database changes

**Assessment:** Straightforward code extraction with minimal transformation.

---

## Risk Assessment

### Low Risk Factors

1. **Small Scope** - Only ~50 LOC moving
2. **No New Dependencies** - Uses existing Zod
3. **Proven Pattern** - REPA-008 already migrated hooks successfully
4. **Clear Boundaries** - Generic vs. domain-specific well-defined
5. **High Test Coverage** - Source code has comprehensive tests
6. **No Breaking Changes** - Utilities used as-is in new location

### Potential Risks (All Mitigatable)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Import path changes break apps | Low | Update imports before deleting from source |
| Tests fail in new location | Low | Migrate tests with utilities, verify locally |
| Package build fails | Low | Run build before committing |
| Coverage drops below 45% | Low | Migrate tests maintain coverage |
| Merge conflicts with REPA-008 | Low | Coordinate timing, REPA-008 already complete |

### Breaking Change Analysis

**Potential Breaking Changes:** None identified

**Reasoning:**
- Utilities are pure functions with no API changes
- focusRingClasses remains a string constant
- keyboardShortcutLabels remains a plain object
- ContrastRatioSchema Zod API unchanged
- Import paths change but functionality identical

**Migration Strategy:**
1. Add utilities to @repo/accessibility
2. Update app imports to use new package
3. Verify all tests pass
4. Remove from app's a11y.ts (keep domain-specific functions)

**Assessment:** ✅ Zero breaking changes expected.

---

## Active Work Coordination

### REPA-008: Add Gallery Keyboard Hooks

**Status:** In Progress
**Relevant Completions:** ✅ useAnnouncer already moved to @repo/accessibility

**Coordination Points:**
- ✅ No overlap - REPA-008 focused on hooks, REPA-015 on utilities
- ✅ useAnnouncer migration proves package structure works
- ✅ No merge conflicts expected (different file paths)

**Action Required:** Verify REPA-008 is fully merged before starting REPA-015 (low urgency, no blockers).

### REPA-011: Standardize GalleryFilterBar

**Status:** In Progress
**Potential Dependency:** May use focusRingClasses

**Coordination Points:**
- ⚠️ If REPA-011 imports focusRingClasses from app, update needed
- ✅ REPA-015 can proceed independently
- ✅ REPA-011 can update import after REPA-015 completes

**Action Required:** None blocking. Coordinate import updates if REPA-011 uses focusRingClasses.

### Other Active Stories

**Analysis:** No other active stories touch:
- @repo/accessibility package
- app-wishlist-gallery/utils/a11y.ts
- Focus styling or keyboard utilities

**Assessment:** ✅ Clear path for implementation. No blocking dependencies.

---

## Constraints and Recommendations

### Technical Constraints

1. **Package Dependency Direction:**
   - ✅ MUST NOT create dependency from @repo/accessibility to @repo/api-client
   - ✅ Keep domain-specific functions (WishlistItem references) in apps

2. **Test Coverage:**
   - ✅ Maintain 45% minimum global coverage
   - ✅ Target 95%+ coverage for utility functions

3. **Code Style:**
   - ✅ Zod-first types (ContrastRatioSchema already Zod-based)
   - ✅ No barrel files (except package index.ts)
   - ✅ Functional programming style (utilities are pure functions)

### Architectural Recommendations

1. **File Organization:**
   ```
   utils/
     focus-styles.ts           ← Single utility
     keyboard-labels.ts        ← Related utilities
     contrast-validation.ts    ← Single schema
     __tests__/
       focus-styles.test.ts
       keyboard-labels.test.ts
       contrast-validation.test.ts
   ```

2. **Export Strategy:**
   ```typescript
   // src/index.ts
   export { focusRingClasses } from './utils/focus-styles'
   export { keyboardShortcutLabels, getKeyboardShortcutLabel } from './utils/keyboard-labels'
   export { ContrastRatioSchema } from './utils/contrast-validation'
   ```

3. **Documentation:**
   - Add JSDoc comments to all utilities
   - Include usage examples in comments
   - Update package README with new utilities
   - Reference WCAG standards where applicable

### Implementation Recommendations

1. **Phase 1: Create Utilities** (30 min)
   - Create utils/ directory
   - Extract utilities to new files
   - Add JSDoc documentation

2. **Phase 2: Migrate Tests** (30 min)
   - Extract tests for migrated utilities
   - Verify all tests pass in package
   - Maintain coverage metrics

3. **Phase 3: Update Exports** (10 min)
   - Add utility exports to package index
   - Verify package builds

4. **Phase 4: Update App Imports** (20 min)
   - Update GotItModal import
   - Update WishlistCard import
   - Verify app builds and tests pass

5. **Phase 5: Cleanup** (10 min)
   - Remove migrated utilities from app's a11y.ts
   - Update app's a11y.test.ts (keep domain-specific tests)
   - Final verification

**Total Time:** ~1.5-2 hours active development

---

## Quality Gates

### Pre-Implementation

- [ ] REPA-008 useAnnouncer migration confirmed complete
- [ ] Story scope excludes domain-specific functions
- [ ] No conflicts with active work (REPA-011)

### During Implementation

- [ ] All utility files created with tests
- [ ] Tests pass in package: `pnpm test --filter=@repo/accessibility`
- [ ] Package builds: `pnpm build --filter=@repo/accessibility`
- [ ] App imports updated
- [ ] App tests pass: `pnpm test --filter=app-wishlist-gallery`

### Pre-Merge

- [ ] TypeScript compilation succeeds: `pnpm check-types:all`
- [ ] Linting passes: `pnpm lint:all`
- [ ] Coverage maintained at 45% minimum
- [ ] No circular dependencies
- [ ] Manual testing completed (focus rings visible, keyboard labels work)

---

## Alternative Approaches Considered

### Option 1: Full Migration (All ARIA Generators)

**Scope:** Move all 257 lines from a11y.ts, including domain-specific functions

**Pros:**
- Complete consolidation
- No utilities left in app

**Cons:**
- ❌ Creates dependency on @repo/api-client (breaks architecture)
- ❌ Domain-specific logic in generic package (poor separation)
- ❌ Higher effort (3 SP vs. 1 SP)
- ❌ More breaking changes risk
- ❌ Less reusable (wishlist-specific)

**Verdict:** ❌ Rejected - violates package architecture constraints

### Option 2: Generic Utilities Only (Recommended)

**Scope:** Move only generic utilities (~50 LOC), keep domain-specific in app

**Pros:**
- ✅ Clean separation of concerns
- ✅ No domain dependencies
- ✅ Low effort (1 SP)
- ✅ High reusability
- ✅ Zero breaking changes

**Cons:**
- Some duplication if other apps need similar ARIA patterns (acceptable)

**Verdict:** ✅ Selected - optimal balance of value and complexity

### Option 3: Create Generic ARIA Builders

**Scope:** Create abstract builder functions for domain-specific patterns

**Pros:**
- Could reduce code duplication
- Provides patterns for apps

**Cons:**
- ⚠️ Adds complexity without clear demand
- ⚠️ Unknown if pattern generalizes well
- ⚠️ Increases effort (2 SP)

**Verdict:** ⏸️ Defer - can be added in future story if demand emerges

---

## Success Criteria

- ✅ Generic utilities successfully extracted to @repo/accessibility
- ✅ All package tests pass with 95%+ coverage
- ✅ All app tests pass with updated imports
- ✅ No breaking changes in app functionality
- ✅ TypeScript compilation succeeds
- ✅ Linting passes
- ✅ Focus styling works identically to before migration
- ✅ No circular dependencies introduced
- ✅ Domain-specific functions remain in app (clean separation)

---

## Conclusion

**Final Verdict: PASS**

This story is technically feasible, well-scoped, and low-risk. The target package already exists with proven migration patterns (REPA-008). The scope correctly excludes domain-specific functions to maintain clean package architecture. Estimated effort is small (1 SP) with high confidence.

**Recommendation:** Proceed with implementation immediately. No blockers or dependencies.

**Next Steps:**
1. Update story index entry (remove useAnnouncer, clarify scope)
2. Implement in phases as outlined
3. Coordinate with REPA-011 if needed for import updates

---

**Feasibility Review Completed:** 2026-02-10
**Reviewer:** pm-dev-feasibility-review agent
**Confidence Level:** High
