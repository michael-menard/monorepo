/**
 * RecentMocsGrid Component Tests
 * Story 2.10: Dashboard Unit Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentMocsGrid } from '../RecentMocsGrid'
import type { RecentMoc } from '@repo/api-client/rtk/dashboard-api'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
  }) => (
    <a href={`${to.replace('$mocId', params?.mocId || '').replace('$slug', params?.slug || '')}`} data-testid="moc-link">
      {children}
    </a>
  ),
}))

// Mock lucide-react icons (Story 3.1.39)
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
  }
})

describe('RecentMocsGrid', () => {
  const mockMocs: RecentMoc[] = [
    {
      id: 'moc-1',
      title: 'Millennium Falcon MOC',
      slug: 'millennium-falcon-moc', // Story 3.1.39: Added for edit link
      thumbnail: 'https://example.com/falcon.jpg',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'moc-2',
      title: 'X-Wing Fighter',
      slug: 'x-wing-fighter', // Story 3.1.39: Added for edit link
      thumbnail: null,
      createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    },
    {
      id: 'moc-3',
      title: 'Death Star',
      slug: 'death-star', // Story 3.1.39: Added for edit link
      thumbnail: 'https://example.com/deathstar.jpg',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    },
  ]

  it('renders all MOC cards', () => {
    render(<RecentMocsGrid mocs={mockMocs} />)

    expect(screen.getByText('Millennium Falcon MOC')).toBeInTheDocument()
    expect(screen.getByText('X-Wing Fighter')).toBeInTheDocument()
    expect(screen.getByText('Death Star')).toBeInTheDocument()
  })

  it('renders section header', () => {
    render(<RecentMocsGrid mocs={mockMocs} />)

    expect(screen.getByText('Recent MOCs')).toBeInTheDocument()
  })

  it('renders nothing when mocs array is empty', () => {
    const { container } = render(<RecentMocsGrid mocs={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('displays relative dates', () => {
    render(<RecentMocsGrid mocs={mockMocs} />)

    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    expect(screen.getByText('5 days ago')).toBeInTheDocument()
  })

  it('renders thumbnail images when available', () => {
    render(<RecentMocsGrid mocs={mockMocs} />)

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2) // Only 2 mocs have thumbnails
    expect(images[0]).toHaveAttribute('src', 'https://example.com/falcon.jpg')
  })

  it('creates links to gallery detail pages', () => {
    render(<RecentMocsGrid mocs={mockMocs} />)

    const links = screen.getAllByTestId('moc-link')
    // Story 3.1.39: Now includes edit links (3 gallery + 3 edit = 6)
    expect(links).toHaveLength(6)
    // Gallery links are at indices 0, 2, 4
    expect(links[0]).toHaveAttribute('href', '/gallery/moc-1')
    expect(links[2]).toHaveAttribute('href', '/gallery/moc-2')
    expect(links[4]).toHaveAttribute('href', '/gallery/moc-3')
    // Edit links are at indices 1, 3, 5
    expect(links[1]).toHaveAttribute('href', '/mocs/millennium-falcon-moc/edit')
    expect(links[3]).toHaveAttribute('href', '/mocs/x-wing-fighter/edit')
    expect(links[5]).toHaveAttribute('href', '/mocs/death-star/edit')
  })
})
