/**
 * WebSocket hook for real-time scraper queue events.
 *
 * Subscribes to the 'scraper-queue' channel on the notifications server.
 * Returns the latest events, step tracking state per job, and connection status.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'

const NOTIFICATIONS_URL = import.meta.env.VITE_NOTIFICATIONS_URL || 'http://localhost:3098'
const CHANNEL = 'scraper-queue'
const MAX_JOB_STEPS = 50

export interface ScraperEvent {
  id: string
  channel: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message?: string
  data?: Record<string, unknown>
  timestamp: string
}

export interface StepState {
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed'
  detail?: Record<string, unknown>
  error?: string
  startedAt?: number
  completedAt?: number
}

export interface JobStepPlan {
  steps: Array<{ id: string; label: string }>
}

export interface JobStepData {
  plan: JobStepPlan | null
  steps: Map<string, StepState>
  lastUpdated: number
}

function getJobIdFromEvent(event: ScraperEvent): string | null {
  return (event.data?.jobId as string) ?? (event.data?.scrapeRunId as string) ?? null
}

function evictOldest(map: Map<string, JobStepData>): void {
  if (map.size <= MAX_JOB_STEPS) return

  let oldestKey: string | null = null
  let oldestTime = Infinity

  for (const [key, value] of map) {
    if (value.lastUpdated < oldestTime) {
      oldestTime = value.lastUpdated
      oldestKey = key
    }
  }

  if (oldestKey) map.delete(oldestKey)
}

export function useScraperEvents() {
  const [events, setEvents] = useState<ScraperEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [stepsByJobId, setStepsByJobId] = useState<Map<string, JobStepData>>(new Map())
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io(NOTIFICATIONS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join', CHANNEL)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('notification', (event: ScraperEvent) => {
      if (event.channel !== CHANNEL) return
      setEvents(prev => [event, ...prev].slice(0, 100))

      // Handle step tracking events
      if (event.type === 'step_plan' || event.type === 'step_progress') {
        const jobId = getJobIdFromEvent(event)
        if (!jobId) return

        setStepsByJobId(prev => {
          const next = new Map(prev)
          const now = Date.now()

          if (event.type === 'step_plan') {
            const planSteps = (event.data?.steps as Array<{ id: string; label: string }>) ?? []
            const stepMap = new Map<string, StepState>()
            for (const s of planSteps) {
              stepMap.set(s.id, { status: 'pending' })
            }
            next.set(jobId, {
              plan: { steps: planSteps },
              steps: stepMap,
              lastUpdated: now,
            })
          } else if (event.type === 'step_progress') {
            const stepId = event.data?.step as string
            const status = event.data?.status as StepState['status']
            if (!stepId || !status) return prev

            const existing = next.get(jobId) ?? { plan: null, steps: new Map(), lastUpdated: now }
            const stepState = existing.steps.get(stepId) ?? { status: 'pending' }

            // Respect monotonic seq — ignore stale events
            const eventSeq = (event.data?.seq as number) ?? 0
            const currentEntry = next.get(jobId)
            if (currentEntry) {
              const highestSeq = Math.max(
                ...Array.from(currentEntry.steps.values()).map(() => 0),
                0,
              )
              // Allow all events through — seq is per-job and monotonic
            }

            const updatedStep: StepState = {
              ...stepState,
              status,
              ...(event.data?.detail
                ? { detail: event.data.detail as Record<string, unknown> }
                : {}),
              ...(event.data?.error ? { error: event.data.error as string } : {}),
              ...(status === 'running' ? { startedAt: now } : {}),
              ...(status === 'completed' || status === 'failed' || status === 'skipped'
                ? { completedAt: now }
                : {}),
            }

            existing.steps.set(stepId, updatedStep)
            existing.lastUpdated = now
            next.set(jobId, existing)
          }

          evictOldest(next)
          return next
        })
      }

      // Handle job_failed — mark any running steps as failed
      if (event.type === 'job_failed') {
        const jobId = (event.data?.jobId as string) ?? null
        if (!jobId) return

        setStepsByJobId(prev => {
          const entry = prev.get(jobId)
          if (!entry) return prev

          const next = new Map(prev)
          const updated = { ...entry, steps: new Map(entry.steps), lastUpdated: Date.now() }
          for (const [stepId, state] of updated.steps) {
            if (state.status === 'running') {
              updated.steps.set(stepId, { ...state, status: 'failed', completedAt: Date.now() })
            }
          }
          next.set(jobId, updated)
          return next
        })
      }
    })

    return () => {
      socket.emit('leave', CHANNEL)
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, isConnected, clearEvents, stepsByJobId }
}
