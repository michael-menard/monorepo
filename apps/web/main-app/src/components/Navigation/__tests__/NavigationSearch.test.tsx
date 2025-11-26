import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { NavigationSearch } from '../NavigationSearch'
import { NavigationProvider } from '../NavigationProvider'
import { navigationSlice } from '@/store/slices/navigationSlice'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/gallery' }),
}))

describe('NavigationSearch', () => {
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

  const renderWithProviders = (props = {}) => {
    return render(
      <Provider store={store}>
        <NavigationProvider>
          <NavigationSearch {...props} />
        </NavigationProvider>
      </Provider>,
    )
  }

  it('should render search input', () => {
    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    expect(searchInput).toBeInTheDocument()
  })

  it('should render with custom placeholder', () => {
    renderWithProviders({ placeholder: 'Custom placeholder' })

    const searchInput = screen.getByPlaceholderText('Custom placeholder')
    expect(searchInput).toBeInTheDocument()
  })

  it('should show keyboard shortcut when enabled', () => {
    renderWithProviders({ showShortcut: true })

    const shortcut = screen.getByText('K')
    expect(shortcut).toBeInTheDocument()
  })

  it('should hide keyboard shortcut when disabled', () => {
    renderWithProviders({ showShortcut: false })

    const shortcut = screen.queryByText('K')
    expect(shortcut).not.toBeInTheDocument()
  })

  it('should update search query on input change', async () => {
    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.type(searchInput, 'gallery')

    expect(searchInput).toHaveValue('gallery')
  })

  it('should show search results when typing', async () => {
    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.type(searchInput, 'gallery')

    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument()
      expect(screen.getByText('Gallery')).toBeInTheDocument()
    })
  })

  it('should show recent searches when input is focused with no query', async () => {
    // First, add a recent search
    store.dispatch({ type: 'navigation/addRecentSearch', payload: 'previous search' })

    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.click(searchInput)

    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeInTheDocument()
      expect(screen.getByText('previous search')).toBeInTheDocument()
    })
  })

  it('should handle keyboard navigation', async () => {
    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.type(searchInput, 'gallery')

    await waitFor(() => {
      expect(screen.getByText('Gallery')).toBeInTheDocument()
    })

    // Test arrow down navigation
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })

    // Test enter key
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    // Should close the search results
    await waitFor(() => {
      expect(screen.queryByText('Navigation')).not.toBeInTheDocument()
    })
  })

  it('should close on escape key', async () => {
    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.type(searchInput, 'gallery')

    await waitFor(() => {
      expect(screen.getByText('Gallery')).toBeInTheDocument()
    })

    fireEvent.keyDown(searchInput, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText('Navigation')).not.toBeInTheDocument()
    })
  })

  it('should handle global keyboard shortcut', async () => {
    renderWithProviders({ showShortcut: true })

    const searchInput = screen.getByPlaceholderText('Search navigation...')

    // Simulate Cmd+K
    fireEvent.keyDown(document, { key: 'k', metaKey: true })

    await waitFor(() => {
      expect(searchInput).toHaveFocus()
    })
  })

  it('should show no results message when search returns empty', async () => {
    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.type(searchInput, 'nonexistent')

    await waitFor(() => {
      expect(screen.getByText('No navigation items found')).toBeInTheDocument()
      expect(screen.getByText('Try a different search term')).toBeInTheDocument()
    })
  })

  it('should handle result selection', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.type(searchInput, 'gallery')

    await waitFor(() => {
      expect(screen.getByText('Gallery')).toBeInTheDocument()
    })

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

  it('should handle recent search selection', async () => {
    // Add a recent search
    store.dispatch({ type: 'navigation/addRecentSearch', payload: 'gallery' })

    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.click(searchInput)

    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeInTheDocument()
    })

    const recentSearch = screen.getByText('gallery')
    await user.click(recentSearch)

    // Should update the search input
    expect(searchInput).toHaveValue('gallery')
  })

  it('should close on outside click', async () => {
    renderWithProviders()

    const searchInput = screen.getByPlaceholderText('Search navigation...')
    await user.type(searchInput, 'gallery')

    await waitFor(() => {
      expect(screen.getByText('Gallery')).toBeInTheDocument()
    })

    // Click outside
    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByText('Navigation')).not.toBeInTheDocument()
    })
  })
})
