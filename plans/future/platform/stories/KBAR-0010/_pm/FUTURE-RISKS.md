# Future Risks: KBAR-0010 - Database Schema Migrations

**Story**: KBAR-0010
**Epic**: KBAR
**Generated**: 2026-02-14

---

## Non-MVP Risks

### Risk 1: JSONB Query Performance at Scale
**Impact** (if not addressed post-MVP):
- JSONB queries on `stories.metadata` will be slow with 10K+ stories
- Queries like "find all stories with tag X" will require full table scan
- Response times >1s for filtered queries

**Recommended Timeline**: KBAR-0080+ (after 5K+ stories in DB)

**Mitigation**:
- Add GIN index on `stories.metadata`:
  ```sql
  CREATE INDEX kbar_stories_metadata_gin_idx ON kbar.stories USING GIN (metadata);
  ```
- Or extract frequently-queried fields to separate columns
- Benchmark query performance monthly

---

### Risk 2: Schema Evolution Without Versioning
**Impact** (if not addressed post-MVP):
- Adding columns/tables requires manual migration tracking
- No automated rollback capability
- Risk of schema drift between environments

**Recommended Timeline**: KBAR-0200+ (before production deploy)

**Mitigation**:
- Implement schema versioning table
- Add rollback SQL in migration comments
- Test migrations in staging before production
- Consider Drizzle Studio for schema visualization

---

### Risk 3: Artifact Content Cache Staleness
**Impact** (if not addressed post-MVP):
- Cached YAML content may become stale if files change
- No automatic cache invalidation
- Risk of showing outdated data in MCP tools

**Recommended Timeline**: KBAR-0040+ (Artifact Sync Functions)

**Mitigation**:
- Implement checksum-based cache invalidation
- Add `last_synced_at` timestamp to cache entries
- Periodic cache refresh job (daily/weekly)
- Cache miss fallback to filesystem read

---

### Risk 4: Sync Event Log Growth
**Impact** (if not addressed post-MVP):
- `sync_events` table grows unbounded
- Query performance degrades over time
- Storage costs increase

**Recommended Timeline**: KBAR-0090+ (after 6 months of sync data)

**Mitigation**:
- Implement TTL policy (e.g., delete events older than 90 days)
- Archive old events to S3/object storage
- Add partitioning by month for `sync_events` table
- Monitoring/alerting on table size

---

### Risk 5: Foreign Key Cascade Complexity
**Impact** (if not addressed post-MVP):
- Deleting a story cascades to artifacts, states, dependencies
- Large cascade deletes may lock tables
- Risk of unintended data loss

**Recommended Timeline**: KBAR-0100+ (before enabling bulk delete operations)

**Mitigation**:
- Add soft delete flag instead of CASCADE
- Implement delete confirmation UI
- Log cascade deletes for audit
- Add "archive" status instead of hard delete

---

### Risk 6: Enum Value Evolution
**Impact** (if not addressed post-MVP):
- Adding enum values requires migration
- No dynamic enum management
- Downtime risk during enum updates

**Recommended Timeline**: KBAR-0150+ (if enum values change frequently)

**Mitigation**:
- Consider using TEXT columns with CHECK constraints instead of enums
- Or implement enum value table for dynamic management
- Document enum value semantics in schema comments

---

### Risk 7: Index Metadata Synchronization
**Impact** (if not addressed post-MVP):
- Index files on filesystem may not match DB state
- No conflict resolution for index updates
- Risk of stale index entries

**Recommended Timeline**: KBAR-0230 (DB-Driven Index Generation)

**Mitigation**:
- Implement checksum validation for index files
- Add sync status field to `index_metadata`
- Periodic reconciliation job
- Conflict resolution strategy (filesystem vs DB as source of truth)

---

### Risk 8: Multi-Tenant Isolation
**Impact** (if not addressed post-MVP):
- Single `kbar` schema shared across all users
- No row-level security
- Risk of data leakage in future multi-tenant scenarios

**Recommended Timeline**: MVP+12 months (if multi-tenancy required)

**Mitigation**:
- Add `tenant_id` column to all tables
- Implement Postgres RLS (Row-Level Security)
- Or use schema-per-tenant pattern
- Audit query filters for tenant isolation

---

### Risk 9: Artifact Version History Size
**Impact** (if not addressed post-MVP):
- `artifact_versions` table grows with every artifact update
- Storage costs increase
- Query performance degrades

**Recommended Timeline**: KBAR-0160+ (after 6 months)

**Mitigation**:
- Implement version retention policy (keep last N versions)
- Archive old versions to object storage
- Add version cleanup job
- Monitoring on table growth rate

---

### Risk 10: Database Connection Pool Exhaustion
**Impact** (if not addressed post-MVP):
- High concurrent query load exhausts connection pool
- 5XX errors from connection timeout
- Degraded performance under load

**Recommended Timeline**: Load testing phase (before production deploy)

**Mitigation**:
- Configure connection pool size appropriately
- Implement connection pool monitoring
- Add query timeout limits
- Consider read replicas for scaling

---

## Scope Tightening Suggestions

### Defer Composite Indexes
**Current Scope**: All indexes defined in schema
**Suggested Scope**: Only single-column indexes in MVP
**Rationale**: Composite indexes should be based on actual query patterns, not speculation
**Benefit**: Faster inserts, smaller migration, defer complexity
**Timeline**: Add composite indexes in KBAR-0020+ based on query profiling

### Defer Artifact Content Caching
**Current Scope**: `artifact_content_cache` table included
**Suggested Scope**: Remove cache table, read from filesystem only
**Rationale**: Caching adds complexity; filesystem reads are fast enough for MVP
**Benefit**: Simpler schema, no cache invalidation logic
**Timeline**: Add caching in KBAR-0060+ if performance issues observed

### Defer Index Generation Tables
**Current Scope**: `index_metadata` and `index_entries` tables included
**Suggested Scope**: Remove index tables, keep filesystem index files
**Rationale**: DB-driven index generation is KBAR-0230, not needed for MVP
**Benefit**: Smaller schema, defer future functionality
**Timeline**: Add index tables in KBAR-0220+ when DB-driven generation implemented

### Defer Sync Checkpoints
**Current Scope**: `sync_checkpoints` table included
**Suggested Scope**: Remove checkpoints, full sync only
**Rationale**: Incremental sync is optimization, full sync works for MVP
**Benefit**: Simpler sync logic, fewer tables
**Timeline**: Add checkpoints in KBAR-0070+ if full sync too slow

---

## Future Requirements

### Nice-to-Have: Full-Text Search on Stories
**Description**: Full-text search on `title`, `description`, `acceptance_criteria`
**Timeline**: KBAR-0180+ (search feature)
**Implementation**: PostgreSQL tsvector column + GIN index
**Complexity**: Medium
**Benefit**: Fast story search without Elasticsearch

### Nice-to-Have: Story Dependency Graph Queries
**Description**: Recursive queries to find all transitive dependencies
**Timeline**: KBAR-0140+ (dependency analysis)
**Implementation**: PostgreSQL recursive CTEs
**Complexity**: Medium
**Benefit**: Visualize full dependency tree

### Nice-to-Have: Artifact Binary Storage
**Description**: Store artifact binaries (images, PDFs) in DB or S3
**Timeline**: KBAR-0200+ (if artifacts include binaries)
**Implementation**: BYTEA column or S3 URL reference
**Complexity**: Medium
**Benefit**: Centralized artifact storage

### Nice-to-Have: Story Audit Trail
**Description**: Track all story changes (who, when, what changed)
**Timeline**: KBAR-0250+ (audit requirements)
**Implementation**: Separate `story_audit_log` table with triggers
**Complexity**: Medium
**Benefit**: Compliance, debugging, rollback capability

### Nice-to-Have: Materialized Views for Reporting
**Description**: Pre-computed views for dashboard queries
**Timeline**: KBAR-0300+ (reporting/analytics)
**Implementation**: PostgreSQL materialized views with refresh schedule
**Complexity**: Medium
**Benefit**: Fast dashboard queries without complex joins

---

## Polish and Edge Case Handling

### Polish 1: Schema Documentation
**Description**: Add PostgreSQL comments to tables/columns
**Timeline**: KBAR-0020+ (schema tests)
**Implementation**: `COMMENT ON TABLE ...`, `COMMENT ON COLUMN ...`
**Benefit**: Self-documenting schema for future developers

### Polish 2: Enum Value Documentation
**Description**: Document semantic meaning of enum values
**Timeline**: KBAR-0020+ (schema tests)
**Implementation**: Comments in schema file, ADR
**Benefit**: Clarity on enum value usage

### Polish 3: Foreign Key Naming Convention
**Description**: Standardize FK constraint names across schema
**Timeline**: KBAR-0020+ (schema tests)
**Implementation**: Pattern: `fk_{table}_{column}_{ref_table}`
**Benefit**: Easier debugging, consistent naming

### Polish 4: Index Naming Convention
**Description**: Standardize index names across schema
**Timeline**: KBAR-0020+ (schema tests)
**Implementation**: Pattern: `{schema}_{table}_{column}_idx`
**Benefit**: Avoid collisions, easier management

### Polish 5: Migration Rollback Scripts
**Description**: Document manual rollback SQL for each migration
**Timeline**: KBAR-0020+ (before production)
**Implementation**: Add `-- ROLLBACK:` section to migration files
**Benefit**: Emergency rollback capability

### Polish 6: Schema Validation Tests
**Description**: Automated tests to verify schema structure
**Timeline**: KBAR-0020 (schema tests story)
**Implementation**: Drizzle introspection + assertions
**Benefit**: Catch schema drift early

### Polish 7: Performance Benchmarks
**Description**: Baseline query performance metrics
**Timeline**: KBAR-0020+ (before optimization work)
**Implementation**: Benchmark suite with 1K, 10K, 100K rows
**Benefit**: Data-driven optimization decisions

### Polish 8: Connection Pool Configuration
**Description**: Tune connection pool for optimal performance
**Timeline**: Load testing phase
**Implementation**: Benchmark different pool sizes, set max/min connections
**Benefit**: Prevent connection exhaustion, optimize resource usage

### Polish 9: Query Timeout Configuration
**Description**: Set query timeout limits to prevent long-running queries
**Timeline**: Production deploy
**Implementation**: PostgreSQL `statement_timeout` setting
**Benefit**: Protect against runaway queries

### Polish 10: Backup and Recovery Testing
**Description**: Test database backup and restore procedures
**Timeline**: Before production deploy
**Implementation**: Weekly backup job, test restore from backup
**Benefit**: Disaster recovery readiness

---

## Recommended Prioritization

**High Priority** (address within 3 months):
- Risk 3: Artifact Content Cache Staleness
- Risk 4: Sync Event Log Growth
- Polish 2: Enum Value Documentation
- Polish 5: Migration Rollback Scripts

**Medium Priority** (address within 6 months):
- Risk 1: JSONB Query Performance at Scale
- Risk 7: Index Metadata Synchronization
- Future Requirement: Full-Text Search on Stories
- Polish 6: Schema Validation Tests

**Low Priority** (address when needed):
- Risk 2: Schema Evolution Without Versioning
- Risk 8: Multi-Tenant Isolation
- Future Requirement: Story Audit Trail
- Scope Tightening: Defer composite indexes, caching, index tables
