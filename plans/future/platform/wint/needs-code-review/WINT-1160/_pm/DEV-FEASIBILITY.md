# Dev Feasibility Review: WINT-1160 — Add Parallel Work Conflict Prevention

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** Both dependency stories (WINT-1130, WINT-1140) are in UAT with QA PASS verdicts. All 4 MCP tools are live and tested. The scope is bounded to two markdown file modifications (`wt-status/SKILL.md` and `dev-implement-story.md` Step 1.3) plus integration test scenarios. No new TypeScript packages, DB migrations, or MCP tools are needed. Complexity is Low-Medium: mostly documentation/specification with one integration test artifact.

---

## Likely Change Surface (Core Only)

### Files to Modify

| File | Change | ACs |
|------|--------|-----|
| `.claude/skills/wt-status/SKILL.md` | Add "Database-Tracked Worktrees" section; update version to 2.0.0; update frontmatter description | AC-1, AC-2, AC-3, AC-4, AC-8 |
| `.claude/commands/dev-implement-story.md` | Harden Step 1.3 take-over path; add explicit confirmation requirement; add cross-reference documentation block | AC-5, AC-6, AC-7 |

### Files to Read (Context Only — Not Modified)

| File | Purpose |
|------|---------|
| `packages/backend/mcp-tools/src/worktree-management/worktree-get-by-story.ts` | Understand null-check resilience pattern for conflict detection |
| `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts` | Understand `WorktreeRecord`, `WorktreeListActiveInput/Output` schemas |
| `packages/backend/mcp-tools/src/worktree-management/worktree-list-active.ts` | Understand output format before writing DB-aware section |
| `.claude/agents/_shared/autonomy-tiers.md` | Understand autonomy tier definitions for AC-5 hardening |
| `.claude/agents/_shared/decision-handling.md` | Understand decision protocol for take-over confirmation |

### Integration Test File (Optional New File)

| File | Purpose | ACs |
|------|---------|-----|
| `plans/future/platform/wint/backlog/WINT-1160/_pm/TEST-PLAN.md` | Doc-based integration test scenarios for AC-9 | AC-9 |

### Critical Deploy Touchpoints

None — no Lambda functions, no DB migrations, no infrastructure changes. Markdown file modifications only.

---

## MVP-Critical Risks (Max 5)

### Risk 1: Disk-path existence check in skill execution context

- **Risk:** AC-3 and AC-4 require checking if a worktree path exists on disk. The SKILL.md instructs the agent (Claude Code) to perform this check. The mechanism (ls / stat / path check) must work reliably within the Claude Code execution environment.
- **Why it could block MVP:** If the path-check instruction is not clear enough, the agent may skip the ORPHANED/UNTRACKED detection, causing AC-3 and AC-4 to fail QA.
- **Required mitigation:** SKILL.md must include an explicit, concrete path-check instruction (e.g., "Use Bash tool: `ls {path}` — if exit code non-zero, path does not exist") rather than vague "check if path exists." Document the exact mechanism.

### Risk 2: Ambiguity between "take over" explicit confirmation and autonomous mode bypass

- **Risk:** AC-5 states take-over "requires explicit confirmation regardless of --autonomous level." If the instruction in dev-implement-story Step 1.3 is not sufficiently explicit about this exception, an agent in aggressive mode may still attempt to auto-select option (b).
- **Why it could block MVP:** If option (b) can be auto-selected silently, the "prevent accidental work loss" goal fails entirely.
- **Required mitigation:** Step 1.3 must include a clear, unnested rule: "Option (b) take-over ALWAYS requires explicit user confirmation. This rule overrides all autonomy levels including aggressive. Never auto-select option (b)."

### Risk 3: worktree_mark_complete must precede wt:new (ordering constraint)

- **Risk:** AC-6 requires `worktree_mark_complete` to succeed BEFORE `/wt:new` is called. If the implementation reverses this order or runs them concurrently, a failure of `worktree_mark_complete` after the new worktree is created leaves the system in an inconsistent state.
- **Why it could block MVP:** Inconsistent state (two "active" records for same story, or abandoned record with no replacement) breaks the DB integrity invariant from WINT-1130.
- **Required mitigation:** Step 1.3 must explicitly state the ordering: (1) call `worktree_mark_complete` with `status: 'abandoned'`, (2) check result — if null/error, abort with error message and do NOT proceed to step 3, (3) call `/wt:new`.

---

## Missing Requirements for MVP

None identified. The 9 ACs are complete and unambiguous given the seed context. The 3 risks above are mitigatable through careful specification language — no new ACs required.

---

## MVP Evidence Expectations

- **AC-1 through AC-4, AC-8**: SKILL.md file on disk shows correct content; `description` field in frontmatter updated; version is `2.0.0`
- **AC-5, AC-6, AC-7**: dev-implement-story.md Step 1.3 text shows explicit confirmation rule; ordering constraint documented; cross-references present
- **AC-9**: Integration test scenarios documented in TEST-PLAN.md (HPT-1, HPT-2, EC-1, EC-3) — or coded test file if dev agent chooses TypeScript implementation

---

## Proposed Subtask Breakdown

### ST-1: Read and understand current wt-status SKILL.md and Step 1.3 scaffold

- **Goal:** Understand the exact current state of both files before making changes — prevents overwriting existing content and ensures additions integrate cleanly
- **Files to read:** `.claude/skills/wt-status/SKILL.md`, `.claude/commands/dev-implement-story.md` (Step 1.3 section), `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts`
- **Files to create/modify:** None (read-only subtask)
- **ACs covered:** Prerequisite for all ACs
- **Depends on:** none
- **Verification:** No artifact — internal understanding step. Proceed to ST-2.

### ST-2: Enhance wt-status/SKILL.md with DB-aware section

- **Goal:** Update `.claude/skills/wt-status/SKILL.md` to version 2.0.0 with the "Database-Tracked Worktrees" section, [ORPHANED]/[UNTRACKED] indicator logic, graceful degradation behavior, and updated frontmatter description
- **Files to read:** `.claude/skills/wt-status/SKILL.md` (current version), `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts` (WorktreeRecord schema)
- **Files to create/modify:** `.claude/skills/wt-status/SKILL.md`
- **ACs covered:** AC-1, AC-2, AC-3, AC-4, AC-8
- **Depends on:** ST-1
- **Verification:** Read the updated file; assert version is `2.0.0`; assert "Database-Tracked Worktrees" section is present; assert [ORPHANED] and [UNTRACKED] are described; assert graceful degradation instruction is present; assert frontmatter `description` is updated

### ST-3: Harden take-over path in dev-implement-story.md Step 1.3

- **Goal:** Update Step 1.3 in `.claude/commands/dev-implement-story.md` to add: (a) explicit confirmation requirement for option (b) regardless of autonomy level, (b) ordered sequence for `worktree_mark_complete` → check → `/wt:new`, (c) abort-on-failure behavior for `worktree_mark_complete`, and (d) cross-reference documentation block citing WINT-1130, WINT-1140, WINT-1160
- **Files to read:** `.claude/commands/dev-implement-story.md` (Step 1.3 section), `.claude/agents/_shared/autonomy-tiers.md`, `.claude/agents/_shared/decision-handling.md`
- **Files to create/modify:** `.claude/commands/dev-implement-story.md`
- **ACs covered:** AC-5, AC-6, AC-7
- **Depends on:** ST-1
- **Verification:** Read the updated Step 1.3; assert explicit confirmation rule for option (b) is present; assert `worktree_mark_complete` → null-check → abort-or-proceed → `wt:new` ordering is specified; assert cross-reference comment block is present citing all three stories

### ST-4: Validate integration test scenarios are documented

- **Goal:** Confirm TEST-PLAN.md covers the three AC-9 scenarios (happy path with records, empty result, error/degradation) with actionable verification steps. If dev agent opts for coded tests, create the test file.
- **Files to read:** `plans/future/platform/wint/backlog/WINT-1160/_pm/TEST-PLAN.md`
- **Files to create/modify:** `plans/future/platform/wint/backlog/WINT-1160/_pm/TEST-PLAN.md` (if gaps found), OR a new test file if coded integration tests are implemented
- **ACs covered:** AC-9
- **Depends on:** ST-2 (to understand what the DB section actually produces)
- **Verification:** Three AC-9 integration test scenarios (IT-1, IT-2, IT-3 in TEST-PLAN.md) each have Setup, Action, Expected outcome, and Evidence fields

---

## Future Risks (Non-MVP)

See: `FUTURE-RISKS.md` (separate file per agent specification).

Highlights:
- Auto-cleanup of orphaned DB records (detection in scope, remediation deferred per WINT-1130 QA non-blocking item)
- Telemetry for conflict events (deferred to WINT-3020/WINT-3070)
- Batch worktree operations (WINT-1170)
- Cross-machine session identity tracking beyond DB visibility
