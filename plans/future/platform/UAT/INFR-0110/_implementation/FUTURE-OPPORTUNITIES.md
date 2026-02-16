# Future Opportunities - INFR-0110

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No validation for JSONB field structure at database level | Low | Medium | PostgreSQL cannot enforce JSONB structure natively. Current mitigation (drizzle-zod validation before insert) is sufficient for MVP. Future: Consider adding CHECK constraints with jsonb_path_exists() for critical fields like acceptance_criteria array structure |
| 2 | No guidance on handling large JSONB payloads (>1MB) | Low | Low | Story assumes max ~20 ACs per story, ~50 file changes per plan. If payloads grow beyond 1MB, query performance may degrade. Monitor JSONB field sizes post-launch and add documentation on normalization thresholds |
| 3 | Migration rollback testing not automated | Low | Medium | Story specifies manual rollback testing in Test Plan AC. Future: Add automated migration rollback tests to CI/CD pipeline to prevent accidental breaking changes |
| 4 | No indexing strategy for JSONB fields | Medium | High | Composite indexes cover story_id and artifact_type, but cannot efficiently query JSONB contents (e.g., "find all stories with AC-3"). Future: Add GIN indexes on JSONB fields if query patterns require it (track in INFR-0020+ stories) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Normalize acceptance criteria to separate table | High | High | Current JSONB approach trades query flexibility for co-location. If queries like "show all AC-3 across all stories" become common, migrate to normalized acceptance_criteria table with FK to story_artifacts. Defer until INFR-0020 usage patterns are established |
| 2 | Add artifact schema versioning | Medium | Medium | Current approach assumes schema field names won't change. If Zod artifact schemas evolve (e.g., rename acceptance_criteria → acs), JSONB fields may drift. Future: Add artifact_schema_version column to track schema compatibility |
| 3 | Materialize common aggregates | Medium | High | Queries like "count stories by state" or "count ACs per story" will require JSONB unnesting. Future: Add materialized views for performance (e.g., story_ac_counts, story_risk_counts) |
| 4 | Partition tables by created_at | Low | High | As artifact data grows (thousands of stories), query performance may degrade. Future: Implement table partitioning by created_at (monthly or yearly) to improve query performance on large datasets |
| 5 | Add full-text search on artifact content | Medium | Medium | Current schema does not support full-text search across artifact fields (e.g., "find stories mentioning 'authentication'"). Future: Add tsvector columns with GIN indexes for PostgreSQL full-text search |
| 6 | Add soft delete support | Low | Medium | Current ON DELETE CASCADE is destructive. Future: Add deleted_at column for soft deletes to enable audit trails and restore capability |

## Categories

### Database Design
- **JSONB vs Normalized Tables**: Trade-off between co-location (JSONB) and query flexibility (normalized). Current choice is correct for MVP, revisit based on INFR-0020 usage patterns
- **Index Strategy**: Composite indexes cover most query patterns, but JSONB-specific indexes (GIN) deferred until query patterns emerge
- **Schema Evolution**: No explicit versioning for JSONB structure. Acceptable for MVP, but may need migration strategy if Zod schemas change field names

### Performance
- **Large Payload Handling**: No explicit guidance on JSONB size limits. Assumption (~100KB per artifact) is reasonable for MVP, but needs monitoring
- **Materialized Views**: Aggregates like AC counts will require JSONB unnesting. Performance acceptable for MVP scale (<1000 stories), but may need optimization later
- **Partitioning**: Not needed for MVP scale, but should be planned for production with thousands of stories

### Data Integrity
- **JSONB Validation**: Relies on application-level validation (drizzle-zod) rather than database-level constraints. Acceptable for MVP with single writer (INFR-0020), but consider CHECK constraints for production
- **Cascade Behavior**: ON DELETE CASCADE is correct for MVP (story deletion is rare), but consider soft deletes for audit trail

### Observability
- **Migration Rollback**: Manual testing specified, but automated rollback tests would improve confidence
- **Schema Drift Detection**: No automated checks that Drizzle schema matches Zod artifact schemas. Future: Add integration test comparing field definitions

## Recommendations for INFR-0020 (Artifact Writer/Reader Service)

When implementing INFR-0020, consider these patterns:

1. **Validation Strategy**: Use drizzle-zod insert schemas for runtime validation before database writes
2. **Error Handling**: Catch JSONB validation errors and provide clear error messages (field path, expected structure)
3. **Query Patterns**: Track which JSONB fields are queried frequently. If queries like "find all stories with AC-3" are common, flag for normalization
4. **Size Monitoring**: Log JSONB payload sizes to detect stories with abnormally large ACs or file change lists (potential normalization candidates)
5. **Schema Compatibility**: Document mapping between Zod artifact field names and Postgres column names (camelCase vs snake_case transformation)

## Long-Term Vision (Post-INFR-0120)

After both INFR-0110 and INFR-0120 complete:

- **Unified Artifact Query API**: MCP tools can query across all 7 artifact types (story, checkpoint, scope, plan, evidence, review, qa-verify)
- **Cross-Artifact Analytics**: Enable queries like "average review cycles per story type" or "most common blockers by epic"
- **Knowledge Graph**: Connect artifacts to features (WINT-0060 graph relational schema) for cohesion analysis
- **ML Training Data**: Use artifact history as training data for WINT-0050 ML pipeline (quality prediction, effort estimation)
