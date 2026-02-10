# Future Opportunities - WKFL-006

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | OUTCOME.yaml data not yet available (0 files) | Medium | N/A | Wait for WKFL-001 outcome generation to be activated. Story already includes fallback to VERIFICATION.yaml (37 files), so not blocking. Monitor downstream stories for OUTCOME.yaml activation. |
| 2 | Embedding similarity deferred (AC-4 partial compliance) | Medium | High | AC-4 specifies embedding similarity > 0.85 for clustering, but feasibility recommends text similarity for MVP (avoids external API dependency). Future enhancement: integrate OpenAI embeddings API or sentence-transformers library. Create follow-up story: "WKFL-006-B: Embedding-Based Clustering Upgrade". |
| 3 | Pattern feedback loop not tracked | Low | Medium | No mechanism to measure if pattern-based workflow improvements are effective. Future enhancement: track pattern → recommendation → outcome correlation. Example: "After adding hint for routes.ts lint pre-check, did routes.ts failure rate decrease?" Create follow-up story for effectiveness tracking. |
| 4 | Cross-project pattern aggregation | Low | High | Story scopes pattern mining to single monorepo only. Enterprise users may want patterns across multiple repos (e.g., microservices). Future enhancement: federated pattern mining with cross-repo correlation. Out of scope until multi-repo workflow established. |
| 5 | Interactive pattern exploration command | Low | Medium | No command for querying historical patterns (must read PATTERNS-{month}.yaml directly or query KB). Future enhancement: `/pattern-query --type file --correlation >0.7` for ad-hoc pattern exploration. Low priority - files are already human-readable. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Real-time pattern detection | Medium | High | Story limits pattern mining to batch mode (weekly or on-demand). Future enhancement: detect patterns in real-time during story execution. Example: "This is the 3rd story touching routes.ts this week - lint pre-check recommended." Requires streaming data integration. |
| 2 | Semantic code analysis | Medium | High | Story limits file/path patterns only (no code semantics or AST parsing). Future enhancement: detect code-level patterns (e.g., "missing error handling in async functions correlates with verification failures"). Requires AST parser integration. High effort, medium impact. |
| 3 | Automated agent prompt injection | Medium | Medium | Story generates AGENT-HINTS.yaml but requires manual integration into agent prompts. Future enhancement: automatic prompt injection system that merges hints into agent files during runtime. Requires agent architecture changes. |
| 4 | Weekly cron automation | Medium | Low | Story documents cron setup but leaves implementation for future. Enhancement: GitHub Actions workflow for weekly pattern mining (runs Monday 10am, commits outputs). Low effort once infrastructure established. |
| 5 | Pattern visualization dashboard | Low | High | PATTERNS-{month}.yaml and ANTI-PATTERNS.md are text-based. Future enhancement: web dashboard for visualizing pattern trends over time (charts, graphs, drill-down). Requires frontend infrastructure. Low priority - text outputs sufficient for MVP. |
| 6 | Pattern confidence scoring | Low | Medium | Patterns reported with correlation (0-1) but no confidence intervals or statistical significance testing. Future enhancement: add confidence scoring based on sample size, variance, statistical tests. Example: "0.78 correlation (95% CI: 0.62-0.89, p<0.05)". Useful for large datasets but overkill for MVP. |
| 7 | Multi-dimensional pattern detection | Medium | High | Current patterns are single-axis (file pattern, AC pattern, agent correlation). Future enhancement: detect multi-dimensional patterns. Example: "Stories with vague ACs AND touching 5+ files have 3.2x higher failure rate." Requires combinatorial analysis. High effort, medium impact. |
| 8 | Pattern decay tracking | Low | Medium | Patterns detected in month N may no longer apply in month N+3 (workflow evolves). Future enhancement: track pattern "staleness" and auto-archive patterns that no longer occur. Requires longitudinal analysis across multiple mining runs. |

## Categories

- **Edge Cases**: OUTCOME.yaml data unavailable (mitigated by VERIFICATION.yaml fallback), embedding similarity deferred (mitigated by text similarity MVP)
- **UX Polish**: Interactive pattern exploration, visualization dashboard, pattern confidence scoring
- **Performance**: Real-time pattern detection (vs batch mode), multi-dimensional pattern analysis
- **Observability**: Pattern feedback loop (effectiveness tracking), pattern decay tracking
- **Integrations**: Cross-project pattern aggregation, automated agent prompt injection, semantic code analysis

## Notes

- **Embedding upgrade (Gap #2)** is highest priority non-MVP item. AC-4 already calls for it, just deferred for MVP complexity. Create WKFL-006-B story when ready.
- **Weekly cron (Enhancement #4)** is lowest-effort enhancement. Document setup in this story, activate when infrastructure team ready.
- **Real-time detection (Enhancement #1)** would significantly increase impact but requires architectural changes (streaming data, event-driven pattern detection). Defer until MVP proves value.
- **Semantic code analysis (Enhancement #2)** would unlock powerful patterns but requires AST parsing infrastructure. Evaluate after file/path patterns prove useful.
