---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-5002

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No E2E test plan exists for the autonomous pipeline critical path. No Playwright configuration targeting the pipeline exists. The pipeline itself (BullMQ queue, supervisor, LangGraph graphs, and all worker graphs) has not yet been built — the components this E2E suite must exercise are entirely pre-implementation. The only existing Playwright infrastructure targets the user-facing web application (`apps/web/playwright/`), not any headless server-side pipeline processes. There is no concept of a "pipeline staging environment" in the current baseline.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Playwright framework (web app) | `apps/web/playwright/` | Existing Playwright setup using BDD/Cucumber with `playwright-bdd`. Canonical config, fixture, and step patterns. Can be reused as structural reference but is architected for browser UI tests, not headless pipeline process validation. |
| Playwright config (main) | `apps/web/playwright/playwright.config.ts` | Reference pattern for `defineConfig`, project structure, timeout configuration, and CI/headless settings. The pipeline E2E config must follow the same conventions but with no `webServer` block (pipeline is headless). |
| Playwright fixtures (auth) | `apps/web/playwright/fixtures/browser-auth.fixture.ts`, `cognito-auth.fixture.ts` | Pattern for Playwright fixture composition. Pipeline E2E fixtures will inject BullMQ queue client and pipeline state inspector rather than browser auth, but use the same structural pattern. |
| Knowledge Base MCP server | `apps/api/knowledge-base/src/mcp-server/` | Existing KB infrastructure — pipeline uses KB for learnings write-back (APIP-1070). E2E suite may need to assert KB state after a merge completes. |
| Orchestrator package | `packages/backend/orchestrator/src/` | Primary target of the E2E suite — all worker graphs (elaboration, implementation, review, QA, merge) live here. E2E tests execute against the real compiled graphs on the LangGraph server. |
| BullMQ + Redis | `apps/api/lego-api/core/cache/redis-client.ts` | Existing Redis connection pattern. Pipeline E2E test scaffolding enqueues work items directly into BullMQ and polls for job completion — same Redis infrastructure. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| APIP-0010 (BullMQ Work Queue Setup) | in-progress | Direct dependency — E2E suite enqueues test stories via BullMQ. The queue API must be stable before E2E tests can execute against it. |
| APIP-0020 (Supervisor Loop) | Ready to Work | Direct dependency — supervisor must dispatch to graphs correctly. E2E tests observe job progression through BullMQ job states. |
| APIP-1010 (Structurer Node) | elaboration | Dependency — elaboration graph must be present and functional for E2E to exercise it. |
| APIP-1020 (ChangeSpec Spike) | Ready to Work | Dependency — ChangeSpec schema must be finalized before implementation graph can be exercised by E2E. |
| APIP-1030 (Implementation Graph) | elaboration | Dependency with sizing warning — split recommended. E2E critical path requires implementation to function. |
| APIP-1050 (Review Graph) | elaboration | Dependency — 10-worker review graph must be present. E2E observes review artifact. |
| APIP-1060 (QA Graph) | backlog | Dependency — QA graph produces the QA-VERIFY.yaml that gates merge. E2E asserts its contents. |
| APIP-1070 (Merge Graph) | backlog | Terminal dependency — E2E success criterion is observing MERGE_COMPLETE verdict and a real squash-merge commit. |

### Constraints to Respect

- **APIP ADR-001 Decision 4**: All pipeline components run on dedicated local server. No Lambda. The E2E test environment must target the same local Docker Compose setup.
- **APIP ADR-001 Decision 2**: Supervisor is plain TypeScript. E2E tests drive the pipeline by enqueuing BullMQ jobs and observing state — they do not call LangGraph APIs directly.
- **APIP ADR-001 Decision 1**: BullMQ + Redis is the queue mechanism. E2E scaffold enqueues via BullMQ client and polls job state via BullMQ API.
- **ADR-005 (Testing Strategy)**: UAT must use real services — when the pipeline E2E suite runs in UAT mode it must target a real staging LangGraph instance, real Redis, and real KB.
- **ADR-006 (E2E Required in Dev Phase)**: Does not apply directly — the pipeline is headless (`frontend_impacted: false`). However, the spirit of early E2E validation applies: the test scaffold should be runnable incrementally as each graph becomes available.
- **Monorepo code conventions**: Zod-first schemas for all test fixture types. No TypeScript interfaces. `@repo/logger` for any logging in test utilities.
- **Protected areas**: Do NOT modify `packages/backend/database-schema/` or `@repo/db` client. Do NOT modify existing web app Playwright tests.

---

## Retrieved Context

### Related Endpoints

None — the pipeline is headless. The E2E suite interacts with:
- BullMQ queue (enqueue jobs, poll job state)
- Filesystem (read YAML artifacts: EVIDENCE.yaml, REVIEW.yaml, QA-VERIFY.yaml, MERGE.yaml)
- Git log (verify squash-merge commit appeared on main branch)
- Knowledge Base MCP tools (optionally assert KB learnings were written after merge)

### Related Components

None — no UI components. The E2E test harness is a Node.js/Playwright process that exercises the server-side pipeline stack.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| Playwright config structure | `apps/web/playwright/playwright.config.ts` | Reference for `defineConfig` conventions, timeout settings, CI flags (`forbidOnly`, `retries`), `reporter` config. Pipeline E2E config will be a new file: `apps/api/pipeline/playwright.e2e.config.ts` or similar within the orchestrator package. |
| Playwright fixture pattern | `apps/web/playwright/fixtures/browser-auth.fixture.ts` | Structural reference for `test.extend()` fixture composition pattern. Pipeline E2E fixtures will compose a BullMQ queue client and a pipeline state reader rather than browser auth. |
| BullMQ + Redis connection | `apps/api/lego-api/core/cache/redis-client.ts` | Existing Redis client factory. E2E test setup/teardown must connect to the same Redis instance and use BullMQ's `Queue` API to enqueue test stories and `Job.waitUntilFinished()` or polling for completion. |
| EvidenceSchema | `packages/backend/orchestrator/src/artifacts/evidence.ts` | Used in E2E assertions: after implementation graph completes, the test reads EVIDENCE.yaml from the story feature directory and validates it parses with `EvidenceSchema`. |
| ReviewSchema | `packages/backend/orchestrator/src/artifacts/review.ts` | Used in E2E assertions: after review graph completes, the test reads REVIEW.yaml and validates against `ReviewSchema`. |
| QaVerifySchema | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | Used in E2E assertions: after QA graph completes, the test reads QA-VERIFY.yaml and validates against `QaVerifySchema`. |
| MergeArtifactSchema | `packages/backend/orchestrator/src/artifacts/merge.ts` (to be created by APIP-1070) | Used in E2E assertions: after merge graph completes, test reads MERGE.yaml and validates against `MergeArtifactSchema`. |
| YAML artifact reader | `packages/backend/orchestrator/src/persistence/yaml-artifact-reader.ts` | Direct reuse in E2E test helpers to load and parse pipeline YAML artifacts from the filesystem without duplicating the read logic. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Playwright config (defineConfig, projects, timeout, CI) | `/Users/michaelmenard/Development/monorepo/apps/web/playwright/playwright.config.ts` | Reference for `defineConfig` structure, `forbidOnly`, `retries`, `workers`, `timeout`, `reporter` configuration. The pipeline E2E config will follow this structure without `webServer` (headless pipeline). |
| Playwright fixture composition | `/Users/michaelmenard/Development/monorepo/apps/web/playwright/fixtures/browser-auth.fixture.ts` | Shows `test.extend<{...}>({...})` pattern for composing typed test fixtures. The `PipelineTestFixture` in APIP-5002 follows this exact pattern with `queueClient`, `storyFixtureDir`, `pipelineStateReader` instead of browser auth. |
| Playwright spec file structure | `/Users/michaelmenard/Development/monorepo/apps/web/playwright/tests/wishlist/drag-preview.spec.ts` | Clean `test.describe` + `test.beforeEach` + individual `test()` blocks with clear AC mapping in comments. Pipeline E2E specs follow this structure for each stage assertion. |
| Existing artifact schema (for assertion helpers) | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/evidence.ts` | Shows Zod schema structure the E2E assertion helpers will validate against post-execution. All assertion helpers parse YAML artifacts using the canonical schema files from the orchestrator package. |

---

## Knowledge Context

### Lessons Learned

KB search was not available in this execution context. The following are inferred from epic elaboration artifacts and peer story seeds:

- **[APIP-1030 seed / architecture]** ChangeSpec schema dependency is a HARD GATE — no implementation graph integration code can be exercised until APIP-1020 closes.
  - *Applies because*: The E2E test plan cannot exercise the full critical path until APIP-1020 (ChangeSpec Spike) produces its schema ADR. The test scaffold must be designed to be runnable incrementally: queue → supervisor → elaboration works first; implementation loop exercised only after APIP-1020 and APIP-0040 complete.

- **[APIP-1060 seed / architecture]** The QA graph's E2E test runner invokes Playwright as a subprocess — the pipeline E2E suite must not conflict with the QA graph's internal Playwright invocations on the same port/process.
  - *Applies because*: APIP-1060 runs `pnpm exec playwright test` as a subprocess inside the QA graph's `run-e2e-tests` node. If the pipeline E2E suite and the QA graph's subprocess both attempt to run Playwright against the same target concurrently, they will conflict. The E2E test plan must document this boundary clearly and use a separate Playwright project name/config.

- **[APIP-1070 seed / architecture]** End-to-end integration testing is blocked on the full APIP-1050 → APIP-1060 → APIP-1070 dependency chain.
  - *Applies because*: The E2E critical path test (AC-2 in story seed below) cannot produce a merge assertion until all three upstream graphs are built. The E2E framework setup (config, fixtures, scaffold) is independent of this and can be completed earlier.

- **[APIP-1050 seed / architecture]** LangGraph Send API for parallel fan-out was not used in the codebase before APIP-1050 — integration tests must verify fan-out routing before implementing workers.
  - *Applies because*: The E2E test plan should include a graph-level integration test that verifies the review graph's fan-out and fan-in before asserting on individual worker verdicts.

- **[ADR-006 / pattern]** E2E tests in the development phase must use live resources, not mocks — the pipeline E2E suite must target a real LangGraph server instance and real Redis, not stubs.
  - *Applies because*: The primary value of this E2E suite is catching real integration failures between pipeline stages. Mocking the LangGraph server or Redis in the E2E suite would defeat this purpose entirely.

### Blockers to Avoid (from past stories)

- **Attempting E2E before all dependencies are available**: The E2E scaffold can be built early, but no E2E test should assert on pipeline stages whose upstream graphs are not yet implemented. Phase the test execution strategy: Phase 0 E2E (queue → supervisor handoff) is available immediately; full critical path E2E is only runnable when APIP-1070 completes.
- **Using synchronous polling in E2E test helpers**: BullMQ job polling must use async polling with configurable intervals — never a tight `while(true)` loop. Use `job.waitUntilFinished(queueEvents, timeoutMs)` or a polling helper with `setTimeout` delays.
- **Coupling E2E test assertions to internal graph state**: E2E tests must assert on observable outputs only — YAML artifacts on the filesystem, git log entries, BullMQ job completion status. Never reach into LangGraph checkpoint state directly.
- **Running full critical path E2E without a real test story that terminates cleanly**: The test story used in E2E must be a minimal synthetic story (1-2 ACs, 1 ChangeSpec) specifically designed to complete successfully without producing large PR diffs or long CI runs. Using a real in-flight story will make E2E non-deterministic.
- **Port conflicts between pipeline E2E and QA graph's internal Playwright**: The pipeline E2E suite must use a distinct Playwright project name and must not spin up web servers on ports that the QA graph's internal `run-e2e-tests` subprocess may also use.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 4 | Local Dedicated Server | All pipeline components run on local Docker server. E2E test environment must target this same local server. No Lambda. |
| APIP ADR-001 Decision 1 | BullMQ + Redis Queue | E2E tests enqueue test stories via BullMQ client. Pipeline state observations poll BullMQ job events and read YAML artifacts from filesystem. |
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Supervisor is the entry point for pipeline execution — E2E tests drive the pipeline by enqueuing jobs, not by calling graph APIs directly. |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | When running in UAT mode, E2E suite targets real staging LangGraph instance and real Redis. No mocking of external services. |
| ADR-006 | E2E Tests Required in Dev Phase | Spirit applies: E2E scaffold must be usable incrementally as each Phase 0/1 story completes. Skip conditions for stages whose graphs are not yet built. |
| Monorepo CLAUDE.md | Zod-First Types | All test fixture schemas and E2E helper types use Zod with `z.infer<>`. No TypeScript interfaces. |

### Patterns to Follow

- `test.extend<{...}>({...})` Playwright fixture composition from `browser-auth.fixture.ts`
- `test.describe` / `test.beforeEach` / `test()` structure from `drag-preview.spec.ts`
- `defineConfig` with `forbidOnly`, `retries`, `workers: 1` (sequential for pipeline E2E) from `playwright.config.ts`
- Async BullMQ job completion polling with configurable timeouts and exponential back-off
- YAML artifact assertion helpers using `yaml-artifact-reader.ts` + existing Zod schemas
- `@repo/logger` for test utility logging

### Patterns to Avoid

- TypeScript interfaces for fixture types — use Zod with `z.infer<>`
- Synchronous `execSync` for any test helper that invokes CLI commands — use `child_process.spawn` or `execa`
- Asserting on LangGraph internal checkpoint state — only assert on observable outputs (YAML artifacts, git log, BullMQ job status)
- Hardcoding test story content — use a dedicated minimal synthetic test story fixture designed to terminate predictably
- Running full critical path E2E against real production stories — use isolated synthetic story fixtures
- Mocking BullMQ, Redis, or LangGraph in the E2E suite — this is the suite where real services are required

---

## Conflict Analysis

### Conflict: All 8 dependency stories are pre-implementation
- **Severity**: warning
- **Description**: APIP-5002 depends on APIP-0010, APIP-0020, APIP-1010, APIP-1020, APIP-1030, APIP-1050, APIP-1060, and APIP-1070 — none of which are complete as of the baseline date (2026-02-13). The full critical-path E2E test cannot be executed until all 8 dependencies are built. However, the framework setup (Playwright config, fixture scaffold, test helpers, synthetic test story design) and early-stage E2E tests (queue enqueue → supervisor dispatch → elaboration graph → artifact assertion) can be developed ahead of the later graphs. The story must be designed with staged activation: each E2E test has a `skipIf` guard tied to availability of its upstream graph.
- **Resolution Hint**: Scope this story as two deliverables: (1) Framework Setup — Playwright config, fixtures, assertion helpers, and synthetic test story design complete regardless of upstream dependency status. (2) Critical Path Tests — each test scenario is scaffolded with a skip condition and activated as its dependency story closes.

### Conflict: Playwright port conflict risk with QA Graph's internal test runner
- **Severity**: warning
- **Description**: APIP-1060 (QA Graph) invokes Playwright as a subprocess (`pnpm exec playwright test`) inside its `run-e2e-tests` node. If the pipeline E2E suite (APIP-5002) also invokes Playwright during a critical path test run, both Playwright processes may attempt to launch browser instances or bind to the same ports simultaneously on the local server. This creates a flakiness risk if E2E test runs overlap with QA graph executions.
- **Resolution Hint**: Use a dedicated Playwright project name in the pipeline E2E config (e.g., `pipeline-e2e`) that is distinct from the web app's existing project names. Document in the config that pipeline E2E runs must be serialized with (not concurrent to) QA graph test executions. The `workers: 1` setting in the E2E config prevents concurrent test runs within the pipeline E2E suite itself.

### Conflict: Synthetic test story design is a prerequisite not tracked elsewhere
- **Severity**: warning
- **Description**: The E2E critical path test requires a minimal synthetic test story (pre-defined YAML artifact set, 1-2 ACs, 1 ChangeSpec) that is specifically designed to run through the entire pipeline without failing on content quality. Designing this synthetic fixture is a required deliverable of APIP-5002 that has no dependency on upstream implementation stories — it can be done early. However, it is non-trivial: the synthetic story must produce real `pnpm check-types` and `pnpm test` passes in the implementation micro-verify step, which means the story's single ChangeSpec must produce code that actually compiles and passes tests. This is a design challenge that should be resolved before implementation graphs are available for integration testing.
- **Resolution Hint**: Design the synthetic test story fixture to add a trivial non-breaking change (e.g., add a `/* E2E test marker */` comment to a non-critical utility file, or add a documented constant to a utilities file). The micro-verify step will pass because no type errors are introduced. Document the synthetic fixture design in the E2E test plan.

---

## Story Seed

### Title

E2E Test Plan and Playwright Framework Setup for Autonomous Pipeline Critical Path

### Description

**Context**: The autonomous pipeline's Phase 0 and Phase 1 stories collectively implement the full critical path: BullMQ work enqueue (APIP-0010) → supervisor dispatch (APIP-0020) → elaboration with structuring (APIP-1010) → ChangeSpec planning (APIP-1020) → implementation loop (APIP-1030) → review (APIP-1050) → QA verdict (APIP-1060) → squash-merge (APIP-1070). As of the 2026-02-13 baseline, none of these graphs exist. There is no end-to-end validation mechanism to confirm that a story enqueued into BullMQ actually progresses through all pipeline stages to a successful merge.

**Problem**: Without a structured E2E test harness, the integration between pipeline stages will only be discovered during manual testing or when a real story gets stuck mid-pipeline. The orchestrator package has unit and integration tests per graph, but no test that exercises the entire queue → supervisor → graph chain end-to-end. Config mismatches between the supervisor dispatch contract and graph entry function signatures, YAML artifact path conventions, and BullMQ job state conventions will not surface until all graphs are manually integrated for the first time.

**Proposed Solution Direction**: Establish a Playwright-based E2E test framework targeting the pipeline (not the web UI) with the following deliverables:
1. A Playwright E2E config file for the pipeline (`packages/backend/orchestrator/e2e/playwright.config.ts`) with `workers: 1`, no `webServer`, appropriate timeouts for long-running pipeline operations (up to 30 minutes for a full critical path run), and CI-compatible settings.
2. Pipeline test fixtures (`PipelineTestFixtures`) using `test.extend()` that inject: a BullMQ `Queue` client (to enqueue test stories), a `PipelineStateReader` (to poll job status and read YAML artifacts from the story feature directory), and a `SyntheticStoryFixture` (the minimal test story designed to traverse the full pipeline).
3. A `SyntheticTestStory` fixture — a pre-built minimal story YAML set (story seed, elaboration result stub, ChangeSpec with 1 trivially-passable change) that can be fed into the pipeline without requiring real LLM elaboration quality.
4. E2E assertion helpers that read and validate YAML artifacts from the filesystem using the canonical Zod schemas from `packages/backend/orchestrator/src/artifacts/`.
5. Critical path test scenarios (one per pipeline stage transition) with skip guards so each test is activated only when its upstream dependency graph is available.

### Initial Acceptance Criteria

- [ ] AC-1: A Playwright E2E configuration file exists at `packages/backend/orchestrator/e2e/playwright.config.ts` with: `workers: 1` (sequential pipeline execution), `timeout: 1800000` (30 minutes for full critical path), `forbidOnly: !!process.env.CI`, no `webServer` block (headless pipeline target), and a named project `pipeline-e2e` that does not conflict with web app Playwright project names.

- [ ] AC-2: A `PipelineTestFixtures` type exists in `packages/backend/orchestrator/e2e/fixtures/pipeline.fixture.ts` using `test.extend<PipelineTestFixtures>({...})` with injected fixture fields: `queueClient` (BullMQ `Queue` instance connected to local Redis), `pipelineStateReader` (utility for polling BullMQ job status and reading YAML artifacts from the story feature directory), `syntheticStory` (the pre-built `SyntheticTestStory` fixture with known storyId, feature directory, and minimal ChangeSpec).

- [ ] AC-3: A `SyntheticTestStorySchema` Zod schema and corresponding fixture file exist in `packages/backend/orchestrator/e2e/fixtures/synthetic-story.ts`. The synthetic story is a minimal pre-built fixture: one AC, one ChangeSpec producing a trivially-passable code change (e.g., adding a documented constant to a non-critical utility file), and all required YAML artifact stubs needed to seed the pipeline mid-flow for stage-specific tests.

- [ ] AC-4: E2E assertion helper functions exist in `packages/backend/orchestrator/e2e/helpers/artifact-assertions.ts`: `assertEvidenceArtifact(storyDir)` (reads EVIDENCE.yaml and validates with `EvidenceSchema`), `assertReviewArtifact(storyDir)` (reads REVIEW.yaml and validates with `ReviewSchema`), `assertQaVerifyArtifact(storyDir)` (reads QA-VERIFY.yaml and validates with `QaVerifySchema`), `assertMergeArtifact(storyDir)` (reads MERGE.yaml and validates with `MergeArtifactSchema`), `pollJobCompletion(queue, jobId, timeoutMs)` (polls BullMQ job until `completed` or `failed` state, using exponential back-off, never a busy loop).

- [ ] AC-5: An E2E test scenario exists in `packages/backend/orchestrator/e2e/tests/phase0-queue-supervisor.spec.ts` verifying: (a) enqueuing a synthetic story job into BullMQ via `queueClient.add()` succeeds and returns a non-null `jobId`, (b) the BullMQ job transitions from `waiting` to `active` within a configurable timeout (default 30s), confirming supervisor polling is active, (c) the job does not transition to `failed` within the observation window. This test requires only APIP-0010 and APIP-0020 to be complete.

- [ ] AC-6: An E2E test scenario exists in `packages/backend/orchestrator/e2e/tests/phase1-elaboration.spec.ts` verifying: after enqueueing the synthetic story, the elaboration stage completes and a valid EVIDENCE.yaml-equivalent artifact (or the elaboration result YAML) appears in the story feature directory within a configurable timeout; the artifact passes schema validation via `assertEvidenceArtifact()`. This test has a `skipIf` guard that skips when APIP-1010 is not yet available (checked by testing for a known export from the elaboration graph module).

- [ ] AC-7: An E2E test scenario exists in `packages/backend/orchestrator/e2e/tests/phase1-critical-path.spec.ts` asserting the full critical path end-to-end: (a) synthetic story job enqueued, (b) supervisor dispatches to elaboration graph, (c) EVIDENCE.yaml written and schema-valid, (d) REVIEW.yaml written with `verdict: 'PASS'` or `'FAIL'` (not null), (e) QA-VERIFY.yaml written with `verdict: 'PASS' | 'FAIL' | 'BLOCKED'`, (f) if verdict is `PASS`: MERGE.yaml written with `verdict: 'MERGE_COMPLETE'` and a real squash-merge commit appears in `git log --oneline main`, (g) BullMQ job is in `completed` state. This scenario has a `skipIf` guard active until all of APIP-1010, APIP-1020, APIP-1030, APIP-1050, APIP-1060, and APIP-1070 are complete.

- [ ] AC-8: A `PipelineJobPoller` utility exists in `packages/backend/orchestrator/e2e/helpers/job-poller.ts` implementing async BullMQ job state polling with: configurable `pollIntervalMs` (default 5000), configurable `maxWaitMs` (default 1800000), exponential back-off capped at `maxPollIntervalMs` (default 60000), structured logging via `@repo/logger` for each poll event, and throwing a `PollTimeoutError` (Zod-typed) when `maxWaitMs` is exceeded without a terminal state.

- [ ] AC-9: A `PIPELINE-E2E-TEST-PLAN.md` document exists in `packages/backend/orchestrator/e2e/` documenting: (a) the synthetic test story design and why the ChangeSpec is trivially passable through micro-verify, (b) which test scenarios require which dependency stories, (c) the port isolation strategy that prevents conflicts with the QA graph's internal Playwright subprocess, (d) how to run the E2E suite locally (environment variables required: `REDIS_URL`, `LANGGRAPH_SERVER_URL`, `TEST_STORY_FEATURE_DIR`), (e) the phased activation strategy for each test scenario.

- [ ] AC-10: All new E2E code uses Zod-first types (`z.infer<>`) for fixture schemas, error types, and assertion result types. No TypeScript interfaces. `@repo/logger` used for all structured logging within test helpers. No barrel files — direct imports from source files.

- [ ] AC-11: Existing Playwright tests in `apps/web/playwright/` are NOT modified by this story. All new E2E artifacts are isolated to `packages/backend/orchestrator/e2e/`.

- [ ] AC-12: The `PipelineTestFixtures` teardown logic (in `test.extend` `after` hooks) cleans up: (a) removes the synthetic story's feature directory from `plans/future/platform/autonomous-pipeline/`, (b) removes any git worktrees created during the test run, (c) removes the BullMQ test job from Redis if it did not complete cleanly. Teardown failures are logged as warnings, never as blocking errors.

### Non-Goals

- Building any pipeline graph (elaboration, implementation, review, QA, merge) — this story provides the test harness only
- Implementing the BullMQ queue setup (APIP-0010)
- Implementing the supervisor (APIP-0020)
- Running the full critical path E2E against real production stories — synthetic fixture only
- Performance/load testing of the pipeline — scope is correctness of the critical path only
- Playwright browser UI tests of any web dashboard (APIP-2020) — that is a separate E2E concern
- UAT-style testing of user-facing web UI features — existing `apps/web/playwright/` handles that
- Modifying `packages/backend/database-schema/` or `@repo/db` client (protected)
- Implementing secrets management (APIP-5004) — E2E suite reads credentials from environment variables only
- Monitoring or operator CLI visibility (APIP-5005, APIP-2020)
- Testing non-happy paths of individual graphs — graph unit/integration tests in `packages/backend/orchestrator/src/graphs/__tests__/` cover those; E2E focuses on stage-to-stage integration

### Reuse Plan

- **Components**: None (no UI).
- **Patterns**: `test.extend<{}>({})` from `apps/web/playwright/fixtures/browser-auth.fixture.ts`; `test.describe` / `test.beforeEach` / `test()` from `apps/web/playwright/tests/wishlist/drag-preview.spec.ts`; `defineConfig` from `apps/web/playwright/playwright.config.ts`; `child_process.spawn` with `Promise.race` timeout for any CLI invocations in test helpers; Zod-first all fixture and error schemas.
- **Packages**: `packages/backend/orchestrator` (all artifact schemas, YAML reader, `@repo/logger`); BullMQ npm package (already in dependency tree via APIP-0010); existing Redis client factory from `apps/api/lego-api/core/cache/redis-client.ts`.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No browser UI involved**: ADR-006 E2E requirement applies in spirit (validate real integration) but the mechanism is a headless Node.js Playwright harness, not a browser-based test. There is no `webServer` configuration and no browser navigation.
- **Two test tiers** for this story itself:
  - *Unit tests* (Vitest): The assertion helper functions (`assertEvidenceArtifact`, `pollJobCompletion`, etc.) have logic that can be unit-tested with mock filesystem and mock BullMQ state. Test `PollTimeoutError` is thrown correctly. Test that `assertEvidenceArtifact` throws on schema-invalid YAML. Test the exponential back-off schedule in `PipelineJobPoller`.
  - *E2E tests* (Playwright): The core deliverable — these require the real pipeline stack to be running. Phase the test plan to match dependency availability. Phase 0 (queue + supervisor only) E2E can execute as soon as APIP-0010 and APIP-0020 complete. Full critical path E2E requires all 8 dependencies.
- **Key skip condition logic**: Each E2E spec should use a programmatic check at test start (not a static skip flag) that imports a known symbol from the relevant graph module. If the import fails, the test skips with a clear message: "SKIPPED: APIP-1010 (structurer node) not yet available." This makes activation automatic when the dependency merges.
- **Synthetic test story design is the hardest part**: The test plan should allocate significant time to designing the synthetic story fixture. The ChangeSpec must produce code that: (1) compiles with zero TypeScript errors, (2) passes `pnpm test --filter <package>`, (3) does not break existing functionality. The safest approach is a ChangeSpec that adds a new exported constant to an existing utility file with a corresponding test.
- **Timeout sizing**: Phase 0 E2E (queue + supervisor) timeout: 2 minutes. Phase 1 elaboration E2E timeout: 10 minutes (LLM calls). Full critical path timeout: 30 minutes (includes CI polling in merge graph). These should be configurable via environment variables.

### For UI/UX Advisor

- No UI impact. This story is entirely headless infrastructure. The `PIPELINE-E2E-TEST-PLAN.md` document is the primary human-readable deliverable — ensure it is actionable for developers who need to set up the test environment and understand which tests to run at each phase of pipeline development.

### For Dev Feasibility

- **File placement**: All new E2E artifacts belong in `packages/backend/orchestrator/e2e/`. This is a new directory not conflicting with the existing `src/` package structure. The Playwright config lives at `packages/backend/orchestrator/e2e/playwright.config.ts`.
- **Playwright version**: The existing `apps/web/playwright/` uses `@playwright/test`. Use the same version. No browser installation needed (pipeline E2E doesn't open browsers). The Playwright `test` harness is being used purely as a test runner with fixtures and lifecycle hooks — it is a suitable choice even for headless Node.js tests due to its fixture system and timeout handling.
- **BullMQ client in E2E fixtures**: The fixture creates a `new Queue('pipeline', { connection: redisConnection })` client in `beforeAll` and calls `queue.close()` in `afterAll`. Use `QueueEvents` for job completion polling: `const queueEvents = new QueueEvents('pipeline', { connection: redisConnection }); await job.waitUntilFinished(queueEvents, timeoutMs)`.
- **Git log assertion**: `assertMergeArtifact` should additionally verify the squash commit via `git log --oneline main --grep="{storyId}"` — if the commit appears in git log, the merge completed. This requires the E2E test to know the main branch and have git access to the monorepo.
- **Canonical references for subtask decomposition**:
  - Config pattern: `apps/web/playwright/playwright.config.ts`
  - Fixture pattern: `apps/web/playwright/fixtures/browser-auth.fixture.ts`
  - Spec pattern: `apps/web/playwright/tests/wishlist/drag-preview.spec.ts`
  - Artifact schemas to import: `packages/backend/orchestrator/src/artifacts/evidence.ts`, `review.ts`, `qa-verify.ts`
  - YAML reader to reuse: `packages/backend/orchestrator/src/persistence/yaml-artifact-reader.ts`
- **Risk — synthetic story micro-verify**: The most critical design risk is ensuring the synthetic ChangeSpec's generated code change passes real `pnpm check-types` and `pnpm test`. If the pipeline E2E uses a real LLM to generate code, this is non-deterministic. Recommendation: the synthetic story uses a pre-written code patch (not LLM-generated) that the implementation graph can apply directly. The ChangeSpec `instructions` field contains the literal code diff. This requires understanding what format APIP-1030's code-gen step expects — confirm with APIP-1020 ChangeSpec spike output before designing the synthetic fixture.
- **Risk — test environment isolation**: E2E test runs must use a dedicated BullMQ queue name (e.g., `pipeline-e2e`) that is separate from the production/development pipeline queue. This prevents test jobs from being processed by a live supervisor loop and ensures test cleanup doesn't disturb real work items.
