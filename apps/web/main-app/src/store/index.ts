import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { createGalleryApi } from '@repo/api-client/rtk/gallery-api'
import { createWishlistApi } from '@repo/api-client/rtk/wishlist-api'
import { instructionsApi } from '@repo/api-client/rtk/instructions-api'
import { dashboardApi } from '@repo/api-client/rtk/dashboard-api'
import { setsApi } from '@repo/api-client/rtk/sets-api'
import { permissionsApi } from '@repo/api-client/rtk/permissions-api'
import { adminApi } from '@repo/api-client/rtk/admin-api'
import { inspirationApi } from '@repo/api-client/rtk/inspiration-api'
import { authSlice } from './slices/authSlice'
import { themeSlice } from './slices/themeSlice'
import { navigationSlice } from './slices/navigationSlice'
import { globalUISlice } from './slices/globalUISlice'
import { getAuthFailureHandler } from '@/services/api/authFailureHandler'

// Create enhanced API instances with global auth failure handler (Story 1.29)
// The handler redirects to login on 401 responses after token refresh fails
export const enhancedGalleryApi = createGalleryApi({
  onAuthFailure: getAuthFailureHandler(),
})

export const enhancedWishlistApi = createWishlistApi({
  onAuthFailure: getAuthFailureHandler(),
})

// Note: instructionsApi uses the pre-created instance from @repo/api-client
// to ensure hooks from @repo/app-instructions-gallery work correctly

// Legacy exports for backward compatibility
export const galleryApi = enhancedGalleryApi
export const wishlistApi = enhancedWishlistApi
export { dashboardApi }

export const store = configureStore({
  reducer: {
    // Core shell app slices
    auth: authSlice.reducer,
    theme: themeSlice.reducer,
    navigation: navigationSlice.reducer,
    globalUI: globalUISlice.reducer,

    // Enhanced API slices
    [enhancedGalleryApi.reducerPath]: enhancedGalleryApi.reducer,
    [enhancedWishlistApi.reducerPath]: enhancedWishlistApi.reducer,
    [instructionsApi.reducerPath]: instructionsApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [setsApi.reducerPath]: setsApi.reducer,
    [permissionsApi.reducerPath]: permissionsApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [inspirationApi.reducerPath]: inspirationApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Ignore RTK Query actions
          'persist/PERSIST',
          'persist/REHYDRATE',
        ],
      },
    })
      .concat(enhancedGalleryApi.middleware)
      .concat(enhancedWishlistApi.middleware)
      .concat(instructionsApi.middleware)
      .concat(dashboardApi.middleware)
      .concat(setsApi.middleware)
      .concat(permissionsApi.middleware)
      .concat(adminApi.middleware)
      .concat(inspirationApi.middleware),
  devTools: import.meta.env.DEV,
})

// Enable refetchOnFocus and refetchOnReconnect behaviors for RTK Query
setupListeners(store.dispatch)

// Expose store to window object in development for E2E testing
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  ;(window as any).__REDUX_STORE__ = store
}

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export enhanced API hooks for use in components
export const {
  // Enhanced Gallery API hooks
  useEnhancedGallerySearchQuery,
  useLazyEnhancedGallerySearchQuery,
  useGetGalleryImageQuery,
  useGetGalleryImageMetadataQuery,
  useBatchGetGalleryImagesQuery,
  useUploadGalleryImageMutation,
  useBatchUploadGalleryImagesMutation,
  useUpdateGalleryImageMutation,
  useDeleteGalleryImageMutation,
  useEnhancedBatchGalleryOperationMutation,
  useGetEnhancedGalleryStatsQuery,
} = enhancedGalleryApi

export const {
  // Enhanced Wishlist API hooks
  useEnhancedWishlistQueryQuery,
  useLazyEnhancedWishlistQueryQuery,
  useGetWishlistItemQuery,
  useAddWishlistItemMutation,
  useUpdateWishlistItemMutation,
  useDeleteWishlistItemMutation,
  useEnhancedBatchWishlistOperationMutation,
  useShareWishlistMutation,
  useGetSharedWishlistQuery,
  useImportWishlistItemsMutation,
  useExportWishlistMutation,
  useGetEnhancedPriceEstimatesQuery,
  useGetEnhancedWishlistStatsQuery,
  useManagePriceAlertsMutation,
} = enhancedWishlistApi

// Dashboard API hooks (Story 2.2, 2.3, 2.4)
export const { useGetStatsQuery, useGetRecentMocsQuery, useRefreshDashboardMutation } = dashboardApi

// Permissions API hooks (Cognito Scopes / Authorization)
export const {
  useGetPermissionsQuery,
  useGetQuotasQuery,
  useGetFeaturesQuery,
  useInvalidatePermissionsMutation,
  useInvalidateQuotasMutation,
} = permissionsApi

// Export permissionsApi for PermissionsProvider
export { permissionsApi }

// Admin API hooks (Admin Panel)
export const {
  useListUsersQuery,
  useLazyListUsersQuery,
  useGetUserDetailQuery,
  useLazyGetUserDetailQuery,
  useRevokeTokensMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useGetAuditLogQuery,
  useLazyGetAuditLogQuery,
} = adminApi

// Export adminApi for direct access
export { adminApi }

// Legacy hook aliases for backward compatibility
export const useSearchGalleryQuery = useEnhancedGallerySearchQuery
export const useGetWishlistQuery = useEnhancedWishlistQueryQuery
export const useBatchGalleryOperationMutation = useEnhancedBatchGalleryOperationMutation
export const useBatchWishlistOperationMutation = useEnhancedBatchWishlistOperationMutation
export const useGetGalleryStatsQuery = useGetEnhancedGalleryStatsQuery
export const useGetWishlistStatsQuery = useGetEnhancedWishlistStatsQuery
export const useGetPriceEstimatesQuery = useGetEnhancedPriceEstimatesQuery
