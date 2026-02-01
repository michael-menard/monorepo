/**
 * Tests for Accessibility Utilities
 *
 * Story WISH-2006: Accessibility
 */

import { describe, it, expect } from 'vitest'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import {
  generateItemAriaLabel,
  generatePriorityChangeAnnouncement,
  generateDeleteAnnouncement,
  generateAddAnnouncement,
  generateFilterAnnouncement,
  generateEmptyStateAnnouncement,
  generateModalOpenAnnouncement,
  generateDragAnnouncement,
  focusRingClasses,
  getKeyboardShortcutLabel,
} from '../a11y'

// Helper to create mock wishlist items
function createMockItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'test-id',
    title: 'LEGO Millennium Falcon',
    setNumber: '75192',
    store: 'LEGO',
    imageUrl: 'https://example.com/image.jpg',
    imageVariants: null,
    price: '800.00',
    currency: 'USD',
    pieceCount: 7541,
    priority: 5,
    tags: [],
    sourceUrl: null,
    releaseDate: null,
    notes: null,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    userId: 'user-1',
    ...overrides,
  } as WishlistItem
}

describe('generateItemAriaLabel', () => {
  it('should generate label with all information', () => {
    const item = createMockItem()
    const label = generateItemAriaLabel(item, 0, 10)

    expect(label).toContain('LEGO Millennium Falcon')
    expect(label).toContain('$800')
    expect(label).toContain('7,541 pieces')
    expect(label).toContain('item 1 of 10')
    expect(label).toContain('priority 5 of 5')
  })

  it('should handle item without price', () => {
    const item = createMockItem({ price: null })
    const label = generateItemAriaLabel(item, 0, 10)

    expect(label).toContain('LEGO Millennium Falcon')
    expect(label).not.toContain('$')
    expect(label).toContain('item 1 of 10')
  })

  it('should handle item without piece count', () => {
    const item = createMockItem({ pieceCount: null })
    const label = generateItemAriaLabel(item, 0, 10)

    expect(label).toContain('LEGO Millennium Falcon')
    expect(label).not.toContain('pieces')
  })

  it('should handle item without priority', () => {
    const item = createMockItem({ priority: 0 })
    const label = generateItemAriaLabel(item, 0, 10)

    expect(label).toContain('LEGO Millennium Falcon')
    expect(label).not.toContain('priority')
  })

  it('should format position as 1-indexed', () => {
    const item = createMockItem()
    const label = generateItemAriaLabel(item, 4, 10)

    expect(label).toContain('item 5 of 10')
  })

  it('should format currency correctly', () => {
    const item = createMockItem({ price: '1234.56', currency: 'EUR' })
    const label = generateItemAriaLabel(item, 0, 10)

    // EUR formatting may vary by locale, but should contain the value
    expect(label).toMatch(/1[,.]?234/)
  })
})

describe('generatePriorityChangeAnnouncement', () => {
  it('should generate priority change announcement', () => {
    const item = createMockItem()
    const announcement = generatePriorityChangeAnnouncement(item, 1, 10)

    expect(announcement).toBe('Priority updated. LEGO Millennium Falcon is now priority 1 of 10.')
  })
})

describe('generateDeleteAnnouncement', () => {
  it('should announce deletion with next item', () => {
    const announcement = generateDeleteAnnouncement('Old Set', 'New Set')

    expect(announcement).toBe('Old Set deleted. New Set selected.')
  })

  it('should announce deletion when list becomes empty', () => {
    const announcement = generateDeleteAnnouncement('Last Set')

    expect(announcement).toBe('Last Set deleted. Wishlist is empty.')
  })
})

describe('generateAddAnnouncement', () => {
  it('should announce addition with item title', () => {
    const announcement = generateAddAnnouncement('LEGO Star Wars')

    expect(announcement).toBe('LEGO Star Wars added to wishlist.')
  })

  it('should announce generic addition without title', () => {
    const announcement = generateAddAnnouncement()

    expect(announcement).toBe('Item added to wishlist.')
  })
})

describe('generateFilterAnnouncement', () => {
  it('should announce filter results', () => {
    const announcement = generateFilterAnnouncement(5, 'Price: Low to High')

    expect(announcement).toBe('Showing 5 items sorted by Price: Low to High.')
  })

  it('should use singular "item" for count of 1', () => {
    const announcement = generateFilterAnnouncement(1, 'Newest First')

    expect(announcement).toBe('Showing 1 item sorted by Newest First.')
  })

  it('should indicate filtered results', () => {
    const announcement = generateFilterAnnouncement(3, 'Title A-Z', true)

    expect(announcement).toBe('Showing 3 filtered items sorted by Title A-Z.')
  })
})

describe('generateEmptyStateAnnouncement', () => {
  it('should announce empty state without filters', () => {
    const announcement = generateEmptyStateAnnouncement()

    expect(announcement).toBe('Wishlist is empty. Press A to add an item.')
  })

  it('should announce empty state with filters', () => {
    const announcement = generateEmptyStateAnnouncement(true)

    expect(announcement).toBe('No items match your filters. Press A to add an item, or clear filters.')
  })
})

describe('generateModalOpenAnnouncement', () => {
  it('should announce add modal', () => {
    const announcement = generateModalOpenAnnouncement('add')

    expect(announcement).toBe('Add Item dialog opened. Enter set details.')
  })

  it('should announce got it modal with item title', () => {
    const announcement = generateModalOpenAnnouncement('gotIt', 'LEGO Set')

    expect(announcement).toBe('Mark LEGO Set as purchased dialog opened.')
  })

  it('should announce got it modal without item title', () => {
    const announcement = generateModalOpenAnnouncement('gotIt')

    expect(announcement).toBe('Mark as purchased dialog opened.')
  })

  it('should announce delete modal with item title', () => {
    const announcement = generateModalOpenAnnouncement('delete', 'LEGO Set')

    expect(announcement).toBe('Delete LEGO Set confirmation dialog opened.')
  })

  it('should announce edit modal', () => {
    const announcement = generateModalOpenAnnouncement('edit', 'LEGO Set')

    expect(announcement).toBe('Edit LEGO Set dialog opened.')
  })
})

describe('generateDragAnnouncement', () => {
  it('should announce pickup', () => {
    const announcement = generateDragAnnouncement('LEGO Set', 'pickup', 3, 10)

    expect(announcement).toContain('Picked up LEGO Set')
    expect(announcement).toContain('Current position: 3 of 10')
    expect(announcement).toContain('Use arrow keys to move')
  })

  it('should announce move', () => {
    const announcement = generateDragAnnouncement('LEGO Set', 'move', 5, 10)

    expect(announcement).toBe('LEGO Set moved to position 5 of 10.')
  })

  it('should announce drop', () => {
    const announcement = generateDragAnnouncement('LEGO Set', 'drop', 5, 10)

    expect(announcement).toBe('LEGO Set dropped. New position: 5 of 10.')
  })

  it('should announce cancel', () => {
    const announcement = generateDragAnnouncement('LEGO Set', 'cancel')

    expect(announcement).toBe('Reorder cancelled.')
  })
})

describe('focusRingClasses', () => {
  it('should include focus-visible styles', () => {
    expect(focusRingClasses).toContain('focus-visible:ring-2')
    expect(focusRingClasses).toContain('focus-visible:ring-sky-500')
    expect(focusRingClasses).toContain('focus-visible:ring-offset-2')
  })
})

describe('getKeyboardShortcutLabel', () => {
  it('should return uppercase for single letters', () => {
    expect(getKeyboardShortcutLabel('a')).toBe('A')
    expect(getKeyboardShortcutLabel('g')).toBe('G')
  })

  it('should return mapped labels for special keys', () => {
    expect(getKeyboardShortcutLabel('Delete')).toBe('Del')
    expect(getKeyboardShortcutLabel('Escape')).toBe('Esc')
    expect(getKeyboardShortcutLabel('Enter')).toBe('Enter')
  })

  it('should return arrow key labels', () => {
    expect(getKeyboardShortcutLabel('ArrowUp')).toBe('Up')
    expect(getKeyboardShortcutLabel('ArrowDown')).toBe('Down')
    expect(getKeyboardShortcutLabel('ArrowLeft')).toBe('Left')
    expect(getKeyboardShortcutLabel('ArrowRight')).toBe('Right')
  })
})
