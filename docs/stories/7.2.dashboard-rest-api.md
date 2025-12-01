# Story 7.2: Dashboard REST API Endpoint

## Status

Draft

## Story

**As a** frontend developer,
**I want** a single REST endpoint that returns all dashboard data,
**so that** I can fetch the complete dashboard snapshot in one request.

## Acceptance Criteria

1. ✅ `GET /api/dashboard` endpoint exists and is protected by auth
2. ✅ Returns `DashboardView` JSON matching the schema from Story 7.1
3. ✅ `summary` contains accurate `totalMocs`, `totalWishlistItems`, and status breakdowns
4. ✅ `themeBreakdown` returns `mocCount` and `setCount` per theme
5. ✅ `recentMocs` returns last 10 MOCs ordered by `created_at DESC`
6. ✅ `partialPartsMocs` returns all MOCs with `parts_coverage_status = PARTIAL_ORDERED`
7. ✅ Returns `401 Unauthorized` for unauthenticated requests
8. ✅ Returns `403 Forbidden` for requests accessing another user's data
9. ✅ Returns `500 Internal Server Error` with standard error body on failures
10. ✅ p95 latency under 600ms under normal load
11. ✅ Unit tests cover all response scenarios

## Tasks / Subtasks

- [ ] **Task 1: Create Lambda Handler Structure** (AC: 1)
  - [ ] Create `apps/api/endpoints/dashboard/` directory
  - [ ] Create `get.ts` handler file
  - [ ] Add route to `serverless.yml` as `GET /api/dashboard`
  - [ ] Configure Cognito authorizer on the route

- [ ] **Task 2: Implement Authentication & Authorization** (AC: 7, 8)
  - [ ] Extract user ID from JWT claims
  - [ ] Return 401 if no valid token
  - [ ] Ensure only the authenticated user's data is returned

- [ ] **Task 3: Implement Summary Data Query** (AC: 3)
  - [ ] Query total MOC count for user
  - [ ] Query total wishlist item count for user
  - [ ] Query MOCs grouped by `build_status` with counts
  - [ ] Query MOCs grouped by `parts_coverage_status` with counts
  - [ ] Assemble `DashboardSummary` object

- [ ] **Task 4: Implement Theme Breakdown Query** (AC: 4)
  - [ ] Query MOCs grouped by theme with count
  - [ ] Query sets grouped by theme with count
  - [ ] Combine into `ThemeStats[]` array

- [ ] **Task 5: Implement Recent MOCs Query** (AC: 5)
  - [ ] Query last 10 MOCs by `created_at DESC`
  - [ ] Select: `id`, `title`, `theme`, `build_status`, `cover_image_url`, `created_at`
  - [ ] Map to `RecentMoc[]` array

- [ ] **Task 6: Implement Partial Parts MOCs Query** (AC: 6)
  - [ ] Query all MOCs where `parts_coverage_status = 'PARTIAL_ORDERED'`
  - [ ] Select: `id`, `title`, `theme`, `build_status`, `coverage_percentage`, `updated_at`
  - [ ] Map to `PartialPartsMoc[]` array

- [ ] **Task 7: Assemble Response** (AC: 2)
  - [ ] Combine all query results into `DashboardView`
  - [ ] Validate response against `DashboardViewSchema`
  - [ ] Return 200 with JSON body

- [ ] **Task 8: Implement Error Handling** (AC: 9)
  - [ ] Catch database errors
  - [ ] Log errors with structured logging
  - [ ] Return 500 with standard error body (no internal details exposed)

- [ ] **Task 9: Optimize for Performance** (AC: 10)
  - [ ] Use single database connection from pool
  - [ ] Consider parallel query execution where possible
  - [ ] Add query indexes if needed (document in dev notes)

- [ ] **Task 10: Write Unit Tests** (AC: 11)
  - [ ] Test successful response with valid token
  - [ ] Test 401 for missing/invalid token
  - [ ] Test 403 for unauthorized access attempts
  - [ ] Test 500 for database failures
  - [ ] Test response matches schema

## Dev Notes

### Source Tree Location
[Source: architecture/source-tree.md#backend-api]

```
apps/api/endpoints/dashboard/
├── get.ts                 # GET /api/dashboard handler
└── __tests__/
    └── get.test.ts
```

### Lambda Handler Pattern
[Source: architecture/coding-standards.md#functional-programming-paradigm]

```typescript
// apps/api/endpoints/dashboard/get.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { DashboardViewSchema } from '@repo/dashboard-types'
import { logger } from '@repo/logger'
import { createResponse, createErrorResponse } from '@repo/lambda-responses'
import { verifyToken, extractUserId } from '@repo/lambda-auth'
import { db } from '../../core/database/client'

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and verify user
    const userId = extractUserId(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Fetch all dashboard data
    const [summary, themeBreakdown, recentMocs, partialPartsMocs] = await Promise.all([
      fetchDashboardSummary(userId),
      fetchThemeBreakdown(userId),
      fetchRecentMocs(userId, 10),
      fetchPartialPartsMocs(userId),
    ])

    const dashboardView = {
      summary,
      themeBreakdown,
      recentMocs,
      partialPartsMocs,
    }

    // Validate response
    const validated = DashboardViewSchema.parse(dashboardView)

    return createResponse(200, validated)
  } catch (error) {
    logger.error('Dashboard fetch failed', { error })
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Unable to load dashboard')
  }
}
```

### Database Queries with Drizzle
[Source: architecture/source-tree.md#backend-api]

```typescript
// Example query patterns
import { db } from '../../core/database/client'
import { mocs, wishlistItems, sets } from '../../core/database/schema'
import { eq, desc, sql, count } from 'drizzle-orm'

const fetchDashboardSummary = async (userId: string): Promise<DashboardSummary> => {
  // Total MOCs
  const totalMocs = await db
    .select({ count: count() })
    .from(mocs)
    .where(eq(mocs.userId, userId))
    .then(r => r[0]?.count ?? 0)

  // MOCs by build status
  const mocsByBuildStatus = await db
    .select({
      status: mocs.buildStatus,
      count: count(),
    })
    .from(mocs)
    .where(eq(mocs.userId, userId))
    .groupBy(mocs.buildStatus)

  // ... similar for other aggregations
}
```

### Serverless.yml Route Configuration

```yaml
# apps/api/serverless.yml
functions:
  getDashboard:
    handler: endpoints/dashboard/get.handler
    events:
      - httpApi:
          path: /api/dashboard
          method: GET
          authorizer:
            name: cognitoAuthorizer
```

### PRD Requirements Reference
[Source: docs/prd/dashboard-realtime-prd.md#8-rest-api-requirements]

- D-API-1: Provide `GET /api/dashboard` protected by existing auth
- D-API-2: Return `DashboardView` on success
- D-API-7: Errors: 401 unauthenticated, 403 forbidden, 500 internal error

### Error Response Format

```typescript
// Standard error body
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unable to load dashboard"
  }
}
```

### Database Schema Assumptions

The endpoint assumes these columns exist (or will be added):
- `mocs.build_status`: ENUM ('ADDED', 'IN_PROGRESS', 'BUILT')
- `mocs.parts_coverage_status`: ENUM ('FULL_INVENTORY', 'PARTIAL_ORDERED', 'NONE')
- `mocs.coverage_percentage`: INTEGER (0-100)
- `mocs.theme`: VARCHAR

If these don't exist, a migration story should be added before this story.

## Testing

### Test File Location
`apps/api/endpoints/dashboard/__tests__/get.test.ts`

### Test Standards
[Source: architecture/testing-strategy.md#backend-lambda-handlers]

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../get'
import { createMockEvent, createMockContext } from '@/test/utils'

// Mock database
vi.mock('../../../core/database/client', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}))

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with dashboard data for authenticated user', async () => {
    const event = createMockEvent({
      headers: { authorization: 'Bearer valid-token' },
    })

    const result = await handler(event, createMockContext())

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body).toHaveProperty('summary')
    expect(body).toHaveProperty('themeBreakdown')
    expect(body).toHaveProperty('recentMocs')
    expect(body).toHaveProperty('partialPartsMocs')
  })

  it('returns 401 for unauthenticated request', async () => {
    const event = createMockEvent({ headers: {} })

    const result = await handler(event, createMockContext())

    expect(result.statusCode).toBe(401)
  })

  it('returns 500 on database error', async () => {
    // Setup db mock to throw
    vi.mocked(db.select).mockRejectedValue(new Error('DB connection failed'))

    const event = createMockEvent({
      headers: { authorization: 'Bearer valid-token' },
    })

    const result = await handler(event, createMockContext())

    expect(result.statusCode).toBe(500)
    const body = JSON.parse(result.body)
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })
})
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial draft | SM Agent (Bob) |
