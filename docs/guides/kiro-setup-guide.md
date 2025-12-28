# Setting Up BMAD Workflow in Kiro

A step-by-step guide for porting your Claude Code + BMAD workflow to Kiro.

---

## Prerequisites

- [ ] Kiro IDE installed ([kiro.dev](https://kiro.dev))
- [ ] Logged in (GitHub, Google, AWS Builder ID, or AWS IAM Identity Center)
- [ ] This monorepo cloned on your work machine
- [ ] Node.js v18+ installed

---

## Part 1: Initial Kiro Setup (15 min)

### Step 1.1: Open Project in Kiro

```bash
# Open Kiro and select "Open Folder"
# Navigate to your monorepo root
```

### Step 1.2: Let Kiro Generate Base Steering Files

When you first open a project, Kiro auto-generates three steering files:

```
.kiro/steering/
├── product.md    # Product context
├── tech.md       # Technology stack
└── structure.md  # Project structure
```

**Action:** Review and enhance these with your project specifics (see Part 2).

### Step 1.3: Verify Kiro Recognizes the Project

In Kiro's chat, type:
```
What is this project about?
```

Kiro should describe your LEGO MOC instructions platform based on the steering files.

---

## Part 2: Configure Steering Files (30 min)

Steering files are Kiro's equivalent to your `CLAUDE.md`. You'll split your conventions into focused files.

### Step 2.1: Edit product.md

```bash
# Open .kiro/steering/product.md
```

Replace with:

```markdown
---
inclusion: always
---

# Product Context

## Overview
LEGO MOC instructions platform - a community for sharing custom LEGO building instructions.

## Target Users
- **MOC Designers** - Creators sharing their custom builds
- **Builders** - Users looking for instructions to build
- **Collectors** - Users tracking official LEGO sets

## Core Features
- MOC Instructions gallery with upload/download
- Wishlist for tracking desired sets
- Inspiration gallery for reference images
- Dashboard with activity and stats

## Business Goals
- Enable user-generated content loop
- Build engaged community
- Premium features for designers (future)
```

### Step 2.2: Edit tech.md

```markdown
---
inclusion: always
---

# Technology Stack

## Frontend
- React 19 with TypeScript
- Tailwind CSS for styling
- RTK Query for API calls
- Framer Motion for animations
- @repo/ui (shadcn/ui components)

## Backend
- AWS Lambda (Serverless Framework)
- PostgreSQL with Drizzle ORM
- S3 for file storage
- Cognito for authentication

## Monorepo
- pnpm workspaces
- Turborepo for builds
- Vitest for testing

## CRITICAL CONVENTIONS

### Zod-First Types (REQUIRED)
```typescript
// CORRECT - Always use Zod schemas
import { z } from 'zod'
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
})
type User = z.infer<typeof UserSchema>

// WRONG - Never use interfaces
interface User { id: string; email: string }
```

### Imports
```typescript
// CORRECT
import { Button, Card } from '@repo/ui'
import { logger } from '@repo/logger'

// WRONG - Never import from individual paths
import { Button } from '@repo/ui/button'
console.log('message')  // Never use console
```

### NO Barrel Files
Import directly from source files, never create index.ts re-exports.
```

### Step 2.3: Edit structure.md

```markdown
---
inclusion: always
---

# Project Structure

## Directory Layout

```
apps/
  api/                    # AWS Lambda endpoints
    endpoints/            # Organized by domain
      wishlist/
      moc-instructions/
    serverless.yml        # Deployment config
  web/
    main-app/            # Primary React app
    app-dashboard/       # Dashboard module
    playwright/          # E2E tests

packages/
  core/                  # Shared frontend packages
    app-component-library/  # @repo/ui - shadcn components
    api-client/          # RTK Query hooks
    logger/              # @repo/logger
  backend/               # Shared backend packages
    db/                  # Drizzle ORM + schemas
    lambda-auth/         # JWT authentication
    s3-client/           # S3 operations

docs/
  stories/               # User stories by epic
  architecture/          # Technical documentation
  prd/                   # Product requirements
```

## Component Directory Pattern

```
MyComponent/
  index.tsx              # Main component
  __tests__/
    MyComponent.test.tsx
  __types__/
    index.ts             # Zod schemas
  utils/
    helpers.ts
```
```

### Step 2.4: Create Conditional Steering Files

Create files that only load when working on specific areas:

**API Patterns (only when in apps/api/):**

```bash
# Create .kiro/steering/api-patterns.md
```

```markdown
---
inclusion: fileMatch
fileMatchPattern: "apps/api/**/*"
---

# API Development Patterns

## Hexagonal Architecture

```
Lambda Adapter → Handler → Service → Database
     ↓              ↓          ↓          ↓
  AWS event    Request/    Business   Drizzle
  handling     Response    logic      queries
```

## Handler Pattern

```typescript
export async function handleX(
  request: Request,
  ctx: { userId: string }
): Promise<Response> {
  // 1. Validate input with Zod
  const input = Schema.parse(await request.json())

  // 2. Call service layer
  const result = await service.doThing(ctx.userId, input)

  // 3. Return structured response
  return Response.json(result)
}
```

## Lambda Wrapper

```typescript
// apps/api/endpoints/{domain}/{action}/handler.ts
import { handleX } from '@repo/api-handlers/{domain}'
import { getUserId } from '@repo/lambda-auth'

export const handler = async (event) => {
  const userId = getUserId(event)
  if (!userId) return { statusCode: 401, body: '...' }

  const request = toLambdaRequest(event)
  const response = await handleX(request, { userId })
  return fromLambdaResponse(response)
}
```
```

**UI Patterns (only when in apps/web/):**

```bash
# Create .kiro/steering/ui-patterns.md
```

```markdown
---
inclusion: fileMatch
fileMatchPattern: "apps/web/**/*"
---

# UI Development Patterns

## Always Use @repo/ui

```typescript
// CORRECT
import { Button, Card, Input, Select } from '@repo/ui'

// NEVER import from individual paths
```

## Component Props with Zod

```typescript
// __types__/index.ts
import { z } from 'zod'

export const MyComponentPropsSchema = z.object({
  title: z.string(),
  onAction: z.function().args(z.string()).returns(z.void()),
})

export type MyComponentProps = z.infer<typeof MyComponentPropsSchema>
```

## RTK Query Usage

```typescript
import { useGetWishlistQuery } from '@repo/api-client'

export function WishlistPage() {
  const { data, isLoading, error } = useGetWishlistQuery()

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return <WishlistGrid items={data.items} />
}
```
```

**Testing Patterns (only when in test files):**

```bash
# Create .kiro/steering/testing.md
```

```markdown
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.{ts,tsx}"
---

# Testing Patterns

## Framework
- Vitest for unit/integration tests
- React Testing Library for components
- Minimum 45% coverage required

## Component Testing

```typescript
import { render, screen } from '@testing-library/react'
import { WishlistCard } from '../index'

const mockItem = {
  id: '123',
  title: 'Test Item',
  store: 'LEGO',
}

describe('WishlistCard', () => {
  it('renders item title', () => {
    render(<WishlistCard item={mockItem} />)
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })
})
```

## API Testing

```typescript
import { describe, it, expect, vi } from 'vitest'
import { handler } from '../handler'

describe('wishlist list handler', () => {
  it('returns items for authenticated user', async () => {
    const event = createMockEvent({ userId: 'user-123' })
    const result = await handler(event)
    expect(result.statusCode).toBe(200)
  })
})
```
```

---

## Part 3: Install Powers (20 min)

Powers give Kiro specialized knowledge. You'll install some and create custom ones.

### Step 3.1: Browse Available Powers

In Kiro:
1. Click the **Powers** icon in the sidebar
2. Browse available powers

**Recommended to install:**
- **Supabase** (if using PostgreSQL patterns)
- **Stripe** (if adding payments later)
- **AWS** related powers

### Step 3.2: Create Custom Drizzle Power

Since there's no official Drizzle power, create your own:

```bash
mkdir -p powers/drizzle
```

Create `powers/drizzle/POWER.md`:

```markdown
---
name: drizzle
displayName: "Drizzle Database"
keywords: ["database", "schema", "migration", "drizzle", "postgres", "table", "query", "db"]
---

# Drizzle Database Power

## Schema Location
Main schema: `packages/backend/db/src/schema.ts`
Generated Zod schemas: `packages/backend/db/src/generated-schemas.ts`

## Available Tables

### Core Tables
- `mocInstructions` - MOC and LEGO Set instructions (type-discriminated)
- `mocFiles` - Instruction file storage (PDFs, XMLs)
- `wishlistItems` - User wishlist entries
- `galleryImages` - User uploaded images
- `galleryAlbums` - Image album collections

## Common Operations

### Adding a Table
```typescript
// packages/backend/db/src/schema.ts
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  // ... fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

Then run:
```bash
pnpm --filter @repo/db generate  # Create migration
pnpm --filter @repo/db push      # Apply to database
```

### Adding a Field
1. Add to schema.ts
2. Run `pnpm --filter @repo/db generate`
3. Update Zod schemas in generated-schemas.ts
4. Update any affected handlers

### Query Patterns
```typescript
import { db } from '@repo/db'
import { wishlistItems } from '@repo/db/schema'
import { eq, desc } from 'drizzle-orm'

// List with pagination
const items = await db
  .select()
  .from(wishlistItems)
  .where(eq(wishlistItems.userId, userId))
  .orderBy(desc(wishlistItems.createdAt))
  .limit(20)
  .offset(0)
```

## Conventions
- All tables have `userId` for ownership (Cognito sub)
- Use JSONB for complex nested data
- Always add `createdAt` with `defaultNow()`
- Lazy indexes on frequently queried columns
```

### Step 3.3: Create API Development Power

Create `powers/api-development/POWER.md`:

```markdown
---
name: api-development
displayName: "API Development"
keywords: ["endpoint", "lambda", "handler", "api", "rest", "serverless", "route"]
---

# API Development Power

## Creating a New Endpoint

### 1. File Structure
```
apps/api/endpoints/{domain}/{action}/
  handler.ts
  __tests__/
    handler.test.ts
```

### 2. Create Handler
```typescript
// packages/backend/api-handlers/src/{domain}/{action}.handler.ts
import { z } from 'zod'

const RequestSchema = z.object({
  // input validation
})

export async function handle{Action}(
  request: Request,
  ctx: { userId: string }
): Promise<Response> {
  const input = RequestSchema.parse(await request.json())
  // implementation
  return Response.json({ success: true })
}
```

### 3. Create Lambda Adapter
```typescript
// apps/api/endpoints/{domain}/{action}/handler.ts
import { handle{Action} } from '@repo/api-handlers/{domain}'
import { getUserId, successResponse, errorResponse } from '@repo/lambda-utils'

export const handler = async (event) => {
  try {
    const userId = getUserId(event)
    if (!userId) return errorResponse(401, 'Unauthorized')

    const request = toLambdaRequest(event)
    return await handle{Action}(request, { userId })
  } catch (error) {
    return errorResponse(500, error.message)
  }
}
```

### 4. Add to serverless.yml
```yaml
functions:
  {domain}{Action}:
    handler: endpoints/{domain}/{action}/handler.handler
    events:
      - http:
          path: /api/{domain}
          method: post
          authorizer: cognitoAuthorizer
```

### 5. Add RTK Query Hook
```typescript
// packages/core/api-client/src/rtk/{domain}-api.ts
export const {domain}Api = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    {action}: builder.mutation({
      query: (data) => ({
        url: '/{domain}',
        method: 'POST',
        body: data,
      }),
    }),
  }),
})
```

## Testing Commands
```bash
pnpm test                    # Run changed tests
pnpm check-types             # Type check
pnpm lint                    # Lint
```
```

### Step 3.4: Create Workflow Power

Create `powers/bmad-workflow/POWER.md`:

```markdown
---
name: bmad-workflow
displayName: "BMAD Development Workflow"
keywords: ["story", "implement", "feature", "epic", "workflow", "task"]
---

# BMAD Development Workflow

## Story Location
Stories are in `docs/stories/` organized by epic:
- `epic-0-housekeeping/` - Infrastructure (HSKP-*)
- `epic-5-inspiration/` - Inspiration gallery (INSP-*)
- `epic-6-wishlist/` - Wishlist feature (WISH-*)
- `epic-7-sets/` - Sets gallery (SETS-*)

## Story Format
Stories follow a vertical slice pattern:
```markdown
# Story {ID}: {Title}

## Status
Draft | Approved | In Progress | Ready for Review | Done

## Story
As a {user}, I want {goal}, so that {benefit}.

## Acceptance Criteria
1. {Criterion 1}
2. {Criterion 2}

## Tasks
- [ ] Task 1
- [ ] Task 2

## Dev Notes
{Implementation guidance}
```

## Implementation Order
1. **Database** - Schema changes first
2. **Zod Schemas** - Type definitions
3. **Service Layer** - Business logic
4. **Handlers** - Request/response
5. **Lambda Adapters** - AWS wrappers
6. **RTK Query** - Frontend hooks
7. **UI Components** - React components
8. **Tests** - All layers

## Quality Gates
Before PR:
- [ ] `pnpm test` passes
- [ ] `pnpm check-types` passes
- [ ] `pnpm lint` passes
- [ ] Coverage ≥ 45%

## Branch Naming
`feature/story-{NUM}-{slug}`

Example: `feature/story-wish-2001-gallery-mvp`
```

---

## Part 4: Convert Stories to Specs (Per Feature)

For each story you want to implement in Kiro, convert it to the specs format.

### Step 4.1: Create Spec Directory

```bash
mkdir -p .kiro/specs/wishlist-gallery-mvp
```

### Step 4.2: Create requirements.md

Convert your story's acceptance criteria to EARS syntax:

```markdown
# Requirements: Wishlist Gallery MVP

## User Story
As a user, I want to view my wishlist items in a gallery, so that I can browse and manage sets I want to purchase.

## Functional Requirements

### REQ-1: Gallery Display
The system SHALL display wishlist items in a responsive grid layout.

### REQ-2: Item Cards
The system SHALL show each item with:
- Title
- Store badge (LEGO, BrickLink, etc.)
- Price (if available)
- Thumbnail image

### REQ-3: API Endpoint
WHEN a GET request is made to /api/wishlist,
the system SHALL return a paginated list of the authenticated user's wishlist items.

### REQ-4: Empty State
WHERE the user has no wishlist items,
the system SHALL display an empty state with a call-to-action to add items.

### REQ-5: Loading State
WHILE data is being fetched,
the system SHALL display a skeleton loading state.

## Non-Functional Requirements

### NFR-1: Performance
The system SHALL load the initial gallery within 2 seconds.

### NFR-2: Accessibility
The system SHALL meet WCAG 2.1 AA standards.

## Dependencies
- WISH-2000: Database Schema (must be complete)
```

### Step 4.3: Create design.md

```markdown
# Design: Wishlist Gallery MVP

## Architecture

### API Layer
```
GET /api/wishlist
  Query: ?store=LEGO&sort=createdAt&order=desc&page=1&limit=20
  Response: { items: WishlistItem[], page: number, total: number }
```

### Component Hierarchy
```
WishlistGalleryPage
├── PageHeader
├── FilterTabs (store filter)
├── GalleryGrid
│   └── WishlistCard (repeated)
└── Pagination
```

### Data Flow
```
useGetWishlistQuery() → RTK Query → Lambda → Handler → Service → Drizzle
```

## Key Decisions

### AD-1: Use Shared Gallery Components
Reuse `GalleryGrid` from `packages/core/gallery/` to ensure consistency with other galleries.

### AD-2: Store Filter as Tabs
Display store filters (LEGO, BrickLink, Amazon, All) as tabs rather than dropdown for quick access.

### AD-3: Optimistic Updates
Use RTK Query's optimistic updates for remove actions to feel instant.

## File Locations
- Handler: `packages/backend/api-handlers/src/wishlist/list.handler.ts`
- Service: `packages/backend/api-services/src/wishlist/list-service.ts`
- Lambda: `apps/api/endpoints/wishlist/list/handler.ts`
- Page: `apps/web/main-app/src/routes/wishlist/index.tsx`
- Card: `apps/web/main-app/src/routes/wishlist/-components/WishlistCard/`
```

### Step 4.4: Let Kiro Generate tasks.md

Kiro auto-generates `tasks.md` from your requirements and design. Just tell it:

```
Generate tasks for the wishlist-gallery-mvp spec
```

Or manually create if needed:

```markdown
# Tasks: Wishlist Gallery MVP

## Backend Tasks

- [ ] Create list service in `@repo/api-services/wishlist`
- [ ] Create list handler in `@repo/api-handlers/wishlist`
- [ ] Create Lambda adapter in `apps/api/endpoints/wishlist/list`
- [ ] Add to serverless.yml
- [ ] Write handler tests

## Frontend Tasks

- [ ] Create RTK Query hook in `@repo/api-client`
- [ ] Create WishlistCard component
- [ ] Create WishlistGalleryPage
- [ ] Add route configuration
- [ ] Write component tests

## Integration Tasks

- [ ] Verify end-to-end flow
- [ ] Test empty state
- [ ] Test loading state
- [ ] Test error handling
```

---

## Part 5: Using Kiro for Implementation

### Step 5.1: Interactive Mode (Agent Chat)

For guided implementation:

```
Implement the wishlist gallery MVP using the spec in .kiro/specs/wishlist-gallery-mvp/
```

Kiro will:
1. Read your requirements.md and design.md
2. Follow your patterns from steering files
3. Ask clarifying questions
4. Implement task by task

### Step 5.2: Autonomous Mode

For hands-off implementation:

```
Run autonomous agent on .kiro/specs/wishlist-gallery-mvp/
```

Kiro's autonomous agent will:
1. Clone/branch automatically
2. Spawn Research agent (analyze codebase)
3. Spawn Code agent (implement)
4. Spawn Verify agent (test and validate)
5. Create PR when done

### Step 5.3: Using Powers

Powers activate automatically by keyword:

```
"Add a new field to the wishlist table for priority"
```
→ **drizzle** power activates (sees "table", "field")

```
"Create an endpoint to update wishlist item priority"
```
→ **api-development** power activates (sees "endpoint")

```
"Implement story WISH-2003"
```
→ **bmad-workflow** power activates (sees "story", "implement")

---

## Part 6: Hooks for Automation

### Step 6.1: Create Schema Change Hook

```bash
mkdir -p .kiro/hooks
```

Create `.kiro/hooks/on-schema-change.md`:

```markdown
---
trigger:
  fileChange: "packages/backend/db/src/schema.ts"
---

# On Schema Change

When the Drizzle schema changes:

1. Remind to run migration:
   ```bash
   pnpm --filter @repo/db generate
   ```

2. Check if Zod schemas need updating in `generated-schemas.ts`

3. Identify affected handlers that may need updates
```

### Step 6.2: Create Test Failure Hook

Create `.kiro/hooks/on-test-fail.md`:

```markdown
---
trigger:
  command: "pnpm test"
  exitCode: 1
---

# On Test Failure

When tests fail:

1. Analyze the failure output
2. Identify the root cause
3. Suggest fix based on common patterns:
   - Mock not properly configured
   - Async timing issue
   - Missing test data
4. Offer to implement the fix
```

---

## Part 7: Daily Workflow in Kiro

### Starting a New Feature

```
1. Find story in docs/stories/
2. Convert to spec (or use existing)
3. Tell Kiro: "Implement spec {name}"
4. Review generated code
5. Run tests: pnpm test
6. Create PR when ready
```

### Quick Tasks

For small changes, just describe what you need:

```
"Add a priority field to wishlist items - integer 0-5, default 0"
```

Kiro will:
- Activate drizzle power (sees "field", "wishlist")
- Update schema
- Generate migration
- Update Zod schemas
- Suggest handler updates

### Code Review Mode

```
"Review the changes I made for security issues"
```

Or:

```
"Check if my code follows the project patterns"
```

---

## Part 8: Troubleshooting

### Powers Not Activating

**Symptom:** Kiro doesn't seem to know about your patterns

**Fix:** Check keywords in POWER.md match what you're saying

```yaml
# Before
keywords: ["database"]

# After - more trigger words
keywords: ["database", "db", "schema", "table", "query", "drizzle", "postgres"]
```

### Steering Files Not Loading

**Symptom:** Kiro ignores your conventions

**Fix:** Check inclusion mode and fileMatch pattern

```yaml
# Verify pattern matches your files
inclusion: fileMatch
fileMatchPattern: "apps/api/**/*"  # Must match actual paths
```

### Context Overload

**Symptom:** Kiro responses are slow or confused

**Fix:**
1. Make more steering files conditional (fileMatch)
2. Split large steering files into focused ones
3. Remove redundant information

---

## Quick Reference

### File Locations

| Purpose | Location |
|---------|----------|
| Steering (conventions) | `.kiro/steering/` |
| Specs (requirements) | `.kiro/specs/{feature}/` |
| Powers (capabilities) | `powers/{name}/POWER.md` |
| Hooks (automation) | `.kiro/hooks/` |

### Commands

| Action | What to Say |
|--------|-------------|
| Implement spec | "Implement spec {name}" |
| Run autonomous | "Run autonomous agent on spec {name}" |
| Generate tasks | "Generate tasks for spec {name}" |
| Convert story | "Convert story {file} to Kiro spec" |
| Check patterns | "Does this follow project patterns?" |

### Power Keywords

| Power | Trigger Words |
|-------|---------------|
| drizzle | database, schema, table, migration, query |
| api-development | endpoint, lambda, handler, api, route |
| bmad-workflow | story, implement, feature, epic, task |

---

## Part 9: Integrating Existing MCP Servers

If you have existing MCP servers (from Claude Code or custom), integrate them into Kiro Powers.

### Step 9.1: Inventory Your MCP Servers

Common MCP servers you might have:

| Server | Purpose | Kiro Integration |
|--------|---------|------------------|
| `dev-db` / DBHub | Database introspection | → Drizzle Power |
| `github` | GitHub operations | → Git Power |
| `chrome-devtools` | Browser automation | → Testing Power |
| `fetch` | Web fetching | → Research Power |
| `context7` | Library docs | → Documentation Power |
| Custom servers | Domain-specific | → Custom Powers |

### Step 9.2: Bundle MCP into Powers

Instead of loading all MCP servers upfront (context overload), bundle them into Powers that activate on-demand.

**Example: Database Power with MCP**

Create `powers/database/POWER.md`:

```markdown
---
name: database
displayName: "Database Operations"
keywords: ["database", "db", "schema", "table", "query", "migration", "drizzle", "postgres"]
mcp:
  - name: dev-db
    transport: stdio
    command: pnpm
    args: ["dlx", "@bytebase/dbhub", "--dsn", "postgresql://..."]
---

# Database Power

This power provides database introspection and query capabilities.

## Available MCP Tools

When this power activates, you have access to:
- `query` - Execute read-only SQL queries
- `describe_table` - Get table schema details
- `list_tables` - List all tables in database

## Usage Patterns

"Show me the wishlist_items table structure"
→ Uses describe_table tool

"What are the most recent 10 wishlist entries?"
→ Uses query tool with SELECT
```

**Example: GitHub Power with MCP**

Create `powers/github/POWER.md`:

```markdown
---
name: github
displayName: "GitHub Operations"
keywords: ["github", "pr", "pull request", "issue", "branch", "merge", "review"]
mcp:
  - name: github
    transport: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"
---

# GitHub Power

Provides GitHub repository operations.

## Available MCP Tools
- `create_pull_request` - Create a new PR
- `list_issues` - List repository issues
- `create_issue` - Create a new issue
- `add_comment` - Add comment to issue/PR

## When to Use
- Creating PRs after implementation
- Managing issues
- Code review operations
```

### Step 9.3: MCP Server Configuration Patterns

**Stdio Transport (local process):**
```yaml
mcp:
  - name: my-server
    transport: stdio
    command: node
    args: ["path/to/server.js"]
    env:
      API_KEY: "${MY_API_KEY}"
```

**HTTP Transport (remote server):**
```yaml
mcp:
  - name: remote-server
    transport: http
    url: "http://localhost:3000/mcp"
```

**Docker Transport:**
```yaml
mcp:
  - name: docker-server
    transport: stdio
    command: docker
    args: ["run", "--rm", "-i", "my-mcp-server:latest"]
```

### Step 9.4: Environment Variables

For sensitive values, use environment variables:

```bash
# In your shell profile or .env
export GITHUB_TOKEN="ghp_..."
export DATABASE_URL="postgresql://..."
export OPENAI_API_KEY="sk-..."
```

Reference in POWER.md:
```yaml
env:
  API_KEY: "${OPENAI_API_KEY}"
```

### Step 9.5: Testing MCP in Powers

After creating a power, test activation:

```
"Query the database for wishlist items"
```

Kiro should:
1. Detect "database" keyword
2. Activate the database power
3. Load the dev-db MCP server
4. Execute the query tool

---



1. [ ] Test with one simple story first
2. [ ] Refine steering files based on what Kiro misses
3. [ ] Add more powers as needed
4. [ ] Create hooks for your common workflows
5. [ ] Compare results with Claude Code workflow
6. [ ] Document differences and workarounds

---

*Guide Version: 1.0*
*For: Kiro IDE with BMAD Workflow*
*Last Updated: 2025-12-27*
