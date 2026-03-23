import { useRef, useEffect } from 'react'
import { useToast } from '@repo/app-component-library'
import type { ServiceHealth } from '../store/__types__'

export function useStatusChangeNotifications(services?: ServiceHealth[]) {
  const prevRef = useRef<ServiceHealth[] | null>(null)
  const { success, error } = useToast()

  useEffect(() => {
    if (!services) return

    // Skip initial load
    if (prevRef.current === null) {
      prevRef.current = services
      return
    }

    const prevMap = new Map(prevRef.current.map(s => [s.key, s.status]))

    for (const service of services) {
      const prev = prevMap.get(service.key)
      if (!prev) continue

      if (prev !== 'healthy' && service.status === 'healthy') {
        success(`${service.name} is healthy`, `Port ${service.port} recovered`)
      } else if (prev === 'healthy' && service.status !== 'healthy') {
        error(`${service.name} is ${service.status}`, `Port ${service.port} went down`)
      }
    }

    prevRef.current = services
  }, [services, success, error])
}
