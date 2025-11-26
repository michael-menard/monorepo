import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { NavigationDemoPage } from '../NavigationDemoPage'
import { NavigationProvider } from '@/components/Navigation/NavigationProvider'
import { navigationSlice } from '@/store/slices/navigationSlice'

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({ pathname: '/navigation-demo' }),
  }
})

describe('NavigationDemoPage', () => {
  let store: ReturnType<typeof configureStore>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        navigation: navigationSlice.reducer,
      },
    })

    user = userEvent.setup()

    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  const renderWithProviders = () => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <NavigationProvider>
            <NavigationDemoPage />
          </NavigationProvider>
        </MemoryRouter>
      </Provider>,
    )
  }

  it('should render navigation demo page', () => {
    renderWithProviders()

    expect(screen.getByText('Navigation System Demo')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Explore the comprehensive unified navigation system with enhanced features',
      ),
    ).toBeInTheDocument()
  })

  it('should render demo tabs', () => {
    renderWithProviders()

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Breadcrumbs' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Quick Actions' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Analytics' })).toBeInTheDocument()
  })

  it('should show overview content by default', () => {
    renderWithProviders()

    expect(screen.getByText('Enhanced Navigation')).toBeInTheDocument()
    expect(screen.getByText('Intelligent Search')).toBeInTheDocument()
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
  })

  it('should switch to search tab', async () => {
    renderWithProviders()

    const searchTab = screen.getByRole('tab', { name: 'Search' })
    await user.click(searchTab)

    await waitFor(() => {
      expect(screen.getByText('Navigation Search Demo')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Search navigation items, MOCs, instructions...'),
      ).toBeInTheDocument()
    })
  })

  it('should switch to breadcrumbs tab', async () => {
    renderWithProviders()

    const breadcrumbsTab = screen.getByRole('tab', { name: 'Breadcrumbs' })
    await user.click(breadcrumbsTab)

    await waitFor(() => {
      expect(screen.getByText('Enhanced Breadcrumb')).toBeInTheDocument()
      expect(screen.getByText('Compact Breadcrumb')).toBeInTheDocument()
    })
  })

  it('should switch to quick actions tab', async () => {
    renderWithProviders()

    const quickActionsTab = screen.getByRole('tab', { name: 'Quick Actions' })
    await user.click(quickActionsTab)

    await waitFor(() => {
      expect(screen.getByText('Vertical Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Grid Quick Actions')).toBeInTheDocument()
    })
  })

  it('should switch to analytics tab', async () => {
    renderWithProviders()

    const analyticsTab = screen.getByRole('tab', { name: 'Analytics' })
    await user.click(analyticsTab)

    await waitFor(() => {
      expect(screen.getByText('Navigation Analytics')).toBeInTheDocument()
    })
  })

  it('should show no analytics message initially', async () => {
    renderWithProviders()

    const analyticsTab = screen.getByRole('tab', { name: 'Analytics' })
    await user.click(analyticsTab)

    await waitFor(() => {
      expect(screen.getByText('No analytics data yet')).toBeInTheDocument()
      expect(screen.getByText('Navigate around to see analytics in action')).toBeInTheDocument()
    })
  })

  it('should handle demo button interactions', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderWithProviders()

    // Test Add Notification button
    const addNotificationButton = screen.getByText('Add Notification')
    await user.click(addNotificationButton)

    // Should update the notifications count
    await waitFor(() => {
      const state = store.getState()
      expect(state.navigation.notifications.length).toBeGreaterThan(0)
    })

    // Test Update Badge button
    const updateBadgeButton = screen.getByText('Update Badge')
    await user.click(updateBadgeButton)

    // Should update navigation badge
    await waitFor(() => {
      const state = store.getState()
      const wishlistItem = state.navigation.primaryNavigation.find(item => item.id === 'wishlist')
      expect(wishlistItem?.badge).toBeDefined()
    })

    // Test Track Analytics button
    const trackAnalyticsButton = screen.getByText('Track Analytics')
    await user.click(trackAnalyticsButton)

    // Should track analytics
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: 'demo_interaction',
          source: 'navigation_demo',
          action: 'demo_button_click',
        }),
      )
    })

    consoleSpy.mockRestore()
  })

  it('should update statistics display', async () => {
    renderWithProviders()

    // Initially should show 0 for all stats
    expect(screen.getByText('0')).toBeInTheDocument() // Active Notifications

    // Add a notification
    const addNotificationButton = screen.getByText('Add Notification')
    await user.click(addNotificationButton)

    // Should update the Active Notifications count
    await waitFor(() => {
      const notificationCounts = screen.getAllByText('1')
      expect(notificationCounts.length).toBeGreaterThan(0)
    })
  })

  it('should set up contextual navigation for demo page', async () => {
    renderWithProviders()

    // Should set up demo-specific contextual navigation
    await waitFor(() => {
      const state = store.getState()
      expect(state.navigation.contextualNavigation.length).toBeGreaterThan(0)

      const demoExportItem = state.navigation.contextualNavigation.find(
        item => item.id === 'demo-export',
      )
      expect(demoExportItem).toBeDefined()
      expect(demoExportItem?.label).toBe('Export Demo Data')
    })
  })

  it('should handle search demo interactions', async () => {
    renderWithProviders()

    // Switch to search tab
    const searchTab = screen.getByRole('tab', { name: 'Search' })
    await user.click(searchTab)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(
        'Search navigation items, MOCs, instructions...',
      )
      expect(searchInput).toBeInTheDocument()
    })

    // Test search functionality
    const searchInput = screen.getByPlaceholderText(
      'Search navigation items, MOCs, instructions...',
    )
    await user.type(searchInput, 'gallery')

    // Should show search results
    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument()
    })
  })

  it('should render feature descriptions', () => {
    renderWithProviders()

    // Check feature descriptions in overview
    expect(screen.getByText('Multi-level navigation support')).toBeInTheDocument()
    expect(screen.getByText('Smart active state detection')).toBeInTheDocument()
    expect(screen.getByText('Fuzzy search across labels and descriptions')).toBeInTheDocument()
    expect(screen.getByText('Keyboard shortcuts (Cmd+K)')).toBeInTheDocument()
    expect(screen.getByText('Customizable quick action buttons')).toBeInTheDocument()
    expect(screen.getByText('Usage analytics')).toBeInTheDocument()
  })

  it('should handle tab navigation with keyboard', async () => {
    renderWithProviders()

    const overviewTab = screen.getByRole('tab', { name: 'Overview' })
    overviewTab.focus()

    // Navigate to next tab with arrow key
    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' })

    await waitFor(() => {
      const searchTab = screen.getByRole('tab', { name: 'Search' })
      expect(searchTab).toHaveFocus()
    })
  })
})
