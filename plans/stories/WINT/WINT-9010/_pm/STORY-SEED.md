---
generated: "2026-03-23"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-9010

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline file found at any path under `plans/baselines/`. Baseline context was reconstructed entirely from codebase scanning and KB search.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `@repo/workflow-logic` package (existing) | `packages/backend/workflow-logic/` | The package this story extends. Currently exports: `WorkflowStoryStatusSchema`, `DbStoryStatusSchema`, `getValidTransitions`, `toDbStoryStatus`, `getStatusFromDirectory`, `isValidStoryId`, and the full `evidence-judge` module. Pattern: pure functions, Zod schemas, no MCP/LangGraph/AWS deps. |
| `evidence-judge` module | `packages/backend/workflow-logic/src/evidence-judge/index.ts` | Canonical example of an extracted business logic module inside workflow-logic. Provides `classifyEvidenceStrength`, `deriveAcVerdict`, `deriveOverallVerdict` — all pure functions with Zod schemas. This is the exact extraction pattern WINT-9010 must replicate. |
| `nodes/qa/evidence-judge.ts` | `packages/backend/orchestrator/src/nodes/qa/evidence-judge.ts` | LangGraph node that already consumes `classifyEvidenceStrength`, `deriveAcVerdict`, `deriveOverallVerdict` from `@repo/workflow-logic`. Proves the extraction pattern works in practice. |
| `_shared/decision-handling.md` | `.claude/agents/_shared/decision-handling.md` | Defines the 5-tier decision classification system as prose in a shared agent markdown file. The business logic described here (tier definitions, escalation matrix, batch mode) is a candidate for extraction to workflow-logic. |
| `_shared/token-tracking.md` | `.claude/agents/_shared/token-tracking.md` | Defines token tracking standard as prose. |
| `_shared/kb-integration.md` | `.claude/agents/_shared/kb-integration.md` | Defines KB context retrieval patterns and artifact read/write patterns as prose. |
| `nodes/context/context-warmer.ts` | `packages/backend/orchestrator/src/nodes/context/context-warmer.ts` | LangGraph node that handles context cache (get/put/invalidate). Has injectable DB functions, Zod schemas, graceful degradation — but no pure business logic extracted to workflow-logic yet. |
| `nodes/persistence/save-to-db.ts` | `packages/backend/orchestrator/src/nodes/persistence/save-to-db.ts` | LangGraph node for state persistence. Complex domain logic around artifact selection and YAML write-through. |
| `nodes/qa/gate-decision.ts` | `packages/backend/orchestrator/src/nodes/qa/gate-decision.ts` | Gate decision node with inline verdict aggregation logic not yet extracted. References `qaPassedSuccessfully()` from artifacts layer. |
| `nodes/sync/doc-sync.ts` | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Imports `isValidStoryId` from `@repo/workflow-logic` — confirms the package is correctly wired as a dependency in the orchestrator. |

### Active In-Progress Work

| Story | State | Overlap Risk |
|-------|-------|-------------|
| WINT-8060 (Integrate scope-defender with Backlog) | in_progress | Low — touches different nodes (scope-defend, backlog-curator) |
| WINT-3090 (Add Scoreboard Metrics to Telemetry) | needs_code_review | Low — touches analytics/telemetry layer, not workflow-logic |

No active stories are modifying `packages/backend/workflow-logic/` or `.claude/agents/_shared/`.

### Constraints to Respect

- `@repo/workflow-logic` must remain dependency-free: no MCP SDK, no LangGraph, no AWS, no DB clients
- All types in workflow-logic must use Zod schemas with `z.infer<>` — never TypeScript interfaces (CLAUDE.md, confirmed by WINT-9090 code review lesson)
- No barrel files (CLAUDE.md)
- Use `z.record(z.string(), z.unknown())` not `z.record(z.unknown())` — single-arg form fails compilation (KB lesson INFR-0040)
- The `@repo/workflow-logic` package is already a `workspace:*` dependency of `@repo/orchestrator` — no new dependency wiring needed for orchestrator consumers
- Pure function exports only — no class instances, no singletons

---

## Retrieved Context

### Related Endpoints
N/A — this is a shared package story, no API endpoints involved.

### Related Components
N/A — no UI components involved.

### Reuse Candidates

| Item | Source | How to Reuse |
|------|--------|-------------|
| `evidence-judge/index.ts` pattern | `packages/backend/workflow-logic/src/evidence-judge/` | Direct structural template: module dir with a single `index.ts`, Zod schemas at top, pure functions exported below, no imports from other `workflow-logic` submodules |
| `transitions/index.ts` pattern | `packages/backend/workflow-logic/src/transitions/` | Template for a module that encodes decision tables as `const` records + a pure accessor function |
| `__types__/index.ts` pattern | `packages/backend/workflow-logic/src/__types__/` | All shared types/schemas for the package live here; per-module types live in the module file itself |
| `__tests__/*.test.ts` test structure | `packages/backend/workflow-logic/src/__tests__/` | All tests are co-located in one `__tests__/` directory at the `src/` level, using Vitest |
| `_shared/decision-handling.md` | `.claude/agents/_shared/decision-handling.md` | Source of truth for 5-tier decision classification prose — the TypeScript encoding must match these semantics exactly |
| `_shared/token-tracking.md` | `.claude/agents/_shared/token-tracking.md` | Source of truth for token tracking protocol prose |
| `_shared/kb-integration.md` | `.claude/agents/_shared/kb-integration.md` | Source of truth for KB context retrieval patterns |

### Similar Stories
- WINT-9090 (context-warmer + session-manager nodes): The closest preceding story — it created LangGraph nodes and taught the lesson that `@repo/workflow-logic` exports were NOT needed for those specific nodes. This story (WINT-9010) is the inverse: it populates workflow-logic itself so that future nodes like those have something to import.
- Evidence judge extraction (prior art): The `evidence-judge` module was previously extracted into workflow-logic, and `nodes/qa/evidence-judge.ts` now imports from it. This is the exact precedent WINT-9010 should follow.

### Relevant Packages

| Package | Role |
|---------|------|
| `@repo/workflow-logic` | Target of all new modules in this story |
| `packages/backend/orchestrator` | Primary consumer of extracted modules |
| `.claude/agents/_shared/` | Source of prose definitions to be encoded as TypeScript |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Pure function module in workflow-logic | `packages/backend/workflow-logic/src/evidence-judge/index.ts` | Gold standard: Zod schemas at top, pure exported functions, no external deps. The structural template for every new module in this story. |
| Module index in workflow-logic | `packages/backend/workflow-logic/src/transitions/index.ts` | Shows how to encode a business rule table (`const VALID_TRANSITIONS`) as a pure accessor function. Decision tier tables should follow the same pattern. |
| LangGraph node consuming workflow-logic | `packages/backend/orchestrator/src/nodes/qa/evidence-judge.ts` | Demonstrates how a LangGraph node imports from `@repo/workflow-logic` and wraps pure functions with I/O and side effects. Confirms the integration contract. |
| Package index (re-export pattern) | `packages/backend/workflow-logic/src/index.ts` | Shows how to wire new modules into the package surface: named exports per function/schema, explicit type re-exports. |

---

## Knowledge Context

### Lessons Learned

- **[WINT-9090]** TypeScript interfaces were used for 3 state-extension types and caught in code review, requiring a fix cycle. (category: blocker)
  - *Applies because*: WINT-9010 will create multiple new modules with exported types. Every new exported type must be a Zod schema with `z.infer<>`, not an interface — even when it looks "obviously structural."

- **[INFR-0040]** `z.record(z.unknown())` fails compilation — must use `z.record(z.string(), z.unknown())`.
  - *Applies because*: Decision and artifact modules will likely need record/map types for tier-to-behavior mappings and context pack content.

- **[APIP-4010]** Pure function separation enables near-100% branch coverage without external dependencies.
  - *Applies because*: This story's entire raison d'être is this lesson applied at scale. Decision tiers, artifact strategies, and context retrieval helpers should all be pure so they can be exhaustively tested in isolation.

- **[WINT-4010 / sidecar utilities]** Extract shared utilities early during code review rather than post-implementation.
  - *Applies because*: The story must actively survey existing LangGraph nodes for inline logic that duplicates what should now live in workflow-logic, and extract it proactively.

- **[PIPE-0010 / workflow-types opportunity]** KB and orchestrator independently defined `StoryStateSchema`, creating drift risk.
  - *Applies because*: When codifying decision tiers or other business rules, define them once in workflow-logic and have all consumers import from there — don't let prose in agent markdown and TypeScript in orchestrator nodes diverge independently.

### Blockers to Avoid (from past stories)

- Defining TypeScript `interface` for any exported type — convert to `z.object()` before review
- Using single-argument `z.record()` — always `z.record(z.string(), valueSchema)`
- Importing from LangGraph, MCP SDK, or AWS services inside workflow-logic modules (breaks the zero-dep constraint)
- Creating barrel files (index.ts re-exports of re-exports) — import directly from source files

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. ADR context is reconstructed from CLAUDE.md and KB search.

| Constraint | Source | Applies |
|-----------|--------|---------|
| `@repo/workflow-logic` is zero-runtime-dep (no MCP, no LangGraph, no AWS) | Package description + existing code | All new modules |
| Zod-first: all exported types use `z.infer<typeof SomeSchema>` | CLAUDE.md | All new modules |
| No barrel files | CLAUDE.md | All module exports must be direct, not re-exported aggregators |
| No TypeScript interfaces | CLAUDE.md + WINT-9090 lesson | Critical for this story |
| `z.record(z.string(), ...)` not `z.record(...)` | KB INFR-0040 lesson | Wherever records/maps are used |

### Patterns to Follow

- Module structure: single `index.ts` per feature directory, schemas first, exported functions below
- Vitest tests at `src/__tests__/{moduleName}.test.ts`, testing all pure functions directly
- Encode business rule tables as `const` objects (like `VALID_TRANSITIONS`), then expose via thin accessor functions
- Copy prose semantics faithfully from `_shared/*.md` — the TypeScript is a machine-readable encoding, not a redesign

### Patterns to Avoid

- Embedding LangGraph-specific types in workflow-logic modules (those belong in the orchestrator nodes)
- Duplicating type definitions across KB MCP server and orchestrator (put them in workflow-logic, import from there)
- Writing tests that require DB or network access — all logic must be testable with pure inputs

---

## Conflict Analysis

### Conflict: potential scope ambiguity — prose vs. TypeScript fidelity
- **Severity**: warning
- **Description**: The source material for four new modules (`_shared/decision-handling.md`, `_shared/token-tracking.md`, `_shared/kb-integration.md`, and agent markdown files) is prose written for human agents, not a formal spec. The 5-tier decision classification system in decision-handling.md is rich with context (batch mode, moonshot handling, escalation format) that may not all belong in a pure function module. The implementer must decide which parts are "business logic" (encodeable as pure functions) vs. "agent behavior" (runtime behavior that stays in agents).
- **Resolution Hint**: The dev feasibility phase should map each section of each `_shared/*.md` file to either (a) a pure function to extract, (b) a Zod schema to extract, or (c) agent behavior to leave as prose. This prevents over-extraction (putting LLM prompt templates in a pure-function package) and under-extraction (leaving decision tables inline).

---

## Story Seed

### Title
Create Shared Business Logic Package — Extend `@repo/workflow-logic` with Decision, Artifact, Context, and Token Modules

### Description

The `@repo/workflow-logic` package currently provides shared status transitions, evidence classification, story ID validation, and directory mapping — pure functions with Zod schemas and zero runtime dependencies. It is already a proven cross-environment package: both Claude Code agents (via direct import) and LangGraph nodes (e.g., `nodes/qa/evidence-judge.ts`) consume it.

However, four additional categories of business logic remain stranded: either as prose in `.claude/agents/_shared/` markdown files, or as inline logic inside individual LangGraph nodes without extraction into the shared package. These are:

1. **Decision classification** — the 5-tier system (Clarification, Preference, Ambiguous, Destructive, External) currently defined only in `decision-handling.md` as prose. Any LangGraph node replicating this logic independently will drift from what Claude agents use.
2. **Artifact management strategies** — rules governing which artifact type maps to which phase, how upsert vs. create is decided, how artifact content should be shaped. Currently prose in `kb-integration.md`.
3. **KB context retrieval helpers** — canonical query patterns for domain/task/role combinations. Currently prose in `kb-integration.md`.
4. **Token tracking** — the in/out accounting protocol defined in `token-tracking.md`. Currently prose only.

This story extends `@repo/workflow-logic` with four new modules — `decision/`, `artifact/`, `context/`, `token/` — each following the exact pattern established by `evidence-judge/`: Zod schemas at the top, pure exported functions below, no external runtime dependencies. The result is a single authoritative TypeScript source of truth that both execution environments can import, eliminating behavioral drift between prose-guided Claude agents and code-driven LangGraph nodes.

### Initial Acceptance Criteria

- [ ] AC-1: A `decision/` module is added to `packages/backend/workflow-logic/src/` exporting a `DecisionTierSchema` (5-tier enum: `clarification`, `preference`, `ambiguous`, `destructive`, `external`), a `classifyDecisionTier(description: string): DecisionTier` pure function, and a `shouldEscalate(tier: DecisionTier, autonomyLevel: AutonomyLevel): boolean` pure function. All encoding is faithful to `_shared/decision-handling.md`.
- [ ] AC-2: An `artifact/` module is added exporting `ArtifactTypeSchema`, `ArtifactPhaseSchema`, a `getArtifactPhase(artifactType: ArtifactType): ArtifactPhase` pure function, and an `isValidArtifactForPhase(artifactType: ArtifactType, phase: ArtifactPhase): boolean` pure function. Types match the artifact type reference table in `_shared/kb-integration.md`.
- [ ] AC-3: A `context/` module is added exporting `buildContextQuery(domain: string, taskType: string, role: ContextRole): string` and `buildBlockerQuery(domain: string): string` — pure functions that produce canonical KB search query strings matching the patterns in `_shared/kb-integration.md`.
- [ ] AC-4: A `token/` module is added exporting `TokenUsageSchema` (Zod schema for `{ inputTokens: number, outputTokens: number, model: string, agentName: string }`), a `estimateTokenCount(content: string): number` pure function (approximation: bytes / 4), and a `formatTokenSummary(usage: TokenUsage): string` pure function producing the standard `In: ~X / Out: ~Y` format.
- [ ] AC-5: All four new modules are exported from the package's `src/index.ts` following the existing named-export pattern (schemas + types + functions, no barrel re-exports).
- [ ] AC-6: Each new module has unit tests in `src/__tests__/` covering all exported functions with at minimum: happy path, boundary/edge case, and invalid-input cases.
- [ ] AC-7: All exported types use Zod schemas with `z.infer<>` — no TypeScript `interface` declarations in any new file.
- [ ] AC-8: `pnpm test` passes for `@repo/workflow-logic` with at minimum 60% coverage for the new modules.
- [ ] AC-9: `pnpm check-types` passes for `@repo/workflow-logic` and `@repo/orchestrator` (confirming no import breaks).
- [ ] AC-10: `@repo/workflow-logic`'s `package.json` `dependencies` list does not grow — no new runtime dependencies added.

### Non-Goals

- Do NOT port LangGraph node infrastructure (state types, `createToolNode`, circuit breakers) into workflow-logic
- Do NOT move `_shared/*.md` prose files or replace them — they are the source-of-truth for human agents; workflow-logic is the TypeScript encoding
- Do NOT extract the full decision-handling runtime flow (batch mode queue, escalation formatting, KB logging calls) — only the pure classification predicates
- Do NOT add DB access, HTTP calls, or file I/O to any workflow-logic module
- Do NOT create new barrel files (`index.ts` that purely re-exports from multiple sub-modules without adding anything)
- Do NOT modify existing workflow-logic modules unless needed to integrate new exports into `index.ts`
- Do NOT update the orchestrator LangGraph nodes to use the new modules — that is a follow-on story (WINT-9020 or similar)

### Reuse Plan

- **Components**: N/A (backend package, no UI components)
- **Patterns**: `evidence-judge/index.ts` structure for all four new modules; `transitions/index.ts` for decision table encoding
- **Packages**: `zod` (already in dependencies), `@repo/logger` (already in dependencies, available but not required for pure modules)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
All new functions are pure — 100% unit testability is achievable. Test strategy: for each module, define a matrix of valid/invalid inputs and expected outputs; use Vitest's `it.each` for parameterized tests. Focus on encoding fidelity (does `shouldEscalate(tier, autonomyLevel)` match the decision matrix in `decision-handling.md`?). No mocking required. Target: 100% branch coverage for all decision/classification functions.

### For UI/UX Advisor
No UI involvement. This is a pure backend shared-library story. Skip UX review.

### For Dev Feasibility
Key feasibility questions to resolve:
1. **Scope boundary for `decision/` module**: Which parts of `_shared/decision-handling.md` are purely classifiable (encodeable as pure functions) vs. runtime behavior? Recommend mapping each section explicitly before implementation. Pure: tier definitions, escalation matrix, batch mode decision flags. Not pure: KB logging calls, AskUserQuestion invocation, batch queue management.
2. **Scope boundary for `artifact/` module**: The artifact type reference table in `kb-integration.md` is static and fully encodeable. But `kb_write_artifact`/`kb_read_artifact` call patterns involve the MCP SDK and must NOT be extracted — only the metadata (which type maps to which phase) should go into workflow-logic.
3. **Scope boundary for `context/` module**: Query string builders are pure. The actual `kb_search` invocations are side-effectful and must stay in agents/nodes.
4. **Dependency check**: Confirm `@repo/workflow-logic`'s `package.json` does not need `@repo/logger` added — the package already has it. If any new module logs, `@repo/logger` is available.
5. **Canonical reference for subtask decomposition**: `packages/backend/workflow-logic/src/evidence-judge/index.ts` is the template. Subtasks should be: (a) `decision/` module + tests, (b) `artifact/` module + tests, (c) `context/` module + tests, (d) `token/` module + tests, (e) update `src/index.ts` exports, (f) type-check + test pass across both packages.

## Tokens
- In: ~12000 (bytes read / 4)
- Out: ~3200 (bytes written / 4)
