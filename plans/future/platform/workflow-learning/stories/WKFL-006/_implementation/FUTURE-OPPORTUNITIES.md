# Future Opportunities - WKFL-006

Non-MVP enhancements and edge cases deferred from the MVP scope analysis.
These should be considered for follow-up stories or tracked in the KB.

---

## Deferred Enhancements

### 1. True Vector Embedding Clustering

**What**: Replace LLM-based semantic grouping (the MVP approach) with actual vector embedding similarity using an embedding model (e.g., OpenAI text-embedding-ada-002 or a local model).

**Why deferred**: Claude Code has no direct embedding API access. Implementing this requires either an MCP-provided embedding tool or an external service call, neither of which is scoped for WKFL-006.

**Value**: Higher precision clustering with a reproducible, numeric threshold (e.g., cosine similarity > 0.85). Reduces reliance on LLM judgment for grouping decisions.

**Candidate story**: New WKFL story "Embedding-Based Pattern Clustering" or add to WKFL-009 (KB compression, which may also benefit from semantic deduplication).

---

### 2. External Cron / Scheduled Execution

**What**: Automated weekly trigger of /pattern-mine without manual invocation.

**Why deferred**: Claude Code has no native cron. Implementing scheduled execution requires either a GitHub Actions workflow, a system cron job, or an MCP-provided scheduler.

**Value**: Ensures pattern data stays fresh without human intervention. Critical for the patterns to be actionable in ongoing agent calibration.

**Candidate story**: A separate infrastructure story "Workflow Intelligence Scheduler" that covers cron-based invocation of multiple automation commands (/pattern-mine, /calibrate, etc.).

---

### 3. Cross-Epic Pattern Mining

**What**: Extend pattern mining beyond workflow-learning stories to include code-audit, model-experimentation, and other epics.

**Why deferred**: WKFL-006 is explicitly scoped to workflow-learning OUTCOME.yaml files. Cross-project patterns are listed as a Non-goal.

**Value**: WKFL-001 elaboration flagged this as high-value. Patterns from the code-audit epic (e.g., which file types trigger most findings) would complement WKFL-007 risk prediction significantly.

**Candidate story**: New story in the Learning & Self-Optimization epic after WKFL-006 stabilizes.

---

### 4. Trend Analysis Across Mining Periods

**What**: Compare PATTERNS-{month}.yaml across multiple months to show whether anti-patterns are improving or regressing.

**Why deferred**: Single-period analysis is the MVP. Trend detection requires at least 2 mining periods to have completed, which won't be true at initial implementation.

**Value**: Allows the team to measure whether the workflow intelligence program is actually reducing failure rates over time. Critical for demonstrating ROI of the entire program.

**Candidate story**: Extend WKFL-006 in a follow-up story "Pattern Trend Reporting" after 2-3 months of mining data accumulates.

---

### 5. Interactive / Dashboard Pattern Reports

**What**: Render PATTERNS-{month}.yaml and ANTI-PATTERNS.md as an HTML dashboard or web view rather than flat YAML/Markdown files.

**Why deferred**: Markdown + YAML output is sufficient for MVP. Rendering infrastructure is out of scope.

**Value**: Significantly improves team accessibility of pattern data. Correlates with the "interactive retro reports" opportunity identified in WKFL-001 ELAB.

**Candidate story**: Frontend story under the model-experimentation or telemetry epics once the data model stabilizes.

---

### 6. Pattern Confidence Scoring

**What**: Add a confidence score to each pattern based on sample size and correlation variance across mining periods.

**Why deferred**: MVP patterns are reported at face value. Confidence modeling requires historical data across multiple periods.

**Value**: Prevents low-sample-size patterns (e.g., a 3-story sample showing 100% failure) from being injected as high-priority AGENT-HINTS. Reduces false signal.

**Candidate story**: Enhancement to WKFL-006 or a new story after the first two mining periods complete.

---

### 7. Automatic AGENT-HINTS Injection into Agent Prompts

**What**: Rather than requiring manual review and copy-paste of AGENT-HINTS.yaml, have the knowledge-context-loader agent automatically prepend relevant hints to agent system prompts at startup.

**Why deferred**: The injection mechanism for AGENT-HINTS.yaml is currently undefined in WKFL-006 (flagged as MVP-Critical Gap #5). The MVP approach is manual — a human reads AGENT-HINTS.yaml and updates relevant agent files. Automatic injection requires specifying the injection protocol.

**Value**: The primary payoff of pattern mining. Without automatic injection, hints must be manually applied, reducing the self-optimizing nature of the workflow intelligence program.

**Candidate story**: Core requirement for WKFL-007 (risk prediction) and WKFL-009 (KB compression). Should be resolved in WKFL-006 elaboration pass or as part of WKFL-007 design.

---

### 8. Deduplication of Patterns Across Mining Periods

**What**: Before writing a new PATTERNS-{month}.yaml, check whether the same pattern was reported in the previous month and suppress or merge duplicates.

**Why deferred**: MVP generates a fresh PATTERNS-{month}.yaml per run without cross-period deduplication. This matches the WKFL-001 gap finding about KB deduplication.

**Value**: Prevents AGENT-HINTS.yaml from accumulating redundant hints that dilute signal and inflate token cost at agent startup.

**Candidate story**: Enhancement to WKFL-006 or handled in WKFL-009 (KB compression).

---

## Edge Cases Deferred (Not MVP-Critical)

| # | Edge Case | Decision | Notes |
|---|-----------|----------|-------|
| 1 | OUTCOME.yaml with missing fields | Skip with warning | Log which file was skipped; don't abort the run |
| 2 | All stories from a single author | Note in output | Could skew agent-correlation patterns; add `author_diversity` field to mining metadata |
| 3 | Stories with 0 findings in VERIFICATION.yaml | Include in sample count | A story with no findings is a valid data point for "what predicts success" |
| 4 | Pattern mining run while WKFL-001 retro is in progress | Document as advisory | No locking mechanism needed at MVP; data consistency is "best effort" for batch analysis |
| 5 | PATTERNS-{month}.yaml already exists for current month | Overwrite with timestamp header | Document "last updated" field so consumers know the data freshness |
| 6 | Mining run takes > token budget (70k tokens) | Log warning, continue | Enforcement is "warning" per story.yaml; do not abort |
