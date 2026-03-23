import { useState, useEffect, useRef } from 'react'

export interface LogLine {
  timestamp: string
  stream: 'stdout' | 'stderr'
  text: string
}

const MAX_LINES = 500

export function useLogStream(key: string | null) {
  const [lines, setLines] = useState<LogLine[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!key) {
      setLines([])
      return
    }

    setLines([])
    const es = new EventSource(`/api/v1/ports/${key}/logs`)
    esRef.current = es

    es.addEventListener('log', event => {
      try {
        const line = JSON.parse(event.data) as LogLine
        setLines(prev => {
          const next = [...prev, line]
          return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next
        })
      } catch {
        // ignore malformed data
      }
    })

    es.onerror = () => {
      // EventSource auto-reconnects
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [key])

  return { lines }
}
