# workflow-artifact-streamlining Stories Index

Plan: [workflow-artifact-streamlining](../..)

## Progress Summary

| Status | Count |
|--------|-------|
| Backlog | 4 |
| Ready | 2 |
| In Progress | 0 |
| Ready for Review | 0 |
| In Review | 0 |
| Ready for QA | 0 |
| In QA | 0 |
| Completed | 0 |
| **Total** | **6** |

## Phase 1: P0 Critical Consolidations

Eliminate the highest-volume redundant artifacts: replace 4 ELAB artifacts with one structured YAML, and remove PROOF files entirely

| Story | Title | Dependencies | Status |
|-------|-------|--------------|--------|
| AC-1010 | ELAB.yaml Consolidation | — | ready |
| AC-1020 | Eliminate PROOF-{ID}.md | — | ready |

## Phase 2: P1 Data Source Migrations

Move fix-cycle summaries into CHECKPOINT.yaml and move token logs from Markdown files into the KB

| Story | Title | Dependencies | Status |
|-------|-------|--------------|--------|
| AC-2010 | FIX-VERIFICATION-SUMMARY → CHECKPOINT.yaml | AC-1010, AC-1020 | backlog |
| AC-2020 | TOKEN-LOG.md → KB | AC-1010 | backlog |

## Phase 3: P2 Structural Cleanup

Fold _pm/ worker outputs into story.yaml and remove dead bootstrap artifacts that no agent reads

| Story | Title | Dependencies | Status |
|-------|-------|--------------|--------|
| AC-3010 | _pm/ Folder → story.yaml Sections | AC-1010, AC-2010, AC-2020 | backlog |
| AC-3020 | Bootstrap Dead Artifact Cleanup | AC-3010 | backlog |

## Metrics

- **Total Stories**: 6
- **Phases**: 3
- **Critical Path Length**: 4
- **Max Parallel**: 2

## Dependency Graph

```
AC-1010 ──┐
          ├──→ AC-2010
AC-1020 ──┘

AC-1010 ──→ AC-2020

AC-1010 ──┐
AC-2010 ──┼──→ AC-3010
AC-2020 ──┘

AC-3010 ──→ AC-3020
```

## Parallelization Groups

**Group 1** (no dependencies):
- AC-1010, AC-1020

**Group 2** (after Group 1):
- AC-2010, AC-2020

**Group 3** (after Group 2):
- AC-3010

**Group 4** (after Group 3):
- AC-3020

## Risk Assessment

| ID | Description | Affected Stories | Severity |
|----|----|----|----|
| RISK-001 | Missed cross-references: 30 files change across 6 phases. A stale reference to a removed artifact will silently break that agent's workflow at runtime. The plan's grep checklist must be executed before each phase commit. | AC-1010, AC-1020, AC-2010, AC-2020, AC-3010, AC-3020 | HIGH |
| RISK-002 | OUTCOME.yaml source coupling: OUTCOME.yaml reads from TOKEN-LOG.md (P1-TOKEN) and DECISIONS.yaml (P0-ELAB). If either source changes without the OUTCOME.yaml sources map being updated in the same commit, documentation generation will break. | AC-1010, AC-2020 | HIGH |
| RISK-003 | story.yaml concurrent write collisions: In P2-PM, three pm worker agents each append a pm_artifacts.* section to story.yaml. If orchestration runs them in parallel with naive file writes, sections can be lost. Sequential execution or read-modify-write discipline required. | AC-3010 | MEDIUM |
| RISK-004 | KB token_usage schema undefined: P1-TOKEN introduces a new KB entry type (token_usage) with fields story_id, phase, model, input_tokens, output_tokens, timestamp. This schema needs to be formally specified in the skill and must be queryable by story_id before OUTCOME.yaml generation can use it. | AC-2020 | MEDIUM |
| RISK-005 | CHECKPOINT.yaml backward compatibility: Existing in-flight stories have written CHECKPOINT.yaml files without the fix_cycles field. Agents reading fix_cycles must tolerate the field being absent (treat as empty array) to avoid breaking active stories during the transition. | AC-2010 | LOW |
