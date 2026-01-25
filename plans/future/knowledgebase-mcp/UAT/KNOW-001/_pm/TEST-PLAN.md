# Test Plan - KNOW-001: Package Infrastructure Setup

## Scope Summary

**Endpoints touched:** None (infrastructure story)

**UI touched:** No

**Data/storage touched:** Yes
- PostgreSQL database with pgvector extension
- Docker Compose infrastructure
- Database schema creation

---

## Happy Path Tests

### Test 1: Docker Compose Startup
**Setup:**
- Clean environment (no existing containers)
- Docker Desktop running
- `.env` or `docker-compose.yml` configured with correct PostgreSQL credentials

**Action:**
```bash
cd apps/api/knowledge-base
docker-compose up -d
```

**Expected outcome:**
- PostgreSQL container starts successfully
- Container health check passes
- pgvector extension is available
- Database accepts connections on configured port

**Evidence:**
- `docker ps` shows running postgres container
- `docker logs <container>` shows "database system is ready to accept connections"
- Connection test succeeds: `psql -h localhost -U <user> -d <db> -c "SELECT version();"`
- pgvector extension verification: `psql -h localhost -U <user> -d <db> -c "SELECT * FROM pg_extension WHERE extname = 'vector';"`

---

### Test 2: Package Structure Creation
**Setup:**
- Monorepo root with pnpm workspace

**Action:**
```bash
mkdir -p apps/api/knowledge-base
cd apps/api/knowledge-base
pnpm init
```

**Expected outcome:**
- `package.json` created with correct name (`@repo/knowledge-base` or similar)
- TypeScript configuration present (`tsconfig.json`)
- Dependencies align with monorepo patterns (workspace protocol for internal deps)

**Evidence:**
- `package.json` exists with required fields
- `pnpm list` shows package in workspace
- `pnpm build` succeeds (once basic structure is in place)

---

### Test 3: Database Schema Creation
**Setup:**
- PostgreSQL container running from Test 1
- Migration tooling configured (e.g., Drizzle, raw SQL scripts)

**Action:**
```bash
pnpm db:migrate
# or
psql -h localhost -U <user> -d <db> -f schema.sql
```

**Expected outcome:**
- `knowledge_entries` table created with required columns:
  - `id` (UUID primary key)
  - `content` (TEXT)
  - `embedding` (VECTOR(1536))
  - `role` (TEXT or ENUM)
  - `tags` (TEXT[] or JSONB)
  - `created_at`, `updated_at` (TIMESTAMP)
- `embedding_cache` table created with required columns:
  - `content_hash` (TEXT primary key)
  - `embedding` (VECTOR(1536))
  - `created_at` (TIMESTAMP)
- pgvector index created on `knowledge_entries.embedding`

**Evidence:**
- `\dt` in psql shows both tables
- `\d knowledge_entries` shows correct schema
- `\d embedding_cache` shows correct schema
- `SELECT * FROM pg_indexes WHERE tablename = 'knowledge_entries';` shows vector index

---

### Test 4: Vitest Configuration
**Setup:**
- Package structure from Test 2

**Action:**
```bash
cd apps/api/knowledge-base
pnpm test
```

**Expected outcome:**
- Vitest runner executes
- Test discovery works (even if no tests exist yet)
- Configuration aligns with monorepo standards (e.g., coverage thresholds, setup files)

**Evidence:**
- `vitest.config.ts` exists
- `pnpm test` runs without configuration errors
- Sample test file (e.g., `__tests__/setup.test.ts`) passes

---

## Error Cases

### Error 1: Docker Compose Failure (Missing Image)
**Setup:**
- Invalid Docker image reference in `docker-compose.yml` (e.g., typo in image name)

**Action:**
```bash
docker-compose up -d
```

**Expected:**
- Clear error message indicating image pull failure
- Graceful failure without corrupting local environment

**Evidence:**
- `docker-compose up` logs show image pull error
- No orphaned containers or volumes
- Retry with corrected image succeeds

---

### Error 2: pgvector Extension Not Available
**Setup:**
- PostgreSQL image without pgvector extension (e.g., standard `postgres:16` instead of `pgvector/pgvector:pg16`)

**Action:**
```bash
docker-compose up -d
psql -h localhost -U <user> -d <db> -c "CREATE EXTENSION vector;"
```

**Expected:**
- Clear error: "extension 'vector' is not available"
- Documentation or README guides user to correct image

**Evidence:**
- Error message in psql output
- README includes troubleshooting section for pgvector setup
- Correct image resolves issue

---

### Error 3: Database Connection Failure
**Setup:**
- Incorrect credentials in `.env` or connection string
- PostgreSQL not running

**Action:**
```bash
pnpm db:migrate
```

**Expected:**
- Connection error with actionable message (e.g., "Could not connect to database at localhost:5432")
- No partial schema creation
- Retry with correct credentials succeeds

**Evidence:**
- Error logs show connection failure
- `SELECT * FROM pg_stat_activity;` shows no active connections from migration tool
- Schema remains unchanged until successful connection

---

### Error 4: Duplicate Package Name
**Setup:**
- Existing package with same name in monorepo

**Action:**
```bash
pnpm install
```

**Expected:**
- pnpm error indicating duplicate package name
- Clear guidance on resolving conflict

**Evidence:**
- `pnpm install` fails with descriptive error
- No partial package registration in workspace

---

## Edge Cases (Reasonable)

### Edge 1: Multiple pgvector Versions
**Setup:**
- Existing PostgreSQL instance with different pgvector version

**Action:**
- Start Docker Compose with `pgvector/pgvector:pg16`
- Attempt to create vector extension

**Expected:**
- Extension creation succeeds if versions compatible
- Clear error if incompatible
- Documentation specifies supported pgvector versions

**Evidence:**
- `SELECT * FROM pg_extension WHERE extname = 'vector';` shows version
- README documents version requirements

---

### Edge 2: Port Conflict
**Setup:**
- Another service already using PostgreSQL default port (5432)

**Action:**
```bash
docker-compose up -d
```

**Expected:**
- Docker Compose fails with port conflict error
- README documents how to customize port in `docker-compose.yml` or `.env`

**Evidence:**
- Error logs indicate port binding failure
- Changing port in config resolves issue

---

### Edge 3: Disk Space Exhaustion
**Setup:**
- Limited disk space for Docker volumes

**Action:**
```bash
docker-compose up -d
# Insert large dataset or many test entries
```

**Expected:**
- Graceful degradation (PostgreSQL errors on write)
- No data corruption
- Clear error messages

**Evidence:**
- PostgreSQL logs show disk space errors
- Data integrity maintained (transactions rollback on error)

---

### Edge 4: Schema Migration Re-run
**Setup:**
- Schema already created from previous run

**Action:**
```bash
pnpm db:migrate
```

**Expected:**
- Idempotent migration (no errors, no duplicate tables)
- OR migration tooling tracks applied migrations and skips duplicates

**Evidence:**
- Migration succeeds without errors
- `SELECT * FROM <migration_history>;` shows migration recorded once
- Schema remains unchanged

---

## Required Tooling Evidence

### Backend

**Database Setup Verification:**
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Verify pgvector extension
psql -h localhost -U kbuser -d knowledgebase -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Verify schema
psql -h localhost -U kbuser -d knowledgebase -c "\d knowledge_entries"
psql -h localhost -U kbuser -d knowledgebase -c "\d embedding_cache"
```

**Package Setup Verification:**
```bash
# Verify package in workspace
pnpm list | grep knowledge-base

# Verify TypeScript compilation
cd apps/api/knowledge-base
pnpm build

# Verify tests run
pnpm test
```

**Required Assertions:**
- PostgreSQL container health: `healthy` status
- pgvector version: >= 0.5.0 (or documented minimum)
- Tables exist with correct schemas (column names, types)
- Vitest runs without configuration errors

**No `.http` requests required** (this is infrastructure setup, no API endpoints yet)

---

### Frontend (if UI touched)

**Not applicable** - This story does not touch UI.

---

## Risks to Call Out

### Risk 1: pgvector Version Compatibility
**Concern:** Different pgvector versions may have incompatible index syntax or vector operations.

**Mitigation:**
- Pin specific pgvector Docker image version in `docker-compose.yml`
- Document version requirements in README
- Test with pinned version before deployment

---

### Risk 2: Docker Compose vs Production Deployment
**Concern:** Local Docker Compose setup may differ from production RDS/Aurora configuration.

**Mitigation:**
- Document production deployment differences in README
- Ensure schema is compatible with RDS PostgreSQL
- Test pgvector extension installation on RDS instance before go-live

---

### Risk 3: Missing Environment Variables
**Concern:** `.env` file not included in repo (gitignored), developers may not know what variables are required.

**Mitigation:**
- Provide `.env.example` with all required variables
- README includes setup instructions referencing `.env.example`
- CI/CD pipeline validates required env vars before deployment

---

### Risk 4: Migration Tooling Choice
**Concern:** If migration tooling (Drizzle vs raw SQL) is undecided, this blocks schema creation.

**Mitigation:**
- **Decision required:** Choose migration approach before implementation
- Options: Drizzle (preferred if already in use), raw SQL scripts, TypeORM
- Document choice in story or architectural decision record (ADR)

---

### Risk 5: Test Coverage for Infrastructure
**Concern:** Infrastructure tests may be harder to write (requires Docker, DB connection).

**Mitigation:**
- Use Testcontainers for spinning up PostgreSQL in tests
- OR document manual verification steps if automated tests are too complex
- Vitest configuration should support integration tests with real DB

---

## Notes for QA

- This story is primarily **setup and configuration**, not feature logic.
- Focus verification on:
  - Docker Compose reliability (can start/stop/restart cleanly)
  - Schema correctness (matches documented requirements)
  - Package integration with monorepo tooling (builds, tests, lints)
- Evidence should include:
  - Screenshots or logs of successful Docker startup
  - Database schema dumps showing tables and indexes
  - `pnpm test` output showing Vitest configuration works
