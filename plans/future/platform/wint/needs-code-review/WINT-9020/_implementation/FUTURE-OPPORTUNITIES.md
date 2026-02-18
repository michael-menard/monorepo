# Future Opportunities - WINT-9020

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Edge case: Agent file deleted (`D` diff status) — table row removal logic in Phase 4 is referenced in TEST-PLAN.md EG-3 but the story only covers added/modified explicitly in AC-2 Phase 4 language ("Added agent, Modified agent, Deleted agent" is in SKILL.md Phase 4). Verify the native implementation handles the `D` git diff prefix for deleted files. | Medium | Low | Include deleted-file handling in ST-4 implementation and EG-3 test coverage in ST-7. |
| 2 | Edge case: `--check-only` + `--force` combined mode (EG-5) — AC-3 states `checkOnly=true` prevents doc writes but `force=true` bypasses git diff. The combined behavior (all files checked, none written) must be explicitly handled in the priority logic of `docSyncImpl`. | Low | Low | Add explicit flag precedence comment in ST-6 implementation: `force` determines file list, `checkOnly` determines write permission. EG-5 test confirms this. |
| 3 | Large batch processing (EG-4 — 50 files) — no concurrency or batch-size limit is specified. Native TypeScript implementation that processes 50 files sequentially may be slow. | Low | Medium | Defer to a follow-up story: add configurable `batchSize` to `DocSyncConfigSchema` for parallel phase execution across files. Not required for MVP. |
| 4 | `repoRoot` config parameter for git subprocess `cwd` — DEV-FEASIBILITY.md Risk 4 identifies that if `cwd` is wrong during `git diff`, no files are detected. `DocSyncConfigSchema` has `workingDir` but no explicit `repoRoot` separation. | Low | Low | Add `repoRoot: z.string().optional()` to `DocSyncConfigSchema` in ST-2. Defaults to `workingDir`. Git commands run against `repoRoot`, file operations against `workingDir`. |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Observability: Add structured logging for each phase start/end with duration tracking. Currently only errors and warnings are logged. Phase-level timing would help diagnose slow runs. | Low | Low | Add `logger.info('Phase N complete', { phase: N, duration_ms: X })` after each phase. Useful for future telemetry (WINT-3020). |
| 2 | Performance: Phase 4 surgical edit uses regex-based section anchoring. A future enhancement could cache the parsed section indices across multiple file updates within a single run, avoiding repeated full-file reads. | Low | Medium | Defer to follow-up after benchmarking real-world performance on 50+ agent files. |
| 3 | Resilience: Phase 3 section mapping currently maps unknown patterns to `manualReviewNeeded`. A configurable `customMappings: Record<string, string>` in `DocSyncConfigSchema` could allow LangGraph orchestrators to inject additional pattern→section mappings without modifying the node code. | Medium | Low | Add `customPatternMappings: z.record(z.string(), z.string()).optional()` to `DocSyncConfigSchema`. Useful once WINT-9060 orchestrates this node in different contexts. |
| 4 | Parity validation: AC-13 requires identical outputs but defines "identical" as same structural counts. A stronger future guarantee would compare section content diffs, not just counts. The fixture test (EG-6) provides count equality — full content comparison is a Phase 9 parity suite concern (WINT-9120). | Medium | High | Defer to WINT-9120 (Workflow Parity Test Suite). The EG-6 fixture test satisfies AC-13 for MVP. |
| 5 | Accessibility: SYNC-REPORT.md is currently a freeform Markdown document. A structured SYNC-REPORT.yaml alongside the Markdown (machine-readable output) would allow downstream LangGraph nodes to consume sync results without parsing Markdown. | Medium | Low | Add `reportFormat: z.enum(['markdown', 'yaml', 'both']).default('markdown')` to `DocSyncConfigSchema`. Defer until WINT-9060 requires structured input. |
| 6 | Analytics: Phase 2 DB query status (`database_status`, `database_components_count`, `database_phases_count`, `query_duration_ms`) is captured in SYNC-REPORT.md but not returned in `DocSyncResultSchema`. Future ML pipeline (WINT-5040) could use these metrics as training signals for database health prediction. | Low | Low | Extend `DocSyncResultSchema` with optional `dbQueryDurationMs: z.number().optional()` and `dbComponentsCount: z.number().optional()` after MVP. |
| 7 | Integration: When Phase 4 finds that an expected section anchor (e.g., a phase header in `phases.md`) is missing, it marks the file as `manualReviewNeeded`. A future enhancement could attempt section auto-creation using a template. | Low | High | Defer — auto-creation is risky without human review. The current manual-review fallback is correct for MVP. |

---

## Categories

- **Edge Cases**: Items 1 (deleted files), 2 (combined flags), 3 (large batch concurrency)
- **UX Polish**: Item 5 (structured SYNC-REPORT.yaml output)
- **Performance**: Items 2 (sequential processing), 4 (deeper parity validation)
- **Observability**: Items 1 (phase timing), 6 (DB metrics in result schema)
- **Integrations**: Items 3 (custom pattern mappings), 7 (auto-section creation), 4 (repoRoot config)
- **Future Stories**: WINT-9120 (parity test suite), WINT-9060 (batch orchestration), WINT-5040 (ML telemetry)
