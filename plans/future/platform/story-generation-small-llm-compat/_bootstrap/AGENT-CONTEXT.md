# Bootstrap Agent Context

## Epic Metadata
- **Plan Slug**: story-generation-small-llm-compat
- **Feature Directory**: plans/future/platform/story-generation-small-llm-compat
- **Story Prefix**: ST
- **Total Stories**: 7
- **Created**: 2026-02-28

## Plan Summary

Refactor the PM story generation pipeline to embed canonical reference files and decompose stories into small, dependency-ordered subtasks so that open-source LLMs with ~32K context windows (e.g., QwenCoder 14B) can execute each subtask as an isolated agent invocation without redundant context discovery. Additionally, enforce a structured clarity format (Goal, Examples, Edge Cases) on every generated story.

## Phases

1. **PM-Side Generation Changes** (ST-1010, ST-1020, ST-1030, ST-1040) — Story generation agents: seed agent canonical references, story template required sections, dev-feasibility subtask proposals, generation leader synthesis.
2. **Elaboration Validation** (ST-2010, ST-2020) — Audit checks for subtask decomposition quality and story clarity format.
3. **Dev-Side Consumption Changes** (ST-3010, ST-3020) — Dev-plan-leader subtask mapping and dev-execute-leader subtask iteration mode.

## Stories

| ID | Title | Phase | Depends On |
|----|-------|-------|------------|
| ST-1010 | Seed Agent: Phase 2.5 Canonical Reference Identification | 1 | -- |
| ST-1020 | Story Template: Add Goal / Examples / Edge Cases Required Sections | 1 | -- |
| ST-1030 | Dev Feasibility Worker: Add Subtask Proposal to Output | 1 | -- |
| ST-1040 | Generation Leader Phase 4: Include Subtasks and Canonical References | 1 | ST-1010, ST-1020, ST-1030 |
| ST-2010 | Elab Analyst: Add Subtask Decomposition Audit Check | 2 | ST-1040 |
| ST-2020 | Elab Analyst: Add Story Clarity Format Audit Check | 2 | ST-1020, ST-2010 |
| ST-3010 | Dev Plan Leader: Map Story Subtasks 1:1 to PLAN.yaml Steps | 3 | ST-1040 |
| ST-3020 | Dev Execute Leader: Iterate Subtasks as Separate Agent Invocations | 3 | ST-3010 |

## Risk Notes

5 of 7 stories (ST-1010, ST-1030, ST-2010, ST-3010, ST-3020) appear to already be implemented in the current agent files. Genuinely new work: ST-1020 (Examples/Edge Cases sections), ST-2020 (clarity format audit check), and the Goal/Examples/Edge Cases portion of ST-1040.
