# Test Plan: WINT-1060
# Update /story-move Command to Write Status to Database

generated: "2026-02-17"
story_id: WINT-1060
agent: pm-draft-test-plan

---

## Scope Summary

- **Endpoints touched**: None — this is an agent-facing markdown command file (`.claude/commands/story-move.md`), not an HTTP API
- **UI touched**: No
- **Data/storage touched**: Yes — `core.stories` table (DB write via `shimUpdateStoryStatus`); filesystem directories (mv operation preserved)
- **Command file touched**: `.claude/commands/story-move.md` (the primary deliverable)
- **Optional TypeScript helper**: Any utility co-located in `packages/backend/mcp-tools/` if introduced

---

## Happy Path Tests

### HT-1: Valid move with DB write succeeds

- **Setup**: Story WINT-1060 exists in `backlog/` directory. DB has record for WINT-1060 (shimGetStoryStatus returns a record). `shimUpdateStoryStatus` returns `{ storyId: "WINT-1060", newState: "ready_to_work" }`.
- **Action**: Execute `/story-move plans/future/platform/wint WINT-1060 ready-to-work`
- **Expected outcome**:
  1. `shimGetStoryStatus({ storyId: "WINT-1060" })` is called (Step 1 locate, DB-first)
  2. `shimUpdateStoryStatus({ storyId: "WINT-1060", newState: "ready_to_work" })` is called BEFORE directory mv
  3. `mv .../backlog/WINT-1060 .../ready-to-work/WINT-1060` executes successfully
  4. Return YAML includes `db_updated: true`
  5. `MOVE COMPLETE` signal emitted
- **Evidence**: Return YAML with `db_updated: true`, `from_stage: backlog`, `to_stage: ready-to-work`. Directory confirmed moved.

### HT-2: Valid move to UAT stage

- **Setup**: Story exists in `ready-for-qa/`. DB has record. `shimUpdateStoryStatus` returns success.
- **Action**: Execute `/story-move plans/future/platform/wint WINT-1060 UAT --update-status`
- **Expected outcome**:
  1. DB write called with `newState: "uat"` (SWIM_LANE_TO_STATE["UAT"] = "uat")
  2. Directory mv executes
  3. `/story-update` called (--update-status flag path, delegated per AC-7)
  4. Return YAML: `db_updated: true`, `status_updated: true`
  5. `MOVE COMPLETE`
- **Evidence**: Return YAML, directory in `UAT/`, story frontmatter updated to `status: uat`.

### HT-3: Valid move to in-progress stage

- **Setup**: Story in `ready-to-work/`. DB has record.
- **Action**: `/story-move plans/future/platform/wint WINT-1060 in-progress`
- **Expected outcome**:
  1. DB write with `newState: "in_progress"` (or equivalent `storyStateEnum` value)
  2. Directory mv executes
  3. `db_updated: true`
- **Evidence**: Return YAML with correct `newState` mapping.

---

## Error Cases

### EC-1: DB write returns null (DB unavailable) — fail-safe degradation

- **Setup**: Story in `backlog/`. `shimUpdateStoryStatus` returns `null` (DB unavailable).
- **Action**: `/story-move plans/future/platform/wint WINT-1060 ready-to-work`
- **Expected outcome**:
  1. `shimUpdateStoryStatus` called, returns null
  2. Warning logged via `@repo/logger`: message must indicate DB write failed
  3. Directory `mv` still executes (move NOT aborted)
  4. Return YAML: `db_updated: false`
  5. `MOVE COMPLETE` still emitted (move succeeded, DB was optional)
- **Evidence**: Return YAML with `db_updated: false`. Directory moved. No error thrown.

### EC-2: Story not found in DB — locate fallback to directory scan

- **Setup**: Story in `backlog/` directory, but NOT in DB (`shimGetStoryStatus` returns null for story ID).
- **Action**: `/story-move plans/future/platform/wint WINT-1060 ready-to-work`
- **Expected outcome**:
  1. `shimGetStoryStatus` returns null
  2. Command falls back to directory scan (existing Step 1 behavior) — finds story in `backlog/`
  3. DB write still attempted: `shimUpdateStoryStatus` called
  4. If DB write succeeds: `db_updated: true`
  5. Directory mv executes
  6. `MOVE COMPLETE`
- **Evidence**: Return YAML confirms move completed despite DB locate miss.

### EC-3: Story not found anywhere (DB miss + directory miss)

- **Setup**: Story does not exist in DB or any stage directory.
- **Action**: `/story-move plans/future/platform/wint WINT-XXXX ready-to-work`
- **Expected outcome**:
  1. `shimGetStoryStatus` returns null
  2. Directory scan finds no matching story
  3. `MOVE FAILED: Story directory not found`
- **Evidence**: `MOVE FAILED` signal with reason.

### EC-4: Target stage already has story (prevents duplicate)

- **Setup**: Story exists in `backlog/` AND also a duplicate exists in `ready-to-work/`.
- **Action**: `/story-move plans/future/platform/wint WINT-1060 ready-to-work`
- **Expected outcome**:
  1. Validate move step checks target directory
  2. `MOVE FAILED: Story already exists in ready-to-work`
  3. DB write NOT attempted (validation fails before DB step)
- **Evidence**: `MOVE FAILED` signal. No DB write. No directory change.

### EC-5: Invalid stage argument

- **Setup**: Story exists in `backlog/`.
- **Action**: `/story-move plans/future/platform/wint WINT-1060 not-a-real-stage`
- **Expected outcome**:
  1. Stage validation fails
  2. `MOVE FAILED: Invalid stage "not-a-real-stage"`
- **Evidence**: `MOVE FAILED` signal.

---

## Edge Cases

### EDGE-1: TO_STAGE not in SWIM_LANE_TO_STATE (unmapped stage)

- **Setup**: Story in `in-progress/`. TO_STAGE is `needs-code-review` (valid stage, but no SWIM_LANE_TO_STATE entry).
- **Action**: `/story-move plans/future/platform/wint WINT-1060 needs-code-review`
- **Expected outcome**:
  1. Stage lookup: `SWIM_LANE_TO_STATE["needs-code-review"]` → undefined/missing
  2. DB write step SKIPPED with logged warning: "Stage 'needs-code-review' has no DB state mapping, skipping DB write"
  3. Directory mv executes normally
  4. Return YAML: `db_updated: skipped`
  5. `MOVE COMPLETE`
- **Evidence**: Return YAML with `db_updated: skipped`. Warning log present. No DB write attempted.

### EDGE-2: TO_STAGE = failed-code-review (unmapped)

- **Setup**: Story in `in-progress/`.
- **Action**: `/story-move plans/future/platform/wint WINT-1060 failed-code-review`
- **Expected outcome**: Same as EDGE-1 — `db_updated: skipped`, directory mv proceeds.
- **Evidence**: `db_updated: skipped` in return YAML.

### EDGE-3: TO_STAGE = failed-qa (unmapped)

- **Setup**: Story in `ready-for-qa/`.
- **Action**: `/story-move plans/future/platform/wint WINT-1060 failed-qa`
- **Expected outcome**: `db_updated: skipped`, directory mv proceeds.
- **Evidence**: `db_updated: skipped` in return YAML.

### EDGE-4: Story already in target stage (MOVE SKIPPED)

- **Setup**: Story is already in `ready-to-work/`. Target is `ready-to-work`.
- **Action**: `/story-move plans/future/platform/wint WINT-1060 ready-to-work`
- **Expected outcome**: `MOVE SKIPPED: Already in ready-to-work`. No DB write attempted.
- **Evidence**: `MOVE SKIPPED` signal.

### EDGE-5: --update-status with DB-aware /story-update (WINT-1050 coordination)

- **Setup**: Story in `in-progress/`. WINT-1050 is complete, making `/story-update` DB-aware.
- **Action**: `/story-move plans/future/platform/wint WINT-1060 ready-for-qa --update-status`
- **Expected outcome**:
  1. DB write in Step 2.5 writes `newState` for `ready-for-qa`
  2. `/story-update` called for `--update-status` (which itself may write DB via WINT-1050)
  3. No double-write conflict — either Step 2.5 is skipped for the `--update-status` path, OR both writes are idempotent
- **Evidence**: DB record shows correct final state. No error from duplicate write.

### EDGE-6: story in blocked/cancelled DB state

- **Setup**: Story DB record shows `blocked` state. Story directory is in `in-progress/`.
- **Action**: `/story-move plans/future/platform/wint WINT-1060 ready-for-qa`
- **Expected outcome**:
  1. `shimGetStoryStatus` may return null (blocked state has no swim-lane fallback)
  2. Directory scan finds story in `in-progress/`
  3. Move proceeds; DB write attempted with `newState: "ready_for_qa"`
  4. `MOVE COMPLETE`
- **Evidence**: Move completes, DB state updated from blocked to ready_for_qa (or `db_updated: false` if DB returns null).

---

## Required Tooling Evidence

### Backend
- No `.http` requests required (no HTTP API)
- TypeScript helper unit tests (if introduced): `pnpm test --filter @repo/mcp-tools`
- Type check: `pnpm check-types --filter @repo/mcp-tools`

### Command-Level Verification (Manual / Agent Dry-Run)
For each test scenario above, execute the command and capture the return YAML block:
```yaml
feature_dir: ...
story: WINT-1060
from_stage: ...
to_stage: ...
from_path: ...
to_path: ...
status_updated: true | false
db_updated: true | false | skipped
```
Verify:
- `db_updated` field is present in all scenarios
- `MOVE COMPLETE` / `MOVE FAILED` / `MOVE SKIPPED` signals match expected
- Directory is in correct location post-move
- Warning logs appear in appropriate scenarios (DB null, unmapped stage)

### Frontend
Not applicable — no browser UI.

---

## Risks to Call Out

1. **WINT-1050 coordination (EDGE-5)**: If WINT-1050 is completed before WINT-1060, the `--update-status` path through `/story-update` becomes DB-aware. Clarify whether the Step 2.5 DB write should be skipped when `--update-status` is provided (to avoid double-write). The seed recommends skipping or ensuring idempotency.

2. **SWIM_LANE_TO_STATE coverage gap**: Currently covers 6 of 10 valid stages. The `created`, `elaboration`, `needs-code-review`, and `failed-code-review` stages are NOT in the mapping. EDGE-1 through EDGE-3 cover these — ensure `db_updated: skipped` is clearly documented in the updated command.

3. **blocked/cancelled DB state edge case**: Stories in `blocked` or `cancelled` state return null from shimGetStoryStatus locate step. EDGE-6 covers this path; it may be tricky to test without a real DB in `blocked` state.

4. **No automated test harness for the command itself**: The command is a markdown file executed by agents. Behavioral verification relies on agent dry-run or manual execution. Unit tests only apply if TypeScript helper utilities are introduced.
