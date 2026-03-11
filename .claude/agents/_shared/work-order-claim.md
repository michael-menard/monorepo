# Work Order Claim/Release Protocol

Orchestrators MUST claim and release stories in `WORK-ORDER-BY-BATCH.md` to prevent parallel conflicts.

## File Location

`{FEATURE_DIR}/WORK-ORDER-BY-BATCH.md` (e.g., `plans/future/platform/WORK-ORDER-BY-BATCH.md`)

If the file does not exist at `{FEATURE_DIR}`, check the parent directory (e.g., `plans/future/platform/wint` → `plans/future/platform`).

If neither location has the file, skip claim/release silently (not all feature dirs use work orders).

## Claim (start of orchestrator)

Find the table row where Story ID column matches `{STORY_ID}`. Then:

1. Set the **Status** column to `🔧`
2. Set the **Worker** column to the worktree name (e.g., `wint-1012`) or session context (e.g., `main`)

Use the Edit tool to make a targeted replacement of the matching row.

**Example:**

Before:
```
| [ ] | 48b | WINT-1012 | Compatibility Shim — Observability & Tests ⚡ | ⏳ | | WINT-1011 (#48a) | P0 — split from WINT-1010; **ready-to-work** |
```

After:
```
| [ ] | 48b | WINT-1012 | Compatibility Shim — Observability & Tests ⚡ | 🔧 | main | WINT-1011 (#48a) | P0 — split from WINT-1010; **ready-to-work** |
```

## Release (end of orchestrator)

Find the same row and:

1. Set **Status** to the appropriate final status emoji (see table below)
2. Clear the **Worker** column (set to empty)
3. If the story completed successfully, set checkbox to `[x]`

| Orchestrator Outcome | Status | Checkbox |
|---------------------|--------|----------|
| Implementation complete (PR created) | `🚧` | `[ ]` |
| Code review PASS | `🔍` | `[ ]` |
| Code review FAIL | `🚧` | `[ ]` |
| QA PASS (UAT) | `✅` | `[x]` |
| QA FAIL | `🚧` | `[ ]` |
| Elaboration PASS | `⏳` | `[ ]` |
| Elaboration FAIL | `⏳` | `[ ]` |
| Fix complete (PR updated) | `🚧` | `[ ]` |
| PM story generated | `🆕` | `[ ]` |
| Error/blocked | restore previous status | `[ ]` |

## Failure Safety

If the orchestrator errors or is interrupted:
- The `🔧` marker remains — this is intentional
- The next `/next-actions` run will see the `🔧` marker and skip the story
- Manual cleanup: find rows with `🔧` and reset status if the worker is no longer active

## Story Not Found

If `{STORY_ID}` is not found in any table row of `WORK-ORDER-BY-BATCH.md`, skip claim/release silently. Not all stories are tracked in the work order file.

## Add New Story (splits, follow-ups, ad-hoc)

When an orchestrator creates a new story (split, follow-up, or ad-hoc), it MUST add the story to `WORK-ORDER-BY-BATCH.md` so `/next-actions` can find and schedule it.

### Placement Rules

1. **Find the parent story's row** in the file (the story being split or followed up from)
2. **Insert the new row(s) immediately after the parent row** in the same table
3. If the parent row doesn't exist (e.g., ad-hoc story with no parent), add to the **last non-gate table in the batch where the story's dependencies live**
4. If no clear batch, add to the end of the last batch before the gates

### Row Format

Match the column structure of the table you're inserting into. The new row must include:

```
| [ ] | {row_number} | {STORY_ID} | {title} | {status} | | {dependencies} | {notes_or_priority} |
```

**Row number (`#` column):** Use the parent's number with a letter suffix. Examples:
- Split of #52: use `52a`, `52b`, `52c`
- Follow-up of #52: use `52.1`, `52.2`
- Ad-hoc with no parent: use the next available number in the batch

**Status:** Set based on the story's current state:
- `🆕` for newly generated stories (awaiting elaboration)
- `📝` if elaboration is in progress
- `⏳` if ready to start (e.g., split stories that passed elab)
- `⏸️` if blocked on dependencies

**Dependencies:** Include `#NN` references for each dependency:
- Splits: typically depend on the same deps as the parent, plus may depend on each other
- Follow-ups: depend on the parent story (`{PARENT_ID} (#NN)`)
- Ad-hoc: list all known dependencies with `#NN` references

### Update Downstream Blockers

If the parent story was a dependency for other stories (referenced via `#NN` in their Dependencies column), update those references:

- **Split:** If story #52 (WINT-1070) splits into #52a (WINT-1071) and #52b (WINT-1072), find all rows that reference `#52` in their Dependencies column and update to reference the appropriate split part(s). If downstream stories need ALL split parts, list all: `WINT-1071 (#52a), WINT-1072 (#52b)`
- **Follow-up:** Follow-ups don't replace the parent — downstream deps on the parent remain unchanged. Only add dep references to the follow-up if other stories explicitly need it.

### Example: Split

Parent row #52 (WINT-1070) splits into WINT-1071 and WINT-1072:

```
| [ ] | 52  | WINT-1070 | Agent KB Tool Migration | ❌ SPLIT | | WINT-1030 (#38) | P2 — split into #52a, #52b |
| [ ] | 52a | WINT-1071 | Agent KB Tool Migration — Phase 1 | 🆕 | | WINT-1030 (#38) | P2 — split from WINT-1070 |
| [ ] | 52b | WINT-1072 | Agent KB Tool Migration — Phase 2 | 🆕 | | WINT-1071 (#52a) | P2 — split from WINT-1070 |
```

### Example: Follow-up

Follow-up from #50 (WINT-1140):

```
| [ ] | 50.1 | WINT-1141 | Worktree Integration — Edge Cases | 🆕 | | WINT-1140 (#50) | P1 — follow-up from WINT-1140 |
```

### Example: Ad-hoc / Generate

New story generated, deps on WINT-1030:

```
| [ ] | 57.1 | WINT-9011 | Business Logic — Error Handling | 🆕 | | WINT-1030 (#38) | P2 — ad-hoc |
```
