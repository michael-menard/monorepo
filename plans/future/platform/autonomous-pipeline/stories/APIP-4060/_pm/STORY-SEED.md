---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: APIP-4060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No APIP-3090 (cron infrastructure) is itself still in backlog/created status — this story cannot be scheduled until APIP-3090 ships.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Primary system APIP-4060 targets for freshness checking |
| `knowledgeEntries` schema | `apps/api/knowledge-base/src/db/schema.ts` | Fields: `archived`, `archivedAt`, `updatedAt`, `createdAt`, `tags`, `storyId` — archival support already present |
| `kb_update` operation | `apps/api/knowledge-base/src/crud-operations/kb-update.ts` | Supports `archived`, `archivedAt`, `canonical_id`, `is_canonical` — archival path is already wired |
| `kb_list` operation | `apps/api/knowledge-base/src/crud-operations/kb-list.ts` | Role/tag filtering; used to enumerate candidates for staleness scan |
| Audit Logger | `apps/api/knowledge-base/src/audit/audit-logger.ts` | All KB mutations must be audit-logged via `AuditLogger`; the archival action is a `kb_update` and triggers existing audit |
| Retention policy (batch delete) | `apps/api/knowledge-base/src/audit/retention-policy.ts` | Exemplary batch-processing pattern for time-bounded cron operations |
| Orchestrator cron infra (planned) | APIP-3090 | Blocked: this story is the cron host; not yet implemented |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-1040 | In Progress | Touches orchestrator nodes — no overlap with KB freshness |
| APIP-1050 | In Progress | Review graph — no overlap |
| APIP-3090 | backlog/created | Direct blocker — this story is a hard dependency |

### Constraints to Respect

- **Protected**: `apps/api/knowledge-base/src/db/schema.ts` — do not alter the `knowledgeEntries` table schema. Archival fields (`archived`, `archivedAt`) already exist; use them.
- **Protected**: `@repo/db` client API surface — do not change the shared DB client package.
- **Protected**: Orchestrator artifact schemas — do not modify existing Zod schemas without a migration path.
- All KB mutations must flow through `kb_update` and be audit-logged by `AuditLogger` (soft-fail mode).
- Zod-first types: no TypeScript interfaces — all new schemas must use `z.object(...)` + `z.infer`.
- `@repo/logger` only — no `console.log`.
- No barrel files.

---

## Retrieved Context

### Related Endpoints
None — this story does not expose HTTP endpoints. It is a background cron task.

### Related Components
None — no UI involved.

### Reuse Candidates

| Candidate | Path | How to Reuse |
|-----------|------|--------------|
| `runRetentionCleanup` batch-delete pattern | `apps/api/knowledge-base/src/audit/retention-policy.ts` | Copy batch-loop pattern for time-bounded archival scanning; reuse `calculateCutoffDate` |
| `kb_list` with filters | `apps/api/knowledge-base/src/crud-operations/kb-list.ts` | Enumerate KB entries older than 90 days for staleness evaluation |
| `kb_update` with archival fields | `apps/api/knowledge-base/src/crud-operations/kb-update.ts` | Perform archival via `{ archived: true, archived_at: new Date() }` |
| `AuditLogger` | `apps/api/knowledge-base/src/audit/audit-logger.ts` | Wrap all archival mutations with `logUpdate(...)` for audit trail |
| Orchestrator node structure | `packages/backend/orchestrator/src/nodes/` | Follow the same node directory layout: `freshness/index.ts`, `freshness/__tests__/`, `freshness/__types__/` |
| `AuditFindingsSchema` + `TrendSnapshotSchema` | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | Reporting artifact patterns for freshness scan results |

### Similar Stories
- APIP-4050 (Dead Code Reaper) — also a APIP-3090-dependent monthly cron scanning the codebase; same cron registration pattern will apply
- APIP-4040 (Test Quality Monitor) — same cron-infra dependency; similar dry-run + report pattern
- AUDT-0010 (Code audit LangGraph) — established graph compilation + lens-node architecture for similar scanning concerns

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Batch time-bounded cron operation | `apps/api/knowledge-base/src/audit/retention-policy.ts` | Batch loop with cutoff date, dry-run mode, progress logging, duration tracking — identical shape needed for archival sweep |
| KB update with archival fields | `apps/api/knowledge-base/src/crud-operations/kb-update.ts` | Shows the exact `archived`, `archivedAt`, `canonical_id`, `is_canonical` update path; Zod-validated, returns updated entry |
| Orchestrator node with Zod types | `packages/backend/orchestrator/src/nodes/elaboration/index.ts` | Representative node with `__types__/` co-located schema, injected deps, structured logging |
| Audit logging on mutation | `apps/api/knowledge-base/src/audit/audit-logger.ts` | Soft-fail `logUpdate()` pattern; must be applied to every archival action in this story |

---

## Knowledge Context

### Lessons Learned

- **[AUDT-0010]** LangGraph graph tests should target compiled graph routing, not dynamic lens imports. Test `graph.compile()` and routing path logic directly with mock state — avoids fragile dynamic import overhead. *(Applies because: if freshness check is implemented as a LangGraph node/graph, use the same compile-level test strategy.)*
- **[WINT-9020]** Native 7-phase LangGraph node with sequential architecture proved viable for subprocess-delegating agents (42 unit tests, 86% coverage). *(Applies because: freshness check is a multi-phase scan — file-existence check → age filter → flag/archive decision — well-suited to sequential node phases.)*
- **[Workflow-Retro]** KB/Task tools are unavailable 44% of the time — deferred write (DEFERRED-KB-WRITES.yaml) is the de facto standard fallback. *(Applies because: cron workers in the orchestrator may not have MCP tool access; archival should write results via direct DB call, not MCP tools.)*
- **[KBAR-0130 QA]** False-negative QA cycles occur when QA reads stale evidence instead of source files. Cross-check every line reference against the actual file on disk. *(Applies because: this story's QA must verify archival records in the DB, not just evidence artifacts.)*

### Blockers to Avoid (from past stories)
- Do not implement the cron schedule itself — that is APIP-3090's contract. This story provides the function that APIP-3090 invokes on schedule.
- Do not hard-delete KB entries — use `kb_update` with `archived: true`. Hard delete bypasses audit trail and is non-recoverable.
- Do not use MCP tool layer for archival writes inside the cron — call the DB-layer operations directly to avoid tool-availability failures (the 44% MCP unavailability lesson).
- Do not implement contradiction detection against CLAUDE.md in v1 — this is the highest-risk part of the feature and should be a clearly scoped non-goal until a follow-up story establishes a semantic comparison approach.
- Auto-archival heuristics must be conservative: prefer flagging over auto-archiving for borderline cases. False positives (archiving valid guidance) are worse than false negatives (leaving stale entries).

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | Zod-first types | All schemas must use `z.object(...)` + `z.infer<>` — no TypeScript interfaces |
| N/A | No barrel files | Import directly from source files, not index re-exports |
| N/A | Audit logging | All KB mutations must be logged via `AuditLogger` with soft-fail mode |

*(ADR-LOG.md file not found at `plans/stories/ADR-LOG.md` — ADRs sourced from CLAUDE.md and baseline patterns.)*

### Patterns to Follow
- Batch loop with early-exit when batch < BATCH_SIZE (established in `retention-policy.ts`)
- Dry-run mode as a first-class parameter (established in `retention-policy.ts`)
- Co-locate `__types__/index.ts` with node implementation (established in orchestrator nodes)
- Injected DB dependencies (`deps: { db }`) rather than direct imports of DB client
- `logger.info` at operation start, `logger.debug` per batch, `logger.info` at completion with statistics
- Return a structured result object with counts: `archived_count`, `flagged_count`, `skipped_count`, `duration_ms`, `dry_run`

### Patterns to Avoid
- Hard-deleting KB entries (non-recoverable, bypasses audit)
- Calling MCP tool layer from inside cron worker (tool availability is unreliable at 44%)
- Implementing CLAUDE.md contradiction detection in this story (semantic comparison requires separate scoping)
- Unbounded full-table scans without a staleness filter — always filter by `createdAt < cutoff` before processing

---

## Conflict Analysis

### Conflict: Dependency Not Yet Built
- **Severity**: warning (not blocking)
- **Description**: APIP-3090 (Cron Job Infrastructure) is the dependency for APIP-4060. As of the baseline date (2026-02-13), APIP-3090 is in `backlog` / `created` status. APIP-4060 cannot be scheduled until APIP-3090 ships. The story can be elaborated and made ready-to-work in advance, but implementation must be gated on APIP-3090's cron registration API being stable.
- **Resolution Hint**: Design the freshness checker as a standalone async function (`runKbFreshnessCheck(deps, config)`) that APIP-3090 registers as a cron handler. Avoid coupling to any specific cron scheduler interface until APIP-3090 defines the contract.

---

## Story Seed

### Title
KB Freshness Check and Stale Entry Archival

### Description

**Context**: The knowledge base at `apps/api/knowledge-base/` accumulates entries over time. Entries reference file paths, story IDs, and code patterns that can become stale as the codebase evolves. Left unchecked, stale KB entries degrade the quality of guidance available to pipeline agents — directing them toward deleted files, deprecated patterns, or advice that no longer matches the codebase.

The `knowledgeEntries` table already has `archived` and `archivedAt` fields (used by WKFL-009), and `kb_update` supports setting these fields. The infrastructure for archival exists; this story adds the scheduled cron worker that identifies and archives stale entries.

**Problem**: There is no automated mechanism to identify KB entries that have become stale: entries that reference files no longer present in the repository, entries older than 90 days that have not been reaffirmed, or entries whose code-pattern advice has drifted from CLAUDE.md directives. As the pipeline runs more stories and the codebase evolves, this gap compounds.

**Proposed Solution**: Implement a `runKbFreshnessCheck` function (registered as a monthly cron by APIP-3090) that:
1. Scans KB entries older than 90 days (configurable threshold).
2. For each entry, checks if referenced file paths still exist in the repository (file-existence check via `fs.existsSync` or git tree).
3. Auto-archives entries that reference file paths confirmed non-existent (conservative: only when the file path is explicit and verifiable).
4. Flags (tags with `stale-candidate`) entries whose age exceeds the threshold but whose file reference cannot be confirmed non-existent.
5. Writes a summary report artifact (YAML) with counts and entry IDs affected.
6. Supports dry-run mode.
7. All archival actions go through `kb_update` with `AuditLogger.logUpdate()`.

**Explicitly Out of Scope for v1**: Contradiction detection against CLAUDE.md (semantic comparison — high risk of false positives; deferred to a follow-up story).

### Initial Acceptance Criteria

- [ ] AC-1: `runKbFreshnessCheck(deps, config)` function exists in `packages/backend/orchestrator/src/nodes/freshness/index.ts` and accepts an injectable deps object (`{ db, fs? }`) and config (`{ staleDays, dryRun, batchSize }`).
- [ ] AC-2: The function queries KB entries where `createdAt < now - staleDays` (default: 90) and `archived = false`, in batches (default batch size: 500).
- [ ] AC-3: For each candidate entry that contains a file path reference (heuristic: content matches `apps/`, `packages/`, or `src/` path patterns), the function checks whether that file exists in the repository.
- [ ] AC-4: Entries referencing a file path confirmed non-existent are auto-archived via `kb_update({ id, archived: true, archived_at: new Date() })`. Each archival is audit-logged via `AuditLogger.logUpdate()`.
- [ ] AC-5: Entries exceeding the age threshold but without a verifiable non-existent file reference are flagged by adding a `stale-candidate` tag via `kb_update({ id, tags: [...existingTags, 'stale-candidate'] })`.
- [ ] AC-6: In dry-run mode (`config.dryRun: true`), no mutations are made — the function returns counts of what would be archived/flagged without touching the DB.
- [ ] AC-7: The function returns a structured result: `{ archived_count, flagged_count, skipped_count, entries_scanned, duration_ms, dry_run, batches_processed }`.
- [ ] AC-8: A Zod schema (`KbFreshnessResultSchema`) exists in `__types__/index.ts` and validates the return value.
- [ ] AC-9: A Zod schema (`KbFreshnessConfigSchema`) exists in `__types__/index.ts` and validates the config input with defaults (`staleDays: 90`, `dryRun: false`, `batchSize: 500`).
- [ ] AC-10: Unit tests exist in `__tests__/freshness.test.ts` covering: dry-run returns counts without mutations, non-existent file paths are archived, existent file paths are flagged (not archived), entries without file references are skipped, batch processing respects `batchSize`.
- [ ] AC-11: The function is exported from `packages/backend/orchestrator/src/nodes/freshness/index.ts` as a named export (no barrel file).
- [ ] AC-12: All archival mutations are wrapped in a try/catch — a single entry failure does not abort the full batch; errors are logged and the entry is counted as `skipped`.
- [ ] AC-13: The function is time-bounded: if `duration_ms > maxDurationMs` (config, default 5 minutes), processing halts at the current batch boundary and the partial result is returned with a `truncated: true` flag.

### Non-Goals
- Contradiction detection against CLAUDE.md or codebase patterns (semantic comparison — deferred)
- Implementing the cron schedule or registration — that is APIP-3090's responsibility
- Deleting KB entries (only soft-archive via `archived: true`)
- Processing entries already marked `archived: true`
- UI or operator-facing views of freshness report (APIP-4070 handles reporting)
- Modifying the `knowledgeEntries` schema — archival fields already exist
- Making network or LLM calls — file-existence checks only use local filesystem/git

### Reuse Plan
- **Components**: `AuditLogger.logUpdate()` from `apps/api/knowledge-base/src/audit/audit-logger.ts`; `kb_update` from `apps/api/knowledge-base/src/crud-operations/kb-update.ts`; `kb_list` for initial candidate scan
- **Patterns**: Batch-loop with `BATCH_SIZE` cutoff (from `retention-policy.ts`); dry-run mode as first-class config parameter; structured result object with duration tracking
- **Packages**: `@repo/logger` for all logging; `drizzle-orm` for DB queries; `zod` for all schemas

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- The main testing complexity is in AC-3 (file-existence heuristic) — test with entries that contain explicit file paths vs. entries with no path references vs. entries with paths to existing vs. deleted files.
- Dry-run mode (AC-6) must be tested against all mutation paths to confirm zero DB writes occur.
- Batch boundary behavior (AC-13 truncation) needs a specific test scenario with `maxDurationMs` set very low.
- AC-12 (per-entry error isolation) requires a test where `kb_update` throws on entry N but entries N+1 through N+K still process.
- No integration tests against a real KB instance are needed for MVP — unit tests with mocked `db` and `fs` are sufficient. Integration can be deferred to APIP-3090 cron registration story.

### For UI/UX Advisor
- No UI is involved in this story. The freshness report (YAML artifact) is consumed by APIP-4070 (Weekly Pipeline Health Report) for display.
- The `stale-candidate` tag pattern (AC-5) acts as a soft flag visible in any KB listing UI — document this tag's semantics in the tag vocabulary for future operator tooling.

### For Dev Feasibility
- **File path extraction heuristic** (AC-3) is the highest implementation risk: KB entry content is free-form text. A regex matching `(apps|packages|src)/[^\s'"]+\.(ts|tsx|js|json|md)` is a reasonable starting point, but edge cases (multi-line content, JSON-embedded paths) should be verified against real KB entry samples before committing to the pattern.
- **Scale concern**: The KB currently holds O(hundreds) of entries. At that scale, a single paginated query is fine. If the KB grows to O(tens of thousands), the batch loop + age filter becomes essential. The 500-entry default batch size is safe.
- **APIP-3090 interface contract**: Design `runKbFreshnessCheck` to accept a plain `async function(deps, config): Promise<KbFreshnessResult>` signature. APIP-3090 can wrap it in a LangGraph cron node with minimal adapter code. Avoid importing LangGraph types into this node to keep it testable without LangGraph setup.
- **Canonical references for subtask decomposition**:
  - ST-1 (Types + skeleton): Model on `packages/backend/orchestrator/src/nodes/elaboration/index.ts` structure
  - ST-2 (Batch scan + file-existence check): Model on `apps/api/knowledge-base/src/audit/retention-policy.ts` batch loop
  - ST-3 (Archive + flag mutations): Model on `apps/api/knowledge-base/src/crud-operations/kb-update.ts` + `audit-logger.ts`
  - ST-4 (Tests): Follow `apps/api/knowledge-base/src/audit/__tests__/` patterns for DB-mocked tests
