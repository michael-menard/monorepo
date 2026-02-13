/**
 * Reorder Utility
 *
 * Wrapper around dnd-kit's arrayMove for consistent reordering logic.
 * Story REPA-007: Generic, reusable drag-and-drop gallery component
 */

import { arrayMove } from '@dnd-kit/sortable'
import type { SortableItem } from '../__types__'

/**
 * Reorder an array of items from oldIndex to newIndex
 *
 * @param items - Array of items to reorder
 * @param oldIndex - Current index of the item
 * @param newIndex - Target index for the item
 * @returns New array with items reordered
 */
export function reorderItems<T extends SortableItem>(
  items: T[],
  oldIndex: number,
  newIndex: number,
): T[] {
  return arrayMove(items, oldIndex, newIndex)
}
