---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: KFMB-2040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No in-progress stories recorded in baseline; KB-first migration plan was created after the baseline date (2026-02-26), so no baseline coverage of KFMB stories specifically. The baseline references the KB MCP server and stories table as existing infrastructure, which is accurate and relevant.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| KB MCP server | `apps/api/knowledge-base/src/mcp-server/` | Hosts `kb_list_stories`, `kb_update_story`, `kb_get_story`, `kb_write_artifact` — the primary tools this story migrates to |
| `stories` table | `apps/api/knowledge-base/src/db/schema.ts` (line 603) | Currently missing `description`, `acceptance_criteria`, `non_goals` content columns — delivered by KFMB-1010 |
| `storyArtifacts` + detail tables | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Jump table pattern; `story_seed` artifact type is not yet registered — KFMB-1030 adds it |
| `pm-story` command | `.claude/commands/pm-story.md` (v3.4.0) | Primary orchestrator for story generation; spawns seed agent then generation leader |
| `pm-story-seed-agent` | `.claude/agents/pm-story-seed-agent.agent.md` (v1.2.0) | Currently writes STORY-SEED.md to filesystem; this story migrates output to `kb_write_artifact` |
| `pm-story-generation-leader` | `.claude/agents/pm-story-generation-leader.agent.md` (v4.3.0) | Currently reads from `stories.index.md` (index file path), writes synthesized story to filesystem; must shift story discovery to `kb_list_stories` and content persistence to `kb_update_story` |
| `kb_list_stories` tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2590) | Supports filtering by feature, epic, state, states, priority — the replacement for reading stories.index.md |
| `kb_update_story` tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2701) | Currently updates only metadata fields (epic, feature, title, priority, points); KFMB-1010 adds content columns (description, AC, non_goals) that `kb_update_story` must support post-KFMB-1020 |
| `kb_write_artifact` tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) | Writes typed artifacts to `storyArtifacts` table and type-specific detail tables; `story_seed` type not yet registered — KFMB-1030 adds it |
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated artifact pattern; STORY-SEED.md is not yet a KB artifact type |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|--------------|
| KFMB-1010 | Stories Table Content Columns Migration | Direct blocker (via KFMB-1020): adds `description`, `acceptance_criteria`, `non_goals` columns that `kb_update_story` must support |
| KFMB-1020 | kb_create_story MCP Tool and CRUD Update | Hard dependency: delivers the extended `kb_update_story` that can write content fields |
| KFMB-1030 | PM Artifact Types and Detail Tables | Hard dependency: adds `story_seed` artifact type and detail table so `kb_write_artifact` can store seed output |
| KFMB-2010 | KB-Native Bootstrap Generation Leader | Parallel Group 3; touches similar agent migration patterns — useful as a canonical reference for how to convert filesystem writes to KB tool calls |
| KFMB-2020 | KB-Native Bootstrap Setup Leader | Parallel Group 3; also converts `stories.index.md` filesystem reads to `kb_list_stories` — directly analogous |

No KFMB stories are currently in-progress per the baseline snapshot.

### Constraints to Respect

- KFMB-2040 MUST NOT start implementation until KFMB-1020 and KFMB-1030 are complete.
- The `pm-story` command and `pm-story-seed-agent` are used in production story generation sessions — any changes must maintain backward compatibility for all callers (pm-story-adhoc-leader, pm-story-followup-leader, pm-story-split-leader).
- The `stories` table does not yet have content columns (description, acceptance_criteria, non_goals) — these are added by KFMB-1010. Do not assume they exist until that migration runs.
- The `story_seed` artifact type does not yet exist in `ARTIFACT_TYPES` constant or the type-specific tables — added by KFMB-1030.
- Protected: All production DB schemas in `packages/backend/database-schema/`; KB server API surface.

---

## Retrieved Context

### Related Endpoints
None — this story touches only agent instruction files (`.claude/`) and the KB MCP tool calls within them. No HTTP API endpoints are modified.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `pm-story` command | `.claude/commands/pm-story.md` | Primary orchestrator; Step 2 spawns seed agent, Step 3 spawns generation leader. Needs updates to pass `story_id` (KB lookup key) in lieu of index file path |
| `pm-story-seed-agent` | `.claude/agents/pm-story-seed-agent.agent.md` | Worker writing STORY-SEED.md; must be updated to call `kb_write_artifact` with artifact_type=`story_seed` in addition to or instead of filesystem write |
| `pm-story-generation-leader` | `.claude/agents/pm-story-generation-leader.agent.md` | Leader that reads seed, spawns workers, synthesizes story; Phase 4.5 currently does raw SQL INSERT. Must shift to `kb_update_story` for content fields |
| `kb_list_stories` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2590) | Replacement for reading `stories.index.md`; generation leader uses this to discover which stories need generation |
| `kb_update_story` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2701) | After KFMB-1020: can write description, acceptance_criteria, non_goals to the story row |
| `kb_write_artifact` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) | After KFMB-1030: can store story_seed artifact in KB |
| `kb_read_artifact` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2408) | Generation leader reads seed by fetching the `story_seed` artifact from KB rather than from filesystem |
| KFMB-2010 generation leader (post-migration) | `.claude/agents/pm-bootstrap-generation-leader.agent.md` | Sister agent undergoing analogous migration — use as pattern reference once implemented |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| `kb_list_stories` filter pattern | Use `feature`, `state`, and `states` filters to discover stories awaiting generation — directly replaces reading `stories.index.md` table |
| `kb_write_artifact` call pattern | Established by KBAR migration stories; story_seed artifact is a new type but the call structure is identical |
| `kb_update_story` | Post-KFMB-1020 extended version writes description/ACs/non_goals; reuse the same Zod schema extension pattern |
| `kb_read_artifact` | Use to load story_seed artifact in generation leader (Phase 0 seed read) rather than reading STORY-SEED.md from disk |
| KFMB-2030 STORY-SEED.md | Strong pattern reference — same structural migration from filesystem writes to KB tool calls in a command+agent pair |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Agent that writes KB artifacts | `.claude/agents/pm-story-seed-agent.agent.md` | The primary file being updated; shows current filesystem write pattern to replace with `kb_write_artifact` |
| Command orchestrator with seed/leader phases | `.claude/commands/pm-story.md` | Primary orchestrator; shows how `index_path` and `output_dir` are currently threaded; must shift to KB-based story lookup |
| KB tool call pattern (write artifact) | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Authoritative source for `kb_write_artifact` input schema and artifact_type constants — must check for `story_seed` type availability |
| Story CRUD schema (update content fields) | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Shows current `kb_update_story` schema; KFMB-1020 will extend it — this file is the ground truth for what fields exist post-migration |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0190]** Frontmatter `kb_tools` list must be updated atomically with call-site migration (category: pattern)
  - *Applies because*: Both `pm-story-seed-agent` and `pm-story-generation-leader` have `kb_tools` frontmatter lists. When `kb_write_artifact` and `kb_read_artifact` are added as call sites, the frontmatter must be updated in the same commit. Leftover stale tools in frontmatter create maintenance confusion.

- **[KBAR-0200]** Agent+TypeScript node pairs must always be updated together (category: architecture)
  - *Applies because*: `pm-story-generation-leader`'s Phase 4.5 currently does a raw SQL INSERT for KB persistence. If this is replaced by `kb_update_story` calls in the agent, any TypeScript counterpart that also does this insert (e.g., migration scripts) must be updated in lockstep.

- **[WKFL-010]** Use Promise.allSettled() for resilient partial failures in multi-source agent loading (category: architecture)
  - *Applies because*: After migration, the generation leader may need to load story data from KB (`kb_get_story`) and artifact data (`kb_read_artifact`) in parallel. Use Promise.allSettled() to prevent a single KB lookup failure from blocking the entire pipeline.

- **[WKFL-008]** Non-code agent stories: PROOF-based QA via direct file spot-checking (category: testing)
  - *Applies because*: This story modifies `.claude/` agent and command files — no TypeScript code. QA must spot-check the agent files directly rather than relying on unit tests.

### Blockers to Avoid (from past stories)

- Do not start implementation before KFMB-1020 delivers `kb_update_story` content field support — the core write path depends on it.
- Do not start implementation before KFMB-1030 registers `story_seed` as an artifact type — `kb_write_artifact` will reject an unknown type.
- Do not remove the filesystem STORY-SEED.md write from the seed agent until `kb_read_artifact` is confirmed to be the read path in the generation leader — leaving a read/write mismatch would silently break seed loading.
- Do not update the generation leader's Phase 4.5 SQL INSERT path without also updating the `pnpm migrate:stories` fallback reference in `pm-story.md` Step 4.5.
- Do not assume `index_path` can simply be dropped from the seed agent inputs — other leader agents (adhoc, followup, split) also pass `index_path`; check all callers before removing.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration tests verifying KB tool calls must use the real KB DB (port 5433), not mocked MCP responses |
| ADR-006 | E2E Tests Required in Dev Phase | Skip condition applies: `frontend_impacted: false`; no UI-facing ACs. No Playwright tests required. |

ADR-001, ADR-002, ADR-003, ADR-004 are not relevant — this story does not touch HTTP API paths, infrastructure, images, or authentication.

### Patterns to Follow

- KB Mode tool call pattern for artifact writes: `kb_write_artifact({ story_id, artifact_type: 'story_seed', artifact_name: 'STORY-SEED', phase: 'planning', content: { ... } })`
- Frontmatter `kb_tools` list update: add new tools, remove tools with zero remaining call sites
- Pass `story_id` (not `index_path`) as the primary key for all inter-agent context after migration
- Graceful fallback pattern: if KB write fails, fall back to filesystem write and log a deferred write entry (consistent with existing `DEFERRED-KB-WRITES.yaml` pattern in Phase 4.5)
- Read seed from KB first, fall back to filesystem if artifact not found (prevents hard break during incremental rollout)

### Patterns to Avoid

- Do not perform raw SQL INSERTs/UPDATEs in agent instruction files — use MCP tools exclusively
- Do not reference `stories.index.md` file paths in KB Mode documentation after migration
- Do not collapse story discovery (currently `index_path` read) into a single `kb_get_story` call — the leader needs the list of stories awaiting generation, not just one story
- Do not add new MCP tool dependencies not delivered by KFMB-1020 and KFMB-1030

---

## Conflict Analysis

### Conflict: Hard Dependency — KFMB-1020 Not Yet Complete
- **Severity**: warning
- **Description**: KFMB-2040 requires `kb_update_story` to support writing `description`, `acceptance_criteria`, and `non_goals` content fields (delivered by KFMB-1020 on top of KFMB-1010). Until KFMB-1020 is implemented and merged, the core write path for the generation leader does not exist.
- **Resolution Hint**: Gate implementation on KFMB-1020 reaching `needs-code-review` or later. Use KFMB-1020's EVIDENCE.yaml and final story-crud-operations.ts as the authoritative input schema for the `kb_update_story` call.
- **Source**: index dependency graph

### Conflict: Hard Dependency — KFMB-1030 Not Yet Complete
- **Severity**: warning
- **Description**: KFMB-2040 requires `story_seed` to be registered as a valid artifact type in `ARTIFACT_TYPES` constant and have a corresponding detail table (delivered by KFMB-1030). Calling `kb_write_artifact` with `artifact_type: 'story_seed'` before KFMB-1030 merges will produce a runtime error.
- **Resolution Hint**: Gate implementation on KFMB-1030 reaching `needs-code-review` or later. Verify the artifact type constant includes `story_seed` before writing any agent instructions that call `kb_write_artifact` with this type.
- **Source**: index dependency graph

### Conflict: Sizing Warning — Multiple Agents, Partial Migration Risks
- **Severity**: warning
- **Description**: This story touches three distinct agent/command files (`pm-story.md`, `pm-story-seed-agent.agent.md`, `pm-story-generation-leader.agent.md`) and involves both read path changes (seed loading) and write path changes (content persistence). Partial migration — e.g., updating the seed write but not the generation leader read — will silently break the pipeline. The `sizing_warning: true` flag in story.yaml reflects this.
- **Resolution Hint**: Implement as an atomic set: seed write path and generation leader read path must be updated in the same story implementation. Consider splitting into KFMB-2040a (seed agent migration) and KFMB-2040b (generation leader migration) if the scope proves too large during elaboration.
- **Source**: story.yaml `sizing_warning: true` + risk_notes

---

## Story Seed

### Title
KB-Native Story Generation Pipeline

### Description

The `/pm-story` command orchestrates a two-phase story generation pipeline: first, the `pm-story-seed-agent` produces a STORY-SEED.md file by reading `stories.index.md` from the filesystem; then, the `pm-story-generation-leader` reads that seed file, spawns worker agents, and synthesizes a complete story, persisting the result via a raw SQL INSERT into the KB `stories` table.

This filesystem-and-SQL approach creates three coupling points that the KB-first migration must eliminate:

1. **Story discovery**: The leader discovers which story to generate by reading `stories.index.md` — a filesystem file. After migration, it calls `kb_list_stories` to find stories in the appropriate state.
2. **Seed artifact output**: The seed agent writes `STORY-SEED.md` to `{output_dir}/_pm/` on disk. After migration, it calls `kb_write_artifact` with `artifact_type: 'story_seed'`, storing the seed in the KB.
3. **Story content persistence**: The generation leader's Phase 4.5 performs a raw SQL INSERT into the `stories` table. After migration (and once KFMB-1020 delivers the content columns), it calls `kb_update_story` to write `description`, `acceptance_criteria`, and `non_goals` directly into the story row.

This story migrates all three touch points so the full story generation pipeline — from story discovery to seed output to content persistence — operates exclusively through KB MCP tools.

### Initial Acceptance Criteria

- [ ] AC-1: `pm-story-generation-leader` discovers stories awaiting generation by calling `kb_list_stories` with appropriate state/feature filters rather than reading `stories.index.md` from the filesystem.
- [ ] AC-2: `pm-story-seed-agent` writes seed output as a `story_seed` artifact via `kb_write_artifact` in addition to (or instead of) writing STORY-SEED.md to disk.
- [ ] AC-3: `pm-story-generation-leader` reads the seed artifact from KB via `kb_read_artifact({ story_id, artifact_type: 'story_seed' })` rather than reading STORY-SEED.md from the filesystem path.
- [ ] AC-4: `pm-story-generation-leader` Phase 4.5 persists story description, acceptance criteria, and non-goals via `kb_update_story` (with content columns delivered by KFMB-1020) rather than via raw SQL INSERT or the `pnpm migrate:stories` script alone.
- [ ] AC-5: The `pm-story` command (Step 2 seed phase) passes `story_id` as the primary context key to the seed agent; the seed agent no longer requires `index_path` to determine story identity.
- [ ] AC-6: The `kb_tools` frontmatter of both `pm-story-seed-agent.agent.md` and `pm-story-generation-leader.agent.md` accurately reflect all KB MCP tools called (add `kb_write_artifact`, `kb_read_artifact`, `kb_update_story`; remove any stale entries with zero call sites).
- [ ] AC-7: All caller agents (pm-story-adhoc-leader, pm-story-followup-leader, pm-story-split-leader) remain functional — no calling convention changes break sibling leaders.
- [ ] AC-8: If the KB write fails (KB unavailable), the seed agent falls back to filesystem write and logs a deferred write entry consistent with the existing `DEFERRED-KB-WRITES.yaml` pattern.

### Non-Goals

- This story does NOT modify the `pm-story-adhoc-leader`, `pm-story-followup-leader`, or `pm-story-split-leader` agents beyond ensuring they continue to pass compatible inputs to the seed agent.
- This story does NOT eliminate the filesystem STORY-SEED.md output until confirmed that all downstream agents have switched to reading from KB (`kb_read_artifact`); dual-write is acceptable as a transitional state.
- This story does NOT modify the stories table schema — column additions are delivered by KFMB-1010.
- This story does NOT add the `story_seed` artifact type to the DB — that is KFMB-1030.
- This story does NOT add `kb_create_story` to the generation pipeline — that is scoped to KFMB-2010/2020 (bootstrap pipeline).
- This story does NOT update the `/elab-story` or `/dev-implement-story` commands — those are separate KFMB stories.
- This story does NOT remove `stories.index.md` from the repository — that is KFMB-3020/3030.
- Stage directories (`backlog/`, `elaboration/`, etc.) in the repo are not touched.

### Reuse Plan

- **Components**: `kb_list_stories`, `kb_write_artifact`, `kb_read_artifact`, `kb_update_story` — all existing MCP tools, no new tool registration needed here.
- **Patterns**: KFMB-2030 STORY-SEED.md as structural pattern reference; KBAR migration agent patterns for frontmatter `kb_tools` updates; `DEFERRED-KB-WRITES.yaml` fallback pattern for KB write failures.
- **Packages**: No TypeScript packages modified — this is a docs-only story targeting `.claude/agents/` and `.claude/commands/` files.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story is docs-only (agent `.md` files and one command `.md` file). No runnable unit tests apply to the agent instruction files themselves. The test plan should focus on:
- **Integration verification**: After KFMB-1020 and KFMB-1030 are complete, run `/pm-story generate` against a test story and confirm: (a) seed artifact appears in KB via `kb_read_artifact`, (b) story description/ACs/non_goals are written to the `stories` table row via `kb_get_story`, (c) STORY-SEED.md may still appear on disk (dual-write) or may not — both are acceptable per AC-2.
- **Caller regression check**: Run `/pm-story followup` and `/pm-story split` against existing stories to verify they still function correctly (AC-7).
- **Fallback test**: Simulate KB unavailability and verify STORY-SEED.md is still written to disk and a `DEFERRED-KB-WRITES.yaml` entry is created (AC-8).
- ADR-006 skip condition applies: `frontend_impacted: false`, no E2E tests required.
- ADR-005 applies: any integration tests must use the real KB database (port 5433), not mocked MCP responses.

### For UI/UX Advisor

No UI/UX concerns — this story modifies only internal agent instruction files used by AI agents. No user-facing interface changes.

### For Dev Feasibility

- **Scope**: Three files require edits: `.claude/commands/pm-story.md`, `.claude/agents/pm-story-seed-agent.agent.md`, `.claude/agents/pm-story-generation-leader.agent.md`. All markdown, no build/type-check required.
- **Sizing risk**: The `sizing_warning: true` flag is warranted — three files with cross-cutting read/write path changes. Evaluate during elaboration whether to split into two sub-stories: (a) seed agent write path migration and (b) generation leader read path + content persistence migration.
- **Key pre-conditions**: Read the final versions of `story-crud-operations.ts` (post-KFMB-1020) and the KFMB-1030 artifact type registration before writing any agent instructions. These define the exact call signatures and type constraints.
- **Atomic constraint**: The seed write (AC-2) and generation leader seed read (AC-3) must ship together. A mismatch — seed writes to KB but leader still reads from disk, or vice versa — will silently break story generation.
- **Caller audit required**: Before removing `index_path` from the seed agent input signature (AC-5), grep all `.claude/agents/` and `.claude/commands/` files for `index_path` references to identify all callers. Confirm none of the sibling leaders (adhoc, followup, split) will break.
- **Canonical references for implementation**:
  - `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — post-KFMB-1020 for `kb_update_story` content fields
  - `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` — for `kb_write_artifact`/`kb_read_artifact` call patterns and `ARTIFACT_TYPES` constant
  - `.claude/commands/pm-story.md` — to audit all seed agent call sites and thread new context
  - KFMB-2010's final `pm-bootstrap-generation-leader.agent.md` (post-implementation) — as a sister agent that completed the same filesystem-to-KB migration pattern
