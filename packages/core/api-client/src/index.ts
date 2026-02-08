/**
 * @repo/api-client
 *
 * Serverless-optimized API client with retry logic and error handling.
 * Re-exports common utilities for convenient imports.
 */

// Schemas - Zod schemas for runtime validation and type inference
export * from './schemas/index'

// Client
export { ServerlessApiClient } from './client/serverless-client'

// RTK Query APIs
export { galleryApi } from './rtk/gallery-api'
export { wishlistApi } from './rtk/wishlist-api'
export { wishlistGalleryApi } from './rtk/wishlist-gallery-api'
export { setsApi } from './rtk/sets-api'
export { dashboardApi } from './rtk/dashboard-api'
export { instructionsApi } from './rtk/instructions-api'
export { permissionsApi } from './rtk/permissions-api'
export { adminApi } from './rtk/admin-api'

// Auth utilities
export {
  CognitoTokenManager,
  type CognitoTokens,
  type CognitoJwtUser,
  type CognitoTokenManagerConfig,
} from './auth/cognito-integration'

// RTK Auth integration
export { createAuthenticatedBaseQuery } from './auth/rtk-auth-integration'

// Base query
export { serverlessBaseQuery } from './rtk/base-query'

// Retry logic
export { withRetry, withPriorityRetry, type RetryConfig } from './retry/retry-logic'
export { ServerlessApiError, handleServerlessError } from './retry/error-handling'

// Config
export { getServerlessApiConfig, type ServerlessApiConfig } from './config/environments'
export { SERVERLESS_ENDPOINTS, buildEndpoint } from './config/endpoints'


// RTK Query Hooks - Instructions/MOC (INST-1103, INST-1107)
export {
  useUploadThumbnailMutation,
  useGetMocDetailQuery,
  useCreateMocMutation,
  useUpdateMocMutation,
  useDeleteMocMutation,
  useUploadInstructionFileMutation,
  useUploadPartsListFileMutation,
  useDeleteFileMutation,
  // INST-1107: File download
  useLazyGetFileDownloadUrlQuery,
} from './rtk/instructions-api'
