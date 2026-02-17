# ELAB-WINT-0110: Create Session Management MCP Tools

**Elaboration Document**
**Story ID**: WINT-0110
**Generated**: 2026-02-15
**Status**: Elaborated

---

## Story Summary

Create 5 MCP (Model Context Protocol) tools for managing agent sessions in the WINT autonomous development workflow: session_create, session_update, session_complete, session_query, and session_cleanup. These tools provide type-safe CRUD operations on the existing `wint.contextSessions` table to track agent work sessions, token metrics, and lifecycle states.

---

## Business Value

### Problems Solved
1. **No programmatic session creation** - Agents cannot create session records when starting work
2. **No progress tracking** - Cannot update token metrics during execution
3. **No conflict detection** - Cannot query active sessions to prevent duplicate work
4. **No cost tracking** - Cannot retrieve session history for token usage analysis
5. **No cleanup mechanism** - Old sessions accumulate, causing database bloat

### Value Delivered
- **Autonomous workflow enablement** - Foundation for parallel work conflict detection (WINT-1160)
- **Cost optimization** - Enable token tracking per story (WINT-0260)
- **Context caching** - Support session-based context caching (WINT-2090, WINT-2100)
- **Operational insights** - Session analytics for workflow performance

### Success Metrics
- Session operations complete in <50ms
- ≥80% test coverage achieved
- Zero accidental session deletions in production
- Token metrics accurately tracked across all sessions

---

## Technical Deep Dive

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Orchestrator Layer                         │
│  (dev-implement-story, qa-verify, etc.)                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Session Management MCP Tools                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  session_create(agentName, storyId, phase, sessionId)  │  │
│  │  → Creates new session with auto-UUID                   │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  session_update(sessionId, tokens, metadata, mode)     │  │
│  │  → Updates tokens (incremental/absolute) + metadata    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  session_complete(sessionId, finalTokens, endedAt)     │  │
│  │  → Marks session ended, calculates duration            │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  session_query(filters, pagination)                    │  │
│  │  → Retrieves sessions by agent/story/active status     │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  session_cleanup(retentionDays, dryRun)                │  │
│  │  → Deletes old completed sessions (safety-first)       │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  Zod Validation Layer                         │
│  - SessionCreateInputSchema                                   │
│  - SessionUpdateInputSchema                                   │
│  - SessionCompleteInputSchema                                 │
│  - SessionQueryInputSchema                                    │
│  - SessionCleanupInputSchema                                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                @repo/db (Drizzle ORM)                         │
│  - Connection pooling                                         │
│  - Type-safe queries                                          │
│  - Auto-generated Zod schemas                                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│          PostgreSQL: wint.contextSessions Table               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ session_id        UUID (PK)                             │  │
│  │ agent_name        TEXT                                  │  │
│  │ story_id          TEXT (nullable)                       │  │
│  │ phase             TEXT (nullable)                       │  │
│  │ input_tokens      INTEGER (default 0)                   │  │
│  │ output_tokens     INTEGER (default 0)                   │  │
│  │ cached_tokens     INTEGER (default 0)                   │  │
│  │ started_at        TIMESTAMPTZ (default now)             │  │
│  │ ended_at          TIMESTAMPTZ (nullable)                │  │
│  │ metadata          JSONB (default {})                    │  │
│  │                                                          │  │
│  │ Indexes:                                                 │  │
│  │ - PRIMARY KEY (session_id)                              │  │
│  │ - (agent_name, story_id) -- composite for queries       │  │
│  │ - (ended_at) -- for cleanup queries                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Scenario 1: Agent Session Lifecycle

```
1. Agent starts work on story
   ↓
   session_create({ agentName: "dev-implementer", storyId: "WINT-0110", phase: "implementation" })
   ↓
   INSERT INTO wint.contextSessions (session_id, agent_name, story_id, phase, started_at)
   VALUES (uuid, "dev-implementer", "WINT-0110", "implementation", now())
   ↓
   Returns: { sessionId: "...", agentName: "dev-implementer", ... }

2. Agent makes progress, consumes tokens
   ↓
   session_update({ sessionId: "...", inputTokens: 1000, outputTokens: 500, mode: "incremental" })
   ↓
   UPDATE wint.contextSessions
   SET input_tokens = input_tokens + 1000, output_tokens = output_tokens + 500
   WHERE session_id = "..."
   ↓
   Returns: { sessionId: "...", inputTokens: 1000, outputTokens: 500, ... }

3. Agent completes work
   ↓
   session_complete({ sessionId: "...", finalTokens: { inputTokens: 5000, outputTokens: 2500 } })
   ↓
   UPDATE wint.contextSessions
   SET ended_at = now(), input_tokens = 5000, output_tokens = 2500
   WHERE session_id = "..." AND ended_at IS NULL
   ↓
   Returns: { sessionId: "...", endedAt: "2026-02-15T...", ... }
```

#### Scenario 2: Query Active Sessions

```
Orchestrator checks for active work
   ↓
   session_query({ agentName: "dev-implementer", active: true })
   ↓
   SELECT * FROM wint.contextSessions
   WHERE agent_name = "dev-implementer" AND ended_at IS NULL
   ORDER BY started_at DESC
   LIMIT 50
   ↓
   Returns: [{ sessionId: "...", agentName: "dev-implementer", endedAt: null, ... }]
```

#### Scenario 3: Cleanup Old Sessions

```
Scheduled cleanup job runs
   ↓
   session_cleanup({ retentionDays: 30, dryRun: true })
   ↓
   SELECT * FROM wint.contextSessions
   WHERE ended_at IS NOT NULL AND ended_at < (now - 30 days)
   ↓
   Returns: { deletedCount: 42 }

Admin confirms deletion
   ↓
   session_cleanup({ retentionDays: 30, dryRun: false })
   ↓
   DELETE FROM wint.contextSessions
   WHERE ended_at IS NOT NULL AND ended_at < (now - 30 days)
   ↓
   Returns: { deletedCount: 42 }
```

---

## Implementation Details

### Tool 1: session_create

**Purpose**: Initialize new agent session

**Input Schema**:
```typescript
const SessionCreateInputSchema = z.object({
  agentName: z.string().min(1),
  storyId: z.string().optional(),
  phase: z.string().optional(),
  sessionId: z.string().uuid().optional()
})
```

**Implementation**:
```typescript
async function sessionCreate(input: SessionCreateInput): Promise<Session> {
  const validated = SessionCreateInputSchema.parse(input)

  const sessionId = validated.sessionId ?? crypto.randomUUID()

  try {
    const [session] = await db.insert(contextSessions).values({
      sessionId,
      agentName: validated.agentName,
      storyId: validated.storyId ?? null,
      phase: validated.phase ?? null,
      startedAt: new Date(),
      endedAt: null,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      metadata: {}
    }).returning()

    logger.info('Session created', { sessionId, agentName: validated.agentName })

    return session
  } catch (error) {
    if (error.code === '23505') { // Postgres unique violation
      throw new Error('Session ID already exists')
    }
    throw error
  }
}
```

**Error Cases**:
- Duplicate sessionId → "Session ID already exists"
- Missing agentName → ZodError
- Invalid UUID format → ZodError

---

### Tool 2: session_update

**Purpose**: Update token metrics and metadata during session

**Input Schema**:
```typescript
const SessionUpdateInputSchema = z.object({
  sessionId: z.string().uuid(),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  cachedTokens: z.number().int().min(0).optional(),
  metadata: z.record(z.any()).optional(),
  mode: z.enum(['incremental', 'absolute']).default('incremental')
})
```

**Implementation**:
```typescript
async function sessionUpdate(input: SessionUpdateInput): Promise<Session> {
  const validated = SessionUpdateInputSchema.parse(input)
  const mode = validated.mode ?? 'incremental'

  const existing = await db.select().from(contextSessions)
    .where(eq(contextSessions.sessionId, validated.sessionId))

  if (!existing.length) {
    throw new Error('Session not found')
  }

  const updates: any = {}

  if (validated.inputTokens !== undefined) {
    updates.inputTokens = mode === 'incremental'
      ? sql`${contextSessions.inputTokens} + ${validated.inputTokens}`
      : validated.inputTokens
  }

  if (validated.outputTokens !== undefined) {
    updates.outputTokens = mode === 'incremental'
      ? sql`${contextSessions.outputTokens} + ${validated.outputTokens}`
      : validated.outputTokens
  }

  if (validated.cachedTokens !== undefined) {
    updates.cachedTokens = mode === 'incremental'
      ? sql`${contextSessions.cachedTokens} + ${validated.cachedTokens}`
      : validated.cachedTokens
  }

  if (validated.metadata) {
    updates.metadata = validated.metadata
  }

  const [updated] = await db.update(contextSessions)
    .set(updates)
    .where(eq(contextSessions.sessionId, validated.sessionId))
    .returning()

  logger.debug('Session updated', {
    sessionId: validated.sessionId,
    mode,
    tokensUpdated: !!(validated.inputTokens || validated.outputTokens || validated.cachedTokens)
  })

  return updated
}
```

**Mode Behavior**:
- **Incremental** (default): Adds to existing token counts
- **Absolute**: Replaces token counts with new values

**Error Cases**:
- Session not found → "Session not found"
- Negative token counts → ZodError
- Invalid mode → ZodError

---

### Tool 3: session_complete

**Purpose**: Mark session as ended with final metrics

**Input Schema**:
```typescript
const SessionCompleteInputSchema = z.object({
  sessionId: z.string().uuid(),
  finalTokens: z.object({
    inputTokens: z.number().int().min(0).optional(),
    outputTokens: z.number().int().min(0).optional(),
    cachedTokens: z.number().int().min(0).optional()
  }).optional(),
  endedAt: z.date().optional()
})
```

**Implementation**:
```typescript
async function sessionComplete(input: SessionCompleteInput): Promise<Session> {
  const validated = SessionCompleteInputSchema.parse(input)

  const existing = await db.select().from(contextSessions)
    .where(eq(contextSessions.sessionId, validated.sessionId))

  if (!existing.length) {
    throw new Error('Session not found')
  }

  if (existing[0].endedAt !== null) {
    throw new Error('Session already completed')
  }

  const updates: any = {
    endedAt: validated.endedAt ?? new Date()
  }

  if (validated.finalTokens) {
    if (validated.finalTokens.inputTokens !== undefined) {
      updates.inputTokens = validated.finalTokens.inputTokens
    }
    if (validated.finalTokens.outputTokens !== undefined) {
      updates.outputTokens = validated.finalTokens.outputTokens
    }
    if (validated.finalTokens.cachedTokens !== undefined) {
      updates.cachedTokens = validated.finalTokens.cachedTokens
    }
  }

  const [completed] = await db.update(contextSessions)
    .set(updates)
    .where(eq(contextSessions.sessionId, validated.sessionId))
    .returning()

  const duration = new Date(completed.endedAt!).getTime() - new Date(completed.startedAt).getTime()

  logger.info('Session completed', {
    sessionId: validated.sessionId,
    durationMs: duration,
    totalInputTokens: completed.inputTokens,
    totalOutputTokens: completed.outputTokens
  })

  return completed
}
```

**Error Cases**:
- Session not found → "Session not found"
- Session already completed → "Session already completed"
- Invalid UUID → ZodError

---

### Tool 4: session_query

**Purpose**: Retrieve sessions with flexible filtering

**Input Schema**:
```typescript
const SessionQueryInputSchema = z.object({
  agentName: z.string().optional(),
  storyId: z.string().optional(),
  active: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0)
})
```

**Implementation**:
```typescript
async function sessionQuery(input: SessionQueryInput): Promise<Session[]> {
  const validated = SessionQueryInputSchema.parse(input)

  let query = db.select().from(contextSessions)

  const conditions = []

  if (validated.agentName) {
    conditions.push(eq(contextSessions.agentName, validated.agentName))
  }

  if (validated.storyId) {
    conditions.push(eq(contextSessions.storyId, validated.storyId))
  }

  if (validated.active !== undefined) {
    conditions.push(
      validated.active
        ? isNull(contextSessions.endedAt)
        : isNotNull(contextSessions.endedAt)
    )
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions))
  }

  const sessions = await query
    .orderBy(desc(contextSessions.startedAt))
    .limit(validated.limit ?? 50)
    .offset(validated.offset ?? 0)

  logger.debug('Session query executed', {
    filters: { agentName: validated.agentName, storyId: validated.storyId, active: validated.active },
    resultCount: sessions.length
  })

  return sessions
}
```

**Query Patterns**:
- All sessions: `session_query({})`
- Active sessions: `session_query({ active: true })`
- By agent: `session_query({ agentName: "dev-implementer" })`
- By story: `session_query({ storyId: "WINT-0110" })`
- Combined: `session_query({ agentName: "dev-implementer", active: true })`
- Paginated: `session_query({ limit: 20, offset: 40 })`

---

### Tool 5: session_cleanup

**Purpose**: Archive or delete old completed sessions

**Input Schema**:
```typescript
const SessionCleanupInputSchema = z.object({
  retentionDays: z.number().int().min(1),
  dryRun: z.boolean().default(true)
})
```

**Implementation**:
```typescript
async function sessionCleanup(input: SessionCleanupInput): Promise<{ deletedCount: number }> {
  const validated = SessionCleanupInputSchema.parse(input)

  const cutoffDate = new Date(Date.now() - validated.retentionDays * 24 * 60 * 60 * 1000)

  const sessionsToDelete = await db.select()
    .from(contextSessions)
    .where(and(
      isNotNull(contextSessions.endedAt),
      lt(contextSessions.endedAt, cutoffDate)
    ))

  if (validated.dryRun !== false) {
    logger.info('Session cleanup (DRY RUN)', {
      retentionDays: validated.retentionDays,
      cutoffDate,
      wouldDelete: sessionsToDelete.length
    })

    return { deletedCount: sessionsToDelete.length }
  }

  // Actual deletion
  await db.delete(contextSessions)
    .where(and(
      isNotNull(contextSessions.endedAt),
      lt(contextSessions.endedAt, cutoffDate)
    ))

  logger.warn('Session cleanup EXECUTED', {
    retentionDays: validated.retentionDays,
    cutoffDate,
    deletedCount: sessionsToDelete.length
  })

  return { deletedCount: sessionsToDelete.length }
}
```

**Safety Mechanisms**:
1. **Default dryRun=true**: Must explicitly pass `dryRun: false` to delete
2. **Completed sessions only**: WHERE `ended_at IS NOT NULL`
3. **Logging**: All cleanup operations logged with details
4. **Active session protection**: Never deletes sessions with `ended_at = null`

---

## Edge Cases & Handling

### Edge Case 1: Concurrent Updates to Same Session

**Scenario**: Two agents update the same session simultaneously

**Handling**:
- Drizzle ORM uses database-level locking
- Incremental mode: Both updates applied (race condition possible)
- Absolute mode: Last write wins
- Mitigation: Use incremental mode by default, document behavior

**Test**:
```typescript
it('handles concurrent updates', async () => {
  const session = await sessionCreate({ agentName: 'agent' })

  await Promise.all([
    sessionUpdate({ sessionId: session.sessionId, inputTokens: 100 }),
    sessionUpdate({ sessionId: session.sessionId, outputTokens: 50 })
  ])

  const result = await sessionQuery({ sessionId: session.sessionId })
  expect(result[0].inputTokens).toBeGreaterThanOrEqual(100)
  expect(result[0].outputTokens).toBeGreaterThanOrEqual(50)
})
```

### Edge Case 2: Cleanup with Active Sessions

**Scenario**: Cleanup runs but some old sessions are still active

**Handling**:
- WHERE clause: `ended_at IS NOT NULL`
- Active sessions (ended_at = null) never deleted regardless of age

**Test**:
```typescript
it('preserves active sessions regardless of age', async () => {
  // Create old but active session
  const activeOld = await sessionCreate({ agentName: 'active-old' })
  // Manually set started_at to 60 days ago (via direct SQL)

  await sessionCleanup({ retentionDays: 30, dryRun: false })

  const sessions = await sessionQuery({ agentName: 'active-old' })
  expect(sessions).toHaveLength(1) // Still exists
})
```

### Edge Case 3: Pagination Beyond Results

**Scenario**: Query with offset greater than total results

**Handling**:
- Database returns empty array
- No error thrown

**Test**:
```typescript
it('handles offset beyond results', async () => {
  const results = await sessionQuery({ offset: 10000 })
  expect(results).toEqual([])
})
```

### Edge Case 4: Complete Already-Completed Session

**Scenario**: Attempt to complete session that's already ended

**Handling**:
- Check `endedAt IS NULL` before update
- Throw error: "Session already completed"

**Test**:
```typescript
it('rejects completion of already-completed session', async () => {
  const session = await sessionCreate({ agentName: 'agent' })
  await sessionComplete({ sessionId: session.sessionId })

  await expect(
    sessionComplete({ sessionId: session.sessionId })
  ).rejects.toThrow('Session already completed')
})
```

---

## Performance Optimization

### Query Performance

**session_query Optimization**:
- Uses composite index `(agent_name, story_id)` for common queries
- Default limit=50 prevents unbounded result sets
- `ORDER BY started_at DESC` uses index on started_at

**Expected Latency**:
- session_create: <10ms (simple INSERT)
- session_update: <10ms (indexed UPDATE)
- session_complete: <10ms (indexed UPDATE)
- session_query: <50ms (composite index)
- session_cleanup: 50-500ms (depends on session count)

### Scaling Considerations

**Session Volume**:
- Expected: 100-1000 sessions/day
- With 90-day retention: ~9,000-90,000 sessions max
- Cleanup reduces to steady state

**Connection Pooling**:
- Reuse `@repo/db` pool (default: 10 connections)
- Short-lived operations (< 100ms each)
- No connection exhaustion risk

---

## Testing Strategy

### Unit Tests (Coverage ≥80%)

**Test Files**:
1. `session-create.test.ts` - Create tool tests
2. `session-update.test.ts` - Update tool tests
3. `session-complete.test.ts` - Complete tool tests
4. `session-query.test.ts` - Query tool tests
5. `session-cleanup.test.ts` - Cleanup tool tests
6. `schemas.test.ts` - Zod validation tests
7. `integration.test.ts` - Full lifecycle tests

**Test Database Setup**:
```typescript
beforeAll(async () => {
  await runMigrations() // Apply WINT schema
  await seedTestSessions() // Create test data
})

afterEach(async () => {
  await clearSessions() // Clean between tests
})

afterAll(async () => {
  await closePool() // Close DB connections
})
```

### Integration Tests

**Full Lifecycle Test**:
```typescript
it('completes full session lifecycle', async () => {
  // 1. Create
  const session = await sessionCreate({
    agentName: 'integration-agent',
    storyId: 'INT-001',
    phase: 'implementation'
  })

  expect(session.sessionId).toBeDefined()
  expect(session.endedAt).toBeNull()

  // 2. Update (incremental)
  await sessionUpdate({
    sessionId: session.sessionId,
    inputTokens: 1000,
    outputTokens: 500,
    mode: 'incremental'
  })

  await sessionUpdate({
    sessionId: session.sessionId,
    inputTokens: 500,
    outputTokens: 250,
    mode: 'incremental'
  })

  // 3. Complete
  const completed = await sessionComplete({
    sessionId: session.sessionId
  })

  expect(completed.inputTokens).toBe(1500)
  expect(completed.outputTokens).toBe(750)
  expect(completed.endedAt).toBeDefined()

  // 4. Query
  const queriedSessions = await sessionQuery({
    storyId: 'INT-001',
    active: false
  })

  expect(queriedSessions).toHaveLength(1)
  expect(queriedSessions[0].sessionId).toBe(session.sessionId)
})
```

---

## Documentation

### SESSION-MANAGEMENT-TOOLS.md

**Sections**:
1. **Overview** - Purpose and usage summary
2. **Tool Signatures** - TypeScript interfaces for all 5 tools
3. **Usage Examples** - Code snippets for common scenarios
4. **Error Handling** - List of errors and how to handle
5. **Integration Guide** - How to use in orchestrator workflows
6. **Troubleshooting** - Common issues and solutions

**Example Content**:
```markdown
## session_create

Create a new agent session.

### Signature
```typescript
function sessionCreate(input: {
  agentName: string
  storyId?: string
  phase?: string
  sessionId?: string
}): Promise<Session>
```

### Example
```typescript
const session = await sessionCreate({
  agentName: 'dev-implementer',
  storyId: 'WINT-0110',
  phase: 'implementation'
})

console.log(session.sessionId) // Auto-generated UUID
```

### Errors
- `Session ID already exists` - sessionId already in use
- `ZodError` - Invalid input (missing agentName, invalid UUID)

### Integration
Use in orchestrator workflows to track agent work:

```typescript
// Start of dev-implement-story command
const session = await sessionCreate({
  agentName: 'dev-implementer',
  storyId: storyId,
  phase: 'implementation'
})

// Store sessionId for progress updates
context.sessionId = session.sessionId
```
```

---

## Migration & Rollout

### Deployment Strategy

**Phase 1: Development**
- Implement all 5 tools
- Unit tests passing
- Integration tests passing
- Documentation complete

**Phase 2: Review**
- Code review
- Security review (cleanup safety)
- Performance review (query efficiency)

**Phase 3: Staging**
- Deploy to staging environment
- Test with real workflow
- Monitor session creation/cleanup

**Phase 4: Production**
- Deploy to production
- Monitor for 1 week
- Validate token metrics accuracy

### Rollback Plan

If issues arise:
1. **Database unchanged** - Schema already exists (WINT-0010)
2. **Remove tool package** - No breaking changes to existing workflows
3. **Restore from backup** - If accidental session deletion occurs

---

## Follow-Up Work

### Immediate Follow-Ups
- **WINT-2090**: Implement Session Context Management (uses session_query)
- **WINT-2100**: Create session-manager Agent (uses all 5 tools)
- **WINT-9090**: Create Context Cache LangGraph Nodes (integrates sessions)

### Future Enhancements
- Session-based locking for parallel work prevention (WINT-1160)
- Cost calculation integration (WINT-0260)
- Real-time session monitoring dashboard (WINT-3xxx)
- Session analytics and reporting (future)

---

**Elaboration Complete**: 2026-02-15
**Ready for Implementation**: Yes
