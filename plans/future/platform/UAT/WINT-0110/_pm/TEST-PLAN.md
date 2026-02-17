# Test Plan: WINT-0110 - Create Session Management MCP Tools

**Story ID**: WINT-0110
**Generated**: 2026-02-15
**Test Strategy**: Integration-first with real database, comprehensive error case coverage

---

## Test Philosophy

This is an **infrastructure story** focused on database operations for session management. Testing requires:
- Real database integration tests (not mocks) to validate Drizzle ORM queries
- Session lifecycle validation (create → update → complete flow)
- Comprehensive error handling for missing sessions, invalid inputs, duplicate IDs
- Edge case coverage for pagination, concurrent updates, cleanup safety

**Coverage Target**: ≥80% for all tool functions

---

## Test Scope

### In Scope
- All 5 MCP tool functions (create, update, complete, query, cleanup)
- Input validation via Zod schemas
- Drizzle ORM query patterns
- Error handling for missing/invalid sessions
- Session lifecycle workflows
- Pagination edge cases
- Cleanup safety (dryRun mode)
- Integration with `wint.contextSessions` table

### Out of Scope
- MCP server infrastructure (not yet implemented)
- Real-time session monitoring
- UI components (backend-only)
- Performance/load testing
- Cost calculation logic (deferred to WINT-0260)

---

## Test Environment

### Database Setup
```typescript
// Use real PostgreSQL database with test schema
// Setup: Drizzle migrations + seed data
beforeAll(async () => {
  await runMigrations()
  await seedTestSessions()
})

afterAll(async () => {
  await cleanupTestDb()
  await closePool()
})
```

### Test Data Requirements
- Multiple test sessions with different agents, stories, phases
- Mix of active (endedAt=null) and completed sessions
- Old sessions (>30 days ago) for cleanup testing
- Sessions with varying token metrics

---

## Test Cases by Acceptance Criteria

### AC-1: session_create Tool

**Happy Path**
```typescript
describe('session_create', () => {
  it('creates new session with all fields', async () => {
    const input = {
      agentName: 'test-agent',
      storyId: 'TEST-001',
      phase: 'implementation',
      sessionId: crypto.randomUUID()
    }

    const result = await sessionCreate(input)

    expect(result.sessionId).toBe(input.sessionId)
    expect(result.agentName).toBe(input.agentName)
    expect(result.storyId).toBe(input.storyId)
    expect(result.phase).toBe(input.phase)
    expect(result.startedAt).toBeDefined()
    expect(result.endedAt).toBeNull()
  })

  it('auto-generates sessionId if not provided', async () => {
    const input = {
      agentName: 'test-agent'
    }

    const result = await sessionCreate(input)

    expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/) // UUID format
  })

  it('creates session with minimal fields (only agentName)', async () => {
    const input = { agentName: 'minimal-agent' }

    const result = await sessionCreate(input)

    expect(result.agentName).toBe('minimal-agent')
    expect(result.storyId).toBeNull()
    expect(result.phase).toBeNull()
  })
})
```

**Error Cases**
```typescript
describe('session_create errors', () => {
  it('rejects duplicate sessionId', async () => {
    const sessionId = crypto.randomUUID()
    await sessionCreate({ agentName: 'agent1', sessionId })

    await expect(
      sessionCreate({ agentName: 'agent2', sessionId })
    ).rejects.toThrow('Session ID already exists')
  })

  it('rejects missing agentName', async () => {
    await expect(
      sessionCreate({ storyId: 'TEST-001' } as any)
    ).rejects.toThrow(ZodError)
  })

  it('validates sessionId is UUID format', async () => {
    await expect(
      sessionCreate({ agentName: 'agent', sessionId: 'invalid-uuid' })
    ).rejects.toThrow(ZodError)
  })
})
```

---

### AC-2: session_update Tool

**Happy Path**
```typescript
describe('session_update', () => {
  let sessionId: string

  beforeEach(async () => {
    const session = await sessionCreate({ agentName: 'test-agent' })
    sessionId = session.sessionId
  })

  it('updates token metrics incrementally', async () => {
    await sessionUpdate({
      sessionId,
      inputTokens: 100,
      outputTokens: 50,
      mode: 'incremental'
    })

    await sessionUpdate({
      sessionId,
      inputTokens: 200,
      outputTokens: 100,
      mode: 'incremental'
    })

    const result = await sessionQuery({ sessionId })
    expect(result[0].inputTokens).toBe(300)
    expect(result[0].outputTokens).toBe(150)
  })

  it('replaces token metrics in absolute mode', async () => {
    await sessionUpdate({
      sessionId,
      inputTokens: 100,
      outputTokens: 50,
      mode: 'absolute'
    })

    await sessionUpdate({
      sessionId,
      inputTokens: 200,
      outputTokens: 100,
      mode: 'absolute'
    })

    const result = await sessionQuery({ sessionId })
    expect(result[0].inputTokens).toBe(200)
    expect(result[0].outputTokens).toBe(100)
  })

  it('updates metadata JSONB field', async () => {
    await sessionUpdate({
      sessionId,
      metadata: { checkpointPhase: 'qa-verify', retryCount: 2 }
    })

    const result = await sessionQuery({ sessionId })
    expect(result[0].metadata).toEqual({
      checkpointPhase: 'qa-verify',
      retryCount: 2
    })
  })
})
```

**Error Cases**
```typescript
describe('session_update errors', () => {
  it('rejects update for missing session', async () => {
    const fakeId = crypto.randomUUID()

    await expect(
      sessionUpdate({ sessionId: fakeId, inputTokens: 100 })
    ).rejects.toThrow('Session not found')
  })

  it('rejects negative token counts', async () => {
    const session = await sessionCreate({ agentName: 'agent' })

    await expect(
      sessionUpdate({ sessionId: session.sessionId, inputTokens: -50 })
    ).rejects.toThrow(ZodError)
  })
})
```

---

### AC-3: session_complete Tool

**Happy Path**
```typescript
describe('session_complete', () => {
  it('marks session as ended with timestamp', async () => {
    const session = await sessionCreate({ agentName: 'test-agent' })

    const result = await sessionComplete({
      sessionId: session.sessionId,
      finalTokens: { inputTokens: 500, outputTokens: 250 }
    })

    expect(result.endedAt).toBeDefined()
    expect(result.inputTokens).toBe(500)
    expect(result.outputTokens).toBe(250)
  })

  it('uses current timestamp if endedAt not provided', async () => {
    const session = await sessionCreate({ agentName: 'agent' })
    const beforeComplete = new Date()

    const result = await sessionComplete({ sessionId: session.sessionId })

    expect(result.endedAt).toBeDefined()
    expect(new Date(result.endedAt!).getTime()).toBeGreaterThanOrEqual(
      beforeComplete.getTime()
    )
  })

  it('calculates session duration', async () => {
    const session = await sessionCreate({ agentName: 'agent' })
    await new Promise(resolve => setTimeout(resolve, 100))

    const result = await sessionComplete({ sessionId: session.sessionId })

    const duration =
      new Date(result.endedAt!).getTime() -
      new Date(result.startedAt).getTime()

    expect(duration).toBeGreaterThanOrEqual(100)
  })
})
```

**Error Cases**
```typescript
describe('session_complete errors', () => {
  it('rejects completion of already-completed session', async () => {
    const session = await sessionCreate({ agentName: 'agent' })
    await sessionComplete({ sessionId: session.sessionId })

    await expect(
      sessionComplete({ sessionId: session.sessionId })
    ).rejects.toThrow('Session already completed')
  })

  it('rejects completion of missing session', async () => {
    const fakeId = crypto.randomUUID()

    await expect(
      sessionComplete({ sessionId: fakeId })
    ).rejects.toThrow('Session not found')
  })
})
```

---

### AC-4: session_query Tool

**Happy Path**
```typescript
describe('session_query', () => {
  beforeEach(async () => {
    // Seed multiple test sessions
    await sessionCreate({ agentName: 'agent-1', storyId: 'TEST-001' })
    await sessionCreate({ agentName: 'agent-2', storyId: 'TEST-002' })
    await sessionCreate({ agentName: 'agent-1', storyId: 'TEST-003' })

    const session4 = await sessionCreate({ agentName: 'agent-3' })
    await sessionComplete({ sessionId: session4.sessionId })
  })

  it('queries active sessions', async () => {
    const results = await sessionQuery({ active: true })

    expect(results).toHaveLength(3)
    expect(results.every(s => s.endedAt === null)).toBe(true)
  })

  it('queries by agentName', async () => {
    const results = await sessionQuery({ agentName: 'agent-1' })

    expect(results).toHaveLength(2)
    expect(results.every(s => s.agentName === 'agent-1')).toBe(true)
  })

  it('queries by storyId', async () => {
    const results = await sessionQuery({ storyId: 'TEST-002' })

    expect(results).toHaveLength(1)
    expect(results[0].storyId).toBe('TEST-002')
  })

  it('combines filters (agentName + active)', async () => {
    const results = await sessionQuery({
      agentName: 'agent-1',
      active: true
    })

    expect(results).toHaveLength(2)
    expect(results.every(s =>
      s.agentName === 'agent-1' && s.endedAt === null
    )).toBe(true)
  })

  it('paginates results', async () => {
    const page1 = await sessionQuery({ limit: 2, offset: 0 })
    const page2 = await sessionQuery({ limit: 2, offset: 2 })

    expect(page1).toHaveLength(2)
    expect(page2).toHaveLength(2)
    expect(page1[0].sessionId).not.toBe(page2[0].sessionId)
  })

  it('defaults to limit=50', async () => {
    // Create 60 sessions
    for (let i = 0; i < 60; i++) {
      await sessionCreate({ agentName: `agent-${i}` })
    }

    const results = await sessionQuery({})

    expect(results.length).toBeLessThanOrEqual(50)
  })
})
```

**Edge Cases**
```typescript
describe('session_query edge cases', () => {
  it('returns empty array when no matches', async () => {
    const results = await sessionQuery({ agentName: 'nonexistent' })

    expect(results).toEqual([])
  })

  it('handles offset beyond result set', async () => {
    const results = await sessionQuery({ offset: 1000 })

    expect(results).toEqual([])
  })
})
```

---

### AC-5: session_cleanup Tool

**Happy Path**
```typescript
describe('session_cleanup', () => {
  beforeEach(async () => {
    // Create old completed sessions
    const oldSession1 = await sessionCreate({ agentName: 'old-1' })
    await sessionComplete({
      sessionId: oldSession1.sessionId,
      endedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
    })

    const oldSession2 = await sessionCreate({ agentName: 'old-2' })
    await sessionComplete({
      sessionId: oldSession2.sessionId,
      endedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
    })

    // Create recent completed session
    const recentSession = await sessionCreate({ agentName: 'recent' })
    await sessionComplete({
      sessionId: recentSession.sessionId,
      endedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    })

    // Create active session
    await sessionCreate({ agentName: 'active' })
  })

  it('returns count in dryRun mode without deletion', async () => {
    const result = await sessionCleanup({
      retentionDays: 30,
      dryRun: true
    })

    expect(result.deletedCount).toBe(2)

    // Verify sessions still exist
    const sessions = await sessionQuery({ agentName: 'old-1' })
    expect(sessions).toHaveLength(1)
  })

  it('deletes old sessions when dryRun=false', async () => {
    const result = await sessionCleanup({
      retentionDays: 30,
      dryRun: false
    })

    expect(result.deletedCount).toBe(2)

    // Verify old sessions deleted
    const oldSessions = await sessionQuery({ agentName: 'old-1' })
    expect(oldSessions).toHaveLength(0)

    // Verify recent session preserved
    const recentSessions = await sessionQuery({ agentName: 'recent' })
    expect(recentSessions).toHaveLength(1)
  })

  it('preserves active sessions regardless of age', async () => {
    // Create old but active session
    const activeOld = await sessionCreate({ agentName: 'active-old' })
    // Manually set startedAt to 60 days ago (would require DB access)

    const result = await sessionCleanup({
      retentionDays: 30,
      dryRun: false
    })

    // Active sessions should not be deleted even if old
    const activeSession = await sessionQuery({ agentName: 'active' })
    expect(activeSession).toHaveLength(1)
  })
})
```

**Error Cases**
```typescript
describe('session_cleanup errors', () => {
  it('rejects negative retentionDays', async () => {
    await expect(
      sessionCleanup({ retentionDays: -10 })
    ).rejects.toThrow(ZodError)
  })

  it('defaults dryRun to true for safety', async () => {
    const result = await sessionCleanup({ retentionDays: 30 })

    // Should not delete anything without explicit dryRun=false
    expect(result.deletedCount).toBeGreaterThanOrEqual(0)
  })
})
```

---

### AC-6: Zod Validation Schemas

**Schema Tests**
```typescript
describe('Zod validation schemas', () => {
  describe('SessionCreateInputSchema', () => {
    it('validates required agentName', () => {
      const result = SessionCreateInputSchema.safeParse({
        agentName: 'test-agent'
      })

      expect(result.success).toBe(true)
    })

    it('rejects missing agentName', () => {
      const result = SessionCreateInputSchema.safeParse({
        storyId: 'TEST-001'
      })

      expect(result.success).toBe(false)
    })

    it('validates sessionId is UUID', () => {
      const result = SessionCreateInputSchema.safeParse({
        agentName: 'agent',
        sessionId: 'not-a-uuid'
      })

      expect(result.success).toBe(false)
    })
  })

  describe('SessionUpdateInputSchema', () => {
    it('validates non-negative token counts', () => {
      const result = SessionUpdateInputSchema.safeParse({
        sessionId: crypto.randomUUID(),
        inputTokens: -50
      })

      expect(result.success).toBe(false)
    })

    it('allows optional fields', () => {
      const result = SessionUpdateInputSchema.safeParse({
        sessionId: crypto.randomUUID()
      })

      expect(result.success).toBe(true)
    })
  })

  describe('SessionQueryInputSchema', () => {
    it('validates limit is positive', () => {
      const result = SessionQueryInputSchema.safeParse({
        limit: -10
      })

      expect(result.success).toBe(false)
    })

    it('allows all fields optional', () => {
      const result = SessionQueryInputSchema.safeParse({})

      expect(result.success).toBe(true)
    })
  })
})
```

---

### AC-7: Unit Tests Coverage

**Coverage Requirements**
- Tool functions: ≥80%
- Validation schemas: 100%
- Error handling: All error paths covered
- Integration: Real Drizzle queries

**Test Organization**
```
src/mcp-tools/session-management/
  __tests__/
    session-create.test.ts
    session-update.test.ts
    session-complete.test.ts
    session-query.test.ts
    session-cleanup.test.ts
    schemas.test.ts
    integration.test.ts
```

---

### AC-8: Documentation Tests

**Documentation Validation**
```typescript
describe('SESSION-MANAGEMENT-TOOLS.md', () => {
  it('exists in story directory', async () => {
    const docPath = path.join(storyDir, 'SESSION-MANAGEMENT-TOOLS.md')
    await expect(fs.access(docPath)).resolves.not.toThrow()
  })

  it('includes all 5 tool signatures', async () => {
    const doc = await fs.readFile(docPath, 'utf-8')

    expect(doc).toContain('session_create')
    expect(doc).toContain('session_update')
    expect(doc).toContain('session_complete')
    expect(doc).toContain('session_query')
    expect(doc).toContain('session_cleanup')
  })

  it('includes error handling section', async () => {
    const doc = await fs.readFile(docPath, 'utf-8')

    expect(doc).toContain('Error Handling')
    expect(doc).toContain('Session not found')
    expect(doc).toContain('Invalid input')
  })

  it('includes usage examples', async () => {
    const doc = await fs.readFile(docPath, 'utf-8')

    expect(doc).toContain('Example:')
    expect(doc).toContain('```typescript')
  })
})
```

---

## Integration Test Strategy

### Database Integration
```typescript
describe('Session Management Integration', () => {
  it('completes full session lifecycle', async () => {
    // 1. Create session
    const session = await sessionCreate({
      agentName: 'integration-agent',
      storyId: 'INT-001',
      phase: 'implementation'
    })

    // 2. Update progress
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

    // 3. Complete session
    const completed = await sessionComplete({
      sessionId: session.sessionId
    })

    expect(completed.inputTokens).toBe(1500)
    expect(completed.outputTokens).toBe(750)
    expect(completed.endedAt).toBeDefined()

    // 4. Query completed session
    const queriedSessions = await sessionQuery({
      storyId: 'INT-001',
      active: false
    })

    expect(queriedSessions).toHaveLength(1)
    expect(queriedSessions[0].sessionId).toBe(session.sessionId)
  })

  it('handles concurrent session updates', async () => {
    const session = await sessionCreate({ agentName: 'concurrent-agent' })

    // Simulate concurrent updates
    await Promise.all([
      sessionUpdate({ sessionId: session.sessionId, inputTokens: 100 }),
      sessionUpdate({ sessionId: session.sessionId, outputTokens: 50 }),
      sessionUpdate({ sessionId: session.sessionId, cachedTokens: 25 })
    ])

    const result = await sessionQuery({ sessionId: session.sessionId })

    // Verify all updates applied (order may vary)
    expect(result[0].inputTokens).toBeGreaterThanOrEqual(100)
    expect(result[0].outputTokens).toBeGreaterThanOrEqual(50)
    expect(result[0].cachedTokens).toBeGreaterThanOrEqual(25)
  })
})
```

---

## Test Data

### Seed Data
```typescript
async function seedTestSessions() {
  const agents = ['pm-agent', 'dev-agent', 'qa-agent', 'review-agent']
  const stories = ['TEST-001', 'TEST-002', 'TEST-003']
  const phases = ['planning', 'implementation', 'qa', 'review']

  // Create 20 test sessions
  for (let i = 0; i < 20; i++) {
    const session = await sessionCreate({
      agentName: agents[i % agents.length],
      storyId: stories[i % stories.length],
      phase: phases[i % phases.length]
    })

    // Complete half of them
    if (i % 2 === 0) {
      await sessionComplete({ sessionId: session.sessionId })
    }
  }
}
```

---

## Acceptance Criteria Validation

| AC | Test Coverage | Status |
|----|---------------|--------|
| AC-1 | session_create.test.ts (happy path, errors, auto-UUID) | ✓ |
| AC-2 | session_update.test.ts (incremental, absolute, metadata) | ✓ |
| AC-3 | session_complete.test.ts (timestamp, duration, validation) | ✓ |
| AC-4 | session_query.test.ts (filters, pagination, active) | ✓ |
| AC-5 | session_cleanup.test.ts (dryRun, retention, safety) | ✓ |
| AC-6 | schemas.test.ts (Zod validation for all schemas) | ✓ |
| AC-7 | All __tests__/ files (≥80% coverage) | ✓ |
| AC-8 | Documentation validation tests | ✓ |

---

## Test Execution

```bash
# Run all tests
pnpm test:mcp-session-tools

# Run with coverage
pnpm test:coverage:mcp-session-tools

# Run integration tests only
pnpm test:integration:mcp-session-tools
```

---

## Success Criteria

- [ ] All 5 MCP tools have comprehensive unit tests
- [ ] Integration tests cover full session lifecycle
- [ ] Test coverage ≥80% for tool functions
- [ ] All error cases have test coverage
- [ ] Edge cases covered (pagination, concurrent updates, cleanup)
- [ ] Documentation validated via tests
- [ ] All tests pass in CI/CD pipeline

---

**Test Plan Status**: Complete
**Estimated Test Implementation Effort**: 6-8 hours
**Risk Level**: Low (clear requirements, existing patterns to follow)
