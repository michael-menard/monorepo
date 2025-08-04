import { createApi } from '@reduxjs/toolkit/query/react'
import { 
  createCacheMonitor, 
  createCachedBaseQuery,
  getRTKQueryCacheConfig 
} from '@repo/shared-cache'
import { config } from '../config/environment.js'
import { offlineManager } from './offlineManager.js'

// Re-export schemas from main API
export { 
  MOCInstructionSchema, 
  CreateMOCInstructionSchema, 
  UpdateMOCInstructionSchema,
  type MOCInstruction,
  type CreateMOCInstruction,
  type UpdateMOCInstruction,
  type ApiResponse
} from './api.js'

// Handle offline requests
const handleOfflineRequest = async (args: any) => {
  const { url, method, body } = args
  
  // For GET requests, try to return cached data
  if (method === 'GET') {
    const cachedData = await offlineManager.getStoredData(url)
    if (cachedData) {
      return { data: cachedData, meta: { fromCache: true } }
    }
    
    // Return empty data for offline GET requests
    return { 
      data: null, 
      error: { status: 'OFFLINE', error: 'No cached data available offline' },
      meta: { fromCache: false }
    }
  }
  
  // For mutations (POST, PUT, DELETE), queue for later sync
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const actionType = method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete'
    
    await offlineManager.queueAction({
      type: actionType,
      endpoint: url,
      data: body,
    })
    
    // Return optimistic response
    return { 
      data: { success: true, message: 'Queued for offline sync', data: body },
      meta: { queued: true }
    }
  }
  
  throw new Error('Unsupported offline operation')
}

// Enhanced base query with offline support
const createOfflineBaseQuery = (baseUrl: string, cacheConfig: any) => {
  const baseQuery = createCachedBaseQuery(baseUrl, cacheConfig)
  
  return async (args: any, api: any, extraOptions: any) => {
    // Check if we're offline
    if (!navigator.onLine) {
      return handleOfflineRequest(args, api, extraOptions)
    }
    
    try {
      // Try online request first
      const result = await baseQuery(args)
      return result
    } catch (error: any) {
      // If network error, fall back to offline handling
      if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
        return handleOfflineRequest(args, api, extraOptions)
      }
      throw error
    }
  }
}



// Create cache monitor for performance tracking
// const cacheMonitor = createCacheMonitor()

// Create the offline-aware API service
export const offlineApi = createApi({
  reducerPath: 'offlineApi',
  baseQuery: createOfflineBaseQuery(config.api.baseUrl, {
    maxAge: 300, // 5 minutes cache
  }),
  tagTypes: ['MOCInstruction', 'OfflineAction'],
  endpoints: (builder) => ({
    // Get all MOC instructions with offline support
    getMOCInstructions: builder.query<ApiResponse<Array<MOCInstruction>>, void>({
      query: () => 'moc-instructions',
      providesTags: ['MOCInstruction'],
      ...getRTKQueryCacheConfig('medium'), // 5 minutes cache
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          // Store data for offline access
          await offlineManager.storeData('moc-instructions', data)
        } catch (error) {
          console.error('Failed to cache MOC instructions:', error)
        }
      },
    }),

    // Get a single MOC instruction by ID with offline support
    getMOCInstruction: builder.query<ApiResponse<MOCInstruction>, string>({
      query: (id) => `moc-instructions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'MOCInstruction', id }],
      ...getRTKQueryCacheConfig('long'), // 30 minutes cache for individual items
      async onQueryStarted(id, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          // Store data for offline access
          await offlineManager.storeData(`moc-instructions/${id}`, data)
        } catch (error) {
          console.error('Failed to cache MOC instruction:', error)
        }
      },
    }),

    // Create a new MOC instruction with offline support
    createMOCInstruction: builder.mutation<ApiResponse<MOCInstruction>, CreateMOCInstruction>({
      query: (body) => ({
        url: 'moc-instructions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MOCInstruction'],
      async onQueryStarted(body, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchResult = dispatch(
          offlineApi.util.updateQueryData('getMOCInstructions', undefined, (draft) => {
            if (draft?.data) {
              const newMOC = {
                id: `temp-${Date.now()}`,
                ...body,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              draft.data.push(newMOC)
            }
          })
        )
        
        try {
          await queryFulfilled
        } catch {
          // Revert optimistic update on error
          patchResult.undo()
        }
      },
    }),

    // Update an existing MOC instruction with offline support
    updateMOCInstruction: builder.mutation<ApiResponse<MOCInstruction>, { id: string; body: UpdateMOCInstruction }>({
      query: ({ id, body }) => ({
        url: `moc-instructions/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'MOCInstruction', id }],
      async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchResult = dispatch(
          offlineApi.util.updateQueryData('getMOCInstruction', id, (draft) => {
            if (draft?.data) {
              Object.assign(draft.data, body, { updatedAt: new Date().toISOString() })
            }
          })
        )
        
        try {
          await queryFulfilled
        } catch {
          // Revert optimistic update on error
          patchResult.undo()
        }
      },
    }),

    // Delete a MOC instruction with offline support
    deleteMOCInstruction: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `moc-instructions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MOCInstruction'],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchResult = dispatch(
          offlineApi.util.updateQueryData('getMOCInstructions', undefined, (draft) => {
            if (draft?.data) {
              const index = draft.data.findIndex(moc => moc.id === id)
              if (index !== -1) {
                draft.data.splice(index, 1)
              }
            }
          })
        )
        
        try {
          await queryFulfilled
        } catch {
          // Revert optimistic update on error
          patchResult.undo()
        }
      },
    }),

    // Search MOC instructions with offline support
    searchMOCInstructions: builder.query<ApiResponse<Array<MOCInstruction>>, { query: string; filters?: any }>({
      query: ({ query, filters }) => ({
        url: 'moc-instructions/search',
        params: { q: query, ...filters },
      }),
      providesTags: ['MOCInstruction'],
      ...getRTKQueryCacheConfig('short'), // Short cache for search results
    }),

    // Get offline status
    getOfflineStatus: builder.query<{
      isOnline: boolean
      pendingActions: number
      lastSync: number
      dataVersion: string
    }, void>({
      queryFn: () => {
        return { data: offlineManager.getOfflineStatus() }
      },
      providesTags: ['OfflineAction'],
    }),

    // Process queued offline actions
    processOfflineActions: builder.mutation<void, void>({
      queryFn: async () => {
        await offlineManager.processQueuedActions()
        return { data: undefined }
      },
      invalidatesTags: ['OfflineAction', 'MOCInstruction'],
    }),
  }),
})

// Export hooks for use in components
export const {
  useGetMOCInstructionsQuery,
  useGetMOCInstructionQuery,
  useCreateMOCInstructionMutation,
  useUpdateMOCInstructionMutation,
  useDeleteMOCInstructionMutation,
  useSearchMOCInstructionsQuery,
  useGetOfflineStatusQuery,
  useProcessOfflineActionsMutation,
} = offlineApi 