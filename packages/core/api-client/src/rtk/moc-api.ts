/**
 * MOC API Integration
 * RTK Query endpoints for MOC operations including edit
 * Story 3.1.40: Edit Page & Data Fetching
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { createLogger } from '@repo/logger'
import {
  MocForEditResponseSchema,
  type MocForEditResponse,
  type EditMocRequest,
} from '@repo/upload-types'
import { buildEndpoint, SERVERLESS_ENDPOINTS } from '../config/endpoints'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

const logger = createLogger('api-client:moc')

/**
 * MOC API slice with RTK Query
 * Story 3.1.40: Edit Page & Data Fetching
 */
export const mocApi = createApi({
  reducerPath: 'mocApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    priority: 'high',
  }),
  tagTypes: ['Moc', 'MocForEdit', 'MocList'],
  endpoints: builder => ({
    /**
     * GET /api/v2/mocs/:mocId/edit - Get MOC data for editing
     * Story 3.1.40: Edit Page Data Fetching
     *
     * Returns MOC with ownership validation and file list.
     * Only returns data if user is the owner.
     */
    getMocForEdit: builder.query<MocForEditResponse, string>({
      query: mocId => {
        logger.debug('Fetching MOC for edit', undefined, { mocId })
        return `/api/v2/mocs/${mocId}/edit`
      },
      providesTags: (result, _error, mocId) => [
        { type: 'MocForEdit', id: mocId },
        { type: 'Moc', id: mocId },
      ],
      ...getServerlessCacheConfig('short'),
      transformResponse: (response: unknown) => {
        // Validate response with Zod schema
        const validated = MocForEditResponseSchema.parse(response)
        logger.info('MOC for edit fetched', undefined, {
          mocId: validated.id,
          title: validated.title,
          fileCount: validated.files.length,
        })
        return validated
      },
      transformErrorResponse: (response, _meta, arg) => {
        const status = typeof response.status === 'number' ? response.status : 500
        logger.warn('Failed to fetch MOC for edit', undefined, {
          mocId: arg,
          status,
        })
        return response
      },
    }),

    /**
     * PATCH /api/v2/mocs/:mocId - Update MOC metadata
     * Story 3.1.41: Edit Form & Validation (future)
     */
    updateMoc: builder.mutation<MocForEditResponse, { mocId: string; data: EditMocRequest }>({
      query: ({ mocId, data }) => {
        logger.debug('Updating MOC', undefined, { mocId, fields: Object.keys(data) })
        return {
          url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPDATE, { id: mocId }),
          method: 'PATCH',
          body: data,
        }
      },
      invalidatesTags: (result, _error, { mocId }) => [
        { type: 'MocForEdit', id: mocId },
        { type: 'Moc', id: mocId },
        'MocList',
      ],
      transformResponse: (response: unknown) => {
        const validated = MocForEditResponseSchema.parse(response)
        logger.info('MOC updated', undefined, {
          mocId: validated.id,
          title: validated.title,
        })
        return validated
      },
    }),

    /**
     * GET /api/v2/mocs/:mocId - Get single MOC detail (public)
     */
    getMocById: builder.query<MocForEditResponse, string>({
      query: mocId => {
        logger.debug('Fetching MOC by ID', undefined, { mocId })
        return buildEndpoint(SERVERLESS_ENDPOINTS.MOC.GET_INSTRUCTION, { id: mocId })
      },
      providesTags: (result, _error, mocId) => [{ type: 'Moc', id: mocId }],
      ...getServerlessCacheConfig('long'),
      transformResponse: (response: unknown) => {
        const validated = MocForEditResponseSchema.parse(response)
        logger.info('MOC detail fetched', undefined, {
          mocId: validated.id,
          title: validated.title,
        })
        return validated
      },
    }),
  }),
})

// Export hooks for use in components
export const {
  useGetMocForEditQuery,
  useLazyGetMocForEditQuery,
  useUpdateMocMutation,
  useGetMocByIdQuery,
  useLazyGetMocByIdQuery,
} = mocApi

// Export reducer and middleware for store configuration
export const mocApiReducer = mocApi.reducer
export const mocApiMiddleware = mocApi.middleware
