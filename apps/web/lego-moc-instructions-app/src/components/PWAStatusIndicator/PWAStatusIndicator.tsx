import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react'
import { usePWA } from '../PWAProvider'

export const PWAStatusIndicator = () => {
  const { needRefresh, offlineReady } = usePWA()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="flex items-center space-x-2 text-sm">
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}

      {offlineReady ? <CheckCircle className="h-4 w-4 text-green-500" /> : null}

      {needRefresh ? <AlertCircle className="h-4 w-4 text-yellow-500" /> : null}

      <span className="text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  )
}
