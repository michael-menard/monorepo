import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  setActiveRoute,
  addRecentSearch,
  setContextualNavigation,
  selectNavigation,
  selectActiveNavigationItem,
  NavigationItem,
} from '@/store/slices/navigationSlice'

interface NavigationContextType {
  // Navigation state
  navigation: ReturnType<typeof selectNavigation>
  activeItem: NavigationItem | undefined

  // Navigation actions
  navigateToItem: (item: NavigationItem) => void
  searchNavigation: (query: string) => void
  addToFavorites: (itemId: string) => void
  setContextualItems: (items: NavigationItem[]) => void

  // Analytics
  trackNavigation: (itemId: string, metadata?: Record<string, any>) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

interface NavigationProviderProps {
  children: ReactNode
}

/**
 * Enhanced Navigation Provider
 * Provides unified navigation context with analytics, search, and contextual features
 */
export function NavigationProvider({ children }: NavigationProviderProps) {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigation = useSelector(selectNavigation)
  const activeItem = useSelector(selectActiveNavigationItem)

  // Update active route when location changes
  useEffect(() => {
    dispatch(setActiveRoute(location.pathname))
  }, [location.pathname, dispatch])

  // Set up contextual navigation based on current route
  useEffect(() => {
    const contextualItems = generateContextualNavigation(location.pathname, activeItem)
    if (contextualItems.length > 0) {
      dispatch(setContextualNavigation(contextualItems))
    }
  }, [location.pathname, activeItem, dispatch])

  const navigate = useNavigate()

  // Navigation actions
  const navigateToItem = (item: NavigationItem) => {
    // Track navigation analytics
    trackNavigation(item.id, {
      source: 'navigation_menu',
      timestamp: new Date().toISOString(),
    })

    // Use TanStack Router navigation
    navigate({ to: item.href })
  }

  const searchNavigation = (query: string) => {
    if (query.trim()) {
      dispatch(addRecentSearch(query))

      // Track search analytics
      trackNavigation('search', {
        query,
        source: 'navigation_search',
        timestamp: new Date().toISOString(),
      })
    }
  }

  const addToFavorites = (itemId: string) => {
    // This would typically dispatch toggleFavoriteItem
    // For now, we'll track the analytics
    trackNavigation(itemId, {
      action: 'add_to_favorites',
      timestamp: new Date().toISOString(),
    })
  }

  const setContextualItems = (items: NavigationItem[]) => {
    dispatch(setContextualNavigation(items))
  }

  const trackNavigation = (itemId: string, metadata?: Record<string, any>) => {
    // Enhanced analytics tracking
    console.log('Navigation Analytics:', {
      itemId,
      route: location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...metadata,
    })

    // In a real app, this would send to analytics service
    // Example: analytics.track('navigation', { itemId, ...metadata })
  }

  const contextValue: NavigationContextType = {
    navigation,
    activeItem,
    navigateToItem,
    searchNavigation,
    addToFavorites,
    setContextualItems,
    trackNavigation,
  }

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>
}

/**
 * Hook to use navigation context
 */
export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

/**
 * Generate contextual navigation items based on current route
 */
function generateContextualNavigation(
  pathname: string,
  activeItem: NavigationItem | undefined,
): NavigationItem[] {
  const contextualItems: NavigationItem[] = []

  // Gallery contextual navigation
  if (pathname.startsWith('/gallery')) {
    contextualItems.push(
      {
        id: 'gallery-upload',
        label: 'Upload MOC',
        href: '/gallery/upload',
        icon: 'Upload',
        description: 'Share your latest creation',
        category: 'primary',
      },
      {
        id: 'gallery-search',
        label: 'Advanced Search',
        href: '/gallery/search',
        icon: 'Search',
        description: 'Find specific MOCs',
        category: 'secondary',
      },
    )
  }

  // Wishlist contextual navigation
  if (pathname.startsWith('/wishlist')) {
    contextualItems.push(
      {
        id: 'wishlist-import',
        label: 'Import Items',
        href: '/wishlist/import',
        icon: 'Download',
        description: 'Import from external sources',
        category: 'secondary',
      },
      {
        id: 'wishlist-share',
        label: 'Share Wishlist',
        href: '/wishlist/share',
        icon: 'Share',
        description: 'Share with friends',
        category: 'secondary',
      },
    )
  }

  // Dashboard contextual navigation
  if (pathname.startsWith('/dashboard')) {
    contextualItems.push({
      id: 'dashboard-export',
      label: 'Export Data',
      href: '/dashboard/export',
      icon: 'Download',
      description: 'Export your data',
      category: 'utility',
    })
  }

  return contextualItems
}
