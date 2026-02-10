# Future Opportunities - WKFL-002

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | OUTCOME.yaml integration not implemented | Low | Medium | Optional data source for calibration beyond explicit feedback. Could increase data volume but requires parsing fix cycle data. |
| 2 | Minimum sample size threshold (5 vs 10) not empirically validated | Low | Low | Story uses 5 for reporting, 10 for recommendations. Real-world data may reveal better thresholds. |
| 3 | Cross-agent pattern detection deferred | Medium | High | Detecting patterns like "all security agents over-confident on XSS" could identify systemic issues. Deferred to WKFL-006. |
| 4 | Confidence level definitions not validated | Low | Medium | "high/medium/low" confidence comes from Severity Calibration Framework but may need refinement based on actual usage. |
| 5 | Historical trending not fully specified | Low | Medium | AC-6 mentions "trends (if historical data available)" but doesn't define trend analysis algorithm or visualization. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Automated weekly job | Medium | Medium | Manual `/calibration-report` command could be automated via cron or pre-commit hook for consistent execution. |
| 2 | Confidence threshold storage | High | Medium | Q1 defers threshold storage to WKFL-003. Adding explicit thresholds in agent frontmatter or config would enable more precise recommendations. |
| 3 | Real-time calibration alerts | Low | High | Weekly batch reports could be supplemented with real-time Slack/email alerts when high-confidence accuracy drops below threshold. |
| 4 | Calibration dashboard UI | Low | High | YAML reports are developer-friendly but a web dashboard could improve visibility and trend visualization for non-technical stakeholders. |
| 5 | Multi-project calibration | Low | High | Current scope is single-project. Cross-project calibration could identify agent performance patterns across different codebases. |
| 6 | Confidence prediction model | Medium | High | Beyond tracking stated confidence, could build ML model to predict confidence based on finding characteristics. |
| 7 | False positive root cause analysis | Medium | Medium | When false positives detected, automatically extract common patterns (file types, code constructs) to inform heuristic improvements. |
| 8 | Agent-specific recommendation templates | Medium | Medium | Recommendations currently generic ("tighten high threshold"). Could be tailored per agent type (security vs architecture vs QA). |
| 9 | Embedding-based finding similarity | Low | High | Cluster similar findings using embeddings to detect if certain finding types consistently have calibration issues. |
| 10 | Calibration score trending over time | Medium | Low | Track how each agent's calibration improves/degrades month-over-month to measure learning system effectiveness. |

## Categories

### Edge Cases
- **Insufficient sample handling**: Story defines thresholds (5/10 samples) but doesn't address what happens when sample size fluctuates near threshold
- **Concurrent feedback entries**: Multiple feedback entries for same finding_id could create duplicate calibration entries
- **Stale calibration data**: No TTL or expiration policy for old calibration entries (6+ months old may not be relevant)

### UX Polish
- **Report formatting**: YAML is structured but could be enhanced with ASCII tables, color-coding, or markdown export
- **Recommendation prioritization**: Multiple recommendations could be ranked by impact/confidence to guide action
- **Historical comparison**: Include deltas in reports ("accuracy improved 5% since last week")
- **Agent leaderboard**: Show which agents have best calibration scores to celebrate good performers

### Performance
- **Query optimization**: Initial scope assumes <1000 entries/month. If volume grows 10x, may need composite indexes on (entry_type, tags, timestamp)
- **Embedding generation**: If future enhancements add finding similarity, embedding generation for 750 findings/month could add latency
- **Report generation parallelization**: Analyzing multiple agents could be parallelized for faster report generation

### Observability
- **Calibration report metrics**: Track report generation time, data volume, alert frequency
- **False positive rate trending**: Expose as Prometheus metric for dashboard visualization
- **Agent coverage metrics**: Track which agents have sufficient calibration data vs which need more feedback

### Integrations
- **GitHub PR comments**: Post calibration alerts as PR comments when findings are initially created
- **Slack notifications**: Weekly calibration report summary to #dev-quality channel
- **JIRA/Linear integration**: Link calibration gaps to improvement tickets automatically
- **CI/CD integration**: Fail builds if newly added agent findings have <50% historical accuracy

### Future-Proofing
- **Multi-model support**: Currently assumes single model per agent. Future may have A/B testing different models for same agent.
- **Confidence interval ranges**: Instead of discrete high/medium/low, support confidence intervals (0.85-0.95)
- **Bayesian updating**: Use Bayesian methods to update confidence estimates as new data arrives
- **Active learning**: Identify findings where agent is most uncertain and prioritize those for human feedback

## Dependencies for Future Work

### WKFL-003 (Emergent Heuristic Discovery)
Will consume calibration data to evolve autonomy tiers. Needs:
- Stable calibration schema (✓ provided by WKFL-002)
- Sufficient historical data (wait 2-4 weeks after WKFL-002 deployment)
- Threshold adjustment recommendations (✓ AC-5)

### WKFL-006 (Cross-Story Pattern Mining)
Will mine patterns across findings. Could enhance with:
- Embedding-based finding clustering
- Cross-agent pattern detection (deferred from WKFL-002)
- Finding type → calibration accuracy correlation

### WKFL-010 (Improvement Proposal Generator)
Will generate proposals from all learning system outputs. Needs:
- Calibration gaps (✓ provided via reports)
- Actionable recommendations (✓ AC-5)
- Historical trending data (future enhancement)

## Implementation Notes

### Phasing Strategy

If future enhancements pursued, recommend this order:

1. **Phase 1 (Quick Wins):**
   - Historical trending (AC-6 already mentions it)
   - Recommendation prioritization
   - Report formatting improvements

2. **Phase 2 (Automation):**
   - Weekly cron job
   - Slack notifications
   - Calibration score metrics

3. **Phase 3 (Advanced Analytics):**
   - False positive root cause analysis
   - Agent-specific recommendation templates
   - Embedding-based clustering

4. **Phase 4 (Cross-System Integration):**
   - GitHub PR comments
   - CI/CD integration
   - Multi-project calibration

### Risk Assessment

**Low Risk Enhancements:**
- Report formatting, trending, prioritization (cosmetic changes)
- Metrics/observability (additive only)

**Medium Risk Enhancements:**
- Automated jobs (could spam if misconfigured)
- Real-time alerts (noise/fatigue if too sensitive)
- Threshold storage (requires schema design)

**High Risk Enhancements:**
- Multi-model support (significant complexity)
- Confidence prediction ML (model training/serving overhead)
- Cross-project calibration (data privacy, scope creep)

### Backward Compatibility

All enhancements should:
- Preserve existing CALIBRATION-{date}.yaml format (append, don't replace)
- Maintain schema stability for calibration entries
- Support opt-in for new features (don't break existing workflows)

## Lessons for Future Stories

### What Worked Well in WKFL-002

1. **Clear MVP-scoped resolutions**: Open questions have documented MVP resolutions, preventing scope creep
2. **Reuse-first approach**: Heavy reuse of existing KB infrastructure reduces implementation risk
3. **Explicit dependency management**: WKFL-004 blocking relationship is clear and has mitigation
4. **Comprehensive test plan**: Unit/integration/E2E tests with concrete verification steps

### Improvement Areas for Future Stories

1. **Quantify "too large"**: Story sizing check uses heuristics (7 ACs, 50k tokens) but lacks empirical data on optimal story size
2. **Open question severity**: Q1-Q5 not prioritized by criticality. Could add "blocking" vs "nice-to-have" classification.
3. **Performance testing**: Test plan includes performance targets but no load testing scenario
4. **Rollback plan**: No explicit rollback procedure if calibration feature causes issues

### Recommended Patterns

1. **Deferred integration pattern**: Phase 4 waits for WKFL-004 while other phases proceed - good use of dependency ordering
2. **Schema-first design**: CalibrationEntrySchema defined upfront before agent implementation
3. **Multiple implementation checkpoints**: 5 phases with clear deliverables prevent "big bang" integration
4. **Explicit non-goals**: Protected features, out-of-scope items clearly stated to prevent drift
