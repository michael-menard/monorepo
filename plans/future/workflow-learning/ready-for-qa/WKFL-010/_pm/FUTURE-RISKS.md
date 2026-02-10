# Future Risks: WKFL-010 - Improvement Proposal Generator

## Non-MVP Risks

### Risk 1: Proposal volume overwhelm

**Issue**: As learning system matures, weekly proposal generation may produce 50-100 proposals, making prioritization difficult.

**Impact (if not addressed post-MVP)**:
- High-value proposals buried in large lists
- PM spends excessive time reviewing proposals
- Decision fatigue leads to declining acceptance rates

**Recommended timeline**: After 3 months of production use (once proposal volume trends are known)

**Mitigation options**:
- Add top-N filter: `--limit 20` to show only highest-ROI proposals
- Add category grouping: group proposals by category (security, lint, test, performance)
- Add impact threshold: `--min-impact high` to filter out low-impact proposals
- Add auto-reject rules: proposals with ROI < 3.0 are auto-archived without review

---

### Risk 2: Deduplication false negatives

**Issue**: Text similarity threshold (0.85) may miss duplicates with different phrasing. Example:
- "Add lint pre-check to backend-coder" (from patterns)
- "Run pnpm lint before commit in backend implementation" (from retro)

These refer to the same improvement but may have similarity < 0.85.

**Impact (if not addressed post-MVP)**:
- Duplicate proposals clutter output
- PM wastes time reviewing multiple versions of same improvement
- Acceptance tracking is fragmented (same improvement tracked under multiple IDs)

**Recommended timeline**: After 1 month of production use (once duplicate patterns are observed)

**Mitigation options**:
- Use semantic embeddings instead of text similarity (requires WKFL-006 upgrade)
- Add keyword matching: if proposals share 3+ key terms, flag for manual review
- Add evidence_id linking: if two proposals reference same calibration entry or pattern ID, auto-merge
- Build proposal clustering UI: show related proposals grouped together for review

---

### Risk 3: Stale pattern files not auto-refreshed

**Issue**: Agent reads PATTERNS-{month}.yaml files but doesn't trigger `/pattern-mine` if file is stale. PM must manually remember to refresh patterns.

**Impact (if not addressed post-MVP)**:
- Proposals based on outdated patterns (e.g., 2-month-old data)
- Missing new patterns discovered in recent stories
- Declining proposal relevance over time

**Recommended timeline**: After WKFL-006 is stable in production (QA complete)

**Mitigation options**:
- Auto-trigger `/pattern-mine` if PATTERNS-{current-month}.yaml is >7 days old
- Add freshness check to `/improvement-proposals`: warn if any data source is stale
- Schedule monthly cron job to run `/pattern-mine` automatically
- Add `--refresh-patterns` flag to force pattern mining before proposal generation

---

### Risk 4: No confidence scoring for individual proposals

**Issue**: All proposals treated equally within priority section. But some proposals are more confident (backed by 20 samples) vs others (backed by 3 samples).

**Impact (if not addressed post-MVP)**:
- PM can't distinguish high-confidence proposals from low-confidence ones
- May accept low-confidence proposals and waste effort on changes that don't help
- No feedback loop to improve proposal quality over time

**Recommended timeline**: After 2 months of production use (once acceptance pattern data is available)

**Mitigation options**:
- Add confidence score per proposal: `confidence: high | medium | low` based on sample size
- Display confidence in proposal header: "[P-001] (High confidence - 15 samples) Add lint pre-check"
- Sort proposals within priority section by confidence (high confidence first)
- Track acceptance rate by confidence level to validate scoring

---

### Risk 5: No experiment integration (WKFL-008 dependency pending)

**Issue**: Story.yaml acknowledges WKFL-008 (experiments) is not yet implemented, so experiment results can't be included in proposals. Once WKFL-008 is ready, integration path is unclear.

**Impact (if not addressed post-MVP)**:
- Missing proposal source (experiments may identify workflow improvements)
- Incomplete learning loop (calibration + patterns + heuristics + retro, but not experiments)
- Reduced proposal quality (no A/B test data to inform recommendations)

**Recommended timeline**: After WKFL-008 is completed and has 2+ experiments with results

**Mitigation options**:
- Add WKFL-008 integration phase: read EXPERIMENT-RESULTS-{date}.yaml
- Parse experiment winners: if winner variant shows >20% improvement, auto-generate high-priority proposal
- Merge experiment proposals into existing pipeline (5th data source)
- Update meta-learning to track experiment proposal acceptance rates

---

### Risk 6: No auto-implementation path for low-risk proposals

**Issue**: Story.yaml non-goals explicitly exclude auto-implementation. But some proposals are very low-risk (e.g., "fix typo in agent prompt") and could be auto-applied safely.

**Impact (if not addressed post-MVP)**:
- PM spends time reviewing trivial proposals
- High-value low-effort improvements delayed by manual review bottleneck
- Acceptance fatigue: PM may batch-accept without review to save time

**Recommended timeline**: After WKFL-003 (heuristics) has proven tier system works reliably

**Mitigation options**:
- Define auto-apply tier: proposals with ROI > 9.0, effort=low, impact=low|medium, source=multi-source
- Require human approval for first 10 auto-apply proposals (safety gate)
- Add `--auto-apply` flag (off by default) to enable auto-implementation
- Track auto-apply success rate: if <95% are kept (not reverted), disable auto-apply
- Document auto-apply rules in decision-classification.yaml (similar to WKFL-003 tier system)

---

### Risk 7: No proposal decay or archival

**Issue**: Proposals remain in KB forever with status=proposed, even if they become irrelevant. Example: "Improve security-linter accuracy" proposed in Feb 2026, but security-linter was replaced in March 2026.

**Impact (if not addressed post-MVP)**:
- KB bloat: thousands of stale proposals accumulate
- Meta-learning skewed by irrelevant historical data
- Difficult to find active proposals in KB queries

**Recommended timeline**: After 6 months of production use (once proposal lifecycle patterns are known)

**Mitigation options**:
- Add proposal expiration: proposals with status=proposed for >90 days are auto-archived
- Add manual archive command: `/proposal-archive P-202602-015 "no longer relevant"`
- Add status transition: proposed → expired → archived
- KB queries filter out archived proposals by default (requires explicit flag to include)
- Monthly cleanup job: review all proposals with status=proposed for >60 days, prompt PM to accept/reject/archive

---

### Risk 8: No integration with issue tracker (GitHub Issues/Linear)

**Issue**: Proposals exist only in markdown files and KB, not in issue tracker. PM must manually copy/paste to create issues for accepted proposals.

**Impact (if not addressed post-MVP)**:
- Friction to act on proposals (extra manual step)
- Proposals may be accepted but never implemented (no issue created)
- No linkage between proposal and implementation PR

**Recommended timeline**: After 3 months of production use (once proposal workflow is stable)

**Mitigation options**:
- Add GitHub integration: `--create-issues` flag to auto-create issues for accepted proposals
- Issue template: title from proposal, body includes evidence and ROI, labels: improvement, ROI-high/medium/low
- Track issue creation: proposal KB entry includes `github_issue_url` field
- Close issue → auto-update proposal status to implemented
- Add issue link to IMPROVEMENT-PROPOSALS-{date}.md: "[P-001] (#1234) Add lint pre-check"

---

## Scope Tightening Suggestions

### Suggestion 1: Defer multi-source deduplication to Phase 2

**Current scope**: AC-2 implies deduplication across all sources (calibration, patterns, heuristics, retro).

**Tightened scope for MVP**: Allow duplicate proposals across sources. Add deduplication in Phase 2 after observing real-world duplicate patterns.

**Rationale**: Deduplication logic is complex (text similarity, evidence linking, ROI merging). Risk of false positives (merging unrelated proposals) or false negatives (missing duplicates). Better to start with simple per-source proposals and merge later when patterns are known.

**OUT OF SCOPE for MVP**:
- Text similarity calculation
- Multi-source proposal merging
- Deduplication logging and override flags

**Add in Phase 2** (WKFL-010-B):
- Analyze first month of proposals to identify common duplicate patterns
- Implement targeted deduplication for high-frequency duplicates
- Add `--no-dedup` flag for edge case handling

---

### Suggestion 2: Defer meta-learning to Phase 2

**Current scope**: AC-5 requires "learn from acceptance patterns to improve future proposal quality".

**Tightened scope for MVP**: Track proposal lifecycle (proposed/accepted/rejected/implemented) in KB, but do not adjust proposal generation based on acceptance patterns.

**Rationale**: Meta-learning requires sufficient historical data (≥50 proposals across 2+ months). MVP will not have this data. Implementing meta-learning logic without data to validate it is premature.

**OUT OF SCOPE for MVP**:
- Acceptance rate calculations by source
- ROI adjustments based on historical acceptance
- Warnings for low-acceptance proposal types
- Confidence boosting for high-acceptance sources

**Add in Phase 2** (WKFL-010-C):
- After 2 months of production use, analyze acceptance patterns
- Implement meta-learning adjustments (e.g., boost calibration proposals, flag high-effort proposals)
- Track meta-learning accuracy: does adjusted scoring improve acceptance rates?

---

### Suggestion 3: Defer WKFL-008 (experiments) integration to Phase 3

**Current scope**: Story.yaml acknowledges WKFL-008 is pending but includes it in input sources list.

**Tightened scope for MVP**: Remove experiment integration entirely from AC-1. Add as explicit Phase 3 work after WKFL-008 is completed.

**Rationale**: WKFL-008 is not yet implemented and has no defined output schema. Cannot design integration without knowing data structure. Better to ship MVP with 4 known sources (calibration, patterns, heuristics, retro) and add experiments later.

**OUT OF SCOPE for MVP**:
- Reading EXPERIMENT-RESULTS-{date}.yaml
- Parsing experiment winners/losers
- Generating proposals from experiment data
- Experiment source tagging in KB

**Add in Phase 3** (WKFL-010-D):
- After WKFL-008 is UAT-complete, define experiment integration contract
- Implement 5th data source: experiments
- Update meta-learning to include experiment proposal acceptance tracking

---

## Future Requirements

### Nice-to-have 1: Proposal preview mode

**Description**: Run `/improvement-proposals --preview` to see what proposals would be generated without writing to KB or file.

**Use case**: PM wants to check if proposals are relevant before committing to a weekly run.

**Implementation**:
- Add `--preview` flag to command
- Execute full aggregation and ROI calculation
- Print proposals to stdout (not file)
- Skip KB writes
- Display summary: "Preview: 12 proposals would be generated (High: 4, Medium: 6, Low: 2)"

**Timeline**: After MVP is stable (1 month)

---

### Nice-to-have 2: Custom ROI formula

**Description**: Allow PM to configure ROI formula via config file, not hardcoded in agent.

**Use case**: Different teams may value impact vs effort differently. Some teams prioritize low-effort improvements (quick wins), others prioritize high-impact (strategic value).

**Implementation**:
- Add `.claude/config/proposal-scoring.yaml`:
  ```yaml
  impact_weights:
    high: 9
    medium: 5
    low: 2
  effort_weights:
    high: 9
    medium: 3
    low: 1
  roi_formula: "(impact / effort) * (10 / 9)"
  priority_thresholds:
    high: 7.0
    medium: 4.0
  ```
- Agent reads config on startup, uses custom weights
- Default to hardcoded weights if config missing

**Timeline**: After 2 months of production use (once ROI scoring is validated)

---

### Nice-to-have 3: Proposal dependency tracking

**Description**: Some proposals depend on others. Example: "Add security agent caching" depends on "Fix security agent accuracy" (no point caching inaccurate results).

**Use case**: PM wants to implement proposals in optimal order (dependencies first).

**Implementation**:
- Add `depends_on` field to proposal schema: `depends_on: ["P-202602-001"]`
- Detect dependencies via evidence: if proposal references another proposal's outcome
- Display dependency graph in output: "P-003 depends on P-001 (implement P-001 first)"
- Sort proposals within priority section by dependency order (dependencies first)

**Timeline**: After 6 months of production use (once proposal interdependencies are observed)

---

### Nice-to-have 4: Proposal templates

**Description**: Common proposal types (threshold adjustment, prompt improvement, pattern injection) follow standard format. Generate proposals from templates.

**Use case**: Reduce variability in proposal phrasing, make proposals more actionable and consistent.

**Implementation**:
- Define templates in `.claude/config/proposal-templates.yaml`:
  ```yaml
  threshold_adjustment:
    title: "Adjust {agent} {threshold_type} threshold"
    proposal_format: |
      Update {agent_file}:
      ```
      {current_value} → {proposed_value}
      ```
    evidence_format: "{metric} accuracy at {current_accuracy}% (should be {target_accuracy}%+)"
  ```
- Match proposal to template based on source and evidence type
- Populate template variables from data
- Fallback to free-form proposal if no template matches

**Timeline**: After 3 months of production use (once common proposal patterns are identified)

---

### Polish 1: Syntax highlighting for proposals

**Description**: Use markdown syntax highlighting for code blocks in proposals (e.g., ```yaml, ```typescript).

**Impact**: Improves readability, makes proposals easier to review.

**Implementation**: Use appropriate language tags in code blocks throughout IMPROVEMENT-PROPOSALS-{date}.md.

**Timeline**: MVP (easy win, no risk)

---

### Polish 2: Emoji indicators for priority

**Description**: Add emoji prefix to priority sections for quick visual scanning.
- High priority: 🔴
- Medium priority: 🟡
- Low priority: 🟢

**Impact**: Faster visual navigation in long proposal lists.

**Implementation**: Add emoji to section headers in output template.

**Timeline**: Post-MVP (per CLAUDE.md: avoid emojis unless explicitly requested)

---

### Polish 3: Acceptance tracking dashboard

**Description**: Generate monthly report showing proposal acceptance trends:
- Proposals generated vs accepted vs rejected vs implemented
- Acceptance rate by source
- Average time from proposed to implemented
- ROI distribution of accepted vs rejected proposals

**Impact**: Visibility into meta-learning effectiveness, helps PM refine proposal generation.

**Implementation**:
- Add `/proposal-dashboard --month 2026-02` command
- Query KB for all proposals in month
- Generate visual report with stats and charts (markdown tables, possibly Mermaid charts)

**Timeline**: After 6 months of production use (once sufficient historical data exists)

---
