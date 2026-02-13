/**
 * Uploads API
 *
 * RTK Query endpoints for file upload operations via presigned URLs.
 * Story BUGF-032: Frontend Integration for Presigned URL Upload
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { SERVERLESS_ENDPOINTS } from '../config/endpoints'
import {
  GeneratePresignedUrlResponseSchema,
  type GeneratePresignedUrlRequest,
  type GeneratePresignedUrlResponse,
} from '../schemas/uploads'
import { createServerlessBaseQuery } from './base-query'

/**
 * Uploads API
 *
 * Provides presigned URL generation for direct S3 uploads.
 * Uses JWT Bearer token authentication via CognitoTokenManager.
 */
export const uploadsApi = createApi({
  reducerPath: 'uploadsApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    enableJwtAuth: true,
  }),
  tagTypes: [],
  endpoints: builder => ({
    /**
     * POST /api/uploads/presigned-url
     *
     * Generate a presigned URL for direct S3 upload.
     * No cache invalidation needed (presigned URLs are one-time use).
     */
    generatePresignedUrl: builder.mutation<
      GeneratePresignedUrlResponse,
      GeneratePresignedUrlRequest
    >({
      query: body => ({
        url: SERVERLESS_ENDPOINTS.UPLOADS.GENERATE_PRESIGNED_URL,
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => GeneratePresignedUrlResponseSchema.parse(response),
    }),
  }),
})

export const { useGeneratePresignedUrlMutation } = uploadsApi
