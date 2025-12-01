# Story 7.7: Client Resilience & Fallback

## Status

Draft

## Story

**As a** user,
**I want** the dashboard to gracefully handle connection issues,
**so that** I still see data and get updates when connectivity is restored.

## Acceptance Criteria

1. ✅ socket.io auto-reconnect enabled with exponential backoff (start 1s, max 30s, jitter)
2. ✅ On `AUTH_FAILED` error, do not retry; prompt user to re-authenticate
3. ✅ On transient disconnect, retry connection automatically
4. ✅ On successful reconnect, re-fetch `GET /api/dashboard` then resume events
5. ✅ After N (5-10) consecutive failed reconnects, enter degraded mode
6. ✅ Degraded mode: show banner and poll `GET /api/dashboard` every 30-60s
7. ✅ Degraded mode continues slow reconnect attempts
8. ✅ On successful reconnect in degraded mode, stop polling and clear banner
9. ✅ Malformed events logged and skipped without tearing down connection
10. ✅ Unit tests for all resilience scenarios

## Tasks / Subtasks

- [ ] **Task 1: Configure socket.io Reconnection** (AC: 1, 3)
  - [ ] Update `useDashboardSocket.ts` with reconnection options
  - [ ] Set `reconnectionAttempts` to 10
  - [ ] Set `reconnectionDelay` to 1000 (1s)
  - [ ] Set `reconnectionDelayMax` to 30000 (30s)
  - [ ] Enable `randomizationFactor` for jitter

- [ ] **Task 2: Handle AUTH_FAILED Error** (AC: 2)
  - [ ] Detect `AUTH_FAILED` code in connect_error
  - [ ] Disable reconnection for this socket
  - [ ] Show "Session expired" toast with login link
  - [ ] Optionally trigger logout flow

- [ ] **Task 3: Handle Successful Reconnect** (AC: 4)
  - [ ] Listen for `reconnect` event
  - [ ] Refetch dashboard data via RTK Query
  - [ ] Clear any stale error states
  - [ ] Log reconnection success

- [ ] **Task 4: Implement Degraded Mode State** (AC: 5, 6, 7)
  - [ ] Create `useDegradedMode.ts` hook
  - [ ] Track consecutive failed reconnect attempts
  - [ ] When threshold reached, set `isDegradedMode` state
  - [ ] Return state for UI to display banner

- [ ] **Task 5: Implement Polling in Degraded Mode** (AC: 6)
  - [ ] Use RTK Query `pollingInterval` option
  - [ ] Set polling interval to 30000ms (30s) in degraded mode
  - [ ] Disable polling when not in degraded mode
  - [ ] Continue attempting WebSocket reconnect

- [ ] **Task 6: Create Degraded Mode Banner** (AC: 6)
  - [ ] Create `src/components/DegradedModeBanner.tsx`
  - [ ] Show warning message about limited real-time updates
  - [ ] Show "last updated" timestamp
  - [ ] Optionally show manual refresh button

- [ ] **Task 7: Clear Degraded Mode on Reconnect** (AC: 8)
  - [ ] On successful reconnect, clear `isDegradedMode`
  - [ ] Stop polling interval
  - [ ] Hide banner
  - [ ] Show "Connection restored" toast

- [ ] **Task 8: Handle Malformed Events** (AC: 9)
  - [ ] Wrap event handlers in try-catch
  - [ ] Log malformed events with `@repo/logger`
  - [ ] Do not disconnect socket on parsing errors
  - [ ] Continue processing other events

- [ ] **Task 9: Write Unit Tests** (AC: 10)
  - [ ] Test exponential backoff timing
  - [ ] Test AUTH_FAILED stops reconnection
  - [ ] Test degraded mode activates after N failures
  - [ ] Test polling starts in degraded mode
  - [ ] Test reconnect clears degraded mode
  - [ ] Test malformed events don't crash

## Dev Notes

### Source Tree Location
[Source: architecture/source-tree.md#frontend-application]

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

### socket.io Reconnection Configuration
[Source: docs/prd/dashboard-realtime-prd.md#D-RES-1]

```typescript
// apps/web/dashboard-app/src/hooks/useDashboardSocket.ts
import { io, Socket } from 'socket.io-client'

const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 10,        // D-RES-4: 5-10 attempts before degraded
  reconnectionDelay: 1000,          // Start at 1s
  reconnectionDelayMax: 30000,      // Max 30s
  randomizationFactor: 0.5,         // Add jitter
  timeout: 20000,                   // Connection timeout
}

export const useDashboardSocket = () => {
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [isDegradedMode, setIsDegradedMode] = useState(false)

  useEffect(() => {
    const socket = io('/dashboard', {
      auth: { token },
      transports: ['websocket'],
      ...RECONNECTION_CONFIG,
    })

    // Track reconnection attempts
    socket.io.on('reconnect_attempt', (attempt) => {
      setReconnectAttempts(attempt)
      logger.info('WebSocket reconnect attempt', { attempt })
    })

    // Handle successful reconnect
    socket.io.on('reconnect', () => {
      logger.info('WebSocket reconnected')
      setReconnectAttempts(0)
      setIsDegradedMode(false)

      // Refetch dashboard data
      dispatch(dashboardApi.util.invalidateTags(['Dashboard']))
    })

    // Handle reconnect failure
    socket.io.on('reconnect_failed', () => {
      logger.warn('WebSocket reconnection failed, entering degraded mode')
      setIsDegradedMode(true)
    })

    // Handle auth failures
    socket.on('connect_error', (err) => {
      if (err.message === 'AUTH_FAILED' || (err as any).data?.code === 'AUTH_FAILED') {
        logger.warn('WebSocket auth failed, stopping reconnection')
        socket.disconnect()
        socket.io.opts.reconnection = false

        toast.error('Session expired', {
          description: 'Please log in again to continue.',
          action: {
            label: 'Log in',
            onClick: () => navigate({ to: '/login' }),
          },
        })
      }
    })

    // ... rest of implementation
  }, [token])

  return { socket, isConnected, error, isDegradedMode, reconnectAttempts }
}
```

### Degraded Mode Hook

```typescript
// apps/web/dashboard-app/src/hooks/useDegradedMode.ts
import { useEffect, useState } from 'react'
import { useGetDashboardQuery } from '../store/dashboardApi'

const DEGRADED_POLLING_INTERVAL = 30000 // 30 seconds

interface UseDegradedModeOptions {
  isDegradedMode: boolean
}

export const useDegradedMode = ({ isDegradedMode }: UseDegradedModeOptions) => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Use RTK Query with polling when in degraded mode
  const { data, isFetching, refetch } = useGetDashboardQuery(undefined, {
    pollingInterval: isDegradedMode ? DEGRADED_POLLING_INTERVAL : 0,
  })

  useEffect(() => {
    if (data && !isFetching) {
      setLastUpdated(new Date())
    }
  }, [data, isFetching])

  const manualRefresh = () => {
    refetch()
  }

  return {
    lastUpdated,
    isPolling: isDegradedMode,
    isFetching,
    manualRefresh,
  }
}
```

### Degraded Mode Banner
[Source: docs/prd/dashboard-realtime-prd.md#D-RES-4]

```typescript
// apps/web/dashboard-app/src/components/DegradedModeBanner.tsx
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle, Button } from '@repo/ui'
import { formatDistanceToNow } from 'date-fns'

interface DegradedModeBannerProps {
  lastUpdated: Date | null
  isPolling: boolean
  isFetching: boolean
  onRefresh: () => void
}

export function DegradedModeBanner({
  lastUpdated,
  isPolling,
  isFetching,
  onRefresh,
}: DegradedModeBannerProps) {
  return (
    <Alert variant="warning" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Limited connectivity</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p>Real-time updates unavailable. Data refreshes every 30 seconds.</p>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh now
        </Button>
      </AlertDescription>
    </Alert>
  )
}
```

### Updated Dashboard Page with Resilience

```typescript
// apps/web/dashboard-app/src/pages/DashboardPage.tsx
import { useGetDashboardQuery } from '../store/dashboardApi'
import { useDashboardSocket } from '../hooks/useDashboardSocket'
import { useDashboardEvents } from '../hooks/useDashboardEvents'
import { useDegradedMode } from '../hooks/useDegradedMode'
import { DashboardLayout } from '../components/DashboardLayout'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { DegradedModeBanner } from '../components/DegradedModeBanner'
import { ConnectionStatus } from '../components/ConnectionStatus'
// ... other imports

export function DashboardPage() {
  const { data: dashboard, isLoading, error: fetchError } = useGetDashboardQuery()
  const { socket, isConnected, error: socketError, isDegradedMode } = useDashboardSocket()
  const { lastUpdated, isFetching, manualRefresh } = useDegradedMode({ isDegradedMode })

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
      {/* Degraded mode banner */}
      {isDegradedMode && (
        <div className="lg:col-span-3">
          <DegradedModeBanner
            lastUpdated={lastUpdated}
            isPolling={isDegradedMode}
            isFetching={isFetching}
            onRefresh={manualRefresh}
          />
        </div>
      )}

      {/* ... rest of dashboard cards */}
    </DashboardLayout>
  )
}
```

### Error Handling in Event Handlers
[Source: docs/prd/dashboard-realtime-prd.md#D-RES-5]

```typescript
// Safe event handler pattern
const handleSummaryUpdated = (event: unknown) => {
  try {
    // Validate event structure
    const validated = DashboardEventSchema.parse(event)

    // Validate payload specifically
    const summary = DashboardSummarySchema.parse(validated.payload)

    dispatch(
      dashboardApi.util.updateQueryData('getDashboard', undefined, (draft) => {
        draft.summary = summary
      })
    )
  } catch (err) {
    // Log but don't crash - D-RES-5
    logger.error('Malformed summaryUpdated event', {
      error: err instanceof Error ? err.message : 'Unknown error',
      event: JSON.stringify(event).slice(0, 500), // Truncate for safety
    })
    // Connection continues - do not call socket.disconnect()
  }
}
```

### PRD Requirements Reference
[Source: docs/prd/dashboard-realtime-prd.md#10-client-resilience-fallback]

- D-RES-1: Configure socket.io auto-reconnect with exponential backoff
- D-RES-2: On AUTH_FAILED, do not retry; prompt user to re-auth
- D-RES-3: On transient disconnect, allow retries; on reconnect, re-fetch
- D-RES-4: After N failed reconnects, enter degraded mode with polling
- D-RES-5: Handle malformed events by logging and skipping

## Testing

### Test File Location
`apps/web/dashboard-app/src/__tests__/resilience.test.ts`

### Test Standards
[Source: architecture/testing-strategy.md#unit-tests]

```typescript
// __tests__/resilience.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDashboardSocket } from '../hooks/useDashboardSocket'

vi.mock('socket.io-client')

describe('Client Resilience', () => {
  describe('Reconnection', () => {
    it('configures exponential backoff', () => {
      renderHook(() => useDashboardSocket())

      expect(io).toHaveBeenCalledWith('/dashboard', expect.objectContaining({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: expect.any(Number),
      }))
    })

    it('refetches data on successful reconnect', async () => {
      let reconnectHandler: Function
      const mockSocket = {
        on: vi.fn(),
        off: vi.fn(),
        io: {
          on: vi.fn((event, handler) => {
            if (event === 'reconnect') reconnectHandler = handler
          }),
          opts: { reconnection: true },
        },
      }

      vi.mocked(io).mockReturnValue(mockSocket as any)

      const { result } = renderHook(() => useDashboardSocket())

      act(() => {
        reconnectHandler()
      })

      expect(result.current.isDegradedMode).toBe(false)
      // Verify RTK Query invalidation called
    })
  })

  describe('AUTH_FAILED Handling', () => {
    it('stops reconnection on AUTH_FAILED', async () => {
      let errorHandler: Function
      const mockSocket = {
        on: vi.fn((event, handler) => {
          if (event === 'connect_error') errorHandler = handler
        }),
        off: vi.fn(),
        disconnect: vi.fn(),
        io: {
          on: vi.fn(),
          opts: { reconnection: true },
        },
      }

      vi.mocked(io).mockReturnValue(mockSocket as any)

      renderHook(() => useDashboardSocket())

      act(() => {
        const authError = new Error('AUTH_FAILED')
        ;(authError as any).data = { code: 'AUTH_FAILED' }
        errorHandler(authError)
      })

      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(mockSocket.io.opts.reconnection).toBe(false)
    })
  })

  describe('Degraded Mode', () => {
    it('enters degraded mode after max reconnect attempts', async () => {
      let reconnectFailedHandler: Function
      const mockSocket = {
        on: vi.fn(),
        off: vi.fn(),
        io: {
          on: vi.fn((event, handler) => {
            if (event === 'reconnect_failed') reconnectFailedHandler = handler
          }),
          opts: { reconnection: true },
        },
      }

      vi.mocked(io).mockReturnValue(mockSocket as any)

      const { result } = renderHook(() => useDashboardSocket())

      act(() => {
        reconnectFailedHandler()
      })

      expect(result.current.isDegradedMode).toBe(true)
    })

    it('clears degraded mode on successful reconnect', async () => {
      let reconnectHandler: Function
      let reconnectFailedHandler: Function

      const mockSocket = {
        on: vi.fn(),
        off: vi.fn(),
        io: {
          on: vi.fn((event, handler) => {
            if (event === 'reconnect') reconnectHandler = handler
            if (event === 'reconnect_failed') reconnectFailedHandler = handler
          }),
          opts: { reconnection: true },
        },
      }

      vi.mocked(io).mockReturnValue(mockSocket as any)

      const { result } = renderHook(() => useDashboardSocket())

      // Enter degraded mode
      act(() => {
        reconnectFailedHandler()
      })
      expect(result.current.isDegradedMode).toBe(true)

      // Reconnect
      act(() => {
        reconnectHandler()
      })
      expect(result.current.isDegradedMode).toBe(false)
    })
  })

  describe('Malformed Event Handling', () => {
    it('logs malformed events without crashing', () => {
      const loggerSpy = vi.spyOn(logger, 'error')

      // Simulate malformed event processing
      const malformedEvent = { invalid: 'structure' }

      // Handler should catch and log
      expect(() => {
        handleSummaryUpdated(malformedEvent)
      }).not.toThrow()

      expect(loggerSpy).toHaveBeenCalledWith(
        'Malformed summaryUpdated event',
        expect.any(Object)
      )
    })
  })
})
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial draft | SM Agent (Bob) |
