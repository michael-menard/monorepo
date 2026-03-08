# WINT-4010 Backend Implementation Log

Story: Create Cohesion Sidecar
Feature Dir: plans/future/platform/wint
Mode: FIX (implementing from scratch — code was never written)

---

## Chunk 1 — Package Structure (AC-1, AC-13)

- Objective: Create package.json, tsconfig.json, vitest.config.ts for @repo/cohesion-sidecar
- Files changed:
  - packages/backend/sidecars/cohesion/package.json (created)
  - packages/backend/sidecars/cohesion/tsconfig.json (created)
  - packages/backend/sidecars/cohesion/vitest.config.ts (created)
- Summary: Package definition following rules-registry pattern exactly. @vitest/coverage-v8 added as devDep. 80% branch coverage threshold set per AC-10.
- Reuse compliance:
  - Reused: rules-registry package.json structure verbatim
  - New: Package name @repo/cohesion-sidecar, PORT 3092, @repo/mcp-tools dependency
  - Why new was necessary: New sidecar package
- Commands run: pnpm install --filter @repo/cohesion-sidecar — SUCCESS
- Notes: pnpm-workspace.yaml glob 'packages/backend/sidecars/*' auto-discovers cohesion (AC-13)

---

## Chunk 2 — Zod Schemas (AC-7)

- Objective: Define all Zod schemas in src/__types__/index.ts
- Files changed:
  - packages/backend/sidecars/cohesion/src/__types__/index.ts (created)
- Summary: CohesionAuditRequestSchema (optional packageName), CohesionCheckRequestSchema (required featureId), CohesionAuditResultSchema, CohesionCheckResultSchema (boolean capabilityCoverage per ARCH-002), discriminated union HTTP response schemas. FrankenFeatureItemSchema imported from @repo/mcp-tools (OPP-01).
- Reuse compliance:
  - Reused: FrankenFeatureItemSchema from @repo/mcp-tools
  - New: CohesionAuditResult, CohesionCheckResult, CapabilityCoverage (boolean shape, not counts)
  - Why new was necessary: Sidecar-specific response shapes per AC-3/AC-4 HTTP contract
- Commands run: pnpm check-types — SUCCESS

---

## Chunk 3 — computeAudit Pure Function (AC-3, AC-6, AC-8)

- Objective: Implement injectable computeAudit function
- Files changed:
  - packages/backend/sidecars/cohesion/src/compute-audit.ts (created)
- Summary: computeAudit(request, db) uses Drizzle innerJoin query on features+capabilities. Optional packageName filter applied in TypeScript (ARCH-003 — no pgViews). Returns graceful empty result when graph is empty (AC-8).
- Reuse compliance:
  - Reused: Drizzle query pattern from graph-get-franken-features.ts
  - New: Injectable db parameter pattern (AC-6)
  - Why new was necessary: Cohesion-specific compute logic with DI
- Commands run: pnpm check-types — SUCCESS

---

## Chunk 4 — computeCheck Pure Function (AC-4, AC-6, AC-8)

- Objective: Implement injectable computeCheck function
- Files changed:
  - packages/backend/sidecars/cohesion/src/compute-check.ts (created)
- Summary: computeCheck(featureId, db) queries capabilities by featureId. Returns {status: 'unknown'} for not-found features (AC-8). Boolean capabilityCoverage per AC-4 HTTP contract. Violations array with "missing {stage} capability" entries.
- Reuse compliance:
  - Reused: Drizzle eq() query pattern
  - New: Injectable db parameter, boolean coverage shape per ARCH-002
- Commands run: pnpm check-types — SUCCESS

---

## Chunk 5 — Route Handlers (AC-3, AC-4, AC-5)

- Objective: HTTP route handlers for POST /cohesion/audit and POST /cohesion/check
- Files changed:
  - packages/backend/sidecars/cohesion/src/routes/cohesion.ts (created)
- Summary: handleCohesionAuditRequest and handleCohesionCheckRequest with sendJson/readBody helpers copied from context-pack (no cross-sidecar imports). SEC-002 auth-deferred comment added per OPP-02. Injectable CohesionRouteDeps for testability.
- Reuse compliance:
  - Reused: sendJson/readBody pattern from context-pack (copied, not imported)
  - New: CohesionRouteDeps type for testability
- Commands run: pnpm check-types — SUCCESS

---

## Chunk 6 — HTTP Server (AC-2)

- Objective: node:http server on PORT 3092
- Files changed:
  - packages/backend/sidecars/cohesion/src/server.ts (created)
- Summary: createServer with PORT = process.env.PORT ?? '3092'. Dispatches to route handlers. Port table comment (3090-3093). No Hono/Express.
- Commands run: pnpm check-types — SUCCESS

---

## Chunk 7 — MCP Wrappers and index.ts (AC-9, AC-12)

- Objective: cohesion_audit and cohesion_check MCP wrappers; package entry point
- Files changed:
  - packages/backend/sidecars/cohesion/src/mcp-tools/cohesion-audit.ts (created)
  - packages/backend/sidecars/cohesion/src/mcp-tools/cohesion-check.ts (created)
  - packages/backend/sidecars/cohesion/src/index.ts (created)
- Summary: Both wrappers call computeAudit/computeCheck directly (ARCH-001 — no HTTP fetch). Return null on error (logged via @repo/logger). index.ts exports cohesion_audit and cohesion_check.
- Commands run: pnpm check-types — SUCCESS

---

## Chunk 8 — Tests (AC-10, AC-11)

- Objective: Unit tests for compute functions, route handlers, MCP wrappers; integration test
- Files changed:
  - packages/backend/sidecars/cohesion/src/test/setup.ts (created)
  - packages/backend/sidecars/cohesion/src/__tests__/compute-audit.test.ts (created)
  - packages/backend/sidecars/cohesion/src/__tests__/compute-check.test.ts (created)
  - packages/backend/sidecars/cohesion/src/__tests__/routes.test.ts (created)
  - packages/backend/sidecars/cohesion/src/__tests__/mcp-tools.test.ts (created)
  - packages/backend/sidecars/cohesion/src/__tests__/server.integration.test.ts (created)
- Summary: 46 tests across 5 test files. MockDbWithPopulatedGraph (HP-1, HP-2), MockDbEmpty (AC-8), MockDbThrowsOnQuery (EC-4), complete/incomplete/unknown/DB-error scenarios. Integration tests on port 3093 with injectable deps.
- Commands run:
  - pnpm test — 46/46 PASS
  - pnpm test:coverage — 84.72% branches (>= 80% AC-10 threshold)
  - pnpm build — SUCCESS
  - eslint src --ext .ts --max-warnings 0 — SUCCESS

---

## Fix History

- Round 1: Test assertion mismatch — "featureId is required" vs Zod's "Required". Fixed test to match actual behavior. Also fixed Zod schema to use required_error.
- Round 2: 3 Prettier formatting errors in __types__/index.ts and server.ts — fixed.

---

## Final Verification

| Check | Result |
|-------|--------|
| pnpm check-types | PASS |
| pnpm test (46 tests) | PASS |
| pnpm test:coverage | PASS — 84.72% branches |
| pnpm build | PASS |
| eslint | PASS |
| console.log grep | PASS — none in production code |

## AC Coverage

| AC | Status |
|----|--------|
| AC-1 | PASS — package.json, tsconfig.json, vitest.config.ts at packages/backend/sidecars/cohesion/ |
| AC-2 | PASS — node:http createServer, PORT=3092, no Hono/Express |
| AC-3 | PASS — POST /cohesion/audit returns {ok:true, data:{frankenFeatures:[],coverageSummary:{}}} |
| AC-4 | PASS — POST /cohesion/check returns {ok:true, data:{featureId,status,violations,capabilityCoverage}} |
| AC-5 | PASS — Both handlers return {ok:false, error:string} on invalid input or error |
| AC-6 | PASS — computeAudit/computeCheck accept db as parameter (DrizzleDb injectable type) |
| AC-7 | PASS — src/__types__/index.ts uses only z.object(), z.enum(), z.discriminatedUnion() |
| AC-8 | PASS — MockDbEmpty returns {frankenFeatures:[], coverageSummary:{totalFeatures:0,...}} not error |
| AC-9 | PASS — cohesion_audit and cohesion_check exported from index.ts, call compute directly |
| AC-10 | PASS — 84.72% branch coverage (>= 80% threshold) |
| AC-11 | PASS — 6 integration tests on port 3093 |
| AC-12 | PASS — Only @repo/logger, no console.log/console.error in production code |
| AC-13 | PASS — pnpm install auto-discovers via packages/backend/sidecars/* glob |

BACKEND COMPLETE

## Worker Token Summary
- Input: ~35,000 tokens (files read — canonical references, story, schema)
- Output: ~25,000 tokens (files written — 17 source files + log)
