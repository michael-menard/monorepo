---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-1060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No QA graph exists in the codebase. No autonomous test-execution runner exists. The orchestrator package at `packages/backend/orchestrator/` has a `QaVerifySchema` artifact schema at `src/artifacts/qa-verify.ts` and an `EvidenceSchema` at `src/artifacts/evidence.ts` — these are the closest existing data contracts to what APIP-1060 will produce and consume. All APIP pipeline work is pre-implementation; the QA graph cannot be built until the Review Graph (APIP-1050) and Implementation Graph (APIP-1030) exist.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `QaVerifySchema` + helpers | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | Existing Zod schema for QA results (`AcVerificationSchema`, `TestResultsSchema`, `QaIssueSchema`, `QaVerifySchema`); `calculateVerdict()`, `qaPassedSuccessfully()`, `addAcVerification()` helpers — the QA graph artifact extends or adopts this schema |
| `EvidenceSchema` (v2) | `packages/backend/orchestrator/src/artifacts/evidence.ts` | Primary input to the QA graph: `AcceptanceCriteriaEvidenceSchema`, `CommandRunSchema`, `E2ETestsSchema`, `TouchedFileSchema` — the QA graph reads this artifact to verify AC fulfillment |
| `ReviewSchema` + helpers | `packages/backend/orchestrator/src/artifacts/review.ts` | Secondary input: `WorkerResultSchema`, `FindingSchema`, `RankedPatchSchema` — the QA graph reads the review artifact to confirm review PASS before running QA |
| Elaboration LangGraph graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Exemplar LangGraph `StateGraph` structure: `ElaborationStateAnnotation`, `.addNode()`, `.addConditionalEdges()`, `runElaboration()` — QA graph follows the same compositional pattern |
| `createToolNode` node factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | All QA graph nodes must use this factory: timeout, circuit breaker, retry, and error classification are wired in automatically |
| Error classification | `packages/backend/orchestrator/src/runner/error-classification.ts` | TRANSIENT vs PERMANENT error categories — QA graph uses these to decide whether to retry test execution or immediately fail |
| YAML artifact persistence | `packages/backend/orchestrator/src/artifacts/` (established pattern) | All QA outputs (QA artifact YAML) must be persisted under the story feature directory using the established Zod-validated YAML pattern |
| Knowledge Base MCP tools | `apps/api/knowledge-base/src/mcp-server/` | KB MCP tools are the write-back mechanism for `lessons_to_record` from `QaVerifySchema` — QA graph writes to KB as its final node |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| APIP-1050 (Review Graph) | backlog | Direct dependency — QA graph receives the review artifact as a precondition gate. APIP-1060 elaboration can proceed but implementation is blocked on APIP-1050. |
| APIP-1030 (Implementation Graph) | backlog | Upstream dependency — the implementation graph produces the evidence artifact that QA graph reads. QA graph design must be stable w.r.t. evidence schema. |
| APIP-5006 (Server Infrastructure) | In Elaboration | QA graph runs on the dedicated local server — no Lambda. Full integration tests require the server to be provisioned (same constraint as APIP-0020, APIP-1010). |
| APIP-0040 (Model Router) | In Elaboration | AC verification and gate decision nodes call OpenRouter/Claude — the model router is the correct abstraction for these calls. QA graph should consume model router API, not call OpenRouter directly. |
| APIP-5004 (Secrets Engine) | Ready to Work | OpenRouter API keys and Claude API key needed for AC verification and gate decision nodes. QA graph secrets must route through the secrets engine established by APIP-5004. |

### Constraints to Respect

- **APIP ADR-001 Decision 4**: All pipeline components run on the dedicated local server. No AWS Lambda. QA graph is a LangGraph worker graph on this server.
- **APIP ADR-001 Decision 2**: Supervisor is plain TypeScript — QA graph is a LangGraph worker graph (the correct layer for checkpointing). The supervisor dispatches to the QA graph; the graph itself uses LangGraph StateGraph.
- **No human gate**: The story explicitly requires autonomous verdict — no human approval step. If QA PASS, pipeline advances to merge (APIP-1070). If QA FAIL, pipeline routes back to implementation (APIP-1030) with a structured failure reason.
- **Playwright flakiness risk**: The risk notes flag Playwright E2E flakiness as a primary hazard. The QA graph must implement retry for E2E test execution with configurable max attempts before recording a `FAIL` verdict.
- **Hallucinated PASS risk**: AC verification via model is the most dangerous failure mode — a hallucinated PASS allows broken code to reach merge. Prompt engineering and grounding strategy must be documented and tested.
- **Zod-first types**: All QA graph schemas must use Zod (`z.infer<>`). No TypeScript interfaces.
- **Protected areas**: Do NOT modify `packages/backend/database-schema/` or `@repo/db` client. QA graph artifact state lives in YAML files and LangGraph checkpoint — no Aurora writes from QA graph directly.
- **No barrel files**: Import directly from source.

---

## Retrieved Context

### Related Endpoints

None — APIP-1060 produces a LangGraph worker graph that runs as a server-side process. No HTTP routes or API endpoints.

### Related Components

None — no UI components. The QA graph is a headless orchestration graph.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `QaVerifySchema` + helpers | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | The QA graph's output artifact schema. Reuse `AcVerificationSchema`, `TestResultsSchema`, `QaIssueSchema`, `calculateVerdict()`, `qaPassedSuccessfully()` directly. Extend if needed with graph-specific fields (e.g., retry counts, Playwright attempt tracking). |
| `EvidenceSchema` (v2) | `packages/backend/orchestrator/src/artifacts/evidence.ts` | Input artifact for AC verification node. The `AcceptanceCriteriaEvidenceSchema.evidence_items` array is the primary evidence that the AC verifier node checks. Read-only from QA graph. |
| `ReviewSchema` | `packages/backend/orchestrator/src/artifacts/review.ts` | Precondition gate input. QA graph reads `review.verdict` — if `FAIL`, QA graph immediately returns a BLOCKED verdict without running tests. |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | All QA graph nodes must use `createToolNode('node-name', fn)` factory. Provides timeout, circuit breaker, retry, and error capture. |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Apply circuit breaker per model-calling node (AC verifier, gate decision) to prevent runaway API calls on repeated model failures. |
| Error classification | `packages/backend/orchestrator/src/runner/error-classification.ts` | `isRetryableNodeError()` + `ErrorCategory` — drives retry vs immediate fail for test execution failures and model call failures. |
| Elaboration graph pattern | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Graph composition pattern: `ElaborationStateAnnotation`, `.addNode()`, `.addConditionalEdges()`, `runElaboration()` entry point — QA graph follows identical structure. |
| `@repo/logger` | Used throughout orchestrator | Structured logging in all nodes — `storyId`, `stage`, `verdict`, `durationMs` fields on every lifecycle event. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph StateGraph composition with conditional routing | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Canonical pattern for `StateGraph` construction: `Annotation`, `.addNode()`, `.addConditionalEdges()`, exported `run*()` entry function, config schema with defaults. QA graph follows this structure exactly. |
| Zod artifact schema with helper functions | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | The QA graph's output artifact — already designed for this story's domain. Shows `schema: z.literal(1)` versioning, verdict enum, AC verification array, `calculateVerdict()` helper. QA graph produces this artifact as its primary output. |
| LangGraph node using `createToolNode` factory | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical node structure: Zod schemas at top, pure functions, `createToolNode('name', async (state) => ...)` factory, exported result type, tests in `__tests__/`. Every QA graph node must mirror this. |
| Input evidence artifact (consumed by QA) | `packages/backend/orchestrator/src/artifacts/evidence.ts` | The `EvidenceSchema` is the QA graph's primary input. Shows how `AcceptanceCriteriaEvidenceSchema.evidence_items` is structured — the AC verifier node iterates this array to confirm each AC. |

---

## Knowledge Context

### Lessons Learned

KB search was unavailable in this execution context. The following are inferred from epic elaboration artifacts and peer story seeds:

- **[APIP-0020 seed / testing]** Infrastructure stories do not produce meaningful overall coverage numbers. For a LangGraph worker graph, appropriate test coverage focuses on: (a) individual node unit tests with mocked state, (b) graph compilation and routing tests, (c) integration test verifying the full graph transitions from `start` → `qa_complete` with a mocked test runner.
  - *Applies because*: QA graph is a headless process with no UI surface. Same two-tier test strategy applies: unit (node logic) and graph compilation tests. Full end-to-end with real `pnpm test` invocation is an integration test gated on server availability.

- **[APIP-1010 seed / architecture]** `createToolNode` factory pattern is the mandatory node construction method — config injected at construction, functions mockable for testing.
  - *Applies because*: Every node in the QA graph (test runner, AC verifier, gate decision, KB write-back) must use `createToolNode`. This ensures timeout, circuit breaker, and error classification are automatically applied.

- **[APIP-1020 seed / architecture]** Downstream system consumers of ChangeSpec need structured, typed fields. The same principle applies to the QA artifact — the merge graph (APIP-1070) reads QA output, so `QaVerifySchema` must be stable before APIP-1070 elaboration begins.
  - *Applies because*: QA graph produces `QaVerify` as its output artifact. APIP-1070 (Merge Graph) depends on reading this. Do not change `QaVerifySchema` shape without a versioned migration plan.

- **[RISK-001 / architecture]** Cheap models may produce hallucinated PASS verdicts. This is explicitly flagged as a high-risk failure mode in the story's risk notes.
  - *Applies because*: The AC verification node and gate decision node use model calls. If cheap models are used (via APIP-0040 model router), hallucinated PASS verdicts will allow broken implementations to reach merge. The prompt must include structured evidence grounding and require explicit evidence citation in the model response. The gate decision must use Claude (not Ollama/cheap models) as a hard constraint.

- **[Architecture review 2.3 / architecture]** Stuck detection via wall clock timeout + stream events — do not rely on heartbeats from inside graph nodes.
  - *Applies because*: QA graph runs `pnpm test` and Playwright which can hang indefinitely. Each test execution node must have a wall clock timeout enforced via `createToolNode`'s timeout mechanism or explicit `Promise.race`. A hung test suite must not block the pipeline.

### Blockers to Avoid (from past stories)

- **Playwright E2E flakiness causing false FAILs**: Do not treat a single Playwright failure as definitive FAIL. The QA graph must configure a minimum retry count (e.g., 2-3 attempts) before recording a FAIL verdict for Playwright. Log each attempt's result so the operator can distinguish genuine failures from flakiness.
- **Hallucinated PASS verdicts from AC verifier**: Never route AC verification through Ollama or cheap models. The AC verifier node must use Claude (via APIP-0040 model router with `preferred_model: 'claude'` or equivalent). Prompt must include: (a) the AC text, (b) the evidence items verbatim (not summarized), (c) a strict instruction to respond with `PASS` only if evidence explicitly demonstrates the criterion.
- **Missing structured evidence citation**: The AC verifier must return not just `PASS/FAIL` but the specific evidence item(s) that justify the verdict. Without citation, hallucinated verdicts cannot be detected during review.
- **Test suite execution blocking the graph indefinitely**: `pnpm test` without a timeout can run indefinitely on a hung test. Use `execa` or `child_process.spawn` with an explicit timeout — do not use `execSync`. Capture stdout/stderr for logging and evidence.
- **Mixing QA graph state with Aurora DB writes**: The QA graph writes to KB (via MCP tool) and to YAML artifact files — it does NOT write to Aurora via `@repo/db`. Keep data paths clean.
- **Regressing `QaVerifySchema`**: APIP-1070 (Merge Graph) reads the QA artifact. Do not break the `QaVerifySchema` shape. If fields are added, use `z.optional()` or `z.nullable().default(null)` to preserve backward compatibility.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 4 | Local Dedicated Server | QA graph runs on dedicated local Docker server. No Lambda. Long-running test suites (Playwright, full pnpm test) are the reason Lambda was rejected. |
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | QA graph is a LangGraph worker graph (correct layer). Supervisor dispatches to it via BullMQ job with `stage: 'qa'`. |
| APIP ADR-001 Decision 1 | BullMQ + Redis Queue | Supervisor picks up `stage: 'qa'` jobs from BullMQ. QA graph result is written back via BullMQ job completion, not a direct API call. |
| Monorepo CLAUDE.md | Zod-First Types | All QA graph schemas use Zod. No TypeScript interfaces. |

### Patterns to Follow

- `createQAGraph(config)` factory returning a compiled `StateGraph` — follows `createElaborationGraph()` / `runElaboration()` pattern in `elaboration.ts`
- All nodes implemented via `createToolNode('node-name', async (state: QAGraphState) => ...)` — config injected at construction, functions mockable
- QA graph state annotation extends `Annotation` with fields: `qaVerify`, `testResults`, `acVerifications`, `gateDecision`, `retryCount`, `qaComplete`
- `QaGraphConfigSchema` Zod schema with: `testTimeoutMs`, `playwrightMaxRetries`, `acVerificationModel`, `gateModel`, `enableE2e`, `kbWriteBackEnabled`
- AC verifier prompt must include: AC text, evidence items (verbatim), instruction to cite specific evidence — never infer or summarize
- Gate decision node uses `claude` model (hard constraint in config, not overridable by cheap-model router)
- Write QA artifact YAML under `plans/future/platform/autonomous-pipeline/in-progress/{storyId}/QA-VERIFY.yaml` using established YAML artifact pattern
- `@repo/logger` structured logging: `storyId`, `stage: 'qa'`, `verdict`, `acsVerified`, `testResultSummary`, `durationMs`
- Playwright retry: wrap test execution in a loop up to `playwrightMaxRetries` — only record FAIL if all attempts fail

### Patterns to Avoid

- TypeScript interfaces for QA graph schemas — use Zod with `z.infer<>`
- Calling OpenRouter/Claude directly from nodes — route through APIP-0040 model router abstraction
- Using cheap models (Ollama) for AC verification or gate decision — these are safety-critical, Claude only
- Invoking `pnpm test` or Playwright via `execSync` — use async subprocess with timeout
- Writing QA graph output to Aurora via `@repo/db` — KB write-back goes through KB MCP tool only
- Treating Playwright failures as definitive on first attempt — implement configurable retry
- Producing `PASS` verdict without structured evidence citation in AC verification response
- Skipping graph-level routing tests — must verify `graph.compile()` succeeds and all conditional edges are reachable

---

## Conflict Analysis

### Conflict: Deep dependency chain — APIP-1050 (Review Graph) not yet built
- **Severity**: warning
- **Description**: APIP-1060 depends on APIP-1050 (Review Graph), which depends on APIP-1030 (Implementation Graph), which depends on APIP-1020 (ChangeSpec Spike), which depends on APIP-1010 (Structurer Node). The QA graph cannot be integration-tested until the entire upstream chain is complete. Elaboration and unit test development can proceed independently, but the end-to-end pipeline test (APIP-5002) is gated on this entire chain.
- **Resolution Hint**: Structure APIP-1060 so that the graph, nodes, and unit tests are fully developed and passing before integration with upstream is needed. Design the graph to accept a pre-built `Evidence` artifact and `Review` artifact as inputs — these can be mocked in unit tests using the existing schemas at `artifacts/evidence.ts` and `artifacts/review.ts`.

### Conflict: Model router (APIP-0040) may not be complete when QA graph is being implemented
- **Severity**: warning
- **Description**: The AC verifier and gate decision nodes require calls to Claude (via model router). APIP-0040 is currently in elaboration. If APIP-0040 is not complete when APIP-1060 implementation begins, direct API calls will be needed as a temporary stub.
- **Resolution Hint**: Design the AC verifier and gate decision nodes with an injected `ModelClient` interface (Zod-validated config). In Phase 1 implementation, the ModelClient can be a thin wrapper around the OpenRouter SDK. When APIP-0040 completes, swap the direct client for the model router abstraction without changing the node contract.

---

## Story Seed

### Title

QA Graph with Autonomous Verdict

### Description

**Context**: The autonomous pipeline produces an implementation (via APIP-1030) that passes through a multi-dimensional code review (via APIP-1050). Before the Merge Graph (APIP-1070) is allowed to commit and merge the changes, a quality gate must autonomously validate two things: (1) all tests pass, and (2) each acceptance criterion is demonstrably fulfilled. This is the QA Graph.

**Problem**: There is no automated quality gate in the pipeline today. The existing `QaVerifySchema` at `packages/backend/orchestrator/src/artifacts/qa-verify.ts` defines the data contract for QA results and the `EvidenceSchema` at `packages/backend/orchestrator/src/artifacts/evidence.ts` defines the implementation evidence — but no LangGraph graph exists to orchestrate the test execution, evidence verification, and gate decision process autonomously.

**Proposed Solution Direction**: The QA Graph is a LangGraph `StateGraph` with the following node sequence:

1. **`check-preconditions`**: Reads the review artifact — if `review.verdict !== 'PASS'`, immediately returns `QA_BLOCKED` without running tests. Reads the evidence artifact — if missing, returns `QA_BLOCKED`.
2. **`run-unit-tests`**: Executes `pnpm test` in the story's worktree via async subprocess with timeout. Records `TestResults` (pass/fail counts) and stdout/stderr. Retries on timeout-related failures up to `testTimeoutRetries` config.
3. **`run-e2e-tests`** (conditional — skipped if `enableE2e: false`): Executes Playwright against the story's changes with configurable retry (`playwrightMaxRetries`). Only records `FAIL` if all attempts fail. Captures video/screenshot paths.
4. **`verify-acs`**: For each AC in the evidence artifact, calls the AC verifier model (Claude only) with: the AC text, the evidence items verbatim, a strict citation instruction. Returns `AcVerification` with `PASS/FAIL/BLOCKED` and the specific evidence item cited.
5. **`gate-decision`**: Aggregates all AC verifications and test results. Calls the gate model (Claude only) with the full QA state for a final structured verdict: `PASS`, `FAIL`, or `BLOCKED`. Records the reasoning.
6. **`write-qa-artifact`**: Persists the `QaVerify` YAML artifact to the story's feature directory. Writes `lessons_to_record` to the Knowledge Base via KB MCP tools.

On `PASS` verdict, the supervisor advances the story to the Merge Graph (APIP-1070). On `FAIL` or `BLOCKED`, the supervisor routes back to the Implementation Graph (APIP-1030) with the QA artifact as the failure context, enabling the implementation agent to address specific failing ACs or test failures.

The graph follows the established LangGraph `StateGraph` pattern from `packages/backend/orchestrator/src/graphs/elaboration.ts` and all nodes use the `createToolNode` factory from `packages/backend/orchestrator/src/runner/node-factory.ts`.

### Initial Acceptance Criteria

- [ ] AC-1: A `QAGraphConfigSchema` Zod schema exists with fields: `testTimeoutMs: z.number().positive().default(300000)` (5 min), `testTimeoutRetries: z.number().int().min(0).default(1)`, `playwrightMaxRetries: z.number().int().min(0).default(2)`, `enableE2e: z.boolean().default(true)`, `acVerificationModel: z.literal('claude').default('claude')`, `gateModel: z.literal('claude').default('claude')`, `kbWriteBackEnabled: z.boolean().default(true)`, `nodeTimeoutMs: z.number().positive().default(30000)` — placed at `packages/backend/orchestrator/src/graphs/qa.ts` (or equivalent new QA graph module)

- [ ] AC-2: A `QAGraphStateAnnotation` Zod-first LangGraph annotation exists with fields: `evidence` (EvidenceSchema nullable), `review` (ReviewSchema nullable), `testResults` (TestResultsSchema nullable), `playwrightAttempts` (number, default 0), `acVerifications` (array of AcVerificationSchema, default []), `gateDecision` (string nullable — raw gate model response), `qaVerify` (QaVerifySchema nullable), `qaComplete` (boolean, default false), `qaVerdict` (enum `PASS | FAIL | BLOCKED`, nullable)

- [ ] AC-3: A `check-preconditions` node exists: reads `state.review` — if `review.verdict === 'FAIL'`, sets `qaVerdict: 'BLOCKED'` and `qaComplete: true` with reason "Review FAIL: QA blocked until review passes"; reads `state.evidence` — if null, sets `qaVerdict: 'BLOCKED'` with reason "Evidence artifact missing"; otherwise sets state as ready to proceed to test execution

- [ ] AC-4: A `run-unit-tests` node exists: invokes `pnpm test` in the story's worktree directory via async `child_process.spawn` with a configurable timeout (`testTimeoutMs`); captures stdout, stderr, exit code; records pass/fail counts in `testResults.unit`; on timeout, retries up to `testTimeoutRetries` before recording `FAIL`; uses `createToolNode('run-unit-tests', fn)` factory; appends a `CommandRun` entry to a `commands_run` state array with `result: 'SUCCESS' | 'FAIL'`

- [ ] AC-5: A `run-e2e-tests` node exists (only reached when `enableE2e: true`): invokes Playwright via async subprocess with `testTimeoutMs`; retries up to `playwrightMaxRetries` — records per-attempt results in `playwrightAttempts`; only sets `testResults.e2e.fail > 0` if ALL attempts fail; captures video/screenshot artifact paths; uses `createToolNode('run-e2e-tests', fn)` factory; when `enableE2e: false`, the graph routing skips this node entirely via conditional edge

- [ ] AC-6: A `verify-acs` node exists: iterates `state.evidence.acceptance_criteria`; for each AC, calls the AC verification model (Claude, routed via model client abstraction) with a prompt containing: (a) the AC text verbatim, (b) all evidence items for that AC verbatim, (c) an instruction to respond with structured JSON `{ status: 'PASS' | 'FAIL' | 'BLOCKED', cited_evidence: string, reasoning: string }` and to respond PASS only if a specific evidence item explicitly demonstrates the criterion; accumulates results in `state.acVerifications`; a model call failure for a single AC records that AC as `BLOCKED` (not FAIL) and continues processing remaining ACs

- [ ] AC-7: The AC verification prompt is a documented, versioned string constant (not inline) — stored as a named export `AC_VERIFICATION_PROMPT_V1` in the `verify-acs` node file; the prompt includes explicit anti-hallucination instruction: "Do not infer, assume, or extrapolate. Only respond PASS if the provided evidence explicitly demonstrates the criterion."

- [ ] AC-8: A `gate-decision` node exists: aggregates `state.acVerifications` and `state.testResults`; calls the gate model (Claude) with the full QA state summary; the gate model response is parsed for a structured verdict `{ verdict: 'PASS' | 'FAIL' | 'BLOCKED', blocking_issues: string[], reasoning: string }`; sets `state.qaVerdict` and `state.gateDecision`; uses `createToolNode('gate-decision', fn)` factory; on model call failure, sets `qaVerdict: 'BLOCKED'` with reason "Gate model unavailable"

- [ ] AC-9: A `write-qa-artifact` node exists: constructs a `QaVerify` object using `createQaVerify(storyId)` + helpers from `qa-verify.ts`; persists it as `QA-VERIFY.yaml` under `plans/future/platform/autonomous-pipeline/in-progress/{storyId}/` using the established YAML artifact persistence pattern; if `kbWriteBackEnabled: true`, writes each `lessons_to_record` entry to the KB via KB MCP tool; sets `state.qaComplete: true`

- [ ] AC-10: The QA graph is wired as a `StateGraph` with edges: `START → check-preconditions → [run-unit-tests | END (if BLOCKED)]`; `run-unit-tests → [run-e2e-tests (if enableE2e) | verify-acs]`; `run-e2e-tests → verify-acs`; `verify-acs → gate-decision`; `gate-decision → write-qa-artifact → END`; all conditional edges use Zod-validated routing functions

- [ ] AC-11: A `runQA(evidence, review, config)` entry function is exported from the QA graph module; it accepts pre-built `Evidence` and `Review` artifact objects plus `QAGraphConfig`; returns a `QAGraphResult` containing the final `QaVerify` artifact and `verdict` string; the function signature is backward-compatible — `config` has defaults for all fields

- [ ] AC-12: When `qaVerdict === 'PASS'`, all of the following are true: all `acVerifications[].status === 'PASS'`, `testResults.unit.fail === 0`, `testResults.e2e.fail === 0` (if E2E enabled), `architecture_compliant === true`, no issues with `severity === 'critical' | 'high'` — these checks are encoded in `qaPassedSuccessfully()` from `qa-verify.ts` which is called before returning PASS

- [ ] AC-13: Unit tests exist in `packages/backend/orchestrator/src/graphs/__tests__/qa.test.ts` covering: (a) preconditions BLOCKED path when review FAIL, (b) preconditions BLOCKED path when evidence missing, (c) happy path with all tests passing and all ACs verified PASS → final `PASS` verdict, (d) unit test FAIL path → final `FAIL` verdict, (e) AC verification FAIL for at least one AC → final `FAIL` verdict, (f) E2E retry path: first attempt fails, second succeeds → `PASS`, (g) E2E all retries fail → `FAIL`, (h) gate model failure → `BLOCKED` verdict, (i) `enableE2e: false` routing skips E2E node, (j) `graph.compile()` succeeds

- [ ] AC-14: Unit tests exist for each node in `packages/backend/orchestrator/src/nodes/qa/__tests__/` covering: check-preconditions, run-unit-tests (timeout path, retry path, success path), run-e2e-tests (retry logic, all-fail path), verify-acs (PASS path, FAIL path, model failure → BLOCKED per AC, anti-hallucination prompt structure), gate-decision (PASS aggregate, FAIL aggregate, model failure → BLOCKED), write-qa-artifact (YAML persistence, KB write-back conditional on config)

- [ ] AC-15: The `QaVerifySchema` at `packages/backend/orchestrator/src/artifacts/qa-verify.ts` is NOT modified in a breaking way — any additions use `z.optional()` or `z.nullable().default(null)` to preserve backward compatibility with APIP-1070 (Merge Graph) which reads this artifact

- [ ] AC-16: Structured logs are emitted via `@repo/logger` for every lifecycle transition: `qa_preconditions_check`, `qa_unit_tests_started`, `qa_unit_tests_complete`, `qa_e2e_started`, `qa_e2e_attempt`, `qa_e2e_complete`, `qa_ac_verification_started`, `qa_ac_verified` (per AC), `qa_gate_decision`, `qa_artifact_written` — minimum fields on every event: `storyId`, `stage: 'qa'`, `durationMs`

### Non-Goals

- Implementing the Merge Graph (APIP-1070) — that story consumes the QA artifact this graph produces.
- Implementing the Implementation Graph loop that handles QA FAIL routing (APIP-1030) — QA graph outputs a verdict; routing back to implementation is the supervisor's responsibility.
- Implementing a human-approval gate — this story explicitly targets autonomous verdict with no human in the loop.
- Building the operator CLI or dashboard visibility for QA results — APIP-5005, APIP-2020.
- Modifying `packages/backend/database-schema/` or `@repo/db` client — protected.
- Implementing the model router (APIP-0040) — QA graph consumes an injected `ModelClient` abstraction; APIP-0040 provides the router that the supervisor wires in.
- Implementing secrets engine (APIP-5004) — QA graph receives API credentials via environment variables; secrets management is APIP-5004's scope.
- Full E2E pipeline testing (story through complete autonomous loop) — APIP-5002.
- Change telemetry instrumentation — APIP-3010.
- Any UI component changes.

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `StateGraph` composition from `elaboration.ts`; `createToolNode('name', fn)` factory for every node; `QaVerify` helpers (`createQaVerify`, `addAcVerification`, `calculateVerdict`, `qaPassedSuccessfully`) from `qa-verify.ts`; async subprocess with timeout for `pnpm test` and Playwright; `Promise.race()` for wall clock timeout enforcement; `@repo/logger` structured logging; Zod-first all schemas; YAML artifact persistence pattern
- **Packages**: `packages/backend/orchestrator` (entire package — `createToolNode`, graph pattern, `QaVerifySchema`, `EvidenceSchema`, `ReviewSchema`, error classification, circuit breaker, `@repo/logger`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply to this story itself. The QA graph *runs* Playwright as part of its operation, but testing the QA graph does not require Playwright for this story's own QA.
- **Two test tiers required**:
  - *Unit tests* (Vitest, no external deps): Mock `child_process.spawn` (for test runner invocation), mock the model client (for AC verifier and gate decision), mock YAML artifact write. Cover all node paths including retry, timeout, BLOCKED, and FAIL branches. Run in CI without server.
  - *Graph compilation tests* (Vitest, no external deps): Verify `graph.compile()` succeeds; verify all conditional edges are reachable; mock node implementations to test routing logic without LLM calls.
- **Hallucination regression tests**: The most important test for the AC verifier is a "false evidence" test: given an AC and evidence items that do NOT actually satisfy the criterion, confirm the model prompt structure produces `FAIL`. This is a prompt structure test (not a live model call) — verify the anti-hallucination instruction is present and correctly positioned in the prompt.
- **Playwright retry test**: Must cover the case where attempt 1 returns non-zero exit code and attempt 2 returns zero exit code → overall `PASS`. This is a critical branch for the flakiness risk.
- **Coverage focus**: `verify-acs` node and `gate-decision` node are the highest-risk nodes. Aim for >90% branch coverage on both. The AC verification prompt construction function should have 100% coverage.
- **Test isolation for subprocess calls**: Use `vi.mock('child_process')` or a process mock utility to avoid actually spawning `pnpm test` in unit tests. Provide mock stdout/stderr fixtures representing passing and failing test outputs.

### For UI/UX Advisor

- No UI impact. The QA graph is invisible to end users.
- The `QaVerify` artifact written to the filesystem is the primary operator-readable output. Keep all string fields (`gateDecision`, `issues[].description`, `acs_verified[].notes`) human-readable and actionable — they will eventually surface in the operator CLI (APIP-5005) and the monitor dashboard (APIP-2020).
- `QaVerify.verdict` string should be unambiguous: `PASS`, `FAIL`, or `BLOCKED` (not `blocked`, `failed`, etc.) — the merge graph and CLI rely on exact string matching.

### For Dev Feasibility

- **File placement decision**: New directory `packages/backend/orchestrator/src/graphs/qa.ts` (graph entry) and `packages/backend/orchestrator/src/nodes/qa/` (individual node files following existing `nodes/elaboration/` structure). Tests in `packages/backend/orchestrator/src/graphs/__tests__/qa.test.ts` and `packages/backend/orchestrator/src/nodes/qa/__tests__/`.
- **Subprocess test execution approach**: Use Node.js `child_process.spawn` (not `execSync`) with explicit timeout. Pattern: `const proc = spawn('pnpm', ['test'], { cwd: worktreeDir, env: process.env }); await Promise.race([exitPromise, timeoutPromise])`. Capture all stdout/stderr for evidence recording. The `worktreeDir` is part of `QAGraphConfig` injected at construction.
- **Model client abstraction**: Define a minimal `ModelClientSchema` Zod type (`{ callModel: (prompt: string, options: ModelCallOptions) => Promise<string> }`). Inject at `createQAGraph(config, { modelClient })`. In Phase 1, implement as a thin OpenRouter SDK wrapper. This makes nodes testable via mock injection without depending on APIP-0040 completion.
- **AC verification prompt strategy**: The verifier calls model once per AC (not batched). This is slower but produces cleaner, auditable per-AC citations. If token cost becomes a concern, batching can be introduced in a follow-up — document this trade-off in the implementation notes.
- **Playwright worktree execution**: Playwright must be invoked in the context of the story's git worktree, not the main repo. The `QAGraphConfig` must include `worktreeDir` (absolute path). Confirm that `pnpm exec playwright test` resolves correctly in a worktree context — this is an integration concern to validate early.
- **Risk: APIP-0040 model router not complete**: If model router is unavailable during implementation, implement `ModelClient` as a direct OpenRouter SDK call with the `claude-3-5-sonnet` model. Document the swap point. Do not hard-code the API key — read from environment variable via secrets engine pattern.
- **Risk: Evidence schema drift (APIP-1030 produces it)**: If `EvidenceSchema` changes during APIP-1030 implementation, the QA graph's input assumptions may break. Design the `check-preconditions` node to validate the evidence artifact via `EvidenceSchema.safeParse()` and record a `BLOCKED` verdict with a descriptive reason if validation fails — this surfaces schema mismatches explicitly rather than producing silent errors.
- **Canonical references for subtask decomposition**:
  - Graph structure to replicate: `packages/backend/orchestrator/src/graphs/elaboration.ts`
  - Node factory to use: `packages/backend/orchestrator/src/runner/node-factory.ts`
  - Output artifact to produce (already exists, reuse): `packages/backend/orchestrator/src/artifacts/qa-verify.ts`
  - Input artifacts to consume (already exist, reuse): `packages/backend/orchestrator/src/artifacts/evidence.ts`, `packages/backend/orchestrator/src/artifacts/review.ts`
  - Graph test pattern to follow: `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts`
