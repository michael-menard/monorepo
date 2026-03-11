# Future Opportunities - WKFL-003

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No confidence intervals on success rates | Low | Medium | Add statistical confidence (e.g., "97% ± 3%") when sample size allows |
| 2 | Single minimum sample threshold (5) | Low | Low | Consider domain-specific thresholds (e.g., destructive decisions need 10+ samples) |
| 3 | No decay/recency weighting | Medium | Medium | Recent outcomes may be more relevant than old ones; consider time-weighted success rates |
| 4 | Hard-coded thresholds (95%, 80%) | Low | Low | Make thresholds configurable per tier or pattern category |
| 5 | No handling of pattern evolution | Low | High | If pattern regex changes, decision history may become stale; add pattern versioning |
| 6 | Missing rollback mechanism | Low | Medium | If promoted pattern causes issues, no documented way to demote and revert proposals |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Interactive proposal review UI | Medium | High | CLI-based proposal review could be enhanced with interactive prompts or web UI |
| 2 | A/B test tier changes | High | High | Before fully promoting, run A/B test on pattern (50% auto-accept, 50% escalate) to validate |
| 3 | Pattern similarity clustering | Medium | Medium | Group similar patterns before analysis to avoid redundant proposals |
| 4 | Success rate trending | Medium | Low | Track success rate over time to detect degradation before hitting demotion threshold |
| 5 | Auto-generate rationale improvements | Low | Medium | Use LLM to generate more detailed rationale text from example stories |
| 6 | Integration with WKFL-008 experiments | High | Medium | Tier changes could be experiments rather than direct proposals |
| 7 | Pattern lifecycle tracking | Medium | High | Track pattern from creation → calibration → promotion → maturity → deprecation |
| 8 | Multi-dimensional success | Medium | High | Current success is binary (confirm/override); could track rework_needed, quality_score, etc. |

## Categories

### Edge Cases
- **Gap #5**: Pattern evolution - if regex changes, old decisions may not match new pattern definition
- **Gap #6**: Rollback mechanism - no documented procedure if promoted pattern causes production issues

### UX Polish
- **Enhancement #1**: Interactive review - streamline human proposal review experience
- **Enhancement #4**: Trending visualization - show success rate trajectories over time
- **Enhancement #5**: Better rationale generation - make proposals more actionable with detailed context

### Performance
- **Enhancement #3**: Pattern clustering - reduce redundant analysis by grouping similar patterns
- **Gap #3**: Recency weighting - prioritize recent outcomes for faster adaptation

### Observability
- **Enhancement #4**: Success rate trending - early warning system for pattern degradation
- **Enhancement #7**: Lifecycle tracking - full observability of pattern evolution from birth to deprecation

### Integrations
- **Enhancement #6**: WKFL-008 experiments - use experimentation framework for safer tier changes
- **Enhancement #2**: A/B testing - validate tier changes before full rollout

### Statistical Rigor
- **Gap #1**: Confidence intervals - provide uncertainty bounds on success rate estimates
- **Gap #2**: Domain-specific thresholds - destructive patterns should require more evidence
- **Gap #4**: Configurable thresholds - allow per-tier or per-category threshold tuning
- **Enhancement #8**: Multi-dimensional success - track multiple quality signals beyond confirm/override

## Notes

**MVP Focus**: Current story scope is correctly focused on the core learning loop: track decisions, compute success rates, propose tier adjustments. All enhancements above are valuable but not required for the initial version.

**Recommended Next Story**: Consider **WKFL-003-A: Pattern Evolution & Versioning** to address gap #5 before tier changes accumulate.

**Quick Win**: Gap #4 (configurable thresholds) is low-effort and could be added during implementation if time permits.
