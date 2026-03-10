# Dev Feasibility: WINT-0110 - Create Session Management MCP Tools

**Story ID**: WINT-0110
**Generated**: 2026-02-15
**Feasibility**: ✅ High (straightforward CRUD operations, clear patterns)

---

## Executive Summary

**Recommendation**: ✅ **APPROVE** - Ready to implement

This story is **highly feasible** with well-defined scope and existing patterns to follow. Implementation involves creating 5 MCP tools for CRUD operations on the existing `wint.contextSessions` table. The schema is already deployed (WINT-0010), database patterns are established, and similar MCP tool stories provide clear precedent.

**Key Strengths**:
- Schema already exists (no migrations needed)
- Clear CRUD operation patterns
- Strong Drizzle ORM support
- Well-defined acceptance criteria
- No external API dependencies

**Key Risks**:
- MCP tool pattern not yet established (mitigated by focusing on database operations)
- Concurrent session update semantics need clarification (incremental vs absolute)
- Session cleanup safety requires careful implementation (dryRun default)

**Estimated Effort**: 12-16 hours (2 days)

---

## Technical Assessment

### Architecture Alignment

**Fits Existing Patterns**: ✅ Yes

The story aligns with:
- Drizzle ORM patterns (UUID PKs, timestamps, relations) from WINT-0010
- Zod-first validation (CLAUDE.md requirement)
- Database access via `@repo/db` package
- Type-safe queries with auto-generated Zod schemas

**Similar Stories**:
- WINT-0100: Create Context Cache MCP Tools (similar scope)
- WINT-0090: Create Story Management MCP Tools (similar scope)
- WINT-0040: Telemetry Tables (related MCP tool pattern)

---

### Change Surface Analysis

**Scope**: Backend-only infrastructure

| Surface | Impact | Files Affected |
|---------|--------|----------------|
| Database Schema | None (protected) | 0 files |
| Database Access | New MCP tools | ~5-7 new files |
| Validation | New Zod schemas | ~2-3 files |
| Tests | Unit + integration | ~8-10 test files |
| Documentation | New docs | ~1-2 files |

**Total Estimated Files**: 16-22 new files

**Protected Components**:
- `wint.contextSessions` table schema (WINT-0010) - **DO NOT MODIFY**
- Existing database migrations - **READ-ONLY**

---

### Implementation Complexity

**Overall Complexity**: 🟢 **Low-Medium**

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| session_create | 🟢 Low | Simple INSERT with UUID generation |
| session_update | 🟡 Medium | Incremental vs absolute mode logic |
| session_complete | 🟢 Low | UPDATE with timestamp and validation |
| session_query | 🟡 Medium | Flexible filtering + pagination |
| session_cleanup | 🟡 Medium | Safety-critical (dryRun required) |
| Zod schemas | 🟢 Low | Standard validation patterns |
| Integration tests | 🟡 Medium | Real database setup required |

**Key Complexity Drivers**:
1. **session_update mode logic** - Need to handle incremental (add to existing) vs absolute (replace) token updates
2. **session_query flexibility** - Multiple optional filters with pagination
3. **session_cleanup safety** - Must prevent accidental data loss with dryRun default

---

### Reuse Opportunities

**High Reuse Potential**: ✅

| Component | Reuse From | Confidence |
|-----------|------------|------------|
| Database access | `@repo/db` package | 100% |
| Zod schemas | `drizzle-zod` auto-generation | 100% |
| Session table schema | `wint.contextSessions` (WINT-0010) | 100% |
| UUID generation | Drizzle `defaultRandom()` | 100% |
| Logging patterns | `@repo/logger` | 100% |
| Test patterns | WINT-0040 telemetry tests | 90% |

**New Components Needed**:
- MCP tool wrapper functions (5 tools)
- Input validation schemas (5 schemas)
- Tool documentation (1 file)

---

### Dependencies

**Blocking Dependencies**: ✅ None

| Dependency | Status | Impact |
|------------|--------|--------|
| WINT-0010 (Core Schemas) | ✅ Completed | contextSessions table available |
| @repo/db package | ✅ Active | Database access ready |
| Drizzle ORM v0.44.3 | ✅ Active | Type-safe queries available |

**Non-Blocking Considerations**:
- WINT-1080 (Schema Reconciliation) - UAT stage, may affect future schema changes
- WINT-0180 (Examples Framework) - In-progress, may inform context management patterns

**Risk Mitigation**:
- Use JSONB metadata field for future-proofing against schema changes
- Focus on database operations, defer MCP server integration patterns

---

### Technical Risks

**Risk Level**: 🟡 **Medium-Low**

#### Risk 1: MCP Tool Pattern Not Established
- **Severity**: Medium
- **Likelihood**: High
- **Impact**: May need refactoring when MCP server infrastructure is built
- **Mitigation**: Focus on database operations as standalone functions, defer MCP server integration to implementation phase
- **Residual Risk**: Low (functions will remain valid, only wrapper layer may change)

#### Risk 2: Concurrent Session Updates
- **Severity**: Medium
- **Likelihood**: Medium
- **Impact**: Race conditions if multiple agents update same session simultaneously
- **Mitigation**: Implement optimistic locking via Drizzle's `UPDATE ... WHERE` pattern, clarify incremental vs absolute mode semantics
- **Residual Risk**: Low (Drizzle handles basic concurrency)

#### Risk 3: Session Cleanup Safety
- **Severity**: High
- **Likelihood**: Low
- **Impact**: Accidental deletion of active sessions could break workflows
- **Mitigation**: Default `dryRun=true`, require explicit `dryRun=false`, validate `endedAt IS NOT NULL` before deletion
- **Residual Risk**: Very Low (multiple safeguards)

#### Risk 4: Token Metric Calculation
- **Severity**: Low
- **Likelihood**: Medium
- **Impact**: Inconsistent token counts if incremental/absolute mode misunderstood
- **Mitigation**: Clear documentation, explicit mode parameter, comprehensive tests
- **Residual Risk**: Very Low (well-defined behavior)

---

### Performance Considerations

**Expected Performance**: ✅ Good

| Operation | Expected Latency | Scalability |
|-----------|------------------|-------------|
| session_create | <10ms | Excellent (simple INSERT) |
| session_update | <10ms | Excellent (indexed UPDATE) |
| session_complete | <10ms | Excellent (indexed UPDATE) |
| session_query | <50ms | Good (composite index on agent_name, story_id) |
| session_cleanup | 50-500ms | Good (WHERE clause on endedAt with index) |

**Optimizations**:
- Use composite index `(agent_name, story_id)` for common queries (already exists from WINT-0010)
- Pagination with limit/offset prevents large result sets
- Cleanup uses `endedAt` index for efficient filtering

**Scale Estimates**:
- Expected session volume: 100-1000 sessions/day
- Retention policy: 30-90 days
- Max concurrent sessions: 10-50

---

### Development Effort Estimate

**Total Effort**: 12-16 hours (2 days)

| Task | Estimated Hours | Confidence |
|------|-----------------|------------|
| Zod input schemas | 2h | High |
| session_create implementation | 1h | High |
| session_update implementation | 2h | Medium (mode logic) |
| session_complete implementation | 1h | High |
| session_query implementation | 2h | Medium (flexible filters) |
| session_cleanup implementation | 2h | Medium (safety checks) |
| Unit tests | 4h | High |
| Integration tests | 3h | Medium (DB setup) |
| Documentation | 2h | High |
| Code review iterations | 1h | High |

**Confidence Level**: 85% (±2 hours variance)

**Assumptions**:
- No changes to existing schema needed
- MCP tool pattern clarified during implementation
- Database test environment available
- One developer assigned full-time

---

### Testing Strategy

**Testability**: ✅ Excellent

| Test Type | Coverage Target | Feasibility |
|-----------|-----------------|-------------|
| Unit tests | ≥80% | High (pure functions) |
| Integration tests | 100% of CRUD flows | High (real DB available) |
| Error case tests | 100% of error paths | High (predictable errors) |
| Edge case tests | Pagination, concurrency | Medium (requires setup) |

**Test Infrastructure Needed**:
- PostgreSQL test database with WINT schema
- Drizzle migration runner for test setup
- Seed data generator for sessions

**Existing Test Patterns**:
- Vitest configuration (monorepo-wide)
- Drizzle test utilities (from other WINT stories)
- Test database setup scripts (reusable)

---

### Implementation Plan

**Recommended Approach**: Bottom-up (schemas → tools → tests → docs)

### Phase 1: Schema & Validation (2 hours)
1. Create Zod input schemas for all 5 tools
2. Define output types (reuse from `@repo/db` generated schemas)
3. Export schemas for reuse

**Deliverables**:
- `src/mcp-tools/session-management/__types__/index.ts`
- `src/mcp-tools/session-management/__types__/schemas.ts`

### Phase 2: CRUD Operations (8 hours)
1. Implement `session_create` with UUID generation
2. Implement `session_update` with mode logic (incremental/absolute)
3. Implement `session_complete` with validation
4. Implement `session_query` with filters + pagination
5. Implement `session_cleanup` with dryRun safety

**Deliverables**:
- `src/mcp-tools/session-management/session-create.ts`
- `src/mcp-tools/session-management/session-update.ts`
- `src/mcp-tools/session-management/session-complete.ts`
- `src/mcp-tools/session-management/session-query.ts`
- `src/mcp-tools/session-management/session-cleanup.ts`

### Phase 3: Testing (7 hours)
1. Unit tests for all 5 tools (happy path, errors)
2. Schema validation tests
3. Integration tests (full lifecycle)
4. Edge case tests (pagination, concurrency, cleanup)

**Deliverables**:
- `src/mcp-tools/session-management/__tests__/*.test.ts`

### Phase 4: Documentation (2 hours)
1. Tool API documentation (signatures, examples, errors)
2. Integration guide (orchestrator usage patterns)
3. Troubleshooting guide

**Deliverables**:
- `SESSION-MANAGEMENT-TOOLS.md`

---

### Code Location Strategy

**Recommended Package**: `packages/backend/mcp-tools/` (new package)

**Directory Structure**:
```
packages/backend/mcp-tools/
  session-management/
    __types__/
      index.ts          # Zod schemas, types
    __tests__/
      session-create.test.ts
      session-update.test.ts
      session-complete.test.ts
      session-query.test.ts
      session-cleanup.test.ts
      integration.test.ts
    session-create.ts
    session-update.ts
    session-complete.ts
    session-query.ts
    session-cleanup.ts
    index.ts            # Barrel export for all tools
  package.json
  tsconfig.json
```

**Alternative**: Add to existing `@repo/db` package
- **Pros**: Closer to database code, reuse existing test setup
- **Cons**: Mixes MCP concerns with database layer

**Recommendation**: New package for separation of concerns

---

### Critical Design Decisions

#### Decision 1: Incremental vs Absolute Token Updates
**Question**: How should `session_update` handle multiple token updates?

**Options**:
1. **Always incremental** - Add to existing counts
2. **Always absolute** - Replace existing counts
3. **Configurable mode** - Support both via `mode` parameter

**Recommendation**: Option 3 (Configurable mode)
- Default: `mode: 'incremental'` (common case)
- Explicit: `mode: 'absolute'` when needed
- Clear documentation of semantics

**Implementation**:
```typescript
async function sessionUpdate(input: {
  sessionId: string
  inputTokens?: number
  outputTokens?: number
  mode?: 'incremental' | 'absolute' // default: incremental
}) {
  if (input.mode === 'absolute') {
    // UPDATE sessions SET input_tokens = ?
  } else {
    // UPDATE sessions SET input_tokens = input_tokens + ?
  }
}
```

#### Decision 2: Session Cleanup Safety
**Question**: How to prevent accidental deletion of sessions?

**Options**:
1. **No safety mechanism** - Trust caller
2. **Confirmation prompt** - Interactive mode
3. **DryRun default** - Require explicit opt-in

**Recommendation**: Option 3 (DryRun default)
- Default: `dryRun: true` (returns count, no deletion)
- Explicit: `dryRun: false` required for actual deletion
- Validates `endedAt IS NOT NULL` before deletion
- Logs all deletion operations

**Implementation**:
```typescript
async function sessionCleanup(input: {
  retentionDays: number
  dryRun?: boolean // default: true
}) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  const sessionsToDelete = await db
    .select()
    .from(contextSessions)
    .where(and(
      isNotNull(contextSessions.endedAt),
      lt(contextSessions.endedAt, cutoffDate)
    ))

  if (input.dryRun !== false) {
    return { deletedCount: sessionsToDelete.length }
  }

  await db.delete(contextSessions).where(...)
  return { deletedCount: sessionsToDelete.length }
}
```

#### Decision 3: Query Result Ordering
**Question**: How should `session_query` order results?

**Options**:
1. **No ordering** - Database default
2. **Always by startedAt DESC** - Most recent first
3. **Configurable** - Allow caller to specify

**Recommendation**: Option 2 (Always by startedAt DESC)
- Most common use case: recent sessions first
- Consistent behavior across queries
- Pagination works predictably

---

### API Design

**Tool Signatures**:

```typescript
// session_create
function sessionCreate(input: {
  agentName: string
  storyId?: string
  phase?: string
  sessionId?: string // optional, auto-generated if not provided
}): Promise<Session>

// session_update
function sessionUpdate(input: {
  sessionId: string
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number
  metadata?: Record<string, any>
  mode?: 'incremental' | 'absolute' // default: incremental
}): Promise<Session>

// session_complete
function sessionComplete(input: {
  sessionId: string
  finalTokens?: {
    inputTokens?: number
    outputTokens?: number
    cachedTokens?: number
  }
  endedAt?: Date // default: now
}): Promise<Session>

// session_query
function sessionQuery(input: {
  agentName?: string
  storyId?: string
  active?: boolean
  limit?: number // default: 50
  offset?: number // default: 0
}): Promise<Session[]>

// session_cleanup
function sessionCleanup(input: {
  retentionDays: number
  dryRun?: boolean // default: true
}): Promise<{ deletedCount: number }>
```

---

### Acceptance Criteria Feasibility

| AC | Feasibility | Complexity | Risk |
|----|-------------|------------|------|
| AC-1: session_create | ✅ High | Low | None |
| AC-2: session_update | ✅ High | Medium | Mode logic |
| AC-3: session_complete | ✅ High | Low | None |
| AC-4: session_query | ✅ High | Medium | Flexible filters |
| AC-5: session_cleanup | ✅ High | Medium | Safety critical |
| AC-6: Zod schemas | ✅ High | Low | None |
| AC-7: Unit tests | ✅ High | Medium | DB setup |
| AC-8: Documentation | ✅ High | Low | None |

**All ACs are feasible** with existing infrastructure and patterns.

---

### Recommended Changes to Story

**Suggested Clarifications**:
1. **AC-2**: Specify default mode for `session_update` (recommend `incremental`)
2. **AC-5**: Clarify default `dryRun` value (recommend `true` for safety)
3. **AC-4**: Specify default result ordering (recommend `startedAt DESC`)

**Suggested Additions**:
- **AC-9**: Add concurrency testing (multiple updates to same session)
- **Non-Goal**: Clarify that MCP server integration is deferred

**No Blocking Issues**: Story can proceed as-is with minor clarifications during implementation.

---

## Recommendation

**Decision**: ✅ **APPROVE FOR IMPLEMENTATION**

**Confidence**: 90%

**Rationale**:
- Clear, well-defined scope with existing patterns
- No blocking dependencies
- Schema already deployed (no migrations)
- Strong reuse opportunities
- Comprehensive test plan
- Low technical risk

**Recommended Start Date**: Immediately (no blockers)

**Suggested Assignee**: Backend developer with Drizzle ORM experience

**Follow-Up Stories**:
- WINT-0100: Create Context Cache MCP Tools (similar scope)
- WINT-0090: Create Story Management MCP Tools (similar scope)
- MCP server infrastructure story (to integrate these tools)

---

**Feasibility Review Status**: Complete
**Review Date**: 2026-02-15
**Reviewer Confidence**: High
