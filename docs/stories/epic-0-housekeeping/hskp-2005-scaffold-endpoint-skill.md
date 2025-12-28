# Story HSKP-2005: Scaffold Endpoint Skill

## Status

Draft

## Story

**As a** developer,
**I want** to describe an endpoint in natural language and have Claude generate the complete implementation,
**so that** I can add new API endpoints in minutes instead of hours.

## Epic Context

This story creates the `/scaffold-endpoint` skill that generates complete Lambda endpoints from natural language descriptions. It uses the Drizzle and Serverless MCP servers for context.

## Priority

P0 - Primary developer productivity tool

## Estimated Effort

2-3 days

## Dependencies

- HSKP-2002: MCP Server Infrastructure
- HSKP-2003: Drizzle MCP Server
- HSKP-2004: Serverless MCP Server

## Acceptance Criteria

1. `/scaffold-endpoint` skill parses natural language to identify HTTP method, resource, and operation
2. Queries Drizzle MCP server for relevant table schema
3. Generates Lambda handler following existing project patterns
4. Generates Zod request/response schemas
5. Generates test file with valid fixtures
6. Adds entry to serverless.yml
7. Generates RTK Query hook for frontend
8. Validates generated code passes `pnpm check-types` and `pnpm lint`
9. Presents diff for approval before applying changes

## Tasks / Subtasks

- [ ] **Task 1: Create Skill Structure** (AC: 1)
  - [ ] Create `.claude/skills/scaffold-endpoint/` directory
  - [ ] Create `SKILL.md` with skill definition
  - [ ] Create `examples.md` with usage examples
  - [ ] Define input parsing rules

- [ ] **Task 2: Implement Intent Parser** (AC: 1)
  - [ ] Parse natural language description
  - [ ] Identify HTTP method (GET, POST, PUT, DELETE, PATCH)
  - [ ] Identify resource/table from description
  - [ ] Identify operation type (list, get, create, update, delete, custom)
  - [ ] Extract additional context (filters, fields, etc.)

- [ ] **Task 3: Integrate MCP Context** (AC: 2)
  - [ ] Query Drizzle MCP for table schema
  - [ ] Query Serverless MCP for existing endpoint patterns
  - [ ] Identify related endpoints for pattern matching
  - [ ] Cache context for skill session

- [ ] **Task 4: Generate Handler Code** (AC: 3)
  - [ ] Create handler template following project patterns
  - [ ] Use @repo/api-handlers pattern (if HSKP-2000 complete)
  - [ ] Include authentication via getUserId
  - [ ] Include proper error handling
  - [ ] Include observability logging

- [ ] **Task 5: Generate Zod Schemas** (AC: 4)
  - [ ] Generate request schema from operation
  - [ ] Generate response schema from table + operation
  - [ ] Include pagination for list operations
  - [ ] Include validation constraints

- [ ] **Task 6: Generate Tests** (AC: 5)
  - [ ] Create test file with proper imports
  - [ ] Generate valid test fixtures from Zod schemas
  - [ ] Include positive test cases
  - [ ] Include negative test cases (validation, auth, 404)
  - [ ] Include edge cases

- [ ] **Task 7: Generate Serverless Entry** (AC: 6)
  - [ ] Create serverless.yml function entry
  - [ ] Use correct path pattern
  - [ ] Include authorizer configuration
  - [ ] Include appropriate IAM permissions

- [ ] **Task 8: Generate RTK Query Hook** (AC: 7)
  - [ ] Add endpoint to appropriate API slice
  - [ ] Generate proper TypeScript types
  - [ ] Include query/mutation configuration
  - [ ] Include tag invalidation for mutations

- [ ] **Task 9: Validation Step** (AC: 8)
  - [ ] Run `pnpm check-types` on generated files
  - [ ] Run `pnpm lint` on generated files
  - [ ] Report any issues before presenting diff
  - [ ] Suggest fixes if validation fails

- [ ] **Task 10: Diff Presentation** (AC: 9)
  - [ ] Show all files to be created/modified
  - [ ] Show line counts and change summary
  - [ ] Provide "View Diff" option for each file
  - [ ] Provide "Apply Changes" confirmation
  - [ ] Provide "Modify Request" option

## Dev Notes

### Skill Definition

```markdown
<!-- .claude/skills/scaffold-endpoint/SKILL.md -->
# /scaffold-endpoint

Generate a complete Lambda endpoint from a natural language description.

## Usage

```
/scaffold-endpoint "list all wishlist items for current user"
/scaffold-endpoint "bulk delete wishlist items by IDs"
/scaffold-endpoint "update wishlist item priority"
/scaffold-endpoint "get MOC details with file URLs"
```

## What Gets Generated

1. Lambda handler with business logic
2. Zod request/response schemas
3. Test file with fixtures
4. serverless.yml entry
5. RTK Query hook

## Process

1. Parse description to identify operation
2. Query Drizzle MCP for table schema
3. Query Serverless MCP for existing patterns
4. Generate all files following project conventions
5. Validate generated code compiles
6. Present diff for approval
```

### Intent Parsing

```typescript
interface ParsedIntent {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  resource: string          // e.g., 'wishlistItems'
  operation: string         // e.g., 'list', 'bulkDelete', 'updatePriority'
  isBulk: boolean
  filters?: string[]        // e.g., ['userId', 'status']
  fieldsToUpdate?: string[] // for update operations
}

// Examples:
// "list all wishlist items" -> GET, wishlistItems, list
// "bulk delete wishlist items by IDs" -> DELETE, wishlistItems, bulkDelete, isBulk
// "update wishlist item priority" -> PATCH, wishlistItems, updatePriority
// "create new MOC" -> POST, mocInstructions, create
```

### Handler Generation Template

```typescript
// Generated handler example
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { z } from 'zod'
import { db } from '@repo/db'
import { wishlistItems } from '@repo/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getUserIdFromEvent, response200, response400, response404 } from '../_shared/utils'
import { logger } from '@repo/logger'

const RequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

const ResponseSchema = z.object({
  deleted: z.number(),
})

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = getUserIdFromEvent(event)
  if (!userId) {
    return response401()
  }

  logger.info('Bulk delete wishlist items', { userId, count: event.body?.length })

  try {
    const body = JSON.parse(event.body || '{}')
    const validated = RequestSchema.parse(body)

    // Verify ownership
    const items = await db
      .select({ id: wishlistItems.id })
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.userId, userId),
          inArray(wishlistItems.id, validated.ids)
        )
      )

    if (items.length !== validated.ids.length) {
      return response404('Some items not found or not owned by user')
    }

    // Delete items
    await db
      .delete(wishlistItems)
      .where(inArray(wishlistItems.id, validated.ids))

    logger.info('Bulk delete completed', { userId, deleted: items.length })

    return response200({ deleted: items.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response400(error.errors)
    }
    throw error
  }
}
```

### Test Generation Template

```typescript
// Generated test example
import { handler } from '../handler'
import { db } from '@repo/db'
import { wishlistItems } from '@repo/db/schema'
import { createMockEvent, createTestUser } from '../../../_test-utils'

describe('Bulk Delete Wishlist Items', () => {
  const testUser = createTestUser()

  beforeEach(async () => {
    // Create test items
    await db.insert(wishlistItems).values([
      { id: 'item-1', userId: testUser.id, title: 'Test 1', ... },
      { id: 'item-2', userId: testUser.id, title: 'Test 2', ... },
    ])
  })

  afterEach(async () => {
    await db.delete(wishlistItems).where(eq(wishlistItems.userId, testUser.id))
  })

  describe('Authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      const event = createMockEvent({ body: { ids: ['item-1'] } })
      const result = await handler(event)
      expect(result.statusCode).toBe(401)
    })
  })

  describe('Validation', () => {
    it('returns 400 for empty ids array', async () => {
      const event = createMockEvent({
        userId: testUser.id,
        body: { ids: [] }
      })
      const result = await handler(event)
      expect(result.statusCode).toBe(400)
    })

    it('returns 400 for invalid UUID', async () => {
      const event = createMockEvent({
        userId: testUser.id,
        body: { ids: ['not-a-uuid'] }
      })
      const result = await handler(event)
      expect(result.statusCode).toBe(400)
    })
  })

  describe('Authorization', () => {
    it('returns 404 for items owned by other user', async () => {
      const event = createMockEvent({
        userId: 'other-user',
        body: { ids: ['item-1'] }
      })
      const result = await handler(event)
      expect(result.statusCode).toBe(404)
    })
  })

  describe('Happy Path', () => {
    it('deletes items and returns count', async () => {
      const event = createMockEvent({
        userId: testUser.id,
        body: { ids: ['item-1', 'item-2'] }
      })
      const result = await handler(event)
      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({ deleted: 2 })

      // Verify deleted
      const remaining = await db
        .select()
        .from(wishlistItems)
        .where(eq(wishlistItems.userId, testUser.id))
      expect(remaining).toHaveLength(0)
    })
  })
})
```

### RTK Query Generation

```typescript
// Added to wishlist-api.ts
bulkDeleteItems: builder.mutation<
  { deleted: number },
  { ids: string[] }
>({
  query: ({ ids }) => ({
    url: '/wishlist/bulk-delete',
    method: 'DELETE',
    body: { ids },
  }),
  invalidatesTags: ['WishlistItems'],
}),
```

### Serverless Entry Generation

```yaml
# Added to serverless.yml
wishlistBulkDelete:
  handler: endpoints/wishlist/bulk-delete/handler.handler
  events:
    - http:
        path: /wishlist/bulk-delete
        method: delete
        authorizer:
          type: COGNITO_USER_POOLS
          authorizerId: ${self:custom.authorizer}
```

### Output Format

```
/scaffold-endpoint "bulk delete wishlist items by IDs"

Analyzing request...
 - Found wishlistItems table (12 columns)
 - Identified bulk DELETE operation
 - Detected authentication pattern from existing endpoints

Proposed changes:

CREATE  endpoints/wishlist/bulk-delete/handler.ts
CREATE  endpoints/wishlist/bulk-delete/__tests__/handler.test.ts
MODIFY  apps/api/serverless.yml (+8 lines)
MODIFY  packages/core/api-client/src/rtk/wishlist-api.ts (+12 lines)

Validation:
 - TypeScript: OK
 - ESLint: OK

[View Diff] [Apply Changes] [Modify Request] [Cancel]
```

## Testing

### Test Location
- Skill testing is manual via Claude Code

### Test Requirements
- Functional: Parses various natural language descriptions correctly
- Functional: Generated handler compiles
- Functional: Generated tests pass
- Functional: serverless.yml entry is valid YAML
- Functional: RTK Query hook is correct TypeScript
- UX: Diff presentation is clear and actionable

### Test Scenarios

```bash
# Test various operations
/scaffold-endpoint "list all MOCs for current user"
/scaffold-endpoint "get single wishlist item by ID"
/scaffold-endpoint "create new gallery image"
/scaffold-endpoint "update MOC title and description"
/scaffold-endpoint "delete gallery image"
/scaffold-endpoint "bulk update wishlist priorities"
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Generated code doesn't match patterns | Medium | High | Use MCP context extensively |
| Natural language parsing fails | Medium | Medium | Provide examples, ask clarifying questions |
| Validation misses issues | Low | Medium | Run actual pnpm commands |
| Too many files overwhelm user | Low | Low | Clear summary, expandable diffs |

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft from AI Developer Automation PRD | SM Agent |
