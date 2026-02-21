# Future Risks: WINT-9020 — Create doc-sync LangGraph Node

## Non-MVP Risks

### Risk A: Subprocess Delegation Variant Removal

- **Risk:** The existing `nodes/workflow/doc-sync.ts` (subprocess approach) may need to be retained alongside the new native port for backward compatibility, or removed to avoid confusion.
- **Impact:** If not addressed post-MVP, two doc-sync node implementations exist in the orchestrator with no clear ownership boundary. Documentation and usage clarity suffers.
- **Recommended timeline:** Address in WINT-9060+ (graph composition stories) when the native port is consumed by an actual LangGraph graph.

### Risk B: Performance of 7-Phase Sequential Execution

- **Risk:** In production, processing all 115 agent files (force mode) could take significant time. Each phase reads multiple files and writes to documentation files.
- **Impact:** Slow doc-sync execution delays story completion workflows (WINT-0170 gate integration).
- **Recommended timeline:** Benchmark in WINT-0170 (doc-sync gate integration). Add parallelism across agent files within phases if needed.

### Risk C: Documentation Schema Drift

- **Risk:** The table structures in `docs/workflow/phases.md` and `docs/workflow/README.md` may change over time, breaking Phase 4 (Documentation Updates) surgical edit logic.
- **Impact:** Silent failures where documentation is not updated despite `success: true` being returned.
- **Recommended timeline:** Add a schema version marker to documentation files and a validation step in Phase 3 to detect schema drift. Target: alongside any major docs restructure.

### Risk D: Changelog Format Inconsistency

- **Risk:** Phase 6 (Changelog Entry Drafting) assumes a specific version header format (`## [X.Y.Z] - YYYY-MM-DD MST [DRAFT]`). If the format deviates, version parsing fails silently.
- **Impact:** Incorrect version bumps or duplicate changelog entries.
- **Recommended timeline:** Add strict format validation with a fallback to `[DRAFT]` entry without version number if parsing fails. Can be done in a follow-up story.

### Risk E: WINT-9060 Integration Requirements

- **Risk:** When WINT-9020's native node is integrated into the batch-coordinator LangGraph graph (WINT-9060), the input/output state shape may need to be extended. `GraphStateWithDocSync` may need additional fields.
- **Impact:** Breaking state interface change requiring WINT-9020 reopening or a new story.
- **Recommended timeline:** During WINT-9060 elaboration, verify `GraphStateWithDocSync` is sufficient and extend in that story if needed.

---

## Scope Tightening Suggestions

1. **AC-13 (Identical Outputs) is aspirational for MVP** — "identical outputs" between Claude Code agent and LangGraph node is extremely difficult to guarantee at the string level (timestamps, ordering). Consider scoping AC-13 to "structural equivalence" (same section counts, same fields in SYNC-REPORT.md) rather than byte-for-byte identity. This should be clarified in elaboration.

2. **MCP tool integration (Phase 2, Step 2.2)** — querying `postgres-knowledgebase` from within a LangGraph node requires MCP tools to be available in the orchestrator runtime. This is a non-trivial runtime dependency. Consider deferring DB-enriched frontmatter parsing to a follow-up story and implementing file-only mode first (makes AC-6 the MVP path, DB integration a future enhancement).

3. **Mermaid diagram validation (Phase 5)** — the validation logic (balanced brackets, valid arrows) is a nice-to-have for the MVP. If diagram syntax fails, the existing diagram is preserved (correct behavior). The validation step can be simplified for MVP and enhanced later.

---

## Future Requirements

- **Configurable timeout** for DB queries (currently hardcoded at 30s in SKILL.md) — make configurable via `DocSyncConfigSchema.dbTimeoutMs`.
- **Retry logic** for Phase 4 documentation writes — if file is locked by another process, retry 3x with backoff.
- **Progress events** — for long-running force mode syncs (50+ files), emit progress events that a LangGraph graph can observe/stream to UI.
- **Dry-run diff output** — in check-only mode, in addition to `success: false`, surface a diff showing what would change.
- **Section-level granularity** in `DocSyncResult` — currently `sectionsUpdated` is a count. Future: array of `{ file, section, changeType }` for finer-grained reporting.
