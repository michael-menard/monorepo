---
status: ready-to-work
split_from: wrkf-1022
---

# wrkf-1022-A: Core Middleware Infrastructure

## Split Context

This story is a split from wrkf-1022 (Node Middleware Hooks) based on QA Elaboration verdict.

- **Original Story:** wrkf-1022
- **Split Reason:** Story size exceeded threshold (30 ACs after discovery)
- **This Split:** Core middleware infrastructure (types, hooks, composition, integration)
- **Sibling Split:** wrkf-1022-B (Built-in middleware, utilities, testing helpers)

---

## Context

The Node Runner Infrastructure (wrkf-1020) provides a solid foundation for node execution with logging, error handling, and retry logic. However, teams may need to inject custom behavior at various points in the node lifecycle:

- **beforeNode**: Inject context, validate preconditions, set up resources
- **afterNode**: Clean up resources, transform outputs, trigger side effects
- **onError**: Custom error handling, alerting, recovery logic

A middleware/hooks pattern enables this extensibility without modifying the core node factory implementation. This story implements the foundational middleware system; wrkf-1022-B builds on it with built-in middleware and utilities.

---

## Goal

Provide the core middleware infrastructure enabling custom behavior injection at node execution lifecycle points, including typed middleware schemas, hook execution with proper ordering, middleware composition, and integration with the node factory.

---

## Non-Goals

- **NOT** re-implementing the node factory or retry logic (that is wrkf-1020's scope)
- **NOT** implementing built-in middleware (loggingMiddleware, validationMiddleware) — that is wrkf-1022-B
- **NOT** implementing convenience utilities (filterMiddleware, pattern factories) — that is wrkf-1022-B
- **NOT** implementing testing utilities — that is wrkf-1022-B
- **NOT** implementing async middleware chains (hooks CAN be async functions returning Promises, but are NOT chained via next() callbacks like Express/Koa)
- **NOT** implementing middleware ordering/priority systems beyond array position

---

## Scope

### Endpoints and Surfaces

**None.** This is a pure TypeScript library extension with no API endpoints.

### Packages/Apps Affected

| Package/App | Change Type |
|-------------|-------------|
| `packages/backend/orchestrator` | MODIFY — Add `src/runner/middleware/` module |
| `packages/backend/orchestrator` | MODIFY — Integrate middleware support into node factory |

---

## Acceptance Criteria

### Core Middleware Types

- [ ] **AC-1:** `NodeMiddleware` Zod schema/type defines the middleware interface with optional `name`, `shouldRun`, `beforeNode`, `afterNode`, and `onError` fields
- [ ] **AC-2:** `beforeNode(state, config, nodeName, ctx): Promise<GraphState | void>` hook signature — called before node execution; can modify state or abort
- [ ] **AC-3:** `afterNode(state, result, config, nodeName, ctx): Promise<Partial<GraphState> | void>` hook signature — called after successful execution; can modify result
- [ ] **AC-4:** `onError(error, state, config, nodeName, ctx): Promise<NodeError | void>` hook signature — called on node failure; can transform or suppress error

### Node Factory Integration

- [ ] **AC-5:** Node factory (`createNode()`) accepts optional `middleware` array in config
- [ ] **AC-6:** Multiple middleware are executed in order: beforeNode (first→last), afterNode (last→first), onError (first→last)
- [ ] **AC-7:** Middleware is optional — nodes work without middleware configured (backward compatible)

### Hook Behavior

- [ ] **AC-8:** If `beforeNode` returns a state object, that state is passed to the node (allows state transformation)
- [ ] **AC-9:** If `beforeNode` throws, node execution is skipped and error is captured in state.errors
- [ ] **AC-10:** If `afterNode` returns a partial state, it is merged with the node's result
- [ ] **AC-11:** If `onError` returns void/undefined, the original error is used; if it returns a NodeError, that replaces the original

### Exports

- [ ] **AC-12:** All exports importable from `@repo/orchestrator`:
  ```typescript
  import {
    NodeMiddleware,
    NodeMiddlewareSchema,
    MiddlewareContext,
    MiddlewareContextSchema,
    createNodeMiddleware,
    composeMiddleware,
    MiddlewareValidationError,
  } from '@repo/orchestrator'
  ```

### Testing

- [ ] **AC-13:** Unit tests cover all hook types, ordering, and error scenarios with **80%+ coverage for `src/runner/middleware/`**
- [ ] **AC-14:** Integration test verifies middleware executes during actual node execution via createNode()

### Context Sharing

- [ ] **AC-15:** Hooks receive a mutable `ctx: MiddlewareContext` object (typed as `Record<string, unknown>`) that persists across beforeNode→afterNode→onError for a single node execution, enabling data sharing between hooks

### Conditional Execution

- [ ] **AC-16:** Middleware can define optional `shouldRun(state: GraphState, nodeName: string): boolean | Promise<boolean>` predicate; if present and returns/resolves to `false`, middleware is skipped for that node

### Type Safety

- [ ] **AC-17:** Node config parameter uses `NodeConfigSchema` base schema (from wrkf-1020) instead of `z.any()` for type safety; generic type parameter allows extension

### Validation

- [ ] **AC-18:** `composeMiddleware()` validates all middleware against `NodeMiddlewareSchema` and throws `MiddlewareValidationError` with descriptive message if invalid

### Observability

- [ ] **AC-19:** Middleware execution logs at debug level via `@repo/logger` including middleware name (or "anonymous" if not named) and node name

### State Protection

- [ ] **AC-20:** State passed to hooks is deep-cloned via `structuredClone()` before invocation to prevent accidental mutation; original state is preserved

### shouldRun Error Handling

- [ ] **AC-21:** If `shouldRun` throws or rejects, the error is logged at warn level, the middleware is skipped, and node execution proceeds normally

### shouldRun Evaluation Timing

- [ ] **AC-22:** `shouldRun` receives the state AFTER previous middleware's `beforeNode` hooks have executed (not the original pre-middleware state)

### Retry Behavior

- [ ] **AC-23:** When a node retries via wrkf-1020's retry logic, middleware hooks execute on EACH retry attempt (not just the first)

### Async shouldRun

- [ ] **AC-24:** `shouldRun` can return `Promise<boolean>` for async predicates; the middleware system awaits the result before deciding to execute

---

## Reuse Plan

### Existing Packages to Reuse

| Package | Usage |
|---------|-------|
| `zod` | Schema definitions for NodeMiddleware, MiddlewareContext |
| `@repo/logger` | Middleware execution logging |
| `@repo/orchestrator` (wrkf-1010) | GraphStateSchema, NodeErrorSchema |
| `@repo/orchestrator` (wrkf-1020) | NodeConfigSchema, createNode() factory |

### Patterns to Adapt

Express.js/Koa middleware patterns provide inspiration:
- Ordered execution (beforeNode first→last, afterNode last→first)
- Ability to short-circuit (beforeNode can abort)
- Error handling hooks (onError)

Adapt for LangGraph node context (state-based, not request/response).

### New Shared Code Created

| Export | Purpose | Consumers |
|--------|---------|-----------|
| `NodeMiddleware` | Type for middleware definition | All middleware implementations |
| `NodeMiddlewareSchema` | Zod schema for middleware validation | composeMiddleware, registration |
| `MiddlewareContext` | Type for ctx object | Hook implementations |
| `MiddlewareContextSchema` | Zod schema for ctx | Validation |
| `createNodeMiddleware()` | Helper to create typed middleware | Middleware authors |
| `composeMiddleware()` | Combines multiple middleware into one | Node configuration |
| `MiddlewareValidationError` | Error class for invalid middleware | Error handling |

### Prohibited Patterns

- No `console.log` — use `@repo/logger`
- No TypeScript interfaces without Zod schemas
- No barrel files beyond single `index.ts` export per module

---

## Architecture Notes (Ports & Adapters)

### Package Structure Addition

```
packages/backend/orchestrator/src/runner/
├── middleware/
│   ├── index.ts                      # CREATE — middleware module exports
│   ├── types.ts                      # CREATE — NodeMiddleware schema and types
│   ├── compose.ts                    # CREATE — composeMiddleware() helper
│   ├── executor.ts                   # CREATE — middleware execution logic
│   └── __tests__/
│       ├── types.test.ts             # CREATE — schema tests
│       ├── compose.test.ts           # CREATE — compose tests
│       ├── executor.test.ts          # CREATE — execution tests
│       └── integration.test.ts       # CREATE — node factory integration
```

### Middleware Interface

```typescript
import { z } from 'zod'
import { GraphStateSchema, NodeConfigSchema, NodeErrorSchema } from '../state'

// Context object shared across hooks for single execution
export const MiddlewareContextSchema = z.record(z.string(), z.unknown())
export type MiddlewareContext = z.infer<typeof MiddlewareContextSchema>

export const NodeMiddlewareSchema = z.object({
  name: z.string().optional(),
  shouldRun: z.function()
    .args(GraphStateSchema, z.string())
    .returns(z.union([z.boolean(), z.promise(z.boolean())]))
    .optional(),
  beforeNode: z.function()
    .args(GraphStateSchema, NodeConfigSchema, z.string(), MiddlewareContextSchema)
    .returns(z.promise(GraphStateSchema.optional()))
    .optional(),
  afterNode: z.function()
    .args(GraphStateSchema, GraphStateSchema.partial(), NodeConfigSchema, z.string(), MiddlewareContextSchema)
    .returns(z.promise(GraphStateSchema.partial().optional()))
    .optional(),
  onError: z.function()
    .args(z.unknown(), GraphStateSchema, NodeConfigSchema, z.string(), MiddlewareContextSchema)
    .returns(z.promise(NodeErrorSchema.optional()))
    .optional(),
})

export type NodeMiddleware = z.infer<typeof NodeMiddlewareSchema>
```

### Integration Point

The `createNode()` factory accepts an optional `middleware` array:

```typescript
const node = createNode({
  name: 'my-node',
  middleware: [myMiddleware],
}, async (state) => { ... })
```

### State Cloning Strategy

To prevent accidental mutation (AC-20):
```typescript
// Deep clone using structuredClone (Node 17+)
const clonedState = structuredClone(state)
```

### Middleware Execution Flow

```
Node Execution:
1. For each middleware (first → last):
   a. Evaluate shouldRun(state, nodeName)
   b. If false or throws: skip this middleware
   c. If true: call beforeNode(state, config, nodeName, ctx)
   d. If beforeNode returns state: use that state going forward

2. Execute node with (potentially modified) state

3. For each middleware (last → first):
   a. Call afterNode(originalState, result, config, nodeName, ctx)
   b. Merge any partial result returned

4. On error, for each middleware (first → last):
   a. Call onError(error, state, config, nodeName, ctx)
   b. Use returned NodeError if provided
```

---

## Required Vercel / Infra Notes

**None.** This is a pure TypeScript library package with no deployment requirements.

---

## HTTP Contract Plan

**Not applicable.** This story does not expose or consume any HTTP endpoints.

---

## Seed Requirements

**Not applicable.** No database entities or seed data required.

---

## Test Plan (Happy Path / Error Cases / Edge Cases)

*Synthesized from `_pm/TEST-PLAN.md`*

### Happy Path Tests

| ID | Test Description | Expected Outcome | Evidence |
|----|------------------|------------------|----------|
| HP-1 | Create middleware with all hooks defined | Middleware validates against schema | Test output |
| HP-2 | Create middleware with only beforeNode | Other hooks are undefined | Test output |
| HP-3 | Create middleware with only afterNode | Other hooks are undefined | Test output |
| HP-4 | Create middleware with only onError | Other hooks are undefined | Test output |
| HP-5 | beforeNode modifies state before execution | Node receives modified state | Test output |
| HP-6 | afterNode modifies result after execution | Final result includes changes | Test output |
| HP-7 | onError transforms error | Transformed error in state.errors | Test output |
| HP-8 | Multiple middleware execute in correct order | beforeNode: first→last, afterNode: last→first | Test output |
| HP-9 | Node works with empty middleware array | Executes normally | Test output |
| HP-10 | Node works without middleware config | Executes normally (backward compatible) | Test output |
| HP-11 | composeMiddleware combines multiple | Single composed middleware | Test output |
| HP-12 | ctx object persists across hooks | Data shared between beforeNode and afterNode | Test output |
| HP-13 | shouldRun returns false skips middleware | Hooks not called | Test output |
| HP-14 | Async shouldRun resolves to false | Middleware skipped | Test output |
| HP-15 | Middleware logs at debug level | @repo/logger called | Test mock assertions |
| HP-16 | State is deep-cloned before hooks | Original state unchanged | Test output |
| HP-17 | Import all exports from @repo/orchestrator | Imports resolve | Import test |
| HP-18 | Middleware executes on each retry | Multiple executions on retry | Test output |
| HP-19 | shouldRun receives post-previous-middleware state | State reflects previous changes | Test output |

### Error Cases

| ID | Test Description | Expected Error | Evidence |
|----|------------------|----------------|----------|
| EC-1 | beforeNode throws | Node skipped, error captured | Test output |
| EC-2 | afterNode throws | Error captured, result preserved | Test output |
| EC-3 | onError throws | Original error preserved | Test output |
| EC-4 | composeMiddleware with invalid input | MiddlewareValidationError | Test output |
| EC-5 | composeMiddleware with null in array | MiddlewareValidationError | Test output |
| EC-6 | shouldRun throws | Error logged, middleware skipped | Test output |
| EC-7 | Async shouldRun rejects | Error logged, middleware skipped | Test output |

### Edge Cases

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| EDGE-1 | Middleware with undefined name | Logs as "anonymous" | Test output |
| EDGE-2 | beforeNode returns void | Original state used | Test output |
| EDGE-3 | afterNode returns void | Result unchanged | Test output |
| EDGE-4 | onError returns void | Original error used | Test output |
| EDGE-5 | Array with undefined entries | Skipped gracefully | Test output |
| EDGE-6 | Single middleware in array | Works correctly | Test output |
| EDGE-7 | State mutation in hook | Clone protects original | Test output |
| EDGE-8 | Large state object | structuredClone handles | Test output |
| EDGE-9 | composeMiddleware with empty array | Returns no-op middleware | Test output |

### Evidence Requirements

- [ ] `pnpm build --filter @repo/orchestrator` completes without errors
- [ ] `pnpm check-types --filter @repo/orchestrator` completes without errors
- [ ] `pnpm test --filter @repo/orchestrator` shows all tests passing
- [ ] Test coverage report showing **80%+ for `src/runner/middleware/`**
- [ ] All exports accessible from `@repo/orchestrator`
- [ ] No `console.log` statements (grep verification)

---

## Demo Script

1. `cd /path/to/monorepo`
2. `pnpm build --filter @repo/orchestrator` — Verify build succeeds
3. `pnpm test --filter @repo/orchestrator` — Verify all tests pass
4. `pnpm check-types --filter @repo/orchestrator` — Verify type checking passes
5. Create test file verifying imports and basic usage:
   ```typescript
   import {
     createNode,
     createNodeMiddleware,
     composeMiddleware,
     NodeMiddleware,
     MiddlewareContext,
   } from '@repo/orchestrator'
   import { createInitialState, GraphStateSchema } from '@repo/orchestrator'
   import { z } from 'zod'

   type GraphState = z.infer<typeof GraphStateSchema>

   // Create a simple logging middleware
   const myMiddleware = createNodeMiddleware({
     name: 'my-middleware',
     shouldRun: (state, nodeName) => nodeName === 'my-node',
     beforeNode: async (state, config, nodeName, ctx) => {
       ctx.startTime = Date.now()
       console.log(`[${nodeName}] Starting...`)
       return state
     },
     afterNode: async (state, result, config, nodeName, ctx) => {
       const duration = Date.now() - (ctx.startTime as number)
       console.log(`[${nodeName}] Completed in ${duration}ms`)
       return result
     },
   })

   // Create node with middleware
   const myNode = createNode(
     { name: 'my-node', middleware: [myMiddleware] },
     async (state: GraphState) => {
       return { routingFlags: { ...state.routingFlags, proceed: true } }
     }
   )

   const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1022-A' })
   const result = await myNode(state)
   console.log('Node executed:', result)
   ```
6. Verify test file compiles and runs without errors
7. Verify middleware hooks are called in correct order

---

## Constraints

| Constraint | Value |
|------------|-------|
| Zod version | ^3.x (repo standard) |
| TypeScript strict mode | Required |
| Test framework | Vitest |
| Coverage threshold | 80% for `src/runner/middleware/` |
| Node.js version | 17+ (required for structuredClone) |
| LangGraph version | ^0.2.x (from package.json) |

---

## Risks / Edge Cases

| Risk | Mitigation |
|------|------------|
| Middleware execution overhead | Hooks are optional, minimal overhead when not used |
| Complex debugging with many middleware | AC-19 ensures middleware name logged |
| State mutation in hooks | AC-20 enforces deep clone before hook invocation |
| Invalid middleware registered | AC-18 validates at compose time |
| shouldRun errors blocking execution | AC-21 ensures errors are caught and logged |
| Async shouldRun complexity | AC-24 provides clear async support |

---

## Open Questions

None — all design decisions resolved via QA elaboration.

---

## File Touch List

| Path | Action |
|------|--------|
| `packages/backend/orchestrator/src/runner/middleware/index.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/types.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/compose.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/executor.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/__tests__/types.test.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/__tests__/compose.test.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/__tests__/executor.test.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/__tests__/integration.test.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/node-factory.ts` | MODIFY — add middleware support |
| `packages/backend/orchestrator/src/runner/index.ts` | MODIFY — export middleware |
| `packages/backend/orchestrator/src/index.ts` | MODIFY — re-export middleware |

---

## Token Budget

| Phase | Agent | Est. Tokens | Actual Tokens |
|-------|-------|-------------|---------------|
| Generation | PM | ~4,000 | ~17,199 |
| Elaboration | QA | ~2,000 | ~21,700 |
| Implementation | Dev | ~8,000 | — |
| Verification | QA | ~1,500 | — |

---

## PM Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Use `structuredClone()` for state cloning | Built-in, performant, handles circular refs |
| 2 | Middleware subdirectory under `runner/` | Keeps middleware close to node factory it integrates with |
| 3 | `MiddlewareContext` as `Record<string, unknown>` | Flexible typing, consumers cast as needed |
| 4 | `shouldRun` supports both sync and async | Sync for simple cases, async for database lookups |
| 5 | Ordering: beforeNode first→last, afterNode last→first | Matches Express/Koa patterns (onion model) |
| 6 | Middleware executes on each retry attempt | Hooks may need to run each time (e.g., setup/cleanup) |
| 7 | Built-in middleware deferred to wrkf-1022-B | Keeps core story focused on infrastructure |

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: wrkf-1022.md | input | 17,355 | ~4,339 |
| Read: ELAB-WRKF-1022.md | input | 9,500 | ~2,375 |
| Read: wrkf.stories.index.md | input | 8,424 | ~2,106 |
| Read: wrkf.plan.exec.md | input | 5,312 | ~1,328 |
| Read: wrkf.plan.meta.md | input | 2,904 | ~726 |
| Read: pm.agent.md | input | 1,500 | ~375 |
| Write: TEST-PLAN.md | output | 4,200 | ~1,050 |
| Write: UIUX-NOTES.md | output | 500 | ~125 |
| Write: DEV-FEASIBILITY.md | output | 3,200 | ~800 |
| Write: BLOCKERS.md | output | 900 | ~225 |
| Write: wrkf-1022-A.md | output | 15,000 | ~3,750 |
| **Total Input** | — | ~44,995 | **~11,249** |
| **Total Output** | — | ~23,800 | **~5,950** |

---

*Generated by PM Agent | 2026-01-24*
*Split from wrkf-1022 based on ELAB-WRKF-1022.md SPLIT REQUIRED verdict*

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-24_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No mechanism to disable middleware at runtime (`disabled?: boolean`) | Added as AC | AC-25: disabled field to skip middleware execution |
| 2 | No per-middleware timeout protection | Added as AC | AC-26: Per-middleware timeout configuration option |
| 3 | Unclear if afterNode errors short-circuit chain | Added as AC | AC-27: Errors do NOT short-circuit; subsequent hooks execute |
| 4 | structuredClone limitations not tested (functions throw) | Added as AC | AC-28: Edge case test for non-clonable values |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Middleware metrics/telemetry not captured | Added as AC | AC-29: onMiddlewareMetrics callback option |
| 2 | No priority-based ordering (array position only) | Added as AC | AC-30: Optional priority field (lower = earlier) |
| 3 | No dependency declaration between middleware | Added as AC | AC-31: Optional dependsOn field with validation |

### Follow-up Stories Suggested

None. All findings were added to this story per user decision.

### Items Marked Out-of-Scope

None. User chose to add all findings as new ACs.

---

## New Acceptance Criteria (from QA Discovery)

_PM must add these to the main AC section before implementation_

### Disabled Field

- [ ] **AC-25:** Middleware can define optional `disabled?: boolean` field; if `true`, middleware is skipped entirely (no hooks executed)

### Middleware Timeout

- [ ] **AC-26:** Middleware can define optional `timeoutMs?: number` field; if a hook exceeds this timeout, it is aborted and treated as an error

### Error Chain Behavior

- [ ] **AC-27:** If an `afterNode` hook throws, the error is logged and captured, but subsequent middleware `afterNode` hooks still execute (no short-circuit)

### Non-Clonable State

- [ ] **AC-28:** If state contains non-clonable values (functions, Symbols, etc.), `structuredClone()` throws a descriptive error that includes the middleware name

### Metrics Callback

- [ ] **AC-29:** Middleware can define optional `onMetrics?: (metrics: MiddlewareMetrics) => void` callback; `MiddlewareMetrics` includes `{ middlewareName: string, hookName: string, durationMs: number, success: boolean }`

### Priority Ordering

- [ ] **AC-30:** Middleware can define optional `priority?: number` field; middleware are sorted by priority (lower = earlier) before execution; default priority is `100`

### Dependency Declaration

- [ ] **AC-31:** Middleware can define optional `dependsOn?: string[]` field listing middleware names that must execute before this one; `composeMiddleware()` validates dependencies and throws `MiddlewareDependencyError` if unmet
