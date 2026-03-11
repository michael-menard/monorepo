---
generated: "2026-03-11"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: CDBN-0010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the CDTS plan and CDBN plan creation (both were bootstrapped 2026-03-07 to 2026-03-11). CDTS story execution state is sourced directly from KB at seed time.

### Relevant Existing Features

| Feature | Detail | Relevance |
|---------|--------|-----------|
| Knowledge Base (KB) MCP server | Located at `apps/api/knowledge-base/` — PostgreSQL port 5433, has `knowledgeEntries`, stories, plans, story_artifacts tables | All CDTS story state lives here; deprecation is a KB metadata operation |
| KB plan management tools | `kb_list_plans`, `kb_update_plan`, `kb_list_stories`, `kb_update_story`, `kb_update_story_status` | Tools used to execute this story's cancellation work |
| CDTS plan directory | `plans/future/platform/consolidate-db-three-schemas/` | The filesystem artifact to be retired; 11 stories, 4 phases |
| CDBN plan directory | `plans/future/platform/consolidate-db-normalized/` | The replacement plan; currently active and in early elaboration |

### Active In-Progress Work

| Story ID | Title | State | Risk to This Story |
|----------|-------|-------|--------------------|
| CDTS-0010 | Establish Migration Runner and Safety Preamble | **completed** | None — safe to cancel retroactively (already complete, migrated to CDBN) |
| CDTS-0020 | Audit Actual Table Locations and Produce Migration Manifest | **ready_for_review** (code_review phase) | WARNING: Active work in flight. CDTS-0020's output (the migration manifest) has already been incorporated into CDBN planning. Cancelling must not discard this artifact. |
| CDTS-1010 | Create analytics Schema and Move wint Tables into Drizzle | **ready_for_review** (code_review phase) | WARNING: Active work in flight. Same pattern — output was already absorbed into CDBN scope. |
| CDTS-1020 through CDTS-3020 | All remaining CDTS stories | **backlog** | No active work — safe to cancel. |

### Constraints to Respect

- CDTS-0010 is already `completed`. Its KB state should be left as-is (completed) or explicitly marked cancelled-superseded — do not lose the completion record.
- CDTS-0020 and CDTS-1010 are `ready_for_review`: their work artifacts (audit results, migration manifest) are valuable and have been incorporated into CDBN planning. Cancellation must preserve these artifacts — do not delete the story directories.
- The CDTS plan directory (`plans/future/platform/consolidate-db-three-schemas/`) is a read-only reference artifact at this point. The risk note flags: verify all 11 CDTS story IDs before bulk state changes to avoid accidental cancellation of unrelated stories.
- The KB is the source of truth. Filesystem directories are side-effects. Cancellation is a KB metadata operation first, filesystem archival second.

---

## Retrieved Context

### Related Endpoints

None. This story has no API or HTTP endpoint changes. It is a pure KB/metadata operation.

### Related Components

None. No UI components are involved.

### Reuse Candidates

| Tool / Pattern | How Used |
|----------------|----------|
| `kb_list_stories` (MCP tool) | Enumerate all CDTS-prefixed stories to confirm the full list before bulk update |
| `kb_update_story_status` (MCP tool) | Set each CDTS story state to `cancelled` (except CDTS-0010 which is `completed`) |
| `kb_update_plan` or `kb_update_plan_status` (MCP tool) | Mark the `consolidate-db-three-schemas` plan as `archived` or `superseded` |
| `kb_add` or `kb_add_decision` (MCP tool) | Record the deprecation rationale as a KB decision entry for future traceability |

### Similar Stories

No directly similar past story was found in KB search results. The CDTS plan redesign decision (KB entry: "Decision: CDTS Epic Redesign: Two-Schema Graph DB instead of Three Schemas") provides the key background for why the CDTS plan is being retired.

---

## Canonical References

canonical_references: []
canonical_refs_note: 'Non-code story (KB metadata/config-only) — no implementation pattern refs applicable. This story makes no code changes; all work is MCP tool calls and optional filesystem archival.'

---

## Knowledge Context

### Lessons Learned

No directly applicable lesson-learned entries were returned from KB search for this exact scenario (plan deprecation/cancellation). The closest relevant finding is:

- **[KB entry: "Decision: CDTS Epic Redesign"]** The CDTS plan was formally redesigned from three-schema to two-schema (public + analytics). The CDBN plan is the successor. This is the authoritative reason for retirement.
  - *Applies because*: Establishes the chain of custody — CDTS was not abandoned, it was explicitly redesigned and superseded by CDBN.

- **[AC-3020 elaboration finding]** KB-first approach is the designated source of truth for story/plan state. File-based approaches (stories.index.md, filesystem directories) are technical debt.
  - *Applies because*: Reinforces that cancellation must be done in KB first, filesystem archival is optional/secondary.

### Blockers to Avoid (from past stories)

- **Accidental cancellation of unrelated stories**: The risk note explicitly calls this out. Bulk KB updates using a prefix filter must confirm the exact list of story IDs before executing. Verify: CDTS-0010, CDTS-0020, CDTS-1010, CDTS-1020, CDTS-1030, CDTS-1040, CDTS-1050, CDTS-2010, CDTS-2020, CDTS-3010, CDTS-3020 (11 stories total).
- **Losing audit trail**: Do not delete CDTS story directories or the CDTS plan directory. The migration manifest produced by CDTS-0020 is referenced by CDBN planning and must remain accessible.
- **Marking CDTS-0010 cancelled**: CDTS-0010 is already `completed`. Its migration runner and safety preamble infrastructure is actively used by the CDBN plan. It should not be cancelled — only the remaining stories (CDTS-0020 through CDTS-3020) should have state set to `cancelled`.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not applicable — no API changes |
| ADR-005 | Testing Strategy | Not applicable — no UAT required for KB metadata operations |

No active ADRs constrain this story. The work is pure KB state updates and optional filesystem archival.

### Patterns to Follow

- Use `kb_list_stories` to enumerate before any bulk operation — never assume story IDs without verification.
- Record the deprecation rationale as a KB decision entry so it is discoverable via semantic search by future agents.
- Leave completed stories (`CDTS-0010`) in their completed state — do not retroactively alter completion records.

### Patterns to Avoid

- Do not delete the CDTS plan directory or story directories — they contain audit artifacts referenced by CDBN.
- Do not use file-based state (editing `stories.index.md`) as the primary mechanism — KB MCP tools are the source of truth.
- Do not bulk-cancel without a prior enumeration step — verify the full list first.

---

## Conflict Analysis

### Conflict: Active Work in CDTS-0020 and CDTS-1010

- **Severity**: warning (non-blocking)
- **Description**: CDTS-0020 ("Audit Actual Table Locations and Produce Migration Manifest") and CDTS-1010 ("Create analytics Schema and Move wint Tables into Drizzle") are both in `ready_for_review` state (code_review phase) at seed time. They have active work artifacts. However, their outputs (migration manifest, analytics schema work) have been absorbed into CDBN planning. The KB state change to `cancelled` is safe because no new CDBN work depends on these CDTS stories completing their code review lifecycle.
- **Resolution Hint**: Before bulk-cancelling all non-completed CDTS stories, explicitly note in the KB decision entry that CDTS-0020 and CDTS-1010 had in-flight work at cancellation time, and confirm their artifacts are preserved in the story directories under `plans/future/platform/consolidate-db-three-schemas/stories/`.

---

## Story Seed

### Title

Deprecate consolidate-db-three-schemas and Cancel CDTS Stories

### Description

The `consolidate-db-three-schemas` (CDTS) plan was formally superseded when it was redesigned from a three-schema model into what is now the `consolidate-db-normalized` (CDBN) plan. The redesign decision is already recorded in KB (entry: "Decision: CDTS Epic Redesign: Two-Schema Graph DB instead of Three Schemas"). However, the 11 CDTS stories still exist in the KB in various active states (1 completed, 2 ready_for_review, 8 backlog), and the CDTS plan itself has no `superseded` or `archived` status.

This story formally retires the CDTS plan by:
1. Updating all eligible CDTS stories (CDTS-0020 through CDTS-3020) to `cancelled` state in KB, with a reason pointing to CDBN as the successor.
2. Marking the `consolidate-db-three-schemas` plan as `archived`/`superseded` in KB.
3. Adding a KB decision entry documenting the formal retirement for traceability.
4. Optionally adding a `DEPRECATED.md` marker file to the CDTS plan directory for filesystem visibility.

CDTS-0010 is already `completed` and must be left in that state — its migration runner and safety preamble infrastructure is in production use by CDBN migrations.

### Initial Acceptance Criteria

- [ ] AC-1: Prior to any state changes, enumerate all CDTS stories from KB via `kb_list_stories` and confirm the full list matches the 11 known IDs (CDTS-0010 through CDTS-3020). Record the enumeration result.
- [ ] AC-2: CDTS-0020, CDTS-1010, CDTS-1020, CDTS-1030, CDTS-1040, CDTS-1050, CDTS-2010, CDTS-2020, CDTS-3010, CDTS-3020 (10 stories) have their state updated to `cancelled` in KB with a reason message such as: "Superseded by CDBN plan (consolidate-db-normalized). Work absorbed into CDBN-{equivalent}."
- [ ] AC-3: CDTS-0010 state is NOT changed — it remains `completed` in KB.
- [ ] AC-4: The `consolidate-db-three-schemas` plan is marked `archived` (or `superseded`) in KB via `kb_update_plan` or equivalent tool.
- [ ] AC-5: A KB decision/note entry is added recording the formal deprecation rationale: that CDTS was redesigned and superseded by CDBN, with the date, and noting that CDTS-0020 and CDTS-1010 had in-flight work absorbed into CDBN scope.
- [ ] AC-6: The CDTS plan filesystem directory (`plans/future/platform/consolidate-db-three-schemas/`) is not deleted. A `DEPRECATED.md` or equivalent marker is optionally added to signal the plan's retired status to humans browsing the filesystem.
- [ ] AC-7: Verify post-cancellation that no CDTS stories appear in active story queues (i.e., `kb_get_next_story` for the `platform` epic no longer surfaces CDTS stories).

### Non-Goals

- Do not delete the `consolidate-db-three-schemas/` directory or any story subdirectories — these contain audit artifacts referenced by CDBN.
- Do not cancel CDTS-0010 — it is completed and its migration infrastructure remains in use.
- Do not modify any CDBN stories, plans, or files.
- Do not touch the `lego_dev` database (port 5432) or any application schemas — this is a pure KB metadata operation.
- Do not re-run or rollback any CDTS migrations — the migration runner and safety preamble from CDTS-0010 are preserved and continue to be used.
- This story does not cover writing a migration to remove CDTS-specific schema objects from the KB DB — that was already handled by CDTS itself.

### Reuse Plan

- **Components**: None (no UI components)
- **Patterns**: KB MCP tool sequence: enumerate → verify → bulk update → record decision → verify post-state
- **Packages**: `apps/api/knowledge-base/` MCP server (already running); MCP tools `kb_list_stories`, `kb_update_story_status`, `kb_update_plan`, `kb_add` / `kb_add_decision`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story has no code changes and no UAT requirements per ADR-005. Verification is entirely observational:
- Post-execution KB query: `kb_list_stories` filtered to `feature: consolidate-db-three-schemas` should show all 10 stories as `cancelled` and CDTS-0010 as `completed`.
- `kb_get_next_story` for the `platform` epic should not return any CDTS story.
- The `consolidate-db-three-schemas` plan entry should have an `archived`/`superseded` status.
- No unit tests, integration tests, or E2E tests are required (ADR-006 skip condition: `frontend_impacted: false`, no UI-facing acceptance criteria).

### For UI/UX Advisor

Not applicable. This story has no frontend impact.

### For Dev Feasibility

This is a pure KB metadata operation. Implementation is a sequence of MCP tool calls with no code changes:

1. `kb_list_stories({ feature: 'consolidate-db-three-schemas' })` — enumerate and verify 11 stories
2. For each CDTS story except CDTS-0010: `kb_update_story_status({ story_id: 'CDTS-XXXX', state: 'cancelled', ... })`
3. `kb_update_plan(...)` — mark consolidate-db-three-schemas plan as archived/superseded
4. `kb_add_decision(...)` or `kb_add(...)` — record formal retirement rationale
5. Optionally: write `DEPRECATED.md` to `plans/future/platform/consolidate-db-three-schemas/`
6. Verify: `kb_get_next_story({ epic: 'platform' })` — confirm no CDTS stories surface

Key risk: CDTS-0020 and CDTS-1010 are in `ready_for_review` state. The implementer should confirm whether `kb_update_story_status` allows transitioning from `ready_for_review` to `cancelled` directly, or whether an intermediate state is required by the KB tool schema. If a direct transition is blocked, the workaround is to use `kb_update_story` with a force-cancel flag or to contact the KB tool maintainer.

No canonical code references are applicable for this non-code story.
