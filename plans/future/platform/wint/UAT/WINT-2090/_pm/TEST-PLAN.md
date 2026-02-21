# Test Plan: WINT-2090 — Session Context Management Skills

## Scope Summary

- **Story**: WINT-2090 — Implement `session-create` and `session-inherit` Claude Code skills
- **Endpoints touched**: None — no HTTP endpoints
- **UI touched**: No
- **Data/storage touched**: Yes — `wint.contextSessions` table in postgres-knowledgebase (via MCP tools)
- **Files created**: 2 markdown skill files
  - `.claude/skills/session-create/SKILL.md`
  - `.claude/skills/session-inherit/SKILL.md`
- **MCP tools exercised**: `sessionCreate`, `sessionQuery`, `sessionUpdate`, `sessionComplete`, `sessionCleanup`

**Note on testability**: These are markdown procedural documents, not TypeScript code. Unit tests in the traditional sense do not apply. Testing is divided into:
1. **Documentation completeness tests** — verify required sections and fields are present
2. **Integration tests** — invoke skill steps manually against live DB
3. **Graceful degradation tests** — verify behavior when DB is unavailable

---

## Happy Path Tests

### HT-1: session-create creates a session and emits structured output

**Prerequisites**:
- postgres-knowledgebase running and accessible
- `wint.contextSessions` table exists (WINT-0010 + WINT-0030 complete)
- `sessionCreate` MCP tool callable via WINT-0110

**Action**:
- Follow `.claude/skills/session-create/SKILL.md` execution steps
- Invoke `sessionCreate` with: `{ agentName: "test-leader", storyId: "WINT-2090", phase: "test" }`

**Expected outcome**:
- `sessionCreate` returns a non-null UUID `sessionId`
- Skill emits the structured block:
  ```
  SESSION CREATED
    session_id: <valid-uuid>
    agent: test-leader
    story: WINT-2090
  ```
- Session record exists in `wint.contextSessions` with `endedAt IS NULL`

**Evidence**:
- Database query: `SELECT * FROM wint."contextSessions" WHERE agent_name = 'test-leader' AND story_id = 'WINT-2090' ORDER BY started_at DESC LIMIT 1;`
- Confirm `session_id` matches UUID returned in structured block
- Confirm `ended_at IS NULL` (session is active)

---

### HT-2: session-inherit verifies an active session and emits confirmation

**Prerequisites**:
- Active session exists in `wint.contextSessions` (from HT-1 or fresh `sessionCreate` call)
- `session_id` from that session passed to session-inherit skill

**Action**:
- Follow `.claude/skills/session-inherit/SKILL.md` execution steps
- Invoke `sessionQuery` with: `{ storyId: "WINT-2090", activeOnly: true }`
- Confirm returned session matches provided `session_id`

**Expected outcome**:
- `sessionQuery` returns the active session record
- Skill emits confirmation: `SESSION INHERITED` or equivalent confirmation
- No error or warning emitted

**Evidence**:
- Confirm `sessionQuery` returns non-empty array with matching `session_id`
- Confirm skill confirmation message is emitted (not `SESSION NOT FOUND`)

---

### HT-3: Worker reports token usage via sessionUpdate (incremental mode)

**Prerequisites**:
- Active session from HT-1 or HT-2 (`session_id` known)
- Worker agent has processed some tokens

**Action**:
- Follow the `sessionUpdate` incremental example documented in `session-inherit/SKILL.md`
- Invoke `sessionUpdate` with:
  ```json
  {
    "sessionId": "<session_id>",
    "mode": "incremental",
    "inputTokens": 500,
    "outputTokens": 250,
    "cachedTokens": 0
  }
  ```

**Expected outcome**:
- `sessionUpdate` returns success (non-null)
- Token counts in DB are incremented by the provided values

**Evidence**:
- Query before and after: `SELECT input_tokens, output_tokens, cached_tokens FROM wint."contextSessions" WHERE session_id = '<uuid>';`
- Confirm difference matches provided incremental values
- Run twice to confirm cumulative behavior (tokens should add, not replace)

---

### HT-4: Leader completes session via sessionComplete

**Prerequisites**:
- Active session from prior tests
- Only leader agent calls `sessionComplete` (not worker)

**Action**:
- Invoke `sessionComplete` with: `{ sessionId: "<uuid>" }`

**Expected outcome**:
- Session record updated: `ended_at IS NOT NULL`
- No error thrown

**Evidence**:
- Query: `SELECT ended_at FROM wint."contextSessions" WHERE session_id = '<uuid>';`
- Confirm `ended_at` is now populated with a recent timestamp

---

### HT-5: Skill frontmatter fields are valid and complete

**Action**:
- Read frontmatter from `.claude/skills/session-create/SKILL.md`
- Read frontmatter from `.claude/skills/session-inherit/SKILL.md`

**Expected outcome**:
- Both files have YAML frontmatter between `---` delimiters
- Both contain `name` field (non-empty string)
- Both contain `description` field (non-empty string)
- No YAML parse errors

**Evidence**:
```bash
# Verify frontmatter can be parsed
head -10 .claude/skills/session-create/SKILL.md
head -10 .claude/skills/session-inherit/SKILL.md
```

---

## Error Cases

### EC-1: sessionCreate returns null (DB error) — graceful degradation

**Setup**:
- Stop postgres-knowledgebase (or disconnect network)
- Attempt to invoke `sessionCreate`

**Action**:
- Follow session-create skill execution steps
- Observe output when `sessionCreate` returns `null`

**Expected**:
- Skill emits: `SESSION UNAVAILABLE — continuing without session tracking`
- Skill does NOT throw an error or halt the workflow
- Subsequent workflow steps proceed normally

**Evidence**:
- Verify skill output text matches the expected warning message (AC-3)
- Verify no exception is surfaced that would block the calling leader
- Verify the Graceful Degradation section in the skill documents this behavior (AC-8)

---

### EC-2: session-inherit receives unknown or inactive session_id

**Setup**:
- Use a valid UUID format but one not present in `wint.contextSessions`
- OR use a session_id for a completed session (`endedAt IS NOT NULL`)

**Action**:
- Follow session-inherit skill with the invalid/inactive session_id
- Invoke `sessionQuery` with `{ activeOnly: true }` and the session_id

**Expected**:
- `sessionQuery` returns empty array (no matching active session)
- Skill emits `SESSION NOT FOUND` warning (AC-5)
- Worker continues without session tracking (graceful degradation)

**Evidence**:
- Verify `SESSION NOT FOUND` message appears in skill output
- Verify Graceful Degradation section documents this behavior (AC-8)

---

### EC-3: Worker attempts to call sessionComplete (prevented by documentation)

**Setup**:
- Active session exists
- Worker following `session-inherit` attempts to call `sessionComplete`

**Action**:
- Review `session-inherit/SKILL.md` execution instructions for `sessionComplete` restriction
- Attempt to call `sessionComplete` to verify tool-level enforcement

**Expected**:
- `session-inherit/SKILL.md` explicitly states workers MUST NOT call `sessionComplete` (AC-10)
- If `sessionComplete` is called on an already-completed session, the underlying WINT-0110 tool throws a `Business Logic Error`
- The skill's documentation serves as the primary prevention mechanism

**Evidence**:
- Read `session-inherit/SKILL.md` and confirm AC-10 restriction text is present and unambiguous
- Verify error message: `sessionComplete` on completed session produces a clear error from the MCP tool

---

### EC-4: DB unavailable during session-inherit (graceful degradation)

**Setup**:
- Stop postgres-knowledgebase
- Worker receives a session_id but DB is unreachable

**Action**:
- Follow session-inherit execution steps
- Invoke `sessionQuery` — observe that it returns null/error

**Expected**:
- Skill emits warning: `SESSION UNAVAILABLE — continuing without session tracking` (or equivalent per AC-8)
- Worker workflow continues
- No unhandled exception

**Evidence**:
- Verify Graceful Degradation section (AC-8) documents this DB-unavailable behavior
- Verify skill output text matches documented warning format

---

## Edge Cases

### EG-1: sessionUpdate with incremental mode called multiple times (concurrency safety)

**Setup**:
- Active session with known initial token counts
- Multiple calls to `sessionUpdate` with `mode: 'incremental'`

**Action**:
- Call `sessionUpdate` 3 times with `{ inputTokens: 100, outputTokens: 50, mode: 'incremental' }`

**Expected**:
- Final `inputTokens` = initial + 300
- Final `outputTokens` = initial + 150
- SQL arithmetic ensures no lost updates (concurrent-safe per WINT-0110 docs)

**Evidence**:
- Query token counts after each update and confirm cumulative addition
- This validates that the skill's documentation of `mode: 'incremental'` is correct for concurrent workers

---

### EG-2: sessionCreate called with minimal required fields only

**Action**:
- Invoke `sessionCreate` with only `{ agentName: "minimal-test" }` (no storyId, no phase)

**Expected**:
- `sessionCreate` returns a valid UUID (Zod schema allows optional storyId and phase)
- Skill structured output block still emits `SESSION CREATED` with the session_id
- Story and agent fields show minimal values (null or missing story_id is acceptable)

**Evidence**:
- Verify UUID returned matches Zod UUID validation
- Verify structured block emitted correctly with empty story field

---

### EG-3: sessionCreate called with explicit sessionId (pre-determined UUID)

**Action**:
- Generate a UUID: e.g., `550e8400-e29b-41d4-a716-446655440000`
- Invoke `sessionCreate` with `{ sessionId: "550e8400-e29b-41d4-a716-446655440000", agentName: "test" }`

**Expected**:
- Session created with the provided UUID (not auto-generated)
- `sessionCreate` returns the same UUID
- Structured output emits that UUID

**Evidence**:
- Query: `SELECT session_id FROM wint."contextSessions" WHERE session_id = '550e8400-e29b-41d4-a716-446655440000';`
- Confirm record exists

---

### EG-4: Output block format is machine-parseable

**Action**:
- Follow session-create skill and capture output
- Attempt to parse `session_id` from the structured block

**Expected** structured output format:
```
SESSION CREATED
  session_id: <uuid>
  agent: <agentName>
  story: <storyId>
```

**Parsing test** (simulated regex):
```
/SESSION CREATED\n\s+session_id:\s+([0-9a-f-]{36})/
```
Should match and extract the UUID.

**Evidence**:
- Confirm output format matches exactly (AC-9)
- Verify no prose or explanatory text mixes with the structured block

---

### EG-5: Session Lifecycle section completeness

**Action**:
- Read both skill files and locate the "Session Lifecycle" section (AC-7)

**Expected** — both files must document the full lifecycle contract:
1. Leader calls `session-create` skill → opens session in DB
2. Workers call `session-inherit` skill → register via incremental `sessionUpdate`
3. Leader calls `sessionComplete` at workflow end → closes session
4. Periodic cleanup via `sessionCleanup` (future WINT-2100) with `retentionDays: 90`

**Evidence**:
- Read each skill file
- Confirm all 4 lifecycle steps are present in the "Session Lifecycle" section

---

## Required Tooling Evidence

### Backend (DB-level verification):

**Prerequisite checks**:
```sql
-- Verify wint.contextSessions table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'wint' AND table_name = 'contextSessions';

-- Verify session created by HT-1
SELECT session_id, agent_name, story_id, phase, input_tokens, output_tokens, started_at, ended_at
FROM wint."contextSessions"
WHERE story_id = 'WINT-2090'
ORDER BY started_at DESC
LIMIT 5;
```

**Token accumulation verification** (HT-3):
```sql
-- Before and after sessionUpdate calls
SELECT input_tokens, output_tokens, cached_tokens
FROM wint."contextSessions"
WHERE session_id = '<uuid>';
```

**Session completion verification** (HT-4):
```sql
SELECT ended_at FROM wint."contextSessions" WHERE session_id = '<uuid>';
```

### MCP tool execution verification:

The session MCP tools can be called directly for testing. Confirm all 5 tools are reachable:
```bash
# Verify mcp-tools package builds successfully
pnpm --filter @repo/mcp-tools build

# Run session management test suite (WINT-0110 tests)
pnpm --filter @repo/mcp-tools test --reporter=verbose 2>&1 | grep -E "session|PASS|FAIL"
```

### Skill documentation verification:

```bash
# Verify skill files exist and have frontmatter
head -5 .claude/skills/session-create/SKILL.md
head -5 .claude/skills/session-inherit/SKILL.md

# Check for required sections
grep -n "Session Lifecycle\|Graceful Degradation\|SESSION CREATED\|SESSION NOT FOUND\|sessionComplete" \
  .claude/skills/session-create/SKILL.md \
  .claude/skills/session-inherit/SKILL.md
```

---

## Risks to Call Out

1. **WINT-0110 prerequisite**: These skills depend on `sessionCreate`, `sessionQuery`, `sessionUpdate`, `sessionComplete`, and `sessionCleanup` from WINT-0110. If these tools are not callable (e.g., MCP server not wired up), integration tests cannot be run. Mitigation: Confirm WINT-0110 is promoted to `uat` or `completed` status before running integration tests.

2. **Live DB requirement (ADR-005)**: All integration tests must run against the real `postgres-knowledgebase` with a live `wint.contextSessions` table. Mocks are not acceptable for session testing per ADR-005.

3. **Output format fragility**: If the structured output block format deviates from the documented format (e.g., extra whitespace, different capitalization), orchestrator parsing will break. Test EC-4 / EG-4 is critical for AC-9.

4. **Double-completion ambiguity**: The skill-level documentation (AC-10) is the primary prevention for double-completion errors. The underlying tool does throw a Business Logic Error, but relying on error recovery is worse than preventing the mistake via documentation. Verify AC-10 text is unambiguous.

5. **Cleanup strategy documentation completeness**: The Session Lifecycle section (AC-7) references WINT-2100 for scheduled cleanup. If this future reference is vague, developers may not know when or how to trigger cleanup. Verify the lifecycle section explicitly names `sessionCleanup` with `retentionDays: 90` and attributes scheduling to WINT-2100.
