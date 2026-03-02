/**
 * usePipelineMonitor Hook
 *
 * Polling-only hook that fetches /api/v2/monitor/pipeline on mount
 * and every VITE_MONITOR_REFRESH_INTERVAL ms (default 30000ms).
 *
 * Features:
 * - Configurable polling interval via VITE_MONITOR_REFRESH_INTERVAL env var
 * - Stale detection (shows stale indicator when last fetch > 2x interval ago)
 * - Loading and error state management
 * - No SSE / EventSource code (AC-12: SSE deferred to APIP-2025)
 *
 * Story: APIP-2020
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { z } from 'zod'

// ============================================================================
// Zod Schemas for API response (CLAUDE.md: Zod-first types)
// ============================================================================

export const PipelineStorySchema = z.object({
  story_id: z.string(),
  title: z.string(),
  state: z.string(),
  priority: z.string().nullable(),
  blocked_by: z.string().nullable(),
  updated_at: z.string(),
})

export type PipelineStory = z.infer<typeof PipelineStorySchema>

export const CostSummaryRowSchema = z.object({
  story_id: z.string(),
  phase: z.string(),
  total_tokens: z.number(),
  tokens_input: z.number(),
  tokens_output: z.number(),
})

export type CostSummaryRow = z.infer<typeof CostSummaryRowSchema>

export const BlockedStorySchema = z.object({
  story_id: z.string(),
  title: z.string(),
  state: z.string(),
  blocked_by: z.string().nullable(),
})

export type BlockedStory = z.infer<typeof BlockedStorySchema>

export const PipelineDashboardResponseSchema = z.object({
  pipeline_view: z.array(PipelineStorySchema),
  cost_summary: z.array(CostSummaryRowSchema),
  blocked_queue: z.array(BlockedStorySchema),
  generated_at: z.string(),
})

export type PipelineDashboardResponse = z.infer<typeof PipelineDashboardResponseSchema>

// ============================================================================
// Hook configuration
// ============================================================================

const DEFAULT_REFRESH_INTERVAL_MS = 30000

function getRefreshInterval(): number {
  const envVal = import.meta.env.VITE_MONITOR_REFRESH_INTERVAL
  if (envVal) {
    const parsed = parseInt(String(envVal), 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return DEFAULT_REFRESH_INTERVAL_MS
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const MONITOR_ENDPOINT = `${API_BASE_URL}/monitor/pipeline`

// ============================================================================
// Hook result schema
// ============================================================================

export const UsePipelineMonitorResultSchema = z.object({
  data: PipelineDashboardResponseSchema.nullable(),
  isLoading: z.boolean(),
  isStale: z.boolean(),
  error: z.string().nullable(),
  lastFetchedAt: z.date().nullable(),
  refetch: z.function(),
})

export type UsePipelineMonitorResult = {
  data: PipelineDashboardResponse | null
  isLoading: boolean
  isStale: boolean
  error: string | null
  lastFetchedAt: Date | null
  refetch: () => void
}

// ============================================================================
// Hook implementation
// ============================================================================

/**
 * usePipelineMonitor
 *
 * Polls GET /monitor/pipeline and manages loading/error/stale state.
 *
 * AC-5: Polling at configurable interval (VITE_MONITOR_REFRESH_INTERVAL).
 * Stale detection: data is stale when last fetch was > 2x interval ago.
 */
export function usePipelineMonitor(): UsePipelineMonitorResult {
  const [data, setData] = useState<PipelineDashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshInterval = getRefreshInterval()

  const fetch = useCallback(async () => {
    try {
      const response = await globalThis.fetch(MONITOR_ENDPOINT, {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const raw = await response.json()
      const parsed = PipelineDashboardResponseSchema.parse(raw)
      setData(parsed)
      setError(null)
      setIsStale(false)
      const now = new Date()
      setLastFetchedAt(now)

      // Schedule stale detection: data is stale if not refreshed within 2x interval
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current)
      }
      staleTimerRef.current = setTimeout(() => {
        setIsStale(true)
      }, refreshInterval * 2)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [refreshInterval])

  const refetch = useCallback(() => {
    setIsLoading(true)
    setIsStale(false)
    void fetch()
  }, [fetch])

  useEffect(() => {
    // Initial fetch
    void fetch()

    // Set up polling interval (AC-5: polling at configurable interval)
    intervalRef.current = setInterval(() => {
      void fetch()
    }, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current)
      }
    }
  }, [fetch, refreshInterval])

  return {
    data,
    isLoading,
    isStale,
    error,
    lastFetchedAt,
    refetch,
  }
}
