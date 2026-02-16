# Elaboration Analysis - WINT-0100

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches platform.stories.index.md (Wave 3, #40) exactly |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, ACs, and Architecture sections fully aligned |
| 3 | Reuse-First | PASS | — | Extensive reuse plan from KB MCP server - no reinvention |
| 4 | Ports & Adapters | PASS | — | MCP server architecture properly isolated, DB access via @repo/db |
| 5 | Local Testability | PASS | — | Comprehensive test plan with unit, integration, and manual testing |
| 6 | Decision Completeness | PASS | — | All design decisions documented, server location decision criteria clear |
| 7 | Risk Disclosure | PASS | — | Technical risks identified with clear mitigations |
| 8 | Story Sizing | PASS | — | 8 points appropriate for 13 tools with 11 ACs and complex integration testing |

## Issues Found

No blocking issues found. Story is well-structured with comprehensive planning.

## Split Recommendation

N/A - Story is appropriately sized. While it has 13 tools and 11 ACs, the extensive reuse plan from the KB MCP server significantly reduces complexity. The tools naturally group into 4 cohesive categories that should be implemented together.

## Preliminary Verdict

**Verdict**: PASS

**Rationale**:
- Story has clear MVP scope with well-defined boundaries
- Extensive reuse plan from Knowledge Base MCP server reduces implementation risk
- Dependencies properly identified (WINT-0030 completed, blocks WINT-2030/2040/2050/2060)
- Comprehensive acceptance criteria covering functionality, testing, and documentation
- Test strategy includes unit tests (≥80% coverage), integration tests, and manual testing
- Architecture decisions well-documented with clear trade-offs
- Non-goals properly exclude data seeding (separate stories) and cache optimization (future work)

---

## MVP-Critical Gaps

None - core journey is complete for MVP.

**Analysis**:

The story provides comprehensive coverage for the MVP context cache MCP tools:

### 1. **Core Pack Operations (MVP-Critical)** ✅
- ✅ Read pack by type+key (AC-3: `handleGetPack`)
- ✅ Write pack with versioning (AC-3: `handleWritePack`)
- ✅ Delete pack (AC-3: `handleDeletePack`)
- ✅ List packs with pagination (AC-3: `handleListPacks`)

### 2. **Session Tracking (MVP-Critical)** ✅
- ✅ Create session (AC-4: `handleCreateSession`)
- ✅ Update token metrics (AC-4: `handleUpdateSession`)
- ✅ End session with final metrics (AC-4: `handleEndSession`)
- ✅ Record cache hits (AC-4: `handleRecordHit`)

### 3. **Query Tools (MVP-Critical)** ✅
- ✅ Calculate hit rate (AC-5: `handleGetHitRate`)
- ✅ Aggregate token savings (AC-5: `handleGetTokenSavings`)
- ✅ Find expired packs (AC-5: `handleGetExpiredPacks`)

### 4. **Maintenance Tools (MVP-Critical)** ✅
- ✅ Manual expiration cleanup (AC-6: `handleExpirePacks`)
- ✅ Health check (AC-6: `handleHealth`)

### 5. **Error Handling & Validation (MVP-Critical)** ✅
- ✅ Comprehensive Zod schemas for all 13 tools (AC-2)
- ✅ Error handling with MCPError types (AC-7)
- ✅ Correlation IDs for tracing (AC-7)
- ✅ Foreign key validation (AC-7)

### 6. **Testing (MVP-Critical)** ✅
- ✅ Unit tests ≥80% coverage (AC-8)
- ✅ Integration tests with real DB (AC-9)
- ✅ End-to-end flows tested (AC-9)

### 7. **Documentation (MVP-Critical)** ✅
- ✅ Tool catalog with examples (AC-11)
- ✅ Environment configuration (AC-10)
- ✅ Troubleshooting guide (AC-11)

**Downstream Impact**:
- WINT-2030 (Seed Codebase Context Packs) - **unblocked** by `context_cache_write_pack`
- WINT-2040 (Seed Story Context Packs) - **unblocked** by `context_cache_write_pack`
- WINT-2050 (Seed Architecture Context Packs) - **unblocked** by `context_cache_write_pack`
- WINT-2060 (Seed Lessons Learned Context Packs) - **unblocked** by `context_cache_write_pack`
- WINT-2110 (Agent Integration) - **unblocked** by all query tools

---

## Audit Checklist Details

### 1. Scope Alignment ✅

**Finding**: PASS

**Evidence**:
- Index entry: `| 40 | | WINT-0100 | Create Context Cache MCP Tools **elaboration** | none | WINT | P2 |`
- Story scope: 13 MCP tools for context cache operations (4 pack tools, 4 session tools, 3 query tools, 2 maintenance tools)
- No extra features beyond declared scope
- Dependencies correctly identified: WINT-0030 (completed as part of WINT-0010)
- Blocks correctly identified: WINT-2030, WINT-2040, WINT-2050, WINT-2060

**Verification**:
- Story title matches index: "Create Context Cache MCP Tools"
- Epic assignment correct: WINT
- Wave assignment correct: Wave 3 — Shared TypeScript Types
- Priority correct: P2 (context cache is important but not P0 critical path)
- No scope creep detected

### 2. Internal Consistency ✅

**Finding**: PASS

**Evidence**:
- **Goals vs Non-Goals**: Clear separation
  - Goal: Create MCP tools for context cache operations
  - Non-Goal: Data seeding (separate stories WINT-2030/2040/2050/2060)
  - Non-Goal: Cache warming strategies (separate story WINT-2070)
  - Non-Goal: Agent integration (separate story WINT-2110)
- **ACs align with Scope**: All 13 tools from scope section mapped to ACs 1-6
- **Architecture Notes align with Goals**: Server location decision, versioning strategy, session flow all support declared goals
- **Test Plan aligns with ACs**: AC-8 requires ≥80% unit test coverage, Test Plan section details unit testing strategy
- **No contradictions**: Reuse Plan says "extend KB server (recommended)" and Architecture Notes section provides same recommendation with detailed rationale

**Verification**:
```
Goals section declares: "Create an MCP server (or extend the existing Knowledge Base MCP server)"
Non-Goals section excludes: "Data seeding, cache warming, agent integration, cache compression, multi-tenancy, custom eviction policies, cache analytics dashboard UI, migration of existing workflow context"
Architecture Notes section recommends: "Extend Knowledge Base MCP Server" with clear pros/cons
Scope section lists: 13 tools across 4 categories
ACs 1-6 map to: Project structure (AC-1), Schemas (AC-2), CRUD (AC-3), Session (AC-4), Query (AC-5), Maintenance (AC-6)
```

### 3. Reuse-First Enforcement ✅

**Finding**: PASS

**Evidence**:
- **Comprehensive Reuse Plan** section (lines 256-340) documents reuse from:
  - Knowledge Base MCP Server patterns: server initialization, tool schema registration, handler pattern, error handling, correlation IDs, performance logging
  - @repo/db client: connection pooling, WINT schema access, auto-generated Zod schemas
  - Drizzle ORM: query builder patterns, transactions, prepared statements
- **No new packages required**: Story explicitly states "No new packages needed" (line 116)
- **All dependencies available**: `@modelcontextprotocol/sdk@1.26.0`, `zod`, `zod-to-json-schema`, `@repo/logger`, `@repo/db`, `drizzle-orm` (lines 112-115)
- **Factory pattern for DI** documented (lines 280-289)
- **Tool handler pattern** documented with example (lines 291-315)

**Verification**:
- Story references existing KB MCP server at `apps/api/knowledge-base/src/mcp-server/` as pattern source
- Reuse plan includes code examples showing how to apply patterns (not reinvent)
- No one-off utilities proposed
- Server location decision explicitly recommends extending KB server for infrastructure reuse

**Reuse Candidates Documented**:
1. Server initialization pattern (`server.ts`)
2. Tool schema registration pattern (`tool-schemas.ts`)
3. Tool handler pattern (`tool-handlers.ts`)
4. Error handling utilities
5. Correlation ID generation
6. Performance logging
7. Database client patterns
8. Zod schema patterns

### 4. Ports & Adapters Compliance ✅

**Finding**: PASS

**Rationale**:
- MCP server is a **transport adapter** for context cache operations (not a REST API)
- Core logic properly isolated in handler functions (`handleGetPack`, `handleWritePack`, etc.)
- Database access abstracted via `@repo/db` client (not direct SQL in handlers)
- MCP protocol concerns isolated to `server.ts` (stdio transport, request handlers)
- Tool handlers are thin wrappers around database operations (lines 291-315 show handler pattern)

**Architecture Isolation**:
```
MCP Protocol Layer (stdio transport)
  ↓
Tool Handlers (validate → execute → log → return)
  ↓
@repo/db Client (connection pooling, Drizzle ORM)
  ↓
PostgreSQL (WINT schema tables)
```

**Verification**:
- Handler pattern (lines 291-315) shows: validate input (Zod) → execute DB query (Drizzle) → log performance → return result
- No business logic in MCP protocol layer
- No MCP types in database layer
- Dependency injection via factory pattern (lines 280-289)
- Transport-agnostic core logic (could swap stdio for HTTP without changing handlers)

**Note**: This story does not involve API endpoints, so `docs/architecture/api-layer.md` verification is not applicable. The MCP server is a different architectural pattern (stdio-based tool server for Claude Code, not HTTP REST API).

### 5. Local Testability ✅

**Finding**: PASS

**Evidence**:

**Unit Testing** (AC-8, lines 220-232):
- ✅ Test plan section includes comprehensive unit testing strategy (lines 524-587)
- ✅ Coverage target: ≥80% overall, 100% for critical paths (versioning, session lifecycle)
- ✅ Test structure documented: 6 test files planned (`pack-handlers.test.ts`, `session-handlers.test.ts`, `query-handlers.test.ts`, `maintenance-handlers.test.ts`, `schemas.test.ts`, `integration.test.ts`)
- ✅ Mocking strategy: Mock `@repo/db`, `@repo/logger`, Drizzle query builders
- ✅ Critical test cases identified: pack versioning, session lifecycle, cache expiration, foreign key constraints, query performance, input validation

**Integration Testing** (AC-9, lines 233-245):
- ✅ Integration test strategy with real DB documented (lines 584-753)
- ✅ Test database setup: Docker Compose with PostgreSQL, WINT schema migrations
- ✅ End-to-end flows: pack lifecycle, session+hit tracking, concurrent updates, expiration cleanup
- ✅ Isolation: transactions with rollback after each test
- ✅ Connection management via `@repo/db` test utilities

**Manual Testing** (lines 764-788):
- ✅ MCP protocol integration checklist
- ✅ Correlation ID tracing verification
- ✅ Connection pool management tests
- ✅ Claude Code integration testing (configure MCP server, call tools)

**Concrete Test Examples**:
- Lines 595-634: Pack lifecycle test (write → read → update → delete → verify)
- Lines 638-685: Session and hit tracking test (create session → record hits → update tokens → end session → query savings)
- Lines 689-728: Concurrent pack update test (version conflict handling)
- Lines 732-753: Expiration cleanup test (insert expired packs → run cleanup → verify deletion)

**Performance Benchmarks** documented (lines 756-763):
- Pack write: <100ms
- Pack read: <50ms
- Hit recording: <50ms
- List packs (100 results): <200ms
- Token savings aggregation: <5s
- Expiration cleanup: <500ms

### 6. Decision Completeness ✅

**Finding**: PASS

**Evidence**:

**No Blocking TBDs**:
- All design decisions documented in Architecture Notes section (lines 344-473)
- Server location decision has clear criteria (lines 346-374)
- Pack versioning strategy fully specified (lines 376-401)
- Session tracking flow documented (lines 403-419)
- Cache expiration strategy defined (lines 421-443)
- Error handling philosophy documented (lines 445-473)

**Key Decisions Documented**:

1. **Server Location Decision** (lines 346-374):
   - **Recommended**: Extend KB MCP server
   - **Rationale**: Single server to configure, shared infrastructure, less boilerplate
   - **Trade-offs**: KB server has two domains (knowledge + context cache), slightly larger footprint
   - **Alternative**: Standalone server (clear separation, independent deployment)
   - **Decision Criteria**: If tools remain <20 → extend KB server; if >30 tools → standalone
   - **MVP Decision**: Extend KB server for simplicity

2. **Pack Versioning Strategy** (lines 376-401):
   - **Approach**: Optimistic locking via version field
   - **Conflict Resolution**: Read → Update with expected version → Retry if conflict (max 3 retries)
   - **Version Semantics**: Starts at 1, increments on update, never decrements
   - **SQL Pattern**: `UPDATE ... SET version = version + 1 WHERE ... AND version = ?`

3. **Session Tracking Flow** (lines 403-419):
   - **Lifecycle**: Start → Execution (with hits) → Token Updates → End
   - **Token Metrics**: inputTokens, outputTokens, cachedTokens (all incremental updates)
   - **Hit Recording**: Each pack access records sessionId + packId + tokensSaved

4. **Cache Expiration Strategy** (lines 421-443):
   - **TTL Configuration**: `ttlHours = null` → never expires, `ttlHours = 24` → expires in 24 hours
   - **Recommended TTLs**: codebase (24h), story (1h), architecture (null), lessons_learned (null)
   - **Cleanup**: Manual via `context_cache_expire_packs` tool (automated cron job deferred)
   - **Expired Pack Behavior**: `get_pack` on expired pack → return not_found (cache miss)

5. **Error Handling Philosophy** (lines 445-473):
   - **Approach**: Fail fast, fail clear
   - **Sanitization**: Strip sensitive data (passwords, DB credentials, internal paths)
   - **Correlation IDs**: UUID v4 per request, included in all logs and errors
   - **MCPError Types**: InvalidRequest, NotFound, Conflict, InternalError

**Open Questions**: None blocking. Story explicitly notes "No ADR-LOG.md in codebase (architecture decisions undocumented)" (line 899) but provides comprehensive architectural guidance inline.

### 7. Risk Disclosure ✅

**Finding**: PASS

**Evidence**:

**Technical Risks Identified** (lines 479-506 in Story Seed):
1. **MCP Protocol Complexity**
   - Risk: Limited documentation, sparse examples
   - Mitigation: KB MCP server exists as complete reference implementation
   - Mitigation: MCP protocol v1.26.0 stable, stdio transport well-tested

2. **Database Connection Pooling**
   - Risk: Long-running process may exhaust connections (unlike Lambda)
   - Mitigation: Use @repo/db with max pool size = 5 (configurable)
   - Mitigation: Graceful shutdown on SIGTERM/SIGINT

3. **Concurrent Pack Updates**
   - Risk: Two agents writing same pack → version conflict
   - Mitigation: Optimistic locking via version field (increment + check)
   - Mitigation: Retry logic in client (MCP tools don't auto-retry)

4. **Cache Expiration Timing**
   - Risk: Expired packs accumulate, slow down queries
   - Mitigation: Index on expiresAt for fast cleanup queries
   - Mitigation: Manual cleanup tool + future automated job (not this story)

5. **JSONB Content Schema Flexibility**
   - Risk: No enforced schema for pack content (any JSONB accepted)
   - Mitigation: Document expected shapes in tool descriptions
   - Mitigation: Future story can add content validation (deferred)

**Integration Risks** (lines 919-921):
- Integration Risk: Low (WINT schema deployed, KB server patterns established)
- Testing Risk: Medium (requires separate test DB, concurrent update testing complex)

**Infrastructure Notes** section (lines 474-520) documents:
- Connection management strategy (pooling, health checks, timeouts)
- MCP server deployment (local development, testing requirements, production considerations)
- Timeout configuration (5000ms default, 1000ms slow query threshold)

**Protected Assets** documented (lines 84-88):
- Context cache database schema (do not modify)
- Migration `0015_messy_sugar_man.sql` (do not modify)
- @repo/db client API surface (do not modify)
- Knowledge Base MCP server (reference only, minimize changes)

**Deferred Work** documented (lines 90-95):
- Performance optimizations (defer to separate performance story)
- Cache replication/backup (defer to infrastructure story)
- Versioning conflict resolution beyond optimistic locking (sufficient for MVP)
- Pack content schema validation beyond JSONB (future enhancement)

### 8. Story Sizing ✅

**Finding**: PASS

**Story Points**: 8 (appropriate)

**Complexity**: Complex (as declared in frontmatter)

**Sizing Indicators Analysis**:
| Indicator | Count | Threshold | Status |
|-----------|-------|-----------|--------|
| Acceptance Criteria | 11 | >8 = too large | ⚠️ Borderline |
| Tools Created | 13 | N/A | N/A |
| Endpoints Modified | 0 | >5 = too large | ✅ OK |
| Frontend + Backend Work | Backend only | Both = too large | ✅ OK |
| Independent Features | 1 (context cache MCP tools) | >1 = too large | ✅ OK |
| Test Scenarios (happy path) | 4 main flows | >3 = too large | ⚠️ Borderline |
| Packages Touched | 1 primary (`knowledge-base/`) | >2 = too large | ✅ OK |

**Borderline Indicators**: 2 (AC count: 11, Test scenarios: 4)

**Mitigating Factors**:
1. **Extensive Reuse**: KB MCP server provides proven patterns for all infrastructure (server setup, tool registration, error handling, correlation IDs, performance logging) - significantly reduces complexity
2. **Cohesive Scope**: 13 tools naturally group into 4 related categories (pack ops, session ops, query ops, maintenance) - should be implemented together
3. **No Novel Architecture**: MCP protocol already understood, DB schema exists, patterns proven
4. **Estimated Duration**: 3-4 days (line 914) is reasonable for 8 points

**Split Analysis**:
- **Could split into**: WINT-0100-A (pack + session tools, ACs 1-4) and WINT-0100-B (query + maintenance tools, ACs 5-7)
- **Dependency**: 0100-B depends on 0100-A (can't query/maintain packs without write tools)
- **Recommendation**: **Do not split**. The extensive reuse plan and cohesive scope make this story more feasible than the raw numbers suggest. Query tools (AC-5) are simple aggregations that depend on pack/session infrastructure (ACs 3-4). Splitting would create artificial boundaries and complicate testing (integration tests need full tool set).

**Verdict**: Story appropriately sized at 8 points for complex work with significant reuse advantages.

---

## Evidence Verification

### Source File Cross-Reference

| Artifact | Location | Status | Notes |
|----------|----------|--------|-------|
| Context Cache Schema | `packages/backend/database-schema/src/schema/wint.ts` lines 467-587 | ✅ Verified | 3 tables (contextPacks, contextSessions, contextCacheHits), 1 enum (contextPackTypeEnum) |
| WINT-0030 Migration | `packages/backend/database-schema/src/migrations/app/0015_messy_sugar_man.sql` | ✅ Verified | Creates all context cache tables, completed in WINT-0010 |
| KB MCP Server Reference | `apps/api/knowledge-base/src/mcp-server/` | ✅ Verified | 20+ tools, patterns for server init, tool schemas, handlers, error handling |
| @repo/db Client | `packages/backend/db/` | ✅ Verified | WINT schema access, auto-generated Zod schemas |
| Drizzle ORM | All backend packages | ✅ Verified | v0.44.3 active |

### Acceptance Criteria Coverage

All 11 ACs have clear, testable success criteria:

| AC | Requirement | Coverage | Testability |
|----|-------------|----------|-------------|
| AC-1 | MCP server project structure | ✅ Complete | Verify directory structure, package.json, tsconfig.json, environment schema |
| AC-2 | Zod schemas for all tool inputs/outputs | ✅ Complete | Verify all 12+ schemas convert cleanly via zodToJsonSchema() |
| AC-3 | Context pack CRUD operations | ✅ Complete | Integration tests verify get/write/delete/list operations |
| AC-4 | Session tracking operations | ✅ Complete | Integration tests verify create/update/end/record-hit operations |
| AC-5 | Query tools for cache analytics | ✅ Complete | Integration tests verify hit rate, token savings, expired packs queries |
| AC-6 | Maintenance tools | ✅ Complete | Integration tests verify expire-packs (dry-run + actual), health check |
| AC-7 | Comprehensive error handling | ✅ Complete | Unit tests verify Zod validation, DB error sanitization, MCPError types, correlation IDs |
| AC-8 | Unit tests (≥80% coverage) | ✅ Complete | Test plan documents 6 test files, critical test cases, mocking strategy |
| AC-9 | Integration tests with real DB | ✅ Complete | Test plan documents 4 end-to-end flows with concrete test examples |
| AC-10 | MCP server configuration | ✅ Complete | Example claude_desktop_config.json, environment variables documented |
| AC-11 | Documentation for tool usage | ✅ Complete | README with tool catalog, example flows, schema docs, troubleshooting guide |

### Schema Verification

Context cache schema (from `wint.ts` lines 467-587):

1. **contextPackTypeEnum** (line 474):
   ```typescript
   pgEnum('context_pack_type', [
     'codebase', 'story', 'feature', 'epic',
     'architecture', 'lessons_learned', 'test_patterns'
   ])
   ```

2. **contextPacks** table (lines 489-522):
   - ✅ 13 columns: id, packType, packKey, content (JSONB), version, expiresAt, hitCount, lastHitAt, tokenCount, createdAt, updatedAt
   - ✅ 4 indexes: (packType, packKey) unique, expiresAt, lastHitAt, packType
   - ✅ UUID primary key with defaultRandom()
   - ✅ Content JSONB with TypeScript type hint: `{ summary?, files?, lessons?, architecture? }`

3. **contextSessions** table (lines 529-558):
   - ✅ 11 columns: id, sessionId (unique), agentName, storyId, phase, inputTokens, outputTokens, cachedTokens, startedAt, endedAt, createdAt, updatedAt
   - ✅ 5 indexes: sessionId (unique), agentName, storyId, startedAt, (agentName, storyId) composite
   - ✅ UUID primary key, text sessionId with unique constraint

4. **contextCacheHits** table (lines 566-587):
   - ✅ 4 columns: id, sessionId (FK to contextSessions.id), packId (FK to contextPacks.id), tokensSaved, createdAt
   - ✅ 3 indexes: sessionId, packId, createdAt
   - ✅ Foreign keys with CASCADE delete
   - ✅ UUID primary key

**Schema Status**: Fully deployed via WINT-0010 (completed 2026-02-14, status: UAT). Migration `0015_messy_sugar_man.sql` applied.

---

## Story Quality Assessment

### Documentation Quality: EXCELLENT

**Strengths**:
- Comprehensive context section explaining what exists, the problem, and why it matters
- Clear goals with explicit 5-point list of what MCP tools enable
- Extensive non-goals section (12 items) with clear rationale for deferral
- Detailed scope section with package locations, dependencies, 13 tool descriptions
- 11 comprehensive acceptance criteria with concrete success metrics
- Thorough reuse plan with code examples (not just references)
- Architecture notes with decision rationale and trade-offs
- Complete test plan with unit, integration, and manual testing strategies
- UI/UX notes covering tool naming, error messages, and logging for developers
- Reality baseline documenting codebase state, dependencies, constraints, known gaps

**Structure**:
- ✅ Context section explains background clearly
- ✅ Goal section concise (5 enumerated points)
- ✅ Non-goals section comprehensive (prevents scope creep)
- ✅ Scope section details packages, DB operations, 13 tools
- ✅ 11 acceptance criteria well-defined
- ✅ Reuse plan with code examples
- ✅ Architecture notes with design decisions
- ✅ Test plan with concrete test examples
- ✅ UI/UX notes (tool naming, error messages)
- ✅ Infrastructure notes (connection pooling, deployment)
- ✅ Reality baseline (dependencies, constraints, follow-on stories)

### Story Completeness: COMPLETE

**Coverage**:
- ✅ All sections present per story template
- ✅ Reality Baseline included (lines 859-933)
- ✅ Dependency impact analyzed (blocks WINT-2030/2040/2050/2060, depends on WINT-0030)
- ✅ Estimation provided (8 points, 3-4 days, complexity: complex)
- ✅ Risk assessment (technical, integration, testing risks with mitigations)
- ✅ Success criteria (13 tools implemented, 11 ACs met, ≥80% coverage, performance benchmarks)

### Technical Rigor: HIGH

**Evidence**:
- ✅ Concrete SQL examples for versioning strategy (lines 379-385)
- ✅ TypeScript code examples for handler pattern (lines 291-315)
- ✅ Zod schema examples for environment validation (lines 324-330)
- ✅ Stdio transport configuration (lines 317-321)
- ✅ Integration test examples with executable test code (lines 595-753)
- ✅ Performance benchmarks with specific thresholds (lines 756-763)
- ✅ Error sanitization example (lines 453-460)
- ✅ File structure recommendations (lines 532-579 in Story Seed)

---

## Reuse Plan Verification

### Patterns from KB MCP Server

**Pattern**: Server Initialization (lines 260-262)
- ✅ Location: `apps/api/knowledge-base/src/mcp-server/server.ts`
- ✅ Stdio transport setup, server lifecycle, request handlers
- ✅ Verified in source file (lines 1-100 of server.ts read)

**Pattern**: Tool Schema Registration (lines 262-264)
- ✅ Location: `tool-schemas.ts`
- ✅ Zod → JSON Schema conversion via `zodToJsonSchema()`
- ✅ Reusable for all 13 context cache tools

**Pattern**: Tool Handler (lines 264-266, 291-315)
- ✅ Location: `tool-handlers.ts`
- ✅ Validate input → execute operation → log performance → return result
- ✅ Code example provided in story (lines 291-315)

**Pattern**: Error Handling (lines 266-268)
- ✅ Error sanitization (strip sensitive data)
- ✅ MCPError wrapping for protocol compliance
- ✅ Code example provided (lines 453-460)

**Pattern**: Correlation ID Generation (lines 268-270)
- ✅ UUID v4 per request
- ✅ Passed through request context
- ✅ Verified in server.ts (lines 84-86)

**Pattern**: Performance Logging (lines 270-272)
- ✅ Track operation start time
- ✅ Log slow queries (>1000ms threshold)
- ✅ Include correlation ID

### Packages Available

| Package | Version | Location | Status |
|---------|---------|----------|--------|
| @modelcontextprotocol/sdk | 1.26.0 | KB MCP server | ✅ Available |
| zod | Latest | All packages | ✅ Available |
| zod-to-json-schema | Latest | KB MCP server | ✅ Available |
| @repo/logger | Internal | packages/core/logger | ✅ Available |
| @repo/db | Internal | packages/backend/db | ✅ Available |
| drizzle-orm | 0.44.3 | All backend | ✅ Available |

**Verification**: All dependencies documented as "already available" (lines 112-116). No new packages required.

---

## Dependency Analysis

### Blocking Dependencies

**WINT-0030 (Context Cache Schema)**: ✅ COMPLETED (delivered in WINT-0010)
- Status: UAT (completed 2026-02-14)
- Tables: contextPacks, contextSessions, contextCacheHits
- Migration: 0015_messy_sugar_man.sql applied
- Verification: Schema exists at `packages/backend/database-schema/src/schema/wint.ts` lines 467-587

**Knowledge Base MCP Server**: ✅ AVAILABLE
- Location: `apps/api/knowledge-base/src/mcp-server/`
- Status: Deployed, active, 20+ tools
- Patterns: Server init, tool schemas, handlers, error handling, correlation IDs
- Verification: Files exist and are production-ready

**@repo/db Client**: ✅ AVAILABLE
- Location: `packages/backend/db/`
- WINT schema access: Yes
- Auto-generated Zod schemas: Yes (via drizzle-zod)
- Verification: Active in all backend packages

### Downstream Stories Blocked

| Story | Title | Blocked Reason | Unblocked By |
|-------|-------|----------------|--------------|
| WINT-2030 | Seed Codebase Context Packs | Needs `context_cache_write_pack` tool | AC-3 (pack CRUD) |
| WINT-2040 | Seed Story Context Packs | Needs `context_cache_write_pack` tool | AC-3 (pack CRUD) |
| WINT-2050 | Seed Architecture Context Packs | Needs `context_cache_write_pack` tool | AC-3 (pack CRUD) |
| WINT-2060 | Seed Lessons Learned Context Packs | Needs `context_cache_write_pack` tool | AC-3 (pack CRUD) |
| WINT-2110 | Agent Integration for Context Cache | Needs all query tools | AC-5 (query tools) |

**Critical Path Impact**: This story unblocks 5 downstream stories. Delay here delays entire context cache value stream.

---

## Integration Points

### 1. Database Integration
- **Schema**: WINT schema namespace (`wint.context_packs`, `wint.context_sessions`, `wint.context_cache_hits`)
- **Client**: @repo/db with connection pooling
- **ORM**: Drizzle ORM for type-safe queries
- **Migrations**: Schema already deployed via WINT-0010
- **Testing**: Requires WINT schema in test database

### 2. MCP Protocol Integration
- **SDK**: @modelcontextprotocol/sdk v1.26.0
- **Transport**: Stdio (for Claude Code integration)
- **Tool Registration**: Via `ListToolsRequestSchema` handler
- **Tool Execution**: Via `CallToolRequestSchema` handler
- **Error Protocol**: MCPError types (InvalidRequest, NotFound, Conflict, InternalError)

### 3. Logging Integration
- **Package**: @repo/logger
- **Correlation IDs**: UUID v4 per request
- **Performance Metrics**: Start time tracking, slow query threshold (>1000ms)
- **Audit Logging**: All write operations logged (pack writes, session creates, hit recordings)

### 4. Environment Configuration
- **DATABASE_URL**: Required (connection string to WINT schema)
- **LOG_LEVEL**: Optional (default: info)
- **CONTEXT_CACHE_TIMEOUT_MS**: Optional (default: 5000)
- **DB_POOL_MAX**: Optional (default: 5)

---

## Worker Token Summary

- **Input**: ~17,500 tokens (story file, seed, agent instructions, schema verification, KB server patterns, index, checkpoint)
- **Output**: ~6,800 tokens (ANALYSIS.md)
- **Total**: ~24,300 tokens
