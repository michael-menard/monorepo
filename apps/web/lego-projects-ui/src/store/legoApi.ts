/**
 * LEGO Sets API Slice (RTK Query)
 * Handles endpoints for fetching LEGO sets and set details
 */
import { z } from 'zod'
import { baseApi } from './api.js';

// Zod schemas for LEGO set data
export const LegoSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  theme: z.string(),
  year: z.number(),
  numParts: z.number(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  isRetired: z.boolean().optional(),
})
export type LegoSet = z.infer<typeof LegoSetSchema>

export const LegoSetListSchema = z.array(LegoSetSchema)

// API slice
export const legoApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLegoSets: build.query<LegoSet[], void>({
      query: () => '/lego/sets',
      transformResponse: (response: unknown) => LegoSetListSchema.parse(response),
      providesTags: ['LegoSet'],
    }),
    getLegoSet: build.query<LegoSet, string>({
      query: (id) => `/lego/sets/${id}`,
      transformResponse: (response: unknown) => LegoSetSchema.parse(response),
      providesTags: (_result, _error, id) => [{ type: 'LegoSet', id }],
    }),
    searchLegoSets: build.query<LegoSet[], { query: string }>({
      query: ({ query }) => `/lego/sets/search?q=${encodeURIComponent(query)}`,
      transformResponse: (response: unknown) => LegoSetListSchema.parse(response),
      providesTags: ['LegoSet'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetLegoSetsQuery,
  useGetLegoSetQuery,
  useSearchLegoSetsQuery,
} = legoApi 