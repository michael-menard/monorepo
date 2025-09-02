import { createApi } from '@reduxjs/toolkit/query/react'
import { offlineManager } from './offlineManager'

export const offlineApi = createApi({
  reducerPath: 'offlineApi',
  // No-op baseQuery; endpoints below use queryFn directly
  baseQuery: async () => ({ data: undefined as unknown }),
  endpoints: (builder) => ({
    getOfflineStatus: builder.query<{
      isOnline: boolean
      pendingActions: number
      lastSync: number
      dataVersion: string
    }, void>({
      queryFn: async () => {
        try {
          const status = await offlineManager.getOfflineStatusAsync()
          return { data: status }
        } catch (error) {
          console.error('Failed to get offline status:', error)
          // Fallback to sync method if async fails
          const fallbackStatus = offlineManager.getOfflineStatus()
          return { data: fallbackStatus }
        }
      },
      providesTags: ['OfflineStatus'],
    }),
    processOfflineActions: builder.mutation<{ processed: number; failed: number }, void>({
      queryFn: async () => {
        try {
          const initialPending = await offlineManager.getPendingActionCountAsync()
          await offlineManager.processQueuedActions()
          const remainingPending = await offlineManager.getPendingActionCountAsync()
          
          const processed = Math.max(0, initialPending - remainingPending)
          const failed = remainingPending
          
          return { 
            data: { processed, failed }
          }
        } catch (error) {
          console.error('Failed to process offline actions:', error)
          return { 
            error: { 
              status: 'CUSTOM_ERROR', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            } 
          }
        }
      },
      // Invalidate offline status after processing
      invalidatesTags: ['OfflineStatus'],
    }),
  }),
  tagTypes: ['OfflineStatus'],
})

export const {
  useGetOfflineStatusQuery,
  useProcessOfflineActionsMutation,
} = offlineApi
