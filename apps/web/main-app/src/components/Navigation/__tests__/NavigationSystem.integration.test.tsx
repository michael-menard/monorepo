import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { NavigationProvider } from '../NavigationProvider'
import { NavigationSearch } from '../NavigationSearch'
import { EnhancedBreadcrumb } from '../EnhancedBreadcrumb'
import { QuickActions } from '../QuickActions'
import { navigationSlice } from '@/store/slices/navigationSlice'

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({ pathname: '/gallery/featured' }),
    Link: ({ to, children, onClick, ...props }: any) => (
      <a href={to} onClick={onClick} {...props}>
        {children}
      </a>
    ),
  }
})

// Complete navigation system test component
function NavigationSystemTestApp() {
  return (
    <div>
      <NavigationSearch placeholder="Test search" />
      <EnhancedBreadcrumb showBackButton={true} />
      <QuickActions variant="horizontal" showRecentlyVisited={true} />
    </div>
  )
}

describe('Navigation System Integration', () => {
  let store: ReturnType<typeof configureStore>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        navigation: navigationSlice.reducer,
      },
    })

    user = userEvent.setup()

    // Mock window methods
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    Object.defineProperty(window, 'history', {
      value: { back: vi.fn() },
      writable: true,
    })
  })

  const renderNavigationSystem = () => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <NavigationProvider>
            <NavigationSystemTestApp />
          </NavigationProvider>
        </MemoryRouter>
      </Provider>,
    )
  }

  it('should render complete navigation system', () => {
    renderNavigationSystem()

    // Search component
    expect(screen.getByPlaceholderText('Test search')).toBeInTheDocument()

    // Quick actions
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Upload MOC')).toBeInTheDocument()

    // Breadcrumbs should be auto-generated
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Gallery')).toBeInTheDocument()
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('should handle search and navigation flow', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderNavigationSystem()

    // Search for gallery
    const searchInput = screen.getByPlaceholderText('Test search')
    await user.type(searchInput, 'gallery')

    // Should show search results
    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument()
      expect(screen.getByText('Gallery')).toBeInTheDocument()
    })

    // Click on gallery result
    const galleryResult = screen.getByText('Gallery')
    await user.click(galleryResult)

    // Should track analytics
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: 'gallery',
          source: 'search_result',
        }),
      )
    })

    consoleSpy.mockRestore()
  })

  it('should handle breadcrumb navigation', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderNavigationSystem()

    // Click on Gallery breadcrumb
    const galleryBreadcrumb = screen.getByRole('link', { name: /gallery/i })
    await user.click(galleryBreadcrumb)

    // Should track breadcrumb analytics
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: 'breadcrumb_click',
          source: 'breadcrumb',
          itemLabel: 'Gallery',
        }),
      )
    })

    consoleSpy.mockRestore()
  })

  it('should handle quick action clicks', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderNavigationSystem()

    // Click on Upload MOC quick action
    const uploadAction = screen.getByText('Upload MOC')
    await user.click(uploadAction)

    // Should track quick action analytics
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: 'quick-upload',
          source: 'quick_actions',
        }),
      )
    })

    consoleSpy.mockRestore()
  })

  it('should handle back button navigation', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderNavigationSystem()

    // Click back button
    const backButton = screen.getByLabelText('Go back')
    await user.click(backButton)

    // Should call window.history.back
    expect(window.history.back).toHaveBeenCalled()

    // Should track back navigation analytics
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: 'breadcrumb_back',
          source: 'breadcrumb',
        }),
      )
    })

    consoleSpy.mockRestore()
  })

  it('should handle keyboard shortcuts', async () => {
    renderNavigationSystem()

    const searchInput = screen.getByPlaceholderText('Test search')

    // Test global keyboard shortcut (Cmd+K)
    fireEvent.keyDown(document, { key: 'k', metaKey: true })

    await waitFor(() => {
      expect(searchInput).toHaveFocus()
    })
  })

  it('should update state across all components', async () => {
    renderNavigationSystem()

    // Search should update the global navigation state
    const searchInput = screen.getByPlaceholderText('Test search')
    await user.type(searchInput, 'dashboard')

    // Verify state is updated
    const state = store.getState()
    expect(state.navigation.search.query).toBe('dashboard')
    expect(state.navigation.search.isSearching).toBe(true)
    expect(state.navigation.search.results.length).toBeGreaterThan(0)
  })

  it('should handle contextual navigation generation', async () => {
    renderNavigationSystem()

    // The NavigationProvider should automatically generate contextual navigation
    // for the /gallery/featured route
    await waitFor(() => {
      const state = store.getState()
      expect(state.navigation.contextualNavigation.length).toBeGreaterThan(0)

      // Should have gallery-specific contextual items
      const uploadItem = state.navigation.contextualNavigation.find(
        item => item.id === 'gallery-upload',
      )
      expect(uploadItem).toBeDefined()
    })
  })

  it('should handle analytics tracking across components', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderNavigationSystem()

    // Perform multiple navigation actions
    const searchInput = screen.getByPlaceholderText('Test search')
    await user.type(searchInput, 'gallery')

    await waitFor(() => {
      const galleryResult = screen.getByText('Gallery')
      user.click(galleryResult)
    })

    const uploadAction = screen.getByText('Upload MOC')
    await user.click(uploadAction)

    const backButton = screen.getByLabelText('Go back')
    await user.click(backButton)

    // Should have tracked multiple analytics events
    await waitFor(() => {
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(2)

      // Verify different sources are tracked
      const calls = consoleSpy.mock.calls
      const sources = calls.map(call => call[1]?.source).filter(Boolean)

      expect(sources).toContain('search_result')
      expect(sources).toContain('quick_actions')
      expect(sources).toContain('breadcrumb')
    })

    consoleSpy.mockRestore()
  })

  it('should handle error states gracefully', () => {
    // Test with corrupted state
    const corruptedStore = configureStore({
      reducer: {
        navigation: () => ({
          ...navigationSlice.getInitialState(),
          primaryNavigation: null, // Corrupted state
        }),
      },
    })

    // Should not crash
    expect(() => {
      render(
        <Provider store={corruptedStore}>
          <MemoryRouter>
            <NavigationProvider>
              <NavigationSystemTestApp />
            </NavigationProvider>
          </MemoryRouter>
        </Provider>,
      )
    }).not.toThrow()
  })

  it('should handle rapid user interactions', async () => {
    renderNavigationSystem()

    const searchInput = screen.getByPlaceholderText('Test search')

    // Rapid typing
    await user.type(searchInput, 'gallery')
    await user.clear(searchInput)
    await user.type(searchInput, 'dashboard')
    await user.clear(searchInput)
    await user.type(searchInput, 'wishlist')

    // Should handle rapid state changes without errors
    const state = store.getState()
    expect(state.navigation.search.query).toBe('wishlist')
  })
})
