# Dev Feasibility Review: INFR-0040

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This is a foundational database schema story with well-established patterns in the codebase. Drizzle ORM infrastructure is already in place, migration tooling exists, and the schema design is straightforward. No external dependencies or complex integrations.

## Likely Change Surface (Core Only)

### Packages Touched (Core Journey)
- `packages/backend/database-schema/` - add telemetry schema, enum, table definitions
- `packages/backend/db/` - add insertWorkflowEvent function, export Zod schemas
- `packages/backend/database-schema/src/migrations/` - new migration file

### Files to Create
- `packages/backend/database-schema/src/schema/telemetry.ts` - telemetry namespace + workflow_events table
- `packages/backend/database-schema/src/migrations/XXXX_create_workflow_events.sql` - migration
- `packages/backend/db/src/workflow-events.ts` - insertWorkflowEvent function
- `packages/backend/db/src/__tests__/workflow-events.test.ts` - unit tests

### Files to Modify
- `packages/backend/database-schema/src/schema/index.ts` - export telemetry schema
- `packages/backend/db/src/index.ts` - export insertWorkflowEvent + Zod schemas
- `packages/backend/db/src/generated-schemas.ts` - auto-generated Zod schemas (via drizzle-zod)

### Critical Deploy Touchpoints
- Database migration must run before deploying code that calls insertWorkflowEvent
- No API endpoints, so no CloudFormation changes
- Local dev: `pnpm --filter @repo/db migrate:run`

## MVP-Critical Risks

### Risk 1: Migration Ordering in CI/CD
- **Why it blocks MVP**: If migration doesn't run before application code deploys, insertWorkflowEvent calls will fail with "relation does not exist" errors
- **Required mitigation**: Document migration order in Infrastructure Notes. Add migration step to deploy process (or use Drizzle's auto-migration on startup for dev/staging).

### Risk 2: ULID Primary Key Performance
- **Why it blocks MVP**: ULIDs are strings, not UUIDs. Postgres text indexing may be slower than uuid type for primary key lookups at scale. If performance is poor, orchestrator event logging will slow down.
- **Required mitigation**: Benchmark ULID vs UUID performance in test suite. If ULID performs well (sub-ms lookups for 100K rows), proceed. Otherwise, switch to UUID with ULID stored in separate field.

### Risk 3: Idempotency Implementation
- **Why it blocks MVP**: Story requires duplicate event_id to be ignored. Two implementation options:
  1. Unique constraint with ON CONFLICT DO NOTHING (PostgreSQL-specific)
  2. Try/catch in insertWorkflowEvent and swallow duplicate key errors

  If unique constraint is not set correctly, duplicate events will cause crashes.
- **Required mitigation**: Add unique index on event_id in migration. Test idempotency in unit tests (AC-10).

## Missing Requirements for MVP

### Requirement 1: Event Payload Schema Validation
- **Concrete decision**: Should insertWorkflowEvent validate payload structure per event_type (e.g., item_state_changed requires `from` and `to` fields), or accept arbitrary JSONB?
- **PM must include**: Decision on payload validation strategy. Options:
  - A) No validation, accept any JSONB (simple, flexible, risky)
  - B) Zod schemas per event_type, validate before insert (safe, rigid)
  - C) Validate only required fields, allow optional extras (balanced)

  **Recommendation**: Start with option A (no validation) for MVP. Add validation in INFR-0050 when Event SDK is built.

### Requirement 2: Error Handling Strategy
- **Concrete decision**: What should insertWorkflowEvent do if insert fails (e.g., DB connection lost)?
  - A) Throw error and crash orchestrator (fail-fast)
  - B) Log warning and continue (resilient)
  - C) Queue event for retry (complex, out of scope for INFR-0040)

  **PM must include**: Error handling behavior in insertWorkflowEvent function signature.

  **Recommendation**: Option B (log + continue) for MVP. Orchestrator should not crash if event logging fails.

## MVP Evidence Expectations

### Proof Needed for Core Journey
1. **Migration Success**: `pnpm --filter @repo/db migrate:run` succeeds in clean local dev environment
2. **Schema Validation**: SQL query confirms telemetry schema, enum, table, indexes exist
3. **Basic Insert**: Unit test inserts 1 event and queries it back successfully
4. **Idempotency Test**: Unit test inserts duplicate event_id twice, confirms only 1 row exists
5. **Index Performance**: EXPLAIN ANALYZE shows index usage for queries on event_type, run_id, ts

### Critical CI/Deploy Checkpoints
- [ ] Drizzle migration file generates cleanly
- [ ] `pnpm check-types` passes (Zod schemas auto-generated)
- [ ] `pnpm test` passes (workflow-events.test.ts)
- [ ] Migration runs successfully in CI Postgres instance
- [ ] No breaking changes to existing @repo/db exports

## Reuse Assessment

### Must Reuse (Already Exists)
- Drizzle ORM: `packages/backend/database-schema/` pattern
- pgSchema() pattern: See Umami analytics schema
- Zod-first types: All existing schemas follow this
- Migration tooling: Drizzle CLI already configured
- @repo/db client: Existing connection pooling, query exports

### Should Create (New for This Story)
- `telemetry` pgSchema namespace (first telemetry schema in repo)
- `workflow_event_type` enum (first workflow-related enum)
- `insertWorkflowEvent()` function (new public API in @repo/db)

### Avoid Creating
- Custom ORM layer (use Drizzle)
- TypeScript interfaces instead of Zod schemas
- Inline SQL strings (use Drizzle query builder)

## Implementation Recommendation

### Phase 1: Schema Definition (Low Risk)
1. Create `packages/backend/database-schema/src/schema/telemetry.ts`
2. Define telemetry pgSchema, workflow_event_type enum, workflow_events table
3. Export from `schema/index.ts`
4. Run `pnpm --filter @repo/db generate` to auto-generate migration

### Phase 2: Migration (Medium Risk)
1. Review auto-generated migration SQL
2. Manually add indexes (Drizzle may not auto-generate composite indexes)
3. Test migration: `pnpm --filter @repo/db migrate:run`
4. Test rollback: `pnpm --filter @repo/db migrate:rollback`

### Phase 3: insertWorkflowEvent Function (Low Risk)
1. Create `packages/backend/db/src/workflow-events.ts`
2. Implement insertWorkflowEvent using Drizzle insert API
3. Add try/catch for error handling (log + continue pattern)
4. Export from `db/src/index.ts`

### Phase 4: Auto-Generate Zod Schemas (Automated)
1. Run `pnpm --filter @repo/db generate-schemas` (drizzle-zod)
2. Verify Zod schemas exported in `db/src/generated-schemas.ts`
3. Export WorkflowEventSchema for downstream use

### Phase 5: Unit Tests (Low Risk)
1. Create `db/src/__tests__/workflow-events.test.ts`
2. Test insert, idempotency, NULL handling, JSONB payloads
3. Use in-memory Postgres or testcontainers for isolated tests

## Estimated Effort
- **Total**: 4-6 hours (1 story point)
- Schema definition: 1h
- Migration + testing: 2h
- insertWorkflowEvent function: 1h
- Unit tests: 1-2h

## Dependencies
- None (Wave 1 story)

## Blockers
- None identified
