/**
 * Instructions Gallery API Integration
 * RTK Query endpoints for instructions gallery operations
 *
 * Story 3.1.3: Instructions Gallery API Endpoints
 * Story INST-1008: Wire RTK Query Mutations for MOC Instructions API
 */

import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { createApi } from '@reduxjs/toolkit/query/react'
import { createLogger } from '@repo/logger'
import { createAuthenticatedBaseQuery } from '../auth/rtk-auth-integration'
import { SERVERLESS_ENDPOINTS, buildEndpoint } from '../config/endpoints'
import type { Instruction } from '../types/api-responses'
import {
  MocInstructionsSchema,
  MocFileSchema,
  MocListResponseSchema,
  GetMocDetailResponseSchema,
  UploadThumbnailResponseSchema,
  GetFileDownloadUrlResponseSchema,
  // INST-1105: Presigned upload schemas
  CreateUploadSessionResponseSchema,
  CompleteUploadSessionResponseSchema,
  type MocInstructions,
  type MocFile,
  type CreateMocInput,
  type UpdateMocInput,
  type ListMocsQuery,
  type MocListResponse,
  type GetMocDetailResponse,
  type GetFileDownloadUrlResponse,
  type CreateUploadSessionRequest,
  type CreateUploadSessionResponse,
  type CompleteUploadSessionResponse,
} from '../schemas/instructions'
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
      requireAuthForEndpoints: ['/instructions/mocs'],
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
    // Story INST-1008: Updated tag types for cache invalidation
    tagTypes: ['Moc', 'MocList', 'MocFile'],
    endpoints: builder => ({
      /**
       * GET /instructions/mocs/search - List MOC instructions with pagination and filtering
       *
       * Supports:
       * - Search by title/description
       * - Filter by tags
       * - Filter by theme
       * - Sort by name, createdAt, pieceCount
       * - Pagination with page/limit
       */
      getInstructions: builder.query<MocListResponse, Partial<ListMocsQuery>>({
        query: (params = {}) => {
          logger.debug('Fetching MOC instructions list', undefined, {
            hasSearch: !!params.search,
            hasTheme: !!params.theme,
            page: params.page,
          })

          return {
            url: SERVERLESS_ENDPOINTS.MOC.SEARCH,
            params: {
              search: params.search || undefined,
              type: params.type || undefined,
              status: params.status || undefined,
              theme: params.theme || undefined,
              page: params.page || 1,
              limit: params.limit || 20,
            },
          }
        },
        transformResponse: (response: unknown) => {
          const validated = MocListResponseSchema.parse(response)
          logger.info('MOC instructions list fetched', undefined, {
            itemCount: validated.items.length,
            totalPages: validated.pagination?.totalPages,
            total: validated.pagination?.total,
          })
          return validated
        },
        providesTags: result =>
          result
            ? [
                ...result.items.map(({ id }) => ({ type: 'Moc' as const, id })),
                { type: 'MocList' as const },
              ]
            : [{ type: 'MocList' as const }],
        // Medium caching for list queries (5 minutes)
        ...getServerlessCacheConfig('medium'),
      }),

      /**
       * GET /instructions/mocs/:id - Get single MOC instruction detail
       */
      getInstructionById: builder.query<MocInstructions, string>({
        query: id => {
          logger.debug('Fetching MOC instruction by ID', undefined, { id })
          return buildEndpoint(SERVERLESS_ENDPOINTS.MOC.GET_INSTRUCTION, { id })
        },
        transformResponse: (response: unknown) => {
          const validated = MocInstructionsSchema.parse(response)
          logger.info('MOC instruction detail fetched', undefined, {
            id: validated.id,
            title: validated.title,
          })
          return validated
        },
        providesTags: (_result, _error, id) => [{ type: 'Moc' as const, id }],
        // Long caching for individual instructions (30 minutes)
        ...getServerlessCacheConfig('long'),
      }),

      /**
       * GET /instructions/mocs/:id - Get MOC detail with files (INST-1101)
       *
       * Returns comprehensive MOC data including all files, stats, and metadata.
       * This endpoint provides the complete data needed for the MOC detail page.
       *
       * Story INST-1101: View MOC Details
       */
      getMocDetail: builder.query<GetMocDetailResponse, string>({
        query: id => {
          logger.debug('Fetching MOC detail with files', undefined, { id })
          return buildEndpoint(SERVERLESS_ENDPOINTS.MOC.GET_INSTRUCTION, { id })
        },
        transformResponse: (response: unknown) => {
          const validated = GetMocDetailResponseSchema.parse(response)
          logger.info('MOC detail fetched', undefined, {
            id: validated.id,
            title: validated.title,
            fileCount: validated.stats.fileCount,
          })
          return validated
        },
        providesTags: (_result, _error, id) => [
          { type: 'Moc' as const, id },
          { type: 'MocFile' as const, id },
        ],
        // Long caching for detail view (30 minutes)
        ...getServerlessCacheConfig('long'),
      }),

      /**
       * POST /instructions/mocs - Create new MOC instruction
       *
       * Story INST-1008: Create MOC mutation
       */
      createMoc: builder.mutation<MocInstructions, CreateMocInput>({
        query: body => {
          logger.debug('Creating new MOC instruction', undefined, { title: body.title })
          return {
            url: SERVERLESS_ENDPOINTS.MOC.CREATE,
            method: 'POST',
            body,
          }
        },
        transformResponse: (response: unknown) => {
          const validated = MocInstructionsSchema.parse(response)
          logger.info('MOC instruction created', undefined, {
            id: validated.id,
            title: validated.title,
          })
          return validated
        },
        invalidatesTags: [{ type: 'MocList' }],
      }),

      /**
       * PATCH /instructions/mocs/:id - Update existing MOC instruction
       *
       * Story INST-1008: Update MOC mutation
       */
      updateMoc: builder.mutation<MocInstructions, { id: string; input: UpdateMocInput }>({
        query: ({ id, input }) => {
          logger.debug('Updating MOC instruction', undefined, { id })
          return {
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPDATE, { id }),
            method: 'PATCH',
            body: input,
          }
        },
        transformResponse: (response: unknown) => {
          const validated = MocInstructionsSchema.parse(response)
          logger.info('MOC instruction updated', undefined, { id: validated.id })
          return validated
        },
        invalidatesTags: (_result, _error, { id }) => [{ type: 'Moc', id }, { type: 'MocList' }],
      }),

      /**
       * DELETE /instructions/mocs/:id - Delete MOC instruction
       *
       * Story INST-1008: Delete MOC mutation
       */
      deleteMoc: builder.mutation<void, string>({
        query: id => {
          logger.debug('Deleting MOC instruction', undefined, { id })
          return {
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.DELETE, { id }),
            method: 'DELETE',
          }
        },
        invalidatesTags: (_result, _error, id) => [{ type: 'Moc', id }, { type: 'MocList' }],
      }),

      /**
       * POST /instructions/mocs/:id/files/instruction - Upload instruction file
       *
       * Story INST-1008: Upload instruction file mutation
       */
      uploadInstructionFile: builder.mutation<MocFile, { mocId: string; file: File }>({
        query: ({ mocId, file }) => {
          logger.debug('Uploading instruction file', undefined, {
            mocId,
            fileName: file.name,
            fileSize: file.size,
          })

          const formData = new FormData()
          formData.append('file', file)

          return {
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPLOAD_INSTRUCTION, { id: mocId }),
            method: 'POST',
            body: formData,
          }
        },
        transformResponse: (response: unknown) => {
          const validated = MocFileSchema.parse(response)
          logger.info('Instruction file uploaded', undefined, {
            fileId: validated.id,
            mocId: validated.mocId,
          })
          return validated
        },
        invalidatesTags: (_result, _error, { mocId }) => [
          { type: 'Moc', id: mocId },
          { type: 'MocFile', id: mocId },
        ],
      }),

      /**
       * POST /instructions/mocs/:id/files/parts-list - Upload parts list file
       *
       * Story INST-1008: Upload parts list file mutation
       */
      uploadPartsListFile: builder.mutation<MocFile, { mocId: string; file: File }>({
        query: ({ mocId, file }) => {
          logger.debug('Uploading parts list file', undefined, {
            mocId,
            fileName: file.name,
            fileSize: file.size,
          })

          const formData = new FormData()
          formData.append('file', file)

          return {
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPLOAD_PARTS_LIST, { id: mocId }),
            method: 'POST',
            body: formData,
          }
        },
        transformResponse: (response: unknown) => {
          const validated = MocFileSchema.parse(response)
          logger.info('Parts list file uploaded', undefined, {
            fileId: validated.id,
            mocId: validated.mocId,
          })
          return validated
        },
        invalidatesTags: (_result, _error, { mocId }) => [
          { type: 'Moc', id: mocId },
          { type: 'MocFile', id: mocId },
        ],
      }),

      /**
       * POST /instructions/mocs/:id/thumbnail - Upload thumbnail image
       *
       * Story INST-1008: Upload thumbnail mutation
       */
      uploadThumbnail: builder.mutation<{ thumbnailUrl: string }, { mocId: string; file: File }>({
        query: ({ mocId, file }) => {
          logger.debug('Uploading thumbnail', undefined, {
            mocId,
            fileName: file.name,
            fileSize: file.size,
          })

          const formData = new FormData()
          formData.append('thumbnail', file)

          return {
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPLOAD_THUMBNAIL, { id: mocId }),
            method: 'POST',
            body: formData,
          }
        },
        transformResponse: (response: unknown) => {
          const validated = UploadThumbnailResponseSchema.parse(response)
          logger.info('Thumbnail uploaded', undefined, {
            thumbnailUrl: validated.thumbnailUrl,
          })
          return validated
        },
        invalidatesTags: (_result, _error, { mocId }) => [
          { type: 'Moc', id: mocId },
          { type: 'MocFile', id: mocId },
        ],
      }),

      /**
       * DELETE /instructions/mocs/:id/files/:fileId - Delete file
       *
       * Story INST-1008: Delete file mutation
       */
      deleteFile: builder.mutation<void, { mocId: string; fileId: string }>({
        query: ({ mocId, fileId }) => {
          logger.debug('Deleting file', undefined, { mocId, fileId })
          return {
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.DELETE_FILE, { id: mocId, fileId }),
            method: 'DELETE',
          }
        },
        invalidatesTags: (_result, _error, { mocId }) => [
          { type: 'Moc', id: mocId },
          { type: 'MocFile', id: mocId },
        ],
      }),

      /**
       * GET /instructions/mocs/:id/files/:fileId/download - Get presigned download URL
       *
       * Story INST-1107: Download Files
       * Generates a presigned S3 URL for secure file download.
       * URL expires in 15 minutes.
       */
      getFileDownloadUrl: builder.query<
        GetFileDownloadUrlResponse,
        { mocId: string; fileId: string }
      >({
        query: ({ mocId, fileId }) => {
          logger.debug('Getting file download URL', undefined, { mocId, fileId })
          return buildEndpoint(SERVERLESS_ENDPOINTS.MOC.DOWNLOAD_FILE, { id: mocId, fileId })
        },
        transformResponse: (response: unknown) => {
          const validated = GetFileDownloadUrlResponseSchema.parse(response)
          logger.info('Download URL generated', undefined, {
            expiresAt: validated.expiresAt,
          })
          return validated
        },
        // INST-1107 AC-41: Do not cache presigned URLs (they expire)
        keepUnusedDataFor: 0,
      }),

      /**
       * POST /instructions/mocs/:id/upload-sessions - Create presigned upload session
       *
       * Story INST-1105: Upload Instructions (Presigned >10MB)
       *
       * Creates an upload session for large files (>10MB) and returns
       * a presigned S3 URL for direct browser-to-S3 upload.
       */
      createUploadSession: builder.mutation<
        CreateUploadSessionResponse,
        { mocId: string; request: CreateUploadSessionRequest }
      >({
        query: ({ mocId, request }) => {
          logger.debug('Creating upload session for presigned upload', undefined, {
            mocId,
            filename: request.filename,
            fileSize: request.fileSize,
          })
          return {
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.CREATE_UPLOAD_SESSION, { id: mocId }),
            method: 'POST',
            body: request,
          }
        },
        transformResponse: (response: unknown) => {
          const validated = CreateUploadSessionResponseSchema.parse(response)
          logger.info('Upload session created', undefined, {
            sessionId: validated.sessionId,
            expiresAt: validated.expiresAt,
          })
          return validated
        },
      }),

      /**
       * POST /instructions/mocs/:id/upload-sessions/:sessionId/complete - Complete upload session
       *
       * Story INST-1105: Upload Instructions (Presigned >10MB)
       *
       * Verifies the file was uploaded to S3 and creates the moc_files record.
       * Should be called after successful direct S3 upload.
       */
      completeUploadSession: builder.mutation<
        CompleteUploadSessionResponse,
        { mocId: string; sessionId: string }
      >({
        query: ({ mocId, sessionId }) => {
          logger.debug('Completing upload session', undefined, { mocId, sessionId })
          return {
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.COMPLETE_UPLOAD_SESSION, {
              id: mocId,
              sessionId,
            }),
            method: 'POST',
            body: { sessionId },
          }
        },
        transformResponse: (response: unknown) => {
          const validated = CompleteUploadSessionResponseSchema.parse(response)
          logger.info('Upload session completed', undefined, {
            fileId: validated.id,
            mocId: validated.mocId,
          })
          return validated
        },
        invalidatesTags: (_result, _error, { mocId }) => [
          { type: 'Moc', id: mocId },
          { type: 'MocFile', id: mocId },
          { type: 'MocList' },
        ],
      }),

      /**
       * Toggle favorite status for an instruction
       *
       * Legacy mutation - uses optimistic update pattern
       */
      toggleInstructionFavorite: builder.mutation<Instruction, { id: string; isFavorite: boolean }>(
        {
          query: ({ id, isFavorite }) => ({
            url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPDATE, { id }),
            method: 'PATCH',
            body: { isFavorite },
          }),
          invalidatesTags: (_result, _error, { id }) => [{ type: 'Moc', id }, { type: 'MocList' }],
          // Optimistic update
          onQueryStarted: async ({ id, isFavorite }, { dispatch, queryFulfilled }) => {
            // Optimistically update the instruction in any cached list
            const patchResult = dispatch(
              instructionsApi.util.updateQueryData(
                'getInstructions',
                {} as Partial<ListMocsQuery>,
                draft => {
                  const instruction = draft?.items?.find(item => item.id === id)
                  if (instruction) {
                    instruction.isFeatured = isFavorite
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
  // Story INST-1101: MOC detail with files
  useGetMocDetailQuery,
  useLazyGetMocDetailQuery,
  // Story INST-1008: New mutation hooks
  useCreateMocMutation,
  useUpdateMocMutation,
  useDeleteMocMutation,
  useUploadInstructionFileMutation,
  useUploadPartsListFileMutation,
  useUploadThumbnailMutation,
  useDeleteFileMutation,
  // Story INST-1107: File download
  useLazyGetFileDownloadUrlQuery,
  // Story INST-1105: Presigned upload session
  useCreateUploadSessionMutation,
  useCompleteUploadSessionMutation,
  // Legacy hooks
  useToggleInstructionFavoriteMutation,
} = instructionsApi
