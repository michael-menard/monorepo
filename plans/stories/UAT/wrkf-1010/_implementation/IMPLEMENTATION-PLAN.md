# Implementation Plan - WRKF-1010: GraphState Schema

## Scope Surface

- **backend/API:** yes (pure TypeScript library)
- **frontend/UI:** no
- **infra/config:** no
- **notes:** Pure Zod schema definitions with utilities for LangGraph orchestrator state management. No runtime side effects, no external dependencies beyond zod.

---

## Acceptance Criteria Checklist

1. `GraphStateSchema` Zod schema defined with all required fields (AC-1)
2. `schemaVersion` field set to `"1.0.0"` (AC-2)
3. `epicPrefix` validates as non-empty string (AC-3)
4. `storyId` validates with case-insensitive regex `^[a-z]+-\d+$` (AC-4)
5. `artifactPaths` record with `ArtifactTypeSchema` keys (AC-5)
6. `routingFlags` record with `RoutingFlagSchema` keys (AC-6)
7. `evidenceRefs` array of `EvidenceRefSchema` (AC-7)
8. `gateDecisions` record with `GateTypeSchema` keys, `GateDecisionSchema` values (AC-8)
9. `errors` array of `NodeErrorSchema` with defaults (AC-9)
10. All schemas export inferred types via `z.infer<>` (AC-10)
11. `validateGraphState()` utility (AC-11)
12. `createInitialState()` utility (AC-12)
13. All schemas exported from `@repo/orchestrator` (AC-13)
14. Unit tests with 80%+ coverage for `src/state/` (AC-14)
15. TypeScript strict mode passes (AC-15)
16. `EvidenceRefSchema` fields: type, path, timestamp, description (AC-16)
17. `NodeErrorSchema` fields: nodeId, message, code, timestamp, stack, recoverable (AC-17)
18. Field requirements documented (AC-18)
19. `createInitialState({ epicPrefix, storyId })` signature (AC-19)
20. `diffGraphState(before, after)` utility (AC-20)
21. `serializeState(state)` utility (AC-21)
22. `deserializeState(json)` utility (AC-22)
23. `stateHistory` optional field for time-travel debugging (AC-23)
24. Cross-field Zod refinements (AC-24)

---

## Files To Touch (Expected)

### CREATE (New Files)

| Path | Purpose |
|------|---------|
| `packages/backend/orchestrator/src/state/index.ts` | State module exports |
| `packages/backend/orchestrator/src/state/graph-state.ts` | Main GraphState schema |
| `packages/backend/orchestrator/src/state/enums/index.ts` | Enum exports |
| `packages/backend/orchestrator/src/state/enums/artifact-type.ts` | ArtifactType enum |
| `packages/backend/orchestrator/src/state/enums/routing-flag.ts` | RoutingFlag enum |
| `packages/backend/orchestrator/src/state/enums/gate-type.ts` | GateType enum |
| `packages/backend/orchestrator/src/state/enums/gate-decision.ts` | GateDecision enum |
| `packages/backend/orchestrator/src/state/refs/index.ts` | Ref schema exports |
| `packages/backend/orchestrator/src/state/refs/evidence-ref.ts` | EvidenceRef schema |
| `packages/backend/orchestrator/src/state/refs/node-error.ts` | NodeError schema |
| `packages/backend/orchestrator/src/state/validators.ts` | Validation utilities |
| `packages/backend/orchestrator/src/state/utilities.ts` | diff, serialize, deserialize |
| `packages/backend/orchestrator/src/state/__tests__/graph-state.test.ts` | Schema tests |
| `packages/backend/orchestrator/src/state/__tests__/validators.test.ts` | Validator tests |
| `packages/backend/orchestrator/src/state/__tests__/utilities.test.ts` | Utility tests |

### MODIFY (Existing Files)

| Path | Change |
|------|--------|
| `packages/backend/orchestrator/src/index.ts` | Add state module exports |

---

## Reuse Targets

| Package/Module | Usage |
|----------------|-------|
| `zod` | All schema definitions (already in package.json) |
| `@repo/moc-parts-lists-core/src/__types__/` | Pattern reference for Zod schema organization |
| `@repo/moc-parts-lists-core/src/index.ts` | Pattern reference for export structure |

---

## Architecture Notes (Ports & Adapters)

### What Goes in Core

- **All schemas (GraphState, enums, refs):** Pure Zod definitions, no runtime dependencies
- **Validation utilities:** `validateGraphState()` wraps Zod parse with error handling
- **State utilities:** `createInitialState()`, `diffGraphState()`, `serializeState()`, `deserializeState()`

### Boundaries to Protect

- **No LangGraph imports in state module:** State schemas are independent of the graph runtime
- **No external service calls:** Pure data structures and validation only
- **No @repo/logger dependency:** This is a schema library; logging is for consumers
- **No database or API types:** State is graph-internal, not for persistence

### Export Strategy

The `src/state/index.ts` will aggregate all exports. The main `src/index.ts` will re-export from `./state/index.js`. This follows the pattern established in `@repo/moc-parts-lists-core`.

---

## Step-by-Step Plan (Small Steps)

### Step 1: Create enum schemas (4 files)

**Objective:** Define ArtifactType, RoutingFlag, GateType, GateDecision enums

**Files involved:**
- CREATE: `src/state/enums/artifact-type.ts`
- CREATE: `src/state/enums/routing-flag.ts`
- CREATE: `src/state/enums/gate-type.ts`
- CREATE: `src/state/enums/gate-decision.ts`
- CREATE: `src/state/enums/index.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run type-check
```

### Step 2: Create ref schemas (2 files)

**Objective:** Define EvidenceRef and NodeError schemas

**Files involved:**
- CREATE: `src/state/refs/evidence-ref.ts`
- CREATE: `src/state/refs/node-error.ts`
- CREATE: `src/state/refs/index.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run type-check
```

### Step 3: Create GraphState schema

**Objective:** Define main GraphStateSchema with all fields, defaults, and refinements

**Files involved:**
- CREATE: `src/state/graph-state.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run type-check
```

### Step 4: Create validation utilities

**Objective:** Implement `validateGraphState()` and `createInitialState()`

**Files involved:**
- CREATE: `src/state/validators.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run type-check
```

### Step 5: Create state utilities

**Objective:** Implement `diffGraphState()`, `serializeState()`, `deserializeState()`

**Files involved:**
- CREATE: `src/state/utilities.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run type-check
```

### Step 6: Create state module exports

**Objective:** Aggregate all state exports and add to main index

**Files involved:**
- CREATE: `src/state/index.ts`
- MODIFY: `src/index.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run build
```

### Step 7: Write graph-state tests

**Objective:** Test GraphStateSchema happy path, error cases, edge cases

**Files involved:**
- CREATE: `src/state/__tests__/graph-state.test.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run test
```

### Step 8: Write validator tests

**Objective:** Test validateGraphState, createInitialState

**Files involved:**
- CREATE: `src/state/__tests__/validators.test.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run test
```

### Step 9: Write utility tests

**Objective:** Test diffGraphState, serializeState, deserializeState

**Files involved:**
- CREATE: `src/state/__tests__/utilities.test.ts`

**Verification:**
```bash
pnpm --filter @repo/orchestrator run test
```

### Step 10: Run coverage and lint

**Objective:** Verify 80%+ coverage and lint passes

**Verification:**
```bash
pnpm --filter @repo/orchestrator run test:coverage
pnpm eslint packages/backend/orchestrator/src/state --fix
```

---

## Test Plan

### Commands to Run

| Command | Purpose |
|---------|---------|
| `pnpm --filter @repo/orchestrator run type-check` | TypeScript compilation |
| `pnpm --filter @repo/orchestrator run build` | Verify build succeeds |
| `pnpm --filter @repo/orchestrator run test` | Run all unit tests |
| `pnpm --filter @repo/orchestrator run test:coverage` | Verify 80%+ coverage for `src/state/` |
| `pnpm eslint packages/backend/orchestrator/src/state` | Lint new files |

### Test Coverage Targets

| Directory | Target |
|-----------|--------|
| `src/state/` | 80%+ (per AC-14) |
| `src/state/enums/` | 100% (trivial enum exports) |
| `src/state/refs/` | 90%+ (schema validation tests) |
| `src/state/validators.ts` | 90%+ (happy path + error cases) |
| `src/state/utilities.ts` | 90%+ (diff/serialize/deserialize) |
| `src/state/graph-state.ts` | 80%+ (main schema with refinements) |

### Playwright

Not applicable - no UI changes.

### HTTP Contract

Not applicable - no API endpoints.

---

## Stop Conditions / Blockers

### None Identified

The story specification is complete with:
- All enum values defined in PM Decisions
- All field requirements documented in AC-16 through AC-18
- Clear schema structure in Architecture Notes
- All utility signatures specified

### Potential Risks (Low)

1. **Zod refinement complexity:** Cross-field validation (AC-24) may require iterating on the exact refinement logic. If unclear, start with simple refinements and add complexity based on failing tests.

2. **stateHistory recursion:** AC-23 mentions "timestamped state snapshots" for stateHistory. This could be a circular reference if snapshots include stateHistory. Plan: Define `StateSnapshotSchema` without the stateHistory field to avoid recursion.

---

## Token Log (REQUIRED)

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: wrkf-1010.md | input | 17,341 | ~4,335 |
| Read: LESSONS-LEARNED.md | input | 25,500 | ~6,375 |
| Read: orchestrator/src/index.ts | input | 202 | ~50 |
| Read: orchestrator/package.json | input | 892 | ~223 |
| Read: orchestrator/tsconfig.json | input | 503 | ~126 |
| Read: orchestrator/vitest.config.ts | input | 349 | ~87 |
| Read: moc-parts-lists-core/__types__/index.ts | input | 5,727 | ~1,432 |
| Read: moc-parts-lists-core/src/index.ts | input | 2,824 | ~706 |
| Read: SCOPE.md | input | 576 | ~144 |
| Write: IMPLEMENTATION-PLAN.md | output | ~8,500 | ~2,125 |
| **Total** | — | ~62,414 | **~15,603** |

---

*Generated by Planner Agent | 2026-01-23*
