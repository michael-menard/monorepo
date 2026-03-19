---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: PIPE-1010

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No baseline file exists at any path under `plans/baselines/`. Codebase scanning used as substitute for reality grounding.

### Relevant Existing Features

| Feature                                  | Status                | Notes                                                                                                                                                                                                        |
| ---------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KB MCP `kb_create_story` tool            | Deployed              | Upserts stories by `story_id` with partial-merge semantics. The primary write mechanism for this story.                                                                                                      |
| `StoryStateSchema` (13 canonical states) | Deployed (PIPE-0010)  | Ghost states removed. Valid states: `backlog, created, elab, ready, in_progress, needs_code_review, ready_for_qa, in_qa, completed, failed_code_review, failed_qa, blocked, cancelled`.                      |
| Ghost state data migration               | Completed (PIPE-0020) | Existing ghost state rows (`uat`, `ready_to_work`, `in_review`) already migrated in DB. New imports from worktree must apply equivalent mapping during import — the DB no longer accepts ghost state values. |
| APIP story corpus in worktree            | Exists (unimported)   | 40+ APIP stories exist under `tree/story-cdbn-2011/plans/future/platform/autonomous-pipeline/`. Zero are in the KB.                                                                                          |
| `autonomous-pipeline` plan               | Worktree-only         | Plan metadata and epic elaboration exist in the worktree. No KB plan record confirmed on main.                                                                                                               |

### Active In-Progress Work

| Story     | Title                                          | Potential Overlap                                                                                              |
| --------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| PIPE-1020 | Link APIP stories to autonomous-pipeline plan  | Blocked by PIPE-1010. Runs immediately after this story completes. Must not execute before PIPE-1010 finishes. |
| PIPE-1030 | Import + elaborate ORCH-2010 through ORCH-4020 | Unrelated feature scope; no file-level overlap.                                                                |
| PIPE-1040 | Validate APIP-1031/1032 code is on main branch | Reads APIP story data; benefits from PIPE-1010 importing those records first.                                  |

### Constraints to Respect

1. **StoryStateSchema is canonical and enforced** — `kb_create_story` validates state against the 13-state Zod enum. Ghost state values (`uat`, `ready-to-work`, `ready_for_review`, `in_review`, `deferred`) will be rejected at tool call time. All worktree states must be mapped before import.
2. **Upsert semantics are partial-merge** — `kb_create_story` will not overwrite fields that already exist for a given `story_id`. If any APIP story is somehow pre-seeded, the import is safe to re-run.
3. **No filesystem writes** — KB is the source of truth. This story must not create story.yaml files or story directories on main.
4. **Idempotency is required** — the import script must be re-runnable without creating duplicates or corrupting existing records.

---

## Retrieved Context

### Related Endpoints

- `kb_create_story` MCP tool — upserts a single story by `story_id`. The correct mechanism for this import. Accepts: `story_id`, `title`, `feature`, `epic`, `description`, `state`, `priority`, `story_type`, `touches_*` flags, `packages`, `non_goals`, `acceptance_criteria`, `plan_slug`.
- `kb_list_stories` MCP tool — can be used post-import to verify all APIP stories exist in KB. Filter by `feature: "apip"`.
- `kb_bulk_import` MCP tool — for knowledge **entries** (notes, lessons, ADRs), NOT for stories. Do NOT use this for story upsert.

### Related Components

- `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — implements `handleKbCreateStory`. Upsert-by-story_id logic lives here.
- `apps/api/knowledge-base/src/__types__/index.ts` lines 780–799 — `StoryStateSchema` definition. Source of truth for valid state values.

### Reuse Candidates

- `kb_create_story` MCP tool — exact mechanism. No custom script needed. Import = loop over story inventory and call `kb_create_story` once per story with mapped state.
- Ghost state mapping table from PIPE-0020 — the same mapping logic applies: `uat` → `completed`, `ready-to-work` → `ready`, `in-qa` → `in_qa`, `ready-for-code-review` → `needs_code_review`, `in-progress` → `in_progress`, `needs-code-review` → `needs_code_review`, `ready-for-qa` → `ready_for_qa`.

---

## Canonical References

This story is a data migration / import task — no new application code is produced. The implementation is an agent-driven loop calling MCP tools. However, two files are directly relevant:

| Pattern               | File                                                                   | Why                                                                                                    |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Story upsert via MCP  | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Source of `handleKbCreateStory`; shows upsert-by-story_id semantics and what fields can be set         |
| State enum validation | `apps/api/knowledge-base/src/__types__/index.ts` (lines 780–799)       | Definitive list of 13 valid states; implementer must validate mapping table against this before import |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0220]** `uat` is a `WorkPhaseSchema` value (filesystem directory label), not a `StoryStateSchema` terminal state. The terminal DB state after QA PASS is `completed`, not `uat`. (category: architecture)
  - _Applies because_: APIP stories in the `UAT/` directory have worktree status `in-qa` or `uat`. The import must map filesystem stage `UAT` → DB state `completed` (or `in_qa` depending on actual story.yaml status), never insert `uat` as a state value.

- **[PIPE-0020]** Ghost states `uat`, `ready_to_work`, `in_review` were already migrated in the DB for existing rows. New rows inserted via PIPE-1010 must not reintroduce ghost state values.
  - _Applies because_: APIP story.yaml files may still contain `status: uat`, `status: ready-to-work`, `status: in-qa`, `status: ready-for-code-review`, etc. These must be mapped before each `kb_create_story` call.

- **[PIPE-0010]** `StoryStateSchema` now enforces the 13-state canonical model at the Zod layer. Any call to `kb_create_story` with a ghost state value will fail with a Zod validation error.
  - _Applies because_: Implementation must apply the state mapping table before calling `kb_create_story`, or tool calls will fail.

### Blockers to Avoid (from past stories)

- Calling `kb_create_story` with unmapped state values like `uat`, `ready-to-work`, `ready-for-code-review`, `in-review` — will fail with Zod validation error.
- Confusing `kb_bulk_import` (for knowledge entries/notes) with `kb_create_story` (for stories) — wrong tool, wrong table.
- Treating the `UAT/` filesystem directory name as a DB state — `UAT` is a WorkPhaseSchema directory name, not a StoryStateSchema value.
- Partial imports without idempotency verification — re-running must be safe and produce the same result.

### Architecture Decisions (ADRs)

No ADR-LOG.md found on main branch (`plans/stories/ADR-LOG.md` does not exist). ADR context sourced from KB lessons and inline story context.

| Constraint Source            | Constraint                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| StoryStateSchema (PIPE-0010) | Only 13 canonical states are valid; all worktree status strings must be mapped         |
| PIPE-0020 migration          | DB rows with ghost states already corrected; new inserts must be clean                 |
| MEMORY.md                    | KB is the sole source of truth for stories; no filesystem story dirs should be created |

### Patterns to Follow

- **One `kb_create_story` call per story** — loop through the complete APIP story inventory and call once per story with all available metadata.
- **State mapping table applied before each call** — never pass raw worktree status strings.
- **Post-import verification** — call `kb_list_stories({ feature: "apip", limit: 100 })` to confirm all stories are present and states are correct.
- **Include `epic: "autonomous-pipeline"`** — all APIP stories belong to this epic; set it on import for downstream queryability.

### Patterns to Avoid

- Creating new files in the `plans/` directory or any `plans/stories/APIP/` directory structure — the worktree filesystem layout is obsolete.
- Using `kb_bulk_import` for story records — that tool inserts into the `knowledge` table, not the `stories` table.
- Skipping the state mapping step — even one ghost-state value will cause a hard failure.
- Importing duplicate entries for stories that appear in both `stories/` and `UAT/` directories in the worktree — deduplicate by story ID, use the stage directory to determine the most-progressed state.

---

## Conflict Analysis

### Conflict: State string incompatibility

- **Severity**: warning (non-blocking with correct implementation)
- **Description**: APIP story.yaml files use worktree-era status strings: `in-qa`, `ready-to-work`, `ready-for-code-review`, `needs-code-review`, `in-progress`, `uat`, `ready-for-qa`. These are all invalid StoryStateSchema values. The DB will reject them if passed directly. A state mapping table must be applied before every `kb_create_story` call.
- **Resolution Hint**: Build a complete mapping table before the import loop. Verify each mapped value is in the StoryStateSchema enum. Apply mapping using the highest-stage position as the authoritative state for each story.
- **Source**: lesson (KBAR-0220, PIPE-0010)

### Conflict: Stories appear in multiple directories (stage + stories/)

- **Severity**: warning (non-blocking with correct deduplication)
- **Description**: Most APIP stories have entries in BOTH `stories/APIP-NNNN/` AND `UAT/APIP-NNNN/` (or other stage directories). Additionally, some stories in `stories/` do not have `story.yaml` files (e.g., APIP-0020, APIP-1031, APIP-1032, APIP-5001) — their metadata is in `.md` files or `_implementation/` directories. The authoritative source for current state is the stage directory (UAT, in-progress, etc.), not the `stories/` archive.
- **Resolution Hint**: For state determination, use stage directory position. For metadata (title, description, dependencies), use whichever file (`story.yaml` or `.md` frontmatter) is most complete. Stories in `UAT/` → state `completed`. Stories in `in-progress/` → state `in_progress`. Stories in `needs-code-review/` → state `needs_code_review`. Stories in `ready-for-qa/` → state `ready_for_qa`. Stories in `ready-to-work/` → state `ready`. Stories in `backlog/` → state `backlog`. Stories only in `stories/` with no active stage copy → infer from story.yaml `status` field using the mapping table.
- **Source**: baseline (worktree inventory)

---

## Story Seed

### Title

Bulk Import APIP Stories from Worktree to KB

### Description

**Context**: 40+ APIP stories from the `autonomous-pipeline` epic exist exclusively in the `tree/story-cdbn-2011` git worktree under `plans/future/platform/autonomous-pipeline/`. Zero of these stories exist in the KB. PIPE-0010 and PIPE-0020 have established a clean 13-state canonical schema in the DB — the KB is now ready to receive the APIP corpus.

**Problem**: PIPE-1020 (link APIP stories to the autonomous-pipeline plan) and PIPE-1040 (validate APIP-1031/1032 code on main) both depend on APIP stories being present in the KB. The broader pipeline-orchestrator-activation plan cannot proceed until the full APIP story inventory is importable and queryable via `kb_list_stories`.

**Proposed Solution**: Execute a bulk upsert via the `kb_create_story` MCP tool — one call per story — using a complete state mapping table to convert worktree-era status strings to canonical StoryStateSchema values. The import determines authoritative state from stage directory position (UAT > needs-code-review > ready-for-qa > in-progress > ready-to-work > backlog) rather than the `status` field in story.yaml. The operation must be idempotent: re-running produces the same result.

### Complete APIP Story Inventory for Import

The following 43 distinct stories were identified in the worktree. Authoritative stage is derived from the highest-priority stage directory in which the story appears:

| Story ID  | Title                                                                                   | Worktree Stage                          | Mapped KB State     |
| --------- | --------------------------------------------------------------------------------------- | --------------------------------------- | ------------------- |
| APIP-0010 | BullMQ Work Queue Setup                                                                 | UAT                                     | `completed`         |
| APIP-0020 | Supervisor Graph (Minimal Loop)                                                         | stories/ (no stage copy, proof exists)  | `completed`         |
| APIP-0030 | LangGraph Platform Docker Deployment                                                    | UAT                                     | `completed`         |
| APIP-0040 | Model Router v1 with Rate Limiting and Token Budgets                                    | needs-code-review                       | `needs_code_review` |
| APIP-1020 | ChangeSpec Schema Design Spike                                                          | UAT                                     | `completed`         |
| APIP-1031 | Implementation Graph Skeleton with Worktree and Evidence Infrastructure                 | stories/ (status: uat in .md)           | `completed`         |
| APIP-1032 | Change Loop with Model Dispatch, Micro-Verify, and Atomic Commits                       | stories/ (status: uat in .md)           | `completed`         |
| APIP-1040 | Documentation Graph (Post-Merge)                                                        | UAT                                     | `completed`         |
| APIP-1050 | Review Graph with Parallel Fan-Out Workers                                              | needs-code-review                       | `needs_code_review` |
| APIP-1060 | QA Graph with Autonomous Verdict                                                        | in-progress                             | `in_progress`       |
| APIP-1070 | Merge Graph with Learnings Extraction                                                   | UAT                                     | `completed`         |
| APIP-2010 | Blocked Queue and Notification System                                                   | stories/ (no active stage)              | `backlog`           |
| APIP-2020 | Monitor UI v1 (Read-Only Dashboard)                                                     | UAT                                     | `completed`         |
| APIP-2030 | Graceful Shutdown, Health Check, and Deployment Hardening                               | UAT                                     | `completed`         |
| APIP-3010 | Change Telemetry Table and Instrumentation                                              | ready-for-qa                            | `ready_for_qa`      |
| APIP-3020 | Model Affinity Profiles Table and Pattern Miner Cron                                    | UAT                                     | `completed`         |
| APIP-3030 | Learning-Aware Diff Planner                                                             | UAT                                     | `completed`         |
| APIP-3040 | Learning-Aware Model Router                                                             | UAT                                     | `completed`         |
| APIP-3050 | Story Structurer Feedback (Affinity-Guided)                                             | UAT                                     | `completed`         |
| APIP-3060 | Bake-Off Engine for Model Experiments                                                   | UAT                                     | `completed`         |
| APIP-3070 | Cold Start Bootstrapping and Exploration Budget                                         | UAT                                     | `completed`         |
| APIP-3080 | Parallel Story Concurrency (2-3 Worktrees)                                              | UAT                                     | `completed`         |
| APIP-3090 | Cron Job Infrastructure                                                                 | UAT                                     | `completed`         |
| APIP-4010 | Codebase Health Gate — Snapshot, Drift Detection, and CLEANUP Story Auto-Generation     | UAT                                     | `completed`         |
| APIP-4020 | Cohesion Scanner — Weekly Pattern Consistency Scan and Auto-Remediation Story Generator | UAT                                     | `completed`         |
| APIP-4030 | Dependency Auditor                                                                      | UAT                                     | `completed`         |
| APIP-4040 | Test Quality Monitor                                                                    | UAT                                     | `completed`         |
| APIP-4050 | Dead Code Reaper                                                                        | UAT                                     | `completed`         |
| APIP-4060 | KB Freshness Check and Stale Entry Archival                                             | UAT                                     | `completed`         |
| APIP-4070 | Weekly Pipeline Health Report                                                           | UAT                                     | `completed`         |
| APIP-5000 | Test Infrastructure Setup for Autonomous Pipeline Unit Testing (Phase 0)                | UAT                                     | `completed`         |
| APIP-5001 | Test Database Setup and Migration Testing                                               | stories/ (no active stage, impl exists) | `completed`         |
| APIP-5002 | E2E Test Plan and Playwright Framework Setup                                            | UAT                                     | `completed`         |
| APIP-5003 | LangGraph Platform Security Hardening and Network Boundary Documentation                | UAT                                     | `completed`         |
| APIP-5004 | Secrets Engine and API Key Management                                                   | UAT                                     | `completed`         |
| APIP-5005 | Minimal Operator Visibility CLI                                                         | UAT                                     | `completed`         |
| APIP-5006 | LangGraph Server Infrastructure Baseline                                                | UAT                                     | `completed`         |
| APIP-5007 | Database Schema Versioning and Migration Strategy                                       | in-progress                             | `in_progress`       |
| APIP-6001 | Pipeline Phase Gate Validation                                                          | UAT                                     | `completed`         |
| APIP-6002 | Stuck Story Recovery Loop                                                               | UAT                                     | `completed`         |
| APIP-6003 | KB-Filesystem State Reconciliation                                                      | ready-to-work                           | `ready`             |

Note: APIP-0020 has a PROOF artifact and implementation in `stories/` with no separate stage copy; given proof evidence, treat as `completed`. APIP-5001 has `_implementation/` with EVIDENCE and REVIEW artifacts; treat as `completed`.

**Stories NOT found in worktree inventory** (referenced in index but no directory): APIP-1010 (Structurer Node), APIP-1030 (Implementation Graph — split into 1031/1032). These should NOT be imported; they were superseded by their split successors.

### State Mapping Table

| Worktree status string          | Canonical KB state  |
| ------------------------------- | ------------------- |
| `uat`                           | `completed`         |
| `in-qa`                         | `in_qa`             |
| `ready-to-work`                 | `ready`             |
| `in-progress`                   | `in_progress`       |
| `needs-code-review`             | `needs_code_review` |
| `ready-for-code-review`         | `needs_code_review` |
| `ready-for-qa`                  | `ready_for_qa`      |
| `backlog`                       | `backlog`           |
| `created`                       | `created`           |
| Stage dir: `UAT/`               | `completed`         |
| Stage dir: `in-progress/`       | `in_progress`       |
| Stage dir: `needs-code-review/` | `needs_code_review` |
| Stage dir: `ready-for-qa/`      | `ready_for_qa`      |
| Stage dir: `ready-to-work/`     | `ready`             |
| Stage dir: `backlog/`           | `backlog`           |

### Initial Acceptance Criteria

- [ ] AC-1: All 41 APIP stories (APIP-0010 through APIP-6003, excluding APIP-1010 and APIP-1030 which were superseded) are present in KB after import, verified by `kb_list_stories({ feature: "apip", limit: 100 })` returning >= 41 results.
- [ ] AC-2: All imported stories have a valid `StoryStateSchema` state. No story has a ghost state value (`uat`, `ready_to_work`, `in_review`, `ready_for_review`, `deferred`).
- [ ] AC-3: Stories in the `UAT/` stage directory are imported with state `completed`.
- [ ] AC-4: Stories in `in-progress/` are imported with state `in_progress`.
- [ ] AC-5: Stories in `needs-code-review/` (APIP-0040, APIP-1050) are imported with state `needs_code_review`.
- [ ] AC-6: Stories in `ready-for-qa/` (APIP-3010) are imported with state `ready_for_qa`.
- [ ] AC-7: APIP-6003 (ready-to-work stage) is imported with state `ready`.
- [ ] AC-8: APIP-1031 and APIP-1032 (status `uat` in .md frontmatter, UAT proof artifacts present) are imported with state `completed`.
- [ ] AC-9: The import is idempotent — running it twice produces identical KB state with no errors and no duplicate records.
- [ ] AC-10: Each story is imported with `feature: "apip"` and `epic: "autonomous-pipeline"` set.
- [ ] AC-11: Story titles match exactly the titles found in `story.yaml` or `.md` frontmatter in the worktree — no truncation or normalization errors.
- [ ] AC-12: Stories with no `story.yaml` (APIP-0020, APIP-1031, APIP-1032, APIP-5001, APIP-1060 etc.) are still imported using metadata from `.md` frontmatter or contextually inferred values.

### Non-Goals

- Do NOT import APIP-1010 (Structurer Node) — this story was superseded when APIP-1020 was created.
- Do NOT import APIP-1030 (Implementation Graph with Atomic Change Loop) — split into APIP-1031 and APIP-1032; the parent is obsolete.
- Do NOT create any filesystem directories or files for APIP stories on the main branch.
- Do NOT use `kb_bulk_import` — that tool inserts knowledge entries, not stories.
- Do NOT import plan documents, elaboration artifacts, or `_pm/` content from the worktree — story records only.
- Do NOT link stories to the `autonomous-pipeline` plan — that is PIPE-1020's scope.
- Do NOT set `blocked_by_story` relationships or dependency chains — those are PIPE-1020's scope.

### Reuse Plan

- **Components**: `kb_create_story` MCP tool (one call per story in the inventory table above)
- **Patterns**: State mapping table (derived from PIPE-0020 ghost state migration mapping)
- **Packages**: `apps/api/knowledge-base/src/__types__/index.ts` (StoryStateSchema reference for mapping validation)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test is AC-9 (idempotency): run the import twice and verify no errors, no duplicate records, identical `kb_list_stories` output on both runs.
- AC-1 verification: `kb_list_stories({ feature: "apip", limit: 100 })` and assert `total >= 41`.
- AC-2 verification: inspect the returned `state` field for each story; assert it is a member of the 13-state canonical set.
- No unit tests are needed for this story — the import is an operational procedure using existing MCP tooling.
- Key edge case: Stories appearing in both `stories/` and `UAT/` directories — verify that the stage-directory-wins rule was applied (state should be `completed`, not derived from the potentially-stale `stories/` copy).

### For UI/UX Advisor

This story has no UI/UX surface. It is a backend data migration. No recommendations applicable.

### For Dev Feasibility

- **Implementation approach**: This story can be executed entirely by an agent calling `kb_create_story` in a loop — no code changes to the codebase are required.
- **Implementation sequence**:
  1. Read the state mapping table (above).
  2. For each story in the inventory table (above), call `kb_create_story` with the mapped state and available metadata.
  3. After all calls complete, call `kb_list_stories({ feature: "apip", limit: 100 })` and assert total >= 41.
  4. Spot-check 5 stories (one per state) to verify state values are correct.
  5. Re-run the full import loop to confirm idempotency (no errors).
- **Metadata sourcing priority**: Stage directory position (authoritative for state) > `story.yaml` > `.md` frontmatter > inferred defaults.
- **Stories with no story.yaml**: APIP-0020 (read PROOF-APIP-0020.md for summary), APIP-1031 (read APIP-1031.md frontmatter), APIP-1032 (read APIP-1032.md frontmatter), APIP-1050 (read STORY-SEED.md or `_pm/`), APIP-1060 (has CHECKPOINT.yaml), APIP-2010 (has STORY-SEED.md), APIP-5001 (has EVIDENCE.yaml).
- **Canonical references**:
  - `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — see `handleKbCreateStory` for upsert behavior.
  - `apps/api/knowledge-base/src/__types__/index.ts` lines 780–799 — validate mapping table against this before starting import.
- **Estimated effort**: Low. ~41 `kb_create_story` calls, each straightforward. The state mapping table (above) is pre-computed. Main risk is edge-case handling for the 7 stories without `story.yaml`.
