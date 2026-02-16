# Future Opportunities - WINT-0010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No schema versioning metadata | Low | Low | Add `schema_version` metadata table to track schema evolution over time |
| 2 | No soft-delete pattern enforcement | Low | Medium | Consider standardizing soft-delete pattern across all WINT schemas (e.g., `deleted_at` column) |
| 3 | Missing data retention policies | Low | Medium | Define TTL/retention rules for telemetry and context cache data (e.g., auto-purge old telemetry after 90 days) |
| 4 | No full-text search indexes | Medium | Medium | Add GIN indexes for full-text search on story titles, descriptions, and decision context (PostgreSQL `tsvector`) |
| 5 | No database-level validation rules | Low | Low | Consider CHECK constraints for business rules (e.g., state machine transitions, required fields per state) |
| 6 | No audit triggers | Medium | Medium | Add PostgreSQL triggers to auto-populate `updated_at` timestamps and maintain audit trails |
| 7 | No partition strategy for large tables | Medium | High | Plan partitioning strategy for telemetry tables (likely to grow large) - partition by `created_at` month |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Performance: Add materialized views | Medium | Medium | Create materialized views for common analytics queries (e.g., story state counts, agent invocation summaries) |
| 2 | Performance: Add covering indexes | Medium | Low | Add covering indexes (INCLUDE clause) to avoid index-only scans for hot paths |
| 3 | Observability: Schema change tracking | Low | Low | Add metadata table to track when each schema was created/modified for troubleshooting |
| 4 | Observability: Query performance monitoring | Medium | Medium | Integrate `pg_stat_statements` extension to monitor WINT schema query performance |
| 5 | UX: Add database comments | Low | Low | Use PostgreSQL COMMENT ON syntax to add descriptions to tables/columns (complements JSDoc) |
| 6 | UX: Generate ERD diagrams | Low | Low | Auto-generate Entity-Relationship Diagrams from schema for documentation |
| 7 | Integration: Add foreign data wrapper support | Low | High | Prepare schemas for potential cross-database queries via PostgreSQL FDW (if WINT moves to separate DB) |
| 8 | Integration: Add PostgREST compatibility | Low | Medium | Ensure schema naming/structure is PostgREST-compatible for potential auto-generated API layer |
| 9 | Security: Row-level security policies | Medium | High | Define RLS policies for multi-tenant isolation (if WINT supports multiple projects/workspaces) |
| 10 | Security: Encryption at rest metadata | Low | Medium | Add metadata columns to track which fields contain sensitive data for encryption-at-rest compliance |

## Categories

### Edge Cases
- **Gap #2**: Soft-delete pattern not enforced - some schemas may need soft deletes for audit compliance
- **Gap #5**: Database-level validation rules missing - relying solely on application-level validation

### Performance
- **Enhancement #1**: Materialized views for analytics queries (e.g., weekly reports, dashboards)
- **Enhancement #2**: Covering indexes to reduce I/O for read-heavy workloads
- **Gap #7**: Partition strategy for large telemetry tables (prevent table bloat)

### Observability
- **Enhancement #3**: Schema change tracking metadata table
- **Enhancement #4**: Query performance monitoring via `pg_stat_statements`
- **Enhancement #5**: Database comments for schema documentation

### Integrations
- **Enhancement #7**: Foreign data wrapper support for cross-database queries
- **Enhancement #8**: PostgREST compatibility for auto-generated APIs

### Security
- **Enhancement #9**: Row-level security for multi-tenant isolation
- **Enhancement #10**: Encryption-at-rest metadata tracking

### Data Governance
- **Gap #1**: Schema versioning metadata (track schema evolution)
- **Gap #3**: Data retention policies (auto-purge old telemetry data)
- **Gap #6**: Audit triggers for automatic timestamp updates

### Developer Experience
- **Enhancement #6**: Auto-generated ERD diagrams from schema
- **Gap #4**: Full-text search indexes for natural language queries

## Notes

- Most gaps are low-impact and can be deferred to future stories (WINT-0080+)
- Performance enhancements should be driven by actual usage patterns (measure first, optimize later)
- Security enhancements (RLS, encryption metadata) depend on product requirements (single-tenant vs. multi-tenant)
- Integration opportunities (FDW, PostgREST) are speculative - only pursue if use case emerges
