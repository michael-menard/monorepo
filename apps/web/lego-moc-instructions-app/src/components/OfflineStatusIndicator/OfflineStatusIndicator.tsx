import { useEffect, useState } from 'react'
import { Button } from '@repo/ui'
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import {
  useGetOfflineStatusQuery,
  useProcessOfflineActionsMutation,
} from '../../services/offlineApi'

export const OfflineStatusIndicator = () => {
  const [isVisible, setIsVisible] = useState(false)
  const { data: offlineStatus, refetch } = useGetOfflineStatusQuery(undefined, {
    // Poll every 10 seconds - more frequent than default to catch status changes
    pollingInterval: 10000,
  })
  const [processActions, { isLoading: isProcessing }] = useProcessOfflineActionsMutation()

  // Show indicator when offline or when there are pending actions
  useEffect(() => {
    const shouldShow = !offlineStatus?.isOnline || (offlineStatus.pendingActions || 0) > 0
    setIsVisible(shouldShow)
  }, [offlineStatus])

  const handleSync = async () => {
    try {
      await processActions().unwrap()
      // Refetch status to get updated counts
      refetch()
    } catch (error) {
      // Error handling removed
    }
  }

  if (!isVisible) {
    return null
  }

  const isOffline = !offlineStatus?.isOnline
  const pendingActions = offlineStatus?.pendingActions || 0

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center space-x-3">
          {isOffline ? (
            <WifiOff className="h-5 w-5 text-red-500" />
          ) : (
            <Wifi className="h-5 w-5 text-green-500" />
          )}

          <div className="flex-1">
            <div className="font-medium text-sm">
              {isOffline ? 'You are offline' : 'You are online'}
            </div>

            {pendingActions > 0 && (
              <div className="text-xs text-gray-600 mt-1">
                {pendingActions} action{pendingActions !== 1 ? 's' : ''} pending sync
              </div>
            )}

            {isOffline ? (
              <div className="text-xs text-gray-600 mt-1">Some features may be limited</div>
            ) : null}
          </div>
        </div>

        {pendingActions > 0 && offlineStatus?.isOnline ? (
          <div className="mt-3 flex space-x-2">
            <Button size="sm" onClick={handleSync} disabled={isProcessing} className="flex-1">
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              {isProcessing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        ) : null}

        {isOffline ? (
          <div className="mt-3 flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <AlertCircle className="h-4 w-4" />
            <span>Changes will sync when you're back online</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
