---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: PIPE-3020

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for the PIPE feature area. Codebase was scanned directly as a substitute.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `createCreateWorktreeNode` — full real git worktree creation via `git worktree add` | `packages/backend/orchestrator/src/nodes/create-worktree.ts` | Implemented, tested |
| `createCleanupWorktreeNode` — `git worktree remove --force` + `git branch -d/-D` | `packages/backend/orchestrator/src/nodes/merge/cleanup-worktree.ts` | Implemented, tested |
| `worktreeRegister` MCP tool — inserts into KB `worktrees` table | `packages/backend/mcp-tools/src/worktree-management/worktree-register.ts` | Implemented, tested |
| `worktreeMarkComplete` MCP tool — updates worktree status to `merged`/`abandoned` | `packages/backend/mcp-tools/src/worktree-management/worktree-mark-complete.ts` | Implemented |
| `worktreeGetByStory`, `worktreeListActive` MCP tools | `packages/backend/mcp-tools/src/worktree-management/` | Implemented |
| Worktree pruning cron job (stub) | `packages/backend/orchestrator/src/cron/jobs/worktree-pruning.job.ts` | Phase 4 stub |
| `elab-story.ts` — `createWorktreeSetupNode` / `createWorktreeTeardownNode` (STUBS) | `packages/backend/orchestrator/src/graphs/elab-story.ts` | Stub — returns stub paths, emits WINT-9060 warning |
| `dev-implement.ts` — `createExecuteNode` (STUB, WINT-9070) | `packages/backend/orchestrator/src/graphs/dev-implement.ts` | Stub — `executeComplete: true` with no-op |
| `WorktreeRegisterInputSchema` + `WorktreeRecordSchema` Zod types | `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts` | Complete |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|-------------|
| PIPE-2010 (backlog, high priority) | Unified BullMQ Job Payload Schema | Indirect — review payload includes `worktreePath` field; PIPE-3020 must produce a real path that matches this schema |
| PIPE-3010 (backlog) | Wire Execute Node to LLM Invocation | Direct — `dev-implement.ts` execute node is also a stub; both PIPE-3020 and PIPE-3010 modify the same graph lifecycle. Must coordinate execution order |

### Constraints to Respect

- `elab-story.ts` worktree nodes reference `WINT-9060` — this story IS WINT-9060's implementation target. Do not introduce a new WINT reference; reference PIPE-3020.
- `dev-implement.ts` stub references `WINT-9070` (the execute node). PIPE-3020 touches worktree setup/teardown only — do NOT touch the execute stub; that belongs to PIPE-3010.
- The `wint.*` schema (wint.stories, wint.elaborations, etc.) is flagged as problematic in project memory. `worktreeRegister` uses the KB `worktrees` table via `@repo/knowledge-base/db` (Drizzle), not `wint.*`. Use the KB path only.
- GitRunner injectable pattern is canonical — do NOT use execSync or spawn directly in node implementations. Always inject `gitRunner` for testability.
- Branch naming convention for worktrees created by orchestrator graphs: `impl/{storyId}` (established by `create-worktree.ts`). Use this same convention unless story-specific rationale warrants a different prefix for elab.

---

## Retrieved Context

### Related Endpoints

None — PIPE-3020 is a backend orchestrator package change only. No HTTP API surface, no API Gateway routes.

### Related Components

None — no UI components involved.

### Reuse Candidates

| Candidate | File | Reuse Pattern |
|-----------|------|---------------|
| `createCreateWorktreeNode` factory | `packages/backend/orchestrator/src/nodes/create-worktree.ts` | Wire `createWorktreeSetupNode` in `elab-story.ts` to call this directly (or inline the same pattern) |
| `createCleanupWorktreeNode` factory | `packages/backend/orchestrator/src/nodes/merge/cleanup-worktree.ts` | Wire `createWorktreeTeardownNode` in `elab-story.ts` to use same teardown logic |
| `GitRunner` type + `defaultGitRunner` implementation | Both node files above | Import type and default, inject in setup/teardown factories |
| `worktreeRegister` MCP tool | `packages/backend/mcp-tools/src/worktree-management/worktree-register.ts` | Call after successful `git worktree add` to register in KB `worktrees` table |
| `worktreeMarkComplete` MCP tool | `packages/backend/mcp-tools/src/worktree-management/worktree-mark-complete.ts` | Call in teardown to mark worktree `abandoned` or `merged` |
| `WorktreeRegisterInputSchema` | `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts` | Use for validation of registration inputs |
| Integration test fixture pattern (TempGitRepo) | `packages/backend/orchestrator/src/__tests__/integration/create-worktree.integration.test.ts` | Must create initial commit before `git worktree add` — known lesson |

### Similar Stories

| Story | Relevance |
|-------|-----------|
| APIP-1031 | Implemented `create-worktree.ts` node — this story wires its product into `elab-story.ts` |
| WINT-1130 | Implemented `worktree-register` MCP tool — this story calls it post-creation |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Git worktree creation node (injectable gitRunner, branch naming, logging) | `packages/backend/orchestrator/src/nodes/create-worktree.ts` | Canonical implementation of `git worktree add` pattern; reuse or call directly from elab-story.ts setup node |
| Git worktree cleanup node (teardown, branch delete, warnings-only errors) | `packages/backend/orchestrator/src/nodes/merge/cleanup-worktree.ts` | Canonical teardown pattern; teardown must never change `workflowSuccess` — warn-only on failure |
| Worktree register MCP tool (Drizzle insert, FK check, nullable return) | `packages/backend/mcp-tools/src/worktree-management/worktree-register.ts` | Shows how to register a worktree record in the KB database after git creation |
| Create-worktree unit tests (injectable mock gitRunner, HP/EC/ED test structure) | `packages/backend/orchestrator/src/nodes/__tests__/create-worktree.test.ts` | Shows test structure for subprocess-dependent nodes; same pattern needed for new elab-story node tests |

---

## Knowledge Context

### Lessons Learned

- **[APIP-1031]** Injectable gitRunner pattern for subprocess-dependent LangGraph nodes (category: architecture)
  - *Applies because*: The setup and teardown nodes in `elab-story.ts` will invoke `git worktree add` and `git worktree remove`. Must use injectable gitRunner (spawn-based Promise wrapper) to enable unit testing without a real git CLI.

- **[APIP-1032]** Git worktree requires initial commit before `git worktree add` works (category: edge-cases)
  - *Applies because*: Integration tests for the wired-up setup node will need a temporary git repo fixture. Must use `os.tmpdir()` isolation and create an initial commit before calling `git worktree add`.

- **[APIP-1031 / KB decision]** Use injectable gitRunner over execSync in create-worktree node — void IIFE for non-blocking cleanup (category: architecture)
  - *Applies because*: `createWorktreeTeardownNode` in elab-story.ts must use the same fire-and-forget void IIFE pattern for cleanup if teardown is non-blocking, OR make teardown synchronous (awaited) given AC-3 "teardown always runs." The awaited pattern is preferable here since elab-story.ts already has explicit conditional edges guaranteeing teardown runs.

- **[Worktree env]** `@repo/logger` symlink gaps in worktree environments can cause pre-existing test failures (category: testing)
  - *Applies because*: New tests should minimize `@repo/logger` dependencies in test setup, or be aware that pre-existing test failures in a worktree context are environment artifacts, not story regressions.

- **[LangGraph]** `createToolNode` handler index.ts files are not unit-testable in isolation (category: testing)
  - *Applies because*: The `createWorktreeSetupNode` and `createWorktreeTeardownNode` exported functions in elab-story.ts are the testable units — test them directly, not through a full graph invocation.

### Blockers to Avoid (from past stories)

- Do NOT use `execSync` for git operations in LangGraph nodes — blocks the event loop and is not injectable/testable
- Do NOT call `git worktree add` in a repo with no commits (integration test fixture must have initial commit)
- Do NOT change `workflowSuccess` in teardown — teardown errors are warnings only (matches cleanup-worktree.ts contract)
- Do NOT reference `wint.*` schema for worktree registration — use the KB `worktrees` table via `@repo/mcp-tools` `worktreeRegister` function

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| KB decision (d0b64e4d) | Injectable gitRunner over execSync | All git-invoking nodes must use injectable spawn-based gitRunner |
| elab-story.ts AC-3 | Teardown always runs | `afterElaborationSubgraph` already routes to `worktree_teardown` unconditionally; teardown must not be skipped on error paths |

### Patterns to Follow

- Injectable gitRunner factory pattern: `createXxxNode(opts: { gitRunner?: GitRunner; repoRoot?: string })` — same signature as `createCreateWorktreeNode`
- Branch naming: `elab/{storyId}` or `impl/{storyId}` — pick consistently; `impl/` is used by implementation graph, suggest `elab/` prefix for elaboration worktrees to distinguish lifecycle
- Log events: `worktree_created`, `worktree_removed` — structured with `storyId`, `stage`, `durationMs`
- Registration: call `worktreeRegister({ storyId, worktreePath, branchName })` after successful git worktree add; gracefully skip (warning) if registration fails — MCP tool returns null on error
- Teardown marks complete: call `worktreeMarkComplete({ worktreeId, status: 'abandoned' })` on teardown; look up worktree ID via `worktreeGetByStory({ storyId })` first
- Zod schemas: use `z.infer<>` for all types; no TypeScript interfaces

### Patterns to Avoid

- Hardcoded paths (e.g., `/tmp/worktrees`) without using `config.worktreeBaseDir` — already in `ElabStoryConfig`
- Mutating `workflowSuccess` or `workflowComplete` in teardown node — these are set by `createElabStoryCompleteNode` only
- Creating new WINT references for this story — use PIPE-3020 as the reference in comments
- Barrel files for new exports

---

## Conflict Analysis

### Conflict: Coordination dependency with PIPE-3010

- **Severity**: warning
- **Description**: Both PIPE-3020 (worktree isolation) and PIPE-3010 (execute node LLM invocation) modify `dev-implement.ts`. PIPE-3020's scope in `dev-implement.ts` is limited to worktree setup/teardown; PIPE-3010 addresses the execute node. However, if both are worked in parallel they will touch the same file and may conflict at merge time.
- **Resolution Hint**: PIPE-3020 should only modify `elab-story.ts` worktree nodes. Defer any `dev-implement.ts` worktree wiring to after PIPE-3010 is merged, or explicitly scope PIPE-3020 to `elab-story.ts` only and create a follow-up for `dev-implement.ts`.

### Conflict: wint.* schema exposure in WorkflowRepository

- **Severity**: warning
- **Description**: `WorkflowRepository` (`packages/backend/orchestrator/src/db/workflow-repository.ts`) queries `wint.stories`, `wint.elaborations`, etc. Project memory flags `wint.*` as a problematic/dead schema. The worktree registration path uses `@repo/mcp-tools/worktreeRegister` which uses the KB `worktrees` table (separate from `wint.*`). No conflict for PIPE-3020 directly, but do NOT add any `wint.*` references for worktree tracking.
- **Resolution Hint**: Use the `@repo/mcp-tools` worktree registration path exclusively. Do not add worktree tracking via `WorkflowRepository`.

---

## Story Seed

### Title

Worktree Isolation for Graph Execution: Wire Real Git Worktree Lifecycle in elab-story.ts

### Description

**Context**: `elab-story.ts` already has the full worktree lifecycle structure in place — `worktree_setup` and `worktree_teardown` nodes exist as named nodes in the compiled graph, and the conditional edge logic guarantees teardown always runs (AC-3). However, both nodes are stubs: `createWorktreeSetupNode` assigns a fake path (`${baseDir}/${storyId}`) and emits a warning referencing `WINT-9060`, and `createWorktreeTeardownNode` is a no-op. The real git worktree creation logic already exists in `packages/backend/orchestrator/src/nodes/create-worktree.ts` (from APIP-1031), and the real worktree registration tool exists in `packages/backend/mcp-tools/src/worktree-management/worktree-register.ts` (from WINT-1130).

**Problem**: Every graph execution that runs through `elab-story.ts` gets a fake worktree path. The elaboration subgraph receives a path that does not exist on disk. Any node that attempts filesystem access at `worktreePath` will fail silently or produce incorrect results. The `workflow.worktrees` table has no record of these executions, making observability impossible.

**Proposed Solution**: Replace the stub node factories in `elab-story.ts` with real implementations that: (1) call `git worktree add -b elab/{storyId} {worktreePath}` via the injectable `gitRunner` pattern, (2) call `worktreeRegister` to record the worktree in the KB database, (3) on teardown call `git worktree remove --force` and `worktreeMarkComplete` to close the record. The `createCreateWorktreeNode` and `createCleanupWorktreeNode` implementations in the existing node files should be reused directly or their logic inlined into refactored `elab-story.ts` factory functions.

### Initial Acceptance Criteria

- [ ] AC-1: `createWorktreeSetupNode` in `elab-story.ts` calls `git worktree add -b elab/{storyId} {worktreePath}` (using injectable `gitRunner`) when invoked. On success, `state.worktreePath` contains the real filesystem path and `state.worktreeSetup === true`.

- [ ] AC-2: `createWorktreeSetupNode` calls `worktreeRegister({ storyId, worktreePath, branchName })` after successful git worktree creation. If registration fails (returns null), a warning is emitted but setup is not considered failed — `worktreeSetup` remains true.

- [ ] AC-3: `createWorktreeTeardownNode` calls `git worktree remove --force {worktreePath}` on teardown. Errors are emitted as warnings only — teardown does NOT change `workflowSuccess` or `workflowComplete`. `state.worktreeTornDown === true` regardless of teardown errors (matches cleanup-worktree.ts contract).

- [ ] AC-4: `createWorktreeTeardownNode` calls `worktreeMarkComplete` with `status: 'abandoned'` after git cleanup, using the worktree ID retrieved via `worktreeGetByStory({ storyId })`. If no worktree record is found, teardown skips the mark-complete call with a warning.

- [ ] AC-5: If `git worktree add` fails (non-zero exit code or thrown error), `createWorktreeSetupNode` returns `{ worktreeSetup: false, worktreePath: null, errors: [...] }`. The `afterElabStoryInitialize` / existing graph routing must handle this gracefully (teardown still runs per AC-3).

- [ ] AC-6: `worktreeBaseDir` from `ElabStoryConfig` is used to compute the worktree path — hardcoded `/tmp/worktrees` is not used. Default from config schema (`/tmp/worktrees`) applies when not overridden.

- [ ] AC-7: The no-longer-needed `WINT-9060` warning strings are removed from both node factory functions.

- [ ] AC-8: Unit tests cover: real `git worktree add` args called with injectable mock (HP), `worktreeSetup: true` on success (HP), `worktreeSetup: false` on git failure (EP), teardown emits warning-only on cleanup error (EP), teardown calls `worktreeMarkComplete` (HP).

- [ ] AC-9: Integration test (in existing `create-worktree.integration.test.ts` or a new elab-story integration file) verifies the full setup → teardown lifecycle in an isolated `os.tmpdir()` git repo with an initial commit.

- [ ] AC-10: `pnpm test --filter @repo/orchestrator` passes with zero regressions. `pnpm check-types` passes with zero errors.

### Non-Goals

- Do NOT modify `dev-implement.ts` execute node — that is PIPE-3010's scope
- Do NOT implement worktree isolation for `dev-implement.ts` — defer to a follow-up or PIPE-3010 coordination
- Do NOT change the graph topology (edges, node names, state annotation) of `elab-story.ts` — only replace the node factory implementations
- Do NOT change `ElabStoryConfigSchema` fields — `worktreeBaseDir` already exists
- Do NOT implement the worktree pruning cron job — that is a Phase 4 stub (separate story)
- Do NOT modify `workflow.worktrees` DB schema — the table already exists and `worktreeRegister` handles inserts
- Do NOT touch `wint.*` schema for any worktree tracking
- Do NOT create barrel files

### Reuse Plan

- **Node factories**: Reuse `GitRunner` type and `defaultGitRunner` from `create-worktree.ts`; call `createCreateWorktreeNode` directly or replicate its `git worktree add` logic in a new elab-specific factory
- **Patterns**: Injectable gitRunner factory signature, non-blocking vs awaited cleanup decision, warn-only error handling in teardown
- **Packages**: `@repo/mcp-tools` (`worktreeRegister`, `worktreeMarkComplete`, `worktreeGetByStory`), `@repo/logger`, `child_process.spawn`
- **Test fixtures**: TempGitRepo pattern from `create-worktree.integration.test.ts` (initial commit required before `git worktree add`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Unit tests should follow the exact structure in `packages/backend/orchestrator/src/nodes/__tests__/create-worktree.test.ts` — mock gitRunner, test HP (happy path: success, path recorded, worktreeSetup=true), EP (error path: non-zero exit, git throw), and observability (logger.info called with correct structured fields).
- Integration tests require a real temporary git repo (os.tmpdir()) with an initial commit — this is a hard prerequisite (lesson from APIP-1032).
- MCP tool calls (`worktreeRegister`, `worktreeMarkComplete`, `worktreeGetByStory`) require either a live DB connection or mocking the imported function — recommend mocking for unit tests, use real DB for integration tests if available.
- Do NOT attempt to test the compiled graph directly for node isolation — test the factory functions directly (lesson from LangGraph createToolNode untestability).
- Coverage target: >= 45% global; existing tests already cover most of the file; new node factories need their own test file alongside existing `elab-story.test.ts`.

### For UI/UX Advisor

- Not applicable. This story has no UI surface area.

### For Dev Feasibility

- **Primary edit targets**: `packages/backend/orchestrator/src/graphs/elab-story.ts` (lines 202–304 — `createWorktreeSetupNode` and `createWorktreeTeardownNode` factory functions)
- **Secondary read targets**: `packages/backend/orchestrator/src/nodes/create-worktree.ts`, `packages/backend/orchestrator/src/nodes/merge/cleanup-worktree.ts`, `packages/backend/mcp-tools/src/worktree-management/worktree-register.ts`, `packages/backend/mcp-tools/src/worktree-management/worktree-mark-complete.ts`
- **Decision required**: Should the setup node re-export `createCreateWorktreeNode` from `create-worktree.ts` (preferred — avoids code duplication) or inline the logic (acceptable if the node needs elab-specific configuration)? The branch prefix `elab/` vs `impl/` needs to be decided — `elab/` is recommended to keep elaboration and implementation worktrees distinct.
- **Teardown sequencing**: Teardown should be async/awaited (not fire-and-forget void IIFE) since the graph already guarantees teardown runs unconditionally via `afterElaborationSubgraph`. The void IIFE pattern in `create-worktree.ts` was designed for opportunistic cleanup outside the graph; inside the graph teardown is a deliberate node.
- **Registration failure handling**: `worktreeRegister` returns `null` on error (it does not throw). The setup node must handle `null` return gracefully — emit a warning, do not fail setup.
- **Canonical references for subtask decomposition**:
  1. `packages/backend/orchestrator/src/nodes/create-worktree.ts` — copy/adapt `createCreateWorktreeNode` for setup
  2. `packages/backend/orchestrator/src/nodes/merge/cleanup-worktree.ts` — copy/adapt step 1 (worktree remove) for teardown
  3. `packages/backend/mcp-tools/src/worktree-management/worktree-register.ts` — call after successful git add
  4. `packages/backend/orchestrator/src/nodes/__tests__/create-worktree.test.ts` — mirror test structure
