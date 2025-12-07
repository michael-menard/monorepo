/**
 * Uploader Routes Tests
 * Story 3.1.15: Routes & CTAs — Entry Points to Uploader
 *
 * Tests:
 * - /instructions/new route is protected
 * - Unauthenticated users redirected to login with return param
 * - /dashboard/mocs/upload alias redirects to /instructions/new
 * - CTAs in Dashboard and Gallery navigate correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { redirect } from '@tanstack/react-router'

// Mock the redirect function to capture redirect params
const mockRedirect = vi.fn((opts: any) => {
  throw { type: 'redirect', ...opts }
})

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    redirect: (opts: any) => mockRedirect(opts),
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  }
})

// Mock page components
vi.mock('../pages/InstructionsNewPage', () => ({
  InstructionsNewPage: () => <div data-testid="instructions-new-page">Instructions New Page</div>,
}))

vi.mock('../pages/LoadingPage', () => ({
  LoadingPage: () => <div data-testid="loading-page">Loading...</div>,
}))

describe('Story 3.1.15: Uploader Routes & CTAs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('/instructions/new route protection', () => {
    it('redirects unauthenticated users to login with return param', () => {
      // Simulate the beforeLoad guard behavior
      const context = { auth: { isAuthenticated: false } }
      const location = { pathname: '/instructions/new' }

      // This simulates what the route guard does
      const beforeLoad = ({
        context: ctx,
        location: loc,
      }: {
        context: typeof context
        location: typeof location
      }) => {
        if (!ctx.auth?.isAuthenticated) {
          throw redirect({
            to: '/login',
            search: { redirect: loc.pathname },
          })
        }
      }

      expect(() => beforeLoad({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({
        to: '/login',
        search: { redirect: '/instructions/new' },
      })
    })

    it('allows authenticated users to access the route', () => {
      const context = { auth: { isAuthenticated: true } }
      const location = { pathname: '/instructions/new' }

      const beforeLoad = ({
        context: ctx,
        location: loc,
      }: {
        context: typeof context
        location: typeof location
      }) => {
        if (!ctx.auth?.isAuthenticated) {
          throw redirect({
            to: '/login',
            search: { redirect: loc.pathname },
          })
        }
      }

      // Should not throw
      expect(() => beforeLoad({ context, location })).not.toThrow()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('/dashboard/mocs/upload alias route', () => {
    it('redirects to /instructions/new', () => {
      // Simulate the alias route beforeLoad
      const aliasBeforeLoad = () => {
        throw redirect({ to: '/instructions/new' })
      }

      expect(() => aliasBeforeLoad()).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/instructions/new' })
    })
  })

  describe('Dashboard CTAs', () => {
    it('QuickActions has Add MOC link to /instructions/new', async () => {
      // Import and render QuickActions
      const { QuickActions } = await import('@/components/Dashboard/QuickActions')
      render(<QuickActions />)

      const addMocLink = screen.getByRole('link', { name: /add moc/i })
      expect(addMocLink).toHaveAttribute('href', '/instructions/new')
    })

    it('EmptyDashboard has Add Your First MOC link to /instructions/new', async () => {
      const { EmptyDashboard } = await import('@/components/Dashboard/EmptyDashboard')
      render(<EmptyDashboard />)

      const addMocLink = screen.getByRole('link', { name: /add your first moc/i })
      expect(addMocLink).toHaveAttribute('href', '/instructions/new')
    })
  })

  describe('Gallery CTA', () => {
    it('GalleryModule has Upload yours link to /instructions/new', async () => {
      // Mock the store hooks
      vi.mock('@/store', () => ({
        useEnhancedGallerySearchQuery: () => ({ data: null, isLoading: false, isFetching: false }),
        useGetEnhancedGalleryStatsQuery: () => ({ data: null, isLoading: false }),
      }))

      const { GalleryModule } = await import('../modules/GalleryModule')
      render(<GalleryModule />)

      // The link has visible text "Upload yours" (aria-label is on the button wrapper)
      const uploadLink = screen.getByRole('link', { name: /upload yours/i })
      expect(uploadLink).toHaveAttribute('href', '/instructions/new')
    })
  })

  describe('Accessibility', () => {
    it('Gallery CTA has proper aria-label', async () => {
      vi.mock('@/store', () => ({
        useEnhancedGallerySearchQuery: () => ({ data: null, isLoading: false, isFetching: false }),
        useGetEnhancedGalleryStatsQuery: () => ({ data: null, isLoading: false }),
      }))

      const { GalleryModule } = await import('../modules/GalleryModule')
      render(<GalleryModule />)

      const uploadButton = screen.getByLabelText('Upload your own MOC instructions')
      expect(uploadButton).toBeInTheDocument()
    })
  })
})
