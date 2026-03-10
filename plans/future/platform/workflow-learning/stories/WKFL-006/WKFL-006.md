---
doc_type: story
title: "WKFL-006: Cross-Story Pattern Mining"
story_id: WKFL-006
story_prefix: WKFL
status: in-progress
phase: implementation
created_at: "2026-02-06T17:00:00-07:00"
updated_at: "2026-02-22T12:00:00Z"
depends_on: [WKFL-001]
blocks: [WKFL-007, WKFL-009, WKFL-010]
estimated_tokens: 70000
---

# WKFL-006: Cross-Story Pattern Mining

## Context

As stories accumulate across the workflow system, we have a growing body of outcome data from OUTCOME.yaml and VERIFICATION.yaml files. This creates an opportunity to systematically mine patterns — identifying which file types, AC phrasings, and story characteristics correlate with failures, multiple review cycles, or successful outcomes.

Currently there is no mechanism to extract cross-story learnings and feed them back into agent prompts or provide team-facing documentation of anti-patterns.

**Dependencies:**
- **WKFL-001**: Provides OUTCOME.yaml and retrospective patterns to mine

**Blocks:**
- **WKFL-007**: Risk prediction uses pattern mining results
- **WKFL-009**: KB compression uses pattern data
- **WKFL-010**: Improvement proposals consume mined patterns

## Goal

Create a pattern mining system that:
1. Analyzes all OUTCOME.yaml and VERIFICATION.yaml from last N days
2. Clusters similar findings across stories
3. Identifies file/path patterns that correlate with failures
4. Outputs distilled patterns for agent enhancement

## Non-goals

- Real-time pattern detection
- Cross-project patterns
- Semantic code analysis

## Scope

**In Scope:**
- `pattern-miner.agent.md` (sonnet model)
- `/pattern-mine` command (sole invocation method; no cron)
- `PATTERNS-{month}.yaml` output file
- `ANTI-PATTERNS.md` for team reference
- `AGENT-HINTS.yaml` for injection into agent prompts
- KB writes for significant patterns

**Out of Scope:**
- Risk prediction (WKFL-007 uses this output)
- KB compression (WKFL-009)
- Improvement proposals (WKFL-010 uses this output)

## Acceptance Criteria

- [ ] **AC-1**: Analyze minimum 10 stories per mining run
  - **Verification**: Run requires >= 10 OUTCOME.yaml files (stories with an OUTCOME.yaml present) or skips with a warning message; `/pattern-mine --days 30` is the default invocation

- [ ] **AC-2**: Identify file/path patterns that correlate with failures
  - **Verification**: `PATTERNS-{month}.yaml` has `file_patterns` section

- [ ] **AC-3**: Identify AC patterns that correlate with under-specification
  - **Verification**: `PATTERNS-{month}.yaml` has `ac_patterns` section

- [ ] **AC-4**: Cluster similar findings using vector embedding similarity
  - **Verification**: Pattern-miner uses the available MCP embedding tool to compute cosine similarity between findings; PATTERNS-{month}.yaml shows clustered entries with a `cluster_label` field and similarity scores >= 0.85

- [ ] **AC-5**: Output actionable patterns for agent enhancement
  - **Verification**: `AGENT-HINTS.yaml` written to `.claude/patterns/` with per-agent hint arrays; injection is manual (human reviews and applies relevant hints to agent `.md` files)

- [ ] **AC-6**: `ANTI-PATTERNS.md` documents patterns to avoid
  - **Verification**: File exists at `.claude/patterns/ANTI-PATTERNS.md` with human-readable anti-patterns

- [ ] **AC-7**: `/pattern-mine` accepts `--days N` flag with default of 30
  - **Verification**: `pattern-mine --days 7` and `pattern-mine --days 90` both work; command reads only OUTCOME.yaml files modified within the specified window

- [ ] **AC-8**: All output files written to `.claude/patterns/YYYY-MM/`
  - **Verification**: After a run, `PATTERNS-{YYYY-MM}.yaml`, `AGENT-HINTS.yaml`, and `ANTI-PATTERNS.md` all exist under `.claude/patterns/YYYY-MM/`; WKFL-007 and WKFL-009 can reference this path

- [ ] **AC-9**: Technical risks documented in story and agent
  - **Verification**: `pattern-miner.agent.md` includes a risks section covering: (1) bootstrap scenario when < 10 OUTCOME.yaml files exist, (2) data path — agent globs `plans/**/_implementation/OUTCOME.yaml`, (3) LLM clustering is non-deterministic (note this in output header)

- [ ] **AC-10**: Story has complete subtask decomposition
  - **Verification**: Story `## Subtasks` section maps each AC to at least one subtask with a verification command and canonical reference file; added during SETUP phase

- [ ] **AC-11**: Cross-epic pattern mining
  - **Verification**: `/pattern-mine --all-epics` traverses OUTCOME.yaml files across all epics under `plans/future/platform/`, not only `workflow-learning`; PATTERNS-{month}.yaml includes an `epic` field per pattern entry

- [ ] **AC-12**: Trend analysis across mining periods
  - **Verification**: `/pattern-mine --trend` compares the current PATTERNS-{month}.yaml against the previous month's file and outputs a `trend` field (improving / regressing / stable) per pattern; requires at least 2 prior mining periods or skips with warning

- [ ] **AC-13**: Interactive dashboard rendering
  - **Verification**: After a mining run, an `index.html` is written to `.claude/patterns/YYYY-MM/` rendering PATTERNS-{month}.yaml and ANTI-PATTERNS.md in a human-readable HTML format viewable in a browser without a server

- [ ] **AC-14**: Pattern confidence scoring
  - **Verification**: Every pattern entry in PATTERNS-{month}.yaml includes a `confidence` field (0.0–1.0) derived from sample size and correlation variance; patterns with < 5 samples have `confidence: null`

- [ ] **AC-15**: Automatic AGENT-HINTS injection
  - **Verification**: `pattern-miner.agent.md` includes a post-run step that reads AGENT-HINTS.yaml and appends relevant hints to the target agent's `.md` file under `.claude/agents/`; injection is idempotent (re-running does not duplicate hints)

- [ ] **AC-16**: Cross-period deduplication of patterns
  - **Verification**: Before writing PATTERNS-{month}.yaml, the miner checks the previous month's file and suppresses patterns already present with the same `pattern` key; suppressed patterns are logged to a `deduplicated_from_previous` section rather than silently dropped

## Technical Notes

### Pattern Types

1. **File Patterns**: Which files/paths correlate with failures
   - "routes.ts files fail lint 78% of first reviews"
   - "Components without __tests__ fail QA 65% of time"

2. **AC Patterns**: Which AC phrasings correlate with issues
   - "ACs with 'should be intuitive' fail verification 80%"
   - "ACs without explicit error handling fail 60%"

3. **Agent Correlation**: Which agent pairs often disagree
   - "security + architecture disagree on validation 45%"

4. **Cycle Patterns**: What predicts multiple review cycles
   - "Stories touching 5+ files average 2.8 cycles"

### PATTERNS-{month}.yaml

```yaml
mining_period:
  start: 2026-02-01
  end: 2026-02-28
stories_analyzed: 23

file_patterns:
  - pattern: "**/routes.ts"
    correlation: 0.78
    finding_type: lint_failure
    sample_size: 15
    recommendation: "Add lint pre-check to backend-coder"

ac_patterns:
  - pattern: "intuitive|obvious|clear"
    correlation: 0.80
    finding_type: verification_failure
    sample_size: 8
    recommendation: "Flag vague ACs in elaboration"

agent_correlations:
  - agents: [code-review-security, architect-story-review]
    disagreement_rate: 0.45
    topic: "validation approach"
    sample_size: 11

cycle_predictors:
  - predictor: "files_touched > 5"
    avg_cycles: 2.8
    baseline_cycles: 1.8
    sample_size: 9
```

### AGENT-HINTS.yaml

```yaml
hints:
  code-review-lint:
    - "routes.ts files frequently have import order issues"
  elab-analyst:
    - "Flag ACs containing 'intuitive', 'obvious', 'clear'"
    - "Stories touching >5 files likely need splitting"
```

## Reuse Plan

**Must Reuse:**
- OUTCOME.yaml from WKFL-001
- VERIFICATION.yaml from existing workflow
- KB tools for pattern storage

**May Create:**
- `pattern-miner.agent.md`
- `/pattern-mine` command
- `PATTERNS-{month}.yaml` schema
- `AGENT-HINTS.yaml` schema

## Future Enhancements

| # | Enhancement | Notes |
|---|------------|-------|
| 1 | **External cron / scheduled execution** | Automated weekly trigger via GitHub Actions or system cron; out of scope for this story |

## Token Budget

**Estimated:** 70,000 tokens
**Enforcement:** Warning (log if exceeded)

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-02-22_

### MVP Gaps Resolved

| # | Finding | Decision | Resolution |
|---|---------|----------|------------|
| 1 | AC-4 embedding mechanism not implementable | Add as AC | AC-4 rewritten to LLM-based semantic grouping |
| 2 | "last N days" — N undefined | Add as AC | AC-7 added: --days N flag, default 30 |
| 3 | Output file paths not specified | Add as AC | AC-8 added: .claude/patterns/YYYY-MM/ |
| 4 | No subtask decomposition | Add as AC | AC-10 added: required during SETUP phase |
| 5 | AGENT-HINTS.yaml injection undefined | Add as AC | AC-5 updated: manual injection documented |

### Scope Changes

- Removed "weekly cron" from scope — /pattern-mine command is sole invocation method
- Agent correlation and cycle predictor output sections marked as bonus (no required ACs)

### Non-Blocking Items (Deferred to FUTURE-OPPORTUNITIES.md)

8 enhancement opportunities logged — see `_implementation/FUTURE-OPPORTUNITIES.md`

### Summary

- ACs added: 4 (AC-7, AC-8, AC-9, AC-10)
- ACs updated: 3 (AC-1, AC-4, AC-5)
- Scope fixes: 2
- Mode: interactive
- Verdict: CONDITIONAL PASS (ready to proceed to SETUP phase; subtasks required before dev)
