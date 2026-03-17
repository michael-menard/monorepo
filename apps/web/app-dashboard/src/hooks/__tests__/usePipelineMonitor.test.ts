/**
 * Tests for usePipelineMonitor hook
 *
 * AC-5: Polling hook tests with fake timers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { usePipelineMonitor } from '../usePipelineMonitor'

const API_BASE_URL = 'http://localhost:3001'
const MONITOR_URL = `${API_BASE_URL}/monitor/pipeline`

const mockDashboardResponse = {
  pipeline_view: [
    {
      story_id: 'APIP-2020',
      title: 'Test Story',
      feature: 'apip',
      state: 'in_progress',
      priority: 'P1',
      blocked_by: null,
      updated_at: new Date().toISOString(),
    },
    {
      story_id: 'APIP-2021',
      title: 'Blocked Story',
      feature: 'apip',
      state: 'ready',
      priority: 'P2',
      blocked_by: 'APIP-2020',
      updated_at: new Date().toISOString(),
    },
  ],
  cost_summary: [
    {
      story_id: 'APIP-2020',
      phase: 'plan',
      total_tokens: 5000,
      tokens_input: 3000,
      tokens_output: 2000,
    },
  ],
  blocked_queue: [
    {
      story_id: 'APIP-2021',
      title: 'Blocked Story',
      state: 'ready',
      blocked_by: 'APIP-2020',
    },
  ],
  needs_attention: [],
  generated_at: new Date().toISOString(),
}

describe('usePipelineMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    server.use(
      http.get(MONITOR_URL, () => {
        return HttpResponse.json(mockDashboardResponse)
      }),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts with loading state and fetches data on mount', async () => {
    const { result } = renderHook(() => usePipelineMonitor())

    // Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()

    // Wait for initial fetch to complete
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).not.toBeNull()
    expect(result.current.data?.pipeline_view).toHaveLength(2)
    expect(result.current.data?.pipeline_view[0].state).toBe('in_progress')
    expect(result.current.error).toBeNull()
  })

  it('triggers second fetch after polling interval (AC-5)', async () => {
    let fetchCount = 0
    server.use(
      http.get(MONITOR_URL, () => {
        fetchCount++
        return HttpResponse.json(mockDashboardResponse)
      }),
    )

    const { result } = renderHook(() => usePipelineMonitor())

    // Wait for initial fetch
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fetchCount).toBeGreaterThanOrEqual(1)

    // Advance timer by 30s (default interval) to trigger second fetch
    await act(async () => {
      vi.advanceTimersByTime(30000)
      await vi.runAllTimersAsync()
    })

    await waitFor(() => expect(fetchCount).toBeGreaterThanOrEqual(2))
  })

  it('sets error state when fetch returns non-ok response', async () => {
    server.use(
      http.get(MONITOR_URL, () => {
        return HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 })
      }),
    )

    const { result } = renderHook(() => usePipelineMonitor())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.error).toContain('503')
  })

  it('shows stale=false initially and sets stale after 2x interval', async () => {
    const { result } = renderHook(() => usePipelineMonitor())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Data is fresh initially
    expect(result.current.isStale).toBe(false)

    // Advance time past 2x interval to trigger stale detection
    await act(async () => {
      vi.advanceTimersByTime(60001)
    })

    await waitFor(() => {
      expect(result.current.isStale).toBe(true)
    })
  })

  it('sets lastFetchedAt after successful fetch', async () => {
    const { result } = renderHook(() => usePipelineMonitor())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.lastFetchedAt).not.toBeNull()
    expect(result.current.lastFetchedAt).toBeInstanceOf(Date)
  })

  it('refetch triggers a new fetch and resets loading state', async () => {
    let fetchCount = 0
    server.use(
      http.get(MONITOR_URL, () => {
        fetchCount++
        return HttpResponse.json(mockDashboardResponse)
      }),
    )

    const { result } = renderHook(() => usePipelineMonitor())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const initialCount = fetchCount

    // Trigger refetch
    act(() => {
      result.current.refetch()
    })

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => expect(fetchCount).toBeGreaterThan(initialCount))
  })

  it('blocked_queue populated with blocked stories (AC-3)', async () => {
    const { result } = renderHook(() => usePipelineMonitor())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.blocked_queue).toHaveLength(1)
    expect(result.current.data?.blocked_queue[0].blocked_by).toBe('APIP-2020')
  })

  it('cost_summary grouped by story_id and phase (AC-2)', async () => {
    const { result } = renderHook(() => usePipelineMonitor())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.cost_summary).toHaveLength(1)
    expect(result.current.data?.cost_summary[0].total_tokens).toBe(5000)
    expect(result.current.data?.cost_summary[0].phase).toBe('plan')
  })
})
