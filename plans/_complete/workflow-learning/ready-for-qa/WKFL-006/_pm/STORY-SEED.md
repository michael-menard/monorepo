---
generated: "2026-02-07"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WKFL-006

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality files exist in the repository. This seed proceeds with codebase scanning and dependency analysis instead.

### Relevant Existing Features
WKFL-001 (completed) provides the foundation for this story:
- OUTCOME.yaml schema defined at `.claude/schemas/outcome-schema.md`
- workflow-retro agent created at `.claude/agents/workflow-retro.agent.md`
- /workflow-retro command available for manual retrospectives
- KB integration (kb_add_lesson) for persisting patterns
- WORKFLOW-RECOMMENDATIONS.md template exists

### Active In-Progress Work
Based on stories.index.md:
- WKFL-002 (Confidence Calibration) - Status: ready-to-work, also depends on WKFL-001
- WKFL-003 (Emergent Heuristic Discovery) - Status: ready-to-work, elaborated
- WKFL-005 (Doc Sync Agent) - Status: uat

No direct conflicts detected, but WKFL-002 and this story are parallel analysis stories both consuming OUTCOME.yaml.

### Constraints to Respect
- OUTCOME.yaml is not yet being generated (WKFL-001 schema exists but integration not yet active)
- No actual OUTCOME.yaml files found in repository (search returned 0 results)
- 37 VERIFICATION.yaml files exist across WISH and INST epics for analysis
- Pattern mining requires minimum 10 stories (AC-1) but no OUTCOME.yaml files exist yet
- Story may need to be deferred until WKFL-001's OUTCOME.yaml generation is activated

---

## Retrieved Context

### Related Endpoints
Not applicable - this is a workflow analysis story with no API endpoints.

### Related Components
Analysis and data source components:
- `.claude/schemas/outcome-schema.md` - OUTCOME.yaml structure (v1.0.0)
- `.claude/agents/workflow-retro.agent.md` - Single-story retro analysis (v1.0.0)
- `/Users/michaelmenard/Development/monorepo/plans/future/workflow-learning/WORKFLOW-RECOMMENDATIONS.md` - Output template

Existing data sources:
- 37 VERIFICATION.yaml files found across WISH and INST epics
- No OUTCOME.yaml files found (gap: WKFL-001 schema exists but generation not active)

### Reuse Candidates
From WKFL-001 implementation:
- OUTCOME.yaml schema structure for data parsing
- workflow-retro agent pattern detection logic (single-story analysis)
- KB integration patterns (kb_search, kb_add_lesson)
- WORKFLOW-RECOMMENDATIONS.md format

Pattern detection thresholds from workflow-retro agent:
- Minimum 3 occurrences for pattern significance
- 20%+ variance for token budget patterns
- Embedding similarity > 0.85 for clustering (specified in story ACs)

---

## Knowledge Context

### Lessons Learned
No lessons loaded (KB search not performed in seed phase). Future implementation should query KB for:
- "workflow patterns lessons" (tags: retro, pattern)
- "token budget estimation drift" (role: dev)
- "review cycle failures" (role: dev)

### Blockers to Avoid (from past stories)
Based on codebase analysis:
- **Missing data**: OUTCOME.yaml generation is defined but not yet active
- **Premature implementation**: Need to wait for WKFL-001 outcome generation to be activated
- **Sample size requirements**: AC-1 requires 10+ stories but no OUTCOME.yaml files exist

### Architecture Decisions (ADRs)
No ADRs directly relevant to workflow analysis stories. Standard ADRs apply:

| ADR | Title | Relevance |
|-----|-------|-----------|
| ADR-005 | Testing Strategy | Not applicable (no UAT for workflow analysis) |
| ADR-006 | E2E Tests in Dev | Not applicable (no UI/frontend) |

### Patterns to Follow
From WKFL-001 implementation:
- Use KB integration for pattern persistence
- Define significance thresholds for pattern detection
- Output human-readable recommendations alongside structured data
- Support batch processing mode

### Patterns to Avoid
- Reading full serverless.yml (not applicable to this story)
- API path mismatches (not applicable - no API endpoints)
- Using mocks in UAT (not applicable - no testing component)

---

## Conflict Analysis

### Conflict: Missing Data Source
- **Severity**: warning
- **Description**: WKFL-001 completed and defined OUTCOME.yaml schema, but no OUTCOME.yaml files exist in the repository. The dev-documentation-leader.agent.md was modified to generate OUTCOME.yaml (v3.0.0 → v3.1.0), but this change hasn't been activated in any completed stories yet. AC-1 requires minimum 10 stories, but 0 OUTCOME.yaml files are available.
- **Resolution Hint**: Either (1) defer WKFL-006 until WKFL-001 outcome generation is activated and 10+ stories complete, or (2) implement pattern-miner agent now with fallback to analyze existing VERIFICATION.yaml files (37 available) as interim data source, then migrate to OUTCOME.yaml when available.
- **Source**: codebase reality

---

## Story Seed

### Title
Cross-Story Pattern Mining

### Description

**Context:**
WKFL-001 established the foundation for workflow meta-learning by defining the OUTCOME.yaml schema and creating the workflow-retro agent for single-story retrospective analysis. However, individual story retrospectives cannot detect patterns that emerge across multiple stories over time. We need a system that periodically analyzes all completed stories to identify recurring issues, anti-patterns, and successful approaches that can inform workflow improvements.

**Problem:**
Currently:
1. Patterns are only detected within single story contexts
2. Cross-story correlations (e.g., "routes.ts files fail lint 78% of the time") are invisible
3. AC phrasing patterns that correlate with verification failures are not tracked
4. Agent correlation patterns (e.g., backend-coder → security reviewer conflicts) are not detected
5. No mechanism exists to cluster similar findings across stories
6. Workflow improvements are reactive rather than data-driven

**Proposed Solution:**
Create a pattern mining agent that runs weekly (or on-demand) to:
1. Query all OUTCOME.yaml and VERIFICATION.yaml files from the last N days
2. Cluster similar findings using embedding similarity (threshold > 0.85)
3. Detect file/path patterns that correlate with failures
4. Identify AC phrasing patterns that correlate with under-specification
5. Track agent correlation patterns (which agent pairs frequently conflict)
6. Output distilled patterns in multiple formats:
   - PATTERNS-{month}.yaml for structured data
   - ANTI-PATTERNS.md for human-readable reference
   - AGENT-HINTS.yaml for injection into agent prompts

**Data Source Reality:**
Note: WKFL-001 defined OUTCOME.yaml schema but generation is not yet active (0 files found). Implementation should support fallback to VERIFICATION.yaml (37 files available) until OUTCOME.yaml generation is activated.

### Initial Acceptance Criteria

- [ ] AC-1: Analyze minimum 10 stories per mining run
  - Verification: Run requires >= 10 OUTCOME.yaml files or skips with warning
  - Reality: Currently 0 OUTCOME.yaml files; may need VERIFICATION.yaml fallback

- [ ] AC-2: Identify file/path patterns that correlate with failures
  - Verification: PATTERNS-{month}.yaml has file_patterns section
  - Pattern example: "routes.ts files fail lint 78% of first reviews"

- [ ] AC-3: Identify AC patterns that correlate with under-specification
  - Verification: PATTERNS-{month}.yaml has ac_patterns section
  - Pattern example: "ACs with 'should be intuitive' fail verification 80%"

- [ ] AC-4: Cluster similar findings (embedding similarity > 0.85)
  - Verification: Clustered findings grouped in output
  - Requires embedding-based similarity computation

- [ ] AC-5: Output actionable patterns for agent enhancement
  - Verification: AGENT-HINTS.yaml has patterns injectable into prompts
  - Example: "routes.ts files frequently have import order issues"

- [ ] AC-6: ANTI-PATTERNS.md documents patterns to avoid
  - Verification: File exists with human-readable anti-patterns
  - For team reference and training

### Non-Goals

- Real-time pattern detection (batched weekly analysis only)
- Cross-project patterns (single monorepo only)
- Semantic code analysis (file/path patterns, not code semantics)
- Automated workflow changes (generate proposals, not auto-apply)
- Risk prediction (that's WKFL-007's job, which consumes this story's output)

### Reuse Plan

**Must Reuse:**
- OUTCOME.yaml schema from WKFL-001 (`.claude/schemas/outcome-schema.md`)
- VERIFICATION.yaml structure from existing workflow
- KB tools (kb_search, kb_add_lesson) for pattern storage
- Pattern detection thresholds from workflow-retro agent (3+ occurrences, 20%+ variance)

**May Create:**
- pattern-miner.agent.md (sonnet model for cross-story analysis)
- /pattern-mine command (manual trigger, future weekly cron)
- PATTERNS-{month}.yaml schema (structured output)
- AGENT-HINTS.yaml schema (for prompt injection)
- ANTI-PATTERNS.md template (human-readable reference)

**Patterns to Follow:**
- Batch processing mode (analyze N days of stories)
- KB integration for pattern persistence
- Multiple output formats (structured + human-readable)
- Significance thresholds (minimum sample size before declaring pattern)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Considerations:**
- This is a data analysis story with no UI or API endpoints
- Testing should focus on pattern detection logic and clustering algorithms
- Mock OUTCOME.yaml and VERIFICATION.yaml data for deterministic tests
- Test significance thresholds (edge cases: 2 vs 3 occurrences, 0.84 vs 0.85 similarity)
- Verify output schema compliance (PATTERNS.yaml, AGENT-HINTS.yaml structures)

**Test Data Requirements:**
- Need synthetic OUTCOME.yaml files representing various patterns:
  - Token overrun pattern (3+ stories with 20%+ variance)
  - File failure pattern (routes.ts fails lint in 3+ stories)
  - AC pattern (vague ACs fail verification in 3+ stories)
  - Agent correlation pattern (coder → reviewer conflicts in 3+ stories)

**Coverage Focus:**
- Pattern detection thresholds
- Clustering algorithm (embedding similarity)
- File/path pattern extraction
- AC text pattern extraction
- Output format generation

### For UI/UX Advisor

Not applicable - this is a backend workflow analysis story with no user-facing UI.

### For Dev Feasibility

**Key Technical Challenges:**

1. **Data Source Gap**: OUTCOME.yaml generation defined but not active
   - **Impact**: 0 OUTCOME.yaml files available, but AC-1 requires 10+
   - **Recommendation**: Implement dual-mode support:
     - Primary: OUTCOME.yaml analysis (future-ready)
     - Fallback: VERIFICATION.yaml analysis (works with 37 existing files)
   - **Migration path**: When OUTCOME.yaml generation activates, switch to primary mode

2. **Embedding Similarity**: AC-4 requires clustering with similarity > 0.85
   - **Challenge**: Need embedding computation for finding text
   - **Options**:
     - Use OpenAI embeddings API (external dependency)
     - Use local embedding model (e.g., sentence-transformers)
     - Defer clustering to future story (implement pattern detection first)
   - **Recommendation**: Start with simple text similarity (Levenshtein distance), propose embedding upgrade in future story

3. **File/Path Pattern Detection**: Correlation analysis
   - **Challenge**: How to determine "routes.ts fails lint 78%"?
   - **Approach**: Parse VERIFICATION.yaml findings, extract file paths, compute failure rates
   - **Edge cases**: Different file extensions, nested paths, glob patterns

4. **AC Text Pattern Detection**: NLP on acceptance criteria text
   - **Challenge**: Extract vague phrases like "intuitive", "obvious", "clear"
   - **Approach**: Define anti-pattern regex patterns, scan AC text from story.yaml
   - **Correlation**: Cross-reference AC text with VERIFICATION.yaml verdicts

5. **Output Schemas**: Three distinct output formats
   - **PATTERNS-{month}.yaml**: Structured data (file_patterns, ac_patterns, agent_correlations, cycle_predictors)
   - **AGENT-HINTS.yaml**: Prompt injection format (per-agent hints)
   - **ANTI-PATTERNS.md**: Human-readable markdown
   - **Recommendation**: Define schemas in `.claude/schemas/` before implementation

6. **Weekly Cron/Command Trigger**: Execution mechanism
   - **Command**: `/pattern-mine` (manual trigger)
   - **Cron**: Future work (requires infrastructure not yet defined)
   - **Recommendation**: Implement command first, document cron setup for future

**Dependencies:**
- WKFL-001: OUTCOME.yaml schema ✅ (defined, but generation not active)
- VERIFICATION.yaml: Existing data source ✅ (37 files available)
- KB tools: Available ✅ (kb_search, kb_add_lesson)

**Blocks:**
- WKFL-007: Risk Predictor (needs PATTERNS.yaml as input)
- WKFL-009: KB Compress (uses patterns for clustering)
- WKFL-010: Improvement Proposals (consumes pattern output)

**Token Budget Estimate:**
- Story defines 70,000 tokens (P1 analysis story)
- Comparable to WKFL-001 (foundation story)
- Sonnet model required for cross-story pattern analysis
- Budget should be sufficient for agent implementation + testing

**Implementation Path:**
1. Define output schemas (PATTERNS.yaml, AGENT-HINTS.yaml)
2. Implement data loading (VERIFICATION.yaml fallback, OUTCOME.yaml when available)
3. Implement pattern detection (file patterns, AC patterns, agent correlations)
4. Implement clustering (start with simple text similarity, defer embeddings)
5. Implement output generation (three formats)
6. Create /pattern-mine command
7. Write tests (pattern detection logic, output schemas)
8. Document weekly cron setup for future activation

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning (missing OUTCOME.yaml data source)**
