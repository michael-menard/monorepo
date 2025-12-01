// Re-export all mock data
export * from './wishlist'
export * from './moc-instructions'
export * from './profile'

// Re-export store and RTK slices
export * from './store'

// Convenience exports for common use cases
export { mockWishlistItems, getWishlistStats, getWishlistCategories } from './wishlist'

export {
  mockMocInstructions,
  getMocInstructionStats,
  getMocInstructionCategories,
} from './moc-instructions'

export {
  mockUserStats,
  mockRecentActivities,
  mockQuickActions,
  getProfileDashboardData,
} from './profile'

// Explicitly export store actions that might not be picked up by export *
export { setFilter, clearFilters, clearError } from './store/mocInstructionsSlice'
