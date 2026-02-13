# LERN Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| Pending | 7 |
| **Total** | **7** |

## Ready to Start (Once INFRA + MODL complete)

- LERN-001: Confidence Calibration
- LERN-002: Cross-Story Pattern Mining

---

### LERN-001: Confidence Calibration

**Status:** `pending`
**Priority:** P0
**Dependencies:** INFRA complete, MODL complete, WKFL-001 (done)
**Blocks:** LERN-004, LERN-006

**Description:**
Track stated confidence vs actual outcomes, compute calibration scores per agent, auto-adjust confidence thresholds. Runs as LangGraph node with Task Contract (model-agnostic).

**Task Contract:**
- reasoning_depth: moderate
- code_understanding: none
- max_cost_usd: 0.005

**Key Deliverables:**
- LangGraph calibration node
- Calibration Zod schema
- `/calibration-report` command (prototype)
- `CALIBRATION-{date}.yaml` output

**Acceptance Criteria:**
- [ ] Track: agent, finding, stated confidence, actual outcome
- [ ] Compute accuracy per agent per confidence level
- [ ] Alert when "high" accuracy drops below 90%
- [ ] Generate threshold adjustment recommendations
- [ ] Runs via Task Contract (model selector picks model)
- [ ] Reads data from workflow events (INFRA), not YAML files

---

### LERN-002: Cross-Story Pattern Mining

**Status:** `pending`
**Priority:** P0
**Dependencies:** INFRA complete, MODL complete, WKFL-001 (done)
**Blocks:** LERN-003, LERN-005, LERN-006

**Description:**
Weekly job mining patterns across story outcomes. Identifies recurring issues, anti-patterns, and successful approaches. Runs via Task Contract.

**Task Contract:**
- reasoning_depth: deep
- code_understanding: basic
- max_cost_usd: 0.05

**Key Deliverables:**
- LangGraph pattern mining node
- `/pattern-mine` command (prototype)
- `PATTERNS-{month}.yaml` output
- `AGENT-HINTS.yaml` for prompt injection

**Acceptance Criteria:**
- [ ] Analyze minimum 10 stories per mining run
- [ ] Identify file/path patterns correlated with failures
- [ ] Cluster similar findings (similarity > 0.85)
- [ ] Output actionable patterns for agent enhancement
- [ ] Reads from workflow events + OUTCOME.yaml artifacts
- [ ] Runs via Task Contract (model-agnostic)

---

### LERN-003: KB Compression

**Status:** `pending`
**Priority:** P1
**Dependencies:** LERN-002
**Blocks:** None

**Description:**
Monthly job to cluster, deduplicate, and compress KB entries. Embedding-based clustering is Tier 0 (code-only). Merge/summarization uses Task Contract.

**Key Deliverables:**
- LangGraph KB compression node
- `/kb-compress` command (exists as prototype)
- Compression report (before/after stats)

**Acceptance Criteria:**
- [ ] Cluster similar lessons (embedding similarity > 0.9)
- [ ] Merge clusters into canonical lessons
- [ ] Archive originals with pointer to canonical
- [ ] Report: entries before, after, token savings
- [ ] No loss of unique information

---

### LERN-004: Emergent Heuristic Discovery

**Status:** `pending`
**Priority:** P1
**Dependencies:** LERN-001
**Blocks:** None

**Description:**
Analyze decision outcomes to discover which patterns should be auto-accepted vs escalated. Evolve autonomy tiers based on data. Runs via Task Contract with deep reasoning.

**Key Deliverables:**
- LangGraph heuristic evolver node
- `HEURISTIC-PROPOSALS.yaml` output
- Integration with decision classification config

**Acceptance Criteria:**
- [ ] Track: pattern, auto_accepted, user_outcome (confirmed/overridden)
- [ ] Compute success rate per pattern (min 5 samples)
- [ ] Propose promotion when success rate > 95%
- [ ] Propose demotion when success rate < 80%
- [ ] All changes are proposals, not auto-applied

---

### LERN-005: Story Risk Predictor

**Status:** `pending`
**Priority:** P2
**Dependencies:** LERN-002
**Blocks:** None

**Description:**
Predict story risk before elaboration. Mostly Tier 0 (AC count, file count, similar stories). Optional Task Contract for nuanced assessment.

**Key Deliverables:**
- LangGraph risk predictor node
- Prediction schema (split_risk, review_cycles, token_estimate)
- Similar story finder (KB + event query)

**Acceptance Criteria:**
- [ ] Predict split_risk (0-1) based on AC count and scope
- [ ] Predict review_cycles based on complexity signals
- [ ] Predict token_estimate based on similar stories
- [ ] Include similar_stories array for reference
- [ ] Accuracy tracked for model improvement

---

### LERN-006: Improvement Proposals

**Status:** `pending`
**Priority:** P2
**Dependencies:** LERN-001, LERN-002
**Blocks:** None

**Description:**
Weekly proactive analysis generating prioritized improvement proposals. Aggregates signals from calibration, patterns, cost data, and experiments. Runs via Task Contract.

**Key Deliverables:**
- LangGraph improvement proposer node
- `/improvement-proposals` command (exists as prototype)
- `IMPROVEMENT-PROPOSALS-{date}.md` output

**Acceptance Criteria:**
- [ ] Analyze: calibration gaps, anti-patterns, experiment results, cost trends
- [ ] Generate proposals with effort/impact ratings
- [ ] Prioritize by impact/effort ratio
- [ ] Track: proposed, accepted, rejected, implemented
- [ ] Learn from acceptance patterns to improve proposals

---

### LERN-007: Workflow Experimentation + Replay

**Status:** `pending`
**Priority:** P2
**Dependencies:** INFRA complete, MODL complete
**Blocks:** None

**Description:**
A/B test workflow variations with metrics tracking. Includes replay harness for comparing runs with different models/prompts. Framework is Tier 0 (code); analysis uses Task Contract.

**Key Deliverables:**
- `.claude/config/experiments.yaml` schema
- LangGraph experiment analyzer node
- Replay harness (store run inputs/outputs, re-run with variant, compare)
- `/experiment-report` command (exists as prototype)

**Acceptance Criteria:**
- [ ] Define experiments with traffic split (e.g., 20%)
- [ ] Tag stories/runs with experiment variant
- [ ] Track metrics per variant (gate_pass_rate, cycle_time, cost)
- [ ] Statistical comparison (min 10 runs per variant)
- [ ] Generate rollout recommendation
- [ ] Replay: re-run prior run with new variant and compare
