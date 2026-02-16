# Session Management MCP Tools

**Story**: WINT-0110
**Package**: `@repo/mcp-tools`
**Status**: Implementation Complete

## Overview

Session Management MCP Tools provide type-safe CRUD operations for managing agent sessions in the WINT workflow. These tools interact with the `wint.contextSessions` table via Drizzle ORM, enabling tracking of agent execution metrics, token usage, and session lifecycle.

## Tools

### 1. `sessionCreate`

Creates a new agent session record.

**Function Signature**:
```typescript
function sessionCreate(input: SessionCreateInput): Promise<SelectContextSession | null>
```

**Input Schema**:
```typescript
{
  sessionId?: string          // UUID (auto-generated if not provided)
  agentName: string           // Required: Agent identifier
  storyId?: string | null     // Optional: Associated story ID
  phase?: string | null       // Optional: Workflow phase (setup, plan, execute, review, qa)
  inputTokens?: number        // Default: 0
  outputTokens?: number       // Default: 0
  cachedTokens?: number       // Default: 0
  startedAt?: Date            // Default: now()
}
```

**Returns**:
- `SelectContextSession` object on success
- `null` if database error occurs (resilient error handling)

**Example Usage**:
```typescript
import { sessionCreate } from '@repo/mcp-tools/session-management/session-create'

// Minimal creation (auto-generate sessionId)
const session = await sessionCreate({
  agentName: 'dev-execute-leader',
})

// Full creation with all fields
const session = await sessionCreate({
  sessionId: 'abc-123-def',
  agentName: 'dev-execute-leader',
  storyId: 'WINT-0110',
  phase: 'execute',
  inputTokens: 100,
  outputTokens: 50,
  cachedTokens: 25,
  startedAt: new Date('2026-02-15T10:00:00Z'),
})
```

**Error Handling**:
- Throws `ZodError` if input validation fails (fail fast)
- Returns `null` if database error occurs (resilient - logs warning via `@repo/logger`)
- Database errors are logged but never thrown

---

### 2. `sessionUpdate`

Updates an existing session's token metrics.

**Function Signature**:
```typescript
function sessionUpdate(input: SessionUpdateInput): Promise<SelectContextSession | null>
```

**Input Schema**:
```typescript
{
  sessionId: string           // Required: UUID of session to update
  mode?: 'incremental' | 'absolute'  // Default: 'incremental'
  inputTokens?: number        // Min: 0
  outputTokens?: number       // Min: 0
  cachedTokens?: number       // Min: 0
}
```

**Update Modes**:

1. **Incremental Mode (Default)**:
   - Uses SQL arithmetic for concurrent-safe updates
   - Token counts are **added** to existing values
   - Recommended for concurrent agent updates
   - Example: `inputTokens: 100` adds 100 to current count

2. **Absolute Mode**:
   - Last-write-wins behavior
   - Token counts are **set** to exact values
   - Use when you have authoritative final counts
   - Example: `inputTokens: 5000` sets count to exactly 5000

**Returns**:
- `SelectContextSession` object on success
- `null` if session not found or already completed
- Throws error if session not found or already completed

**Example Usage**:
```typescript
import { sessionUpdate } from '@repo/mcp-tools/session-management/session-update'

// Incremental mode (default) - adds to existing counts
const session = await sessionUpdate({
  sessionId: 'abc-123',
  inputTokens: 1000,    // Adds 1000 to current count
  outputTokens: 500,    // Adds 500 to current count
})

// Absolute mode - sets exact counts
const session = await sessionUpdate({
  sessionId: 'abc-123',
  mode: 'absolute',
  inputTokens: 5000,    // Sets count to exactly 5000
  outputTokens: 2500,   // Sets count to exactly 2500
})
```

**Error Handling**:
- Throws `ZodError` if input validation fails
- Throws `Error` if session not found
- Throws `Error` if session already completed (endedAt IS NOT NULL)
- Returns `null` if database error occurs (resilient)

**Concurrency Safety**:
- **Incremental mode**: Uses SQL arithmetic (`UPDATE sessions SET input_tokens = input_tokens + $1`), preventing race conditions
- **Absolute mode**: Last write wins - not safe for concurrent updates

---

### 3. `sessionComplete`

Marks a session as completed with final metrics.

**Function Signature**:
```typescript
function sessionComplete(input: SessionCompleteInput): Promise<SelectContextSession | null>
```

**Input Schema**:
```typescript
{
  sessionId: string           // Required: UUID of session to complete
  endedAt?: Date              // Default: now()
  inputTokens?: number        // Optional: Final input token count
  outputTokens?: number       // Optional: Final output token count
  cachedTokens?: number       // Optional: Final cached token count
}
```

**Returns**:
- `SelectContextSession` object on success
- Throws error if session not found or already completed

**Example Usage**:
```typescript
import { sessionComplete } from '@repo/mcp-tools/session-management/session-complete'

// Complete with current timestamp
const session = await sessionComplete({
  sessionId: 'abc-123',
})

// Complete with custom timestamp and final metrics
const session = await sessionComplete({
  sessionId: 'abc-123',
  endedAt: new Date('2026-02-15T11:30:00Z'),
  inputTokens: 5000,
  outputTokens: 2500,
  cachedTokens: 1000,
})
```

**Error Handling**:
- Throws `ZodError` if input validation fails
- Throws `Error` if session not found
- Throws `Error` if session already completed (prevents double-completion)
- Returns `null` if database error occurs (resilient)

**Business Rules**:
- Sets `endedAt` timestamp (defaults to `now()`)
- Optionally updates final token counts (absolute values)
- Cannot complete a session twice (protected by endedAt IS NULL check)

---

### 4. `sessionQuery`

Queries sessions with flexible filtering and pagination.

**Function Signature**:
```typescript
function sessionQuery(input?: SessionQueryInput): Promise<SelectContextSession[]>
```

**Input Schema**:
```typescript
{
  agentName?: string          // Filter by agent name
  storyId?: string            // Filter by story ID
  activeOnly?: boolean        // Filter for endedAt IS NULL (default: false)
  limit?: number              // Max results (default: 50, max: 1000)
  offset?: number             // Pagination offset (default: 0)
}
```

**Returns**:
- Array of `SelectContextSession` objects (ordered by `startedAt DESC`)
- Empty array if no matches found

**Example Usage**:
```typescript
import { sessionQuery } from '@repo/mcp-tools/session-management/session-query'

// Query all sessions (default pagination: limit=50, offset=0)
const sessions = await sessionQuery()

// Query active sessions for a specific agent
const sessions = await sessionQuery({
  agentName: 'dev-execute-leader',
  activeOnly: true,
})

// Query all sessions for a story
const sessions = await sessionQuery({
  storyId: 'WINT-0110',
})

// Query with custom pagination
const sessions = await sessionQuery({
  limit: 100,
  offset: 50,
})

// Combine filters
const sessions = await sessionQuery({
  agentName: 'dev-execute-leader',
  storyId: 'WINT-0110',
  activeOnly: true,
  limit: 25,
  offset: 0,
})
```

**Error Handling**:
- Throws `ZodError` if input validation fails
- Returns empty array if no matches found
- Database errors are logged and re-thrown

**Query Behavior**:
- All filters are combined with AND logic
- Results ordered by `startedAt DESC` (most recent first)
- Default limit: 50 records
- Maximum limit: 1000 records
- Default offset: 0

---

### 5. `sessionCleanup`

Deletes old completed sessions (archives by deletion).

**Function Signature**:
```typescript
function sessionCleanup(input?: SessionCleanupInput): Promise<SessionCleanupResult>
```

**Input Schema**:
```typescript
{
  retentionDays?: number      // Retention period (default: 90, min: 1)
  dryRun?: boolean            // Safety flag (default: true)
}
```

**Output Schema**:
```typescript
{
  deletedCount: number        // Number of sessions deleted (or would delete)
  dryRun: boolean             // Whether this was a dry run
  cutoffDate: Date            // Calculated cutoff date
}
```

**Returns**:
- `SessionCleanupResult` object with count and metadata

**Example Usage**:
```typescript
import { sessionCleanup } from '@repo/mcp-tools/session-management/session-cleanup'

// Dry run (default - no deletion, just count)
const result = await sessionCleanup({
  retentionDays: 90,
})
console.log(`Would delete ${result.deletedCount} sessions`)
console.log(`Cutoff date: ${result.cutoffDate}`)

// Actual cleanup (MUST explicitly set dryRun=false)
const result = await sessionCleanup({
  retentionDays: 90,
  dryRun: false,  // REQUIRED for actual deletion
})
console.log(`Deleted ${result.deletedCount} sessions`)

// Custom retention period
const result = await sessionCleanup({
  retentionDays: 30,  // Delete sessions older than 30 days
  dryRun: false,
})
```

**Error Handling**:
- Throws `ZodError` if input validation fails (e.g., negative retentionDays)
- Database errors are logged and re-thrown

**Safety Mechanisms**:

1. **Default dryRun=true**: Must explicitly opt-in to deletion
2. **Active Session Protection**: Only deletes sessions with `endedAt IS NOT NULL`
3. **Retention Validation**: `retentionDays` must be positive integer
4. **Audit Trail**: Returns count and cutoff date for verification

**Business Rules**:
- Deletes only **completed** sessions (endedAt IS NOT NULL)
- Deletes sessions where `endedAt < (now - retentionDays)`
- **Active sessions are NEVER deleted** regardless of age
- Retention period is in days from current time

---

## Common Patterns

### Pattern 1: Full Session Lifecycle

```typescript
import { sessionCreate } from '@repo/mcp-tools/session-management/session-create'
import { sessionUpdate } from '@repo/mcp-tools/session-management/session-update'
import { sessionComplete } from '@repo/mcp-tools/session-management/session-complete'
import { sessionQuery } from '@repo/mcp-tools/session-management/session-query'

// 1. Create session
const session = await sessionCreate({
  agentName: 'dev-execute-leader',
  storyId: 'WINT-0110',
  phase: 'execute',
})

// 2. Update token metrics as work progresses (incremental)
await sessionUpdate({
  sessionId: session.sessionId,
  inputTokens: 1000,
  outputTokens: 500,
})

// 3. More updates accumulate
await sessionUpdate({
  sessionId: session.sessionId,
  inputTokens: 1500,  // Adds to previous 1000
  outputTokens: 700,  // Adds to previous 500
})

// 4. Complete session with final metrics
await sessionComplete({
  sessionId: session.sessionId,
  inputTokens: 3000,
  outputTokens: 1500,
  cachedTokens: 500,
})

// 5. Query completed sessions
const completedSessions = await sessionQuery({
  storyId: 'WINT-0110',
})
```

### Pattern 2: Concurrent Agent Tracking

```typescript
import { sessionCreate } from '@repo/mcp-tools/session-management/session-create'
import { sessionQuery } from '@repo/mcp-tools/session-management/session-query'

// Multiple agents working on different stories
await sessionCreate({
  agentName: 'dev-execute-leader',
  storyId: 'WINT-0110',
  phase: 'execute',
})

await sessionCreate({
  agentName: 'pm-story-elaboration-leader',
  storyId: 'WINT-0120',
  phase: 'plan',
})

// Query all active sessions
const activeSessions = await sessionQuery({
  activeOnly: true,
})

console.log(`${activeSessions.length} agents currently running`)
```

### Pattern 3: Token Accumulation (Incremental Updates)

```typescript
import { sessionUpdate } from '@repo/mcp-tools/session-management/session-update'

// Agent makes multiple LLM calls during execution
// Each call adds tokens to the session

// LLM Call 1
await sessionUpdate({
  sessionId: 'abc-123',
  inputTokens: 1000,
  outputTokens: 500,
})

// LLM Call 2
await sessionUpdate({
  sessionId: 'abc-123',
  inputTokens: 1500,
  outputTokens: 800,
})

// LLM Call 3
await sessionUpdate({
  sessionId: 'abc-123',
  inputTokens: 2000,
  outputTokens: 1200,
})

// Total tokens: 4500 input, 2500 output (accumulated)
```

### Pattern 4: Session Cleanup Workflow

```typescript
import { sessionCleanup } from '@repo/mcp-tools/session-management/session-cleanup'

// Step 1: Dry run to preview deletion
const preview = await sessionCleanup({
  retentionDays: 90,
  dryRun: true,  // Default
})

console.log(`Would delete ${preview.deletedCount} sessions`)
console.log(`Cutoff date: ${preview.cutoffDate}`)

// Step 2: Review and confirm

// Step 3: Execute actual cleanup
const result = await sessionCleanup({
  retentionDays: 90,
  dryRun: false,  // Explicit opt-in
})

console.log(`Deleted ${result.deletedCount} sessions`)
```

---

## Error Handling Reference

### Validation Errors (ZodError)

All tools use Zod schemas for input validation. Validation errors are thrown immediately:

```typescript
try {
  await sessionCreate({
    agentName: '', // Invalid: empty string
  })
} catch (error) {
  if (error instanceof ZodError) {
    console.error('Validation failed:', error.issues)
  }
}
```

### Business Logic Errors

Tools throw standard `Error` for business logic violations:

```typescript
try {
  await sessionUpdate({
    sessionId: 'non-existent',
    inputTokens: 100,
  })
} catch (error) {
  if (error instanceof Error) {
    console.error('Update failed:', error.message)
    // "Session 'non-existent' not found or already completed"
  }
}
```

### Database Errors (Resilient)

Database errors are logged via `@repo/logger` and handled gracefully:

- `sessionCreate`: Returns `null` on DB error
- `sessionUpdate`: Returns `null` on DB error
- `sessionComplete`: Returns `null` on DB error
- `sessionQuery`: Re-throws DB error
- `sessionCleanup`: Re-throws DB error

```typescript
const session = await sessionCreate({
  agentName: 'test-agent',
})

if (!session) {
  console.error('Session creation failed - check logs')
}
```

---

## Database Schema

The tools interact with `wint.contextSessions` table:

```sql
CREATE TABLE wint.context_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL,
  story_id TEXT,
  phase TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX context_sessions_session_id_idx ON wint.context_sessions(session_id);
CREATE INDEX context_sessions_agent_name_idx ON wint.context_sessions(agent_name);
CREATE INDEX context_sessions_story_id_idx ON wint.context_sessions(story_id);
CREATE INDEX context_sessions_started_at_idx ON wint.context_sessions(started_at);
CREATE INDEX context_sessions_agent_story_idx ON wint.context_sessions(agent_name, story_id);
```

---

## Testing

Test coverage: **≥80%** across 7 test suites:

1. `session-create.test.ts` - Unit tests for session creation
2. `session-update.test.ts` - Unit tests for incremental/absolute updates
3. `session-complete.test.ts` - Unit tests for session completion
4. `session-query.test.ts` - Unit tests for filtering and pagination
5. `session-cleanup.test.ts` - Unit tests for cleanup with dryRun
6. `schemas.test.ts` - Zod schema validation tests
7. `integration.test.ts` - Full lifecycle integration tests

Run tests:
```bash
pnpm test --filter @repo/mcp-tools
pnpm test:coverage --filter @repo/mcp-tools
```

---

## Future Enhancements

1. **MCP Server Integration** (WINT-2100): Expose tools via Model Context Protocol
2. **Session Context Management** (WINT-2090): Link sessions to context packs
3. **Session Analytics**: Aggregate token usage, duration metrics
4. **Session Tags**: Add metadata tags for categorization
5. **Session Notes**: Add free-form notes/annotations
6. **Batch Operations**: Bulk create/update/complete sessions

---

## Related Stories

- **WINT-0010**: Context Sessions schema definition
- **WINT-0110**: Session Management MCP Tools (this story)
- **WINT-2090**: Implement Session Context Management
- **WINT-2100**: Create session-manager Agent

---

## Architecture Decisions

### ARCH-001: Package Location
**Decision**: `packages/backend/mcp-tools/`
**Rationale**: New standalone package for MCP tool infrastructure. Separates from orchestrator and db packages for reusability.

### ARCH-002: Default Update Mode
**Decision**: `mode='incremental'` as default
**Rationale**: Safer default prevents accidental overwrites. Incremental mode uses SQL arithmetic for concurrent-safe updates.

### ARCH-003: Default Cleanup DryRun
**Decision**: `dryRun=true` as default
**Rationale**: High-severity safety mechanism. Requires explicit opt-in (dryRun=false) to prevent accidental data deletion.

### ARCH-004: Query Result Ordering
**Decision**: `ORDER BY started_at DESC` (most recent first)
**Rationale**: Aligns with typical use case of viewing recent sessions first. Matches WINT schema patterns.

### ARCH-005: Schema Reuse
**Decision**: Use auto-generated Drizzle Zod schemas from `@repo/db` for output types
**Rationale**: Reuses existing schema infrastructure. Input schemas need tool-specific validation (defaults, optionals) that differ from DB schema.

---

## Import Paths

**IMPORTANT**: This package uses **direct imports** (NO BARREL FILES per CLAUDE.md):

```typescript
// CORRECT - Import directly from source files
import { sessionCreate } from '@repo/mcp-tools/session-management/session-create'
import { sessionUpdate } from '@repo/mcp-tools/session-management/session-update'
import { sessionComplete } from '@repo/mcp-tools/session-management/session-complete'
import { sessionQuery } from '@repo/mcp-tools/session-management/session-query'
import { sessionCleanup } from '@repo/mcp-tools/session-management/session-cleanup'

// WRONG - Do not use barrel imports
import { sessionCreate } from '@repo/mcp-tools/session-management' // ❌ Not supported
import { sessionCreate } from '@repo/mcp-tools' // ❌ Not supported
```

---

## Support

For questions or issues:
1. Check this documentation
2. Review test files in `__tests__/` for usage examples
3. Check story artifacts in `/plans/future/platform/in-progress/WINT-0110/`
4. Review WINT schema definition: `packages/backend/database-schema/src/schema/wint.ts`

---

**Last Updated**: 2026-02-15
**Maintainer**: WINT Platform Team
