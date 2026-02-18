---
generated: "2026-02-18"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-7020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline does not enumerate agent-level details; supplemented by WINT-7010 audit artifacts.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Agent directory | `.claude/agents/` | Active | 141 `.agent.md` files (as of 2026-02-14 audit) |
| Compatibility shim | `packages/backend/mcp-tools/src/story-compatibility/` | UAT | DB-first, directory-fallback (WINT-1011/1012) |
| story-status command | `.claude/commands/story-status.md` | UAT | Already migrated to DB (WINT-1040) |
| story-update command | `.claude/commands/story-update.md` | UAT | Already migrated to DB (WINT-1050) |
| story-move command | `.claude/commands/story-move.md` | Completed | Already migrated to DB (WINT-1060) |
| WINT-7010 audit artifacts | `plans/future/platform/UAT/WINT-7010/` | UAT | AGENT-CATALOG.yaml, CROSS-REFERENCES.yaml, ORPHANED-AGENTS.yaml, AUDIT-SUMMARY.md produced |
| stories index as generated | `wint/stories.index.md` | UAT | Index deprecation (WINT-1070) in UAT |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-1160 | in-progress | None — worktree conflict prevention, no agent content changes |
| WINT-4080 | ready-to-work | scope-defender agent creation (new file, no existing agent modification) |

### Constraints to Respect

- **Compatibility shim remains active through Phase 7**: Agents migrated in WINT-7030–7090 will call DB directly; the shim is removed only in WINT-7100 after all agents are migrated.
- **Protected features**: Do NOT modify any agent/command/skill files in this story — this is planning only.
- **story-move directory step preserved in Phase 1**: WINT-1060 confirmed that directory move remains on the happy path until WINT-7030 removes it.
- **Downstream batch stories (WINT-7030–7090) are sequentially blocked by WINT-7020**: the plan document produced here is the only input to batch execution.

---

## Retrieved Context

### Related Endpoints / MCP Tools

| Tool | Package | Status | Purpose |
|------|---------|--------|---------|
| `shimGetStoryStatus` | `packages/backend/mcp-tools/src/story-compatibility/` | Live | DB-first story lookup |
| `shimUpdateStoryStatus` | `packages/backend/mcp-tools/src/story-compatibility/` | Live | DB write for status transitions |
| `shimGetStoriesByStatus` | `packages/backend/mcp-tools/src/story-compatibility/` | Live | Status-based listing |
| `shimGetStoriesByFeature` | `packages/backend/mcp-tools/src/story-compatibility/` | Live | Feature-scoped listing |
| `story_get_status` (MCP) | `packages/backend/mcp-tools` | Live | Wraps shimGetStoryStatus |
| `story_update_status` (MCP) | `packages/backend/mcp-tools` | Live | Wraps shimUpdateStoryStatus |

### Related Components (Files to be categorized, not modified)

From the WINT-7010 audit — all files that contain swim-lane directory references:

**Agent files (41 `.agent.md` files):**
- dev-setup-leader, dev-plan-leader, dev-documentation-leader, dev-fix-fix-leader
- dev-implement-backend-coder, dev-implement-frontend-coder, dev-implement-contracts
- dev-implement-plan-validator, dev-implement-planner, dev-implement-planning-leader
- dev-implement-playwright, dev-implement-proof-writer, dev-implement-verifier
- dev-proof-leader, dev-verification-leader
- elab-autonomous-decider, elab-completion-leader, elab-setup-leader
- experiment-analyzer, knowledge-context-loader
- pm-bootstrap-generation-leader, pm-dev-feasibility-review, pm-draft-test-plan
- pm-harness-generation-leader, pm-harness-setup-leader, pm-story-adhoc-leader
- pm-story-bug-leader, pm-story-fix-leader, pm-story-followup-leader
- pm-story-generation-leader, pm-story-risk-predictor, pm-story-seed-agent
- pm-story-split-leader, pm-triage-leader, pm-uiux-recommendations, pm.agent.md
- qa-verify-setup-leader, qa-verify-completion-leader
- reality-intake-collector, review-aggregate-leader
- story-fanout-pm, story-synthesize-agent

**Command files (16):**
- story-move.md, story-status.md, story-update.md (already migrated — DB-first)
- dev-implement-story.md, dev-code-review.md, dev-fix-story.md
- elab-story.md, elab-epic.md (via elab agents)
- qa-verify-story.md, architect-review.md, code-audit.md
- context-init.md, precondition-check.md, workflow-batch.md
- pm-fix-story.md, pm-story.md, index-update.md, migrate-agents-v3.md

**Skill files (3):**
- `.claude/skills/token-log/SKILL.md`
- `.claude/skills/token-report/SKILL.md`
- `.claude/skills/wt-new/SKILL.md`

### Reuse Candidates

- **WINT-7010 AGENT-CATALOG.yaml** — provides agent metadata (type, version, permission_level, spawn relationships) enabling risk scoring without re-scanning.
- **WINT-7010 CROSS-REFERENCES.yaml** — spawn chain map; critical for identifying which agents have high fan-out (high risk to break).
- **WINT-7010 ORPHANED-AGENTS.yaml** — 41 orphaned agents identified; these are candidates for low-risk or skip-with-review treatment.
- **WINT-7010 AUDIT-SUMMARY.md** — executive summary with recommendations already drafted.
- **migrate-agents-v3.md** command — prior migration pattern (v2→v3) demonstrates batch-by-command grouping strategy that can be adapted.
- **story-move.md / story-update.md / story-status.md** — three commands already migrated; serve as concrete migration examples.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Already-migrated command (DB write pattern) | `.claude/commands/story-update.md` | Shows shimUpdateStoryStatus integration with DB-first write + frontmatter fallback — the target state for migrated agents |
| Already-migrated command (DB read pattern) | `.claude/commands/story-status.md` | Shows shimGetStoryStatus DB-first query with directory fallback — read pattern for agents |
| Migration plan doc format (prior art) | `.claude/commands/migrate-agents-v3.md` | Demonstrates batch-by-command grouping, state file tracking, per-batch agent lists — adaptable format for WINT-7020 plan |
| Shim module (DB integration target) | `packages/backend/mcp-tools/src/story-compatibility/` | Defines the four shim functions that migrated agents must call |

---

## Knowledge Context

### Lessons Learned

No KB query was performed (lessons_loaded: false). Lessons surfaced from direct codebase and story analysis:

- **[WINT-1060]** story-move migration confirmed: directory move step is preserved through Phase 1. Agents that call `/story-move` do not need to skip the FS step during WINT-7030 — only the DB write needs to be added or confirmed present. (category: pattern)
  - *Applies because*: Migration plan must account for commands that already call `shimUpdateStoryStatus` (story-move, story-update, story-status) — these do NOT need DB migration, only verification.

- **[WINT-7010]** 41 of 141 agents are orphaned (29.1%) — not referenced in any spawn chain or command. Orphaned agents are low-risk migration candidates but should be reviewed for deprecation rather than migrated. (category: pattern)
  - *Applies because*: The migration plan must define how to handle orphaned agents — deprecate-first review saves migration effort on unused agents.

- **[WINT-1011/1012]** Shim functions require DB to be live (WINT-0090 MCP tools). The compatibility shim's DB-first strategy means agents can be migrated incrementally — if DB is unavailable, directory fallback still works. (category: blocker_to_avoid)
  - *Applies because*: Migration plan must specify that each batch is safe to deploy while other agents remain un-migrated.

### Blockers to Avoid (from past stories)

- Do not migrate commands that are already DB-first (story-move, story-update, story-status) — they are already migrated and verified. Attempting to re-migrate them would introduce regression risk.
- Do not design a plan that requires all agents to be migrated simultaneously — the shim's backward compatibility enables incremental migration. The plan must preserve this property.
- Do not include orphaned agents in the core migration batches — they need deprecation review first (AUDIT-SUMMARY.md recommendation #5).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Each migration batch must be tested against live DB. |

*Note: ADR-001 (API paths), ADR-002 (infra), ADR-003 (CDN), ADR-004 (Auth), ADR-006 (E2E in dev) are not directly applicable to this documentation/planning story.*

### Patterns to Follow

- **Batch-by-workflow-domain grouping**: Group agents by the command/workflow they serve (story-management, dev-workflow, elab-workflow, qa-workflow, etc.) — same pattern used in migrate-agents-v3.md.
- **Risk scoring from spawn depth**: Agents at the top of spawn chains (leaders with many children) are higher risk than leaf workers — use CROSS-REFERENCES.yaml spawn data.
- **Sequential batch execution**: Each batch depends on the previous batch passing QA/verification — no parallel batch execution.
- **DB-first write, FS backward-compat preserved per phase**: Migrated agents call shim functions; shim handles the DB write and retains FS operations through Phase 1.

### Patterns to Avoid

- **Big-bang migration**: Migrating all 41 agents in one batch creates high rollback risk.
- **Including already-migrated commands in migration scope**: story-move, story-update, story-status are done; the plan should note this explicitly.
- **Treating all orphaned agents as migration targets**: Orphaned agents need deprecation review before migration — migrating unused agents wastes effort and risks undetected breakage.

---

## Conflict Analysis

### Conflict: scope ambiguity — agent count vs story index claim
- **Severity**: warning (non-blocking)
- **Description**: The WINT-7010 audit found 141 agents, while the stories index entry for WINT-7020 says "categorize 52 agents." The "52 agents" figure in the index likely reflects agents that specifically have directory-structure logic (swim-lane references), not the full agent count. However, the actual grep count identified 41 `.agent.md` files with swim-lane references (plus 16 command files and 3 skill files). The plan must reconcile which of the 41 agents have substantive swim-lane logic (vs. incidental mentions in comments/examples) to produce an accurate migration scope.
- **Resolution Hint**: During WINT-7020 implementation, re-scan each of the 41 agents to classify: (a) substantive swim-lane logic requiring migration, (b) incidental references that can be left unchanged, (c) already-migrated (story-move, story-update, story-status agents). The "52 agents" figure may include commands and skills bundled with agents — confirm scope during implementation.

---

## Story Seed

### Title

Create Agent Migration Plan: Categorize Agents by Risk and Define Migration Batches

### Description

**Context**: WINT-7010 (Audit Agent Directory References) has completed and produced 7 structured artifacts including AGENT-CATALOG.yaml (141 agents), CROSS-REFERENCES.yaml (62 spawn relationships), and ORPHANED-AGENTS.yaml (41 orphaned agents). Three commands (story-move, story-update, story-status) are already migrated to DB-first operation. The compatibility shim is live and provides DB-first with directory fallback for all agent transitions.

**Problem**: Before migration batches can execute (WINT-7030–7090), a systematic migration plan must exist that:
1. Reconciles the 41 agents with swim-lane references into actionable batches
2. Assigns risk levels to each agent based on spawn depth, reference count, and workflow criticality
3. Defines migration order (5–10 agents per iteration) that preserves workflow integrity throughout the migration
4. Identifies which agents/commands/skills are already migrated and can be excluded
5. Provides the rollback/verification approach for each batch

**Proposed Solution**: Produce a MIGRATION-PLAN.md document that categorizes all agents with swim-lane references by risk tier (critical/high/medium/low), groups them into 5–7 sequential batches of 5–10 agents each, and defines per-batch verification criteria. The plan will directly drive WINT-7030 through WINT-7090 execution.

### Initial Acceptance Criteria

- [ ] AC-1: Read and incorporate all 7 WINT-7010 audit artifacts. Document confirms artifacts were consumed as inputs.
- [ ] AC-2: Produce a risk-scored inventory of all agents with swim-lane directory references. Each agent entry includes: file path, agent type, swim-lane reference count, spawn chain depth, risk tier (critical/high/medium/low), and migration rationale.
- [ ] AC-3: Exclude already-migrated files from migration scope. Identify story-move.md, story-status.md, story-update.md (and associated agents) as already-migrated with verification status.
- [ ] AC-4: Apply deprecation-review classification to orphaned agents. Each of the 41 orphaned agents from ORPHANED-AGENTS.yaml receives one of: (a) include-in-migration, (b) deprecate-before-migrate, (c) archive-not-migrate.
- [ ] AC-5: Define 5–7 sequential migration batches. Each batch specifies: batch number, batch name (workflow domain), list of files (agents/commands/skills), estimated effort, blocking dependencies on prior batches.
- [ ] AC-6: Define per-batch verification criteria. Each batch includes a minimum verification checklist: which spawn chains to smoke-test, which commands to exercise, what DB state to check.
- [ ] AC-7: Define rollback procedure applicable to any batch. Rollback relies on the compatibility shim's directory fallback — document how to verify fallback is engaged and how to revert shim behavior if needed.
- [ ] AC-8: Produce MIGRATION-PLAN.md in the story output directory. Document is structured for direct consumption by WINT-7030 developer. Sections: scope, excluded files, risk inventory, batch table, per-batch verification, rollback.
- [ ] AC-9: Produce BATCH-SCHEDULE.yaml alongside MIGRATION-PLAN.md. Machine-readable batch definitions (story ID per batch, file list, dependencies, estimated points) for use by WINT-7030–7090 elaboration.
- [ ] AC-10: No agent, command, or skill files are modified by this story. This is a planning-only story.

### Non-Goals

- **No agent modifications**: No `.agent.md`, `.md` command, or `SKILL.md` files are modified.
- **No migration execution**: Execution belongs to WINT-7030–7090.
- **No compatibility shim changes**: Shim is already live; no changes required for planning.
- **No new database schema design**: Schema is established by WINT-1011/1012.
- **No LangGraph node porting**: LangGraph parity is Phase 9 (WINT-9xxx).
- **No telemetry instrumentation**: Telemetry migration is covered by WINT-7080.
- **No doc-sync updates**: Final doc sync is WINT-7120.

### Reuse Plan

- **Artifacts**: AGENT-CATALOG.yaml, CROSS-REFERENCES.yaml, ORPHANED-AGENTS.yaml from `plans/future/platform/UAT/WINT-7010/`
- **Patterns**: Batch-by-workflow-domain grouping from `migrate-agents-v3.md` command
- **References**: story-update.md and story-status.md as canonical examples of the migrated state
- **Packages**: None (documentation/planning story)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a documentation/planning story — no executable tests. Verification is:
- Manual completeness review: all 7 WINT-7010 artifacts consumed, all 41 swim-lane agents classified, all batches have non-empty file lists summing to total scope.
- Structural validation: BATCH-SCHEDULE.yaml parses as valid YAML; MIGRATION-PLAN.md contains all required sections.
- No unit tests, no integration tests, no E2E tests required.
- ADR-005 (real services for UAT) is not triggered — no runtime behavior.

### For UI/UX Advisor

No UI/UX considerations. This story produces internal planning documentation consumed by developer agents, not end users.

### For Dev Feasibility

**Implementation approach**:
1. Read all 7 WINT-7010 artifacts from `plans/future/platform/UAT/WINT-7010/`
2. Re-scan each of the 41 agents with swim-lane refs to classify reference type (substantive vs incidental vs already-migrated)
3. Apply risk scoring: leaders with many spawn-children = critical/high; leaf workers with few references = medium/low; orphaned = review classification
4. Group into batches by workflow domain (story-management, elab, dev, qa, review, reporting, utility)
5. Write MIGRATION-PLAN.md and BATCH-SCHEDULE.yaml to output directory

**Canonical references for implementation**:
- `plans/future/platform/UAT/WINT-7010/AGENT-CATALOG.yaml` — agent metadata source
- `plans/future/platform/UAT/WINT-7010/CROSS-REFERENCES.yaml` — spawn chain depth data
- `plans/future/platform/UAT/WINT-7010/ORPHANED-AGENTS.yaml` — 41 agents needing deprecation review
- `.claude/commands/migrate-agents-v3.md` — batch structure format to adapt

**Effort estimate**: Low (1–2 story points). Systematic analysis of existing audit data, no code changes.

**Key risk to address during implementation**: The "52 agents" figure in the index vs the 41 `.agent.md` files identified by grep. Clarify by checking whether commands and skills are included in the 52, and whether some grep hits are in comments/examples only. Document the reconciliation in MIGRATION-PLAN.md.
