# Future Opportunities - WISH-2006

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | WCAG AAA compliance (7:1 contrast) | Low | Medium | Deferred per Non-goals. Consider future story for WCAG AAA if required by enterprise customers or legal requirements. |
| 2 | Automated screen reader testing (@guidepup) | Medium | High | Story correctly defers to manual testing. Consider future story to add automated screen reader tests when @guidepup library matures. Would improve CI reliability for accessibility. |
| 3 | Advanced ARIA features (landmarks, skip links, heading hierarchy) | Medium | Medium | Deferred per Non-goals. Consider future story to add semantic landmarks and skip navigation links for complex pages. Would benefit users navigating large galleries. |
| 4 | Voice control support | Low | High | Deferred per Non-goals. Consider future story if user research indicates demand for voice commands (e.g., "Add to wishlist", "Mark as purchased"). |
| 5 | Custom keyboard shortcut configuration | Low | Medium | Deferred per Non-goals. Consider future story to allow users to remap shortcuts to avoid conflicts with assistive technology. |
| 6 | High contrast theme or forced colors mode | Medium | Medium | Deferred per Non-goals. Consider future story to add Windows High Contrast Mode support and CSS forced-colors media query. Would benefit low-vision users. |
| 7 | Focus indicator customization | Low | Low | Current story uses `ring-2 ring-sky-500 ring-offset-2` globally. Consider future story to allow users to customize focus ring color/style for better visibility based on individual needs. |
| 8 | Keyboard navigation hints/tooltips | Medium | Low | Story includes keyboard shortcuts but no discovery mechanism. Consider adding tooltip hints on first visit: "Press A to add item, G to mark as got it". Would improve discoverability. |
| 9 | Reduced motion preference support | Medium | Low | Story doesn't address `prefers-reduced-motion` media query. Consider future story to disable/simplify animations for users with motion sensitivity. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Migrate accessibility hooks to @repo/accessibility | High | Medium | Story correctly creates app-local utilities first. Once proven in production, migrate useRovingTabIndex, useKeyboardShortcuts, useAnnouncer to shared @repo/accessibility package for reuse across apps. |
| 2 | React Aria GridCollection integration | Medium | Medium | Story includes fallback to simplify navigation if 2D grid proves complex. Consider using Adobe's react-aria GridCollection for more robust grid keyboard navigation with built-in ARIA support. Trade-off: adds dependency but reduces custom code. |
| 3 | Focus visible polyfill for older browsers | Low | Low | Modern browsers support :focus-visible, but older browsers may show focus ring on mouse click. Consider polyfill if user analytics show significant older browser usage. |
| 4 | Keyboard navigation metrics/analytics | Medium | Low | Track keyboard shortcut usage and navigation patterns to understand adoption and identify pain points. Data would inform future accessibility improvements. |
| 5 | Accessibility testing in visual regression suite | Medium | Medium | Current story uses Playwright screenshots for focus states. Consider integrating axe-core results into visual regression reports for continuous accessibility monitoring. |
| 6 | Screen reader testing cloud service integration | High | Medium | Story notes manual screen reader testing is best-effort. Consider budget for Assistiv Labs or similar service for consistent VoiceOver/NVDA testing across platforms in CI. |
| 7 | Keyboard navigation documentation page | Low | Low | Story documents shortcuts in code but no user-facing help page. Consider adding /help or /accessibility page explaining keyboard shortcuts and navigation. |
| 8 | Accessibility conformance statement | Low | Low | Once WCAG AA compliance verified, publish accessibility statement page listing supported features and conformance level. Builds trust with accessibility-conscious users. |

## Categories

**Edge Cases:**
- Empty gallery keyboard navigation (handled in Error Case 1)
- Single item gallery (handled in Edge Case 1)
- Rapid keypress handling (handled in Edge Case 2)

**UX Polish:**
- Keyboard navigation hints/tooltips (#8 above)
- Custom keyboard shortcuts (#5 above)
- Focus indicator customization (#7 above)
- Accessibility documentation page (#7 above)

**Performance:**
- No significant performance concerns. ResizeObserver and keyboard event listeners are lightweight.

**Observability:**
- Keyboard navigation metrics (#4 above)
- Accessibility testing in visual regression (#5 above)

**Integrations:**
- React Aria GridCollection (#2 above)
- Screen reader testing cloud service (#6 above)
- Focus visible polyfill (#3 above)

**Future-Proofing:**
- Migrate to @repo/accessibility (#1 above)
- WCAG AAA compliance (#1 in Gaps)
- Advanced ARIA features (#3 in Gaps)
- High contrast theme (#6 in Gaps)
- Reduced motion support (#9 in Gaps)
