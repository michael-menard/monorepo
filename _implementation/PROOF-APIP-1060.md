# PROOF-APIP-1060

**Generated**: 2026-03-01T00:00:00Z
**Story**: APIP-1060
**Evidence Version**: 1

---

## Summary

This implementation builds the foundational QA orchestration graph for the autonomous pipeline, establishing state management, node architecture, and end-to-end test execution with AC verification and gating. All 17 acceptance criteria passed with 45 tests executing across 7 test files, confirming the complete QA verification workflow with proper timeout handling, E2E retry logic, and structured output artifacts.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | QAGraphConfigSchema with all required fields and defaults in qa.ts |
| AC-2 | PASS | QAGraphStateAnnotation with all required state fields |
| AC-3 | PASS | check-preconditions node blocks when review FAIL or evidence null/invalid |
| AC-4 | PASS | run-unit-tests node with timeout, retry, success paths and stdout capture |
| AC-5 | PASS | run-e2e-tests node with per-attempt retry, PASS if any attempt succeeds |
| AC-6 | PASS | verify-acs node with PASS/FAIL/BLOCKED paths, model failure = BLOCKED per AC |
| AC-7 | PASS | AC_VERIFICATION_PROMPT_V1 contains anti-hallucination instruction |
| AC-8 | PASS | gate-decision node with PASS/FAIL/BLOCKED aggregate and model failure = BLOCKED |
| AC-9 | PASS | write-qa-artifact node writes QA-VERIFY.yaml with correct path, conditional KB write-back |
| AC-10 | PASS | StateGraph wiring with all conditional edges, graph.compile() succeeds |
| AC-11 | PASS | runQA() returns QAGraphResult with verdict, qaArtifact, durationMs, completedAt |
| AC-12 | PASS | qaPassedSuccessfully() invoked before PASS returned in gate-decision |
| AC-13 | PASS | 10 graph-level test scenarios covering all QA graph paths |
| AC-14 | PASS | 6 node test files in nodes/qa/__tests__/ covering all node scenarios |
| AC-15 | PASS | qa-verify.ts backward compatible, all new fields z.optional() or z.nullable().default(null) |
| AC-16 | PASS | @repo/logger lifecycle events with correct fields at every transition |
| AC-17 | PASS | worktreeDir required field (no default) in QAGraphConfigSchema |

### Detailed Evidence

#### AC-1: QAGraphConfigSchema with all required fields and defaults in qa.ts

**Status**: PASS

**Evidence Items**:
- **file**: `packages/backend/orchestrator/src/graphs/qa.ts` - QAGraphConfigSchema defined via z.object() with all fields: worktreeDir (required, min(1)), storyId, enableE2e (default true), testFilter (default '@repo/orchestrator'), playwrightConfig, playwrightProject, testTimeoutMs (default 300000), testTimeoutRetries (default 1), playwrightMaxRetries (default 2), kbWriteBackEnabled (default false), artifactBaseDir (default '...'), gateModel (default 'claude-sonnet-4-5'), nodeTimeoutMs (default 60000). All defaults per spec.

#### AC-2: QAGraphStateAnnotation with all required state fields

**Status**: PASS

**Evidence Items**:
- **file**: `packages/backend/orchestrator/src/graphs/qa.ts` - QAGraphStateAnnotation with Annotation.Root() containing: storyId, evidence, review, config, preconditionsPassed, unitTestResult, unitTestVerdict, playwrightAttempts, e2eVerdict, acVerifications, qaVerdict, gateDecision, qaArtifact, qaComplete, errors (array reducer), warnings (array reducer). All fields with defaults.

#### AC-3: check-preconditions node blocks when review FAIL or evidence null/invalid

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/check-preconditions.test.ts` - 7 tests pass: PASS when valid, BLOCKED when review FAIL, BLOCKED when review null, BLOCKED when evidence null, BLOCKED when evidence fails schema validation, lifecycle logging tests. All pass via 'pnpm test --filter @repo/orchestrator'.

#### AC-4: run-unit-tests node with timeout, retry, success paths and stdout capture

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/run-unit-tests.test.ts` - 4 tests pass: PASS when exit code 0, FAIL when exit code 1, lifecycle logging, timedOut flag on timeout. Uses createNode (not createToolNode) with nodeTimeoutMs = testTimeoutMs * (retries+1) + 30000 per ARCH-001.

#### AC-5: run-e2e-tests node with per-attempt retry, PASS if any attempt succeeds

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/run-e2e-tests.test.ts` - 4 tests pass: attempt 1 fail + attempt 2 succeed = PASS, all attempts fail = FAIL, first attempt success = PASS (1 attempt recorded), lifecycle logging. Uses createNode per ARCH-001 with large timeout.

#### AC-6: verify-acs node with PASS/FAIL/BLOCKED paths, model failure = BLOCKED per AC

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/verify-acs.test.ts` - 5 tests pass: PASS from model, FAIL from model, model failure on AC-1 = BLOCKED (continues to AC-2+), null evidence gracefully returns empty array, lifecycle logging. Model failure on individual AC returns BLOCKED (not FAIL) and processing continues.

#### AC-7: AC_VERIFICATION_PROMPT_V1 contains anti-hallucination instruction

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/verify-acs.test.ts` - Test 'AC_VERIFICATION_PROMPT_V1 contains anti-hallucination instruction' checks that the constant contains 'ANTI-HALLUCINATION', 'EXPLICITLY present', 'Do NOT infer', and 'fabricate'. All assertions pass.

#### AC-8: gate-decision node with PASS/FAIL/BLOCKED aggregate and model failure = BLOCKED

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/gate-decision.test.ts` - 6 tests pass: PASS when all ACs pass + model agrees, FAIL when ACs fail, BLOCKED on model failure, qaPassedSuccessfully() called before PASS, PASS downgraded to FAIL when qaPassedSuccessfully() fails, lifecycle logging.

#### AC-9: write-qa-artifact node writes QA-VERIFY.yaml with correct path, conditional KB write-back

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/write-qa-artifact.test.ts` - 7 tests pass: writes to correct path (worktreeDir/artifactBaseDir/storyId/QA-VERIFY.yaml), path contains storyId, no KB write when kbWriteBackEnabled=false, KB log written when kbWriteBackEnabled=true, handles write failure gracefully with qaComplete=false, lifecycle logging, backward compatibility.

#### AC-10: StateGraph wiring with all conditional edges, graph.compile() succeeds

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/graphs/__tests__/qa.test.ts` - Test '(j) graph.compile() succeeds without throwing' verifies graph compiles. Tests (i) verifies enableE2e:false routes unit_tests→verify_acs (spawn called once). Tests (f)/(g) verify E2E routing. All 11 graph tests pass.

#### AC-11: runQA() returns QAGraphResult with verdict, qaArtifact, durationMs, completedAt

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/graphs/__tests__/qa.test.ts` - Test 'runQA() returns QAGraphResult with verdict and qaArtifact' verifies all fields: storyId, verdict, qaArtifact, durationMs, completedAt, errors, warnings. Validated via QAGraphResultSchema.parse() in runQA() implementation.

#### AC-12: qaPassedSuccessfully() invoked before PASS returned in gate-decision

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/gate-decision.test.ts` - Two tests: 'calls qaPassedSuccessfully() before returning PASS' verifies the check is invoked. 'downgrades PASS to FAIL when qaPassedSuccessfully() fails' verifies downgrade behavior when check fails. Both pass.

#### AC-13: 10 graph-level test scenarios covering all QA graph paths

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/graphs/__tests__/qa.test.ts` - All 10 scenarios pass: (a) preconditions BLOCKED review FAIL, (b) preconditions BLOCKED evidence null, (c) happy path PASS (25ms with real timers), (d) unit test FAIL, (e) AC verify FAIL, (f) E2E retry success attempt 1 fail attempt 2 succeed (12ms), (g) E2E all fail, (h) gate model failure BLOCKED, (i) enableE2e:false skips E2E, (j) graph.compile() succeeds. Plus runQA() result shape test.

#### AC-14: 6 node test files in nodes/qa/__tests__/ covering all node scenarios

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/` - 6 test files created: check-preconditions.test.ts (7 tests), run-unit-tests.test.ts (4 tests), run-e2e-tests.test.ts (4 tests), verify-acs.test.ts (5 tests), gate-decision.test.ts (6 tests), write-qa-artifact.test.ts (7 tests). Total: 33 node tests, all pass.

#### AC-15: qa-verify.ts backward compatible, all new fields z.optional() or z.nullable().default(null)

**Status**: PASS

**Evidence Items**:
- **file**: `packages/backend/orchestrator/src/artifacts/qa-verify.ts` - qa-verify.ts not modified. QaVerifySchema fields test_results, coverage, test_quality, tokens all z.optional(). write-qa-artifact.test.ts test 'QaVerify artifact is backward compatible' verifies schema accepts partial data.

#### AC-16: @repo/logger lifecycle events with correct fields at every transition

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/qa/__tests__/` - Lifecycle logging verified in each node test file: check-preconditions logs qa_preconditions_check, run-unit-tests logs qa_unit_tests_started/complete, run-e2e-tests logs qa_e2e_started/attempt/complete, verify-acs logs qa_ac_verification_started/qa_ac_verified, gate-decision logs qa_gate_decision. All tests verify stage:'qa', event, and relevant fields.

#### AC-17: worktreeDir required field (no default) in QAGraphConfigSchema

**Status**: PASS

**Evidence Items**:
- **file**: `packages/backend/orchestrator/src/graphs/qa.ts` - worktreeDir: z.string().min(1) in QAGraphConfigSchema — no .default() call. Type check confirms it is required. tsc --noEmit shows no errors in qa.ts or any new nodes/qa/*.ts files.

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `packages/backend/orchestrator/src/graphs/qa.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/check-preconditions.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/run-unit-tests.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/run-e2e-tests.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/verify-acs.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/gate-decision.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/write-qa-artifact.ts` | created | - |
| `packages/backend/orchestrator/src/graphs/__tests__/qa.test.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/__tests__/check-preconditions.test.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/__tests__/run-unit-tests.test.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/__tests__/run-e2e-tests.test.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/__tests__/verify-acs.test.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/__tests__/gate-decision.test.ts` | created | - |
| `packages/backend/orchestrator/src/nodes/qa/__tests__/write-qa-artifact.test.ts` | created | - |

**Total**: 14 files created

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `pnpm --filter @repo/orchestrator test -- src/nodes/qa src/graphs/__tests__/qa.test.ts` | SUCCESS | 2026-03-01T00:00:00Z |
| `pnpm --filter @repo/orchestrator check-types (new files only)` | SUCCESS | 2026-03-01T00:00:00Z |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit | 45 | 0 |
| Integration | - | - |
| E2E | - | - |

**Summary**: 45 tests pass across 7 test files (33 node tests + 12 graph tests)

---

## API Endpoints Tested

Backend-only implementation. No HTTP endpoints tested in scope.

---

## Implementation Notes

### Notable Decisions

- **ARCH-001**: run-unit-tests and run-e2e-tests use createNode (not createToolNode) with large nodeTimeoutMs to accommodate the 5-minute subprocess timeout. createToolNode has a hardcoded 10s timeout that would preempt the application-layer subprocess timeout.
- **Real Timers for Integration**: Tests (c) and (f) in qa.test.ts use vi.useRealTimers() instead of fake timers because the full happy-path PASS flow through LangGraph with multiple async node hops and spawn mocks requires real async resolution. Other tests use fake timers successfully.
- **storyId in State**: storyId added to QAGraphStateAnnotation (beyond story spec) to satisfy node-factory infrastructure which reads state.storyId in createNodeExecutionContext().

### Known Deviations

- **Pre-existing Build Errors**: pnpm build fails due to pre-existing type errors in src/__types__/index.ts, src/nodes/context/context-warmer.ts, and src/nodes/context/session-manager.ts (missing @repo/database-schema and @repo/mcp-tools packages). These errors exist in the baseline before APIP-1060 changes and are not caused by our new files.
- **ELAB OPP-004 Deferred**: gate reasoning stored as string, structured data lost, deferred per AC-15 backward-compat constraint.

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
