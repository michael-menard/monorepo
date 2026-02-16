# Dev Feasibility Review: LNGG-0030

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: Medium
- **Why**: Core callback system is straightforward (Strategy pattern + Registry). Main uncertainty is inquirer ESM compatibility with current build setup. If ESM fails, fallback to inquirer v8 (CommonJS) is available. LangGraph integration is well-defined (pass callback via config). No new infrastructure required.

---

## Likely Change Surface (Core Only)

### Packages Modified

**Primary:**
- `packages/backend/orchestrator/src/adapters/decision-callbacks/` (new directory)
  - 6 new files + 4 test files
  - ~600 lines of implementation code
  - ~800 lines of test code

**Package.json Changes:**
- `packages/backend/orchestrator/package.json`
  - Add `inquirer@^9.2.0` dependency (or `inquirer@^8.2.6` if ESM fallback needed)

### Files Created

```
packages/backend/orchestrator/src/adapters/decision-callbacks/
├── index.ts              (~30 lines) - Exports
├── types.ts              (~80 lines) - Zod schemas
├── cli-callback.ts       (~120 lines) - CLI implementation
├── auto-callback.ts      (~80 lines) - Auto-decision implementation
├── noop-callback.ts      (~20 lines) - No-op implementation
├── registry.ts           (~90 lines) - Registry singleton
└── __tests__/
    ├── cli-callback.test.ts      (~200 lines)
    ├── auto-callback.test.ts     (~150 lines)
    ├── registry.test.ts          (~100 lines)
    └── integration.test.ts       (~350 lines)
```

### Files Modified

**LangGraph Config (Minor):**
- `packages/backend/orchestrator/src/graphs/elaboration.ts`
  - Add `decisionCallback` to config object
  - ~10 lines changed

**Node Implementations (Minor):**
- `packages/backend/orchestrator/src/nodes/gap-handler.ts` (example)
  - Call `config.decisionCallback.ask()`
  - ~20 lines changed per node

**Build Config (Potentially):**
- `packages/backend/orchestrator/tsconfig.json`
  - May need `"module": "ESNext"` for inquirer v9
  - May need `"moduleResolution": "node16"`
  - ~5 lines changed if needed

### Endpoints (Core Journey)

**None** - This is backend infrastructure only, no REST API endpoints.

### Critical Deploy Touchpoints

**None** - No deployment changes required. Code is library/adapter addition only.

---

## MVP-Critical Risks (Max 5)

### Risk 1: inquirer ESM Compatibility

**Why it blocks MVP:**
If inquirer v9 (ESM) doesn't work with current build setup, CLI callbacks won't function. This is the primary user interaction mechanism.

**Required Mitigation:**
1. Test inquirer import early (Phase 1 of implementation)
2. If ESM fails:
   - Option A: Update tsconfig.json for ESM support (`"module": "ESNext"`)
   - Option B: Fallback to inquirer v8.2.6 (CommonJS, still supported)
3. Verify mock strategy works with chosen version

**Validation:**
- `import inquirer from 'inquirer'` succeeds in TypeScript
- `pnpm build` succeeds without errors
- Basic prompt test passes

---

### Risk 2: Promise.race Timeout Cleanup

**Why it blocks MVP:**
If timeout Promise doesn't clean up, callbacks may leak memory and tests will fail. This affects reliability of all interactive workflows.

**Required Mitigation:**
1. Store timeout ID in variable
2. Clear timeout in `.finally()` handler of Promise.race
3. Verify in unit tests that no timers remain pending

**Implementation Pattern:**
```typescript
let timeoutId: NodeJS.Timeout | undefined

const timeoutPromise = new Promise<DecisionResponse>((resolve) => {
  timeoutId = setTimeout(() => resolve(timeoutResponse), timeout_ms)
})

return Promise.race([promptPromise, timeoutPromise])
  .finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
```

**Validation:**
- Unit test checks no pending timers after callback
- No memory leak warnings in test output

---

### Risk 3: LangGraph Config Type Safety

**Why it blocks MVP:**
If graph config doesn't enforce DecisionCallback type, nodes may receive undefined callback and crash workflow.

**Required Mitigation:**
1. Define GraphConfig interface with required `decisionCallback` field
2. Use Zod schema validation for config at graph construction
3. Throw clear error if callback missing

**Implementation:**
```typescript
const GraphConfigSchema = z.object({
  decisionCallback: z.custom<DecisionCallback>((val) =>
    typeof val?.ask === 'function'
  )
})

export function createElaborationGraph(config: unknown) {
  const validatedConfig = GraphConfigSchema.parse(config)
  // ... use validatedConfig.decisionCallback
}
```

**Validation:**
- Graph construction throws if callback missing
- TypeScript compilation enforces config shape
- Integration test validates config passing

---

### Risk 4: Schema Validation Performance

**Why it blocks MVP:**
If Zod validation is too slow for high-frequency callbacks, workflows may have unacceptable latency.

**Required Mitigation:**
1. Use `.parse()` only on request creation (user-facing, low frequency)
2. Skip validation on response in hot path (trust internal implementation)
3. Benchmark: <5ms overhead per callback invocation

**Validation:**
- Benchmark test: 1000 callback invocations in <5 seconds
- Integration test shows no noticeable delay in workflow

---

### Risk 5: Registry Singleton Initialization Race

**Why it blocks MVP:**
If multiple parts of code call `getInstance()` concurrently before first initialization completes, may create multiple registry instances.

**Required Mitigation:**
1. Use simple singleton pattern (not lazy with async)
2. Initialize instance immediately on first access
3. No async operations in constructor

**Implementation:**
```typescript
export class DecisionCallbackRegistry {
  private static instance: DecisionCallbackRegistry | undefined

  private constructor() {
    // Synchronous initialization only
    this.register('cli', new CLIDecisionCallback())
    // ...
  }

  static getInstance(): DecisionCallbackRegistry {
    if (!DecisionCallbackRegistry.instance) {
      DecisionCallbackRegistry.instance = new DecisionCallbackRegistry()
    }
    return DecisionCallbackRegistry.instance
  }
}
```

**Validation:**
- Unit test: concurrent getInstance() returns same instance
- No race condition in initialization

---

## Missing Requirements for MVP

### Requirement 1: Default Timeout Value

**Missing Detail:**
Story doesn't specify default timeout when not provided in request.

**Concrete Decision Text:**
"Default timeout for DecisionRequest is 30000ms (30 seconds). This can be overridden per request via `timeout_ms` field. Rationale: 30s is reasonable for human response time, matches industry standards for interactive prompts."

**Where to Add:**
- types.ts: `timeout_ms: z.number().int().positive().default(30000)`
- Documentation comment in DecisionRequestSchema

---

### Requirement 2: Callback Error Handling Strategy

**Missing Detail:**
What happens if callback.ask() throws an unexpected error (not timeout/cancel)?

**Concrete Decision Text:**
"If callback.ask() throws unexpected error, workflow must:
1. Log error with full stack trace (@repo/logger.error)
2. Return cancelled response: `{ cancelled: true, answer: '' }`
3. Continue workflow (do not propagate error)

Rationale: Workflow robustness > callback perfection. Decision can be retried or defaulted."

**Where to Add:**
- Architecture Notes section in story
- try/catch wrapper in node implementations

---

### Requirement 3: Registry Registration Timing

**Missing Detail:**
When are built-in callbacks registered? At import time or on first getInstance()?

**Concrete Decision Text:**
"Built-in callbacks ('cli', 'auto', 'noop') are registered in Registry constructor on first getInstance() call. Registration is synchronous and happens before getInstance() returns. Custom callbacks can be registered after getInstance() via .register() method."

**Where to Add:**
- Architecture Notes section
- Code comment in registry.ts constructor

---

## MVP Evidence Expectations

### Evidence 1: CLI Prompt Works in Terminal

**What to Demonstrate:**
- Run script that invokes CLIDecisionCallback.ask()
- Terminal shows inquirer prompt with options
- Arrow keys navigate, Enter selects
- Response printed to console

**Verification:**
```bash
cd packages/backend/orchestrator
pnpm tsx src/adapters/decision-callbacks/__tests__/manual-cli-test.ts
```

**Expected Output:**
```
? Select an option: (Use arrow keys)
❯ Option A
  Option B
  Option C

Selected: Option A
Response: { id: '...', answer: 'option_a', cancelled: false, timedOut: false }
```

---

### Evidence 2: Auto-Decision Rules Match Correctly

**What to Demonstrate:**
- Create AutoDecisionCallback with 3 rules
- Provide context matching rule #2
- Verify answer from rule #2 returned
- Logger shows rationale

**Verification:**
- Unit test output shows rule matching
- Logger output includes rationale text

---

### Evidence 3: LangGraph Integration Test Passes

**What to Demonstrate:**
- Real elaboration graph uses callback
- Callback invoked during gap handler node
- Workflow continues after decision
- Graph state reflects decision outcome

**Verification:**
```bash
pnpm test integration
```

**Expected Output:**
```
✓ elaboration graph uses decision callback for gaps
✓ workflow continuation after decision
✓ auto-decision mode end-to-end
✓ timeout in real workflow
```

---

### Evidence 4: Timeout Handling Works

**What to Demonstrate:**
- CLI callback with 100ms timeout
- Mock delays response >100ms
- Callback returns { timedOut: true } after ~100ms

**Verification:**
- Unit test passes showing timeout behavior
- Execution time measured ≤150ms

---

### Evidence 5: >80% Test Coverage

**What to Demonstrate:**
- Coverage report shows all callback files >80%
- types.ts at 100% (schema definitions)
- registry.ts at >90%

**Verification:**
```bash
pnpm test -- --coverage
```

**Expected Output:**
```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
types.ts                | 100     | 100      | 100     | 100
cli-callback.ts         | 85      | 80       | 90      | 85
auto-callback.ts        | 92      | 88       | 95      | 92
registry.ts             | 95      | 90       | 100     | 95
noop-callback.ts        | 100     | 100      | 100     | 100
------------------------|---------|----------|---------|--------
All files               | 89      | 85       | 92      | 89
```

---

### Evidence 6: Build Passes

**What to Demonstrate:**
- TypeScript compilation succeeds
- No type errors
- Package builds successfully

**Verification:**
```bash
cd packages/backend/orchestrator
pnpm build
```

**Expected Output:**
```
> @repo/orchestrator@1.0.0 build
> tsc

✓ Built in 2.3s
```

---

## Critical Deploy Checkpoints

**None** - This story adds library code only, no deployment required.

**Post-MVP Deployment Considerations** (out of scope):
- When web UI callback implemented, may need REST API deployment
- When decision history implemented, may need database migration

---

**Feasibility Review Completed**: 2026-02-13
**Reviewer**: Dev Feasibility Agent (pm-dev-feasibility-review v3.0.0)
**Confidence Level**: Medium (pending inquirer ESM test)
**Recommended Next Step**: Implement types.ts + test inquirer import early (Risk 1 mitigation)
