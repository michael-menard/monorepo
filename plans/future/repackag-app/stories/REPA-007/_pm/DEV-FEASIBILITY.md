# Dev Feasibility Review: REPA-007 (MVP-Critical)

**Story**: Add SortableGallery Component to @repo/gallery

---

## Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: High

**Why**:
- All required dependencies already exist in @repo/gallery package.json (dnd-kit 6.3.1, framer-motion, zod)
- Both wishlist and inspiration apps have proven implementations of the target patterns (~1,369 LOC to consolidate)
- No backend changes required (frontend-only component)
- TypeScript generic pattern is well-understood and documented in React ecosystem
- Test patterns already established in existing drag-and-drop implementations

**No blocking technical risks identified for core user journey.**

---

## Likely Change Surface (Core Only)

### Packages Modified

**@repo/gallery** (primary):
- `packages/core/gallery/src/components/SortableGallery/` (new directory)
  - `index.tsx` - Main component (~600 LOC estimated)
  - `__tests__/` - Test suite (~400 LOC estimated)
  - `__types__/` - Zod schemas for props
  - `utils/` - Helper functions (arrayMove wrapper, sensor config)
- `packages/core/gallery/src/hooks/` (extract from apps)
  - `useRovingTabIndex.ts` (362 LOC from app-wishlist-gallery)
  - `index.ts` - Hook exports
- `packages/core/gallery/src/index.ts` - Add SortableGallery, useRovingTabIndex exports
- `packages/core/gallery/package.json` - No new dependencies needed

**@repo/accessibility** (secondary):
- `packages/core/accessibility/src/hooks/` (extract from apps)
  - `useAnnouncer.ts` (153 LOC from app-inspiration-gallery)
  - `index.ts` - Hook exports
- `packages/core/accessibility/src/index.ts` - Add useAnnouncer export
- `packages/core/accessibility/package.json` - No new dependencies needed

**Apps (deletions)**:
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/` - Delete after migration (~726 LOC)
- `apps/web/app-wishlist-gallery/src/hooks/useRovingTabIndex.ts` - Delete after extraction
- `apps/web/app-wishlist-gallery/src/hooks/useAnnouncer.ts` - Delete after extraction
- `apps/web/app-inspiration-gallery/src/components/DraggableInspirationGallery/` - Delete after migration (~643 LOC)
- `apps/web/app-inspiration-gallery/src/hooks/useAnnouncer.ts` - Delete after extraction

**Total estimated LOC**:
- New code: ~1,700 LOC (component + hooks + tests + docs)
- Deleted code: ~1,369 LOC (duplicated implementations)
- Net change: +331 LOC (but eliminates future duplication)

### Endpoints Modified

**None** - This is a frontend-only component story. No API changes required.

### Deploy Touchpoints

**Critical**:
- pnpm build in CI (all packages must compile)
- Type checking across monorepo (packages/core/gallery, packages/core/accessibility)
- Test suite in CI (Vitest + Playwright)

**Non-critical**:
- Storybook build (for documentation)
- No infrastructure changes (Terraform, AWS resources, etc.)

---

## MVP-Critical Risks (Max 5)

### Risk 1: Generic TypeScript Constraint Inflexibility

**Description**: `SortableGallery<T extends { id: string }>` may not cover all item types.

**Why it blocks MVP**:
- If apps have items with UUID type (`id: UUID` from crypto.randomUUID), TypeScript may reject `string` constraint
- If items use numeric IDs (`id: number`), constraint is too narrow

**Mitigation**:
1. Use minimal constraint: `T extends { id: string | number }` to cover both cases
2. Document in Storybook how to extend constraint if needed
3. Provide type utility for ID conversion:
   ```typescript
   type ItemWithStringId<T> = Omit<T, 'id'> & { id: string }
   ```

**Blocking severity**: Medium - Can be resolved during implementation by relaxing constraint

**Resolution timeline**: Dev phase

---

### Risk 2: Undo State Management with useRef Causing Re-render Issues

**Description**: Using useRef for undo state (to avoid re-renders) may cause stale closure bugs.

**Why it blocks MVP**:
- If undo callback captures stale `items` reference, rollback may restore wrong order
- Complex state synchronization between local state, undo context, and toast callbacks

**Mitigation**:
1. Use useState for undo state, accept minor re-render cost
2. Test undo flow thoroughly with rapid consecutive drags
3. Use functional setState to ensure latest state: `setState(prev => ...)`

**Blocking severity**: Low - Standard React state management pattern

**Resolution timeline**: Dev phase

---

### Risk 3: Toast Library Coupling to Sonner

**Description**: SortableGallery directly imports `toast` from sonner via @repo/app-component-library.

**Why it blocks MVP**:
- If apps use different toast libraries (react-hot-toast, Chakra UI toast), SortableGallery is incompatible
- Tight coupling makes testing harder (must mock sonner globally)

**Mitigation**:
1. Accept coupling for MVP (both wishlist and inspiration use sonner)
2. Document toast dependency clearly in README
3. Future: Add optional `toastAdapter` prop for custom toast implementations (see FUTURE-RISKS.md)

**Blocking severity**: Low - Known limitation, does not block core journey

**Resolution timeline**: MVP accepts limitation, fix post-MVP if needed

---

### Risk 4: ResizeObserver Polyfill for useRovingTabIndex

**Description**: useRovingTabIndex uses ResizeObserver to detect grid column changes dynamically. Not supported in older browsers.

**Why it blocks MVP**:
- If ResizeObserver unavailable, column count detection fails
- Keyboard navigation may break (assumes wrong column count)

**Mitigation**:
1. Provide fallback: Accept explicit `columns` prop to override dynamic detection
2. Polyfill ResizeObserver in test environment (already common practice)
3. Document browser compatibility in README (IE11 unsupported)

**Blocking severity**: Low - Modern browsers support ResizeObserver (96%+ global coverage per caniuse)

**Resolution timeline**: Dev phase

---

### Risk 5: Framer Motion Performance with Large Galleries

**Description**: layout prop on motion.div causes reflow calculations for all items on reorder. Galleries with 100+ items may experience frame drops.

**Why it blocks MVP**:
- If performance degrades, drag feels laggy
- Users may avoid using component for large datasets

**Mitigation**:
1. Provide `disableAnimations` prop for large galleries
2. Document performance considerations in Storybook
3. Test with 100-item gallery in dev phase, set performance baseline
4. Future: Investigate will-change CSS or RequestAnimationFrame optimization (see FUTURE-RISKS.md)

**Blocking severity**: Low - Can defer optimization to post-MVP if needed

**Resolution timeline**: Dev phase (document threshold), post-MVP (optimize if needed)

---

## Missing Requirements for MVP

### Requirement 1: dnd-kit Sensor Configuration Values

**Context**: Seed specifies "PointerSensor 8px threshold, TouchSensor 300ms delay, 5px tolerance" but does not specify:
- Auto-scroll threshold percentages (seed says "20%/10% threshold, 10px/ms acceleration")
- Collision detection algorithm details (closestCenter vs closestCorners)

**Concrete decision PM must include**:
1. Confirm auto-scroll config: `{ threshold: { x: 0.2, y: 0.1 }, acceleration: 10 }` (from existing apps)
2. Confirm collision detection: `closestCenter` (from existing apps)
3. Confirm sorting strategy: `rectSortingStrategy` for grid, `verticalListSortingStrategy` for list (from @dnd-kit/sortable)

**Blocking**: No - Defaults from existing implementations are proven to work

---

### Requirement 2: Undo Timeout Cancellation Behavior

**Context**: AC-17 says "New drag cancels previous undo window" but does not specify:
- Does new drag dismiss previous toast immediately or let it fade?
- If user drags → undoes → drags again, is undo stack cleared or preserved?

**Concrete decision PM must include**:
1. Behavior: New drag immediately dismisses previous toast and clears undo context
2. Only one undo window active at a time (no undo stack in MVP)
3. Undo button disables after click (prevents double-undo)

**Blocking**: No - Behavior matches existing implementations

---

### Requirement 3: Error Toast Duration

**Context**: AC-20 says "Shows error toast with Retry button on failure" but does not specify:
- Does error toast auto-dismiss or persist until user action?
- If auto-dismiss, what is the timeout?

**Concrete decision PM must include**:
1. Error toast persists (does not auto-dismiss) until user clicks Retry or dismisses manually
2. Rationale: Errors require user action, should not disappear automatically

**Blocking**: No - Reasonable default behavior

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Drag-and-drop reorder**:
   - Playwright E2E test showing item moving from position A to position B
   - Screenshot evidence of reordered gallery
   - Console log showing onReorder callback invoked with correct payload

2. **Undo flow**:
   - Playwright E2E test showing undo button click restoring original order
   - Vitest unit test verifying undo state management

3. **Keyboard navigation**:
   - Playwright E2E test showing arrow key focus movement
   - Vitest unit test for useRovingTabIndex hook
   - Video recording of keyboard navigation (optional, for demo)

4. **Accessibility**:
   - axe-core scan with 0 violations
   - Manual screen reader test (NVDA or VoiceOver) verifying announcements
   - Lighthouse accessibility score: 100

5. **Error handling**:
   - Vitest unit test showing rollback on onReorder error
   - Playwright E2E test showing error toast and retry button

### Critical CI/Deploy Checkpoints

**Pre-merge**:
- TypeScript compilation passes (no type errors)
- ESLint passes (no warnings on new code)
- Vitest tests pass (80%+ coverage target)
- Playwright E2E test passes (at least 1 happy path)

**Pre-deploy** (not applicable - library package):
- Storybook builds successfully
- Changesets version bump (if using changesets)
- pnpm build succeeds across all dependent packages

---

## Implementation Sizing Analysis

### Estimated LOC Breakdown

**SortableGallery component** (~600 LOC):
- Component logic: 350 LOC (DndContext setup, state management, undo flow)
- Zod schemas: 100 LOC (props validation, type inference)
- Utility functions: 50 LOC (sensor config, arrayMove wrapper)
- Component structure: 100 LOC (JSX, conditional rendering, layout modes)

**Extracted hooks** (~515 LOC):
- useRovingTabIndex: 362 LOC (from wishlist, no changes needed)
- useAnnouncer: 153 LOC (from inspiration, no changes needed)

**Tests** (~400 LOC):
- SortableGallery unit tests: 250 LOC (rendering, drag logic, undo, keyboard, accessibility)
- E2E test: 100 LOC (happy path drag-and-drop in Playwright)
- Hook tests: 50 LOC (useRovingTabIndex, useAnnouncer)

**Documentation** (~200 LOC):
- Storybook stories: 150 LOC (4 stories: Basic, List Layout, Error Handling, Custom Overlay)
- README: 50 LOC (installation, usage, props API)

**Total**: ~1,715 LOC (matches seed estimate of ~1,700 LOC)

### Story Points Justification

**Seed recommendation**: 5 SP (or split into 3 SP + 2 SP)

**Justification for 5 SP as-is**:
- 34 acceptance criteria (high complexity)
- Extract 2 hooks from different apps (cross-app coordination)
- Generic TypeScript component (advanced type system usage)
- Comprehensive test coverage (80%+ target)
- E2E test requirement (per ADR-006)

**Justification for split** (recommended):
1. **REPA-007a: SortableGallery Core** - 3 SP
   - Core drag-and-drop (AC-1 to AC-13)
   - Undo flow (AC-14 to AC-18)
   - Error handling (AC-19 to AC-22)
   - Basic keyboard navigation (AC-23 to AC-24)
   - Grid layout only (AC-32)
   - Estimated LOC: ~1,000 LOC

2. **REPA-007b: Advanced Features** - 2 SP
   - Full keyboard navigation (AC-25 to AC-26)
   - Accessibility (AC-27 to AC-31)
   - List layout (AC-33)
   - Framer Motion animations (AC-34)
   - Extracted hooks (useRovingTabIndex, useAnnouncer)
   - Estimated LOC: ~700 LOC

**Recommendation**: Implement as single 5 SP story. Split only if development capacity is constrained.

---

## Implementation Strategy

### Phase 1: Core Component (Days 1-2)
1. Create SortableGallery component skeleton with TypeScript generic
2. Integrate dnd-kit DndContext, SortableContext, sensors
3. Implement basic drag-and-drop with onReorder callback
4. Write Zod schemas for props
5. Unit tests for drag logic

### Phase 2: Undo Flow (Day 3)
1. Add undo state management (useState or useRef)
2. Integrate sonner toast with Undo button
3. Implement rollback on error
4. Unit tests for undo/error flows

### Phase 3: Keyboard Navigation (Day 4)
1. Extract useRovingTabIndex from app-wishlist-gallery
2. Extract useAnnouncer from app-inspiration-gallery
3. Integrate hooks into SortableGallery
4. Unit tests for keyboard navigation

### Phase 4: Layouts and Accessibility (Day 5)
1. Implement grid layout (reuse GalleryGrid)
2. Implement list layout (vertical stacking)
3. Add ARIA attributes (role, aria-label, aria-live)
4. Accessibility tests (axe-core)

### Phase 5: E2E and Documentation (Day 6)
1. Write Playwright E2E test (happy path)
2. Create Storybook stories (4 examples)
3. Write README with API documentation
4. Run full test suite, fix coverage gaps

### Phase 6: App Migration (Days 7-8)
1. Refactor app-wishlist-gallery to use SortableGallery
2. Refactor app-inspiration-gallery to use SortableGallery
3. Delete duplicated components and hooks
4. Verify both apps work with new component

**Total estimate**: 8 developer-days (aligns with 5 SP if 1 SP ≈ 1.6 days)

---

## Dependency Analysis

### External Dependencies (Already Installed)

**@dnd-kit packages** (in @repo/gallery package.json):
- @dnd-kit/core: 6.3.1
- @dnd-kit/sortable: ^10.0.0 (note: caret version, may need update to latest stable)
- @dnd-kit/utilities: 3.2.2

**Action**: Verify @dnd-kit/sortable version compatibility (^10.0.0 vs latest 10.x)

**Other dependencies**:
- framer-motion: Already in @repo/gallery
- zod: Already in @repo/gallery
- sonner: Already in @repo/app-component-library

**No new dependencies required.**

### Internal Dependencies

**@repo/gallery** depends on:
- @repo/app-component-library (for Button, toast, design tokens)
- @repo/accessibility (will add useAnnouncer)

**@repo/accessibility** depends on:
- React (peer dependency)

**Circular dependency check**: None identified. @repo/accessibility is a leaf package.

---

## Rollout Plan

### Development Phase
1. Implement SortableGallery in @repo/gallery
2. Add Storybook stories for manual testing
3. Write Vitest + Playwright tests
4. Create PR with test evidence

### Integration Phase
1. Migrate app-wishlist-gallery to use SortableGallery
2. Migrate app-inspiration-gallery to use SortableGallery
3. Run E2E tests in both apps
4. Delete old implementations

### Rollback Plan
- If SortableGallery has critical bugs, apps can temporarily revert to old implementations (components not yet deleted)
- Once apps are stable, delete duplicated code in follow-up PR

**Risk**: No database migrations, no backend changes → Low rollback risk

---

## Completion Criteria

**Story is DONE when**:
1. SortableGallery component implemented with all 34 ACs passing
2. Test coverage ≥80% for core logic (drag, undo, keyboard, accessibility)
3. At least 1 Playwright E2E test passing (per ADR-006)
4. Storybook stories demonstrate common patterns
5. app-wishlist-gallery and app-inspiration-gallery successfully migrated (or migration plan documented if out of scope)
6. All quality gates pass (TypeScript, ESLint, tests)

**Evidence artifacts**:
- PR with passing CI checks
- Playwright video recording of E2E test
- Storybook deployed with new component examples
- Code review approved by 1+ reviewers

---

## Conclusion

**Verdict**: Feasible for MVP with high confidence.

**Recommendation**: Proceed with implementation as single 5 SP story. All required dependencies exist, patterns are proven in existing apps, and no blocking technical risks identified. Address non-MVP concerns in FUTURE-RISKS.md post-launch.
