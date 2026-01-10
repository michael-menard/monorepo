/**
 * Tests for Sets Gallery Main Page with Datatable Integration
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MainPage } from '../main-page'

const useViewModeMock = vi.fn(() => ['grid', vi.fn()])

// Mock the gallery package
vi.mock('@repo/gallery', () => ({
  useViewMode: useViewModeMock,
  GalleryViewToggle: ({ currentView, onViewChange }: any) => (
    <button
      onClick={() => onViewChange(currentView === 'grid' ? 'datatable' : 'grid')}
      aria-label={currentView === 'grid' ? 'Switch to table view' : 'Switch to grid view'}
    >
      {currentView === 'grid' ? 'Table View' : 'Grid View'}
    </button>
  ),
  GalleryDataTable: ({ items, onRowClick }: any) => (
    <table role="table">
      <thead>
        <tr>
          <th>Set #</th>
          <th>Name</th>
          <th>Pieces</th>
          <th>Build Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any) => (
          <tr key={item.id} onClick={() => onRowClick?.(item)} role="row">
            <td>{item.setNumber}</td>
            <td>{item.name}</td>
            <td>{item.pieceCount}</td>
            <td>{item.buildStatus || 'Not Started'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Sets Gallery - Main Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useViewModeMock.mockReset()
    useViewModeMock.mockImplementation(() => ['grid', vi.fn()])
    // Reset localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>)
  }

  describe('View Mode Integration', () => {
    it('defaults to grid view', async () => {
      renderWithRouter(<MainPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('gallery-grid')).toBeInTheDocument()
      })
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('switches to datatable view on toggle click', async () => {
      const user = userEvent.setup()

      useViewModeMock.mockImplementation(() => {
        const [view, setView] = React.useState('grid')
        return [view, setView]
      })
      
      renderWithRouter(<MainPage />)
      
      const toggleButton = screen.getByRole('button', { name: /switch to table view/i })
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('gallery-grid')).not.toBeInTheDocument()
    })

    it('persists view mode to localStorage', async () => {
      const user = userEvent.setup()
      let viewMode = 'grid'
      
      useViewModeMock.mockImplementation(() => {
        const setViewMode = (newMode: string) => {
          viewMode = newMode
          localStorage.setItem('gallery_view_mode_sets', newMode)
        }
        return [viewMode, setViewMode]
      })
      
      renderWithRouter(<MainPage />)
      
      const toggleButton = screen.getByRole('button', { name: /switch to table view/i })
      await user.click(toggleButton)
      
      expect(localStorage.getItem('gallery_view_mode_sets')).toBe('datatable')
    })
  })

  describe('Datatable Functionality', () => {
    it('renders sets datatable with correct columns', async () => {
      useViewModeMock.mockImplementation(() => ['datatable', vi.fn()])
      
      renderWithRouter(<MainPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Set #')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Pieces')).toBeInTheDocument()
      expect(screen.getByText('Build Status')).toBeInTheDocument()
    })

    it('displays sets data in table rows', async () => {
      useViewModeMock.mockImplementation(() => ['datatable', vi.fn()])
      
      renderWithRouter(<MainPage />)
      
      await waitFor(() => {
        expect(screen.getByText('10292')).toBeInTheDocument()
        expect(screen.getByText('The Friends Apartments')).toBeInTheDocument()
        expect(screen.getByText('2048')).toBeInTheDocument()
      })
    })

    it('navigates to detail page on row click', async () => {
      const user = userEvent.setup()
      useViewModeMock.mockImplementation(() => ['datatable', vi.fn()])
      
      renderWithRouter(<MainPage />)
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows.length).toBeGreaterThan(0)
      })
      
      const firstRow = screen.getAllByRole('row')[0]
      await user.click(firstRow)
      
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/sets\/.+/))
    })
  })

  describe('Search Functionality', () => {
    it('filters sets by search term in grid view', async () => {
      const user = userEvent.setup()
      renderWithRouter(<MainPage />)
      
      const searchInput = screen.getByRole('searchbox', { name: /search sets/i })
      await user.type(searchInput, 'Friends')
      
      await waitFor(() => {
        expect(screen.getByText('The Friends Apartments')).toBeInTheDocument()
        expect(screen.queryByText('Millennium Falcon')).not.toBeInTheDocument()
      })
    })

    it('filters sets by search term in datatable view', async () => {
      const user = userEvent.setup()
      useViewModeMock.mockImplementation(() => ['datatable', vi.fn()])
      
      renderWithRouter(<MainPage />)
      
      const searchInput = screen.getByRole('searchbox', { name: /search sets/i })
      await user.type(searchInput, '75192')
      
      await waitFor(() => {
        expect(screen.getByText('Millennium Falcon')).toBeInTheDocument()
        expect(screen.queryByText('The Friends Apartments')).not.toBeInTheDocument()
      })
    })
  })

  describe('Grid View', () => {
    it('renders SetCard components in grid view', async () => {
      renderWithRouter(<MainPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('gallery-grid')).toBeInTheDocument()
      })
      
      // Check for card elements
      expect(screen.getByText('The Friends Apartments')).toBeInTheDocument()
      expect(screen.getByText('#10292')).toBeInTheDocument()
    })

    it('navigates to detail page on card click', async () => {
      const user = userEvent.setup()
      renderWithRouter(<MainPage />)
      
      await waitFor(() => {
        expect(screen.getByText('The Friends Apartments')).toBeInTheDocument()
      })
      
      const card = screen.getByRole('button', { name: /view details for the friends apartments/i })
      await user.click(card)
      
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/sets\/.+/))
    })
  })

  describe('Animation', () => {
    it('applies fade transition when switching views', async () => {
      const user = userEvent.setup()
      renderWithRouter(<MainPage />)
      
      // Initial grid view
      const gridView = screen.getByTestId('gallery-grid').parentElement
      expect(gridView).toHaveAttribute('initial', JSON.stringify({ opacity: 0 }))
      expect(gridView).toHaveAttribute('animate', JSON.stringify({ opacity: 1 }))
      
      // Switch to table
      const toggleButton = screen.getByRole('button', { name: /switch to table view/i })
      await user.click(toggleButton)
      
      await waitFor(() => {
        const tableView = screen.getByRole('table').parentElement
        expect(tableView).toHaveAttribute('transition', expect.stringContaining('0.15'))
      })
    })
  })

  describe('Navigation', () => {
    it('navigates to add set page on Add Set button click', async () => {
      const user = userEvent.setup()
      renderWithRouter(<MainPage />)
      
      const addButton = screen.getByRole('button', { name: /add set/i })
      await user.click(addButton)
      
      expect(mockNavigate).toHaveBeenCalledWith('/sets/add')
    })
  })
})

