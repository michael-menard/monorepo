import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import { createCachedBaseQuery, getRTKQueryCacheConfig } from '@repo/shared-cache'
import { config } from '../config/environment.js'

// Zod schemas for type safety
export const MOCInstructionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  author: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  pieces: z.number(),
  estimatedTime: z.number(), // in minutes
  instructions: z.array(z.object({
    step: z.number(),
    image: z.string().url(),
    description: z.string(),
    parts: z.array(z.object({
      partNumber: z.string(),
      color: z.string(),
      quantity: z.number(),
    })),
  })),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateMOCInstructionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  pieces: z.number().positive(),
  estimatedTime: z.number().positive(),
  instructions: z.array(z.object({
    step: z.number().positive(),
    image: z.string().url(),
    description: z.string().min(1),
    parts: z.array(z.object({
      partNumber: z.string().min(1),
      color: z.string().min(1),
      quantity: z.number().positive(),
    })),
  })),
  tags: z.array(z.string()),
})

export const UpdateMOCInstructionSchema = CreateMOCInstructionSchema.partial()

// TypeScript types
export type MOCInstruction = z.infer<typeof MOCInstructionSchema>
export type CreateMOCInstruction = z.infer<typeof CreateMOCInstructionSchema>
export type UpdateMOCInstruction = z.infer<typeof UpdateMOCInstructionSchema>

// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// Create cache monitor for performance tracking
// const cacheMonitor = createCacheMonitor()

// Create the API service
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery(createCachedBaseQuery(config.api.baseUrl, {
    maxAge: 300, // 5 minutes cache
  })),
  tagTypes: ['MOCInstruction'],
  endpoints: (builder) => ({
    // Get all MOC instructions
    getMOCInstructions: builder.query<ApiResponse<Array<MOCInstruction>>, void>({
      query: () => 'moc-instructions',
      providesTags: ['MOCInstruction'],
      ...getRTKQueryCacheConfig('medium'), // 5 minutes cache
    }),

    // Get a single MOC instruction by ID
    getMOCInstruction: builder.query<ApiResponse<MOCInstruction>, string>({
      query: (id) => `moc-instructions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'MOCInstruction', id }],
      ...getRTKQueryCacheConfig('long'), // 30 minutes cache for individual items
    }),

    // Create a new MOC instruction
    createMOCInstruction: builder.mutation<ApiResponse<MOCInstruction>, CreateMOCInstruction>({
      query: (body) => ({
        url: 'moc-instructions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MOCInstruction'],
    }),

    // Update an existing MOC instruction
    updateMOCInstruction: builder.mutation<ApiResponse<MOCInstruction>, { id: string; body: UpdateMOCInstruction }>({
      query: ({ id, body }) => ({
        url: `moc-instructions/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'MOCInstruction', id }],
    }),

    // Delete a MOC instruction
    deleteMOCInstruction: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `moc-instructions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MOCInstruction'],
    }),

    // Search MOC instructions
    searchMOCInstructions: builder.query<ApiResponse<Array<MOCInstruction>>, { query: string; filters?: any }>({
      query: ({ query, filters }) => ({
        url: 'moc-instructions/search',
        params: { q: query, ...filters },
      }),
      providesTags: ['MOCInstruction'],
      ...getRTKQueryCacheConfig('short'), // Short cache for search results
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
} = api 