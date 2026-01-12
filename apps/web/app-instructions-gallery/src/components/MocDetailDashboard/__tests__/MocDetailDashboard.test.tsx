import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MocSchema, type Moc } from '../__types__/moc'
import { MocDetailDashboard } from '../MocDetailDashboard'

const BASE_MOC: Moc = {
  id: 'moc-1',
  title: 'Test MOC',
  description: 'A test MOC',
  tags: ['tag1', 'tag2'],
  coverImageUrl: 'https://example.com/cover.jpg',
  instructionsPdfUrls: ['https://example.com/instructions.pdf'],
  partsLists: [
    { id: 'pl-1', url: 'https://example.com/pl.csv', filename: 'pl.csv' },
  ],
  galleryImages: [
    { id: 'img-1', url: 'https://example.com/img1.jpg' },
    { id: 'img-2', url: 'https://example.com/img2.jpg' },
  ],
  updatedAt: '2025-01-01T00:00:00Z',
  publishDate: '2025-01-01T00:00:00Z',
  purchasedDate: undefined,
  author: {
    displayName: 'Author',
  },
  partsCount: 1000,
  partsOwned: 100,
  orders: [],
}

describe('MocSchema', () => {
  it('accepts a valid MOC object', () => {
    const result = MocSchema.parse(BASE_MOC)
    expect(result.id).toBe('moc-1')
    expect(result.tags).toHaveLength(2)
  })

  it('rejects invalid data', () => {
    expect(() =>
      // @ts-expect-error intentional invalid data
      MocSchema.parse({ ...BASE_MOC, coverImageUrl: 'not-a-url' }),
    ).toThrow()
  })
})

describe('MocDetailDashboard', () => {
  beforeEach(() => {
    vi.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue(null)
    vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {})
  })

  it('renders key cards from Moc data', () => {
    render(<MocDetailDashboard moc={BASE_MOC} />)

    expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
    expect(screen.getByText('Parts Orders')).toBeInTheDocument()
    expect(screen.getByText('Parts Lists')).toBeInTheDocument()
    expect(screen.getByText('Instructions')).toBeInTheDocument()
    expect(screen.getByText('Gallery')).toBeInTheDocument()
  })

  it('persists card order to localStorage when reordered', () => {
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')

    render(<MocDetailDashboard moc={BASE_MOC} />)

    const ordersHeader = screen.getByText('Parts Orders').closest('[data-card-id]') as HTMLElement
    const galleryHeader = screen.getByText('Gallery').closest('[data-card-id]') as HTMLElement

    fireEvent.dragStart(ordersHeader)
    fireEvent.dragOver(galleryHeader)
    fireEvent.drop(galleryHeader)

    expect(setItemSpy).toHaveBeenCalled()
  })
})
