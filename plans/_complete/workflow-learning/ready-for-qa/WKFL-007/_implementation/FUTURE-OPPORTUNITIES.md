# Future Opportunities - WKFL-007

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Review cycles output type inconsistency (story.yaml shows 2.3, main story requires integer) | Low | Low | Align to integer in all locations, remove decimal from story.yaml example |
| 2 | No guidance on what to do when predictions consistently wrong | Medium | Medium | Add self-monitoring: if accuracy < 50% for 5+ stories, flag for human review |
| 3 | Pattern boost values (+0.2, +0.1) appear arbitrary | Low | Low | Document as "initial heuristics, to be tuned based on WKFL-002 calibration data" |
| 4 | No upper bound on similar_stories query time | Medium | Low | Add timeout to KB queries (10 seconds mentioned in feasibility but not in AC) |
| 5 | Epic average calculation not fully defined | Medium | Medium | Specify: query all OUTCOME.yaml in epic, calculate median tokens, cache for reuse |
| 6 | Confidence thresholds partially specified | Medium | Low | Formalize: 5+ stories + patterns = high, 3-4 stories OR patterns = medium, else low |
| 7 | No versioning for prediction algorithm changes | Medium | Medium | Add `wkfl_version` to track algorithm iterations (already in output schema as "007-v1") |
| 8 | Accuracy tracking trigger not specified | High | Low | Add to dev-documentation-leader as final step when writing OUTCOME.yaml |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No visualization of prediction accuracy trends | Medium | High | Add monthly dashboard showing accuracy trends over time (requires WKFL-010 or separate tooling) |
| 2 | Similar stories limited to 5, no explanation why | Low | Low | Consider making limit configurable (3-10 range) based on KB result quality |
| 3 | No prediction refresh when story scope changes mid-elaboration | Medium | Medium | Add re-prediction trigger if story split or scope significantly changes |
| 4 | Token estimate only uses median, ignores variance | Medium | Medium | Include confidence interval in prediction (e.g., "150K-200K tokens, 80% confidence") |
| 5 | No differentiation between epic types | Medium | High | Future: epic-specific prediction models (auth stories vs CRUD vs UI-only) |
| 6 | Predictions don't influence PM decisions automatically | High | High | Future: if split_risk > 0.8, auto-suggest story splitting in PM pipeline |
| 7 | No feedback loop from PM on prediction usefulness | Medium | Medium | Add `/prediction-feedback` command to capture "was this prediction helpful?" |
| 8 | Pattern matching is keyword-based, not semantic | Medium | High | Use KB embedding similarity for scope matching instead of keyword search |
| 9 | No prediction for specific risk types | Medium | High | Future: predict specific risks (auth failure, DB migration, etc.) not just split/cycles/tokens |
| 10 | Accuracy tracking only stores to KB, no aggregation | Medium | Medium | Add monthly accuracy report generation (similar to WKFL-006 pattern mining) |
| 11 | No A/B testing of prediction algorithms | High | High | Use WKFL-008 to test algorithm variations (e.g., weighted vs median for tokens) |
| 12 | Fallback values hardcoded, not data-driven | Medium | Medium | Calculate global defaults from historical OUTCOME.yaml data, not hardcoded 150K |

## Categories

### Edge Cases
- **#4**: KB query timeout handling (add explicit timeout)
- **#8**: Accuracy tracking trigger specification (integrate with dev-documentation-leader)

### UX Polish
- **#7**: Prediction feedback capture from PMs
- **#6**: Auto-suggest story splitting for high-risk stories
- **#1**: Prediction accuracy visualization dashboard

### Performance
- **#4**: Similar stories query timeout
- **#2**: Self-monitoring for consistently poor predictions

### Observability
- **#1**: Prediction accuracy trend dashboard
- **#10**: Monthly accuracy report aggregation
- **#7**: Algorithm version tracking (already in schema)

### Integrations
- **#3**: Re-prediction when story scope changes
- **#6**: Auto-suggestions in PM pipeline based on predictions
- **#11**: Integration with WKFL-008 for A/B testing

### Future-Proofing
- **#5**: Epic-specific prediction models
- **#8**: Semantic pattern matching using KB embeddings
- **#9**: Specific risk type predictions (not just split/cycles/tokens)
- **#12**: Data-driven fallback values from historical data

## Notes

**High-Impact, Medium-Effort Opportunities:**
- **#3**: Re-prediction on scope change - catches mid-flight story issues
- **#10**: Monthly accuracy aggregation - needed to validate prediction value
- **#12**: Data-driven fallbacks - better than arbitrary 150K default

**High-Impact, High-Effort (Future Stories):**
- **#6**: Auto-suggest splitting - requires PM pipeline integration (potential WKFL-011)
- **#11**: A/B testing algorithms - natural fit for WKFL-008 once established
- **#5**: Epic-specific models - wait until sufficient data per epic

**Quick Wins (Low Effort):**
- **#1**: Fix review_cycles output type inconsistency (documentation fix)
- **#3**: Document pattern boost values as initial heuristics
- **#4**: Add explicit KB query timeout in AC-3
- **#6**: Formalize confidence thresholds in algorithm section
- **#8**: Specify accuracy tracking trigger (add to dev-documentation-leader)

## Implementation Priority

**Before Implementation (Critical):**
- #8: Specify accuracy tracking trigger mechanism

**During Implementation (Address if time permits):**
- #1: Align review_cycles output type
- #4: Add KB query timeout
- #6: Formalize confidence thresholds

**Post-MVP (Track for future stories):**
- #3: Re-prediction on scope change
- #10: Monthly accuracy reporting
- #7: Prediction feedback capture
- #12: Data-driven fallbacks
