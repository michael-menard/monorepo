---
generated: "2026-03-07"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-4010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 4 work; graph schema was still being seeded at baseline time. WINT-0060 and WINT-0130 are now UAT/completed per index, which supersedes baseline.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| graph schema (WINT-0060) | uat | Provides `graph.features`, `graph.capabilities`, `franken_features` view, `capability_coverage` view |
| graph MCP tools (WINT-0130) | uat | `graph_check_cohesion`, `graph_get_franken_features`, `graph_get_capability_coverage`, `graph_apply_rules` already exist |
| feature-capability linkage (WINT-0131) | uat | `featureId` FK on `capabilities` — enables full capability coverage queries |
| role-pack sidecar (WINT-2010) | ready-for-code-review | Canonical sidecar pattern: Node.js `node:http`, Zod schemas, port convention, MCP wrapper |
| context-pack sidecar (WINT-2020) | created | Second sidecar; established POST body parsing, deps injection, cache-first pattern |
| knowledge base (pgvector) | active | Separate pg instance (port 5433); used by context-pack for KB search injection |
| Drizzle ORM + Aurora PostgreSQL | active | `@repo/db`, `@repo/database-schema` — established query pattern |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-2020 (context-pack sidecar) | created | Dependency — cohesion sidecar should follow same structural pattern |
| WINT-1080 (reconcile WINT schema with LangGraph) | pending | Dependency — unified schema affects what DB tables are safe to query |
| WINT-4030 (populate graph with existing features) | pending | Data dependency — graph.features table will be empty until WINT-4030 runs |
| WINT-4040 (infer existing capabilities) | pending | Downstream of WINT-4010 — waits for this sidecar to exist |

### Constraints to Respect

- `packages/backend/sidecars/` glob is already in `pnpm-workspace.yaml` — new sidecar at `packages/backend/sidecars/cohesion/` is zero-config for workspace registration
- Do NOT modify protected schemas: `packages/backend/database-schema/` production tables
- Do NOT modify `@repo/db` client package API surface
- Do NOT modify orchestrator artifact schemas
- Sidecar must be internal-only (no public internet exposure); auth deferred per WINT-2020 precedent
- No Hono or Express — use Node.js built-in `node:http` (established by WINT-2010/WINT-2020)

---

## Retrieved Context

### Related Endpoints

| Endpoint | Location | Pattern |
|----------|----------|---------|
| GET /role-pack | packages/backend/sidecars/role-pack/ | Node.js http server, GET with query params |
| POST /context-pack | packages/backend/sidecars/context-pack/ | Node.js http server, POST with JSON body, deps injection |
| graph_check_cohesion (MCP) | packages/backend/mcp-tools/src/graph-query/ | Drizzle query, Zod validation, resilient error handling |
| graph_get_franken_features (MCP) | packages/backend/mcp-tools/src/graph-query/ | Drizzle join query, TypeScript grouping |
| graph_get_capability_coverage (MCP) | packages/backend/mcp-tools/src/graph-query/ | Drizzle query, coverage breakdown |

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| graph schema tables | packages/backend/database-schema/src/schema/ wint.ts | `features`, `capabilities`, `cohesionRules`, views `franken_features`, `capability_coverage` |
| graph MCP tool types | packages/backend/mcp-tools/src/graph-query/__types__/index.ts | `FrankenFeatureItem`, `CapabilityCoverageOutput`, `GraphCheckCohesionOutput` |
| context-pack __types__ | packages/backend/sidecars/context-pack/src/__types__/index.ts | Discriminated union response pattern, Zod schemas for HTTP |
| role-pack http-handler | packages/backend/sidecars/role-pack/src/http-handler.ts | Clean route guard, sendJson helper, Zod validation at entry |

### Reuse Candidates

- `sendJson` helper pattern (from role-pack and context-pack) — copy, do not import cross-sidecar
- `readBody` helper pattern (from context-pack routes/context-pack.ts) — copy for POST body parsing
- `GraphGetFrankenFeaturesInput/Output` Zod schemas from `mcp-tools` — import via `@repo/mcp-tools` as upstream dependency
- `CapabilityCoverageOutput` from same — reuse for response shaping
- Node.js `node:http` server pattern (server.ts) — copy from role-pack or context-pack
- `@repo/logger` for all logging (no console.log)
- `@repo/db` for Drizzle queries (no raw SQL)
- `@repo/database-schema` for table/view references

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Sidecar HTTP server | `packages/backend/sidecars/context-pack/src/server.ts` | POST-endpoint server with graceful degradation and injectable deps |
| POST route handler | `packages/backend/sidecars/context-pack/src/routes/context-pack.ts` | readBody, Zod validation, sendJson, discriminated union response |
| Zod schemas for sidecar | `packages/backend/sidecars/context-pack/src/__types__/index.ts` | Full discriminated union HTTP response, request/response schemas |
| Graph Drizzle queries | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Drizzle join, TypeScript grouping, resilient error handling, Zod at entry |

---

## Knowledge Context

### Lessons Learned

- **[pnpm workspace]** `packages/backend/sidecars/*` glob auto-covers new packages — no workspace edits needed when adding `packages/backend/sidecars/cohesion/` (*applies because*: new sidecar needs workspace registration)
- **[cohesion scanner]** Detector pattern — pure functions `(filePath: string) => PatternViolation[]` — highly testable and composable (*applies because*: cohesion check logic should be extracted as pure functions for unit testability, not embedded in route handlers)
- **[pure function separation]** Separating business logic from HTTP layer enables near-100% branch coverage without external dependencies (*applies because*: `computeAudit()` and `checkGates()` core functions should be pure/injectable for testing)
- **[node:http integration tests]** Integration tests for node:http servers work well when separated from main vitest config and run with `--config /dev/null` (*applies because*: sidecar has integration test requirements)
- **[pnpm workspace glob]** `packages/backend/*` glob (which covers `packages/backend/sidecars/*`) auto-picks up new packages — zero-config

### Blockers to Avoid (from past stories)

- Do not use Hono, Express, or any HTTP framework — use Node.js `node:http` only (established pattern)
- Do not hardcode port — use `parseInt(process.env.PORT ?? '<default>', 10)` with a unique default port not conflicting with role-pack (3090) or context-pack (3091)
- Do not import cross-sidecar — sidecars are independent packages; copy shared utilities (sendJson, readBody)
- Do not use console.log — use `@repo/logger`
- Do not use TypeScript interfaces — use Zod schemas with `z.infer<>`
- Do not embed cohesion computation logic inside route handlers — extract to pure functions for testability
- Do not assume graph data is populated — graph.features will be empty until WINT-4030; sidecar must return graceful empty responses

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | This is a sidecar, not an API Gateway endpoint — path schema is `/cohesion/audit` and `/cohesion/check` (internal sidecar paths, not `/api/v2/...`) |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story during dev phase; `frontend_impacted: false` so E2E via curl/HTTP client is appropriate |

### Patterns to Follow

- Node.js `node:http` built-in — no HTTP frameworks
- Zod-first types — all schemas via Zod, no TypeScript interfaces
- Discriminated union HTTP responses: `{ ok: true, data: ... }` / `{ ok: false, error: ... }`
- Injectable dependencies for core computation functions (enables unit testing without DB)
- Resilient error handling — log warnings, return graceful degraded response (never throw to caller)
- PORT from env with unique non-conflicting default (suggest 3092 — one past context-pack's 3091)
- MCP tool wrapper as separate export from the sidecar package (see role-pack's index.ts pattern)

### Patterns to Avoid

- Raw SQL queries (use Drizzle ORM only)
- Barrel files (import directly from source)
- Embedding computation logic inside HTTP route handlers
- Assuming populated graph data (graceful empty result handling required)
- Cross-sidecar imports (sidecars are independent packages)

---

## Conflict Analysis

### Conflict: Dependency Not Complete (WINT-2020)
- **Severity**: warning
- **Description**: WINT-2020 (context-pack sidecar) is `created` status — the story user explicitly acknowledges dependencies are not yet complete and requests seed generation anyway. WINT-4010 does not technically require WINT-2020's code at runtime (cohesion sidecar doesn't call context-pack). The dependency is likely architectural (WINT-2020 establishes sidecar patterns that WINT-4010 should follow).
- **Resolution Hint**: Proceed with seed. During implementation, treat WINT-2020 code as the pattern reference even if not merged. The canonical references above can be read directly from the codebase.

### Conflict: Schema Dependency on WINT-1080 (Pending)
- **Severity**: warning
- **Description**: WINT-1080 (reconcile WINT schema with LangGraph) is `pending`. Until complete, the unified `core.stories` schema may evolve. WINT-4010 queries graph schema tables (`graph.features`, `graph.capabilities`, `graph.franken_features` view) which are separate from `core.stories` and unlikely to be affected by WINT-1080. The dependency may be overly broad in the index.
- **Resolution Hint**: WINT-4010 should be safe to implement against current graph schema. During elaboration, confirm WINT-1080 scope does not touch `graph` schema tables. If confirmed non-overlapping, dependency can be loosened.

---

## Story Seed

### Title
Create Cohesion Sidecar

### Description

The WINT workflow needs an automated way to detect Franken-features (features with incomplete CRUD capability coverage) and capability gaps at two points in the workflow lifecycle: (1) post-bootstrap audit of the current graph state, and (2) at gate transitions where a feature's completeness is evaluated before allowing progression.

The graph schema (WINT-0060/WINT-0131) and graph MCP query tools (WINT-0130) already exist and provide the underlying data: `graph.franken_features` view, `graph.capability_coverage` view, and `graph_check_cohesion`/`graph_get_franken_features`/`graph_get_capability_coverage` MCP tools. However, agents currently have to call these MCP tools individually and interpret results. The cohesion sidecar wraps this capability into two focused HTTP endpoints that return structured, actionable cohesion analysis.

The sidecar follows the established pattern from WINT-2010 (role-pack sidecar) and WINT-2020 (context-pack sidecar): Node.js `node:http`, Zod-validated request/response, injectable dependencies, no HTTP framework, internal-only deployment. It lives at `packages/backend/sidecars/cohesion/` and exposes:

- `POST /cohesion/audit` — full graph sweep post-bootstrap; returns all Franken-features and capability gaps across the graph
- `POST /cohesion/check` — targeted check for a specific feature or set of features; intended for gate transitions

An MCP tool wrapper (`cohesion_audit` and `cohesion_check`) is exported from the package so agents can invoke the sidecar via MCP without raw HTTP calls.

### Initial Acceptance Criteria

- [ ] AC-1: Sidecar package created at `packages/backend/sidecars/cohesion/` with `package.json`, `tsconfig.json`, `vitest.config.ts` matching role-pack/context-pack structure
- [ ] AC-2: HTTP server uses Node.js `node:http` built-in; no Hono, Express, or other HTTP frameworks; PORT from `process.env.PORT` defaulting to `3092`
- [ ] AC-3: `POST /cohesion/audit` endpoint accepts optional `{ packageName?: string }` body, returns `{ ok: true, data: CohesionAuditResult }` with all Franken-features and capability gap summary across the graph
- [ ] AC-4: `POST /cohesion/check` endpoint accepts `{ featureId: string }` body, returns `{ ok: true, data: CohesionCheckResult }` with cohesion status (`complete | incomplete | unknown`), violations array, and capability coverage breakdown
- [ ] AC-5: Both endpoints return `{ ok: false, error: string }` on invalid input (Zod validation) or internal error; never throw uncaught exceptions
- [ ] AC-6: Core computation functions (`computeAudit`, `computeCheck`) are pure/injectable — accept DB dependency injection; not embedded in route handlers
- [ ] AC-7: All Zod schemas defined in `src/__types__/index.ts`; no TypeScript interfaces used
- [ ] AC-8: Empty graph (no features populated) returns graceful empty result, not an error — `{ frankenFeatures: [], coverageSummary: { totalFeatures: 0, completeCount: 0, incompleteCount: 0 } }`
- [ ] AC-9: MCP tool wrappers `cohesion_audit` and `cohesion_check` exported from `src/index.ts`; call the sidecar HTTP endpoint (or computation function directly) and return typed results
- [ ] AC-10: Unit tests achieve minimum 80% branch coverage; core computation functions tested with mocked DB dependencies
- [ ] AC-11: Integration test verifying the HTTP server starts, accepts POST requests to both endpoints, and returns valid JSON responses (run separately per node:http integration test pattern)
- [ ] AC-12: All logging via `@repo/logger`; no `console.log`/`console.error` usage
- [ ] AC-13: Package added to `pnpm-workspace.yaml` verification — confirm glob `packages/backend/sidecars/*` covers the new package (no manual edit needed per lesson learned)

### Non-Goals

- Authentication/authorization on sidecar endpoints (deferred per WINT-2020 precedent — internal-only VPC deployment)
- Populating the graph with features (that is WINT-4030's scope)
- Inferring capabilities from existing stories (that is WINT-4040's scope)
- Defining cohesion rules (that is WINT-4050's scope)
- Caching cohesion results (deferred; context-pack sidecar handles caching; cohesion results are computed fresh)
- Frontend UI for cohesion results (out of scope entirely for this epic phase)
- Modifying or extending the graph schema or MCP tools in `packages/backend/mcp-tools/src/graph-query/`

### Reuse Plan

- **Packages**: `@repo/db` (Drizzle client), `@repo/database-schema` (graph tables/views), `@repo/logger`, `@repo/mcp-tools` (for `GraphCheckCohesionOutput`, `FrankenFeatureItem`, `CapabilityCoverageOutput` types if exported)
- **Patterns**: Copy `sendJson` helper and `readBody` helper from context-pack (not imported — sidecars are independent); copy server.ts skeleton from role-pack; follow `__types__/index.ts` discriminated union pattern from context-pack
- **Components**: Graph query logic can delegate to the same Drizzle queries used by `graph_get_franken_features` and `graph_get_capability_coverage` MCP tools — these patterns are exemplary (see canonical references)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Two endpoints require distinct test scenarios: `POST /cohesion/audit` (full graph sweep, empty graph case, filtered by packageName) and `POST /cohesion/check` (complete feature, incomplete feature, unknown feature ID)
- Core computation functions (`computeAudit`, `computeCheck`) should be unit tested with injected mock DB returning controlled Drizzle-shaped results — no real DB needed for unit tests
- Integration tests for the HTTP server should follow the `--config /dev/null` pattern (APIP-2030 lesson) to isolate from main vitest config
- Empty graph is a critical edge case: `graph.features` will be empty until WINT-4030; AC-8 mandates graceful handling
- MCP tool wrapper tests should mock the HTTP endpoint (or computation function) and verify typed output conformance

### For UI/UX Advisor

- This story is backend-only (`frontend_impacted: false`); no UI components are required
- API surface design is the "UX" concern: response shape should be actionable and machine-readable for downstream agents (graph-checker agent WINT-4060, cohesion-prosecutor agent WINT-4070)
- Consider whether `CohesionAuditResult` should include a `summary` field with aggregate counts for quick signal, plus a `frankenFeatures` array for detail — easier for consuming agents to gate on summary first

### For Dev Feasibility

- Start with `packages/backend/sidecars/cohesion/` package setup matching role-pack and context-pack structure exactly (`package.json`, `tsconfig.json`, `vitest.config.ts`, `src/__types__/index.ts`, `src/server.ts`, `src/index.ts`)
- Port assignment: 3092 (role-pack=3090, context-pack=3091, cohesion=3092); document in server.ts comment
- The graph schema views (`franken_features`, `capability_coverage`) created by WINT-0060/WINT-0131 are the primary data source; verify they are accessible via `@repo/database-schema` before implementation begins
- WINT-4030 (populate graph with features) will not be complete when this story is implemented — the sidecar must return useful empty responses; do not block on WINT-4030
- Check whether `FrankenFeatureItem`, `CapabilityCoverageOutput`, and related types from `packages/backend/mcp-tools/src/graph-query/__types__/index.ts` are exported from `@repo/mcp-tools` package index; if not, define parallel Zod schemas in `__types__/index.ts` rather than copying types across package boundaries
- Canonical implementation reference order: (1) `__types__/index.ts` schemas, (2) `compute-audit.ts` and `compute-check.ts` pure functions, (3) route handlers wrapping compute functions, (4) `server.ts`, (5) `index.ts` MCP wrappers, (6) unit tests, (7) integration test
