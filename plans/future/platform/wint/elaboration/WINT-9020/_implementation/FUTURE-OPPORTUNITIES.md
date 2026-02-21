# FUTURE OPPORTUNITIES: WINT-9020 — Create doc-sync LangGraph Node

**Source:** Elaboration analysis of WINT-9020 by elab-analyst
**Date:** 2026-02-20
**Note:** These items are non-blocking and explicitly out of scope for WINT-9020. They are captured here for backlog consideration in Phase 9+ planning.

---

## FO-1: Expose `databaseStatus` in `DocSyncResultSchema` for downstream graph routing

**Origin:** AC-5 analysis
**Category:** Schema enhancement

`DocSyncResultSchema` currently does not include a `databaseStatus` field. The database query status (`success | timeout | connection_failed | unavailable`) is written to SYNC-REPORT.md but is not available to downstream LangGraph nodes without parsing the report file.

**Opportunity:** Add `databaseStatus: z.enum(['success', 'timeout', 'connection_failed', 'unavailable']).optional()` to `DocSyncResultSchema`. This would allow WINT-9060 (batch-coordinator graph) to make routing decisions based on whether the DB was available during doc-sync — for example, scheduling a retry when DB was unavailable.

**When to act:** When WINT-9060 (batch-coordinator graph) is being designed. If the graph needs to branch on DB availability, this field becomes necessary. If it only needs to know whether sync succeeded, it is not needed.

**Effort:** Small (1 field addition to schema, test update, SYNC-REPORT.md parseSyncReport update).

---

## FO-2: Formal `DocSyncMcpBridge` interface in `@repo/workflow-logic`

**Origin:** Architecture notes in WINT-9020.md and FUTURE-RISKS.md (Scope Tightening)
**Category:** Architecture pattern

Currently MCP tool functions are passed as optional config parameters directly in `DocSyncConfigSchema`. This works for WINT-9020 but creates a loose contract — any consumer can pass any function signature.

**Opportunity:** Define a `DocSyncMcpBridge` interface in `@repo/workflow-logic` that formalizes the injection contract:

```typescript
const DocSyncMcpBridgeSchema = z.object({
  queryWorkflowComponents: z.function()
    .args(z.object({ component_types: z.array(z.string()), timeout: z.number().optional() }))
    .returns(z.promise(z.array(z.unknown()))),
  queryWorkflowPhases: z.function()
    .args(z.object({ timeout: z.number().optional() }))
    .returns(z.promise(z.array(z.unknown()))),
})
```

This bridge interface can be reused by any future node that queries the `postgres-knowledgebase` MCP tools (e.g., a hypothetical `agent-registry-sync` node).

**When to act:** When a second LangGraph node needs to use `postgres-knowledgebase` MCP tools. The overhead of formalizing the bridge for a single consumer is not justified.

**Effort:** Small-to-medium (new exported type in `@repo/workflow-logic`, update all consumers).

---

## FO-3: AST-based Markdown editing for Phase 4 (replace regex with `remark`)

**Origin:** DEV-FEASIBILITY.md Risk C, FUTURE-RISKS.md Risk C
**Category:** Technical debt reduction

Phase 4 uses regex-based surgical table row updates in `docs/workflow/phases.md` and `docs/workflow/README.md`. This approach is fragile to table format changes, new columns, or structural reorganization of the documentation files.

**Opportunity:** Replace regex table manipulation with `remark` (a Markdown AST library) for safe, format-agnostic table editing. `remark` + `remark-gfm` provides full Markdown/GFM table support as an AST, making it possible to find, update, insert, and delete table rows by column value rather than by text pattern.

**When to act:** When SYNC-REPORT.md reports recurring table update failures, or when the documentation structure changes and the regex approach breaks. Not urgent for WINT-9020's initial implementation.

**Effort:** Medium (add `remark`/`remark-gfm` dependency to orchestrator; rewrite Phase 4 table manipulation; update tests to use real document fixtures rather than regex-targeted mocks).

---

## FO-4: `nodes/sync/` domain convention for future sync nodes

**Origin:** FUTURE-RISKS.md Risk B
**Category:** Convention establishment

When a second file is added to `nodes/sync/`, the lack of a convention for what belongs in `nodes/sync/` vs. `nodes/workflow/` will become a decision point. Currently `nodes/workflow/` contains a mix of workflow automation nodes (doc-sync, stage-movement, checkpoint), some of which are better categorized as "sync" operations.

**Opportunity:** Define a convention:
- `nodes/sync/`: Nodes that synchronize state between file system, database, and documentation (doc-sync, future agent-registry-sync, future kb-sync)
- `nodes/workflow/`: Nodes that advance workflow state (checkpoint, stage-movement, decision-callback, index-node)

This distinction makes the `nodes/sync/` directory a meaningful category rather than a miscellaneous overflow.

**When to act:** When the second `nodes/sync/` file is created. Document the convention in a `nodes/sync/README.md` or in the directory's `index.ts` header comment.

**Effort:** Trivial (comment/documentation only).

---

## FO-5: SYNC-REPORT.md story-scoped path to prevent concurrent write collisions

**Origin:** FUTURE-RISKS.md Risk D
**Category:** Concurrency safety

The current `reportPath` defaults to `SYNC-REPORT.md` in `workingDir`. If WINT-9060 triggers doc-sync runs concurrently for multiple stories, two parallel runs could overwrite each other's `SYNC-REPORT.md`.

**Opportunity:** Make `reportPath` story-scoped by default:
- Default: `<workingDir>/SYNC-REPORT-<timestamp>.md` or `<workingDir>/<storyId>/SYNC-REPORT.md`
- This eliminates the collision risk for concurrent runs

**When to act:** Before WINT-9060 (batch-coordinator graph) runs concurrent doc-sync nodes. The WINT-9020 implementation should be aware of this risk and ensure `reportPath` is overrideable (which it is via config — so the mitigation is already available, it just needs to be exercised by WINT-9060).

**Effort:** Trivial for WINT-9020 (already configurable). Minor for WINT-9060 (set `reportPath` per-run in graph config).

---

## FO-6: Remove `nodes/workflow/doc-sync.ts` subprocess wrapper

**Origin:** Non-goals / AC-14 / FUTURE-RISKS.md Risk A
**Category:** Technical debt cleanup

The deprecated subprocess wrapper at `nodes/workflow/doc-sync.ts` will remain in the codebase after WINT-9020. It is re-exported from `nodes/workflow/index.ts` and `nodes/index.ts` under the same exported names as the new node.

**Opportunity:** After WINT-9060 confirms the batch-coordinator graph uses `nodes/sync/doc-sync.ts`, schedule a cleanup story to:
1. Remove `nodes/workflow/doc-sync.ts` (the subprocess wrapper)
2. Update `nodes/workflow/index.ts` to remove the doc-sync exports
3. Update `nodes/index.ts` workflow section to remove doc-sync (it will be in the sync section by then)
4. Remove `nodes/workflow/__tests__/doc-sync.test.ts` (subprocess-specific tests)
5. Update any remaining imports

**When to act:** After WINT-9060 UAT PASS. This is the natural trigger — once the graph is verified to use the new node, the old wrapper has no runtime consumers.

**Effort:** Small (file deletion + import cleanup). The search for all import references of `nodes/workflow/doc-sync` should be done first.

---

## FO-7: Database-sourced documentation generation (Phase 4 extension)

**Origin:** FUTURE-RISKS.md Future Requirements
**Category:** Feature extension

Phase 2 currently merges file frontmatter with DB metadata (database-overrides-file strategy). Phase 4 then generates documentation from the merged metadata. A natural extension: Phase 4 could generate documentation entries for agents/components that exist in the DB but have no corresponding file in `.claude/agents/` — i.e., "database-only" components.

**Opportunity:** Extend Phase 4 to enumerate DB components not matched by any file and generate placeholder or stub documentation rows for them. This would complete the "database-sourced doc generation" path hinted at in SKILL.md Step 2.3.

**When to act:** When the `workflow.components` database table contains agents that are managed programmatically rather than via `.agent.md` files (likely a Phase 7+ concern).

**Effort:** Medium (Phase 2 DB merge logic extension, Phase 4 new path, test additions).

---

## FO-8: Real-time sync trigger via LangGraph event system

**Origin:** FUTURE-RISKS.md Future Requirements
**Category:** Architecture evolution

The doc-sync node is currently invoked on-demand (explicit graph step). A more powerful model: wire it as a reactive trigger that fires automatically after any agent file write within a LangGraph graph run.

**Opportunity:** In a future graph, add a conditional edge: `if (state.agentFilesModified) → docSyncNode → next_step`. This would make doc-sync transparent to the orchestration logic — any node that writes to `.claude/agents/` would automatically trigger doc-sync without explicit wiring.

**When to act:** Phase 9+ orchestration work, after WINT-9060 establishes the base graph pattern. The event-driven model requires graph-level coordination that does not exist yet.

**Effort:** Large (requires graph-level event routing design, likely a dedicated story).

---

## Summary Table

| ID | Category | Effort | Trigger |
|----|----------|--------|---------|
| FO-1 | Schema enhancement | Small | WINT-9060 design phase |
| FO-2 | Architecture pattern | Small-medium | Second MCP-bridge consumer |
| FO-3 | Technical debt (Phase 4 regex) | Medium | Regex failures or doc restructure |
| FO-4 | Convention establishment | Trivial | Second `nodes/sync/` file |
| FO-5 | Concurrency safety | Trivial | WINT-9060 implementation |
| FO-6 | Technical debt cleanup | Small | WINT-9060 UAT PASS |
| FO-7 | Feature extension | Medium | Phase 7+ DB-managed agents |
| FO-8 | Architecture evolution | Large | Phase 9+ orchestration |
