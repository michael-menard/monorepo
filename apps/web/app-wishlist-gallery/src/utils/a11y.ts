/**
 * Accessibility Utilities
 *
 * ARIA label generators and accessibility helper functions for the wishlist gallery.
 *
 * Story WISH-2006: Accessibility
 */

import { z } from 'zod'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

/**
 * Generate an accessible label for a wishlist item
 *
 * Format: "[Title], [price], [pieces] pieces, priority [n] of [total]"
 *
 * @param item - The wishlist item
 * @param index - Zero-based index in the list
 * @param total - Total number of items
 * @returns Accessible label string
 *
 * @example
 * ```typescript
 * const label = generateItemAriaLabel(item, 0, 10)
 * // "LEGO Millennium Falcon, $800, 7,541 pieces, priority 1 of 10"
 * ```
 */
export function generateItemAriaLabel(item: WishlistItem, index: number, total: number): string {
  const parts: string[] = [item.title]

  // Add price if available
  if (item.price) {
    const price = parseFloat(item.price)
    if (!isNaN(price)) {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: item.currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
      parts.push(formatter.format(price))
    }
  }

  // Add piece count if available
  if (item.pieceCount && item.pieceCount > 0) {
    parts.push(`${item.pieceCount.toLocaleString()} pieces`)
  }

  // Add position (1-indexed for users)
  parts.push(`item ${index + 1} of ${total}`)

  // Add priority if set
  if (item.priority && item.priority > 0) {
    parts.push(`priority ${item.priority} of 5`)
  }

  return parts.join(', ')
}

/**
 * Generate announcement for priority change
 *
 * @param item - The item that was reordered
 * @param newPosition - New 1-indexed position
 * @param total - Total number of items
 * @returns Announcement string
 *
 * @example
 * ```typescript
 * const announcement = generatePriorityChangeAnnouncement(item, 1, 10)
 * // "Priority updated. LEGO Millennium Falcon is now priority 1 of 10"
 * ```
 */
export function generatePriorityChangeAnnouncement(
  item: WishlistItem,
  newPosition: number,
  total: number,
): string {
  return `Priority updated. ${item.title} is now priority ${newPosition} of ${total}.`
}

/**
 * Generate announcement for item deletion
 *
 * @param deletedTitle - Title of the deleted item
 * @param nextTitle - Title of the next focused item (optional)
 * @returns Announcement string
 *
 * @example
 * ```typescript
 * const announcement = generateDeleteAnnouncement('LEGO Set', 'Next Set')
 * // "Item deleted. Next Set selected."
 * ```
 */
export function generateDeleteAnnouncement(deletedTitle: string, nextTitle?: string): string {
  if (nextTitle) {
    return `${deletedTitle} deleted. ${nextTitle} selected.`
  }
  return `${deletedTitle} deleted. Wishlist is empty.`
}

/**
 * Generate announcement for item addition
 *
 * @param itemTitle - Title of the added item (optional)
 * @returns Announcement string
 *
 * @example
 * ```typescript
 * const announcement = generateAddAnnouncement('LEGO Set')
 * // "LEGO Set added to wishlist."
 * ```
 */
export function generateAddAnnouncement(itemTitle?: string): string {
  if (itemTitle) {
    return `${itemTitle} added to wishlist.`
  }
  return 'Item added to wishlist.'
}

/**
 * Generate announcement for filter/sort changes
 *
 * @param count - Number of items shown
 * @param sortMethod - Current sort method label
 * @param filterActive - Whether filters are active
 * @returns Announcement string
 *
 * @example
 * ```typescript
 * const announcement = generateFilterAnnouncement(5, 'Price: Low to High', true)
 * // "Showing 5 filtered items sorted by Price: Low to High"
 * ```
 */
export function generateFilterAnnouncement(
  count: number,
  sortMethod: string,
  filterActive: boolean = false,
): string {
  const itemWord = count === 1 ? 'item' : 'items'
  const filterWord = filterActive ? 'filtered ' : ''
  return `Showing ${count} ${filterWord}${itemWord} sorted by ${sortMethod}.`
}

/**
 * Generate announcement for empty gallery state
 *
 * @param hasFilters - Whether filters are active
 * @returns Announcement string
 */
export function generateEmptyStateAnnouncement(hasFilters: boolean = false): string {
  if (hasFilters) {
    return 'No items match your filters. Press A to add an item, or clear filters.'
  }
  return 'Wishlist is empty. Press A to add an item.'
}

/**
 * Generate announcement for modal opening
 *
 * @param modalType - Type of modal being opened
 * @param itemTitle - Title of the related item (optional)
 * @returns Announcement string
 */
export function generateModalOpenAnnouncement(
  modalType: 'add' | 'gotIt' | 'delete' | 'edit',
  itemTitle?: string,
): string {
  switch (modalType) {
    case 'add':
      return 'Add Item dialog opened. Enter set details.'
    case 'gotIt':
      return itemTitle
        ? `Mark ${itemTitle} as purchased dialog opened.`
        : 'Mark as purchased dialog opened.'
    case 'delete':
      return itemTitle
        ? `Delete ${itemTitle} confirmation dialog opened.`
        : 'Delete confirmation dialog opened.'
    case 'edit':
      return itemTitle ? `Edit ${itemTitle} dialog opened.` : 'Edit item dialog opened.'
    default:
      return 'Dialog opened.'
  }
}

/**
 * Generate announcement for drag and drop operations
 *
 * @param itemTitle - Title of the dragged item
 * @param action - Current action ('pickup', 'move', 'drop', 'cancel')
 * @param position - Current position (for 'pickup' and 'drop')
 * @param total - Total items
 * @returns Announcement string
 */
export function generateDragAnnouncement(
  itemTitle: string,
  action: 'pickup' | 'move' | 'drop' | 'cancel',
  position?: number,
  total?: number,
): string {
  switch (action) {
    case 'pickup':
      return `Picked up ${itemTitle}. Current position: ${position} of ${total}. Use arrow keys to move, Space to drop, Escape to cancel.`
    case 'move':
      return `${itemTitle} moved to position ${position} of ${total}.`
    case 'drop':
      return `${itemTitle} dropped. New position: ${position} of ${total}.`
    case 'cancel':
      return 'Reorder cancelled.'
    default:
      return ''
  }
}

/**
 * Focus ring classes for consistent focus styling
 * Uses design system tokens per WISH-2006 requirements
 */
export const focusRingClasses =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2'

/**
 * Schema for validating WCAG AA contrast ratios
 */
export const ContrastRatioSchema = z.object({
  normalText: z.number().min(4.5),
  largeText: z.number().min(3),
})

/**
 * Keyboard shortcut key names for display
 */
export const keyboardShortcutLabels: Record<string, string> = {
  a: 'A',
  g: 'G',
  Delete: 'Del',
  Enter: 'Enter',
  Escape: 'Esc',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
}

/**
 * Get human-readable keyboard shortcut label
 *
 * @param key - Key code or name
 * @returns Human-readable label
 */
export function getKeyboardShortcutLabel(key: string): string {
  return keyboardShortcutLabels[key] ?? key.toUpperCase()
}
