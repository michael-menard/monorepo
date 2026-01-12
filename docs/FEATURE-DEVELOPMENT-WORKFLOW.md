# Feature Development Workflow

A comprehensive guide for implementing features in this codebase, integrating API Portability, AI Automation, and the consolidated story approach.

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [The Feature Development Lifecycle](#3-the-feature-development-lifecycle)
4. [Command Reference](#4-command-reference)
5. [Architecture Quick Reference](#5-architecture-quick-reference)
6. [Common Patterns](#6-common-patterns)
7. [Troubleshooting](#7-troubleshooting)
8. [Examples](#8-examples)

---

## 1. Overview

### The Philosophy: Foundation -> AI Automation -> 10x Velocity

This project follows a strategic approach to development that maximizes velocity through proper sequencing:

```mermaid
graph LR
    A[Phase 1<br/>API Portability] --> B[Phase 2<br/>AI Automation]
    B --> C[Phase 3<br/>10x Velocity]

    style A fill:#e3f2fd
    style B fill:#fff3e0
    style C fill:#e8f5e9
```

1. **API Portability** - Hexagonal architecture enables fast local development (2 min vs 5+ min deploys)
2. **AI Automation** - MCP servers and skills provide context-aware code generation
3. **10x Velocity** - Combined foundation enables rapid feature implementation

### What Changed from the Old Workflow

| Old Workflow | New Workflow |
|-------------|--------------|
| Lambda-only development | Hexagonal architecture with local Express server |
| Manual code scaffolding | AI-assisted scaffolding via skills |
| Granular stories (1 per endpoint) | Consolidated vertical slice stories |
| Deploy-to-test cycle (5+ min) | Local-first development (seconds) |
| Manual cross-file updates | MCP-informed atomic changes |

### When to Use Which Approach

| Scenario | Approach |
|----------|----------|
| New full feature (API + UI) | `/implement` with parallel mode |
| Single API endpoint | Manual implementation or `/scaffold-endpoint` |
| UI component only | `/scaffold-component` |
| Bug fix | Standard git workflow |
| Refactoring | `/refactor` agent (when available) |

---

## 2. Prerequisites

### Local Development Setup

Before implementing features, ensure your local environment is configured:

#### Required Tools

```bash
# Check prerequisites
node --version      # v18+ required
pnpm --version      # v9+ required
docker --version    # Docker Desktop required
gh auth status      # GitHub CLI authenticated
```

#### Docker + Express Setup

```bash
# Start local database
docker compose -f docker/docker-compose.local.yml up -d

# Verify database is running
docker ps | grep lego-moc-postgres

# Run migrations
pnpm --filter @repo/db migrate:local

# Optional: Seed test data
pnpm --filter @repo/db seed:local
```

#### Environment Configuration

Create `.env.local` in the project root:

```bash
# Database (Docker)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USERNAME=lego_moc_user
POSTGRES_PASSWORD=local_dev_password
POSTGRES_DATABASE=lego_moc_db

# Auth (real Cognito - free tier)
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxx
COGNITO_REGION=us-east-1

# S3 (options: real S3 or local MinIO)
S3_BUCKET=lego-moc-files-dev

# Server
PORT=4000
NODE_ENV=development
```

### MCP Servers

MCP (Model Context Protocol) servers provide AI assistants with project context. When fully implemented, configure in `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "drizzle-mcp": {
      "command": "node",
      "args": ["tools/mcp-servers/drizzle-mcp/dist/index.js"],
      "cwd": "/path/to/project"
    },
    "serverless-mcp": {
      "command": "node",
      "args": ["tools/mcp-servers/serverless-mcp/dist/index.js"],
      "cwd": "/path/to/project"
    }
  }
}
```

### Understanding Project Conventions

Before implementing features, familiarize yourself with:

| Document | Location | Purpose |
|----------|----------|---------|
| CLAUDE.md | `/CLAUDE.md` | Core project conventions |
| Coding Standards | `/docs/architecture/coding-standards.md` | Code style and patterns |
| Tech Stack | `/docs/architecture/tech-stack.md` | Technology choices |
| Source Tree | `/docs/architecture/source-tree.md` | Directory structure |

**Key Conventions (from CLAUDE.md):**

- Use `@repo/ui` for all UI components (never individual paths)
- Use `@repo/logger` instead of `console.log`
- Use Zod schemas for types (never TypeScript interfaces)
- NO barrel files (import directly from source)
- Follow component directory structure

---

## 3. The Feature Development Lifecycle

### Workflow Overview

```mermaid
graph TB
    subgraph "Phase 1: Story Selection"
        A1[Pick Story] --> A2[Review Dependencies]
        A2 --> A3[Verify Ready Status]
    end

    subgraph "Phase 2: Setup"
        B1[Create Worktree] --> B2[Start Local Stack]
        B2 --> B3[Verify Environment]
    end

    subgraph "Phase 3: Implementation"
        C1[Implement Backend] --> C2[Implement Frontend]
        C2 --> C3[Write Tests]
    end

    subgraph "Phase 4: Quality"
        D1[Run Tests] --> D2[Type Check]
        D2 --> D3[Lint]
        D3 --> D4[QA Review]
    end

    subgraph "Phase 5: Delivery"
        E1[Create PR] --> E2[Code Review]
        E2 --> E3[Merge]
        E3 --> E4[Archive Story]
    end

    A3 --> B1
    B3 --> C1
    C3 --> D1
    D4 --> E1
```

---

### Phase 1: Story Selection

#### Finding Stories

Stories are located in `/docs/stories/` organized by epic:

```
docs/stories/
  epic-0-housekeeping/      # Infrastructure stories (HSKP-*)
  epic-0-launch-readiness/  # Launch prep stories (LNCH-*)
  epic-5-inspiration/       # Inspiration gallery (INSP-*)
  epic-6-wishlist/          # Wishlist feature (WISH-*)
  epic-7-sets/              # Sets gallery (SETS-*)
```

#### Understanding the Consolidated Story Format

Stories now follow a **vertical slice** pattern, consolidating related work:

```markdown
# Story WISH-2001: Wishlist Gallery MVP (Vertical Slice)

## Status
Draft | Approved | In Progress | Ready for Review | Done

## Consolidates
- wish-1000: Gallery scaffolding
- wish-1001: Card component
- wish-1002: API endpoints

## Story
As a user,
I want to view my wishlist items in a gallery,
So that I can browse and manage sets I want to purchase.

## Dependencies
- WISH-2000: Database Schema (must be complete first)

## Acceptance Criteria
1. GalleryGrid renders wishlist items correctly
2. GET /api/wishlist returns paginated list
3. WishlistCard component displays metadata
...

## Tasks / Subtasks
- [ ] Task 1: Audit shared gallery
- [ ] Task 2: Create API endpoints
- [ ] Task 3: Create RTK Query slice
...

## Dev Notes
[Implementation guidance, code examples]

## Testing
[Test requirements by layer]
```

#### Checking Dependencies

Before starting a story, verify its dependencies are complete:

```bash
# Check if dependency stories are done
ls docs/stories/epic-6-wishlist/wish-2000*.md

# Look for status in the file
grep -i "status" docs/stories/epic-6-wishlist/wish-2000*.md
```

---

### Phase 2: Local Development Setup

#### Option A: Using Worktree Workflow (Recommended)

Worktrees allow parallel feature development without branch switching:

```bash
# Create new worktree for feature
/wt-new
# Follow prompts for base branch and feature name

# Or use the automated approach
/start-feature
# Commits/stashes current work, then creates worktree

# List existing worktrees
/wt-list

# Switch between worktrees
/wt-switch
```

#### Option B: Traditional Branch Workflow

```bash
# Create feature branch
git checkout main
git pull origin main
git checkout -b feature/wish-2001-gallery-mvp
```

#### Starting the Local Stack

```bash
# Terminal 1: Start Docker PostgreSQL
docker compose -f docker/docker-compose.local.yml up -d

# Terminal 2: Start Express API (when available)
pnpm --filter api-express dev

# Terminal 3: Start Frontend
pnpm --filter main-app dev

# Or use the combined command (when configured)
pnpm dev:local
```

#### Verifying Local Environment

```bash
# Check database connection
pnpm --filter @repo/db test:connection

# Check API health
curl http://localhost:4000/health

# Check frontend
open http://localhost:3000
```

---

### Phase 3: Implementation with AI Assistance

#### Using the /implement Skill

The primary way to implement stories:

```bash
# Simple story implementation
/implement wish-2001

# With parallel sub-agents (faster for complex stories)
/implement wish-2001 --parallel

# With deep review (security, performance, accessibility)
/implement wish-2001 --parallel --deep-review

# Preview what would happen
/implement wish-2001 --dry-run

# Resume interrupted work
/implement wish-2001 --resume
```

#### Using /develop (Convenience Wrapper)

```bash
# Accepts story number or file path
/develop 2001
/develop wish-2001
/develop docs/stories/epic-6-wishlist/wish-2001-wishlist-gallery-mvp.md
```

#### Using Scaffold Skills (When Available)

For individual pieces:

```bash
# Scaffold a complete endpoint
/scaffold-endpoint "list all wishlist items for current user"

# Scaffold a feature (API + UI + tests)
/scaffold-feature "wishlist priority sorting with drag-drop"

# Scaffold a component
/scaffold-component "priority badge showing 1-5 stars"

# Add a field across all layers
/add-field wishlistItems priority "integer default 0, sort order"
```

#### Manual Implementation

When implementing manually, follow this order:

**1. Backend First (if applicable)**

```typescript
// 1. Schema updates (packages/backend/db/src/schema.ts)
export const wishlistItems = pgTable('wishlist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ...
})

// 2. Service layer (packages/backend/api-services/src/wishlist/)
export async function listWishlistItems(userId: string, query: WishlistQuery) {
  // Business logic
}

// 3. Handler (packages/backend/api-handlers/src/wishlist/)
export async function handleListWishlist(
  request: Request,
  ctx: HandlerContext
): Promise<Response> {
  // Request handling
}

// 4. Lambda adapter (apps/api/endpoints/wishlist/list/)
export const handler = async (event: APIGatewayProxyEvent) => {
  // AWS Lambda wrapper
}
```

**2. Frontend Second**

```typescript
// 1. RTK Query hooks (packages/core/api-client/src/rtk/)
export const wishlistApi = createApi({
  endpoints: (builder) => ({
    getWishlist: builder.query<WishlistResponse, WishlistQuery>({
      // ...
    }),
  }),
})

// 2. Components (apps/web/main-app/src/routes/wishlist/-components/)
export function WishlistCard({ item }: WishlistCardProps) {
  // ...
}

// 3. Pages (apps/web/main-app/src/routes/wishlist/)
export function WishlistGalleryPage() {
  // ...
}
```

---

### Phase 4: Testing Locally

#### Running Tests

```bash
# Run tests for changed packages only (fast)
pnpm test

# Run all tests
pnpm test:all

# Run tests for specific package
pnpm --filter @repo/api-services test
pnpm --filter main-app test

# Run with coverage
pnpm test -- --coverage
```

#### Type Checking

```bash
# Check changed packages only (fast)
pnpm check-types

# Check everything
pnpm check-types:all
```

#### Linting

```bash
# Lint changed files only
pnpm lint

# Lint everything
pnpm lint:all

# Fix auto-fixable issues
pnpm lint:fix
```

#### Manual Testing

```bash
# Test API endpoint directly
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/wishlist

# Test with query params
curl "http://localhost:4000/api/wishlist?store=LEGO&sort=price"
```

#### Debugging with Express (vs Lambda)

Express provides better debugging than Lambda:

```typescript
// Add breakpoints in VS Code
// Or use console.debug (via @repo/logger)
import { logger } from '@repo/logger'

logger.debug('Processing request', { params, userId })
```

---

### Phase 5: Code Review and PR

#### Creating Commits

```bash
# Use the commit skill for proper formatting
/commit

# Or manually with conventional commits
git add .
git commit -m "feat(wishlist): implement gallery page with cards

- Add GET /api/wishlist endpoint
- Create WishlistCard component
- Integrate with RTK Query

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Creating Pull Requests

```bash
# Push branch
git push -u origin feature/wish-2001-gallery-mvp

# Create PR with proper template
gh pr create \
  --title "feat(wishlist): implement gallery MVP (Story WISH-2001)" \
  --body "## Summary
Implements Story WISH-2001: Wishlist Gallery MVP

## Changes
- API endpoints for listing and getting wishlist items
- WishlistCard component with store badges
- Gallery page with filtering and sorting

## Test Plan
- [ ] Gallery loads with test data
- [ ] Store filter tabs work
- [ ] Cards display all metadata

Closes #123"
```

#### QA Gate Process

```bash
# Run QA gate review
/qa-gate wish-2001

# This creates a gate file at:
# docs/qa/gates/wish-2001-wishlist-gallery-mvp.yml
```

Gate statuses:
- **PASS** - Ready to merge
- **CONCERNS** - Can proceed with awareness
- **FAIL** - Must fix issues first
- **WAIVED** - Issues explicitly accepted

---

### Phase 6: Deployment

#### Lambda Deployment (Current Production)

```bash
# Deploy via Serverless Framework
cd apps/api
serverless deploy --stage dev

# Or deploy specific function
serverless deploy function -f wishlistList --stage dev
```

#### Post-Merge Cleanup

```bash
# After PR is merged, run completion
/implement wish-2001 --complete

# This will:
# - Archive story to docs/_archive/completed-stories/
# - Close GitHub issue
# - Clean up worktree
# - Delete local branch
```

---

## 4. Command Reference

### BMAD Workflow Commands

|| Command | Description | Usage |
||---------|-------------|-------|
|| `/implement` | Complete story implementation | `/implement wish-2001 --parallel` |
|| `/develop` | Smart launcher for /implement | `/develop 2001` |
|| `/qa-gate` | Create quality gate decision | `/qa-gate wish-2001` |
|| `/review-story` | Review implementation | `/review-story wish-2001` |
|| `/create-next-story` | Draft new story | `/create-next-story` |

### Test Workflows

|| Workflow | Description | Example Usage |
||----------|-------------|----------------|
|| `API Tests (mocked)` | Run the `apps/api` Vitest suite with infrastructure mocked (fast unit-style verification). | `cd apps/api && pnpm test` |
|| `API Tests (no-mock)` | Run the same `apps/api` tests with `TEST_USE_MOCKS=false` so they hit real integrations (e.g., test database) where configured. | `cd apps/api && TEST_USE_MOCKS=false pnpm test` |

### Git Worktree Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/wt-new` | Create new worktree | `/wt-new` |
| `/wt-list` | List all worktrees | `/wt-list` |
| `/wt-switch` | Switch to worktree | `/wt-switch` |
| `/wt-status` | Show worktree status | `/wt-status` |
| `/wt-sync` | Sync with remote | `/wt-sync` |
| `/wt-finish` | Merge and cleanup | `/wt-finish` |
| `/wt-cleanup` | Remove merged worktrees | `/wt-cleanup` |

### Feature Start Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/start-feature` | Commit/stash and start new feature | `/start-feature` |
| `/switch-feature` | Commit/stash and switch worktree | `/switch-feature` |

### Scaffold Skills (When Available)

| Command | Description | Usage |
|---------|-------------|-------|
| `/scaffold-endpoint` | Generate API endpoint | `/scaffold-endpoint "list wishlist items"` |
| `/scaffold-feature` | Generate vertical slice | `/scaffold-feature "priority sorting"` |
| `/scaffold-component` | Generate React component | `/scaffold-component "priority badge"` |
| `/add-field` | Add field across layers | `/add-field wishlistItems priority integer` |
| `/sync-types` | Ensure type consistency | `/sync-types --check` |

### BMAD Agent Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/sm` | Story Manager agent | `/sm` |
| `/dev` | Developer agent | `/dev` |
| `/qa` | QA agent | `/qa` |
| `/architect` | Architect agent | `/architect` |
| `/analyst` | Business Analyst agent | `/analyst` |

### Git/PR Commands (Plugin)

| Command | Description | Usage |
|---------|-------------|-------|
| `/commit` | Create conventional commit | `/commit` |
| `/commit-push-pr` | Commit, push, and open PR | `/commit-push-pr` |
| `/review-pr` | Comprehensive PR review | `/review-pr 123` |
| `/clean-gone` | Clean up deleted branches | `/clean-gone` |

---

## 5. Architecture Quick Reference

### Hexagonal Architecture

```mermaid
graph TB
    subgraph "Adapters (Transport Layer)"
        Lambda["AWS Lambda<br/>Production"]
        Express["Express Server<br/>Local Dev"]
    end

    subgraph "Handlers (Application Layer)"
        Handlers["@repo/api-handlers<br/>Request/Response"]
    end

    subgraph "Services (Domain Layer)"
        Services["@repo/api-services<br/>Business Logic"]
    end

    subgraph "Infrastructure"
        DB["@repo/db<br/>Drizzle ORM"]
        S3["@repo/s3-client"]
        Auth["@repo/lambda-auth"]
    end

    Lambda --> Handlers
    Express --> Handlers
    Handlers --> Services
    Services --> DB
    Services --> S3
    Services --> Auth
```

### Where to Put Code

| Type | Location | Example |
|------|----------|---------|
| **Database Schema** | `packages/backend/db/src/schema.ts` | Table definitions |
| **Zod Schemas** | `packages/backend/db/src/schemas/` | Validation schemas |
| **Business Logic** | `packages/backend/api-services/src/{domain}/` | Service functions |
| **Request Handlers** | `packages/backend/api-handlers/src/{domain}/` | Unified handlers |
| **Lambda Adapters** | `apps/api/endpoints/{domain}/` | AWS Lambda wrappers |
| **RTK Query** | `packages/core/api-client/src/rtk/` | API hooks |
| **UI Components** | `apps/web/main-app/src/routes/{domain}/-components/` | React components |
| **Pages** | `apps/web/main-app/src/routes/{domain}/` | Route components |
| **Shared UI** | `packages/core/app-component-library/` | Design system |

### Package Dependencies

```mermaid
graph TB
    subgraph "Apps"
        API["apps/api"]
        MainApp["apps/web/main-app"]
    end

    subgraph "Backend Packages"
        Handlers["@repo/api-handlers"]
        Services["@repo/api-services"]
        Lambda["@repo/lambda-adapter"]
        DB["@repo/db"]
        S3["@repo/s3-client"]
    end

    subgraph "Core Packages"
        UI["@repo/ui"]
        APIClient["@repo/api-client"]
        Logger["@repo/logger"]
    end

    API --> Lambda
    Lambda --> Handlers
    Handlers --> Services
    Services --> DB
    Services --> S3

    MainApp --> UI
    MainApp --> APIClient
    MainApp --> Logger
```

---

## 6. Common Patterns

### Adding a New API Endpoint

**Step 1: Define the Schema (if new table)**

```typescript
// packages/backend/db/src/schema.ts
export const wishlistItems = pgTable('wishlist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  store: text('store').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Step 2: Create Zod Schemas**

```typescript
// packages/backend/db/src/schemas/wishlist.ts
import { z } from 'zod'

export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string().min(1),
  store: z.string(),
  price: z.number().positive().optional(),
  createdAt: z.coerce.date(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

export const WishlistQuerySchema = z.object({
  store: z.string().optional(),
  sort: z.enum(['createdAt', 'price', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})
```

**Step 3: Create Service**

```typescript
// packages/backend/api-services/src/wishlist/list-service.ts
import { db } from '@repo/db'
import { wishlistItems } from '@repo/db/schema'
import { eq, desc, asc } from 'drizzle-orm'

export async function listWishlistItems(
  userId: string,
  query: WishlistQuery
): Promise<WishlistListResponse> {
  const { store, sort, order, page, limit } = query

  const orderFn = order === 'asc' ? asc : desc

  const items = await db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
    .orderBy(orderFn(wishlistItems[sort]))
    .limit(limit)
    .offset((page - 1) * limit)

  return { items, page, limit }
}
```

**Step 4: Create Handler**

```typescript
// packages/backend/api-handlers/src/wishlist/list.handler.ts
import { listWishlistItems } from '@repo/api-services/wishlist'
import { WishlistQuerySchema } from '@repo/db/schemas/wishlist'

export interface HandlerContext {
  userId: string
}

export async function handleListWishlist(
  request: Request,
  ctx: HandlerContext
): Promise<Response> {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)
    const query = WishlistQuerySchema.parse(params)

    const result = await listWishlistItems(ctx.userId, query)

    return Response.json(result)
  } catch (error) {
    return handleError(error)
  }
}
```

**Step 5: Create Lambda Adapter**

```typescript
// apps/api/endpoints/wishlist/list/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { handleListWishlist } from '@repo/api-handlers/wishlist'
import { toLambdaRequest, fromLambdaResponse, getUserId } from '@repo/lambda-adapter'

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event)
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const request = toLambdaRequest(event)
  const response = await handleListWishlist(request, { userId })
  return fromLambdaResponse(response)
}
```

**Step 6: Add to serverless.yml**

```yaml
# apps/api/serverless.yml
functions:
  wishlistList:
    handler: endpoints/wishlist/list/handler.handler
    events:
      - http:
          path: /api/wishlist
          method: get
          authorizer: cognitoAuthorizer
```

**Step 7: Create RTK Query Hook**

```typescript
// packages/core/api-client/src/rtk/wishlist-api.ts
export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Wishlist'],
  endpoints: (builder) => ({
    getWishlist: builder.query<WishlistListResponse, Partial<WishlistQuery>>({
      query: (params) => ({ url: '/wishlist', params }),
      providesTags: [{ type: 'Wishlist', id: 'LIST' }],
    }),
  }),
})

export const { useGetWishlistQuery } = wishlistApi
```

---

### Adding a New UI Component

**Step 1: Create Component Directory**

```
apps/web/main-app/src/routes/wishlist/-components/
  WishlistCard/
    index.tsx           # Main component
    __tests__/
      WishlistCard.test.tsx
    __types__/
      index.ts          # Zod schemas for props
```

**Step 2: Define Types with Zod**

```typescript
// __types__/index.ts
import { z } from 'zod'
import { WishlistItemSchema } from '@repo/api-client/schemas/wishlist'

export const WishlistCardPropsSchema = z.object({
  item: WishlistItemSchema,
  onView: z.function().args(z.string()).returns(z.void()).optional(),
  onEdit: z.function().args(z.string()).returns(z.void()).optional(),
  onRemove: z.function().args(z.string()).returns(z.void()).optional(),
})

export type WishlistCardProps = z.infer<typeof WishlistCardPropsSchema>
```

**Step 3: Implement Component**

```typescript
// index.tsx
import { Card, Badge, Button, DropdownMenu } from '@repo/ui'
import { MoreVertical, Eye, Pencil, Trash } from 'lucide-react'
import type { WishlistCardProps } from './__types__'

export function WishlistCard({ item, onView, onEdit, onRemove }: WishlistCardProps) {
  return (
    <Card className="group relative">
      <img
        src={item.imageUrl ?? '/placeholder.png'}
        alt={item.title}
        className="aspect-[4/3] object-cover"
      />
      <div className="p-4">
        <h3 className="font-semibold">{item.title}</h3>
        <Badge variant="secondary">{item.store}</Badge>
        {item.price && (
          <span className="font-bold">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(item.price)}
          </span>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          {/* ... menu items */}
        </DropdownMenu>
      </div>
    </Card>
  )
}
```

**Step 4: Write Tests**

```typescript
// __tests__/WishlistCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { WishlistCard } from '../index'

const mockItem = {
  id: '123',
  title: 'LEGO Castle',
  store: 'LEGO',
  price: 149.99,
  imageUrl: '/test.png',
}

describe('WishlistCard', () => {
  it('renders item title and store', () => {
    render(<WishlistCard item={mockItem} />)

    expect(screen.getByText('LEGO Castle')).toBeInTheDocument()
    expect(screen.getByText('LEGO')).toBeInTheDocument()
  })

  it('formats price correctly', () => {
    render(<WishlistCard item={mockItem} />)

    expect(screen.getByText('$149.99')).toBeInTheDocument()
  })

  it('calls onView when clicked', () => {
    const handleView = vi.fn()
    render(<WishlistCard item={mockItem} onView={handleView} />)

    fireEvent.click(screen.getByRole('button', { name: /view/i }))
    expect(handleView).toHaveBeenCalledWith('123')
  })
})
```

---

### Adding a Database Field

When adding a field to an existing table:

**Step 1: Update Schema**

```typescript
// packages/backend/db/src/schema.ts
export const wishlistItems = pgTable('wishlist_items', {
  // ... existing fields
  priority: integer('priority').default(0).notNull(),  // NEW
})
```

**Step 2: Generate Migration**

```bash
pnpm --filter @repo/db generate
# Review the generated migration in drizzle/migrations/
```

**Step 3: Update Zod Schema**

```typescript
// packages/backend/db/src/schemas/wishlist.ts
export const WishlistItemSchema = z.object({
  // ... existing fields
  priority: z.number().int().min(0).max(5).default(0),  // NEW
})
```

**Step 4: Update Services (if business logic needed)**

```typescript
// packages/backend/api-services/src/wishlist/update-service.ts
export async function updateWishlistPriority(
  userId: string,
  itemId: string,
  priority: number
): Promise<WishlistItem> {
  // Implementation
}
```

**Step 5: Update UI Components**

```typescript
// Add priority display/edit to WishlistCard
{item.priority >= 4 && (
  <Badge variant="destructive">High Priority</Badge>
)}
```

---

### Creating a Full Feature (Vertical Slice)

For a complete feature like "Wishlist Priority Sorting":

**1. Story Tasks:**
- [ ] Database: Add `priority` and `sortOrder` fields
- [ ] API: Add reorder endpoint
- [ ] UI: Add drag-and-drop reorder
- [ ] UI: Add priority badges
- [ ] Tests: Full coverage

**2. Implementation Order:**

```mermaid
graph TB
    A[1. DB Migration] --> B[2. Zod Schemas]
    B --> C[3. API Service]
    C --> D[4. API Handler]
    D --> E[5. Lambda Adapter]
    E --> F[6. RTK Query Hook]
    F --> G[7. UI Component]
    G --> H[8. Tests]
```

**3. Using /implement:**

```bash
# The skill handles all of this
/implement wish-2003 --parallel --deep-review
```

---

## 7. Troubleshooting

### Common Issues and Solutions

#### Docker/Database Issues

**Problem:** Cannot connect to database

```bash
# Check if Docker is running
docker ps

# Check container logs
docker logs lego-moc-postgres

# Restart containers
docker compose -f docker/docker-compose.local.yml down
docker compose -f docker/docker-compose.local.yml up -d

# Verify connection
psql postgresql://lego_moc_user:local_dev_password@localhost:5432/lego_moc_db
```

#### Type Errors

**Problem:** Type mismatch between packages

```bash
# Rebuild all packages
pnpm build

# Check for circular dependencies
pnpm check-types:all 2>&1 | head -50

# Clean and rebuild
pnpm clean && pnpm install && pnpm build
```

#### Test Failures

**Problem:** Tests fail locally but pass in CI

```bash
# Run tests in isolation
pnpm test -- --run --reporter=verbose

# Check for test pollution
pnpm test -- --run --sequence.shuffle

# Run specific test file
pnpm test -- path/to/test.test.ts
```

#### Lint Errors

**Problem:** ESLint errors after changes

```bash
# Auto-fix what's possible
pnpm lint:fix

# Check specific file
pnpm lint -- path/to/file.ts

# Disable rule for specific line (last resort)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
```

#### Git Worktree Issues

**Problem:** Worktree stuck or corrupted

```bash
# List worktrees
git worktree list

# Prune stale references
git worktree prune

# Remove specific worktree
git worktree remove tree/feature-name --force
```

### Where to Get Help

| Issue Type | Resource |
|------------|----------|
| Architecture questions | `/architect` agent |
| Story clarification | `/sm` agent |
| Code review | `/qa` agent or `/review-pr` |
| Build issues | Check `turbo.json` and package dependencies |
| AWS issues | Check CloudWatch logs |

---

## 8. Examples

### Reference: Well-Structured Stories

The wishlist stories in `/docs/stories/epic-6-wishlist/wish-200*.md` demonstrate the consolidated story format:

| Story | Description | Key Patterns |
|-------|-------------|--------------|
| `wish-2000` | Database schema + types | Foundation story |
| `wish-2001` | Gallery MVP (vertical slice) | Consolidates gallery + card + API |
| `wish-2002` | Add item flow | Form + validation + API |
| `wish-2003` | Detail + edit pages | CRUD operations |
| `wish-2004` | Modals + transitions | UX polish |
| `wish-2005` | UX polish | Empty states, loading |
| `wish-2006` | Accessibility | Keyboard nav, screen reader |

### Reference: Foundation Stories

The housekeeping stories in `/docs/stories/epic-0-housekeeping/hskp-200*.md` show infrastructure patterns:

| Story | Description | Key Patterns |
|-------|-------------|--------------|
| `hskp-2000` | API service extraction | Hexagonal architecture |
| `hskp-2001` | Express local dev | Docker + Express setup |
| `hskp-2002` | MCP server infrastructure | AI tooling foundation |
| `hskp-2003` | Drizzle MCP server | Schema context for AI |
| `hskp-2004` | Serverless MCP server | Lambda config for AI |
| `hskp-2005` | Scaffold endpoint skill | Code generation |
| `hskp-2006` | Scaffold feature skill | Vertical slice generation |

---

## Quick Reference Card

### Daily Development Commands

```bash
# Start local environment
docker compose -f docker/docker-compose.local.yml up -d
pnpm dev:local

# Before committing
pnpm test && pnpm check-types && pnpm lint

# Start new feature
/wt-new   # or /start-feature

# Implement story
/develop wish-2001 --parallel

# Create PR
/commit && git push -u origin $(git branch --show-current)
gh pr create

# After merge
/implement wish-2001 --complete
```

### Key File Locations

```
/CLAUDE.md                           # Project conventions
/docs/FEATURE-DEVELOPMENT-WORKFLOW.md # This document
/docs/stories/                        # User stories
/docs/prd/                           # Product requirements
/docs/architecture/                   # Technical docs
/.claude/skills/                     # Available skills
/.bmad-core/                         # BMAD framework
```

### Quality Gates

| Check | Command | Required |
|-------|---------|----------|
| Tests pass | `pnpm test` | Yes |
| Types valid | `pnpm check-types` | Yes |
| Lint clean | `pnpm lint` | Yes |
| Coverage 45%+ | `pnpm test --coverage` | Yes |
| QA review | `/qa-gate` | Recommended |

---

*Document Version: 1.0*
*Last Updated: 2025-12-27*
*Covers: API Portability, AI Automation, Consolidated Stories*
