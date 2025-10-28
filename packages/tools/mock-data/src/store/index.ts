import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
// Import reducers
import wishlistReducer from './wishlistSlice'
import mocInstructionsReducer from './mocInstructionsSlice'
import profileReducer from './profileSlice'

// Configure store
export const store = configureStore({
  reducer: {
    wishlist: wishlistReducer,
    mocInstructions: mocInstructionsReducer,
    profile: profileReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Export reducers
export { default as wishlistReducer } from './wishlistSlice'
export { default as mocInstructionsReducer } from './mocInstructionsSlice'
export { default as profileReducer } from './profileSlice'

// Export specific actions and selectors to avoid naming conflicts
export {
  // Wishlist exports
  fetchWishlistItems,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  togglePurchaseStatus,
  selectWishlistItems,
  selectWishlistLoading,
  selectWishlistError,
  selectWishlistStats,
  selectFilteredWishlistItems,
  selectWishlistCategories,
  type WishlistState,
} from './wishlistSlice'

export {
  // MOC Instructions exports
  fetchMocInstructions,
  fetchMocInstructionById,
  createMocInstruction,
  updateMocInstruction,
  deleteMocInstruction,
  togglePublishStatus,
  incrementDownloadCount,
  setFilter,
  clearFilters,
  clearError,
  selectMocInstructions,
  selectMocInstructionsLoading,
  selectMocInstructionsError,
  selectMocInstructionsStats,
  selectSelectedMocInstruction,
  selectFilteredMocInstructions,
  selectMocInstructionCategories,
  type MocInstructionsState,
} from './mocInstructionsSlice'

export {
  // Profile exports
  fetchProfileData,
  fetchUserStats,
  fetchRecentActivities,
  addRecentActivity,
  updateUserStats,
  refreshProfileStats,
  selectUserStats,
  selectRecentActivities,
  selectQuickActions,
  selectProfileLoading,
  selectProfileError,
  selectFilteredRecentActivities,
  type ProfileState,
} from './profileSlice'

// Export store setup function for apps
export const createMockDataStore = () => store

// Helper function to get initial state
export const getInitialState = (): RootState => ({
  wishlist: {
    items: [],
    loading: false,
    error: null,
    filters: {
      category: null,
      priority: null,
      showPurchased: true,
    },
    stats: null,
  },
  mocInstructions: {
    instructions: [],
    loading: false,
    error: null,
    filters: {
      search: null,
      category: null,
      difficulty: null,
      author: null,
      tags: [],
      minParts: null,
      maxParts: null,
      minTime: null,
      maxTime: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      isPublic: null,
      isPublished: null,
      showUnpublished: false,
    },
    stats: null,
    selectedInstruction: null,
  },
  profile: {
    userStats: null,
    recentActivities: [],
    quickActions: [],
    loading: false,
    error: null,
    activityFilters: {
      type: null,
      limit: 10,
    },
  },
})

// Helper function to initialize data
export const initializeStore = async (dispatch: AppDispatch) => {
  // Import the thunks dynamically to avoid circular dependencies
  const { fetchWishlistItems } = await import('./wishlistSlice')
  const { fetchMocInstructions } = await import('./mocInstructionsSlice')
  const { fetchProfileData } = await import('./profileSlice')

  try {
    // Fetch all initial data
    await Promise.all([
      dispatch(fetchWishlistItems()),
      dispatch(fetchMocInstructions({})),
      dispatch(fetchProfileData()),
    ])
  } catch (error) {
    console.error('Failed to initialize store:', error)
  }
}

// Re-export types for convenience
export type { WishlistItem } from '../wishlist'
export type { MockInstruction } from '../moc-instructions'
export type { UserStats, RecentActivity, QuickAction } from '../profile'
