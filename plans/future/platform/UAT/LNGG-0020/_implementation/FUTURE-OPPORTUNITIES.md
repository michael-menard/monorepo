# Future Opportunities - LNGG-0020

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Column order validation** | Low | Low | Add validation to ensure table columns match expected order. Currently assumes fixed order. |
| 2 | **Missing optional columns** | Low | Low | Handle tables that don't have Priority column (some waves omit it). Currently assumes all columns present. |
| 3 | **Malformed table recovery** | Medium | Medium | Add error recovery for tables with mismatched row/column counts. Currently will throw error. |
| 4 | **Unicode emoji edge cases** | Low | Low | Test with full emoji range (⚡🎯✨🔥🚀). Story only mentions three specific emojis. |
| 5 | **Large file streaming** | Medium | High | For 1000+ story indexes, consider streaming line-by-line instead of loading entire file. Currently loads all into memory. |
| 6 | **Concurrent write conflict resolution** | High | High | File locking mechanism or conflict detection for simultaneous updates. Currently last-write-wins with atomic writes. |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Markdown AST parser (remark/unified)** | High | Medium | Upgrade from regex to remark/unified for robust markdown parsing. Story mentions this as future upgrade path. |
| 2 | **Index format migration tools** | Medium | High | Tools to migrate from markdown tables to YAML/JSON if format changes. Explicitly out of scope now. |
| 3 | **Batch update operations** | Medium | Medium | Following StoryFileAdapter pattern, add `updateBatch()` for multiple status updates in single write. |
| 4 | **Diff visualization** | Low | Medium | Generate diff report showing what changed after update operation. Useful for debugging. |
| 5 | **Index validation CLI** | Low | Low | Command-line tool to validate index files: `pnpm validate-index platform.stories.index.md` |
| 6 | **Auto-fix validation errors** | Medium | High | When validation detects issues (duplicate IDs, broken refs), offer auto-fix suggestions. |
| 7 | **Dependency graph export** | Low | Medium | Export dependency graph to DOT/Mermaid format for visualization. Story says "no visualization" but export != render. |
| 8 | **Cross-index validation** | Medium | High | Validate dependencies across multiple index files (e.g., platform ↔ bug-fix). Explicitly out of scope per Non-Goals. |
| 9 | **Index merge operations** | Low | High | Merge two index files together (e.g., after epic completion). Not needed for MVP. |
| 10 | **Performance benchmarks** | Medium | Low | Add benchmark tests beyond the basic performance targets. Track parsing speed over time. |

---

## Categories

### Edge Cases
- **Empty wave sections**: What if wave header says "(3 stories)" but table has 0 rows? Need error handling.
- **Missing wave headers**: What if table appears without wave header? Should error or treat as orphaned stories?
- **Inline code in titles**: What if story title contains backticks or pipes? May break table parsing.
- **Multi-line table cells**: Markdown tables don't support multi-line cells but what if someone tries?

### UX Polish
- **Progress indicators**: For large index parsing, show progress (already have logger, just add milestones).
- **Validation warnings vs errors**: Distinguish between fatal errors (duplicate ID) and warnings (missing priority).
- **Helpful error messages**: When validation fails, suggest fixes (e.g., "Story LNGG-9999 depends on LNGG-8888 which doesn't exist. Did you mean LNGG-0888?").

### Performance
- **Lazy metrics calculation**: Only calculate metrics when explicitly requested via `recalculateMetrics()`. Story already suggests this.
- **Caching parsed index**: Cache in-memory during batch operations to avoid re-parsing. Story mentions this.
- **Incremental updates**: Only re-parse affected wave section instead of entire index. Story mentions this.

### Observability
- **Update audit trail**: Log all index modifications with timestamp, user, operation type.
- **Metrics export**: Export metrics to JSON for dashboard/reporting tools.
- **Validation report export**: Export validation results to JSON for CI/CD integration.

### Integrations
- **Database sync**: Sync index file changes to database (WINT-0020 handles this, not IndexAdapter).
- **Git integration**: Auto-commit index changes with descriptive messages (explicitly out of scope).
- **Real-time collaboration**: CRDTs or OT for multi-user editing (explicitly out of scope).

### Testing
- **Fuzz testing**: Generate random index files to test parser robustness.
- **Property-based testing**: Use fast-check for round-trip property testing (read → write → read = identical).
- **Performance regression tests**: Alert if parsing time increases beyond thresholds.

---

## Deferred from Original LNGG-002 Spec

The story mentions that LNGG-002 originally assumed YAML-based index format but actual format is markdown tables. Here are features from the original spec that were deferred:

1. **Transaction support**: In-memory rollback mechanism. Deferred for MVP, atomic writes provide basic protection.
2. **YAML frontmatter per-story**: Original spec assumed each story as YAML entry. Actual format uses tables, so this is N/A.
3. **Real-time conflict resolution**: Original spec mentioned optimistic locking. Deferred due to complexity.

These may be revisited if requirements change.

---

## Implementation Notes for Future Work

### When to Upgrade to remark/unified

**Indicators that regex parsing is insufficient**:
- More than 3 edge case bugs filed related to table parsing
- Difficulty maintaining regex patterns (complexity > 10 lines per pattern)
- Tables with nested markdown (links, code blocks) causing issues
- Community requests for robust markdown support

**Migration path**:
1. Add `remark-parse` and `mdast-util-to-markdown` dependencies
2. Create `MarkdownAstParser` class alongside regex parser
3. Feature flag to switch parsers: `USE_AST_PARSER=true`
4. Run both parsers in parallel in tests, compare results
5. After validation period, deprecate regex parser

### When to Add File Locking

**Indicators that file locking is needed**:
- Reports of concurrent LangGraph workflows corrupting index
- Last-write-wins causing lost updates in production
- Multiple users editing index simultaneously (unlikely in current workflow)

**Implementation approach**:
- Use `proper-lockfile` npm package (cross-platform)
- Wrap all write operations with lock acquisition
- Add timeout and stale lock detection
- Log all lock conflicts for analysis

---

## Questions for Future Stories

1. **Should IndexAdapter handle legacy index formats?** Story says "only support current markdown table format" but what if format evolves? Need versioning strategy?

2. **What's the migration path from index files to database?** WINT-0020 handles database, but how do we eventually deprecate index files? Keep as source of truth or make DB authoritative?

3. **How to handle index schema changes?** If we add new columns (e.g., "Estimated Effort"), does IndexAdapter auto-migrate or require manual update?

4. **Should metrics be cached in frontmatter or always calculated?** Story says "calculated on-demand" but for large indexes, might want to cache. What's the threshold?

5. **What's the story ownership model?** Story mentions "no concurrent edit resolution" but in future, could multiple LangGraph workflows update same index? Need distributed coordination?
