# Future Opportunities - KBAR-0010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No GIN indexes on JSONB metadata fields | Low - slower JSONB queries on `stories.metadata` field, acceptable for MVP with low volume | Medium - requires migration to add GIN indexes | Defer to KBAR-0020+ after actual query patterns emerge. Monitor query performance. If JSONB queries exceed 100ms, add: `CREATE INDEX idx_stories_metadata_gin ON kbar.stories USING GIN (metadata);` |
| 2 | No composite indexes for common query patterns | Low - queries on `(epic, phase, status)` may use sequential scan instead of index scan | Low - can be added non-destructively | Defer to KBAR-0020+ based on actual usage. Example: `CREATE INDEX idx_stories_epic_phase_status ON kbar.stories (epic, phase, status);` |
| 3 | Migration rollback not automated | Low - manual rollback required if migration fails | Medium - requires custom rollback script | Document manual rollback SQL in migration file comments. Consider automated rollback tooling in KBAR-0020+ or later infrastructure stories. |
| 4 | Artifact content cache staleness detection missing | Low - no mechanism to detect when `artifact_content_cache.content` is out of sync with filesystem | Medium - requires checksum comparison logic | Defer to KBAR-0030+ (Story Sync Functions). Sync logic will handle cache invalidation when files change. |
| 5 | Sync event log growth not managed | Low - `kbar.sync_events` table grows unbounded | Low - add TTL-based cleanup job | Defer to KBAR-0040+ or operations epic. Add cleanup job to delete events older than 90 days. |
| 6 | Enum value documentation missing in schema | Low - enum values defined but not documented with descriptions | Low - add comments to schema file | Enhance schema comments in KBAR-0020+ to document each enum value's meaning (e.g., `'backlog'` → "Story is in backlog, not yet ready for work"). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Full-text search on stories | Medium - improves story discoverability via title/description search | Medium - requires PostgreSQL full-text search indexes | Defer to KBAR-0080+ (Story List & Story Update Tools). Add: `CREATE INDEX idx_stories_fulltext ON kbar.stories USING GIN (to_tsvector('english', title || ' ' || coalesce(metadata->>'tags', '')));` |
| 2 | Story dependency graph visualization | High - dependency visualization helps understand story relationships | High - requires graph query optimization + UI | Defer to KBAR Phase 4+ (Lesson Extraction). Build on `kbar.story_dependencies` table with recursive CTE queries. Consider adding materialized view for faster graph queries. |
| 3 | Artifact version diffing | Medium - ability to compare artifact versions for change tracking | High - requires diff algorithm + storage | Defer to KBAR Phase 5+. Store diffs in `artifact_versions.diff` JSONB field. Use libraries like `diff` or `json-patch` for computing differences. |
| 4 | Index generation performance optimization | Low - batch index regeneration may be slow with 1000+ stories | Medium - requires batch processing optimization | Defer to KBAR-0240+ (Regenerate Index CLI). Implement cursor-based pagination and parallel processing. |
| 5 | Cross-epic story dependency tracking | Low - no explicit support for dependencies across epics (e.g., KBAR → WINT) | Medium - requires epic metadata + validation logic | Defer to KBAR Phase 6+. Extend `story_dependencies.dependency_type` with `cross_epic` value. Add validation to prevent circular cross-epic dependencies. |
| 6 | Schema validation tests (contract testing) | Medium - automated schema contract tests ensure backward compatibility | Low - can use `pg_dump` + schema diffing tools | Add to KBAR-0020+ (Schema Tests & Validation). Use tools like `migra` or `pg_diff` to detect schema drift between environments. |
| 7 | Performance benchmarking baseline | Low - no baseline performance metrics for KBAR schema queries | Low - requires seeding test data + query timing | Add to KBAR-0020+. Seed 10K stories, measure single read (<100ms), batch read of 50 (<5s), and index scan verification. Document in KBAR-0020 PROOF artifact. |

## Categories

**Edge Cases**:
- JSONB metadata with empty objects (tested in TEST-PLAN.md Edge Case 1)
- Large JSONB metadata (10KB, tested in TEST-PLAN.md Edge Case 3)
- Concurrent schema access (tested in TEST-PLAN.md Edge Case 5)

**UX Polish**:
- Full-text search on stories (Enhancement #1)
- Story dependency graph visualization (Enhancement #2)
- Artifact version diffing UI (Enhancement #3)

**Performance**:
- GIN indexes on JSONB fields (Gap #1)
- Composite indexes for common query patterns (Gap #2)
- Index generation batch optimization (Enhancement #4)
- Performance benchmarking baseline (Enhancement #7)

**Observability**:
- Sync event log growth management (Gap #5)
- Schema validation tests (Enhancement #6)

**Integrations**:
- Cross-epic story dependency tracking (Enhancement #5)
