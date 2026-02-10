# Future Opportunities - WISH-2049

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Edge case: Rapid checkbox toggling during compression | Low | Low | If user rapidly toggles "High quality" checkbox while compression is running, current spec doesn't define behavior. Recommend: ignore checkbox changes during active compression, or cancel + restart with new preference. |
| 2 | Edge case: Browser tab backgrounding during compression | Low | Medium | If user backgrounds tab during compression, web worker continues but may be throttled. Consider detecting tab visibility changes and pausing/resuming compression progress updates. |
| 3 | Edge case: Network offline during background compression | Low | Low | If compression completes while offline, user can't submit. Consider detecting offline state and showing appropriate messaging before form submission. |
| 4 | Memory management for large images | Medium | Medium | Multiple rapid image selections could accumulate memory (old File objects, preview URLs). Consider explicit cleanup of object URLs and File references when image changes. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Status | Recommendation |
|---|---------|--------|--------|--------|----------------|
| 1 | UX polish: Visual compression indicator on image preview | Medium | Low | Not Reviewed | Instead of only showing toast when complete, add subtle visual indicator (e.g., shimmer effect, small badge) to image preview while compression is in progress. Reinforces that work is happening in background. |
| 2 | UX polish: Compression time estimation | Low | Medium | Not Reviewed | Based on image size and past compression times, show estimated time remaining ("~3 seconds remaining"). Requires tracking compression performance metrics. |
| 3 | Performance: Compression caching | Medium | High | Not Reviewed | If user selects same image multiple times (e.g., cancel/retry), cache compressed result keyed by file hash. Instant "compression" on subsequent selections. Requires cache invalidation strategy and memory management. |
| 4 | Performance: Preemptive compression quality adjustment | Medium | High | Not Reviewed | If compression is still running when user submits, dynamically reduce quality target to finish faster. Trade compression ratio for latency in time-sensitive scenarios. |
| 5 | Observability: Track background compression success rate | Low | Low | Not Reviewed | Add analytics event for background compression completion vs. submission timing. Measure how often compression finishes before form submit (success metric for this story). |
| 6 | Observability: Compression performance metrics | Low | Medium | Not Reviewed | Track compression duration by image size/format. Identify patterns where compression takes longer than expected form fill time. Informs future compression setting tuning. |
| 7 | Accessibility: Screen reader announcement for compression completion | Medium | Low | Not Reviewed | Currently toast is visual-only. Consider aria-live region or subtle audio cue when background compression completes for screen reader users. |
| 8 | Integration: Extend to multi-image upload | High | High | Not Reviewed | If/when multi-image upload is implemented (currently Non-goal per AC), background compression becomes even more valuable. Each image could compress independently in parallel web workers. |

## Categories

### Edge Cases
- Rapid checkbox toggling (Gap #1)
- Browser tab backgrounding (Gap #2)
- Network offline during compression (Gap #3)
- Memory management for rapid image changes (Gap #4)

### UX Polish
- Visual compression indicator on preview (Enhancement #1)
- Compression time estimation (Enhancement #2)
- Screen reader announcement (Enhancement #7)

### Performance
- Compression caching for repeated selections (Enhancement #3)
- Preemptive quality adjustment (Enhancement #4)

### Observability
- Background compression success rate tracking (Enhancement #5)
- Compression performance metrics (Enhancement #6)

### Integrations
- Multi-image upload support (Enhancement #8) - future story dependency

## Notes

**Highest-Value Future Enhancement:**
Enhancement #1 (Visual compression indicator) provides immediate user feedback with minimal effort. Shows "smart" behavior and reduces perceived idle time even further.

**Recommended Observability:**
Enhancement #5 (success rate tracking) validates this story's value hypothesis (62% perceived latency reduction). Should be added to verify actual user behavior matches assumptions about form fill time.

**Deferred Complexity:**
Enhancements #3 and #4 (caching, quality adjustment) add significant complexity for edge-case benefits. Only pursue if telemetry shows users frequently re-selecting images or submitting before compression completes.
