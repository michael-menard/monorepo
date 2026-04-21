import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { TooltipProvider } from '@repo/app-component-library'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { setsApi } from '@repo/api-client/rtk/sets-api'
import type { Set } from '@repo/api-client/schemas/sets'
import { server } from '../../test/mocks/server'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Restore real react-router-dom (setup.ts mocks useParams to return {})
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual }
})

// ---------------------------------------------------------------------------
// Toast spies
// ---------------------------------------------------------------------------

const successToastSpy = vi.fn()
const errorToastSpy = vi.fn()

vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual<any>('@repo/app-component-library')
  return {
    ...actual,
    useToast: () => ({
      success: successToastSpy,
      error: errorToastSpy,
    }),
  }
})

import { SetDetailPage } from '../set-detail-page'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE_URL = 'http://localhost:3001'
const SET_ID = '11111111-1111-1111-1111-111111111111'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Fully-populated mock set matching SetSchema */
const mockSet: Set = {
  id: SET_ID,
  userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  status: 'owned',
  statusChangedAt: null,
  title: 'Modular Bookshop',
  setNumber: '10270',
  sourceUrl: 'https://lego.com/product/10270',
  storeId: null,
  storeName: null,
  pieceCount: 2504,
  brand: 'LEGO',
  year: 2020,
  theme: 'Creator Expert',
  description: 'A modular bookshop building.',
  dimensions: {
    height: { cm: 30, inches: 11.8 },
    width: { cm: 25, inches: 9.8 },
    depth: { cm: 25, inches: 9.8 },
    studsWidth: 32,
    studsDepth: 32,
    studsHeight: null,
  },
  releaseDate: '2020-01-01T00:00:00.000Z',
  retireDate: '2023-12-31T00:00:00.000Z',
  notes: 'Great display piece',
  condition: null,
  completeness: null,
  buildStatus: 'completed',
  purchasePrice: '179.99',
  purchaseTax: '15.00',
  purchaseShipping: '0.00',
  purchaseDate: '2020-03-01T00:00:00.000Z',
  quantity: 1,
  priority: null,
  sortOrder: null,
  msrpPrice: '179.99',
  msrpCurrency: 'USD',
  weight: '2800',
  availabilityStatus: 'retired',
  quantityWanted: 2,
  lastScrapedAt: '2025-04-15T10:30:00.000Z',
  lastScrapedSource: 'lego.com',
  imageUrl: 'https://example.com/primary.jpg',
  imageVariants: null,
  images: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      imageUrl: 'https://example.com/image1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      position: 0,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      imageUrl: 'https://example.com/image2.jpg',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      position: 1,
    },
  ],
  tags: ['modular', 'creator'],
  instances: [
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      setId: SET_ID,
      condition: 'new',
      completeness: 'complete',
      buildStatus: 'completed',
      includesMinifigs: true,
      purchasePrice: '179.99',
      purchaseTax: null,
      purchaseShipping: null,
      purchaseDate: '2020-03-01T00:00:00.000Z',
      storeId: null,
      notes: null,
      sortOrder: null,
      createdAt: '2020-03-01T00:00:00.000Z',
      updatedAt: '2020-03-01T00:00:00.000Z',
    },
  ],
  minifigs: [
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      variantId: null,
      displayName: 'Bookshop Owner',
      status: 'owned',
      condition: null,
      sourceType: 'set',
      sourceSetId: SET_ID,
      isCustom: false,
      quantityOwned: 1,
      quantityWanted: 0,
      purchasePrice: null,
      purchaseTax: null,
      purchaseShipping: null,
      purchaseDate: null,
      purpose: null,
      plannedUse: null,
      notes: null,
      imageUrl: 'https://example.com/fig1.jpg',
      sortOrder: null,
      tags: [],
      variant: null,
      createdAt: '2020-03-01T00:00:00.000Z',
      updatedAt: '2020-03-01T00:00:00.000Z',
    },
  ],
  createdAt: '2020-03-01T00:00:00.000Z',
  updatedAt: '2025-04-15T10:30:00.000Z',
}

/** Set with all nullable product fields set to null */
const mockSetNullProducts: Set = {
  ...mockSet,
  pieceCount: null,
  brand: null,
  year: null,
  msrpPrice: null,
  msrpCurrency: null,
  weight: null,
  dimensions: null,
  releaseDate: null,
  retireDate: null,
  availabilityStatus: null,
  lastScrapedAt: null,
  lastScrapedSource: null,
  minifigs: [],
  instances: [],
  notes: null,
  images: [],
  imageUrl: null,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createTestStore = () =>
  configureStore({
    reducer: { [setsApi.reducerPath]: setsApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(setsApi.middleware),
  })

function renderPage(setId = SET_ID) {
  const store = createTestStore()
  return render(
    <TooltipProvider>
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/sets/${setId}`]}>
          <Routes>
            <Route path="/sets/:id" element={<SetDetailPage />} />
            <Route path="/sets" element={<div data-testid="gallery-page">Gallery</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </TooltipProvider>,
  )
}

/** Shortcut to set up MSW to return a specific set */
function useSetResponse(set: Set) {
  server.use(
    http.get(`${API_BASE_URL}/api/sets/:id`, () => {
      return HttpResponse.json(set)
    }),
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SetDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // Loading state
  // =========================================================================

  describe('Loading state', () => {
    it('renders loading skeleton while fetching', () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, async () => {
          await new Promise(resolve => setTimeout(resolve, 5000))
          return HttpResponse.json(mockSet)
        }),
      )

      renderPage()

      expect(screen.getByTestId('set-detail-skeleton')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // 404 / Error states
  // =========================================================================

  describe('Error states', () => {
    it('renders 404 when set not found', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return new HttpResponse(null, { status: 404 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-not-found')).toBeInTheDocument()
      })

      expect(screen.getByText('Set Not Found')).toBeInTheDocument()
    })

    it('renders 403 access denied', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return new HttpResponse(null, { status: 403 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-error')).toBeInTheDocument()
      })

      expect(
        screen.getByText(/you don.t have access to this set/i),
      ).toBeInTheDocument()
    })

    it('renders generic error on 500', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return new HttpResponse(null, { status: 500 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-error')).toBeInTheDocument()
      })

      expect(
        screen.getByText(/failed to load set details/i),
      ).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Product specs card
  // =========================================================================

  describe('Product specs card', () => {
    beforeEach(() => {
      useSetResponse(mockSet)
    })

    it('renders product specs card with all fields', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-specs')).toBeInTheDocument()
      })

      const specs = screen.getByTestId('set-detail-specs')

      expect(within(specs).getByText('Product Specs')).toBeInTheDocument()

      // Pieces
      expect(within(specs).getByText('Pieces')).toBeInTheDocument()
      expect(within(specs).getByText('2,504')).toBeInTheDocument()

      // MSRP — scoped to specs to avoid matching instance purchasePrice
      expect(within(specs).getByText('MSRP')).toBeInTheDocument()
      expect(within(specs).getByText('$179.99')).toBeInTheDocument()

      // Weight — 2800g = 2.80 kg
      expect(within(specs).getByText('Weight')).toBeInTheDocument()
      expect(within(specs).getByText('2.80 kg')).toBeInTheDocument()

      // Year
      expect(within(specs).getByText('Year')).toBeInTheDocument()
      expect(within(specs).getByText('2020')).toBeInTheDocument()

      // Brand
      expect(within(specs).getByText('Brand')).toBeInTheDocument()
      expect(within(specs).getByText('LEGO')).toBeInTheDocument()

      // Availability
      expect(within(specs).getByText('Availability')).toBeInTheDocument()
    })

    it('renders dimension values', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-specs')).toBeInTheDocument()
      })

      const specs = screen.getByTestId('set-detail-specs')

      expect(within(specs).getByText('Height')).toBeInTheDocument()
      expect(within(specs).getByText('11.8"')).toBeInTheDocument()

      expect(within(specs).getByText('Width')).toBeInTheDocument()
      // Width and Depth both 9.8" — use getAllByText
      expect(within(specs).getAllByText('9.8"')).toHaveLength(2)

      expect(within(specs).getByText('Depth')).toBeInTheDocument()
    })

    it('null product fields render as placeholder dash, not hidden', async () => {
      useSetResponse(mockSetNullProducts)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-specs')).toBeInTheDocument()
      })

      // The labels should still be visible
      expect(screen.getByText('Pieces')).toBeInTheDocument()
      expect(screen.getByText('MSRP')).toBeInTheDocument()
      expect(screen.getByText('Weight')).toBeInTheDocument()
      expect(screen.getByText('Year')).toBeInTheDocument()
      expect(screen.getByText('Brand')).toBeInTheDocument()

      // All null values should show the em-dash placeholder
      const specsSection = screen.getByTestId('set-detail-specs')
      const dashes = specsSection.querySelectorAll('span')
      const dashValues = Array.from(dashes).filter(el => el.textContent === '\u2014')
      // At least Pieces, MSRP, Weight, Year, Brand, Release Date, Retire Date should be dashes
      expect(dashValues.length).toBeGreaterThanOrEqual(7)
    })
  })

  // =========================================================================
  // Header section
  // =========================================================================

  describe('Header section', () => {
    beforeEach(() => {
      useSetResponse(mockSet)
    })

    it('renders title', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-title')).toBeInTheDocument()
      })

      expect(screen.getByText('Modular Bookshop')).toBeInTheDocument()
    })

    it('renders set number', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByText('#10270')).toBeInTheDocument()
    })

    it('renders theme badge', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-theme-badge')).toBeInTheDocument()
      })

      expect(screen.getByText('Creator Expert')).toBeInTheDocument()
    })

    it('renders availability badge', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-availability-badge')).toBeInTheDocument()
      })

      // availabilityStatus: 'retired' maps to "Retired"
      expect(screen.getByTestId('set-detail-availability-badge')).toHaveTextContent('Retired')
    })

    it('"Add Copy" button is present', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-add-copy')).toBeInTheDocument()
      })

      expect(screen.getByTestId('set-detail-add-copy')).toHaveTextContent('Add Copy')
    })
  })

  // =========================================================================
  // Instances table section
  // =========================================================================

  describe('Instances table section', () => {
    it('renders instances section with populated instances', async () => {
      useSetResponse(mockSet)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-instances-section')).toBeInTheDocument()
      })

      expect(screen.getByText('Your Copies')).toBeInTheDocument()
    })

    it('renders empty state when no instances', async () => {
      useSetResponse({ ...mockSet, instances: [] })
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-instances-section')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /add your first copy/i })).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Minifigs section
  // =========================================================================

  describe('Minifigs section', () => {
    it('renders minifigs grid with minifig data', async () => {
      useSetResponse(mockSet)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-minifigs-section')).toBeInTheDocument()
      })

      const minifigsSection = screen.getByTestId('set-detail-minifigs-section')
      // "Minifigs" appears as section heading, specs row label, and table header
      expect(within(minifigsSection).getByText('Minifigs')).toBeInTheDocument()
      expect(screen.getByText('Bookshop Owner')).toBeInTheDocument()
    })

    it('renders empty state when no minifigs', async () => {
      useSetResponse({ ...mockSet, minifigs: [] })
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-minifigs-section')).toBeInTheDocument()
      })

      expect(screen.getByText('No minifig data available')).toBeInTheDocument()
    })

    it('shows quantity badge when quantityOwned > 1', async () => {
      const setWithMultiMinifigs: Set = {
        ...mockSet,
        minifigs: [
          {
            ...mockSet.minifigs[0],
            quantityOwned: 3,
          },
        ],
      }
      useSetResponse(setWithMultiMinifigs)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-minifigs-section')).toBeInTheDocument()
      })

      expect(screen.getByText('x3')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Notes section
  // =========================================================================

  describe('Notes section', () => {
    it('renders notes section with existing notes', async () => {
      useSetResponse(mockSet)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-notes-section')).toBeInTheDocument()
      })

      expect(screen.getByText('Great display piece')).toBeInTheDocument()
    })

    it('renders empty notes placeholder when notes are null', async () => {
      useSetResponse({ ...mockSet, notes: null })
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-notes-section')).toBeInTheDocument()
      })

      expect(screen.getByText('Click to add notes...')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Provenance footer
  // =========================================================================

  describe('Provenance footer', () => {
    it('renders lastScrapedAt and source', async () => {
      useSetResponse(mockSet)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-provenance')).toBeInTheDocument()
      })

      expect(screen.getByText(/last scraped/i)).toBeInTheDocument()
      expect(screen.getByText(/source: lego\.com/i)).toBeInTheDocument()
    })

    it('renders "No scrape data available" when both fields are null', async () => {
      useSetResponse(mockSetNullProducts)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-provenance')).toBeInTheDocument()
      })

      expect(screen.getByText('No scrape data available')).toBeInTheDocument()
    })

    it('renders quantity wanted with editable control', async () => {
      useSetResponse(mockSet)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-provenance')).toBeInTheDocument()
      })

      expect(screen.getByText('Quantity wanted:')).toBeInTheDocument()
      // quantityWanted: 2
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Navigation
  // =========================================================================

  describe('Navigation', () => {
    beforeEach(() => {
      useSetResponse(mockSet)
    })

    it('back button navigates away from detail page', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const backButton = screen.getByTestId('set-detail-back-button')
      await user.click(backButton)

      // navigate('..') from /sets/:id leaves the detail page
      await waitFor(() => {
        expect(screen.queryByTestId('set-detail-page')).not.toBeInTheDocument()
      })
    })

    it('back button has accessible label', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const backButton = screen.getByTestId('set-detail-back-button')
      expect(backButton).toHaveAttribute('aria-label', 'Back to sets gallery')
    })
  })

  // =========================================================================
  // Image gallery
  // =========================================================================

  describe('Image gallery', () => {
    it('renders image thumbnails when images exist', async () => {
      useSetResponse(mockSet)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByTestId('set-detail-image-thumbnail-0')).toBeInTheDocument()
      expect(screen.getByTestId('set-detail-image-thumbnail-1')).toBeInTheDocument()
    })

    it('renders no images message when images array is empty and no imageUrl', async () => {
      useSetResponse(mockSetNullProducts)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByText('No images available for this set yet.')).toBeInTheDocument()
    })

    it('thumbnails have proper aria-labels', async () => {
      useSetResponse(mockSet)
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const thumbnail = screen.getByTestId('set-detail-image-thumbnail-0')
      expect(thumbnail).toHaveAttribute('aria-label')
      expect(thumbnail.getAttribute('aria-label')).toContain('View')
    })
  })

  // =========================================================================
  // Add Copy action
  // =========================================================================

  describe('Add Copy action', () => {
    it('calls createInstance mutation and shows success toast', async () => {
      const user = userEvent.setup()
      useSetResponse(mockSet)

      server.use(
        http.post(`${API_BASE_URL}/api/sets/${SET_ID}/instances`, () => {
          return HttpResponse.json({
            id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            setId: SET_ID,
            condition: 'new',
            completeness: 'complete',
            buildStatus: 'not_started',
            includesMinifigs: null,
            purchasePrice: null,
            purchaseTax: null,
            purchaseShipping: null,
            purchaseDate: null,
            storeId: null,
            notes: null,
            sortOrder: null,
            createdAt: '2025-04-20T00:00:00.000Z',
            updatedAt: '2025-04-20T00:00:00.000Z',
          })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-add-copy')).toBeInTheDocument()
      })

      const addButton = screen.getByTestId('set-detail-add-copy')
      await user.click(addButton)

      await waitFor(() => {
        expect(successToastSpy).toHaveBeenCalledWith(
          'Added',
          'New copy added to your collection.',
        )
      })
    })

    it('shows error toast when createInstance fails', async () => {
      const user = userEvent.setup()
      useSetResponse(mockSet)

      server.use(
        http.post(`${API_BASE_URL}/api/sets/${SET_ID}/instances`, () => {
          return new HttpResponse(null, { status: 500 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-add-copy')).toBeInTheDocument()
      })

      const addButton = screen.getByTestId('set-detail-add-copy')
      await user.click(addButton)

      await waitFor(() => {
        expect(errorToastSpy).toHaveBeenCalled()
      })
    })
  })
})
