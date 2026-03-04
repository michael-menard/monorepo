# Parity Test Suite

**Location**: `packages/backend/orchestrator/src/__tests__/parity/`  
**Story**: WINT-9120  
**Coverage target**: >= 80% branch coverage within this directory

---

## What Parity Means

A "parity test" in this context proves **functional equivalence** between two execution paths:

| Path | Description |
|------|-------------|
| **Claude Code path** | Original orchestration via subprocess delegation or direct node invocation (e.g. `nodes/workflow/doc-sync.ts`, individual `createStorySeedNode()` invocations) |
| **LangGraph path** | Ported LangGraph graph execution via `runStoryCreation()`, `runElaboration()`, `nodes/sync/doc-sync.ts`, etc. |

Parity is measured **structurally**: both paths must produce outputs that parse successfully through the same shared Zod artifact schema, with all required fields present and equivalent values for the compared fields. LLM output _content_ equality is NOT tested — only schema compliance and state transition parity.

A **PASS** verdict means:
- Both outputs parse through the shared Zod schema without errors  
- All required fields are present in both outputs  
- Optional fields are treated symmetrically (absent in both = matching; absent in one = divergent)  
- No real network calls were made (all external services injected via DI)  
- Verdict is `matching` OR test documents the divergence in `knownDivergences`

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `parity-harness.ts` | Core harness: `runParity()`, `ParityResultSchema`, diff utilities |
| `doc-sync.parity.test.ts` | Parity for doc-sync (WINT-9020, AC-2) |
| `story-creation.parity.test.ts` | Parity for story-creation graph (AC-3) |
| `elaboration.parity.test.ts` | Parity for elaboration graph (AC-4) |
| `wint9110-workflows.parity.test.ts` | Stubs for WINT-9110 workflows — gated until WINT-9110 ready-for-qa (AC-5) |
| `known-divergences.parity.test.ts` | Documents expected behavioral differences (AC-8) |

---

## How to Add a New Parity Test

### 1. Identify the two paths

Determine which files represent the Claude Code path and the LangGraph path for the workflow you want to test.

Example for a new `foo-workflow`:
- Claude Code path: `src/nodes/workflow/foo.ts`
- LangGraph path: `src/graphs/foo.ts` (exports `runFoo()`)

### 2. Define a shared output schema

Create a local Zod schema that captures the structural shape both paths must produce. Do NOT import directly from either path — keep the harness path-agnostic.

```typescript
const FooOutputSchema = z.object({
  storyId: z.string().min(1),
  success: z.boolean(),
  result: z.unknown().nullable(),
  errors: z.array(z.string()),
  completedAt: z.string().datetime(),
})
```

### 3. Create injectable runners

Both runners must be pure functions: they accept an input fixture and return an output. Inject all external dependencies via `vi.fn()` mocks — no real filesystem, git, DB, or AI calls.

```typescript
// Claude Code path runner (wraps the node/agent function)
const claudeCodeRunner = vi.fn().mockResolvedValue(fixtureOutput)

// LangGraph path runner (wraps runFoo())
const langGraphRunner = vi.fn().mockResolvedValue(fixtureOutput)
```

For integration-level tests that invoke real node code with injected dependencies:

```typescript
const mockToolRunner = vi.fn().mockResolvedValue(expectedResult)

const claudeCodeRunner = async (input: FooInput) => {
  const node = createFooNode({ toolRunner: mockToolRunner })
  const state = createFooState(input)
  return node(state)
}

const langGraphRunner = async (input: FooInput) => {
  return runFoo(input.currentStory, null, { toolRunner: mockToolRunner })
}
```

### 4. Pin timestamps

Use `vi.useFakeTimers()` in `beforeEach` to prevent timestamp-related divergences:

```typescript
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})
```

### 5. Run parity and assert

```typescript
it('returns matching verdict for foo-workflow', async () => {
  const result = await runParity({
    input: fixture,
    claudeCodeRunner,
    langGraphRunner,
    outputSchema: FooOutputSchema,
  })

  expect(result.verdict).toBe('matching')
  expect(result.diff).toHaveLength(0)
})
```

### 6. Document known divergences (if any)

If there are intentional behavioral differences, document them in `known-divergences.parity.test.ts` AND pass `knownDivergences` to `runParity()`:

```typescript
const result = await runParity({
  // ...
  knownDivergences: [
    'some.field: Claude Code path omits this; LangGraph path includes it. Acceptable during migration.',
  ],
})

expect(result.verdict).toBe('divergent')  // expected
expect(result.knownDivergences?.[0]).toContain('some.field')
// Test PASSES — divergence documented
```

---

## Cutover Sign-off Criteria

Before LangGraph can replace Claude Code orchestration, the following conditions must ALL be true:

1. **All parity tests pass** — `pnpm test --filter @repo/orchestrator` exits 0
2. **No unresolved divergent verdicts** — every `divergent` result has a corresponding entry in `known-divergences.parity.test.ts` with documented justification
3. **All known divergences are reviewed** — each entry in `knownDivergences` arrays must be reviewed by the team and accepted or resolved
4. **Coverage gate met** — `>= 80% branch coverage` within `src/__tests__/parity/`
5. **WINT-9110 stubs replaced** — all `it.todo()` in `wint9110-workflows.parity.test.ts` replaced with passing tests (requires WINT-9110 ready-for-qa)
6. **No real service calls** — all external calls remain injected; running the suite offline must produce identical results

Sign-off is recorded in the WINT-9120 EVIDENCE.yaml under `cutover_sign_off`.

---

## Running the Parity Suite

```bash
# Run all parity tests
pnpm test --filter @repo/orchestrator -- --reporter=verbose src/__tests__/parity/

# Run with coverage
pnpm test --filter @repo/orchestrator -- --coverage src/__tests__/parity/

# Run a single parity test file
pnpm test --filter @repo/orchestrator -- --reporter=verbose src/__tests__/parity/doc-sync.parity.test.ts
```
