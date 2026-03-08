---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-9040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates all Phase 9 deliveries (WINT-9010, WINT-9020, WINT-9030). Supplemented by direct codebase scan.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| Orchestrator artifacts (YAML + Zod validation) | Deployed | Node will produce scope-challenges.json artifact |
| `packages/backend/orchestrator/src/nodes/story/` | Active | Target directory for new node |
| `packages/backend/workflow-logic/` | Delivered (WINT-9010) | Shared business logic package available for import |
| `scope-defender.agent.md` | Deployed | Source agent being ported; defines 4-phase contract |
| `createToolNode` node factory | Active (orchestrator) | Required pattern for all LangGraph nodes |
| LangGraph node pattern (doc-sync, cohesion-check) | Active | Established implementation pattern |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-9010 | in-qa (UAT) | BLOCKING: this story is a dependency — package `@repo/workflow-logic` must be stable before WINT-9040 imports from it |
| WINT-4060 | created (needs-code-review per story file) | DEPENDENCY: scope-defender agent spec references graph-checker as successor; WINT-9040 does not depend on WINT-4060 directly, but the graph-checker LangGraph porting notes reference WINT-9040 as the scope-defend node path |
| WINT-9030 | ready-to-work | Adjacent: creates `nodes/story/cohesion-check.ts` in same directory |
| WINT-9020 | completed | Reference implementation: `nodes/sync/doc-sync.ts` — canonical LangGraph node exemplar |

### Constraints to Respect

- `packages/backend/orchestrator/src/nodes/story/` is the established target directory (sibling to `attack.ts`, `fanout-pm.ts`, `seed.ts`, etc.)
- All state extension types must use `z.object()` + `z.infer<>` — TypeScript interfaces are NOT allowed (CLAUDE.md + KB lesson from WINT-9090)
- `@repo/workflow-logic` is a peer dependency but scope-defend logic does NOT require story ID validation — confirm at implementation start whether any workflow-logic functions are needed
- Node must use `createToolNode` factory from `../../runner/node-factory.js`
- `scope-challenges.json` output path must match the agent spec: `{story_dir}/_implementation/scope-challenges.json`
- Backlog integration must match the same write pattern as the original agent spec (file-based in v1.0; MCP backlog tools deferred to WINT-8060)

---

## Retrieved Context

### Related Endpoints

Not applicable — this is a backend orchestrator node. No HTTP endpoints involved.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `createToolNode` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Required wrapper for all LangGraph nodes |
| `updateState` helper | `packages/backend/orchestrator/src/runner/state-helpers.ts` | State mutation helper used by all sibling nodes |
| `GraphState` type | `packages/backend/orchestrator/src/state/index.ts` | Base state type for all nodes |
| `attack.ts` | `packages/backend/orchestrator/src/nodes/story/attack.ts` | Sibling story node — structural template for adversarial analysis |
| `doc-sync.ts` | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Gold standard LangGraph node that imports `@repo/workflow-logic` |
| `scope-defender.agent.md` | `.claude/agents/scope-defender.agent.md` | Source agent with LangGraph porting notes specifying WINT-9040 contract |

### Reuse Candidates

- **`createToolNode` pattern** — use the exact same factory call pattern as `attack.ts` and `doc-sync.ts`: `createToolNode('scope_defend', async (state) => {...})`
- **`z.object()` state extension pattern** — use Zod schema for `GraphStateWithScopeDefend` (not TypeScript interface; see WINT-9090 lesson)
- **4-phase sequential execution** — Port the agent's 4 phases directly: Load Inputs → Identify Challenge Candidates → Apply DA Challenges → Produce Output
- **`@repo/workflow-logic`** — `isValidStoryId` may be useful for input validation; check exports at implementation start
- **`@repo/logger`** for logging throughout node execution

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph story node (adversarial analysis, same phase) | `packages/backend/orchestrator/src/nodes/story/attack.ts` | Closest sibling — adversarial analysis of story structures, same node category, same directory, uses createToolNode + Zod schemas + updateState |
| LangGraph node with `@repo/workflow-logic` import | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Gold standard: shows correct import of `isValidStoryId` from `@repo/workflow-logic`, 7-phase sequential architecture, graceful DB fallback, comprehensive Zod schemas |
| Source agent to port | `.claude/agents/scope-defender.agent.md` | Defines the 4-phase logical contract, input/output schema for `scope-challenges.json`, DA constraints, graceful degradation table, and LangGraph porting notes (Section: LangGraph Porting Notes) |
| `@repo/workflow-logic` public surface | `packages/backend/workflow-logic/src/index.ts` | Lists all available exports: `getValidTransitions`, `toDbStoryStatus`, `getStatusFromDirectory`, `isValidStoryId` — confirm which (if any) are needed |

---

## Knowledge Context

### Lessons Learned

- **[WINT-9090]** TypeScript interfaces in LangGraph node files must be converted to Zod schemas before code review (`category: fix-cycle`)
  - *Applies because*: WINT-9040 will define state extension types (e.g., `GraphStateWithScopeDefend`). Must use `z.object()` + `z.infer<>`, not `interface`. This mistake caused a fix cycle in WINT-9090 and is now a known pitfall.

- **[WINT-9030]** The `createToolNode` API is `createToolNode(name: string, implementation)`, NOT `createToolNode(impl, config)`. Follow `attack.ts` pattern exactly.
  - *Applies because*: WINT-9040 will call `createToolNode`. The story narrative example is sometimes wrong; the running code (attack.ts) is canonical.

- **[WINT-2080]** LangGraph Porting Notes section pattern for haiku worker agents — now a required section in all agent files (`category: architecture`)
  - *Applies because*: `scope-defender.agent.md` already has the LangGraph Porting Notes section specifying WINT-9040's contract. Implementer should read this section first — it defines the precise input state fields, execution contract, and output contract.

- **[WINT-9020]** Native sequential phase architecture for LangGraph nodes proves viable for subprocess-delegating agents (`category: architecture`)
  - *Applies because*: scope-defender was a subprocess-delegating agent. WINT-9020's successful 7-phase native port validates the approach. WINT-9040 follows the same pattern with 4 phases.

- **[WINT-9010 future-opp]** `@repo/workflow-logic` ambiguity — confirm at implementation start whether any functions are needed. For context/session nodes they were not. Scope-defend may not need story ID validation either.
  - *Applies because*: Don't add unnecessary imports; confirm before coding.

### Blockers to Avoid (from past stories)

- Do NOT use TypeScript `interface` for state extension types — use `z.object()` (WINT-9090 fix-cycle)
- Do NOT call `createToolNode` with wrong argument order — use `createToolNode('scope_defend', async (state) => {...})` (WINT-9030 gap discovery)
- Do NOT hardcode backlog writes — backlog MCP tools (WINT-8020) are deferred; scope-challenges.json is file-based only in v1.0

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Unit tests must mock file I/O and state. |
| ADR-006 | E2E Tests in Dev Phase | Backend-only node — E2E exempt. Unit tests required per ADR-006 skip condition: `frontend_impacted: false`. |

(ADR-001, ADR-002, ADR-003, ADR-004 are not applicable — no API endpoints, no infrastructure, no CDN, no auth.)

### Patterns to Follow

- Use `createToolNode('scope_defend', async (state) => {...})` factory pattern
- Use `z.object()` schemas with `z.infer<>` for all types including state extension
- Sequential 4-phase implementation matching agent's logical phases
- Import from `@repo/logger` for all logging
- Write `scope-challenges.json` to `{story_dir}/_implementation/scope-challenges.json`
- Graceful degradation: missing optional inputs increment warning count and do NOT block
- Idempotent: overwrite existing `scope-challenges.json` on repeat runs

### Patterns to Avoid

- TypeScript `interface` for state types (WINT-9090 lesson)
- Adding MCP SDK or LangGraph SDK as dependencies of `@repo/workflow-logic`
- Hardcoding backlog writes — output is file-based only in v1.0
- Challenging MVP-critical or blocking items (core DA constraint)
- Calling `createToolNode` with wrong API signature

---

## Conflict Analysis

### Conflict: Dependency Not Yet Stable (WINT-9010)
- **Severity**: blocking
- **Description**: WINT-9010 (`@repo/workflow-logic` package) is `in-qa` / UAT. If this package is not stable when WINT-9040 begins implementation, the import `from '@repo/workflow-logic'` may not be available in the correct state. However, the core scope-defend logic does NOT fundamentally require `@repo/workflow-logic` functions (the agent logic is self-contained text analysis). If no `@repo/workflow-logic` functions are actually needed (confirm by inspecting exports), this conflict is moot.
- **Resolution Hint**: Confirm at story start whether any `@repo/workflow-logic` exports are actually needed for scope-defend logic. If not needed, remove the import and resolve the dependency conflict. If needed, confirm WINT-9010 is in UAT/completed before claiming WINT-9040 as unblocked.

### Conflict: WINT-4060 Dependency Status Ambiguity
- **Severity**: warning
- **Description**: The stories.index.md shows WINT-9040 depends on both WINT-9010 and WINT-4060. However, the scope-defender agent spec's LangGraph porting notes do NOT mention any dependency on graph-checker output. WINT-4060 delivers `graph-checker.agent.md` — a separate agent. The `scope-defender` agent explicitly states it does NOT consume cohesion-sidecar or graph-checker outputs (Non-Goal #4). The dependency may be an index artifact.
- **Resolution Hint**: During elaboration, confirm whether WINT-4060 is a true implementation dependency or a sequencing preference in the index. If scope-defend logic is purely text-based AC analysis with no graph query calls, WINT-4060 dependency may be removable, potentially unblocking WINT-9040 sooner.

---

## Story Seed

### Title

Create scope-defender LangGraph Node (`nodes/story/scope-defend.ts`)

### Description

The `scope-defender` agent is a haiku-powered Devil's Advocate worker that challenges non-MVP scope during story elaboration. It is currently implemented as a Claude Code agent (`scope-defender.agent.md`) and produces `scope-challenges.json` for downstream synthesis.

WINT-9040 ports this agent to a native TypeScript LangGraph node at `packages/backend/orchestrator/src/nodes/story/scope-defend.ts`. The node receives story context from graph state, executes the same 4-phase logical workflow as the agent (Load Inputs → Identify Candidates → Apply DA Challenges → Produce Output), writes `scope-challenges.json` to the story directory, and returns updated state.

The LangGraph porting notes section of `scope-defender.agent.md` defines the precise input contract (state fields), execution contract (4-phase workflow), and output contract (`scope-challenges.json` schema). This is the authoritative specification for WINT-9040.

The core constraint: scope-defend only reduces or defers. It never adds ACs or expands scope. Maximum 5 challenges. MVP-critical items are never challenged. Backlog writes are file-based only in v1.0 (no MCP backlog tools until WINT-8060).

### Initial Acceptance Criteria

- [ ] AC-1: File `packages/backend/orchestrator/src/nodes/story/scope-defend.ts` exists and exports `scopeDefendNode` and `createScopeDefendNode`
- [ ] AC-2: Node is created via `createToolNode('scope_defend', async (state) => {...})` factory
- [ ] AC-3: All state extension types (e.g., `GraphStateWithScopeDefend`) use `z.object()` + `z.infer<>` — no TypeScript `interface` declarations
- [ ] AC-4: Node implements the 4-phase workflow from agent spec: (1) Load Inputs from state, (2) Identify Challenge Candidates (filter MVP-critical items), (3) Apply DA Challenges (max 5, prioritized by `risk_if_deferred`), (4) Produce Output
- [ ] AC-5: Node writes `scope-challenges.json` to `{story_dir}/_implementation/scope-challenges.json`, conforming to the schema in `scope-defender.agent.md`
- [ ] AC-6: Hard cap of 5 challenges is enforced; `truncated: true` when more than 5 candidates qualified
- [ ] AC-7: Graceful degradation: missing gap analysis and missing DA role pack each increment `warning_count` by 1 and allow execution to continue
- [ ] AC-8: Existing `scope-challenges.json` is overwritten on repeat runs (idempotent)
- [ ] AC-9: Node does NOT write to backlog MCP tools (file-based output only; backlog integration is deferred to WINT-8060)
- [ ] AC-10: Unit tests exist in `__tests__/scope-defend.test.ts` covering: happy path (challenges produced), graceful degradation (missing optional inputs), hard cap enforcement (truncation), idempotent overwrite; minimum coverage 45%
- [ ] AC-11: `pnpm check-types --filter @repo/orchestrator` passes with 0 errors
- [ ] AC-12: `pnpm test --filter @repo/orchestrator` passes with 0 failures

### Non-Goals

- Do NOT modify `scope-defender.agent.md` — it remains operational in the Claude Code MCP workflow
- Do NOT implement backlog MCP writes — deferred to WINT-8060
- Do NOT add any API endpoints, Lambda handlers, or APIGW routes
- Do NOT modify `packages/backend/workflow-logic/` — import only
- Do NOT add LangGraph or MCP SDK dependencies to `@repo/workflow-logic`
- Do NOT challenge items marked as blocking or MVP-critical in gap analysis
- Do NOT add new ACs or expand scope of a story being challenged
- Do NOT create the parity harness in this story — parity validation is WINT-9110's responsibility

### Reuse Plan

- **Components**: `createToolNode` from `../../runner/node-factory.js`, `updateState` from `../../runner/state-helpers.js`, `GraphState` from `../../state/index.js`
- **Patterns**: `attack.ts` node structure (adversarial analysis node in same directory), `doc-sync.ts` (gold standard with `@repo/workflow-logic` import), 4-phase sequential architecture from scope-defender agent
- **Packages**: `@repo/logger` (logging), `@repo/workflow-logic` (if any functions needed — confirm at start), `zod` (Zod-first types)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a backend-only TypeScript node with no frontend, no API endpoints, and no database writes. Testing strategy should be unit-focused:
- Mock `fs.writeFile` / file I/O using `vi.spyOn` or injectable write function
- Mock state inputs for: full context (happy path), missing gap analysis (graceful degradation), missing role pack (graceful degradation), >5 candidates (truncation test)
- Follow the parity harness pattern from WINT-9140 if a parity test is desired (but parity validation is formally WINT-9110's scope)
- ADR-005 (UAT real services) and ADR-006 (E2E required): E2E exempt — `frontend_impacted: false`, no HTTP surface
- Coverage threshold: 45% minimum (project standard); target higher for pure business logic

### For UI/UX Advisor

Not applicable. This is a backend-only LangGraph node with no user-facing interface. No UI/UX review needed.

### For Dev Feasibility

Key questions to answer during elaboration:

1. **`@repo/workflow-logic` necessity**: Inspect `packages/backend/workflow-logic/src/index.ts` exports. Does scope-defend logic require `isValidStoryId`, `getValidTransitions`, or any other export? If not, skip the import and remove WINT-9010 as a hard dependency.

2. **WINT-4060 dependency**: Is WINT-4060 (`graph-checker.agent.md`) actually required before this node can be implemented? The agent's non-goals explicitly state it does NOT consume graph-checker output. Confirm with index maintainer.

3. **File I/O injection pattern**: To keep the node testable, consider accepting an injectable `writeFile` function (similar to how `doc-sync.ts` injects `queryComponents`). Alternatively, mock `node:fs/promises` in tests via `vi.mock`.

4. **State field mapping**: The agent's LangGraph Porting Notes define input state fields: `story_id`, `story_brief`, `acceptance_criteria`, `gap_analysis` (nullable), `role_pack_path` (nullable). Confirm these fields exist in `GraphState` or need to be added.

Canonical references for subtask decomposition:
- Read `scope-defender.agent.md` Section: "LangGraph Porting Notes" first — it is the definitive contract
- Then read `attack.ts` for the closest structural sibling in the same directory
- Then read `doc-sync.ts` for the `@repo/workflow-logic` import pattern
