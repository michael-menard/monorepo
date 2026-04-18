import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'

const ChannelHealthSchema = z.object({
  name: z.string(),
  subscribers: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
})

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  uptime: z.number().nonnegative(),
  redis: z.object({
    connected: z.boolean(),
    latencyMs: z.number().nonnegative(),
  }),
  channels: z.array(ChannelHealthSchema),
  db: z.enum(['connected', 'disconnected']),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>

const UseHealthMonitorPropsSchema = z.object({
  serverUrl: z.string().url().optional(),
  intervalMs: z.number().positive().optional(),
})

type UseHealthMonitorProps = z.infer<typeof UseHealthMonitorPropsSchema>

const NOTIFICATIONS_SERVER_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_NOTIFICATIONS_SERVER_URL) ||
  'http://localhost:3001'

const DEFAULT_INTERVAL_MS = 15_000

export function useHealthMonitor({
  serverUrl = NOTIFICATIONS_SERVER_URL,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseHealthMonitorProps = {}) {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${serverUrl}/health`)
      if (!res.ok) {
        throw new Error(`Health check failed: ${res.status} ${res.statusText}`)
      }
      const json = await res.json()
      const parsed = HealthResponseSchema.safeParse(json)
      if (!parsed.success) {
        throw new Error(`Unexpected health response shape: ${parsed.error.message}`)
      }
      setData(parsed.data)
      setError(null)
      setIsStale(false)
      setLastFetchedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setIsStale(true)
    } finally {
      setIsLoading(false)
    }
  }, [serverUrl])

  useEffect(() => {
    fetchHealth()
    intervalRef.current = setInterval(() => {
      setIsStale(true)
      fetchHealth()
    }, intervalMs)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchHealth, intervalMs])

  return { data, isLoading, isStale, error, lastFetchedAt, refetch: fetchHealth }
}
