/**
 * Enhanced Navigation System
 *
 * A comprehensive navigation system with:
 * - Unified navigation state management
 * - Intelligent search across navigation items
 * - Smart breadcrumb generation
 * - Quick actions and recently visited items
 * - Navigation analytics and user preferences
 * - Contextual navigation based on current route
 */

// Core Navigation Components
export { NavigationProvider, useNavigation } from './NavigationProvider'
export { NavigationSearch } from './NavigationSearch'
export { EnhancedBreadcrumb, CompactBreadcrumb } from './EnhancedBreadcrumb'
export { QuickActions } from './QuickActions'
export { UnifiedNavigation } from './UnifiedNavigation'
export { NotFoundHandler, CompactNotFoundHandler, RouteNotFoundHandlers } from './NotFoundHandler'

// Navigation Types (re-exported from slice)
export type {
  NavigationItem,
  BreadcrumbItem,
  NavigationAnalytics,
  NavigationSearch as NavigationSearchState,
} from '@/store/slices/navigationSlice'

// Navigation Actions (re-exported from slice)
export {
  // Core navigation actions
  setActiveRoute,
  toggleMobileMenu,
  closeMobileMenu,
  setBreadcrumbs,
  addBreadcrumb,
  clearBreadcrumbs,
  updateNavigationBadge,
  addNotification,
  clearNotification,
  setNavigationLoading,

  // Enhanced search actions
  setSearchQuery,
  addRecentSearch,
  clearSearchResults,

  // User preference actions
  toggleFavoriteItem,
  toggleHiddenItem,
  updateCustomOrder,
  toggleCompactMode,

  // Contextual navigation actions
  setContextualNavigation,
  addContextualItem,
  removeContextualItem,
  clearContextualNavigation,
} from '@/store/slices/navigationSlice'

// Navigation Selectors (re-exported from slice)
export {
  // Core selectors
  selectNavigation,
  selectPrimaryNavigation,
  selectSecondaryNavigation,
  selectContextualNavigation,
  selectActiveRoute,
  selectIsMobileMenuOpen,
  selectBreadcrumbs,
  selectNavigationLoading,

  // Enhanced feature selectors
  selectNavigationSearch,
  selectNavigationAnalytics,
  selectUserPreferences,
  selectQuickActions,
  selectRecentlyVisited,
  selectNavigationNotifications,

  // Computed selectors
  selectVisiblePrimaryNavigation,
  selectFavoriteNavigation,
  selectActiveNavigationItem,
  selectNavigationItemById,
} from '@/store/slices/navigationSlice'
