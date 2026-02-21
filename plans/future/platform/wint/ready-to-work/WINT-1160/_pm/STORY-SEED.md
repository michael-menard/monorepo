---
generated: "2026-02-18"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-1160

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file provided (baseline_path: null). Codebase scanning performed directly. Both dependency stories (WINT-1130, WINT-1140) are UAT PASS — this provides strong grounding for current state. No blocking gaps.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WINT-1130: Track Worktree-to-Story Mapping in Database | UAT (QA PASS) | Provides `worktree_register`, `worktree_get_by_story`, `worktree_list_active`, `worktree_mark_complete` MCP tools. The full worktree tracking infrastructure is complete. |
| WINT-1140: Integrate Worktree Creation into dev-implement-story | UAT (QA PASS) | Added Step 1.3 (Worktree Pre-flight) to the orchestrator. Conflict detection (AC-4) for a different-session active worktree is specified in WINT-1140 — WINT-1160 must NOT duplicate this UI but should harden the full flow. **Note**: WINT-1140 changes are in a worktree branch not yet merged to main as of 2026-02-18. The current `main` branch has the pre-WINT-1140 Step 1.3 (git-directory-check only). Implementation must account for WINT-1140 being a prerequisite landing. |
| WINT-1150: Integrate Worktree Cleanup into Story Completion | UAT (QA PASS) | Handles `worktree_mark_complete` ownership — WINT-1160 must not re-implement cleanup. |
| wt-status skill (current main) | Active | `.claude/skills/wt-status/SKILL.md` — v1.0 shows git-level worktree info only (current worktree location, all worktrees + states, uncommitted changes, branches ahead/behind origin). No DB awareness. Enhancement target for WINT-1160. |
| dev-implement-story command (current main) | Active v8.1.0 | Current `main` has Step 1.3 as "Verify Worktree Context" — directory-based check only (no DB query). The WINT-1140 DB conflict detection version is in an unmerged worktree. WINT-1160 depends on WINT-1140 changes landing first. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-9010 | UAT | Shared TypeScript types package — potential reuse of `WorktreeRecord` types from mcp-tools; no conflict |
| WINT-1120 | pending | Foundation Phase validation — depends on WINT-1160 being done first; coordinate gate criteria |
| WINT-0170 | ready-to-work | Doc-sync gate — no overlap with worktree conflict scope |

### Constraints to Respect

1. `worktree_mark_complete` ownership is **WINT-1150** — WINT-1160 must not re-implement cleanup logic. The "take over" path (option b in WINT-1140 AC-4) calls `worktree_mark_complete` to abandon the old worktree. This call must be delegated, not reinvented.
2. The 3-option conflict warning prompt (switch / take over / abort) is **already specified in WINT-1140 AC-4**. WINT-1160 must not duplicate the UI specification — it should implement or harden what was described there, scoping clearly to what was deferred.
3. The partial unique index `unique_active_worktree` (one active worktree per story) is enforced at the DB layer. Conflict detection is reliable at the DB level.
4. `wt-switch` is interactive-only (no path parameter per WINT-1140 AC-10 verification). Any "switch to existing" flow must present a guided step, not a silent auto-switch.
5. `wt-new` supports automated mode: `/wt:new story/WINT-XXXX main` — fully non-interactive. Safe to call programmatically.
6. WINT-1140 AC-9 handles autonomy-level auto-selection (conservative = prompt, moderate/aggressive = auto-select option a). WINT-1160 should align with and not contradict this behavior.

---

## Retrieved Context

### Related Endpoints

No HTTP endpoints involved. This story operates entirely in the MCP tool + command orchestration layer.

### Related Components

| Component | Location | Role |
|-----------|----------|------|
| `worktreeGetByStory` | `packages/backend/mcp-tools/src/worktree-management/worktree-get-by-story.ts` | Core conflict detection primitive — checks for active worktree before story start |
| `worktreeListActive` | `packages/backend/mcp-tools/src/worktree-management/worktree-list-active.ts` | Powers `/wt:status` DB enhancement (shows all active worktrees + their stories) |
| `worktreeMarkComplete` | `packages/backend/mcp-tools/src/worktree-management/worktree-mark-complete.ts` | Take-over path (mark old worktree abandoned) — must be used, not re-implemented |
| `dev-implement-story.md` | `.claude/commands/dev-implement-story.md` | Already has Step 1.3 with conflict detection skeleton. This story clarifies/hardens the autonomy handling |
| `wt-status/SKILL.md` | `.claude/skills/wt-status/SKILL.md` | To be enhanced with DB-awareness section |
| `WorktreeRecordSchema` | `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts` | Zod type for worktree record — fully defined, reuse directly |

### Reuse Candidates

- **MCP Tools** (WINT-1130): All 4 worktree MCP tools are complete and tested. No new tools needed.
- **Step 1.3 in dev-implement-story** (WINT-1140): The conflict prompt scaffolding already exists. WINT-1160 may need to clarify or extend the take-over path to be more explicit.
- **`worktreeListActive` pagination pattern**: Already has limit/offset — use directly for `/wt:status` DB view.
- **Autonomy tiers pattern** (`.claude/agents/_shared/autonomy-tiers.md`): Already referenced in dev-implement-story. Apply same decision matrix to the take-over path.
- **`WorktreeRecordSchema` Zod types**: Fully typed from WINT-1130. No new schema definitions needed for MCP calls.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Command orchestrator step insertion + conflict detection scaffold | `/Users/michaelmenard/Development/monorepo/.claude/commands/dev-implement-story.md` | Current Step 1.3 shows insertion pattern; WINT-1140 worktree adds full conflict detection decision tree. Read both pre- and post-WINT-1140 versions. |
| Skill file structure (file to enhance) | `/Users/michaelmenard/Development/monorepo/.claude/skills/wt-status/SKILL.md` | Current wt-status skill (v1.0, git-only). Understand its "What It Does" and "Information Displayed" format before adding the DB State section |
| WINT-1140 conflict detection spec (source of truth for 3-option prompt) | `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/UAT/WINT-1140/WINT-1140.md` | ACs 3, 4, 5, 8, 9, 10, 11 define the full pre-flight decision tree, warning format, and autonomy behavior — do not re-specify, reference these |
| WINT-1130 worktrees table + MCP tool contracts | `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/UAT/WINT-1130/WINT-1130.md` | Complete schema definition and tool contracts for `worktree_get_by_story`, `worktree_list_active`, `worktree_mark_complete` |

---

## Knowledge Context

### Lessons Learned

No KB query available in this session (kb_search MCP not available). Key lessons derived from WINT-1130 and WINT-1140 elaboration notes:

- **[WINT-1140]** wt-switch is interactive-only with no path parameter (Applies because: take-over "switch to existing" path must use guided/assisted step, not silent auto-switch)
- **[WINT-1140]** wt-new supports fully automated mode: `/wt:new branch base` (Applies because: new worktree creation in take-over scenario can be called non-interactively)
- **[WINT-1130]** Partial unique index enforces one-active-worktree-per-story at DB level (Applies because: conflict is detectable by simply querying `worktree_get_by_story` — no extra conflict check needed)
- **[WINT-1130 QA Note]** Conflict detection UI was explicitly deferred to WINT-1160 (Applies because: confirms WINT-1160 is the right owner for the UI warning flow, not a duplicate)
- **[WINT-1140]** "Take over" must mark the old worktree abandoned via `worktree_mark_complete` — not delete or ignore (Applies because: risk note in WINT-1160 index entry: "Take over option must be explicit to avoid accidental work loss")

### Blockers to Avoid (from past stories)

- Do not assume wt-switch accepts a path argument — it is interactive-only. Describe "switch to existing" as guided navigation.
- Do not implement cleanup logic (merging, wt-finish) — that is WINT-1150's domain.
- Do not duplicate the 3-option conflict prompt specification from WINT-1140 AC-4. Reference it; optionally clarify or extend it.
- Do not add new MCP tools — WINT-1130 provided all 4 needed tools.
- Do not add new DB tables or migrations — schema is complete.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real MCP tools (no mocking of `worktree_get_by_story` or `worktree_list_active`) |
| ADR-006 | E2E Tests Required in Dev Phase | No UI-facing ACs → E2E tests not applicable (mark `e2e: not_applicable` in SCOPE.yaml) |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) do not apply to this story.

### Patterns to Follow

- **Null-check resilience**: Every MCP tool call returns null on failure — handle with warning + fallback, never throw.
- **Zod-first schemas**: If any new Zod types are defined (e.g., for command output structures), use `z.infer<>` not interfaces.
- **Explicit over implicit**: The "take over" action must require a clear user confirmation or explicit autonomy level — never silent.
- **Step insertion in orchestrator**: Follow the existing numbered step pattern in dev-implement-story (Step 1, Step 1.3, Step 1.5, Step 2...).
- **Structured skill output format**: wt-new outputs `WORKTREE CREATED` block — parse this structured output in the orchestrator.

### Patterns to Avoid

- Implementing new MCP tools when WINT-1130 tools already cover all needed operations.
- Adding interactive prompts to wt-new or wt-switch (they are not modified by this story).
- Treating a null return from `worktree_get_by_story` as an error (it is not — it means no conflict exists).
- Creating new DB tables or migrations.
- Duplicating WINT-1150's `worktree_mark_complete` ownership (cleanup is WINT-1150, abandon-for-takeover is WINT-1160).

---

## Conflict Analysis

No blocking conflicts detected. Both dependency stories (WINT-1130, WINT-1140) are in UAT with QA PASS verdicts.

### Conflict: Overlap with WINT-1140 AC-4

- **Severity**: warning (non-blocking)
- **Description**: WINT-1140 AC-4 already specifies the 3-option conflict prompt for when dev-implement-story detects a different-session worktree. WINT-1160's scope must be carefully bounded — it likely adds `/wt:status` DB enhancement and may harden the take-over path, but must not re-specify the same prompt. Story scope needs precise definition relative to WINT-1140.
- **Resolution Hint**: Frame WINT-1160 ACs as: (1) the `/wt:status` DB enhancement (new scope, not in WINT-1140), and (2) any hardening of the take-over path behavior (e.g., explicit confirmation requirement) that WINT-1140 left underspecified. Cross-reference WINT-1140 AC-4 explicitly.
- **Source**: codebase scan

### Conflict: WINT-1140 Not Yet Merged to main

- **Severity**: warning (non-blocking)
- **Description**: As of 2026-02-18, the `dev-implement-story.md` on `main` still contains the pre-WINT-1140 Step 1.3 (git directory check only, no DB queries). The WINT-1140 conflict detection implementation is in a worktree branch (UAT PASS but not merged). WINT-1160 implementation cannot begin until WINT-1140 changes land on main.
- **Resolution Hint**: WINT-1140's merge to main is a prerequisite for WINT-1160 implementation. The elaboration can proceed now. Mark as setup-phase prerequisite in WINT-1160 dev setup.
- **Source**: codebase scan (git log for `.claude/commands/dev-implement-story.md`)

---

## Story Seed

### Title

Add Parallel Work Conflict Prevention

### Description

**Context**: WINT-1130 and WINT-1140 are both in UAT with QA PASS verdicts. WINT-1130 delivered the database infrastructure (`wint.worktrees` table + 4 MCP tools). WINT-1140 inserted a worktree pre-flight step (Step 1.3) into `dev-implement-story` that calls `worktree_get_by_story` and presents a 3-option warning when a different-session active worktree is found. However, two gaps remain:

1. The `/wt:status` skill shows only git-level worktree information — it has no visibility into which stories have active database-tracked worktrees or which are in conflict states. An agent running `/wt:status` cannot determine if a story is being worked on in another session.

2. The "take over" path (option b in WINT-1140 AC-4) — which marks the old worktree as abandoned and creates a new one — requires an explicit, hardened confirmation mechanism to prevent accidental work loss. The `--autonomous` flag behavior for this destructive action needs clear specification beyond what WINT-1140 scoped.

**Problem**: Without this story, two sessions can still collide on the same story if the conflict warning is bypassed or if agents using `/wt:status` cannot see DB-tracked worktrees. The take-over path is described in WINT-1140 but its "must be explicit" safety constraint (per index risk note) needs formalized AC language.

**Solution Direction**:
1. Enhance the `/wt:status` skill to query `worktree_list_active` MCP tool and display a DB-aware worktree view alongside the git view — showing story ID, branch, registered timestamp, and whether the path still exists on disk.
2. Harden the "take over" path in `dev-implement-story` Step 1.3 to require explicit confirmation regardless of autonomy level (or at minimum, never auto-select option b in autonomous mode).
3. Document the complete conflict prevention system as an integrated feature.

### Initial Acceptance Criteria

- [ ] **AC-1**: `/wt:status` enhanced to query `worktree_list_active` MCP tool and display a "Database-Tracked Worktrees" section alongside the existing git worktree view, showing: story ID (human-readable), branch name, worktree path, registered timestamp, and path-exists-on-disk indicator
- [ ] **AC-2**: The DB-backed section in `/wt:status` is clearly labeled and gracefully degrades (shows a warning message) when the `worktree_list_active` MCP tool is unavailable or returns an error — the existing git view still renders
- [ ] **AC-3**: `/wt:status` identifies mismatches where a DB-tracked worktree has no corresponding git worktree on disk (orphaned DB record) and flags them with a `[ORPHANED]` indicator
- [ ] **AC-4**: `/wt:status` identifies mismatches where a git worktree exists on disk but has no corresponding active DB record and flags them with a `[UNTRACKED]` indicator
- [ ] **AC-5**: The "take over" option (option b) in `dev-implement-story` Step 1.3 requires explicit confirmation regardless of `--autonomous` level — it is never auto-selected by `moderate` or `aggressive` autonomy modes. Conservative always prompts. Moderate/aggressive auto-select only option (a) (switch), never option (b) (take over)
- [ ] **AC-6**: When option (b) take-over is selected, `worktree_mark_complete` is called with `status: 'abandoned'` on the old worktree record BEFORE the new worktree is created — failure of this call aborts the take-over with an error message
- [ ] **AC-7**: The complete conflict detection and resolution flow is documented in a single reference section within `dev-implement-story` Step 1.3 comments, cross-referencing WINT-1130 (MCP tools), WINT-1140 (original AC-4 spec), and WINT-1160 (hardened take-over)
- [ ] **AC-8**: The `/wt:status` skill file is updated to version 2.0.0 with the DB-aware section, and the skill frontmatter `description` is updated to reflect the new capabilities
- [ ] **AC-9**: Integration tests verify the `/wt:status` DB section output when `worktree_list_active` returns records (happy path), when it returns empty (no active worktrees), and when it returns an error (graceful degradation)

### Non-Goals

- **No new MCP tools**: WINT-1130 provided all 4 needed tools; WINT-1160 uses them as-is.
- **No new DB migrations**: Schema is complete from WINT-1130.
- **No modification to wt-new or wt-switch skills**: These are invoked unchanged.
- **No worktree cleanup logic**: That is WINT-1150's ownership (wt-finish, merging, PR management).
- **No batch worktree operations**: Deferred to WINT-1170.
- **No cross-machine session detection beyond what the DB provides**: `worktree_get_by_story` already surfaces the conflict; machine identity is not tracked.
- **No auto-cleanup of orphaned DB records**: Detection (ORPHANED indicator) is in scope; remediation is out of scope (deferred per WINT-1130 QA non-blocking item #1).
- **No telemetry logging for conflict events**: Deferred to WINT-3020/WINT-3070 scope.
- **No re-specification of the 3-option prompt**: WINT-1140 AC-4 owns the UX. WINT-1160 adds the take-over hardening (AC-5, AC-6) and the status enhancement (AC-1 through AC-4, AC-8, AC-9).

### Reuse Plan

- **MCP Tools**: `worktreeListActive` (for `/wt:status` DB view), `worktreeGetByStory` (already in Step 1.3), `worktreeMarkComplete` (for take-over abandon step) — all from `packages/backend/mcp-tools/src/worktree-management/`
- **Patterns**: Null-check resilience pattern from WINT-1130 tools (call → null check → warn + graceful proceed)
- **Zod types**: `WorktreeRecord`, `WorktreeListActiveInput/Output` from `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts`
- **Existing Step 1.3 scaffold**: Already in `dev-implement-story.md` — extend/harden rather than rewrite
- **Autonomy tiers decision logic**: From `.claude/agents/_shared/autonomy-tiers.md` and `.claude/agents/_shared/decision-handling.md`
- **Skill file format**: Follow current `wt-status/SKILL.md` structure; add new section per established pattern

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No E2E tests needed**: No UI-facing ACs (mark `e2e: not_applicable` per ADR-006).
- **Primary test surface**: The `/wt:status` DB section behavior — test `worktreeListActive` integration with mock responses (unit) and real DB (integration).
- **Critical edge cases**: (a) orphaned DB record (path not on disk), (b) untracked git worktree (path on disk, no DB record), (c) `worktree_list_active` returns error — all three must show graceful degradation.
- **Take-over hardening test**: Verify that `--autonomous=aggressive` does NOT auto-select option (b). Explicitly test that conservative, moderate, and aggressive all require confirmation for option (b).
- **Integration test prerequisite**: WINT-1130 MCP tools must be live in MCP server before integration tests run. Unit tests can use null-return stubs.
- **Per ADR-005**: No mocking of MCP tools in integration test scenarios.
- **Coverage target**: Consistent with WINT-1130's 80% minimum for infrastructure stories.

### For UI/UX Advisor

- **CLI-only story**: No browser/React UI. All UX is command-line and skill output formatting.
- **wt-status output format**: The DB-aware section should be clearly delimited from the git view (e.g., a `--- Database-Tracked Worktrees ---` header). Use consistent column alignment. Avoid emoji per project style guidelines.
- **Orphaned/Untracked indicators**: `[ORPHANED]` and `[UNTRACKED]` labels must be visually distinct (all-caps bracketed labels are consistent with project CLI style — verify against other command outputs).
- **Take-over confirmation message**: Must explicitly state what will be destroyed (old worktree path, branch name) before asking for confirmation. Sample:
  ```
  WARNING: This will mark the following worktree as abandoned:
    Story:  WINT-XXXX
    Branch: story/WINT-XXXX
    Path:   tree/story/WINT-XXXX
    Registered: 2026-02-17T10:00:00Z

  This action cannot be undone. Type 'yes' to confirm take-over:
  ```
- **Step 1.3 in dev-implement-story**: Match existing step output style — single-line status messages, no emoji, brief.

### For Dev Feasibility

- **Complexity**: Low-Medium. Two primary artifacts: (1) wt-status/SKILL.md update and (2) dev-implement-story.md Step 1.3 take-over hardening. No new TypeScript files unless AC-9 integration tests require a test helper.
- **Canonical references for subtask decomposition**:
  - Read `wt-status/SKILL.md` first to understand current format before writing DB-aware section
  - Read `dev-implement-story.md` Step 1.3 to understand existing take-over scaffold before hardening
  - Read `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts` for `WorktreeListActiveInputSchema` and `WorktreeRecordSchema` before writing any parsing logic
- **Primary implementation risk**: The orphaned/untracked detection in AC-3 and AC-4 requires checking if a path exists on disk. The skill runs in the Claude Code context with filesystem access — `ls` or similar check is feasible but must be documented in the skill.
- **Estimated complexity**: 2-3 story points. Mostly markdown/documentation with one integration test file.
- **Subtask decomposition suggestion**:
  - ST-1: Read and understand existing SKILL.md and Step 1.3 context
  - ST-2: Draft and validate wt-status DB-aware section (AC-1 through AC-4, AC-8)
  - ST-3: Harden take-over path in dev-implement-story Step 1.3 (AC-5, AC-6, AC-7)
  - ST-4: Write integration test scenarios for AC-9 (can be doc-based test plans if code tests are not applicable for skill/command docs)
