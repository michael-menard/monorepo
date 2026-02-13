# Future Opportunities - REPA-007

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Virtual scrolling not supported | Medium | High | Galleries with 1000+ items will have performance issues. Defer to Q2 2026 or when first large gallery use case identified. Complex dnd-kit integration. |
| 2 | Single toast library coupling (sonner only) | Low | Medium | Apps with different toast libraries cannot use component. Add optional toastAdapter prop in Q1 2026 when first non-sonner app requests support. |
| 3 | No multi-select drag support | Low | High | Power users must drag items one-by-one. Defer to Q3 2026 based on user feedback. Complex state management, new AC set required. |
| 4 | No cross-gallery drag support | Low | High | Cannot reorganize items across categories (e.g., wishlist → album). Defer to Q4 2026 when use case identified. Requires shared DndContext, new API design. |
| 5 | Touch gesture conflicts not addressed | Low | Low | TouchSensor 300ms delay may conflict with swipe/pinch gestures in apps. Make delay configurable in Q2 2026 when first conflict reported. |
| 6 | SSR compatibility not tested | Medium | Low | May have issues with Next.js SSR (window/document dependencies). Test in Q1 2026 before Next.js adoption. Add SSR guards if needed. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Keyboard drag-and-drop (ARIA best practices) | High | High | Current keyboard nav is focus only, not drag initiation. Space/Enter to grab, arrows to move, Space to drop. **High priority for WCAG 2.1 AA compliance**. Target Q2 2026. |
| 2 | Reduced motion support (prefers-reduced-motion) | Medium | Low | Respect user preference for reduced animations. Use matchMedia API. WCAG 2.1 Success Criterion 2.3.3 (AAA). Add in next iteration if time permits. |
| 3 | Configurable toast position | Low | Low | Current bottom-right hardcoded. Add toastPosition prop (top-left, top-right, bottom-left, bottom-right). Nice-to-have, not urgent. |
| 4 | Custom toast components | Medium | Medium | Allow renderSuccessToast and renderErrorToast props for branded UI. Valuable for design consistency, defer to Q1 2026. |
| 5 | Drag handle flexibility | Low | Low | Document pattern in Storybook (use useSortable hook from dnd-kit). No API changes needed, just documentation. |
| 6 | Multi-level undo/redo (history stack) | Low | High | Current single-level undo only. Cmd+Z/Cmd+Shift+Z support. Defer to Q3 2026 based on power user feedback. |
| 7 | Auto-scroll to dropped item | Low | Low | Use scrollIntoView after drop for better UX when dropping far from viewport. Quick win, add in next iteration. |
| 8 | Built-in drag preview variants | Low | Medium | Provide ghost, solid, multi-item preview variants without custom renderDragOverlay. Design system extension. |
| 9 | Drop zone indicators (visual lines/boxes) | Low | Low | Clearer visual feedback for drop target. Use dnd-kit drop indicator APIs. Quick polish, add in next iteration. |
| 10 | Haptic feedback for mobile | Low | Low | Vibration API on touch drag start/drop. Tactile feedback for mobile users. Nice-to-have. |
| 11 | Grid column customization | Low | Low | Allow custom responsive column config (e.g., {sm: 2, md: 3, lg: 4, xl: 6}). Pass through to GalleryGrid. Quick enhancement. |
| 12 | Item spacing customization | Low | Low | Configurable gap (gap-2, gap-4, gap-6). Match app-specific design. Quick enhancement. |
| 13 | Empty state slot | Low | Low | renderEmptyState prop for custom empty UI. Better UX for empty galleries. Quick enhancement. |
| 14 | Loading state with skeletons | Low | Low | isLoading prop with skeletonCount and renderSkeleton. Better perceived performance. Quick enhancement. |
| 15 | Custom animation presets | Low | Medium | animationPreset prop (spring, fade, slide). Framer Motion configuration. Design system extension. |
| 16 | Dark mode styles | Low | Low | Built-in dark: utilities for drag overlay, indicators. Seamless dark mode integration. Quick enhancement. |
| 17 | Storybook playground | Low | Low | Interactive playground with all props configurable. Developer exploration tool. Document enhancement. |
| 18 | Performance benchmarking | Medium | Medium | Establish baselines for 10, 50, 100, 500, 1000 items. Helps developers choose solutions. Target Q2 2026. |
| 19 | Migration guide for existing apps | High | Low | Document how to migrate from DraggableWishlistGallery/DraggableInspirationGallery. **Critical for REPA-009, REPA-010**. Write in Q1 2026. |
| 20 | Error handling best practices guide | Medium | Low | Storybook examples for common error scenarios (network, validation, auth). Reduce developer confusion. Write in Q1 2026. |
| 21 | TypeScript generic wrapper examples | Medium | Low | Boilerplate for typed wrappers (e.g., SortableWishlistGallery). Reduce learning curve. Document in Q1 2026. |

## Categories

### Edge Cases
- Virtual scrolling for large galleries (Gap 1)
- Touch gesture conflicts (Gap 5)
- SSR compatibility (Gap 6)

### UX Polish
- Keyboard drag-and-drop (Enhancement 1) - **High priority**
- Reduced motion support (Enhancement 2)
- Custom toast components (Enhancement 4)
- Drag preview variants (Enhancement 8)
- Drop zone indicators (Enhancement 9)
- Haptic feedback (Enhancement 10)

### Performance
- Virtual scrolling integration (Gap 1) - Complex, defer until needed
- Performance benchmarking (Enhancement 18) - Document thresholds
- Framer Motion optimization (already in DEV-FEASIBILITY.md as Risk 5)

### Observability
- Error handling best practices guide (Enhancement 20)
- Performance benchmarking documentation (Enhancement 18)
- Accessibility documentation (already in FUTURE-UIUX.md)

### Integrations
- Toast adapter abstraction (Gap 2) - Extensibility for different toast libraries
- Multi-select drag (Gap 3) - Power user workflow
- Cross-gallery drag (Gap 4) - Advanced use case
- SSR support (Gap 6) - Next.js compatibility

### Documentation
- Migration guide (Enhancement 19) - **Critical for dependent stories**
- Error handling guide (Enhancement 20)
- TypeScript generic examples (Enhancement 21)
- Storybook playground (Enhancement 17)
- Accessibility documentation (already in FUTURE-UIUX.md)

---

## Priority Tiers

### Tier 1 (High Impact, Low Effort) - Quick Wins
- Reduced motion support (Enhancement 2)
- Auto-scroll to dropped item (Enhancement 7)
- Drop zone indicators (Enhancement 9)
- Empty state slot (Enhancement 13)
- Loading state (Enhancement 14)
- Dark mode styles (Enhancement 16)
- Migration guide (Enhancement 19) - **Blocking for REPA-009, REPA-010**

### Tier 2 (High Impact, Medium/High Effort) - Strategic
- Keyboard drag-and-drop (Enhancement 1) - **Accessibility compliance**
- SSR compatibility (Gap 6) - **Blocking for Next.js adoption**
- Toast adapter abstraction (Gap 2) - Extensibility
- Custom toast components (Enhancement 4)
- Performance benchmarking (Enhancement 18)
- Error handling guide (Enhancement 20)
- TypeScript generic examples (Enhancement 21)

### Tier 3 (Low Impact, Low Effort) - Nice-to-Haves
- Configurable toast position (Enhancement 3)
- Drag handle flexibility documentation (Enhancement 5)
- Grid column customization (Enhancement 11)
- Item spacing customization (Enhancement 12)
- Custom animation presets (Enhancement 15)
- Storybook playground (Enhancement 17)
- Haptic feedback (Enhancement 10)

### Tier 4 (Low Impact, High Effort) - Defer Until Needed
- Virtual scrolling (Gap 1) - Wait for large gallery use case
- Multi-select drag (Gap 3) - Wait for user feedback
- Cross-gallery drag (Gap 4) - Wait for use case
- Multi-level undo/redo (Enhancement 6) - Wait for power user feedback
- Built-in drag preview variants (Enhancement 8) - Design system work

---

## Recommended Roadmap

### Q1 2026 (Post-MVP Launch)
- Migration guide (Enhancement 19) - **Must-have for REPA-009, REPA-010**
- Error handling guide (Enhancement 20)
- TypeScript generic examples (Enhancement 21)
- SSR compatibility testing (Gap 6) - **Before Next.js adoption**
- Toast adapter abstraction (Gap 2)

### Q2 2026 (Accessibility & Performance)
- Keyboard drag-and-drop (Enhancement 1) - **WCAG 2.1 AA compliance**
- Performance benchmarking (Enhancement 18)
- Touch gesture config (Gap 5)
- Reduced motion support (Enhancement 2)

### Q3 2026 (Power User Features)
- Multi-select drag (Gap 3) - **If user feedback indicates need**
- Multi-level undo/redo (Enhancement 6)
- Custom toast components (Enhancement 4)

### Q4 2026 (Advanced Features)
- Cross-gallery drag (Gap 4) - **If use case identified**
- Virtual scrolling (Gap 1) - **If large gallery use case identified**
- Built-in drag preview variants (Enhancement 8)

### Anytime (Quick Wins)
- Reduced motion support (Enhancement 2)
- Auto-scroll to dropped item (Enhancement 7)
- Drop zone indicators (Enhancement 9)
- Empty state slot (Enhancement 13)
- Loading state (Enhancement 14)
- Dark mode styles (Enhancement 16)
- Grid/spacing customization (Enhancement 11, 12)
