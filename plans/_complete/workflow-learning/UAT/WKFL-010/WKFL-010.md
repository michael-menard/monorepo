---
story_id: WKFL-010
title: "Improvement Proposal Generator"
status: ready-for-qa
updated_at: "2026-02-07T22:20:00Z"
priority: P3
phase: experimentation
epic: workflow-learning
prefix: WKFL
created_at: 2026-02-06T17:00:00-07:00
generated_at: 2026-02-07T22:00:00Z

dependencies:
  - WKFL-002  # Calibration (completed - UAT)
  - WKFL-006  # Pattern Miner (ready-for-qa)

blocks: []

owner: null
estimated_tokens: 60000

tags:
  - experimentation
  - proposals
  - meta-improvement
  - automation
  - multi-source-aggregation

predictions:
  split_risk: 0.6
  review_cycles: 3
  token_estimate: 60000
  confidence: medium
  similar_stories:
    - story_id: WKFL-006
      similarity_score: 0.82
      notes: "Pattern miner - similar multi-source aggregation pattern"
    - story_id: WKFL-007
      similarity_score: 0.78
      actual_cycles: 3
      actual_tokens: 48000
      notes: "Risk predictor - similar KB query and heuristic analysis"
    - story_id: WKFL-002
      similarity_score: 0.75
      actual_cycles: 2
      actual_tokens: 42000
      notes: "Calibration - similar KB aggregation and YAML output"
  generated_at: "2026-02-07T22:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
---

# WKFL-010: Improvement Proposal Generator

## Context

The workflow learning system now generates multiple data outputs across WKFL-001 through WKFL-007:
- **WKFL-002** produces calibration reports identifying agents with low accuracy
- **WKFL-006** produces pattern mining reports identifying file/AC anti-patterns
- **WKFL-003** produces heuristic evolution proposals for tier adjustments
- **WKFL-001** produces workflow recommendations from retrospectives

However, these outputs currently require manual review and synthesis to identify actionable improvements. There is no systematic way to:
1. Aggregate insights across all learning components
2. Prioritize improvements by impact/effort ratio
3. Track proposal acceptance patterns
4. Learn from which proposals succeed vs fail

**Problem**: Without a unified improvement proposal system:
- High-value improvements may be missed (buried in separate reports)
- Prioritization is ad-hoc (no ROI scoring)
- Acceptance patterns are not tracked (can't improve proposal quality)
- Meta-learning loop is incomplete (learning generates data but not actionable change)

**Current Reality** (from seed baseline):
- WKFL-001 (Retro Agent): Completed - provides OUTCOME.yaml data and WORKFLOW-RECOMMENDATIONS.md
- WKFL-002 (Calibration): Completed (UAT) - provides calibration data via KB
- WKFL-003 (Heuristics): UAT - provides heuristic proposals via HEURISTIC-PROPOSALS.yaml
- WKFL-006 (Pattern Miner): Ready for QA - provides pattern data via PATTERNS-{month}.yaml
- WKFL-007 (Risk Predictor): Completed (UAT) - demonstrates multi-source aggregation pattern
- WKFL-008 (Experiments): Pending - will provide experiment results data source (future work)

**Constraints to Respect**:
1. Dependency on WKFL-006: Pattern miner must be completed before full functionality available
2. WKFL-008 not yet available: Experiment data source not implemented - must gracefully handle missing data
3. KB Integration Required: All learning data sources use KB for persistence
4. Sonnet Model: Complex aggregation and synthesis task
5. Proposals Only: Cannot auto-implement - all outputs are recommendations requiring human approval

---

## Goal

Generate improvement proposals by:
1. Aggregating insights from calibration, patterns, heuristics, and retro within specified date range (default: 30 days)
2. Generating prioritized proposals with effort/impact ratings backed by minimum sample size (≥3 data points)
3. Tracking proposal lifecycle (proposed → accepted → rejected → implemented)
4. Learning from acceptance patterns to improve proposal quality over time

---

## Non-Goals

- **Auto-implementing proposals**: All proposals require human review and explicit approval
- **Real-time proposal generation**: Weekly/on-demand cadence only (via `/improvement-proposals` command)
- **Proposals for non-workflow changes**: Scope limited to agent prompts, commands, thresholds, and workflow configuration
- **Integration with WKFL-008**: Experiment data source is future work (WKFL-008 pending status)
- **Code changes beyond workflow config**: No modifications to application code (apps/*, packages/*)

---

## Scope

### In Scope

**Agent**:
- `improvement-proposer.agent.md` (sonnet) - ~450 lines
- Multi-source data aggregation with Promise.allSettled() pattern
- ROI calculation logic (impact/effort on 10-point scale)
- Proposal deduplication via text similarity (threshold: 0.85)
- Meta-learning: acceptance pattern tracking

**Command**:
- `/improvement-proposals` command - ~120 lines
- Date range filtering: `--days N` or `--start YYYY-MM-DD --end YYYY-MM-DD`
- Dry-run mode: `--dry-run` (no KB writes)
- Manual deduplication override: `--no-dedup`

**Output**:
- `IMPROVEMENT-PROPOSALS-{date}.md` - YAML frontmatter + Markdown body
- YAML frontmatter: generated_date, data_period, sources_used, stories_analyzed, proposals_generated
- Markdown body: High/Medium/Low priority sections with proposals
- Per-proposal structure: [P-YYYYMM-NNN] title, source, evidence, impact/effort/ROI, status
- Tracking summary table: proposals by week (proposed/accepted/rejected/implemented counts)

**KB Integration**:
- Proposal tracking schema (extend KB types)
- KB writes for each proposal with lifecycle status
- KB queries for calibration entries, past proposals
- Standard tagging: `["proposal", "source:{source}", "status:{status}", "priority:{level}"]`

**Data Sources** (with graceful degradation):
1. Calibration entries from KB (via WKFL-002)
2. PATTERNS-{month}.yaml files (via WKFL-006)
3. HEURISTIC-PROPOSALS.yaml (via WKFL-003)
4. WORKFLOW-RECOMMENDATIONS.md (via WKFL-001)

### Out of Scope

- Auto-implementing changes
- Integration with WKFL-008 (experiments) - deferred to Phase 3
- Real-time streaming proposals
- UI/dashboard (CLI-only for MVP)
- GitHub issue creation (future work)
- Proposal templates (future work)

---

## Acceptance Criteria

### AC-1: Aggregate inputs from all available learning components within specified date range

**Verification**: Proposer queries all learning data sources with date filter (default: 30 days)

**Details**:
- Query KB for calibration entries: `kb_search({ tags: ["calibration"], date_range: [start, end] })`
- Read `.claude/patterns/PATTERNS-{month}.yaml` for months in date range
- Read `.claude/config/HEURISTIC-PROPOSALS.yaml`
- Read `WORKFLOW-RECOMMENDATIONS.md` (parse markdown recommendations)
- Use Promise.allSettled() pattern to handle partial failures (not Promise.all())
- Track result status per source: `{ calibration: 'success', patterns: 'error', heuristics: 'success', retro: 'success' }`
- Log warnings for failed sources: "Pattern data unavailable (PATTERNS-2026-02.yaml not found), continuing with 3/4 sources"
- Include sources_used field in YAML frontmatter: `sources_used: ["calibration", "heuristics", "retro"]` (3/4)
- Minimum viable threshold: At least 1 source must succeed, otherwise fail with error
- Default date range: past 30 days
- Configurable via `--days N` or `--start YYYY-MM-DD --end YYYY-MM-DD`

**Evidence**:
- YAML frontmatter shows `sources_used` array with 4/4 sources (or degraded to 3/4, 2/4 with warnings)
- `stories_analyzed` count matches KB calibration entry count for date range
- Log output shows source query status (success/warning/error per source)

---

### AC-2: Generate proposals with effort/impact ratings backed by minimum sample size

**Verification**: Each proposal has effort, impact, ROI score, and evidence from ≥3 samples (or explicitly marked as low-confidence)

**Details**:
- Evidence must reference specific data (e.g., "routes.ts fails lint 78% of time in 15 samples")
- Proposals must be actionable (specific file/agent/threshold to change)
- ROI score calculation:
  - Impact: high=9, medium=5, low=2
  - Effort: low=1, medium=3, high=9
  - ROI formula: (impact / effort) * (10/9) to scale to 10-point
  - Example: High impact, low effort → (9/1) * (10/9) = 10.0
- Minimum sample size: 3 data points per proposal
  - Example (sufficient): "routes.ts fails lint 78% of time in 15 samples"
  - Example (insufficient): "routes.ts failed lint once" → skip or mark low-confidence
- If <3 samples: Either skip proposal OR include with caveat: "Low confidence (2 samples)"
- ROI formula documented in output header for transparency
- Include example calculation: "P-001: ROI = (9/1) * (10/9) = 10.0 (High Impact, Low Effort)"

**Evidence**:
- Each proposal includes: title, source, evidence, impact (high/medium/low), effort (high/medium/low), roi_score (0-10)
- Evidence field includes sample count: "15 samples", "3 samples (minimum)", "2 samples (low confidence)"
- Spot check 3 proposals: ROI scores are numerically correct per formula

---

### AC-3: Prioritize proposals by impact/effort ratio

**Verification**: Proposals sorted by ROI score within priority sections (High/Medium/Low)

**Details**:
- Sort proposals by ROI score descending within each section
- Priority buckets:
  - High priority: ROI ≥ 7.0 (high impact, low/medium effort)
  - Medium priority: ROI 4.0-6.9 (mixed impact/effort)
  - Low priority: ROI < 4.0 (low impact or high effort)
- Example ordering: P-001 (ROI 9.2) appears before P-002 (ROI 7.5) in High priority section
- No overlap between sections: all high > 7.0, all medium 4.0-6.9, all low < 4.0

**Evidence**:
- Parse output file, extract ROI scores per section
- Assert descending order within each section
- Assert no misplaced proposals (e.g., ROI 8.5 in Medium section)
- At least 1 proposal in High priority (if data supports it)

---

### AC-4: Track proposal lifecycle

**Verification**: Proposal tracking in KB, queryable by status (proposed/accepted/rejected/implemented)

**Details**:
- Persist proposals to KB with schema:
  ```typescript
  ProposalEntrySchema = z.object({
    id: z.string(),           // P-202602-001, P-202602-002, etc.
    title: z.string(),
    source: z.enum(['calibration', 'patterns', 'heuristics', 'retro', 'multi-source']),
    evidence_id: z.string().nullable(),  // Reference to calibration entry, pattern ID, etc.
    status: z.enum(['proposed', 'accepted', 'rejected', 'implemented']),
    created_at: z.string().datetime(),
    accepted_at: z.string().datetime().nullable(),
    implemented_at: z.string().datetime().nullable(),
    rejection_reason: z.string().nullable(),
    impact: z.enum(['high', 'medium', 'low']),
    effort: z.enum(['high', 'medium', 'low']),
    roi_score: z.number().min(0).max(10),
    tags: z.array(z.string())  // ["proposal", "source:calibration", "status:proposed", "priority:high"]
  })
  ```
- Support status transitions: proposed → accepted → rejected → implemented
- Include rejection_reason field for learning from rejections
- Track acceptance timing (accepted_at, implemented_at)
- KB queries filter by status: `kb_search({ tags: ["proposal", "status:accepted"] })`
- Tracking summary table in output shows week-over-week status counts

**Evidence**:
- KB query after generation returns all new proposals with correct tags
- Each KB entry has required fields: id, title, source, status, impact, effort, roi_score, tags
- Tags match proposal attributes: `["proposal", "source:calibration", "status:proposed", "priority:high"]`
- Tracking summary table matches KB query results

**Proposal ID Scheme**:
- Format: P-{YYYYMM}-{NNN}
- YYYYMM: Month generated (e.g., 202602 for February 2026)
- NNN: Zero-padded sequential number (001, 002, 003...)
- ID assignment: Query KB for highest existing ID in current month, increment sequence
- If new month, reset to 001

---

### AC-5: Learn from acceptance patterns

**Verification**: Over time, acceptance rate of proposals improves based on meta-learning

**Details**:
- Query KB for past proposals grouped by (source, status)
- Compute acceptance rate by source: `acceptance_rate = accepted / (accepted + rejected) * 100`
- Compute rejection rate by effort level (high/medium/low)
- Log meta-learnings: "calibration proposals have 85% acceptance rate, high-effort proposals have 40% rejection rate"
- Use patterns to adjust future proposal generation:
  - Prefer high-acceptance sources (calibration, patterns)
  - Flag high-effort proposals with warning: "Note: High-effort proposals have 20% historical acceptance rate"
  - Boost ROI for cross-source confirmations (same proposal from multiple sources)
- If no historical proposals exist (first run): Note "No historical proposals found. Acceptance patterns will be tracked starting this week."
- Meta-learning section in output shows acceptance rates by source and effort level

**Evidence**:
- Parse meta-learning section from output
- Verify acceptance rate calculations match KB data
- Check for warning text on high-effort proposals
- After 2+ runs with accepted/rejected proposals: verify priority adjustments applied

---

## Reuse Plan

### Must Reuse

**Aggregation Logic**:
- `pm-story-risk-predictor.agent.md` - Multi-source aggregation with graceful degradation, Promise.allSettled() pattern
- `pattern-miner.agent.md` - KB query patterns, data clustering, date range filtering
- `confidence-calibrator.agent.md` - KB search with date range filtering, tag-based search

**KB Integration Patterns**:
- All WKFL agents use consistent KB integration (kb_search, kb_add_lesson)
- Standard tags pattern: `["proposal", "source:{source}", "status:{status}", "priority:{level}"]`
- Standard error handling: Log warning if KB unavailable, continue with available data (or fail fast if KB required)

**Output Formats**:
- YAML frontmatter + Markdown body (CALIBRATION-{date}.yaml pattern from WKFL-002)
- Structured YAML-only (HEURISTIC-PROPOSALS.yaml pattern from WKFL-003)
- Markdown-only with YAML sections (PATTERNS output pattern from WKFL-006)

**Proposal Schema**:
- `heuristic-evolver.agent.md` - Status tracking, meta-learning, proposal lifecycle patterns

### May Create

**Agent**:
- `improvement-proposer.agent.md` (~450 lines, sonnet model)
- Data source orchestration logic
- ROI calculation algorithm
- Deduplication logic (text similarity threshold: 0.85)
- Meta-learning implementation

**Command**:
- `/improvement-proposals` command (~120 lines)
- Date range parsing
- Dry-run mode
- Manual overrides (--no-dedup)

**Schema Extensions**:
- `ProposalEntrySchema` in `apps/api/knowledge-base/src/__types__/index.ts` (~50 lines)
- Extends existing KB schema patterns

---

## Architecture Notes

### Component Structure

**Agent Architecture** (improvement-proposer.agent.md):

```
Phase 1: Health Check
- Verify KB is reachable
- If KB unavailable: Fail fast with error

Phase 2: Data Source Orchestration
- Query calibration entries from KB (Promise)
- Read PATTERNS-{month}.yaml files (Promise)
- Read HEURISTIC-PROPOSALS.yaml (Promise)
- Read WORKFLOW-RECOMMENDATIONS.md (Promise)
- Use Promise.allSettled() to handle partial failures
- Track success/failure per source

Phase 3: Proposal Generation
- Parse data from each source
- Generate proposals per source with evidence
- Calculate impact/effort/ROI per proposal
- Filter by minimum sample size (≥3)

Phase 4: Deduplication
- Compare proposals via text similarity (threshold: 0.85)
- Merge similar proposals into multi-source proposals
- Boost ROI for cross-source confirmations

Phase 5: Prioritization
- Sort proposals by ROI descending
- Bucket into High (≥7.0), Medium (4.0-6.9), Low (<4.0)

Phase 6: Meta-Learning
- Query KB for historical proposals
- Compute acceptance rates by source and effort
- Apply adjustments to current proposals
- Log meta-learnings to output

Phase 7: KB Persistence
- Write each proposal to KB with schema
- Tag with source, status, priority
- Generate sequential IDs (P-YYYYMM-NNN)

Phase 8: Output Generation
- Write IMPROVEMENT-PROPOSALS-{date}.md
- YAML frontmatter with metadata
- Markdown body with priority sections
- Tracking summary table
```

**Command Architecture** (/improvement-proposals):

```
1. Parse arguments (--days, --start, --end, --dry-run, --no-dedup)
2. Validate date range format
3. Spawn improvement-proposer.agent.md with context
4. Wait for agent completion
5. Display summary (proposals generated, sources used)
6. Exit with appropriate code (0 success, 1 failure, 2 warning)
```

**KB Schema Extension**:

```typescript
// apps/api/knowledge-base/src/__types__/index.ts

import { z } from 'zod'

export const ProposalEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.enum(['calibration', 'patterns', 'heuristics', 'retro', 'multi-source']),
  evidence_id: z.string().nullable(),
  status: z.enum(['proposed', 'accepted', 'rejected', 'implemented']),
  created_at: z.string().datetime(),
  accepted_at: z.string().datetime().nullable(),
  implemented_at: z.string().datetime().nullable(),
  rejection_reason: z.string().nullable(),
  impact: z.enum(['high', 'medium', 'low']),
  effort: z.enum(['high', 'medium', 'low']),
  roi_score: z.number().min(0).max(10),
  tags: z.array(z.string())
})

export type ProposalEntry = z.infer<typeof ProposalEntrySchema>
```

### Error Handling Strategy

| Failure Scenario | Fallback Behavior | User Impact |
|------------------|-------------------|-------------|
| KB unavailable | Fail fast with error | Command exits, no proposals generated |
| All data sources missing | Warn and suggest running WKFL-002/006/003/001 | Command exits with warning |
| 1-3 data sources missing | Log warning, continue with available sources | Proposals generated with caveat in frontmatter |
| Insufficient data (<3 samples) | Prompt user to confirm continuation | User chooses to proceed or exit |
| Pattern file stale (>30 days) | Log warning, use stale data with caveat | Proposals generated with `patterns_stale: true` flag |
| Invalid date range | Error and exit | Command exits with usage help |
| KB write failure | Log error, continue with file output | File created, KB entries missing (logged for retry) |

### Performance Considerations

**High-Cost Operations**:
1. KB queries for calibration entries (100+ entries possible)
2. Loading multiple PATTERNS-{month}.yaml files (if date range spans months)
3. Text similarity calculations for deduplication (O(n²) worst case)

**Optimization Patterns**:
- Limit KB queries to date range (default: 30 days, not all time)
- Cache PATTERNS-{month}.yaml in memory (don't re-read per proposal)
- Short-circuit deduplication if similarity < 0.5 (fast text comparison first)
- Set timeout: 60 seconds max execution time
- Use Sonnet model for complex synthesis (not Opus - cost optimization)

---

## Infrastructure Notes

**None** - CLI-only story, no infrastructure changes required.

**Dependencies**:
- KB must be operational (WKFL-002 dependency)
- WKFL-006 outputs preferred but not required (graceful degradation)

**Deployment**:
- Commit agent and command markdown files to repo
- Apply KB schema migration if ProposalEntrySchema is new type (vs extending existing)
- No Lambda/API Gateway/database changes

---

## Test Plan

See: `_pm/TEST-PLAN.md`

**Summary**:
- **Happy path**: All data sources available, proposals generated with ROI scoring
- **Error cases**: KB unavailable, all sources missing, insufficient data, invalid date range
- **Edge cases**: Stale patterns, high volume (50+ proposals), deduplication, ROI edge cases, first run
- **Tooling**: KB queries, CLI commands, assertions on output structure and KB persistence
- **Estimated testing effort**: 7-10 hours (unit + integration + E2E)

**Critical test scenarios**:
1. Multi-source integration with all 4 sources (calibration, patterns, heuristics, retro)
2. Graceful degradation with missing sources (test each source missing independently)
3. ROI calculation accuracy (spot check formula: impact/effort * 10/9)
4. Proposal lifecycle tracking (proposed → accepted → rejected → implemented)
5. Meta-learning: acceptance patterns correctly computed from historical proposals

---

## UI/UX Notes

**Not applicable** - CLI-only story, no UI components.

**CLI UX Considerations**:
- Command output should clearly indicate which data sources were used vs unavailable
- Proposals should be formatted for easy copy/paste into issues or PRs
- Priority sections should be visually distinct (markdown headers with clear labels)
- ROI scores should be explained (not just raw numbers) - include formula in header
- Warnings should be actionable (e.g., "Run /pattern-mine to refresh stale patterns")
- Errors should be clear and suggest next steps (e.g., "KB unavailable - check service status and retry")

---

## Reality Baseline

**Grounded in**:
- Seed file: `/Users/michaelmenard/Development/monorepo/plans/future/workflow-learning/backlog/WKFL-010/_pm/STORY-SEED.md`
- Generated: 2026-02-07
- Baseline used: null (no baseline reality file found - proceeding with index and codebase scanning only)

**Related Existing Features**:
- WKFL-001 (Retro Agent): Completed - provides OUTCOME.yaml and WORKFLOW-RECOMMENDATIONS.md
- WKFL-002 (Calibration): Completed (UAT) - provides calibration KB entries
- WKFL-003 (Heuristics): UAT - provides HEURISTIC-PROPOSALS.yaml
- WKFL-006 (Pattern Miner): Ready for QA - provides PATTERNS-{month}.yaml
- WKFL-007 (Risk Predictor): Completed (UAT) - similar multi-source aggregation pattern

**Active Constraints**:
1. WKFL-006 dependency in ready-for-qa status (not completed) - partial functionality possible
2. WKFL-008 (experiments) not yet implemented - deferred to Phase 3
3. KB integration required - no offline mode possible
4. Sonnet model required - complex aggregation task
5. Proposals only - no auto-implementation

**Reuse Candidates**:
- KB query patterns from confidence-calibrator.agent.md
- Multi-source aggregation from pm-story-risk-predictor.agent.md
- Output format from pattern-miner.agent.md (YAML + Markdown hybrid)
- Proposal schema from heuristic-evolver.agent.md

**Conflicts**: None blocking (3 warnings in seed, all non-blocking)

---

## Feasibility Review

See: `_pm/DEV-FEASIBILITY.md`

**Feasible for MVP**: Yes (High confidence)

**Critical Risks**:
1. KB dependency - no fallback if unavailable → Mitigation: Health check, fail fast
2. Data source orchestration complexity → Mitigation: Promise.allSettled() pattern
3. ROI calculation consistency → Mitigation: Document formula explicitly in output
4. Proposal schema alignment with KB → Mitigation: Extend CalibrationEntrySchema pattern
5. Deduplication accuracy → Mitigation: Conservative threshold (0.85), manual override flag

**Missing Requirements** (added to ACs):
- Date range filter for KB queries (AC-1)
- Minimum sample size threshold (AC-2)
- Proposal ID generation scheme (Technical Notes)

**Change Surface**:
- Create: improvement-proposer.agent.md (~450 lines)
- Create: /improvement-proposals command (~120 lines)
- Extend: ProposalEntrySchema in KB types (~50 lines)
- Total: ~620 lines, 60K tokens estimated

---

## Future Risks

See: `_pm/FUTURE-RISKS.md`

**Non-MVP Risks** (7 total):
1. Proposal volume overwhelm (50-100 proposals/week)
2. Deduplication false negatives (different phrasing, same improvement)
3. Stale pattern files not auto-refreshed
4. No confidence scoring for individual proposals
5. No experiment integration (WKFL-008 dependency)
6. No auto-implementation path for low-risk proposals
7. No proposal decay or archival

**Scope Tightening Suggestions** (3 total):
1. Defer multi-source deduplication to Phase 2 (WKFL-010-B)
2. Defer meta-learning to Phase 2 (WKFL-010-C)
3. Defer WKFL-008 integration to Phase 3 (WKFL-010-D)

**Future Requirements** (4 nice-to-haves):
1. Proposal preview mode (--preview flag)
2. Custom ROI formula (configurable via .claude/config/proposal-scoring.yaml)
3. Proposal dependency tracking (depends_on field)
4. Proposal templates (common proposal types follow standard format)

---

## Implementation Checklist

- [ ] Create `improvement-proposer.agent.md` (sonnet, ~450 lines)
  - [ ] Phase 1: Health check (KB reachable)
  - [ ] Phase 2: Data source orchestration (Promise.allSettled)
  - [ ] Phase 3: Proposal generation (parse data, calculate ROI)
  - [ ] Phase 4: Deduplication (text similarity 0.85)
  - [ ] Phase 5: Prioritization (High/Medium/Low buckets)
  - [ ] Phase 6: Meta-learning (acceptance patterns)
  - [ ] Phase 7: KB persistence (ProposalEntrySchema)
  - [ ] Phase 8: Output generation (YAML + Markdown)
- [ ] Create `/improvement-proposals` command (~120 lines)
  - [ ] Argument parsing (--days, --start, --end, --dry-run, --no-dedup)
  - [ ] Date range validation
  - [ ] Agent spawning with context
  - [ ] Summary display
- [ ] Extend KB schema: ProposalEntrySchema (~50 lines)
  - [ ] Add to apps/api/knowledge-base/src/__types__/index.ts
  - [ ] Follow CalibrationEntrySchema pattern
  - [ ] Apply migration if needed
- [ ] Write tests (7-10 hours)
  - [ ] Unit tests: ROI calculation, priority bucketing, deduplication
  - [ ] Integration tests: KB read/write, file I/O, graceful degradation
  - [ ] E2E tests: Full workflow with real WKFL data
- [ ] Documentation
  - [ ] Update FULL_WORKFLOW.md (via /doc-sync)
  - [ ] Add command to .claude/commands/README.md
  - [ ] Add agent to .claude/agents/README.md

---

## Completion Criteria

Story is complete when:
1. All 5 acceptance criteria pass
2. Test plan executed (happy path + error cases + edge cases)
3. Proposal generated from real WKFL data is reviewed for quality
4. KB schema migration applied (if needed)
5. Agent and command files committed to repo
6. Documentation updated via /doc-sync

**Evidence required**:
- `IMPROVEMENT-PROPOSALS-{date}.md` file with valid structure
- KB query returns proposals with correct tags and schema
- Test suite passes (unit + integration + E2E)
- ROI calculations spot-checked for accuracy
- Meta-learning section shows acceptance patterns (if historical data exists)

---

## Notes

**Token Budget**: 60,000 tokens (conservative estimate based on WKFL-007: 48K + complexity adjustment)

**Risk Predictions** (from pm-story-risk-predictor):
- Split risk: 0.6 (medium-high due to multi-source aggregation and deduplication complexity)
- Review cycles: 3 (expected due to ROI calculation logic and KB schema design)
- Token estimate: 60,000 (based on similar stories WKFL-002: 42K, WKFL-007: 48K + meta-learning complexity)
- Confidence: medium (2 similar stories with actuals, 1 pending completion)

**Key Success Factors**:
1. Graceful degradation when data sources unavailable (don't fail entire pipeline)
2. Clear ROI formula documentation (transparency builds trust)
3. Minimum sample size enforcement (quality over quantity)
4. Actionable evidence (specific file/agent/threshold to change)
5. Meta-learning feedback loop (improve proposal quality over time)

**Dependencies Timeline**:
- WKFL-002 (Calibration): ✓ Completed (UAT) - ready for integration
- WKFL-006 (Pattern Miner): Ready for QA - can proceed with graceful degradation, full functionality after QA completion
- WKFL-008 (Experiments): Pending - deferred to Phase 3 (WKFL-010-D)

**Model Selection Rationale**:
- Sonnet model specified for complex aggregation and synthesis task
- Similar to WKFL-006 (pattern-miner) which also uses Sonnet
- Cost-effective compared to Opus while maintaining quality for multi-source analysis

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-07_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| (None) | All MVP-critical requirements captured in existing ACs | N/A | No |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Phase |
|---|---------|----------|-------|
| 1 | Deduplication complexity unvalidated | complexity | WKFL-010-B (Phase 2) |
| 2 | Meta-learning requires historical data | data-dependency | WKFL-010-C (Phase 3) |
| 3 | Experiment integration (WKFL-008) pending | dependency | WKFL-010-D (Phase 3+) |
| 4 | No confidence scoring per proposal | enhancement | Future enhancement |
| 5 | No proposal expiration/archival | enhancement | Future enhancement |
| 6 | Stale pattern files not auto-refreshed | optimization | Future enhancement |
| 7 | No GitHub issue integration | integration | Phase 4+ |
| 8 | Proposal volume overwhelm (50-100/week) | ux-polish | Future enhancement |
| 9 | Custom ROI formula configuration | customization | Future enhancement |
| 10 | Proposal dependency tracking | feature | Future enhancement |
| 11 | Proposal templates | feature | Future enhancement |
| 12 | Proposal preview mode | ux-polish | Future enhancement |
| 13 | Acceptance tracking dashboard | observability | Phase 4+ |
| 14 | Semantic embeddings for deduplication | quality | Future enhancement |
| 15 | Auto-implementation for low-risk proposals | automation | Phase 4+ |

### Summary

- **ACs Added**: 0
- **KB Entries Created**: 15 (7 gaps + 8 enhancements)
- **Mode**: autonomous
- **Verdict**: CONDITIONAL PASS (story ready-to-work with split recommendation)

### Conditions for Proceeding

**If proceeding unsplit** (one story, 60K tokens):
1. Mark deduplication as "best-effort" with conservative threshold (0.85) and --no-dedup override flag
2. Document that AC-5 (meta-learning) will show "No historical data" on first run
3. Explicitly log warnings when sample size < 3, historical proposals < 50, or patterns stale

**If proceeding with split** (recommended - 3 phases):
1. **WKFL-010-A (Core MVP)**: AC-1-4, 40K tokens, no dependencies
2. **WKFL-010-B (Deduplication)**: After 1 month production use, 10K tokens
3. **WKFL-010-C (Meta-Learning)**: After 2 months production use (≥50 proposals), 10K tokens
