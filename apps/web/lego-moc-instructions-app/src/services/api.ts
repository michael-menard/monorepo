import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import { createCachedBaseQuery } from '@repo/cache/utils/rtkQueryCache'
import { getRTKQueryCacheConfig } from '@repo/cache/utils/rtkQueryCache'
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

// Custom base query with Cognito JWT authentication (no CSRF needed)
const baseQueryWithAuth = async (args: any, api: any, extraOptions: any) => {
  // Cognito JWT tokens are automatically added by apiClient.getFetchConfig()
  const requestArgs = args

  // Use environment-aware base URL from apiClient
  const baseUrl = apiClient.getLegoApiUrl('/api')
  const cachedBaseQuery = fetchBaseQuery(
    createCachedBaseQuery(baseUrl, {
      maxAge: 300, // 5 minutes cache
      ...apiClient.getFetchConfig(),
    }),
  )

  // Make the request - Cognito JWT tokens don't need CSRF retry logic
  const result = await cachedBaseQuery(requestArgs, api, extraOptions)
  return result
}

// Create the API service
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
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
