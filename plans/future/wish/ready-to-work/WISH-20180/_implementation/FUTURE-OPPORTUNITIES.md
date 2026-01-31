# Future Opportunities - WISH-20180

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No detection for schema changes without migrations | Medium | Low | Add validation rule: if `schema/index.ts` modified but no new migration in `_journal.json`, fail CI with "migration required" message (referenced in Test Plan Edge Case 3 but not in ACs) |
| 2 | No validation for migration file immutability | Medium | Low | Add check: if PR deletes or modifies existing migration files (not the latest), fail CI with immutability error (referenced in Test Plan Edge Case 2 but not in ACs) |
| 3 | No performance benchmarking for validation script | Low | Low | Add CI step to measure validation script execution time, alert if exceeds 30s target (referenced in Risk 3 mitigation but not formally tracked) |
| 4 | No automated policy documentation sync verification | Medium | Medium | Add test that validates validation rules reference correct sections of `SCHEMA-EVOLUTION-POLICY.md` (AC 20 requires references but doesn't enforce automated verification) |
| 5 | Multiple migrations in single PR aggregation not specified | Low | Low | Test Plan Edge Case 1 describes behavior but ACs don't specify aggregation format in PR comment (implementation detail, but could improve UX) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Automated migration rollback testing | High | High | Generate rollback script for each migration and test in isolated database (referenced in WISH-2057 Non-goals and story's Future Enhancement Notes) |
| 2 | Schema change impact analysis | High | High | Analyze which services/endpoints reference modified tables/columns (requires cross-codebase analysis) |
| 3 | Migration performance profiling | Medium | Medium | Estimate migration execution time on production-sized datasets using EXPLAIN ANALYZE (prevents surprise long-running migrations) |
| 4 | Visual schema diff tool | Medium | Medium | Generate graphical schema diff for PR reviews showing table/column changes (referenced in Future Enhancement Notes) |
| 5 | Escape hatch tracking and reporting | Medium | Low | Log all uses of `<!-- schema-validation: skip -->` escape hatch for audit trail (mentioned in Risk 1 mitigation but no tracking specified) |
| 6 | Integration with external schema registries | Low | High | Publish schema versions to Confluent Schema Registry or similar for cross-service coordination |
| 7 | Breaking change severity classification | Medium | Medium | Classify breaking changes by severity (critical/high/medium/low) based on table usage patterns and dependent services |
| 8 | Automated deprecation timeline enforcement | Medium | Medium | For breaking changes requiring deprecation, enforce timeline (e.g., deprecated columns must remain for N releases) |
| 9 | Database-specific validation for Aurora PostgreSQL | Low | Medium | Add validation rules specific to Aurora PostgreSQL features/limitations (current story assumes generic PostgreSQL) |
| 10 | Migration dependency graph visualization | Low | Medium | Show migration dependencies and order constraints visually in PR comments |

## Categories

### Edge Cases
**Finding #1 (Gap):** Schema changes without migrations - Detects when Drizzle schema files are modified but no migration is generated, which could indicate developer forgot to run `pnpm db:generate`.

**Finding #2 (Gap):** Migration file immutability - Prevents developers from modifying historical migrations, which breaks deterministic migration replay.

**Finding #5 (Gap):** Multiple migration aggregation - When a PR contains 3+ new migrations, the PR comment format should clearly separate results for each migration.

### UX Polish
**Enhancement #4:** Visual schema diff - Provides reviewers with graphical representation of schema changes, reducing cognitive load during code review.

**Enhancement #7:** Breaking change severity - Helps reviewers prioritize review effort based on impact (critical changes get more scrutiny).

**Enhancement #10:** Migration dependency graph - Visualizes complex migration sequences, especially useful when migrations have data dependencies.

### Performance
**Finding #3 (Gap):** Performance benchmarking - Ensures validation script doesn't become a bottleneck in CI pipeline as migration complexity grows.

**Enhancement #3:** Migration performance profiling - Prevents production incidents from unexpectedly slow migrations (e.g., adding index to large table without CONCURRENTLY).

### Observability
**Enhancement #5:** Escape hatch tracking - Creates audit trail for policy overrides, enabling governance review and pattern detection.

**Enhancement #7:** Breaking change severity classification - Provides metrics for tracking schema evolution health over time.

### Integrations
**Enhancement #2:** Schema change impact analysis - Cross-references schema changes with service dependencies, answering "which APIs will this affect?"

**Enhancement #6:** External schema registries - Enables Kafka producers/consumers and other services to stay synchronized with schema versions.

### Governance
**Finding #4 (Gap):** Automated policy-rule sync - Prevents drift between documented policies and validation rules implementation (policy says "X is breaking" but validation doesn't check for it).

**Enhancement #1:** Automated rollback testing - Highest-impact enhancement, validates that every migration can be safely rolled back (critical for production safety).

**Enhancement #8:** Deprecation timeline enforcement - Automates enforcement of deprecation periods for breaking changes (e.g., "column must remain for 2 releases").

---

## Prioritization Guidance

**High-Priority (Next Iteration):**
1. Gap #1: Schema changes without migrations (prevents developer error)
2. Gap #2: Migration file immutability (prevents data integrity issues)
3. Enhancement #1: Automated rollback testing (production safety)

**Medium-Priority (Phase 2):**
4. Gap #4: Policy-rule sync verification (governance quality)
5. Enhancement #2: Schema change impact analysis (developer productivity)
6. Enhancement #3: Migration performance profiling (production safety)

**Low-Priority (Future):**
7. Enhancement #4: Visual schema diff (nice-to-have)
8. Enhancement #7: Breaking change severity (analytics)
9. Enhancement #8: Deprecation timeline (governance)
10. All other enhancements (deferred until proven need)
