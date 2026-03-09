---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-9050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 9 LangGraph parity work; no LangGraph-specific patterns documented

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| QA nodes (nodes/qa/) | `packages/backend/orchestrator/src/nodes/qa/` | 6 existing nodes: check-preconditions, verify-acs, run-unit-tests, run-e2e-tests, gate-decision, write-qa-artifact — with co-located `__tests__/` |
| evidence-judge agent | `.claude/agents/evidence-judge.agent.md` | Source agent with explicit LangGraph porting notes in "LangGraph Porting Notes" section |
| `createToolNode` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Standard factory for tool-class nodes (lower retries, shorter timeout) |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Circuit breaker for model calls |
| Evidence schema (Zod) | `packages/backend/orchestrator/src/artifacts/evidence.ts` | `EvidenceSchema`, `EvidenceItemSchema`, `AcceptanceCriteriaEvidenceSchema` — all in use by existing QA nodes |
| WINT-9010 workflow-logic package | `packages/backend/workflow-logic/src/` | Shared business logic package (in-qa); currently exports status transitions and validation — portable pure functions target |
| `@repo/logger` | `packages/core/logger/` | Standard logging, used throughout existing QA nodes |

### Active In-Progress Work

| Story | Status | Relevance |
|-------|--------|-----------|
| WINT-9010 | in-qa | Hard dependency — workflow-logic package must be available. Evidence strength classifiers should be extracted there per agent spec. Block until in-qa resolves to UAT/completed. |
| WINT-4070 | pending | Hard dependency — cohesion-prosecutor agent (source agent for a parallel Phase 9 port, WINT-9030). WINT-9050 depends on WINT-4070 per index, though the runtime coupling is indirect — evidence-judge does not call cohesion-prosecutor. Authoring is independent. |
| WINT-9030 | created | Parallel Phase 9 port (cohesion-prosecutor → nodes/story/cohesion-check.ts). Shares the same `nodes/story/` sibling pattern. |
| WINT-9040 | created | Parallel Phase 9 port (scope-defender → nodes/story/scope-defend.ts). Same pattern. |
| WINT-9105 | ready-for-qa | ADR for LangGraph error handling and retry strategy. May introduce binding constraints on node retry config. |
| WINT-9107 | uat | Node-level retry and circuit breaker middleware — surfaces `createNode`, `withNodeRetry`, `NodeCircuitBreaker` as the canonical middleware API. |

### Constraints to Respect

- Protected: All production DB schemas in `packages/backend/database-schema/` — not touched by this story
- Protected: Orchestrator artifact schemas — read-only for this story (no new schema required, EvidenceItemSchema already exists)
- Protected: `@repo/db` client API surface — not touched
- Code convention: Zod-first types (no TypeScript interfaces)
- Code convention: No barrel files — import directly from source
- Code convention: `@repo/logger` for logging, never `console.*`
- Node factory: Use `createToolNode` for tool-class nodes (file I/O, no model calls needed for the pure classifier logic)
- No MCP tool calls — evidence-judge spec v1.0 is file-based I/O only

---

## Retrieved Context

### Related Endpoints

None — this story is backend orchestrator logic only, no HTTP endpoints involved.

### Related Components

None — this story has no UI component impact.

### Reuse Candidates

| Item | Location | Why |
|------|----------|-----|
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Standard factory for all file-I/O / computation nodes in nodes/qa/ |
| `EvidenceItemSchema`, `EvidenceSchema` | `packages/backend/orchestrator/src/artifacts/evidence.ts` | Already validated evidence types; use for input parsing |
| `QAGraphState` type | `packages/backend/orchestrator/src/graphs/qa.ts` | State type used by all existing QA nodes — extend for evidenceJudge fields |
| `@repo/logger` | standard | Lifecycle logging pattern established in all qa/* nodes |
| `workflow-logic` package | `packages/backend/workflow-logic/src/` | Target location for `classifyEvidenceStrength`, `deriveAcVerdict`, `deriveOverallVerdict` pure functions (per agent porting notes) |
| `verify-acs.ts` pattern | `packages/backend/orchestrator/src/nodes/qa/verify-acs.ts` | Closest structural analogue: iterates AC list, per-AC processing, structured log events, `createToolNode`, model failure → BLOCKED |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| QA LangGraph node (file I/O + AC iteration) | `packages/backend/orchestrator/src/nodes/qa/verify-acs.ts` | Closest analogue: iterates ACs from evidence state, per-AC log events (`qa_ac_verification_started`, `qa_ac_verified`), `createToolNode`, model failure → BLOCKED; evidence-judge follows the same per-AC loop but with strength classification instead of model calls |
| QA node test pattern | `packages/backend/orchestrator/src/nodes/qa/__tests__/verify-acs.test.ts` | Co-located test structure, mock ModelClient injection, makeState() helper pattern — adopt for evidence-judge tests |
| Shared pure function package | `packages/backend/workflow-logic/src/index.ts` | Module structure for portable business logic: `__types__/`, `__tests__/`, named pure function exports — follow for classifier extraction |
| Evidence schema reference | `packages/backend/orchestrator/src/artifacts/evidence.ts` | `EvidenceItemSchema` (with `type` enum: test, http, command, file, screenshot, manual, e2e) is the ground truth for what evidence items look like — classifier must align with these types |

---

## Knowledge Context

### Lessons Learned

- **[WINT-9020]** LangGraph doc-sync port succeeded by keeping the 4-phase logical contract from the agent spec as the implementation skeleton.
  - *Applies because*: evidence-judge has a well-defined 4-phase contract (Load → Evaluate Strength → Apply Challenge → Produce Output) in the agent spec's LangGraph porting notes — use it as the literal implementation scaffold.

- **[WINT-9107]** Middleware API (`createNode` vs `createToolNode`) selection matters: `createToolNode` is correct for computation/file-I/O nodes that do not make model calls; `createNode` with explicit retry config is for model-calling nodes.
  - *Applies because*: evidence-judge Phase 2 and 3 are pure computation (no model calls). Only use `createToolNode`. If a model is added in a future iteration (e.g., for challenge reasoning), switch to `createNode`.

- **[Pattern]** Co-located `__tests__/` directory under `nodes/qa/__tests__/` is the established pattern — every QA node has a sibling test file.
  - *Applies because*: `evidence-judge.ts` must have `__tests__/evidence-judge.test.ts` alongside it.

### Blockers to Avoid (from past stories)

- Attempting to implement before WINT-9010 is merged — workflow-logic package changes may conflict with extracted pure functions. Wait for WINT-9010 to reach UAT or completed before writing to workflow-logic.
- Extracting classifier logic directly into `nodes/qa/evidence-judge.ts` instead of `workflow-logic/` — the agent spec explicitly requires extraction into the shared package.
- Using TypeScript `interface` instead of Zod schemas for any new types introduced (e.g., `AcVerdict`, `EvidenceJudgeResult`).
- Importing from barrel files — use direct source imports throughout.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | All new node code requires co-located unit tests; UAT uses real services |
| WINT-9105 | LangGraph Error Handling ADR | Defines binding retry and circuit-breaker strategy — read before choosing node factory and retry config |

### Patterns to Follow

- 4-phase logical flow from agent spec: Load Inputs → Evaluate Evidence Strength → Apply Adversarial Challenge → Produce Output
- Per-AC iteration with structured log events (matching pattern in verify-acs.ts: `qa_{node}_started`, `qa_{node}_complete` per AC)
- `createToolNode` factory — no circuit breaker needed (pure computation, no model calls in v1.0)
- Zod schemas for all new types: `AcVerdictSchema`, `EvidenceJudgeResultSchema`, `EvidenceJudgeOutputSchema`
- Extract `classifyEvidenceStrength`, `deriveAcVerdict`, `deriveOverallVerdict` as pure functions into `workflow-logic` (not inline in the node)
- Write `ac-verdict.json` output to `{story_dir}/_implementation/ac-verdict.json` (idempotent overwrite)
- Graceful degradation: missing EVIDENCE.yaml → all-REJECT result (not crash), missing optional inputs → warning count increment

### Patterns to Avoid

- Making model calls in this node (v1.0 is pure computation — evidence classification is mechanical, not LLM-driven)
- Putting classifier logic inline in the node file instead of extracting to workflow-logic
- Throwing errors for missing optional inputs — degrade gracefully with warnings
- Returning `FAIL` from the node itself — `overall_verdict: FAIL` is a valid evaluation outcome, not a node error; the node should always return successfully unless completely blocked

---

## Conflict Analysis

### Conflict: Dependency on WINT-9010 (in-qa)
- **Severity**: warning
- **Description**: WINT-9010 (shared business logic package) is the target location for the pure classifier functions. It is currently in-qa and not yet merged. Writing to `workflow-logic/` concurrently with WINT-9010 QA risks merge conflicts.
- **Resolution Hint**: Authoring of evidence-judge.ts can proceed independently (the node file itself does not require WINT-9010 to be merged). Extract classifiers into a stub module within `workflow-logic/` only after WINT-9010 reaches UAT. Alternatively, implement classifiers inline first and extract as a follow-up sub-task once WINT-9010 merges.

---

## Story Seed

### Title

Create evidence-judge LangGraph Node (`nodes/qa/evidence-judge.ts`)

### Description

The evidence-judge Claude Code agent (`evidence-judge.agent.md`) performs adversarial AC evidence evaluation as part of the Phase 4 QA workflow. It classifies each evidence item as STRONG or WEAK using mechanical rules, derives per-AC verdicts (ACCEPT / CHALLENGE / REJECT), and writes `ac-verdict.json` for downstream Round Table synthesis.

WINT-9050 ports this agent's 4-phase logical contract to a native TypeScript LangGraph node at `packages/backend/orchestrator/src/nodes/qa/evidence-judge.ts`, enabling evidence-based QA to run identically in both the Claude Code workflow and the LangGraph workflow without subprocess delegation.

The implementation also extracts the three core pure functions — `classifyEvidenceStrength`, `deriveAcVerdict`, `deriveOverallVerdict` — into `packages/backend/workflow-logic/` as the shared business logic package (WINT-9010 pattern), so both workflows share the same classification algorithm.

### Initial Acceptance Criteria

- [ ] AC-1: `packages/backend/orchestrator/src/nodes/qa/evidence-judge.ts` exists and exports a `createEvidenceJudgeNode` factory function following the `createToolNode` pattern used in all `nodes/qa/*` nodes.
- [ ] AC-2: `packages/backend/workflow-logic/src/` contains three exported pure functions: `classifyEvidenceStrength(item: EvidenceItem): 'STRONG' | 'WEAK'`, `deriveAcVerdict(strongCount: number, weakCount: number, totalItems: number): 'ACCEPT' | 'CHALLENGE' | 'REJECT'`, and `deriveOverallVerdict(acVerdicts: AcVerdictResult[]): 'PASS' | 'CHALLENGE' | 'FAIL'`.
- [ ] AC-3: `classifyEvidenceStrength` implements the mechanical per-type rules and the subjective language blocklist (`appears`, `seems`, `should`, `looks`) from the agent spec, with blocklist check applied after per-type check.
- [ ] AC-4: `deriveAcVerdict` implements the binary decision rules: zero evidence → REJECT, all WEAK → CHALLENGE, at least one STRONG → ACCEPT.
- [ ] AC-5: The node processes EVIDENCE.yaml state field via the existing `EvidenceItemSchema` and `AcceptanceCriteriaEvidenceSchema` from `artifacts/evidence.ts` — no new schema for the evidence input format.
- [ ] AC-6: Missing EVIDENCE.yaml (null evidence state): all ACs receive REJECT verdict with `challenge_reason: "no evidence bundle found"`; node returns result with warnings array (does not throw).
- [ ] AC-7: The node writes `ac-verdict.json` to the story directory path resolved from state, conforming to the schema defined in the agent spec (story_id, generated_at, overall_verdict, ac_verdicts[], total_acs, accepted, challenged, rejected).
- [ ] AC-8: Overwriting an existing `ac-verdict.json` is idempotent — no error thrown if the file already exists.
- [ ] AC-9: `packages/backend/orchestrator/src/nodes/qa/__tests__/evidence-judge.test.ts` exists with unit tests covering: (a) all-ACCEPT path, (b) mixed ACCEPT/CHALLENGE/REJECT path, (c) zero-evidence REJECT path, (d) subjective language downgrade, (e) missing evidence null state.
- [ ] AC-10: All existing `nodes/qa/__tests__/*.test.ts` tests continue to pass without modification.
- [ ] AC-11: New code passes TypeScript compilation (`pnpm check-types`) with no new errors.
- [ ] AC-12: New code passes ESLint with no errors on changed/new files.

### Non-Goals

- Running or re-executing tests — the node reads `EVIDENCE.yaml` state only; no subprocess invocations.
- Making LLM/model calls — evidence classification is purely mechanical in v1.0.
- Writing to the Knowledge Base or any MCP tool stores.
- Replacing or modifying the existing QA verification leader agent behavior.
- Producing a blocking gate decision — `overall_verdict: FAIL` is a valid output, not a node failure.
- Integrating `evidence-judge` into the LangGraph QA graph routing — that is owned by WINT-4120 (workflow integration) and WINT-4140 (Round Table).
- Implementing DB-based evidence retrieval (deferred to after WINT-7060 lands, per agent spec).

### Reuse Plan

- **Components**: `createToolNode` (runner/node-factory), `EvidenceItemSchema` / `AcceptanceCriteriaEvidenceSchema` (artifacts/evidence.ts), `QAGraphState` type extension (graphs/qa.ts)
- **Patterns**: Per-AC iteration loop from `verify-acs.ts`; co-located `__tests__/` structure; Zod-first type definitions; `@repo/logger` structured log events
- **Packages**: `@repo/workflow-logic` (target for pure function extraction), `@repo/logger`, `zod`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The node is pure computation with no model calls, making unit testing straightforward. The key test cases are enumerated directly from the binary decision rules in the agent spec:
- Each evidence type (test, command, e2e, http) requires STRONG/WEAK classification coverage
- Subjective language blocklist must be tested: an item that passes per-type STRONG criteria but contains blocklisted words must be downgraded to WEAK
- The three `deriveOverallVerdict` paths (PASS, CHALLENGE, FAIL) need explicit coverage
- Graceful degradation paths (null evidence, missing story_file_path) require error-path tests
- AC-7 (ac-verdict.json write) can be tested by mocking `fs.writeFile` or writing to a temp directory
- UAT: verify the node can be invoked from a QA graph with a real EVIDENCE.yaml fixture and produces valid ac-verdict.json output

### For UI/UX Advisor

No UI/UX impact — this story is entirely backend orchestrator logic. No user-facing changes.

### For Dev Feasibility

Implementation is straightforward TypeScript:
1. **Extract pure functions first** into `workflow-logic/`: `classifyEvidenceStrength`, `deriveAcVerdict`, `deriveOverallVerdict`. These are mechanical rule applications (no async, no I/O). Target: `packages/backend/workflow-logic/src/evidence-judge/index.ts` following the `transitions/`, `validation/` module pattern.
2. **Create `nodes/qa/evidence-judge.ts`** using `createToolNode`. State input reads `evidence` field (already typed as `QAGraphState.evidence`). File output uses `fs.writeFile` (or Node `fs/promises`) to write `ac-verdict.json`.
3. **Create `__tests__/evidence-judge.test.ts`** co-located under `nodes/qa/__tests__/`.

Dependency sequencing risk: if WINT-9010 is still in-qa when authoring starts, implement classifier functions inline in `evidence-judge.ts` first and extract to `workflow-logic` as a second commit once WINT-9010 merges. This avoids blocking on the dependency while still meeting the final extraction requirement.

Canonical references for subtask decomposition:
- `packages/backend/orchestrator/src/nodes/qa/verify-acs.ts` — node structure template
- `packages/backend/workflow-logic/src/transitions/index.ts` — pure function module template
- `packages/backend/orchestrator/src/artifacts/evidence.ts` — `EvidenceItemSchema` type enum (test, http, command, file, screenshot, manual, e2e)
- `.claude/agents/evidence-judge.agent.md` — authoritative classification rules, output schema, graceful degradation contract
