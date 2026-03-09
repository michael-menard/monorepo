---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KFMB-6020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None. Baseline is active. KB was available and lessons were queried successfully.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator YAML artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas (story, knowledge-context, checkpoint, scope, plan, evidence, review, qa-verify, audit-findings). These are the artifact types that previously mapped to `_implementation/` files. After the full KFMB migration, these are read/written via KB exclusively — but their Zod schemas remain the canonical type definitions. |
| KB MCP Server | `apps/api/knowledge-base/` | PostgreSQL at port 5433. After KFMB-6010, all story state and artifact reads/writes go through MCP tools. No filesystem story artifacts remain in production flow. |
| `scripts/lib/resolve-plan.sh` | `scripts/lib/resolve-plan.sh` | After KFMB-6010: KB-exclusive `resolve_plan()` and `discover_stories()` (filesystem fallbacks removed). References to `stories.index.md` remain in usage comments — these are KFMB-6020 scope. |
| `scripts/generate-stories.sh` | `scripts/generate-stories.sh` | After KFMB-6010: fully KB-first state detection. Usage comments on lines 13 and 26 still reference `stories.index.md` (explicitly flagged by KFMB-3030 OPP-2 as KFMB-6020 cleanup). |
| `scripts/implement-stories.sh` | `scripts/implement-stories.sh` | After KFMB-6010: fully KB-first. Usage comments on lines 30 and 32 reference `stories.index.md` (same KFMB-3030 OPP-2 finding). |
| `scripts/sync-work-order.py` | `scripts/sync-work-order.py` | After KFMB-3030 and KFMB-6010: `check_untracked_stories()` and `scan_all_index_stories()` either converted to KB queries or removed. Module-level docstring still references `stories.index.md` as a source. This documentation prose requires update. |
| Workflow docs | `docs/workflow/` | Multiple workflow documents reference `_implementation/`, `_pm/`, `stories.index.md`, and stage directories as live concepts. After the full KFMB migration these docs describe the old architecture — KFMB-6020 must update them to describe KB-first architecture. |
| COMMANDS.md | `docs/COMMANDS.md` | References `plans/stories/{PREFIX}.stories.index.md`, `_pm/*.md`, `_implementation/ANALYSIS.md`, `_implementation/VERIFICATION.md` as file paths produced by workflow commands. These are all filesystem story artifacts that will no longer be written post-migration. |
| Agent files referencing `_implementation/` | `.claude/agents/` | Multiple agents were migrated by KFMB-5010/5020/5030 to use KB artifact calls. Some may retain stale prose in Output sections referencing old file paths. KFMB-5010 lesson (KB entry `fac0d1b6`) explicitly flagged this as cleanup work. |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|-------------|
| KFMB-6010 | Script Modernization | Direct predecessor. KFMB-6020 depends on KFMB-6010 completion. Scope boundary: KFMB-6010 handles functional modernization (fallback removal, kb-state.sh extraction); KFMB-6020 handles dead comment cleanup, documentation updates, migration guide authoring. No file-level overlap once KFMB-6010 is merged. |

### Constraints to Respect

- **Do not start until KFMB-6010 is at `needs-code-review` or later** — KFMB-6020 must know exactly which filesystem references survived KFMB-6010 before auditing for dead code.
- **Do not delete any live story `_implementation/` or `_pm/` directories** — these directories may still contain historical artifact data for completed stories. Deletion of historical data is out of scope; only code and documentation referencing the old patterns is being cleaned up.
- **Bash 3.2 compatibility** (inherited from KFMB-3030): any residual shell script comment cleanup must not introduce bash 4+ syntax.
- **ADR-005**: UAT verification requires real KB at port 5433 for any script smoke tests.
- **ADR-006**: Not applicable — no frontend impact.
- **Protected areas**: `packages/backend/database-schema/`, `@repo/db` client API surface, Orchestrator artifact Zod schemas (the schemas are still canonical even after filesystem removal), knowledge-base pgvector setup.
- **Scope boundary with KFMB-6010**: KFMB-6010 non-goals explicitly deferred to KFMB-6020 include: deleting `stories.index.md` files, removing `_implementation/` directory structure references in docs, and updating usage documentation referencing deprecated filesystem behavior.

---

## Retrieved Context

### Related Endpoints

None. KFMB-6020 has no HTTP API endpoints. Changes are confined to shell scripts, Python scripts, agent `.md` files, and documentation markdown files.

### Related Components

| Component | Type | Post-KFMB-6010 State | Relevance to KFMB-6020 |
|-----------|------|----------------------|------------------------|
| `scripts/generate-stories.sh` | Shell script | KB-exclusive state detection | Comments on lines 13, 26 reference `stories.index.md` — dead comment cleanup |
| `scripts/implement-stories.sh` | Shell script | KB-exclusive state functions | Comments on lines 30, 32 reference `stories.index.md` — dead comment cleanup |
| `scripts/sync-work-order.py` | Python script | `check_untracked_stories()` / `scan_all_index_stories()` resolved by KFMB-6010 | Module docstring still references `stories.index.md` as a data source — must be updated |
| `scripts/lib/resolve-plan.sh` | Shell library | KB-exclusive with filesystem fallback removed | Inline comments referencing old fallback rationale may need updating |
| `docs/COMMANDS.md` | Reference doc | Describes workflow commands including artifact file output paths | Needs update: `_implementation/`, `_pm/`, and `stories.index.md` references point to now-obsolete filesystem patterns |
| `docs/workflow/story-directory-structure.md` | Reference doc | Describes the flat directory structure with `_implementation/` and `_pm/` | Needs update to describe KB-first architecture (these files are no longer written during normal workflow) |
| `docs/workflow/phases.md` | Reference doc | Describes implementation phases including artifact production | Needs audit: any references to `_implementation/PLAN.yaml`, `EVIDENCE.yaml`, etc. being written to disk |
| `docs/workflow/orchestration.md` | Reference doc | Describes orchestration patterns | Needs audit for filesystem artifact references |
| `docs/elab-story-reference.md` | Reference doc | References elaboration artifacts | Needs audit for `_implementation/ELAB.yaml` references |
| `.claude/agents/` agents migrated by KFMB-5010/5020/5030 | Agent .md files | Output sections may retain stale `_implementation/` file path prose | KFMB-5010 lesson: Output section cleanup was not covered by AC-11 — deferred to KFMB-6020 |

### Reuse Candidates

- KFMB-6010 STORY-SEED.md `Non-Goals` section — explicitly lists what is deferred to KFMB-6020; this is the definitive scope input.
- KFMB-5010 lesson (KB entry `fac0d1b6-522d-4765-b3fb-169d35379a48`): agent Output section stale path prose is a known gap — use this as the audit checklist seed for agent files.
- KFMB-3030 OPP-2 (KB entry `d3311b90-8b29-482d-8528-67c5108d0e77`): usage comments in `generate-stories.sh` lines 13/26 and `implement-stories.sh` lines 30/32 — the specific lines are already identified.
- KFMB-3030 OPP-1 (KB entry `1ef272ff-9648-4c45-82e2-c616f466df4c`): `check_untracked_stories()` and `scan_all_index_stories()` in `sync-work-order.py` — if KFMB-6010 did not convert these, KFMB-6020 completes the removal or replacement.
- `docs/workflow/story-directory-structure.md` — a well-structured reference doc that demonstrates the update style: describe the new architecture first, then the migration rationale. The existing "Before/After" format is a reuse pattern for the migration guide.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Agent documentation prose style | `.claude/agents/pm-story-seed-agent.agent.md` | Well-structured agent with clean Output section, no stale file paths, clear section organization. Use as the reference style for Output section cleanup in migrated agents. |
| Reference doc update style | `docs/workflow/story-directory-structure.md` | Demonstrates "Before/After" architecture documentation with clear rationale. The format to replicate when updating `docs/COMMANDS.md` and other workflow docs. |
| Script comment hygiene | `scripts/lib/resolve-plan.sh` | After KFMB-6010, this file will have clean KB-exclusive comments. Use its post-migration comment style as the template for cleaning up `generate-stories.sh` and `implement-stories.sh` usage blocks. |

---

## Knowledge Context

### Lessons Learned

- **[KFMB-5010 lesson]** Agent Output sections reference `_implementation/` file paths and "written via artifact_write" descriptions. AC-11 of KFMB-5010 covered artifact write paths in call bodies but not documentation prose in Output sections. These become stale after migration. (category: workflow)
  - *Applies because*: KFMB-6020 is responsible for auditing migrated agents for these stale Output section bullet points. This is the primary agent cleanup work in this story.

- **[KFMB-3030 OPP-2]** Usage comments in `generate-stories.sh` (lines 13, 26) and `implement-stories.sh` (lines 30, 32) reference `stories.index.md`. After KFMB-6010, these comments are misleading. (category: pattern)
  - *Applies because*: These specific lines are already identified by KFMB-3030's elab analysis. KFMB-6020 should update these comments to describe the KB-based discovery flow.

- **[KFMB-3030 OPP-1]** `check_untracked_stories()` and `scan_all_index_stories()` in `sync-work-order.py` are dead code candidates explicitly flagged for KFMB-6020. (category: pattern)
  - *Applies because*: If KFMB-6010 did not fully resolve these functions, KFMB-6020 completes the removal or conversion. The `sync-work-order.py` module docstring also requires update.

- **[KFMB-2040 lesson]** The `migrate:stories` script / `kb_update_story` field ownership split needs a documentation artifact. Two write paths exist: `kb_update_story` (content fields) and the migration script (structural fields). (category: architecture)
  - *Applies because*: The migration guide produced by KFMB-6020 should include a field ownership table documenting which fields are written by which path, preventing implementer confusion in future stories.

- **[EVIDENCE.yaml label drift lesson]** QA verification for documentation-only stories should verify functional content by direct file reading, not just running exact grep commands from EVIDENCE.yaml. Label formatting in docs may differ from what the story AC specified. (category: testing)
  - *Applies because*: KFMB-6020 is primarily a documentation story. QA must read updated files directly to verify content accuracy, not rely solely on grep patterns. This is especially important for the migration guide AC.

### Blockers to Avoid (from past stories)

- Do not begin implementation until KFMB-6010 is confirmed at `needs-code-review` or later — dead code audit depends on knowing which filesystem references KFMB-6010 left in place.
- Do not delete actual story artifact directories (`_implementation/`, `_pm/`) containing historical data — only documentation references and dead code stubs are in scope.
- Do not modify Orchestrator artifact Zod schemas in `packages/backend/orchestrator/src/artifacts/` — these are canonical type definitions used by the KB MCP server and remain valid even after filesystem story output is eliminated.
- Do not update `docs/workflow/story-directory-structure.md` to remove the migration guide sections — that document is a record of the migration history and should be updated to reflect current state, not purged.
- Validate that any `stories.index.md` files being referenced in documentation are truly dead (not referenced by any live workflow) before removing their documentation.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any script smoke tests in UAT verification require live KB at port 5433. No mock KB. Documentation changes can be verified by file inspection only. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — `frontend_impacted: false`. No Playwright E2E tests required. |

### Patterns to Follow

- Audit first, then remove — grep for all instances of `_implementation/`, `_pm/`, `stories.index.md`, `stage.*dir` in scope files before making changes. Establish a complete dead code inventory before any deletions.
- Prefer clear "Before/After" or "Old/New" documentation sections when updating reference docs, so the historical context is preserved for readers who encounter stale references in other documents.
- When updating agent Output sections: remove filesystem path bullet points and replace with KB artifact equivalent (e.g., "written to `_implementation/EVIDENCE.yaml`" → "written to KB via `kb_write_artifact`").
- For comment cleanup in shell scripts: update comments to describe the KB-based discovery model, not just delete the reference.

### Patterns to Avoid

- Do not create new barrel files or index re-export files.
- Do not bulk-delete all mentions of `_implementation/` — some references are historical context or migration guide prose that should be retained with appropriate tense ("previously", "before migration").
- Do not skip the scope audit step. KFMB-6020 depends on KFMB-6010 completing — without knowing what KFMB-6010 changed, the dead code boundary cannot be accurately determined.
- Do not use `console.log` — not applicable (no TypeScript changes expected), but if any TypeScript utility scripts are touched, use `@repo/logger`.

---

## Conflict Analysis

### Conflict: dependency_not_yet_complete
- **Severity**: warning
- **Description**: KFMB-6010 is in Backlog (depends on KFMB-3030, KFMB-4020, KFMB-5030). KFMB-6020 depends on KFMB-6010. The full chain of Phase 3–5 stories must complete before KFMB-6020 can begin elaboration or implementation. This is expected and correctly captured in the dependency graph; it is not a design conflict.
- **Resolution Hint**: Treat KFMB-6020 as a Phase 5 cleanup capstone. Begin elaboration only after KFMB-6010 is merged and the final state of script files is known.

### Conflict: scope_creep_risk_from_agent_audit
- **Severity**: warning
- **Description**: Auditing all migrated agents for stale Output section prose (KFMB-5010 lesson) may reveal a larger cleanup surface than expected. The agents directory contains 80+ files and the scope of stale prose is unknown until KFMB-5010/5020/5030 are complete. If the audit reveals more than ~10 agents needing updates, the story may need sizing adjustment.
- **Resolution Hint**: During elaboration, perform the agent audit as AC-0 (a dry-run inventory step) and size the story accordingly. If the agent update scope exceeds 10 files or 30,000 tokens estimated, split the agent cleanup into a separate KFMB-6030 story.

---

## Story Seed

### Title

Dead Code Removal and Documentation Updates — KB-First Architecture Capstone

### Description

**Context**: The KB-First Migration plan (KFMB-1010 through KFMB-6010) will have, by the time this story executes, fully migrated all story lifecycle management from filesystem-based patterns to KB-exclusive operations. Story state transitions, artifact reads/writes, script state detection, and agent tool calls all route through the Knowledge Base MCP server. No new filesystem story artifacts are produced during normal workflow execution.

**Problem**: Despite the functional migration being complete, residual filesystem-era references survive in three places:

1. **Shell script comments**: `generate-stories.sh` and `implement-stories.sh` contain usage comments that reference `stories.index.md` as the discovery source (KFMB-3030 OPP-2 explicitly deferred these to KFMB-6020). Similarly, `sync-work-order.py`'s module docstring describes `stories.index.md` as a data source.

2. **Agent Output section prose**: The KFMB-5010 lesson (agent migration of `_implementation/` writers) documented that AC-11 covered artifact write call bodies but not the Output section prose, which retains bullet points like "written to `_implementation/EVIDENCE.yaml`". These stale descriptions mislead future maintainers about where artifacts are stored.

3. **Reference documentation**: `docs/COMMANDS.md`, `docs/workflow/story-directory-structure.md`, `docs/workflow/phases.md`, and related workflow docs reference filesystem artifact paths, stage directories, and `stories.index.md` as live concepts. A developer reading these docs today would learn the old architecture, not the KB-first one.

Additionally, a **migration guide** does not yet exist. Engineers joining the project (or revisiting the codebase after the migration) have no consolidated reference explaining what changed, why, and what the new architecture looks like. The migration guide is the KFMB-6020 deliverable that transforms this migration from a series of technical changes into understood institutional knowledge.

**Proposed Solution**: Audit all script files, agent files, and reference documentation for dead filesystem-era references. Remove or update each one. Author a `docs/workflow/kb-first-migration-guide.md` that documents the before/after architecture, what each KFMB phase accomplished, the current KB-first data model, and how to work with the new system.

### Initial Acceptance Criteria

- [ ] **AC-1 (Scope Audit)**: A written dead code inventory is produced (as EVIDENCE in the story artifact) listing every file with stale filesystem-era references discovered in: `scripts/generate-stories.sh`, `scripts/implement-stories.sh`, `scripts/implement-dispatcher.sh`, `scripts/sync-work-order.py`, `scripts/lib/resolve-plan.sh`, all `.claude/agents/*.agent.md` files migrated by KFMB-5010/5020/5030, and `docs/workflow/*.md`, `docs/COMMANDS.md`, `docs/elab-story-reference.md`. The inventory notes each file, line range, and type of stale reference.

- [ ] **AC-2 (Script Comment Cleanup)**: Usage comments in `generate-stories.sh` and `implement-stories.sh` that reference `stories.index.md` are updated to describe KB-based story discovery. `sync-work-order.py` module docstring is updated to remove `stories.index.md` from the listed data sources and describe the current KB + filesystem hybrid model accurately.

- [ ] **AC-3 (Agent Output Section Cleanup)**: All agents identified in the AC-1 audit as having stale `_implementation/` or `_pm/` filesystem paths in their Output sections are updated. The updated prose describes artifact writes as KB tool calls (e.g., "`kb_write_artifact` with artifact_type `evidence`") rather than filesystem paths.

- [ ] **AC-4 (COMMANDS.md Update)**: `docs/COMMANDS.md` sections referencing `_implementation/ANALYSIS.md`, `_implementation/VERIFICATION.md`, `_pm/*.md`, and `plans/stories/{PREFIX}.stories.index.md` as produced files are updated to accurately describe the KB-first output model (artifacts stored in KB, retrieved via `kb_read_artifact`).

- [ ] **AC-5 (Workflow Docs Update)**: `docs/workflow/story-directory-structure.md` is updated to reflect that `_implementation/` and `_pm/` artifact files are no longer written during normal workflow execution post-KFMB migration. Historical migration context (the "Before/After" section) is preserved. Related docs (`docs/workflow/phases.md`, `docs/workflow/orchestration.md`, `docs/elab-story-reference.md`) are audited and any stale artifact path references updated.

- [ ] **AC-6 (Migration Guide Authored)**: `docs/workflow/kb-first-migration-guide.md` is written and covers:
  - What the KB-First Migration was and why it was done (business/technical motivation)
  - Phase-by-phase summary (Phase 1: Schema & API Foundation, Phase 2: Bootstrap Migration, Phase 3: Index & Stage Elimination, Phase 4: Artifact Migration, Phase 5: Script Modernization & Cleanup)
  - Current architecture: KB as sole source of truth for story state and artifacts; filesystem retained only for worktree directories and PROOF files
  - Field ownership table: which fields are written by `kb_update_story` vs. the `migrate:stories` script
  - How to use the new system: key MCP tools (`kb_get_story`, `kb_list_stories`, `kb_write_artifact`, `kb_read_artifact`), the `resolve-plan.sh` KB-first discovery pattern, and script usage examples

- [ ] **AC-7 (No Functional Regressions)**: All shell scripts (`generate-stories.sh`, `implement-stories.sh`, `implement-dispatcher.sh`, `scripts/lib/resolve-plan.sh`) pass `bash -n` syntax check after comment updates. `sync-work-order.py` passes `python3 -m py_compile`. No functional logic is altered — only comments, docstrings, and documentation prose.

- [ ] **AC-8 (Migration Guide Discovery)**: The migration guide is linked from `docs/workflow/README.md` (or equivalent index) so it is discoverable by engineers reading the workflow documentation.

### Non-Goals

- Do not remove or delete actual `_implementation/` or `_pm/` directories from existing story directories — historical artifact data is preserved; only code and documentation references are cleaned up.
- Do not delete `stories.index.md` files that still exist for plans that predate the KB migration — these are historical records.
- Do not modify Orchestrator artifact Zod schemas in `packages/backend/orchestrator/src/artifacts/` — they remain canonical type definitions.
- Do not modify any functional logic in shell or Python scripts — only comments and docstrings.
- Do not update `packages/backend/database-schema/` or `@repo/db` client API — protected features.
- Do not add new MCP tool registrations or modify the KB MCP server.
- Do not address `sync-work-order.py` `scan_directories()` or `scan_proof_files()` function correctness — these remain valid and are explicitly not in scope.
- Do not write a new KB schema or migration guide for the database layer — the migration guide covers the agent/script/workflow layer only.

### Reuse Plan

- **Components**: `docs/workflow/story-directory-structure.md` — the "Before/After" format is the documentation pattern to replicate in `docs/COMMANDS.md` and the migration guide.
- **Patterns**: Audit-first approach (AC-1 inventory before any changes) — prevents accidental removal of valid references.
- **Packages**: No TypeScript packages modified; pure documentation and comment cleanup.
- **KB entries to reference during elaboration**:
  - `fac0d1b6-522d-4765-b3fb-169d35379a48` — KFMB-5010 agent Output section lesson (defines the primary agent cleanup scope)
  - `d3311b90-8b29-482d-8528-67c5108d0e77` — KFMB-3030 stale comments finding (specific line numbers in generate-stories.sh and implement-stories.sh)
  - `1ef272ff-9648-4c45-82e2-c616f466df4c` — KFMB-3030 sync-work-order.py dead functions finding
  - `932b9c55-a5f1-411c-86c5-5dcca3a24dec` — KFMB-2040 field ownership documentation opportunity

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is primarily a documentation and comment cleanup story — no HTTP endpoints, no TypeScript, no frontend. Testing strategy is verification-by-inspection.
- Key test scenarios:
  1. **Script syntax check**: `bash -n` on all modified shell scripts; `python3 -m py_compile` on `sync-work-order.py`. Must pass after comment updates.
  2. **Agent prose audit**: For each updated agent, verify that the Output section no longer contains filesystem paths (`_implementation/`, `_pm/`) and instead describes KB tool calls.
  3. **COMMANDS.md content check**: Verify that artifact path references in COMMANDS.md now describe the KB model. Direct file read recommended over exact grep (EVIDENCE label drift lesson applies here).
  4. **Migration guide completeness check**: All six required sections from AC-6 are present and accurate. Verify field ownership table entries match KB entry `932b9c55`.
  5. **Workflow doc smoke test**: `docs/workflow/story-directory-structure.md`, `docs/workflow/phases.md`, and `docs/workflow/orchestration.md` — verify stale artifact paths are removed or updated.
  6. **Discovery check**: Migration guide is reachable from `docs/workflow/README.md` or equivalent index.
- ADR-005: UAT requires real KB only if any script smoke tests are run. For documentation-only ACs, file inspection is sufficient.
- ADR-006: Not applicable — `frontend_impacted: false`.
- **Important**: EVIDENCE.yaml label drift lesson applies — QA must read files directly rather than relying solely on grep patterns, especially for the migration guide content verification.

### For UI/UX Advisor

Not applicable. KFMB-6020 is a documentation and dead code cleanup story with no frontend surface, no UI components, and no user-facing changes. No UX guidance needed.

### For Dev Feasibility

- **Change surface**: Shell script comments (`generate-stories.sh`, `implement-stories.sh`, `sync-work-order.py` docstring), agent Output sections (number TBD by AC-1 audit), `docs/COMMANDS.md`, `docs/workflow/*.md`, new file `docs/workflow/kb-first-migration-guide.md`.
- **No TypeScript, no pnpm build, no deployment required.**
- **Highest-risk task**: The agent Output section audit (AC-3). The number of agents requiring updates is unknown until AC-1 is complete. The agents directory has 80+ files — a targeted grep for `_implementation/` in Output sections will bound the scope. If > 10 agents need updates, consider splitting AC-3 into its own story (KFMB-6030).
- **Token estimate**: Low-to-medium, ~60,000-100,000 tokens. This is documentation work — no algorithmic complexity. The primary cost is the AC-1 inventory (grep across 80+ agent files and 256+ doc files) and the migration guide authorship.
- **Sizing risk**: Medium — the agent Output section scope is unknown. AC-1 audit should be the first subtask executed; if the scope is larger than expected, the implementing agent should surface a sizing warning before proceeding.
- **Suggested subtask decomposition**:
  - ST-1: AC-1 — Scope audit (grep inventory of all stale references across scripts, agents, docs). Produce inventory in EVIDENCE. Time-box to 20 minutes.
  - ST-2: AC-2 — Script comment and docstring cleanup (`generate-stories.sh`, `implement-stories.sh`, `sync-work-order.py`, `resolve-plan.sh`).
  - ST-3: AC-3 — Agent Output section cleanup (bounded by ST-1 inventory). Split if > 10 agents.
  - ST-4: AC-4, AC-5 — Workflow doc updates (`COMMANDS.md`, `story-directory-structure.md`, `phases.md`, `orchestration.md`, `elab-story-reference.md`).
  - ST-5: AC-6, AC-7, AC-8 — Migration guide authorship, syntax checks, discovery link.
- **Canonical references for implementation**:
  - `docs/workflow/story-directory-structure.md` — "Before/After" documentation style for migration guide
  - `.claude/agents/pm-story-seed-agent.agent.md` — clean Output section style (no stale filesystem paths)
  - KB entry `fac0d1b6` — defines the specific pattern of stale prose to find and fix in migrated agents
