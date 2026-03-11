---
generated: "2026-02-26T00:00:00Z"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: KFMB-5050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No specific PM artifact reader migration lessons in baseline. KB-First Migration plan post-dates the baseline (generated 2026-02-26). Baseline confirms orchestrator artifact schemas and `_shared/kb-integration.md` exist and are protected.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator artifact schemas (Zod-validated) | `packages/backend/orchestrator/src/artifacts/` | Protected. Defines types for implementation artifacts. PM artifact types (`test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed`) are being added in KFMB-1030. |
| `_shared/kb-integration.md` artifact standard | `.claude/agents/_shared/kb-integration.md` | Canonical reference for `kb_read_artifact` / `kb_write_artifact` patterns; `_implementation/` declared deprecated. Does NOT yet document PM artifact types — these are being added in KFMB-1030. |
| `dev-execute-leader` (reader, already migrated) | `.claude/agents/dev-execute-leader.agent.md` | Gold standard for parallel `kb_read_artifact` reads. PM reader agents must follow this pattern. |
| `pm-story-generation-leader` (reads PM artifacts) | `.claude/agents/pm-story-generation-leader.agent.md` | Currently reads `_pm/test-plan.yaml`, `_pm/dev-feasibility.yaml`, `_pm/uiux-notes.yaml`, and `_pm/STORY-SEED.md` from disk; embeds them as `pm_artifacts` block in story.yaml. This is the primary reader agent for this story. |
| `pm-story-fix-leader` (reads pm_artifacts embedding) | `.claude/agents/pm-story-fix-leader.agent.md` | Currently reads `pm_artifacts.test_plan`, `pm_artifacts.uiux_notes`, `pm_artifacts.dev_feasibility` from story.yaml frontmatter embedding. After KFMB-5050, it must read via `kb_read_artifact`. |
| `pm_artifacts` embedding in story.yaml | `plans/future/platform/*/backlog/*/story.yaml` | The `pm_artifacts:` YAML block that embeds test plan, UIUX notes, and dev feasibility inline in story.yaml. This story removes this embedding pattern. |
| `story-synthesize-agent` (reads STORY-SEED.md) | `.claude/agents/story-synthesize-agent.agent.md` | Currently reads STORY-SEED.md from `{output_dir}/_pm/STORY-SEED.md` filesystem path. Must migrate to `kb_read_artifact` for `story_seed` type. |
| `pm-story-risk-predictor` (reads STORY-SEED.md) | `.claude/agents/pm-story-risk-predictor.agent.md` | Currently reads STORY-SEED.md from filesystem at `{story_seed_path}`. Must migrate to `kb_read_artifact`. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KFMB-5040 — Migrate _pm/ Writer Agents to kb_write_artifact | Backlog | BLOCKING DEPENDENCY: writer migration must precede reader migration so KB artifacts actually exist |
| KFMB-1030 — PM Artifact Types and Detail Tables | Ready to Work | Dependency of KFMB-5040; establishes `test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed` artifact types in DB |
| KFMB-2040 — KB-Native Story Generation Pipeline | Ready to Work | Dependency of KFMB-5040; ensures the generation pipeline writes PM artifacts to KB |
| KFMB-5020 — Migrate _implementation/ Reader Agents | Elaboration | Parallel work but different scope (_implementation/ vs _pm/). Canonical patterns from KFMB-5020 apply here. |

### Constraints to Respect

- KFMB-5050 depends on KFMB-5040 (PM writer migration) completing first. Writers must exist and write to KB before readers can switch to KB-only reads.
- `pm_artifacts` embedding in story.yaml is a **breaking change** to remove. The `pm-story-fix-leader` and `architect-story-review` agents both read from `pm_artifacts` in story.yaml. After removal, all readers must use `kb_read_artifact`.
- PM artifact types (`story_seed`, `test_plan`, `dev_feasibility`, `uiux_notes`) must be defined in KFMB-1030's new artifact detail tables before this story can complete.
- Orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/` are protected — do NOT modify.
- `@repo/db` client package API surface is protected.
- `_shared/kb-integration.md` may need updating to document the new PM artifact types and their `artifact_type` string mappings. Coordinate with KFMB-5040 on who updates this table.

---

## Retrieved Context

### Related Endpoints

None — this story is entirely agent/workflow tooling. No HTTP endpoints are involved.

### Related Components

| Agent File | Current Behavior | Reads | Post-Migration |
|-----------|------------------|-------|----------------|
| `.claude/agents/pm-story-generation-leader.agent.md` | Reads `_pm/test-plan.yaml`, `_pm/dev-feasibility.yaml`, `_pm/uiux-notes.yaml`, `_pm/STORY-SEED.md` from disk; embeds in story.yaml as `pm_artifacts` | `test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed` | Read all via `kb_read_artifact`; remove `pm_artifacts` embedding from story.yaml |
| `.claude/agents/pm-story-fix-leader.agent.md` | Reads `pm_artifacts.test_plan`, `pm_artifacts.uiux_notes`, `pm_artifacts.dev_feasibility` from story.yaml frontmatter | `test_plan`, `dev_feasibility`, `uiux_notes` | Read all via `kb_read_artifact({ story_id, artifact_type })` |
| `.claude/agents/architect-story-review.agent.md` | Reads `pm_artifacts.dev_feasibility` from story.yaml frontmatter for constraint checks | `dev_feasibility` | Read via `kb_read_artifact` |
| `.claude/agents/story-synthesize-agent.agent.md` | Reads `{output_dir}/_pm/STORY-SEED.md`, GAPS-RANKED, ATTACK, READINESS from disk | `story_seed` | Read `story_seed` artifact via `kb_read_artifact`; other files (GAPS, ATTACK, READINESS) may be separate scope |
| `.claude/agents/pm-story-risk-predictor.agent.md` | Reads STORY-SEED.md from `{story_seed_path}` filesystem path | `story_seed` | Read `story_seed` artifact via `kb_read_artifact` |
| `.claude/agents/commitment-gate-agent.agent.md` | Reads readiness from `_pm/READINESS.yaml` (fallback) and `_pm/` directory artifacts | Various `_pm/` artifacts | Read from KB where artifact types are defined; READINESS may be its own artifact type |
| `.claude/agents/gap-hygiene-agent.agent.md` | Reads from `_pm/FANOUT-PM.yaml`, `_pm/FANOUT-UX.yaml`, `_pm/FANOUT-QA.yaml`, `_pm/ATTACK.yaml` | Various | These gap/fanout artifacts may need their own artifact types; coordinate with KFMB-5040 scope |

### Reuse Candidates

- **`dev-execute-leader` parallel read pattern** — The gold-standard `Promise.all([kb_read_artifact(...), ...])` pattern. `pm-story-generation-leader` should adopt this to read `test_plan`, `dev_feasibility`, `uiux_notes`, and `story_seed` in parallel.
- **`_shared/kb-integration.md` Artifact Type Reference table** — The authoritative mapping for `artifact_type` strings. Must be extended with PM artifact types after KFMB-1030 defines them.
- **KFMB-5020 STORY-SEED.md** — The analogous story for `_implementation/` reader migration. The same patterns apply: replace file reads with `kb_read_artifact`, update frontmatter `kb_tools`, convert precondition checks to null-checks.
- **`qa-verify-verification-leader` null-check precondition pattern** — Demonstrates `kb_read_artifact` + `if (!artifact || !artifact.content) → STOP` pattern for required artifact reads.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Parallel kb_read_artifact (multiple artifact types) | `.claude/agents/dev-execute-leader.agent.md` | Reads plan, scope, context, checkpoint via `Promise.all([kb_read_artifact(...), ...])` — the canonical multi-read pattern that `pm-story-generation-leader` should adopt |
| Single artifact read with null-check precondition | `.claude/agents/qa-verify-verification-leader.agent.md` | Reads evidence artifact from KB as primary input; demonstrates null-check fallback replacing filesystem existence check |
| Artifact type reference mapping | `.claude/agents/_shared/kb-integration.md` | Contains the `File (deprecated) → artifact_type → phase → Written By` table — must be extended with PM types |
| _implementation/ reader migration (analogous) | `plans/future/platform/kb-first-migration/elaboration/KFMB-5020/_pm/STORY-SEED.md` | Identical migration pattern for the `_implementation/` reader agents — apply same approach for `_pm/` reader agents |

---

## Knowledge Context

### Lessons Learned

No KB lesson entries were retrieved (KB query not executed in seed phase; KB may be empty for this domain). Based on structural analysis of KFMB-5020 (the analogous `_implementation/` reader migration):

- **[General]** `pm_artifacts` embedding in story.yaml is a second read pathway distinct from `_pm/` file reads. Both must be removed. Agents that read `pm_artifacts.*` from story.yaml frontmatter need to be updated alongside agents that read `_pm/*.yaml` directly.
- **[General]** The `pm-story-generation-leader` currently writes the `pm_artifacts` block after reading the three `_pm/` YAML files. Removing this embedding is a two-part change: (1) stop reading `_pm/` files, (2) stop writing the `pm_artifacts` block. KFMB-5040 handles the write side; this story handles removing the embedding and updating the read side.
- **[General]** The `story-synthesize-agent` and `pm-story-risk-predictor` receive `story_seed_path` as an input parameter pointing to a filesystem path. After migration, these agents must receive `story_id` instead (or derive `story_id` from the path), and read via `kb_read_artifact`. This is an interface change, not just an internal implementation change.

### Blockers to Avoid (from past stories)

- **Do not migrate readers before KFMB-5040 (writers) completes.** If `pm-story-generation-leader` is updated to read from KB before the writer agents write PM artifacts to KB, all downstream PM generation will get null results.
- **Do not confuse `artifact_type` strings for PM artifacts.** The PM artifact types (`story_seed`, `test_plan`, `dev_feasibility`, `uiux_notes`) are being defined in KFMB-1030. Do not invent type strings — wait for KFMB-1030 to establish the canonical names, or coordinate to define them now.
- **Removing `pm_artifacts` from story.yaml is breaking.** Any agent, script, or tool that reads `pm_artifacts` from story.yaml will break. Audit ALL consumers before removing. The identified consumers are: `pm-story-fix-leader`, `architect-story-review`, and potentially `pm.agent.md` (the dispatcher).
- **`story-synthesize-agent` and `pm-story-risk-predictor` take `story_seed_path` as an input parameter.** This is a caller-side interface change, not just an internal refactor. All callers (likely `pm-story-generation-leader` and `pm-story-adhoc-leader`) must be updated to pass `story_id` instead of (or in addition to) the file path.
- **`commitment-gate-agent` and `gap-hygiene-agent` read `_pm/ATTACK.yaml`, `_pm/FANOUT-*.yaml`, `_pm/READINESS.yaml`** — these may or may not be covered by KFMB-5040's scope. Verify which `_pm/` artifacts KFMB-5040 covers and which fall into this story.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story during dev phase |

ADR-001 (API paths), ADR-002 (infrastructure), ADR-003 (CDN), ADR-004 (auth) — not directly applicable. This story only modifies `.claude/agents/` markdown files; no API, frontend, or database changes.

### Patterns to Follow

- Replace `Read({output_dir}/_pm/FOO.yaml)` with `kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "foo" })` and access `.content`
- Replace `pm_artifacts.test_plan` (story.yaml frontmatter read) with `kb_read_artifact({ story_id, artifact_type: "test_plan" })` and access `.content`
- Use `Promise.all([...])` for parallel reads when multiple PM artifact types are needed in the same phase (e.g., `pm-story-generation-leader` reading `test_plan`, `dev_feasibility`, `uiux_notes` in parallel)
- For precondition existence checks, use `const artifact = await kb_read_artifact(...)` followed by `if (!artifact || !artifact.content)` → STOP or WARN
- Add `kb_read_artifact` to agent frontmatter `kb_tools` for every migrated agent
- Remove `pm_artifacts` YAML block from story.yaml schema once all consumers are migrated
- Update `_shared/kb-integration.md` Artifact Type Reference table to include PM artifact types

### Patterns to Avoid

- Reading `_pm/test-plan.yaml`, `_pm/dev-feasibility.yaml`, `_pm/uiux-notes.yaml`, or `_pm/STORY-SEED.md` directly from disk after KFMB-5040 (writers no longer guarantee file existence)
- Reading `pm_artifacts.*` from story.yaml frontmatter after this story (the embedding is retired)
- Keeping dual-read (file/embedding fallback + KB) in reader agents — readers should be fully KB-native after this story
- Assuming `story_seed_path` parameter remains as a filesystem path — it must transition to `story_id`-based KB reads

---

## Conflict Analysis

### Conflict: Hard Dependency on KFMB-5040
- **Severity**: warning (not blocking seed generation, but blocking implementation)
- **Description**: KFMB-5050 cannot be implemented until KFMB-5040 (PM writer migration) is complete. If any PM reader agent is migrated before its corresponding writer, `kb_read_artifact` will return null and PM generation will fail silently. The story.yaml correctly lists `KFMB-5040` as a dependency.
- **Resolution Hint**: Do not begin implementation until KFMB-5040 is in `ready-for-qa` or `complete` status. Additionally, KFMB-5040 depends on KFMB-1030 and KFMB-2040, so the full dependency chain is: KFMB-1030 → KFMB-2040 → KFMB-5040 → KFMB-5050.
- **Source**: baseline + story.yaml dependency declaration

### Conflict: Breaking Change — pm_artifacts Removal
- **Severity**: warning (implementation risk, not a seed blocker)
- **Description**: The `pm_artifacts` YAML block in story.yaml is currently read by at least `pm-story-fix-leader` and `architect-story-review`. Removing this embedding before updating all consumers will break the story lifecycle. The risk is that additional consumers beyond the identified ones exist (e.g., scripts, commands, or agents not yet surveyed).
- **Resolution Hint**: Before removing `pm_artifacts`, grep for all references to `pm_artifacts` across `.claude/agents/`, `.claude/skills/`, `scripts/`, and `plans/` directories to build a complete consumer list. Migration of all consumers must be atomic (all-or-none) or gated by a compatibility shim.
- **Source**: structural analysis of agents

### Conflict: Scope Ambiguity — Gap/Fanout Artifacts
- **Severity**: warning
- **Description**: `commitment-gate-agent` and `gap-hygiene-agent` read from `_pm/ATTACK.yaml`, `_pm/FANOUT-PM.yaml`, `_pm/FANOUT-UX.yaml`, `_pm/FANOUT-QA.yaml`, and `_pm/READINESS.yaml`. It is unclear whether these artifact types are included in KFMB-5040's writer scope. If KFMB-5040 only migrates `test_plan`, `dev_feasibility`, `uiux_notes`, and `story_seed`, then the gap/fanout/readiness artifacts are out-of-scope for both KFMB-5040 and KFMB-5050.
- **Resolution Hint**: Explicitly document which `_pm/` artifact types are in scope for KFMB-5040 vs. KFMB-5050 vs. deferred. Recommend limiting KFMB-5050 scope to the four core PM pipeline artifacts (story_seed, test_plan, dev_feasibility, uiux_notes) that correspond to KFMB-5040's writer scope. Leave gap/fanout/readiness artifacts for a follow-on story if KFMB-5040 doesn't cover them.
- **Source**: structural analysis of agents

---

## Story Seed

### Title

Migrate _pm/ Reader Agents and Remove pm_artifacts Embedding

### Description

**Context**: The KB-First Migration plan is eliminating filesystem-based artifact directories in favor of KB-native storage via `kb_write_artifact` / `kb_read_artifact`. KFMB-5040 migrates PM pipeline writer agents (`pm-story-seed-agent`, `pm-draft-test-plan`, `pm-dev-feasibility-review`, `pm-uiux-recommendations`) so PM artifacts are written to the KB. This story (KFMB-5050) is the complementary reader migration: every agent that currently reads from `_pm/test-plan.yaml`, `_pm/dev-feasibility.yaml`, `_pm/uiux-notes.yaml`, or `_pm/STORY-SEED.md` from disk — or from the `pm_artifacts` embedding in story.yaml — must be updated to read from the KB via `kb_read_artifact`.

**Problem**: Currently, PM artifact consumers use two distinct read pathways:
1. **Direct `_pm/` filesystem reads**: `pm-story-generation-leader` reads `_pm/test-plan.yaml`, `_pm/dev-feasibility.yaml`, `_pm/uiux-notes.yaml`, and `_pm/STORY-SEED.md` immediately after worker agents complete.
2. **`pm_artifacts` embedding in story.yaml**: `pm-story-fix-leader` and `architect-story-review` read `pm_artifacts.test_plan`, `pm_artifacts.uiux_notes`, `pm_artifacts.dev_feasibility` from the story.yaml frontmatter — where they were embedded by `pm-story-generation-leader`.

Once KFMB-5040 lands, PM writer agents will write to KB rather than to `_pm/` files, and `pm-story-generation-leader` will no longer embed `pm_artifacts` in story.yaml. Any agent still reading from `_pm/` files or `pm_artifacts` will receive missing-file errors or stale/absent data.

Additionally, `pm-story-risk-predictor` and `story-synthesize-agent` currently receive `story_seed_path` as a filesystem path parameter — this interface must transition to a `story_id`-based KB lookup.

**Proposed Solution**: Update each PM reader agent to:
1. Replace `Read(_pm/FOO.yaml)` filesystem calls with `kb_read_artifact({ story_id, artifact_type })` KB calls
2. Replace `pm_artifacts.*` story.yaml frontmatter reads with `kb_read_artifact` calls
3. Update `story-synthesize-agent` and `pm-story-risk-predictor` to accept `story_id` as input and read `story_seed` artifact from KB
4. Update `pm-story-generation-leader` to read worker outputs from KB (not `_pm/` files) and stop writing the `pm_artifacts` embedding to story.yaml
5. Update `pm-story-fix-leader` and `architect-story-review` to read PM artifacts from KB
6. Add `kb_read_artifact` to frontmatter `kb_tools` for every migrated agent
7. Update `_shared/kb-integration.md` Artifact Type Reference table with PM artifact types

### Initial Acceptance Criteria

- [ ] AC-1: `pm-story-generation-leader` reads `story_seed`, `test_plan`, `dev_feasibility`, and `uiux_notes` artifacts via `kb_read_artifact` instead of reading `_pm/STORY-SEED.md`, `_pm/test-plan.yaml`, `_pm/dev-feasibility.yaml`, `_pm/uiux-notes.yaml` from disk.
- [ ] AC-2: `pm-story-generation-leader` no longer writes the `pm_artifacts` YAML block into story.yaml frontmatter.
- [ ] AC-3: `pm-story-fix-leader` reads `test_plan`, `uiux_notes`, and `dev_feasibility` artifacts via `kb_read_artifact` instead of reading `pm_artifacts.*` from story.yaml frontmatter.
- [ ] AC-4: `architect-story-review` reads `dev_feasibility` artifact via `kb_read_artifact` instead of `pm_artifacts.dev_feasibility` from story.yaml frontmatter.
- [ ] AC-5: `story-synthesize-agent` reads the `story_seed` artifact via `kb_read_artifact({ story_id, artifact_type: "story_seed" })` instead of reading from a filesystem `story_seed_path` parameter. The agent's input interface is updated accordingly.
- [ ] AC-6: `pm-story-risk-predictor` reads the `story_seed` artifact via `kb_read_artifact` instead of reading from a filesystem `story_seed_path` parameter. The agent's input interface is updated accordingly.
- [ ] AC-7: All callers of `story-synthesize-agent` and `pm-story-risk-predictor` (primarily `pm-story-generation-leader` and `pm-story-adhoc-leader`) are updated to pass `story_id` instead of `story_seed_path`.
- [ ] AC-8: Every migrated agent's frontmatter `kb_tools` array includes `kb_read_artifact`.
- [ ] AC-9: No migrated agent retains filesystem path references to `_pm/test-plan.yaml`, `_pm/dev-feasibility.yaml`, `_pm/uiux-notes.yaml`, or `_pm/STORY-SEED.md` in its Inputs or preconditions sections.
- [ ] AC-10: No migrated agent reads `pm_artifacts.*` from story.yaml frontmatter.
- [ ] AC-11: `_shared/kb-integration.md` Artifact Type Reference table is updated with the four PM artifact types (`story_seed`, `test_plan`, `dev_feasibility`, `uiux_notes`) and their `phase`, `written_by` entries.
- [ ] AC-12: A smoke-test walkthrough confirms that `pm-story-generation-leader`, when called with a valid `story_id` that has PM artifacts in the KB (after KFMB-5040 has run), can read all four PM artifacts from KB and produce a valid story document without referencing any `_pm/` files.

### Non-Goals

- Do NOT migrate PM writer agents (covered by KFMB-5040).
- Do NOT modify any source code in `packages/` or `apps/` — this story only modifies `.claude/agents/` markdown files and `_shared/kb-integration.md`.
- Do NOT migrate `_implementation/` artifacts (CHECKPOINT, SCOPE, PLAN, EVIDENCE, REVIEW, ANALYSIS) — that is KFMB-5020.
- Do NOT remove `_pm/` directories from existing stories already in-progress — that is KFMB-6020 (dead code removal).
- Do NOT implement KFMB-5030 (command orchestrator migration) as part of this story.
- Do NOT migrate gap/fanout/readiness artifacts (`_pm/ATTACK.yaml`, `_pm/FANOUT-*.yaml`, `_pm/READINESS.yaml`) unless KFMB-5040 explicitly covers their writer side. Defer to a follow-on story if out of KFMB-5040 scope.
- Do NOT change the behavior of PM writer agents already using `kb_write_artifact` (those are being handled by KFMB-5040).
- Do NOT change the content/schema of PM artifact types — only the transport mechanism changes (filesystem → KB).

### Reuse Plan

- **Components**: `dev-execute-leader.agent.md` parallel `Promise.all` read pattern; `qa-verify-verification-leader.agent.md` null-check precondition pattern
- **Patterns**: `kb_read_artifact({ story_id, artifact_type })` → `.content` access; `if (!artifact || !artifact.content) → STOP/WARN` for required reads; parallel reads via `Promise.all([...])`
- **Packages**: MCP KB tools (`kb_read_artifact`, `kb_list_artifacts`) — no npm packages modified
- **Reference Seed**: `KFMB-5020` STORY-SEED.md at `plans/future/platform/kb-first-migration/elaboration/KFMB-5020/_pm/STORY-SEED.md` — identical migration pattern for `_implementation/` readers

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story touches only `.claude/agents/` markdown files and `_shared/kb-integration.md` — no TypeScript code to unit test.
- Primary verification is structural: after migration, grep for remaining `_pm/test-plan\|_pm/dev-feasibility\|_pm/uiux-notes\|_pm/STORY-SEED\|pm_artifacts` in `.claude/agents/` — count should be 0 for non-writer, non-archived agents.
- Key happy-path test: confirm `pm-story-generation-leader` can read all four PM artifacts from KB and produce a valid story file. Requires KFMB-5040 to have run first (or KB test fixtures).
- Interface change test: `story-synthesize-agent` and `pm-story-risk-predictor` must correctly accept `story_id` (not `story_seed_path`) and read from KB.
- Per ADR-005 and ADR-006, this story is `story_type: infra/agents` and is exempt from E2E browser tests. Verification via agent dry-run review and KB fixture tests.
- Include a regression check: confirm `pm-story-fix-leader` and `architect-story-review` correctly read PM artifacts from KB when `pm_artifacts` embedding is absent from story.yaml.
- Test the breaking change: verify that story.yaml files generated AFTER this story no longer contain a `pm_artifacts:` key.

### For UI/UX Advisor

Not applicable — this story has no user-facing UI changes. All changes are internal workflow agent markdown files.

### For Dev Feasibility

- Implementation is text edits to `.claude/agents/*.md` files and one section of `_shared/kb-integration.md` — no TypeScript compilation, no npm changes, no database migrations.
- The main complexity is the `pm_artifacts` removal: it is a two-sided change. KFMB-5040 stops writing it; this story stops reading it and ensures no downstream agent depends on it.
- Recommended implementation order:
  1. Audit all `pm_artifacts` consumers (grep across agents, skills, scripts) — build complete list before touching anything
  2. Update `pm-story-generation-leader` (primary orchestrator — reads all 4 PM artifacts and was responsible for writing `pm_artifacts`)
  3. Update `pm-story-fix-leader` (reads `pm_artifacts` for test plan updates)
  4. Update `architect-story-review` (reads `pm_artifacts.dev_feasibility`)
  5. Update `story-synthesize-agent` and `pm-story-risk-predictor` input interface (filesystem path → story_id)
  6. Update all callers of those two agents
  7. Extend `_shared/kb-integration.md` with PM artifact types table
- The `sizing_warning: false` in story.yaml appears reasonable — the scope is 5-7 agent files and one shared doc, not the 33-agent scope of KFMB-5020.
- Critical: verify KFMB-5040 has defined and documented the exact `artifact_type` strings for PM artifacts. Do NOT proceed with implementation using assumed type strings. If KFMB-5040's story.yaml or implementation plan defines them, use those exact strings.
- Canonical references for implementation:
  - Read pattern: `.claude/agents/dev-execute-leader.agent.md` (parallel `Promise.all` with `kb_read_artifact`)
  - Precondition null-check: `.claude/agents/qa-verify-verification-leader.agent.md`
  - Artifact type mapping: `.claude/agents/_shared/kb-integration.md` lines 330–343 (extend this table)
  - Analogous story: `plans/future/platform/kb-first-migration/elaboration/KFMB-5020/_pm/STORY-SEED.md`
