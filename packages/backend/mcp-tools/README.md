# MCP Tools (@repo/mcp-tools)

MCP (Model Context Protocol) tools for workflow operations in the LEGO MOC Instructions platform.

## Overview

This package provides database-backed MCP tools for managing workflow state, stories, sessions, and worktrees.

## Tools

### Session Management Tools (WINT-0110)

Database-driven session tracking for workflow coordination.

**Tools:**
- `sessionCreate` - Create new workflow session
- `sessionUpdate` - Update session state
- `sessionQuery` - Query session by ID
- `sessionComplete` - Mark session as complete

### Story Management Tools (WINT-0090)

Story lifecycle management with database persistence.

**Tools:**
- `storyGetStatus` - Get current story status
- `storyUpdateStatus` - Update story state
- `storyGetByStatus` - List stories by status

### Context Cache Tools (WINT-0100)

Cache management for workflow context.

**Tools:**
- `contextCacheGet` - Retrieve cached context
- `contextCachePut` - Store context in cache
- `contextCacheInvalidate` - Invalidate cached entries
- `contextCacheStats` - Get cache statistics

### Graph Query Tools (WINT-0130)

Query relationships and dependencies in the knowledge graph.

**Tools:**
- `graphQuery` - Execute graph queries
- `graphGetRelated` - Get related entities

### Worktree Management Tools (WINT-1130)

Database-driven coordination of parallel worktree-based development.

**Tools:**
- `worktreeRegister` - Register new worktree for a story
- `worktreeGetByStory` - Get active worktree for a story
- `worktreeListActive` - List all active worktrees with pagination
- `worktreeMarkComplete` - Mark worktree as merged/abandoned

**Schema:**
- Table: `wint.worktrees`
- Enum: `wint.worktree_status` (active, merged, abandoned)
- FK: `story_id` references `wint.stories(id)` ON DELETE CASCADE
- Unique Constraint: Partial unique index prevents concurrent active worktrees per story

**Usage:**

```typescript
import {
  worktreeRegister,
  worktreeGetByStory,
  worktreeListActive,
  worktreeMarkComplete,
} from '@repo/mcp-tools'

// Register new worktree
const worktree = await worktreeRegister({
  storyId: 'WINT-1130',
  worktreePath: '/Users/dev/monorepo-wt-WINT-1130',
  branchName: 'feature/WINT-1130',
})

// Check if story already has active worktree
const existing = await worktreeGetByStory({ storyId: 'WINT-1130' })
if (existing) {
  console.log('Story already has active worktree:', existing.worktreePath)
}

// List all active worktrees
const active = await worktreeListActive({ limit: 100 })

// Mark worktree as merged
await worktreeMarkComplete({
  worktreeId: worktree.id,
  status: 'merged',
  metadata: { prNumber: 123 },
})
```

**Error Handling:**

All tools follow resilient error handling pattern:
- Return `null` on error (never throw)
- Log warnings with `[mcp-tools]` prefix
- FK constraint violations return `null`
- Unique constraint violations return `null`
- Not found scenarios return `null` (no warning)

## Installation

```bash
pnpm add @repo/mcp-tools
```

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific module
pnpm test worktree-management

# Run with coverage
pnpm test:coverage
```

### Building

```bash
pnpm build
```

### Type Checking

```bash
pnpm check-types
```

## Architecture

### Design Principles

1. **Zod-First Types**: All types are Zod schemas with `z.infer<>` (no TypeScript interfaces)
2. **Resilient Error Handling**: Tools return `null` on errors, never throw to callers
3. **Fail-Fast Validation**: Zod validation at entry point throws for invalid inputs
4. **Dual ID Support**: Tools accept both UUID and human-readable story IDs
5. **Pagination**: List operations default to 50 items, max 1000

### Directory Structure

```
src/
  worktree-management/
    index.ts                      # Barrel file
    worktree-register.ts          # Tool implementation
    worktree-get-by-story.ts      # Tool implementation
    worktree-list-active.ts       # Tool implementation
    worktree-mark-complete.ts     # Tool implementation
    __types__/
      index.ts                    # Zod schemas
    __tests__/
      worktree-register.test.ts   # Unit tests
      worktree-get-by-story.test.ts
      worktree-list-active.test.ts
      worktree-mark-complete.test.ts
      integration.test.ts         # Integration tests
```

## Dependencies

- `@repo/db` - Database client
- `@repo/logger` - Logging utility
- `@repo/database-schema` - Database schema definitions
- `drizzle-orm` - ORM for database queries
- `zod` - Schema validation

## License

Private - Internal use only
