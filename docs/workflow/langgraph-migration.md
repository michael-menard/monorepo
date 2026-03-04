---
title: "Claude Code to LangGraph Migration Guide"
version: "1.0.0"
created_at: "2026-03-03T00:00:00-07:00"
updated_at: "2026-03-03T00:00:00-07:00"
status: active
tags:
  - langgraph
  - migration
  - workflow
  - phase-9
  - decision-guide
---

# Claude Code to LangGraph Migration Guide

This document is the definitive reference for the Claude Code to LangGraph workflow
transition. It tells you when to use each system, shows you how to migrate step by step,
and documents the known rough edges.

**Before reading this document**, you should be familiar with:

- [README.md](./README.md) — overall workflow commands and lifecycle
- [phases.md](./phases.md) — what each workflow phase does
- [orchestration.md](./orchestration.md) — error handling, state machines, and observability

---

## Table of Contents

- [Feature Comparison Table](#feature-comparison-table)
- [Decision Guide](#decision-guide)
- [Migration Walkthrough](#migration-walkthrough)
- [Known Gotchas](#known-gotchas)
- [Cross-References](#cross-references)

---

## Feature Comparison Table

All verdicts in this table are grounded in WINT-9120 parity test results. Speculative
or untested capabilities are marked "Pending WINT-9120".

| Workflow Capability | Claude Code | LangGraph | Parity Verdict |
|---------------------|-------------|-----------|----------------|
| **doc-sync** — file discovery (git diff + timestamp fallback) | Passing (subprocess delegation) | Passing (native 7-phase) | Passing — with known divergences |
| **doc-sync** — frontmatter parsing + DB merge | Passing | Passing | Passing |
| **doc-sync** — section mapping + doc table updates | Passing | Passing | Passing |
| **doc-sync** — Mermaid diagram regeneration | Passing | Passing | Passing |
| **doc-sync** — changelog drafting | Passing | Passing | Passing |
| **doc-sync** — SYNC-REPORT.md generation | Passing | Passing | Passing |
| **doc-sync** — database_status field in output | Not present (subprocess path) | Present (WINT-9020) | Known divergence — documented in `known-divergences.parity.test.ts` |
| **doc-sync** — error message format | Shell command errors (`exit 1`) | Phase-level errors (`Phase N failed`) | Known divergence — functionally equivalent |
| **doc-sync** — reportPath format | Relative | Absolute | Known divergence — both resolve to same file |
| **elaboration** — story delta detection | Passing | Passing | Passing (WINT-9120 AC-4) |
| **elaboration** — readiness scoring | Passing | Passing | Passing (WINT-9120 AC-4) |
| **story-creation** — story seed creation | Passing | Passing | Passing (WINT-9120 AC-3) |
| **story-creation** — story completion/synthesis | Passing | Passing | Passing (WINT-9120 AC-3) |
| **bootstrap** — state initialization | Not yet tested | Not yet tested | Pending WINT-9120 (it.todo stub) |
| **elab-epic** — epic-level delta detection | Not yet tested | Not yet tested | Pending WINT-9120 (it.todo stub) |
| **elab-story** — story-level delta | Not yet tested | Not yet tested | Pending WINT-9120 (it.todo stub) |
| **dev-implement** — implementation plan output | Not yet tested | Not yet tested | Pending WINT-9120 (it.todo stub) |
| **qa-verify** — verification verdict | Not yet tested | Not yet tested | Pending WINT-9120 (it.todo stub) |
| **backlog-review** — priority ordering | Not yet tested | Not yet tested | Pending WINT-9120 (it.todo stub) |
| **Zod-first types** — node schema validation | Enforced (WINT-9090) | Enforced | Matching |
| **PostgresSaver checkpoint** — state persistence | N/A (agent-based) | Required setup call | LangGraph-only concern — see [Known Gotchas](#known-gotchas) |
| **@repo/workflow-logic** — story ID validation | Available | Available | Matching |

### Verdict Definitions

| Verdict | Meaning |
|---------|---------|
| **Passing** | Both paths produce structurally equivalent output for the same input fixture |
| **Passing — with known divergences** | Output matches on core fields; one or more non-blocking differences are documented in `known-divergences.parity.test.ts` |
| **Known divergence** | Intentional behavioral difference, documented, acceptable during migration period |
| **Pending WINT-9120** | Test is an `it.todo()` stub — full parity test has not yet been authored |

---

## Decision Guide

Use this section to choose the right system for your use case. The guidance is
**opinionated**: pick the approach that fits, not the one that feels familiar.

### Scenario A: Greenfield workflow (new feature, no prior implementation)

**Use LangGraph.**

If you are building a new workflow capability from scratch (a new graph, a new node, or
a new multi-step orchestration), implement it as a LangGraph graph under
`packages/backend/orchestrator/src/graphs/`. The infrastructure is in place: typed state
via Zod schemas, `createToolNode` factory, `GraphState`, and `PostgresSaver` for
checkpoint-based persistence.

Do not create a new Claude Code agent for net-new workflow logic. That approach is now
deprecated for new work.

Canonical reference: `packages/backend/orchestrator/src/graphs/elaboration.ts`

### Scenario B: Extending an existing Claude Code agent

**Extend the agent short-term; plan a LangGraph port.**

If you need to add a small check or output field to an existing Claude Code agent (e.g., a
new verification step in a QA phase), it is acceptable to extend the agent in place — but
add a follow-up story to port it to LangGraph. Do not build substantial new logic on top
of the Claude Code subprocess pattern.

See [extending.md](./extending.md) for the phase leader pattern and how to add checks,
workers, and sub-phases.

### Scenario C: Migrating an existing Claude Code agent to LangGraph

**Follow the walkthrough below** (see [Migration Walkthrough](#migration-walkthrough)).

The canonical migration example is `doc-sync.ts` (WINT-9020). That story ported a
7-phase subprocess-delegation agent to a native LangGraph node with full parity tests.
Follow that pattern.

Key rule: do **not** delete the Claude Code agent until the LangGraph node has passing
parity tests. Run both in parallel during the transition period (Scenario D).

### Scenario D: Running both systems in parallel during transition

**Use the parity harness to validate before cutting over.**

The parity harness (`packages/backend/orchestrator/src/__tests__/parity/`) provides a
`runParity()` utility that exercises both paths with the same input fixture and compares
outputs field-by-field. Use it to:

1. Author parity tests (`*.parity.test.ts`) before migrating
2. Run both paths in staging with the same real inputs
3. Document any known divergences in `known-divergences.parity.test.ts`
4. Retire the Claude Code path once parity tests are stable

Do **not** do a hard cutover without passing parity tests. The doc-sync migration
(WINT-9020) is the template for how this should be done.

---

## Migration Walkthrough

This walkthrough uses `doc-sync.ts` as the canonical example. All code snippets follow
Zod-first type conventions (no TypeScript `interface` syntax).

### Step 1: Identify the agent contract

Before writing any LangGraph code, document the agent's contract:

- What inputs does it accept?
- What outputs does it produce?
- What external services does it call (filesystem, git, DB, LLM)?

For `doc-sync`, the contract was:

```typescript
// Input (DocSyncConfigSchema) — packages/backend/orchestrator/src/nodes/sync/doc-sync.ts
export const DocSyncConfigSchema = z.object({
  checkOnly: z.boolean().default(false),
  force: z.boolean().default(false),
  workingDir: z.string().optional(),
  repoRoot: z.string().optional(),
  reportPath: z.string().optional(),
  dbQueryTimeoutMs: z.number().default(30000),
  queryComponents: z.function().optional(),
  queryPhases: z.function().optional(),
})

// Output (DocSyncResultSchema)
export const DocSyncResultSchema = z.object({
  success: z.boolean(),
  filesChanged: z.number(),
  sectionsUpdated: z.number(),
  diagramsRegenerated: z.number(),
  manualReviewNeeded: z.number(),
  changelogDrafted: z.boolean(),
  reportPath: z.string(),
  errors: z.array(z.string()),
  database_status: z.enum(['success', 'timeout', 'connection_failed', 'unavailable']).optional(),
})
```

All schemas use `z.object({...})` — never TypeScript `interface` syntax. See
[Known Gotchas](#known-gotchas) for why this matters.

### Step 2: Implement as a LangGraph node

Create the node file under `packages/backend/orchestrator/src/nodes/` or
`packages/backend/orchestrator/src/graphs/`. Use `createToolNode` from the node factory:

```typescript
import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'

// 1. Define schemas first — all types derived from Zod
const MyNodeConfigSchema = z.object({
  workingDir: z.string().optional(),
  dryRun: z.boolean().default(false),
})

const MyNodeResultSchema = z.object({
  success: z.boolean(),
  itemsProcessed: z.number(),
  errors: z.array(z.string()),
})

export type MyNodeConfig = z.infer<typeof MyNodeConfigSchema>
export type MyNodeResult = z.infer<typeof MyNodeResultSchema>

// 2. Implement the node logic
async function myNodeImpl(
  _state: GraphState,
  config: Partial<MyNodeConfig> = {},
): Promise<Partial<GraphState>> {
  const fullConfig = MyNodeConfigSchema.parse(config)
  // ... implementation
  return updateState({ myNode: { success: true, itemsProcessed: 0, errors: [] } })
}

// 3. Export via createToolNode factory
export const myNode = createToolNode(
  'my_node',
  async (state: GraphState) => myNodeImpl(state, {}),
)
```

For complex multi-phase logic, break the implementation into named phase functions
(Phase 1, Phase 2, etc.) as `doc-sync.ts` does. This makes parity testing and debugging
easier.

### Step 3: Wire into a graph

In `packages/backend/orchestrator/src/graphs/`, create or update a graph file to include
your node:

```typescript
import { StateGraph } from '@langchain/langgraph'
import type { GraphState } from '../state/index.js'
import { myNode } from '../nodes/my-feature/my-node.js'

export function buildMyGraph() {
  const graph = new StateGraph<GraphState>({ channels: {} })

  graph.addNode('my_node', myNode)
  graph.addEdge('__start__', 'my_node')
  graph.addEdge('my_node', '__end__')

  return graph.compile()
}
```

If your graph requires checkpoint-based state persistence (for resumable workflows),
call `PostgresSaver.setup()` before compiling — see [Known Gotchas](#known-gotchas).

### Step 4: Add parity tests

Create `*.parity.test.ts` under `packages/backend/orchestrator/src/__tests__/parity/`.
Follow the `doc-sync.parity.test.ts` pattern:

1. Define an output schema local to the test file
2. Write a `createFixtureResult()` helper
3. Test: matching verdict when outputs are identical
4. Test: divergent verdict when a key field differs
5. Test: error verdict when a runner throws
6. Document any intentional differences in `known-divergences.parity.test.ts`

All external services (filesystem, git, DB, LLM) must be injected as `vi.fn()` mocks.
No real network calls in parity tests.

---

## Known Gotchas

### Gotcha 1: Zod-first types — no TypeScript `interface` syntax

All node files in `packages/backend/orchestrator/` must use Zod schemas for every
exported type. The project enforces `noImplicitAny: false` but `interface` syntax is
banned by code-review-style-compliance. Use:

```typescript
// CORRECT — Zod schema with inferred type
const MySchema = z.object({ id: z.string(), count: z.number() })
type My = z.infer<typeof MySchema>
```

Do not use TypeScript `interface` syntax (`interface My { id: string }`).
Code-review-style-compliance will flag any `interface` declaration as an error.

This applies to internal types too. If a type is only used within a node file,
define it as a local Zod schema or as a `type` alias from `z.infer<>`. Never use
`interface` in orchestrator node files.

Reference: WINT-9090 (Zod schema conversion), CLAUDE.md §TypeScript.

### Gotcha 2: PostgresSaver.setup() is required before graph compilation

LangGraph checkpointing requires calling `PostgresSaver.setup()` asynchronously
**before** compiling the graph. Skipping this call causes runtime errors when the
graph tries to read or write checkpoint state.

Pattern:

```typescript
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'

async function buildGraph(pool: Pool) {
  const checkpointer = new PostgresSaver(pool)
  await checkpointer.setup() // REQUIRED — creates checkpoint tables if not present

  const graph = new StateGraph<GraphState>({ channels: {} })
  // ... add nodes and edges
  return graph.compile({ checkpointer })
}
```

Do not call `compile()` with a `PostgresSaver` that has not had `.setup()` awaited.
The error will surface as a missing table error at runtime, not at compile time.

### Gotcha 3: @repo/workflow-logic scope

The `@repo/workflow-logic` package exposes shared utilities such as `isValidStoryId()`.
It is available in both the Claude Code agent path and the LangGraph node path.

Rules:
- Use `@repo/workflow-logic` for story ID validation and other shared domain logic
- Do **not** inline logic that already exists in `@repo/workflow-logic` — import it
- If a new shared utility is needed, add it to `@repo/workflow-logic` before using it
  in node files. Do not add workflow logic directly to node files.

The `doc-sync.ts` node uses `isValidStoryId` from `@repo/workflow-logic` for validating
story ID segments found in file paths. See line 1064–1073 in `doc-sync.ts` for the
reference pattern.

---

## Cross-References

This guide links to, but does not duplicate, the following documents:

| Document | Covers |
|----------|--------|
| [README.md](./README.md) | Workflow commands, state diagram, lifecycle overview |
| [phases.md](./phases.md) | Detailed documentation for each workflow phase (1–8) |
| [orchestration.md](./orchestration.md) | Error handling, circuit breaker, state machine, token management |
| [extending.md](./extending.md) | Phase leader pattern, adding workers and sub-phases |

For the current parity test coverage status, see:

- `packages/backend/orchestrator/src/__tests__/parity/doc-sync.parity.test.ts` — doc-sync (Passing with known divergences)
- `packages/backend/orchestrator/src/__tests__/parity/elaboration.parity.test.ts` — elaboration (Passing)
- `packages/backend/orchestrator/src/__tests__/parity/story-creation.parity.test.ts` — story-creation (Passing)
- `packages/backend/orchestrator/src/__tests__/parity/wint9110-workflows.parity.test.ts` — WINT-9110 graphs (Pending WINT-9120)
- `packages/backend/orchestrator/src/__tests__/parity/known-divergences.parity.test.ts` — documented divergences
