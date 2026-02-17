# Future Opportunities - WINT-0130

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Advanced JSONB pattern matching (regex, wildcards) deferred to future | Low | Medium | Story acknowledges basic pattern matching for MVP. Add JSONB regex/wildcard support after MVP validation. |
| 2 | Materialized views for query optimization deferred | Low | Medium | Story notes "may be needed based on performance". Add materialized views if graph query latency exceeds 500ms in production. |
| 3 | Graph visualization UI out of scope | Low | High | Story explicitly excludes UI. Consider separate story for graph visualization dashboard after Phase 4 completion. |
| 4 | Circular relationship handling edge case | Low | Low | Test plan includes TC-EDGE-001 (circular refs). Add cycle detection algorithm if needed based on test results. |
| 5 | Graph query performance monitoring | Medium | Low | No explicit metrics collection specified. Add telemetry for query latency, cache hit rates, and rule evaluation time. |
| 6 | JSONB schema versioning | Low | Medium | Conditions field is flexible JSONB. Add schema versioning if conditions format evolves across stories. |
| 7 | Rule conflict resolution strategy | Low | Medium | Cohesion rules may conflict (e.g., two rules with different severity for same violation). Add conflict resolution logic if needed. |
| 8 | Pagination for large result sets | Low | Low | TC-EDGE-008 tests 10,000 features. Add pagination to graph_get_franken_features if result sets exceed memory limits. |
| 9 | Capability maturity level aggregation | Low | Low | AC-8 includes maturity level distribution but no grouping by maturity. Add maturity-based filtering if needed. |
| 10 | Feature extraction from codebase | Medium | High | Story explicitly defers to separate story (WINT-4030). Graph population is out of scope for WINT-0130. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Query result caching | Medium | Medium | Add Redis/in-memory cache for frequently queried features (e.g., active features, all Franken-features). Invalidate on graph updates. |
| 2 | Bulk operations support | Low | Low | Add `graph_check_cohesion_bulk([featureIds])` for batch cohesion checks. Reduces agent invocation overhead. |
| 3 | Rule suggestion engine | Medium | High | Analyze violation patterns to suggest new cohesion rules. Leverage ML pipeline (Phase 5) for rule recommendations. |
| 4 | Graph diff tracking | Low | Medium | Track graph changes over time (features added/removed, relationships changed). Enable trend analysis. |
| 5 | Capability gap analysis | Medium | Medium | Add `graph_suggest_missing_capabilities(featureId)` that infers likely missing capabilities based on feature type and existing patterns. |
| 6 | Cohesion score calculation | Medium | Medium | Compute numeric cohesion score (0-100) per feature based on rule violations, capability coverage, and relationship strength. |
| 7 | Graph export to DOT/Graphviz | Low | Low | Add `graph_export_dot()` for external visualization tools (Graphviz, Gephi). |
| 8 | Dependency graph traversal | Low | Medium | Add `graph_get_transitive_dependencies(featureId)` to compute full dependency tree. Useful for impact analysis. |
| 9 | Feature health dashboard | Medium | High | Aggregate cohesion metrics, Franken-feature count, capability coverage trends into dashboard. Separate frontend story. |
| 10 | Agent-driven rule refinement | High | High | Phase 5 ML pipeline could learn from human rule overrides. Auto-tune rule thresholds based on false positive rate. |

## Categories

### Edge Cases
- Circular relationship detection (TC-EDGE-001)
- Self-referencing features (TC-EDGE-002)
- JSONB parsing errors (TC-EDGE-003)
- Database connection failures (TC-EDGE-004)
- Empty database handling (TC-EDGE-005)
- Large result set pagination (TC-EDGE-008)

### UX Polish
- Graph visualization UI (out of scope)
- Feature health dashboard (future)
- Bulk operations API (future)

### Performance
- Materialized views for optimization (deferred)
- Query result caching (future)
- Graph diff tracking (future)

### Observability
- Query performance telemetry (future)
- Rule evaluation metrics (future)
- Cohesion trend dashboards (future)

### Integrations
- LangGraph node integration (Phase 9: WINT-9030+)
- Agent implementation (Phase 4: WINT-4060, WINT-4070)
- Graph population (WINT-4030)
- Export to external visualization tools (future)
