# TEST-PLAN: wrkf-1010 — GraphState Schema

## Summary

This test plan covers the GraphState schema definition for the LangGraph orchestrator. The schema must validate all state fields using Zod, provide TypeScript type inference, and include utilities for state validation.

---

## Happy Path Tests

| ID | Test Description | Input | Expected Output | Evidence |
|----|------------------|-------|-----------------|----------|
| HP-1 | Create valid GraphState with all required fields | Complete GraphState object with epicPrefix, storyId, artifactPaths, routingFlags, evidenceRefs, gateDecisions | Schema parses successfully, returns typed object | Test output showing parse success |
| HP-2 | Type inference works for GraphState | `type State = z.infer<typeof GraphStateSchema>` | TypeScript compiles, IDE shows correct field types | Type-check passes, no TS errors |
| HP-3 | Access individual state fields | Valid GraphState object | Each field (epicPrefix, storyId, etc.) is accessible with correct type | Unit test assertions passing |
| HP-4 | epicPrefix field validates string | `{ epicPrefix: "wrkf" }` | Parses successfully as string | Test output |
| HP-5 | storyId field validates string | `{ storyId: "wrkf-1010" }` | Parses successfully as string | Test output |
| HP-6 | artifactPaths validates as Map/Record of paths | `{ artifactPaths: { story: "/path/to/story.md", elab: "/path/to/elab.md" } }` | Parses as Record<string, string> | Test output |
| HP-7 | routingFlags validates as object of booleans | `{ routingFlags: { skipCodeReview: false, requiresUIReview: true } }` | Parses as Record<string, boolean> | Test output |
| HP-8 | evidenceRefs validates as array of references | `{ evidenceRefs: [{ type: "test", path: "/path" }] }` | Parses as array of EvidenceRef objects | Test output |
| HP-9 | gateDecisions validates decision enum values | `{ gateDecisions: { codeReview: "PASS", qaVerify: "CONCERNS" } }` | Parses with valid enum values (PASS/CONCERNS/FAIL/WAIVED) | Test output |
| HP-10 | GraphStateSchema can be imported from @repo/orchestrator | `import { GraphStateSchema } from '@repo/orchestrator'` | Import resolves, schema is callable | Import verification test |
| HP-11 | State validation utility validates complete state | Valid GraphState via `validateGraphState()` | Returns validated state or true | Test output |
| HP-12 | Partial state creation with defaults | Minimal required fields | Optional fields get default values | Test output |

---

## Error Cases

| ID | Test Description | Input | Expected Error | Evidence |
|----|------------------|-------|----------------|----------|
| EC-1 | Reject invalid epicPrefix type | `{ epicPrefix: 123 }` | ZodError: Expected string, received number | Test output with error message |
| EC-2 | Reject invalid storyId type | `{ storyId: null }` | ZodError: Expected string, received null | Test output with error message |
| EC-3 | Reject invalid artifactPaths structure | `{ artifactPaths: "not-an-object" }` | ZodError: Expected object, received string | Test output with error message |
| EC-4 | Reject invalid routingFlags value type | `{ routingFlags: { flag: "not-boolean" } }` | ZodError: Expected boolean, received string | Test output with error message |
| EC-5 | Reject invalid gateDecision enum value | `{ gateDecisions: { review: "INVALID" } }` | ZodError: Invalid enum value | Test output with error message |
| EC-6 | Reject missing required fields | `{}` (empty object) | ZodError: Required field(s) missing | Test output with error message |
| EC-7 | Reject evidenceRefs with invalid structure | `{ evidenceRefs: [{ invalid: "structure" }] }` | ZodError: Missing required fields in EvidenceRef | Test output with error message |
| EC-8 | Reject non-string values in artifactPaths | `{ artifactPaths: { story: 123 } }` | ZodError: Expected string path value | Test output with error message |
| EC-9 | Reject array where object expected | `{ routingFlags: [true, false] }` | ZodError: Expected object, received array | Test output with error message |
| EC-10 | Validation utility throws on invalid state | Invalid GraphState via `validateGraphState()` | Throws validation error with details | Test output with error |

---

## Edge Cases

| ID | Test Description | Input | Expected Behavior | Evidence |
|----|------------------|-------|-------------------|----------|
| EDGE-1 | Empty string for epicPrefix | `{ epicPrefix: "" }` | Schema behavior (reject or allow based on design decision) | Test output documenting behavior |
| EDGE-2 | Empty string for storyId | `{ storyId: "" }` | Schema behavior (reject or allow based on design decision) | Test output documenting behavior |
| EDGE-3 | Empty artifactPaths object | `{ artifactPaths: {} }` | Parses successfully as empty Record | Test output |
| EDGE-4 | Empty routingFlags object | `{ routingFlags: {} }` | Parses successfully as empty Record | Test output |
| EDGE-5 | Empty evidenceRefs array | `{ evidenceRefs: [] }` | Parses successfully as empty array | Test output |
| EDGE-6 | Empty gateDecisions object | `{ gateDecisions: {} }` | Parses successfully as empty Record | Test output |
| EDGE-7 | Optional fields as undefined vs null | `{ optionalField: undefined }` vs `{ optionalField: null }` | undefined allowed, null handled per schema design | Test output |
| EDGE-8 | Extra fields not in schema | `{ epicPrefix: "wrkf", unknownField: "value" }` | Stripped in strict mode or allowed in passthrough | Test output documenting behavior |
| EDGE-9 | Very long string values | 10000+ character epicPrefix | Parses successfully (no length limit unless specified) | Test output |
| EDGE-10 | Unicode characters in string fields | `{ storyId: "wrkf-\u4e2d\u6587" }` | Parses successfully | Test output |
| EDGE-11 | Partial state update merging | Merge partial updates into existing state | State merges correctly, types preserved | Test output |
| EDGE-12 | Deep nested artifactPaths values | `{ artifactPaths: { "nested/path/key": "/value" } }` | Keys with slashes handled correctly | Test output |
| EDGE-13 | GateDecision with all WAIVED | All decisions set to "WAIVED" | Parses successfully | Test output |
| EDGE-14 | Large number of evidenceRefs | Array with 100+ evidence references | Parses successfully, no performance issues | Test output |
| EDGE-15 | State immutability verification | Attempt to mutate parsed state | State should be treated as immutable (frozen or copy-on-access) | Test output |

---

## Schema Integration Tests

| ID | Test Description | Input | Expected Behavior | Evidence |
|----|------------------|-------|-------------------|----------|
| SI-1 | Schema works with LangGraphJS StateGraph | Create StateGraph with GraphStateSchema | StateGraph initializes without error | Test output |
| SI-2 | State can be passed through mock node | Node receives state, returns modified state | State types preserved through node | Test output |
| SI-3 | Schema used in annotation pattern | LangGraphJS annotation with GraphState | Annotation compiles and runs | Test output |

---

## Evidence Requirements

- [ ] **Unit test output:** `pnpm test --filter @repo/orchestrator` with all tests passing
- [ ] **TypeScript compilation:** `pnpm check-types --filter @repo/orchestrator` with no errors
- [ ] **Import verification:** Test file successfully importing `GraphStateSchema` from `@repo/orchestrator`
- [ ] **Type inference screenshot/output:** IDE or type output showing inferred `GraphState` type fields
- [ ] **Zod error messages:** Captured error outputs for EC-* tests showing descriptive validation failures
- [ ] **Coverage report:** Test coverage for `src/state/` directory at minimum 80%

---

## Backend Test Requirements

- **No `.http` requests required** — Pure TypeScript schema, no API endpoints
- **Unit tests required:** All HP-*, EC-*, EDGE-*, and SI-* tests implemented in Vitest
- **Test location:** `packages/orchestrator/src/state/__tests__/graph-state.test.ts`
- **Run command:** `pnpm test --filter @repo/orchestrator`

---

## Frontend Test Requirements

- **SKIPPED** — This story does not touch UI components

---

## Seed Requirements

- **NOT APPLICABLE** — No database or seed data required for schema definition

---

## File Expectations

After implementation, the following files should exist:

| Path | Purpose |
|------|---------|
| `packages/orchestrator/src/state/index.ts` | GraphState schema exports |
| `packages/orchestrator/src/state/graph-state.ts` | Main GraphState Zod schema |
| `packages/orchestrator/src/state/evidence-ref.ts` | EvidenceRef sub-schema |
| `packages/orchestrator/src/state/gate-decision.ts` | GateDecision enum schema |
| `packages/orchestrator/src/state/validation.ts` | State validation utilities |
| `packages/orchestrator/src/state/__tests__/graph-state.test.ts` | Unit tests |

---

## Test Data Fixtures

The following test fixtures should be created for reuse:

```typescript
// Valid complete state
const validGraphState = {
  epicPrefix: 'wrkf',
  storyId: 'wrkf-1010',
  artifactPaths: {
    story: '/plans/stories/wrkf-1010/wrkf-1010.md',
    elab: '/plans/stories/wrkf-1010/elab-wrkf-1010.md',
    proof: '/plans/stories/wrkf-1010/_implementation/PROOF.md',
  },
  routingFlags: {
    skipCodeReview: false,
    requiresUIReview: false,
    skipQAVerify: false,
  },
  evidenceRefs: [
    { type: 'test', path: '/test-output.txt', timestamp: '2026-01-23T10:00:00Z' },
    { type: 'build', path: '/build-output.txt', timestamp: '2026-01-23T10:01:00Z' },
  ],
  gateDecisions: {
    codeReview: 'PASS',
    qaVerify: 'PASS',
    uiuxReview: 'WAIVED',
  },
}

// Minimal valid state (only required fields)
const minimalGraphState = {
  epicPrefix: 'wrkf',
  storyId: 'wrkf-1010',
  artifactPaths: {},
  routingFlags: {},
  evidenceRefs: [],
  gateDecisions: {},
}
```

---

*Generated by PM Agent | wrkf-1010*
