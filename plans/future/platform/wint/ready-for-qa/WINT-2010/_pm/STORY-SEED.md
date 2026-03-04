---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-2010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB unavailable — lessons loaded flag set to false; ADR-LOG read directly from filesystem

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WINT-1120: Validate Foundation Phase | completed | Direct dependency — foundation phase validation confirms DB story CRUD, shim fallback, and worktree integration are solid before Phase 2 |
| WINT-0210: Populate Role Pack Templates | ready-to-work | Produces the `.claude/prompts/role-packs/` source files (dev.md, po.md, da.md, qa.md) that this sidecar will serve |
| `packages/backend/mcp-tools/` | active | Pattern reference for MCP tool wrappers — worktree, context-cache, story-management, graph-query all follow the same structure this story should follow |
| `packages/backend/sidecars/` | does not exist | Target package directory does not exist; must be created from scratch |
| context_cache MCP tools (WINT-0100) | completed (uat) | Demonstrates `contextCacheGet` / `contextCachePut` pattern that the sidecar MCP wrapper should mirror |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-0210 | ready-to-work | Content dependency — WINT-2010 serves role packs authored by WINT-0210; implementation can start but content validation tests should wait for WINT-0210 to land the actual files |
| WINT-2020 | backlog (pending) | Sequential dependency — WINT-2020 (Context Pack Sidecar) depends on WINT-2010 completing; no overlap risk but delivery order matters |

### Constraints to Respect

1. **Token Budget Hard Limit** — Role pack content returned by each endpoint response must be 150–300 tokens (inherits from WINT-0210)
2. **Versioning Required** — Must support `?v=X` query param; callers depend on stable versions to cache safely
3. **No New Database Tables** — Sidecar serves static/filesystem role pack files; adding a new DB table is out of scope unless a strong reason surfaces during feasibility
4. **Package Location** — Infrastructure must live at `packages/backend/sidecars/role-pack/` per index entry
5. **Code Conventions** — Zod-first types (no TypeScript interfaces), `@repo/logger` for logging, no barrel files (CLAUDE.md)
6. **MCP Tool Wrapper Required** — HTTP endpoint alone is not sufficient; an MCP tool wrapper must also be delivered so agents can call the sidecar without HTTP client setup

---

## Retrieved Context

### Related Endpoints

No existing sidecar or role-pack endpoint found. The `apps/api/` project contains infrastructure-as-code and Lambda handler stubs but no equivalent sidecar pattern to reuse directly.

The closest analog is the knowledge-base MCP server at `apps/api/knowledge-base/src/mcp-server/` which exposes domain operations over MCP — this provides a structural reference for how an MCP server wraps business logic.

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| MCP tools package | `packages/backend/mcp-tools/src/` | Pattern reference: Zod schemas in `__types__/index.ts`, resilient error handling, `@repo/db` + `@repo/logger` imports |
| Context cache get tool | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Closest structural analog: typed input schema, Zod parse at entry, graceful null return on miss |
| Story management tool | `packages/backend/mcp-tools/src/story-management/story-get-status.ts` | Dual-ID pattern and resilient error handling |
| Worktree register tool | `packages/backend/mcp-tools/src/worktree-management/worktree-register.ts` | FK resolution + null-return pattern |
| Expert personas doc | `.claude/agents/_shared/expert-personas.md` | Source material that role packs condense (reference only) |

### Reuse Candidates

| Pattern | Source | Application |
|---------|--------|-------------|
| Zod input schema in `__types__/index.ts` | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | Define `RolePackGetInputSchema` with `role` enum and optional `v` number |
| Resilient null-return error handling | `context-cache-get.ts` | Sidecar get function should return `null` (or error payload) on missing role pack, never throw |
| Package structure (`src/`, `__tests__/`, `__types__/`) | Any `packages/backend/mcp-tools/src/` module | Apply same structure to `packages/backend/sidecars/role-pack/src/` |
| `@repo/logger` usage | All mcp-tools files | All logging must go through `logger.warn` / `logger.info` from `@repo/logger` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool with Zod validation + resilient error handling | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Exact structure to replicate: Zod parse at entry, try/catch with `logger.warn`, typed return or null |
| Zod schemas in `__types__` | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | Shows enum-constrained input schema, inferred types, clean separation of schemas from tool logic |
| Package index.ts export pattern | `packages/backend/mcp-tools/src/index.ts` | Demonstrates how to export tools + schemas from a backend package without barrel anti-patterns |
| MCP server wrapping business logic | `apps/api/knowledge-base/src/mcp-server/` | Structural reference for how MCP server tools call into domain logic — applicable when building the MCP tool wrapper |

---

## Knowledge Context

### Lessons Learned

KB unavailable — no lesson records retrieved. The following are inferred from the WINT-0210 story seed and codebase patterns:

- **[WINT-0210]** Token bloat is the primary risk for role pack content — expert-personas.md exceeds 600 lines for 2 personas; role packs must be kept to 150–300 tokens per role (category: blocker)
  - *Applies because*: WINT-2010 serves this content; if role packs are oversized the sidecar endpoint response exceeds the budget the spec promises
- **[WINT-0100]** MCP tool wrappers must validate input with Zod at entry and return `null` on miss, never throw (category: pattern)
  - *Applies because*: The MCP wrapper in WINT-2010 must follow the same resilient null-return contract already established across all WINT-0xxx MCP tools
- **[pattern]** Missing hard constraints leads to scope creep (learned from WINT-0200 PO constraints) (category: pattern)
  - *Applies because*: Versioning strategy and role enum values must be hard-coded in Zod — open-ended strings will cause drift between sidecar and consumers

### Blockers to Avoid (from past stories)

- Content not available at sidecar boot time — role pack files may not exist yet if WINT-0210 has not landed; the sidecar must handle missing file gracefully (log warning + return 404/null, do not crash)
- Version mismatch between caller expectation and available versions — version negotiation strategy must be decided upfront (latest-available fallback vs strict version match)
- API path mismatch between MCP tool wrapper and HTTP endpoint — align on the canonical endpoint path before implementation (ADR-001 does not directly cover internal sidecars, but the pattern applies)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | Sidecar HTTP endpoint is internal (agent-to-sidecar), not frontend-facing; ADR-001 path schema (`/api/v2/...`) applies only to frontend-facing routes. Internal sidecar endpoint can use a simpler path (`/role-pack`). |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT must use real sidecar, real filesystem files, no mocking of the HTTP layer |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test (HTTP GET to live sidecar) must be delivered in dev phase; `frontend_impacted: false` does apply here, so E2E can be marked `not_applicable` — however a live integration test against the real HTTP server is strongly recommended |

### Patterns to Follow

1. Zod input schema with strict `role` enum (`pm`, `dev`, `qa`, `po`) at the entry point — no free-form strings
2. Resilient error handling: return `null` / HTTP 404 on missing role pack, log warning via `@repo/logger`, never 500
3. Separate `__types__/index.ts` for all Zod schemas and inferred types
4. MCP tool function naming convention: `rolePackGet` (camelCase, domain prefix)
5. Package structure mirrors `packages/backend/mcp-tools/src/` modules

### Patterns to Avoid

1. Serving raw filesystem paths in the response — callers should receive content only, not file paths
2. Hard-coding role pack content in source code — content must be read from `.claude/prompts/role-packs/` files (authoritative source from WINT-0210)
3. Dynamic role discovery (scanning filesystem for all `.md` files) — role enum must be an explicit allowlist
4. TypeScript interfaces — use `z.infer<typeof Schema>` exclusively (CLAUDE.md requirement)
5. Console logging — always `@repo/logger`

---

## Conflict Analysis

### Conflict: Content Dependency (warning)
- **Severity**: warning
- **Description**: WINT-2010 serves role pack files authored by WINT-0210. As of 2026-03-02, WINT-0210 is `ready-to-work` but not yet completed. The sidecar can be built and tested with stub/placeholder role pack files, but production-quality content validation depends on WINT-0210 landing first.
- **Resolution Hint**: Implement the sidecar with stub role pack files in `__fixtures__/` for testing; document that switching to WINT-0210 output is a merge-time step. Do not block sidecar implementation on WINT-0210 completion.

---

## Story Seed

### Title

Create Role Pack Sidecar Service

### Description

**Context:**
The autonomous development workflow spawns multiple specialized agents (pm, dev, qa, po) for each story. Currently, each spawn begins by re-reading long agent instruction files, wasting tokens re-teaching agents their role. WINT-0210 is creating compact 150–300 token role packs in `.claude/prompts/role-packs/`. WINT-2010 exposes those packs as a versioned HTTP sidecar service with an MCP tool wrapper so agents can retrieve their role instructions with a single tool call.

**Problem:**
- No standardized retrieval mechanism for role pack content
- Agents re-read full agent `.md` files (hundreds of tokens) every spawn
- No versioning — role pack content cannot evolve without breaking consuming agents
- No single source of truth accessible to both HTTP clients and MCP-native agents

**Proposed Solution:**

Create a new package at `packages/backend/sidecars/role-pack/` that:

1. **HTTP endpoint**: `GET /role-pack?role=pm|dev|qa|po&v=X`
   - Returns role pack content (150–300 tokens) as JSON or plain text
   - `role` is a strict enum; unknown roles → 404
   - `v` is optional; if omitted, returns latest version; if specified and not found → 404
   - Runs as a local sidecar (not deployed to AWS Lambda — internal tool service)

2. **MCP tool wrapper**: `role_pack_get(role, version?)`
   - Zod-validated input (`role` enum, optional `version` integer)
   - Returns role pack content string or null on miss
   - Follows resilient null-return contract from existing MCP tools
   - Registered in MCP server so agents can call without HTTP client setup

3. **File reader**: Reads from `.claude/prompts/role-packs/{role}.md`
   - Handles missing file gracefully (log warning, return null/404)
   - Caches file content in memory for process lifetime (no hot-reload required for v1)

### Initial Acceptance Criteria

- [ ] AC-1: Package scaffold created
  - `packages/backend/sidecars/role-pack/` directory created
  - `package.json` with package name `@repo/sidecar-role-pack`
  - `tsconfig.json` extending monorepo base
  - `vitest.config.ts` for unit tests
  - `src/__types__/index.ts` with Zod schemas for all I/O types

- [ ] AC-2: Role Pack Zod schema defined
  - `RoleSchema = z.enum(['pm', 'dev', 'qa', 'po'])` — strict allowlist
  - `RolePackGetInputSchema = z.object({ role: RoleSchema, version: z.number().int().positive().optional() })`
  - `RolePackGetOutputSchema` — content string or null
  - All types inferred with `z.infer<>`, no TypeScript interfaces

- [ ] AC-3: File reader implemented
  - Reads `.claude/prompts/role-packs/{role}.md` (path configurable via env var or constructor arg)
  - Returns file content as string on success
  - Returns `null` with `logger.warn` on file not found or read error
  - In-memory cache per role (invalidated on process restart)

- [ ] AC-4: HTTP endpoint implemented
  - `GET /role-pack?role=pm|dev|qa|po&v=X` → `200 { content: "..." }` on success
  - Unknown `role` → `404 { error: "Unknown role" }`
  - Version specified but unavailable → `404 { error: "Version not found" }`
  - Missing `role` query param → `400 { error: "role is required" }`
  - Content-Type: `application/json`

- [ ] AC-5: MCP tool wrapper implemented
  - Function `rolePackGet(input: RolePackGetInput): Promise<string | null>`
  - Zod parse at entry — throws `ZodError` on invalid input (callers see validation error immediately)
  - Calls file reader internally; returns content string or null
  - `logger.warn` on null return with role and version details
  - Unit tested: happy path, missing role, missing file

- [ ] AC-6: Unit tests pass
  - `src/__tests__/role-pack-reader.test.ts` — file reader: happy path, not found, read error
  - `src/__tests__/role-pack-get.test.ts` — MCP tool: happy path, unknown role, missing file, version param
  - `src/__tests__/http-endpoint.test.ts` — HTTP handler: 200, 400, 404 cases
  - Coverage: ≥ 80% line coverage for all new files
  - All tests pass via `pnpm test` in the package

- [ ] AC-7: Versioning strategy implemented
  - Version is encoded in role pack file frontmatter (`version: N`)
  - File reader parses frontmatter to extract version
  - `GET /role-pack?role=dev&v=2` returns content only if `version: 2` matches file frontmatter
  - If `v` omitted, latest available version is returned (for v1 with single file per role: always the file)
  - Version mismatch → 404 with `{ error: "Version not found", available: N }`

- [ ] AC-8: Integration with role pack files
  - Reads from `.claude/prompts/role-packs/dev.md`, `pm.md`, `qa.md`, `po.md`
  - If WINT-0210 files are not present, falls back to fixture stubs in `src/__fixtures__/`
  - README documents the dependency on WINT-0210 for production content

- [ ] AC-9: README and integration docs
  - `packages/backend/sidecars/role-pack/README.md`
  - Documents: how to start the sidecar, endpoint spec, MCP tool call signature, versioning strategy, content dependency on WINT-0210
  - Documents: how downstream stories (WINT-2020, WINT-4060, WINT-4070) consume this service

### Non-Goals

- **Deployment to AWS Lambda** — this is a local sidecar, not a production Lambda function
- **Dynamic role discovery** — only the 4 explicitly enumerated roles (pm, dev, qa, po) are supported
- **Hot-reload of role pack files** — file cache is invalidated only on process restart (v1 scope)
- **Content authoring** — role pack text is authored by WINT-0210, not this story
- **Authentication/authorization on the HTTP endpoint** — internal-only sidecar, no auth required for v1
- **Database storage of role packs** — filesystem is the source of truth; no new DB tables
- **Multi-language or customized role packs** — future ML story scope
- **Serving role packs to browser/frontend** — this is an agent-facing sidecar only

### Reuse Plan

- **Components**: `context-cache-get.ts` pattern for MCP tool structure; `contextCacheGet` null-return contract
- **Patterns**: Zod enum validation at entry, `logger.warn` on miss, `null` return instead of throw
- **Packages**: `@repo/logger` for logging; `zod` for schemas; no `@repo/db` dependency (no database access)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Primary test focus: HTTP endpoint contract (200/400/404 response shapes), MCP tool null-return contract, file reader resilience
- Key edge cases to test:
  - Role pack file missing (WINT-0210 not yet landed)
  - Version mismatch (file has `version: 1`, caller requests `v=2`)
  - Malformed frontmatter in role pack file
  - Empty role pack file
- No E2E browser tests needed (`frontend_impacted: false`); however, a live HTTP integration test against the actual sidecar server process is recommended
- ADR-005 applies: UAT must use a real sidecar server with real files, not mocked responses
- Coverage target: 80% minimum; 100% for the Zod schema file

### For UI/UX Advisor

Not applicable — no UI components. This is a backend sidecar with no user-facing interface.

### For Dev Feasibility

- **Package scaffolding**: `packages/backend/sidecars/role-pack/` does not exist; must be created from scratch including `package.json`, `tsconfig.json`, `vitest.config.ts`
- **Monorepo wiring**: Add the new package to `pnpm-workspace.yaml` and `turbo.json` pipeline if not auto-discovered
- **HTTP server choice**: Hono is already used in `apps/api/lego-api/server.ts`; reuse Hono for the sidecar HTTP layer to maintain consistency. Alternatively, a lightweight Node.js `http` module server is sufficient given the single endpoint.
- **Canonical references for subtask decomposition**:
  - Schema definition: `packages/backend/mcp-tools/src/context-cache/__types__/index.ts`
  - MCP tool implementation: `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts`
  - Package index export: `packages/backend/mcp-tools/src/index.ts`
- **Version parsing**: Use `gray-matter` or a simple YAML frontmatter regex to extract `version:` from role pack `.md` files; avoid pulling in a heavy parser
- **Fixture stubs**: Create minimal fixture files in `src/__fixtures__/` (e.g., `dev.md` with `version: 1` and 10 placeholder tokens) to unblock unit tests independent of WINT-0210 delivery
- **Dependency chain**: WINT-2020 (Context Pack Sidecar) directly depends on WINT-2010; keep the public interface stable (role enum, version param, content string response) so WINT-2020 can consume without breaking changes
