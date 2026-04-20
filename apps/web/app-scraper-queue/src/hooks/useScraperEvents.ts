/**
 * WebSocket hook for real-time scraper queue events.
 *
 * Subscribes to the 'scraper-queue' channel on the notifications server.
 * Returns the latest events and connection status.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'

const NOTIFICATIONS_URL = import.meta.env.VITE_NOTIFICATIONS_URL || 'http://localhost:3098'
const CHANNEL = 'scraper-queue'

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

export function useScraperEvents() {
  const [events, setEvents] = useState<ScraperEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
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
      setEvents(prev => [event, ...prev].slice(0, 100)) // keep last 100
    })

    return () => {
      socket.emit('leave', CHANNEL)
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, isConnected, clearEvents }
}
