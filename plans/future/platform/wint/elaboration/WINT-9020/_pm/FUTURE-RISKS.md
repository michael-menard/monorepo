# FUTURE-RISKS: WINT-9020 — Create doc-sync LangGraph Node

## Non-MVP Risks

### Risk A: Deprecation of `nodes/workflow/doc-sync.ts` leaves import references dangling

**Impact if not addressed post-MVP:**
Any future story or graph that attempts to import the subprocess wrapper from `nodes/workflow/doc-sync.ts` will be silently using the old approach instead of the new direct port. If both files export `docSyncNode` under the same name, consumers could import either one without realizing the difference.

**Recommended timeline:** Address in a cleanup story after WINT-9060 (batch-coordinator LangGraph graph) is complete, once the graph wiring is confirmed to use `nodes/sync/doc-sync.ts`.

---

### Risk B: `nodes/sync/` directory has no index or registration mechanism

**Impact if not addressed post-MVP:**
As more sync-type nodes are added in Phase 9, there is no convention for how `nodes/sync/` exports its members. Without a clear pattern, each graph that imports a sync node will use its own path string — making refactoring harder.

**Recommended timeline:** Establish a convention when the second `nodes/sync/` file is created (Phase 9 backlog). No action needed for WINT-9020.

---

### Risk C: Phase 4 surgical table update may not handle all edge cases (table format variations)

**Impact if not addressed post-MVP:**
If `docs/workflow/phases.md` gets restructured or tables gain new columns, the regex-based row update may miss updates or create malformed rows. The graceful degradation (add to `manualReviewNeeded`) mitigates this but does not prevent documentation drift.

**Recommended timeline:** Address if documentation update failures spike in SYNC-REPORT.md review. Consider switching to AST-based Markdown parsing (e.g., `remark`) in a Phase 9+ cleanup.

---

### Risk D: SYNC-REPORT.md path collisions in concurrent LangGraph runs

**Impact if not addressed post-MVP:**
If two LangGraph graph runs execute `doc-sync` concurrently (different stories or workflows), they may write to the same `SYNC-REPORT.md` path, causing one report to overwrite another.

**Recommended timeline:** Address before WINT-9060 (batch-coordinator graph) which could trigger concurrent sync runs. Mitigation: make `reportPath` derived from `workingDir` (story-scoped path) rather than a global default.

---

## Scope Tightening Suggestions

- **MCP tool bridge**: The current design passes MCP tool functions as config parameters. A more robust approach would be a formal `DocSyncMcpBridge` interface defined in `@repo/workflow-logic`. Deferred to a future refactor — the config injection pattern is sufficient for Phase 9.

- **Phase 4 AST-based editing**: Consider replacing regex table manipulation with `remark` or `unified` for safer Markdown editing. Currently out of scope — regex approach is sufficient for the known table formats.

- **`parseSyncReport()` shared utility**: Currently the plan is to extract this from `nodes/workflow/doc-sync.ts` into `nodes/sync/doc-sync.ts`. If a third consumer emerges, extract to a shared `utils/` helper. Not needed for WINT-9020.

## Future Requirements

- **`nodes/workflow/doc-sync.ts` removal**: After WINT-9060 confirms the new node is used in all graphs, schedule a cleanup story to delete the subprocess wrapper and update any remaining import references.
- **Database-sourced doc generation**: Phase 2 currently merges file+DB metadata. A future story could extend Phase 4 to generate documentation *entirely* from DB records (no file frontmatter needed). Deferred to Phase 7 or later.
- **Real-time sync trigger**: The current node is invoked on-demand. A future story could wire it to a LangGraph event trigger (e.g., after any agent file write). Deferred to Phase 9+ orchestration stories.
