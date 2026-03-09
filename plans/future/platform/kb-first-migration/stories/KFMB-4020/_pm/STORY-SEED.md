---
generated: "2026-02-26T00:00:00Z"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: KFMB-4020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No active in-progress stories recorded at baseline time; no parallel work conflicts. All KFMB stories are in backlog.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| `/precondition-check` command | `.claude/commands/precondition-check.md` | v1.0.0 — directory-scan-first for story location; reads frontmatter for status check; `--in-stage` validates filesystem position |
| `/context-init` command | `.claude/commands/context-init.md` | v1.0.0 — searches stage directories for story; writes `AGENT-CONTEXT.md` with filesystem-derived paths |
| `/story-move` command | `.claude/commands/story-move.md` | v2.1.0 — already has DB-first lookup (`shimGetStoryStatus`) with directory fallback; dual-path pattern established by KFMB-4010 scope |
| `/story-update` command | `.claude/commands/story-update.md` | v3.0.0 — also has DB write via `shimUpdateStoryStatus`; filesystem still primary for locate |
| `storyGetStatus` MCP tool | `packages/backend/mcp-tools/src/story-management/story-get-status.ts` | Queries `stories` table by UUID or human-readable ID; returns `state` column |
| `storyUpdateStatus` MCP tool | `packages/backend/mcp-tools/src/story-management/story-update-status.ts` | Updates `stories.state`; resilient — returns null on failure |
| `SWIM_LANE_TO_STATE` constant | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | Canonical mapping: swim-lane dir → DB state enum |
| `discover_stories()` in resolve-plan.sh | `scripts/lib/resolve-plan.sh` | v1 — filesystem-first (`stories.index.md` grep), KB-fallback (`kb_list_stories`); already partially KB-aware |
| `find_story_dir()` in implement-stories.sh | `scripts/implement-stories.sh` | Searches stage directories by filesystem scan; no DB lookup |
| State detection in generate-stories.sh | `scripts/generate-stories.sh` | `ALREADY_GENERATED` and `ALREADY_ELABORATED` flags derived from filesystem (`story.yaml` grep, `_implementation/` dir check) |
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Separate PostgreSQL at port 5433; `stories` table with `state` column |
| Setup leader agents | `.claude/agents/*-setup-leader.agent.md` | All call `/precondition-check` and `/context-init` at Phase 0 |

### Active In-Progress Work

None recorded in baseline. All KFMB stories remain in backlog at seeding time.

### Constraints to Respect

- All production DB schemas in `packages/backend/database-schema/` are protected — do not modify
- Knowledge base schemas and pgvector setup are protected
- Orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/` are protected
- `@repo/db` client package API surface is protected
- KFMB-4020 depends on KFMB-4010, which must first convert `/story-move` and `/story-update` to KB-only state transitions. KFMB-4020 cannot be elaborated until KFMB-4010 is complete.
- The `shimGetStoryStatus` / `shimUpdateStoryStatus` pattern established in KFMB-4010 must be respected for consistency in `/precondition-check` and `/context-init`.

---

## Retrieved Context

### Related Endpoints

This story involves no HTTP API endpoints. All interactions use MCP tool calls to the KB MCP server (`postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase`) and shell/CLI invocations.

### Related Components

| Component | File | Relevance |
|-----------|------|-----------|
| `/precondition-check` command | `.claude/commands/precondition-check.md` | Primary target — Step 1 (Find Story) and Step 2 (Check Stage) rely on directory scanning; must become KB-first |
| `/context-init` command | `.claude/commands/context-init.md` | Primary target — Step 1 (Locate Story) scans stage directories; paths object hardcodes filesystem layout |
| `resolve-plan.sh` (discover_stories) | `scripts/lib/resolve-plan.sh` | Story discovery has KB-fallback already, but `find_story_dir` is FS-only; state detection in generate-stories.sh/implement-stories.sh is FS-only |
| `generate-stories.sh` | `scripts/generate-stories.sh` | `ALREADY_GENERATED` / `ALREADY_ELABORATED` state detection is filesystem-based; must migrate to KB query |
| `implement-stories.sh` | `scripts/implement-stories.sh` | `find_story_dir`, `is_elaborated`, `is_implemented`, `is_reviewed`, `is_completed` all scan directories; must migrate to KB |
| `story-get-status.ts` | `packages/backend/mcp-tools/src/story-management/story-get-status.ts` | Existing MCP tool providing `storyId → state` lookup; the primary read primitive for KB-first lookup |
| `story-compatibility __types__` | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | `SWIM_LANE_TO_STATE` and `SWIM_LANE_DIRS` constants; reverse mapping (state → swim-lane) needed for `--in-stage` check |
| `uat-precondition-check.agent.md` | `.claude/agents/uat-precondition-check.agent.md` | Separate UAT check (MSW, API health, Cognito); NOT in scope — this is a different precondition check from `/precondition-check` |

### Reuse Candidates

- `shimGetStoryStatus` pattern from KFMB-4010: DB-first lookup returning `{state, storyDir}` or null on miss/error — directly reusable in `/precondition-check` Step 1
- `SWIM_LANE_TO_STATE` constant: already defined in `story-compatibility/__types__/index.ts`; build a reverse map (`STATE_TO_SWIM_LANE`) for `--in-stage` validation against DB state
- `claude -p` + `kb_get_story` or `storyGetStatus` pattern from `resolve-plan.sh`: already proven pattern for KB queries in shell scripts; adapt for `is_elaborated`, `is_implemented`, etc.
- `discover_stories()` KB path in `resolve-plan.sh`: already uses `kb_list_stories`; model the new story-state query calls on this pattern

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| DB-first story lookup with directory fallback | `.claude/commands/story-move.md` | Established by KFMB-4010; exact template for how `/precondition-check` and `/context-init` should do KB-first lookup — shim returns `{state, storyDir}` or null |
| KB query in shell script via `claude -p` | `scripts/lib/resolve-plan.sh` | Demonstrates `kb_get_plan` / `kb_list_stories` call pattern in bash; adapt for `storyGetStatus` queries in `generate-stories.sh` / `implement-stories.sh` |
| `storyGetStatus` implementation | `packages/backend/mcp-tools/src/story-management/story-get-status.ts` | The underlying DB query primitive; shows state enum values and resilient null-return on error |
| Swim-lane ↔ state mapping constants | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | `SWIM_LANE_TO_STATE` is the authoritative mapping; derive the reverse map here or inline it |

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded (KB unavailable at seed time). Lessons inferred from codebase inspection:

- **Directory-scan fragility**: Multiple scripts independently implement `find_story_dir` by iterating stage subdirectories. This creates N places to update when stages change. A single KB query eliminates this.
- **Dual-path complexity in v1 shim**: `story-move.md` v2.1.0 already shows the DB-first + directory-fallback pattern works but adds a mandatory `shimGetStoryStatus` call on every `/story-move`. `/precondition-check` must adopt the same guard.
- **`--in-stage` must map DB state, not directory**: Once `/precondition-check` uses KB-first lookup, validating `--in-stage=ready-to-work` means checking `state == 'ready_to_work'` in DB, not checking filesystem presence.
- **Shell scripts cannot call MCP tools directly**: Shell scripts like `generate-stories.sh` must use `claude -p` with `--allowedTools` to call KB tools, matching the pattern already used in `resolve-plan.sh`.

### Blockers to Avoid (from past stories)

- Do NOT merge KFMB-4020 changes before KFMB-4010 is complete — `/precondition-check` and `/context-init` depend on `shimGetStoryStatus` returning reliable state, which requires the DB writes from `/story-move` and `/story-update` (KFMB-4010) to be in place first.
- Do NOT remove directory fallback in a single step — KFMB-4020 moves to KB-first with fallback; full directory elimination comes in a later story.
- Do NOT make KB unavailability a hard failure in shell scripts — shell scripts must degrade gracefully (log warning, fall back to FS scan) to avoid CI/CD breakage during migration.
- Avoid calling `storyGetStatus` for every story in a batch script loop — this creates N sequential DB round-trips. Group by state using `storyGetByStatus` where possible, or accept the per-story overhead with explicit comment.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any verification tests added for these command changes must not mock the KB. Shell script state detection tests that verify KB queries should use a live KB instance (port 5433). |
| ADR-006 | E2E Tests Required in Dev Phase | This story has no frontend surface. E2E testing is not applicable (`frontend_impacted: false`). |

### Patterns to Follow

- KB-first with directory fallback (same guard structure as `story-move.md` v2.1.0 Step 1 + Step 2.5)
- Resilient KB calls: treat null return (DB miss or DB error) identically — fall back to directory scan, log warning, never hard-fail on KB unavailability
- Emit `db_state_used: true | false` in command result YAML so callers can audit whether KB or filesystem was the source of truth
- Shell scripts: use `claude -p` + `--allowedTools mcp__knowledge-base__kb_get_story` (or `storyGetStatus` equivalent) for state queries
- Zod-first types for any new TypeScript additions — no `interface` declarations

### Patterns to Avoid

- Hard-failing on KB unavailability (KB availability is a hard dependency only in the future fully-migrated state, not during Phase 3 migration)
- Duplicating `SWIM_LANE_TO_STATE` inline — always import from `story-compatibility/__types__/index.ts`
- Updating `stories.index.md` counts from shell scripts after the migration — state is authoritative in DB

---

## Conflict Analysis

### Conflict: Dependency on KFMB-4010
- **Severity**: blocking
- **Description**: KFMB-4020 requires that `/story-move` and `/story-update` already write to the `stories.state` column in the DB (KFMB-4010). Without those writes, `shimGetStoryStatus` will return null for most stories and `/precondition-check` will always fall back to filesystem, making the KB migration pointless for this story.
- **Resolution Hint**: Do not begin elaboration of KFMB-4020 until KFMB-4010 has reached `ready-for-qa` or later. KFMB-4020 is correctly listed in Parallelization Group 6 (alongside KFMB-5020 and KFMB-5050), meaning it starts only after Group 5 (which includes KFMB-4010) is complete.

---

## Story Seed

### Title

Stage Directory Elimination — precondition-check, context-init, and Script State Detection

### Description

**Context**: The story lifecycle pipeline relies on filesystem stage directories (backlog/, elaboration/, ready-to-work/, etc.) as the authoritative source of story state. Commands like `/precondition-check` and `/context-init`, as well as shell scripts `generate-stories.sh` and `implement-stories.sh`, all scan these directories to determine story state before proceeding. KFMB-4010 will have already converted `/story-move` and `/story-update` to write state changes to the `stories.state` DB column first.

**Problem**: After KFMB-4010 completes, state transitions write to DB but state reads in `/precondition-check`, `/context-init`, and the automation scripts still use filesystem scanning. This creates a split-brain risk: the DB may say a story is `in_progress` while the precondition check looks in the wrong directory. The two remaining consumer groups — workflow commands and shell scripts — must be updated to query state from the DB.

**Proposed Solution**: Update `/precondition-check` and `/context-init` to adopt the same KB-first + directory-fallback pattern established by KFMB-4010 in `/story-move`. Update the state detection functions in `generate-stories.sh` and `implement-stories.sh` to call the KB (`storyGetStatus` via `claude -p`) with a graceful fallback to the existing directory scan when KB is unavailable.

### Initial Acceptance Criteria

- [ ] AC-1: `/precondition-check` Step 1 (Find Story) queries `storyGetStatus` (or equivalent KB call) DB-first; falls back to directory scan only when KB returns null; result YAML includes `db_state_used: true | false`
- [ ] AC-2: `/precondition-check` `--in-stage=X` check validates story state against the DB state enum (via `STATE_TO_SWIM_LANE` reverse map) when KB lookup succeeded; falls back to directory check when `db_state_used: false`
- [ ] AC-3: `/precondition-check` `--status=X` check reads status from DB state when `db_state_used: true`; continues to read frontmatter when `db_state_used: false`
- [ ] AC-4: `/context-init` Step 1 (Locate Story) uses KB-first + directory-fallback for story location; `AGENT-CONTEXT.md` `paths.base` is derived correctly whether story was found via DB or filesystem
- [ ] AC-5: `/context-init` result YAML includes `db_state_used: true | false`
- [ ] AC-6: `generate-stories.sh` `ALREADY_GENERATED` and `ALREADY_ELABORATED` state flags query KB (`storyGetStatus` via `claude -p`) when available; fall back to filesystem checks if KB returns no result; log a warning on fallback
- [ ] AC-7: `implement-stories.sh` `find_story_dir`, `is_elaborated`, `is_implemented`, `is_reviewed`, and `is_completed` functions use KB-first state query where the `state` column provides sufficient signal; fall back to FS scan on KB miss/error
- [ ] AC-8: KB unavailability (null return from `storyGetStatus`) never causes a hard failure in any of the modified commands or scripts — the fallback path always executes and a warning is logged
- [ ] AC-9: All modified command `.md` files are updated with a version bump and a version history entry documenting the KB-first behavioral change
- [ ] AC-10: All modified scripts log `[KB-FIRST] state from DB: {state}` or `[KB-FIRST FALLBACK] using filesystem` per story for auditability

### Non-Goals

- Removing the directory fallback path entirely — that is Phase 5 (KFMB-6010/KFMB-6020) after all writes are confirmed stable
- Migrating `uat-precondition-check.agent.md` — that agent checks MSW/API/Cognito health, not story state, and is out of scope
- Updating `stories.index.md` Progress Summary counts from scripts — index update is in scope for KFMB-3030
- Modifying any production DB schemas in `packages/backend/database-schema/` — state column already exists via KFMB-1010
- Changing the KB MCP server infrastructure or pgvector setup
- Adding new DB columns — this story reads the existing `stories.state` column only
- Migrating `_implementation/` or `_pm/` artifact reads — that is Phase 4 (KFMB-5010 through KFMB-5050)

### Reuse Plan

- **Components**: `shimGetStoryStatus` shim from KFMB-4010 (`story-move.md` DB-first lookup block); `SWIM_LANE_TO_STATE` from `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts`
- **Patterns**: `claude -p` + `--allowedTools mcp__knowledge-base__kb_get_story` KB query pattern from `scripts/lib/resolve-plan.sh`; resilient null-return KB handling from `story-get-status.ts`
- **Packages**: `mcp__knowledge-base__kb_get_story` MCP tool (or `storyGetStatus` equivalent) for single-story state lookup

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- No frontend surface; E2E tests are not applicable (ADR-006 skip condition: `frontend_impacted: false`)
- Per ADR-005: any integration verification of the modified commands must use a live KB instance (port 5433) — do not mock the DB calls in verification tests
- Key test scenarios: (1) KB available — state read from DB, directory NOT scanned; (2) KB unavailable (null return) — falls back to FS, warning logged; (3) `--in-stage` validation with DB state enum reverse-map; (4) shell script batch run with mixed KB hit/miss per story
- Shell script tests can be validated with `--dry-run` mode in `generate-stories.sh` and `implement-stories.sh`

### For UI/UX Advisor

- No UI surface. All changes are in agent command `.md` files and shell scripts. This section is not applicable.

### For Dev Feasibility

- **Implementation order matters**: all changes in this story depend on KFMB-4010 having already written DB state. Verify `stories.state` is populated for at least one test story before elaborating subtasks.
- **Two distinct work areas**: (1) agent command `.md` files (`/precondition-check`, `/context-init`) — documentation-only changes that spec the new behavior; (2) shell scripts (`generate-stories.sh`, `implement-stories.sh`, `lib/resolve-plan.sh`) — actual bash code changes
- **`STATE_TO_SWIM_LANE` reverse map**: KFMB-4010 uses `SWIM_LANE_TO_STATE` (dir → state). This story needs the reverse (state → dir). Either derive it at runtime or add `STATE_TO_SWIM_LANE` as a new export in `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts`.
- **Shell script KB calls must be resilient**: `claude -p` invocations can fail if KB is not running. Wrap in `|| true` and check for empty output before using the result.
- **Canonical references for subtask decomposition**:
  - Precondition-check and context-init command rewrite: see `.claude/commands/story-move.md` Step 1 + Step 2.5 as the exact template
  - Shell script KB integration: see `scripts/lib/resolve-plan.sh` `discover_stories()` KB branch as the established pattern
  - DB state enum and swim-lane mapping: see `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts`
