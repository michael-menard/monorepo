# Pending KB Entries - REPA-007

Generated: 2026-02-10T19:35:00Z

This document tracks all non-blocking findings and enhancement opportunities that should be written to the Knowledge Base. These entries were identified during autonomous elaboration analysis.

## Non-Blocking Gaps (6 entries)

### Gap 1: Virtual Scrolling Not Supported
- **Category**: edge-case, performance, optimization
- **Impact**: Medium | **Effort**: High
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Galleries with 1000+ items will have performance issues. Virtual scrolling not supported in MVP.
- **Recommendation**: Defer to Q2 2026 or when first large gallery use case identified. Complex dnd-kit integration requires significant research and testing.
- **Tags**: edge-case, future-work, performance, virtual-scrolling

### Gap 2: Single Toast Library Coupling (sonner only)
- **Category**: integration, extensibility
- **Impact**: Low | **Effort**: Medium
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Apps with different toast libraries cannot use SortableGallery component. Currently coupled to sonner only.
- **Recommendation**: Add optional toastAdapter prop in Q1 2026 when first non-sonner app requests support. Adapter pattern allows different toast implementations.
- **Tags**: integration, extensibility, toast, sonner

### Gap 3: No Multi-Select Drag Support
- **Category**: enhancement, power-user
- **Impact**: Low | **Effort**: High
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Power users must drag items one-by-one. Cannot select multiple items and drag as group.
- **Recommendation**: Defer to Q3 2026 based on user feedback. Complex state management requires new AC set and API design. Track user requests before committing.
- **Tags**: enhancement, power-user, multi-select, future-work

### Gap 4: No Cross-Gallery Drag Support
- **Category**: enhancement, advanced-feature
- **Impact**: Low | **Effort**: High
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Cannot reorganize items across categories (e.g., wishlist to album, inspiration to sets). Single gallery reordering only.
- **Recommendation**: Defer to Q4 2026 when use case identified. Requires shared DndContext, complex state coordination, and new API design. Wait for concrete user need.
- **Tags**: enhancement, advanced-feature, cross-gallery, future-work

### Gap 5: Touch Gesture Conflicts Not Addressed
- **Category**: edge-case, mobile
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: TouchSensor 300ms delay may conflict with swipe/pinch gestures in apps with overlapping touch interactions.
- **Recommendation**: Make delay configurable in Q2 2026 when first conflict reported. Quick fix via sensorConfig prop enhancement.
- **Tags**: edge-case, mobile, touch, gesture-conflict

### Gap 6: SSR Compatibility Not Tested
- **Category**: integration, ssr
- **Impact**: Medium | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: May have issues with Next.js SSR due to window/document dependencies in dnd-kit and ResizeObserver usage.
- **Recommendation**: Test in Q1 2026 before Next.js adoption. Add SSR guards if needed (dynamic imports, typeof window checks). Blocking for Next.js migration.
- **Tags**: integration, ssr, nextjs, compatibility

## Enhancement Opportunities (21 entries)

### Enhancement 1: Keyboard Drag-and-Drop (ARIA Best Practices)
- **Category**: accessibility, wcag
- **Impact**: High | **Effort**: High
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Current keyboard nav is focus only, not drag initiation. ARIA best practices require Space/Enter to grab item, arrow keys to move, Space to drop.
- **Recommendation**: High priority for WCAG 2.1 AA compliance. Target Q2 2026. Research dnd-kit keyboard sensor patterns and ARIA authoring practices.
- **Tags**: accessibility, wcag, keyboard, high-priority, a11y

### Enhancement 2: Reduced Motion Support (prefers-reduced-motion)
- **Category**: accessibility, animation
- **Impact**: Medium | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Respect user preference for reduced animations. WCAG 2.1 Success Criterion 2.3.3 (AAA).
- **Recommendation**: Quick win - add in next iteration if time permits. Use matchMedia API to detect prefers-reduced-motion and disable Framer Motion animations.
- **Tags**: accessibility, animation, reduced-motion, wcag, quick-win

### Enhancement 3: Configurable Toast Position
- **Category**: ux-polish, customization
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Current bottom-right toast position is hardcoded via sonner defaults.
- **Recommendation**: Nice-to-have. Add toastPosition prop (top-left, top-right, bottom-left, bottom-right) for positional flexibility.
- **Tags**: ux-polish, customization, toast, quick-win

### Enhancement 4: Custom Toast Components
- **Category**: ux-polish, customization
- **Impact**: Medium | **Effort**: Medium
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Allow renderSuccessToast and renderErrorToast props for branded UI.
- **Recommendation**: Valuable for design consistency. Defer to Q1 2026. Provides full control over toast appearance while maintaining default behavior.
- **Tags**: ux-polish, customization, toast, branding

### Enhancement 5: Drag Handle Flexibility
- **Category**: documentation
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Document pattern in Storybook for implementing custom drag handles.
- **Recommendation**: No API changes needed, just documentation. Use useSortable hook from dnd-kit directly in renderItem. Provide Storybook example.
- **Tags**: documentation, storybook, drag-handle, quick-win

### Enhancement 6: Multi-Level Undo/Redo (History Stack)
- **Category**: power-user, advanced-feature
- **Impact**: Low | **Effort**: High
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Current single-level undo only. Cmd+Z/Cmd+Shift+Z support for history stack.
- **Recommendation**: Power user feature. Defer to Q3 2026 based on feedback. Complex state management, keyboard event handling, and UX design required.
- **Tags**: power-user, advanced-feature, undo, history

### Enhancement 7: Auto-Scroll to Dropped Item
- **Category**: ux-polish
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Use scrollIntoView after drop for better UX when dropping far from viewport.
- **Recommendation**: Quick win for better UX. Add in next iteration. Simple implementation with immediate user benefit.
- **Tags**: ux-polish, scroll, quick-win

### Enhancement 8: Built-in Drag Preview Variants
- **Category**: design-system, customization
- **Impact**: Low | **Effort**: Medium
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Provide ghost, solid, multi-item preview variants without requiring custom renderDragOverlay.
- **Recommendation**: Design system extension. Provides common patterns out-of-box while maintaining flexibility.
- **Tags**: design-system, customization, drag-preview

### Enhancement 9: Drop Zone Indicators (Visual Lines/Boxes)
- **Category**: ux-polish, visual-feedback
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Clearer visual feedback for drop target with lines/boxes between items.
- **Recommendation**: Quick polish. Use dnd-kit drop indicator APIs. Improves drag clarity.
- **Tags**: ux-polish, visual-feedback, drop-indicator, quick-win

### Enhancement 10: Haptic Feedback for Mobile
- **Category**: mobile, ux-polish
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Vibration API on touch drag start/drop for tactile feedback.
- **Recommendation**: Nice-to-have tactile feedback for mobile users. Check browser compatibility before implementing.
- **Tags**: mobile, ux-polish, haptic, vibration, quick-win

### Enhancement 11: Grid Column Customization
- **Category**: customization, responsive
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Allow custom responsive column config (e.g., {sm: 2, md: 3, lg: 4, xl: 6}).
- **Recommendation**: Quick enhancement. Pass through to GalleryGrid component. Provides app-specific layout control.
- **Tags**: customization, responsive, grid, quick-win

### Enhancement 12: Item Spacing Customization
- **Category**: customization, design-system
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Configurable gap values (gap-2, gap-4, gap-6) for app-specific design.
- **Recommendation**: Quick enhancement for app-specific design needs. Simple prop pass-through.
- **Tags**: customization, design-system, spacing, quick-win

### Enhancement 13: Empty State Slot
- **Category**: ux-polish
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: renderEmptyState prop for custom empty UI when items array is empty.
- **Recommendation**: Better UX for empty galleries. Quick enhancement with clear user benefit.
- **Tags**: ux-polish, empty-state, quick-win

### Enhancement 14: Loading State with Skeletons
- **Category**: ux-polish, performance
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: isLoading prop with skeletonCount and renderSkeleton for loading states.
- **Recommendation**: Better perceived performance during data fetch. Quick enhancement.
- **Tags**: ux-polish, performance, loading, skeleton, quick-win

### Enhancement 15: Custom Animation Presets
- **Category**: design-system, animation
- **Impact**: Low | **Effort**: Medium
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: animationPreset prop (spring, fade, slide) for different animation styles.
- **Recommendation**: Design system extension. Framer Motion configuration presets.
- **Tags**: design-system, animation, framer-motion, customization

### Enhancement 16: Dark Mode Styles
- **Category**: design-system, theming
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Built-in dark: utilities for drag overlay, drop indicators for seamless dark mode integration.
- **Recommendation**: Quick enhancement. Use Tailwind dark mode classes consistently.
- **Tags**: design-system, theming, dark-mode, quick-win

### Enhancement 17: Storybook Playground
- **Category**: documentation, developer-experience
- **Impact**: Low | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Interactive playground with all props configurable for developer exploration.
- **Recommendation**: Developer exploration tool. Document enhancement. Use Storybook controls addon.
- **Tags**: documentation, storybook, playground, developer-experience, quick-win

### Enhancement 18: Performance Benchmarking
- **Category**: performance, documentation
- **Impact**: Medium | **Effort**: Medium
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Establish baselines for 10, 50, 100, 500, 1000 items to help developers choose solutions.
- **Recommendation**: Target Q2 2026. Measure render time, drag performance, memory usage. Document thresholds.
- **Tags**: performance, documentation, benchmarking

### Enhancement 19: Migration Guide for Existing Apps
- **Category**: documentation, migration
- **Impact**: High | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Document how to migrate from DraggableWishlistGallery/DraggableInspirationGallery to SortableGallery.
- **Recommendation**: Critical for REPA-009, REPA-010. Write in Q1 2026. Blocking for dependent stories. Include code examples and gotchas.
- **Tags**: documentation, migration, critical, repa-009, repa-010

### Enhancement 20: Error Handling Best Practices Guide
- **Category**: documentation, error-handling
- **Impact**: Medium | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Storybook examples for common error scenarios (network failure, validation error, auth error).
- **Recommendation**: Reduce developer confusion. Write in Q1 2026. Show real-world patterns.
- **Tags**: documentation, error-handling, storybook, best-practices

### Enhancement 21: TypeScript Generic Wrapper Examples
- **Category**: documentation, typescript
- **Impact**: Medium | **Effort**: Low
- **Story**: REPA-007
- **Stage**: elab
- **Finding**: Boilerplate for typed wrappers (e.g., SortableWishlistGallery) to reduce learning curve.
- **Recommendation**: Reduce learning curve for TypeScript generic usage. Document in Q1 2026. Provide copy-paste examples.
- **Tags**: documentation, typescript, generics, developer-experience

---

## Priority Summary

### Tier 1: High Impact, Low Effort (Quick Wins)
- Enhancement 2: Reduced motion support
- Enhancement 7: Auto-scroll to dropped item
- Enhancement 9: Drop zone indicators
- Enhancement 13: Empty state slot
- Enhancement 14: Loading state
- Enhancement 16: Dark mode styles
- Enhancement 19: Migration guide (CRITICAL for REPA-009, REPA-010)

### Tier 2: High Impact, Medium/High Effort (Strategic)
- Enhancement 1: Keyboard drag-and-drop (ACCESSIBILITY COMPLIANCE)
- Gap 6: SSR compatibility (BLOCKING for Next.js adoption)
- Gap 2: Toast adapter abstraction
- Enhancement 4: Custom toast components
- Enhancement 18: Performance benchmarking
- Enhancement 20: Error handling guide
- Enhancement 21: TypeScript generic examples

### Tier 3: Low Impact, Low Effort (Nice-to-Haves)
- Enhancement 3: Configurable toast position
- Enhancement 5: Drag handle flexibility documentation
- Enhancement 11: Grid column customization
- Enhancement 12: Item spacing customization
- Enhancement 15: Custom animation presets
- Enhancement 17: Storybook playground
- Enhancement 10: Haptic feedback

### Tier 4: Low Impact, High Effort (Defer Until Needed)
- Gap 1: Virtual scrolling
- Gap 3: Multi-select drag
- Gap 4: Cross-gallery drag
- Enhancement 6: Multi-level undo/redo
- Enhancement 8: Built-in drag preview variants

---

## Notes

- All 27 entries are non-blocking for MVP
- No MVP-critical gaps were identified
- 3 entries are marked as high-priority for future work:
  - Enhancement 1: Keyboard drag-and-drop (WCAG 2.1 AA)
  - Enhancement 19: Migration guide (blocking for REPA-009, REPA-010)
  - Gap 6: SSR compatibility (blocking for Next.js adoption)
- KB write functionality was not available during autonomous decision phase
- These entries should be processed manually or via future KB automation
