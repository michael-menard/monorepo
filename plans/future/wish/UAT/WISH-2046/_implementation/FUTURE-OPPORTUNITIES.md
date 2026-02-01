# Future Opportunities - WISH-2046

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Per-image preset selection**: Story non-goal states preset applies globally. Users may want different presets for showcase vs. progress images. | Low - Most users will stick with one preset | Medium - Requires UI redesign to move preset selector next to each upload, state management per image | Future story: Allow per-image preset override in multi-image upload scenarios |
| 2 | **Preset validation edge case**: If "High quality" preset produces files > 10MB (MAX_FILE_SIZE), story mentions fallback to "Balanced" but doesn't specify error messaging or user notification | Low - Unlikely scenario given 2MB target, but possible with complex images | Low - Add validation after compression, user notification if fallback occurs | Add toast notification: "Image too large even with compression. Switched to Balanced preset." |
| 3 | **Estimated sizes are approximations**: Story acknowledges estimates vary by image content but doesn't specify how estimates are calculated or displayed | Low - Users understand estimates are approximate | Low - Consider adding "(estimated)" suffix or info tooltip | Add info icon with tooltip explaining estimates vary by image type |
| 4 | **Preset interaction with already-small images**: Current `shouldSkipCompression` logic skips images < 500KB. Unclear if preset selection still applies or if user sees feedback | Medium - User confusion if preset appears to have no effect | Low - Add toast feedback when compression is skipped | Toast message: "Image already optimized (<500KB). Compression skipped." |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Dynamic preset recommendations**: Story non-goal excludes network-based recommendations, but could analyze user's upload history to suggest presets | Medium - Personalized UX improvement | High - Requires analytics, ML model, or heuristic engine | Phase 5+: "You typically upload large images. Try High quality preset?" |
| 2 | **Custom preset creation**: Story non-goal excludes custom presets, but power users may want fine-grained control | Low - Advanced feature for minority of users | Medium - UI for custom quality/dimension sliders, validation, storage | Future story: "Advanced mode" with custom compression settings |
| 3 | **Preset preview with actual image**: Show real-time preview of compression result for selected preset before upload | High - Helps users make informed decisions | High - Requires client-side compression preview, split file processing | Future story: Side-by-side image comparison with quality/size trade-offs |
| 4 | **Compression telemetry per preset**: Track which presets are most used, average compression ratios, failure rates per preset | Medium - Informs future preset tuning | Low - Add telemetry events in compression flow | Integrate with WISH-2023 (deferred) telemetry tracking |
| 5 | **Preset labels internationalization**: Hardcoded English labels ("Low bandwidth", "Balanced", "High quality") | Low - Only matters if app goes multilingual | Low - Use i18n keys instead of hardcoded strings | Future: Replace with `t('preset.lowBandwidth')` pattern |
| 6 | **Visual preset indicator in form**: Beyond radio buttons/dropdown, show visual icon or badge for selected preset | Low - Minor UX polish | Low - Add icon to selected preset option | Phase 4 polish: WiFi icon for Low bandwidth, Star for High quality, etc. |
| 7 | **Preset export/import for multi-device users**: Allow users to sync preferences across devices | Low - Niche use case | Medium - Requires backend preference storage or export/import UI | Future story: User preferences sync via backend |

## Categories

### Edge Cases
- Finding #2: Preset validation when fallback to "Balanced" occurs
- Finding #3: Estimated size calculation and display
- Finding #4: Preset interaction with auto-skip logic for small images

### UX Polish
- Finding #1: Per-image preset selection for advanced workflows
- Enhancement #1: Dynamic preset recommendations based on usage patterns
- Enhancement #3: Real-time compression preview before upload
- Enhancement #6: Visual preset indicators (icons/badges)

### Performance
- Enhancement #3: Preview requires additional client-side processing but improves decision-making

### Observability
- Enhancement #4: Compression telemetry per preset to inform future tuning

### Integrations
- Enhancement #4: Integration with WISH-2023 (deferred) telemetry feature
- Enhancement #7: Integration with future user preferences backend storage

### Future-Proofing
- Enhancement #2: Custom preset creation for power users
- Enhancement #5: Internationalization for preset labels
- Enhancement #7: Multi-device preference sync
