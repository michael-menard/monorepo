import { useState, useRef, useCallback } from 'react'

export interface OrchestrationEvent {
  type: 'starting' | 'started' | 'error' | 'skipped' | 'complete'
  key: string
  message: string
  timestamp: string
}

export function useOrchestration() {
  const [isRunning, setIsRunning] = useState(false)
  const [events, setEvents] = useState<OrchestrationEvent[]>([])
  const esRef = useRef<EventSource | null>(null)

  const run = useCallback((action: 'start-all' | 'stop-all', filter?: 'frontend' | 'backend') => {
    setIsRunning(true)
    setEvents([])

    const params = filter ? `?filter=${filter}` : ''
    const es = new EventSource(`/api/v1/ports/${action}${params}`)
    esRef.current = es

    const handleEvent = (eventType: string) => (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as OrchestrationEvent
        setEvents(prev => [...prev, data])

        if (data.type === 'complete') {
          es.close()
          setIsRunning(false)
        }
      } catch {
        // ignore malformed
      }
    }

    es.addEventListener('starting', handleEvent('starting'))
    es.addEventListener('started', handleEvent('started'))
    es.addEventListener('error', handleEvent('error'))
    es.addEventListener('skipped', handleEvent('skipped'))
    es.addEventListener('complete', handleEvent('complete'))

    es.onerror = () => {
      es.close()
      setIsRunning(false)
    }
  }, [])

  const cancel = useCallback(() => {
    esRef.current?.close()
    setIsRunning(false)
  }, [])

  return { isRunning, events, run, cancel }
}
