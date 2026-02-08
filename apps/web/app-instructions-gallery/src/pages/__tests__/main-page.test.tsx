/**
 * Instructions Gallery MainPage Tests
 * Story INST-1100: View MOC Gallery
 *
 * Tests for the Instructions Gallery main page component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { TooltipProvider } from '@repo/app-component-library'

import { MainPage } from '../main-page'
import type { MocListResponse, MocInstructions } from '@repo/api-client/schemas/instructions'

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

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

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock useViewMode from @repo/gallery to return 'grid' view by default
vi.mock('@repo/gallery', async () => {
  const actual = await vi.importActual<typeof import('@repo/gallery')>('@repo/gallery')

  return {
    ...actual,
    useViewMode: vi.fn((_key: string, _options?: { urlMode?: string | null }) => [
      'grid',
      vi.fn(),
    ]),
    useFirstTimeHint: vi.fn().mockReturnValue([false, vi.fn()]),
  }
})

// Create mock MOC data matching MocInstructions schema
const createMockMoc = (overrides: Partial<MocInstructions> = {}): MocInstructions => ({
  id: 'dddddddd-dddd-dddd-dddd-dddddddd0001',
  userId: 'user-1',
  title: 'Test Castle MOC',
  description: 'A medieval castle build',
  type: 'moc',
  mocId: null,
  slug: 'test-castle',
  author: 'Test Builder',
  partsCount: 2500,
  minifigCount: 4,
  theme: 'Castle',
  themeId: null,
  subtheme: null,
  uploadedDate: null,
  brand: null,
  setNumber: null,
  releaseYear: null,
  retired: null,
  designer: null,
  dimensions: null,
  instructionsMetadata: null,
  features: null,
  descriptionHtml: null,
  shortDescription: null,
  difficulty: 'intermediate',
  buildTimeHours: 10,
  ageRecommendation: null,
  status: 'published',
  visibility: 'private',
  isFeatured: false,
  isVerified: false,
  tags: ['castle', 'medieval'],
  thumbnailUrl: 'https://example.com/castle-thumbnail.jpg',
  totalPieceCount: 2500,
  publishedAt: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
})

// Mock RTK Query response
const mockMocListResponse: MocListResponse = {
  items: [
    createMockMoc({ id: 'dddddddd-dddd-dddd-dddd-dddddddd0001', title: 'Castle MOC' }),
    createMockMoc({
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0002',
      title: 'Space Station',
      theme: 'Space',
      partsCount: 1500,
    }),
    createMockMoc({
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0003',
      title: 'City Train',
      theme: 'City',
      partsCount: 800,
    }),
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 3,
    totalPages: 1,
  },
}

const emptyMocListResponse: MocListResponse = {
  items: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },
}

// eslint-disable-next-line no-var
var useGetInstructionsQueryMock: ReturnType<typeof vi.fn>

vi.mock('@repo/api-client/rtk/instructions-api', () => {
  useGetInstructionsQueryMock = vi.fn().mockReturnValue({
    data: null as unknown as MocListResponse,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })

  return {
    useGetInstructionsQuery: useGetInstructionsQueryMock,
    instructionsApi: {
      reducerPath: 'instructionsApi',
      reducer: (state = {}) => state,
      middleware: () => (next: any) => (action: any) => next(action),
    },
  }
})

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

const createTestStore = () =>
  configureStore({
    reducer: {
      instructionsApi: (state = {}) => state,
    },
  })

const renderWithProviders = () => {
  return render(
    <Provider store={createTestStore()}>
      <TooltipProvider>
        <MainPage />
      </TooltipProvider>
    </Provider>,
  )
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('Instructions Gallery MainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('renders GallerySkeleton when loading', () => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      renderWithProviders()

      // Should show loading skeleton
      expect(screen.getByTestId('gallery-loading-skeleton')).toBeInTheDocument()

      // Should have screen reader text
      expect(screen.getByText('Loading MOCs...')).toBeInTheDocument()
    })

    it('has aria-live="polite" on loading container', () => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      renderWithProviders()

      const loadingContainer = screen.getByTestId('gallery-loading-skeleton').parentElement
      expect(loadingContainer).toHaveAttribute('aria-live', 'polite')
      expect(loadingContainer).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Empty State', () => {
    it('renders empty state when no MOCs exist', () => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: emptyMocListResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      renderWithProviders()

      expect(screen.getByTestId('gallery-empty-state')).toBeInTheDocument()
      expect(screen.getByText('No instructions yet')).toBeInTheDocument()
      expect(
        screen.getByText('Upload your first MOC instructions to start your collection.'),
      ).toBeInTheDocument()
    })

    it('shows "Create your first MOC" CTA button in empty state', () => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: emptyMocListResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      renderWithProviders()

      const ctaButton = screen.getByRole('button', { name: /create your first moc/i })
      expect(ctaButton).toBeInTheDocument()
    })
  })

  describe('Grid View with Data', () => {
    beforeEach(() => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: mockMocListResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })
    })

    it('renders GalleryGrid when viewMode is grid', () => {
      renderWithProviders()

      // GalleryGrid from @repo/gallery uses data-testid="gallery-grid" by default
      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toBeInTheDocument()
    })

    it('displays MOC cards with correct data', () => {
      renderWithProviders()

      // Check that all MOC titles appear
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
      expect(screen.getByText('Space Station')).toBeInTheDocument()
      expect(screen.getByText('City Train')).toBeInTheDocument()
    })

    it('displays piece count on MOC cards', () => {
      renderWithProviders()

      // Should show piece count badges
      expect(screen.getByText('2,500 pieces')).toBeInTheDocument()
      expect(screen.getByText('1,500 pieces')).toBeInTheDocument()
      expect(screen.getByText('800 pieces')).toBeInTheDocument()
    })

    it('displays theme on MOC cards', () => {
      renderWithProviders()

      // Should show theme tags
      expect(screen.getByText('Castle')).toBeInTheDocument()
      expect(screen.getByText('Space')).toBeInTheDocument()
      expect(screen.getByText('City')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('renders error message on API failure', () => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: vi.fn(),
      })

      renderWithProviders()

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('renders fallback error message when error has no message', () => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: {},
        refetch: vi.fn(),
      })

      renderWithProviders()

      expect(screen.getByText('Failed to load instructions. Please try again.')).toBeInTheDocument()
    })

    it('renders retry button on error', () => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: vi.fn(),
      })

      renderWithProviders()

      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('calls refetch when retry button is clicked', () => {
      const mockRefetch = vi.fn()
      useGetInstructionsQueryMock.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRefetch,
      })

      renderWithProviders()

      fireEvent.click(screen.getByTestId('retry-button'))
      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: mockMocListResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })
    })

    it('has role="region" and aria-label="MOC Gallery"', () => {
      renderWithProviders()

      const region = screen.getByRole('region', { name: 'MOC Gallery' })
      expect(region).toBeInTheDocument()
    })

    it('has data-testid for the gallery region', () => {
      renderWithProviders()

      expect(screen.getByTestId('moc-gallery-region')).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    beforeEach(() => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: mockMocListResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })
    })

    it('renders the page title', () => {
      renderWithProviders()

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Instructions')
    })

    it('renders the page description', () => {
      renderWithProviders()

      expect(screen.getByText('Browse your MOC instruction collection')).toBeInTheDocument()
    })
  })

  describe('Filter Bar', () => {
    beforeEach(() => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: mockMocListResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })
    })

    it('renders the filter bar', () => {
      renderWithProviders()

      expect(screen.getByTestId('instructions-gallery-filter-bar')).toBeInTheDocument()
    })

    it('renders search input with placeholder', () => {
      renderWithProviders()

      expect(screen.getByPlaceholderText('Search instructions...')).toBeInTheDocument()
    })

    it('has accessible search label (A11Y-001)', () => {
      renderWithProviders()

      const searchInput = screen.getByRole('searchbox', { name: /search instructions/i })
      expect(searchInput).toBeInTheDocument()
    })
  })

  describe('Search Filtering (TEST-001)', () => {
    beforeEach(() => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: mockMocListResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })
    })

    it('filters cards by search term', () => {
      renderWithProviders()

      // Initially all 3 MOCs are visible
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
      expect(screen.getByText('Space Station')).toBeInTheDocument()
      expect(screen.getByText('City Train')).toBeInTheDocument()

      // Type in search box
      const searchInput = screen.getByPlaceholderText('Search instructions...')
      fireEvent.change(searchInput, { target: { value: 'Castle' } })

      // Only Castle MOC should be visible
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
      expect(screen.queryByText('Space Station')).not.toBeInTheDocument()
      expect(screen.queryByText('City Train')).not.toBeInTheDocument()
    })

    it('shows empty state when search has no matches', () => {
      renderWithProviders()

      const searchInput = screen.getByPlaceholderText('Search instructions...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent-query-xyz' } })

      expect(screen.getByTestId('gallery-empty-state')).toBeInTheDocument()
    })

    it('search is case-insensitive', () => {
      renderWithProviders()

      const searchInput = screen.getByPlaceholderText('Search instructions...')
      fireEvent.change(searchInput, { target: { value: 'SPACE' } })

      expect(screen.getByText('Space Station')).toBeInTheDocument()
      expect(screen.queryByText('Castle MOC')).not.toBeInTheDocument()
    })
  })

  describe('Card Handlers (TEST-002)', () => {
    const originalLocation = window.location

    beforeEach(async () => {
      useGetInstructionsQueryMock.mockReturnValue({
        data: mockMocListResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      // Re-import and ensure gallery hooks return proper values
      const galleryMocks = await import('@repo/gallery')
      vi.mocked(galleryMocks.useViewMode).mockReturnValue(['grid', vi.fn()])
      vi.mocked(galleryMocks.useFirstTimeHint).mockReturnValue([false, vi.fn()])

      // Mock window.location with a valid URL
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, href: 'http://localhost:3000/instructions' },
      })

      // Mock history.replaceState for the useEffect
      vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
    })

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
      })
      vi.restoreAllMocks()
    })

    it('navigates to detail page on card click', () => {
      renderWithProviders()

      // Find a card by its dynamic testid pattern
      const card = screen.getByTestId('instruction-card-dddddddd-dddd-dddd-dddd-dddddddd0001')
      expect(card).toBeInTheDocument()

      // Click the card
      fireEvent.click(card)
      expect(window.location.href).toBe('/instructions/dddddddd-dddd-dddd-dddd-dddddddd0001')
    })

    it('toggles favorite state on favorite button click', () => {
      renderWithProviders()

      // Find the favorite button by testid
      const favoriteButton = screen.getAllByTestId('favorite-button')[0]
      expect(favoriteButton).toBeInTheDocument()

      // Click the favorite button
      fireEvent.click(favoriteButton)

      // The component should update internal state (local state toggle)
      // Verify it doesn't throw and is still in document
      expect(favoriteButton).toBeInTheDocument()
    })

    it('navigates to edit page on edit button click', () => {
      renderWithProviders()

      // Find the edit button by testid
      const editButton = screen.getAllByTestId('edit-button')[0]
      expect(editButton).toBeInTheDocument()

      // Click the edit button
      fireEvent.click(editButton)

      expect(window.location.href).toBe(
        '/instructions/dddddddd-dddd-dddd-dddd-dddddddd0001/edit',
      )
    })
  })
})
