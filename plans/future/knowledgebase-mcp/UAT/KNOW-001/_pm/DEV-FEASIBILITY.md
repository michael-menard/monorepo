# Dev Feasibility Review - KNOW-001: Package Infrastructure Setup

## Feasibility Summary

**Feasible:** Yes

**Confidence:** High

**Why:**
This is a foundational infrastructure story that follows well-established patterns in the monorepo. The tasks (Docker Compose setup, package scaffolding, database schema creation, Vitest configuration) are all standard practices with clear examples in the existing codebase. The pgvector extension is well-documented and stable. Risk is primarily around developer environment setup and documentation clarity, not technical feasibility.

---

## Likely Change Surface

### Areas/Packages Likely Impacted

**New package creation:**
- `apps/api/knowledge-base/` - New MCP server package
  - `package.json` - Package metadata, dependencies
  - `tsconfig.json` - TypeScript configuration
  - `vitest.config.ts` - Test configuration
  - `docker-compose.yml` - PostgreSQL + pgvector container definition
  - `.env.example` - Environment variable template
  - `README.md` - Setup and usage instructions
  - `src/db/schema.sql` or `drizzle/schema.ts` - Database schema definition

**Root-level changes:**
- `pnpm-workspace.yaml` - May need to add `apps/api/*` pattern if not already present
- `turbo.json` - May need to add build pipeline for new package

**Documentation:**
- Project-level documentation may reference new MCP server setup

### Endpoints Likely Impacted

**None** - This is infrastructure setup; no API endpoints are exposed yet.

### Migration/Deploy Touchpoints

**Local development:**
- Developers will need to run `docker-compose up -d` to start PostgreSQL locally
- Initial schema migration will need to be run once

**CI/CD considerations:**
- May need to add Docker/PostgreSQL setup to CI pipeline if integration tests require real database
- OR use Testcontainers to spin up PostgreSQL during test runs

**Production deployment (future):**
- Will eventually require RDS PostgreSQL instance with pgvector extension
- Schema migration will need to run as part of deployment pipeline
- Not blocking for this story (local development only)

---

## Risk Register (Top 5–10)

### Risk 1: pgvector Extension Installation
**Why it's risky:**
- pgvector is not included in standard PostgreSQL images
- Requires specific Docker image (`pgvector/pgvector:pg16`)
- Developers unfamiliar with pgvector may use wrong image and encounter cryptic errors

**Mitigation PM should bake into AC or testing plan:**
- **AC:** README MUST include explicit Docker image requirement (`pgvector/pgvector:pg16`)
- **AC:** Include verification step to confirm pgvector extension is available
- **Testing:** Add error case for missing pgvector extension with troubleshooting guidance

---

### Risk 2: Environment Variable Management
**Why it's risky:**
- `.env` files are gitignored; new developers won't have them
- Missing or incorrect env vars can cause silent failures or confusing errors
- Database credentials, ports, and database names need to be consistent across setup

**Mitigation PM should bake into AC or testing plan:**
- **AC:** Provide `.env.example` with ALL required variables and example values
- **AC:** README MUST reference `.env.example` in setup instructions
- **Testing:** Validate that missing env vars produce clear error messages (not silent failures)

---

### Risk 3: Port Conflicts
**Why it's risky:**
- Default PostgreSQL port (5432) may already be in use by other projects or local installations
- Docker Compose will fail to bind port without clear guidance on resolution

**Mitigation PM should bake into AC or testing plan:**
- **AC:** Allow port customization via environment variable (e.g., `KB_DB_PORT=5433`)
- **AC:** README includes troubleshooting section for port conflicts
- **Testing:** Document edge case for port conflict and resolution steps

---

### Risk 4: Schema Migration Tooling Ambiguity
**Why it's risky:**
- Story doesn't specify migration tool (Drizzle vs raw SQL vs TypeORM)
- Different tools have different trade-offs (type safety, complexity, ecosystem fit)
- Choosing wrong tool could lead to refactoring later

**Mitigation PM should bake into AC or testing plan:**
- **AC:** PM MUST decide on migration tooling and document in story (blocking decision)
- **Recommendation:** Use Drizzle if already in monorepo (consistency); otherwise raw SQL (simplicity)
- **AC:** Migrations MUST be idempotent (can run multiple times without errors)

---

### Risk 5: Docker Dependency for Development
**Why it's risky:**
- Requires Docker Desktop or equivalent on all developer machines
- Docker setup can be resource-intensive (RAM, disk space)
- Some developers may not have Docker installed or may be unfamiliar

**Mitigation PM should bake into AC or testing plan:**
- **AC:** README MUST include Docker as prerequisite
- **AC:** Provide lightweight alternative for developers without Docker (e.g., connect to remote PostgreSQL instance)
- **Testing:** Validate that error messages are clear if Docker is not running

---

### Risk 6: Vector Index Configuration
**Why it's risky:**
- pgvector indexes (IVFFlat) require tuning parameters (e.g., `lists`)
- Incorrect parameters can lead to poor search performance or index build failures
- Optimal parameters depend on dataset size (unknown at setup time)

**Mitigation PM should bake into AC or testing plan:**
- **AC:** Use conservative default index parameters (e.g., `lists=100` for IVFFlat)
- **AC:** Document index tuning in README or inline comments
- **Out of scope:** Performance tuning will be addressed in later stories (KNOW-007)

---

### Risk 7: Test Coverage for Infrastructure
**Why it's risky:**
- Infrastructure tests require real database connection (can't be fully mocked)
- Setting up test database in CI may be complex
- Balance between automated tests and manual verification is unclear

**Mitigation PM should bake into AC or testing plan:**
- **AC:** Vitest configuration MUST support integration tests with real database
- **Recommendation:** Use Testcontainers to spin up PostgreSQL in tests (OR document manual verification)
- **AC:** At minimum, include smoke test that connects to database and verifies schema

---

### Risk 8: Database Schema Evolution
**Why it's risky:**
- Future stories will add/modify schema (e.g., new columns, indexes)
- If initial schema isn't versioned or migration-tracked, evolution becomes painful
- Risk of schema drift between developers or environments

**Mitigation PM should bake into AC or testing plan:**
- **AC:** Schema MUST be versioned (via migration tool or manual versioning)
- **AC:** Include migration rollback strategy (or document "no rollbacks, forward-only")
- **Out of scope:** Advanced migration features (down migrations, seeding) can be deferred

---

### Risk 9: Monorepo Integration
**Why it's risky:**
- New package must integrate with existing monorepo tooling (Turborepo, pnpm workspaces)
- Build pipelines, linting, type-checking need to work across all packages
- Misconfiguration can break CI or other packages

**Mitigation PM should bake into AC or testing plan:**
- **AC:** Package MUST appear in `pnpm list` after setup
- **AC:** Root-level `pnpm build` MUST include new package
- **Testing:** Verify that `pnpm lint`, `pnpm check-types`, `pnpm test` work from root

---

### Risk 10: Documentation Drift
**Why it's risky:**
- Setup instructions in README may become outdated as code evolves
- Future developers may struggle if documentation is incomplete or inaccurate

**Mitigation PM should bake into AC or testing plan:**
- **AC:** README MUST include complete setup instructions (prerequisites, steps, verification)
- **AC:** Include troubleshooting section for common errors (pgvector missing, port conflicts, etc.)
- **Recommendation:** Add README to PR review checklist for future stories

---

## Scope Tightening Suggestions (Non-breaking)

### Suggestion 1: Defer Production Deployment
**Clarification:**
This story focuses on **local development** infrastructure only. Production deployment (RDS, CloudFormation, etc.) is out of scope and will be addressed in later stories (e.g., KNOW-011, KNOW-017).

**Add to AC:**
- "Local development setup ONLY (Docker Compose)"
- "Production deployment out of scope for this story"

---

### Suggestion 2: Minimal Schema (Defer Complex Features)
**Clarification:**
Initial schema should include only the essential columns for embedding storage and search. Advanced features (e.g., audit logging, soft deletes, metadata fields) can be added in later stories.

**Constraints to avoid rabbit holes:**
- **In scope:** `id`, `content`, `embedding`, `role`, `tags`, `created_at`, `updated_at`
- **Out of scope:** `parent_id`, `source_file`, `version`, `deleted_at` (unless explicitly required by KNOW-002 or KNOW-003)

---

### Suggestion 3: Explicit Migration Tool Decision
**Clarification:**
Story should state which migration tool to use (Drizzle preferred for type safety, raw SQL acceptable for simplicity).

**Add to AC:**
- "Use [Drizzle/Raw SQL] for schema migrations"
- "Migrations MUST be idempotent"

---

### Suggestion 4: Testcontainers vs Manual Verification
**Clarification:**
Decide upfront whether integration tests will use Testcontainers (automated) or require manual database setup (documented).

**Add to AC:**
- **Option A:** "Use Testcontainers for integration tests"
- **Option B:** "Document manual database setup for integration tests"

---

## Missing Requirements / Ambiguities

### Ambiguity 1: Migration Tooling
**What's unclear:**
Story doesn't specify whether to use Drizzle, raw SQL, or another migration tool.

**Recommend concrete decision text PM should include:**
```
**Migration Tooling:** Use Drizzle ORM for schema migrations. Rationale:
- Type-safe schema definitions
- Consistent with existing backend patterns (if applicable)
- Built-in migration tracking

Alternative: Raw SQL if Drizzle adds unnecessary complexity for simple schema.
```

---

### Ambiguity 2: Database Naming Conventions
**What's unclear:**
Database name, user, password conventions are not specified. This affects `.env.example` and README.

**Recommend concrete decision text PM should include:**
```
**Database Configuration:**
- Database name: `knowledgebase`
- User: `kbuser`
- Password: `kbpassword` (local only, NOT for production)
- Port: `5432` (customizable via `KB_DB_PORT` env var)
```

---

### Ambiguity 3: Vector Index Type and Parameters
**What's unclear:**
pgvector supports multiple index types (IVFFlat, HNSW). Initial parameters (e.g., `lists` for IVFFlat) are not specified.

**Recommend concrete decision text PM should include:**
```
**Vector Index:**
- Type: IVFFlat (pgvector default, good for small-to-medium datasets)
- Parameters: `lists=100` (conservative default, suitable for up to 10k entries)
- Rationale: Simple, well-documented, can be re-tuned in KNOW-007 performance story
```

---

### Ambiguity 4: Test Coverage Expectations
**What's unclear:**
Story mentions "test configuration" but doesn't specify what tests should exist at this stage.

**Recommend concrete decision text PM should include:**
```
**Test Coverage for KNOW-001:**
- Smoke test: Connect to database and verify schema exists
- Unit test: Verify package.json and tsconfig.json are valid
- Integration test: (Optional) Use Testcontainers to spin up PostgreSQL and run schema migration

Acceptance: Tests run without errors when `pnpm test` is executed from package root.
```

---

### Ambiguity 5: README Contents
**What's unclear:**
README scope is not defined. Should it include architecture docs, or just setup instructions?

**Recommend concrete decision text PM should include:**
```
**README Sections:**
1. Prerequisites (Docker, pnpm, PostgreSQL client tools)
2. Setup Instructions (clone, install, start Docker, run migrations)
3. Verification (how to confirm setup is correct)
4. Troubleshooting (common errors and solutions)
5. Architecture Overview (brief, 2-3 paragraphs on MCP, pgvector, purpose)

Out of scope: Detailed MCP protocol docs, API reference (deferred to later stories)
```

---

## Evidence Expectations

### What Dev Should Capture

**1. Docker Compose Startup:**
- Screenshot or logs showing `docker-compose up -d` success
- `docker ps` output showing running PostgreSQL container
- `docker logs <container>` snippet showing "ready to accept connections"

**2. Database Schema Verification:**
- `psql` output showing tables created:
  ```
  \dt
  \d knowledge_entries
  \d embedding_cache
  ```
- pgvector extension verification:
  ```
  SELECT * FROM pg_extension WHERE extname = 'vector';
  ```

**3. Package Integration:**
- `pnpm list` output showing new package in workspace
- `pnpm build` logs from package root showing successful TypeScript compilation
- `pnpm test` output showing Vitest runs without configuration errors

**4. README Completeness:**
- Evidence that setup instructions can be followed from scratch (fresh clone, no prior setup)
- Verification steps from README executed successfully

---

### What Might Fail in CI/Deploy

**CI Pipeline:**
- **Docker availability:** CI environment may not have Docker installed or enabled
- **PostgreSQL connection:** CI may require different connection config than local
- **Migration failures:** Schema migration may fail if database state is inconsistent

**Mitigation:**
- Document CI requirements (Docker, PostgreSQL, env vars)
- Use Testcontainers if CI supports Docker
- OR skip integration tests in CI and rely on manual verification (less ideal)

**Local Developer Setup:**
- **Missing Docker:** Clear error message if Docker not running
- **Port conflicts:** Clear error message if port 5432 in use
- **Missing pgvector:** Clear error if wrong PostgreSQL image used

**Mitigation:**
- Comprehensive README troubleshooting section
- `.env.example` with comments explaining each variable

---

## Recommendations for PM

### High Priority (Include in Story)
1. **Decide on migration tooling** (Drizzle vs raw SQL) - BLOCKING
2. **Specify database naming conventions** (db name, user, password for local dev)
3. **Define vector index type and parameters** (IVFFlat with `lists=100` recommended)
4. **Clarify test coverage expectations** (smoke test minimum, Testcontainers optional)

### Medium Priority (Nice to Have)
5. **README template or outline** (ensure consistency with other packages)
6. **Monorepo integration checklist** (verify `pnpm-workspace.yaml`, `turbo.json` updated)

### Low Priority (Can Defer)
7. **CI configuration** (can be added in later story if needed)
8. **Production deployment docs** (explicitly out of scope for this story)

---

## Final Notes

This is a **foundational story** with low technical risk but high dependency risk. Future stories (KNOW-002 onward) depend on this infrastructure being correct and complete.

**Key success factors:**
- Clear, executable documentation (README)
- Idempotent migrations (can run multiple times without errors)
- Comprehensive troubleshooting guidance (for common setup issues)

**Dev should focus on:**
- Making setup "just work" for new developers
- Documenting decisions and rationale inline (comments, README)
- Providing clear error messages for common failures

**QA verification should prioritize:**
- Fresh environment testing (can someone with no prior setup complete the story?)
- Error scenario validation (do error messages help or confuse?)
- Documentation accuracy (does README match actual behavior?)
