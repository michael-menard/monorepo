# Story HSKP-2006: Scaffold Feature Skill

## Status

Draft

## Story

**As a** developer,
**I want** to describe a feature and have Claude generate the complete vertical slice,
**so that** I can implement new features with API, UI, and tests in a single command.

## Epic Context

This story creates the `/scaffold-feature` skill that generates complete feature implementations including API endpoints, UI components, shared types, and tests. It builds upon the scaffold-endpoint skill (HSKP-2005).

## Priority

P0 - Highest-value automation tool

## Estimated Effort

3-4 days

## Dependencies

- HSKP-2002: MCP Server Infrastructure
- HSKP-2003: Drizzle MCP Server
- HSKP-2004: Serverless MCP Server
- HSKP-2005: Scaffold Endpoint Skill (can be developed in parallel but shares patterns)

## Acceptance Criteria

1. `/scaffold-feature` skill accepts feature description and generates complete vertical slice
2. Generates API endpoints (CRUD or custom as specified)
3. Generates UI components in appropriate app (main-app, app-dashboard, etc.)
4. Generates shared types using Zod schemas
5. Generates tests for all layers (API, UI components)
6. Wires up RTK Query hooks
7. Updates routing if new pages are needed
8. Provides implementation order guidance for generated files
9. Validates all generated code passes lint/types before presenting
10. Integrates with MCP servers for accurate context

## Tasks / Subtasks

- [ ] **Task 1: Create Skill Structure** (AC: 1)
  - [ ] Create `.claude/skills/scaffold-feature/` directory
  - [ ] Create `SKILL.md` with skill definition
  - [ ] Create `examples.md` with usage examples
  - [ ] Define feature decomposition rules

- [ ] **Task 2: Implement Feature Analyzer** (AC: 1, 10)
  - [ ] Parse natural language feature description
  - [ ] Identify required API endpoints
  - [ ] Identify required UI components
  - [ ] Identify shared types needed
  - [ ] Query MCP servers for existing patterns

- [ ] **Task 3: Generate API Layer** (AC: 2)
  - [ ] Determine CRUD operations needed
  - [ ] Generate handlers using scaffold-endpoint patterns
  - [ ] Generate Zod schemas for each endpoint
  - [ ] Generate serverless.yml entries
  - [ ] Ensure consistent naming

- [ ] **Task 4: Generate Shared Types** (AC: 4)
  - [ ] Create types package structure if needed
  - [ ] Generate Zod schemas for domain entities
  - [ ] Generate derived TypeScript types
  - [ ] Ensure types are imported correctly

- [ ] **Task 5: Generate UI Components** (AC: 3)
  - [ ] Identify target app (main-app, etc.)
  - [ ] Generate component directory structure
  - [ ] Generate component files following project patterns
  - [ ] Use @repo/ui primitives correctly
  - [ ] Include proper TypeScript props

- [ ] **Task 6: Generate RTK Integration** (AC: 6)
  - [ ] Add API endpoints to RTK slice
  - [ ] Generate hooks with proper types
  - [ ] Configure cache invalidation
  - [ ] Add optimistic updates where appropriate

- [ ] **Task 7: Generate Routing** (AC: 7)
  - [ ] Determine if new routes needed
  - [ ] Add route definitions
  - [ ] Add lazy-loaded page components
  - [ ] Update navigation if needed

- [ ] **Task 8: Generate Tests** (AC: 5)
  - [ ] Generate API endpoint tests
  - [ ] Generate component tests with React Testing Library
  - [ ] Generate integration test scenarios
  - [ ] Include accessibility tests

- [ ] **Task 9: Implementation Order** (AC: 8)
  - [ ] Analyze dependencies between generated files
  - [ ] Create ordered implementation list
  - [ ] Include verification steps
  - [ ] Suggest commit points

- [ ] **Task 10: Validation and Presentation** (AC: 9)
  - [ ] Run `pnpm check-types` on generated files
  - [ ] Run `pnpm lint` on generated files
  - [ ] Present summary with file counts
  - [ ] Provide diff view for each file
  - [ ] Include implementation order

## Dev Notes

### Skill Definition

```markdown
<!-- .claude/skills/scaffold-feature/SKILL.md -->
# /scaffold-feature

Generate a complete feature implementation from a description.

## Usage

```
/scaffold-feature "wishlist priority sorting with drag-drop reorder"
/scaffold-feature "inspiration album management"
/scaffold-feature "MOC soft delete with restore capability"
/scaffold-feature "user preferences with theme selection"
```

## What Gets Generated

### API Layer
- Lambda handlers for all operations
- Zod request/response schemas
- serverless.yml entries
- Handler tests

### Frontend Layer
- React components (pages, cards, modals)
- RTK Query hooks
- Route definitions
- Component tests

### Shared
- Zod schemas for domain types
- TypeScript type exports

## Process

1. Analyze feature description
2. Query MCP servers for context
3. Determine required API endpoints
4. Determine required UI components
5. Generate all code following patterns
6. Validate everything compiles
7. Present with implementation order
```

### Feature Decomposition Example

```typescript
// "wishlist priority sorting with drag-drop reorder"

interface FeaturePlan {
  name: 'wishlist-priority-sorting'
  description: 'Add priority field to wishlist items with drag-drop reorder'

  apiEndpoints: [
    {
      name: 'updatePriority'
      method: 'PATCH'
      path: '/wishlist/:id/priority'
      description: 'Update single item priority'
    },
    {
      name: 'bulkUpdatePriorities'
      method: 'PUT'
      path: '/wishlist/priorities'
      description: 'Reorder multiple items at once'
    }
  ]

  uiComponents: [
    {
      name: 'SortableWishlistCard'
      type: 'component'
      description: 'Card with drag handle'
    },
    {
      name: 'WishlistGallery'
      type: 'page-update'
      description: 'Update to support reordering'
    }
  ]

  sharedTypes: [
    {
      name: 'WishlistPriorityUpdate'
      schema: 'z.object({ id: z.string().uuid(), priority: z.number().int() })'
    }
  ]

  implementationOrder: [
    '1. Database: Add priority column migration',
    '2. Types: Create WishlistPriorityUpdate schema',
    '3. API: Create updatePriority endpoint',
    '4. API: Create bulkUpdatePriorities endpoint',
    '5. RTK: Add mutation hooks',
    '6. UI: Create SortableWishlistCard component',
    '7. UI: Update WishlistGallery with drag-drop',
    '8. Tests: API tests',
    '9. Tests: Component tests',
  ]
}
```

### Generated Structure

```
Feature: wishlist-priority-sorting

New/Modified Files:
├── packages/backend/db/
│   └── migrations/
│       └── 20250127_add_wishlist_priority.sql    # NEW
│
├── apps/api/endpoints/wishlist/
│   ├── update-priority/
│   │   ├── handler.ts                             # NEW
│   │   └── __tests__/handler.test.ts              # NEW
│   └── bulk-update-priorities/
│       ├── handler.ts                             # NEW
│       └── __tests__/handler.test.ts              # NEW
│
├── apps/api/serverless.yml                        # MODIFIED (+16 lines)
│
├── packages/core/api-client/src/rtk/
│   └── wishlist-api.ts                            # MODIFIED (+24 lines)
│
├── apps/web/main-app/src/
│   ├── components/wishlist/
│   │   ├── SortableWishlistCard/
│   │   │   ├── index.tsx                          # NEW
│   │   │   ├── __tests__/SortableWishlistCard.test.tsx  # NEW
│   │   │   └── __types__/index.ts                 # NEW
│   │   └── WishlistGallery/
│   │       └── index.tsx                          # MODIFIED
│   └── pages/wishlist/
│       └── index.tsx                              # MODIFIED

Implementation Order:
1. [DB] Add priority column migration
2. [Types] Create shared Zod schemas
3. [API] updatePriority endpoint
4. [API] bulkUpdatePriorities endpoint
5. [RTK] Add mutation hooks
6. [UI] SortableWishlistCard component
7. [UI] Update WishlistGallery
8. [Test] All tests
```

### Component Generation Pattern

```typescript
// Generated component example
// apps/web/main-app/src/components/wishlist/SortableWishlistCard/index.tsx

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader } from '@repo/ui'
import { GripVertical } from 'lucide-react'
import { WishlistItem } from '@repo/api-types/wishlist'

interface SortableWishlistCardProps {
  item: WishlistItem
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function SortableWishlistCard({
  item,
  onEdit,
  onDelete,
}: SortableWishlistCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <CardHeader className="pl-10">
        <h3 className="font-semibold">{item.title}</h3>
      </CardHeader>

      <CardContent>
        {/* Card content */}
      </CardContent>
    </Card>
  )
}
```

### RTK Integration Generation

```typescript
// Added to wishlist-api.ts
updatePriority: builder.mutation<
  WishlistItem,
  { id: string; priority: number }
>({
  query: ({ id, priority }) => ({
    url: `/wishlist/${id}/priority`,
    method: 'PATCH',
    body: { priority },
  }),
  invalidatesTags: (result, error, { id }) => [
    { type: 'WishlistItem', id },
    'WishlistItems',
  ],
}),

bulkUpdatePriorities: builder.mutation<
  { updated: number },
  { updates: Array<{ id: string; priority: number }> }
>({
  query: (body) => ({
    url: '/wishlist/priorities',
    method: 'PUT',
    body,
  }),
  invalidatesTags: ['WishlistItems'],
}),
```

### Output Format

```
/scaffold-feature "wishlist priority sorting with drag-drop reorder"

Analyzing feature...
 - Table: wishlistItems (needs priority column)
 - Existing patterns: CRUD operations, gallery layout
 - Target app: main-app

Proposed Implementation:

API Layer (4 files)
 - endpoints/wishlist/update-priority/handler.ts
 - endpoints/wishlist/update-priority/__tests__/handler.test.ts
 - endpoints/wishlist/bulk-update-priorities/handler.ts
 - endpoints/wishlist/bulk-update-priorities/__tests__/handler.test.ts

Frontend Layer (5 files)
 - components/wishlist/SortableWishlistCard/index.tsx
 - components/wishlist/SortableWishlistCard/__tests__/SortableWishlistCard.test.tsx
 - components/wishlist/SortableWishlistCard/__types__/index.ts
 - pages/wishlist/index.tsx (modified)
 - rtk/wishlist-api.ts (modified)

Config (2 files)
 - serverless.yml (modified)
 - migrations/20250127_add_wishlist_priority.sql

Implementation Order:
1. Database migration
2. API endpoints (can run in parallel)
3. RTK hooks
4. UI components
5. Integration and tests

Validation:
 - TypeScript: OK
 - ESLint: OK

[View Full Plan] [Apply All] [Apply Incrementally] [Modify Request] [Cancel]
```

## Testing

### Test Location
- Skill testing is manual via Claude Code

### Test Requirements
- Functional: Correctly decomposes various feature types
- Functional: All generated API code compiles and tests pass
- Functional: All generated UI code compiles and tests pass
- Functional: Generated migrations are valid SQL
- Functional: RTK integration works correctly
- UX: Implementation order is logical and helpful

### Test Scenarios

```bash
# Test various feature types
/scaffold-feature "MOC soft delete with 30-day retention and restore"
/scaffold-feature "gallery image tagging with tag autocomplete"
/scaffold-feature "user profile settings page with avatar upload"
/scaffold-feature "parts list import from CSV with validation"
/scaffold-feature "search with filters and saved searches"
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature too complex to decompose | Medium | Medium | Ask clarifying questions, suggest smaller scope |
| Generated code has integration issues | Medium | High | Thorough pattern matching from MCP context |
| Too many files overwhelm user | Medium | Medium | Clear summary, incremental apply option |
| Missing edge cases in generated tests | High | Medium | Include common test patterns, user can add more |
| Routing conflicts with existing routes | Low | Medium | Query existing routes before generating |

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft from AI Developer Automation PRD | SM Agent |
