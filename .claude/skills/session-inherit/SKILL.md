---
name: session-inherit
description: Inherit an active context session opened by a leader agent. Workers call sessionQuery to locate the active session, emit SESSION INHERITED, and report incremental token usage via sessionUpdate. Workers must never call sessionComplete.
mcp_tools_available: [mcp__postgres-knowledgebase__sessionQuery, mcp__postgres-knowledgebase__sessionUpdate]
---

# /session-inherit - Inherit an Active Context Session

## Description

Enables a worker agent to join an active context session that was opened by a leader via `session-create`. Workers use `sessionQuery` to locate the active session, confirm with a `SESSION INHERITED` output block, and report incremental token usage via `sessionUpdate`.

Session tracking is **telemetry** — it must never gate or block a workflow. If no active session is found, the worker emits `SESSION NOT FOUND` and continues its work normally.

> **Workers MUST NOT call `sessionComplete`.** See the restriction section below.

## Usage

```
/session-inherit                                     # locate and inherit active session
/session-inherit storyId=WINT-1234                   # narrow query by storyId
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `sessionId` | No | _(match from context)_ | The UUID emitted in `SESSION CREATED` by the leader. Used for client-side matching after `sessionQuery`. |
| `storyId` | No | null | Narrows the `sessionQuery` to a known story. Recommended when known. |

## What It Does

This skill:
1. Calls `sessionQuery({ activeOnly: true, limit: 50 })` (and optionally `storyId`)
2. Filters the returned array client-side for the matching `session_id` (if known from context)
3. Emits `SESSION INHERITED` or `SESSION NOT FOUND` accordingly
4. Reports incremental token usage via `sessionUpdate` (mode: `'incremental'`)

## Execution Steps

### Step 1: Query active sessions

Call `sessionQuery` with `activeOnly: true`. **Do NOT pass `sessionId` as a filter** — `sessionId` is not a valid field in `SessionQueryInputSchema` and will cause a Zod validation error.

```javascript
// CORRECT — query all active sessions, then filter client-side
const sessions = await mcp__postgres_knowledgebase__sessionQuery({
  activeOnly: true,
  limit: 50,
  // storyId: 'WINT-2090'  // optional — include if story is known
})
```

```javascript
// WRONG — sessionId is not a valid SessionQueryInputSchema field
// This will throw a Zod validation error at runtime
const sessions = await mcp__postgres_knowledgebase__sessionQuery({
  sessionId: 'a1b2c3d4-...',  // INVALID — DO NOT USE
})
```

**SessionQueryInput fields (all optional):**

| Field | Type | Notes |
|-------|------|-------|
| `agentName` | string | Filter by agent name |
| `storyId` | string | Filter by story ID |
| `activeOnly` | boolean | `true` = only sessions with `endedAt IS NULL` |
| `limit` | int 1–1000 | Default: 50 |
| `offset` | int >= 0 | Default: 0 |

> `sessionId` is NOT listed above because it is NOT a valid filter field. Always query broadly and filter client-side.

### Step 2: Filter client-side

After `sessionQuery` returns the array, filter for the target session:

```javascript
// If the leader's session_id was passed in context:
const targetId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' // from SESSION CREATED output

const inherited = sessions.find(s => s.sessionId === targetId)

// If no specific session_id is known, pick the most recent active one:
// const inherited = sessions[0]  // results are ordered by startedAt DESC
```

### Step 3: Emit confirmation or warning

**Session found:**

```
SESSION INHERITED
  session_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  leader:     dev-execute-leader
  story_id:   WINT-2090
  phase:      execute
```

**Session not found** (no active sessions match, or `sessions` is empty):

```
SESSION NOT FOUND — continuing without session tracking
```

Then continue the worker's workflow normally.

### Step 4: Report token usage (incremental)

During and after completing work, call `sessionUpdate` with mode `'incremental'` to accumulate token counts:

```javascript
await mcp__postgres_knowledgebase__sessionUpdate({
  sessionId: inherited.sessionId,
  mode: 'incremental',          // ALWAYS use incremental — it is concurrency-safe
  inputTokens: 12000,           // tokens consumed so far this invocation
  outputTokens: 3500,
  // cachedTokens: 800          // optional
})
```

**Why incremental?** Multiple workers may update the same session concurrently. Incremental mode (`mode: 'incremental'`) adds to the existing counts atomically. Using `mode: 'absolute'` would overwrite counts set by other workers and is forbidden for workers.

## Output

### Session Found

```
SESSION INHERITED
  session_id: {uuid from matching session}
  leader:     {agentName from session record}
  story_id:   {storyId or "—"}
  phase:      {phase or "—"}
```

### Session Not Found

```
SESSION NOT FOUND — continuing without session tracking
```

## sessionUpdate — Incremental Mode

Always use `mode: 'incremental'` when reporting tokens. Never use `mode: 'absolute'`.

| Mode | Behavior | When to use |
|------|----------|-------------|
| `'incremental'` | Adds to existing token counts (concurrency-safe) | Workers always |
| `'absolute'` | Overwrites existing counts with provided values | FORBIDDEN for workers |

**Example — incremental update:**

```javascript
await mcp__postgres_knowledgebase__sessionUpdate({
  sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  mode: 'incremental',    // default — safe for concurrent workers
  inputTokens: 8500,
  outputTokens: 2100,
  cachedTokens: 400,
})
```

**Example — WRONG (absolute mode forbidden for workers):**

```javascript
// DO NOT DO THIS as a worker
await mcp__postgres_knowledgebase__sessionUpdate({
  sessionId: 'a1b2c3d4-...',
  mode: 'absolute',       // FORBIDDEN for workers — overwrites other workers' counts
  inputTokens: 8500,
})
```

## WARNING: sessionComplete is Restricted to the Leader

> **Workers MUST NOT call `sessionComplete`.**
>
> Only the **leader agent that opened the session via `session-create`** may call `sessionComplete`.
>
> Calling `sessionComplete` from a worker is a **Business Logic Error**. It will prematurely
> end the session for all other workers and the leader, corrupting token aggregation and
> lifecycle state. Double-completion is explicitly classified as an error in WINT-0110.
>
> If you are a worker agent (spawned by a leader), your responsibilities are:
> - `sessionQuery` — locate the session (read only)
> - `sessionUpdate` with `mode: 'incremental'` — report your token usage
>
> Do NOT call `sessionComplete`, regardless of whether you are the last worker to finish.

## Session Lifecycle

The full session lifecycle across a multi-agent workflow:

1. **Leader opens** — calls `session-create` → `sessionCreate` → emits `SESSION CREATED`
2. **Workers inherit** — each worker calls `session-inherit` → `sessionQuery({ activeOnly: true, limit: 50 })` → emits `SESSION INHERITED`
3. **Workers update tokens** — call `sessionUpdate({ sessionId, mode: 'incremental', inputTokens, outputTokens })`
4. **Leader closes** — the leader (and ONLY the leader that opened the session) calls `sessionComplete`
5. **Periodic cleanup** — `sessionCleanup({ retentionDays: 90 })` archives old sessions (future: WINT-2100)

## Graceful Degradation

Session inheritance is purely telemetry. The following conditions must NOT block the worker's workflow:

| Condition | Behavior |
|-----------|----------|
| `sessionQuery` returns empty array | Emit `SESSION NOT FOUND — continuing without session tracking` and proceed |
| `sessionQuery` MCP tool unavailable | Log warning, proceed without session |
| No session matches the target `sessionId` | Emit `SESSION NOT FOUND` and proceed |
| DB connection unavailable | Log warning, proceed without session |
| `sessionUpdate` fails | Log warning, proceed — token reporting failure is non-fatal |

The worker's core work (code generation, file writes, analysis) must continue regardless of session state.

## Examples

### Full happy-path workflow

```javascript
// Step 1: Query active sessions for this story
const sessions = await mcp__postgres_knowledgebase__sessionQuery({
  activeOnly: true,
  limit: 50,
  storyId: 'WINT-2090',
})

// Step 2: Filter client-side for the session opened by the leader
const targetSessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'  // from SESSION CREATED in context
const inherited = sessions.find(s => s.sessionId === targetSessionId)

if (!inherited) {
  // Emit: SESSION NOT FOUND — continuing without session tracking
  // proceed normally
} else {
  // Emit:
  // SESSION INHERITED
  //   session_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  //   leader:     dev-execute-leader
  //   story_id:   WINT-2090
  //   phase:      execute
}

// ... do actual work ...

// Step 3: Report token usage (incremental — safe for concurrent workers)
if (inherited) {
  await mcp__postgres_knowledgebase__sessionUpdate({
    sessionId: inherited.sessionId,
    mode: 'incremental',
    inputTokens: 15000,
    outputTokens: 4200,
  })
}
```

### No session ID in context (inherit most recent active)

```javascript
const sessions = await mcp__postgres_knowledgebase__sessionQuery({
  activeOnly: true,
  limit: 50,
})

// Take the most recent active session (results ordered by startedAt DESC)
const inherited = sessions[0] ?? null

if (!inherited) {
  // SESSION NOT FOUND — continuing without session tracking
}
```

## Integration Notes

- Always use `sessionQuery({ activeOnly: true, limit: 50 })` as the base query
- If the story ID is known, add `storyId` to narrow results before client-side filtering
- Never add `sessionId` to `sessionQuery` — it is not a valid filter field
- Always use `mode: 'incremental'` for `sessionUpdate` — never `'absolute'`
- Do not call `sessionComplete` — that is the leader's exclusive responsibility
