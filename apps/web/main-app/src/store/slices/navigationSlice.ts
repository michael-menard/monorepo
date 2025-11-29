import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface NavigationItem {
  id: string
  label: string
  href: string
  icon?: string
  badge?: string | number
  isActive?: boolean
  children?: NavigationItem[]
  // Enhanced navigation features
  description?: string
  keywords?: string[]
  category?: 'primary' | 'secondary' | 'utility'
  permissions?: string[]
  isNew?: boolean
  isComingSoon?: boolean
  analyticsId?: string
  shortcut?: string
  lastVisited?: string
  visitCount?: number
}

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: string
  isClickable?: boolean
}

export interface NavigationAnalytics {
  itemId: string
  visitCount: number
  lastVisited: string
  averageTimeSpent: number
  clickThroughRate: number
}

export interface NavigationSearch {
  query: string
  results: NavigationItem[]
  isSearching: boolean
  recentSearches: string[]
}

interface NavigationState {
  // Core navigation
  primaryNavigation: NavigationItem[]
  secondaryNavigation: NavigationItem[]
  contextualNavigation: NavigationItem[]
  activeRoute: string
  isMobileMenuOpen: boolean
  breadcrumbs: BreadcrumbItem[]
  isLoading: boolean

  // Enhanced features
  search: NavigationSearch
  analytics: NavigationAnalytics[]
  userPreferences: {
    favoriteItems: string[]
    hiddenItems: string[]
    customOrder: string[]
    compactMode: boolean
  }

  // Dynamic features
  quickActions: NavigationItem[]
  recentlyVisited: NavigationItem[]
  notifications: {
    itemId: string
    count: number
    type: 'info' | 'warning' | 'error' | 'success'
  }[]
}

const initialState: NavigationState = {
  // Enhanced primary navigation with LEGO-specific features
  primaryNavigation: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'LayoutDashboard',
      description: 'Overview of your LEGO collection and activity',
      keywords: ['overview', 'stats', 'summary', 'home'],
      category: 'primary',
      analyticsId: 'nav_dashboard',
      shortcut: 'Cmd+D',
    },
    {
      id: 'gallery',
      label: 'Gallery',
      href: '/gallery',
      icon: 'Images',
      description: 'Browse and discover amazing LEGO MOC designs',
      keywords: ['gallery', 'images', 'mocs', 'browse', 'discover'],
      category: 'primary',
      analyticsId: 'nav_gallery',
      shortcut: 'Cmd+G',
      children: [
        {
          id: 'gallery-featured',
          label: 'Featured MOCs',
          href: '/gallery/featured',
          icon: 'Star',
          description: 'Curated selection of outstanding MOCs',
          keywords: ['featured', 'best', 'curated'],
          category: 'secondary',
        },
        {
          id: 'gallery-recent',
          label: 'Recent Uploads',
          href: '/gallery/recent',
          icon: 'Clock',
          description: 'Latest MOC submissions',
          keywords: ['recent', 'new', 'latest'],
          category: 'secondary',
        },
        {
          id: 'gallery-themes',
          label: 'By Theme',
          href: '/gallery/themes',
          icon: 'Grid',
          description: 'Browse MOCs by LEGO themes',
          keywords: ['themes', 'categories', 'technic', 'city'],
          category: 'secondary',
        },
      ],
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      href: '/wishlist',
      icon: 'Heart',
      description: 'Save and organize your favorite LEGO MOCs',
      keywords: ['wishlist', 'favorites', 'saved', 'want'],
      category: 'primary',
      analyticsId: 'nav_wishlist',
      shortcut: 'Cmd+W',
      children: [
        {
          id: 'wishlist-priority',
          label: 'High Priority',
          href: '/wishlist/priority',
          icon: 'AlertTriangle',
          description: 'Your most wanted items',
          keywords: ['priority', 'urgent', 'important'],
          category: 'secondary',
        },
        {
          id: 'wishlist-price-alerts',
          label: 'Price Alerts',
          href: '/wishlist/alerts',
          icon: 'Bell',
          description: 'Items with active price monitoring',
          keywords: ['alerts', 'prices', 'notifications'],
          category: 'secondary',
        },
      ],
    },
    {
      id: 'instructions',
      label: 'MOC Instructions',
      href: '/instructions',
      icon: 'BookOpen',
      description: 'Step-by-step building instructions for MOCs',
      keywords: ['instructions', 'build', 'guide', 'steps'],
      category: 'primary',
      analyticsId: 'nav_instructions',
      shortcut: 'Cmd+I',
    },
  ],

  // Secondary navigation for utility functions
  secondaryNavigation: [
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: 'Settings',
      description: 'Customize your experience',
      keywords: ['settings', 'preferences', 'config'],
      category: 'utility',
      analyticsId: 'nav_settings',
    },
    {
      id: 'help',
      label: 'Help & Support',
      href: '/help',
      icon: 'HelpCircle',
      description: 'Get help and support',
      keywords: ['help', 'support', 'faq', 'contact'],
      category: 'utility',
      analyticsId: 'nav_help',
    },
  ],

  // Contextual navigation (populated dynamically)
  contextualNavigation: [],

  activeRoute: '/',
  isMobileMenuOpen: false,
  breadcrumbs: [],
  isLoading: false,

  // Enhanced features
  search: {
    query: '',
    results: [],
    isSearching: false,
    recentSearches: [],
  },

  analytics: [],

  userPreferences: {
    favoriteItems: [],
    hiddenItems: [],
    customOrder: [],
    compactMode: false,
  },

  quickActions: [
    {
      id: 'quick-upload',
      label: 'Upload MOC',
      href: '/gallery/upload',
      icon: 'Upload',
      description: 'Share your latest creation',
      keywords: ['upload', 'share', 'create'],
      category: 'primary',
    },
    {
      id: 'quick-search',
      label: 'Search MOCs',
      href: '/gallery?search=true',
      icon: 'Search',
      description: 'Find specific MOCs',
      keywords: ['search', 'find', 'lookup'],
      category: 'primary',
    },
  ],

  recentlyVisited: [],
  notifications: [],
}

export const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    // Core navigation actions
    setActiveRoute: (state, action: PayloadAction<string>) => {
      state.activeRoute = action.payload

      // Update active state in all navigation items
      const updateActiveState = (items: NavigationItem[]): NavigationItem[] => {
        return items.map(item => ({
          ...item,
          isActive: item.href === action.payload || action.payload.startsWith(item.href + '/'),
          children: item.children ? updateActiveState(item.children) : undefined,
        }))
      }

      state.primaryNavigation = updateActiveState(state.primaryNavigation)
      state.secondaryNavigation = updateActiveState(state.secondaryNavigation)
      state.contextualNavigation = updateActiveState(state.contextualNavigation)

      // Track navigation analytics
      const activeItem = [...state.primaryNavigation, ...state.secondaryNavigation].find(
        item => item.href === action.payload,
      )

      if (activeItem) {
        // Update visit count and last visited
        const existingAnalytics = state.analytics.find(a => a.itemId === activeItem.id)
        if (existingAnalytics) {
          existingAnalytics.visitCount += 1
          existingAnalytics.lastVisited = new Date().toISOString()
        } else {
          state.analytics.push({
            itemId: activeItem.id,
            visitCount: 1,
            lastVisited: new Date().toISOString(),
            averageTimeSpent: 0,
            clickThroughRate: 0,
          })
        }

        // Add to recently visited (keep last 5)
        const recentItem = { ...activeItem, lastVisited: new Date().toISOString() }
        state.recentlyVisited = [
          recentItem,
          ...state.recentlyVisited.filter(item => item.id !== activeItem.id),
        ].slice(0, 5)
      }

      // Auto-generate breadcrumbs
      state.breadcrumbs = generateBreadcrumbs(action.payload, state.primaryNavigation)
    },

    toggleMobileMenu: state => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen
    },

    closeMobileMenu: state => {
      state.isMobileMenuOpen = false
    },

    // Enhanced breadcrumb management
    setBreadcrumbs: (state, action: PayloadAction<BreadcrumbItem[]>) => {
      state.breadcrumbs = action.payload
    },

    addBreadcrumb: (state, action: PayloadAction<BreadcrumbItem>) => {
      state.breadcrumbs.push(action.payload)
    },

    clearBreadcrumbs: state => {
      state.breadcrumbs = []
    },

    // Enhanced badge and notification management
    updateNavigationBadge: (
      state,
      action: PayloadAction<{ id: string; badge?: string | number }>,
    ) => {
      const updateBadge = (items: NavigationItem[]): NavigationItem[] => {
        return items.map(item => {
          if (item.id === action.payload.id) {
            return { ...item, badge: action.payload.badge }
          }
          if (item.children) {
            return { ...item, children: updateBadge(item.children) }
          }
          return item
        })
      }

      state.primaryNavigation = updateBadge(state.primaryNavigation)
      state.secondaryNavigation = updateBadge(state.secondaryNavigation)
    },

    addNotification: (
      state,
      action: PayloadAction<{
        itemId: string
        count: number
        type: 'info' | 'warning' | 'error' | 'success'
      }>,
    ) => {
      const existingNotification = state.notifications.find(n => n.itemId === action.payload.itemId)
      if (existingNotification) {
        existingNotification.count = action.payload.count
        existingNotification.type = action.payload.type
      } else {
        state.notifications.push(action.payload)
      }
    },

    clearNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.itemId !== action.payload)
    },

    setNavigationLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    // Enhanced search functionality
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.search.query = action.payload
      state.search.isSearching = action.payload.length > 0

      if (action.payload.length > 0) {
        // Perform search across all navigation items
        const allItems = [
          ...state.primaryNavigation,
          ...state.secondaryNavigation,
          ...state.quickActions,
        ]

        state.search.results = searchNavigationItems(allItems, action.payload)
      } else {
        state.search.results = []
      }
    },

    addRecentSearch: (state, action: PayloadAction<string>) => {
      const query = action.payload.trim()
      if (query && !state.search.recentSearches.includes(query)) {
        state.search.recentSearches = [query, ...state.search.recentSearches].slice(0, 5)
      }
    },

    clearSearchResults: state => {
      state.search.query = ''
      state.search.results = []
      state.search.isSearching = false
    },

    // User preferences management
    toggleFavoriteItem: (state, action: PayloadAction<string>) => {
      const itemId = action.payload
      const favorites = state.userPreferences.favoriteItems

      if (favorites.includes(itemId)) {
        state.userPreferences.favoriteItems = favorites.filter(id => id !== itemId)
      } else {
        state.userPreferences.favoriteItems.push(itemId)
      }
    },

    toggleHiddenItem: (state, action: PayloadAction<string>) => {
      const itemId = action.payload
      const hidden = state.userPreferences.hiddenItems

      if (hidden.includes(itemId)) {
        state.userPreferences.hiddenItems = hidden.filter(id => id !== itemId)
      } else {
        state.userPreferences.hiddenItems.push(itemId)
      }
    },

    updateCustomOrder: (state, action: PayloadAction<string[]>) => {
      state.userPreferences.customOrder = action.payload
    },

    toggleCompactMode: state => {
      state.userPreferences.compactMode = !state.userPreferences.compactMode
    },

    // Contextual navigation management
    setContextualNavigation: (state, action: PayloadAction<NavigationItem[]>) => {
      state.contextualNavigation = action.payload
    },

    addContextualItem: (state, action: PayloadAction<NavigationItem>) => {
      const exists = state.contextualNavigation.find(item => item.id === action.payload.id)
      if (!exists) {
        state.contextualNavigation.push(action.payload)
      }
    },

    removeContextualItem: (state, action: PayloadAction<string>) => {
      state.contextualNavigation = state.contextualNavigation.filter(
        item => item.id !== action.payload,
      )
    },

    clearContextualNavigation: state => {
      state.contextualNavigation = []
    },
  },
})

export const {
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
} = navigationSlice.actions

// Enhanced Selectors
export const selectNavigation = (state: { navigation: NavigationState }) => state.navigation
export const selectPrimaryNavigation = (state: { navigation: NavigationState }) =>
  state.navigation.primaryNavigation
export const selectSecondaryNavigation = (state: { navigation: NavigationState }) =>
  state.navigation.secondaryNavigation
export const selectContextualNavigation = (state: { navigation: NavigationState }) =>
  state.navigation.contextualNavigation
export const selectActiveRoute = (state: { navigation: NavigationState }) =>
  state.navigation.activeRoute
export const selectIsMobileMenuOpen = (state: { navigation: NavigationState }) =>
  state.navigation.isMobileMenuOpen
export const selectBreadcrumbs = (state: { navigation: NavigationState }) =>
  state.navigation.breadcrumbs
export const selectNavigationLoading = (state: { navigation: NavigationState }) =>
  state.navigation.isLoading

// Enhanced feature selectors
export const selectNavigationSearch = (state: { navigation: NavigationState }) =>
  state.navigation.search
export const selectNavigationAnalytics = (state: { navigation: NavigationState }) =>
  state.navigation.analytics
export const selectUserPreferences = (state: { navigation: NavigationState }) =>
  state.navigation.userPreferences
export const selectQuickActions = (state: { navigation: NavigationState }) =>
  state.navigation.quickActions
export const selectRecentlyVisited = (state: { navigation: NavigationState }) =>
  state.navigation.recentlyVisited
export const selectNavigationNotifications = (state: { navigation: NavigationState }) =>
  state.navigation.notifications

// Computed selectors
export const selectVisiblePrimaryNavigation = (state: { navigation: NavigationState }) => {
  const { primaryNavigation, userPreferences } = state.navigation
  return primaryNavigation.filter(item => !userPreferences.hiddenItems.includes(item.id))
}

export const selectFavoriteNavigation = (state: { navigation: NavigationState }) => {
  const { primaryNavigation, userPreferences } = state.navigation
  return primaryNavigation.filter(item => userPreferences.favoriteItems.includes(item.id))
}

export const selectActiveNavigationItem = (state: { navigation: NavigationState }) => {
  const { primaryNavigation, activeRoute } = state.navigation
  return findNavigationItemByRoute(primaryNavigation, activeRoute)
}

export const selectNavigationItemById = (
  state: { navigation: NavigationState },
  itemId: string,
) => {
  const { primaryNavigation, secondaryNavigation, contextualNavigation } = state.navigation
  const allItems = [...primaryNavigation, ...secondaryNavigation, ...contextualNavigation]
  return findNavigationItemById(allItems, itemId)
}

// Utility Functions
function generateBreadcrumbs(route: string, navigationItems: NavigationItem[]): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = []
  const pathSegments = route.split('/').filter(Boolean)

  // Always start with home
  if (route !== '/') {
    breadcrumbs.push({
      label: 'Home',
      href: '/',
      icon: 'Home',
      isClickable: true,
    })
  }

  // Build breadcrumbs from path segments
  let currentPath = ''
  for (const segment of pathSegments) {
    currentPath += `/${segment}`
    const item = findNavigationItemByRoute(navigationItems, currentPath)

    if (item) {
      breadcrumbs.push({
        label: item.label,
        href: item.href,
        icon: item.icon,
        isClickable: true,
      })
    } else {
      // Create breadcrumb from segment
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
        isClickable: true,
      })
    }
  }

  // Mark last breadcrumb as non-clickable
  if (breadcrumbs.length > 0) {
    breadcrumbs[breadcrumbs.length - 1].isClickable = false
  }

  return breadcrumbs
}

function searchNavigationItems(items: NavigationItem[], query: string): NavigationItem[] {
  const results: NavigationItem[] = []
  const searchTerm = query.toLowerCase()

  const searchItem = (item: NavigationItem) => {
    const matchesLabel = item.label.toLowerCase().includes(searchTerm)
    const matchesDescription = item.description?.toLowerCase().includes(searchTerm)
    const matchesKeywords = item.keywords?.some(keyword =>
      keyword.toLowerCase().includes(searchTerm),
    )

    if (matchesLabel || matchesDescription || matchesKeywords) {
      results.push(item)
    }

    // Search children recursively
    if (item.children) {
      item.children.forEach(searchItem)
    }
  }

  items.forEach(searchItem)

  // Sort results by relevance (exact matches first, then partial matches)
  return results.sort((a, b) => {
    const aExactMatch = a.label.toLowerCase() === searchTerm
    const bExactMatch = b.label.toLowerCase() === searchTerm

    if (aExactMatch && !bExactMatch) return -1
    if (!aExactMatch && bExactMatch) return 1

    // Sort by label alphabetically
    return a.label.localeCompare(b.label)
  })
}

function findNavigationItemByRoute(
  items: NavigationItem[],
  route: string,
): NavigationItem | undefined {
  for (const item of items) {
    if (item.href === route) {
      return item
    }

    if (item.children) {
      const found = findNavigationItemByRoute(item.children, route)
      if (found) return found
    }
  }

  return undefined
}

function findNavigationItemById(items: NavigationItem[], id: string): NavigationItem | undefined {
  for (const item of items) {
    if (item.id === id) {
      return item
    }

    if (item.children) {
      const found = findNavigationItemById(item.children, id)
      if (found) return found
    }
  }

  return undefined
}
