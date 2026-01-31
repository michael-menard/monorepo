# Future Opportunities - WISH-2007

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No automated migration testing in CI | Medium | Medium | Add CI job to test migrations on fresh database (prevents migration drift) |
| 2 | No migration rollback automation | Low | Medium | Create `db:rollback` script for development safety (production rollbacks always manual) |
| 3 | No migration performance monitoring | Low | Low | Add timing instrumentation to migrations (track execution time for large tables in future) |
| 4 | No schema drift detection | Medium | Low | Add `db:check` command that validates live database matches schema definition |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Migration documentation gaps | Medium | Low | Add inline comments in migration SQL explaining purpose of each index and constraint |
| 2 | No migration versioning strategy | High | High | Define schema evolution policy: (1) Never modify existing migrations, (2) Always add new migrations for changes, (3) Document breaking changes |
| 3 | Multi-environment coordination tool | High | High | Build migration orchestration tool for staging → production promotion with approval gates |
| 4 | Index creation optimization | Medium | Medium | Document `CREATE INDEX CONCURRENTLY` pattern for production tables with data (prevent table locks) |
| 5 | Migration smoke tests | Medium | Medium | Add seed data insertion after migration to verify constraints and indexes work as expected |
| 6 | Backup verification before migration | High | Medium | Automate pre-migration backup verification in production (ensure rollback possible) |
| 7 | Migration status dashboard | Low | High | Build UI showing migration state across all environments (dev, staging, prod) |
| 8 | Database connection pooling setup | Medium | High | Not in scope for this story, but required before WISH-2001 (tracked in Non-goals) |
| 9 | Schema evolution guide | High | Low | Document strategy for modifying `wishlist_items` table in future (add columns, modify constraints, etc.) |
| 10 | Enum modification procedure | High | Medium | Document workaround for PostgreSQL enum immutability (future stores/currencies require migration pattern) |

## Categories

### Edge Cases
- **Gap #2**: Rollback automation for development safety
- **Gap #3**: Migration performance monitoring for future large tables
- **Enhancement #5**: Smoke tests with seed data insertion

### UX Polish
- **Enhancement #1**: Migration SQL documentation with inline comments
- **Enhancement #7**: Migration status dashboard across environments

### Performance
- **Enhancement #4**: `CREATE INDEX CONCURRENTLY` for production tables with data
- **Gap #3**: Migration execution timing instrumentation

### Observability
- **Gap #1**: Automated migration testing in CI
- **Gap #4**: Schema drift detection tool
- **Enhancement #7**: Migration status dashboard

### Integrations
- **Enhancement #3**: Multi-environment orchestration tool with approval gates
- **Enhancement #6**: Pre-migration backup verification automation

### Future-Proofing
- **Enhancement #2**: Schema evolution policy and versioning strategy (CRITICAL for long-term maintenance)
- **Enhancement #9**: Schema evolution guide for modifying `wishlist_items`
- **Enhancement #10**: Enum modification procedure (workaround for PostgreSQL immutability)

## Notes

### High-Priority Future Work
The following enhancements should be prioritized after MVP (not blockers, but high value):

1. **Schema Evolution Policy (Enhancement #2)**: Required before any developer attempts to modify the schema. PostgreSQL migrations are unforgiving, need clear rules.

2. **Enum Modification Procedure (Enhancement #10)**: PostgreSQL enums cannot be modified after creation. Future stores (e.g., "Amazon", "Target") or currencies (e.g., "JPY", "CNY") require documented migration pattern.

3. **Schema Drift Detection (Gap #4)**: Catches developer errors where schema file is modified but migration is not generated.

4. **Multi-Environment Coordination (Enhancement #3)**: Manual coordination is error-prone at scale. Automation prevents production incidents.

### Low-Priority Nice-to-Haves
- Migration status dashboard (Enhancement #7): Pure convenience, not required
- Migration documentation (Enhancement #1): Helpful but not blocking
- Smoke tests (Enhancement #5): Seed scripts already exist in WISH-2000

### Deferred to Future Stories
- **Database connection pooling (Enhancement #8)**: Explicitly called out in Non-goals, likely WISH-2008 or dedicated infrastructure story
- **Backup verification (Enhancement #6)**: Production ops concern, not developer workflow
