---
generated: "2026-03-23"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: WINT-7040

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline file found. Context derived from KB entries, codebase scanning, and sibling batch migration stories (WINT-7050, WINT-7060, WINT-7070, WINT-7080).

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| WINT-7020 (Create Agent Migration Plan) | completed (2026-03-23) | Authoritative migration plan artifact in KB. BATCH-0 and BATCH-1 complete. Compatibility shim established. |
| WINT-7030 (Migrate Batch 1 — Story Management) | backlog | Parallel batch, not blocking WINT-7040 per migration plan |
| WINT-7050 (Migrate Batch 3 — Development) | backlog (elab'd) | Parallel, similar scope — 155 refs across 14+3 files. Pattern precedent set. |
| WINT-7060 (Migrate Batch 4 — QA) | backlog (elab'd) | Parallel, similar scope. qa-gate artifact consolidation logged to KB. |
| WINT-7070 (Migrate Batch 5 — Review) | completed (2026-03-22) | Pattern precedent: inter-agent context via KB artifact, Output section prose cleanup |
| WINT-7080 (Migrate Batch 6 — Reporting) | backlog (elab'd) | Parallel, workflow-retro **overlap risk** (see Conflicts section) |
| WINT-7100 (Remove Compatibility Shim) | backlog | Depends on WINT-7040 completing. Shim must remain functional during this story. |
| orchestrate-story-flow.sh | active in tree/ worktrees | Found at tree/story/*/scripts/orchestrate-story-flow.sh — may supersede scrum-master agents |

### Active In-Progress Work

| Story | State | Overlap Risk |
|-------|-------|-------------|
| WINT-7030 | backlog | Parallel batch — no filesystem conflict |
| WINT-7050 | backlog | dev-execute-leader is listed in BOTH WINT-7040 and WINT-7050 scope — critical conflict |
| WINT-7080 | backlog | workflow-retro is listed in BOTH WINT-7040 (as orchestration) and WINT-7080 (as reporting) scope |

### Constraints to Respect
- Compatibility shim from WINT-7020 must remain functional — do not remove during this story
- `{FEATURE_DIR}` template pattern removal requires verifying no unmigrated agents still depend on the shim path
- WINT-7100 blocks on this story completing — shim removal is downstream

---

## Retrieved Context

### Related Endpoints
- None — this is an agent/skill migration story, no API endpoints involved

### Related Components

| Component | Path | Current State |
|-----------|------|--------------|
| scrum-master-setup-leader | `.claude/agents/scrum-master-setup-leader.agent.md` | 16 filesystem refs — heavy: `{FEATURE_DIR}`, STATE.md, AGENT-CONTEXT.md, `_workflow/` dir |
| scrum-master-loop-leader | `.claude/agents/scrum-master-loop-leader.agent.md` | 7 filesystem refs — STATE.md loop, phase dir reads |
| workflow-retro | `.claude/agents/workflow-retro.agent.md` | 35 filesystem refs — OUTCOME.yaml, CHECKPOINT.yaml, REVIEW.yaml, EVIDENCE.yaml, RETRO-{STORY_ID}.yaml dedup guard, WORKFLOW-RECOMMENDATIONS.md |
| commitment-gate-agent | `.claude/agents/commitment-gate-agent.agent.md` | 7 filesystem refs — READINESS.yaml, GAPS-RANKED.yaml, ATTACK.yaml |
| uat-orchestrator | `.claude/agents/uat-orchestrator.agent.md` | 1 ref — `related_adr: ADR-005` (frontmatter only, no hardcoded path found) |
| uat-precondition-check | `.claude/agents/uat-precondition-check.agent.md` | 0 body refs found (frontmatter ADR-005 only) |
| review-aggregate-leader | `.claude/agents/review-aggregate-leader.agent.md` | 2 refs — `{STORY_ID}` template in KB tool call bodies (already partially migrated) |
| context-warmer | `.claude/agents/context-warmer.agent.md` | 0 filesystem refs found |
| dev-execute-leader | `.claude/agents/dev-execute-leader.agent.md` | 5 filesystem refs — **conflicts with WINT-7050 scope** |

### Reuse Candidates
- WINT-7070 migration pattern: inter-agent context via `kb_write_artifact`/`kb_read_artifact` instead of AGENT-CONTEXT.md filesystem writes
- WINT-7070 Output section prose cleanup pattern: scan prose descriptions after call body updates
- WINT-7050 subtask decomposition by complexity: zero-KB, partial-KB, verify-only groupings
- `kb_read_artifact` existence check as dedup guard (replaces RETRO-{STORY_ID}.yaml filesystem check)

---

## Canonical References

This is an agent-prompt-only story — files being modified are `.agent.md` markdown files, not TypeScript implementation. However, completed batch migrations serve as canonical references for migration patterns.

| Pattern | File | Why |
|---------|------|-----|
| Agent with full KB migration | `.claude/agents/batch-coordinator.agent.md` | KB-native agent, zero filesystem refs — target state |
| Output section cleanup pattern | `.claude/agents/workflow-retro.agent.md` (BEFORE) | Contains Output section prose refs that must be updated |
| Partial KB agent | `.claude/agents/review-aggregate-leader.agent.md` | Already partially migrated — verify-only target |

---

## Knowledge Context

### Lessons Learned

- **[KFMB-5010]** Agent Output sections often reference `_implementation/` paths in prose descriptions even after call bodies are updated. Scan Output section prose explicitly after updating call bodies. (*Applies because*: workflow-retro and commitment-gate-agent have rich Output sections describing file paths.)

- **[WINT-7020]** Each batch's remediation steps should include explicit Output section prose cleanup as a sub-task. (*Applies because*: This is documented as a required checklist item for all WINT-703x through WINT-70NN batch stories.)

- **[WINT-7070]** Inter-agent AGENT-CONTEXT.md filesystem writes can be replaced with KB context artifacts (`kb_write_artifact`/`kb_read_artifact` with `artifact_type: 'context'`). (*Applies because*: scrum-master-setup-leader currently writes `_workflow/AGENT-CONTEXT.md` to pass context to the loop leader.)

- **[KB OPP-001]** RETRO dedup guard using `RETRO-{STORY_ID}.yaml` filesystem existence check should be replaced with `kb_read_artifact({ story_id, artifact_type: 'review', artifact_name: 'RETRO' })` — if non-null skip, if null proceed. (*Applies because*: workflow-retro uses this exact filesystem dedup pattern.)

- **[KB OPP-002]** scrum-master-setup-leader and scrum-master-loop-leader may be deprecated rather than migrated — they are functionally superseded by `orchestrate-story-flow.sh` and the LangGraph pipeline per MVP architecture. (*Applies because*: These agents have 17+ combined filesystem refs concentrated in STATE.md management with no KB equivalent; deprecation is faster and lower risk than rewriting.)

- **[KB OPP-003]** uat-orchestrator and uat-precondition-check are the fastest migration targets — trivial ADR-LOG.md reference replacement. (*Applies because*: They have the fewest filesystem refs in the batch — quick wins to start.)

### Blockers to Avoid (from past stories)
- Do not regress existing KB tool calls already present in partially-migrated agents (review-aggregate-leader)
- Do not remove compatibility shim during this story (WINT-7100 is the dedicated removal story)
- Do not assign dev-execute-leader to this batch without resolving the WINT-7050 overlap conflict first
- Do not assign workflow-retro to this batch without resolving the WINT-7080 overlap conflict first

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — uat-orchestrator enforces this; migration must preserve ADR-005 constraint |

Note: ADR-LOG.md was not directly read (no baseline path). ADR-005 is referenced in uat-orchestrator and uat-precondition-check frontmatter and must be preserved as a behavioral constraint, not a file path reference.

### Patterns to Follow
- Replace `{FEATURE_DIR}/stories/{STORY_ID}/` path construction with `kb_get_story({ story_id })`
- Replace filesystem artifact reads (`READINESS.yaml`, `GAPS-RANKED.yaml`, `OUTCOME.yaml`, `CHECKPOINT.yaml`) with `kb_read_artifact({ story_id, artifact_type, artifact_name })`
- Replace filesystem artifact writes with `kb_write_artifact({ story_id, artifact_type, artifact_name, content })`
- Replace `kb_update_story_status` for state transitions
- After updating call bodies, scan Output section prose for remaining filesystem path references
- Deprecate agents superseded by LangGraph/orchestrate-story-flow.sh rather than migrating complex state-management logic

### Patterns to Avoid
- Do not create new `_workflow/` directory writes
- Do not create new `_implementation/` directory writes
- Do not reference `{FEATURE_DIR}` in any new code paths
- Do not hardcode `plans/stories/ADR-LOG.md` — use `kb_search({ query: 'ADR-005 ...' })` instead

---

## Conflict Analysis

### Conflict: dev-execute-leader Scope Overlap
- **Severity**: blocking
- **Description**: `dev-execute-leader.agent.md` is listed in both WINT-7040 (as a workflow orchestration agent) and WINT-7050 (Migrate Batch 3 Development Agents). The WINT-7040 elaboration artifact previously flagged this as a PM-level decision requiring scope correction. Assigning it to two parallel stories risks double-migration or regression.
- **Resolution Hint**: PM must resolve: assign dev-execute-leader exclusively to WINT-7050 (Development batch) and remove it from WINT-7040 scope, OR explicitly reserve it for WINT-7040 and remove it from WINT-7050 scope. The elaboration artifact verdict was FAIL specifically because this was not resolved.
- **Source**: elaboration (WINT-7040 artifact), story description, KB OPP

### Conflict: workflow-retro Scope Overlap
- **Severity**: warning
- **Description**: `workflow-retro.agent.md` appears in WINT-7040 description ("workflow-retro") and also in WINT-7080 scope description ("meta-learning agents (workflow-retro, ...)"). WINT-7080 elaboration explicitly lists workflow-retro as a "Partial-KB agent (cleanup needed)." One batch must own it.
- **Resolution Hint**: Assign workflow-retro to whichever batch is scheduled to run first (or whichever has deeper scope analysis). Given workflow-retro's 35 filesystem refs and complex RETRO dedup guard, it may fit better in WINT-7080's reporting/retrospective context. Remove from whichever batch does not take ownership.
- **Source**: WINT-7080 elaboration KB entry, WINT-7040 description

### Conflict: Story Title/Batch Number Mismatch
- **Severity**: warning
- **Description**: The elaboration artifact (verdict FAIL) flags that the story says "Batch 2" but WINT-7020 migration plan places these agents in BATCH-6. The batch numbering in the story title is inconsistent with the authoritative migration plan artifact from WINT-7020.
- **Resolution Hint**: PM should correct story title to "Migrate BATCH-6 Agents (Workflow Orchestration)" — or confirm whether the WINT-7020 migration plan was updated after this story was written. Verify batch assignment against the KB migration-plan artifact.
- **Source**: WINT-7040 elaboration artifact summary

---

## Story Seed

### Title
Migrate BATCH-6 Agents (Workflow Orchestration) — UAT, Review, Scrum, Commitment Gate

### Description

WINT-7020 (Create Agent Migration Plan) is now complete (2026-03-23). It established the compatibility shim, defined batch groupings, and produced a KB migration-plan artifact. This story implements BATCH-6 of that plan: migrating the workflow orchestration agents to eliminate all `{FEATURE_DIR}` template patterns, `story.yaml` filesystem reads, `_workflow/STATE.md` state management, and `_implementation/` directory writes, replacing them with KB MCP tool calls.

The agents in scope (pending scope conflict resolution — see Conflicts) are:
- **Trivial migrations**: uat-orchestrator (1 ref), uat-precondition-check (0-2 refs), review-aggregate-leader (2 refs — already partially migrated), context-warmer (0 refs — verify only)
- **Medium migrations**: commitment-gate-agent (7 refs), scrum-master-loop-leader (7 refs)
- **Complex/decision-required**: scrum-master-setup-leader (16 refs — STATE.md KB equivalent decision needed), workflow-retro (35 refs — RETRO dedup guard, OUTCOME.yaml, DEFERRED-KB-WRITE patterns)
- **Scope conflict (not yet assigned)**: dev-execute-leader (5 refs — overlap with WINT-7050), workflow-retro (35 refs — overlap with WINT-7080)

The scrum-master agents specifically must address a critical architectural decision: `_workflow/STATE.md` has no direct KB equivalent. The recommended approach (per KB OPP-002) is to evaluate whether these agents are superseded by `orchestrate-story-flow.sh` + LangGraph pipeline, and if so, mark them deprecated rather than attempting a complex KB state-management rewrite.

The compatibility shim from WINT-7020 must remain functional throughout — shim removal is deferred to WINT-7100.

### Initial Acceptance Criteria
- [ ] AC-1: Scope conflicts resolved — dev-execute-leader and workflow-retro are each assigned to exactly one batch migration story (WINT-7040 or their alternative batch)
- [ ] AC-2: Story title corrected to reflect actual batch number per WINT-7020 migration plan (BATCH-6 or confirmed Batch 2 if plan was updated)
- [ ] AC-3: uat-orchestrator and uat-precondition-check migrated — ADR-LOG.md hardcoded path references replaced with `kb_search` query or removed (trivial quick wins, start here)
- [ ] AC-4: review-aggregate-leader verified — existing KB tool call bodies preserved, no regression, Output section prose checked for stale path references
- [ ] AC-5: context-warmer verified — no filesystem references exist (0 refs confirmed), mark as verified-clean
- [ ] AC-6: commitment-gate-agent migrated — READINESS.yaml, GAPS-RANKED.yaml, ATTACK.yaml filesystem reads replaced with `kb_read_artifact` calls
- [ ] AC-7: scrum-master architectural decision made and documented — either (a) agents deprecated with header comments citing supersession by orchestrate-story-flow.sh + LangGraph, OR (b) KB-native STATE equivalent defined and implemented
- [ ] AC-8: scrum-master-loop-leader migrated per AC-7 decision
- [ ] AC-9: scrum-master-setup-leader migrated per AC-7 decision — AGENT-CONTEXT.md filesystem write replaced with `kb_write_artifact` (or file deprecated)
- [ ] AC-10: Output section prose checked for all migrated files — no remaining `_implementation/` or `{FEATURE_DIR}` path references in prose descriptions
- [ ] AC-11: Compatibility shim from WINT-7020 remains functional — no shim removal or modification
- [ ] AC-12: No new `{FEATURE_DIR}`, `_workflow/`, or `_implementation/` directory writes introduced in any migrated file
- [ ] AC-13: All changes verified by grep scan — zero remaining `{FEATURE_DIR}` or `_implementation/` refs in migrated files (excluding comments documenting pre-migration state)

*(ACs for workflow-retro and dev-execute-leader deferred pending scope conflict resolution — see AC-1)*

### Non-Goals
- Do not remove the compatibility shim (WINT-7100 owns shim removal)
- Do not migrate dev-execute-leader until scope conflict with WINT-7050 is resolved
- Do not migrate workflow-retro until scope conflict with WINT-7080 is resolved
- Do not design or implement a new KB-native workflow state machine (beyond scrum-master deprecation decision) — out of scope for this batch
- Do not modify the orchestrate-story-flow.sh script itself
- Do not update ADR-LOG.md content

### Reuse Plan
- **Patterns**: WINT-7070 inter-agent context artifact pattern (`kb_write_artifact` for AGENT-CONTEXT), WINT-7050 subtask decomposition by migration complexity
- **KB Tools**: `kb_get_story`, `kb_read_artifact`, `kb_write_artifact`, `kb_update_story_status`, `kb_search` (for ADR lookup)
- **Migration dedup guard**: `kb_read_artifact({ story_id, artifact_type: 'review', artifact_name: 'RETRO' })` existence check replaces RETRO-*.yaml filesystem check
- **Reference state**: WINT-7020 KB migration-plan artifact for authoritative batch groupings and remediation steps

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Verification approach: grep scan for `{FEATURE_DIR}` and `_implementation/` patterns on all agent files in scope after migration — zero results expected
- ADR-005 constraint must be preserved in uat-orchestrator and uat-precondition-check behavior (no mocking) — test that constraint language is intact after migration
- Deprecation path (scrum-master agents): verify deprecation header is present AND no active pipeline invocations exist (`grep -r "/scrum-master"` in `.claude/`) before accepting deprecated state

### For UI/UX Advisor
- N/A — this is an agent-prompt-only migration story with no UI components

### For Dev Feasibility
- **Start with trivial targets**: uat-orchestrator, uat-precondition-check, context-warmer (verify), review-aggregate-leader — complete these before touching scrum-master or workflow-retro
- **Critical architectural decision first**: Before coding scrum-master migration, check if any active file in `.claude/` invokes `/scrum-master`. If no active invocation, proceed with deprecation header approach. If active invocations found, escalate to PM for scope decision.
- **Scope conflict resolution is blocking**: AC-1 must be resolved before starting work on dev-execute-leader or workflow-retro
- **Canonical references for KB tool call patterns**:
  - `kb_read_artifact` existence check for dedup: established by KB OPP-001 (WINT-7040 context)
  - `kb_write_artifact` for inter-agent context: established by WINT-7070
  - Grep-based verification: `grep -n "FEATURE_DIR\|_implementation/\|elaboration/" .claude/agents/<file>.agent.md`
- **Subtask decomposition recommendation** (by migration complexity):
  1. Verify-only (0 refs): context-warmer (confirm clean)
  2. Trivial migrations (1-2 refs): uat-orchestrator, uat-precondition-check, review-aggregate-leader
  3. Medium migrations (5-7 refs): commitment-gate-agent, scrum-master-loop-leader
  4. Decision-required (16 refs): scrum-master-setup-leader (after architectural decision)
  5. Deferred pending conflict resolution: dev-execute-leader, workflow-retro
