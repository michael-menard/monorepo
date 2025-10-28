import { useCallback, useEffect, useState } from 'react'
import { useGetOfflineStatusQuery, useProcessOfflineActionsMutation } from '../services/offlineApi'
import { offlineManager } from '../services/offlineManager'

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { data: offlineStatus, refetch } = useGetOfflineStatusQuery()
  const [processActions, { isLoading: isProcessing }] = useProcessOfflineActionsMutation()

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Process any pending actions when coming back online
      if (offlineStatus?.pendingActions && offlineStatus.pendingActions > 0) {
        processActions()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [offlineStatus?.pendingActions, processActions])

  // Manual sync function
  const syncOfflineActions = useCallback(async () => {
    if (isOnline && offlineStatus?.pendingActions && offlineStatus.pendingActions > 0) {
      try {
        await processActions().unwrap()
        refetch()
      } catch (error) {
        throw error
      }
    }
  }, [isOnline, offlineStatus?.pendingActions, processActions, refetch])

  // Store data for offline access
  const storeOfflineData = useCallback(async (key: string, data: any) => {
    await offlineManager.storeData(key, data)
  }, [])

  // Get stored offline data
  const getOfflineData = useCallback(async (key: string) => {
    return await offlineManager.getStoredData(key)
  }, [])

  // Queue an action for offline sync
  const queueOfflineAction = useCallback(
    async (action: { type: 'create' | 'update' | 'delete'; endpoint: string; data: any }) => {
      await offlineManager.queueAction(action)
      refetch()
    },
    [refetch],
  )

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    await offlineManager.clearOfflineData()
    refetch()
  }, [refetch])

  return {
    // Status
    isOnline,
    isOffline: !isOnline,
    pendingActions: offlineStatus?.pendingActions || 0,
    lastSync: offlineStatus?.lastSync,
    dataVersion: offlineStatus?.dataVersion,

    // Actions
    syncOfflineActions,
    storeOfflineData,
    getOfflineData,
    queueOfflineAction,
    clearOfflineData,

    // Loading states
    isProcessing,

    // Utilities
    hasPendingActions: (offlineStatus?.pendingActions || 0) > 0,
    canSync: isOnline && (offlineStatus?.pendingActions || 0) > 0,
  }
}
