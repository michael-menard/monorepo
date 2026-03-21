---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: PIPE-3010

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file provided. Codebase scanning used as primary source of truth.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `createExecuteNode` (stub) | `packages/backend/orchestrator/src/graphs/dev-implement.ts:302` | STUB — returns `executeComplete: true` with a WINT-9070 warning; no LLM invocation occurs |
| `IModelDispatch` interface | `packages/backend/orchestrator/src/pipeline/i-model-dispatch.ts` | Implemented — injectable dispatch boundary; `dispatch({ storyId, attemptNumber, prompt })` |
| `createChangeLoopNode` | `packages/backend/orchestrator/src/nodes/change-loop.ts` | Implemented — full dispatch → code-gen → micro-verify → atomic commit loop using `IModelDispatch` |
| `ModelRouter` / `ModelRouterFactory` | `packages/backend/orchestrator/src/models/unified-interface.ts` | Implemented — tier-based model selection, Sonnet/Opus escalation, `selectModelForAgent()` |
| `createLLMPoweredNode` / `LLMRunnableConfig` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Implemented — hybrid Ollama/Claude node factory |
| `codeReviewLintNode` | `packages/backend/orchestrator/src/nodes/llm/code-review-lint.ts` | Implemented example of LLM node — Ollama direct, Claude deferred `pendingClaudeCall` pattern |
| Evidence schema | `packages/backend/orchestrator/src/artifacts/evidence.ts` | Implemented — `EvidenceSchema`, `createEvidence`, `addTouchedFile`; currently writing stub evidence only |
| `createCollectEvidenceNode` (stub) | `packages/backend/orchestrator/src/graphs/dev-implement.ts:353` | STUB — saves a stub proof referencing "WINT-9080", not real implementation evidence |
| `DevImplementStateAnnotation` | `packages/backend/orchestrator/src/graphs/dev-implement.ts:76` | Implemented — includes `modelTier`, `iterationCount`, `maxIterations`, `shouldEscalate()` logic |
| `shouldEscalate()` | `packages/backend/orchestrator/src/graphs/dev-implement.ts:178` | Implemented — returns `proceed`, `escalate_to_opus`, or `abort_to_blocked` based on iteration count |
| `ChangeSpec` / `change-loop` | `packages/backend/orchestrator/src/nodes/change-loop.ts` | Implemented — per-ChangeSpec dispatch, `applyCodeGenOutput`, `runMicroVerify`, `gitCommit` |
| `runMicroVerify` | `packages/backend/orchestrator/src/nodes/change-loop.ts:161` | Implemented — `pnpm check-types --filter <pkg>` + `pnpm test --filter <pkg>` |
| Worktree state in `dev-implement.ts` | `packages/backend/orchestrator/src/graphs/dev-implement.ts` | MISSING — `DevImplementStateAnnotation` has no `worktreePath` field; the execute node has nowhere to apply file changes |

### Active In-Progress Work

| Story | Title | Overlap |
|-------|-------|---------|
| PIPE-3020 | Worktree Isolation for elab-story.ts | Sibling story — wires worktree lifecycle for `elab-story.ts`. PIPE-3010 is strictly `dev-implement.ts`. Do NOT touch `elab-story.ts`. |
| PIPE-2010 | Unified BullMQ Job Payload Schema | `worktreePath` field in BullMQ payload must be a real path post-PIPE-3010 (downstream effect) |

### Constraints to Respect

- `dev-implement.ts` already has `iterationCount`, `maxIterations`, and `modelTier` state fields — the escalation logic is partially scaffolded; this story completes it
- `shouldEscalate()` is already exported and tested — use it, do not replace it
- `IModelDispatch` is the canonical injection boundary — do not call LLM providers directly from the node; inject via `DevImplementConfig`
- `createChangeLoopNode` already handles dispatch → file-write → micro-verify → git commit — this execute node should coordinate that loop, not duplicate it
- The stub `collect_evidence` node references `WINT-9080` — real evidence collection is part of this story's scope (real touched files, real commands)
- `wint.*` schema references must NOT be introduced; use `PIPE-3010` in comments

---

## Retrieved Context

### Related Endpoints

None — this is a backend orchestrator-only story. No HTTP endpoints are involved.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `createExecuteNode` | `packages/backend/orchestrator/src/graphs/dev-implement.ts:302` | Primary target: replace stub implementation |
| `createCollectEvidenceNode` | `packages/backend/orchestrator/src/graphs/dev-implement.ts:353` | Secondary target: replace stub with real evidence from execute output |
| `DevImplementStateAnnotation` | `packages/backend/orchestrator/src/graphs/dev-implement.ts:76` | Must be extended with `worktreePath`, `changeSpecs`, `currentChangeIndex`, `completedChanges`, `changeLoopStatus` |
| `DevImplementConfigSchema` | `packages/backend/orchestrator/src/graphs/dev-implement.ts:28` | Must be extended with `modelDispatch` (injectable `IModelDispatch`) |
| `createChangeLoopNode` | `packages/backend/orchestrator/src/nodes/change-loop.ts` | Reuse directly — it handles the inner dispatch/verify/commit loop |
| `IModelDispatch` | `packages/backend/orchestrator/src/pipeline/i-model-dispatch.ts` | Injectable boundary for model calls in the change loop |
| `ModelRouter` / `selectModelForAgent` | `packages/backend/orchestrator/src/models/unified-interface.ts` | Used at runtime to resolve the model; injected at construction or resolved inside execute node |
| `shouldEscalate` | `packages/backend/orchestrator/src/graphs/dev-implement.ts:178` | Re-use: drives routing after execute completes/fails |

### Reuse Candidates

| Component | How to Reuse |
|-----------|-------------|
| `createChangeLoopNode` | Execute node coordinates the change loop by delegating to this node for each ChangeSpec |
| `IModelDispatch` | Inject via `DevImplementConfig.modelDispatch`; used by change-loop node |
| `shouldEscalate` | Use in `afterExecute` conditional edge to drive Sonnet → Opus → blocked escalation |
| `runMicroVerify` | Already called inside change-loop; no re-invocation needed at execute level |
| `createEvidence` / `addTouchedFile` | Replace stub in `createCollectEvidenceNode` with real file list from `completedChanges` |
| `CommitRecordSchema` from `implementation.ts` | `completedChanges` array type — reuse for state field definition |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Change-loop dispatch → micro-verify → git commit (injectable `IModelDispatch`) | `packages/backend/orchestrator/src/nodes/change-loop.ts` | Canonical pattern for the inner execute loop; execute node delegates here |
| LLM-powered node (Ollama direct, Claude deferred `pendingClaudeCall`) | `packages/backend/orchestrator/src/nodes/llm/code-review-lint.ts` | Shows how to dispatch to LLM and handle Ollama vs Claude branching |
| Tier-based model selection and escalation (`ModelRouter.selectModelForAgent`) | `packages/backend/orchestrator/src/models/unified-interface.ts` | Shows how Sonnet→Opus escalation is resolved; `shouldEscalate` in dev-implement mirrors this |
| Dev-implement graph structure (state annotation, node wiring, tests) | `packages/backend/orchestrator/src/graphs/__tests__/dev-implement.test.ts` | Test structure to mirror for new execute node tests; mocking pattern for `IModelDispatch` |

---

## Knowledge Context

### Lessons Learned

No KB lesson entries loaded (no baseline provided). Lessons drawn from codebase patterns:

- **[APIP-1032]** IModelDispatch injection pattern avoids hardcoded model calls and enables unit testing without real model endpoints. *Applies because*: execute node must call a model; injection keeps the graph testable.
- **[APIP-1032]** `createChangeLoopNode` is already the canonical per-ChangeSpec loop; do NOT reimplement micro-verify or git commit logic at the execute node level. *Applies because*: the execute node is at a higher level of abstraction than the change loop.
- **[WINT-9060/PIPE-3020]** Stub warnings using old story IDs pollute logs and must be removed when implementing the real node. *Applies because*: `createExecuteNode` currently emits a `WINT-9070` stub warning — this must be removed.

### Blockers to Avoid

- **Missing `worktreePath` in state**: `DevImplementStateAnnotation` currently has no worktree path field. The execute node cannot apply file changes without it. This field must be added before the change loop can run.
- **Stub `collect_evidence` confusing review pipeline**: The current stub evidence (`WINT-9080` stub, path `stub`) will cause the code review node to operate on phantom data. Real evidence must record real `completedChanges`.
- **`shouldEscalate` bypassed**: The state fields `iterationCount`, `maxIterations`, and `modelTier` exist but are not wired to any real retry/escalation logic. `afterExecute` must use `shouldEscalate` to route properly.
- **No ChangeSpec source**: The execute node needs a plan with `ChangeSpec[]`; the `load_plan` node loads from `workflowRepo.getLatestPlan()`. If no plan exists, the execute node must handle gracefully (empty spec list).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR (d0b64e4d) | Injectable gitRunner over execSync | All git-invoking code must use injectable spawn-based runner — applies to `runMicroVerify` and git commits inside change-loop |
| ARCH-001 | Spawn pattern | All subprocess invocations use `child_process.spawn` wrapped in Promise — no `execSync`, no `execa` |
| ARCH-002 | Exported conditional edges | All conditional edge functions must be exported for test access — `afterExecute` must be exported |
| ARCH-004 | IModelDispatch injection | Model dispatch is injectable via config — execute node must not hard-wire model calls |

### Patterns to Follow

- Zod-first types for all new schemas (no TypeScript interfaces)
- `z.infer<typeof Schema>` for all type derivations
- Injectable model dispatch via `DevImplementConfig` (parallel to how `change-loop.ts` uses `IModelDispatch`)
- Warn-only error handling for non-critical failures (evidence save failure should not abort)
- Structured log events: `execute_started`, `execute_complete`, `execute_escalate` with `storyId`, `durationMs`, `modelTier`
- No barrel files
- No `console.log` — use `@repo/logger`

### Patterns to Avoid

- Do NOT call `ModelRouter` directly inside the execute node — dispatch to `IModelDispatch` instead
- Do NOT duplicate `runMicroVerify` or git commit logic — delegate to `createChangeLoopNode`
- Do NOT use `WINT-*` references in new code — use `PIPE-3010`
- Do NOT write to `wint.*` schema tables for any tracking

---

## Conflict Analysis

### Conflict: Scope gap — worktreePath missing from DevImplementState
- **Severity**: warning
- **Description**: `DevImplementStateAnnotation` has no `worktreePath` field. The `createChangeLoopNode` requires a `worktreePath` to apply file changes. Without it, the change loop aborts immediately with `"No worktree path in state"`. This story must either add `worktreePath` to state or document how the worktree is provisioned before execute runs.
- **Resolution Hint**: Add `worktreePath: Annotation<string | null>` to `DevImplementStateAnnotation`. Populate it from the initialize node or a new worktree-setup step before execute. Alternatively, scope this story to call the change loop with a configurable worktree base dir from `DevImplementConfig`.

---

## Story Seed

### Title
Wire Execute Node to LLM Invocation in dev-implement.ts

### Description

**Context**: `dev-implement.ts` is the LangGraph graph that drives autonomous story implementation. It has a complete graph topology (`initialize → load_plan → execute → review_subgraph → collect_evidence → save_to_db → complete`) and a working state annotation that includes model escalation fields (`modelTier`, `iterationCount`, `maxIterations`, `shouldEscalate`). However, `createExecuteNode` is a one-line stub that sets `executeComplete: true` and emits a `WINT-9070` warning. The change-loop node (`createChangeLoopNode`) is fully implemented and handles per-ChangeSpec dispatch → code-gen → micro-verify → atomic git commit via an injectable `IModelDispatch`. The graph is fully wired but the execute node does none of the actual work.

**Problem**: Every story routed through `dev-implement.ts` currently produces no code changes. The stub execute node immediately marks execution complete with no file changes, no model calls, and no real evidence. The stub `collect_evidence` node saves a fake proof with path `"stub"` that will mislead the review phase.

**Proposed Solution**: Replace `createExecuteNode` with a real implementation that:
1. Reads `changeSpecs` from loaded plan content (or parses from `planContent`)
2. Invokes `createChangeLoopNode` iteratively for each spec via injectable `IModelDispatch`
3. Records `completedChanges` in state (using the existing `CommitRecord` schema from `implementation.ts`)
4. Uses `shouldEscalate()` to drive model tier escalation between retry iterations
5. Populates `worktreePath` in state from `DevImplementConfig.worktreePath` (already exists as config field)

Replace `createCollectEvidenceNode` stub with a real implementation that builds evidence from the `completedChanges` array.

### Initial Acceptance Criteria

- [ ] **AC-1**: `createExecuteNode` invokes `IModelDispatch` (injected via `DevImplementConfig`) for each `ChangeSpec` from the loaded plan. When no `modelDispatch` is configured, emits a warning and returns `executeComplete: true` with an empty `completedChanges` list (graceful degradation).

- [ ] **AC-2**: `createExecuteNode` delegates the per-ChangeSpec loop to `createChangeLoopNode`, providing `worktreePath` from `DevImplementConfig.worktreePath`. Each ChangeSpec is processed with dispatch → code-gen → micro-verify → atomic git commit.

- [ ] **AC-3**: `createExecuteNode` uses `shouldEscalate(state)` to determine when to escalate from `sonnet` → `opus` → `blocked`. The `iterationCount`, `maxIterations`, and `modelTier` fields in state reflect real execution state, not defaults.

- [ ] **AC-4**: `createCollectEvidenceNode` is replaced with a real implementation that builds an `Evidence` record from `state.completedChanges` (touched files, commit SHAs, commands run). The stub path `"stub"` and `"WINT-9080"` reference are removed.

- [ ] **AC-5**: The `WINT-9070` stub warning string is removed from `createExecuteNode`. Comments reference `PIPE-3010` instead.

- [ ] **AC-6**: `DevImplementStateAnnotation` is extended with `worktreePath: Annotation<string | null>`, `changeSpecs: Annotation<ChangeSpec[]>`, `currentChangeIndex: Annotation<number>`, `completedChanges: Annotation<CommitRecord[]>`, and `changeLoopStatus: Annotation<ChangeLoopStatus | null>` to support the change loop.

- [ ] **AC-7**: `DevImplementConfigSchema` is extended with `modelDispatch: z.custom<IModelDispatch>().optional()` to support injection.

- [ ] **AC-8**: All conditional edge functions remain exported for test access (ARCH-002). `afterExecute` routes to `review_subgraph` on success, `collect_evidence` on skip-review, and handles escalation routing if `shouldEscalate` returns `abort_to_blocked`.

- [ ] **AC-9**: Unit tests cover: stub graceful degradation (no modelDispatch), successful execute with mock `IModelDispatch`, escalation routing via `shouldEscalate`, evidence collection from `completedChanges`.

- [ ] **AC-10**: `pnpm test --filter @repo/orchestrator` passes with zero regressions. `pnpm check-types` passes with zero errors.

### Non-Goals

- Do NOT modify `elab-story.ts` — that is PIPE-3020's scope
- Do NOT implement the worktree lifecycle (create/teardown) within dev-implement.ts — the `worktreePath` config field already exists; this story uses it but does not add worktree create/delete logic
- Do NOT change the graph topology (node names, edge names) of `dev-implement.ts` — only replace node factory implementations and extend state/config schemas
- Do NOT implement BullMQ integration — out of scope
- Do NOT change `WorkflowRepository` or `StoryRepository` interfaces
- Do NOT introduce `wint.*` schema references
- Do NOT create barrel files

### Reuse Plan

- **Components**: `createChangeLoopNode` (delegate per-ChangeSpec loop), `shouldEscalate` (escalation routing), `IModelDispatch` (injectable boundary), `createEvidence`/`addTouchedFile` (build real evidence), `CommitRecordSchema` (type `completedChanges`)
- **Patterns**: Injection via config (`DevImplementConfig.modelDispatch`), Zod-first state extension, exported conditional edges, spawn-based subprocess for micro-verify (already in `change-loop.ts`)
- **Packages**: `@repo/orchestrator` (primary), `@repo/logger` (structured logging)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a backend-only orchestrator story. No HTTP endpoints, no UI. Test strategy should cover:

- Unit tests for `createExecuteNode` with injectable `IModelDispatch` mock (`vi.fn()`) — mock should follow the same pattern as `dev-implement.test.ts`'s existing mock for `review.ts`
- Unit tests for `createCollectEvidenceNode` building evidence from `completedChanges`
- The `createChangeLoopNode` is already tested in `change-loop.test.ts` — do NOT re-test it; only test that `createExecuteNode` correctly delegates to it
- `afterExecute` conditional edge function must be tested for all three routing outcomes: `review_subgraph`, `collect_evidence`, `complete` (via escalation abort)
- Integration test: invoke `runDevImplement` with a mock `IModelDispatch` that returns a successful dispatch; verify `executeComplete === true`, `completedChanges` has one entry, evidence recorded

### For UI/UX Advisor

Not applicable — this story has no UI surface. Mark N/A.

### For Dev Feasibility

Key feasibility risks and constraints:

1. **State annotation extension**: `DevImplementStateAnnotation` currently uses `iterationCount`/`maxIterations`/`modelTier` but NOT the change-loop fields (`changeSpecs`, `currentChangeIndex`, `completedChanges`, `changeLoopStatus`). These must be added. Check for any downstream consumers of the state type that might break.

2. **ChangeSpec source from planContent**: `planContent` is typed as `unknown` (loaded from DB). A parsing step is needed to extract `ChangeSpec[]` from `planContent`. The `ChangeSpec` schema is in `packages/backend/orchestrator/src/graphs/change-spec-schema.ts`. Plan content format should be validated with Zod before use; parse errors should result in `executeComplete: true` with an empty change list plus a warning.

3. **worktreePath provisioning**: `DevImplementConfig.worktreePath` defaults to `/tmp/worktrees`. The execute node should derive the story-specific path as `path.join(config.worktreePath, storyId)`. This is consistent with the pattern in `elab-story.ts`. No git worktree lifecycle is needed here — this story assumes the worktree already exists at the derived path (or creates it inline if necessary for a complete end-to-end flow).

4. **Escalation wiring**: `shouldEscalate` returns `'proceed' | 'escalate_to_opus' | 'abort_to_blocked'`. The execute loop must update `iterationCount` and `modelTier` in state between iterations. The `afterExecute` conditional edge must handle the `abort_to_blocked` branch by routing to `complete` with `workflowSuccess: false`.

5. **Canonical references for subtask decomposition**:
   - Read `change-loop.ts` before writing any execute node code
   - Read existing `dev-implement.test.ts` before writing any test code
   - The `ImplementationGraphState` in `implementation.ts` shows a more complete state annotation that `dev-implement.ts` should approximate
