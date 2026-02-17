# Future Opportunities - WINT-0150

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No explicit versioning strategy for dual-source metadata when BOTH file and database have version fields | Low | Low | Document version resolution rule: use database version if present, else file version. Currently implied by "database overrides" but not explicit for version field. |
| 2 | MCP tool names for postgres-knowledgebase workflow queries are hypothetical (`workflow_get_phases`, `workflow_get_components`) | Low | Low | Update doc-sync.agent.md frontmatter with actual MCP tool names once WINT-0080+ stories define them. Story already documents graceful degradation if tools don't exist. |
| 3 | No cache invalidation strategy for database query results | Low | Medium | If database queries become frequent, add caching layer (e.g., 5-minute TTL) to avoid repeated identical queries during single sync run. Currently acceptable because sync is on-demand. |
| 4 | SYNC-REPORT.md format extension for database query status is not fully specified | Low | Low | Define exact format for "Database queried: Yes/No" section in SYNC-REPORT.md. Include: query success/failure, row counts returned, any merge conflicts detected. |
| 5 | No handling for database query timeout scenarios in Error Handling Strategy table | Low | Low | Add "MCP tool timeout" row to Error Handling Strategy table with behavior: "Log timeout, fall back to files". Currently implied by "Database unavailable" but not explicit for timeout vs connection failure. |
| 6 | Test scenario 6 (Error Handling) uses "mock postgres-knowledgebase" but no mocking strategy documented | Low | Low | Document mocking approach: use MCP server test mode OR inject test data into actual database. Recommend actual database for integration test fidelity. |
| 7 | Fixture "sample-db-state.sql" is listed but content not provided | Low | Low | Create sample-db-state.sql in test/fixtures/ directory with 3-5 example agents in workflow.components and 3-5 phases in workflow.phases. Defer to implementation phase. |
| 8 | No rollback strategy if database queries corrupt SYNC-REPORT.md or documentation | Low | Low | Add git restore recommendation to Troubleshooting section. Since doc-sync uses git diff, user can always `git restore docs/` if sync fails. |
| 9 | Agent frontmatter `spawns` field may reference database-sourced agents that don't have .agent.md files | Medium | Low | Phase 5 (Mermaid Diagram Regeneration) should query database for agent existence before including in diagram. Add validation step: "Check if spawned agent exists in files OR database". |
| 10 | No explicit handling for WINT Phase 0-9 structure in existing Section Mapping table | Low | Low | Extend Phase 3 Section Mapping table with WINT phase patterns (e.g., `wint-*.agent.md` → `docs/workflow/phases.md` Phase 0-9 sections). Story mentions "WINT phase structure" in AC-2 but doesn't update mapping table. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Watch mode for continuous sync during development (documented in Future Enhancements section of doc-sync.agent.md) | Medium | High | Implement file watcher (chokidar or similar) to auto-run doc-sync on .agent.md/.command.md changes. Useful for active development sessions. Not MVP-critical. |
| 2 | Mermaid-cli integration for diagram validation (documented in Future Enhancements section of doc-sync.agent.md) | Low | Medium | Add mermaid-cli validation step after diagram generation to catch syntax errors before writing. Currently relies on manual regex validation which may miss complex errors. |
| 3 | Database query result caching for performance | Medium | Medium | Add in-memory cache for database query results during single sync run (avoid re-querying workflow.phases multiple times if processing multiple agents). Token savings minimal but improves latency. |
| 4 | Intelligent diff-based updates (only changed sections) | Low | High | Currently doc-sync regenerates entire documentation sections. Enhancement: Use Edit tool with targeted diffs to only update changed rows in tables. Reduces git diff noise. |
| 5 | Automatic PR creation for doc updates | Medium | High | After successful sync, create GitHub PR with documentation changes for review before merge. Integrates with existing pre-commit hook workflow. Requires gh CLI integration. |
| 6 | Configuration file for custom section mappings | Low | Medium | Allow .claude/config/doc-sync.yaml to override default Section Mapping patterns. Useful for teams with custom agent naming conventions. |
| 7 | Database-driven spawn relationships (not just file frontmatter `spawns` field) | High | Medium | Query workflow.components table for agent relationships to build Mermaid diagrams. Enables spawn graphs even when .agent.md files don't exist (database-only agents). **Recommend for Phase 2+ after WINT-0070/0080 complete.** |
| 8 | Multi-database support (not just postgres-knowledgebase) | Low | High | Abstract database queries behind interface to support SQLite, MySQL, etc. Over-engineering for current needs (postgres-knowledgebase is established). Defer indefinitely. |
| 9 | Telemetry integration for doc-sync runs | Medium | Low | Log doc-sync runs to telemetry.agent_invocations table (WINT-0120 dependency). Track: sync duration, files processed, database query latency, error rate. Useful for WINT Phase 3 observability goals. |
| 10 | Agent documentation auto-generation from database metadata | High | High | Generate .agent.md files from workflow.components table for database-only agents. Reverses current flow (files → database). Useful for WINT migration endgame (Phase 7+). **Recommend as separate story in WINT Phase 7.** |
| 11 | Diff preview mode (`--preview` flag) | Low | Low | Show what WOULD change without writing files. Similar to `--check-only` but with detailed diff output. Useful for debugging and pre-commit review. |
| 12 | SYNC-REPORT.md format versioning | Low | Low | Add `version: 1.0.0` to SYNC-REPORT.md frontmatter to track report format changes over time. Enables backward compatibility if report structure evolves. |
| 13 | Database schema version detection | Medium | Medium | Query workflow schema version (e.g., `SELECT version FROM schema_migrations`) to detect incompatible schema changes. Warn user if doc-sync was built for schema v1 but database is now v2. |
| 14 | Parallel processing for file discovery and database queries | Low | Medium | Run git diff file discovery and database queries in parallel to reduce latency. Minimal benefit (both operations are fast) but improves perceived performance. |
| 15 | Agent hierarchy visualization from database | High | High | Generate agent hierarchy diagrams (Orchestrator → Leader → Worker) from workflow.components relationships. Extends existing Mermaid diagram generation with hierarchical layout. **Recommend for WINT Phase 4+ (Graph & Cohesion).** |

## Categories

### Edge Cases
- Gap #1: Version field resolution (database vs file)
- Gap #5: Database query timeout vs connection failure
- Gap #9: Spawned agents exist in database but not files

### UX Polish
- Enhancement #1: Watch mode for continuous sync
- Enhancement #11: Diff preview mode (`--preview` flag)
- Enhancement #12: SYNC-REPORT.md format versioning

### Performance
- Gap #3: Database query result caching
- Enhancement #3: Database query result caching (same as Gap #3)
- Enhancement #4: Intelligent diff-based updates
- Enhancement #14: Parallel processing

### Observability
- Enhancement #9: Telemetry integration for doc-sync runs
- Enhancement #13: Database schema version detection

### Integrations
- Enhancement #2: Mermaid-cli integration for validation
- Enhancement #5: Automatic PR creation for doc updates
- Enhancement #6: Configuration file for custom mappings
- Enhancement #7: Database-driven spawn relationships (HIGH IMPACT)
- Enhancement #10: Agent documentation auto-generation from database (HIGH IMPACT)
- Enhancement #15: Agent hierarchy visualization from database (HIGH IMPACT)

### Future-Proofing
- Gap #2: MCP tool names are hypothetical (update once tools exist)
- Gap #10: WINT Phase 0-9 structure in Section Mapping
- Enhancement #8: Multi-database support (low priority, over-engineering)

---

## Prioritization Recommendations

### High Priority (Consider for Next Iteration)
1. **Enhancement #7: Database-driven spawn relationships** - HIGH IMPACT, enables spawn graphs for database-only agents. Natural extension of dual-source pattern. Recommend as WINT-0150-B or defer to WINT-2xxx phase.
2. **Enhancement #10: Agent documentation auto-generation** - HIGH IMPACT, critical for WINT Phase 7 migration endgame. Recommend as separate story in WINT-7xxx.
3. **Enhancement #15: Agent hierarchy visualization** - HIGH IMPACT, extends Mermaid diagrams with hierarchy. Natural fit for WINT Phase 4 (Graph & Cohesion). Recommend as WINT-4xxx story.

### Medium Priority (Track for Later Phases)
4. **Enhancement #9: Telemetry integration** - Aligns with WINT Phase 3 goals. Add when WINT-0120 is complete.
5. **Enhancement #1: Watch mode** - Useful for active development, but not critical. Implement after WINT-0150 stabilizes.
6. **Gap #9: Spawned agents validation** - Medium impact, affects diagram accuracy. Include in WINT-0150 if time permits, else defer.

### Low Priority (Track as Nice-to-Have)
7. All other gaps and enhancements - Address on-demand or when user reports issue.

---

## Cross-Story Dependencies

- **WINT-0070** (Create Workflow Tracking Tables): Required for database queries in WINT-0150. Story already documents graceful degradation.
- **WINT-0080** (Seed Initial Workflow Data): Provides test data for WINT-0150. Story already documents sample-db-state.sql fixture.
- **WINT-0120** (Create Telemetry MCP Tools): Enables Enhancement #9 (telemetry integration).
- **WINT-4xxx** (Graph & Cohesion stories): Natural home for Enhancement #15 (agent hierarchy visualization).
- **WINT-7xxx** (Migration stories): Natural home for Enhancement #10 (agent documentation auto-generation).

---

## Summary

- **Total Gaps:** 10 (all non-blocking, low-to-medium impact)
- **Total Enhancements:** 15 (3 high-impact, 5 medium-impact, 7 low-impact)
- **MVP Blockers:** 0
- **Recommended Follow-Up Stories:** 3 (Enhancements #7, #10, #15)

All findings are non-blocking. Story WINT-0150 is ready to implement as-is. The identified gaps and enhancements provide a roadmap for iterative improvements aligned with WINT Phases 2-7.
