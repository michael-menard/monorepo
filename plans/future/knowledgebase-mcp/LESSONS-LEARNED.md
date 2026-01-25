# Knowledge Base MCP Server - Lessons Learned

## KNOW-001 - Package Infrastructure Setup (2026-01-25)

### What Went Well

1. **Drizzle Custom Types** - Using custom Drizzle type definitions for pgvector VECTOR(1536) worked seamlessly without requiring raw SQL migrations
   - Enabled type-safe schema definitions while maintaining pgvector compatibility
   - Pattern can be reused for future MCP server packages

2. **Port Isolation Strategy** - Using port 5433 for knowledge-base PostgreSQL avoided conflicts with main monorepo database on 5432
   - Allows parallel development of multiple MCP servers with separate databases
   - Clear naming convention (KB_DB_PORT env var) makes configuration discoverable

3. **Comprehensive Documentation** - 280+ line README with quickstart, setup, verification, and troubleshooting sections
   - Significantly reduced future developer onboarding friction
   - Clear error messages reference README sections, creating self-supporting documentation

4. **Monorepo Integration** - Package integrates seamlessly with existing pnpm workspace and Turbo build system
   - No root-level configuration modifications required
   - Pattern established for future MCP server packages

5. **Development Helper Scripts** - Package scripts (db:init, db:seed, db:studio, validate:env) significantly improved developer experience
   - Single-command setup reduces setup friction
   - Environment validation prevents cryptic "connection failed" errors

### Patterns Established

1. **MCP Server Package Structure** - `apps/api/{server-name}/` pattern with self-contained Docker, schema, and tests
   - Can be reused for future MCP servers (e.g., learning-server, context-server)
   - Clear separation of concerns: infrastructure, database, business logic

2. **pgvector Integration in TypeScript Monorepo** - Drizzle custom types + manual SQL for extensions
   - Hybrid approach balances type safety with pgvector-specific operations
   - Document the vector dimension requirement (1536 for OpenAI text-embedding-3-small)

3. **Docker Port Naming Convention** - Named ports in env vars (KB_DB_PORT) instead of hardcoded values
   - Enables flexible development environments (CI/CD, local multi-server setups)
   - Reduces configuration coupling

4. **Development Database Seeding** - Separate seed script with sample entries (5 realistic examples)
   - Enables manual testing without waiting for production seed pipeline
   - Idempotent design allows safe re-runs

5. **Smoke Test Architecture** - Database connection, extension, table existence, and index verification in one test
   - Comprehensive infrastructure validation in minimal lines of code
   - Clear pass/fail signal without external dependencies (Docker optional for local dev)

### Key Decisions Made

1. **Drizzle ORM Choice** - Uses existing monorepo pattern instead of raw SQL
   - Provides type safety and schema versioning
   - Consistent with other backend packages

2. **IVFFlat Index Configuration** - lists=100 suitable for datasets up to ~10k entries
   - Documented as tunable parameter for future performance work (KNOW-007)
   - Simple to understand and debug

3. **Manual Migration for pgvector Extension** - SQL migration creates extension after Drizzle schema setup
   - Ensures idempotency (extension creation is idempotent)
   - Clear order of operations in migration files

4. **Connection Pooling Configuration** - Documented for serverless Lambda context
   - Sets up max connections and idle timeout appropriate for stateless compute
   - Prevents connection pool exhaustion in production

### Risks Identified

1. **pgvector Version Pinning** - Must stay in sync with production deployment
   - Mitigation: Docker image tag explicitly specifies `0.5.1-pg16`, not `:pg16`
   - Document in README and add automated version check in CI (future KNOW-100)

2. **Smoke Tests Require Docker** - Tests designed for CI/CD but developers must manually run Docker
   - Mitigation: Clear documentation of `docker-compose up -d` step in README
   - Future story (KNOW-099) will add Testcontainers for zero-setup testing

3. **Environment Variable Misconfiguration** - Easy to forget `.env` setup for new developers
   - Mitigation: Added `pnpm validate:env` script with clear error messages
   - `.env.example` file documents all required variables

4. **Vector Dimension Coupling** - VECTOR(1536) is tied to specific embedding model
   - Mitigation: Documented in README and migration comments
   - Future stories (KNOW-002, KNOW-004) will document model choice rationale

5. **Port Conflicts in Team Environments** - Port 5433 could conflict if another developer uses same port
   - Mitigation: Document KB_DB_PORT override in README, add troubleshooting section
   - Low risk but worth monitoring

### Recommendations for Future Stories

1. **KNOW-099** (Testcontainers Integration) - Allow running tests without manual Docker
   - High impact: Enables pre-commit hook testing, CI/CD without Docker setup
   - Estimated effort: 2 points

2. **KNOW-100** (CI/CD Database Pipeline) - GitHub Actions workflow with schema migration
   - High impact: Enables automated testing in pull requests
   - Estimated effort: 3 points

3. **Automated pgvector Version Check** - Add pre-deployment verification of pgvector version
   - Medium impact: Prevents production deployment mismatches
   - Estimated effort: 1 point

4. **Connection Pool Performance Tuning** - Benchmark pool size with concurrent load
   - Medium impact: Optimize for production Lambda concurrent executions
   - Estimated effort: 2 points

### Technical Debt Captured

None identified. Infrastructure is clean, well-documented, and follows monorepo patterns.

### Team Feedback Opportunities

- **For PM**: Clear story definition enabled smooth implementation, no scope creep
- **For QA**: Smoke test framework provides good template for future infrastructure validation
- **For Platform**: MCP server package pattern can be standardized for team reuse

### Items for Documentation Update

1. Add MCP server package template to monorepo README
2. Document pgvector version requirements in tech-stack docs
3. Add connection pooling configuration guidelines for serverless Lambda

### Critical Success Factors Summary

1. Comprehensive documentation (quickstart + troubleshooting) → Reduced onboarding friction
2. Helper scripts (db:init, validate:env) → Reduced setup errors
3. Clear port naming convention → Enabled parallel multi-server development
4. Smoke test pattern → Established reusable infrastructure testing approach

---

## Meta Information

- **Story**: KNOW-001
- **Date Completed**: 2026-01-25
- **Team**: Development (Infrastructure/Backend)
- **Status**: Completed and ready for code review
- **Follow-up Stories**: KNOW-099, KNOW-100 (future enhancements)
