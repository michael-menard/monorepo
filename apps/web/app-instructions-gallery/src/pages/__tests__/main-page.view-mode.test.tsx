import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainPage } from '../main-page'
import { GalleryStateProvider } from '../../context/GalleryStateContext'

// Mock @repo/logger to avoid real logging in tests
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

// Mock RTK Query hook used by GalleryStateProvider
vi.mock('@repo/api-client/rtk/instructions-api', () => ({
  useGetInstructionsQuery: vi.fn().mockReturnValue({
    data: {
      items: [
        {
          id: 'dddddddd-dddd-dddd-dddd-dddddddd0001',
          title: 'Castle MOC',
          description: 'A castle',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          partsCount: 1000,
          theme: 'Castle',
          tags: ['castle'],
          isFeatured: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useTriggerScraperMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
  useToggleInstructionFavoriteMutation: vi.fn().mockReturnValue([vi.fn()]),
  instructionsApi: {
    reducerPath: 'instructionsApi',
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}))

// Use real gallery components but stub useFirstTimeHint to avoid localStorage coupling
vi.mock('@repo/gallery', async () => {
  const actual = await vi.importActual<typeof import('@repo/gallery')>('@repo/gallery')

  return {
    ...actual,
    useFirstTimeHint: vi.fn().mockReturnValue([false, vi.fn()]),
  }
})

// Stub framer-motion — proxy handles any motion.* element
vi.mock('framer-motion', () => {
  const motionProxy = new Proxy({} as Record<string, any>, {
    get: (_target, tag: string) => {
      return ({ children, whileTap, whileHover, initial, animate, exit, transition, variants, ...props }: any) => {
        const Tag = tag as any
        return <Tag {...props}>{children}</Tag>
      }
    },
  })
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  }
})

describe('Instructions Gallery - View Mode Integration', () => {
  const originalLocation = window.location

  let replaceStateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()

    // Minimal window.location override for navigation assertions
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/instructions', search: '' },
    })

    // Mock history.replaceState to avoid SecurityError with overridden location
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    replaceStateSpy.mockRestore()
  })

  it('defaults to grid view and renders gallery grid', () => {
    render(<GalleryStateProvider><MainPage /></GalleryStateProvider>)

    const grid = screen.getByTestId('gallery-grid')
    expect(grid).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('switches to datatable view when view toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<GalleryStateProvider><MainPage /></GalleryStateProvider>)

    // GalleryViewToggle uses aria-label "Table view" for the table button
    const toggleButton = screen.getByRole('button', { name: /table view/i })
    await user.click(toggleButton)

    const table = screen.getByRole('table', { name: /instructions gallery table/i })
    expect(table).toBeInTheDocument()
    expect(screen.queryByTestId('gallery-grid')).not.toBeInTheDocument()
  })

  it('persists view mode to localStorage with gallery_view_mode_instructions key', async () => {
    const user = userEvent.setup()
    render(<GalleryStateProvider><MainPage /></GalleryStateProvider>)

    const toggleButton = screen.getByRole('button', { name: /table view/i })
    await user.click(toggleButton)

    expect(localStorage.getItem('gallery_view_mode_instructions')).toBe('datatable')
  })

  it('navigates to edit page when a datatable row is clicked', async () => {
    const user = userEvent.setup()
    render(<GalleryStateProvider><MainPage /></GalleryStateProvider>)

    // Switch to datatable view
    const toggleButton = screen.getByRole('button', { name: /table view/i })
    await user.click(toggleButton)

    const rows = screen.getAllByRole('row')
    // Skip header row, click the first data row
    const firstDataRow = rows[1]
    await user.click(firstDataRow)

    expect(window.location.href).toContain('/instructions/')
    expect(window.location.href).toContain('/edit')
  })

  it('syncs view mode to URL query parameter', async () => {
    const user = userEvent.setup()
    render(<GalleryStateProvider><MainPage /></GalleryStateProvider>)

    const toggleButton = screen.getByRole('button', { name: /table view/i })
    await user.click(toggleButton)

    expect(window.location.href).toContain('view=datatable')
  })
})