# Test Plan: LNGG-0030

## Scope Summary

- **Endpoints touched**: None (backend-only, no REST API)
- **UI touched**: No (CLI interaction only)
- **Data/storage touched**: No (in-memory callback system)

**Packages Modified:**
- `packages/backend/orchestrator/` - New adapters/decision-callbacks/

**Integration Points:**
- LangGraph elaboration graph
- LangGraph node implementations

---

## Happy Path Tests

### Test 1: CLI Callback - Single Choice Selection

**Setup:**
- Create CLIDecisionCallback instance
- Mock inquirer.prompt to return specific choice
- Create DecisionRequest with single-choice type and 3 options

**Action:**
- Call `callback.ask(request)`
- Wait for Promise to resolve

**Expected Outcome:**
- Promise resolves with DecisionResponse
- Response.answer matches mocked selection
- Response.cancelled === false
- Response.timedOut === false
- Response conforms to DecisionResponse schema

**Evidence:**
- Jest/Vitest assertion on response shape
- Logger output shows "Presenting decision to user"
- No timeout or cancellation flags set

---

### Test 2: Auto-Decision Callback - Rule Match

**Setup:**
- Create AutoDecisionCallback with 3 rules
- Create DecisionRequest with context matching rule #2
- Rules configured with condition predicates

**Action:**
- Call `callback.ask(request)`
- Verify synchronous execution (no await needed internally)

**Expected Outcome:**
- Returns DecisionResponse immediately
- Response.answer matches rule #2 answer
- Logger shows rationale from rule #2
- No user interaction required

**Evidence:**
- Response.answer === rule2.answer
- Logger.info called with rationale
- Execution time <10ms

---

### Test 3: Registry - Default Callback Retrieval

**Setup:**
- Get DecisionCallbackRegistry singleton instance
- No custom registration

**Action:**
- Call `registry.getDefault()`

**Expected Outcome:**
- Returns CLIDecisionCallback instance
- Instance is ready to use

**Evidence:**
- `instanceof CLIDecisionCallback === true`
- Can call .ask() on returned instance

---

### Test 4: LangGraph Integration - Elaboration Graph

**Setup:**
- Create elaboration graph with DecisionCallback in config
- Mock callback to return specific answer
- Create graph state with gap requiring decision

**Action:**
- Execute graph workflow
- Graph invokes callback during gap handler node

**Expected Outcome:**
- Callback.ask() is called with valid DecisionRequest
- Workflow continues after receiving response
- Graph state reflects decision outcome
- No workflow errors

**Evidence:**
- Mock callback received .ask() call
- Graph state updated with decision answer
- Workflow completes successfully
- Node logs show decision processing

---

### Test 5: Multi-Select Question

**Setup:**
- Create CLIDecisionCallback
- Mock inquirer for checkbox type
- Create DecisionRequest with type='multi-select'

**Action:**
- Call `callback.ask(request)`
- Mock returns array of selected values

**Expected Outcome:**
- Response.answer is array of strings
- All selected values present
- Response conforms to schema (union allows array)

**Evidence:**
- `Array.isArray(response.answer) === true`
- Selected values match mock input
- Schema validation passes

---

## Error Cases

### Test 6: Invalid Request Schema - Missing Required Field

**Setup:**
- Create request object missing `question` field

**Action:**
- Call `callback.ask(invalidRequest)`

**Expected Outcome:**
- Zod validation error thrown
- Error message mentions missing field
- No callback execution

**Evidence:**
- Error is ZodError instance
- Error.issues includes 'question' field error

---

### Test 7: Registry - Non-Existent Callback

**Setup:**
- Get registry instance

**Action:**
- Call `registry.get('invalid-callback-name')`

**Expected Outcome:**
- Throws Error with clear message
- Error includes callback name

**Evidence:**
- Error message: "Decision callback 'invalid-callback-name' not found"
- Error thrown before any callback execution

---

### Test 8: Auto-Decision - No Rules Match, No Default

**Setup:**
- Create AutoDecisionCallback with rules=[], defaultAnswer=undefined
- Create request with context matching no rules

**Action:**
- Call `callback.ask(request)`

**Expected Outcome:**
- Returns first option value as fallback
- Logger shows default fallback rationale
- No error thrown

**Evidence:**
- Response.answer === request.options[0].value
- Logger.info called with "Default fallback"

---

### Test 9: Empty Options Array

**Setup:**
- Create DecisionRequest with options=[]

**Action:**
- Pass to DecisionRequestSchema.parse()

**Expected Outcome:**
- Schema validation error
- Error indicates minimum 1 option required

**Evidence:**
- ZodError with path=['options']
- Error message mentions min(1) constraint

---

## Edge Cases (Reasonable)

### Test 10: Timeout Triggers

**Setup:**
- Create CLIDecisionCallback
- Mock inquirer to delay 200ms
- Create request with timeout_ms=100

**Action:**
- Call `callback.ask(request)`
- Wait for Promise resolution

**Expected Outcome:**
- Promise resolves after ~100ms (not 200ms)
- Response.timedOut === true
- Response.answer is default (first option)
- No error thrown

**Evidence:**
- Execution time ≤ 150ms (allowing overhead)
- Response.timedOut === true
- Logger.warn called with "Decision timeout"

---

### Test 11: Cancellation (Ctrl+C Simulation)

**Setup:**
- Create CLIDecisionCallback
- Mock inquirer.prompt to throw interruption error

**Action:**
- Call `callback.ask(request)`

**Expected Outcome:**
- Promise resolves (not rejects)
- Response.cancelled === true
- Response.answer is empty string
- No unhandled error

**Evidence:**
- Response.cancelled === true
- Logger.info called with "Decision cancelled by user"
- No error propagated

---

### Test 12: Very Long Timeout (10 minutes)

**Setup:**
- Create request with timeout_ms=600000 (10 minutes)
- Mock immediate response

**Action:**
- Call `callback.ask(request)`

**Expected Outcome:**
- Promise resolves immediately with user choice
- Response.timedOut === false
- Timeout doesn't interfere with fast response

**Evidence:**
- Execution time <100ms
- Response.timedOut === false

---

### Test 13: 100 Options in Single Choice

**Setup:**
- Create request with 100 options
- Mock inquirer selection

**Action:**
- Call `callback.ask(request)`

**Expected Outcome:**
- All 100 options passed to inquirer
- Mock selection returns valid option
- No performance degradation

**Evidence:**
- inquirer received 100 choices in config
- Response.answer in valid options set
- Execution time <500ms

---

### Test 14: Unicode/Emoji in Question and Options

**Setup:**
- Create request with question="🤔 How should we proceed?"
- Options with emoji labels

**Action:**
- Call `callback.ask(request)` with mocked inquirer

**Expected Outcome:**
- Unicode characters preserved
- No encoding errors
- Schema validation passes

**Evidence:**
- Response.answer preserves unicode
- No character corruption
- (Manual test: terminal renders emoji correctly)

---

### Test 15: Concurrent Decision Requests

**Setup:**
- Create 3 DecisionRequest instances
- Create 3 AutoDecisionCallback instances with different rules

**Action:**
- Call all 3 `callback.ask()` in parallel with Promise.all

**Expected Outcome:**
- All 3 resolve with correct answers
- No race conditions
- Each uses its own rule set

**Evidence:**
- All responses match respective rules
- Execution time ~same as single call (synchronous)
- No cross-contamination of context

---

### Test 16: Workflow Timeout in Real Graph

**Setup:**
- Configure elaboration graph with callback having 100ms timeout
- Mock callback to delay indefinitely
- Run graph with gap requiring decision

**Action:**
- Execute graph workflow

**Expected Outcome:**
- Workflow continues after 100ms timeout
- Workflow uses default answer for gap
- Graph completes (does not hang)

**Evidence:**
- Graph state shows gap handled with default
- Total execution time ~100ms for decision step
- No workflow errors

---

### Test 17: Stateless Callback Instances

**Setup:**
- Create single CLIDecisionCallback instance
- Call .ask() with request A
- Call .ask() with request B (different question)

**Action:**
- Verify responses independent

**Expected Outcome:**
- Response A matches request A context
- Response B matches request B context
- No state pollution between calls

**Evidence:**
- Response IDs match respective request IDs
- Answers independent
- No shared mutable state

---

## Required Tooling Evidence

### Backend Testing

**Test Framework:**
- Vitest (configured in `packages/backend/orchestrator/package.json`)

**Test Commands:**
```bash
cd packages/backend/orchestrator
pnpm test                          # Run all tests
pnpm test -- --coverage           # With coverage report
pnpm test -- integration          # Integration tests only
pnpm test -- unit                 # Unit tests only
```

**Coverage Requirements:**
- Overall coverage: >80%
- Files to cover:
  - `types.ts` - 100% (schema definitions)
  - `cli-callback.ts` - >80%
  - `auto-callback.ts` - >90%
  - `registry.ts` - >90%
  - `noop-callback.ts` - 100%

**Required Assertions:**
- Schema validation: Use `.toThrow(ZodError)` matchers
- Response shape: Assert all required fields present
- Logger calls: Verify `logger.info/warn` invoked with expected args
- Timeout: Assert Promise resolution timing
- Cancellation: Assert no unhandled promise rejections

**Artifacts to Capture:**
- Coverage report: `coverage/lcov-report/index.html`
- Test output: Console log showing all tests pass
- Integration test log: Shows real LangGraph execution

---

### Integration Testing

**LangGraph Test Setup:**
```typescript
// integration.test.ts
import { createElaborationGraph } from '../graphs/elaboration'
import { AutoDecisionCallback } from '../adapters/decision-callbacks'

test('elaboration graph uses decision callback for gaps', async () => {
  const callback = new AutoDecisionCallback([
    {
      name: 'add-gap-as-ac',
      condition: (ctx) => ctx.gapType === 'missing-requirement',
      answer: 'add_ac',
      rationale: 'Test rule'
    }
  ])

  const graph = createElaborationGraph({ decisionCallback: callback })
  const result = await graph.execute(stateWithGap)

  expect(result.gapDecision).toBe('add_ac')
})
```

**Evidence Required:**
- Callback.ask() invoked during graph execution
- Graph state updated with callback response
- Workflow completes without errors
- No mocked LangGraph internals (real workflow)

---

### Mock Strategy

**Unit Tests - Mock inquirer:**
```typescript
import { vi } from 'vitest'
import inquirer from 'inquirer'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}))
```

**Integration Tests - Real callbacks:**
- Use real AutoDecisionCallback (no mocks)
- Use real DecisionCallbackRegistry (no mocks)
- Use real LangGraph workflow (no mocks)
- Mock only external I/O (if necessary)

---

## Risks to Call Out

### Risk 1: inquirer ESM Compatibility

**Description:**
inquirer v9+ is ESM-only. May fail in current CommonJS build setup.

**Impact on Testing:**
- Unit tests may fail if import fails
- Build may require tsconfig.json changes

**Mitigation:**
- Test early in implementation
- Prepare fallback to inquirer v8 (CommonJS) if needed
- Update build config for ESM support if required

**Test Evidence Needed:**
- Import succeeds: `import inquirer from 'inquirer'` works
- Mock succeeds: vi.mock('inquirer') works
- Build passes: `pnpm build` succeeds

---

### Risk 2: Timeout Promise Cleanup

**Description:**
setTimeout not cancelled after Promise.race may leave hanging timeout.

**Impact on Testing:**
- Tests may show memory leaks
- Jest/Vitest may warn about pending timers

**Mitigation:**
- Store timeout ID and clear in .finally() handler
- Verify no pending timers in tests

**Test Evidence Needed:**
- `vi.clearAllTimers()` shows 0 pending after test
- No memory leak warnings in test output

---

### Risk 3: Ctrl+C Signal Handling Platform Differences

**Description:**
SIGINT handling varies between macOS, Linux, Windows.

**Impact on Testing:**
- Mocked cancellation may not match real behavior
- Manual testing required on all platforms

**Mitigation:**
- Test with real Ctrl+C on macOS (development platform)
- Document platform-specific behavior if found
- Integration tests use mocked cancellation (not real signals)

**Test Evidence Needed:**
- Manual test on macOS terminal shows cancellation works
- Mocked cancellation test passes in CI
- Documentation includes platform notes if needed

---

### Risk 4: inquirer Mock Complexity

**Description:**
Mocking inquirer deeply may be brittle (internal API changes).

**Impact on Testing:**
- Unit tests may break on inquirer version updates
- Mock behavior may not match real inquirer

**Mitigation:**
- Keep mocks simple (mock .prompt() only)
- Use integration tests with real prompts for high confidence
- Document mock limitations

**Test Evidence Needed:**
- Mock works for basic prompt scenarios
- Integration tests validate real behavior
- Test README documents mock strategy

---

**Test Plan Completed**: 2026-02-13
**Estimated Test Implementation Time**: 3 hours
**Coverage Target**: >80% line coverage
**Integration Tests**: 5 scenarios with real LangGraph workflows
