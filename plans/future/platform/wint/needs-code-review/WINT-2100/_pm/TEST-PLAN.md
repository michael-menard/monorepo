# Test Plan: WINT-2100 — Create session-manager Agent

## Scope Summary

- **Story type**: Agent file creation (documentation only)
- **Endpoints touched**: None — no HTTP endpoints
- **UI touched**: no
- **Data/storage touched**: No schema changes; reads/writes `wint.contextSessions` table via existing MCP tools
- **E2E (Playwright)**: not_applicable — no frontend changes
- **Frontend impacted**: false
- **ADR-005 requirement**: UAT must use real postgres-knowledgebase with live `wint.contextSessions` table; no mock sessions

---

## Happy Path Tests

### HP-1: Agent file exists with correct frontmatter

- **Setup**: Story WINT-2100 implementation complete
- **Action**: Read `.claude/agents/session-manager.agent.md` and parse YAML frontmatter block
- **Expected outcome**: Frontmatter contains all required fields: `type: worker`, `model: haiku`, `created`, `updated`, `version`, `permission_level`, `spawned_by` (includes at minimum the context-warmer agent name)
- **Evidence**: File exists on disk; YAML block parses cleanly with all required keys present

### HP-2: Session creation phase — nominal flow

- **Setup**: Live `wint.contextSessions` table accessible. No prior active session for the test `agentName` + `storyId`.
- **Action**: Invoke the session-manager agent in session-create mode with valid `agentName`, `storyId`, `phase: 'setup'`
- **Expected outcome**: Agent delegates to `session-create` skill (WINT-2090). A new row appears in `wint.contextSessions` with `endedAt IS NULL`. Agent emits structured YAML completion signal with `action: create`, `sessionId`, `result: success`.
- **Evidence**: Row visible in `wint.contextSessions` via `sessionQuery({ agentName, storyId, activeOnly: true })`. Completion YAML present in agent output.

### HP-3: Session update phase — incremental token accumulation

- **Setup**: Active session exists (created via HP-2 flow). `endedAt IS NULL`.
- **Action**: Invoke session-manager in update mode with `inputTokens: 500`, `outputTokens: 200`
- **Expected outcome**: Agent delegates to `sessionUpdate` with `mode: 'incremental'`. Token fields in `wint.contextSessions` row increase by the specified delta. Completion YAML shows `action: update`, `result: success`.
- **Evidence**: Row queried post-update shows `inputTokens >= 500`, `outputTokens >= 200`. Incremental mode confirmed (values accumulate, not overwrite).

### HP-4: Session completion phase — nominal close

- **Setup**: Active session exists. `endedAt IS NULL`.
- **Action**: Invoke session-manager in complete mode
- **Expected outcome**: Agent calls `sessionComplete`. Row in `wint.contextSessions` now has `endedAt IS NOT NULL`. `sessionQuery({ activeOnly: true })` returns empty for this `agentName` + `storyId`. Completion YAML shows `action: complete`, `result: success`.
- **Evidence**: Database row confirms `endedAt` is populated with a valid timestamp.

### HP-5: Session cleanup phase — dry-run preview then confirm deletion

- **Setup**: Multiple completed sessions older than `retentionDays` threshold in `wint.contextSessions` (all have `endedAt IS NOT NULL`). At least one active session (endedAt IS NULL) also present.
- **Action**: Invoke session-manager in cleanup mode
- **Expected outcome step 1 (dry run)**: Agent calls `sessionCleanup({ dryRun: true })`. Reports `deletedCount` and `cutoffDate`. No rows actually deleted. Active session remains untouched. Completion YAML shows `dry_run: true`.
- **Expected outcome step 2 (confirm)**: After explicit confirmation, agent calls `sessionCleanup({ dryRun: false, retentionDays: N })`. Only sessions with `endedAt IS NOT NULL` older than cutoff are deleted. Active session (endedAt IS NULL) is untouched.
- **Evidence**: Row count in `wint.contextSessions` decreases by expected `deletedCount`. Active session row still present.

---

## Error Cases

### EC-1: sessionCreate returns null (DB error) — fire-and-forget behavior

- **Setup**: Simulate DB error condition such that `sessionCreate` returns `null`
- **Action**: Invoke session-manager in create mode
- **Expected outcome**: Agent emits a WARNING log entry. Agent does NOT crash. Completion YAML shows `action: create`, `result: warned` (or `skipped`). Invoking leader agent continues without blocking.
- **Evidence**: No exception thrown. YAML output has `result: warned`. Fire-and-forget documented policy confirmed.

### EC-2: sessionUpdate on already-completed session — graceful skip

- **Setup**: Session with `endedAt IS NOT NULL` (already completed)
- **Action**: Invoke session-manager update mode referencing the completed sessionId
- **Expected outcome**: `sessionUpdate` throws "session not found or already completed". Agent catches the throw, emits a WARNING, skips the update, and does NOT crash. Completion YAML shows `action: update`, `result: warned`.
- **Evidence**: No unhandled exception. YAML output confirms `result: warned`. DB row unchanged (no dirty update).

### EC-3: sessionComplete on already-completed session — idempotent guard

- **Setup**: Session with `endedAt IS NOT NULL`
- **Action**: Invoke session-manager complete mode on the already-completed session
- **Expected outcome**: Agent detects idempotent case, emits warning (or info), skips second complete call, does NOT crash. Completion YAML shows `action: complete`, `result: skipped` (idempotent guard triggered).
- **Evidence**: No duplicate-complete error. Single `endedAt` value unchanged.

### EC-4: sessionCleanup called without dryRun: false — dry run default enforced

- **Setup**: Completed sessions exist in `wint.contextSessions` eligible for deletion
- **Action**: Invoke cleanup mode without explicitly specifying `dryRun: false`
- **Expected outcome**: Agent runs `sessionCleanup({ dryRun: true })` only. No rows deleted. Agent requires explicit confirmation before proceeding.
- **Evidence**: Row count in `wint.contextSessions` unchanged. Completion YAML has `dry_run: true`. No deletion occurred.

### EC-5: Leaked session detection — prior active session found

- **Setup**: An active session (`endedAt IS NULL`) exists for the same `agentName` + `storyId` pair from a prior crashed invocation
- **Action**: Invoke session-manager in create mode for the same `agentName` + `storyId`
- **Expected outcome**: Agent calls `sessionQuery({ agentName, storyId, activeOnly: true })`, detects the leaked session. Agent presents two options in numbered format: (1) complete the leaked session and create a new one, (2) resume the leaked session. Agent does NOT blindly create a duplicate session.
- **Evidence**: Completion YAML reports the detected `sessionId` of the leaked session and the chosen action. No duplicate active sessions for the same `agentName` + `storyId` pair exist after resolution.

---

## Edge Cases

### EG-1: Cleanup with zero eligible sessions

- **Setup**: All sessions in `wint.contextSessions` are either active (endedAt IS NULL) or newer than `retentionDays` cutoff
- **Action**: Invoke cleanup mode
- **Expected outcome**: Dry-run reports `deletedCount: 0`. Agent reports no sessions eligible. No error or crash.
- **Evidence**: Completion YAML shows `deletedCount: 0`. Table unchanged.

### EG-2: Session creation with phase tracking

- **Setup**: Creating sessions for different phases: `setup`, `plan`, `execute`, `review`, `qa`
- **Action**: Create sessions with each phase value
- **Expected outcome**: Each session row in `wint.contextSessions` has the correct `phase` field value. Agent documents all valid phase values.
- **Evidence**: DB rows queried to confirm `phase` field matches input for each session.

### EG-3: Multiple concurrent update calls (incremental mode safety)

- **Setup**: Active session. Two update payloads with different token counts.
- **Action**: Submit updates in rapid succession
- **Expected outcome**: `mode: 'incremental'` default ensures concurrent-safe accumulation. Final token totals equal the sum of all increments.
- **Evidence**: Final `inputTokens` and `outputTokens` values equal the arithmetic sum of all individual increments.

### EG-4: LangGraph porting interface contract section present

- **Setup**: Agent file read on disk
- **Action**: Search for the LangGraph Porting Interface Contract section in `.claude/agents/session-manager.agent.md`
- **Expected outcome**: Section is present, documents the node port target path (`packages/backend/orchestrator/src/nodes/context/`), input/output schema for WINT-9090 consumption, and phase-by-phase interface contract
- **Evidence**: Section found by grep or manual read. All four lifecycle phase interfaces (create, update, complete, cleanup) documented.

---

## Required Tooling Evidence

### Backend

No HTTP endpoints. Verification is via MCP tool calls against live postgres-knowledgebase:

```
sessionQuery({ agentName: "test-agent", storyId: "WINT-2100-test", activeOnly: true })
  → assert: returns empty array when no session created

sessionCreate({ agentName: "test-agent", storyId: "WINT-2100-test", phase: "setup" })
  → assert: returns non-null SessionRecord with endedAt: null

sessionQuery({ agentName: "test-agent", storyId: "WINT-2100-test", activeOnly: true })
  → assert: returns array with 1 record, endedAt: null

sessionUpdate({ sessionId: "<id>", inputTokensDelta: 500, outputTokensDelta: 200 })
  → assert: returns non-null SessionRecord with accumulated token values

sessionComplete({ sessionId: "<id>" })
  → assert: returns SessionRecord with endedAt IS NOT NULL

sessionCleanup({ dryRun: true, retentionDays: 7 })
  → assert: returns { deletedCount: N, cutoffDate: "..." }

sessionCleanup({ dryRun: false, retentionDays: 7 })
  → assert: active sessions untouched; only completed+old sessions deleted
```

### Frontend

Not applicable — no UI changes. No Playwright tests required.

---

## Risks to Call Out

1. **WINT-2090 dependency**: The `session-create` and `session-inherit` skills must exist at `.claude/skills/session-create/SKILL.md` and `.claude/skills/session-inherit/SKILL.md` before test HP-2 can be fully verified. Tests HP-2 through HP-5 require WINT-2090 to be complete (UAT-level).

2. **DB error simulation**: EC-1 requires simulating `sessionCreate` returning null. Confirm whether this can be reproduced by temporarily disconnecting the DB or by crafting an invalid payload that the DB rejects without the Zod validation catching it first (Zod failures throw — DB errors return null). May require test harness configuration.

3. **sessionUpdate throw semantics**: EC-2 requires triggering the "session already completed" throw. The MCP tool throws (not returns null) in this case. Confirm the agent's catch block is targeted to the specific error message pattern from `session-update.ts`.

4. **Leaked session cleanup in test teardown**: Tests EC-5 and HP-2 create sessions that must be cleaned up. Test setup must include a `teardown: sessionComplete + sessionCleanup` step to avoid polluting the test database.
