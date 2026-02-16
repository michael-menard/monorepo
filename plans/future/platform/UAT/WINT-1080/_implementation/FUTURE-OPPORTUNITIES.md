# Future Opportunities - WINT-1080

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No automated schema diff tooling | Medium | Medium | Create CLI tool to compare Drizzle schemas and generate diff reports automatically |
| 2 | Manual enum migration strategy | Medium | Low | Explore Drizzle Kit support for enum migrations with data transformation |
| 3 | View translation to Drizzle ORM not documented | Low | Medium | Document how to translate PostgreSQL views (`workable_stories`, `feature_progress`) to Drizzle ORM queries |
| 4 | Trigger patterns not documented in unified schema | Low | Medium | Document Drizzle ORM patterns for triggers (raw SQL execution in migrations) |
| 5 | No automated pgvector extension check | Low | Low | Add pre-flight check script to validate pgvector extension availability before migration |
| 6 | Test database cloning strategy not specified | Low | Medium | Document Docker-based test database cloning strategy (or pgdump/pgrestore) |
| 7 | No automated rollback testing | Medium | High | Create automated rollback test suite that validates migration reversibility |
| 8 | No schema versioning strategy documented | Medium | Medium | Document schema versioning strategy (semantic versioning, migration naming conventions) |
| 9 | No migration conflict detection | Low | High | Create tooling to detect migration conflicts across concurrent branches |
| 10 | Priority enum mismatch (P0-P4 vs p0-p3) not fully resolved | Low | Low | Document decision on priority enum - recommend P0-P4 (WINT) as unified enum |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Schema visualization tooling | High | High | Generate ERD diagrams from Drizzle schemas for documentation (future story) |
| 2 | Cross-database query optimization | Medium | High | Explore PostgreSQL foreign data wrappers (FDW) for cross-database joins during migration phase |
| 3 | Real-time schema sync validation | Medium | High | Create real-time monitoring to detect schema drift between WINT and LangGraph during migration |
| 4 | Automated embedding generation | High | High | Create service to generate pgvector embeddings for existing WINT records (stories, features) |
| 5 | Migration replay capability | Medium | High | Create tooling to replay migrations on multiple environments (dev, staging, production) with validation |
| 6 | Schema documentation generation | High | Medium | Auto-generate comprehensive schema documentation from Drizzle schemas with Zod constraints |
| 7 | Type-safe query builder | Medium | High | Explore Drizzle ORM query builder for LangGraph repository (replace raw SQL) - deferred to WINT-1090+ |
| 8 | Migration performance profiling | Low | Medium | Add performance metrics to migration scripts (execution time per table, index creation time) |
| 9 | Schema test coverage reporting | Medium | Medium | Track schema test coverage (tables tested, columns validated, constraints verified) |
| 10 | Database consolidation plan | High | Very High | Create comprehensive plan for merging knowledge-base database into main app database (Wave 4+) |

---

## Categories

### Edge Cases

**Non-Critical**:
- Handling of orphaned records during migration (stories with invalid feature_id references)
- Edge case: Story exists in both databases with different states
- Edge case: Enum value exists in data but not in enum definition (data corruption scenario)
- Edge case: Migration runs twice on same database (idempotency)

**Recommendation**: Document edge case handling in migration script comments, but defer comprehensive edge case testing to WINT-1110 (data migration).

---

### UX Polish

**Developer Experience Enhancements**:
- Migration script with colorized output and progress indicators
- Interactive migration validation CLI (confirm each table before proceeding)
- Migration dry-run mode with detailed diff output
- Schema comparison web UI (visualize WINT vs LangGraph schemas side-by-side)

**Recommendation**: Defer to future developer tooling story (Wave 4+). Current CLI-based approach is adequate for MVP.

---

### Performance

**Query Optimization**:
- Analyze query performance impact of normalized WINT schema vs denormalized LangGraph schema
- Benchmark pgvector semantic search performance on WINT schema
- Optimize composite indexes for common query patterns
- Evaluate materialized views for `workable_stories` and `feature_progress` queries

**Recommendation**: Create performance benchmarking story in Wave 3 after migration complete (WINT-1120+).

**Migration Performance**:
- Parallel migration execution (multiple tables simultaneously)
- Batch processing for enum value updates (WINT-1110)
- Index creation strategy (create indexes after data migration, not before)

**Recommendation**: Defer to WINT-1110 (data migration story). Schema migration (WINT-1080) is one-time operation.

---

### Observability

**Migration Observability**:
- Migration execution metrics (duration, tables modified, indexes created)
- Schema drift detection (alert when WINT and LangGraph schemas diverge)
- Migration failure alerting (Slack, PagerDuty)
- Post-migration validation dashboard (schema health, query performance)

**Recommendation**: Create observability story in Wave 3 (WINT-1130+) to instrument migration monitoring.

**Schema Telemetry**:
- Track schema usage patterns (which tables are queried most frequently)
- Track query performance by table
- Track index usage and identify unused indexes

**Recommendation**: Defer to future observability epic (Wave 4+).

---

### Integrations

**Future Integration Points**:
- **MCP Tools Integration**: Expose unified schema to MCP tools for story management (WINT-0090+)
- **GraphQL API**: Generate GraphQL schema from unified Drizzle schema (Wave 4+)
- **Admin UI**: Schema browser for developers (view tables, indexes, relations) (Wave 4+)
- **Backup/Restore**: Integrate with backup tooling (pgbackrest, wal-g) (Wave 4+)
- **Schema Registry**: Publish unified schema to schema registry (Confluent, AWS Glue) (Wave 5+)

**Recommendation**: Track as separate epics. No immediate integration work required for MVP.

---

### Architecture

**Future Architecture Considerations**:

1. **Database Consolidation** (Wave 4+):
   - Merge knowledge-base database (port 5433) into main app database (port 5432)
   - Migrate LangGraph tables to `wint` schema namespace
   - Consolidate connection pooling and resource management
   - **Effort**: Very High (20-30 story points)
   - **Value**: Simplified architecture, cross-database queries without FDW
   - **Risk**: Migration complexity, downtime during consolidation

2. **Drizzle ORM Adoption for LangGraph** (Wave 3+):
   - Migrate LangGraph repository from raw SQL to Drizzle ORM
   - Leverage unified schema types for type safety
   - Simplify query logic with Drizzle query builder
   - **Effort**: Medium (8-13 story points)
   - **Value**: Type safety, reduced query boilerplate, consistent patterns
   - **Risk**: Breaking changes to existing queries, learning curve

3. **Vector Search Service** (Wave 4+):
   - Extract pgvector semantic search into dedicated service
   - Centralize embedding generation and similarity search
   - Support multiple embedding models (OpenAI, Cohere, custom)
   - **Effort**: High (13-21 story points)
   - **Value**: Centralized vector search, model flexibility, scalability
   - **Risk**: Service complexity, latency overhead

4. **Multi-Tenancy Support** (Wave 5+):
   - Add tenant_id to all tables for multi-tenant isolation
   - Row-level security (RLS) policies for tenant data isolation
   - Tenant-specific schema migrations
   - **Effort**: Very High (21-34 story points)
   - **Value**: SaaS readiness, customer data isolation
   - **Risk**: Migration complexity, performance impact, testing overhead

5. **Event Sourcing for Story State** (Wave 5+):
   - Replace story state table with event sourcing pattern
   - Capture all state changes as immutable events
   - Rebuild current state from event log
   - **Effort**: High (13-21 story points)
   - **Value**: Complete audit trail, temporal queries, replay capability
   - **Risk**: Complexity, query performance, storage overhead

**Recommendation**: Document in architecture roadmap (PLAN.meta.md). Evaluate in quarterly planning.

---

### Testing

**Future Test Enhancements**:

1. **Property-Based Testing for Migrations** (Wave 3):
   - Use property-based testing (fast-check, hypothesis) to generate edge cases
   - Validate migration idempotency (running twice produces same result)
   - Validate migration reversibility (migrate + rollback = original state)
   - **Effort**: Medium (5-8 story points)

2. **Chaos Testing for Database Resilience** (Wave 4):
   - Simulate database failures during migration (connection loss, disk full)
   - Validate migration recovery and rollback under failure conditions
   - **Effort**: High (8-13 story points)

3. **Performance Regression Testing** (Wave 3):
   - Benchmark query performance before and after migration
   - Alert on performance regressions (>20% slower queries)
   - **Effort**: Medium (5-8 story points)

4. **Schema Mutation Testing** (Wave 4):
   - Mutate schema definitions and validate tests catch mutations
   - Identify gaps in schema test coverage
   - **Effort**: Medium (5-8 story points)

**Recommendation**: Create testing epic for Wave 3 to enhance schema migration test coverage.

---

### Documentation

**Future Documentation Needs**:

1. **Schema Migration Playbook** (Wave 3):
   - Step-by-step guide for schema migrations
   - Troubleshooting common migration issues
   - Rollback procedures and incident response
   - **Effort**: Low (2-3 story points)

2. **Schema Design Guidelines** (Wave 3):
   - Best practices for Drizzle schema design
   - Naming conventions (tables, columns, indexes, enums)
   - Index strategy (when to use composite vs single-column indexes)
   - **Effort**: Low (2-3 story points)

3. **Database Architecture Decision Records** (Wave 3):
   - ADR for two-database strategy
   - ADR for pgvector semantic search
   - ADR for enum naming conventions
   - **Effort**: Low (2-3 story points)

4. **Migration Runbook for Production** (Wave 3):
   - Pre-migration checklist
   - Migration execution steps
   - Post-migration validation
   - Rollback procedures
   - **Effort**: Medium (3-5 story points)

**Recommendation**: Create documentation epic for Wave 3 to formalize schema migration knowledge.

---

## Deferred Items (Not Blocking MVP)

### From Story Analysis

1. **pgvector Extension Installation Documentation**:
   - Document how to install pgvector extension on main app database (port 5432)
   - Document how to verify pgvector extension availability
   - **Deferred to**: Pre-migration checklist (WINT-1090)

2. **Embedding Generation Strategy**:
   - How to generate embeddings for existing WINT records (stories, features)
   - Which embedding model to use (OpenAI, Cohere, custom)
   - Batch processing strategy for large datasets
   - **Deferred to**: Future vector search story (Wave 4+)

3. **View Translation to Drizzle ORM**:
   - Translate `workable_stories` view to Drizzle ORM query
   - Translate `feature_progress` view to Drizzle ORM query
   - **Deferred to**: WINT-1090 (LangGraph code updates) or future Drizzle adoption story

4. **PostgreSQL Functions Migration**:
   - Migrate `get_story_next_action()` function to WINT schema
   - Migrate `transition_story_state()` function to WINT schema
   - Update functions to use unified enum
   - **Deferred to**: WINT-1090 (LangGraph code updates)

5. **Trigger Migration**:
   - Migrate `update_updated_at()` trigger to WINT schema
   - Document Drizzle ORM pattern for triggers (raw SQL in migrations)
   - **Deferred to**: WINT-1090 (LangGraph code updates)

---

## Cross-Story Dependencies

### Blocked By WINT-1080

1. **WINT-1090: Update LangGraph Repos for Unified Schema**:
   - Requires: Unified schema specification (AC-004)
   - Requires: Enum reconciliation strategy (AC-002)
   - Requires: Migration guide (AC-006)

2. **WINT-1100: Create Shared TypeScript Types**:
   - Requires: Unified schema specification (AC-004)
   - Requires: Type foundation (AC-007)

### Blocking Future Work

1. **WINT-1110: Migrate LangGraph Data to WINT Schema** (Wave 3):
   - Requires: Migration scripts (AC-005)
   - Requires: Backward compatibility validation (AC-006)

2. **WINT-1120: Database Consolidation** (Wave 4):
   - Requires: Unified schema in both databases
   - Requires: Data migration complete (WINT-1110)

3. **Vector Search Service** (Wave 4):
   - Requires: pgvector support in WINT schema
   - Requires: Embedding generation strategy

---

## Lessons Learned for Future Schema Migrations

1. **Early Stakeholder Alignment**:
   - Schedule alignment meetings before starting implementation
   - Document decision rationale in schema specification
   - Avoid implementation delays due to unresolved design decisions

2. **Time-Boxing Large ACs**:
   - AC-004 (unified schema specification) was 12-16 hours - largest single AC
   - Recommend time-boxing to prevent scope creep
   - Document incomplete areas if time exceeded

3. **Test Plan Concreteness**:
   - Test plan should include concrete SQL fixtures, not just descriptions
   - Rollback testing requires step-by-step validation procedures
   - Pre-migration checks should be explicit (pgvector extension, database connection)

4. **Migration Deployment Clarity**:
   - Clarify when migration scripts are generated vs deployed
   - Separate schema migration (WINT-1080) from data migration (WINT-1110) from code migration (WINT-1090)
   - Document staging strategy for multi-phase migrations

5. **Enum Migrations Are Complex**:
   - Enum migrations require data transformation, not just schema changes
   - Hyphenated vs underscored enums create compatibility issues
   - Semantic mapping (uat → in_qa) requires stakeholder alignment
   - Consider dual enum period to avoid breaking changes

6. **Two-Database Coexistence**:
   - Two databases can coexist during migration phase
   - Cross-database queries require foreign data wrappers (FDW) or application-level joins
   - Database consolidation is a separate epic (high effort, high risk)

7. **pgvector Integration**:
   - pgvector extension must be installed before creating vector columns
   - Embedding generation is a separate concern from schema migration
   - Vector search service may be valuable for centralizing semantic search

8. **Drizzle ORM Adoption**:
   - Drizzle ORM adoption for existing codebases is a separate story
   - Raw SQL to Drizzle migration requires careful testing
   - Type safety benefits justify migration effort

---

**Generated**: 2026-02-14
**Story**: WINT-1080
**Phase**: Elaboration Analysis (elab-analyst worker)
