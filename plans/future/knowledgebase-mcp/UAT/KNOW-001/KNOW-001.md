---
story_id: KNOW-001
title: Package Infrastructure Setup
status: uat
epic: knowledgebase-mcp
created: 2026-01-25
updated: 2026-01-25
depends_on: []
blocks: [KNOW-002]
assignee: null
priority: P0
story_points: 3
tags: [infrastructure, setup, docker, postgresql, pgvector]
elaboration_verdict: CONDITIONAL PASS
elaboration_date: 2026-01-25
---

# KNOW-001: Package Infrastructure Setup

## Context

The Knowledge Base MCP Server requires foundational infrastructure before any feature development can begin. This story establishes the package structure, database setup, and testing configuration that all subsequent stories will build upon.

This is the first story in the Knowledge Base epic and has no dependencies. All future stories (KNOW-002 through KNOW-024) depend on this infrastructure being complete and correct.

## Goal

Establish a production-ready package infrastructure for the Knowledge Base MCP server, including:
- New package structure in the monorepo (`apps/api/knowledge-base/`)
- Docker Compose setup with PostgreSQL and pgvector extension
- Database schema for knowledge entries and embedding cache
- Vitest test configuration aligned with monorepo standards
- Comprehensive documentation for developer onboarding

## Non-Goals

- **Production deployment infrastructure** - RDS/Aurora setup is deferred to KNOW-011, KNOW-015, KNOW-017
- **MCP server implementation** - Tool definitions and handlers are in KNOW-005
- **Embedding generation** - OpenAI client is in KNOW-002
- **CRUD operations** - Business logic is in KNOW-003
- **Search functionality** - Semantic/keyword search is in KNOW-004
- **Performance tuning** - Index optimization is deferred to KNOW-007
- **Admin UI** - Optional dashboards are deferred to KNOW-023, KNOW-024

## Scope

### Packages Affected

**New package:**
- `apps/api/knowledge-base/` - MCP server package (new)

**Potentially modified:**
- `pnpm-workspace.yaml` - Add `apps/api/*` pattern if not present
- `turbo.json` - Add build pipeline for new package
- Root-level documentation - Reference new MCP server

### Endpoints

**None** - This is infrastructure setup; no API endpoints are exposed in this story.

### Infrastructure

**New:**
- Docker Compose configuration with `pgvector/pgvector:pg16`
- PostgreSQL database with pgvector extension
- Database schema (2 tables: `knowledge_entries`, `embedding_cache`)
- Vitest test configuration

**Environment variables required:**
- `KB_DB_HOST` - Database host (default: `localhost`)
- `KB_DB_PORT` - Database port (default: `5432`)
- `KB_DB_NAME` - Database name (default: `knowledgebase`)
- `KB_DB_USER` - Database user (default: `kbuser`)
- `KB_DB_PASSWORD` - Database password (local development only)

## Acceptance Criteria

### AC1: Package Structure Created
- [ ] Directory `apps/api/knowledge-base/` exists
- [ ] `package.json` with name `@repo/knowledge-base` (or similar)
- [ ] `tsconfig.json` configured with monorepo references
- [ ] `vitest.config.ts` configured with coverage thresholds
- [ ] `.env.example` with all required environment variables documented
- [ ] `README.md` with setup, verification, and troubleshooting sections
- [ ] Package appears in `pnpm list` output
- [ ] Root-level `pnpm build` includes new package

### AC2: Docker Compose Setup
- [ ] `docker-compose.yml` exists at `apps/api/knowledge-base/docker-compose.yml`
- [ ] File uses `pgvector/pgvector:pg16` image (version pinned, e.g., `pgvector/pgvector:0.5.1-pg16`)
- [ ] PostgreSQL container starts successfully with `docker-compose up -d`
- [ ] Container health check passes within 30 seconds
- [ ] Port customizable via `KB_DB_PORT` environment variable
- [ ] Database accepts connections on configured port
- [ ] Named volume defined for PostgreSQL data persistence across container restarts
- [ ] `docker ps` shows running PostgreSQL container with healthy status

### AC3: pgvector Extension Available
- [ ] pgvector extension version >= 0.5.0 installed
- [ ] Extension verified with: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- [ ] Vector operations supported (e.g., `SELECT '[1,2,3]'::vector;`)
- [ ] README documents pgvector version requirements

### AC4: Database Schema Created
- [ ] Reuse existing Drizzle ORM setup from `apps/api/drizzle.config.ts`
- [ ] Database connection patterns follow existing monorepo Drizzle conventions
- [ ] Migrations are idempotent (can run multiple times without errors)
- [ ] Migration files include comment documenting VECTOR(1536) dimension requirement tied to OpenAI text-embedding-3-small model
- [ ] `knowledge_entries` table exists with columns:
  - `id` UUID PRIMARY KEY
  - `content` TEXT NOT NULL
  - `embedding` VECTOR(1536) NOT NULL
  - `role` TEXT NOT NULL (or ENUM with values: pm, dev, qa, all)
  - `tags` TEXT[] or JSONB
  - `created_at` TIMESTAMP DEFAULT NOW()
  - `updated_at` TIMESTAMP DEFAULT NOW()
- [ ] `embedding_cache` table exists with columns:
  - `content_hash` TEXT PRIMARY KEY
  - `embedding` VECTOR(1536) NOT NULL
  - `created_at` TIMESTAMP DEFAULT NOW()
- [ ] IVFFlat index created on `knowledge_entries.embedding` with `lists=100`
- [ ] Index verified with `EXPLAIN SELECT ... ORDER BY embedding <=> '[...]'::vector LIMIT 10;` showing index scan (not seq scan)
- [ ] Schema verified with `\d knowledge_entries` and `\d embedding_cache`
- [ ] Connection pooling configured with documented max connections and idle timeout for serverless Lambda context

### AC5: Vitest Configuration
- [ ] `vitest.config.ts` exists and is valid
- [ ] `pnpm test` runs without configuration errors
- [ ] Smoke test exists that verifies all of:
  - (1) Database connection succeeds with configured credentials
  - (2) pgvector extension is available: `SELECT extversion FROM pg_extension WHERE extname = 'vector'`
  - (3) Both tables exist: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('knowledge_entries', 'embedding_cache')`
  - (4) Vector index exists: `SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_entries' AND indexname LIKE '%embedding%'`
- [ ] Test coverage aligns with monorepo standards (minimum 45% global)
- [ ] Documentation specifies manual Docker Compose setup for development; Testcontainers deferred to follow-up story KNOW-099

### AC6: Documentation Complete
- [ ] README includes:
  - Prerequisites (Docker, pnpm, PostgreSQL client tools)
  - Setup instructions (step-by-step, executable)
  - Verification steps (how to confirm setup is correct)
  - Troubleshooting section (common errors and solutions)
  - Architecture overview (brief description of MCP, pgvector, purpose)
- [ ] `.env.example` includes all required variables with comments
- [ ] Migration tool choice documented in README or ADR
- [ ] pgvector version requirements documented

### AC7: Monorepo Integration
- [ ] Package builds successfully with `pnpm build` from package root
- [ ] Root-level `pnpm lint` includes new package
- [ ] Root-level `pnpm check-types` includes new package
- [ ] Root-level `pnpm test` includes new package
- [ ] No breaking changes to existing packages

### AC8: Error Handling
- [ ] Clear error if Docker is not running
- [ ] Clear error if wrong PostgreSQL image is used (missing pgvector)
- [ ] Clear error if database connection fails (invalid credentials, port conflict)
- [ ] All errors include actionable guidance (reference README troubleshooting)

### AC9: Database Initialization Script (Enhancement from QA Discovery)
- [ ] `pnpm db:init` script exists that combines all setup steps
- [ ] Script: `docker-compose up -d` + wait-for-healthy + migration
- [ ] Single command completes full local setup without manual intervention
- [ ] Script provides clear status output at each step
- [ ] Script fails fast with actionable errors if any step fails

### AC10: README Quickstart Section (Enhancement from QA Discovery)
- [ ] README has prominent "Quick Start" section at top
- [ ] Quickstart provides "30-second setup" instructions
- [ ] Structure: Quickstart → Prerequisites → Architecture → Detailed Setup → Troubleshooting
- [ ] Quickstart references and links to detailed sections for context
- [ ] All code examples in Quickstart are copy-paste executable

### AC11: Drizzle Studio Integration (Enhancement from QA Discovery)
- [ ] `pnpm db:studio` script added to package.json
- [ ] Script launches Drizzle Studio for web-based database inspection
- [ ] Documentation explains how to use Drizzle Studio for schema verification
- [ ] Drizzle config references existing `apps/api/drizzle.config.ts` pattern

### AC12: Environment Variable Validation (Enhancement from QA Discovery)
- [ ] `pnpm validate:env` script added to package.json
- [ ] Script checks all required `KB_DB_*` variables are set before operations
- [ ] Script provides clear error message listing missing variables
- [ ] Script is called by README setup instructions before running migrations
- [ ] Script prevents cryptic "connection failed" errors from bad env setup

### AC13: Development Database Seeding (Enhancement from QA Discovery)
- [ ] `pnpm db:seed` script populates sample knowledge entries for manual testing
- [ ] Seed script creates 3-5 realistic sample entries with embeddings
- [ ] Seed data is separate from production data seeding (KNOW-006)
- [ ] Seed is idempotent (can re-run without duplicates)
- [ ] README documents when/how to use seed script

### AC14: pgvector Version Pinning and Documentation (Enhancement from QA Discovery)
- [ ] Docker image tag specifies exact version: `pgvector/pgvector:0.5.1-pg16` (not `:pg16`)
- [ ] README documents pgvector version requirement and reason
- [ ] VECTOR(1536) dimension documented as tied to OpenAI text-embedding-3-small model
- [ ] Migration comments document model-to-dimension mapping for future reference
- [ ] README includes troubleshooting section for dimension mismatch errors

### AC15: Schema Analysis and Index Verification (Enhancement from QA Discovery)
- [ ] README includes optional `pnpm db:analyze` script for running PostgreSQL ANALYZE
- [ ] Documentation explains when to run ANALYZE (after bulk imports in KNOW-006)
- [ ] Smoke test includes EXPLAIN plan verification showing vector index is used
- [ ] README documents how to read EXPLAIN output to verify index usage
- [ ] Troubleshooting section includes guidance if index is not being used

### AC16: Rollback and Recovery Procedures (Enhancement from QA Discovery)
- [ ] README includes rollback procedure if schema migration fails
- [ ] Documentation explains how to reset database to previous state
- [ ] Script or commands provided for common rollback scenarios
- [ ] Error messages in migration output reference rollback section in README
- [ ] Documentation explains connection pool cleanup after rollback

## Reuse Plan

### Existing Patterns to Follow

**Package structure:**
- Reference existing `apps/api/*` packages for structure (if any exist)
- Follow monorepo TypeScript configuration patterns
- Align Vitest configuration with other packages

**Docker Compose:**
- Follow patterns from existing Docker Compose files in monorepo (if any)
- Use consistent environment variable naming conventions

**Database migrations:**
- If Drizzle is already in use in monorepo, use Drizzle for consistency
- If not, use raw SQL migrations for simplicity

### New Components

**New:**
- pgvector extension integration (first use in this monorepo)
- MCP server package structure (new pattern, will be reused for future MCP servers)

## Architecture Notes

### Ports & Adapters

**Infrastructure Layer:**
- Docker Compose manages PostgreSQL container lifecycle
- Database schema defines data storage contracts
- Environment variables provide configuration abstraction

**Repository Layer (future):**
- Future stories will implement repository pattern for database access
- Schema created in this story defines the contracts repositories will implement

**MCP Layer (future):**
- MCP server (KNOW-005) will consume database through repositories
- This story establishes the data layer that MCP tools will query

### Design Decisions

#### Migration Tooling
**Decision:** Use Drizzle ORM if already present in monorepo; otherwise use raw SQL.

**Rationale:**
- Drizzle provides type-safe schema definitions and migration tracking
- Raw SQL is simpler for basic schemas and avoids new dependencies
- Consistency with existing patterns is prioritized

**Implementation:** Developer should check for existing Drizzle usage and document choice in README.

#### Vector Index Configuration
**Decision:** Use IVFFlat index with `lists=100` parameter.

**Rationale:**
- IVFFlat is the default pgvector index type, well-documented and battle-tested
- `lists=100` is suitable for datasets up to ~10k entries (initial scale)
- Performance tuning will be addressed in KNOW-007 with realistic load testing
- Simple to implement and understand

**Query pattern:**
```sql
-- Index creation
CREATE INDEX knowledge_entries_embedding_idx
ON knowledge_entries
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

#### Database Naming Conventions
**Decision:**
- Database name: `knowledgebase`
- User: `kbuser`
- Password: `kbpassword` (local development only, NOT for production)
- Port: `5432` (customizable via `KB_DB_PORT`)

**Rationale:** Clear, descriptive names that follow PostgreSQL conventions.

## Infrastructure Notes

### Local Development

**Prerequisites:**
- Docker Desktop (or equivalent container runtime)
- pnpm 8.x or higher
- PostgreSQL client tools (optional, for manual verification)

**Setup flow:**
1. Copy `.env.example` to `.env`
2. Run `docker-compose up -d` to start PostgreSQL
3. Run migrations: `pnpm db:migrate`
4. Verify schema: `pnpm db:verify` (or manual `psql` commands)

### CI/CD Considerations

**GitHub Actions (or equivalent):**
- Docker must be available in CI environment
- Consider using Testcontainers for integration tests
- OR document manual database setup for CI (less ideal)

**Environment variables:**
- CI pipeline must provide all required `KB_DB_*` variables
- Use GitHub Secrets for sensitive values in CI

### Production Deployment (Future)

**Out of scope for this story**, but documented here for future reference:
- RDS PostgreSQL with pgvector extension (KNOW-011, KNOW-017)
- Schema migration as part of deployment pipeline
- Backup/restore procedures (KNOW-015)
- CloudWatch monitoring (KNOW-016)

## HTTP Contract Plan

**Not applicable** - This story does not expose any HTTP endpoints.

MCP tools will be defined in KNOW-005, but they use the MCP protocol (stdio), not HTTP.

## Seed Requirements

**Not applicable** - Data seeding is deferred to KNOW-006 (Parsers and Seeding).

This story establishes an empty database schema. Initial data import will happen in KNOW-006 using:
- Parsers to extract knowledge from markdown files
- YAML intermediate format
- Bulk import script

## Test Plan

> Synthesized from `_pm/TEST-PLAN.md`

### Scope Summary

- **Endpoints touched:** None (infrastructure story)
- **UI touched:** No
- **Data/storage touched:** Yes (PostgreSQL, pgvector, schema creation)

### Happy Path Tests

#### Test 1: Docker Compose Startup
**Setup:** Clean environment, Docker running, `.env` configured

**Action:**
```bash
cd apps/api/knowledge-base
docker-compose up -d
```

**Expected:**
- PostgreSQL container starts successfully
- Health check passes
- pgvector extension available
- Database accepts connections

**Evidence:**
- `docker ps` shows running container
- `docker logs <container>` shows "ready to accept connections"
- `psql` connection succeeds
- pgvector extension verified: `SELECT * FROM pg_extension WHERE extname = 'vector';`

#### Test 2: Package Structure Creation
**Setup:** Monorepo root with pnpm workspace

**Action:**
```bash
mkdir -p apps/api/knowledge-base
cd apps/api/knowledge-base
pnpm init
```

**Expected:**
- `package.json` created with correct name
- TypeScript configuration present
- Package appears in `pnpm list`

**Evidence:**
- `package.json` exists with required fields
- `pnpm build` succeeds

#### Test 3: Database Schema Creation
**Setup:** PostgreSQL running, migration tooling configured

**Action:**
```bash
pnpm db:migrate
```

**Expected:**
- `knowledge_entries` table created with correct schema
- `embedding_cache` table created with correct schema
- pgvector index created on embeddings

**Evidence:**
- `\dt` shows both tables
- `\d knowledge_entries` and `\d embedding_cache` show correct schemas
- `SELECT * FROM pg_indexes WHERE tablename = 'knowledge_entries';` shows vector index

#### Test 4: Vitest Configuration
**Setup:** Package structure from Test 2

**Action:**
```bash
pnpm test
```

**Expected:**
- Vitest runner executes
- Test discovery works
- Sample smoke test passes

**Evidence:**
- `vitest.config.ts` exists
- `pnpm test` runs without errors

### Error Cases

#### Error 1: Docker Compose Failure (Missing Image)
**Setup:** Invalid Docker image reference

**Expected:** Clear error message, graceful failure

**Evidence:** Error logs show image pull failure, no orphaned containers

#### Error 2: pgvector Extension Not Available
**Setup:** Wrong PostgreSQL image (standard `postgres:16` instead of `pgvector/pgvector:pg16`)

**Expected:** Clear error with troubleshooting guidance in README

**Evidence:** Error message references README troubleshooting section

#### Error 3: Database Connection Failure
**Setup:** Incorrect credentials or PostgreSQL not running

**Expected:** Connection error with actionable message, no partial schema creation

**Evidence:** Error logs show connection failure, schema unchanged

#### Error 4: Duplicate Package Name
**Setup:** Existing package with same name

**Expected:** pnpm error with clear guidance

**Evidence:** `pnpm install` fails with descriptive error

### Edge Cases

#### Edge 1: Port Conflict
**Setup:** Port 5432 already in use

**Expected:** Docker Compose fails with clear error, README documents port customization

**Evidence:** Error indicates port binding failure, changing `KB_DB_PORT` resolves issue

#### Edge 2: Schema Migration Re-run
**Setup:** Schema already created

**Expected:** Idempotent migration (no errors, no duplicates)

**Evidence:** Migration succeeds, schema unchanged

#### Edge 3: Disk Space Exhaustion
**Setup:** Limited disk space for Docker volumes

**Expected:** Graceful degradation, no data corruption

**Evidence:** PostgreSQL logs show disk space errors, transactions rollback

### Required Tooling Evidence

**Database verification:**
```bash
docker ps | grep postgres
psql -h localhost -U kbuser -d knowledgebase -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
psql -h localhost -U kbuser -d knowledgebase -c "\d knowledge_entries"
```

**Package verification:**
```bash
pnpm list | grep knowledge-base
cd apps/api/knowledge-base && pnpm build
pnpm test
```

**Required assertions:**
- PostgreSQL container health: `healthy` status
- pgvector version: >= 0.5.0
- Tables exist with correct schemas
- Vitest runs without configuration errors

### Risks

#### Risk 1: pgvector Version Compatibility
**Mitigation:** Pin specific Docker image version, document requirements in README

#### Risk 2: Docker Compose vs Production Deployment
**Mitigation:** Document production differences, ensure schema is RDS-compatible

#### Risk 3: Missing Environment Variables
**Mitigation:** Provide `.env.example` with all variables, reference in README

#### Risk 4: Migration Tooling Choice
**Mitigation:** Choose Drizzle or raw SQL before implementation, document in story

#### Risk 5: Test Coverage for Infrastructure
**Mitigation:** Use Testcontainers OR document manual verification steps

## UI/UX Notes

> Synthesized from `_pm/UIUX-NOTES.md`

**SKIPPED** - This story does not touch any UI components. It is purely backend infrastructure work (Docker, database, package setup).

UI/UX review will be applicable for future stories that involve:
- Optional admin dashboard (KNOW-023, KNOW-024)
- Search debugging UI (if implemented)

## Dev Feasibility Review

> Synthesized from `_pm/DEV-FEASIBILITY.md`

**Feasible:** Yes
**Confidence:** High

### Key Findings

**Likely change surface:**
- New package: `apps/api/knowledge-base/`
- Root-level: `pnpm-workspace.yaml`, `turbo.json`
- No endpoint changes (infrastructure only)

**Top risks:**
1. **pgvector extension installation** - Requires specific Docker image
2. **Environment variable management** - Must provide clear `.env.example`
3. **Port conflicts** - Default port 5432 may be in use
4. **Schema migration tooling** - Drizzle vs raw SQL must be decided
5. **Docker dependency** - Requires Docker Desktop on all developer machines

**Scope tightening suggestions:**
- Defer production deployment to later stories (KNOW-011, KNOW-015, KNOW-017)
- Minimal schema (defer advanced features like audit logging, soft deletes)
- Explicit migration tool decision (blocking decision)

**Missing requirements:**
- Migration tooling choice (Drizzle vs raw SQL) - **BLOCKING DECISION**
- Database naming conventions (db name, user, password)
- Vector index type and parameters (recommend IVFFlat with `lists=100`)
- Test coverage expectations (smoke test minimum)
- README structure and contents

**Recommendations for implementation:**
1. Choose Drizzle if already in monorepo; otherwise raw SQL
2. Use database config: `knowledgebase` db, `kbuser` user, `5432` port
3. Use IVFFlat index with `lists=100` parameter
4. Include smoke test that verifies schema exists
5. Provide comprehensive README with troubleshooting section

## Implementation Notes

### Pre-Implementation Decisions Required

**BLOCKING DECISIONS:**
1. **Migration tooling:** Drizzle vs raw SQL
   - Recommendation: Check for existing Drizzle usage; default to raw SQL if none
2. **Test strategy:** Testcontainers vs manual setup
   - Recommendation: Document manual setup initially; Testcontainers as enhancement

### Implementation Order

1. **Package scaffolding** (30 min)
   - Create directory structure
   - Initialize `package.json`, `tsconfig.json`
   - Update `pnpm-workspace.yaml` if needed

2. **Docker Compose setup** (45 min)
   - Create `docker-compose.yml` with `pgvector/pgvector:pg16`
   - Create `.env.example` with all variables
   - Test startup and verify pgvector extension

3. **Database schema** (1-2 hours)
   - Choose migration tooling (Drizzle or raw SQL)
   - Define schema for `knowledge_entries` and `embedding_cache`
   - Create IVFFlat index with `lists=100`
   - Verify schema with `psql`

4. **Vitest configuration** (30 min)
   - Create `vitest.config.ts`
   - Add smoke test for database connection and schema verification
   - Verify `pnpm test` runs without errors

5. **Documentation** (1-2 hours)
   - Write README with prerequisites, setup, verification, troubleshooting
   - Document migration tool choice and rationale
   - Document pgvector version requirements
   - Add inline comments for index configuration

6. **Integration verification** (30 min)
   - Verify package appears in `pnpm list`
   - Verify root-level `pnpm build`, `pnpm lint`, `pnpm check-types` work
   - Test fresh environment setup (delete `.env`, restart Docker, re-run setup)

### Estimated Effort

**Story points:** 3 (approximately 4-6 hours of focused development)

**Breakdown:**
- Package setup: 0.5 points
- Docker and schema: 1.5 points
- Testing and verification: 0.5 points
- Documentation: 0.5 points

### Success Criteria Summary

A developer with no prior knowledge of the Knowledge Base MCP server should be able to:
1. Clone the repo
2. Follow README instructions
3. Run `docker-compose up -d` and `pnpm db:migrate`
4. Verify schema with provided commands
5. Run `pnpm test` successfully
6. Understand the purpose and architecture from README

If any step fails, error messages should reference README troubleshooting section.

---

## Related Stories

**Blocks:** KNOW-002 (Embedding Client Implementation)
**Depends on:** None (first story in epic)

**Related:**
- KNOW-011: Secrets Management (production env vars)
- KNOW-015: Disaster Recovery (backup/restore procedures)
- KNOW-016: PostgreSQL Monitoring (CloudWatch dashboards)
- KNOW-017: Data Encryption (RDS encryption at rest)

---

## Notes

- This is a **foundational story** - all subsequent stories depend on this infrastructure being complete and correct
- Focus on developer experience: clear documentation, helpful error messages, easy setup
- Production deployment is explicitly out of scope; focus on local development
- Migration tooling choice must be made before implementation begins
- README is a first-class deliverable; allocate sufficient time for comprehensive documentation

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Required Fixes Applied During Elaboration

| # | Issue | Fix Applied | Impact |
|---|-------|------------|--------|
| 1 | Drizzle reuse not explicit | AC4 now requires reusing existing `apps/api/drizzle.config.ts` setup | Ensures consistency with monorepo patterns |
| 2 | Missing docker-compose location | AC2 now specifies `apps/api/knowledge-base/docker-compose.yml` | Clarifies package-local infrastructure structure |
| 3 | No explicit smoke test criteria | AC5 now lists all four verification requirements | Ensures comprehensive infrastructure validation |

### Gaps Identified and Accepted as New Acceptance Criteria

| # | Finding | New AC | Impact |
|---|---------|--------|--------|
| 1 | No database initialization script | AC9 | Single command setup reduces onboarding friction |
| 2 | No vector dimension validation | AC14 | Prevents runtime failures from model mismatches |
| 3 | No index EXPLAIN plan verification | AC15 | Ensures pgvector indexes are actually being used |
| 4 | Missing connection pool configuration | AC4 (updated) | Critical for serverless Lambda context |
| 5 | No rollback procedure | AC16 | Provides safe recovery path if migrations fail |
| 6 | Missing Docker volume management | AC2 (updated) | Ensures data persistence across container restarts |
| 7 | No healthcheck endpoint documentation | Architecture Notes | Documented for KNOW-005 MCP server story |
| 8 | Testcontainers vs manual setup not decided | AC5 (updated) | Specified manual Docker Compose with deferred Testcontainers |

### Enhancement Opportunities Accepted

| # | Finding | New AC | Impact |
|---|---------|--------|--------|
| 1 | Drizzle Studio integration | AC11 | Improved developer experience for database inspection |
| 2 | Database seeding for development | AC13 | Better local testing without waiting for production seeds |
| 3 | Pre-commit hook for schema validation | Architecture Notes | Can be implemented when CI/CD pipeline stabilizes |
| 4 | Docker Compose profiles | Out-of-Scope | Deferred until full CI/CD design is finalized |
| 5 | README quickstart section | AC10 | Developers get "30-second setup" before detailed docs |
| 6 | pgvector extension version pinning | AC14 | Reproducibility across development environments |
| 7 | Automated index statistics documentation | AC15 | Documents ANALYZE usage for bulk imports (KNOW-006) |
| 8 | Environment variable validation script | AC12 | Prevents cryptic connection errors from bad env setup |

### Follow-up Stories Suggested

- [ ] **KNOW-099**: Testcontainers Integration - Allow running integration tests without manual Docker setup. Estimate: 2 pts.
- [ ] **KNOW-100**: CI/CD Database Pipeline - GitHub Actions workflow for running migrations in CI with proper cleanup. Estimate: 3 pts.
- [ ] **KNOW-101**: Production Schema Migration Strategy - Document schema migration strategy for RDS Aurora with rollback procedures. Estimate: 3 pts.

### Items Marked Out-of-Scope

- **Docker Compose profiles**: CI-specific configuration can be added when the full CI/CD pipeline is designed. Current setup is adequate for local development and basic manual testing.
- **Pre-commit hook for schema validation**: Can be added to the pre-commit configuration once CI/CD pipeline is more stable.

### Acceptance Criteria Summary

**Total AC: 16** (8 core + 8 enhancements)

**Key milestones:**
1. AC1-8: Core infrastructure (package, Docker, schema, testing, docs, integration, error handling)
2. AC9-12: Developer experience enhancements (initialization, quickstart, studio, validation)
3. AC13-16: Advanced capabilities (seeding, version pinning, index verification, rollback)
