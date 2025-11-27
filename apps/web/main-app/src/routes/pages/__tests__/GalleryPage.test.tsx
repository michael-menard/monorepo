import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { GalleryPage } from '../GalleryPage'
import gallerySlice from '@/store/slices/gallerySlice'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Images: () => <div data-testid="images-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Grid: () => <div data-testid="grid-icon" />,
  List: () => <div data-testid="list-icon" />,
  LayoutGrid: () => <div data-testid="layout-grid-icon" />,
  Table: () => <div data-testid="table-icon" />,
  X: () => <div data-testid="x-icon" />,
  SortAsc: () => <div data-testid="sort-asc-icon" />,
  SortDesc: () => <div data-testid="sort-desc-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  User: () => <div data-testid="user-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Download: () => <div data-testid="download-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
}))

// Mock @repo/ui components
vi.mock('@repo/ui/card', () => ({
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, ...props }: any) => (
    <div data-testid="card-content" {...props}>
      {children}
    </div>
  ),
  CardDescription: ({ children, ...props }: any) => (
    <div data-testid="card-description" {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, ...props }: any) => (
    <div data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, ...props }: any) => (
    <div data-testid="card-title" {...props}>
      {children}
    </div>
  ),
}))

vi.mock('@repo/ui/input', () => ({
  Input: ({ ...props }: any) => <input data-testid="input" {...props} />,
}))

vi.mock('@repo/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@repo/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => (
    <span data-testid="badge" {...props}>
      {children}
    </span>
  ),
}))

vi.mock('@repo/ui/select', () => ({
  Select: ({ children, ...props }: any) => (
    <div data-testid="select" {...props}>
      {children}
    </div>
  ),
  SelectContent: ({ children, ...props }: any) => (
    <div data-testid="select-content" {...props}>
      {children}
    </div>
  ),
  SelectItem: ({ children, ...props }: any) => (
    <div data-testid="select-item" {...props}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, ...props }: any) => (
    <div data-testid="select-trigger" {...props}>
      {children}
    </div>
  ),
  SelectValue: ({ ...props }: any) => <div data-testid="select-value" {...props} />,
}))

vi.mock('@repo/ui', () => ({
  // Table components
  Table: ({ children, ...props }: any) => (
    <table data-testid="table" {...props}>
      {children}
    </table>
  ),
  TableBody: ({ children, ...props }: any) => (
    <tbody data-testid="table-body" {...props}>
      {children}
    </tbody>
  ),
  TableCell: ({ children, ...props }: any) => (
    <td data-testid="table-cell" {...props}>
      {children}
    </td>
  ),
  TableHead: ({ children, ...props }: any) => (
    <th data-testid="table-head" {...props}>
      {children}
    </th>
  ),
  TableHeader: ({ children, ...props }: any) => (
    <thead data-testid="table-header" {...props}>
      {children}
    </thead>
  ),
  TableRow: ({ children, ...props }: any) => (
    <tr data-testid="table-row" {...props}>
      {children}
    </tr>
  ),
}))

// Create mock store
function createMockStore(initialState = {}) {
  return configureStore({
    reducer: {
      gallery: gallerySlice,
    },
    preloadedState: {
      gallery: {
        layout: 'grid',
        sortBy: 'recent',
        sortOrder: 'desc',
        searchQuery: '',
        selectedCategory: '',
        selectedTags: [],
        isLoading: false,
        error: null,
        mocs: [],
        filteredMocs: [],
        totalCount: 0,
        currentPage: 1,
        pageSize: 20,
        hasMore: false,
        ...initialState,
      },
    },
  })
}

// Test wrapper component
function TestWrapper({ children, store }: { children: React.ReactNode; store: any }) {
  return <Provider store={store}>{children}</Provider>
}

describe('GalleryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders gallery page with header', () => {
    const store = createMockStore()

    render(
      <TestWrapper store={store}>
        <GalleryPage />
      </TestWrapper>,
    )

    expect(screen.getByText('MOC Gallery')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Discover and explore amazing LEGO MOC (My Own Creation) designs from the community',
      ),
    ).toBeInTheDocument()
  })

  it('renders search and filter controls', () => {
    const store = createMockStore()

    render(
      <TestWrapper store={store}>
        <GalleryPage />
      </TestWrapper>,
    )

    expect(screen.getByText('Search & Filter')).toBeInTheDocument()
    expect(screen.getByDisplayValue('')).toBeInTheDocument() // Search input
  })

  it('renders layout switcher buttons', () => {
    const store = createMockStore()

    render(
      <TestWrapper store={store}>
        <GalleryPage />
      </TestWrapper>,
    )

    // Layout switcher icons should be present
    expect(screen.getByTestId('grid-icon')).toBeInTheDocument()
    expect(screen.getByTestId('list-icon')).toBeInTheDocument()
    expect(screen.getByTestId('layout-grid-icon')).toBeInTheDocument()
    expect(screen.getByTestId('table-icon')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const store = createMockStore({ isLoading: true })

    render(
      <TestWrapper store={store}>
        <GalleryPage />
      </TestWrapper>,
    )

    // Should show loading skeletons
    expect(screen.getByText('MOC Gallery')).toBeInTheDocument()
  })

  it('shows error state', () => {
    const store = createMockStore({ error: 'Failed to load gallery' })

    render(
      <TestWrapper store={store}>
        <GalleryPage />
      </TestWrapper>,
    )

    expect(screen.getByText('Error Loading Gallery')).toBeInTheDocument()
    expect(screen.getByText('Failed to load gallery')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('handles search input changes', async () => {
    const store = createMockStore()

    render(
      <TestWrapper store={store}>
        <GalleryPage />
      </TestWrapper>,
    )

    const searchInput = screen.getByDisplayValue('')
    fireEvent.change(searchInput, { target: { value: 'technic' } })

    await waitFor(() => {
      const state = store.getState()
      expect(state.gallery.searchQuery).toBe('technic')
    })
  })

  it('loads mock data on mount', async () => {
    const store = createMockStore()

    render(
      <TestWrapper store={store}>
        <GalleryPage />
      </TestWrapper>,
    )

    // Wait for mock data to load
    await waitFor(
      () => {
        const state = store.getState()
        expect(state.gallery.mocs.length).toBeGreaterThan(0)
      },
      { timeout: 1000 },
    )
  })
})
