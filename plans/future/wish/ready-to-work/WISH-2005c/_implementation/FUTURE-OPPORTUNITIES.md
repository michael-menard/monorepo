# Future Opportunities - WISH-2005c

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Drag preview positioning customization | Low | Medium | Allow users to configure preview offset from cursor (currently fixed at 10px right, 10px down). Could be stored in localStorage or user preferences. Deferred to settings/personalization phase. |
| 2 | Preview thumbnail size variation | Low | Low | AC 1 specifies 70% scale but some users may prefer larger/smaller previews. Consider adding preview size preference (50%, 70%, 90%). Deferred to WISH-2006 or settings phase. |
| 3 | Missing image placeholder customization | Low | Low | AC 5 specifies Package icon from Lucide. Consider allowing custom fallback icons or user-uploaded placeholder images. Deferred to advanced customization. |
| 4 | Long title tooltip activation timing | Low | Low | AC 6 specifies 500ms hover delay for tooltip on truncated titles. User research might show 300ms or 700ms is more appropriate. Consider A/B testing if engagement metrics warrant. |
| 5 | Thumbnail caching strategy documentation | Medium | Low | AC 8 mentions caching but doesn't specify browser cache vs. service worker vs. RTK Query cache. Document caching strategy in implementation for future optimization reference. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Preview animation variants | Medium | Medium | Beyond fade-in/fade-out (150ms), consider entrance animations like scale-up (grow from 0.5 to 0.7) or slide-in. Could add personality to drag interactions. Deferred to WISH-2005f (Spring physics animations). |
| 2 | Multi-item drag preview | High | High | If multi-select reordering is implemented (out-of-scope for WISH-2005a), drag preview needs to show count badge ("3 items") instead of single item preview. Defer to multi-select story. |
| 3 | Preview shadow customization | Low | Low | AC 1 mentions shadow-lg for visual lift. Consider adjusting shadow intensity based on drag depth or user preference. Could enhance z-axis perception. Deferred to design system polish phase. |
| 4 | Preview rotation on drag | Medium | Medium | Subtle rotation (2-5 degrees) during drag could enhance physicality of interaction. Matches real-world card shuffling behavior. Experiment in WISH-2005f (physics animations). |
| 5 | Preview border highlight | Low | Low | Add colored border to preview (e.g., primary color) to further distinguish from original card during drag. Could improve visual clarity on busy backgrounds. |
| 6 | Accessibility: High contrast mode preview | Medium | Low | Ensure drag preview maintains sufficient contrast in high contrast mode (Windows High Contrast, macOS Increase Contrast). Test opacity settings and shadow visibility. Deferred to WISH-2006 accessibility audit. |
| 7 | Performance: Lazy load preview component | Low | Medium | WishlistDragPreview could be code-split and lazy-loaded since it's only needed during drag operations. Reduces initial bundle size by ~2-3KB. Deferred to performance optimization phase. |
| 8 | Analytics: Track preview engagement | Low | Low | Measure whether users with drag preview enabled (via feature flag A/B test) have higher reorder completion rates vs. generic ghost preview. Deferred to WISH-2005g (analytics integration). |
| 9 | Preview content customization | Medium | High | Allow users to customize what appears in preview (image only, image + title, image + title + price, etc.). Preference stored in localStorage. Deferred to advanced personalization. |
| 10 | Cross-item preview comparison | High | High | When dragging item A over item B, briefly show both items side-by-side in preview (500ms delay) to help users compare priority/price. Advanced UX pattern requiring research. |

## Categories

### Edge Cases
- Preview positioning at viewport boundaries (clamp preview to stay within viewport)
- Very long titles (> 100 chars) causing preview width overflow
- Missing image with very long title causing preview height overflow
- Drag preview on ultra-wide monitors (preview may appear too far from cursor)

### UX Polish
- Preview animation variants (scale-up, slide-in)
- Preview rotation during drag (physicality)
- Border highlight for visual distinction
- Content customization (what to show in preview)
- Positioning customization (offset from cursor)

### Performance
- Lazy load preview component (code-splitting)
- Optimize image caching strategy (browser cache vs. service worker)
- Reduce preview re-renders during rapid drag movements
- Memoize preview component to avoid recalculating styles

### Observability
- Track drag preview engagement (completion rates)
- Measure preview load time (first render during drag start)
- Monitor thumbnail cache hit rate
- Log preview rendering errors (missing images, layout issues)

### Integrations
- Integrate with WISH-2005g analytics (reorder event tracking)
- Coordinate with WISH-2005f physics animations (shared animation config)
- Consider WISH-2005e drop zone visual feedback (preview highlight on valid drop)

## Follow-up Story Candidates

1. **Preview Content Customization** (Medium priority, High effort)
   - Allow users to configure preview content via settings
   - Impact: Medium (power users benefit)
   - Effort: High (requires settings UI, localStorage, migration logic)

2. **Multi-Item Drag Preview** (High priority, High effort)
   - Required if/when multi-select reordering is implemented
   - Impact: High (blocks multi-select UX)
   - Effort: High (badge overlay, count logic, layout adjustments)

3. **Preview Performance Optimization** (Low priority, Medium effort)
   - Code-splitting, lazy loading, cache strategy refinement
   - Impact: Low (bundle size reduction, marginal performance gain)
   - Effort: Medium (requires build config changes, testing)

4. **Accessibility Audit: High Contrast Mode** (Medium priority, Low effort)
   - Ensure preview visibility in high contrast modes
   - Impact: Medium (a11y compliance, WCAG AAA)
   - Effort: Low (CSS adjustments, testing)
