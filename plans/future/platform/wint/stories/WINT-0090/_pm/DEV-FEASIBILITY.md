# Dev Feasibility Review: WINT-0090

**Story:** WINT-0090 - Create Story Management MCP Tools
**Reviewer:** PM Dev Feasibility Agent
**Date:** 2026-02-15
**Verdict:** FEASIBLE with LOW-MEDIUM complexity

---

## Executive Summary

**Feasibility:** ✅ FEASIBLE

This story follows the proven WINT-0110 session management MCP tools pattern. The implementation is straightforward with clear reuse opportunities. Technical risks are manageable with well-defined mitigation strategies.

**Estimated Complexity:** LOW-MEDIUM
- Similar scope to WINT-0110 (5 functions, Zod schemas, comprehensive tests)
- Slightly simpler than session management (fewer concurrent access concerns)
- Well-defined patterns and reusable components available

**Estimated Effort:** 4-6 hours
- 1.5 hours: Zod schemas + type definitions
- 2 hours: MCP tool implementations (4 functions)
- 1.5 hours: Test suite (schema, unit, integration)
- 1 hour: Documentation (JSDoc + README)

---

## Implementation Approach

### Phase 1: Type Definitions (1.5 hours)

**Location:** `packages/backend/mcp-tools/src/story-management/__types__/index.ts`

**Zod Schemas:**

```typescript
import { z } from 'zod'

// Story ID can be UUID or human-readable format (WINT-0090, INFR-0050, etc.)
const StoryIdSchema = z.union([
  z.string().uuid(),
  z.string().regex(/^[A-Z]{4}-\d{4}$/),
])

export const StoryGetStatusInputSchema = z.object({
  storyId: StoryIdSchema,
})

export const StoryUpdateStatusInputSchema = z.object({
  storyId: StoryIdSchema,
  newStatus: z.enum([
    'backlog',
    'ready_to_work',
    'elaboration',
    'in_progress',
    'ready_for_qa',
    'done',
  ]),
  metadata: z.record(z.string(), z.any()).default({}),
  allowBackwardTransition: z.boolean().default(false),
})

export const StoryGetByStatusInputSchema = z.object({
  status: z.enum([
    'backlog',
    'ready_to_work',
    'elaboration',
    'in_progress',
    'ready_for_qa',
    'done',
  ]),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
})

export const StoryGetByFeatureInputSchema = z.object({
  feature: z.string().min(1),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
})

// Inferred TypeScript types
export type StoryGetStatusInput = z.infer<typeof StoryGetStatusInputSchema>
export type StoryUpdateStatusInput = z.infer<typeof StoryUpdateStatusInputSchema>
export type StoryGetByStatusInput = z.infer<typeof StoryGetByStatusInputSchema>
export type StoryGetByFeatureInput = z.infer<typeof StoryGetByFeatureInputSchema>
```

**Reuse Pattern:** Directly copy WINT-0110 session schema structure, adapt field names.

---

### Phase 2: MCP Tool Implementations (2 hours)

#### 2.1: story_get_status.ts

**Location:** `packages/backend/mcp-tools/src/story-management/story-get-status.ts`

**Implementation:**

```typescript
import { eq, or } from 'drizzle-orm'
import { getPool } from '@repo/db'
import { stories, storyStates } from '@repo/db/schema'
import { logger } from '@repo/logger'
import { StoryGetStatusInputSchema, type StoryGetStatusInput } from './__types__'

/**
 * Get current status and metadata for a single story
 *
 * @param input - Story ID (UUID or human-readable like WINT-0090)
 * @returns Story data with current state, or null if not found
 *
 * @example
 * const story = await storyGetStatus({ storyId: 'WINT-0090' })
 * if (story) {
 *   console.log(`Story ${story.storyId} is in ${story.state}`)
 * }
 */
export async function storyGetStatus(input: StoryGetStatusInput) {
  try {
    // Validate input
    const validated = StoryGetStatusInputSchema.parse(input)

    // Get database connection
    const db = getPool()

    // Query story by UUID or human-readable ID
    const [story] = await db
      .select()
      .from(stories)
      .where(
        or(
          eq(stories.id, validated.storyId),
          eq(stories.storyId, validated.storyId)
        )
      )
      .limit(1)

    if (!story) {
      return null
    }

    return story
  } catch (error) {
    logger.warn('Failed to get story status', { storyId: input.storyId, error })
    return null
  }
}
```

**Key Points:**
- Handles both UUID (database PK) and human-readable ID (WINT-0090)
- Graceful degradation: returns null, never throws
- Uses Drizzle ORM type-safe builders (no raw SQL)

---

#### 2.2: story_update_status.ts

**Location:** `packages/backend/mcp-tools/src/story-management/story-update-status.ts`

**Implementation:**

```typescript
import { eq } from 'drizzle-orm'
import { getPool } from '@repo/db'
import { stories, storyStates } from '@repo/db/schema'
import { logger } from '@repo/logger'
import { StoryUpdateStatusInputSchema, type StoryUpdateStatusInput } from './__types__'

/**
 * Update story state with transition tracking
 *
 * @param input - Story ID, new status, optional metadata
 * @returns Updated story data, or null on failure
 *
 * @example
 * const updated = await storyUpdateStatus({
 *   storyId: 'WINT-0090',
 *   newStatus: 'in_progress',
 *   metadata: { assignee: 'dev-agent' }
 * })
 */
export async function storyUpdateStatus(input: StoryUpdateStatusInput) {
  try {
    const validated = StoryUpdateStatusInputSchema.parse(input)
    const db = getPool()

    // Use transaction for atomicity
    return await db.transaction(async (tx) => {
      // Update story state
      const [updated] = await tx
        .update(stories)
        .set({
          state: validated.newStatus,
          metadata: validated.metadata,
          updatedAt: new Date(),
        })
        .where(eq(stories.storyId, validated.storyId))
        .returning()

      if (!updated) {
        throw new Error('Story not found')
      }

      // Create state transition record
      await tx.insert(storyStates).values({
        storyId: updated.id,
        state: validated.newStatus,
        metadata: validated.metadata,
        timestamp: new Date(),
      })

      return updated
    })
  } catch (error) {
    logger.warn('Failed to update story status', { input, error })
    return null
  }
}
```

**Key Points:**
- Database transaction ensures atomicity (update + insert together)
- Creates storyStates record for transition history
- Logs errors but returns null (graceful degradation)

---

#### 2.3: story_get_by_status.ts

**Location:** `packages/backend/mcp-tools/src/story-management/story-get-by-status.ts`

**Implementation:**

```typescript
import { eq, desc, asc } from 'drizzle-orm'
import { getPool } from '@repo/db'
import { stories } from '@repo/db/schema'
import { logger } from '@repo/logger'
import { StoryGetByStatusInputSchema, type StoryGetByStatusInput } from './__types__'

/**
 * Query stories filtered by current status with pagination
 *
 * @param input - Status enum, limit (max 1000), offset
 * @returns Array of story data ordered by priority DESC, createdAt ASC
 *
 * @example
 * const backlogStories = await storyGetByStatus({
 *   status: 'backlog',
 *   limit: 20,
 *   offset: 0
 * })
 */
export async function storyGetByStatus(input: StoryGetByStatusInput) {
  try {
    const validated = StoryGetByStatusInputSchema.parse(input)
    const db = getPool()

    const results = await db
      .select()
      .from(stories)
      .where(eq(stories.state, validated.status))
      .orderBy(desc(stories.priority), asc(stories.createdAt))
      .limit(validated.limit)
      .offset(validated.offset)

    return results
  } catch (error) {
    logger.warn('Failed to query stories by status', { input, error })
    return []
  }
}
```

---

#### 2.4: story_get_by_feature.ts

**Location:** `packages/backend/mcp-tools/src/story-management/story-get-by-feature.ts`

**Implementation:**

```typescript
import { eq, desc, asc } from 'drizzle-orm'
import { getPool } from '@repo/db'
import { stories } from '@repo/db/schema'
import { logger } from '@repo/logger'
import { StoryGetByFeatureInputSchema, type StoryGetByFeatureInput } from './__types__'

/**
 * Query stories filtered by epic/feature with pagination
 *
 * @param input - Feature name, limit, offset
 * @returns Array of story data ordered by priority DESC, wave ASC, createdAt ASC
 *
 * @example
 * const wintStories = await storyGetByFeature({ feature: 'wint', limit: 50 })
 */
export async function storyGetByFeature(input: StoryGetByFeatureInput) {
  try {
    const validated = StoryGetByFeatureInputSchema.parse(input)
    const db = getPool()

    const results = await db
      .select()
      .from(stories)
      .where(eq(stories.epic, validated.feature))
      .orderBy(desc(stories.priority), asc(stories.wave), asc(stories.createdAt))
      .limit(validated.limit)
      .offset(validated.offset)

    return results
  } catch (error) {
    logger.warn('Failed to query stories by feature', { input, error })
    return []
  }
}
```

---

### Phase 3: Testing (1.5 hours)

**Location:** `packages/backend/mcp-tools/src/story-management/__tests__/`

**Test Files:**
1. `schema-validation.test.ts` - All Zod schema edge cases
2. `story-management-tools.test.ts` - Function unit tests
3. `integration.test.ts` - Database round-trips
4. `error-handling.test.ts` - Graceful degradation

**Reuse Pattern:** Copy WINT-0110 test structure, adapt for story domain.

**Coverage Target:** ≥80% (infrastructure story standard)

---

### Phase 4: Documentation (1 hour)

**JSDoc:** Already included in function implementations above.

**README.md:**

```markdown
# Story Management MCP Tools

MCP tools for querying and updating story status in the wint database.

## Tools

- `story_get_status(storyId)` - Get current status for a story
- `story_update_status(storyId, newStatus, metadata?)` - Update story state
- `story_get_by_status(status, limit?, offset?)` - Query stories by current state
- `story_get_by_feature(feature, limit?, offset?)` - Query stories by epic/feature

## Usage

See JSDoc comments in each file for detailed examples.

## Testing

```bash
pnpm --filter @repo/mcp-tools test
```

## Dependencies

- WINT-0020 (Story Management Tables) - REQUIRED
- @repo/db - Database connection pooling
- @repo/logger - Structured logging
- drizzle-orm - Type-safe ORM
- zod - Schema validation
```

---

## Technical Risks & Mitigation

### Risk 1: Story ID Format Handling (LOW)

**Risk:** Need to support both UUID (database PK) and human-readable ID (WINT-0090)

**Mitigation:**
- Use `or()` condition in Drizzle queries to check both columns
- Zod schema validates both formats with union type
- Test suite covers both ID formats explicitly

**Likelihood:** N/A (design decision, not a risk)
**Impact:** Low (pattern well-understood)

---

### Risk 2: State Transition Validation Complexity (LOW)

**Risk:** Story suggests validating state transitions (no backward moves), but seed recommends keeping simple for MVP

**Mitigation:**
- Implement basic validation: check `allowBackwardTransition` flag
- Defer full FSM state machine to future story (as seed suggests)
- For MVP: allow any transition if flag is true, warn otherwise

**Likelihood:** Low (explicitly deferred in seed)
**Impact:** Low (can enhance in future)

---

### Risk 3: Concurrent Update Safety (MEDIUM)

**Risk:** Multiple agents may update same story status concurrently

**Mitigation:**
- Use database transactions for atomicity (update + insert storyStates)
- Drizzle ORM handles transaction isolation automatically
- Integration tests verify concurrent update safety

**Likelihood:** Medium (multi-agent workflows are common)
**Impact:** Medium (data integrity critical)
**Status:** MITIGATED (transaction pattern from WINT-0110)

---

### Risk 4: Pagination Performance (LOW)

**Risk:** Large result sets could be slow without proper indexing

**Mitigation:**
- Check WINT-0020 migration for indexes on `state` and `epic` columns
- If missing, add indexes in follow-up migration
- Limit max results to 1000 per query

**Likelihood:** Low (story count is manageable)
**Impact:** Low (performance degradation, not failure)

---

## Dependencies

### Required (Blocking)

- **WINT-0020** - Story Management Tables (stories, storyStates)
  - Status: Pending (must complete before WINT-0090)
  - Tables: `wint.stories`, `wint.storyStates`
  - Columns needed: id, storyId, state, epic, priority, wave, createdAt, updatedAt, metadata

### Optional (Non-Blocking)

- **postgres-knowledgebase MCP server** - Already exists and running
- **@repo/db** - Database connection pooling (active)
- **Drizzle ORM v0.44.3** - Type-safe ORM (active)

---

## Reuse Opportunities

### Direct Reuse (100%)

1. **WINT-0110 MCP tool structure**
   - Directory layout: `__types__/`, `__tests__/`, individual function files
   - Zod schema validation pattern
   - Error handling with @repo/logger
   - Test suite structure (120 tests, 100% passing)

2. **Drizzle ORM patterns**
   - Type-safe query builders (eq, or, and, desc, asc)
   - Transaction handling for atomic operations
   - Connection pooling via @repo/db.getPool()

3. **Testing patterns**
   - vi.hoisted() mock strategy
   - Schema validation tests
   - Integration tests with test database
   - Edge case coverage

### Adaptation Needed (20%)

1. **Query patterns** - Adapt session queries to story queries (different table, columns)
2. **Schema enums** - Use story state enum instead of session state enum
3. **Ordering logic** - priority/wave ordering (different from session ordering)

---

## Estimated Timeline

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Zod schemas + types | 1.5 |
| 2 | story_get_status implementation | 0.5 |
| 2 | story_update_status implementation | 0.5 |
| 2 | story_get_by_status implementation | 0.5 |
| 2 | story_get_by_feature implementation | 0.5 |
| 3 | Schema validation tests | 0.5 |
| 3 | Function unit tests | 0.5 |
| 3 | Integration tests | 0.5 |
| 4 | JSDoc + README | 1.0 |
| **Total** | | **6.0 hours** |

**Confidence:** HIGH (similar to WINT-0110 which took ~5 hours)

---

## Acceptance Criteria Feasibility

All 10 acceptance criteria are feasible with existing patterns:

- ✅ **AC-1 (story_get_status)** - Straightforward SELECT query with dual ID support
- ✅ **AC-2 (story_update_status)** - Transaction pattern from WINT-0110
- ✅ **AC-3 (story_get_by_status)** - Simple WHERE + ORDER BY + pagination
- ✅ **AC-4 (story_get_by_feature)** - Same as AC-3, different WHERE clause
- ✅ **AC-5 (Zod schemas)** - Proven pattern from WINT-0110
- ✅ **AC-6 (Tests ≥80%)** - Reuse WINT-0110 test structure
- ✅ **AC-7 (JSDoc)** - Standard practice, examples included in Phase 4
- ✅ **AC-8 (Error handling)** - Try-catch with @repo/logger, graceful null/empty returns
- ✅ **AC-9 (Drizzle ORM)** - All queries use type-safe builders
- ✅ **AC-10 (@repo/logger)** - No console.log, structured logging

---

## Recommendations

1. **Start with schema definitions** - Get Zod schemas + types validated early
2. **Implement in order:** get_status → get_by_status → get_by_feature → update_status
   - Simplest to most complex
   - update_status uses transactions, test last
3. **Test coverage first** - Write schema validation tests before implementation
4. **Check WINT-0020 indexes** - Verify `state` and `epic` columns are indexed
5. **Defer FSM validation** - Keep state transitions simple for MVP, enhance later

---

## Non-Goals (Deferred)

Per seed recommendations, these are explicitly out of scope:

- ❌ MCP server registration/deployment (assumes existing server)
- ❌ Story creation tools (only read/update, not create)
- ❌ Complex workflow FSM validation (basic transitions only)
- ❌ Story deletion or archival
- ❌ Story dependency management (storyDependencies table)
- ❌ Story artifact synchronization (filesystem sync)
- ❌ LangGraph integration (MCP tools only)
- ❌ Real-time change notifications
- ❌ Batch story operations

---

## Verdict

**✅ FEASIBLE** with LOW-MEDIUM complexity

This story is well-scoped, has clear reuse patterns from WINT-0110, and all acceptance criteria are achievable with existing technology. Estimated 6 hours of focused work with high confidence.

**Recommendation:** APPROVE for implementation
