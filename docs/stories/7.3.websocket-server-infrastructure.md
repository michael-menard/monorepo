# Story 7.3: WebSocket Server Infrastructure

## Status

Draft

## Story

**As a** backend developer,
**I want** a socket.io WebSocket server with authentication and room management,
**so that** the dashboard can receive real-time updates when data changes.

## Acceptance Criteria

1. ✅ socket.io server configured on `/dashboard` namespace
2. ✅ Handshake authenticates using JWT token (same as REST API)
3. ✅ On successful auth, client joins `user:<userId>` room
4. ✅ On auth failure, emits `connect_error` with code `AUTH_FAILED` and closes connection
5. ✅ Server can emit events to specific user rooms
6. ✅ All events use `DashboardEvent` envelope format
7. ✅ Server emits supported event types: `dashboard:summaryUpdated`, `dashboard:recentMocAdded`, `dashboard:partialPartsUpdated`, `dashboard:themeBreakdownUpdated`, `dashboard:error`
8. ✅ Events only sent to authenticated user's room
9. ✅ Connection lifecycle logged with structured logging
10. ✅ Unit tests for connection, authentication, and event emission

## Tasks / Subtasks

- [ ] **Task 1: Add socket.io Dependencies** (AC: 1)
  - [ ] Add `socket.io` to `apps/api/package.json`
  - [ ] Add `@types/socket.io` as dev dependency
  - [ ] Verify compatibility with AWS Lambda/API Gateway WebSocket

- [ ] **Task 2: Create WebSocket Namespace Handler** (AC: 1, 2)
  - [ ] Create `apps/api/endpoints/websocket/dashboard/` directory
  - [ ] Create `namespace.ts` for `/dashboard` namespace setup
  - [ ] Configure socket.io with CORS settings

- [ ] **Task 3: Implement Connection Authentication** (AC: 2, 3, 4)
  - [ ] Create `middleware/auth.ts` for socket.io auth middleware
  - [ ] Extract JWT from handshake `auth` object or query params
  - [ ] Verify token using existing `@repo/lambda-auth`
  - [ ] On success: attach `userId` to socket, join `user:<userId>` room
  - [ ] On failure: emit `connect_error` with `AUTH_FAILED`, disconnect

- [ ] **Task 4: Implement Room Management** (AC: 3, 5, 8)
  - [ ] Create `rooms.ts` with room helper functions
  - [ ] `joinUserRoom(socket, userId)` - join user-specific room
  - [ ] `emitToUser(userId, event, payload)` - emit to user's room
  - [ ] Ensure events only go to authenticated user's room

- [ ] **Task 5: Create Event Emitter Functions** (AC: 6, 7)
  - [ ] Create `events.ts` with typed event emitters
  - [ ] `emitSummaryUpdated(userId, summary)` - emit `dashboard:summaryUpdated`
  - [ ] `emitRecentMocAdded(userId, moc)` - emit `dashboard:recentMocAdded`
  - [ ] `emitPartialPartsUpdated(userId, mocs)` - emit `dashboard:partialPartsUpdated`
  - [ ] `emitThemeBreakdownUpdated(userId, themes)` - emit `dashboard:themeBreakdownUpdated`
  - [ ] `emitError(userId, code, message)` - emit `dashboard:error`
  - [ ] All events wrapped in `DashboardEvent` envelope

- [ ] **Task 6: Implement Event Envelope** (AC: 6)
  - [ ] Create `envelope.ts` with `createDashboardEvent()` function
  - [ ] Generate `eventId` (UUID)
  - [ ] Add `timestamp` (ISO string)
  - [ ] Validate payload against schema before emission

- [ ] **Task 7: Add Connection Lifecycle Logging** (AC: 9)
  - [ ] Log connection attempts with user info
  - [ ] Log successful connections
  - [ ] Log authentication failures
  - [ ] Log disconnections with reason
  - [ ] Use structured logging with `@repo/logger`

- [ ] **Task 8: Configure Lambda WebSocket Integration** (AC: 1)
  - [ ] Update `serverless.yml` with WebSocket API Gateway
  - [ ] Configure `$connect`, `$disconnect`, `$default` routes
  - [ ] Set up connection management with DynamoDB (if needed)

- [ ] **Task 9: Write Unit Tests** (AC: 10)
  - [ ] Test successful connection flow
  - [ ] Test auth failure disconnects client
  - [ ] Test room joining on connection
  - [ ] Test event emission to correct room
  - [ ] Test event envelope format

## Dev Notes

### Source Tree Location
[Source: architecture/source-tree.md#backend-api]

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

### socket.io Namespace Pattern
[Source: docs/prd/dashboard-realtime-prd.md#9-websocket-requirements]

```typescript
// apps/api/endpoints/websocket/dashboard/namespace.ts
import { Server, Namespace, Socket } from 'socket.io'
import { authMiddleware } from './middleware/auth'
import { joinUserRoom } from './rooms'
import { logger } from '@repo/logger'

export const createDashboardNamespace = (io: Server): Namespace => {
  const dashboard = io.of('/dashboard')

  // Apply authentication middleware
  dashboard.use(authMiddleware)

  dashboard.on('connection', (socket: Socket) => {
    const userId = socket.data.userId

    logger.info('Dashboard WebSocket connected', { userId, socketId: socket.id })

    // Join user-specific room
    joinUserRoom(socket, userId)

    socket.on('disconnect', (reason) => {
      logger.info('Dashboard WebSocket disconnected', { userId, socketId: socket.id, reason })
    })
  })

  return dashboard
}
```

### Authentication Middleware
[Source: docs/prd/dashboard-realtime-prd.md#D-WS-2]

```typescript
// apps/api/endpoints/websocket/dashboard/middleware/auth.ts
import { Socket } from 'socket.io'
import { verifyToken, extractUserIdFromToken } from '@repo/lambda-auth'
import { logger } from '@repo/logger'

export const authMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token

    if (!token) {
      logger.warn('WebSocket auth failed: No token provided', { socketId: socket.id })
      return next(createAuthError('AUTH_FAILED', 'No authentication token provided'))
    }

    const decoded = await verifyToken(token as string)
    const userId = extractUserIdFromToken(decoded)

    if (!userId) {
      logger.warn('WebSocket auth failed: Invalid token', { socketId: socket.id })
      return next(createAuthError('AUTH_FAILED', 'Invalid authentication token'))
    }

    // Attach userId to socket for later use
    socket.data.userId = userId
    next()
  } catch (error) {
    logger.error('WebSocket auth error', { error, socketId: socket.id })
    next(createAuthError('AUTH_FAILED', 'Authentication failed'))
  }
}

const createAuthError = (code: string, message: string): Error => {
  const error = new Error(message)
  ;(error as any).data = { code }
  return error
}
```

### Event Envelope Format
[Source: docs/prd/dashboard-realtime-prd.md#D-WS-5]

```typescript
// apps/api/endpoints/websocket/dashboard/envelope.ts
import { v4 as uuidv4 } from 'uuid'
import { DashboardEventSchema } from '@repo/dashboard-types'

export const createDashboardEvent = <T>(type: string, payload: T) => {
  const event = {
    eventId: uuidv4(),
    type,
    timestamp: new Date().toISOString(),
    payload,
  }

  // Validate before sending
  return DashboardEventSchema.parse(event)
}
```

### Event Emission Functions
[Source: docs/prd/dashboard-realtime-prd.md#D-WS-6]

```typescript
// apps/api/endpoints/websocket/dashboard/events.ts
import { Namespace } from 'socket.io'
import { createDashboardEvent } from './envelope'
import { DashboardSummary, RecentMoc, PartialPartsMoc, ThemeStats } from '@repo/dashboard-types'

let dashboardNamespace: Namespace | null = null

export const setDashboardNamespace = (ns: Namespace) => {
  dashboardNamespace = ns
}

export const emitSummaryUpdated = (userId: string, summary: DashboardSummary) => {
  const event = createDashboardEvent('dashboard:summaryUpdated', summary)
  dashboardNamespace?.to(`user:${userId}`).emit('dashboard:summaryUpdated', event)
}

export const emitRecentMocAdded = (userId: string, moc: RecentMoc) => {
  const event = createDashboardEvent('dashboard:recentMocAdded', moc)
  dashboardNamespace?.to(`user:${userId}`).emit('dashboard:recentMocAdded', event)
}

export const emitPartialPartsUpdated = (userId: string, mocs: PartialPartsMoc[]) => {
  const event = createDashboardEvent('dashboard:partialPartsUpdated', mocs)
  dashboardNamespace?.to(`user:${userId}`).emit('dashboard:partialPartsUpdated', event)
}

export const emitThemeBreakdownUpdated = (userId: string, themes: ThemeStats[]) => {
  const event = createDashboardEvent('dashboard:themeBreakdownUpdated', themes)
  dashboardNamespace?.to(`user:${userId}`).emit('dashboard:themeBreakdownUpdated', event)
}

export const emitError = (userId: string, code: string, message: string) => {
  const event = createDashboardEvent('dashboard:error', { code, message })
  dashboardNamespace?.to(`user:${userId}`).emit('dashboard:error', event)
}
```

### AWS API Gateway WebSocket Configuration

```yaml
# serverless.yml additions for WebSocket
websocketApi:
  dashboard:
    route: $connect
    handler: endpoints/websocket/dashboard/connect.handler

  dashboardDisconnect:
    route: $disconnect
    handler: endpoints/websocket/dashboard/disconnect.handler

  dashboardDefault:
    route: $default
    handler: endpoints/websocket/dashboard/default.handler
```

### PRD Requirements Reference
[Source: docs/prd/dashboard-realtime-prd.md#9-websocket-requirements]

- D-WS-1: Use socket.io namespace `/dashboard`
- D-WS-2: Authenticate during handshake using existing auth (JWT/cookie)
- D-WS-3: On success, join room `user:<userId>`
- D-WS-4: On auth failure, emit `connect_error` with code `AUTH_FAILED`
- D-WS-5: All events use DashboardEvent envelope
- D-WS-6: Supported event types defined
- D-WS-7: Server only emits to `user:<userId>` room
- D-WS-8: Client ignores unknown event types but logs them

## Testing

### Test File Location
`apps/api/endpoints/websocket/dashboard/__tests__/`

### Test Standards
[Source: architecture/testing-strategy.md#unit-tests]

```typescript
// __tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authMiddleware } from '../middleware/auth'

describe('WebSocket Auth Middleware', () => {
  it('should attach userId to socket on valid token', async () => {
    const mockSocket = {
      handshake: { auth: { token: 'valid-jwt-token' } },
      data: {},
      id: 'test-socket-id',
    }
    const next = vi.fn()

    vi.mocked(verifyToken).mockResolvedValue({ sub: 'user-123' })

    await authMiddleware(mockSocket as any, next)

    expect(mockSocket.data.userId).toBe('user-123')
    expect(next).toHaveBeenCalledWith()
  })

  it('should call next with error on missing token', async () => {
    const mockSocket = {
      handshake: { auth: {} },
      data: {},
      id: 'test-socket-id',
    }
    const next = vi.fn()

    await authMiddleware(mockSocket as any, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('No authentication token'),
    }))
  })

  it('should call next with AUTH_FAILED error code on invalid token', async () => {
    const mockSocket = {
      handshake: { auth: { token: 'invalid-token' } },
      data: {},
      id: 'test-socket-id',
    }
    const next = vi.fn()

    vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'))

    await authMiddleware(mockSocket as any, next)

    const error = next.mock.calls[0][0]
    expect(error.data.code).toBe('AUTH_FAILED')
  })
})
```

```typescript
// __tests__/events.test.ts
import { describe, it, expect, vi } from 'vitest'
import { emitSummaryUpdated, setDashboardNamespace } from '../events'

describe('Event Emission', () => {
  it('should emit to correct user room with envelope format', () => {
    const mockEmit = vi.fn()
    const mockTo = vi.fn(() => ({ emit: mockEmit }))
    const mockNamespace = { to: mockTo }

    setDashboardNamespace(mockNamespace as any)

    const summary = {
      totalMocs: 10,
      totalWishlistItems: 5,
      mocsByBuildStatus: { ADDED: 3, IN_PROGRESS: 4, BUILT: 3 },
      mocsByCoverageStatus: { FULL_INVENTORY: 2, PARTIAL_ORDERED: 5, NONE: 3 },
    }

    emitSummaryUpdated('user-123', summary)

    expect(mockTo).toHaveBeenCalledWith('user:user-123')
    expect(mockEmit).toHaveBeenCalledWith(
      'dashboard:summaryUpdated',
      expect.objectContaining({
        eventId: expect.any(String),
        type: 'dashboard:summaryUpdated',
        timestamp: expect.any(String),
        payload: summary,
      })
    )
  })
})
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial draft | SM Agent (Bob) |
