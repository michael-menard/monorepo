/**
 * FilterPanel Type Schemas
 *
 * Zod schemas for FilterPanel component props and state.
 * Story WISH-20172: Frontend Filter Panel UI
 */

import { z } from 'zod'
import { WishlistStoreSchema } from '@repo/api-client/schemas/wishlist'

/**
 * Priority range schema for filter state
 * Range from 0-5 matching wishlist priority values
 */
export const PriorityRangeSchema = z
  .object({
    min: z.number().int().min(0).max(5),
    max: z.number().int().min(0).max(5),
  })
  .refine(val => val.min <= val.max, {
    message: 'Priority min must be <= max',
  })

export type PriorityRange = z.infer<typeof PriorityRangeSchema>

/**
 * Price range schema for filter state
 * Allows positive decimal values
 */
export const PriceRangeSchema = z
  .object({
    min: z.number().min(0),
    max: z.number().min(0),
  })
  .refine(val => val.min <= val.max, {
    message: 'Price min must be <= max',
  })

export type PriceRange = z.infer<typeof PriceRangeSchema>

/**
 * Filter panel state schema
 * Contains all filter criteria that can be applied
 */
export const FilterPanelStateSchema = z.object({
  stores: z.array(WishlistStoreSchema).default([]),
  priorityRange: PriorityRangeSchema.nullable().default(null),
  priceRange: PriceRangeSchema.nullable().default(null),
})

export type FilterPanelState = z.infer<typeof FilterPanelStateSchema>

/**
 * FilterPanel component props schema
 *
 * Note: Callback props use z.any() because z.function().args() with refined schemas
 * produces incompatible inferred types. The actual function signatures are enforced
 * by the FilterPanelProps type alias below.
 */
export const FilterPanelPropsSchema = z.object({
  onApplyFilters: z.any(),
  onClearFilters: z.any(),
  initialState: FilterPanelStateSchema.optional(),
  className: z.string().optional(),
})

export type FilterPanelProps = {
  onApplyFilters: (state: FilterPanelState) => void
  onClearFilters: () => void
  initialState?: FilterPanelState
  className?: string
}
