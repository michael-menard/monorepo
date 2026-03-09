---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: WINT-3010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates much of Phase 2 sidecar work; port allocations (3090–3093) not listed in baseline — discovered via codebase scan

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Role Pack Sidecar (WINT-2010) | `packages/backend/sidecars/role-pack/` | Canonical sidecar pattern: Node.js `http.createServer`, PORT env, Zod validation, `@repo/sidecar-http-utils` |
| Context Pack Sidecar (WINT-2020) | `packages/backend/sidecars/context-pack/` | Direct dependency (status: **failed-qa** — blocking); POST endpoint pattern, cache-first strategy, `@repo/db` integration |
| Cohesion Sidecar (WINT-4010) | `packages/backend/sidecars/cohesion/` | Most mature example: dual POST endpoints, discriminated union responses, MCP wrappers calling compute functions directly |
| Rules Registry Sidecar (WINT-4020) | `packages/backend/sidecars/rules-registry/` | PORT 3093 allocated; conflict detection pattern |
| Shared HTTP Utils | `packages/backend/sidecars/http-utils/` | `@repo/sidecar-http-utils` — `sendJson`, `readBody`, `MAX_BODY_SIZE_BYTES` — MUST be imported, not reimplemented |
| MCP Tools | `packages/backend/mcp-tools/src/` | Direct-call wrapper pattern (not HTTP); `context-pack-get.ts` as reference for MCP wrapper |
| Pipeline Phase Gates (APIP-6001) | `plans/` (KB) | `validate_phase_gate()` concept; artifact-based gate enforcement; EVIDENCE.yaml, REVIEW.yaml, VERIFICATION.yaml |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| WINT-2020 (Context Pack Sidecar) | **failed-qa** | WINT-3010 depends on WINT-2020 being complete — this is a **blocking dependency** |
| WINT-2110 (Update 5 High-Volume Agents to Use Cache) | ready-for-qa | Agents that will be calling gate/check once gatekeeper exists |
| WINT-2030 (Populate Project Context Cache) | needs-code-review | No direct overlap |

### Constraints to Respect

- `packages/backend/database-schema/` is a protected area — no schema changes without explicit story scope
- `@repo/db` client package API surface is protected
- Orchestrator artifact schemas are protected
- Sidecar HTTP utilities MUST come from `@repo/sidecar-http-utils` (not reimplemented locally)
- Port 3094 should be used for gatekeeper (3090=role-pack, 3091=context-pack, 3092=cohesion, 3093=rules-registry)
- All sidecars use Node.js `http.createServer` — no Hono or Express
- All types via Zod schemas — no TypeScript interfaces

---

## Retrieved Context

### Related Endpoints

| Endpoint | Package | Method | Notes |
|----------|---------|--------|-------|
| `GET /role-pack` | `@repo/role-pack-sidecar` | GET | Query-param validation pattern |
| `POST /context-pack` | `@repo/context-pack-sidecar` | POST | JSON body validation, cache-first, @repo/db direct |
| `POST /cohesion/audit` | `@repo/cohesion-sidecar` | POST | Most mature; dual-endpoint pattern |
| `POST /cohesion/check` | `@repo/cohesion-sidecar` | POST | Request/response Zod schemas, discriminated union |
| (planned) `POST /gate/check` | `@repo/gatekeeper-sidecar` | POST | This story's endpoint |

### Related Components

- No UI components — this is a pure backend sidecar
- MCP tool wrappers in `packages/backend/mcp-tools/src/` (pattern: `context-pack-get.ts`)
- Pipeline gate logic (APIP-6001 KB entry) defines the gate semantics this sidecar should enforce

### Reuse Candidates

| Item | Location | Reuse Pattern |
|------|----------|---------------|
| `sendJson`, `readBody` | `@repo/sidecar-http-utils` | Import directly — mandatory pattern |
| Zod discriminated union response | `cohesion/src/__types__/index.ts` | `{ ok: true, data } \| { ok: false, error }` |
| `node:http` server bootstrap | `cohesion/src/server.ts` | Port comment block, error handling wrapper |
| MCP wrapper direct-call pattern | `mcp-tools/src/context-pack/context-pack-get.ts` | Call compute function, not HTTP |
| Package scaffold | `cohesion/package.json` | `@repo/sidecar-http-utils` dep, ESM, `start: node dist/server.js` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Sidecar server bootstrap | `packages/backend/sidecars/cohesion/src/server.ts` | Dual-endpoint routing, port comment registry, error handler wrapper, `node:http` only |
| Sidecar Zod types | `packages/backend/sidecars/cohesion/src/__types__/index.ts` | Discriminated union HTTP responses, request/response schemas, no interface keywords |
| MCP wrapper (direct call) | `packages/backend/mcp-tools/src/context-pack/context-pack-get.ts` | Calls compute function directly (not HTTP) — established pattern per OPP-04 (WINT-4010) |
| Shared HTTP utils | `packages/backend/sidecars/http-utils/src/index.ts` | `sendJson`/`readBody` — import, never reimplement |

---

## Knowledge Context

### Lessons Learned

- **[WINT-4010 OPP-04]** MCP wrappers should call compute functions directly, not HTTP endpoints (blocker: runtime dependency on server being up, harder to test)
  - *Applies because*: WINT-3010 must deliver an MCP tool wrapper (`gate_check`) for the gatekeeper — it must follow the direct-call pattern established in cohesion and context-pack

- **[WINT-4010 / WINT-2020 code review]** Sidecar HTTP utility functions must be imported from `@repo/sidecar-http-utils`, not reimplemented
  - *Applies because*: Previous developer reimplemented `sendJson`/`readBody` in http-handler.ts during WINT-2020 fix cycle; required a fix iteration

- **[WINT-4010]** Shared sidecar utility extraction is effective for code reuse; extract early during code review
  - *Applies because*: `@repo/sidecar-http-utils` now exists and covers `sendJson`/`readBody` — new sidecars must use it

- **[WINT-4010 OPP-03]** No central sidecar port registry exists; add port comment block to server.ts
  - *Applies because*: Gatekeeper needs a port (3094 is next available); MUST document it in server.ts port comment block

- **[WINT-4010 OPP-02]** Route handlers should include SEC-002 auth-deferral comment (established in context-pack.ts lines 61-65)
  - *Applies because*: Gatekeeper auth is out of scope for v1 (internal VPC-only service); comment must document the intentional omission

- **[backend sidecar E2E lesson]** Backend-only sidecars with no UI surface should skip E2E Playwright tests; use HTTP integration tests instead
  - *Applies because*: Gatekeeper is a pure backend sidecar; set `e2e_gate: skipped_no_ui_surface` in CHECKPOINT.yaml

### Blockers to Avoid (from past stories)

- Reimplementing `sendJson`/`readBody` instead of importing from `@repo/sidecar-http-utils`
- MCP wrappers making HTTP calls to `localhost:{port}` instead of calling compute functions directly
- Missing port entry in server.ts port comment block (causes port collision confusion)
- Missing SEC-002 auth-deferral comment in route handler (audit trail gap)
- Starting WINT-3010 before WINT-2020 is resolved (failed-qa = blocking dependency)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | Not applicable — sidecar is internal-only, not behind API Gateway |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT gate checks must hit real sidecar HTTP endpoint, no mocks |
| ADR-006 | E2E Tests Required in Dev Phase | Backend-only sidecar → skip E2E (no UI surface), use HTTP integration tests |

### Patterns to Follow

- Zod-first types: every request/response schema via `z.object()`, `z.enum()`, `z.discriminatedUnion('ok', [...])`
- Node.js `http.createServer` with `@repo/sidecar-http-utils` for sendJson/readBody
- Direct compute function calls in MCP wrappers (never `fetch('http://localhost:3094/...')`)
- Discriminated union HTTP responses: `{ ok: true, data: T } | { ok: false, error: string }`
- Port comment block in server.ts documenting all known sidecar ports
- SEC-002 comment in route handler documenting auth-deferral reasoning
- Graceful degradation: gate failures should log warnings, not crash the sidecar
- `@repo/logger` for all logging — no `console.log`

### Patterns to Avoid

- TypeScript `interface` keywords — always use `z.infer<typeof Schema>`
- Re-implementing `sendJson` or `readBody` inline
- MCP wrappers that depend on HTTP server being alive (causes runtime coupling)
- Barrel files (index.ts that re-exports everything)
- Any modification to `packages/backend/database-schema/` without explicit story scope

---

## Conflict Analysis

### Conflict: blocking_dependency

- **Severity**: blocking
- **Description**: WINT-3010 depends on WINT-2020 (Context Pack Sidecar). WINT-2020 is currently in **failed-qa** status (5 QA iterations, last iteration incomplete as of story file scan). The gatekeeper sidecar design references context from WINT-2020's patterns (POST body parsing, cache integration, dependency injection). More critically, the index entry explicitly states `Depends On: WINT-2020`. Work on WINT-3010 cannot begin until WINT-2020 reaches at minimum `needs-code-review` or `uat` status.
- **Resolution Hint**: Monitor WINT-2020 progress. Once WINT-2020 passes QA, re-examine whether the gatekeeper needs to integrate with or consume the context pack sidecar at runtime, or whether the dependency is structural/pattern-only. If pattern-only, the dependency may be weaker than stated and elaboration can proceed sooner.

---

## Story Seed

### Title

Create Gatekeeper Sidecar — Centralized "Proof or It Didn't Happen" Gate Enforcement

### Description

**Context**: The workflow system currently relies on agents self-reporting stage completion without a centralized validation layer. Agents advance from POST_BOOTSTRAP → ELAB_COMPLETE → SCOPE_OK → PATCH_COMPLETE based on convention and vibes, with no enforcement that required proof artifacts exist and are schema-valid before a stage transition is recorded.

**Problem**: "Vibes-based approvals" — agents can mark stages complete without providing verifiable proof (artifacts). This causes silent quality gaps that surface late in the pipeline (at QA/UAT) when they are expensive to fix. The pipeline phase gate concept exists (APIP-6001) but is pipeline-script–scoped; it is not available as a reusable service for the workflow agent network.

**Proposed Solution**: Create a new sidecar at `packages/backend/sidecars/gatekeeper/` that exposes `POST /gate/check`. The endpoint accepts a `stage` enum (POST_BOOTSTRAP, ELAB_COMPLETE, SCOPE_OK, PATCH_COMPLETE) and a `story_id`, plus a `proof` payload containing the artifacts claimed to satisfy that stage. The sidecar validates that required proof artifacts are present, structurally valid, and non-empty. It returns `{ ok: true, data: { passed: true, stage, story_id } }` or `{ ok: false, error: "...", missing_proofs: [...] }`. An MCP tool wrapper `gate_check` is delivered alongside so agent workflows can call the gate without HTTP coupling.

### Initial Acceptance Criteria

- [ ] AC-1: Sidecar package created at `packages/backend/sidecars/gatekeeper/` with `@repo/gatekeeper-sidecar` package name
- [ ] AC-2: HTTP server uses `node:http createServer`, PORT from `process.env.PORT ?? '3094'`, no Hono or Express
- [ ] AC-3: `POST /gate/check` endpoint accepts JSON body `{ stage, story_id, proof }` validated by Zod schema; returns 400 for invalid input
- [ ] AC-4: `stage` field validates against enum: `POST_BOOTSTRAP | ELAB_COMPLETE | SCOPE_OK | PATCH_COMPLETE`
- [ ] AC-5: Per-stage proof requirements are defined and enforced:
  - `POST_BOOTSTRAP`: CHECKPOINT.yaml with `phase: setup_complete`
  - `ELAB_COMPLETE`: ELAB.yaml with `verdict: PASS | CONDITIONAL_PASS` and non-empty `findings`
  - `SCOPE_OK`: SCOPE.yaml with non-empty `included_files` or `no_scope_files: true`
  - `PATCH_COMPLETE`: EVIDENCE.yaml with `touched_files > 0`
- [ ] AC-6: `{ ok: true, data: { passed: true, stage, story_id, timestamp } }` returned when all proofs present and valid
- [ ] AC-7: `{ ok: false, error: "Gate check failed", missing_proofs: [...] }` returned (HTTP 422) when required proofs are absent or invalid
- [ ] AC-8: `sendJson` and `readBody` imported from `@repo/sidecar-http-utils` — not reimplemented
- [ ] AC-9: MCP tool wrapper `gate_check` delivered in `packages/backend/mcp-tools/src/` — calls compute function directly (not HTTP)
- [ ] AC-10: All request/response types defined via Zod schemas; no TypeScript `interface` keywords
- [ ] AC-11: HTTP response uses discriminated union: `{ ok: true, data: T } | { ok: false, error: string }`
- [ ] AC-12: SEC-002 auth-deferral comment present in route handler (internal VPC-only service)
- [ ] AC-13: Port comment block in server.ts documents all known sidecar port allocations including 3094
- [ ] AC-14: Unit test coverage >= 80% across gate validation logic (all four stages, pass/fail paths)
- [ ] AC-15: `e2e_gate: skipped_no_ui_surface` documented in CHECKPOINT.yaml; HTTP integration tests validate endpoint contract instead

### Non-Goals

- Authentication/authorization on the sidecar endpoint — deferred (VPC-internal service; same deferral as context-pack and cohesion)
- Automatic story status updates from gate check results — gatekeeper is read-only/validation-only
- Retroactive backfilling of proof artifacts for past stories
- Modifying `packages/backend/database-schema/` — gatekeeper validates in-memory proof payloads, no new DB tables required for v1
- UI surface or dashboard for gate check results
- Integration with APIP pipeline scripts (that is a separate pipeline concern)
- Health/readiness endpoint — deferred (consistent with current sidecar pattern per KB OPP-03 note)

### Reuse Plan

- **Components**: `sendJson`, `readBody` from `@repo/sidecar-http-utils`; discriminated union HTTP response pattern from `@repo/cohesion-sidecar`; MCP direct-call pattern from `@repo/mcp-tools/src/context-pack/context-pack-get.ts`
- **Patterns**: Zod-first types; POST endpoint with JSON body validation; `node:http createServer`; SEC-002 auth-deferral comment; port comment block in server.ts
- **Packages**: `@repo/sidecar-http-utils`, `@repo/logger`, `zod`; optionally `@repo/database-schema` if proof schemas reference existing artifact schema types

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Backend-only sidecar with no UI — Playwright E2E tests are not applicable; set `e2e_gate: skipped_no_ui_surface`
- HTTP integration tests should cover: (1) valid proof for each of the 4 stages returns 200+passed, (2) missing proof artifact returns 422+missing_proofs array, (3) malformed JSON body returns 400, (4) wrong HTTP method returns 405, (5) unknown route returns 404
- Per-stage proof validation logic should have unit tests for each artifact type and boundary conditions (empty arrays, null fields, missing fields)
- MCP wrapper unit tests should call the compute function directly with mocked inputs — do not start the HTTP server
- ADR-005: UAT must use a real running instance of the sidecar (no mocks)

### For UI/UX Advisor

- Not applicable — this is a pure backend sidecar with no UI surface
- No user-facing acceptance criteria exist

### For Dev Feasibility

- **Gating dependency**: WINT-2020 must reach `uat` or `needs-code-review` before WINT-3010 begins — confirm this is resolved before setup phase
- **Port assignment**: Use 3094 (next in sequence after rules-registry at 3093); add to port comment block in server.ts
- **Proof schema design**: The trickiest part is AC-5 — defining what "proof" means per stage in a Zod-parseable structure. The `proof` field in the POST body should likely be a `z.record(z.string(), z.unknown())` union or a per-stage discriminated union keyed on `stage`. Consider a `ProofPayloadSchema` that is a `z.discriminatedUnion('stage', [...])` with per-stage required fields.
- **Canonical references for subtask decomposition**:
  - Server bootstrap: `packages/backend/sidecars/cohesion/src/server.ts`
  - Zod types: `packages/backend/sidecars/cohesion/src/__types__/index.ts`
  - Route handler: `packages/backend/sidecars/cohesion/src/routes/cohesion.ts` (route handler with POST body validation)
  - MCP wrapper: `packages/backend/mcp-tools/src/context-pack/context-pack-get.ts`
  - HTTP utils: `packages/backend/sidecars/http-utils/src/index.ts`
- **Risk mitigation for AC-7 (must not block legitimate completions)**: The gate validation logic must be permissive about optional artifact fields — it should only fail if a *required* proof field is absent or structurally invalid, not if a proof contains extra/unexpected fields. Zod `.passthrough()` or `.strip()` may be appropriate for proof payloads.
