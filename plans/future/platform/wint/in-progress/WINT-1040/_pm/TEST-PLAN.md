# Test Plan: WINT-1040 — Update /story-status Command to Use DB

## Scope Summary

- **Endpoints touched**: None (Claude Code command, not HTTP)
- **UI touched**: No (CLI output format preserved, no browser UI)
- **Data/storage touched**: Read-only (PostgreSQL via MCP tool `story_get_status`, no writes)
- **Files touched**: `.claude/commands/story-status.md` (docs-only)
- **Shim dependency**: `shimGetStoryStatus` and optionally `shimGetStoriesByFeature` from `packages/backend/mcp-tools/src/story-compatibility/index.ts`

**ADR-005 constraint**: UAT/integration tests require real PostgreSQL. Unit tests may mock shim functions.

---

## Happy Path Tests

### HP-1: Single Story — Story Exists in DB

- **Setup**: `core.stories` table contains a row for story ID `WINT-1011` with state `in_qa`, title "Compatibility Shim Module — Core Functions"
- **Action**: Execute `/story-status plans/future/platform/wint WINT-1011`
- **Expected outcome**: Output shows `Status: In QA (UAT)` (DB-sourced), `Location: wint/UAT/WINT-1011`, and `Depends On: WINT-0090`. Output format matches `story-status-output.md` Single Story section.
- **Evidence**: Screenshot or captured terminal output matching the single-story output template. Confirm `Source: database` (if Data Source field is surfaced).

### HP-2: Single Story — DB Source Displayed

- **Setup**: Same as HP-1
- **Action**: Execute `/story-status plans/future/platform/wint WINT-1011`
- **Expected outcome**: Command spec includes "Data Source" section. If `source` diagnostic is surfaced in output, it reads `Source: database`.
- **Evidence**: Review updated `.claude/commands/story-status.md` for presence of "Data Source" section.

### HP-3: Feature Only Mode — Summary Counts

- **Setup**: Multiple stories exist across various states in `core.stories` for the `wint` feature
- **Action**: Execute `/story-status plans/future/platform/wint`
- **Expected outcome**: Summary table showing story counts by status. If AC-5 is implemented with DB routing, counts reflect DB values. If AC-5 is documented as Non-Goal, this mode is unchanged from prior behavior.
- **Evidence**: Summary table output matches prior baseline or DB-sourced counts are confirmed.

### HP-4: --depth Mode — Unchanged Behavior

- **Setup**: `wint/stories.index.md` contains stories across phases
- **Action**: Execute `/story-status plans/future/platform/wint --depth`
- **Expected outcome**: Swimlane visualization generated from `stories.index.md` exactly as before. No DB calls made for this mode.
- **Evidence**: Output matches prior `--depth` output. Regression test passes.

### HP-5: --deps-order Mode — Unchanged Behavior

- **Setup**: `wint/stories.index.md` contains dependency chains
- **Action**: Execute `/story-status plans/future/platform/wint --deps-order`
- **Expected outcome**: Dependency-tiered work list generated from `stories.index.md` exactly as before. No DB calls made for this mode.
- **Evidence**: Output matches prior `--deps-order` output. Regression test passes.

### HP-6: DB State Enum Mapping — All States Mapped

- **Setup**: Stories exist in DB with each state: `ready_to_work`, `in_progress`, `ready_for_qa`, `in_qa`, `done`, `backlog`, `blocked`, `cancelled`
- **Action**: Execute `/story-status {FEATURE_DIR} {STORY_ID}` for a story in each state
- **Expected outcome**: Each state maps to a human-readable label:
  - `backlog` → "Backlog"
  - `ready_to_work` → "Ready to Work"
  - `in_progress` → "In Progress"
  - `ready_for_qa` → "Ready for QA"
  - `in_qa` → "In QA / UAT"
  - `done` → "Done / Completed"
  - `blocked` → "Blocked"
  - `cancelled` → "Cancelled"
- **Evidence**: Terminal output for each story shows the correct human-readable label. Mapping table documented in updated `.claude/commands/story-status.md`.

---

## Error Cases

### EC-1: Story Not in DB, Exists in Directory (Directory Fallback)

- **Setup**: Story `WINT-0999` (hypothetical) does NOT exist in `core.stories` table, but a directory `wint/backlog/WINT-0999/` exists
- **Action**: Execute `/story-status plans/future/platform/wint WINT-0999`
- **Expected outcome**: Command returns status derived from directory location (e.g., `Status: Backlog`). Output format identical to DB-sourced output. If diagnostic is surfaced: `Source: directory (DB miss)`.
- **Evidence**: Terminal output shows correct directory-fallback result. No error shown to user.

### EC-2: Story Not in DB, Not in Directory ("Not Found")

- **Setup**: Story `WINT-9999` (non-existent) is absent from both `core.stories` and all swim-lane directories
- **Action**: Execute `/story-status plans/future/platform/wint WINT-9999`
- **Expected outcome**: Output shows `Story not found: WINT-9999` (same as current behavior for unknown IDs).
- **Evidence**: Terminal output matches prior "not found" behavior.

### EC-3: DB Unavailable — Automatic Directory Fallback

- **Setup**: PostgreSQL / MCP server unavailable (simulated by stopping the DB service)
- **Action**: Execute `/story-status plans/future/platform/wint WINT-1011`
- **Expected outcome**: Command returns directory-based status for WINT-1011 (found in `wint/UAT/`). No DB error shown to user — shim handles fallback transparently.
- **Evidence**: Terminal output shows correct result from directory. No crash or unhandled error.

### EC-4: Read-Only — No Writes Permitted

- **Setup**: Standard execution environment
- **Action**: Static review of updated `.claude/commands/story-status.md`
- **Expected outcome**: No write operations present — no file moves, no frontmatter updates, no DB writes (`story_update_status` not called anywhere).
- **Evidence**: Manual code review of updated command spec confirms read-only.

---

## Edge Cases

### EG-1: Story ID Normalization (Case Insensitive Input)

- **Setup**: Story `WINT-1011` exists in DB
- **Action**: Execute `/story-status plans/future/platform/wint wint-1011` (lowercase)
- **Expected outcome**: Command normalizes to `WINT-1011` and returns correct result.
- **Evidence**: Output shows correct story regardless of input case.

### EG-2: DB State "blocked" and "cancelled" — DB-Only States

- **Setup**: Story `WINT-XXXX` has state `blocked` in DB (no corresponding swim-lane directory for this state)
- **Action**: Execute `/story-status plans/future/platform/wint WINT-XXXX`
- **Expected outcome**: Returns `Status: Blocked` from DB. If DB unavailable and story not in any directory, falls back to `Story not found`.
- **Evidence**: DB-only state mapped correctly; fallback behavior confirmed.

### EG-3: Multiple Stories Same Feature (Feature Only Mode Counts)

- **Setup**: 50+ stories in `core.stories` for `wint` feature across all states
- **Action**: Execute `/story-status plans/future/platform/wint`
- **Expected outcome**: Summary counts are accurate. If DB-sourced (AC-5 implemented), counts reflect DB. No performance degradation.
- **Evidence**: Summary output matches expected counts.

### EG-4: Feature Directory vs Index Path Input

- **Setup**: Story `WINT-1011` exists in DB
- **Action**: Execute `/story-status plans/future/platform/wint/stories.index.md WINT-1011` (index path form)
- **Expected outcome**: Command resolves feature directory from index path and returns correct result.
- **Evidence**: Output identical to HP-1.

---

## Required Tooling Evidence

### Backend

This is a Claude Code command, not an HTTP API. No `.http` files required.

**MCP tool verification**:
- Confirm `story_get_status` MCP tool is accessible when `/story-status` is invoked
- Verify MCP tool returns `StoryGetStatusOutput` shape: `{id, storyId, title, state, priority, storyType, epic, wave, createdAt, updatedAt}`
- If MCP unavailable: confirm directory fallback is activated (not an error condition)

**DB verification** (UAT — live PostgreSQL required per ADR-005):
```sql
-- Verify story exists in DB
SELECT story_id, state, title FROM core.stories WHERE story_id = 'WINT-1011';

-- Verify all WINT stories in DB
SELECT story_id, state FROM core.stories WHERE epic = 'wint' ORDER BY story_id;
```

### Frontend / CLI Output

No browser UI. CLI output verification:

1. **Single story output** — matches `.claude/agents/_reference/examples/story-status-output.md` Single Story section
2. **Feature summary** — matches Feature Only section in output examples
3. **Swimlane (--depth)** — identical to prior swimlane output (no regression)
4. **Deps-order (--deps-order)** — identical to prior deps-order output (no regression)
5. **Data Source section** — present in updated `.claude/commands/story-status.md`
6. **State mapping table** — documented in updated command spec

---

## Risks to Call Out

1. **MCP tool availability**: The `story_get_status` MCP tool must be accessible at command execution time. If the MCP server is not running, the shim's directory fallback activates — this is acceptable but should be explicitly verified during UAT.

2. **DB state mapping completeness**: The seed notes that `SWIM_LANE_TO_STATE` in the shim maps 6 swim lanes to 6 DB states, but the command's swimlane display currently handles 11 directory entries. States like `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`, `created` are NOT in `SWIM_LANE_TO_STATE`. These states may only be accessible via DB (if present) or by directory scan for states outside the shim's mapping. The state-to-display-label mapping in the command must account for all 11 states the command currently displays, not just the 6 in SWIM_LANE_TO_STATE.

3. **Test isolation**: Since this is a docs-only story (command markdown file), there are no unit tests. All verification is behavioral. Ensure the UAT environment has the MCP server running and the DB populated (WINT-1030 must be UAT/PASS — confirmed).

4. **AC-5 scope decision**: If AC-5 (Feature Only mode with DB) is deferred to WINT-1070, document this explicitly in the command spec's Non-Goals to avoid ambiguity during QA verification.
