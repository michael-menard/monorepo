# WKFL Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| Pending | 0 |
| Created | 0 |
| In Elaboration | 1 |
| Ready to Work | 0 |
| In Progress | 0 |
| Ready for QA | 0 |
| In QA | 0 |
| In UAT | 5 |
| Completed | 4 |
| **Total** | **10** |

## Ready to Start (No Blockers)

_None - all stories in progress or completed_

## Phase 1: Foundation

### WKFL-001: Meta-Learning Loop (Retro Agent)

**Status:** `completed`
**Priority:** P0 (Foundation)
**Dependencies:** None
**Blocks:** WKFL-002, WKFL-006, WKFL-008

**Description:**
Create a retrospective agent that runs after every story completion to analyze outcomes and propose workflow improvements.

**Scope:**
- Create `OUTCOME.yaml` schema and writer (captures all story metrics)
- Create `workflow-retro.agent.md` (sonnet) that analyzes outcomes
- Create `/workflow-retro` command (or auto-trigger on `/wt-finish`)
- Output: `RETRO-{story-id}.yaml` with analysis and proposals
- KB integration: Write significant findings via `kb_add_lesson`

**Key Deliverables:**
- `OUTCOME.yaml` schema in `.claude/schemas/outcome-schema.md` - COMPLETE
- Outcome writer integration in `dev-documentation-leader.agent.md` - COMPLETE
- `workflow-retro.agent.md` with analysis logic - COMPLETE
- `/workflow-retro` command - COMPLETE
- KB writes for patterns detected - COMPLETE
- `WORKFLOW-RECOMMENDATIONS.md` - COMPLETE

**Acceptance Criteria:**
- [x] Every completed story generates `OUTCOME.yaml`
- [x] Retro agent runs (manual or auto) after completion
- [x] Analysis compares estimated vs actual (tokens, cycles)
- [x] Repeated failure patterns are detected and logged to KB
- [x] Proposals are written to `WORKFLOW-RECOMMENDATIONS.md`

**Implementation Notes:**
- Implemented 2026-02-07
- See `PROOF-WKFL-001.md` for full verification details

---

### WKFL-004: Human Feedback Capture

**Status:** `completed`
**Priority:** P0 (Foundation)
**Dependencies:** None
**Blocks:** None (unblocked WKFL-002, WKFL-003)

**Description:**
Add `/feedback` command to capture explicit human judgment on agent findings, enabling calibration and heuristic improvement.

**Scope:**
- Create `/feedback` command with subcommands
- KB schema for feedback entries
- Integration with finding IDs from VERIFICATION.yaml

**Key Deliverables:**
- `.claude/commands/feedback.md`
- KB schema: `feedback` entry type
- Feedback aggregation queries

**Acceptance Criteria:**
- [x] `/feedback SEC-042 --false-positive "reason"` captures to KB
- [x] `/feedback ARCH-015 --helpful "note"` captures to KB
- [x] Feedback linked to agent, story, and finding
- [x] Queryable via `kb_search` with `tags: ["feedback"]`

**Verification Notes:**
- QA PASS: 2026-02-07T17:31:00Z
- All 5 acceptance criteria verified
- 38 tests passing (27 unit, 11 integration)
- Schema implementation complete at `src/__types__/index.ts`
- Command documentation complete at `.claude/commands/feedback.md`

---

### WKFL-005: Doc Sync Agent

**Status:** `uat`
**Priority:** P0 (Foundation)
**Dependencies:** None
**Blocks:** None
**Elaborated:** 2026-02-07 (PASS)
**Implemented:** 2026-02-07 (PASS)
**QA Verified:** 2026-02-07 (PASS)

**Description:**
Create an agent that automatically updates FULL_WORKFLOW.md when agents or commands change, preventing documentation drift.

**Scope:**
- Create `doc-sync.agent.md` (haiku) - COMPLETE
- File change detection for `.claude/agents/` and `.claude/commands/` - COMPLETE
- Mermaid diagram regeneration - COMPLETE
- Changelog entry drafting - COMPLETE

**Key Deliverables:**
- `doc-sync.agent.md` - COMPLETE (10KB, 340 lines, 7 phases)
- `/doc-sync` command - COMPLETE (7.6KB, comprehensive usage docs)
- `SYNC-REPORT.md` output format - COMPLETE (6 required sections)

**Acceptance Criteria (QA Verified):**
- [x] Adding new agent updates "Agents & Sub-Agents" sections
- [x] Mermaid diagrams regenerated on structure change
- [x] Changelog entry drafted with correct version bump
- [x] Reports what sections were updated
- [x] SYNC-REPORT.md shows all changes
- [x] Runs via command or pre-commit hook

**Verification Notes:**
- All 6/6 acceptance criteria PASS
- 100% functional coverage
- Architecture compliant
- Design quality: EXCELLENT
- Ready for production use

---

## Phase 2: Analysis

### WKFL-002: Confidence Calibration

**Status:** `completed`
**Priority:** P1 (Analysis)
**Dependencies:** WKFL-001
**Blocks:** None (unblocked WKFL-003, WKFL-010)
**Implemented:** 2026-02-07 (PASS)
**QA Verified:** 2026-02-07 (PASS)

**Description:**
Track stated confidence vs actual outcomes, compute calibration scores per agent, and auto-adjust confidence thresholds.

**Scope:**
- Create `confidence-calibrator.agent.md` (haiku) - COMPLETE
- Schema for calibration entries in KB - COMPLETE
- Weekly calibration job - COMPLETE (manual MVP)
- Threshold adjustment recommendations - COMPLETE

**Key Deliverables:**
- Calibration tracking schema (`CalibrationEntrySchema`) - COMPLETE
- `confidence-calibrator.agent.md` - COMPLETE
- `/calibration-report` command - COMPLETE
- `CALIBRATION-{date}.yaml` output format - COMPLETE
- Feedback integration (Step 5b in feedback.md) - COMPLETE

**Acceptance Criteria:**
- [x] Track: agent, finding, stated confidence, actual outcome
- [x] Compute accuracy per agent per confidence level
- [x] Alert when "high" accuracy drops below 90%
- [x] Generate threshold adjustment recommendations
- [x] Recommendations are actionable (specific threshold changes)

**Verification Notes:**
- QA PASS: 2026-02-07T21:27:00Z
- All 5 acceptance criteria verified
- 36 tests passing (25 unit, 11 integration)
- Schema implementation complete at `src/__types__/index.ts`
- Agent implementation complete at `.claude/agents/confidence-calibrator.agent.md`
- Command implementation complete at `.claude/commands/calibration-report.md`

---

### WKFL-006: Cross-Story Pattern Mining

**Status:** `completed`
**Priority:** P1 (Analysis)
**Dependencies:** WKFL-001
**Blocks:** None (downstream dependencies cleared)
**Elaborated:** 2026-02-07 (PASS)
**Implemented:** 2026-02-07 (REVIEW PASS)
**QA Verified:** 2026-02-07 (PASS)

**Description:**
Weekly job that mines patterns across all story outcomes to identify recurring issues, anti-patterns, and successful approaches.

**Scope:**
- Create `pattern-miner.agent.md` (sonnet)
- Query all OUTCOME.yaml and VERIFICATION.yaml from last N days
- Cluster similar findings using text similarity (MVP)
- Output distilled patterns with configurable thresholds

**Key Deliverables:**
- `pattern-miner.agent.md`
- `/pattern-mine` command with configurable parameters
- `PATTERNS-{month}.yaml` output
- `ANTI-PATTERNS.md` for team reference
- `AGENT-HINTS.yaml` for injection into prompts

**Acceptance Criteria:**
- [x] Analyze minimum 10 stories per mining run
- [x] Identify file/path patterns that correlate with failures (configurable threshold)
- [x] Identify AC patterns that correlate with under-specification (configurable threshold)
- [x] Cluster similar findings (text similarity > 0.70 for MVP, embeddings future)
- [x] Output actionable patterns for agent enhancement

**Elaboration Notes:**
- All 4 Decision Completeness issues resolved
- Pattern thresholds configured: --min-occurrences 3 (default), --min-correlation 0.60 (default)
- Time window modes: --days 30 (rolling, default), --month YYYY-MM (fixed month)
- Clustering: Text similarity MVP with documented embedding upgrade path (WKFL-006-B)
- Weekly cron: Documented for future, MVP is manual `/pattern-mine` command
- 14 non-blocking items logged to KB for future reference
- See ELAB-WKFL-006.md for full elaboration report

---

## Phase 3: Adaptation

### WKFL-003: Emergent Heuristic Discovery

**Status:** `uat`
**Priority:** P2 (Adaptation)
**Dependencies:** None (unblocked)
**Blocks:** WKFL-010
**Elaborated:** 2026-02-07 (CONDITIONAL PASS)
**Implemented:** 2026-02-07 (PASS - force-continued, WKFL-002 dependency pending)
**QA Verified:** 2026-02-07 (PASS)

**Description:**
Analyze decision outcomes to discover which patterns should be auto-accepted vs escalated, evolving autonomy tiers based on data.

**Scope:**
- Create `heuristic-evolver.agent.md` (sonnet)
- Track auto-accept success rate per pattern
- Generate tier promotion/demotion proposals
- Safe rollout mechanism

**Key Deliverables:**
- `.claude/schemas/decision-outcome-schema.md` - COMPLETE
- `.claude/agents/heuristic-evolver.agent.md` - COMPLETE
- `.claude/config/HEURISTIC-PROPOSALS.yaml` - COMPLETE
- Integration with `.claude/config/decision-classification.yaml` - COMPLETE (proposals-only)

**Acceptance Criteria:**
- [x] Track: pattern, auto_accepted, user_outcome (confirmed/overridden)
- [x] Compute success rate per pattern (min 5 samples)
- [x] Propose promotion when success rate > 95%
- [x] Propose demotion when success rate < 80%
- [x] All changes are proposals, not auto-applied

---

### WKFL-007: Story Risk Predictor

**Status:** `completed`
**Priority:** P2 (Adaptation)
**Dependencies:** None
**Blocks:** None
**Created:** 2026-02-07
**Elaborated:** 2026-02-07 (CONDITIONAL PASS)
**Implemented:** 2026-02-07 (PASS)
**QA Verified:** 2026-02-07 (PASS)

**Description:**
Before elaboration, predict story risk (split likelihood, review cycles, token cost) based on historical patterns.

**Scope:**
- Create `pm-story-risk-predictor.agent.md` (haiku)
- Feature extraction from story (AC count, scope, similar stories)
- Prediction model (heuristic-based initially, enhanced with WKFL-006 patterns)
- Integration with PM story generation pipeline
- Graceful degradation (heuristics-only mode when WKFL-006 unavailable)

**Key Deliverables:**
- `pm-story-risk-predictor.agent.md`
- Prediction schema in story output (YAML frontmatter)
- Similar story finder (KB query)
- Accuracy tracking for calibration

**Acceptance Criteria (7 total):**
- [ ] Predict split_risk (0-1) based on AC count and scope
- [ ] Predict review_cycles based on complexity signals
- [ ] Predict token_estimate based on similar stories
- [ ] Include similar_stories array for reference
- [ ] Accuracy tracked for model improvement
- [x] Accuracy tracking trigger mechanism specified (AC-6)
- [x] Predictor failure handling in PM pipeline specified (AC-7)

**Elaboration Notes:**
- Verdict: CONDITIONAL PASS (2 ACs added for production reliability)
- All MVP gaps resolved: 6 issues found, 2 added as ACs, 5 resolved via implementation notes
- Non-blocking: 12 enhancement opportunities logged to KB for future work
- Token estimate: 45K (unchanged - clarifications only)
- See ELAB-WKFL-007.md for full elaboration report

**Implementation Notes:**
- Story file: `plans/future/workflow-learning/ready-to-work/WKFL-007/WKFL-007.md`
- Test plan: `_pm/TEST-PLAN.md`
- Feasibility review: `_pm/DEV-FEASIBILITY.md`
- Estimated effort: 45K tokens
- Implements degraded mode for WKFL-006 dependency

---

### WKFL-009: Knowledge Compressor

**Status:** `uat`
**Priority:** P2 (Adaptation)
**Dependencies:** WKFL-006 (completed)
**Blocks:** None
**Elaborated:** 2026-02-07 (CONDITIONAL PASS)
**Implementation Started:** 2026-02-07
**Implementation Complete:** 2026-02-07 (REVIEW PASS)
**QA Verified:** 2026-02-07 (PASS)

**Description:**
Monthly job to cluster, deduplicate, and compress KB entries, maintaining a high-signal knowledge base.

**Scope:**
- Create `kb-compressor.agent.md` (haiku)
- Embedding-based clustering (similarity > 0.9)
- Merge into canonical entries
- Archive originals with pointers
- Schema migration (4 new columns for archival state)

**Key Deliverables:**
- `kb-compressor.agent.md`
- `/kb-compress` command (or monthly cron)
- Compression report with before/after stats
- Database schema migration (AC-7)

**Acceptance Criteria:**
- [x] Cluster similar lessons (embedding similarity > 0.9) - AC-1
- [x] Merge clusters into canonical lessons - AC-2
- [x] Archive originals with pointer to canonical - AC-3
- [x] Report: entries before, after, token savings - AC-4
- [x] No loss of unique information (automated test + manual spot-check) - AC-5
- [x] Haiku model agent with /kb-compress command - AC-6
- [x] Schema migration adds archival columns - AC-7

**Elaboration Notes:**
- Verdict: CONDITIONAL PASS (MVP-critical gaps resolved)
- Schema migration required: archived, archived_at, canonical_id, is_canonical columns
- Similarity approach committed: Option A (semanticSearch per entry) for MVP
- AC-5 updated with concrete verification criteria (automated + manual)
- 14 non-blocking findings logged to KB for future work
- See ELAB-WKFL-009.md for full elaboration report

---

## Phase 4: Experimentation

### WKFL-008: Workflow Experimentation Framework

**Status:** `ready-for-qa`
**Priority:** P3 (Experimentation)
**Dependencies:** WKFL-001
**Blocks:** None
**Created:** 2026-02-08
**Elaboration Started:** 2026-02-08
**Elaboration Completed:** 2026-02-07
**Implementation Started:** 2026-02-07
**Implementation Completed:** 2026-02-07

**Description:**
A/B test workflow variations (fast-track, parallel review, etc.) with metrics tracking and controlled rollout.

**Scope:**
- Create experiments config schema
- Create `experiment-analyzer.agent.md` (sonnet)
- Traffic routing mechanism
- Metric comparison and winner detection

**Key Deliverables:**
- `.claude/config/experiments.yaml` schema
- `experiment-analyzer.agent.md`
- `/experiment-report` command
- Rollout mechanism for winners
- Traffic routing in pm-story-generation-leader
- OUTCOME.yaml and story.yaml schema extensions

**Acceptance Criteria:**
- [ ] Define experiments with traffic split (e.g., 20%)
- [ ] Tag stories with experiment variant
- [ ] Track metrics per variant (gate_pass_rate, cycle_time, etc.)
- [ ] Statistical comparison (min 10 stories per variant)
- [ ] Generate rollout recommendation

**Story File:** `plans/future/workflow-learning/backlog/WKFL-008/WKFL-008.md`

**Estimated Effort:** 95,000 tokens (85k core + 10k risk mitigation)

**Risk Predictions:**
- Split risk: 0.6 (medium-high)
- Review cycles: 3
- Token estimate: 95,000

**Implementation Notes:**
- Story file: `plans/future/workflow-learning/backlog/WKFL-008/WKFL-008.md`
- Test plan: `_pm/TEST-PLAN.md`
- Feasibility review: `_pm/DEV-FEASIBILITY.md`
- Future risks: `_pm/FUTURE-RISKS.md`
- Risk predictions: `_pm/RISK-PREDICTIONS.yaml`

---

### WKFL-010: Improvement Proposal Generator

**Status:** `uat`
**Priority:** P3 (Experimentation)
**Dependencies:** WKFL-006
**Blocks:** None
**Elaboration Started:** 2026-02-07
**Elaboration Completed:** 2026-02-07 (CONDITIONAL PASS)
**Implementation Completed:** 2026-02-07 (REVIEW PASS)
**QA Verified:** 2026-02-07 (PASS)

**Description:**
Weekly proactive analysis that generates actionable improvement proposals based on all learning system outputs.

**Scope:**
- Create `improvement-proposer.agent.md` (sonnet)
- Aggregate inputs from calibration, patterns, experiments
- Generate prioritized proposals
- Track proposal outcomes

**Key Deliverables:**
- `improvement-proposer.agent.md`
- `/improvement-proposals` command
- `IMPROVEMENT-PROPOSALS-{date}.md` output

**Acceptance Criteria:**
- [x] Aggregate inputs from calibration, patterns, experiments (AC-1)
- [x] Generate proposals with effort/impact ratings (AC-2)
- [x] Prioritize by impact/effort ratio (AC-3)
- [x] Track: proposed, accepted, rejected, implemented (AC-4)
- [x] Learn from acceptance patterns to improve proposals (AC-5)

**Elaboration Notes:**
- Verdict: CONDITIONAL PASS (no MVP-critical gaps, split recommended but optional)
- All 8 audit checks passed (7 PASS, 1 CONDITIONAL PASS on Story Sizing)
- No ACs added - all MVP requirements already captured
- 15 non-blocking findings logged to KB (7 gaps + 8 enhancements) for future phases
- Split recommendation: WKFL-010-A (Core MVP, 40K), WKFL-010-B (Dedup, 10K), WKFL-010-C (Meta-Learning, 10K)
- See ELAB-WKFL-010.md for full elaboration report

---

## Dependency Graph

```mermaid
graph TD
    WKFL-001[WKFL-001<br/>Retro Agent] --> WKFL-002[WKFL-002<br/>Calibration]
    WKFL-001 --> WKFL-006[WKFL-006<br/>Pattern Miner]
    WKFL-001 --> WKFL-008[WKFL-008<br/>Experiments]

    WKFL-004[WKFL-004<br/>Feedback] --> WKFL-002
    WKFL-004 --> WKFL-003[WKFL-003<br/>Heuristics]

    WKFL-002 --> WKFL-003
    WKFL-002 --> WKFL-010[WKFL-010<br/>Proposals]

    WKFL-006 --> WKFL-007[WKFL-007<br/>Risk Predictor]
    WKFL-006 --> WKFL-009[WKFL-009<br/>KB Compress]
    WKFL-006 --> WKFL-010

    WKFL-005[WKFL-005<br/>Doc Sync]

    style WKFL-001 fill:#90EE90
    style WKFL-004 fill:#90EE90
    style WKFL-005 fill:#90EE90
```

Legend: Green = No dependencies (ready to start)

---

## Execution Plan

### Sprint 1: Foundation
- **WKFL-001** (Retro Agent) - 2-3 days
- **WKFL-004** (Feedback) - 1 day
- **WKFL-005** (Doc Sync) - 1-2 days

### Sprint 2: Analysis
- **WKFL-002** (Calibration) - 2 days
- **WKFL-006** (Pattern Miner) - 2-3 days

### Sprint 3: Adaptation
- **WKFL-003** (Heuristics) - 2 days
- **WKFL-007** (Risk Predictor) - 1-2 days
- **WKFL-009** (KB Compress) - 1 day

### Sprint 4: Experimentation
- **WKFL-008** (Experiments) - 3 days
- **WKFL-010** (Proposals) - 2 days

**Total estimated effort:** ~4 sprints / 2-3 weeks
