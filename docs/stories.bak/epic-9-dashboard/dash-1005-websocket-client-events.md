# Story 7.6: WebSocket Client & Event Handling

## Status

Draft

## Story

**As a** user,
**I want** the dashboard to update in real-time when my data changes,
**so that** I always see current information without manually refreshing.

## Acceptance Criteria

1. ✅ socket.io client connects to `/dashboard` namespace on page mount
2. ✅ Client authenticates with JWT token in handshake
3. ✅ Client handles `dashboard:summaryUpdated` events and updates Summary Card
4. ✅ Client handles `dashboard:recentMocAdded` events and prepends to Recent MOCs list
5. ✅ Client handles `dashboard:partialPartsUpdated` events and replaces Partial Parts table
6. ✅ Client handles `dashboard:themeBreakdownUpdated` events and updates Theme Card
7. ✅ Client handles `dashboard:error` events and displays toast notification
8. ✅ Client logs unknown event types without crashing
9. ✅ Client disconnects cleanly on page unmount
10. ✅ RTK Query cache updated from WebSocket events
11. ✅ Unit tests for event handlers and state updates

## Tasks / Subtasks

- [ ] **Task 1: Add socket.io Client Dependency** (AC: 1)
  - [ ] Add `socket.io-client` to `apps/web/dashboard-app/package.json`
  - [ ] Add `@types/socket.io-client` as dev dependency

- [ ] **Task 2: Create WebSocket Connection Hook** (AC: 1, 2, 9)
  - [ ] Create `src/hooks/useDashboardSocket.ts`
  - [ ] Connect to `/dashboard` namespace on mount
  - [ ] Pass JWT token in `auth` handshake object
  - [ ] Return connection status and error state
  - [ ] Disconnect on unmount with cleanup

- [ ] **Task 3: Create Event Handlers** (AC: 3, 4, 5, 6, 7, 8)
  - [ ] Create `src/hooks/useDashboardEvents.ts`
  - [ ] Handle `dashboard:summaryUpdated` → update RTK cache
  - [ ] Handle `dashboard:recentMocAdded` → prepend to recentMocs, trim to 10
  - [ ] Handle `dashboard:partialPartsUpdated` → replace partialPartsMocs
  - [ ] Handle `dashboard:themeBreakdownUpdated` → replace themeBreakdown
  - [ ] Handle `dashboard:error` → show toast notification
  - [ ] Log unknown events with `@repo/logger`

- [ ] **Task 4: Integrate RTK Query Cache Updates** (AC: 10)
  - [ ] Use `dashboardApi.util.updateQueryData` for optimistic updates
  - [ ] Create typed update functions for each event type
  - [ ] Ensure type safety with `DashboardView` schema

- [ ] **Task 5: Create Connection Status UI** (AC: 1)
  - [ ] Create `src/components/ConnectionStatus.tsx`
  - [ ] Show indicator when connected (green dot)
  - [ ] Show indicator when disconnected (red dot with retry)
  - [ ] Position in dashboard header area

- [ ] **Task 6: Integrate with Dashboard Page**
  - [ ] Add `useDashboardSocket` hook to `DashboardPage.tsx`
  - [ ] Pass connection status to ConnectionStatus component
  - [ ] Wire up event handlers to update state

- [ ] **Task 7: Write Unit Tests** (AC: 11)
  - [ ] Test socket connection on mount
  - [ ] Test socket disconnection on unmount
  - [ ] Test each event handler updates state correctly
  - [ ] Test unknown events are logged not crashed
  - [ ] Test error events show toast

## Dev Notes

### Source Tree Location
[Source: architecture/source-tree.md#frontend-application]

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

### WebSocket Connection Hook
[Source: architecture/coding-standards.md#react-hooks-best-practices]

```typescript
// apps/web/dashboard-app/src/hooks/useDashboardSocket.ts
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppSelector } from '@/store/hooks'
import { selectAuthToken } from '@/store/slices/authSlice'
import { logger } from '@repo/logger'

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  error: string | null
}

export const useDashboardSocket = (): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = useAppSelector(selectAuthToken)

  useEffect(() => {
    if (!token) {
      logger.warn('No auth token available for WebSocket connection')
      return
    }

    // Create socket connection
    const socket = io('/dashboard', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    })

    socketRef.current = socket

    // Connection event handlers
    socket.on('connect', () => {
      logger.info('Dashboard WebSocket connected', { socketId: socket.id })
      setIsConnected(true)
      setError(null)
    })

    socket.on('disconnect', (reason) => {
      logger.info('Dashboard WebSocket disconnected', { reason })
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      logger.error('Dashboard WebSocket connection error', { error: err.message })
      setError(err.message)
      setIsConnected(false)
    })

    // Cleanup on unmount
    return () => {
      logger.info('Cleaning up Dashboard WebSocket connection')
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  return {
    socket: socketRef.current,
    isConnected,
    error,
  }
}
```

### Event Handlers Hook
[Source: docs/prd/dashboard-realtime-prd.md#D-WS-6]

```typescript
// apps/web/dashboard-app/src/hooks/useDashboardEvents.ts
import { useEffect } from 'react'
import { Socket } from 'socket.io-client'
import { useAppDispatch } from '@/store/hooks'
import { dashboardApi } from '../store/dashboardApi'
import { logger } from '@repo/logger'
import { toast } from '@repo/ui'
import {
  DashboardEvent,
  DashboardSummary,
  RecentMoc,
  PartialPartsMoc,
  ThemeStats,
  DashboardEventSchema,
} from '@repo/dashboard-types'

const RECENT_MOCS_LIMIT = 10

export const useDashboardEvents = (socket: Socket | null) => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!socket) return

    // Handler for summary updates
    const handleSummaryUpdated = (event: DashboardEvent<DashboardSummary>) => {
      try {
        const validated = DashboardEventSchema.parse(event)
        logger.debug('Received summaryUpdated', { eventId: validated.eventId })

        dispatch(
          dashboardApi.util.updateQueryData('getDashboard', undefined, (draft) => {
            draft.summary = validated.payload as DashboardSummary
          })
        )
      } catch (err) {
        logger.error('Invalid summaryUpdated event', { error: err })
      }
    }

    // Handler for new MOC added
    const handleRecentMocAdded = (event: DashboardEvent<RecentMoc>) => {
      try {
        const validated = DashboardEventSchema.parse(event)
        logger.debug('Received recentMocAdded', { eventId: validated.eventId })

        dispatch(
          dashboardApi.util.updateQueryData('getDashboard', undefined, (draft) => {
            // Prepend new MOC and trim to limit
            draft.recentMocs = [
              validated.payload as RecentMoc,
              ...draft.recentMocs.slice(0, RECENT_MOCS_LIMIT - 1),
            ]
          })
        )
      } catch (err) {
        logger.error('Invalid recentMocAdded event', { error: err })
      }
    }

    // Handler for partial parts update
    const handlePartialPartsUpdated = (event: DashboardEvent<PartialPartsMoc[]>) => {
      try {
        const validated = DashboardEventSchema.parse(event)
        logger.debug('Received partialPartsUpdated', { eventId: validated.eventId })

        dispatch(
          dashboardApi.util.updateQueryData('getDashboard', undefined, (draft) => {
            draft.partialPartsMocs = validated.payload as PartialPartsMoc[]
          })
        )
      } catch (err) {
        logger.error('Invalid partialPartsUpdated event', { error: err })
      }
    }

    // Handler for theme breakdown update
    const handleThemeBreakdownUpdated = (event: DashboardEvent<ThemeStats[]>) => {
      try {
        const validated = DashboardEventSchema.parse(event)
        logger.debug('Received themeBreakdownUpdated', { eventId: validated.eventId })

        dispatch(
          dashboardApi.util.updateQueryData('getDashboard', undefined, (draft) => {
            draft.themeBreakdown = validated.payload as ThemeStats[]
          })
        )
      } catch (err) {
        logger.error('Invalid themeBreakdownUpdated event', { error: err })
      }
    }

    // Handler for error events
    const handleError = (event: DashboardEvent<{ code: string; message: string }>) => {
      try {
        const validated = DashboardEventSchema.parse(event)
        logger.warn('Dashboard error event received', { payload: validated.payload })

        const payload = validated.payload as { code: string; message: string }
        toast.error(payload.message, {
          description: `Error code: ${payload.code}`,
        })
      } catch (err) {
        logger.error('Invalid error event', { error: err })
      }
    }

    // Catch-all for unknown events
    const handleUnknownEvent = (eventType: string, event: unknown) => {
      logger.warn('Received unknown dashboard event', { eventType, event })
    }

    // Subscribe to events
    socket.on('dashboard:summaryUpdated', handleSummaryUpdated)
    socket.on('dashboard:recentMocAdded', handleRecentMocAdded)
    socket.on('dashboard:partialPartsUpdated', handlePartialPartsUpdated)
    socket.on('dashboard:themeBreakdownUpdated', handleThemeBreakdownUpdated)
    socket.on('dashboard:error', handleError)

    // Catch unknown events
    socket.onAny((eventName, ...args) => {
      if (!eventName.startsWith('dashboard:')) return
      const knownEvents = [
        'dashboard:summaryUpdated',
        'dashboard:recentMocAdded',
        'dashboard:partialPartsUpdated',
        'dashboard:themeBreakdownUpdated',
        'dashboard:error',
      ]
      if (!knownEvents.includes(eventName)) {
        handleUnknownEvent(eventName, args[0])
      }
    })

    // Cleanup subscriptions
    return () => {
      socket.off('dashboard:summaryUpdated', handleSummaryUpdated)
      socket.off('dashboard:recentMocAdded', handleRecentMocAdded)
      socket.off('dashboard:partialPartsUpdated', handlePartialPartsUpdated)
      socket.off('dashboard:themeBreakdownUpdated', handleThemeBreakdownUpdated)
      socket.off('dashboard:error', handleError)
      socket.offAny()
    }
  }, [socket, dispatch])
}
```

### Connection Status Component

```typescript
// apps/web/dashboard-app/src/components/ConnectionStatus.tsx
import { Wifi, WifiOff } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui'

interface ConnectionStatusProps {
  isConnected: boolean
  error: string | null
}

export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1">
          {isConnected ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <Wifi className="h-4 w-4 text-green-500" />
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <WifiOff className="h-4 w-4 text-red-500" />
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isConnected ? (
          <p>Real-time updates active</p>
        ) : (
          <p>{error ?? 'Reconnecting to real-time updates...'}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
```

### Updated Dashboard Page with WebSocket

```typescript
// apps/web/dashboard-app/src/pages/DashboardPage.tsx
import { useGetDashboardQuery } from '../store/dashboardApi'
import { useDashboardSocket } from '../hooks/useDashboardSocket'
import { useDashboardEvents } from '../hooks/useDashboardEvents'
import { DashboardLayout } from '../components/DashboardLayout'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { CollectionSummaryCard } from '../components/CollectionSummaryCard'
import { ThemeBreakdownCard } from '../components/ThemeBreakdownCard'
import { RecentMocsCard } from '../components/RecentMocsCard'
import { PartialPartsTable } from '../components/PartialPartsTable'
import { QuickActionsCard } from '../components/QuickActionsCard'

export function DashboardPage() {
  const { data: dashboard, isLoading, error: fetchError } = useGetDashboardQuery()
  const { socket, isConnected, error: socketError } = useDashboardSocket()

  // Subscribe to WebSocket events
  useDashboardEvents(socket)

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (fetchError || !dashboard) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-red-500">Failed to load dashboard. Please try again.</p>
      </div>
    )
  }

  return (
    <DashboardLayout
      headerAction={<ConnectionStatus isConnected={isConnected} error={socketError} />}
    >
      <div data-slot="summary">
        <CollectionSummaryCard summary={dashboard.summary} />
      </div>

      <div data-slot="themes">
        <ThemeBreakdownCard themes={dashboard.themeBreakdown} />
      </div>

      <div data-slot="recent">
        <RecentMocsCard mocs={dashboard.recentMocs} />
      </div>

      <div data-slot="quickActions">
        <QuickActionsCard />
      </div>

      <div data-slot="partialParts" className="lg:col-span-3">
        <PartialPartsTable mocs={dashboard.partialPartsMocs} />
      </div>
    </DashboardLayout>
  )
}
```

### PRD Requirements Reference
[Source: docs/prd/dashboard-realtime-prd.md#9-websocket-requirements]

- D-WS-5: All events use DashboardEvent envelope
- D-WS-6: Supported event types
- D-WS-8: Client ignores unknown type values but logs them
- D-FR-5: On changes, backend emits WebSocket events to update Summary card
- D-FR-11: On new MOC creation, backend emits event so client prepends and trims

## Testing

### Test File Location
`apps/web/dashboard-app/src/__tests__/`

### Test Standards
[Source: architecture/testing-strategy.md#react-hooks-best-practices]

```typescript
// __tests__/useDashboardSocket.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDashboardSocket } from '../hooks/useDashboardSocket'
import { io } from 'socket.io-client'

vi.mock('socket.io-client')

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  id: 'test-socket-id',
}

describe('useDashboardSocket', () => {
  beforeEach(() => {
    vi.mocked(io).mockReturnValue(mockSocket as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('connects to /dashboard namespace on mount', () => {
    renderHook(() => useDashboardSocket())

    expect(io).toHaveBeenCalledWith('/dashboard', expect.objectContaining({
      auth: expect.objectContaining({ token: expect.any(String) }),
    }))
  })

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useDashboardSocket())

    unmount()

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })

  it('sets isConnected true on connect event', () => {
    let connectHandler: Function

    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'connect') connectHandler = handler
    })

    const { result } = renderHook(() => useDashboardSocket())

    act(() => {
      connectHandler()
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('sets error on connect_error event', () => {
    let errorHandler: Function

    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'connect_error') errorHandler = handler
    })

    const { result } = renderHook(() => useDashboardSocket())

    act(() => {
      errorHandler(new Error('AUTH_FAILED'))
    })

    expect(result.current.error).toBe('AUTH_FAILED')
    expect(result.current.isConnected).toBe(false)
  })
})
```

```typescript
// __tests__/useDashboardEvents.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDashboardEvents } from '../hooks/useDashboardEvents'
import { dashboardApi } from '../store/dashboardApi'

vi.mock('../store/dashboardApi', () => ({
  dashboardApi: {
    util: {
      updateQueryData: vi.fn(),
    },
  },
}))

describe('useDashboardEvents', () => {
  it('updates summary on summaryUpdated event', () => {
    const mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      onAny: vi.fn(),
      offAny: vi.fn(),
    }

    let summaryHandler: Function

    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'dashboard:summaryUpdated') summaryHandler = handler
    })

    renderHook(() => useDashboardEvents(mockSocket as any))

    const mockEvent = {
      eventId: 'event-123',
      type: 'dashboard:summaryUpdated',
      timestamp: new Date().toISOString(),
      payload: {
        totalMocs: 50,
        totalWishlistItems: 20,
        mocsByBuildStatus: { ADDED: 15, IN_PROGRESS: 25, BUILT: 10 },
        mocsByCoverageStatus: { FULL_INVENTORY: 10, PARTIAL_ORDERED: 30, NONE: 10 },
      },
    }

    summaryHandler(mockEvent)

    expect(dashboardApi.util.updateQueryData).toHaveBeenCalled()
  })

  it('prepends new MOC on recentMocAdded event', () => {
    const mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      onAny: vi.fn(),
      offAny: vi.fn(),
    }

    let mocAddedHandler: Function

    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'dashboard:recentMocAdded') mocAddedHandler = handler
    })

    renderHook(() => useDashboardEvents(mockSocket as any))

    const mockEvent = {
      eventId: 'event-456',
      type: 'dashboard:recentMocAdded',
      timestamp: new Date().toISOString(),
      payload: {
        id: 'new-moc-id',
        title: 'New MOC',
        theme: 'Star Wars',
        buildStatus: 'ADDED',
        coverImageUrl: null,
        createdAt: new Date().toISOString(),
      },
    }

    mocAddedHandler(mockEvent)

    expect(dashboardApi.util.updateQueryData).toHaveBeenCalled()
  })

  it('logs unknown events without crashing', () => {
    const mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      onAny: vi.fn(),
      offAny: vi.fn(),
    }

    let anyHandler: Function

    mockSocket.onAny.mockImplementation((handler) => {
      anyHandler = handler
    })

    renderHook(() => useDashboardEvents(mockSocket as any))

    // Should not throw
    expect(() => {
      anyHandler('dashboard:unknownEvent', { some: 'data' })
    }).not.toThrow()
  })
})
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial draft | SM Agent (Bob) |
