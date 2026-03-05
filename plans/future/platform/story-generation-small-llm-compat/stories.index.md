---
doc_type: stories_index
title: "ST Stories Index"
status: active
story_prefix: "ST"
created_at: "2026-02-28T00:00:00Z"
updated_at: "2026-02-28T00:00:00Z"
---

# ST Stories Index

All stories use `ST-{phase}{story}{variant}` format (e.g., `ST-1010` for Phase 1, Story 01, original).

## Progress Summary

| Status | Count |
|--------|-------|
| uat | 1 |
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| ready-to-work | 1 |
| ready-for-code-review | 1 |
| pending | 4 |
| failed-qa | 0 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| ST-1020 | Story Template: Add Goal / Examples / Edge Cases Required Sections | — |
| ST-1030 | Dev Feasibility Worker: Add Subtask Proposal to Output | — |

---

## ST-1010: Seed Agent: Phase 2.5 Canonical Reference Identification

**Status:** uat
**Depends On:** none
**Phase:** 1
**Feature:** Add Phase 2.5 to pm-story-seed-agent that scans the codebase for exemplar files matching the story's pattern categories (API handler, DB query, page/route, form, shared package, agent) and includes them in STORY-SEED.md under a ## Canonical References section.
**Endpoints:** (none)
**Infrastructure:** (none)
**Goal:** Ensure every generated story seed contains 2-4 canonical reference files so that downstream agents and small LLMs can follow proven patterns without codebase scanning.
**Risk Notes:** Already partially implemented — pm-story-seed-agent.agent.md v1.2.0 already contains Phase 2.5 logic and the ## Canonical References section in the output template. The story file structure in pm-spawn-patterns.md already lists section 16 "Canonical References". Risk: scope may be a no-op if implementation is complete; need to verify the seed agent actually executes Phase 2.5 in practice (it may exist in spec but not be invoked correctly).

---

## ST-1020: Story Template: Add Goal / Examples / Edge Cases Required Sections

**Status:** pending
**Depends On:** none
**Phase:** 1
**Feature:** Enforce four mandatory top-level sections (## Goal, ## Rules/ACs, ## Examples, ## Edge Cases) in every generated story file. Update pm-spawn-patterns.md story file structure and pm-story-generation-leader Phase 4 synthesis to include these sections. This is the structured clarity format for small-LLM anchoring.
**Endpoints:** (none)
**Infrastructure:** (none)
**Goal:** Every generated story file must open with a one-sentence Goal, concrete input/output Examples (2+), and Edge Cases (2+) before ACs and Subtasks, enabling both human reviewers and small LLMs to instantly understand scope.
**Risk Notes:** pm-spawn-patterns.md currently lists 17 required sections (1-17) and already includes "Canonical References" (16) and "Subtasks" (17). The ## Goal section is listed as item 4 already. However, ## Examples and ## Edge Cases sections are not currently listed. The pm-story-generation-leader Phase 4 synthesis block references canonical references and subtasks but does not enforce the Goal/Examples/Edge Cases format. Low complexity but requires careful coordination with the spawn patterns reference file and the generation leader's Phase 4 prompt.

---

## ST-1030: Dev Feasibility Worker: Add Subtask Proposal to Output

**Status:** completed
**Depends On:** none
**Phase:** 1
**Feature:** Extend pm-dev-feasibility-review.agent.md to produce a subtasks[] array in dev-feasibility.yaml. Each subtask covers 1-3 files, maps to 1-3 ACs, has a depends_on chain, a verification command, and an estimated_tokens field. Sizing: 1-pt story → 1-2 subtasks, 3-pt → 3-5, 5-pt → 5-8.
**Endpoints:** (none)
**Infrastructure:** (none)
**Goal:** The dev-feasibility worker must propose a subtask breakdown so the generation leader can include a ## Subtasks section in every story file.
**Risk Notes:** Already fully implemented — pm-dev-feasibility-review.agent.md v3.1.0 already contains the subtasks[] output schema with all required fields (id, title, goal, files_to_read, files_to_modify, acs, depends_on, verification, estimated_tokens) and the subtask design rules. This story may be a no-op if the spec is already in production. Confirm whether the agent is currently generating subtasks in practice before scheduling work.

---

## ST-1040: Generation Leader Phase 4: Include Subtasks and Canonical References in Story

**Status:** uat
**Depends On:** ST-1020, ST-1030
**Phase:** 1
**Feature:** Update pm-story-generation-leader Phase 4 synthesis to read subtasks[] from dev-feasibility.yaml and ## Canonical References from STORY-SEED.md, then include both as required sections in the generated story file. Also enforce the Goal/Examples/Edge Cases clarity format. Cross-reference: every AC must be covered by at least one subtask.
**Endpoints:** (none)
**Infrastructure:** (none)
**Goal:** Phase 4 synthesis must produce story files that contain all five new sections (Goal, Examples, Edge Cases, Subtasks, Canonical References) and must warn when any AC is not covered by a subtask.
**Risk Notes:** pm-story-generation-leader.agent.md v4.3.0 already has the Canonical References and Subtasks integration in Phase 4 synthesis, and the quality gates table already includes checks for both. The generation leader currently reads ## Canonical References from STORY-SEED.md and subtasks[] from dev-feasibility.yaml. The missing piece is the Goal/Examples/Edge Cases format enforcement. Low additional risk — this is an additive change to an already-updated Phase 4 block.
**Elaboration Verdict:** PASS (autonomous) - 1 AC added, 2 gaps resolved, 4 opportunities logged to KB

---

## ST-2010: Dev-Feasibility Worker — Subtask Proposal Output

**Status:** ready-for-code-review
**Depends On:** ST-1020
**Phase:** 2
**Feature:** Add Audit Check #9 (Subtask Decomposition) to elab-analyst.agent.md. Validates: every AC covered by a subtask, no subtask >3 files, dependencies form a DAG, each subtask has a verification command and a canonical reference. Result status: PASS | CONDITIONAL | FAIL. CONDITIONAL PASS if decomposition missing or inadequate.
**Endpoints:** (none)
**Infrastructure:** (none)
**Goal:** The elaboration analyst must gate story quality by verifying subtask decomposition completeness and flag stories that cannot be executed by small-context LLMs.
**Risk Notes:** Already fully implemented — elab-analyst.agent.md v3.2.0 already contains Audit Check #9 (Subtask Decomposition) with all the exact validation rules and CONDITIONAL PASS outcomes described in the plan. The ELAB.yaml output schema already includes the subtask_decomposition audit item. This story may be a no-op.

---

## ST-2020: Elab Analyst: Add Story Clarity Format Audit Check

**Status:** pending
**Depends On:** ST-1020, ST-2010
**Phase:** 2
**Feature:** Extend the elab-analyst audit to check for the story clarity format: ## Goal (one sentence), ## Examples (2+ input/output pairs), ## Edge Cases (2+ scenarios). If any are missing → CONDITIONAL PASS with note. This extends Check #9 or becomes Check #10 in the 9-point (now 10-point) checklist.
**Endpoints:** (none)
**Infrastructure:** (none)
**Goal:** Elaboration analysis must validate the story clarity format sections so that poorly-structured stories are flagged before dev implementation begins.
**Risk Notes:** Not yet implemented — elab-analyst.agent.md currently has exactly 9 audit checks (scope_alignment through subtask_decomposition) but does NOT include a clarity format check for ## Goal / ## Examples / ## Edge Cases. This is genuine new work. Low complexity: requires adding a new check to the audit checklist and a new entry in the ELAB.yaml audit array output schema.

---

## ST-3010: Dev Plan Leader: Map Story Subtasks 1:1 to PLAN.yaml Steps

**Status:** pending
**Depends On:** ST-1040
**Phase:** 3
**Feature:** Update dev-plan-leader.agent.md Step 3 to read ## Subtasks and ## Canonical References from the story file and Step 4 to emit schema: 2 PLAN.yaml when subtasks are present. Each story subtask (ST-1, ST-2, etc.) maps 1:1 to a PLAN.yaml step with subtask_id, files_to_read (canonical reference + prior outputs), and verification field.
**Endpoints:** (none)
**Infrastructure:** (none)
**Goal:** The planning leader must consume story subtasks as its primary planning input and produce a subtask-sourced PLAN.yaml (schema: 2) that the execution leader can iterate step-by-step with minimal context.
**Risk Notes:** Already fully implemented — dev-plan-leader.agent.md v1.3.0 already contains Step 3 reading ## Subtasks and ## Canonical References, Step 4 generating schema: 2 PLAN.yaml when subtasks are present, and Step 5 self-validation rules for subtask-sourced plans (checks subtask_id, files_to_read, verification, acs_covered, and ≤3 files per step). This story may be a no-op.

---

## ST-3020: Dev Execute Leader: Iterate Subtasks as Separate Agent Invocations

**Status:** pending
**Depends On:** ST-3010
**Phase:** 3
**Feature:** Update dev-execute-leader.agent.md to detect PLAN.yaml schema: 2 and enter subtask iteration mode: spawn one coder agent per step sequentially with only the step's goal, 1-3 files, files_to_read (canonical reference + prior outputs), and verification command. Run verification between steps. Accumulate prior step outputs as context for the next step.
**Endpoints:** (none)
**Infrastructure:** (none)
**Goal:** The execution leader must run each subtask as an isolated ~32K-context agent invocation so that small LLMs like QwenCoder 14B can implement stories incrementally.
**Risk Notes:** Already fully implemented — dev-execute-leader.agent.md v3.2.0 already contains Step 2 (Determine Execution Mode) with the schema: 2 subtask iteration path fully specified, including the per-step Task tool spawn pattern with SUBTASK CONTEXT, FILES TO READ, FILES TO CREATE/MODIFY, PRIOR SUBTASK OUTPUTS, and VERIFICATION blocks. Step 4 already documents the sequential iteration with verification between steps. This story may be a no-op.

---

## Dependency Graph

### Critical Path

The longest chain of dependent stories:

```
ST-1010 → ST-1040 → ST-3010 → ST-3020
```

**Critical path length:** 4 stories

### Parallel Opportunities

| Parallel Group | Stories | After |
|----------------|---------|-------|
| Group 1 | ST-1010, ST-1020, ST-1030 | — (start) |
| Group 2 | ST-1040 | Group 1 |
| Group 3 | ST-2010, ST-3010 | Group 2 |
| Group 4 | ST-2020, ST-3020 | Group 3 |

**Maximum parallelization:** 3 stories at once

---

## Risk Indicators

| Story | Risk Level | Reason |
|-------|------------|--------|
| ST-1010 | Medium | May be a no-op if already fully implemented in production |
| ST-1020 | Medium | Ambiguity on existing ## Goal format; sample story audit needed |
| ST-1030 | Medium | Already fully implemented; confirmation required before scheduling |
| ST-1040 | Low | Partial new work; subtasks/canonical refs mostly done |
| ST-2010 | Low | Already fully implemented; likely a no-op |
| ST-2020 | Low | Genuine new work; straightforward audit check addition |
| ST-3010 | Low | Already fully implemented; likely a no-op |
| ST-3020 | Low | Already fully implemented; likely a no-op |

---

## Quick Reference

| Metric | Value |
|--------|-------|
| Total Stories | 7 |
| Ready to Start | 3 |
| Critical Path Length | 4 stories |
| Max Parallel | 3 stories |
| Phases | 3 |
| Stories with Sizing Warnings | 0 |

---

## Implementation Notes

CRITICAL PRE-CONDITION: Before implementing any stories, perform a gap audit to confirm which changes are genuinely missing from the current agent files versus already implemented.

### Already Implemented (Verify Before Scheduling)

- ST-1010 (seed Phase 2.5): pm-story-seed-agent.agent.md v1.2.0 already contains full implementation
- ST-1030 (feasibility subtasks): pm-dev-feasibility-review.agent.md v3.1.0 already contains full implementation
- ST-2010 (elab subtask audit): elab-analyst.agent.md v3.2.0 already contains Audit Check #9
- ST-3010 (plan leader subtask mapping): dev-plan-leader.agent.md v1.3.0 already contains full implementation
- ST-3020 (execute leader subtask iteration): dev-execute-leader.agent.md v3.2.0 already contains full implementation

### Genuinely New Work

- ST-1020: Goal/Examples/Edge Cases sections not in pm-spawn-patterns.md or enforced in generation leader
- ST-2020: Clarity format check not in elab-analyst.agent.md
- ST-1040 (partial): Goal/Examples/Edge Cases enforcement missing; subtasks and canonical refs mostly done

### Recommended Action

Scope this project to focus on ST-1020, ST-2020, and the Goal/Examples/Edge Cases portion of ST-1040. Other stories should be verified as working end-to-end rather than treated as implementation stories.

---

## Status Updates

| Date | Status | Notes |
|------|--------|-------|
| 2026-02-28 | Stories Generated | All 7 stories created in KB. Pre-implementation gap audit recommended. |
