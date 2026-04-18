import { useEffect, useState } from 'react'
import io from 'socket.io-client'

interface UseNotificationsProps {
  channels: string[]
}

interface UseNotificationsReturn {
  events: Record<string, any[]>
  isConnected: boolean
  error?: Error | null
}

export const useNotifications = ({ channels }: UseNotificationsProps): UseNotificationsReturn => {
  const [events, setEvents] = useState<Record<string, any[]>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let socket: SocketIOClient.Socket

    try {
      socket = io('http://localhost:3001') // Replace with actual server URL

      socket.on('connect', () => {
        setIsConnected(true)
        channels.forEach(channel => socket.emit('join', channel))
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
      })

      socket.on('error', err => {
        setError(err)
      })

      const handleEvent = (event: string, data: any) => {
        setEvents(prevEvents => ({ ...prevEvents, [event]: [...(prevEvents[event] || []), data] }))
      }

      socket.on('notification', handleEvent)
    } catch (err) {
      setError(err as Error)
    }

    return () => {
      if (socket) {
        channels.forEach(channel => socket.emit('leave', channel))
        socket.disconnect()
      }
    }
  }, [channels])

  return { events, isConnected, error }
}
