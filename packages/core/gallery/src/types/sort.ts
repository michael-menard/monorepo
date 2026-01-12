import type { GallerySortDirection } from './index'

export type SortDirection = GallerySortDirection

export interface SortColumn<TItem = Record<string, unknown>> {
  field: keyof TItem
  direction: SortDirection
  priority: number // 0 = primary, 1 = secondary, 2 = tertiary
}
