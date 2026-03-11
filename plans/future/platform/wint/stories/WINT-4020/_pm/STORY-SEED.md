---
generated: "2026-03-07"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-4020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-2020 (context-pack sidecar) and WINT-4010 (cohesion sidecar) completion. Both are now in failed-qa and needs-code-review respectively — see Active In-Progress Work below.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Role Pack Sidecar (WINT-2010) | `packages/backend/sidecars/role-pack/` | Direct structural template: same Node.js http module pattern, same MCP tool wrapper pattern |
| Context Pack Sidecar (WINT-2020) | `packages/backend/sidecars/context-pack/` | Direct structural template: same package layout, TypeScript/Zod schemas, MCP tool wrapper (context-pack-get.ts) |
| Cohesion Sidecar (WINT-4010) | `packages/backend/sidecars/cohesion/` (in-progress) | Peer Phase 4 sidecar: GET+POST routes, port 3092, same MCP wrapper direct-call pattern |
| MCP Tools Package | `packages/backend/mcp-tools/src/` | Where the MCP tool wrapper for rules_registry_get / rules_registry_post will live |
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Rules derived from retro learnings likely originate here |
| Orchestrator Artifact Schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-validated artifact schemas; rules enforcement may reference these patterns |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-2020 (Context Pack Sidecar) | failed-qa | WINT-4020 depends on WINT-2020. Must reach UAT before WINT-4020 starts. |
| WINT-4010 (Cohesion Sidecar) | needs-code-review | Peer Phase 4 sidecar; port 3092 allocated. Rules registry must pick next port (3093 recommended). Direct architectural peer. |
| WINT-4050 (Cohesion Rules) | pending | Explicitly depends on WINT-4020. Will define rules stored in the registry. Must not start before WINT-4020. |
| WINT-2010 (Role Pack Sidecar) | needs-code-review (WINT-9106) | UAT code review in progress; provides canonical sidecar structure reference |

### Constraints to Respect

- `packages/backend/sidecars/*` glob already in `pnpm-workspace.yaml` — no workspace edits needed for new sidecar package
- All production DB schemas in `packages/backend/database-schema/` are protected — do not modify existing tables without migration
- `@repo/db` client API surface is protected
- Orchestrator artifact schemas are protected — if rules metadata needs persistence, add new schemas via migration, don't modify existing ones
- No barrel files — import directly from source files
- Zod-first types required — no TypeScript interfaces

---

## Retrieved Context

### Related Endpoints

| Endpoint | Package | Pattern |
|----------|---------|---------|
| `GET /role-pack?role=<role>&v=<version>` | `@repo/sidecar-role-pack` (port 3090) | Read-only, query param, no DB |
| `POST /context-pack` | `@repo/context-pack-sidecar` (port 3091) | Write-through cache, DB-backed (context_cache) |
| `POST /cohesion/audit`, `POST /cohesion/check` | cohesion sidecar (port 3092, WINT-4010) | POST-only, graph DB queries |
| `GET/POST /rules` | **This story** (port 3093 recommended) | Dual-method: GET for retrieval, POST for propose/promote |

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `readRolePack` | `packages/backend/sidecars/role-pack/src/role-pack-reader.ts` | Pattern for file-based data reading |
| `assembleContextPack` | `packages/backend/sidecars/context-pack/src/assemble-context-pack.ts` | Pattern for DB-backed assembly with injection |
| `contextPackGet` MCP wrapper | `packages/backend/mcp-tools/src/context-pack/context-pack-get.ts` | Direct-call pattern (ARCH-001 — no HTTP intermediary) |
| `RolePackGetInputSchema` | `packages/backend/sidecars/role-pack/src/__types__/index.ts` | Pattern for Zod input/output schemas |
| `ContextPackHttpResponseSchema` | `packages/backend/sidecars/context-pack/src/__types__/index.ts` | Pattern for discriminated union HTTP response schemas |

### Reuse Candidates

- `@repo/sidecar-role-pack` `package.json` as structural template (scripts, dependencies, exports)
- `packages/backend/sidecars/role-pack/src/server.ts` as HTTP server template (Node.js built-in http, error handling)
- `packages/backend/sidecars/role-pack/src/http-handler.ts` as routing/validation template (sendJson, URL parsing, route guard)
- `packages/backend/mcp-tools/src/context-pack/context-pack-get.ts` as MCP wrapper template (direct-call, no-op fallback, logger)
- Zod discriminated union `{ ok: true, ... } | { ok: false, error: string }` response pattern from both existing sidecars
- `@repo/logger` for all logging (never console.log)

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| HTTP sidecar server | `packages/backend/sidecars/role-pack/src/server.ts` | Node.js built-in http, no framework, error handling, PORT env var pattern |
| HTTP handler with Zod validation | `packages/backend/sidecars/role-pack/src/http-handler.ts` | Route guard, query param validation, sendJson helper, 400/404/200 response codes |
| Zod schemas for sidecar | `packages/backend/sidecars/role-pack/src/__types__/index.ts` | Input/output/HTTP response Zod schema structure with discriminated union |
| MCP tool wrapper (direct-call) | `packages/backend/mcp-tools/src/context-pack/context-pack-get.ts` | Direct import from sidecar package (ARCH-001), no HTTP call, no-op fallback pattern |

---

## Knowledge Context

### Lessons Learned

- **[WINT-4010 elaboration finding OPP-03]** Central sidecar port registry needed. Known allocations: role-pack=3090, context-pack=3091, cohesion=3092. Rules registry should use 3093 and document in server.ts comment block. (*Applies because*: WINT-4020 is next Phase 4 sidecar; must not conflict with 3092)

- **[WINT-4010 elaboration finding OPP-04]** MCP wrappers should call compute functions directly, not HTTP. The direct-call pattern (same as context-pack-get.ts) is preferred over making HTTP fetches to localhost. (*Applies because*: WINT-4020 requires an MCP tool wrapper — it must follow the direct-call pattern)

- **[WINT-4010 elaboration finding OPP-01]** Import types from `@repo/mcp-tools` rather than redeclaring parallel Zod schemas in sidecar `__types__/`. (*Applies because*: If the rules registry builds on cohesion types or graph query types, import them rather than duplicating)

- **[pnpm-workspace lesson]** `packages/backend/sidecars/*` glob auto-covers new sidecar packages without workspace edits. Just create the directory and run pnpm install. (*Applies because*: WINT-4020 creates a new `packages/backend/sidecars/rules-registry/` package)

### Blockers to Avoid (from past stories)

- Starting implementation before WINT-2020 reaches UAT (the dependency is currently failed-qa — do not skip it)
- Creating TypeScript interfaces instead of Zod schemas (use `z.infer<typeof Schema>`)
- Creating barrel files (import directly from source)
- Calling the MCP tool via HTTP to the sidecar server (use direct-call pattern per ARCH-001/OPP-04)
- Conflicting with port 3092 already assigned to cohesion sidecar

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Integration tests require live postgres-knowledgebase (port 5433) |
| ADR-001 | API Endpoint Path Schema | Sidecar endpoints are internal (not exposed via API Gateway) — not subject to `/api/v2/` schema, but should be documented |

### Patterns to Follow

- Node.js built-in `http` module for sidecar server (no Hono, no Express)
- Zod discriminated union for HTTP responses: `{ ok: true, data: ... } | { ok: false, error: string }`
- MCP tool wrapper imports compute function directly from sidecar package (ARCH-001)
- `@repo/logger` for all logging
- `sendJson` helper pattern for consistent response writing
- Route guard pattern: check `url.pathname` first, return 404 for unmatched routes
- Port documented in server.ts comment with full port table reference

### Patterns to Avoid

- HTTP calls from MCP wrapper to sidecar server at localhost (use direct-call)
- Declaring parallel Zod schemas that duplicate types already exported from other packages
- Storing port in hardcoded constant without environment variable override (`process.env.PORT ?? '3093'`)
- Modifying protected `packages/backend/database-schema/` without a migration

---

## Conflict Analysis

### Conflict: Dependency not yet complete
- **Severity**: warning (non-blocking for story seeding, blocking for story start)
- **Description**: WINT-4020 depends on WINT-2020 (context-pack sidecar), which is currently in `failed-qa`. The story cannot begin implementation until WINT-2020 reaches UAT status.
- **Resolution Hint**: Monitor WINT-2020 progress. WINT-4020 can be fully seeded and elaborated now. Mark ready-to-work only after WINT-2020 clears QA.

---

## Story Seed

### Title
Create Rules Registry Sidecar (WINT-4020)

### Description

**Context**: The WINT platform has established a sidecar architecture for lightweight services supporting agent workflows. Two sidecars are complete (role-pack at port 3090, context-pack at port 3091) and a third (cohesion at port 3092) is in code review. All Phase 4 sidecars follow the same structural pattern: Node.js http module, Zod-validated schemas, MCP tool wrapper using direct-call pattern, housed in `packages/backend/sidecars/`.

Separately, the knowledge base accumulates retrospective learnings — lessons, blockers, patterns — via `kb_add_lesson`. These are currently queryable but not *enforceable*. There is no mechanism to convert a KB lesson into a gate check, linting rule, or prompt injection that automatically prevents agents from repeating the same mistake.

**Problem**: Retrospective learnings are captured but not actionable. An agent can make the same mistake that was documented as a lesson because there is no enforcement layer. Rules need a lifecycle: proposed (from retro), reviewed, promoted to active, and optionally applied as gate checks, lint rules, or prompt injections.

**Proposed Solution**: Create a rules registry sidecar at `packages/backend/sidecars/rules-registry/` that:
1. Provides `GET /rules` for querying active rules (filter by type/scope/severity)
2. Provides `POST /rules` for proposing new rules and promoting proposed rules to active
3. Stores rules in the knowledge-base database (proposed new table or reusing existing KB infrastructure)
4. Exposes an MCP tool wrapper (`rules_registry_get`, `rules_registry_propose`) for agent use
5. Serves as the data source for WINT-4050 (Cohesion Rules) and later gate/lint enforcement phases

### Initial Acceptance Criteria

- [ ] AC-1: Package `@repo/sidecar-rules-registry` created at `packages/backend/sidecars/rules-registry/` with `package.json`, `tsconfig.json`, `vitest.config.ts`
- [ ] AC-2: `GET /rules` endpoint returns active rules, supports query params: `?type=gate|lint|prompt_injection&scope=<story_id>|global&status=proposed|active|deprecated`
- [ ] AC-3: `POST /rules` endpoint accepts rule proposal payload (rule text, type, scope, severity, source_story_id) and stores it with status=proposed
- [ ] AC-4: `POST /rules/:id/promote` endpoint promotes a rule from proposed to active (requires source reference: story_id or lesson_id)
- [ ] AC-5: All endpoint schemas defined as Zod schemas in `src/__types__/index.ts` — no TypeScript interfaces
- [ ] AC-6: HTTP responses use discriminated union pattern: `{ ok: true, data: ... } | { ok: false, error: string }`
- [ ] AC-7: MCP tool wrapper `rules_registry_get` added to `packages/backend/mcp-tools/src/rules-registry/` using direct-call pattern (no HTTP intermediary)
- [ ] AC-8: MCP tool wrapper `rules_registry_propose` added to `packages/backend/mcp-tools/src/rules-registry/` using direct-call pattern
- [ ] AC-9: Sidecar server uses Node.js built-in `http` module, PORT default 3093 with `process.env.PORT` override, documented in server.ts with full port table comment
- [ ] AC-10: Rule conflict detection: `POST /rules` returns `409 Conflict` with existing conflicting rule IDs when a duplicate or contradictory rule is proposed
- [ ] AC-11: Unit tests achieve minimum 45% coverage (project minimum); target 80%+ for core compute functions
- [ ] AC-12: Integration tests validate `GET /rules` and `POST /rules` against live database (postgres-knowledgebase port 5433)

### Non-Goals

- Do NOT implement rule enforcement (gate execution, lint rule application, prompt injection) in this story — enforcement is deferred to later stories (Phase 5+)
- Do NOT modify `packages/backend/database-schema/` protected tables without a migration story
- Do NOT build a UI for rule management
- Do NOT implement rule versioning beyond proposed/active/deprecated status states
- Do NOT implement automatic rule derivation from KB lessons — that is a future story; this story only provides the storage and CRUD layer

### Reuse Plan
- **Components**: `server.ts` pattern from role-pack, `http-handler.ts` pattern from role-pack, `context-pack-get.ts` MCP wrapper pattern
- **Patterns**: Zod discriminated union responses, direct-call MCP wrapper (ARCH-001), sendJson helper, Route guard via pathname check, PORT env var pattern
- **Packages**: `@repo/logger`, `zod`, `@repo/db` (if rules persist to postgres-knowledgebase), potentially `@repo/mcp-tools` types if rule types intersect with graph query types

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Test plan must include: unit tests for core compute functions with Zod parse validation, integration tests against live postgres-knowledgebase (port 5433), and conflict detection tests (duplicate rule proposal returns 409)
- Per ADR-005: UAT must use real services — no mocking of the database layer in integration tests
- Conflict resolution strategy needs happy-path and conflict-detected test cases
- GET /rules filtering tests: by type, scope, and status params
- POST /rules validation tests: required fields missing, invalid type/scope values, duplicate detection
- The `promote` endpoint needs a test verifying that promotion fails if source_story_id or lesson_id is absent
- Consider performance test: GET /rules with 100+ active rules should complete within reasonable latency budget

### For UI/UX Advisor

- No frontend component in this story — this is a backend sidecar only
- Future UI (not in scope) would be a rules dashboard for reviewing proposed rules and promoting/deprecating them
- The MCP tool interface (rules_registry_get, rules_registry_propose) IS the "UX" — tool parameter names should be self-documenting and consistent with context_pack_get naming conventions

### For Dev Feasibility

- **Primary question**: Where do rules persist? Options: (a) new `rules` table in postgres-knowledgebase via Drizzle migration, (b) reuse existing `knowledgeEntries` table with entry_type='constraint' + tags, (c) a JSON file (not recommended — defeats the purpose). Option (a) is cleanest and provides queryable structure. Option (b) avoids a migration but compromises query clarity. Recommend option (a) with a lightweight migration.
- **Schema design suggestion**: `rules` table with fields: `id (uuid)`, `rule_text (text)`, `rule_type (enum: gate|lint|prompt_injection)`, `scope (text: global|<story_id>|<feature_id>)`, `severity (enum: error|warning|info)`, `status (enum: proposed|active|deprecated)`, `source_story_id (text nullable)`, `source_lesson_id (text nullable)`, `created_at`, `updated_at`
- **Port 3093**: Confirm no conflicts by checking existing sidecar server.ts files before implementation starts
- **Conflict detection algorithm**: Simple approach — reject if a rule with identical `rule_text` (case-insensitive, trimmed) already exists with status != deprecated. More complex: semantic similarity via pgvector (deferred to future story)
- **Direct-call pattern for MCP wrapper**: The compute functions (`getRules`, `proposeRule`) must be exported from the sidecar package so `@repo/mcp-tools` can import them directly (per ARCH-001/OPP-04 pattern from WINT-4010)
- **Canonical references for subtask decomposition**:
  - ST-1 (Package scaffold): `packages/backend/sidecars/role-pack/package.json` → copy and adapt
  - ST-2 (Zod schemas): `packages/backend/sidecars/role-pack/src/__types__/index.ts` → pattern for input/output/HTTP response schemas
  - ST-3 (Core compute functions): `packages/backend/sidecars/context-pack/src/assemble-context-pack.ts` → pattern for DB-backed compute with dependency injection
  - ST-4 (HTTP handler): `packages/backend/sidecars/role-pack/src/http-handler.ts` → route guard, sendJson, Zod parse, 400/404/200 pattern; extend for POST + promote route
  - ST-5 (HTTP server): `packages/backend/sidecars/role-pack/src/server.ts` → direct copy-adapt
  - ST-6 (MCP wrappers): `packages/backend/mcp-tools/src/context-pack/context-pack-get.ts` → direct-call pattern template
  - ST-7 (Tests): Follow 45% minimum / target 80% for compute; integration tests require live postgres-knowledgebase
