import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  navigationSlice,
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
  setSearchQuery,
  addRecentSearch,
  clearSearchResults,
  toggleFavoriteItem,
  toggleHiddenItem,
  toggleCompactMode,
  setContextualNavigation,
  addContextualItem,
  clearContextualNavigation,
  selectNavigation,
  selectPrimaryNavigation,
  selectContextualNavigation,
  selectActiveRoute,
  selectIsMobileMenuOpen,
  selectBreadcrumbs,
  selectNavigationLoading,
  selectNavigationSearch,
  selectUserPreferences,
  selectNavigationNotifications,
  selectVisiblePrimaryNavigation,
  selectFavoriteNavigation,
  type NavigationItem,
} from '../navigationSlice'

describe('navigationSlice', () => {
  const createStore = () =>
    configureStore({
      reducer: {
        navigation: navigationSlice.reducer,
      },
    })

  type TestStore = ReturnType<typeof createStore>

  let store: TestStore

  beforeEach(() => {
    store = createStore()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState()
      const navigation = selectNavigation(state)

      expect(navigation.activeRoute).toBe('/')
      expect(navigation.isMobileMenuOpen).toBe(false)
      expect(navigation.breadcrumbs).toEqual([])
      expect(navigation.isLoading).toBe(false)
      expect(navigation.primaryNavigation).toHaveLength(4) // dashboard, gallery, wishlist, instructions
      expect(navigation.secondaryNavigation).toHaveLength(2) // settings, help
      expect(navigation.contextualNavigation).toEqual([])
      expect(navigation.search.query).toBe('')
      expect(navigation.search.results).toEqual([])
      expect(navigation.search.isSearching).toBe(false)
      expect(navigation.search.recentSearches).toEqual([])
      expect(navigation.analytics).toEqual([])
      expect(navigation.userPreferences.favoriteItems).toEqual([])
      expect(navigation.userPreferences.hiddenItems).toEqual([])
      expect(navigation.userPreferences.customOrder).toEqual([])
      expect(navigation.userPreferences.compactMode).toBe(false)
      expect(navigation.quickActions).toHaveLength(2)
      expect(navigation.recentlyVisited).toEqual([])
      expect(navigation.notifications).toEqual([])
    })

    it('should have correct navigation items', () => {
      const state = store.getState()
      const primaryNavigation = selectPrimaryNavigation(state)

      const expectedItems = [
        { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
        { id: 'gallery', label: 'Gallery', href: '/gallery', icon: 'Images' },
        { id: 'wishlist', label: 'Wishlist', href: '/wishlist', icon: 'Heart' },
        { id: 'instructions', label: 'MOC Instructions', href: '/instructions', icon: 'BookOpen' },
      ]

      expectedItems.forEach((expectedItem, index) => {
        expect(primaryNavigation[index]).toMatchObject(expectedItem)
      })
    })
  })

  describe('setActiveRoute', () => {
    it('should set active route', () => {
      store.dispatch(setActiveRoute('/gallery'))
      const state = store.getState()

      expect(selectActiveRoute(state)).toBe('/gallery')
    })

    it('should update active state in navigation items', () => {
      store.dispatch(setActiveRoute('/gallery'))
      const state = store.getState()
      const primaryNavigation = selectPrimaryNavigation(state)

      const galleryItem = primaryNavigation.find(item => item.id === 'gallery')
      const dashboardItem = primaryNavigation.find(item => item.id === 'dashboard')

      expect(galleryItem?.isActive).toBe(true)
      expect(dashboardItem?.isActive).toBe(false)
    })

    it('should handle sub-routes correctly', () => {
      store.dispatch(setActiveRoute('/gallery/search'))
      const state = store.getState()
      const primaryNavigation = selectPrimaryNavigation(state)

      const galleryItem = primaryNavigation.find(item => item.id === 'gallery')
      expect(galleryItem?.isActive).toBe(true)
    })
  })

  describe('mobile menu', () => {
    it('should toggle mobile menu', () => {
      store.dispatch(toggleMobileMenu())
      let state = store.getState()
      expect(selectIsMobileMenuOpen(state)).toBe(true)

      store.dispatch(toggleMobileMenu())
      state = store.getState()
      expect(selectIsMobileMenuOpen(state)).toBe(false)
    })

    it('should close mobile menu', () => {
      store.dispatch(toggleMobileMenu()) // Open first
      store.dispatch(closeMobileMenu())
      const state = store.getState()

      expect(selectIsMobileMenuOpen(state)).toBe(false)
    })
  })

  describe('breadcrumbs', () => {
    it('should set breadcrumbs', () => {
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Gallery', href: '/gallery' },
        { label: 'Search' },
      ]

      store.dispatch(setBreadcrumbs(breadcrumbs))
      const state = store.getState()

      expect(selectBreadcrumbs(state)).toEqual(breadcrumbs)
    })

    it('should add breadcrumb', () => {
      store.dispatch(addBreadcrumb({ label: 'Home', href: '/' }))
      store.dispatch(addBreadcrumb({ label: 'Gallery' }))
      const state = store.getState()

      expect(selectBreadcrumbs(state)).toEqual([{ label: 'Home', href: '/' }, { label: 'Gallery' }])
    })

    it('should clear breadcrumbs', () => {
      store.dispatch(setBreadcrumbs([{ label: 'Test' }]))
      store.dispatch(clearBreadcrumbs())
      const state = store.getState()

      expect(selectBreadcrumbs(state)).toEqual([])
    })
  })

  describe('navigation badges', () => {
    it('should update navigation badge', () => {
      store.dispatch(updateNavigationBadge({ id: 'wishlist', badge: '5' }))
      const state = store.getState()
      const primaryNavigation = selectPrimaryNavigation(state)

      const wishlistItem = primaryNavigation.find(item => item.id === 'wishlist')
      expect(wishlistItem?.badge).toBe('5')
    })

    it('should remove badge when set to undefined', () => {
      store.dispatch(updateNavigationBadge({ id: 'wishlist', badge: '5' }))
      store.dispatch(updateNavigationBadge({ id: 'wishlist', badge: undefined }))
      const state = store.getState()
      const primaryNavigation = selectPrimaryNavigation(state)

      const wishlistItem = primaryNavigation.find(item => item.id === 'wishlist')
      expect(wishlistItem?.badge).toBeUndefined()
    })
  })

  describe('loading state', () => {
    it('should set navigation loading state', () => {
      store.dispatch(setNavigationLoading(true))
      const state = store.getState()

      expect(selectNavigationLoading(state)).toBe(true)
    })
  })

  describe('enhanced navigation features', () => {
    describe('notifications', () => {
      it('should add notification', () => {
        store.dispatch(addNotification({ itemId: 'gallery', count: 3, type: 'info' }))

        const state = store.getState()
        const notifications = selectNavigationNotifications(state)

        expect(notifications).toHaveLength(1)
        expect(notifications[0]).toEqual({ itemId: 'gallery', count: 3, type: 'info' })
      })

      it('should update existing notification', () => {
        store.dispatch(addNotification({ itemId: 'gallery', count: 3, type: 'info' }))
        store.dispatch(addNotification({ itemId: 'gallery', count: 5, type: 'warning' }))

        const state = store.getState()
        const notifications = selectNavigationNotifications(state)

        expect(notifications).toHaveLength(1)
        expect(notifications[0]).toEqual({ itemId: 'gallery', count: 5, type: 'warning' })
      })

      it('should clear notification', () => {
        store.dispatch(addNotification({ itemId: 'gallery', count: 3, type: 'info' }))
        store.dispatch(clearNotification('gallery'))

        const state = store.getState()
        const notifications = selectNavigationNotifications(state)

        expect(notifications).toHaveLength(0)
      })
    })

    describe('search functionality', () => {
      it('should set search query and trigger search', () => {
        store.dispatch(setSearchQuery('gallery'))

        const state = store.getState()
        const search = selectNavigationSearch(state)

        expect(search.query).toBe('gallery')
        expect(search.isSearching).toBe(true)
        expect(search.results.length).toBeGreaterThan(0)
      })

      it('should find navigation items by keywords', () => {
        store.dispatch(setSearchQuery('mocs'))

        const state = store.getState()
        const search = selectNavigationSearch(state)

        const galleryResult = search.results.find(item => item.id === 'gallery')
        expect(galleryResult).toBeDefined()
      })

      it('should add recent search', () => {
        store.dispatch(addRecentSearch('test query'))

        const state = store.getState()
        const search = selectNavigationSearch(state)

        expect(search.recentSearches).toContain('test query')
      })

      it('should clear search results', () => {
        store.dispatch(setSearchQuery('gallery'))
        store.dispatch(clearSearchResults())

        const state = store.getState()
        const search = selectNavigationSearch(state)

        expect(search.query).toBe('')
        expect(search.results).toEqual([])
        expect(search.isSearching).toBe(false)
      })
    })

    describe('user preferences', () => {
      it('should toggle favorite item', () => {
        store.dispatch(toggleFavoriteItem('gallery'))

        const state = store.getState()
        const preferences = selectUserPreferences(state)

        expect(preferences.favoriteItems).toContain('gallery')
      })

      it('should toggle compact mode', () => {
        expect(selectUserPreferences(store.getState()).compactMode).toBe(false)

        store.dispatch(toggleCompactMode())
        expect(selectUserPreferences(store.getState()).compactMode).toBe(true)
      })
    })

    describe('contextual navigation', () => {
      const contextualItems: NavigationItem[] = [
        {
          id: 'context-1',
          label: 'Context Item 1',
          href: '/context/1',
          category: 'primary',
        },
      ]

      it('should set contextual navigation', () => {
        store.dispatch(setContextualNavigation(contextualItems))

        const state = store.getState()
        const contextual = selectContextualNavigation(state)

        expect(contextual).toEqual(contextualItems)
      })

      it('should add contextual item', () => {
        const newItem: NavigationItem = {
          id: 'new-context',
          label: 'New Context Item',
          href: '/new-context',
          category: 'primary',
        }

        store.dispatch(addContextualItem(newItem))

        const state = store.getState()
        const contextual = selectContextualNavigation(state)

        expect(contextual).toContain(newItem)
      })

      it('should clear contextual navigation', () => {
        store.dispatch(setContextualNavigation(contextualItems))
        store.dispatch(clearContextualNavigation())

        const state = store.getState()
        const contextual = selectContextualNavigation(state)

        expect(contextual).toEqual([])
      })
    })

    describe('computed selectors', () => {
      beforeEach(() => {
        store.dispatch(toggleFavoriteItem('gallery'))
        store.dispatch(toggleHiddenItem('instructions'))
      })

      it('should select visible primary navigation', () => {
        const state = store.getState()
        const visible = selectVisiblePrimaryNavigation(state)

        expect(visible.find(item => item.id === 'instructions')).toBeUndefined()
        expect(visible.find(item => item.id === 'gallery')).toBeDefined()
      })

      it('should select favorite navigation items', () => {
        const state = store.getState()
        const favorites = selectFavoriteNavigation(state)

        expect(favorites.find(item => item.id === 'gallery')).toBeDefined()
      })
    })
  })
})
