---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: APIP-5000

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB search unavailable at seed time (internal error); lessons section generated from codebase evidence only

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Vitest configuration pattern | `apps/api/lego-api/vitest.config.ts`, `packages/tools/rate-limit/vitest.config.ts`, `apps/api/knowledge-base/vitest.config.ts` | Established vitest.config.ts structure to replicate for autonomous-pipeline package |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-validated YAML artifact schemas; pattern for fixture types in APIP-5000 |
| BullMQ Work Queue (APIP-0010) | `needs-code-review/APIP-0010` | Produces the BullMQ job type contracts APIP-5000 must mock |
| Supervisor Loop (APIP-0020) | `ready-to-work/APIP-0020` | Produces the TypeScript supervisor state contracts APIP-5000 must mock; confirmed NOT a LangGraph graph |
| Knowledge Base test setup | `apps/api/knowledge-base/src/test/setup.ts` | Pattern for test setup files used with `setupFiles` in vitest config |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-0010 BullMQ Work Queue Setup | needs-code-review | APIP-5000 depends on APIP-0010's job type schema being finalised; schema drift before APIP-0010 merges will require fixture updates |
| APIP-0020 Supervisor Loop | in-progress (status shown as ready-to-work but story.yaml has `status: in-progress`) | APIP-5000 depends on the supervisor state contract from APIP-0020; parallel work on the supervisor may shift interfaces |
| APIP-5006 LangGraph Server Infrastructure Baseline | elaboration | APIP-0030 depends on APIP-5006; LangGraph graph mocking (Phase 1 concern) depends on the LangGraph platform version settled in APIP-5006 |

### Constraints to Respect

- No autonomous-pipeline package exists yet in `apps/api/` or `packages/backend/`; APIP-5000 must either (a) gate on APIP-0010 delivering a package scaffold or (b) scope itself to also scaffold the package
- Vitest global minimum coverage: 45% (from CLAUDE.md and knowledge-base vitest.config.ts thresholds)
- Zod-first types required — all fixture factory return types must use `z.infer<>`, not TypeScript interfaces
- No barrel files — test utility imports must reference source files directly
- `@repo/logger` for any logging inside test utilities (never `console.log`)
- APIP-0020 is a plain TypeScript async loop, not a LangGraph graph — mock utilities must reflect this

---

## Retrieved Context

### Related Endpoints

None. APIP-5000 is purely test infrastructure; no HTTP endpoints are involved.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| BullMQ job types (TBD) | `apps/api/autonomous-pipeline/` (post-APIP-0010) | Primary fixture target for unit tests |
| Supervisor state machine (TBD) | `apps/api/autonomous-pipeline/` (post-APIP-0020) | Secondary fixture target; TypeScript async function, not a graph |
| Orchestrator artifact Zod schemas | `packages/backend/orchestrator/src/artifacts/` | Reference pattern for Zod-validated fixture factories |

### Reuse Candidates

| Candidate | Path | How to Reuse |
|-----------|------|--------------|
| Vitest node config pattern | `packages/tools/rate-limit/vitest.config.ts` | Copy structure: `environment: 'node'`, `globals: true`, `include: ['src/**/*.test.ts']`, add coverage thresholds |
| Extended vitest config with coverage thresholds | `apps/api/knowledge-base/vitest.config.ts` | Copy coverage block: `provider: v8`, 45% global thresholds, `fileParallelism: false` for sequential DB-adjacent tests |
| Test setup file pattern | `apps/api/knowledge-base/src/test/setup.ts` | Pattern for `setupFiles` entry that initialises shared test state |
| vi.fn() mock delegation pattern | `packages/tools/rate-limit/src/__tests__/limiter.test.ts` | Pattern for mocking store/worker interfaces with `vi.fn()` and asserting delegation |
| Zod schema test pattern | `packages/backend/orchestrator/src/artifacts/__tests__/story.test.ts` | Pattern for testing that Zod schemas parse and reject correctly — applies to fixture validation |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Vitest config with coverage thresholds | `apps/api/knowledge-base/vitest.config.ts` | Complete config with `provider: v8`, 45% global thresholds, `fileParallelism: false`, `testTimeout: 30000`, and `setupFiles` — most complete reference in codebase |
| Interface mock delegation with vi.fn() | `packages/tools/rate-limit/src/__tests__/limiter.test.ts` | Clean example of mocking an interface with `vi.fn()`, asserting call args, and testing real implementation separately — directly applicable to BullMQ worker mocking |
| Zod fixture factory + test assertions | `packages/backend/orchestrator/src/artifacts/__tests__/story.test.ts` | Shows how to build typed fixture objects against Zod schemas and assert schema validation — the fixture factory pattern APIP-5000 should use |
| Test setup file with teardown | `apps/api/knowledge-base/src/embedding-client/__tests__/index.test.ts` | Shows `beforeEach` reset pattern, `afterAll` teardown, and `vi.mock()` at module level — applicable to worker/queue mock lifecycle |

---

## Knowledge Context

### Lessons Learned

KB search was unavailable at seed generation time. The following lessons are inferred from the existing ELAB.yaml gap analysis and codebase evidence:

- **[APIP-5000 ELAB]** Story scope bundled four deliverables (vitest config, mocking utilities, test fixtures, templates for 5+ graph types) without a sizing warning (scope risk)
  - *Applies because*: APIP-5000 must narrow scope to Phase 0 deliverables only to remain implementable before Phase 1 graphs are elaborated

- **[APIP-5000 ELAB]** APIP-0020 was incorrectly described as a LangGraph graph when it is a plain TypeScript async supervisor (factual error risk)
  - *Applies because*: The mock strategy for APIP-0020 is BullMQ worker mocks + async state machine stubs, not LangGraph node mocks

- **[APIP-5000 ELAB]** Story was created as a stub without defining monorepo package location, leaving a hidden dependency on APIP-0010 or APIP-0020 scaffolding the package first (blocker)
  - *Applies because*: The vitest.config.ts cannot exist without a package to configure; this dependency must be made explicit

### Blockers to Avoid (from past stories)

- Do not start APIP-5000 implementation before the `apps/api/autonomous-pipeline` package scaffold (package.json + tsconfig.json + src/ directory) is created and merged — either by APIP-0010 or as part of APIP-5000's own scope
- Do not mock the LangGraph graph compiler, state reducer, or channel definitions — mock only leaf node functions (pure TypeScript async functions) to minimise semantic drift between unit tests and real graph execution
- Do not create LangGraph graph mock utilities in this story — they are not needed until Phase 1 (APIP-1010+); including them now couples APIP-5000 to Phase 1 interface contracts that do not yet exist

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Unit tests in APIP-5000 may mock freely; the test utilities themselves must not encourage UAT-level mocking patterns |
| ADR-006 | E2E Tests Required in Dev Phase | APIP-5000 has no UI surface; `frontend_impacted: false` — E2E skip condition applies |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not applicable to this story.

### Patterns to Follow

- `vitest.config.ts` using `defineConfig` from `vitest/config` with `environment: 'node'`, `globals: true`, and a coverage block at the 45% global threshold minimum
- Fixture factories as plain TypeScript functions that accept partial overrides and return Zod-validated objects (see orchestrator artifact pattern)
- `vi.fn()` for mocking interfaces (BullMQ worker, queue, job objects) — no dedicated mock framework needed
- `beforeEach` for state reset, `afterAll` for resource teardown, `vi.clearAllMocks()` between tests
- All fixture types defined via `z.infer<ZodSchema>` — never raw TypeScript interfaces

### Patterns to Avoid

- Mocking the LangGraph SDK internals (graph compiler, StateGraph, channel reducers) — this causes test semantics to diverge from real execution
- Using `console.log` in test utilities — use `@repo/logger` or omit logging
- Creating barrel files (`index.ts` re-exports) for test utilities — import directly from source files
- Scoping Phase 1 graph templates (structurer, implementation, review, QA) into this story before those graph interfaces are elaborated

---

## Conflict Analysis

### Conflict: Hidden Package Scaffold Dependency (BLOCKING)
- **Severity**: blocking
- **Description**: No `apps/api/autonomous-pipeline` (or equivalent) package exists in the codebase. APIP-5000 must add a `vitest.config.ts` to a package that does not yet exist. APIP-0010 (needs-code-review) and APIP-0020 (in-progress) have not yet established this package. If APIP-5000 begins implementation before the package exists, the implementer must also scaffold the package, which is untracked scope.
- **Resolution Hint**: Explicitly scope APIP-5000 to include package scaffolding (package.json, tsconfig.json, src/), OR add a hard gate: APIP-5000 cannot be picked up until APIP-0010 merges and its package path is confirmed. Document the chosen path in the story's technical approach.

### Conflict: Scope Mismatch — APIP-0020 is TypeScript, Not LangGraph (Warning)
- **Severity**: warning
- **Description**: The original story title says "LangGraph Graph Unit Testing" and infrastructure lists "Unit test templates for supervisor, structurer, implementation, review, QA graphs." However, the supervisor (APIP-0020) is explicitly `"TypeScript process (not a LangGraph graph)"` per its `story.yaml`. The story title and scope description are factually incorrect about the supervisor. Additionally, structurer, implementation, and QA graphs are Phase 1 stories not yet elaborated — their graph interfaces are unknown.
- **Resolution Hint**: Update story title to "Test Infrastructure Setup for Autonomous Pipeline Unit Testing." Narrow Phase 0 scope to: (1) Vitest config for the autonomous-pipeline package, (2) BullMQ worker/job mock factories (TypeScript), (3) supervisor TypeScript async mock utilities. Defer LangGraph graph mock utilities to a new story gated on Phase 1 elaboration.

### Conflict: Coverage Threshold Not Specified (Warning)
- **Severity**: warning
- **Description**: The monorepo global minimum is 45%. Given that APIP-0010 (BullMQ queue) and APIP-0020 (supervisor loop) are high-criticality stories in the autonomous pipeline, the coverage threshold for the autonomous-pipeline package may warrant a higher target (e.g., 70% for the supervisor loop). The story does not document whether 45% is the target or whether a higher bar is appropriate.
- **Resolution Hint**: Add an AC requiring the vitest config to set explicit coverage thresholds at or above 45%. Document in the story whether 70% is targeted for the supervisor loop given its central role.

---

## Story Seed

### Title

Test Infrastructure Setup for Autonomous Pipeline Unit Testing (Phase 0)

### Description

**Context**: The autonomous pipeline (APIP series) requires unit testing infrastructure before implementation of its core Phase 0 components can be safely tested. APIP-0010 (BullMQ Work Queue) is in needs-code-review and APIP-0020 (Supervisor Loop) is in-progress. Neither story has yet established a shared test package or vitest configuration. Phase 1 stories (structurer, implementation graph, review graph, QA graph) are elaborated but not yet implemented — their graph interface contracts are not yet known.

**Problem**: Without a vitest.config.ts, fixture factories, and mock utilities for the BullMQ/supervisor TypeScript components, APIP-0010 and APIP-0020 will lack a testing harness once they proceed to implementation. The original story conflated Phase 0 TypeScript mocking needs with Phase 1 LangGraph graph mocking needs, creating an unscoped deliverable.

**Proposed Solution Direction**: Scope APIP-5000 strictly to Phase 0 needs:
1. Scaffold the `apps/api/autonomous-pipeline` package (if not already created by APIP-0010) with package.json, tsconfig.json, and src/ directory
2. Add `vitest.config.ts` to the autonomous-pipeline package following the established monorepo pattern (`environment: 'node'`, `globals: true`, 45%+ coverage thresholds)
3. Create Zod-validated BullMQ job fixture factories (typed against APIP-0010's job schemas)
4. Create TypeScript supervisor state fixture factories and `vi.fn()` mock utilities for the BullMQ worker/queue interface (typed against APIP-0020's state machine)
5. Include one integration smoke test that runs a real minimal supervisor loop invocation (no LLM calls, no external services) to validate that mock interfaces match the real TypeScript implementation

Phase 1 LangGraph graph mock utilities (node stubs, state snapshot fixtures for structurer/implementation/review/QA graphs) are explicitly out of scope and deferred to a new story to be created when Phase 1 graphs are elaborated.

### Initial Acceptance Criteria

- [ ] AC-1: A `vitest.config.ts` exists in the autonomous-pipeline package (path TBD based on APIP-0010 scaffold) with `environment: 'node'`, `globals: true`, `include: ['src/**/*.test.ts']`, and a coverage block with v8 provider and ≥45% global thresholds for statements, branches, functions, and lines
- [ ] AC-2: A `createMockBullMQJob(overrides?)` fixture factory function exists that returns a Zod-validated BullMQ job object matching the schema produced by APIP-0010; partial overrides are accepted and validated against the same Zod schema
- [ ] AC-3: A `createMockBullMQWorker()` mock factory exists that returns a `vi.fn()`-based mock of the BullMQ Worker interface, with pre-wired stubs for `on('completed')`, `on('failed')`, `on('progress')`, and `close()`
- [ ] AC-4: A `createMockQueue()` mock factory exists that returns a `vi.fn()`-based mock of the BullMQ Queue interface with stubs for `add()`, `getJob()`, `pause()`, `resume()`, and `close()`
- [ ] AC-5: A `createSupervisorStateFixture(overrides?)` fixture factory exists that returns a Zod-validated supervisor state object matching the state shape produced by APIP-0020; the Zod schema used in the fixture matches the one used in production code
- [ ] AC-6: At least one integration smoke test exists that instantiates the real supervisor loop (from APIP-0020) with a mocked BullMQ worker, processes a single fixture job end-to-end, and asserts the supervisor reaches a terminal state without calling any external service (no real Redis, no real LangGraph, no LLM calls)
- [ ] AC-7: Running `pnpm test` from the autonomous-pipeline package produces a passing test run with coverage output; coverage meets or exceeds the configured thresholds
- [ ] AC-8: All fixture factory functions and mock utilities are TypeScript strict-mode compliant; all return types use `z.infer<ZodSchema>` — no raw TypeScript interfaces
- [ ] AC-9: No barrel files are created for the test utilities; consuming test files import directly from source paths (e.g., `import { createMockBullMQJob } from '../__fixtures__/bullmq-job.js'`)
- [ ] AC-10: The test utilities are documented with JSDoc comments explaining the mock/fixture purpose and any override options

### Non-Goals

- LangGraph graph node mock utilities (node stubs, graph invoke wrappers, state snapshot fixtures for structurer, implementation, review, QA graphs) — deferred to a new Phase 1 story
- Test templates for supervisor, structurer, implementation, review, QA graphs — premature until those graph interfaces are elaborated
- Mocking the LangGraph SDK itself (StateGraph, compile(), channel reducers) — off-limits per risk mitigation strategy
- Integration tests against a real Redis instance — APIP-5001 (Test Database Setup) covers infrastructure-level testing; APIP-5000 covers unit-level harness only
- E2E test infrastructure — covered by APIP-5002
- BullMQ Bull Board dashboard testing — covered by APIP-0010 itself
- Coverage enforcement for Phase 1 graphs — deferred to the Phase 1 test infrastructure story

### Reuse Plan

- **Vitest Config**: Copy and adapt `apps/api/knowledge-base/vitest.config.ts` — most complete reference with coverage thresholds, `fileParallelism`, `testTimeout`, and `setupFiles`
- **Mock Pattern**: Follow `packages/tools/rate-limit/src/__tests__/limiter.test.ts` for `vi.fn()` interface delegation pattern
- **Fixture Factory Pattern**: Follow `packages/backend/orchestrator/src/artifacts/__tests__/story.test.ts` for Zod-validated fixture objects with spread overrides
- **Packages**: `vitest` (already in monorepo), `@langchain/langgraph` version from APIP-0020's package.json (do not introduce a new version), `bullmq` version from APIP-0010's package.json

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Primary testing concern is that mock interfaces (BullMQ worker, queue, supervisor state) stay in sync with the real implementations from APIP-0010 and APIP-0020. The test plan should include a check that fixture Zod schemas reference the same schema exports used in production code — not independently defined copies.
- The AC-6 integration smoke test is the highest-value test in this story: it exercises the real supervisor loop with mocked infrastructure and catches interface drift that pure unit tests would miss.
- Coverage thresholds apply to the autonomous-pipeline package as a whole. If the package scaffold is minimal at seed time (only the test utilities and vitest config), the thresholds may be trivially met initially; the test plan should note that coverage will be evaluated against the full package once APIP-0010 and APIP-0020 implementation lands.
- No E2E tests required (frontend_impacted: false, ADR-006 skip condition applies).

### For UI/UX Advisor

Not applicable. APIP-5000 is a backend-only test infrastructure story with no frontend surface.

### For Dev Feasibility

- **Blocking dependency**: The `apps/api/autonomous-pipeline` package must exist before this story can deliver a vitest.config.ts. If APIP-0010 does not scaffold the package, APIP-5000 must include that work. Estimate accordingly (package scaffold adds ~0.5 story points).
- **LangGraph version risk**: Fixture factories for any LangGraph state types (if needed for Phase 0 integration smoke test) must use the exact same `@langchain/langgraph` version installed by APIP-0020. Confirm the version in APIP-0020's package.json before starting; do not `pnpm add @langchain/langgraph` independently.
- **BullMQ job schema dependency**: AC-2 requires access to APIP-0010's exported BullMQ job Zod schema. If APIP-0010 has not yet merged, the implementer must coordinate with the APIP-0010 branch or work from the schema draft in APIP-0010's plan artifacts. This is a sequencing risk.
- **Canonical references for subtask decomposition**:
  - Vitest config: `apps/api/knowledge-base/vitest.config.ts`
  - Mock factory pattern: `packages/tools/rate-limit/src/__tests__/limiter.test.ts`
  - Zod fixture factory pattern: `packages/backend/orchestrator/src/artifacts/__tests__/story.test.ts`
  - Test setup file: `apps/api/knowledge-base/src/test/setup.ts`
- **Sizing note**: The ELAB.yaml found this story was a stub (completeness score 2/10) and returned it to backlog. After the scope narrowing above, the story is implementable as a single medium story (~3 points), assuming APIP-0010 has merged and the package scaffold exists. If the scaffold must also be created, add 0.5 points.
