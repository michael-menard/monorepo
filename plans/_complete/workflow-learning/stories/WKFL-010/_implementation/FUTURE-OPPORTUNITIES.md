# Future Opportunities - WKFL-010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Deduplication unvalidated | Medium | High | Defer to WKFL-010-B. Implement after 1 month production use to observe real-world duplicate patterns. Start with conservative threshold (0.85), add --no-dedup override flag. |
| 2 | Meta-learning requires historical data | Medium | Medium | Defer to WKFL-010-C. Implement after 2 months production use (≥50 proposals with outcomes). First run will show "No historical data" message. |
| 3 | Experiment integration (WKFL-008) pending | Low | Medium | Defer to Phase 3 (WKFL-010-D). Add 5th data source after WKFL-008 UAT-complete. Graceful degradation already planned. |
| 4 | No confidence scoring per proposal | Medium | Low | Add confidence field based on sample size: high (≥10 samples), medium (5-9), low (3-4). Sort proposals within priority section by confidence. |
| 5 | No proposal expiration/archival | Low | Low | Add status transition: proposed → expired (90 days) → archived. KB queries filter out archived by default. Prevents KB bloat. |
| 6 | Stale pattern files not auto-refreshed | Medium | Medium | Auto-trigger `/pattern-mine` if PATTERNS-{current-month}.yaml is >7 days old. Add --refresh-patterns flag. |
| 7 | No GitHub issue integration | Low | High | Add --create-issues flag to auto-create GitHub issues for accepted proposals. Track github_issue_url in proposal KB entry. Defer to Phase 4. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Proposal volume overwhelm (50-100/week) | High | Low | Add --limit N flag to show only top N highest-ROI proposals. Add --min-impact high filter. Add category grouping (security, lint, test, performance). |
| 2 | Custom ROI formula configuration | Medium | Low | Add `.claude/config/proposal-scoring.yaml` to make impact/effort weights configurable. Different teams value impact vs effort differently. |
| 3 | Proposal dependency tracking | Medium | Medium | Add depends_on field to proposal schema. Display dependency graph in output. Sort proposals by dependency order (dependencies first). |
| 4 | Proposal templates | Low | Medium | Define templates in `.claude/config/proposal-templates.yaml` for common types (threshold adjustment, prompt improvement, pattern injection). Reduces variability. |
| 5 | Proposal preview mode | Low | Low | Add --preview flag to see what would be generated without writing to KB/file. Helps PM assess relevance before commit. |
| 6 | Acceptance tracking dashboard | Medium | High | Add /proposal-dashboard command to show monthly trends: proposals generated vs accepted vs rejected, acceptance rate by source, ROI distribution. |
| 7 | Semantic embeddings for deduplication | High | High | Replace text similarity with semantic embeddings for better duplicate detection. Requires WKFL-006 upgrade. Catches different phrasing of same improvement. |
| 8 | Auto-implementation for low-risk proposals | High | High | Define auto-apply tier: ROI > 9.0, effort=low, impact=low/medium, source=multi-source. Require human approval for first 10. Track auto-apply success rate (disable if <95%). |

## Categories

### Edge Cases
- **Gap 3**: Experiment data source not yet available (WKFL-008 pending)
- **Gap 5**: Proposal lifecycle doesn't include archival/expiration
- **Enhancement 7**: Text similarity may miss duplicates with different phrasing

### UX Polish
- **Enhancement 1**: High-volume proposal lists need filtering/grouping
- **Enhancement 5**: Preview mode for pre-commit validation
- **Gap 4**: No confidence indicator helps prioritize within sections

### Performance
- **Gap 6**: Stale pattern files reduce proposal relevance
- **Enhancement 7**: Semantic embeddings improve deduplication accuracy

### Observability
- **Enhancement 6**: Dashboard provides visibility into meta-learning effectiveness
- **Gap 4**: Confidence scoring enables tracking of proposal quality over time

### Integrations
- **Gap 7**: GitHub issue creation reduces friction to act on proposals
- **Enhancement 4**: Proposal templates standardize output format

### Polish
- Syntax highlighting for code blocks in proposals (MVP - easy win)
- Emoji indicators for priority sections (Post-MVP per CLAUDE.md guidance)

---

## Recommended Phase 2-3 Roadmap

### Phase 2 (WKFL-010-B): Deduplication
**When**: After 1 month production use, once duplicate patterns observed
**Scope**:
- Text similarity deduplication (threshold: 0.85)
- Multi-source proposal merging
- Deduplication logging and --no-dedup flag
- ROI boost for cross-source confirmations

**Estimated effort**: 10K tokens

### Phase 3 (WKFL-010-C): Meta-Learning
**When**: After 2 months production use (≥50 proposals with outcomes)
**Scope**:
- Acceptance rate calculations by source and effort
- ROI adjustments based on historical patterns
- Warnings for low-acceptance proposal types
- Meta-learning section in output

**Estimated effort**: 10K tokens

### Phase 4 (WKFL-010-D): Experiment Integration
**When**: After WKFL-008 UAT-complete
**Scope**:
- 5th data source: EXPERIMENT-RESULTS-{date}.yaml
- Parse experiment winners/losers
- Generate proposals from A/B test data
- Meta-learning includes experiment acceptance tracking

**Estimated effort**: 15K tokens

### Enhancements (WKFL-010-E): Polish & Scale
**When**: After 6 months production use
**Scope**:
- Proposal volume management (--limit, --min-impact, category grouping)
- Confidence scoring per proposal
- Proposal expiration/archival
- Acceptance tracking dashboard
- Custom ROI formula configuration

**Estimated effort**: 20K tokens

---

## Design Considerations for Future Work

### Deduplication Algorithm Design (Phase 2)
- Use Levenshtein distance or cosine similarity (text-based MVP)
- Consider semantic embeddings for better accuracy (Phase 4+)
- Log all merge decisions for audit trail
- Provide manual override for edge cases

### Meta-Learning Implementation (Phase 3)
- Require minimum data: 50 proposals, 2+ months history
- Track acceptance rate by: source, effort, impact, ROI bucket
- Apply adjustments conservatively (max ±0.5 ROI points)
- Log all meta-learning adjustments to KB for analysis

### GitHub Integration (Phase 4+)
- Use GitHub CLI (gh) for issue creation
- Template: title from proposal, body includes evidence + ROI
- Labels: improvement, ROI-{high|medium|low}, source-{source}
- Bi-directional sync: issue close → update proposal status to implemented

### Proposal Templates (Phase 4+)
- Common types: threshold_adjustment, prompt_improvement, pattern_injection, lint_precheck
- Template variables: agent_file, current_value, proposed_value, evidence
- Fallback to free-form if no template matches

---

## Non-Issues (Explicitly Not Gaps)

1. **No auto-implementation**: Correct per story non-goals - all proposals require human approval
2. **CLI-only (no UI)**: Correct per scope - dashboard deferred to Phase 4+
3. **No real-time generation**: Correct per non-goals - weekly/on-demand cadence only
4. **No code changes beyond workflow config**: Correct per non-goals - proposals limited to agents, commands, thresholds

---

## Success Metrics for Future Phases

### Phase 2 (Deduplication)
- Duplicate reduction rate: ≥30% fewer proposals after deduplication
- False positive rate: <5% (proposals wrongly merged)
- False negative rate: <10% (duplicates missed)

### Phase 3 (Meta-Learning)
- Acceptance rate improvement: ≥10% increase after meta-learning applied
- High-confidence proposal accuracy: ≥80% of high-ROI proposals accepted
- Low-confidence proposal filtering: ≥50% of low-acceptance-rate proposals filtered out

### Phase 4 (Experiment Integration)
- Experiment proposal quality: ≥90% acceptance rate (A/B test data is high-quality signal)
- Rollout acceleration: ≥20% faster time from experiment win to production rollout

### Enhancements (Phase 4+)
- Proposal volume reduction: ≥40% fewer proposals with --limit and filtering
- Dashboard usage: PM reviews dashboard ≥weekly
- GitHub integration adoption: ≥70% of accepted proposals tracked as issues
