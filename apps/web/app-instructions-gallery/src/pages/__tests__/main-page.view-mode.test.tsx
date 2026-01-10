import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MainPage } from '../main-page'

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

// Use real gallery components but stub useFirstTimeHint to avoid localStorage coupling
vi.mock('@repo/gallery', async () => {
  const actual = await vi.importActual<typeof import('@repo/gallery')>('@repo/gallery')

  return {
    ...actual,
    useFirstTimeHint: vi.fn().mockReturnValue([false, vi.fn()]),
  }
})

// Stub framer-motion for simpler DOM assertions
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('Instructions Gallery - View Mode Integration', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Minimal window.location override for navigation assertions
    // @ts-expect-error test override
    delete window.location
    // @ts-expect-error minimal href implementation
    window.location = { href: 'http://localhost/instructions' } as Location
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('defaults to grid view and renders gallery grid', () => {
    render(<MainPage />)

    const grid = screen.getByTestId('gallery-grid')
    expect(grid).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('switches to datatable view when view toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<MainPage />)

    // GalleryViewToggle uses aria-label "Table view" for the table button
    const toggleButton = screen.getByRole('button', { name: /table view/i })
    await user.click(toggleButton)

    const table = screen.getByRole('table', { name: /instructions gallery table/i })
    expect(table).toBeInTheDocument()
    expect(screen.queryByTestId('gallery-grid')).not.toBeInTheDocument()
  })

  it('persists view mode to localStorage with gallery_view_mode_instructions key', async () => {
    const user = userEvent.setup()
    render(<MainPage />)

    const toggleButton = screen.getByRole('button', { name: /table view/i })
    await user.click(toggleButton)

    expect(localStorage.getItem('gallery_view_mode_instructions')).toBe('datatable')
  })

  it('navigates to edit page when a datatable row is clicked', async () => {
    const user = userEvent.setup()
    render(<MainPage />)

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
    render(<MainPage />)

    const toggleButton = screen.getByRole('button', { name: /table view/i })
    await user.click(toggleButton)

    expect(window.location.href).toContain('view=datatable')
  })
})