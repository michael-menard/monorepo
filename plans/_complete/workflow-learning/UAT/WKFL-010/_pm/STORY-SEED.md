---
generated: "2026-02-07"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WKFL-010

## Reality Context

### Baseline Status
- Loaded: no (baseline reality file not found at null)
- Date: N/A
- Gaps: No active baseline reality file - proceeding with index and codebase scanning only

**WARNING**: Story seed generated without baseline reality context. Recommendations are based on stories index, existing implementations, and architecture decisions only.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WKFL-001 (Retro Agent) | Completed | Provides OUTCOME.yaml data and WORKFLOW-RECOMMENDATIONS.md patterns |
| WKFL-002 (Calibration) | Completed (UAT) | Provides calibration data source via KB |
| WKFL-003 (Heuristics) | UAT | Provides heuristic proposals via HEURISTIC-PROPOSALS.yaml |
| WKFL-006 (Pattern Miner) | Ready for QA | Provides pattern data via PATTERNS-{month}.yaml and AGENT-HINTS.yaml |
| WKFL-007 (Risk Predictor) | Completed (UAT) | Similar aggregation pattern for proposals |
| WKFL-008 (Experiments) | Pending | Will provide experiment results data source |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WKFL-006 | Ready for QA | Low - output consumption only |
| WKFL-003 | UAT | Low - output consumption only |
| WKFL-009 | Pending | None - different scope (KB compression) |
| WKFL-008 | Pending | Medium - dependency not yet available |

**Note**: WKFL-010 depends on WKFL-006 (pattern miner) which is in ready-for-qa status. Can proceed with implementation, but full functionality requires WKFL-006 completion.

### Constraints to Respect

1. **Dependency on WKFL-006**: Pattern miner must be completed before improvement proposer can consume pattern data
2. **Dependency on WKFL-002**: Calibration system must be operational (currently in UAT - COMPLETED)
3. **WKFL-008 not yet available**: Experiment data source not yet implemented - proposer must gracefully handle missing data
4. **KB Integration Required**: All learning data sources use KB for persistence
5. **Sonnet Model**: Specified in story.yaml - complex aggregation and synthesis task
6. **Proposals Only**: Cannot auto-implement - all outputs are recommendations requiring human approval

---

## Retrieved Context

### Related Agents

| Agent | Location | Purpose | Integration Point |
|-------|----------|---------|-------------------|
| confidence-calibrator | `.claude/agents/confidence-calibrator.agent.md` | Produces CALIBRATION-{date}.yaml | Query KB for calibration entries, parse YAML reports |
| pattern-miner | `.claude/agents/pattern-miner.agent.md` | Produces PATTERNS-{month}.yaml, AGENT-HINTS.yaml | Read YAML outputs from `.claude/patterns/` |
| heuristic-evolver | `.claude/agents/heuristic-evolver.agent.md` | Produces HEURISTIC-PROPOSALS.yaml | Read proposals from `.claude/config/HEURISTIC-PROPOSALS.yaml` |
| pm-story-risk-predictor | `.claude/agents/pm-story-risk-predictor.agent.md` | Similar aggregation pattern | Reference for multi-source aggregation logic |
| workflow-retro | `.claude/agents/workflow-retro.agent.md` | Produces WORKFLOW-RECOMMENDATIONS.md | Parse markdown recommendations |

### Related Commands

| Command | Location | Purpose |
|---------|----------|---------|
| /calibration-report | `.claude/commands/calibration-report.md` | Spawns confidence-calibrator | Trigger mechanism for calibration data |
| /pattern-mine | `.claude/commands/pattern-mine.md` | Spawns pattern-miner | Trigger mechanism for pattern data |
| /feedback | `.claude/commands/feedback.md` | Captures human judgments | Indirect data source via KB |

### Related Schemas

| Schema | Location | Purpose |
|--------|----------|---------|
| CalibrationEntrySchema | `apps/api/knowledge-base/src/__types__/index.ts` | KB calibration entries | Query schema for KB integration |
| DecisionOutcomeSchema | `.claude/schemas/decision-outcome-schema.md` | Heuristic tracking | Query schema for heuristic data |
| PatternsSchema | `.claude/schemas/patterns-schema.yaml` | Pattern data format | Parse schema for pattern consumption |

### Reuse Candidates

**Aggregation Logic**:
- pm-story-risk-predictor.agent.md - Shows multi-source aggregation with graceful degradation
- pattern-miner.agent.md - Shows KB query patterns and data clustering
- confidence-calibrator.agent.md - Shows KB search with date range filtering

**KB Integration Patterns**:
- All WKFL agents use consistent KB integration (kb_search, kb_add_lesson)
- Standard tags pattern: `["proposal", "source:{source}", "status:{status}", "priority:{level}"]`
- Standard error handling: Log warning if KB unavailable, continue with available data

**Output Formats**:
- YAML frontmatter + Markdown body (CALIBRATION-{date}.yaml pattern)
- Structured YAML-only (HEURISTIC-PROPOSALS.yaml pattern)
- Markdown-only with YAML sections (PATTERNS output pattern)

---

## Knowledge Context

### Lessons Learned

**Note**: No baseline reality file available - KB query for lessons skipped. This section would normally contain lessons from past stories relevant to multi-source aggregation and proposal generation.

### Blockers to Avoid (from similar stories)

**From WKFL-006 (Pattern Miner)**:
- Ensure minimum sample size before generating proposals (≥10 data points recommended)
- Handle missing data sources gracefully (experiments may not be available)
- Validate data freshness (stale proposals are not actionable)

**From WKFL-007 (Risk Predictor)**:
- Implement degraded mode when dependencies unavailable
- Document which features require which data sources
- Log warnings when operating in degraded mode

**From WKFL-002 (Calibration)**:
- KB queries must include date range filtering to avoid stale data
- Accuracy thresholds must be configurable (not hardcoded)
- Alert thresholds must be documented in output

### Architecture Decisions (ADRs)

**Note**: No ADRs directly constrain this workflow-focused story. Standard ADRs (ADR-001 through ADR-006) apply to API/frontend stories but not to agent/command implementation.

### Patterns to Follow

1. **Command → Agent Spawn Pattern**:
   - Create `/improvement-proposals` command that spawns `improvement-proposer.agent.md`
   - Pass date range and filters as context
   - See `/calibration-report` and `/pattern-mine` for reference

2. **Multi-Source Aggregation**:
   - Query each data source independently
   - Track which sources are available vs unavailable
   - Generate proposals from available sources only
   - Log degraded mode warnings

3. **Proposal Tracking**:
   - Persist proposals to KB with status tracking
   - Use standardized proposal schema (see technical_notes in story.yaml)
   - Include ROI score (impact/effort ratio)
   - Track lifecycle: proposed → accepted → rejected → implemented

4. **KB Integration**:
   - Use consistent tagging: `["proposal", "source:{source}", "status:proposed", "priority:{high|medium|low}"]`
   - Write proposals to KB for queryability
   - Query KB for past proposals to track acceptance patterns

5. **Meta-Learning Loop**:
   - Track which proposal sources generate highest acceptance rates
   - Track which effort levels correlate with rejection
   - Use acceptance patterns to improve future proposal quality
   - Log meta-learnings to KB

### Patterns to Avoid

1. **Auto-Implementation**: Never auto-apply proposals - always require human approval
2. **Hardcoded Thresholds**: Make ROI thresholds, priority levels, and sample sizes configurable
3. **Single-Source Dependency**: Don't block if one data source is unavailable
4. **Stale Data**: Filter by date range, don't use month-old data for proposals
5. **Verbose Proposals**: Keep proposals actionable and concise (not lengthy analysis)

---

## Conflict Analysis

**No blocking conflicts detected.**

### Warnings

1. **Dependency Not Ready**: WKFL-006 (pattern-miner) is in ready-for-qa, not completed
   - **Resolution**: Implement with graceful degradation - proposals will be limited without pattern data
   - **Severity**: Warning (can proceed with partial functionality)

2. **Missing Baseline Reality**: No baseline reality file found
   - **Resolution**: Proceed using stories index and codebase scanning only
   - **Severity**: Warning (reduces context quality but not blocking)

3. **WKFL-008 Not Yet Implemented**: Experiment data source not available
   - **Resolution**: Document experiment integration as future enhancement
   - **Severity**: Warning (expected - experiments are lower priority)

---

## Story Seed

### Title

**Improvement Proposal Generator**

### Description

**Context**:
The workflow learning system now generates multiple data outputs across WKFL-001 through WKFL-007:
- WKFL-002 produces calibration reports identifying agents with low accuracy
- WKFL-006 produces pattern mining reports identifying file/AC anti-patterns
- WKFL-003 produces heuristic evolution proposals for tier adjustments
- WKFL-001 produces workflow recommendations from retrospectives

However, these outputs currently require manual review and synthesis to identify actionable improvements. There is no systematic way to:
1. Aggregate insights across all learning components
2. Prioritize improvements by impact/effort ratio
3. Track proposal acceptance patterns
4. Learn from which proposals succeed vs fail

**Problem**:
Without a unified improvement proposal system:
- High-value improvements may be missed (buried in separate reports)
- Prioritization is ad-hoc (no ROI scoring)
- Acceptance patterns are not tracked (can't improve proposal quality)
- Meta-learning loop is incomplete (learning generates data but not actionable change)

**Solution Direction**:
Create an `improvement-proposer.agent.md` (sonnet) that:
1. Aggregates data from all learning components (calibration, patterns, heuristics, retro)
2. Synthesizes cross-cutting insights into prioritized proposals
3. Scores proposals by impact/effort ratio (ROI score)
4. Tracks proposal lifecycle (proposed → accepted/rejected → implemented)
5. Learns from acceptance patterns to improve future proposal quality

The agent will be triggered via `/improvement-proposals` command (weekly cadence recommended) and output `IMPROVEMENT-PROPOSALS-{date}.md` with prioritized, actionable recommendations.

### Initial Acceptance Criteria

- [ ] **AC-1**: Aggregate inputs from all available learning components
  - Query KB for calibration entries (via WKFL-002 schema)
  - Read `.claude/patterns/PATTERNS-{month}.yaml` (via WKFL-006)
  - Read `.claude/config/HEURISTIC-PROPOSALS.yaml` (via WKFL-003)
  - Parse `WORKFLOW-RECOMMENDATIONS.md` (via WKFL-001)
  - Handle missing data sources gracefully (log warnings, continue with available data)

- [ ] **AC-2**: Generate proposals with effort/impact ratings
  - Each proposal includes: title, source, evidence, impact (high/medium/low), effort (high/medium/low)
  - Evidence must reference specific data (e.g., "routes.ts fails lint 78% of time in 15 samples")
  - Proposals must be actionable (specific file/agent/threshold to change)
  - Include ROI score calculation: impact/effort ratio (9.2/10 scale)

- [ ] **AC-3**: Prioritize proposals by impact/effort ratio
  - Sort proposals by ROI score descending
  - Group into High/Medium/Low priority sections
  - High priority: ROI ≥ 7.0 (high impact, low/medium effort)
  - Medium priority: ROI 4.0-6.9 (mixed impact/effort)
  - Low priority: ROI < 4.0 (low impact or high effort)

- [ ] **AC-4**: Track proposal lifecycle
  - Persist proposals to KB with schema: id, title, source, status, impact, effort, roi_score, created_at
  - Support status transitions: proposed → accepted → rejected → implemented
  - Include rejection_reason field for learning from rejections
  - Track acceptance timing (accepted_at, implemented_at)

- [ ] **AC-5**: Learn from acceptance patterns
  - Query KB for past proposals grouped by (source, status)
  - Compute acceptance rate by source (calibration, patterns, heuristics, retro)
  - Compute rejection rate by effort level (high/medium/low)
  - Log meta-learnings: "calibration proposals have 85% acceptance rate, high-effort proposals have 40% rejection rate"
  - Use patterns to adjust future proposal generation (prefer high-acceptance sources, flag high-effort proposals)

### Non-Goals

- **Auto-implementing proposals**: All proposals require human review and explicit approval
- **Real-time proposal generation**: Weekly/on-demand cadence only (via `/improvement-proposals` command)
- **Proposals for non-workflow changes**: Scope limited to agent prompts, commands, thresholds, and workflow configuration
- **Integration with WKFL-008**: Experiment data source is future work (WKFL-008 pending status)
- **Code changes beyond workflow config**: No modifications to application code (apps/*, packages/*)

### Reuse Plan

**Components to Reuse**:
- KB query patterns from confidence-calibrator.agent.md (date range filtering, tag-based search)
- Multi-source aggregation from pm-story-risk-predictor.agent.md (graceful degradation, source tracking)
- Output format patterns from pattern-miner.agent.md (YAML + Markdown hybrid)
- Proposal schema from heuristic-evolver.agent.md (status tracking, meta-learning)

**Patterns to Follow**:
- Command → Agent spawn pattern (see /calibration-report, /pattern-mine)
- KB integration with consistent tagging (all WKFL agents use standard tag structure)
- YAML frontmatter + Markdown body for reports (established in CALIBRATION-{date}.yaml)
- Graceful degradation when data sources unavailable (log warnings, continue with partial data)

**Packages to Leverage**:
- Knowledge Base API (`apps/api/knowledge-base/src/__types__/index.ts`) for schema definitions
- Existing WKFL agent patterns (5 completed agents with consistent structure)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Considerations**:

1. **Multi-Source Integration Testing**:
   - Test with all data sources available (calibration + patterns + heuristics + retro)
   - Test with each data source missing independently (graceful degradation)
   - Test with no data sources available (error handling)

2. **ROI Calculation Testing**:
   - Verify impact/effort mapping to numeric scores
   - Verify ROI score calculation formula
   - Verify priority bucketing (high/medium/low)
   - Test edge cases (impact=low, effort=low → medium priority, not high)

3. **Proposal Lifecycle Testing**:
   - Verify KB persistence (proposals queryable after generation)
   - Verify status transitions (proposed → accepted → rejected → implemented)
   - Verify acceptance pattern tracking (source acceptance rates computed correctly)
   - Test meta-learning feedback loop (acceptance patterns influence future proposals)

4. **Data Freshness Testing**:
   - Verify date range filtering works correctly
   - Test with stale data (month-old patterns → should be flagged)
   - Test with fresh data (current week → should be prioritized)

5. **Sample Size Requirements**:
   - Test with insufficient data (< 3 samples per pattern → should not generate proposal)
   - Test with sufficient data (≥ 3 samples → should generate proposal)
   - Test minimum story count (< 10 total stories → should warn)

**Testing Constraints**:
- Requires WKFL-002 KB data (calibration entries) in test environment
- Requires WKFL-006 output files (PATTERNS-{month}.yaml) in test environment
- Requires WKFL-003 output file (HEURISTIC-PROPOSALS.yaml) in test environment
- May need mock data if dependencies not yet deployed

### For UI/UX Advisor

**Note**: This is a CLI-only story (agent + command). No UI components required.

**UX Considerations**:
- Command output should clearly indicate which data sources were used vs unavailable
- Proposals should be formatted for easy copy/paste into issues or PRs
- Priority sections should be visually distinct (markdown headers with clear labels)
- ROI scores should be explained (not just raw numbers)

### For Dev Feasibility

**Key Implementation Considerations**:

1. **Data Source Orchestration**:
   - Implement parallel data source queries (don't wait for each sequentially)
   - Use Promise.allSettled() pattern to handle partial failures
   - Track which sources succeeded vs failed for logging

2. **Proposal Schema Design**:
   - Extend existing KB schema or create new `proposal` entry type
   - Include all required fields: id, title, source, evidence_id, status, impact, effort, roi_score, tags, timestamps
   - Design for queryability (tags must support filtering by source, status, priority)

3. **ROI Scoring Algorithm**:
   - Define numeric mapping for impact (high=9, medium=5, low=2)
   - Define numeric mapping for effort (low=1, medium=3, high=9)
   - Calculate ROI = impact / effort, scaled to 10-point scale
   - Document formula clearly in agent prompt

4. **Meta-Learning Implementation**:
   - Query KB for all proposals grouped by (source, status)
   - Compute percentages: acceptance_rate = accepted / (accepted + rejected)
   - Store meta-learnings in agent context for next run
   - Use patterns to adjust proposal confidence/priority

5. **Output Format**:
   - YAML frontmatter: metadata (generated_date, data_period, sources_used, stories_analyzed)
   - Markdown body: High/Medium/Low priority sections
   - Per-proposal structure: [P-XXX] title, source, evidence, impact/effort/ROI, status
   - Tracking summary table: proposals by week (proposed/accepted/rejected/implemented counts)

6. **Error Handling**:
   - KB unavailable: Fail gracefully, log error, cannot generate proposals without data
   - Pattern files missing: Log warning, continue with calibration + heuristics only
   - Insufficient data: Log warning, ask user to confirm continuation
   - Invalid date range: Error, require valid ISO date format

**Technical Constraints**:
- Sonnet model required (complex synthesis task)
- Read-only file access (no modifications to source code)
- KB read/write access required
- Must respect existing KB schema patterns

**Estimated Complexity**:
- Agent implementation: ~400-500 lines (similar to pattern-miner.agent.md)
- Command implementation: ~100-150 lines (similar to /calibration-report)
- Schema additions: ~50-100 lines (extend KB types)
- Total token estimate: 55K (per story.yaml - reasonable for sonnet agent with complex logic)

---

## Completion Signal

**STORY-SEED COMPLETE WITH WARNINGS: 3 warnings**

**Warnings**:
1. Baseline reality file not found - proceeding with limited context
2. WKFL-006 dependency in ready-for-qa status (not completed) - partial functionality possible
3. WKFL-008 dependency not yet implemented - experiments integration deferred to future

**Seed Quality**: High - comprehensive context from existing implementations, clear scope, well-defined acceptance criteria, actionable recommendations for subsequent phases.

**Recommendation**: Proceed with story elaboration. All warnings are non-blocking. Implementation can proceed with graceful degradation for missing data sources.
