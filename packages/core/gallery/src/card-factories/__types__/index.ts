/**
 * Card Factory Option Schemas
 *
 * Zod schemas for configuring domain-specific card factory functions.
 * All types are derived from schemas using z.infer<>.
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import { z } from 'zod'

/**
 * Base factory options common to all card types
 */
export const BaseCardOptionsSchema = z.object({
  /** Click handler for card navigation */
  onClick: z.custom<() => void>().optional(),
  /** Optional href for link-based navigation */
  href: z.string().optional(),
  /** Whether the card is in selected state */
  selected: z.boolean().optional(),
  /** Whether the card is in loading state */
  loading: z.boolean().optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
  /** Test ID for testing purposes */
  'data-testid': z.string().optional(),
  /** Whether the card can be selected (shows checkbox overlay) */
  selectable: z.boolean().optional(),
  /** Callback when selection state changes */
  onSelect: z.custom<(selected: boolean) => void>().optional(),
  /** Whether the card can be dragged (shows drag handle) */
  draggable: z.boolean().optional(),
})

export type BaseCardOptions = z.infer<typeof BaseCardOptionsSchema>

/**
 * Instruction card factory options
 */
export const InstructionCardOptionsSchema = BaseCardOptionsSchema.extend({
  /** Custom action buttons for hover overlay (React.ReactNode[]) */
  actions: z.array(z.custom<React.ReactNode>()).optional(),
  /** Show piece count in metadata */
  showPieceCount: z.boolean().optional(),
  /** Show theme in metadata */
  showTheme: z.boolean().optional(),
  /** Show status badge */
  showStatus: z.boolean().optional(),
})

export type InstructionCardOptions = z.infer<typeof InstructionCardOptionsSchema>

/**
 * Set card factory options
 */
export const SetCardOptionsSchema = BaseCardOptionsSchema.extend({
  /** Custom action buttons for hover overlay (React.ReactNode[]) */
  actions: z.custom<React.ReactNode[]>().optional(),
  /** Show piece count in metadata */
  showPieceCount: z.boolean().optional(),
  /** Show build status badge */
  showBuildStatus: z.boolean().optional(),
  /** Show theme in metadata */
  showTheme: z.boolean().optional(),
})

export type SetCardOptions = z.infer<typeof SetCardOptionsSchema>

/**
 * Wishlist card factory options
 */
export const WishlistCardOptionsSchema = BaseCardOptionsSchema.extend({
  /** Custom action buttons for hover overlay (React.ReactNode[]) */
  actions: z.custom<React.ReactNode[]>().optional(),
  /** Show price in metadata */
  showPrice: z.boolean().optional(),
  /** Show priority badge */
  showPriority: z.boolean().optional(),
  /** Show piece count in metadata */
  showPieceCount: z.boolean().optional(),
})

export type WishlistCardOptions = z.infer<typeof WishlistCardOptionsSchema>

/**
 * Inspiration card factory options
 */
export const InspirationCardOptionsSchema = BaseCardOptionsSchema.extend({
  /** Custom action buttons for hover overlay (React.ReactNode[]) */
  actions: z.custom<React.ReactNode[]>().optional(),
  /** Show tags in metadata */
  showTags: z.boolean().optional(),
  /** Maximum number of tags to display */
  maxTags: z.number().int().positive().optional(),
})

export type InspirationCardOptions = z.infer<typeof InspirationCardOptionsSchema>
