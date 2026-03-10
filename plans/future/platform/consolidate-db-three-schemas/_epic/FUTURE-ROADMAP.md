# CDTS Epic Future Roadmap

**Date**: 2026-03-07
**Updated**: 2026-03-07 (redesigned to two-schema graph DB architecture)
**Scope**: Non-MVP Enhancements and Post-MVP Improvements

These items improve migration quality, observability, and long-term maintainability but do not block MVP launch.

## Security Enhancements

### Enhancement: Schema-Specific Grants for kbuser
**Priority**: High
**Effort**: Low
**Suggestion**: Ensure analytics schema includes `GRANT USAGE TO kbuser` in migration SQL. Currently handled in CDTS-1010 but should be verified comprehensively.
**Timing**: During Phase 1

### Enhancement: Post-Migration pg_hba.conf Verification
**Priority**: Medium
**Effort**: Low
**Suggestion**: Verify pg_hba.conf remains correct after migration. No regression in authentication rules.
**Timing**: Phase 3

## Platform/Observability Enhancements

### Enhancement: Migration Execution Logging
**Priority**: Medium
**Effort**: Medium
**Suggestion**: Implement structured logging for migration execution — DDL timestamps, affected rows, FK enforcement state.
**Timing**: Post-MVP

### Enhancement: Post-Migration Health Checks
**Priority**: Medium
**Effort**: Medium
**Suggestion**: Comprehensive automated health check suite:
  - Row count verification per table
  - Index integrity checks
  - Constraint validation
  - MCP server smoke tests with latency baselines
  - Drizzle query sampling across all tables
**Timing**: Post-MVP

## Graph Infrastructure Enhancements (Post Phase 2)

### Enhancement: Auto-link Stories to KB Entries
**Priority**: High
**Effort**: Medium
**Suggestion**: When a story produces a lesson/constraint/decision, automatically create a story_knowledge_links edge. Currently requires explicit tool calls.
**Timing**: Post Phase 2

### Enhancement: Graph Visualization
**Priority**: Low
**Effort**: High
**Suggestion**: Visual graph of story-KB relationships for debugging and exploration.
**Timing**: Future

### Enhancement: Embedding Backfill for Existing Stories
**Priority**: Medium
**Effort**: Low
**Suggestion**: Batch generate embeddings for all existing stories after CDTS-2010 deploys. IVFFlat index performance improves with more data.
**Timing**: Immediately after Phase 2

## Deferred Stories

None of the 11 CDTS stories can be deferred. All are required for core journey:
- Phase 0: Infrastructure foundation (CDTS-0010, CDTS-0020)
- Phase 1: Schema DDL, Drizzle, code (CDTS-1010 through CDTS-1050)
- Phase 2: Graph infrastructure (CDTS-2010, CDTS-2020)
- Phase 3: Aurora cleanup (CDTS-3010, CDTS-3020)

## Metrics

- **Total non-MVP suggestions**: 7
- **High-priority enhancements**: 2
- **Medium-priority enhancements**: 4
- **Low-priority enhancements**: 1
- **Deferred stories**: 0

## Notes for Future Iterations

- Once MVP launches, prioritize embedding backfill and auto-linking
- Consider generic migration framework for future database refactorings
- Monitor analytics schema query patterns — if agents start traversing into analytics, reconsider schema boundary
