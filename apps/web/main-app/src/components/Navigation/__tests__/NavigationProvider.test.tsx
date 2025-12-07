import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { NavigationProvider, useNavigation } from '../NavigationProvider'
import { navigationSlice, type NavigationItem } from '@/store/slices/navigationSlice'

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({ pathname: '/gallery' }),
  }
})

// Test component that uses the navigation context
function TestComponent() {
  const { navigation, activeItem, navigateToItem, searchNavigation, trackNavigation } =
    useNavigation()

  return (
    <div>
      <div data-testid="active-route">{navigation.activeRoute}</div>
      <div data-testid="active-item">{activeItem?.label || 'None'}</div>
      <div data-testid="notifications-count">{navigation.notifications.length}</div>
      <button
        data-testid="navigate-button"
        onClick={() =>
          navigateToItem({
            id: 'test',
            label: 'Test',
            href: '/test',
            category: 'primary',
          })
        }
      >
        Navigate
      </button>
      <button data-testid="search-button" onClick={() => searchNavigation('test query')}>
        Search
      </button>
      <button
        data-testid="track-button"
        onClick={() => trackNavigation('test-item', { source: 'test' })}
      >
        Track
      </button>
    </div>
  )
}

describe.skip('NavigationProvider', () => {
  const createStore = () =>
    configureStore({
      reducer: {
        navigation: navigationSlice.reducer,
      },
    })

  type TestStore = ReturnType<typeof createStore>
  let store: TestStore
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    store = createStore()

    // Mock console.log for analytics tracking
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <NavigationProvider>{component}</NavigationProvider>
        </MemoryRouter>
      </Provider>,
    )
  }

  it('should provide navigation context', () => {
    renderWithProviders(<TestComponent />)

    expect(screen.getByTestId('active-route')).toHaveTextContent('/gallery')
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('0')
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useNavigation must be used within a NavigationProvider')

    errorSpy.mockRestore()
  })

  it('should handle navigation item click', async () => {
    renderWithProviders(<TestComponent />)

    const navigateButton = screen.getByTestId('navigate-button')
    navigateButton.click()

    // Should track analytics
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: 'test',
          route: '/gallery',
          source: 'navigation_menu',
        }),
      )
    })
  })

  it('should handle search navigation', async () => {
    renderWithProviders(<TestComponent />)

    const searchButton = screen.getByTestId('search-button')
    searchButton.click()

    // Should track search analytics
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: 'search',
          query: 'test query',
          source: 'navigation_search',
        }),
      )
    })
  })

  it('should handle analytics tracking', async () => {
    renderWithProviders(<TestComponent />)

    const trackButton = screen.getByTestId('track-button')
    trackButton.click()

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: 'test-item',
          route: '/gallery',
          source: 'test',
        }),
      )
    })
  })

  it('should generate contextual navigation for gallery route', async () => {
    // The provider should automatically set contextual navigation for /gallery
    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      const state = store.getState()
      expect(state.navigation.contextualNavigation.length).toBeGreaterThan(0)

      // Should have gallery-specific contextual items
      const uploadItem = state.navigation.contextualNavigation.find(
        (item: NavigationItem) => item.id === 'gallery-upload',
      )
      expect(uploadItem).toBeDefined()
      expect(uploadItem?.label).toBe('Upload MOC')
    })
  })

  it('should update active route on location change', async () => {
    // This test verifies that the NavigationProvider responds to route changes
    // Since we're using MemoryRouter, we can test this by checking the initial state
    renderWithProviders(<TestComponent />)

    // The provider should automatically set the active route based on the mocked location
    await waitFor(() => {
      expect(screen.getByTestId('active-route')).toHaveTextContent('/gallery')
    })

    // Verify that the navigation state is updated
    const state = store.getState()
    expect(state.navigation.activeRoute).toBe('/gallery')
  })
})
