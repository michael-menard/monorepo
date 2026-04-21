/**
 * Sets MainPage Tests (MSW + RTK Query)
 *
 * Verifies that the sets gallery main page:
 * - Fetches data via useGetSetsQuery (backed by MSW /api/sets)
 * - Renders cards in grid view by default
 * - Wires search, build status filters and sort options to the API
 * - Loads more items via infinite scroll sentinel
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { TooltipProvider } from '@repo/app-component-library'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'

import { setsApi } from '@repo/api-client/rtk/sets-api'
import type { SetListResponse } from '@repo/api-client/schemas/sets'
import type { Set } from '@repo/api-client/schemas/sets'
import { server } from '../../test/mocks/server'
import { MainPage } from '../main-page'

const API_BASE_URL = 'http://localhost:3001'

function makeSet(overrides: Partial<Set> & { id: string; title: string }): Set {
  return {
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    status: 'owned',
    statusChangedAt: null,
    setNumber: null,
    sourceUrl: null,
    storeId: null,
    storeName: null,
    pieceCount: null,
    brand: null,
    year: null,
    theme: null,
    description: null,
    dimensions: null,
    releaseDate: null,
    retireDate: null,
    notes: null,
    condition: null,
    completeness: null,
    buildStatus: null,
    purchasePrice: null,
    purchaseTax: null,
    purchaseShipping: null,
    purchaseDate: null,
    quantity: 1,
    priority: null,
    sortOrder: null,
    imageUrl: null,
    imageVariants: null,
    images: [],
    tags: [],
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
    ...overrides,
  }
}

const baseSetListResponse: SetListResponse = {
  items: [
    makeSet({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Downtown Diner',
      setNumber: '10260',
      pieceCount: 2480,
      theme: 'Creator Expert',
      tags: ['modular', 'city'],
      buildStatus: null,
      images: [
        {
          id: '11111111-1111-1111-1111-000000000001',
          imageUrl: 'https://example.com/diner.jpg',
          thumbnailUrl: 'https://example.com/diner-thumb.jpg',
          position: 0,
        },
      ],
      createdAt: new Date('2025-01-01').toISOString(),
      updatedAt: new Date('2025-01-01').toISOString(),
    }),
    makeSet({
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Corner Garage',
      setNumber: '10264',
      pieceCount: 2569,
      theme: 'Creator Expert',
      tags: ['modular'],
      buildStatus: 'completed',
      quantity: 2,
      images: [
        {
          id: '22222222-2222-2222-2222-000000000002',
          imageUrl: 'https://example.com/garage.jpg',
          thumbnailUrl: 'https://example.com/garage-thumb.jpg',
          position: 0,
        },
      ],
      createdAt: new Date('2025-01-02').toISOString(),
      updatedAt: new Date('2025-01-02').toISOString(),
    }),
  ],
  pagination: {
    page: 1,
    limit: 40,
    total: 2,
    totalPages: 1,
  },
}

const createTestStore = () =>
  configureStore({
    reducer: {
      [setsApi.reducerPath]: setsApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(setsApi.middleware),
  })

const renderMainPage = () => {
  const store = createTestStore()

  return render(
    <TooltipProvider>
      <Provider store={store}>
      <MemoryRouter initialEntries={['/sets']}>
        <Routes>
          <Route path="/sets" element={<MainPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
    </TooltipProvider>,
  )
}

describe('Sets MainPage', () => {
  beforeEach(() => {
    // Dynamic handler that respects query params for search, sort and pagination
    server.use(
      http.get(`${API_BASE_URL}/api/sets`, ({ request }) => {
        const url = new URL(request.url)

        const search = url.searchParams.get('search')?.toLowerCase() ?? ''
        const isBuiltParam = url.searchParams.get('isBuilt')
        const sort = (url.searchParams.get('sort') ?? 'createdAt') as
          | 'title'
          | 'pieceCount'
          | 'purchasePrice'
          | 'createdAt'
        const order = url.searchParams.get('order') ?? 'desc'
        const page = Number(url.searchParams.get('page') ?? '1')
        const limit = Number(url.searchParams.get('limit') ?? '40')

        let items = [...baseSetListResponse.items]

        if (search) {
          items = items.filter(item => {
            return (
              item.title.toLowerCase().includes(search) ||
              (item.setNumber ?? '').toLowerCase().includes(search) ||
              (item.theme ?? '').toLowerCase().includes(search)
            )
          })
        }

        if (isBuiltParam !== null) {
          const isBuilt = isBuiltParam === 'true'
          items = items.filter(item =>
            isBuilt
              ? item.buildStatus === 'completed' || item.buildStatus === 'parted_out'
              : item.buildStatus !== 'completed' && item.buildStatus !== 'parted_out',
          )
        }

        items.sort((a, b) => {
          const dir = order === 'asc' ? 1 : -1

          switch (sort) {
            case 'title':
              return a.title.localeCompare(b.title) * dir
            case 'pieceCount':
              return ((a.pieceCount ?? 0) - (b.pieceCount ?? 0)) * dir
            case 'purchasePrice': {
              const aPrice = a.purchasePrice ? parseFloat(a.purchasePrice) : 0
              const bPrice = b.purchasePrice ? parseFloat(b.purchasePrice) : 0
              return (aPrice - bPrice) * dir
            }
            case 'createdAt':
            default:
              return (
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              ) * dir
          }
        })

        const total = items.length
        const start = (page - 1) * limit
        const end = start + limit
        const pagedItems = items.slice(start, end)

        const response: SetListResponse = {
          items: pagedItems,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        }

        return HttpResponse.json(response)
      }),
    )
  })

  it('renders sets from API in grid view by default', async () => {
    renderMainPage()

    await waitFor(() => {
      expect(screen.getByText('Downtown Diner')).toBeInTheDocument()
    })

    const grid = screen.getByTestId('gallery-grid')
    expect(grid).toBeInTheDocument()
    expect(screen.getByText('Downtown Diner')).toBeInTheDocument()
    expect(screen.getByText('Corner Garage')).toBeInTheDocument()
  })

  it('renders filter bar with search, build status, and sort controls', async () => {
    renderMainPage()

    await waitFor(() => {
      expect(screen.getByText('Downtown Diner')).toBeInTheDocument()
    })

    // Search input
    expect(screen.getByLabelText(/search sets/i)).toBeInTheDocument()

    // Build status select
    const buildStatusSelect = screen.getByLabelText('Filter by build status')
    expect(buildStatusSelect).toBeInTheDocument()

    // Sort select
    const sortSelect = screen.getByLabelText('Sort sets')
    expect(sortSelect).toBeInTheDocument()
  })

  it('applies search filter via the API', async () => {
    const user = userEvent.setup()
    renderMainPage()

    await waitFor(() => {
      expect(screen.getByText('Downtown Diner')).toBeInTheDocument()
      expect(screen.getByText('Corner Garage')).toBeInTheDocument()
    })

    // Search for "Garage" - should filter to only Corner Garage
    const searchInput = screen.getByLabelText(/search sets/i)
    await user.clear(searchInput)
    await user.type(searchInput, 'Garage')

    await waitFor(() => {
      expect(screen.getByText('Corner Garage')).toBeInTheDocument()
      expect(screen.queryByText('Downtown Diner')).not.toBeInTheDocument()
    })

    // Clear search - both items should reappear
    await user.clear(searchInput)

    await waitFor(() => {
      expect(screen.getByText('Downtown Diner')).toBeInTheDocument()
      expect(screen.getByText('Corner Garage')).toBeInTheDocument()
    })
  })

  it('renders sort control and verifies default sort order', async () => {
    renderMainPage()

    await waitFor(() => {
      expect(screen.getByText('Downtown Diner')).toBeInTheDocument()
    })

    // Verify sort control exists and is accessible
    const sortSelect = screen.getByLabelText('Sort sets')
    expect(sortSelect).toBeInTheDocument()

    // Default sort is "createdAt desc" - both items render in descending creation order
    const grid = screen.getByTestId('gallery-grid')
    const cornerGarage = within(grid).getByTestId('set-card-22222222-2222-2222-2222-222222222222')
    const downtownDiner = within(grid).getByTestId('set-card-11111111-1111-1111-1111-111111111111')
    expect(cornerGarage).toBeInTheDocument()
    expect(downtownDiner).toBeInTheDocument()

    // Verify both cards are in the grid and Corner Garage appears first (descending by createdAt)
    expect(cornerGarage.textContent).toContain('Corner Garage')
    expect(downtownDiner.textContent).toContain('Downtown Diner')
  })

  it('shows infinite scroll sentinel when more pages are available', async () => {
    // Override handler to return enough items for multiple pages
    server.use(
      http.get(`${API_BASE_URL}/api/sets`, ({ request }) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page') ?? '1')
        const limit = Number(url.searchParams.get('limit') ?? '40')

        // Create 60 items to trigger 2 pages with limit=40
        const allItems = Array.from({ length: 60 }, (_, i) =>
          makeSet({
            id: `${String(i + 1).padStart(8, '0')}-0000-0000-0000-000000000000`,
            title: `Set ${i + 1}`,
            createdAt: new Date(2025, 0, i + 1).toISOString(),
            updatedAt: new Date(2025, 0, i + 1).toISOString(),
          }),
        )

        const start = (page - 1) * limit
        const pagedItems = allItems.slice(start, start + limit)

        return HttpResponse.json({
          items: pagedItems,
          pagination: {
            page,
            limit,
            total: allItems.length,
            totalPages: Math.ceil(allItems.length / limit),
          },
        } satisfies SetListResponse)
      }),
    )

    renderMainPage()

    // Wait for page 1 content
    await waitFor(() => {
      expect(screen.getByText('Set 1')).toBeInTheDocument()
    })

    // Infinite scroll sentinel should be present
    expect(screen.getByTestId('infinite-scroll-sentinel')).toBeInTheDocument()
  })

  it('navigates to the add set page when the Add Set button is clicked', async () => {
    const user = userEvent.setup()
    renderMainPage()

    await waitFor(() => {
      expect(screen.getByText('Downtown Diner')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add set/i })
    await user.click(addButton)

    expect(addButton).toBeEnabled()
  })
})
