/**
 * Wishlist Gallery App Tests
 *
 * Basic rendering tests for the wishlist gallery module.
 * API integration tests should use MSW for proper mocking.
 *
 * Story wish-2001: Wishlist Gallery MVP
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MainPage } from './pages/main-page'
import { ModuleLayout } from './components/module-layout'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock the RTK Query hook to avoid actual API calls
vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useGetWishlistQuery: vi.fn().mockReturnValue({
    data: null,
    isLoading: true,
    isFetching: false,
    error: null,
  }),
  // WISH-2041: Add mock for delete mutation
  useRemoveFromWishlistMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
  // WISH-2041: Add mock for add mutation (used for undo)
  useAddWishlistItemMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
  // WISH-2042: Add mock for purchase mutation
  useMarkAsPurchasedMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
  wishlistGalleryApi: {
    reducerPath: 'wishlistGalleryApi',
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}))

// Create a mock store for testing
const createTestStore = () =>
  configureStore({
    reducer: {
      wishlistGalleryApi: (state = {}) => state,
    },
  })

describe('Wishlist Gallery Module', () => {
  describe('ModuleLayout', () => {
    it('renders children correctly', () => {
      render(
        <ModuleLayout>
          <div data-testid="test-child">Test Content</div>
        </ModuleLayout>,
      )
      expect(screen.getByTestId('test-child')).toBeInTheDocument()
    })

    it('applies className prop', () => {
      render(
        <ModuleLayout className="custom-class">
          <div>Content</div>
        </ModuleLayout>,
      )
      expect(document.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('MainPage', () => {
    it('renders the page heading', () => {
      render(
        <Provider store={createTestStore()}>
          <MainPage />
        </Provider>,
      )
      expect(screen.getByRole('heading', { name: /Wishlist/i })).toBeInTheDocument()
    })

    it('shows loading skeleton when loading', () => {
      render(
        <Provider store={createTestStore()}>
          <MainPage />
        </Provider>,
      )
      expect(screen.getByTestId('gallery-skeleton')).toBeInTheDocument()
    })
  })
})
