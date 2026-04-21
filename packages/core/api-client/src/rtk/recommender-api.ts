/**
 * AI Part Recommender API
 *
 * RTK Query endpoints for concept expansion, parts search,
 * explanations, and build project CRUD.
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { createServerlessBaseQuery } from './base-query'

// ─────────────────────────────────────────────────────────────────────────
// Types (inline — matches backend Zod schemas)
// ─────────────────────────────────────────────────────────────────────────

export interface ConceptSignals {
  colors: string[]
  categories: string[]
  accessoryTypes: string[]
  styleDescriptors: string[]
  relatedThemes: string[]
}

export interface ScoredPart {
  partNumber: string
  partName: string
  color: string
  category: string | null
  theme: string | null
  imageUrl: string | null
  source: 'collection' | 'wishlist' | 'external'
  score: number
  matchReasons: string[]
}

export interface DonorMinifig {
  variantId: string
  name: string
  legoNumber: string | null
  theme: string | null
  imageUrl: string | null
  matchingParts: number
  reason: string
}

export interface SearchResult {
  collection: ScoredPart[]
  wishlist: ScoredPart[]
  external: ScoredPart[]
  totalResults: number
  donorMinifigs: DonorMinifig[]
}

export interface PartExplanation {
  partNumber: string
  color: string
  explanation: string
}

export interface BuildProject {
  id: string
  userId: string
  name: string
  concept: string
  searchSignals: ConceptSignals | null
  createdAt: string
  updatedAt: string
}

export interface BuildProjectPart {
  id: string
  projectId: string
  partNumber: string
  color: string
  quantity: number
  source: 'collection' | 'wishlist' | 'external'
  explanation: string | null
  createdAt: string
}

export interface BuildProjectWithParts extends BuildProject {
  parts: BuildProjectPart[]
}

// ─────────────────────────────────────────────────────────────────────────
// API Definition
// ─────────────────────────────────────────────────────────────────────────

export const recommenderApi = createApi({
  reducerPath: 'recommenderApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
  }),
  tagTypes: ['BuildProject', 'BuildProjectList'],
  endpoints: builder => ({
    /**
     * POST /recommender/expand
     * Expand a freeform concept into structured search signals
     */
    expandConcept: builder.mutation<ConceptSignals, { concept: string }>({
      query: body => ({
        url: '/recommender/expand',
        method: 'POST',
        body,
      }),
    }),

    /**
     * POST /recommender/search
     * Search for parts matching concept signals
     */
    searchParts: builder.mutation<SearchResult, { signals: ConceptSignals; limit?: number }>({
      query: body => ({
        url: '/recommender/search',
        method: 'POST',
        body,
      }),
    }),

    /**
     * POST /recommender/explain
     * Generate LLM explanations for recommended parts
     */
    explainParts: builder.mutation<
      PartExplanation[],
      {
        concept: string
        parts: Array<{
          partNumber: string
          partName: string
          color: string
          category: string | null
          source: 'collection' | 'wishlist' | 'external'
          matchReasons: string[]
        }>
      }
    >({
      query: body => ({
        url: '/recommender/explain',
        method: 'POST',
        body,
      }),
    }),

    /**
     * POST /recommender/projects
     * Save selected parts as a build project
     */
    createBuildProject: builder.mutation<
      BuildProjectWithParts,
      {
        name: string
        concept: string
        searchSignals?: ConceptSignals
        parts: Array<{
          partNumber: string
          color: string
          quantity?: number
          source: 'collection' | 'wishlist' | 'external'
          explanation?: string
        }>
      }
    >({
      query: body => ({
        url: '/recommender/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BuildProjectList'],
    }),

    /**
     * GET /recommender/projects
     * List user's build projects
     */
    getBuildProjects: builder.query<BuildProject[], void>({
      query: () => ({ url: '/recommender/projects' }),
      providesTags: result =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'BuildProject' as const, id })),
              { type: 'BuildProjectList' },
            ]
          : [{ type: 'BuildProjectList' }],
    }),

    /**
     * GET /recommender/projects/:id
     * Get a specific build project with parts
     */
    getBuildProjectById: builder.query<BuildProjectWithParts, string>({
      query: id => ({ url: `/recommender/projects/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'BuildProject', id }],
    }),

    /**
     * DELETE /recommender/projects/:id
     * Delete a build project
     */
    deleteBuildProject: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: `/recommender/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BuildProjectList'],
    }),
  }),
})

export const {
  useExpandConceptMutation,
  useSearchPartsMutation,
  useExplainPartsMutation,
  useCreateBuildProjectMutation,
  useGetBuildProjectsQuery,
  useGetBuildProjectByIdQuery,
  useDeleteBuildProjectMutation,
} = recommenderApi
