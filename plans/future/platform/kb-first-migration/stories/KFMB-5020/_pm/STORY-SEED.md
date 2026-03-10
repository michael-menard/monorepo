---
generated: "2026-02-26T00:00:00Z"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KFMB-5020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No specific kb_read_artifact or reader agent lessons in baseline. KB-First Migration plan post-dates the baseline (generated 2026-02-26).

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator artifact schemas (Zod-validated) | `packages/backend/orchestrator/src/artifacts/` | Defines the types that agents read: checkpoint, scope, plan, evidence, analysis, review, verification |
| `_shared/kb-integration.md` artifact standard | `.claude/agents/_shared/kb-integration.md` | Canonical reference for `kb_read_artifact` / `kb_write_artifact` patterns; declares `_implementation/` as deprecated |
| `dev-execute-leader` (already migrated) | `.claude/agents/dev-execute-leader.agent.md` | Already reads all artifacts via `kb_read_artifact`; gold standard for reader migration |
| `dev-plan-leader` (already migrated) | `.claude/agents/dev-plan-leader.agent.md` | Reads checkpoint and scope artifacts via `kb_read_artifact` |
| `qa-verify-verification-leader` (already migrated) | `.claude/agents/qa-verify-verification-leader.agent.md` | Reads evidence, context, and review artifacts via `kb_read_artifact` |
| `knowledge-context-loader` (writer, already migrated) | `.claude/agents/knowledge-context-loader.agent.md` | Writes context artifact via `kb_write_artifact`; reader side is already KB-native |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KFMB-5010 — Migrate _implementation/ Writer Agents | Backlog | BLOCKING DEPENDENCY: writer migration must precede reader migration so KB artifacts actually exist |
| KFMB-1030 — PM Artifact Types and Detail Tables | In Elaboration | Dependency of KFMB-5010; must complete before writers (and therefore readers) can migrate |
| KFMB-2040 — KB-Native Story Generation Pipeline | Backlog | Dependency of KFMB-5010 |

### Constraints to Respect

- KFMB-5020 depends on KFMB-5010 (writer migration) completing first. Writers must exist before readers can switch to KB-only reads.
- `_implementation/` directories are being deprecated system-wide; readers that still reference these paths must use `kb_read_artifact` after KFMB-5010 land.
- Orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/` are protected and must not be modified by this story.
- `@repo/db` client API surface is protected.

---

## Retrieved Context

### Related Endpoints

None — this story is entirely agent/workflow tooling. No HTTP endpoints are involved.

### Related Components

| Agent File | Current Behavior | Reader Artifact(s) |
|-----------|------------------|--------------------|
| `.claude/agents/dev-verification-leader.agent.md` | Reads `_implementation/SCOPE.md` and `_implementation/CHECKPOINT.yaml` from disk | `scope`, `checkpoint` |
| `.claude/agents/qa-verify-setup-leader.agent.md` | Checks `_implementation/EVIDENCE.yaml` and `_implementation/REVIEW.yaml` file existence | `evidence`, `review` |
| `.claude/agents/elab-completion-leader.agent.md` | Reads `_implementation/ELAB.yaml` from disk | `analysis` |
| `.claude/agents/elab-autonomous-decider.agent.md` | Reads `_implementation/ELAB.yaml` from disk | `analysis` |
| `.claude/agents/evidence-judge.agent.md` | Reads `EVIDENCE.yaml` from `{story_dir}/_implementation/EVIDENCE.yaml` | `evidence` |
| `.claude/agents/dev-fix-fix-leader.agent.md` | References `_implementation/` artifacts | `checkpoint`, `review`, `verification` |
| `.claude/agents/dev-documentation-leader.agent.md` | References `_implementation/` artifacts | `plan`, `evidence` |
| `.claude/agents/elab-delta-review-agent.agent.md` | References `_implementation/` artifacts | `analysis` |
| `.claude/agents/elab-escape-hatch-agent.agent.md` | References `_implementation/` artifacts | `analysis` |
| `.claude/agents/architect-story-review.agent.md` | References `_implementation/` artifacts | varies |
| `.claude/agents/pm-story-followup-leader.agent.md` | References `_implementation/` artifacts | `checkpoint` |
| `.claude/agents/pm-story-split-leader.agent.md` | References `_implementation/` artifacts | `analysis` (ELAB) |
| `.claude/agents/ui-ux-review-setup-leader.agent.md` | References `_implementation/` artifacts | varies |
| `.claude/agents/workflow-retro.agent.md` | References `_implementation/` artifacts | `evidence`, `checkpoint` |
| `.claude/agents/reality-intake-collector.agent.md` | References `_implementation/` artifacts | `evidence` |
| `.claude/agents/leakage-metrics-agent.agent.md` | References `_implementation/` artifacts | `evidence`, `checkpoint` |
| `.claude/agents/turn-count-metrics-agent.agent.md` | References `_implementation/` artifacts | `checkpoint` |
| `.claude/agents/pcar-metrics-agent.agent.md` | References `_implementation/` artifacts | `evidence` |
| `.claude/agents/churn-index-metrics-agent.agent.md` | References `_implementation/` artifacts | `evidence` |

### Reuse Candidates

- **`dev-execute-leader` read pattern** — The gold-standard for parallel `kb_read_artifact` calls (reads plan, scope, context, checkpoint in a single `Promise.all`). All reader agents should adopt this pattern.
- **`_shared/kb-integration.md` Artifact Type Reference table** — Defines the canonical `artifact_type` strings for each deprecated YAML filename. This is the authoritative mapping for the migration.
- **`qa-verify-verification-leader`** — Demonstrates how to replace file-existence precondition checks with `kb_read_artifact` + null-check pattern.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Parallel kb_read_artifact (multiple artifact types) | `.claude/agents/dev-execute-leader.agent.md` | Reads plan, scope, context, checkpoint via `Promise.all([kb_read_artifact(...), ...])` — the canonical multi-read pattern |
| Single artifact read replacing file check | `.claude/agents/qa-verify-verification-leader.agent.md` | Reads evidence artifact from KB as primary input; demonstrates null-check fallback instead of filesystem existence check |
| Artifact type reference mapping | `.claude/agents/_shared/kb-integration.md` | Contains the `File (deprecated) → artifact_type → phase → Written By` table — the authoritative source for all migration type mappings |
| ELAB artifact write (writer side, for test validation) | `.claude/agents/elab-analyst.agent.md` | Shows how the analysis artifact is written; reader agents should read the same structure |

---

## Knowledge Context

### Lessons Learned

No KB lesson entries were retrieved (KB query not executed in seed phase; KB may be empty for this domain). Based on structural analysis of existing agents:

- **[General]** Agents that were early adopters of `kb_read_artifact` (dev-execute-leader, qa-verify-verification-leader) show that the pattern is straightforward: replace `Read(path)` with `kb_read_artifact({ story_id, artifact_type })` and access `artifact.content`.
- **[General]** `dev-verification-leader` references `_implementation/SCOPE.md` (note: `.md` extension, not `.yaml`) — this may indicate the scope artifact was historically written as markdown. Post-KFMB-5010, the canonical type is `scope` with `kb_read_artifact`.

### Blockers to Avoid (from past stories)

- **Do not migrate readers before writers complete (KFMB-5010).** If reader agents are updated to use `kb_read_artifact` before writer agents write to KB, all downstream agents will get null results and workflows will break. The dependency ordering is critical.
- **Do not confuse `artifact_type` strings** — the deprecated filenames do not directly match `artifact_type` values. ELAB.yaml → `analysis`, QA-VERIFY.yaml → `verification`, KNOWLEDGE-CONTEXT.yaml → `context`. Always consult the mapping table in `_shared/kb-integration.md`.
- **Precondition checks that test for file existence** must be converted to KB null-checks, not simply dropped. `qa-verify-setup-leader` checks `_implementation/EVIDENCE.yaml` and `_implementation/REVIEW.yaml` exist — this must become `kb_read_artifact` returning non-null for `evidence` and `review` types.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story during dev phase |

ADR-001 (API paths), ADR-002 (infrastructure), ADR-003 (CDN), ADR-004 (auth) — not directly applicable. This story only modifies `.claude/agents/` markdown files; no API, frontend, or database changes.

### Patterns to Follow

- Replace `Read(path/_implementation/FOO.yaml)` with `kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "foo" })` and access `.content`
- Use `Promise.all([...])` for parallel reads when multiple artifact types are needed in the same agent phase
- For precondition existence checks, use `const artifact = await kb_read_artifact(...)` followed by `if (!artifact || !artifact.content)` → STOP
- Cite the artifact_type → file mapping from `_shared/kb-integration.md`; never invent new `artifact_type` strings
- Add `kb_read_artifact` to the agent frontmatter `kb_tools` array for every migrated agent
- After migration, remove the `_implementation/` file path references from agent Inputs sections and precondition checks

### Patterns to Avoid

- Reading `_implementation/FOO.yaml` directly from disk after KFMB-5010 (writers no longer guarantee file existence)
- Checking file existence via `Bash` (`ls _implementation/EVIDENCE.yaml`) — replace with KB null-check
- Keeping dual-read (file fallback + KB) in reader agents — readers should be fully KB-native after this story
- Mixing `artifact_write` (dual-write tool) logic into reader-only agents — reader agents should only call `kb_read_artifact`, not `artifact_write`

---

## Conflict Analysis

### Conflict: Hard Dependency on KFMB-5010
- **Severity**: warning (not blocking seed generation, but blocking implementation)
- **Description**: KFMB-5020 cannot be implemented until KFMB-5010 (writer migration) is complete. If any reader agent is migrated before its corresponding writer, `kb_read_artifact` will return null and the workflow will silently break. The story.yaml correctly lists `KFMB-5010` as a dependency.
- **Resolution Hint**: Do not begin implementation until KFMB-5010 is in `ready-for-qa` or `complete` status. If partial writer migration lands (e.g., some agents migrated in KFMB-5010), only the corresponding reader agents may be migrated in this story.

### Conflict: Sizing Warning
- **Severity**: warning
- **Description**: The story.yaml includes `sizing_warning: true`. With 33 active agent files referencing `_implementation/` paths (80 total references across agents per grep count), and this story covering the reader subset (writers handled by KFMB-5010), the scope is large. The agent list must be carefully scoped to reader-only agents to avoid overlap with KFMB-5010.
- **Resolution Hint**: Scope this story strictly to agents that READ artifacts but do not write them. Agents that do both (e.g., `dev-verification-leader` reads SCOPE and CHECKPOINT and also writes to CHECKPOINT.yaml in fix mode) need careful per-operation scoping. The test plan should enumerate each agent and operation type.

---

## Story Seed

### Title

Migrate _implementation/ Reader Agents to kb_read_artifact

### Description

**Context**: The KB-First Migration plan is eliminating `_implementation/` filesystem artifact directories in favor of KB-native storage via `kb_write_artifact` / `kb_read_artifact`. KFMB-5010 migrates writer agents so all artifacts are written to the KB. This story (KFMB-5020) is the complementary reader migration: every agent that currently reads from `_implementation/CHECKPOINT.yaml`, `_implementation/EVIDENCE.yaml`, `_implementation/ELAB.yaml`, `_implementation/SCOPE.yaml`, `_implementation/PLAN.yaml`, or `_implementation/REVIEW.yaml` from the filesystem must be updated to read from the KB via `kb_read_artifact`.

**Problem**: Currently, approximately 19+ reader agents reference `_implementation/` filesystem paths. Once KFMB-5010 lands, these filesystem files will no longer be reliably present (writers will write to KB, not necessarily to disk). Any agent that still reads from disk will receive missing-file errors or stale data.

**Proposed Solution**: Update each reader agent's Instructions, Inputs section, and precondition checks to:
1. Replace `Read(path)` filesystem calls with `kb_read_artifact({ story_id, artifact_type })` KB calls
2. Update frontmatter `kb_tools` to include `kb_read_artifact`
3. Convert file-existence precondition checks to KB null-checks
4. Remove obsolete file path references from Input descriptions
5. Update tool declarations (`tools:` array) — agents that previously only needed `Read` for artifacts may be able to drop it if all reads are now via KB tools

The migration follows the established `_shared/kb-integration.md` artifact type reference table.

### Initial Acceptance Criteria

- [ ] AC-1: `dev-verification-leader` reads `scope` and `checkpoint` artifacts via `kb_read_artifact` instead of `_implementation/SCOPE.md` and `_implementation/CHECKPOINT.yaml` from disk.
- [ ] AC-2: `qa-verify-setup-leader` precondition checks for EVIDENCE.yaml and REVIEW.yaml are replaced with `kb_read_artifact` null-checks for `evidence` and `review` artifact types.
- [ ] AC-3: `elab-completion-leader` reads the `analysis` artifact via `kb_read_artifact` instead of `_implementation/ELAB.yaml`.
- [ ] AC-4: `elab-autonomous-decider` reads the `analysis` artifact via `kb_read_artifact` instead of `_implementation/ELAB.yaml`.
- [ ] AC-5: `evidence-judge` reads the `evidence` artifact via `kb_read_artifact` instead of `{story_dir}/_implementation/EVIDENCE.yaml`.
- [ ] AC-6: All other reader agents identified in Phase 2 codebase scan (dev-fix-fix-leader, dev-documentation-leader, elab-delta-review-agent, elab-escape-hatch-agent, architect-story-review, pm-story-followup-leader, pm-story-split-leader, ui-ux-review-setup-leader, workflow-retro, reality-intake-collector, leakage-metrics-agent, turn-count-metrics-agent, pcar-metrics-agent, churn-index-metrics-agent) are updated to read via `kb_read_artifact` where they reference `_implementation/` artifact files.
- [ ] AC-7: Every migrated agent's frontmatter `kb_tools` array includes `kb_read_artifact`.
- [ ] AC-8: No migrated agent retains filesystem path references to `_implementation/CHECKPOINT.yaml`, `_implementation/EVIDENCE.yaml`, `_implementation/ELAB.yaml`, `_implementation/SCOPE.yaml`, `_implementation/PLAN.yaml`, or `_implementation/REVIEW.yaml` in its Inputs or preconditions sections.
- [ ] AC-9: A smoke-test walkthrough confirms a representative agent (e.g., `qa-verify-setup-leader`) can read its required artifacts from KB when called with a valid `story_id` that has artifacts in the KB (requires KFMB-5010 to have run first, or a test fixture).

### Non-Goals

- Do NOT migrate writer agents (covered by KFMB-5010).
- Do NOT modify any source code in `packages/` or `apps/` — this story only modifies `.claude/agents/` markdown files.
- Do NOT migrate `_pm/` artifacts (STORY-SEED.md, PLAN.yaml under `_pm/`, etc.) — that is KFMB-5040 and KFMB-5050.
- Do NOT remove the `_implementation/` directories from existing stories already in-progress (that is KFMB-6020, dead code removal).
- Do NOT implement KFMB-5030 (command orchestrator migration) as part of this story.
- Do NOT change the behavior of agents that already use `kb_read_artifact` (dev-execute-leader, dev-plan-leader, dev-setup-leader, qa-verify-verification-leader, knowledge-context-loader).
- Do NOT update `_shared/kb-integration.md` — it already documents the correct patterns.

### Reuse Plan

- **Components**: `dev-execute-leader.agent.md` parallel `Promise.all` read pattern, `qa-verify-verification-leader.agent.md` null-check precondition pattern
- **Patterns**: `kb_read_artifact({ story_id, artifact_type })` → `.content` access; `if (!artifact || !artifact.content) → STOP/WARN` for required reads
- **Packages**: MCP KB tools (`kb_read_artifact`, `kb_list_artifacts`) — no npm packages modified

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story touches only `.claude/agents/` markdown files — no TypeScript code to unit test.
- The primary verification method is a walkthrough/integration check: confirm that after migration, a representative reader agent (e.g., `qa-verify-setup-leader`) successfully calls `kb_read_artifact` and gets back a valid artifact when one exists in the KB.
- Test plan should enumerate all ~19 migrated agent files and verify each has: (a) `kb_read_artifact` in frontmatter `kb_tools`, (b) no `_implementation/` file path references in Inputs/preconditions, (c) correct `artifact_type` strings matching the `_shared/kb-integration.md` table.
- Per ADR-005 and ADR-006, this story is `story_type: infra/agents` and is exempt from E2E browser tests. Verification should be done via agent dry-run review and KB fixture tests if available.
- Consider a regression check: grep for remaining `_implementation/EVIDENCE\|_implementation/PLAN\|_implementation/SCOPE\|_implementation/CHECKPOINT\|_implementation/ELAB\|_implementation/REVIEW` in `.claude/agents/` after the story; the count should be 0 for non-migrated file references (excluding archived agents).

### For UI/UX Advisor

- Not applicable — this story has no user-facing UI changes. All changes are internal workflow agent markdown files.

### For Dev Feasibility

- Implementation is straightforward text edits to `.claude/agents/*.md` files — no TypeScript compilation, no npm changes, no database migrations.
- The main risk is completeness: missing an agent or incorrectly mapping an artifact_type. Use the `_shared/kb-integration.md` File → artifact_type table as the authoritative checklist.
- Recommended implementation order: start with the 5 high-traffic agents (dev-verification-leader, qa-verify-setup-leader, elab-completion-leader, elab-autonomous-decider, evidence-judge) as AC-1 through AC-5, then batch the remaining agents in AC-6.
- For agents that both read AND write (e.g., `dev-verification-leader` appends to CHECKPOINT.yaml in fix mode), coordinate with KFMB-5010 to avoid double-counting: if KFMB-5010 already converts that agent's write calls, KFMB-5020 covers the read calls in the same agent.
- Canonical references for implementation:
  - Read pattern: `.claude/agents/dev-execute-leader.agent.md` lines 38-43 (parallel `Promise.all` with `kb_read_artifact`)
  - Precondition null-check: `.claude/agents/qa-verify-verification-leader.agent.md` lines 31-34 (primary input from KB)
  - Artifact type mapping table: `.claude/agents/_shared/kb-integration.md` lines 330-343
- The `sizing_warning: true` flag is warranted. Consider splitting AC-6 (the batch of ~14 agents) into subtasks if the story proves too large during elaboration.
