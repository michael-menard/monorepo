---
id: WKFL-006
title: Cross-Story Pattern Mining
status: elaboration
priority: P1
phase: analysis
epic: workflow-learning
created: 2026-02-06
updated: 2026-02-07
estimated_tokens: 70000
dependencies:
  - WKFL-001
blocks:
  - WKFL-007
  - WKFL-009
  - WKFL-010
tags:
  - analysis
  - patterns
  - mining
  - kb-integration
---

# WKFL-006: Cross-Story Pattern Mining

## Context

WKFL-001 established the foundation for workflow meta-learning by defining the OUTCOME.yaml schema and creating the workflow-retro agent for single-story retrospective analysis. This provides individual story insights, but patterns that emerge across multiple stories remain invisible.

**Current State:**
- OUTCOME.yaml schema defined at `.claude/schemas/outcome-schema.md` (WKFL-001)
- workflow-retro agent analyzes single stories at `.claude/agents/workflow-retro.agent.md`
- 37 VERIFICATION.yaml files exist across WISH and INST epics
- 0 OUTCOME.yaml files exist (schema defined but generation not yet active)
- Pattern detection thresholds established (3+ occurrences, 20%+ variance, 0.85 similarity)
- KB integration available (kb_search, kb_add_lesson)

**Problem:**
Individual story retrospectives cannot detect cross-story patterns such as:
1. File/path patterns that correlate with failures (e.g., "routes.ts files fail lint 78% of the time")
2. AC phrasing patterns that correlate with verification failures (e.g., "should be intuitive" leads to under-specification)
3. Agent correlation patterns (e.g., security reviewer → architecture reviewer conflicts)
4. Cycle prediction patterns (e.g., stories touching 5+ files average 2.8 review cycles)
5. Token budget drift patterns (e.g., frontend stories consistently overrun by 30%)

**Why Now:**
- Sufficient workflow data accumulating (37 VERIFICATION.yaml files)
- Foundation in place (WKFL-001 retro agent, OUTCOME.yaml schema)
- Blocks downstream stories: WKFL-007 (Risk Predictor), WKFL-009 (KB Compress), WKFL-010 (Improvement Proposals)

**Constraints:**
- OUTCOME.yaml generation not yet active (0 files available, but AC-1 requires 10+)
- Must support fallback to VERIFICATION.yaml as interim data source (37 files available)
- No embedding infrastructure yet exists (AC-4 clustering may use text similarity for MVP)

## Goal

Create a pattern mining agent that periodically analyzes completed stories to:
1. Detect recurring issues across multiple stories (minimum 10 stories per run)
2. Cluster similar findings using similarity-based grouping (threshold > 0.85)
3. Identify file/path patterns that correlate with failures
4. Extract AC phrasing patterns that correlate with under-specification
5. Track agent correlation patterns (which agent pairs frequently conflict)
6. Output actionable patterns in multiple formats:
   - PATTERNS-{month}.yaml (structured data for programmatic use)
   - ANTI-PATTERNS.md (human-readable reference for team)
   - AGENT-HINTS.yaml (injectable recommendations for agent prompt enhancement)

**Success Criteria:**
- Pattern mining runs successfully with ≥10 stories
- Patterns validated as accurate (manual review of sample patterns)
- Outputs actionable (AGENT-HINTS.yaml recommendations can be integrated)
- KB patterns queryable and useful for future stories

## Non-Goals

- **Real-time pattern detection** - Batch analysis only (weekly or on-demand)
- **Cross-project patterns** - Single monorepo scope only
- **Semantic code analysis** - File/path patterns only, not code semantics or AST parsing
- **Automated workflow changes** - Generate proposals for human review, not auto-apply
- **Risk prediction** - That's WKFL-007's job (consumes this story's pattern output)
- **Weekly cron automation** - Manual command for MVP, document cron setup for future

**Protected Features (Must Not Modify):**
- OUTCOME.yaml schema (from WKFL-001)
- VERIFICATION.yaml structure (existing workflow)
- workflow-retro agent logic (single-story analysis)
- KB schema (from WKFL-004)

## Scope

### In Scope

**Agent:**
- `pattern-miner.agent.md` (sonnet model for cross-story analysis)
  - Data loading (dual-mode: OUTCOME.yaml primary, VERIFICATION.yaml fallback)
  - Pattern detection (file patterns, AC patterns, agent correlations, cycle predictors)
  - Clustering algorithm (similarity > 0.85, may use text similarity for MVP)
  - Output generation (three formats)
  - KB integration (persist significant patterns)

**Command:**
- `/pattern-mine` (manual trigger)
  - Parameters: `--days N` (analyze last N days, default: 30)
  - Parameters: `--month YYYY-MM` (analyze specific month, overrides --days)
  - Parameters: `--use-outcomes` / `--use-verifications` (force data source)
  - Parameters: `--min-correlation` (minimum correlation threshold, default: 0.60)
  - Parameters: `--min-occurrences` (minimum occurrence threshold, default: 3)

**Schemas:**
- `.claude/schemas/patterns-schema.yaml` (PATTERNS-{month}.yaml structure)
- `.claude/schemas/agent-hints-schema.yaml` (AGENT-HINTS.yaml structure)

**Outputs:**
- `.claude/patterns/PATTERNS-{YYYY-MM}.yaml` (structured data)
- `.claude/patterns/AGENT-HINTS.yaml` (per-agent recommendations)
- `.claude/patterns/ANTI-PATTERNS.md` (human-readable patterns to avoid)

**KB Integration:**
- Write significant patterns via kb_add_lesson
- Query historical patterns via kb_search
- Tag patterns: ["pattern", "workflow", "cross-story"]

### Out of Scope

- **Weekly cron automation infrastructure** - MVP is manual `/pattern-mine` command only. Weekly cron setup documented in Infrastructure Notes for future activation, but NOT implemented in this story
- **Embedding API integration** - Use text similarity (Levenshtein distance) for MVP clustering, upgrade to embeddings in future story (see FUTURE-OPPORTUNITIES.md Gap #2)
- **Pattern feedback loop** - Track improvement effectiveness (future enhancement)
- **Cross-project pattern aggregation** - Single repo scope only
- **Interactive pattern exploration command** - Future enhancement (files already human-readable)
- **Automated agent prompt injection** - Manual integration for MVP (AGENT-HINTS.yaml requires manual merge into agent prompts)

### Data Sources

**Primary (Future):**
- `plans/**/OUTCOME.yaml` files (0 currently available, waiting for generation activation)

**Fallback (MVP):**
- `plans/**/VERIFICATION.yaml` files (37 currently available)

**Reuse:**
- OUTCOME.yaml schema (`.claude/schemas/outcome-schema.md`)
- Pattern detection thresholds (from workflow-retro agent: 3+ occurrences, 20%+ variance)
- KB tools (kb_search, kb_add_lesson)
- WORKFLOW-RECOMMENDATIONS.md format

## Acceptance Criteria

### AC-1: Minimum Story Threshold
**Requirement:** Analyze minimum 10 stories per mining run
**Verification:**
- Run requires ≥10 OUTCOME.yaml (or VERIFICATION.yaml) files
- If < 10 found, command skips with warning: "Insufficient stories for pattern mining (found N, requires 10)"
- Exit code 0 (graceful skip, not error)
**Reality Note:** Currently 0 OUTCOME.yaml files; fallback to 37 VERIFICATION.yaml files enables MVP testing

### AC-2: File/Path Pattern Detection
**Requirement:** Identify file/path patterns that correlate with failures
**Verification:**
- PATTERNS-{month}.yaml has file_patterns section populated
- Each pattern includes: pattern (glob/regex), correlation (0-1), finding_type, sample_size, recommendation
- Example: `{ pattern: "**/routes.ts", correlation: 0.78, finding_type: "lint_failure", sample_size: 15, recommendation: "Add lint pre-check to backend-coder" }`
**Threshold:** Minimum 3 occurrences (configurable via --min-occurrences), minimum 0.60 correlation (configurable via --min-correlation)

### AC-3: AC Pattern Detection
**Requirement:** Identify AC patterns that correlate with under-specification
**Verification:**
- PATTERNS-{month}.yaml has ac_patterns section populated
- Each pattern includes: pattern (regex), correlation (0-1), finding_type, sample_size, recommendation
- Example: `{ pattern: "intuitive|obvious|clear", correlation: 0.80, finding_type: "verification_failure", sample_size: 8, recommendation: "Flag vague ACs in elaboration" }`
**Threshold:** Minimum 3 stories (configurable via --min-occurrences), minimum 0.60 correlation (configurable via --min-correlation)

### AC-4: Clustering Similar Findings
**Requirement:** Cluster similar findings (text similarity > 0.70 for MVP)
**Verification:**
- Similar findings grouped in PATTERNS-{month}.yaml (not listed separately)
- Clustered pattern includes all variants in sample
- Clustering algorithm documented (text similarity for MVP using Levenshtein distance, embeddings for future)
**MVP Note:** Text-based similarity threshold 0.70 (calibrated to approximate embedding similarity 0.85); embedding upgrade future enhancement (see FUTURE-OPPORTUNITIES.md)

### AC-5: Agent Hint Output
**Requirement:** Output actionable patterns for agent enhancement
**Verification:**
- AGENT-HINTS.yaml exists with per-agent recommendations
- Structure: `{ hints: { agent_name: ["hint 1", "hint 2"], ... } }`
- Example: `{ hints: { "code-review-lint": ["routes.ts files frequently have import order issues", "Check for missing trailing commas in route handlers"] } }`
- Recommendations are actionable (specific enough to guide agent behavior)

### AC-6: Anti-Pattern Documentation
**Requirement:** ANTI-PATTERNS.md documents patterns to avoid
**Verification:**
- File exists at `.claude/patterns/ANTI-PATTERNS.md`
- Human-readable format (markdown sections per pattern type)
- Includes: pattern description, correlation data, examples, recommendations
- Suitable for team reference and training

### AC-7: KB Integration
**Requirement:** Significant patterns persisted to KB
**Verification:**
- Patterns written via kb_add_lesson with category="pattern"
- Each KB entry includes: title, story_ids (array), sample_size, correlation, recommendation
- Queryable via `kb_search({ query: "pattern mining {month}", entry_type: "lesson", tags: ["pattern"] })`
- Only significant patterns persisted (threshold: 3+ occurrences, 0.60+ correlation)

### AC-8: Dual-Mode Data Loading
**Requirement:** Support OUTCOME.yaml (primary) and VERIFICATION.yaml (fallback)
**Verification:**
- If OUTCOME.yaml files available (≥10), use them as primary data source
- If OUTCOME.yaml files unavailable (< 10), fall back to VERIFICATION.yaml
- Warning logged when using fallback: "Using VERIFICATION.yaml fallback (no OUTCOME.yaml files found)"
- Output format identical regardless of data source

## Reuse Plan

### Must Reuse

**From WKFL-001:**
- OUTCOME.yaml schema (`.claude/schemas/outcome-schema.md`)
- Pattern detection thresholds (3+ occurrences, 20%+ variance)
- KB integration patterns (kb_search, kb_add_lesson)
- WORKFLOW-RECOMMENDATIONS.md format (for ANTI-PATTERNS.md structure)

**From Existing Workflow:**
- VERIFICATION.yaml structure (37 files available as fallback data source)
- workflow-retro agent pattern detection logic (adapt for cross-story analysis)

**From WKFL-004:**
- KB schema and tools (feedback integration exists, reuse for pattern storage)

### May Create

**New Agent:**
- `pattern-miner.agent.md` (sonnet model, cross-story analysis)

**New Schemas:**
- `patterns-schema.yaml` (PATTERNS-{month}.yaml structure)
- `agent-hints-schema.yaml` (AGENT-HINTS.yaml structure)

**New Command:**
- `/pattern-mine` command specification

**New Outputs:**
- PATTERNS-{month}.yaml (structured data)
- AGENT-HINTS.yaml (per-agent hints)
- ANTI-PATTERNS.md (human-readable)

### Patterns to Follow

- Batch processing mode (analyze N days of stories)
- KB integration for pattern persistence
- Multiple output formats (structured + human-readable)
- Significance thresholds (minimum sample size before declaring pattern)
- Graceful degradation (fallback to VERIFICATION.yaml when OUTCOME.yaml unavailable)

## Architecture Notes

### Pattern Detection Algorithm

**File/Path Patterns:**
1. Parse all OUTCOME.yaml/VERIFICATION.yaml findings
2. Extract file paths from each finding
3. Group by file path pattern (exact match, directory match, extension match)
4. Compute failure rate per pattern: failures / occurrences
5. Filter by threshold (≥3 occurrences, ≥0.60 correlation)
6. Generate recommendation based on finding_type

**AC Text Patterns:**
1. Load all story.yaml files for analyzed stories
2. Extract acceptance_criteria text
3. Scan for anti-pattern regex (vague phrases: "intuitive", "obvious", "clear", "simple", "easy")
4. Cross-reference AC text with VERIFICATION.yaml verdicts
5. Compute correlation: (stories with pattern AND verification failure) / (stories with pattern)
6. Filter by threshold (≥3 stories, ≥0.60 correlation)

**Agent Correlation Patterns:**
1. Parse VERIFICATION.yaml for multi-agent findings (conflicts, disagreements)
2. Extract agent pairs from conflicting findings
3. Compute disagreement rate per pair: conflicts / total interactions
4. Filter by threshold (≥3 conflicts)
5. Categorize by topic (validation, security, architecture, etc.)

**Clustering Algorithm (MVP):**
- Text-based similarity using Levenshtein distance
- Threshold: 0.70 similarity (calibrated to approximate embedding similarity 0.85)
- Group findings with similarity > threshold
- Select representative finding (most common phrasing)
- Future enhancement: Replace with embedding-based clustering (OpenAI API or sentence-transformers)

### Data Flow

```
[OUTCOME.yaml files OR VERIFICATION.yaml files]
          ↓
   [pattern-miner agent]
          ↓
   [Pattern Detection]
    - File patterns
    - AC patterns
    - Agent correlations
    - Cycle predictors
          ↓
   [Clustering (similarity > threshold)]
          ↓
   [Output Generation]
    - PATTERNS-{month}.yaml
    - AGENT-HINTS.yaml
    - ANTI-PATTERNS.md
          ↓
   [KB Persistence (significant patterns only)]
```

### Output Schema Structures

**PATTERNS-{month}.yaml:**
```yaml
mining_period:
  start: 2026-02-01
  end: 2026-02-28
stories_analyzed: 23
data_source: "outcome" # or "verification"

file_patterns:
  - pattern: "**/routes.ts"
    correlation: 0.78
    finding_type: "lint_failure"
    sample_size: 15
    recommendation: "Add lint pre-check to backend-coder"

ac_patterns:
  - pattern: "intuitive|obvious|clear"
    correlation: 0.80
    finding_type: "verification_failure"
    sample_size: 8
    recommendation: "Flag vague ACs in elaboration"

agent_correlations:
  - agents: ["code-review-security", "architect-story-review"]
    disagreement_rate: 0.45
    topic: "validation approach"
    sample_size: 11
    recommendation: "Add cross-domain check for validation"

cycle_predictors:
  - predictor: "files_touched > 5"
    avg_cycles: 2.8
    baseline_cycles: 1.8
    sample_size: 9
```

**AGENT-HINTS.yaml:**
```yaml
# Injected into agent prompts
hints:
  code-review-lint:
    - "routes.ts files frequently have import order issues"
    - "Check for missing trailing commas in route handlers"

  elab-analyst:
    - "Flag ACs containing 'intuitive', 'obvious', 'clear'"
    - "Stories touching >5 files likely need splitting"
```

### Token Budget Strategy

**Estimated breakdown (70,000 tokens total):**
- Schema definition: 5,000 tokens
- Agent implementation: 25,000 tokens
- Command specification: 5,000 tokens
- Testing (fixtures + tests): 20,000 tokens
- Documentation: 10,000 tokens
- Buffer: 5,000 tokens

**Cost controls:**
- Sonnet model for complex pattern analysis
- Batch processing (not per-story)
- Efficient clustering algorithm (text similarity, not embeddings for MVP)

## Infrastructure Notes

### Directory Structure

```
.claude/
  agents/
    pattern-miner.agent.md        # New agent
  commands/
    pattern-mine.md                # New command
  schemas/
    outcome-schema.md              # Existing (from WKFL-001)
    patterns-schema.yaml           # New schema
    agent-hints-schema.yaml        # New schema
  patterns/
    PATTERNS-2026-02.yaml          # Generated output
    AGENT-HINTS.yaml               # Generated output (updated each run)
    ANTI-PATTERNS.md               # Generated output (updated each run)
```

### KB Schema Extensions

**Pattern entries:**
```javascript
kb_add_lesson({
  title: "File pattern: routes.ts lint failures",
  category: "pattern",
  story_ids: ["WISH-015", "WISH-022", "WISH-031"],
  metadata: {
    pattern_type: "file_pattern",
    pattern: "**/routes.ts",
    correlation: 0.78,
    sample_size: 15,
    mining_period: "2026-02"
  },
  what_happened: "routes.ts files fail lint 78% of first reviews",
  resolution: "Add lint pre-check to backend-coder agent"
})
```

### Weekly Cron Setup (Future)

**Out of scope for MVP, but documented for future activation:**

```bash
# .github/workflows/pattern-mining.yml
name: Weekly Pattern Mining
on:
  schedule:
    - cron: '0 10 * * 1' # Every Monday at 10am
  workflow_dispatch: # Manual trigger

jobs:
  mine-patterns:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run pattern mining
        run: |
          claude /pattern-mine --days 7
      - name: Commit outputs
        run: |
          git config user.name "Pattern Miner Bot"
          git add .claude/patterns/
          git commit -m "chore: Weekly pattern mining $(date +%Y-%m-%d)"
          git push
```

## Test Plan

### Scope Summary

- **Endpoints touched:** None (workflow analysis agent)
- **UI touched:** No
- **Data/storage touched:** Yes (reads OUTCOME.yaml, VERIFICATION.yaml; writes PATTERNS-{month}.yaml, AGENT-HINTS.yaml, ANTI-PATTERNS.md; KB writes)

### Happy Path Tests

**Test 1: Basic Pattern Mining (≥10 stories with patterns)**
- Setup: 15 synthetic OUTCOME.yaml files with file patterns, AC patterns, agent correlations
- Action: `/pattern-mine --days 30`
- Expected: All three output files generated, patterns detected, KB writes successful
- Evidence: PATTERNS-{month}.yaml validates against schema, file_patterns and ac_patterns populated

**Test 2: Clustering Similar Findings**
- Setup: 12 OUTCOME.yaml files with similar findings (e.g., "import order violation" variants)
- Action: `/pattern-mine --days 30`
- Expected: Findings clustered into single pattern (not 12 separate)
- Evidence: PATTERNS-{month}.yaml shows clustered pattern with sample_size=12

**Test 3: Dual-Mode Data Source (VERIFICATION.yaml Fallback)**
- Setup: 0 OUTCOME.yaml files, 20 VERIFICATION.yaml files
- Action: `/pattern-mine --days 30`
- Expected: Falls back to VERIFICATION.yaml, warning logged, patterns generated
- Evidence: Warning in output, PATTERNS-{month}.yaml generated from VERIFICATION.yaml data

### Error Cases

**Test 4: Insufficient Data (<10 stories)**
- Setup: Only 7 OUTCOME.yaml files
- Action: `/pattern-mine --days 30`
- Expected: Command skips with warning, no outputs generated, exit code 0
- Evidence: Warning message, no PATTERNS-{month}.yaml file created

**Test 5: Invalid Schema Files**
- Setup: 15 OUTCOME.yaml files, 3 with invalid schema
- Action: `/pattern-mine --days 30`
- Expected: Invalid files skipped with warnings, analysis proceeds with 12 valid files
- Evidence: Warning logs for invalid files, PATTERNS-{month}.yaml shows stories_analyzed: 12

**Test 6: No Patterns Detected**
- Setup: 20 OUTCOME.yaml files with no recurring patterns (all unique)
- Action: `/pattern-mine --days 30`
- Expected: Output files generated but empty/minimal, clear messaging
- Evidence: PATTERNS-{month}.yaml with empty arrays, ANTI-PATTERNS.md states "No significant patterns detected"

### Edge Cases

**Test 7: Threshold Boundaries**
- Exactly 3 occurrences (minimum threshold) → pattern included
- Similarity 0.84 vs 0.85 → clustering boundary respected
- Correlation 0.59 vs 0.60 → threshold logic correct

**Test 8: Multiple Pattern Types per Story**
- Single OUTCOME.yaml with file pattern + AC pattern + agent correlation
- Expected: Story contributes to all three pattern types independently

**Test 9: Large Dataset (100+ stories)**
- 120 OUTCOME.yaml files
- Expected: Analysis completes within token budget (70,000 tokens)

### Required Test Evidence

**Schema Validation:**
- PATTERNS-{month}.yaml validates against `.claude/schemas/patterns-schema.yaml`
- AGENT-HINTS.yaml validates against `.claude/schemas/agent-hints-schema.yaml`

**KB Integration:**
- Query: `kb_search({ query: "pattern mining {month}", entry_type: "lesson", tags: ["pattern"] })`
- Results contain persisted patterns with correct structure

**Agent Execution:**
- Command: `/pattern-mine --days 30` invokes pattern-miner agent
- Agent completes with COMPLETE signal
- Output files written to correct locations

### Risks Called Out

1. **Embedding similarity deferred**: Text similarity used for MVP (AC-4 partial compliance)
2. **OUTCOME.yaml data unavailable**: Fallback to VERIFICATION.yaml required for testing
3. **Pattern threshold subjectivity**: Edge case tests critical for validation
4. **Schemas not yet defined**: Must define before implementation begins

## Reality Baseline

### Existing Features

**From WKFL-001 (Completed):**
- OUTCOME.yaml schema defined: `.claude/schemas/outcome-schema.md`
- workflow-retro agent: `.claude/agents/workflow-retro.agent.md`
- /workflow-retro command available for manual retrospectives
- KB integration (kb_add_lesson) for persisting patterns
- WORKFLOW-RECOMMENDATIONS.md template exists

**Data Availability:**
- 0 OUTCOME.yaml files (schema defined but generation not active)
- 37 VERIFICATION.yaml files (WISH and INST epics)
- Pattern detection thresholds established (3+ occurrences, 20%+ variance)

### Active In-Progress Work

**Parallel stories consuming same data:**
- WKFL-002 (Confidence Calibration) - Status: ready-to-work, also depends on WKFL-001
- WKFL-003 (Emergent Heuristic Discovery) - Status: in-progress
- WKFL-005 (Doc Sync Agent) - Status: uat

**No direct conflicts detected.** WKFL-002 and this story are parallel analysis stories both consuming OUTCOME.yaml, but operate independently (no file conflicts, different output artifacts).

### Constraints to Respect

1. **OUTCOME.yaml generation not active**: Schema exists but integration not yet generating files
2. **No embedding infrastructure**: Must use text similarity for MVP clustering
3. **Weekly cron requires infrastructure**: Manual command only for MVP
4. **KB schema stability**: Must not modify existing KB entry types (from WKFL-004)
5. **VERIFICATION.yaml structure immutable**: Read-only, cannot modify existing workflow files

### Dependencies

**Hard dependencies:**
- WKFL-001 ✅ Completed (OUTCOME.yaml schema, workflow-retro agent)

**Data dependencies:**
- VERIFICATION.yaml ✅ Available (37 files for testing)
- OUTCOME.yaml ⚠️ Schema defined but generation not active (0 files)

**Tool dependencies:**
- KB tools ✅ Available (kb_search, kb_add_lesson from WKFL-004)

### Blocks Downstream Stories

- **WKFL-007** (Risk Predictor) - Needs PATTERNS.yaml as input for prediction model
- **WKFL-009** (KB Compress) - Uses patterns for clustering and deduplication
- **WKFL-010** (Improvement Proposals) - Consumes pattern output for proposal generation

### Story Generation Metadata

- **Seed generated:** 2026-02-07
- **Baseline used:** None (no baseline reality files exist)
- **Lessons loaded:** No (KB search not performed in seed phase)
- **ADRs loaded:** Yes (standard ADRs reviewed, none directly relevant)
- **Conflicts found:** 1 warning (OUTCOME.yaml data unavailable, not blocking)
- **Resolution:** Dual-mode data loading (OUTCOME.yaml primary, VERIFICATION.yaml fallback)

---

**Story generated:** 2026-02-07
**Generated by:** pm-story-generation-leader (v3.0.0)
**Token budget:** 70,000 tokens (P1 analysis story, Sonnet model)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-07_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Modified |
|---|---------|------------|------------|
| 1 | Pattern significance thresholds missing | Added configurable command parameters (--min-occurrences, --min-correlation) with defaults (3, 0.60) | AC-2, AC-3 |
| 2 | Time window defaults unspecified | Established dual-mode defaults: --days 30 (rolling) and --month YYYY-MM (fixed month) | Command spec |
| 3 | Weekly cron scope ambiguous | Explicitly documented as manual `/pattern-mine` command for MVP; cron setup documented for future | Out of Scope |
| 4 | AC-4 clustering partial compliance risk | Updated to text similarity (0.70) for MVP with documented upgrade path to embeddings (WKFL-006-B) | AC-4 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry | Severity |
|---|---------|----------|----------|----------|
| 1 | OUTCOME.yaml data unavailability | edge-case | gap-1 | Medium |
| 2 | Embedding similarity deferred | future-work | gap-2 | Medium (high-priority enhancement) |
| 3 | Pattern feedback loop missing | observability | gap-3 | Low |
| 4 | Cross-project patterns out of scope | integration | gap-4 | Low |
| 5 | Interactive query command missing | ux-polish | gap-5 | Low |
| 6 | Real-time pattern detection | performance | enhancement-1 | Medium |
| 7 | Semantic code analysis | integration | enhancement-2 | Medium |
| 8 | Automated prompt injection | integration | enhancement-3 | Medium |
| 9 | Weekly cron automation | automation | enhancement-4 | Low |
| 10 | Visualization dashboard | ux-polish | enhancement-5 | Low |
| 11 | Confidence scoring | ux-polish | enhancement-6 | Low |
| 12 | Multi-dimensional patterns | performance | enhancement-7 | Medium |
| 13 | Pattern decay tracking | observability | enhancement-8 | Low |

### Summary

- **ACs modified**: 4 (no new ACs required)
- **KB entries created**: 14 (all future-work and enhancement items)
- **Audit issues resolved**: 4/4 (100%)
- **Mode**: autonomous
- **Decision method**: Feasibility-based recommendations confirmed by autonomous decider
- **Critical path intact**: Core pattern mining journey complete, all blockers removed

### Recommendation

Story is **ready for implementation**. All Decision Completeness issues resolved with sensible defaults that enable MVP while preserving future enhancement paths. Embedding-based clustering (gap-2) identified as highest-priority follow-up enhancement (WKFL-006-B).
