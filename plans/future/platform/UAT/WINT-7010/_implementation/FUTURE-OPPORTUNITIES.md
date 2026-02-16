# Future Opportunities - WINT-7010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Agent versioning strategy not defined | Low | Medium | Design agent version compatibility matrix (WINT-7020) |
| 2 | Agent deprecation process not documented | Low | Low | Create agent lifecycle management guide (WINT-7020+) |
| 3 | Agent health monitoring not included | Low | Medium | Add agent execution telemetry (WINT Phase 3) |
| 4 | Agent performance profiling not in scope | Low | Medium | Add agent performance metrics (WINT Phase 3) |
| 5 | Dynamic agent loading strategy not defined | Low | High | Design runtime agent registry (WINT-7030+) |
| 6 | Agent permission model not fully documented | Medium | Low | Catalog permission level patterns in WINT-7020 |
| 7 | Agent spawn depth limits not analyzed | Low | Low | Add spawn depth analysis to SPAWN-GRAPH.md |
| 8 | Circular spawn dependencies not checked | Medium | Low | Add circular dependency detection to Phase 3 |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Interactive graph visualization | Medium | High | Create interactive Mermaid viewer with filtering (post-WINT) |
| 2 | Agent usage analytics | Medium | Medium | Track agent invocation frequency from telemetry (WINT Phase 3) |
| 3 | Automated frontmatter validation | Medium | Low | Add YAML schema validation for agent frontmatter (WINT-7020) |
| 4 | Agent diff tool | Low | Medium | Create tool to compare agent versions over time (post-WINT) |
| 5 | Agent template generator | Low | Medium | Create scaffolding tool for new agents (post-WINT) |
| 6 | Cross-platform agent compatibility | Low | High | Analyze agent portability across OS/environments (post-WINT) |
| 7 | Agent documentation auto-generation | Medium | Medium | Generate agent API docs from frontmatter (WINT-7120) |
| 8 | Agent search/filter CLI | Low | Low | Add `agent-search` command for querying catalog (post-WINT) |
| 9 | Agent dependency impact analysis | Medium | Medium | Tool to show cascade effects of agent changes (WINT-7020) |
| 10 | Agent performance benchmarking | Low | High | Benchmark agent execution times for optimization (post-WINT) |

## Categories

### Edge Cases
- **Malformed YAML frontmatter**: Some agents may have non-standard frontmatter → Error handling with partial metadata capture (MVP mitigation in place)
- **Agents in archive directory**: Archive agents flagged separately in orphan detection (MVP mitigation in place)
- **Multiple spawned_by values**: Some agents spawned by multiple parents → Graph shows all relationships (MVP handles)
- **Missing frontmatter fields**: Some agents may lack `type` or `version` → Partial metadata with gaps logged (MVP handles)

### UX Polish
- **Graph interactivity**: Static Mermaid graph may be hard to navigate with 143+ agents → Group by type or create subgraphs (MVP mitigation)
- **Orphan vs Archive distinction**: Need clear visual separation in ORPHANED-AGENTS.yaml → Add `status` field (archive/orphan/deprecated)
- **Cross-reference context**: References lack context about why they exist → Add `reference_type` metadata (spawn/include/invoke)
- **Search/filter capability**: Large catalog hard to navigate → Post-processing filter/search tool

### Performance
- **Grep pattern optimization**: Current patterns may have redundant scans → Optimize with single-pass multi-pattern grep (low priority)
- **Parallel file processing**: Sequential file reads could be parallelized → Use parallel Glob/Read for large directories (not needed for 143 files)
- **Incremental updates**: Full scan every time is wasteful → Cache catalog and only scan changed files (post-WINT feature)

### Observability
- **Scan metrics**: No metrics on scan duration or files processed → Add execution telemetry (WINT Phase 3 integration)
- **Parse error tracking**: Parse errors logged but not aggregated → Create parse error summary dashboard (post-WINT)
- **Coverage reporting**: No report on grep pattern coverage → Add pattern coverage metrics (low priority)

### Integrations
- **GitHub integration**: Link agents to GitHub PRs/issues → Post-WINT feature
- **KB integration**: Agent catalog not synced to KB → WINT Phase 2 (Context Cache) will handle
- **LangGraph integration**: Agent metadata not yet in LangGraph schema → WINT-1080/1090 (Phase 1 Foundation)
- **Telemetry integration**: Agent usage not tracked → WINT Phase 3 (Telemetry)

## Recommended Next Steps (Post-WINT-7010)

1. **WINT-7020 (immediate)**: Use audit artifacts to design agent migration plan
2. **WINT-7030-7090 (Phase 7)**: Execute migration batches using catalog and cross-references
3. **WINT-1080/1090 (Phase 1)**: Integrate agent metadata into LangGraph schema
4. **WINT Phase 3 (Telemetry)**: Add agent execution tracking and health monitoring
5. **Post-WINT**: Build agent search/filter CLI and interactive graph viewer

## Opportunities by Impact

### High Impact (prioritize post-MVP)
- Agent documentation auto-generation (Medium effort)
- Agent dependency impact analysis (Medium effort)
- Agent usage analytics (Medium effort)
- Interactive graph visualization (High effort)

### Medium Impact (consider for future sprints)
- Automated frontmatter validation (Low effort)
- Agent permission model documentation (Low effort)
- Circular spawn dependency detection (Low effort)
- Agent search/filter CLI (Low effort)

### Low Impact (backlog)
- Agent diff tool (Medium effort)
- Agent template generator (Medium effort)
- Agent performance benchmarking (High effort)
- Cross-platform compatibility analysis (High effort)
- Spawn depth analysis (Low effort)

## Notes

- All opportunities are non-blocking for WINT-7010 MVP
- Most opportunities better addressed in WINT-7020 (migration planning) or later phases
- Agent versioning and deprecation strategies are critical for WINT-7020 but not needed for audit
- Interactive visualizations and analytics are "nice-to-have" for long-term maintainability
- Focus on completing audit first, then use findings to inform WINT-7020 design decisions
