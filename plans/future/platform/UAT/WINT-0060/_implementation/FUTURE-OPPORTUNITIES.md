# Future Opportunities - WINT-0060

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Capabilities table lacks FK to features | Low | Low | Consider many-to-many join table (`feature_capabilities`) to explicitly link features to capabilities they provide. Current design assumes implicit mapping via metadata. |
| 2 | No soft-delete pattern for features | Low | Low | Consider adding `deletedAt` timestamp alongside `deprecatedAt` to support feature archival without cascade deletes. |
| 3 | Strength field has default but no CHECK constraint | Low | Low | Add PostgreSQL CHECK constraint `strength >= 0 AND strength <= 100` for database-level enforcement (currently only validated via Zod). |
| 4 | No audit trail for cohesion rule changes | Low | Medium | Consider `cohesionRuleHistory` table to track rule modifications over time (who changed, when, what changed). |
| 5 | Feature lifecycle not fully modeled | Medium | Medium | Story models `isActive` + `deprecatedAt` but lacks intermediate states (e.g., `experimental`, `beta`, `stable`, `deprecated`). Consider adding `lifecycleStage` enum similar to capabilities table. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Graph query performance testing deferred | Medium | Medium | NFT-001 in test plan acknowledges performance tests are manual. Future story should add automated performance benchmarks for common graph traversal patterns (find dependencies, reverse dependencies, circular detection). |
| 2 | No graph visualization schema | Low | High | Consider adding `graphLayout` JSONB field to `features` table to store UI positioning for graph visualization tools. Out of scope per Non-goals but could enable future viz work. |
| 3 | Cohesion rules lack priority/ordering | Low | Low | Multiple rules may apply to same feature. Consider adding `priority` integer field to `cohesionRules` for deterministic rule evaluation order. |
| 4 | No caching strategy for graph queries | Medium | High | Graph queries (especially transitive dependencies) may be expensive. Future optimization: add materialized view or cache table for pre-computed dependency chains. |
| 5 | Feature tags are free-form strings | Low | Medium | `features.tags` is JSONB array of strings. Consider separate `featureTags` table with predefined tag taxonomy for consistency (e.g., `domain:auth`, `layer:service`, `status:experimental`). |
| 6 | No bulk import/export support | Low | Medium | Schema doesn't include bulk operation patterns. Future work: add `featureBatch` table for tracking large-scale feature imports from static analysis tools. |
| 7 | Relationship metadata is unstructured | Low | Low | `featureRelationships.metadata` is JSONB with no defined schema. Consider structured fields like `detectedBy`, `detectedAt`, `confidence`, `reviewedBy` for better relationship provenance tracking. |

## Categories

- **Edge Cases**: Soft-delete vs hard-delete, CHECK constraints for strength, lifecycle stages
- **UX Polish**: Graph visualization layouts, feature tag taxonomy
- **Performance**: Query optimization (materialized views, caching), automated performance tests
- **Observability**: Cohesion rule change history, relationship provenance
- **Integrations**: Bulk import from static analysis tools (future story WINT-4030 may address)
