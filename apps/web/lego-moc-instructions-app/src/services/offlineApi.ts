import { createApi } from '@reduxjs/toolkit/query/react'

// Disabled offline API stub for now. This prevents type/build errors while we
// complete the full offline integration in a follow-up task.
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
        return {
          data: {
            isOnline: true,
            pendingActions: 0,
            lastSync: Date.now(),
            dataVersion: 'offline-disabled',
          },
        }
      },
    }),
    processOfflineActions: builder.mutation<void, void>({
      queryFn: async () => {
        // No-op while offline features are disabled
        return { data: undefined }
      },
    }),
  }),
})

export const {
  useGetOfflineStatusQuery,
  useProcessOfflineActionsMutation,
} = offlineApi