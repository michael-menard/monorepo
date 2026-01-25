---
status: ready-to-work
split_from: wrkf-1022
---

# wrkf-1022-B: Middleware Extensions & Utilities

## Split Context

This story is a split from wrkf-1022 (Node Middleware Hooks) based on QA Elaboration verdict.

- **Original Story:** wrkf-1022
- **Split Reason:** Story size exceeded threshold (30 ACs after discovery)
- **This Split:** Built-in middleware, convenience utilities, testing helpers
- **Sibling Split:** wrkf-1022-A (Core middleware infrastructure)

---

## Context

The Core Middleware Infrastructure (wrkf-1022-A) provides the foundational middleware system with types, hooks, composition, and node factory integration. This story builds on that foundation to provide:

- **Built-in middleware** — Production-ready `loggingMiddleware` and `validationMiddleware`
- **Convenience utilities** — `filterMiddleware`, pattern factories (`forNodes`, `whenFlag`)
- **Testing helpers** — `createMockMiddleware` for testing custom middleware
- **Performance options** — `skipClone` configuration for trusted middleware

These utilities reduce boilerplate and provide common patterns for middleware authors.

---

## Goal

Provide production-ready built-in middleware and developer utilities for middleware authoring, including logging/validation middleware, filtering utilities, pattern factories, and testing helpers.

---

## Non-Goals

- **NOT** modifying core middleware types or hooks (that is wrkf-1022-A's scope)
- **NOT** implementing async middleware chains or next() callbacks
- **NOT** implementing advanced composition operators (pipe, parallel) — out of scope per QA
- **NOT** implementing middleware metrics/timing (that is wrkf-1021/wrkf-1023's scope)

---

## Scope

### Endpoints and Surfaces

**None.** This is a pure TypeScript library extension with no API endpoints.

### Packages/Apps Affected

| Package/App | Change Type |
|-------------|-------------|
| `packages/backend/orchestrator` | MODIFY — Add `src/runner/middleware/built-in/` module |
| `packages/backend/orchestrator` | MODIFY — Add `src/runner/middleware/utilities/` module |
| `packages/backend/orchestrator` | MODIFY — Add `skipClone` support to executor |

---

## Acceptance Criteria

### Built-in Middleware

- [ ] **AC-1:** `loggingMiddleware` is exported and logs node entry/exit with timing at info level via `@repo/logger`:
  - Entry log: `[middleware:logging] {nodeName} entering`
  - Exit log: `[middleware:logging] {nodeName} exiting ({duration}ms)`

- [ ] **AC-2:** `validationMiddleware` is exported and validates state against `GraphStateSchema` in `beforeNode`:
  - On valid state: passes through unchanged
  - On invalid state: throws `ZodError` with validation details

### Filter Utility

- [ ] **AC-3:** `filterMiddleware(middlewareArray, predicate)` returns a new array with middleware that don't match the predicate removed:
  - Supports filtering by name: `filterMiddleware(arr, m => m.name !== 'skip-me')`
  - Supports filtering by predicate: `filterMiddleware(arr, m => !m.name?.startsWith('debug-'))`

### Middleware Naming

- [ ] **AC-4:** Anonymous middleware (without explicit `name`) receive auto-generated unique names:
  - Format: `middleware-{counter}` (e.g., `middleware-1`, `middleware-2`)
  - Counter is module-scoped and increments per middleware created
  - Names are assigned during `composeMiddleware()` if not already set

### skipClone Option

- [ ] **AC-5:** `NodeMiddleware` type accepts optional `skipClone: boolean` field:
  - When `true`: State is passed directly to hooks without cloning (performance optimization)
  - When `false` (default): State is deep-cloned before hook invocation (safety)
  - **Warning:** `skipClone: true` should only be used for trusted middleware that won't mutate state

### Pattern Factories

- [ ] **AC-6:** Pattern factories are exported for common middleware patterns:
  - `forNodes(nodes: string | string[], middleware: Partial<NodeMiddleware>)` — Creates middleware that only runs for specified node names
  - `whenFlag(flag: RoutingFlag, middleware: Partial<NodeMiddleware>)` — Creates middleware that only runs when specified routing flag is true

### Testing Utilities

- [ ] **AC-7:** `createMockMiddleware(config?)` is exported for testing:
  - Returns a valid `NodeMiddleware` object with all hooks as jest/vitest mocks
  - Provides `mockMiddleware.calls.beforeNode`, `mockMiddleware.calls.afterNode`, `mockMiddleware.calls.onError` arrays tracking invocations
  - Supports optional config to customize behavior: `{ name?: string, beforeNode?: fn, afterNode?: fn, onError?: fn }`

### Exports

- [ ] **AC-8:** All new exports importable from `@repo/orchestrator`:
  ```typescript
  import {
    // Built-in middleware
    loggingMiddleware,
    validationMiddleware,
    // Utilities
    filterMiddleware,
    forNodes,
    whenFlag,
    // Testing
    createMockMiddleware,
  } from '@repo/orchestrator'
  ```

### Testing

- [ ] **AC-9:** Unit tests cover all built-in middleware and utilities with **80%+ coverage**
- [ ] **AC-10:** Integration test verifies built-in middleware work with `composeMiddleware()` and node execution

---

## Reuse Plan

### Existing Packages to Reuse

| Package | Usage |
|---------|-------|
| `zod` | validationMiddleware uses GraphStateSchema.parse() |
| `@repo/logger` | loggingMiddleware uses logger.info() |
| `@repo/orchestrator` (wrkf-1022-A) | Core middleware types and utilities |
| `@repo/orchestrator` (wrkf-1010) | GraphStateSchema, RoutingFlagSchema |

### New Shared Code Created

| Export | Purpose | Consumers |
|--------|---------|-----------|
| `loggingMiddleware` | Logs node entry/exit with timing | All nodes needing observability |
| `validationMiddleware` | Validates state before node execution | Nodes requiring state validation |
| `filterMiddleware()` | Removes middleware from composed array | Dynamic middleware configuration |
| `forNodes()` | Factory for node-specific middleware | Targeted middleware application |
| `whenFlag()` | Factory for flag-conditional middleware | Feature-flagged middleware |
| `createMockMiddleware()` | Creates mock middleware for testing | Test suites |

### Prohibited Patterns

- No `console.log` — use `@repo/logger`
- No TypeScript interfaces without Zod schemas
- No barrel files beyond single `index.ts` export per module

---

## Architecture Notes (Ports & Adapters)

### Package Structure Addition

```
packages/backend/orchestrator/src/runner/middleware/
├── built-in/
│   ├── index.ts                      # CREATE — built-in middleware exports
│   ├── logging.ts                    # CREATE — loggingMiddleware
│   └── validation.ts                 # CREATE — validationMiddleware
├── utilities/
│   ├── index.ts                      # CREATE — utility exports
│   ├── filter.ts                     # CREATE — filterMiddleware
│   ├── naming.ts                     # CREATE — auto-naming logic
│   ├── factories.ts                  # CREATE — forNodes, whenFlag
│   └── testing.ts                    # CREATE — createMockMiddleware
├── types.ts                          # MODIFY — add skipClone field
├── executor.ts                       # MODIFY — support skipClone
└── __tests__/
    ├── logging.test.ts               # CREATE — logging middleware tests
    ├── validation.test.ts            # CREATE — validation middleware tests
    └── utilities.test.ts             # CREATE — utility tests
```

### Built-in Middleware Implementations

```typescript
// loggingMiddleware
import { logger } from '@repo/logger'
import { createNodeMiddleware } from '../types'

export const loggingMiddleware = createNodeMiddleware({
  name: 'logging',
  beforeNode: async (state, config, nodeName, ctx) => {
    ctx.__loggingStartTime = Date.now()
    logger.info(`[middleware:logging] ${nodeName} entering`)
    return state
  },
  afterNode: async (state, result, config, nodeName, ctx) => {
    const duration = Date.now() - (ctx.__loggingStartTime as number)
    logger.info(`[middleware:logging] ${nodeName} exiting (${duration}ms)`)
    return result
  },
})

// validationMiddleware
import { GraphStateSchema } from '../../state'
import { createNodeMiddleware } from '../types'

export const validationMiddleware = createNodeMiddleware({
  name: 'validation',
  beforeNode: async (state, config, nodeName, ctx) => {
    GraphStateSchema.parse(state) // Throws ZodError if invalid
    return state
  },
})
```

### Pattern Factories

```typescript
// forNodes factory
export function forNodes(
  nodes: string | string[],
  middleware: Partial<NodeMiddleware>
): NodeMiddleware {
  const nodeList = Array.isArray(nodes) ? nodes : [nodes]
  return createNodeMiddleware({
    ...middleware,
    shouldRun: (state, nodeName) => nodeList.includes(nodeName),
  })
}

// whenFlag factory
export function whenFlag(
  flag: RoutingFlag,
  middleware: Partial<NodeMiddleware>
): NodeMiddleware {
  return createNodeMiddleware({
    ...middleware,
    shouldRun: (state, nodeName) => state.routingFlags[flag] === true,
  })
}
```

### skipClone Integration

```typescript
// In executor.ts
async function executeMiddlewareHook(
  middleware: NodeMiddleware,
  state: GraphState,
  ...args
) {
  // Check skipClone option
  const stateToPass = middleware.skipClone
    ? state
    : structuredClone(state)

  return await middleware.beforeNode?.(stateToPass, ...args)
}
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
| HP-1 | loggingMiddleware logs node entry | Logger.info called with entering message | Mock assertions |
| HP-2 | loggingMiddleware logs node exit with duration | Logger.info called with exiting message and ms | Mock assertions |
| HP-3 | validationMiddleware passes valid state | No error, node executes | Test output |
| HP-4 | validationMiddleware throws on invalid state | ZodError thrown | Test output |
| HP-5 | filterMiddleware removes by name | Filtered array excludes named middleware | Test output |
| HP-6 | filterMiddleware removes by predicate | Filtered array excludes matching middleware | Test output |
| HP-7 | Auto-generated names are unique | Each middleware gets unique name | Test output |
| HP-8 | skipClone: true bypasses cloning | Same state reference passed | Test output |
| HP-9 | skipClone: false (default) clones | Different state reference passed | Test output |
| HP-10 | forNodes runs only for specified nodes | Middleware skips unlisted nodes | Test output |
| HP-11 | whenFlag runs when flag is true | Middleware executes | Test output |
| HP-12 | whenFlag skips when flag is false | Middleware skips | Test output |
| HP-13 | createMockMiddleware creates valid middleware | Validates against schema | Test output |
| HP-14 | createMockMiddleware tracks hook calls | Call arrays populated | Test output |
| HP-15 | All exports importable from @repo/orchestrator | Imports resolve | Import test |

### Error Cases

| ID | Test Description | Expected Error | Evidence |
|----|------------------|----------------|----------|
| EC-1 | validationMiddleware with non-object state | ZodError with path | Test output |
| EC-2 | filterMiddleware with invalid predicate | TypeError | Test output |
| EC-3 | forNodes with empty array | Warning logged, never runs | Test output |
| EC-4 | whenFlag with non-existent flag | Skips (treats as false) | Test output |

### Edge Cases

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| EDGE-1 | loggingMiddleware with 0ms execution | Logs "0ms" | Test output |
| EDGE-2 | filterMiddleware with no matches | Returns original array | Test output |
| EDGE-3 | filterMiddleware with all matches | Returns empty array | Test output |
| EDGE-4 | forNodes with single string | Works same as array | Test output |
| EDGE-5 | Built-in middleware composed together | Works in sequence | Test output |

### Evidence Requirements

- [ ] `pnpm build --filter @repo/orchestrator` completes without errors
- [ ] `pnpm check-types --filter @repo/orchestrator` completes without errors
- [ ] `pnpm test --filter @repo/orchestrator` shows all tests passing
- [ ] Test coverage report showing **80%+ for `src/runner/middleware/built-in/`**
- [ ] Test coverage report showing **80%+ for `src/runner/middleware/utilities/`**
- [ ] All new exports accessible from `@repo/orchestrator`

---

## Demo Script

1. `cd /path/to/monorepo`
2. `pnpm build --filter @repo/orchestrator` — Verify build succeeds
3. `pnpm test --filter @repo/orchestrator` — Verify all tests pass
4. `pnpm check-types --filter @repo/orchestrator` — Verify type checking passes
5. Create test file verifying built-in middleware:
   ```typescript
   import {
     createNode,
     loggingMiddleware,
     validationMiddleware,
     forNodes,
     whenFlag,
     createMockMiddleware,
     filterMiddleware,
   } from '@repo/orchestrator'
   import { createInitialState } from '@repo/orchestrator'

   // Test built-in middleware
   const node = createNode(
     {
       name: 'demo-node',
       middleware: [loggingMiddleware, validationMiddleware],
     },
     async (state) => ({ routingFlags: { ...state.routingFlags, proceed: true } })
   )

   // Test pattern factories
   const debugMiddleware = forNodes(['debug-node'], {
     beforeNode: async (state, config, nodeName, ctx) => {
       console.log('Debug:', state)
       return state
     },
   })

   const featureMiddleware = whenFlag('proceed', {
     afterNode: async (state, result, config, nodeName, ctx) => {
       console.log('Feature active!')
       return result
     },
   })

   // Test filter utility
   const allMiddleware = [loggingMiddleware, validationMiddleware, debugMiddleware]
   const filtered = filterMiddleware(allMiddleware, m => m.name !== 'logging')
   console.log('Filtered middleware count:', filtered.length) // 2

   // Test mock middleware
   const mockMw = createMockMiddleware({ name: 'test-mock' })
   console.log('Mock middleware name:', mockMw.name)

   // Execute
   const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1022-B' })
   const result = await node(state)
   console.log('Execution complete')
   ```
6. Verify test file compiles and runs without errors
7. Verify logging output shows entry/exit messages with timing

---

## Constraints

| Constraint | Value |
|------------|-------|
| Zod version | ^3.x (repo standard) |
| TypeScript strict mode | Required |
| Test framework | Vitest |
| Coverage threshold | 80% for built-in/ and utilities/ |
| Node.js version | 17+ (inherited from wrkf-1022-A) |

---

## Risks / Edge Cases

| Risk | Mitigation |
|------|------------|
| skipClone misuse causing state corruption | Clear documentation warning |
| Auto-naming collisions | Counter is module-scoped, unique per session |
| validationMiddleware performance on large state | Only validates once in beforeNode |

---

## Open Questions

None — all design decisions resolved via QA elaboration.

---

## File Touch List

| Path | Action |
|------|--------|
| `packages/backend/orchestrator/src/runner/middleware/built-in/index.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/built-in/logging.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/built-in/validation.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/utilities/index.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/utilities/filter.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/utilities/naming.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/utilities/factories.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/utilities/testing.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/types.ts` | MODIFY — add skipClone field |
| `packages/backend/orchestrator/src/runner/middleware/executor.ts` | MODIFY — support skipClone |
| `packages/backend/orchestrator/src/runner/middleware/index.ts` | MODIFY — export built-in and utilities |
| `packages/backend/orchestrator/src/runner/middleware/__tests__/logging.test.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/__tests__/validation.test.ts` | CREATE |
| `packages/backend/orchestrator/src/runner/middleware/__tests__/utilities.test.ts` | CREATE |
| `packages/backend/orchestrator/src/index.ts` | MODIFY — re-export new utilities |

---

## Token Budget

| Phase | Agent | Est. Tokens | Actual Tokens |
|-------|-------|-------------|---------------|
| Generation | PM | ~3,000 | ~13,725 |
| Elaboration | QA | ~1,500 | ~20,600 |
| Implementation | Dev | ~6,000 | — |
| Verification | QA | ~1,000 | — |

---

## PM Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | loggingMiddleware uses info level | Most common use case, debug would be too verbose |
| 2 | validationMiddleware in beforeNode only | Validate input, trust output from node |
| 3 | Auto-naming uses simple counter | Simple, unique within session, no persistence needed |
| 4 | skipClone is opt-in (default false) | Safety by default, performance when needed |
| 5 | forNodes accepts string or array | Convenience for single-node case |
| 6 | whenFlag treats missing as false | Safer default for feature flags |
| 7 | createMockMiddleware returns real middleware | Can be used in actual tests, not just assertions |

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: wrkf.stories.index.md | input | 10,500 | ~2,625 |
| Read: ELAB-WRKF-1022.md | input | 9,500 | ~2,375 |
| Read: wrkf-1022-A.md | input | 15,000 | ~3,750 |
| Write: TEST-PLAN.md | output | 3,500 | ~875 |
| Write: UIUX-NOTES.md | output | 500 | ~125 |
| Write: DEV-FEASIBILITY.md | output | 2,800 | ~700 |
| Write: BLOCKERS.md | output | 1,100 | ~275 |
| Write: wrkf-1022-B.md | output | 12,000 | ~3,000 |
| **Total Input** | — | ~35,000 | **~8,750** |
| **Total Output** | — | ~19,900 | **~4,975** |

---

*Generated by PM Agent | 2026-01-24*
*Split from wrkf-1022 based on ELAB-WRKF-1022.md SPLIT REQUIRED verdict*

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-24_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | loggingMiddleware uses `ctx.__loggingStartTime` which could collide with other middleware | Added as AC | AC-11: Use namespaced context keys |
| 2 | validationMiddleware error handling behavior undefined | Added as AC | AC-12: Errors catchable by onError, skip node |
| 3 | createMockMiddleware mentions "jest/vitest mocks" ambiguously | Added as AC | AC-13: Use Vitest vi.fn() explicitly |
| 4 | forNodes behavior with empty array/empty strings not specified | Added as AC | AC-14: Empty array warns, empty strings filtered |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Built-in middleware are singletons with no customization | Added as AC | AC-15: Export factory functions with options |
| 2 | filterMiddleware only supports predicates | Added as AC | AC-16: Accept string/string[] for name filtering |
| 3 | whenFlag only supports single flag | Added as AC | AC-17: Support multiple flags with AND/OR modes |

### Follow-up Stories Suggested

None — all findings incorporated into this story.

### Items Marked Out-of-Scope

None.

### New Acceptance Criteria Required

PM must add the following ACs before implementation proceeds:

- **AC-11:** loggingMiddleware uses namespaced context keys (e.g., `ctx['middleware:logging:startTime']`)
- **AC-12:** validationMiddleware errors are catchable by onError hooks and skip node execution
- **AC-13:** createMockMiddleware uses Vitest's vi.fn() for mock functions
- **AC-14:** forNodes with empty array logs warning; empty/whitespace node names filtered with warning
- **AC-15:** Export createLoggingMiddleware(options?) and createValidationMiddleware(options?) factories
- **AC-16:** filterMiddleware accepts string or string[] for name-based filtering
- **AC-17:** whenFlag supports multiple flags with AND (default) and OR modes
