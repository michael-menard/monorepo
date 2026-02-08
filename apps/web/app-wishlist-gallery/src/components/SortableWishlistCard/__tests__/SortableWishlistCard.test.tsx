/**
 * SortableWishlistCard Component Tests
 *
 * Story WISH-2005a: Drag-and-drop reordering with dnd-kit
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { SortableWishlistCard } from '../index'

// Mock data
const mockWishlistItem: WishlistItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: '123e4567-e89b-12d3-a456-426614174001',
  title: 'LEGO Star Wars Millennium Falcon',
  store: 'LEGO',
  setNumber: '75192',
  sourceUrl: 'https://lego.com/product/75192',
  imageUrl: 'https://example.com/image.jpg',
  price: '849.99',
  currency: 'USD',
  pieceCount: 7541,
  releaseDate: '2023-01-01T00:00:00.000Z',
  tags: ['Star Wars', 'UCS'],
  priority: 5,
  notes: 'Dream set!',
  sortOrder: 1,
  status: 'wishlist',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
}

// Wrapper component for DnD context
function DndWrapper({ children }: { children: React.ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  return (
    <DndContext sensors={sensors}>
      <SortableContext
        items={[mockWishlistItem.id]}
        strategy={rectSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  )
}

describe('SortableWishlistCard', () => {
  describe('Rendering', () => {
    it('renders the wishlist card content', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      expect(screen.getByText('LEGO Star Wars Millennium Falcon')).toBeInTheDocument()
      expect(screen.getByText('Set #75192')).toBeInTheDocument()
    })

    it('renders with correct test id', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      expect(screen.getByTestId(`sortable-wishlist-card-${mockWishlistItem.id}`)).toBeInTheDocument()
    })
  })

  describe('Drag Handle', () => {
    it('renders drag handle when dragging is enabled', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
            isDraggingEnabled={true}
          />
        </DndWrapper>,
      )

      expect(screen.getByTestId(`drag-handle-${mockWishlistItem.id}`)).toBeInTheDocument()
    })

    it('does not render drag handle when dragging is disabled', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
            isDraggingEnabled={false}
          />
        </DndWrapper>,
      )

      expect(screen.queryByTestId(`drag-handle-${mockWishlistItem.id}`)).not.toBeInTheDocument()
    })

    it('drag handle has correct aria-label', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const dragHandle = screen.getByTestId(`drag-handle-${mockWishlistItem.id}`)
      expect(dragHandle).toHaveAttribute('aria-label', `Reorder ${mockWishlistItem.title}`)
    })

    it('drag handle has aria-roledescription for screen readers', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const dragHandle = screen.getByTestId(`drag-handle-${mockWishlistItem.id}`)
      expect(dragHandle).toHaveAttribute('aria-roledescription', 'sortable item')
    })

    it('drag handle is a button element', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const dragHandle = screen.getByTestId(`drag-handle-${mockWishlistItem.id}`)
      expect(dragHandle.tagName).toBe('BUTTON')
      expect(dragHandle).toHaveAttribute('type', 'button')
    })
  })

  describe('ARIA Accessibility (AC 18-21)', () => {
    it('has role="listitem" for proper list semantics', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const card = screen.getByTestId(`sortable-wishlist-card-${mockWishlistItem.id}`)
      expect(card).toHaveAttribute('role', 'listitem')
    })

    it('has aria-setsize for total items count', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={2}
            totalItems={10}
          />
        </DndWrapper>,
      )

      const card = screen.getByTestId(`sortable-wishlist-card-${mockWishlistItem.id}`)
      expect(card).toHaveAttribute('aria-setsize', '10')
    })

    it('has aria-posinset for current position (1-indexed)', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={2}
            totalItems={10}
          />
        </DndWrapper>,
      )

      const card = screen.getByTestId(`sortable-wishlist-card-${mockWishlistItem.id}`)
      // index is 0-indexed, aria-posinset is 1-indexed
      expect(card).toHaveAttribute('aria-posinset', '3')
    })

    it('renders screen reader instructions', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const instructions = screen.getByText(/Press Space to start dragging/i)
      expect(instructions).toBeInTheDocument()
      expect(instructions).toHaveClass('sr-only')
    })
  })

  describe('Event Handlers', () => {
    it('calls onClick when card is clicked', () => {
      const handleClick = vi.fn()

      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
            onClick={handleClick}
          />
        </DndWrapper>,
      )

      // Find and click the inner card, not the drag handle
      const card = screen.getByTestId(`wishlist-card-${mockWishlistItem.id}`)
      fireEvent.click(card)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('calls onGotIt when Got It button is clicked', () => {
      const handleGotIt = vi.fn()

      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
            onGotIt={handleGotIt}
          />
        </DndWrapper>,
      )

      const gotItButton = screen.getByTestId('wishlist-card-got-it')
      fireEvent.click(gotItButton)

      expect(handleGotIt).toHaveBeenCalledTimes(1)
    })

    it('calls onDelete when Delete button is clicked', () => {
      const handleDelete = vi.fn()

      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
            onDelete={handleDelete}
          />
        </DndWrapper>,
      )

      const deleteButton = screen.getByTestId('wishlist-card-delete')
      fireEvent.click(deleteButton)

      expect(handleDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Touch Target Size (AC 22)', () => {
    it('drag handle meets WCAG 2.5.5 touch target size', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const dragHandle = screen.getByTestId(`drag-handle-${mockWishlistItem.id}`)
      // Check for w-11 h-11 classes (44px)
      expect(dragHandle).toHaveClass('w-11')
      expect(dragHandle).toHaveClass('h-11')
    })
  })

  describe('Design System Colors (AC 23)', () => {
    it('uses design system color tokens for drag handle', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const dragHandle = screen.getByTestId(`drag-handle-${mockWishlistItem.id}`)
      expect(dragHandle).toHaveClass('text-muted-foreground')
      expect(dragHandle).toHaveClass('hover:bg-muted/60')
    })
  })

  describe('Drag States', () => {
    it('applies touch-none class to prevent scroll interference', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const dragHandle = screen.getByTestId(`drag-handle-${mockWishlistItem.id}`)
      expect(dragHandle).toHaveClass('touch-none')
    })

    it('has cursor-grab class for grab cursor', () => {
      render(
        <DndWrapper>
          <SortableWishlistCard
            item={mockWishlistItem}
            index={0}
            totalItems={5}
          />
        </DndWrapper>,
      )

      const dragHandle = screen.getByTestId(`drag-handle-${mockWishlistItem.id}`)
      expect(dragHandle).toHaveClass('cursor-grab')
    })
  })
})
