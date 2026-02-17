# Future Opportunities - WINT-0131

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `unified-wint.ts` schema drift will increase after this story (capabilities will have `featureId` in `wint.ts` but not in `unified-wint.ts`) | Low | Low | Already accepted and tracked. The story adds a `// TODO: WINT-1100` comment in `unified-wint.ts`. No action needed here. |
| 2 | `capabilityType` field uses free-form text (e.g. 'create', 'read', 'update', 'delete') rather than a Postgres enum | Low | Medium | If a capability is seeded with a typo in `capabilityType`, the Franken-feature detection logic will silently undercount CRUD types. Consider adding a `capabilityTypeEnum` in a future story. Deferred because the WINT-0131 scope explicitly avoids schema changes beyond the featureId column. |
| 3 | The `packageName` filter parameter in `graph_get_franken_features` is Zod-validated but the DB query pattern in the story does not show how `packageName` is joined (via features.packageName). If the implementer omits the join filter, the parameter will be silently ignored. | Low | Low | The test AC-11(c) "packageName filter applied" should catch this. Low risk since the test plan includes this case. |
| 4 | No integration test in the story spec for migration 0027 against a real database | Low | Medium | AC-2 says migration applies cleanly, but no test verifies this programmatically. Manual verification step or a future CI migration test would be beneficial. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add an index on `(featureId, capabilityType)` composite for the Franken-feature grouping query | Medium | Low | The story specifies a single index on `feature_id`. A composite index on `(feature_id, capability_type)` would avoid a seq scan when grouping by capabilityType per feature as the capabilities table grows. Defer to when performance becomes an issue. |
| 2 | `FrankenFeatureItemSchema.missingCapabilities` is `z.array(z.string())` — could be typed as `z.array(z.enum(['create', 'read', 'update', 'delete']))` for stronger guarantees | Low | Low | Would make the output schema self-documenting and catch bugs in the CRUD completeness logic. Deferred per Non-Goal "Do NOT modify `__types__/index.ts`". |
| 3 | `CapabilityCoverageOutputSchema` `capabilities` object only tracks the 4 CRUD types (`create`, `read`, `update`, `delete`). The `wint.capabilities` table comments show `capabilityType` as 'business', 'technical', 'infrastructure' — these existing seed values will not be counted in the CRUD breakdown, returning `{create:0, read:0, update:0, delete:0}`. | Medium | Low | The story is aware of WINT-0080 seeding non-CRUD capability types. The 0-count result is valid per the schema. However, consumers may be confused. Consider adding an `otherCount` field in a future schema update. |
| 4 | Query result caching for `graph_get_franken_features` (full-table scan) | Medium | Medium | The Franken-feature query scans all capabilities and does in-application aggregation. As the graph grows (post-WINT-4040), this may be slow. Add Redis/DB-layer caching. Explicitly deferred in Non-Goals (from WINT-0130 DECISIONS.yaml gaps). |
| 5 | Pagination for `graph_get_franken_features` return value | Low | Low | If many features are Franken-features, the tool returns all of them. Deferred per Non-Goals. |
| 6 | Bidirectional Drizzle `with()` eager loading via the new `featuresRelations` / `capabilitiesRelations` | Low | Low | The story adds the Drizzle relation entries but uses explicit `.select().from().innerJoin()` queries rather than `with()` eager loading. The `with()` pattern would be more idiomatic Drizzle. Can be adopted as a refactor after WINT-0131. |

## Categories

- **Edge Cases**: capabilityType free-text typo risk (#2 in Gaps), packageName filter silent ignore risk (#3 in Gaps)
- **UX Polish**: Other capability type counts (#3 in Enhancements)
- **Performance**: Composite index (#1 in Enhancements), query result caching (#4 in Enhancements), pagination (#5 in Enhancements)
- **Observability**: CI migration test (#4 in Gaps)
- **Integrations**: `unified-wint.ts` sync in WINT-1100 (#1 in Gaps)
- **Future-Proofing**: capabilityType enum (#2 in Gaps), stronger Zod enum for missingCapabilities (#2 in Enhancements), Drizzle `with()` eager loading (#6 in Enhancements)
