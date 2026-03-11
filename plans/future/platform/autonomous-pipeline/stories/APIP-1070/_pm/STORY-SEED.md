---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-1070

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No Merge Graph exists in the codebase. No `gh` CLI or GitHub API integration exists in the orchestrator package. No PR creation, CI polling, or squash-merge automation exists anywhere in `packages/backend/orchestrator/`. The `QaVerifySchema` at `packages/backend/orchestrator/src/artifacts/qa-verify.ts` is the primary input artifact this graph reads — it is fully defined and stable. The `persist-learnings` node at `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` already implements the KB write-back pattern and can be reused directly by the Merge Graph's learnings extraction node. All APIP pipeline work is pre-implementation; the Merge Graph cannot be integration-tested until APIP-1060 (QA Graph) completes and produces a real `QA-VERIFY.yaml` artifact. The LangGraph worker graph pattern is established in `packages/backend/orchestrator/src/graphs/elaboration.ts`.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `QaVerifySchema` + helpers | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | Primary input to the Merge Graph — `QaVerify.verdict` must equal `'PASS'` and `qaPassedSuccessfully()` must return `true` before merge is allowed. Merge Graph reads this artifact as its gate precondition. |
| `persist-learnings` node | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Existing KB write-back implementation: `persistLearnings()`, `extractLearnings()`, `formatLearningContent()`, `generateLearningTags()`, `createPersistLearningsNode()`. The Merge Graph's learnings extraction node reuses this directly. |
| `PersistLearningsConfigSchema` | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Config schema with `kbDeps`, `dedupeThreshold`, `skipOnError` — injected into learnings node at graph construction. Same injection pattern applies to Merge Graph. |
| Elaboration LangGraph graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Canonical `StateGraph` pattern: `Annotation.Root()`, `.addNode()`, `.addConditionalEdges()`, `createElaborationGraph()`, `runElaboration()` entry point. Merge Graph follows this exact structure. |
| `createToolNode` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | All Merge Graph nodes must use `createToolNode('node-name', fn)` — provides timeout, circuit breaker, retry, and error classification automatically. |
| YAML artifact writer | `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` | Atomic YAML file writes (temp file → rename), directory creation, `@repo/logger` integration. Merge Graph writes a `MERGE.yaml` artifact using this pattern. |
| Error classification | `packages/backend/orchestrator/src/runner/error-classification.ts` | `isRetryableNodeError()` + `ErrorCategory` — drives retry vs fail for CI poll timeouts and transient GitHub API errors. |
| YAML artifact reader | `packages/backend/orchestrator/src/persistence/yaml-artifact-reader.ts` | Reads existing YAML artifacts (e.g., `QA-VERIFY.yaml`) from the story feature directory — used in the preconditions node to load and validate the QA artifact. |
| Knowledge Base MCP tools | `apps/api/knowledge-base/src/mcp-server/` | KB write-back target — `persist-learnings` already integrates with KB MCP tools. Reuse the same integration path. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| APIP-1060 (QA Graph) | backlog | Direct dependency — Merge Graph requires a `QA-VERIFY.yaml` artifact with `verdict: 'PASS'` as its entry gate. APIP-1070 elaboration and unit test development can proceed independently, but integration testing is blocked on APIP-1060 completing. |
| APIP-1050 (Review Graph) | backlog | Indirect dependency (APIP-1060 depends on APIP-1050). The full dependency chain APIP-1050 → APIP-1060 → APIP-1070 means end-to-end integration testing requires the entire chain. Unit tests for Merge Graph nodes are independent. |
| APIP-0020 (Supervisor Loop) | In Elaboration | Supervisor dispatches the Merge Graph via BullMQ after QA PASS. The `runMerge(storyId, config)` entry function signature must be consistent with supervisor dispatch conventions. Thread ID convention: `{storyId}:merge:{attempt}`. |
| APIP-5006 (Server Infrastructure) | In Elaboration | Merge Graph runs on dedicated local server. The `gh` CLI must be installed and authenticated on that server. This is an infrastructure precondition for integration testing. |
| APIP-5004 (Secrets Engine) | Ready to Work | GitHub token for `gh` CLI calls must be available via secrets engine (or environment variable). Merge Graph must not hard-code credentials. |
| APIP-5005 (Operator CLI) | backlog | The `MERGE.yaml` artifact written by this graph will eventually be surfaced in the operator CLI. Keep all string fields human-readable — operator reads them directly before CLI UI is built. |

### Constraints to Respect

- **APIP ADR-001 Decision 4**: All pipeline components run on dedicated local server. No Lambda. The `gh` CLI and git operations are local-server processes.
- **APIP ADR-001 Decision 2**: Supervisor is plain TypeScript — Merge Graph is a LangGraph worker graph (correct layer). Supervisor dispatches to it via BullMQ job with `stage: 'merge'`.
- **APIP ADR-001 Decision 1**: BullMQ + Redis queue — supervisor picks up `stage: 'merge'` jobs from BullMQ. Merge Graph result is written back via BullMQ job completion.
- **QA gate is non-negotiable**: Merge Graph MUST refuse to proceed (return `MERGE_BLOCKED`) if `QaVerify.verdict !== 'PASS'` or if `qaPassedSuccessfully()` returns `false`. There is no override path — QA PASS is the only entry condition.
- **Squash-merge strategy**: All stories must be merged as a single squash commit onto main. No regular merges. The squash commit message must include the story ID, title, and a summary of the changes.
- **CI polling budget**: CI check polling must have a configurable timeout. Long CI runs (e.g., Playwright) are expected. Polling must use exponential back-off, not tight loops. If CI does not pass within `ciTimeoutMs`, the graph records `MERGE_BLOCKED` and does not merge.
- **Worktree cleanup on all paths**: The git worktree MUST be cleaned up whether merge succeeds, fails, or is blocked — partial failures must not leave dangling worktrees. Cleanup failure is a warning, not a blocking error.
- **Zod-first types**: All Merge Graph schemas must use Zod (`z.infer<>`). No TypeScript interfaces.
- **Protected areas**: Do NOT modify `packages/backend/database-schema/` or `@repo/db` client. Merge Graph state lives in YAML artifact and LangGraph checkpoint — no Aurora writes from this graph.
- **No barrel files**: Import directly from source files.

---

## Retrieved Context

### Related Endpoints

None — APIP-1070 is a headless LangGraph worker graph. No HTTP routes or API endpoints. The supervisor calls `runMerge(storyId, config)` directly.

### Related Components

None — no UI components. Operator visibility is deferred to APIP-5005.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `QaVerifySchema` + `qaPassedSuccessfully()` | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | Preconditions gate: read `QA-VERIFY.yaml` via YAML artifact reader, parse with `QaVerifySchema`, call `qaPassedSuccessfully()` to confirm gate. Read-only — Merge Graph does not modify this artifact. |
| `persistLearnings()` + `createPersistLearningsNode()` | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Direct reuse for the `extract-learnings` node. `extractLearnings()` reads learnings from graph state; `persistLearnings()` writes to KB with deduplication. `createPersistLearningsNode(config)` factory is the correct abstraction — wire it in at graph construction with KB deps injected. |
| `LearningSchema` + `LearningCategorySchema` | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Learning types for the learnings array in Merge Graph state. The Merge Graph extracts learnings from the QA artifact's `lessons_to_record` and converts them to `Learning[]` before passing to `persistLearnings()`. |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | All Merge Graph nodes must use `createToolNode('node-name', fn)` factory. |
| Error classification | `packages/backend/orchestrator/src/runner/error-classification.ts` | `isRetryableNodeError()` for classifying transient GitHub API errors (rate limits, network) vs permanent errors (invalid token, PR not found). |
| Elaboration graph pattern | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Graph composition pattern: `Annotation.Root()`, `.addNode()`, `.addConditionalEdges()`, `createElaborationGraph(config)` factory, `runElaboration()` entry point. Merge Graph follows this structure with `createMergeGraph(config)` and `runMerge(storyId, qaVerify, config)`. |
| YAML artifact writer | `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` | Atomic write of `MERGE.yaml` to the story's feature directory on merge completion (success, fail, or blocked). |
| YAML artifact reader | `packages/backend/orchestrator/src/persistence/yaml-artifact-reader.ts` | Read `QA-VERIFY.yaml` in the preconditions node to load and validate the QA artifact before proceeding. |
| `@repo/logger` | Used throughout orchestrator | Structured logging in all nodes — `storyId`, `stage: 'merge'`, `prNumber`, `ciStatus`, `verdict`, `durationMs` on every lifecycle event. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph StateGraph composition with conditional routing | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Canonical `StateGraph` construction: `Annotation.Root()` with overwrite reducer, `.addNode()`, `.addConditionalEdges()`, `createElaborationGraph(config)` factory, `runElaboration()` entry function. Merge Graph replicates this structure exactly for `createMergeGraph(config)` and `runMerge()`. |
| KB learnings write-back (direct reuse) | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | The `extract-learnings` node in the Merge Graph is effectively this file. `persistLearnings()`, `extractLearnings()`, `formatLearningContent()`, `generateLearningTags()` are all reused. The Merge Graph's learnings node adds only the QA-artifact → Learning[] conversion step on top. |
| LangGraph node using `createToolNode` factory | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical node structure: Zod schemas at top, pure functions, `createToolNode('name', async (state) => ...)` factory, exported result type. Every Merge Graph node mirrors this. |
| QA artifact schema (primary Merge Graph input) | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | The `QaVerifySchema`, `qaPassedSuccessfully()`, and `generateQaSummary()` are the Merge Graph's entry gate. Reading this file clarifies the exact precondition check the `check-preconditions` node must perform. |

---

## Knowledge Context

### Lessons Learned

KB search was unavailable in this execution context. The following are inferred from epic elaboration artifacts and peer story seeds (APIP-1050, APIP-1060):

- **[APIP-1060 seed / architecture]** `QaVerifySchema` must NOT be modified in a breaking way — any extensions use `z.optional()` or `z.nullable().default(null)`. The Merge Graph reads this schema; if APIP-1060 changes its shape, Merge Graph input parsing will break.
  - *Applies because*: Merge Graph's preconditions node does `QaVerifySchema.safeParse()` on the loaded `QA-VERIFY.yaml`. Any schema regression in APIP-1060 flows directly to Merge Graph breakage. The Merge Graph should validate the QA artifact via `safeParse()` (not `parse()`) and return `MERGE_BLOCKED` with a descriptive error if validation fails — this surfaces schema drift explicitly.

- **[APIP-1030 seed / architecture]** Thread ID convention: `{storyId}:{stage}:{attemptNumber}` — consistent across all LangGraph worker graphs. Merge Graph thread ID: `{storyId}:merge:{attempt}`. LangGraph checkpoint continuity requires this to be documented in the source.
  - *Applies because*: If the merge is interrupted (e.g., CI polling timeout, server restart), the supervisor can re-dispatch with the same thread ID and LangGraph will resume from the last checkpoint rather than restarting from scratch.

- **[APIP-0020 elaboration / architecture]** Supervisor dispatches to worker graphs via BullMQ job with a `stage` field. The `runMerge(storyId, qaVerify, config)` entry function signature must match what the supervisor provides. Do not design the entry function signature independently — coordinate with APIP-0020 dispatch contract.
  - *Applies because*: If the supervisor passes `{ storyId, qaVerifyPath }` but `runMerge` expects a pre-loaded `QaVerify` object, the graph will fail at dispatch. The Merge Graph should accept both a path and a pre-loaded object (with path taking precedence) for testability.

- **[story.yaml risk_notes / operational]** Squash-merge conflicts occur if the main branch advanced during implementation. The Merge Graph must handle this scenario: attempt `git pull --rebase` on the worktree branch before creating the PR, and record `MERGE_BLOCKED` if rebase fails. Do not attempt merge when there are unresolved conflicts.
  - *Applies because*: This is explicitly flagged as a risk in the story's `risk_notes`. The rebase attempt is the correct mitigation — it brings the worktree branch up to date with main before the PR is created, giving CI a chance to pass on the current state of main.

- **[story.yaml risk_notes / operational]** CI check polling latency is a primary operational risk. Long-running CI suites (Playwright, full `pnpm test`) can take 10-20 minutes. Tight polling loops will hammer the GitHub API and may hit rate limits. Exponential back-off with a configurable maximum is required.
  - *Applies because*: The `poll-ci` node must implement exponential back-off (initial delay: 30s, max delay: 5min, jitter: ±10%) and must respect the `ciTimeoutMs` hard cap. A hung CI job must not block the pipeline indefinitely.

- **[persist-learnings / architecture]** The `persist-learnings` node already implements deduplication against KB entries using a 0.85 similarity threshold. Reuse this directly — do not reimplement deduplication in the Merge Graph's learnings extraction node.
  - *Applies because*: The QA artifact's `lessons_to_record` array may contain learnings that overlap with previously recorded lessons from prior iterations of the same story. Deduplication prevents KB pollution. `persistLearnings()` already handles this via `kbSearchFn` + similarity threshold.

### Blockers to Avoid (from past stories)

- **Proceeding to merge without validated QA PASS**: The `check-preconditions` node must load the `QA-VERIFY.yaml` artifact, parse it with `QaVerifySchema.safeParse()`, and call `qaPassedSuccessfully()` before any `gh` CLI or git operation. If preconditions fail, return `MERGE_BLOCKED` immediately. Never attempt a merge without this check.
- **Leaving dangling git worktrees on failure**: The `cleanup-worktree` node must run on ALL terminal paths (success, fail, blocked). Use a `finally`-style graph routing pattern: all terminal paths (after `MERGE_COMPLETE`, `MERGE_FAIL`, or `MERGE_BLOCKED`) must pass through `cleanup-worktree → write-merge-artifact → END`. A dangling worktree is an operational hazard that causes the next story iteration to fail.
- **Tight CI polling loop**: Never poll GitHub API in a busy loop. Minimum polling interval is 30 seconds with exponential back-off. Use `setTimeout` with `await` — not a `while(true)` with no delay. Capture and log each poll result.
- **Hard-coding GitHub credentials**: The `gh` CLI must be authenticated via an environment variable (`GH_TOKEN`) read at node construction time via secrets engine convention. Never embed a token in source code or config files.
- **Squash-merge without rebase**: If the main branch has advanced since the story branch was created, squash-merging without a rebase will include stale base commits in the diff. Always `git pull --rebase origin main` on the story branch before creating/updating the PR. If rebase fails, record `MERGE_BLOCKED` with reason "Rebase conflict — manual intervention required" and stop.
- **Mixing Aurora DB writes with Merge Graph outputs**: Merge Graph writes to `MERGE.yaml` (via YAML artifact writer) and KB (via `persist-learnings`). It does NOT write to Aurora via `@repo/db`. Keep data paths clean.
- **Reimplementing learnings persistence**: The `persist-learnings` node at `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` already implements the correct KB write-back pattern including deduplication. Import and reuse `createPersistLearningsNode(config)` — do not rewrite it.
- **Not handling partial `cleanup-worktree` failures gracefully**: `git worktree remove` can fail if the worktree has uncommitted changes or if the path is already gone. The cleanup node must use `--force` flag for removal and must catch errors — a cleanup failure is a warning logged to `@repo/logger`, not a blocking graph error. The `MERGE.yaml` artifact must still be written even if cleanup partially fails.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 4 | Local Dedicated Server | Merge Graph runs on dedicated local Docker server. No Lambda. `gh` CLI and git operations are local-process invocations. |
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Merge Graph is a LangGraph worker graph (correct layer). Supervisor dispatches to it via BullMQ job with `stage: 'merge'`. |
| APIP ADR-001 Decision 1 | BullMQ + Redis Queue | Supervisor picks up `stage: 'merge'` jobs from BullMQ. Merge Graph result is written back via BullMQ job completion, not a direct API call. |
| Monorepo CLAUDE.md | Zod-First Types | All Merge Graph schemas use Zod. No TypeScript interfaces. |

### Patterns to Follow

- `createMergeGraph(config)` factory returning a compiled `StateGraph` — mirrors `createElaborationGraph()` pattern.
- All nodes implemented via `createToolNode('node-name', async (state: MergeGraphState) => ...)`.
- `MergeGraphStateAnnotation` with fields: `qaVerify` (QaVerify nullable), `prNumber` (number nullable), `prUrl` (string nullable), `ciStatus` (enum nullable), `mergeComplete` (boolean), `mergeVerdict` (enum `MERGE_COMPLETE | MERGE_FAIL | MERGE_BLOCKED`), `worktreeCleanedUp` (boolean), `learningsPersisted` (boolean), `mergeArtifact` (MergeArtifactSchema nullable).
- `MergeGraphConfigSchema` with: `worktreeDir` (string — absolute path to story worktree), `storyBranch` (string), `mainBranch` (z.string().default('main')), `ciTimeoutMs` (z.number().positive().default(1800000) — 30 min), `ciPollIntervalMs` (z.number().positive().default(30000) — 30s), `ciPollMaxIntervalMs` (z.number().positive().default(300000) — 5 min), `kbWriteBackEnabled` (z.boolean().default(true)), `nodeTimeoutMs` (z.number().positive().default(60000)), `ghToken` (z.string().optional() — falls back to `GH_TOKEN` env var if not provided).
- PR body template: story ID, title, QA summary (from `generateQaSummary()`), list of changed files from QA evidence, and "Autonomous merge by APIP pipeline".
- Squash commit message format: `{storyId}: {storyTitle}\n\n{QA summary}\n\nCo-authored-by: APIP Pipeline <noreply@pipeline>`.
- Thread ID convention for LangGraph checkpoint: `` `${storyId}:merge:${attempt}` ``.
- `runMerge(storyId, qaVerify, config)` entry function — accepts either a pre-loaded `QaVerify` object or a path to `QA-VERIFY.yaml`; returns `MergeGraphResult` with `{ storyId, verdict, prNumber, mergeArtifact, durationMs }`.
- `@repo/logger` structured logging: `storyId`, `stage: 'merge'`, `prNumber`, `ciStatus`, `verdict`, `durationMs` on every lifecycle transition.

### Patterns to Avoid

- TypeScript interfaces for Merge Graph schemas — use Zod with `z.infer<>`.
- Invoking `gh` CLI or `git` commands via `execSync` — use async subprocess (`child_process.spawn` or `execa`) with timeout.
- Polling CI in a tight loop — enforce minimum 30s interval with exponential back-off.
- Attempting merge without rebase when main has advanced — always rebase first.
- Writing Merge Graph output to Aurora via `@repo/db` — YAML artifact + KB only.
- Reimplementing `persistLearnings()` — import from `persist-learnings.ts`.
- Skipping `cleanup-worktree` on any terminal path — all terminal paths must pass through cleanup.
- Hard-coding `GH_TOKEN` or any credential — read from environment variable.
- Treating worktree cleanup failure as a blocking error — log as warning, continue to `write-merge-artifact`.

---

## Conflict Analysis

### Conflict: Deep dependency chain — APIP-1060 (QA Graph) not yet built
- **Severity**: warning
- **Description**: APIP-1070 depends on APIP-1060 (QA Graph), which depends on APIP-1050 (Review Graph), which depends on APIP-1030 (Implementation Graph), which depends on APIP-1020 (ChangeSpec Spike). The Merge Graph cannot be integration-tested end-to-end until the entire upstream chain is complete. The `QA-VERIFY.yaml` artifact that the Merge Graph reads as its gate input does not exist yet. Elaboration and unit test development can proceed independently using mocked `QaVerify` objects built from the existing `QaVerifySchema`.
- **Resolution Hint**: Structure APIP-1070 so that the graph, nodes, and unit tests are fully developed and passing before integration with upstream is needed. The `check-preconditions` node can be tested by constructing `QaVerify` objects directly from `createQaVerify()` + `addAcVerification()` helpers. Mock `gh` CLI invocations and `git` operations for all unit tests.

### Conflict: `gh` CLI availability on dedicated server not confirmed
- **Severity**: warning
- **Description**: APIP-1070 requires the `gh` CLI to be installed, authenticated, and accessible on the dedicated local server where LangGraph graphs run. APIP-5006 (Server Infrastructure Baseline) is in elaboration and may not have confirmed `gh` CLI installation. APIP-5004 (Secrets Engine) is in ready-to-work status but the GitHub token provisioning flow has not been defined. If `gh` is not present or not authenticated when the Merge Graph first runs integration tests, the PR creation and merge nodes will fail.
- **Resolution Hint**: During elaboration, add a server infrastructure check to APIP-5006 to confirm `gh` CLI installation and GitHub token availability. The Merge Graph's `check-preconditions` node should include a `gh auth status` preflight check and return `MERGE_BLOCKED` if `gh` is not authenticated, with a clear operator message: "GitHub CLI not authenticated — run `gh auth login` on the server or set GH_TOKEN environment variable."

---

## Story Seed

### Title

Merge Graph with Learnings Extraction

### Description

**Context**: The autonomous pipeline completes the review (APIP-1050) and QA (APIP-1060) stages for a story's implementation. When the QA Graph emits a `PASS` verdict, the pipeline needs to take the implementation from a git worktree branch, create a pull request, wait for CI to pass, squash-merge it onto main, clean up the worktree, and capture the implementation's learnings into the Knowledge Base. This is the Merge Graph.

**Problem**: There is no automated merge pipeline in the codebase today. The `QaVerifySchema` at `packages/backend/orchestrator/src/artifacts/qa-verify.ts` defines the data contract for the QA gate input, and the `persist-learnings` node at `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` implements the KB write-back pattern — but no LangGraph graph exists to orchestrate the PR creation, CI polling, squash-merge, worktree cleanup, and learnings extraction steps autonomously.

**Proposed Solution Direction**: The Merge Graph is a LangGraph `StateGraph` with the following node sequence:

1. **`check-preconditions`**: Reads the `QA-VERIFY.yaml` artifact via YAML artifact reader. Parses with `QaVerifySchema.safeParse()`. Calls `qaPassedSuccessfully()` — if false, immediately returns `MERGE_BLOCKED` with reason. Runs `gh auth status` to confirm GitHub CLI is authenticated — if not, returns `MERGE_BLOCKED` with operator instructions. Runs `git status` on the worktree to confirm a clean state.

2. **`rebase-branch`**: Runs `git fetch origin main` and `git rebase origin/main` on the story branch in the worktree. If rebase succeeds, pushes the updated branch (`git push --force-with-lease`). If rebase fails (conflicts), runs `git rebase --abort`, sets `mergeVerdict: 'MERGE_BLOCKED'` with reason "Rebase conflict — manual intervention required", and routes to cleanup.

3. **`create-or-update-pr`**: Invokes `gh pr create` (or `gh pr edit` if a PR already exists for the branch) with a structured body: story ID, title, QA summary from `generateQaSummary()`, list of changed files. Records the PR number and URL in graph state. If PR creation fails, routes to cleanup with `MERGE_FAIL`.

4. **`poll-ci`**: Polls `gh pr checks {prNumber}` on a configurable interval with exponential back-off (`ciPollIntervalMs`, doubling per attempt up to `ciPollMaxIntervalMs`, ±10% jitter). Records each poll result. On CI pass, advances to merge. On CI fail, sets `mergeVerdict: 'MERGE_FAIL'` and routes to cleanup. On timeout (`ciTimeoutMs` exceeded), sets `mergeVerdict: 'MERGE_BLOCKED'` with reason "CI timeout" and routes to cleanup.

5. **`squash-merge`**: Invokes `gh pr merge {prNumber} --squash --subject "{storyId}: {storyTitle}" --body "{QA summary}"`. Records the merge commit SHA. On success, sets `mergeVerdict: 'MERGE_COMPLETE'`. On failure (e.g., merge conflict on main), sets `mergeVerdict: 'MERGE_FAIL'` with the GitHub error message.

6. **`cleanup-worktree`**: Runs `git worktree remove --force {worktreeDir}` and deletes the story branch (`git branch -d {storyBranch}` on the main repo). Errors in this step are logged as warnings via `@repo/logger` — cleanup failure does NOT change the merge verdict. Sets `worktreeCleanedUp: true | false`.

7. **`extract-learnings`**: Converts the QA artifact's `lessons_to_record` array to `Learning[]` format. Calls `createPersistLearningsNode(config)` from `persist-learnings.ts` to write to KB with deduplication. Sets `learningsPersisted: true | false`.

8. **`write-merge-artifact`**: Constructs a `MergeArtifact` YAML and writes it to `plans/future/platform/autonomous-pipeline/in-progress/{storyId}/MERGE.yaml` using the YAML artifact writer. Records verdict, PR URL, merge commit SHA, CI duration, worktree cleanup status, and learnings count. Sets `mergeComplete: true`.

All terminal paths (MERGE_COMPLETE, MERGE_FAIL, MERGE_BLOCKED) pass through `cleanup-worktree → extract-learnings → write-merge-artifact → END`. The `extract-learnings` node runs on all paths so KB write-back happens even when merge is blocked or fails — partial progress learnings are valuable.

The graph follows the established LangGraph `StateGraph` pattern from `packages/backend/orchestrator/src/graphs/elaboration.ts` and all nodes use the `createToolNode` factory.

### Initial Acceptance Criteria

- [ ] AC-1: A `MergeGraphConfigSchema` Zod schema exists with fields: `worktreeDir: z.string()` (absolute path), `storyBranch: z.string()`, `storyId: z.string()`, `storyTitle: z.string()`, `mainBranch: z.string().default('main')`, `ciTimeoutMs: z.number().positive().default(1800000)` (30 min), `ciPollIntervalMs: z.number().positive().default(30000)` (30s), `ciPollMaxIntervalMs: z.number().positive().default(300000)` (5 min), `kbWriteBackEnabled: z.boolean().default(true)`, `nodeTimeoutMs: z.number().positive().default(60000)`, `ghToken: z.string().optional()` — placed at `packages/backend/orchestrator/src/graphs/merge.ts`

- [ ] AC-2: A `MergeGraphStateAnnotation` Zod-first LangGraph annotation exists with fields: `storyId` (string), `config` (MergeGraphConfig nullable), `qaVerify` (QaVerify nullable), `prNumber` (number nullable), `prUrl` (string nullable), `mergeCommitSha` (string nullable), `ciStatus` (enum `'pending' | 'running' | 'pass' | 'fail' | 'timeout'` nullable), `ciPollCount` (number, default 0), `rebaseSuccess` (boolean nullable), `worktreeCleanedUp` (boolean, default false), `learningsPersisted` (boolean, default false), `mergeVerdict` (enum `'MERGE_COMPLETE' | 'MERGE_FAIL' | 'MERGE_BLOCKED'` nullable), `mergeComplete` (boolean, default false), `mergeArtifact` (unknown nullable — typed MergeArtifact at runtime), `errors` (string[], append reducer), `warnings` (string[], append reducer)

- [ ] AC-3: A `check-preconditions` node exists that: (a) loads `QA-VERIFY.yaml` from the story feature directory via YAML artifact reader, parsing with `QaVerifySchema.safeParse()` — if parse fails, sets `mergeVerdict: 'MERGE_BLOCKED'` with reason "QA artifact invalid or missing: {error}"; (b) calls `qaPassedSuccessfully(qaVerify)` — if false, sets `mergeVerdict: 'MERGE_BLOCKED'` with reason "QA verdict is not PASS: {qaVerify.verdict}"; (c) invokes `gh auth status` via async subprocess — if it exits non-zero, sets `mergeVerdict: 'MERGE_BLOCKED'` with reason "GitHub CLI not authenticated"; (d) on all preconditions passing, sets `qaVerify` in state and routes to `rebase-branch`; uses `createToolNode('check-preconditions', fn)` factory

- [ ] AC-4: A `rebase-branch` node exists that: (a) runs `git fetch origin {mainBranch}` in `worktreeDir` via async subprocess with `nodeTimeoutMs` timeout; (b) runs `git rebase origin/{mainBranch}` — on success, runs `git push --force-with-lease`; (c) on rebase failure, runs `git rebase --abort` and sets `mergeVerdict: 'MERGE_BLOCKED'` with reason "Rebase conflict on {conflictFiles} — manual intervention required"; (d) sets `rebaseSuccess: true | false`; uses `createToolNode('rebase-branch', fn)` factory; injectable `gitRunner?: (cmd: string, cwd: string) => Promise<{exitCode: number; stdout: string; stderr: string}>` for testability

- [ ] AC-5: A `create-or-update-pr` node exists that: (a) checks if a PR already exists for the story branch via `gh pr list --head {storyBranch} --json number`; (b) if no PR exists, runs `gh pr create --title "{storyId}: {storyTitle}" --body "{prBody}" --base {mainBranch}`; (c) if PR exists, runs `gh pr edit {prNumber} --body "{prBody}"`; (d) PR body includes: story ID, story title, `generateQaSummary(qaVerify)` output, list of changed files from QA evidence `acs_verified`, and "Automated PR by APIP pipeline — do not manually merge"; (e) records `prNumber` and `prUrl` in state; (f) on `gh` CLI error, sets `mergeVerdict: 'MERGE_FAIL'` with the stderr output; uses `createToolNode('create-or-update-pr', fn)` factory; injectable `ghRunner` for testability

- [ ] AC-6: A `poll-ci` node exists that: (a) polls `gh pr checks {prNumber} --json name,state,conclusion` on a configurable interval starting at `ciPollIntervalMs`; (b) implements exponential back-off — each poll interval doubles up to `ciPollMaxIntervalMs`, with ±10% random jitter; (c) on all checks `state === 'COMPLETED'` and all `conclusion === 'success'`, sets `ciStatus: 'pass'` and routes to `squash-merge`; (d) on any check `conclusion === 'failure'`, sets `ciStatus: 'fail'` and routes to cleanup with `mergeVerdict: 'MERGE_FAIL'`; (e) on `ciTimeoutMs` exceeded without a conclusive result, sets `ciStatus: 'timeout'` and routes to cleanup with `mergeVerdict: 'MERGE_BLOCKED'`; (f) increments `ciPollCount` on each poll; (g) uses async `setTimeout` (not busy-loop) for delays; uses `createToolNode('poll-ci', fn)` factory; injectable `ghRunner` and `sleepFn` for testability

- [ ] AC-7: A `squash-merge` node exists that: (a) invokes `gh pr merge {prNumber} --squash --subject "{storyId}: {storyTitle}" --body "{generateQaSummary(qaVerify)}"` via async subprocess; (b) on success, parses the merge commit SHA from `gh pr view {prNumber} --json mergeCommit` and records it in `state.mergeCommitSha`; (c) on `gh` CLI error (including "merge conflict" in stderr), sets `mergeVerdict: 'MERGE_FAIL'` with the error message; (d) on success, sets `mergeVerdict: 'MERGE_COMPLETE'`; uses `createToolNode('squash-merge', fn)` factory; injectable `ghRunner` for testability

- [ ] AC-8: A `cleanup-worktree` node exists that: (a) runs `git worktree remove --force {worktreeDir}` in the main repo directory (not the worktree) via async subprocess; (b) runs `git branch -d {storyBranch}` on the main repo (falls back to `git branch -D` if branch is unmerged due to MERGE_FAIL/BLOCKED path); (c) on any error, records the error via `@repo/logger.warn()` and sets `worktreeCleanedUp: false` — does NOT change `mergeVerdict`; (d) sets `worktreeCleanedUp: true` on success; uses `createToolNode('cleanup-worktree', fn)` factory; injectable `gitRunner` for testability

- [ ] AC-9: An `extract-learnings` node exists that: (a) converts `state.qaVerify.lessons_to_record` array to `Learning[]` format (mapping `category` field to `LearningCategorySchema` values, preserving `lesson` as `content`); (b) appends a `Learning` entry recording the merge verdict and CI duration for operational observability (category: `'pattern'`, content: `"Merge {mergeVerdict} for {storyId}: CI took {ciDuration}ms, {ciPollCount} polls"`); (c) calls `createPersistLearningsNode(config)` from `persist-learnings.ts` with injected KB deps — if `kbWriteBackEnabled: false`, skips KB write and sets `learningsPersisted: false`; (d) sets `learningsPersisted: true` if KB write succeeds for at least one learning; uses `createToolNode('extract-learnings', fn)` factory; runs on ALL terminal paths including MERGE_BLOCKED and MERGE_FAIL

- [ ] AC-10: A `MergeArtifactSchema` Zod schema exists at `packages/backend/orchestrator/src/artifacts/merge.ts` with fields: `schema: z.literal(1)`, `story_id: z.string()`, `timestamp: z.string().datetime()`, `verdict: z.enum(['MERGE_COMPLETE', 'MERGE_FAIL', 'MERGE_BLOCKED'])`, `pr_number: z.number().int().nullable()`, `pr_url: z.string().nullable()`, `merge_commit_sha: z.string().nullable()`, `ci_status: z.enum(['pass', 'fail', 'timeout']).nullable()`, `ci_poll_count: z.number().int().min(0)`, `ci_duration_ms: z.number().int().min(0)`, `rebase_success: z.boolean().nullable()`, `worktree_cleaned_up: z.boolean()`, `learnings_persisted: z.boolean()`, `block_reason: z.string().nullable()`, `error: z.string().nullable()`

- [ ] AC-11: A `write-merge-artifact` node exists that: (a) constructs a `MergeArtifact` object from the current graph state; (b) persists it as `MERGE.yaml` under `plans/future/platform/autonomous-pipeline/in-progress/{storyId}/` using the YAML artifact writer pattern; (c) sets `mergeComplete: true`; (d) runs on ALL terminal paths (MERGE_COMPLETE, MERGE_FAIL, MERGE_BLOCKED); uses `createToolNode('write-merge-artifact', fn)` factory

- [ ] AC-12: The Merge Graph is wired as a `StateGraph` with the following routing: `START → check-preconditions → [rebase-branch (if preconditions pass) | cleanup-worktree (if MERGE_BLOCKED)]`; `rebase-branch → [create-or-update-pr (if rebase success) | cleanup-worktree (if MERGE_BLOCKED)]`; `create-or-update-pr → [poll-ci (if PR created) | cleanup-worktree (if MERGE_FAIL)]`; `poll-ci → [squash-merge (if CI pass) | cleanup-worktree (if MERGE_FAIL or MERGE_BLOCKED)]`; `squash-merge → cleanup-worktree`; `cleanup-worktree → extract-learnings → write-merge-artifact → END`; all conditional edges use Zod-validated routing functions

- [ ] AC-13: A `createMergeGraph(config)` factory function creates and compiles the `StateGraph`. A `runMerge(storyId, qaVerifyOrPath, config)` entry function is exported — it accepts either a pre-loaded `QaVerify` object or a file path string (in which case the graph loads and parses the YAML internally). Returns `MergeGraphResult` with `{ storyId, verdict, prNumber, prUrl, mergeCommitSha, mergeArtifact, durationMs, errors }`. The `config` parameter has defaults for all fields via `MergeGraphConfigSchema`.

- [ ] AC-14: Unit tests exist in `packages/backend/orchestrator/src/graphs/__tests__/merge.test.ts` covering: (a) QA verdict not PASS → `MERGE_BLOCKED` without any `gh` calls, (b) QA artifact missing/invalid → `MERGE_BLOCKED`, (c) `gh auth status` failure → `MERGE_BLOCKED`, (d) rebase conflict → `MERGE_BLOCKED`, cleanup runs, (e) PR creation failure → `MERGE_FAIL`, cleanup runs, (f) CI failure → `MERGE_FAIL`, cleanup runs, (g) CI timeout → `MERGE_BLOCKED`, cleanup runs, (h) squash-merge failure → `MERGE_FAIL`, cleanup runs, (i) happy path: all steps pass → `MERGE_COMPLETE`, cleanup runs, learnings persisted, `MERGE.yaml` written, (j) cleanup failure on happy path → `MERGE_COMPLETE` with `worktreeCleanedUp: false` (warning, not error), (k) `graph.compile()` succeeds, (l) all conditional edges reachable

- [ ] AC-15: Unit tests exist for each node in `packages/backend/orchestrator/src/nodes/merge/__tests__/` covering: `check-preconditions` (QA PASS/FAIL/invalid, gh auth success/failure), `rebase-branch` (success, conflict abort, push failure), `create-or-update-pr` (new PR, existing PR update, gh failure), `poll-ci` (pass on first poll, pass after 3 polls, fail on check conclusion, timeout, exponential back-off verification), `squash-merge` (success with commit SHA, failure), `cleanup-worktree` (success, git error → warning not error), `extract-learnings` (QA lessons extracted and persisted, kbWriteBackEnabled=false skips write, runs on MERGE_BLOCKED path), `write-merge-artifact` (MERGE.yaml written correctly for each verdict)

- [ ] AC-16: The `MergeArtifactSchema` at `packages/backend/orchestrator/src/artifacts/merge.ts` is a new file that does NOT conflict with any existing artifact schema. The `QaVerifySchema` is imported read-only — no modifications.

- [ ] AC-17: Structured logs are emitted via `@repo/logger` for every lifecycle transition: `merge_preconditions_check`, `merge_rebase_started`, `merge_rebase_complete`, `merge_pr_created`, `merge_pr_updated`, `merge_ci_poll` (per poll with `ciPollCount` and `ciStatus`), `merge_ci_complete`, `merge_squash_started`, `merge_squash_complete`, `merge_cleanup_started`, `merge_cleanup_complete`, `merge_learnings_extracted`, `merge_artifact_written` — minimum fields on every event: `storyId`, `stage: 'merge'`, `durationMs`

### Non-Goals

- Implementing the QA Graph (APIP-1060) — the Merge Graph reads the QA artifact as input; it does not implement the QA stage.
- Implementing the supervisor loop dispatch that calls the Merge Graph — that is APIP-0020's responsibility.
- Implementing the Documentation Graph (APIP-1040) — that story runs after merge and is a separate graph.
- Implementing the operator CLI or dashboard visibility for merge results — APIP-5005, APIP-2020.
- Modifying `packages/backend/database-schema/` or `@repo/db` client — protected areas.
- Building the secrets engine (APIP-5004) — Merge Graph reads GitHub token from environment variable; secrets management is APIP-5004's scope.
- Full E2E pipeline testing (story through complete autonomous loop) — APIP-5002.
- Change telemetry instrumentation — APIP-3010.
- Implementing the model router (APIP-0040) — Merge Graph does not make LLM calls; it uses `gh` CLI and `git` as its primary tools.
- Any UI component changes.
- Regular merge strategy — squash-merge is the required strategy; do not implement regular merge or rebase-merge options.

### Reuse Plan

- **Components**: None (no UI).
- **Patterns**: `StateGraph` composition from `elaboration.ts`; `createToolNode('name', fn)` factory for every node; `qaPassedSuccessfully()` + `generateQaSummary()` from `qa-verify.ts`; `createPersistLearningsNode(config)` from `persist-learnings.ts`; injectable `gitRunner` and `ghRunner` config for testability; YAML artifact writer for `MERGE.yaml`; YAML artifact reader for loading `QA-VERIFY.yaml`; async subprocess via `child_process.spawn` (never `execSync`); `Promise.race()` for CI poll timeout enforcement; `@repo/logger` structured logging; Zod-first all schemas; exponential back-off with jitter for CI polling.
- **Packages**: `packages/backend/orchestrator` (entire package — `createToolNode`, graph pattern, `QaVerifySchema`, `qa-verify.ts` helpers, `persist-learnings.ts`, YAML writer/reader, error classification, `@repo/logger`).

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply (`frontend_impacted: false`). The Merge Graph is invisible to end users.
- **No UAT**: Internal pipeline tooling — ADR-005 real-service UAT requirement does not apply to this story's own test plan.
- **Two test tiers required**:
  - *Unit tests* (Vitest, injectable runners): Mock `gitRunner` (for `git` commands) and `ghRunner` (for `gh` CLI calls) throughout. Mock `persistLearnings` for the `extract-learnings` node. Cover all verdict paths (MERGE_COMPLETE, MERGE_FAIL, MERGE_BLOCKED) and all error sub-paths (rebase conflict, PR failure, CI failure, CI timeout, squash failure, cleanup failure). The `poll-ci` node requires careful testing of the exponential back-off logic — verify that polling intervals increase correctly and jitter is within bounds.
  - *Graph compilation tests* (Vitest, real LangGraph `graph.compile()`): Verify `graph.compile()` succeeds; verify all conditional edges are reachable from `START`; mock all node implementations to test routing without real `gh` CLI or git calls.
- **Critical test: cleanup on all paths**: Every test scenario (including MERGE_BLOCKED from preconditions failure) must verify that `cleanup-worktree` and `write-merge-artifact` nodes are reached. This is the most important correctness invariant — dangling worktrees are an operational hazard.
- **CI polling back-off test**: Must verify the exponential back-off schedule: poll 1 at `ciPollIntervalMs`, poll 2 at `ciPollIntervalMs * 2`, poll N at `min(ciPollIntervalMs * 2^(N-1), ciPollMaxIntervalMs)`. Use injectable `sleepFn` in the `poll-ci` node to mock `setTimeout` and verify the schedule without actually sleeping.
- **Suggested coverage targets**: >85% branch coverage on each node file; 100% branch coverage on `check-preconditions` (it is the critical safety gate); >80% on `merge.ts` graph routing logic.

### For UI/UX Advisor

- No UI impact for this story. The Merge Graph is a headless pipeline process.
- The `MERGE.yaml` artifact written to the filesystem is the primary operator-readable output before APIP-5005 CLI is built. Ensure all string fields are human-readable and actionable:
  - `verdict` must be one of `MERGE_COMPLETE`, `MERGE_FAIL`, `MERGE_BLOCKED` (uppercase, not lowercase) — operator and downstream stories depend on exact string matching.
  - `block_reason` should be a complete actionable sentence: "Rebase conflict on src/foo.ts — manual intervention required" not just "Rebase failed".
  - `pr_url` should be a full GitHub URL that an operator can open directly.
- The PR description template should be human-readable first and machine-parseable second — an operator reviewing the PR before merge should immediately understand what the story changed and what QA verified.

### For Dev Feasibility

- **File placement decision**:
  - New artifact: `packages/backend/orchestrator/src/artifacts/merge.ts` (`MergeArtifactSchema`, `createMergeArtifact()` helper).
  - New graph: `packages/backend/orchestrator/src/graphs/merge.ts` (graph entry: `createMergeGraph()`, `runMerge()`).
  - New nodes directory: `packages/backend/orchestrator/src/nodes/merge/` with individual files: `check-preconditions.ts`, `rebase-branch.ts`, `create-or-update-pr.ts`, `poll-ci.ts`, `squash-merge.ts`, `cleanup-worktree.ts`, `extract-learnings.ts`, `write-merge-artifact.ts`.
  - Tests: `packages/backend/orchestrator/src/nodes/merge/__tests__/` (per-node) and `packages/backend/orchestrator/src/graphs/__tests__/merge.test.ts` (graph-level).
- **`gh` CLI subprocess pattern**: Use Node.js `child_process.spawn` (not `execSync`) for all `gh` and `git` invocations. Pattern: `const proc = spawn('gh', ['pr', 'create', ...args], { cwd: mainRepoDir, env: { ...process.env, GH_TOKEN: config.ghToken ?? process.env.GH_TOKEN } }); await Promise.race([exitPromise, timeoutPromise])`. Capture all stdout/stderr. Injectable `ghRunner?: (args: string[], opts: SpawnOptions) => Promise<{exitCode: number; stdout: string; stderr: string}>` at node construction time.
- **CI polling implementation approach**: The `poll-ci` node needs to be a long-running async operation that loops internally (not via LangGraph conditional edges) to avoid excessive checkpoint writes on every poll iteration. Implement as a single node that loops internally until CI resolves or timeout is hit, emitting `@repo/logger` events per poll. LangGraph checkpoints after the node completes (pass, fail, or timeout), not after every poll.
- **Learnings extraction from QA artifact**: `state.qaVerify.lessons_to_record` is an array of `{ lesson: string, category: enum, tags: string[] }`. The `extract-learnings` node maps this to `Learning[]`: `{ content: lesson, category: category, storyId: config.storyId }`. The category mapping between `QaVerifySchema`'s `z.enum(['blocker', 'pattern', 'time_sink', 'reuse', 'anti_pattern'])` and `LearningCategorySchema`'s `z.enum(['blocker', 'pattern', 'time-sink', 'reuse', 'architecture', 'testing', 'tooling'])` needs a translation step (`time_sink` → `time-sink`, `anti_pattern` → `pattern`).
- **Risk: APIP-0020 supervisor dispatch contract**: The `runMerge()` entry function signature must be agreed with APIP-0020 before implementation. Recommend: `runMerge(storyId: string, qaVerifyOrPath: QaVerify | string, config: Partial<MergeGraphConfig>)`. This allows the supervisor to pass either a pre-loaded `QaVerify` or just the file path (supervisor knows the story feature directory).
- **Risk: Main branch advancement during CI polling**: If the main branch advances while CI is still running (another story merged), the PR's CI checks may go stale or fail. The `poll-ci` node should detect if CI checks become stale and trigger a re-run of the rebase + push cycle — but this is complex and should be documented as a known limitation for Phase 1 rather than implemented upfront.
- **Canonical references for subtask decomposition**:
  - Graph structure to replicate: `packages/backend/orchestrator/src/graphs/elaboration.ts`
  - Node factory to use: `packages/backend/orchestrator/src/runner/node-factory.ts`
  - Learnings persistence to reuse (not reimplement): `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts`
  - Primary input artifact contract: `packages/backend/orchestrator/src/artifacts/qa-verify.ts`
  - YAML write pattern: `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts`
  - YAML read pattern: `packages/backend/orchestrator/src/persistence/yaml-artifact-reader.ts`
  - Graph test pattern to follow: `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts`
