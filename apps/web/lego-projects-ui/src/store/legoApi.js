/**
 * LEGO Sets API Slice (RTK Query)
 * Handles endpoints for fetching LEGO sets and set details
 */
import { z } from 'zod';
import { baseApi } from './api';
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
});
export const LegoSetListSchema = z.array(LegoSetSchema);
// API slice
export const legoApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getLegoSets: build.query({
            query: () => '/lego/sets',
            transformResponse: (response) => LegoSetListSchema.parse(response),
            providesTags: ['LegoSet'],
        }),
        getLegoSet: build.query({
            query: (id) => `/lego/sets/${id}`,
            transformResponse: (response) => LegoSetSchema.parse(response),
            providesTags: (_result, _error, id) => [{ type: 'LegoSet', id }],
        }),
        searchLegoSets: build.query({
            query: ({ query }) => `/lego/sets/search?q=${encodeURIComponent(query)}`,
            transformResponse: (response) => LegoSetListSchema.parse(response),
            providesTags: ['LegoSet'],
        }),
    }),
    overrideExisting: false,
});
export const { useGetLegoSetsQuery, useGetLegoSetQuery, useSearchLegoSetsQuery, } = legoApi;
