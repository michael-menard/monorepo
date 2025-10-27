import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import { createCachedBaseQuery, getRTKQueryCacheConfig } from '@repo/cache'
import { getCSRFHeaders } from '@repo/auth'
import { apiClient } from './apiClient.js'

// Zod schemas for type safety - Updated to match backend API response
export const MOCInstructionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  type: z.string().optional(),
  author: z.string().optional(),
  brand: z.string().optional().nullable(),
  theme: z.string().optional().nullable(),
  setNumber: z.string().optional().nullable(),
  releaseYear: z.number().optional().nullable(),
  retired: z.boolean().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  totalPieceCount: z.number().int().min(0).optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  files: z
    .array(
      z.object({
        id: z.string(),
        mocId: z.string(),
        fileType: z.string(),
        fileUrl: z.string(),
        originalFilename: z.string(),
        mimeType: z.string(),
        createdAt: z.string(),
      }),
    )
    .optional(),
})

export const CreateMOCInstructionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  pieces: z.number().positive(),
  estimatedTime: z.number().positive(),
  instructions: z.array(
    z.object({
      step: z.number().positive(),
      image: z.string().min(1), // Accept both absolute and relative URLs
      description: z.string().min(1),
      parts: z.array(
        z.object({
          partNumber: z.string().min(1),
          color: z.string().min(1),
          quantity: z.number().positive(),
        }),
      ),
    }),
  ),
  tags: z.array(z.string()),
})

export const UpdateMOCInstructionSchema = CreateMOCInstructionSchema.partial()

// TypeScript types
export type MOCInstruction = z.infer<typeof MOCInstructionSchema>
export type CreateMOCInstruction = z.infer<typeof CreateMOCInstructionSchema>
export type UpdateMOCInstruction = z.infer<typeof UpdateMOCInstructionSchema>

// API response wrapper - matches backend standard
export interface ApiResponse<T> {
  status: number
  message: string
  data?: T
  error?: string
  details?: any
}

// Create cache monitor for performance tracking
// const cacheMonitor = createCacheMonitor()

// Custom base query with CSRF protection and retry logic for mutations
const baseQueryWithCSRF = async (args: any, api: any, extraOptions: any) => {
  const { method } = typeof args === 'string' ? { method: 'GET' } : args
  const isMutation = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())

  let requestArgs = args

  // Add CSRF headers for mutation requests
  if (isMutation) {
    try {
      const csrfHeaders = await getCSRFHeaders()
      if (typeof args === 'string') {
        requestArgs = {
          url: args,
          headers: csrfHeaders,
        }
      } else {
        requestArgs = {
          ...args,
          headers: {
            ...csrfHeaders,
            ...args.headers,
          },
        }
      }
    } catch (error) {
      console.error('Failed to add CSRF headers:', error)
      // Continue with request without CSRF token - let server handle the error
    }
  }

  // Use environment-aware base URL from apiClient
  const baseUrl = apiClient.getLegoApiUrl('/api')
  console.log('🚨 API BASE URL BEING USED IN RTK QUERY:', baseUrl)
  const cachedBaseQuery = fetchBaseQuery(
    createCachedBaseQuery(baseUrl, {
      maxAge: 300, // 5 minutes cache
      ...apiClient.getFetchConfig(),
    }),
  )

  // Make the initial request
  let result = await cachedBaseQuery(requestArgs, api, extraOptions)

  // Handle CSRF failures with retry logic
  if (
    result.error &&
    'status' in result.error &&
    result.error.status === 403 &&
    result.error.data &&
    typeof result.error.data === 'object' &&
    'code' in result.error.data &&
    result.error.data.code === 'CSRF_FAILED' &&
    isMutation &&
    !extraOptions?.skipCSRFRetry // Prevent infinite retry loops
  ) {
    console.log('CSRF token failed, attempting to refresh and retry request')

    try {
      // Import refreshCSRFToken dynamically to avoid circular dependencies
      const { refreshCSRFToken } = await import('@repo/auth')

      // Get a fresh CSRF token
      const newToken = await refreshCSRFToken()

      // Update the request with the new CSRF token
      const retryHeaders = {
        ...requestArgs.headers,
        'X-CSRF-Token': newToken,
      }

      const retryArgs =
        typeof args === 'string'
          ? { url: args, headers: retryHeaders }
          : { ...args, headers: retryHeaders }

      // Retry the request with skipCSRFRetry flag to prevent infinite loops
      console.log('Retrying request with fresh CSRF token')
      result = await cachedBaseQuery(retryArgs, api, { ...extraOptions, skipCSRFRetry: true })

      if (!result.error) {
        console.log('Request succeeded after CSRF token refresh')
      }
    } catch (refreshError) {
      console.error('Failed to refresh CSRF token for retry:', refreshError)
      // Return original error if refresh fails
    }
  }

  return result
}

// Create the API service
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithCSRF,
  tagTypes: ['MOCInstruction'],
  endpoints: builder => ({
    // Get all MOC instructions
    getMOCInstructions: builder.query<ApiResponse<Array<MOCInstruction>>, void>({
      query: () => 'mocs/search',
      providesTags: ['MOCInstruction'],
      ...getRTKQueryCacheConfig('medium'), // 5 minutes cache
    }),

    // Get a single MOC instruction by ID
    getMOCInstruction: builder.query<ApiResponse<MOCInstruction>, string>({
      query: id => `mocs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'MOCInstruction', id }],
      ...getRTKQueryCacheConfig('long'), // 30 minutes cache for individual items
    }),

    // Create a new MOC instruction
    createMOCInstruction: builder.mutation<ApiResponse<MOCInstruction>, CreateMOCInstruction>({
      query: body => ({
        url: 'mocs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MOCInstruction'],
    }),

    // Update an existing MOC instruction
    updateMOCInstruction: builder.mutation<
      ApiResponse<MOCInstruction>,
      { id: string; body: UpdateMOCInstruction }
    >({
      query: ({ id, body }) => ({
        url: `mocs/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'MOCInstruction', id }],
    }),

    // Delete a MOC instruction
    deleteMOCInstruction: builder.mutation<ApiResponse<void>, string>({
      query: id => ({
        url: `mocs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MOCInstruction'],
    }),

    // Get MOC statistics by category
    getMOCStatsByCategory: builder.query<
      ApiResponse<Array<{ category: string; count: number }>>,
      void
    >({
      query: () => 'mocs/stats/by-category',
      providesTags: ['MOCInstruction'],
      ...getRTKQueryCacheConfig('medium'), // 5 minutes cache
    }),

    // Get MOC uploads over time statistics
    getMOCUploadsOverTime: builder.query<
      { success: boolean; data: Array<{ date: string; category: string; count: number }> },
      void
    >({
      query: () => 'mocs/stats/uploads-over-time',
      providesTags: ['MOCInstruction'],
      ...getRTKQueryCacheConfig('medium'), // 5 minutes cache
    }),

    // Search MOC instructions
    searchMOCInstructions: builder.query<
      ApiResponse<Array<MOCInstruction>>,
      { query: string; filters?: any }
    >({
      query: ({ query, filters }) => ({
        url: 'mocs/search',
        params: { q: query, ...filters },
      }),
      providesTags: ['MOCInstruction'],
      ...getRTKQueryCacheConfig('short'), // Short cache for search results
    }),

    // Upload parts list file
    uploadPartsList: builder.mutation<ApiResponse<any>, { mocId: string; file: File }>({
      query: ({ mocId, file }) => {
        const formData = new FormData()
        formData.append('partsListFile', file)
        formData.append('mocId', mocId)
        formData.append('fileType', 'parts-list')

        return {
          url: 'mocs/upload-parts-list',
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: (_result, _error, { mocId }) => [
        { type: 'MOCInstruction', id: mocId },
        'MOCInstruction',
      ],
    }),

    // Upload thumbnail image
    uploadMocThumbnail: builder.mutation<ApiResponse<any>, { mocId: string; file: File }>({
      query: ({ mocId, file }) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileType', 'thumbnail')

        return {
          url: `mocs/${mocId}/files`,
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: (_result, _error, { mocId }) => [
        { type: 'MOCInstruction', id: mocId },
        'MOCInstruction',
      ],
    }),

    // Delete file from MOC
    deleteMocFile: builder.mutation<ApiResponse<void>, { mocId: string; fileId: string }>({
      query: ({ mocId, fileId }) => ({
        url: `mocs/${mocId}/files/${fileId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { mocId }) => [
        { type: 'MOCInstruction', id: mocId },
        'MOCInstruction',
      ],
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
  useGetMOCStatsByCategoryQuery,
  useGetMOCUploadsOverTimeQuery,
  useSearchMOCInstructionsQuery,
  useUploadPartsListMutation,
  useUploadMocThumbnailMutation,
  useDeleteMocFileMutation,
} = api
