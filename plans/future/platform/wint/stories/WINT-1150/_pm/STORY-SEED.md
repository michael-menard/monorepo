---
generated: "2026-02-16"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-1150

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline file provided. Codebase was scanned directly for current reality.

### Relevant Existing Features

| Feature | Status | Location |
|---------|--------|----------|
| Worktree tracking table (wint.worktrees) | in-qa (WINT-1130) | packages/backend/database-schema/src/schema/unified-wint.ts |
| worktree_register MCP tool | in-qa (WINT-1130) | packages/backend/mcp-tools/src/worktree-management/ |
| worktree_get_by_story MCP tool | in-qa (WINT-1130) | packages/backend/mcp-tools/src/worktree-management/ |
| worktree_list_active MCP tool | in-qa (WINT-1130) | packages/backend/mcp-tools/src/worktree-management/ |
| worktree_mark_complete MCP tool | in-qa (WINT-1130) | packages/backend/mcp-tools/src/worktree-management/ |
| qa-verify-story command | active | .claude/commands/qa-verify-story.md |
| qa-verify-completion-leader agent | active | .claude/agents/qa-verify-completion-leader.agent.md |
| story-update command | active | .claude/commands/story-update.md |
| 8 worktree skills (wt-new, wt-finish, wt-status, etc.) | active (no DB tracking) | .claude/skills/ (referenced in WINT-1130 context) |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-1130 | in-qa | **Blocks this story** - worktrees table and MCP tools must exist first |
| WINT-1140 | pending | **Sibling story** - also integrates with WINT-1130; same wt-finish/dev-implement-story surface area |

### Constraints to Respect

- WINT-1130 must complete (pass QA) before WINT-1150 can be implemented
- Worktree skills (wt-new, wt-finish, etc.) must continue to work without breaking changes
- Story management MCP tools (WINT-0090) and session management (WINT-0110) must remain unaffected
- Must NOT auto-merge if CI is failing or PR has requested changes (from index Risk Notes)
- qa-verify-completion-leader is haiku-powered; any modifications must remain lightweight
- story-update command is a docs-only utility-skill; modifications must remain within that pattern

---

## Retrieved Context

### Related Endpoints / MCP Tools

- `worktree_mark_complete` (WINT-1130) - primary tool for marking worktree status on story completion
- `worktree_get_by_story` (WINT-1130) - needed to check if worktree exists before triggering cleanup
- Story MCP tools: `storyGetStatus`, `storyUpdateStatus` (WINT-0090) - used in current qa-verify flow

### Related Components / Agents

- `.claude/commands/qa-verify-story.md` (v3.0.0) - orchestrator for QA verification; Phase 2 spawns qa-verify-completion-leader
- `.claude/agents/qa-verify-completion-leader.agent.md` (v3.2.0) - haiku agent; executes PASS/FAIL actions including story-update and index-update
- `.claude/commands/story-update.md` (v2.0.0) - utility-skill; updates story frontmatter and index; valid transitions include `uat → completed`
- Worktree skills: `wt-finish` (referenced by 8 worktree skills noted in WINT-1130 context) - executes merge, push, cleanup

### Reuse Candidates

- **qa-verify-completion-leader.agent.md** - primary modification target for the "on PASS" flow
- **worktree_mark_complete** MCP tool - call on successful merge/cleanup
- **worktree_get_by_story** MCP tool - pre-flight check before triggering wt-finish
- story-update command pattern for `completed` transition
- WINT-1130 error handling patterns (resilient, return null on error, never throw)

### Similar Stories

- WINT-1130: Track Worktree-to-Story Mapping in Database (similarity: 0.82 - provides the MCP layer this story integrates with)
- WINT-1140: Integrate Worktree Creation into dev-implement-story (similarity: 0.90 - exact same pattern at story start vs story end)

### Relevant Packages

- `packages/backend/mcp-tools/src/worktree-management/` (new in WINT-1130)
- `.claude/commands/qa-verify-story.md`
- `.claude/agents/qa-verify-completion-leader.agent.md`
- `.claude/commands/story-update.md`

---

## Knowledge Context

### Lessons Learned

No KB query available (lessons_loaded: false). Lessons synthesized from codebase analysis:

- **[WINT-1130]** Integration with worktree skills explicitly deferred to WINT-1140/1150 (category: scope-boundary)
  - *Applies because*: This story IS the deferred integration for the completion side; scope must stay bounded to cleanup, not re-implement DB layer
- **[Pattern]** qa-verify-completion-leader uses haiku model - keep modifications minimal and mechanical (category: pattern)
  - *Applies because*: Any new logic added to this agent must remain lightweight; complex CI/PR status checking should be delegated to a sub-skill or the wt-finish skill itself
- **[Pattern]** story-update command is docs-only permission level - cannot make DB calls directly (category: constraint)
  - *Applies because*: If story-update is modified, changes are limited to markdown/frontmatter manipulation

### Blockers to Avoid (from past stories)

- Do not attempt to implement the wt-finish skill itself - it already exists; just integrate it
- Do not add complex CI status checking logic to the haiku qa-verify-completion-leader agent; delegate to wt-finish skill
- Do not break backward compatibility with existing worktree skills that function without DB
- Do not bypass the `worktree_mark_complete` MCP tool - use it as the authoritative update path

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy - UAT Must Use Real Services | Integration test for wt-finish invocation must use real DB/worktree setup |
| ADR-006 | E2E Tests Required in Dev Phase | If any UI surface is touched, happy-path E2E test required; likely not applicable here (pure agent/command story) |

### Patterns to Follow

- Resilient error handling: log warnings, return null, do not throw uncaught exceptions (from WINT-1130)
- Zod-first types for any new input/output schemas (CLAUDE.md requirement)
- No barrel files (CLAUDE.md requirement)
- Defer cleanup if wt-finish returns failure; surface warning but do not block story completion
- Pre-flight check pattern: use `worktree_get_by_story` before attempting cleanup

### Patterns to Avoid

- Do not add business logic directly to the haiku completion-leader; use skills/sub-agents
- Do not hard-code "merge then cleanup" as a single atomic operation - keep steps discrete and recoverable
- Do not assume a worktree always exists (story may have been worked without a worktree)

---

## Conflict Analysis

### Conflict: Dependency Not Yet Resolved (Warning)

- **Severity**: warning
- **Description**: WINT-1130 is currently in-qa status, not yet completed. WINT-1150 depends on WINT-1130's MCP tools (worktree_mark_complete, worktree_get_by_story) being available. Story cannot be implemented until WINT-1130 passes QA.
- **Resolution Hint**: Elaborate and seed the story now; wait for WINT-1130 QA completion before assigning for development.

---

## Story Seed

### Title

Integrate Worktree Cleanup into Story Completion (qa-verify-story + story-update → wt-finish)

### Description

**Context**: WINT-1130 introduced a `worktrees` table and 4 MCP tools (worktree_register, worktree_get_by_story, worktree_list_active, worktree_mark_complete) to track worktree lifecycle in the database. Separately, 8 worktree skills (wt-new, wt-finish, wt-status, etc.) handle git operations but currently have no database integration.

**Problem**: When a story completes QA (`qa-verify-story` returns PASS), the worktree used for development is left alive. Developers must manually run `/wt-finish` to merge the branch, push, clean up the worktree, and update the database record. This manual step is frequently forgotten or deferred, leading to worktree sprawl and stale branches accumulating over time.

**Proposed Solution**: Modify the `qa-verify-completion-leader` agent and optionally the `story-update` command (for the `completed` transition) to:
1. Check if the story has an active worktree registered in the database (via `worktree_get_by_story`)
2. If a worktree exists, automatically invoke the `/wt-finish` skill
3. If `/wt-finish` succeeds: call `worktree_mark_complete` (status: merged) and continue with normal completion flow
4. If `/wt-finish` fails or CI is failing / PR has requested changes: skip auto-cleanup, log a warning, and offer a deferred cleanup path
5. If no worktree is registered: skip cleanup silently (not all stories use worktrees)

The deferred cleanup option records a flag in the worktree record metadata (`{ cleanup_deferred: true, reason: "pr_review_pending" | "ci_failing" | "user_requested" }`) so operators can identify worktrees pending cleanup.

### Initial Acceptance Criteria

- [ ] **AC-1**: When `qa-verify-story` produces a PASS verdict, `qa-verify-completion-leader` calls `worktree_get_by_story` with the story's UUID to check for an active worktree
- [ ] **AC-2**: If no active worktree record exists, the PASS flow continues unchanged (graceful no-op)
- [ ] **AC-3**: If an active worktree exists, `qa-verify-completion-leader` invokes the `/wt-finish` skill with the worktree's `branchName` and `worktreePath`
- [ ] **AC-4**: If `/wt-finish` succeeds (branch merged, pushed, worktree cleaned up), `worktree_mark_complete` is called with `status: 'merged'`
- [ ] **AC-5**: If `/wt-finish` fails because CI checks are failing, cleanup is deferred and the worktree metadata is updated with `{ cleanup_deferred: true, reason: "ci_failing" }`
- [ ] **AC-6**: If `/wt-finish` fails because the PR has requested changes, cleanup is deferred and metadata updated with `{ cleanup_deferred: true, reason: "pr_review_pending" }`
- [ ] **AC-7**: If cleanup is deferred, the PASS flow continues and a visible warning is logged indicating the worktree requires manual cleanup
- [ ] **AC-8**: The `story-update` command updated to trigger the same worktree cleanup check when transitioning to `completed` status (for the case where a story is manually marked done)
- [ ] **AC-9**: All new code paths use Zod schemas for input/output types (no TypeScript interfaces)
- [ ] **AC-10**: Unit tests cover: no worktree found (no-op), worktree found + cleanup succeeds, worktree found + CI failing (defer), worktree found + PR changes requested (defer)
- [ ] **AC-11**: Tests verify that story completion (PASS flow) is not blocked if wt-finish encounters an error

### Non-Goals

- Implementing the `wt-finish` skill itself (already exists)
- Adding auto-merge functionality (wt-finish handles merge decisions)
- Auto-abandon worktrees on timeout (requires session timeout detection, deferred to future)
- Batch worktree cleanup (WINT-1170)
- Worktree conflict UI (WINT-1160)
- Integration with dev-implement-story (WINT-1140 handles story start, not this story)
- Changes to the worktrees database schema (WINT-1130 defines the schema)
- Modification of existing worktree skills beyond invocation

### Reuse Plan

- **MCP Tools**: `worktree_get_by_story`, `worktree_mark_complete` from WINT-1130 (packages/backend/mcp-tools/src/worktree-management/)
- **Patterns**: Resilient error handling from WINT-1130 (no uncaught throws, return null on error)
- **Agents**: qa-verify-completion-leader (modify PASS branch only; must remain haiku-appropriate in complexity)
- **Skills**: wt-finish (existing, invoke directly; do not re-implement)
- **Zod Schemas**: Follow WINT-1130 pattern for any new input/output types

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story primarily modifies agent logic (qa-verify-completion-leader) and a command (story-update), not backend TypeScript packages - unit tests are agent-behavior tests, not Vitest tests
- Three critical test scenarios must be covered: (1) no worktree registered, (2) cleanup succeeds, (3) cleanup deferred due to CI/PR check failures
- AC-11 is the most critical safety gate: story completion must NEVER be blocked by a cleanup failure
- Consider integration test that verifies the full qa-verify-story PASS flow still emits QA PASS even when wt-finish is unavailable
- ADR-005 applies: any integration test involving worktree operations should use real DB (not mocked); unit tests may mock wt-finish responses

### For UI/UX Advisor

- This story has no user-facing UI components
- The user-visible output is: (a) a visible warning log when cleanup is deferred, and (b) the normal PASS confirmation unchanged when cleanup succeeds
- Defer notice language should be actionable: "Worktree {branchName} at {path} requires manual cleanup. Run /wt-finish {storyId} when ready."
- Not applicable for standard UI/UX review

### For Dev Feasibility

- Primary modification target: `.claude/agents/qa-verify-completion-leader.agent.md` (agent instruction file, not TypeScript)
- Secondary modification target: `.claude/commands/story-update.md` (command instruction file)
- TypeScript code additions: minimal - only the `worktree_get_by_story` and `worktree_mark_complete` MCP tool calls need wiring; the wt-finish skill invocation is a skill call pattern already established
- Complexity estimate: LOW-MEDIUM. The logic is straightforward: check worktree exists → call wt-finish → handle result. The main risk is defining precise failure detection for "CI failing" vs "PR has changes" conditions that wt-finish must surface
- **Critical dependency**: wt-finish skill must return structured output indicating success/failure reason; verify what wt-finish currently returns before implementing. If wt-finish does not surface CI/PR status, this AC-5/AC-6 behavior needs to be added to wt-finish first (scope risk)
- Token estimate: 80K-120K (agent file edits + tests + command file edit; no new DB schema)
- Story points: 3-5 depending on wt-finish output structure discovery
