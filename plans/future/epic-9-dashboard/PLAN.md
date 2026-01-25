# Epic 9: Real-Time Dashboard

## Overview

This epic implements a real-time dashboard for the LEGO MOC instructions platform. Users will see their collection status at a glance with live updates via WebSocket when data changes, falling back to polling when connectivity is degraded.

## Tech Stack

- **Backend**: AWS Lambda, socket.io (WebSocket), Aurora PostgreSQL
- **Frontend**: React 19, RTK Query, socket.io-client
- **Shared**: Zod schemas for type safety and runtime validation
- **Testing**: Vitest (unit/integration), Playwright with Gherkin (E2E)

## Stories

| ID | Title | Description | Dependencies |
|----|-------|-------------|--------------|
| DASH-1000 | Dashboard Data Types & Zod Schemas | Shared TypeScript types and Zod schemas for all dashboard data structures | None |
| DASH-1001 | Dashboard REST API Endpoint | `GET /api/dashboard` endpoint returning complete dashboard snapshot | DASH-1000 |
| DASH-1002 | WebSocket Server Infrastructure | socket.io WebSocket server with authentication and room management | DASH-1000 |
| DASH-1003 | Dashboard UI Shell & Layout | Dashboard page with layout structure, Quick Actions, and loading states | DASH-1000 |
| DASH-1004 | Dashboard Cards & Data Display | Collection Summary, Theme Breakdown, Recent MOCs, and Partial Parts UI | DASH-1000, DASH-1001, DASH-1003 |
| DASH-1005 | WebSocket Client & Event Handling | Real-time updates via WebSocket connection and event handlers | DASH-1002, DASH-1004 |
| DASH-1006 | Client Resilience & Fallback | Graceful degradation, auto-reconnect, and polling fallback | DASH-1005 |
| DASH-1007 | Dashboard Integration & E2E Tests | Comprehensive integration, E2E, and performance tests | All above |

## Implementation Order

```
Phase 1: Foundation
├── DASH-1000: Dashboard Data Types & Zod Schemas

Phase 2: Backend (can run in parallel)
├── DASH-1001: Dashboard REST API Endpoint
└── DASH-1002: WebSocket Server Infrastructure

Phase 3: Frontend Core
├── DASH-1003: Dashboard UI Shell & Layout
└── DASH-1004: Dashboard Cards & Data Display

Phase 4: Real-Time Integration
├── DASH-1005: WebSocket Client & Event Handling
└── DASH-1006: Client Resilience & Fallback

Phase 5: Quality Assurance
└── DASH-1007: Dashboard Integration & E2E Tests
```

---

## DASH-1000: Dashboard Data Types & Zod Schemas

### User Story
**As a** developer, **I want** shared TypeScript types and Zod schemas for all dashboard data structures, **so that** both backend and frontend have a single source of truth for dashboard data validation and type safety.

### Acceptance Criteria
1. `DashboardView` Zod schema defined with all nested types
2. `DashboardSummary` schema with `totalMocs`, `totalWishlistItems`, `mocsByBuildStatus`, `mocsByCoverageStatus`
3. `ThemeStats` schema with `theme`, `mocCount`, `setCount`
4. `RecentMoc` schema with `id`, `title`, `theme`, `buildStatus`, `coverImageUrl`, `createdAt`
5. `PartialPartsMoc` schema with `id`, `title`, `theme`, `buildStatus`, `coveragePercentage`, `lastUpdatedAt`
6. `BuildStatus` enum: `ADDED`, `IN_PROGRESS`, `BUILT`
7. `PartsCoverageStatus` enum: `FULL_INVENTORY`, `PARTIAL_ORDERED`, `NONE`
8. `DashboardEvent` envelope schema for WebSocket events
9. All types exported and usable in both `apps/api` and `apps/web/main-app`
10. Unit tests for all schema validations

### Source Tree
```
packages/core/dashboard-types/
├── src/
│   ├── enums.ts           # BuildStatus, PartsCoverageStatus
│   ├── schemas.ts         # All Zod schemas
│   ├── events.ts          # WebSocket event schemas
│   ├── index.ts           # Package exports
│   └── __tests__/
│       └── schemas.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Key Types
```typescript
export const BuildStatusSchema = z.enum(['ADDED', 'IN_PROGRESS', 'BUILT'])
export type BuildStatus = z.infer<typeof BuildStatusSchema>

export const DashboardSummarySchema = z.object({
  totalMocs: z.number().int().min(0),
  totalWishlistItems: z.number().int().min(0),
  mocsByBuildStatus: z.record(BuildStatusSchema, z.number().int().min(0)),
  mocsByCoverageStatus: z.record(PartsCoverageStatusSchema, z.number().int().min(0)),
})
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>

export const DashboardEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.string(),
  timestamp: z.string().datetime(),
  payload: z.unknown(),
})
```

---

## DASH-1001: Dashboard REST API Endpoint

### User Story
**As a** frontend developer, **I want** a single REST endpoint that returns all dashboard data, **so that** I can fetch the complete dashboard snapshot in one request.

### Acceptance Criteria
1. `GET /api/dashboard` endpoint exists and is protected by auth
2. Returns `DashboardView` JSON matching the schema from DASH-1000
3. `summary` contains accurate `totalMocs`, `totalWishlistItems`, and status breakdowns
4. `themeBreakdown` returns `mocCount` and `setCount` per theme
5. `recentMocs` returns last 10 MOCs ordered by `created_at DESC`
6. `partialPartsMocs` returns all MOCs with `parts_coverage_status = PARTIAL_ORDERED`
7. Returns `401 Unauthorized` for unauthenticated requests
8. Returns `403 Forbidden` for requests accessing another user's data
9. Returns `500 Internal Server Error` with standard error body on failures
10. p95 latency under 600ms under normal load
11. Unit tests cover all response scenarios

### Source Tree
```
apps/api/endpoints/dashboard/
├── get.ts                 # GET /api/dashboard handler
└── __tests__/
    └── get.test.ts
```

### Key Implementation
```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = extractUserId(event)
  if (!userId) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
  }

  const [summary, themeBreakdown, recentMocs, partialPartsMocs] = await Promise.all([
    fetchDashboardSummary(userId),
    fetchThemeBreakdown(userId),
    fetchRecentMocs(userId, 10),
    fetchPartialPartsMocs(userId),
  ])

  const validated = DashboardViewSchema.parse({ summary, themeBreakdown, recentMocs, partialPartsMocs })
  return createResponse(200, validated)
}
```

---

## DASH-1002: WebSocket Server Infrastructure

### User Story
**As a** backend developer, **I want** a socket.io WebSocket server with authentication and room management, **so that** the dashboard can receive real-time updates when data changes.

### Acceptance Criteria
1. socket.io server configured on `/dashboard` namespace
2. Handshake authenticates using JWT token (same as REST API)
3. On successful auth, client joins `user:<userId>` room
4. On auth failure, emits `connect_error` with code `AUTH_FAILED` and closes connection
5. Server can emit events to specific user rooms
6. All events use `DashboardEvent` envelope format
7. Server emits supported event types: `dashboard:summaryUpdated`, `dashboard:recentMocAdded`, `dashboard:partialPartsUpdated`, `dashboard:themeBreakdownUpdated`, `dashboard:error`
8. Events only sent to authenticated user's room
9. Connection lifecycle logged with structured logging
10. Unit tests for connection, authentication, and event emission

### Source Tree
```
apps/api/endpoints/websocket/dashboard/
├── namespace.ts           # socket.io namespace setup
├── middleware/
│   └── auth.ts            # Authentication middleware
├── rooms.ts               # Room management
├── events.ts              # Event emitter functions
├── envelope.ts            # Event envelope creator
└── __tests__/
    ├── namespace.test.ts
    ├── auth.test.ts
    └── events.test.ts
```

### Event Types
- `dashboard:summaryUpdated` - Summary counts changed
- `dashboard:recentMocAdded` - New MOC created
- `dashboard:partialPartsUpdated` - Parts coverage changed
- `dashboard:themeBreakdownUpdated` - Theme stats changed
- `dashboard:error` - Error notification

---

## DASH-1003: Dashboard UI Shell & Layout

### User Story
**As a** user, **I want** a dashboard page with a clear layout structure, **so that** I can see my collection status at a glance with consistent navigation.

### Acceptance Criteria
1. Dashboard page accessible at `/dashboard` route
2. Page uses existing app shell (Header, Sidebar, Footer)
3. Dashboard layout has defined grid/flex areas for cards
4. Quick Actions card displays with static buttons: "Add New MOC", "Browse Gallery", "View Wishlist"
5. Quick Actions buttons navigate to correct routes
6. Responsive layout works on mobile (single column) and desktop (multi-column grid)
7. Dashboard module lazy-loaded for code splitting
8. Loading skeleton displays while dashboard data loads
9. Unit tests verify layout and navigation

### Source Tree
```
apps/web/dashboard-app/
├── src/
│   ├── pages/
│   │   └── DashboardPage.tsx
│   ├── components/
│   │   ├── DashboardLayout.tsx
│   │   ├── DashboardSkeleton.tsx
│   │   └── QuickActionsCard.tsx
│   ├── index.ts
│   └── __tests__/
│       ├── DashboardPage.test.tsx
│       └── QuickActionsCard.test.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Responsive Breakpoints
| Breakpoint | Columns | Card Layout |
|------------|---------|-------------|
| Mobile (`< 768px`) | 1 | Stacked |
| Tablet (`768px - 1024px`) | 2 | 2-column grid |
| Desktop (`> 1024px`) | 3 | 3-column grid |

---

## DASH-1004: Dashboard Cards & Data Display

### User Story
**As a** user, **I want** to see my collection summary, theme breakdown, recent MOCs, and partial parts status, **so that** I can understand my collection at a glance and track build progress.

### Acceptance Criteria
1. Collection Summary Card shows `totalMocs`, `totalWishlistItems`
2. Collection Summary Card shows MOCs by build status (ADDED, IN_PROGRESS, BUILT)
3. Collection Summary Card shows MOCs by coverage status (FULL_INVENTORY, PARTIAL_ORDERED, NONE)
4. Theme Breakdown Card shows per-theme `mocCount` and `setCount`
5. Recent MOCs Card shows last 10 MOCs with title, theme, status, cover image, date
6. Recent MOCs Card items are clickable and navigate to MOC detail
7. Partial Parts Table shows MOCs with PARTIAL_ORDERED status
8. Partial Parts Table shows coverage percentage and last updated timestamp
9. All cards fetch data from `GET /api/dashboard` on mount
10. RTK Query used for data fetching with caching
11. Empty states displayed when no data available
12. Unit tests for all card components

### Source Tree
```
apps/web/dashboard-app/src/
├── components/
│   ├── CollectionSummaryCard.tsx
│   ├── ThemeBreakdownCard.tsx
│   ├── RecentMocsCard.tsx
│   ├── PartialPartsTable.tsx
│   └── EmptyState.tsx
├── store/
│   └── dashboardApi.ts
└── __tests__/
    ├── CollectionSummaryCard.test.tsx
    ├── ThemeBreakdownCard.test.tsx
    ├── RecentMocsCard.test.tsx
    └── PartialPartsTable.test.tsx
```

### RTK Query API
```typescript
export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Dashboard'],
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardView, void>({
      query: () => '/dashboard',
      transformResponse: (response: unknown) => DashboardViewSchema.parse(response),
      providesTags: ['Dashboard'],
    }),
  }),
})
```

---

## DASH-1005: WebSocket Client & Event Handling

### User Story
**As a** user, **I want** the dashboard to update in real-time when my data changes, **so that** I always see current information without manually refreshing.

### Acceptance Criteria
1. socket.io client connects to `/dashboard` namespace on page mount
2. Client authenticates with JWT token in handshake
3. Client handles `dashboard:summaryUpdated` events and updates Summary Card
4. Client handles `dashboard:recentMocAdded` events and prepends to Recent MOCs list
5. Client handles `dashboard:partialPartsUpdated` events and replaces Partial Parts table
6. Client handles `dashboard:themeBreakdownUpdated` events and updates Theme Card
7. Client handles `dashboard:error` events and displays toast notification
8. Client logs unknown event types without crashing
9. Client disconnects cleanly on page unmount
10. RTK Query cache updated from WebSocket events
11. Unit tests for event handlers and state updates

### Source Tree
```
apps/web/dashboard-app/src/
├── hooks/
│   ├── useDashboardSocket.ts
│   └── useDashboardEvents.ts
├── components/
│   └── ConnectionStatus.tsx
└── __tests__/
    ├── useDashboardSocket.test.ts
    └── useDashboardEvents.test.ts
```

### Key Hooks
```typescript
// Connection hook
export const useDashboardSocket = (): UseSocketReturn => {
  // Connect to /dashboard namespace with JWT auth
  // Return socket instance, connection status, and errors
}

// Event handlers hook
export const useDashboardEvents = (socket: Socket | null) => {
  // Subscribe to all dashboard event types
  // Update RTK Query cache via util.updateQueryData
}
```

---

## DASH-1006: Client Resilience & Fallback

### User Story
**As a** user, **I want** the dashboard to gracefully handle connection issues, **so that** I still see data and get updates when connectivity is restored.

### Acceptance Criteria
1. socket.io auto-reconnect enabled with exponential backoff (start 1s, max 30s, jitter)
2. On `AUTH_FAILED` error, do not retry; prompt user to re-authenticate
3. On transient disconnect, retry connection automatically
4. On successful reconnect, re-fetch `GET /api/dashboard` then resume events
5. After N (5-10) consecutive failed reconnects, enter degraded mode
6. Degraded mode: show banner and poll `GET /api/dashboard` every 30-60s
7. Degraded mode continues slow reconnect attempts
8. On successful reconnect in degraded mode, stop polling and clear banner
9. Malformed events logged and skipped without tearing down connection
10. Unit tests for all resilience scenarios

### Source Tree
```
apps/web/dashboard-app/src/
├── hooks/
│   ├── useDashboardSocket.ts      # Updated with reconnection
│   ├── useDashboardEvents.ts      # Updated with error handling
│   └── useDegradedMode.ts         # New
├── components/
│   └── DegradedModeBanner.tsx     # New
└── __tests__/
    └── resilience.test.ts         # New
```

### Reconnection Configuration
```typescript
const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,          // Start at 1s
  reconnectionDelayMax: 30000,      // Max 30s
  randomizationFactor: 0.5,         // Add jitter
  timeout: 20000,
}
```

---

## DASH-1007: Dashboard Integration & E2E Tests

### User Story
**As a** QA engineer, **I want** comprehensive integration and E2E tests for the dashboard, **so that** we can verify the entire real-time dashboard flow works correctly.

### Acceptance Criteria
1. Integration tests verify REST API returns correct dashboard data
2. Integration tests verify WebSocket connection and event handling
3. E2E tests verify dashboard loads and displays all cards
4. E2E tests verify real-time updates work (mock backend events)
5. E2E tests verify degraded mode fallback behavior
6. E2E tests written in Gherkin `.feature` files
7. Performance test validates p95 latency < 600ms for REST endpoint
8. Performance test validates real-time latency < 2s from change to client
9. All tests pass in CI pipeline
10. Test coverage meets project thresholds

### Source Tree
```
apps/api/endpoints/dashboard/__tests__/
├── get.test.ts                    # Unit tests
├── dashboard.integration.ts       # Integration tests
└── dashboard.perf.ts              # Performance tests

apps/api/endpoints/websocket/dashboard/__tests__/
├── auth.test.ts                   # Unit tests
├── events.test.ts                 # Unit tests
└── websocket.integration.ts       # Integration tests

apps/web/playwright/
├── features/
│   └── dashboard/
│       └── dashboard.feature      # Gherkin E2E tests
├── steps/
│   └── dashboard.steps.ts         # Step definitions
└── fixtures/
    └── dashboard.fixtures.ts      # Test fixtures
```

### E2E Test Scenarios
- Dashboard displays all cards on initial load
- Collection Summary shows correct totals
- Recent MOCs display in correct order
- Quick Actions navigate to correct pages
- Real-time update when new MOC is added
- Real-time update for parts coverage change
- Degraded mode activates on connection failure
- Degraded mode clears on reconnection
- Connection status indicator reflects state

### Test Data IDs (data-testid)
| Component | data-testid |
|-----------|-------------|
| Collection Summary Card | `collection-summary-card` |
| Theme Breakdown Card | `theme-breakdown-card` |
| Recent MOCs Card | `recent-mocs-card` |
| Quick Actions Card | `quick-actions-card` |
| Partial Parts Table | `partial-parts-table` |
| Connection Status | `connection-status` |
| Degraded Mode Banner | `degraded-mode-banner` |
| Total MOCs Count | `total-mocs-count` |
| Wishlist Items Count | `wishlist-items-count` |

---

## Non-Functional Requirements

### Performance
- REST API p95 latency: < 600ms
- Real-time event latency: < 2s from change to client render

### Reliability
- Automatic reconnection with exponential backoff
- Graceful degradation to polling when WebSocket unavailable
- Malformed events logged but don't crash the application

### Security
- All endpoints protected by JWT authentication
- User data isolation (users cannot see other users' data)
- WebSocket connections authenticated during handshake

---

## Database Schema Assumptions

The dashboard endpoints assume these columns exist in the `mocs` table:
- `build_status`: ENUM ('ADDED', 'IN_PROGRESS', 'BUILT')
- `parts_coverage_status`: ENUM ('FULL_INVENTORY', 'PARTIAL_ORDERED', 'NONE')
- `coverage_percentage`: INTEGER (0-100)
- `theme`: VARCHAR

If these don't exist, a migration should be added before DASH-1001.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial story drafts | SM Agent (Bob) |
| 2026-01-24 | 0.2 | Consolidated into epic plan | Claude |
