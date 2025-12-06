/**
 * Instructions Gallery API Integration
 * RTK Query endpoints for instructions gallery operations
 * Story 3.1.3: Instructions Gallery API Endpoints
 */

import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { createApi } from '@reduxjs/toolkit/query/react'
import { createLogger } from '@repo/logger'
import { createAuthenticatedBaseQuery } from '../auth/rtk-auth-integration'
import { SERVERLESS_ENDPOINTS, buildEndpoint } from '../config/endpoints'
import type {
  Instruction,
  InstructionsListResponse,
  InstructionDetailResponse,
} from '../types/api-responses'
import { getServerlessCacheConfig } from './base-query'

const logger = createLogger('api-client:instructions')

/**
 * Instructions search/filter parameters
 */
export interface GetInstructionsParams {
  /** Search query for name/description */
  search?: string
  /** Filter by tags (comma-separated or array) */
  tags?: string[]
  /** Filter by theme */
  theme?: string | null
  /** Sort field: 'name' | 'createdAt' | 'pieceCount' */
  sort?: 'name' | 'createdAt' | 'pieceCount'
  /** Sort order */
  order?: 'asc' | 'desc'
  /** Page number (1-indexed) */
  page?: number
  /** Items per page */
  limit?: number
}

/**
 * Instructions API configuration options
 */
export interface InstructionsApiConfig {
  getAuthToken?: () => string | undefined
  onAuthFailure?: (error: FetchBaseQueryError) => void
  onTokenRefresh?: (token: string) => void
}

/**
 * Create Instructions API with serverless optimizations
 */
export function createInstructionsApi(config?: InstructionsApiConfig) {
  logger.info('Creating Instructions API with serverless optimizations')

  const { onAuthFailure, onTokenRefresh } = config || {}

  return createApi({
    reducerPath: 'instructionsApi',
    baseQuery: createAuthenticatedBaseQuery({
      baseUrl:
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVERLESS_API_BASE_URL) ||
        '/api',
      enableRetryLogic: true,
      enablePerformanceMonitoring: true,
      enableAuthCaching: true,
      skipAuthForEndpoints: ['/health', '/public'],
      requireAuthForEndpoints: ['/api/v2/mocs'],
      onAuthFailure:
        onAuthFailure ||
        (error => {
          logger.warn('Instructions API authentication failed', undefined, { error })
        }),
      onTokenRefresh:
        onTokenRefresh ||
        (() => {
          logger.debug('Instructions API token refreshed')
        }),
    }),
    tagTypes: ['Instruction', 'InstructionList'],
    endpoints: builder => ({
      /**
       * GET /api/instructions - List instructions with pagination and filtering
       *
       * Supports:
       * - Search by name/description (q parameter)
       * - Filter by tags
       * - Filter by theme
       * - Sort by name, createdAt, pieceCount
       * - Pagination with page/limit
       */
      getInstructions: builder.query<InstructionsListResponse, GetInstructionsParams>({
        query: (params = {}) => {
          logger.debug('Fetching instructions list', undefined, {
            hasSearch: !!params.search,
            hasTags: !!params.tags?.length,
            hasTheme: !!params.theme,
            sort: params.sort,
            page: params.page,
          })

          return {
            url: SERVERLESS_ENDPOINTS.MOC.SEARCH,
            params: {
              q: params.search || undefined,
              tags: params.tags?.join(',') || undefined,
              theme: params.theme || undefined,
              sort: params.sort || undefined,
              order: params.order || undefined,
              page: params.page || 1,
              limit: params.limit || 20,
            },
          }
        },
        transformResponse: (response: InstructionsListResponse) => {
          logger.info('Instructions list fetched', undefined, {
            itemCount: response.data.items.length,
            totalPages: response.pagination?.totalPages,
            total: response.pagination?.total,
          })

          return response
        },
        providesTags: result => {
          const tags: Array<{ type: 'Instruction'; id: string } | { type: 'InstructionList' }> = [
            { type: 'InstructionList' as const },
          ]

          if (result?.data.items) {
            result.data.items.forEach(({ id }) => {
              tags.push({ type: 'Instruction' as const, id })
            })
          }

          return tags
        },
        // Medium caching for list queries (5 minutes)
        ...getServerlessCacheConfig('medium'),
      }),

      /**
       * GET /api/instructions/:id - Get single instruction detail
       */
      getInstructionById: builder.query<InstructionDetailResponse, string>({
        query: id => {
          logger.debug('Fetching instruction by ID', undefined, { id })

          return buildEndpoint(SERVERLESS_ENDPOINTS.MOC.GET_INSTRUCTION, { id })
        },
        transformResponse: (response: InstructionDetailResponse) => {
          logger.info('Instruction detail fetched', undefined, {
            id: response.data.id,
            name: response.data.name,
          })

          return response
        },
        providesTags: (result, _error, id) => [{ type: 'Instruction' as const, id }],
        // Long caching for individual instructions (30 minutes)
        ...getServerlessCacheConfig('long'),
      }),

      /**
       * Toggle favorite status for an instruction
       */
      toggleInstructionFavorite: builder.mutation<Instruction, { id: string; isFavorite: boolean }>(
        {
          query: ({ id, isFavorite }) => ({
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPDATE, { id }),
            method: 'PATCH',
            body: { isFavorite },
          }),
          invalidatesTags: (_result, _error, { id }) => [
            { type: 'Instruction', id },
            'InstructionList',
          ],
          // Optimistic update
          onQueryStarted: async ({ id, isFavorite }, { dispatch, queryFulfilled }) => {
            // Optimistically update the instruction in any cached list
            const patchResult = dispatch(
              instructionsApi.util.updateQueryData(
                'getInstructions',
                {} as GetInstructionsParams,
                draft => {
                  const instruction = draft?.data?.items?.find(item => item.id === id)
                  if (instruction) {
                    instruction.isFavorite = isFavorite
                  }
                },
              ),
            )

            try {
              await queryFulfilled
            } catch {
              // Revert on error
              patchResult.undo()
            }
          },
        },
      ),
    }),
  })
}

/**
 * Default Instructions API instance
 */
export const instructionsApi = createInstructionsApi()

// Export hooks for easy use
export const {
  useGetInstructionsQuery,
  useLazyGetInstructionsQuery,
  useGetInstructionByIdQuery,
  useLazyGetInstructionByIdQuery,
  useToggleInstructionFavoriteMutation,
} = instructionsApi
