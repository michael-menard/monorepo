import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { pushNotification } from '../store/notificationsSlice'

const WS_URL = '/ws/notifications'
const RECONNECT_DELAY_MS = 3000

/**
 * Connects to the notifications WebSocket server and dispatches
 * incoming messages into the Redux notifications slice.
 * Auto-reconnects on close/error.
 */
export function useNotificationsWS() {
  const dispatch = useDispatch()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false

    function connect() {
      if (unmountedRef.current) return

      const ws = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${WS_URL}`,
      )
      wsRef.current = ws

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data as string) as {
            id?: string
            type?: string
            message?: string
          }
          dispatch(
            pushNotification({
              id: data.id ?? crypto.randomUUID(),
              type: data.type ?? 'info',
              message: data.message ?? String(event.data),
              receivedAt: new Date().toISOString(),
            }),
          )
        } catch {
          // non-JSON frame — push raw text as an info notification
          dispatch(
            pushNotification({
              id: crypto.randomUUID(),
              type: 'info',
              message: String(event.data),
              receivedAt: new Date().toISOString(),
            }),
          )
        }
      }

      ws.onclose = () => {
        if (!unmountedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [dispatch])
}
