/**
 * CollectionPage Component Tests
 *
 * Story SETS-MVP-002: Collection View
 *
 * Note: Full integration tests are covered by Playwright E2E tests.
 * These unit tests verify component rendering and structure only.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { CollectionPage } from '../index'
import { wishlistGalleryApi } from '@repo/api-client/rtk/wishlist-gallery-api'

// Mock React Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('CollectionPage', () => {
  function createMockStore() {
    return configureStore({
      reducer: {
        [wishlistGalleryApi.reducerPath]: wishlistGalleryApi.reducer,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware().concat(wishlistGalleryApi.middleware),
    })
  }

  describe('Component Structure', () => {
    it('should render without crashing', () => {
      const store = createMockStore()

      const { container } = render(
        <Provider store={store}>
          <CollectionPage />
        </Provider>,
      )

      expect(container).toBeInTheDocument()
    })

    it('should have "My Collection" heading when data loads', async () => {
      const store = createMockStore()

      render(
        <Provider store={store}>
          <CollectionPage />
        </Provider>,
      )

      // Wait for heading to appear (either in loading or loaded state)
      const headings = await screen.findAllByRole('heading', { name: /my collection/i })
      expect(headings.length).toBeGreaterThan(0)
    })
  })
})
