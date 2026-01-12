/**
 * SetCard (SetGalleryCard) Component Tests
 *
 * Verifies that the SetCard wrapper over GalleryCard correctly maps Set schema
 * fields into the generic gallery card UI.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Set } from '@repo/api-client/schemas/sets'
import { SetCard } from '../SetCard'

const baseSet: Set = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  title: 'Downtown Diner',
  setNumber: '10260',
  store: 'LEGO',
  sourceUrl: null,
  pieceCount: 2480,
  releaseDate: null,
  theme: 'Creator Expert',
  tags: ['modular', 'city'],
  notes: null,
  isBuilt: false,
  quantity: 1,
  purchasePrice: null,
  tax: null,
  shipping: null,
  purchaseDate: null,
  wishlistItemId: null,
  images: [
    {
      id: 'img-1',
      imageUrl: 'https://example.com/diner.jpg',
      thumbnailUrl: 'https://example.com/diner-thumb.jpg',
      position: 0,
    },
  ],
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
}

const renderCard = (override?: Partial<Set>, onClick?: () => void) => {
  const set: Set = { ...baseSet, ...override }
  return render(<SetCard set={set} onClick={onClick} />)
}

describe('SetCard (SetGalleryCard)', () => {
  it('renders title, subtitle with set number, and metadata badges', () => {
    renderCard()

    expect(screen.getByTestId('set-card-11111111-1111-1111-1111-111111111111')).toBeInTheDocument()
    expect(screen.getByText('Downtown Diner')).toBeInTheDocument()
    expect(screen.getByText(/Set #10260/)).toBeInTheDocument()

    const pieces = screen.getByTestId('set-card-pieces')
    expect(pieces).toHaveTextContent('2,480')
    expect(pieces).toHaveTextContent('pieces')

    const theme = screen.getByTestId('set-card-theme')
    expect(theme).toHaveTextContent('Creator Expert')

    const buildStatus = screen.getByTestId('set-card-build-status')
    expect(buildStatus).toHaveTextContent('Not built yet')
  })

  it('renders quantity badge when quantity is greater than 1', () => {
    renderCard({ quantity: 3 })

    const quantity = screen.getByTestId('set-card-quantity')
    expect(quantity).toHaveTextContent('x3')
  })

  it('shows "Built" status when isBuilt is true', () => {
    renderCard({ isBuilt: true })

    const buildStatus = screen.getByTestId('set-card-build-status')
    expect(buildStatus).toHaveTextContent('Built')
  })

  it('calls onClick when the card is clicked', () => {
    const onClick = vi.fn()
    renderCard({}, onClick)

    const card = screen.getByTestId('set-card-11111111-1111-1111-1111-111111111111')
    fireEvent.click(card)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders actions menu and wires view/edit/delete callbacks', () => {
    const onClick = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    render(<SetCard set={baseSet} onClick={onClick} onEdit={onEdit} onDelete={onDelete} />)

    // Hover actions overlay is handled by GalleryCard; we just assert buttons exist
    const viewButton = screen.getByTestId('set-card-action-view')
    fireEvent.click(viewButton)
    expect(onClick).toHaveBeenCalledTimes(1)

    const editButton = screen.getByTestId('set-card-action-edit')
    fireEvent.click(editButton)
    expect(onEdit).toHaveBeenCalledTimes(1)

    const deleteButton = screen.getByTestId('set-card-action-delete')
    fireEvent.click(deleteButton)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
