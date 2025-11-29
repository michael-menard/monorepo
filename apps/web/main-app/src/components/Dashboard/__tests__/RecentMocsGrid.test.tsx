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
    <a href={`${to.replace('$mocId', params?.mocId || '')}`} data-testid="moc-link">
      {children}
    </a>
  ),
}))

describe('RecentMocsGrid', () => {
  const mockMocs: RecentMoc[] = [
    {
      id: 'moc-1',
      title: 'Millennium Falcon MOC',
      thumbnail: 'https://example.com/falcon.jpg',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'moc-2',
      title: 'X-Wing Fighter',
      thumbnail: null,
      createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    },
    {
      id: 'moc-3',
      title: 'Death Star',
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
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveAttribute('href', '/gallery/moc-1')
    expect(links[1]).toHaveAttribute('href', '/gallery/moc-2')
  })
})
