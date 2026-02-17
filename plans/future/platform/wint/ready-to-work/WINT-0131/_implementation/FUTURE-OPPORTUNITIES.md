# Future Opportunities - WINT-0131

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Migration filename mismatch: Story AC-1 specifies `0027_wint_0131_capability_feature_linkage.sql` but the actual file on disk is `0027_wint_0131_capabilities_feature_fk.sql`. Both are valid; the discrepancy is cosmetic. | Low | Low | Update AC-1 documentation in a future story cleanup pass if consistent naming conventions are desired across all migrations. |
| 2 | No UAT integration test for migration 0027: The story correctly defers integration tests (ADR-005) but the pattern of providing at least one `.http` or SQL verification script for UAT reviewers is established in other WINT stories. | Low | Low | Add a `verification-query.sql` file under `_implementation/` that QA can run post-migration to confirm `wint.capabilities.feature_id` column exists. |
| 3 | `FeatureIdSchema` union ordering: The `FeatureIdSchema` in `__types__/index.ts` is `z.string().uuid().or(z.string().min(1))`. Because UUID is more specific, any valid UUID will also match `min(1)`, but Zod will always try the first branch first. This is correct but could lead to unexpected behavior if a non-UUID feature name happens to look UUID-like. | Low | Low | Add a comment to `FeatureIdSchema` explaining the intended resolution order, or add a test case for UUID-shaped feature names in AC-12(b). |
| 4 | `graph-query/index.ts` is a barrel file: CLAUDE.md forbids barrel files. The existing `src/graph-query/index.ts` re-exports all 4 tools and is a pre-existing WINT-0130 artifact outside this story's scope. | Low | Low | Tracked as tech debt. A future cleanup story should inline the imports and delete the barrel file. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Franken-feature detection for features with zero linked capabilities: The current design uses `innerJoin(features, ...)` which excludes features with no capabilities at all. AC-5 and Architecture Notes acknowledge this is expected behavior until WINT-4040 populates linkages. Post-WINT-4040, a LEFT JOIN variant could detect truly orphaned features. | Medium | Low | After WINT-4040 is complete, consider adding a `includeUnlinked: boolean` option to `graph_get_franken_features` that uses LEFT JOIN to surface features with zero linked capabilities. |
| 2 | Capability coverage maturity level distribution beyond known enum values: `CapabilityCoverageOutputSchema` uses `z.record(z.string(), z.number())` for `maturityLevels`, which is open-ended. If seed data uses inconsistent maturity level strings, the tool will return valid but hard-to-interpret distributions. | Medium | Low | Add a known-values list as a comment or soft validation warning if unexpected maturity level strings are encountered. Consider switching to a typed enum once all seed data is stable (post-WINT-4040). |
| 3 | `packageName` filter on `graph_get_franken_features` requires a join through `features.packageName`: The current query pattern joins `capabilities` to `features` and the `packageName` filter would need to be applied as a WHERE on `features.packageName`. This join path is correct but adds complexity. If the features table grows large, this may need index support. | Low | Low | Consider adding a composite index `(feature_id, capability_type)` on `capabilities` after WINT-4040 populates data, to support the Franken-feature query. |
| 4 | Test mock complexity for `graph_apply_rules`: The `graph_apply_rules` tool makes two separate DB queries (cohesion rules + all features). The `vi.hoisted()` mock pattern with chained `.from()` calls will need careful setup to distinguish between the two query targets. Failure to mock correctly will cause tests to pass vacuously. | Medium | Medium | Reference the `session-query.test.ts` pattern for multi-query mocking if available, or document the chaining approach in a test comment. |
| 5 | `unified-wint.ts` drift tracking: After this story, `wint.ts` will have `featureId` but `unified-wint.ts` will not. The story correctly adds a TODO comment. However, there is no automated check that this drift doesn't silently break imports. | Low | Medium | Consider adding a TypeScript compile-time check or integration test that asserts `unified-wint.ts` capabilities columns match `wint.ts` capabilities columns. Defer to WINT-1100. |
| 6 | Zod validation gap for `featureId` dual-ID: `FeatureIdSchema` accepts any non-empty string as a feature name. A very long feature name (e.g., 10,000 chars) would pass validation and generate a valid DB query. This is a minor edge case but could be tightened. | Low | Low | Add `z.string().max(255)` to the feature name branch of `FeatureIdSchema` for consistency with `packageName` (which already has `max(255)`). |

## Categories

- **Edge Cases**: Items 1, 3, 6 above (Franken-feature zero-capability, index performance, validation bounds)
- **UX Polish**: Item 2 (maturity level distribution typing)
- **Performance**: Item 3 (composite index post-WINT-4040)
- **Observability**: Item 2 (maturity level audit)
- **Integrations**: Item 5 (unified-wint.ts drift detection)
- **Tech Debt**: Item 4 (barrel file), Item 5 (unified-wint.ts drift)
