---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KFMB-2020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the KFMB plan; no KFMB stories were in-progress at baseline date. No KFMB-specific context captured in the 2026-02-13 snapshot. All KFMB context sourced from codebase scan and story.yaml files.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| pm-bootstrap-setup-leader (KB Mode) | `.claude/agents/pm-bootstrap-setup-leader.agent.md` | Active, v4.0.0 | Step 4 checks `{feature_dir}/stories.index.md` exists on disk for collision detection |
| pm-bootstrap-setup-leader (File Mode) | `.claude/agents/pm-bootstrap-setup-leader.agent.md` | Active | Same collision check via directory scan; also writes AGENT-CONTEXT.md and CHECKPOINT.md |
| pm-bootstrap-workflow command | `.claude/commands/pm-bootstrap-workflow.md` | Active, v5.0.0 | Orchestrator; spawns setup-leader as Phase 0 agent; passes plan_content inline in KB mode |
| kb_list_stories MCP tool | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Active | Supports `feature` filter (prefix match), `epic`, `state`, `states`, `limit`, `offset` filters |
| kb_create_story MCP tool | Not yet implemented | Backlog (KFMB-1020) | Dependency; will expose idempotent story creation via upsert by story_id |
| stories.index.md filesystem check | `.claude/agents/pm-bootstrap-setup-leader.agent.md` line 44 | Active (target for removal) | Current collision detection mechanism; to be replaced by this story |
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` (port 5433) | Active | Separate PostgreSQL instance; stories table available with full state management |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| KFMB-1010 | In Elaboration | Low | Stories Table Content Columns Migration — foundation for KFMB-1020; no direct overlap with agent markdown |
| KFMB-1020 | Backlog | High | kb_create_story MCP Tool — HARD DEPENDENCY. KFMB-2020 cannot be implemented until kb_create_story is available and stable. |
| KFMB-2010 | Backlog | Medium | KB-Native Bootstrap Generation Leader — parallel Phase 2 story; both stories update different agents (setup vs generation leader) but are independent. Must not edit the same agent file. |
| KFMB-2030 | Backlog | Medium | Update /pm-bootstrap-workflow Command — depends on BOTH KFMB-2010 and KFMB-2020; will consume the new setup leader behavior. |

### Constraints to Respect

- KFMB-1020 must be complete before this story can be implemented. The `kb_list_stories` MCP tool is already available (KFMB-2020 uses it for collision detection), but `kb_create_story` (built in KFMB-1020) is needed by KFMB-2010 and KFMB-2030, not directly by this story. Verify whether this story strictly requires KFMB-1020 or just needs `kb_list_stories` (already available).
- The agent is a markdown file only — no TypeScript compilation, no runtime code. Testing is structural: verify the agent follows the defined signal contract and the new KB-query collision check logic is correctly specified.
- The pm-bootstrap-setup-leader.agent.md is consumed by `pm-bootstrap-workflow.md` Phase 0. The SETUP-CONTEXT YAML output format and SETUP COMPLETE / SETUP BLOCKED signals must remain unchanged.
- Protected feature: the pm-bootstrap-workflow orchestrator command must not be modified in this story (that is KFMB-2030's scope).
- `kb_list_stories` `feature` filter performs prefix-based matching. The filter behavior against the `feature` column must be validated against actual story.yaml field naming conventions.

---

## Retrieved Context

### Related Endpoints

Not applicable — this story modifies only an agent markdown file. No HTTP API or Lambda handler is involved.

### Related Components

**Agent files directly in scope:**

- `.claude/agents/pm-bootstrap-setup-leader.agent.md` — the file to be modified. Current version (4.0.0) checks `{feature_dir}/stories.index.md` filesystem existence for collision detection. This check must be replaced by a `kb_list_stories` call filtered by prefix.

**Agent files adjacent but out of scope:**

- `.claude/agents/pm-bootstrap-analysis-leader.agent.md` — Phase 1 agent; consumes SETUP-CONTEXT from Phase 0. No changes required.
- `.claude/agents/pm-bootstrap-generation-leader.agent.md` — Phase 2 agent; being modified by KFMB-2010 (parallel story). Must not be touched in this story.
- `.claude/commands/pm-bootstrap-workflow.md` — Phase 0 orchestrator; being updated by KFMB-2030. Must not be touched in this story.

**MCP tool providing collision detection:**

- `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — `kb_list_stories` implementation. Relevant filter: `feature` (string filter applied to the `feature` column on the stories table). The `feature` column stores the feature description from `story.yaml`. **Important**: the `feature` filter in `kb_list_stories` is a text filter — it does NOT filter by story ID prefix (e.g., "KFMB"). Collision detection logic in the new story must use `epic` filter or filter by story ID pattern to detect existing stories for a given plan.

### Reuse Candidates

| Item | Location | Reuse Rationale |
|------|----------|-----------------|
| `kb_list_stories` with `epic` filter | MCP tool (available now) | Use to detect whether stories already exist for the given plan/prefix |
| SETUP-CONTEXT YAML schema | `.claude/agents/pm-bootstrap-setup-leader.agent.md` | Schema unchanged; only the collision detection step changes |
| SETUP COMPLETE / SETUP BLOCKED signals | pm-bootstrap-setup-leader.agent.md | Signal contract unchanged; must emit same signals in same format |
| KB Mode Step pattern | pm-bootstrap-setup-leader.agent.md v4.0.0 | Steps 1-3 and 5-6 are unchanged; only Step 4 changes |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Agent markdown with KB Mode steps | `.claude/agents/pm-bootstrap-setup-leader.agent.md` | The target file itself — demonstrates the versioned frontmatter, Modes section, Steps, Output, and Signals format that must be preserved |
| Agent consuming kb_list_stories | `.claude/agents/scrum-master-setup-leader.agent.md` | If it uses kb_list_stories, it is an exemplar for how to embed MCP tool calls in agent step prose |
| MCP tool schema (kb_list_stories) | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` lines 59–94 | Canonical source of truth for filter parameters (feature, epic, state, limit, offset) — ensures collision check uses valid parameters |
| Bootstrap workflow orchestrator | `.claude/commands/pm-bootstrap-workflow.md` | Shows how plan_slug, feature_dir, and prefix are passed to Phase 0 — informs what data is available to the setup leader for the KB query |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1060]** DB and filesystem can diverge silently when a "MOVE SKIPPED" path exists. The same principle applies here: if `stories.index.md` has been deleted but stories exist in the DB (or vice versa), the filesystem check gives a false negative for collision. KB query is more reliable.
  - *Applies because*: The core motivation for KFMB-2020 is exactly this divergence risk. stories.index.md can be absent even when a previous bootstrap run seeded stories into the DB.

- **[APIP-4050 opp-5]** Filesystem-based ID collision detection (`fs.readdirSync` for max sequence) has a TOCTOU race condition when two runs execute concurrently. The filesystem check in the current setup leader has the same property — two simultaneous bootstrap runs on the same feature_dir could both pass the `stories.index.md` existence check.
  - *Applies because*: A DB query via `kb_list_stories` is atomic (transaction-isolated) and avoids this TOCTOU window. The upsert semantics of `kb_create_story` (KFMB-1020) further protect against duplicate inserts.

- **[WKFL pattern]** KB and Task tools are frequently unavailable in agent contexts (44% of stories in one retrospective). The setup leader runs as a sub-agent; if the MCP tool is unavailable, it must have a defined fallback strategy.
  - *Applies because*: The new Step 4 calls `kb_list_stories`. If the MCP connection is unavailable, the agent needs a defined behavior — either BLOCK with an explicit error or fall back to the filesystem check. The story must define this fallback explicitly.

### Blockers to Avoid (from past stories)

- Do not assume `feature` filter in `kb_list_stories` matches by story ID prefix. The `feature` column stores the feature description string from story.yaml (e.g., "Rewrite pm-bootstrap-setup-leader..."), not the story ID prefix like "KFMB". Use the `epic` filter or filter by story ID pattern to find collisions.
- Do not remove the `stories.index.md` check without first confirming that `kb_list_stories` is reliably accessible from within a haiku sub-agent context. The risk note in story.yaml explicitly flags this: "Must verify that kb_list_stories filter by prefix is reliable."
- Do not modify the SETUP-CONTEXT YAML output schema — it is consumed by Phase 1 (pm-bootstrap-analysis-leader) and the orchestrator without transformation. Breaking the output schema will silently corrupt Phase 1 input.
- Do not touch pm-bootstrap-generation-leader.agent.md — that is KFMB-2010's scope, running in parallel. Editing the same file creates a merge conflict.
- Do not touch pm-bootstrap-workflow.md — that is KFMB-2030's scope and depends on both KFMB-2010 and KFMB-2020 completing first.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT tests for this story must invoke the real KB MCP server; no mocking. However, since this is an agent .md file (no TypeScript), testing is structural verification rather than automated test execution. E2E: not_applicable. |
| ADR-006 | E2E Tests Required in Dev Phase | E2E is not applicable for this story — no UI-facing AC; `frontend_impacted: false`. Mark `e2e: not_applicable` in SCOPE.yaml. |

### Patterns to Follow

- Versioned frontmatter with incremented version on agent file update (current: 4.0.0 → new: 4.1.0 or 5.0.0 depending on scope of change).
- KB Mode steps use imperative prose to describe what the agent does. Step 4 replacement should mirror the specificity of the current filesystem check: exact MCP tool name, exact filter parameter, exact BLOCKED message format.
- Signal format must remain: `SETUP COMPLETE` and `SETUP BLOCKED: <reason>` — identical to current contract.
- Token Tracking section must remain at end of agent file.

### Patterns to Avoid

- Do not use TypeScript interfaces — not applicable here (agent markdown), but if any supporting TypeScript is written in a related test, use Zod schemas.
- Do not use `console.log` — not applicable (agent markdown context).
- Do not add new modes or output schemas — this is a targeted replacement of one step within the existing KB Mode, not a redesign of the agent.
- Do not hard-code the stories table query as raw SQL in the agent instructions — specify the MCP tool invocation (`kb_list_stories`) by name with its parameters, not as a psql command.

---

## Conflict Analysis

### Conflict: Dependency on KFMB-1020 may not be strictly required

- **Severity**: warning
- **Description**: The story.yaml lists KFMB-1020 (kb_create_story MCP Tool) as the dependency. However, KFMB-2020 only needs `kb_list_stories` for collision detection — which is already available in the current MCP server. The dependency on KFMB-1020 may be there to ensure Phase 1 foundational work is complete before Phase 2 begins, not because kb_create_story is used in this specific story. The dependency is accurate from a sequencing perspective (Phase 1 before Phase 2) but not strictly from a technical tool-availability perspective.
- **Resolution Hint**: Confirm with the plan owner whether KFMB-2020 may start as soon as kb_list_stories is confirmed reliable, without waiting for KFMB-1020. If yes, remove the hard dependency. If the dependency is intentional for sequencing, document the reason explicitly in the story.

### Conflict: kb_list_stories feature filter may not support story-prefix-based collision detection

- **Severity**: warning
- **Description**: The current agent spec says "Check for collision — if `{feature_dir}/stories.index.md` already exists on disk." The replacement needs to detect whether stories with the given prefix already exist in the KB. However, the `kb_list_stories` `feature` filter matches the `feature` column (a description string), not the story ID prefix. The `epic` filter matches the `epic` column. Neither directly maps to "all stories with story_id starting with KFMB". The story.yaml risk note acknowledges: "Must verify that kb_list_stories filter by prefix is reliable."
- **Resolution Hint**: During implementation, verify what the `epic` column value is for KFMB stories (likely "kb-first-migration" from the plan slug). Use `kb_list_stories({ epic: "{project_name}", limit: 1 })` to detect existing stories. Alternatively, use `feature` filter with the plan's prefix if that column is populated consistently. The implementation agent must verify the actual DB column values before finalizing the filter approach.

---

## Story Seed

### Title

KB-Native Bootstrap Setup Leader

### Description

**Context**: The `pm-bootstrap-setup-leader` agent (Phase 0 of `/pm-bootstrap-workflow`) validates the plan input and produces bootstrap context. In its current KB Mode (v4.0.0), Step 4 detects whether a previous bootstrap has already run by checking if `{feature_dir}/stories.index.md` exists on disk. This filesystem check is brittle: the index file can be absent even when stories were previously created in the KB stories table, and it is subject to a TOCTOU race condition when two bootstrap runs execute concurrently.

**Problem**: As the system migrates toward KB-first storage, the stories.index.md file will eventually be eliminated. Relying on its filesystem presence as the collision sentinel makes the bootstrap guard dependent on a file that is being phased out. Additionally, if stories are created directly in the KB without writing stories.index.md (e.g., via a future KB-native flow), the current guard silently misses the collision and allows a duplicate bootstrap run.

**Proposed Solution**: Replace Step 4 of the KB Mode collision check with a `kb_list_stories` MCP tool call. The agent queries the stories table filtered by `epic` (derived from `project_name` / plan slug) and checks whether any stories already exist. If stories are found, the agent emits `SETUP BLOCKED` with a descriptive message indicating the KB already contains stories for this plan. If the MCP tool is unavailable, the agent falls back to the filesystem check with a logged warning, maintaining backward compatibility during the transition period.

### Initial Acceptance Criteria

- [ ] AC-1: The `pm-bootstrap-setup-leader.agent.md` KB Mode Step 4 is rewritten to call `kb_list_stories({ epic: "{project_name}", limit: 1 })` instead of checking for `{feature_dir}/stories.index.md` on disk.
- [ ] AC-2: If `kb_list_stories` returns one or more stories, the agent emits `SETUP BLOCKED: "Stories already exist in KB for plan '{project_name}' — bootstrap already run"` and halts.
- [ ] AC-3: If `kb_list_stories` returns zero stories, the agent proceeds to Step 5 (extract raw plan summary) as before.
- [ ] AC-4: If the `kb_list_stories` MCP tool is unavailable (connection error or tool not registered), the agent falls back to the filesystem check (`{feature_dir}/stories.index.md` exists) and logs a warning: `"KB collision check unavailable — falling back to filesystem check"`.
- [ ] AC-5: The SETUP-CONTEXT YAML output schema (schema: 2, mode, plan_slug, feature_dir, prefix, project_name, created, raw_plan_summary) is unchanged. No fields are added, removed, or renamed.
- [ ] AC-6: The `SETUP COMPLETE` and `SETUP BLOCKED: <reason>` signal strings are unchanged in format. Downstream Phase 1 parsing continues to work without modification.
- [ ] AC-7: The agent frontmatter version field is incremented to reflect the change (e.g., 4.0.0 → 4.1.0).
- [ ] AC-8: File Mode steps are NOT modified — the filesystem collision check remains in File Mode (legacy mode is out of scope for this story).
- [ ] AC-9: The `pm-bootstrap-workflow.md` orchestrator command file is NOT modified in this story.
- [ ] AC-10: The `pm-bootstrap-generation-leader.agent.md` file is NOT modified in this story.

### Non-Goals

- Do not update File Mode behavior — File Mode collision detection via filesystem remains unchanged.
- Do not modify `pm-bootstrap-workflow.md` — that is KFMB-2030's scope.
- Do not modify `pm-bootstrap-generation-leader.agent.md` — that is KFMB-2010's scope.
- Do not add new output fields to SETUP-CONTEXT — schema stability is a hard constraint.
- Do not implement a full KB-native bootstrap pipeline end-to-end — that is KFMB-2030's scope after both KFMB-2010 and KFMB-2020 complete.
- Do not remove stories.index.md creation from the generation leader — that is KFMB-3020/3030 scope (Phase 3: Index Elimination).
- Do not update kb_list_stories or story-crud-operations.ts — this story only changes how the agent invokes the existing tool.

### Reuse Plan

- **Components**: `kb_list_stories` MCP tool (existing, no changes needed); SETUP-CONTEXT YAML schema (unchanged); SETUP COMPLETE / SETUP BLOCKED signal format (unchanged)
- **Patterns**: Agent markdown with versioned frontmatter; KB Mode step prose format from current pm-bootstrap-setup-leader.agent.md v4.0.0; MCP tool invocation specification pattern from other KB-aware agents
- **Packages**: No TypeScript packages touched in this story — agent markdown file only

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is an agent markdown file — no automated test suite applies. Testing is structural verification:
  1. File exists at the correct path.
  2. Frontmatter version is incremented.
  3. KB Mode Step 4 prose specifies `kb_list_stories` with the correct parameters.
  4. BLOCKED message format matches the existing error handling table pattern.
  5. SETUP-CONTEXT YAML schema in the Output section is byte-for-byte identical to the current schema (no added/removed fields).
  6. File Mode steps are unchanged.
- For live integration testing (UAT): run `/pm-bootstrap-workflow` against a plan slug that already has stories in the KB — verify the agent blocks. Then run against a fresh plan slug — verify it proceeds. Requires real KB MCP connection per ADR-005.
- Coverage threshold check (45%) is waived — documentation-only story (per KB lesson: "Infrastructure stories that add only agent markdown files do not produce meaningful coverage numbers").
- Mark `e2e: not_applicable` in SCOPE.yaml (no UI-facing ACs; ADR-006 skip condition applies).
- Key edge case: the MCP fallback path (AC-4). The test plan should include a verification scenario where the KB tool is unavailable (simulate by disconnecting MCP server) and confirm the agent falls back gracefully.

### For UI/UX Advisor

- No UI surface in this story. The bootstrap workflow is invoked via `/pm-bootstrap-workflow` CLI command — the change is invisible to users if the collision guard fires correctly.
- The BLOCKED message (AC-2) should be human-readable and actionable: include the plan name and suggest the user inspect the KB before re-running. Current filesystem BLOCKED message pattern: `"stories.index.md already exists in {feature_dir} — bootstrap already run"`. The new message should follow the same pattern: `"Stories already exist in KB for plan '{project_name}' — bootstrap already run (N stories found)"`. Including the count (N) aids debugging.
- No accessibility, animation, or component concerns.

### For Dev Feasibility

- **Scope**: Single agent markdown file modification (`.claude/agents/pm-bootstrap-setup-leader.agent.md`). This is the lowest-complexity story in Phase 2 — no TypeScript, no DB migrations, no new MCP tools.
- **Critical pre-implementation step**: Before modifying the agent, verify what value is stored in the `epic` column for stories belonging to a KFMB-prefixed plan. Run `kb_list_stories({ epic: "kb-first-migration", limit: 5 })` against the dev KB to confirm the filter works. If `epic` stores the plan slug exactly, the filter is straightforward. If the column stores a different value, adjust the filter parameter accordingly.
- **Fallback design**: The fallback path (AC-4) is important for transition safety. The agent is a haiku-class model running as a sub-agent — if the MCP connection fails, the agent must not BLOCK silently. Define the fallback explicitly: attempt kb_list_stories, catch any error (tool not found, connection refused), log the warning text, then check filesystem as before.
- **Version increment**: Change frontmatter `version: 4.0.0` → `version: 4.1.0` (minor bump; backwards-compatible change within KB Mode). Update `updated: 2026-02-22` → `updated: {implementation date}`.
- **Estimated effort**: 0.5–1 day. The change is confined to one markdown file, one step replacement, and one new error row in the Error Handling table. The largest time investment is verifying the correct `kb_list_stories` filter parameters against the real DB.
- **Canonical references for implementation**:
  - `.claude/agents/pm-bootstrap-setup-leader.agent.md` — the file being modified; current Step 4 is the replacement target
  - `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` lines 59–94 — `KbListStoriesInputSchema` defines valid filter parameters
  - `.claude/agents/pm-bootstrap-generation-leader.agent.md` — shows how another Phase 2 agent (KFMB-2010 target) specifies DB interactions in agent prose; use as a format reference
