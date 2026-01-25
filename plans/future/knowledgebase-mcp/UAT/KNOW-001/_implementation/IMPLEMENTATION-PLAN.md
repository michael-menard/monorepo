# Implementation Plan - KNOW-001

## Scope Surface

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend/API | true | New knowledge-base package with Drizzle schema, database migrations, pgvector setup |
| frontend/UI | false | No UI components in this infrastructure story |
| infra/config | true | Docker Compose, environment variables, monorepo workspace configuration |

## Acceptance Criteria Checklist

- [ ] **AC1**: Package structure created at `apps/api/knowledge-base/`
- [ ] **AC2**: Docker Compose setup with pgvector/pgvector:0.5.1-pg16
- [ ] **AC3**: pgvector extension available and verified
- [ ] **AC4**: Database schema created (knowledge_entries, embedding_cache tables)
- [ ] **AC5**: Vitest configuration with smoke tests
- [ ] **AC6**: Documentation complete (README, .env.example)
- [ ] **AC7**: Monorepo integration (pnpm build/lint/test work)
- [ ] **AC8**: Error handling with actionable messages
- [ ] **AC9**: Database initialization script (`pnpm db:init`)
- [ ] **AC10**: README Quickstart section
- [ ] **AC11**: Drizzle Studio integration (`pnpm db:studio`)
- [ ] **AC12**: Environment variable validation (`pnpm validate:env`)
- [ ] **AC13**: Development database seeding (`pnpm db:seed`)
- [ ] **AC14**: pgvector version pinning and documentation
- [ ] **AC15**: Schema analysis and index verification
- [ ] **AC16**: Rollback and recovery procedures

## Files To Touch

### New Files (Create)

```
apps/api/knowledge-base/
├── package.json                    # Package manifest with @repo/knowledge-base name
├── tsconfig.json                   # TypeScript config extending monorepo patterns
├── vitest.config.ts                # Vitest configuration with coverage thresholds
├── docker-compose.yml              # PostgreSQL + pgvector container
├── .env.example                    # Environment variable template
├── README.md                       # Comprehensive documentation
├── src/
│   ├── index.ts                    # Package entry point (exports schema, types)
│   ├── db/
│   │   ├── client.ts               # Database connection client with pooling
│   │   ├── schema.ts               # Drizzle schema for knowledge_entries, embedding_cache
│   │   └── migrations/
│   │       └── 0000_initial_schema.sql  # Initial migration with pgvector setup
│   ├── scripts/
│   │   ├── db-init.ts              # Combined initialization script
│   │   ├── db-seed.ts              # Development seed data
│   │   ├── db-analyze.ts           # ANALYZE wrapper script
│   │   └── validate-env.ts         # Environment variable validation
│   ├── __types__/
│   │   └── index.ts                # Zod schemas for knowledge entries, embeddings
│   └── __tests__/
│       └── smoke.test.ts           # Infrastructure smoke tests
└── drizzle.config.ts               # Drizzle Kit configuration
```

### Existing Files (Potentially Modify)

```
pnpm-workspace.yaml                 # Verify apps/api/* pattern exists (should already include)
turbo.json                          # Already has db:* tasks defined
```

## Reuse Targets

### Existing Patterns to Follow

| Pattern | Source | How to Reuse |
|---------|--------|--------------|
| Drizzle ORM setup | `apps/api/drizzle.config.ts` | Follow same config structure, use postgresql dialect |
| Drizzle schema patterns | `apps/api/core/database/schema/index.ts` | Use same imports (pgTable, uuid, text, timestamp, index) |
| Package structure | `packages/backend/search/` | Follow same exports, vitest.config, package.json structure |
| Vitest configuration | `packages/backend/search/vitest.config.ts` | Copy config pattern with node environment |
| Docker Compose | `docker-compose.yml` (root) | Follow same volume naming, port mapping patterns |
| Package naming | `@repo/search`, `@repo/db` | Use `@repo/knowledge-base` naming convention |

### New Components (First Use)

| Component | Notes |
|-----------|-------|
| pgvector extension | First use of vector embeddings in monorepo |
| VECTOR column type | New Drizzle custom type for embeddings |
| IVFFlat index | First vector similarity index |
| MCP server package structure | Will become template for future MCP servers |

## Architecture Notes

### Database Design

```
┌──────────────────────────────────────────────────────────────────┐
│                    PostgreSQL + pgvector                         │
├──────────────────────────────────────────────────────────────────┤
│  knowledge_entries                                               │
│  ├── id: UUID (PK)                                               │
│  ├── content: TEXT NOT NULL                                      │
│  ├── embedding: VECTOR(1536) NOT NULL  ← OpenAI ada-002 dim     │
│  ├── role: TEXT NOT NULL ('pm' | 'dev' | 'qa' | 'all')          │
│  ├── tags: TEXT[]                                                │
│  ├── created_at: TIMESTAMP                                       │
│  └── updated_at: TIMESTAMP                                       │
│                                                                  │
│  [IVFFlat INDEX on embedding with lists=100]                     │
├──────────────────────────────────────────────────────────────────┤
│  embedding_cache                                                 │
│  ├── content_hash: TEXT (PK) ← SHA-256 of content               │
│  ├── embedding: VECTOR(1536) NOT NULL                            │
│  └── created_at: TIMESTAMP                                       │
└──────────────────────────────────────────────────────────────────┘
```

### Connection Pooling for Lambda

- Use `pg` driver with connection pooling
- Max connections: 10 (suitable for Lambda concurrency)
- Idle timeout: 10000ms (release connections quickly)
- Connection timeout: 5000ms (fail fast)

### Package Architecture

```
@repo/knowledge-base
├── Exports
│   ├── db/client    → getDbClient(), closeDbClient()
│   ├── db/schema    → knowledgeEntries, embeddingCache tables
│   └── types        → Zod schemas for validation
└── Scripts
    ├── db:init      → docker-compose up + migrate
    ├── db:migrate   → drizzle-kit migrate
    ├── db:seed      → insert sample data
    ├── db:studio    → drizzle-kit studio
    ├── db:analyze   → ANALYZE tables
    └── validate:env → check required env vars
```

## Step-by-Step Plan

### Phase 1: Package Scaffolding (Steps 1-4)

**Step 1: Create Package Directory Structure**
- Create `apps/api/knowledge-base/` directory
- Create subdirectories: `src/`, `src/db/`, `src/db/migrations/`, `src/scripts/`, `src/__types__/`, `src/__tests__/`
- Time estimate: 5 minutes

**Step 2: Initialize package.json**
- Create `package.json` with name `@repo/knowledge-base`
- Add dependencies: `drizzle-orm`, `pg`, `zod`, `dotenv`
- Add devDependencies: `drizzle-kit`, `vitest`, `@vitest/coverage-v8`, `typescript`, `tsx`, `@types/pg`, `@types/node`
- Define scripts: `build`, `test`, `db:*`, `validate:env`
- Time estimate: 10 minutes

**Step 3: Configure TypeScript**
- Create `tsconfig.json` extending monorepo TypeScript patterns
- Set module resolution to NodeNext for ESM compatibility
- Configure output to `dist/` directory
- Time estimate: 5 minutes

**Step 4: Configure Vitest**
- Create `vitest.config.ts` following `packages/backend/search/` pattern
- Set environment to `node`
- Configure coverage with v8 provider
- Set coverage threshold to 45% (monorepo standard)
- Time estimate: 5 minutes

### Phase 2: Docker Compose & Environment (Steps 5-7)

**Step 5: Create Docker Compose Configuration**
- Create `docker-compose.yml` with `pgvector/pgvector:0.5.1-pg16` image
- Configure environment variables for database credentials
- Define named volume `kb_postgres_data` for persistence
- Add healthcheck with `pg_isready` command
- Map port via `KB_DB_PORT` environment variable (default 5433 to avoid conflict)
- Time estimate: 15 minutes

**Step 6: Create Environment Template**
- Create `.env.example` with all `KB_DB_*` variables
- Include comments explaining each variable
- Document default values for local development
- Note: Use port 5433 by default to avoid conflict with root docker-compose
- Time estimate: 10 minutes

**Step 7: Create Environment Validation Script**
- Create `src/scripts/validate-env.ts`
- Check for required `KB_DB_*` variables
- Provide clear error messages for missing variables
- Export as `pnpm validate:env` script
- Time estimate: 15 minutes

### Phase 3: Database Schema (Steps 8-11)

**Step 8: Create Drizzle Configuration**
- Create `drizzle.config.ts` following `apps/api/drizzle.config.ts` pattern
- Configure schema path to `src/db/schema.ts`
- Configure migrations output to `src/db/migrations/`
- Use `KB_DB_*` environment variables
- Time estimate: 10 minutes

**Step 9: Define Database Schema**
- Create `src/db/schema.ts` with Drizzle table definitions
- Define `knowledge_entries` table with VECTOR(1536) column (requires custom type)
- Define `embedding_cache` table
- Add IVFFlat index on embeddings with `lists=100`
- Include detailed comments about VECTOR(1536) tied to OpenAI text-embedding-3-small
- Time estimate: 30 minutes

**Step 10: Create Database Client**
- Create `src/db/client.ts` with connection pooling
- Configure for Lambda context (max 10 connections, short timeouts)
- Export `getDbClient()` and `closeDbClient()` functions
- Handle connection errors gracefully with actionable messages
- Time estimate: 20 minutes

**Step 11: Generate Initial Migration**
- Use drizzle-kit to generate initial migration SQL
- Manually add `CREATE EXTENSION IF NOT EXISTS vector;` at top
- Add comment documenting VECTOR(1536) dimension requirement
- Verify migration is idempotent
- Time estimate: 15 minutes

### Phase 4: Scripts & Automation (Steps 12-15)

**Step 12: Create Database Initialization Script**
- Create `src/scripts/db-init.ts`
- Combine: docker-compose up -d + wait-for-healthy + migration
- Provide clear status output at each step
- Fail fast with actionable errors
- Export as `pnpm db:init` script
- Time estimate: 25 minutes

**Step 13: Create Database Seed Script**
- Create `src/scripts/db-seed.ts`
- Insert 3-5 realistic sample knowledge entries
- Generate placeholder embeddings (zeros for now, KNOW-002 will use real embeddings)
- Make idempotent (upsert pattern)
- Export as `pnpm db:seed` script
- Time estimate: 20 minutes

**Step 14: Create Database Analyze Script**
- Create `src/scripts/db-analyze.ts`
- Run PostgreSQL ANALYZE on tables
- Document when to run (after bulk imports)
- Export as `pnpm db:analyze` script
- Time estimate: 10 minutes

**Step 15: Add Drizzle Studio Script**
- Add `db:studio` script to package.json
- Configure drizzle-kit studio command
- Document in README
- Time estimate: 5 minutes

### Phase 5: Testing (Steps 16-17)

**Step 16: Create Smoke Test Suite**
- Create `src/__tests__/smoke.test.ts`
- Test 1: Database connection succeeds
- Test 2: pgvector extension available (`SELECT extversion FROM pg_extension WHERE extname = 'vector'`)
- Test 3: Both tables exist (`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
- Test 4: Vector index exists (`SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_entries'`)
- Test 5: EXPLAIN plan shows index scan for vector query
- Time estimate: 30 minutes

**Step 17: Create Type Schemas**
- Create `src/__types__/index.ts`
- Define Zod schemas for KnowledgeEntry, EmbeddingCache
- Export inferred TypeScript types
- Time estimate: 15 minutes

### Phase 6: Documentation (Steps 18-20)

**Step 18: Create README with Quickstart**
- Create `README.md` with prominent Quickstart section
- Structure: Quickstart -> Prerequisites -> Architecture -> Detailed Setup -> Troubleshooting
- Include copy-paste executable commands
- Document pgvector version requirements and VECTOR(1536) dimension
- Document migration tool choice (Drizzle)
- Time estimate: 45 minutes

**Step 19: Document Rollback Procedures**
- Add rollback section to README
- Document how to reset database state
- Include commands for common rollback scenarios
- Document connection pool cleanup
- Time estimate: 15 minutes

**Step 20: Create Package Entry Point**
- Create `src/index.ts` exporting schema, client, types
- Configure package.json exports map
- Verify package builds successfully
- Time estimate: 10 minutes

### Phase 7: Integration & Verification (Steps 21-22)

**Step 21: Verify Monorepo Integration**
- Run `pnpm install` from root to link package
- Verify `pnpm list | grep knowledge-base` shows package
- Run `pnpm build` from root (should include new package)
- Run `pnpm lint` from root (should include new package)
- Run `pnpm check-types` from root (should include new package)
- Time estimate: 15 minutes

**Step 22: End-to-End Verification**
- Delete `.env` and restart Docker
- Follow README quickstart instructions
- Run `pnpm db:init`
- Run `pnpm test`
- Verify all smoke tests pass
- Document any issues in troubleshooting section
- Time estimate: 20 minutes

## Test Plan

### Smoke Tests (Automated)

| Test | Verification |
|------|--------------|
| Database Connection | `pg` client connects successfully |
| pgvector Extension | `SELECT extversion FROM pg_extension WHERE extname = 'vector'` returns version |
| Tables Exist | `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` includes both tables |
| Vector Index Exists | `SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_entries'` includes embedding index |
| Index Used | `EXPLAIN SELECT ... ORDER BY embedding <=> vector LIMIT 10` shows Index Scan |

### Manual Verification Steps

1. **Docker Compose Startup**: `docker-compose up -d` starts healthy container
2. **Migration Idempotency**: `pnpm db:migrate` can run multiple times without errors
3. **Seed Idempotency**: `pnpm db:seed` can run multiple times without duplicates
4. **Environment Validation**: `pnpm validate:env` fails with clear message when vars missing
5. **Drizzle Studio**: `pnpm db:studio` opens web UI for database inspection

### Error Case Tests

| Error Case | Expected Behavior |
|------------|-------------------|
| Docker not running | Clear error message referencing README troubleshooting |
| Wrong PostgreSQL image | Error when pgvector extension unavailable |
| Invalid credentials | Connection error with guidance to check `.env` |
| Port conflict | Docker error with guidance to change `KB_DB_PORT` |

## Stop Conditions / Blockers

### Potential Blockers

1. **pgvector Docker image unavailable**: If `pgvector/pgvector:0.5.1-pg16` is unavailable, fall back to `pgvector/pgvector:pg16` (latest) and document in README

2. **Drizzle pgvector support**: Drizzle ORM may require custom type definition for VECTOR columns. If Drizzle doesn't support VECTOR natively, implement custom column type using `customType`

3. **Port 5432 conflict**: Root docker-compose uses port 5432. Knowledge base should use 5433 by default to avoid conflict

4. **pnpm workspace not detecting package**: If `apps/api/*` glob isn't picking up the new package, may need to add explicit entry or adjust glob pattern

### Stop Conditions

- Stop if pgvector extension cannot be installed in Docker container
- Stop if Drizzle ORM cannot define VECTOR column type (escalate to architect)
- Stop if monorepo build fails with new package (investigate dependency conflicts)

## Architectural Decisions (Requiring User Confirmation)

### Decision 1: Package Location

**Options:**
- A) `apps/api/knowledge-base/` (as specified in story) - Treated as an API-level application/service
- B) `packages/backend/knowledge-base/` - Treated as a shared backend package

**Recommendation:** Option A (`apps/api/knowledge-base/`) as specified in the story. This positions the MCP server as a standalone service rather than a shared library. The package is already in the workspace via `apps/api/*` glob.

### Decision 2: Database Port

**Options:**
- A) Use port 5432 (standard PostgreSQL port) - May conflict with root docker-compose
- B) Use port 5433 (offset by 1) - Avoids conflict, explicit separation
- C) Use configurable port only (no default) - Requires user to always set port

**Recommendation:** Option B - Use 5433 as default. The root docker-compose already uses 5432 for the main monorepo database. Using 5433 provides clear separation between the main app database and knowledge base database.

### Decision 3: Drizzle Custom Type for VECTOR

**Options:**
- A) Use raw SQL in migrations for VECTOR columns, use `text` placeholder in Drizzle schema
- B) Implement custom Drizzle column type using `customType` helper
- C) Use existing community pgvector-drizzle package if available

**Recommendation:** Option B - Implement custom type. This provides type safety and integrates cleanly with Drizzle's query builder. The custom type can serialize/deserialize float arrays to pgvector format.

### Decision 4: Migration Approach

**Options:**
- A) Use Drizzle Kit migrations only (`drizzle-kit generate`, `drizzle-kit migrate`)
- B) Use raw SQL migrations (manual SQL files)
- C) Hybrid: Drizzle for schema, raw SQL for pgvector extension

**Recommendation:** Option C - Hybrid approach. Use Drizzle Kit for generating migrations from schema, but manually prepend `CREATE EXTENSION IF NOT EXISTS vector;` to the initial migration. This leverages Drizzle's type safety while ensuring pgvector extension is properly installed.

### Decision 5: Package Name

**Options:**
- A) `@repo/knowledge-base` - Concise, follows @repo/search pattern
- B) `@repo/knowledge-base-mcp` - More descriptive, includes MCP
- C) `@repo/kb-mcp-server` - Abbreviated

**Recommendation:** Option A - `@repo/knowledge-base`. Follows existing naming convention (`@repo/search`, `@repo/db`). The "MCP" aspect is an implementation detail; the package is fundamentally a knowledge base.

---

## Summary

This implementation plan creates a production-ready knowledge base infrastructure package with:
- 22 discrete implementation steps across 7 phases
- Comprehensive smoke test coverage
- Clear documentation with quickstart guide
- 5 architectural decisions requiring user confirmation
- Integration with existing Drizzle ORM patterns
- Docker Compose setup avoiding port conflicts with existing infrastructure

**Estimated Total Time:** 6-8 hours of focused development

**Dependencies:** None (this is the first story in the epic)

**Blocks:** KNOW-002 (Embedding Client Implementation)
