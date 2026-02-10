/**
 * WishlistCard Component
 *
 * Wishlist-specific card that wraps GalleryCard with store badges,
 * price display, piece count, and priority indicators.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story WISH-2042: Purchase/Got It Flow
 * Story WISH-2016: Image Optimization (responsive images)
 */

import React, { forwardRef } from 'react'
import { z } from 'zod'
import { GalleryCard } from '@repo/gallery'
import { AppBadge, Button, CustomButton } from '@repo/app-component-library'
import { Star, Puzzle, Trash2 } from 'lucide-react'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { BuildStatusToggle } from '../BuildStatusToggle'
import { getBestImageUrl } from '../ResponsiveImage/index.js'
import { generateItemAriaLabel, focusRingClasses } from '../../utils/a11y'

/**
 * Checkmark icon with circle - based on cool-checkmark.tsx design
 */
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="40" />
      <path d="M30 50L45 65L70 35" />
    </svg>
  )
}

/**
 * WishlistCard props schema
 */
export const WishlistCardPropsSchema = z.object({
  /** Wishlist item data */
  item: z.custom<WishlistItem>(),
  /** Click handler */
  onClick: z.function().optional(),
  /** Got It button handler (WISH-2042) */
  onGotIt: z.function().optional(),
  /** Delete button handler (WISH-2041) */
  onDelete: z.function().optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
  /** WISH-2006: Tab index for keyboard navigation */
  tabIndex: z.number().optional(),
  /** WISH-2006: Keyboard event handler */
  onKeyDown: z.function().optional(),
  /** WISH-2006: Whether this item is currently selected */
  isSelected: z.boolean().optional(),
  /** WISH-2006: Index in the gallery for screen reader label */
  index: z.number().optional(),
  /** WISH-2006: Total items in gallery for screen reader label */
  totalItems: z.number().optional(),
})

export type WishlistCardProps = z.infer<typeof WishlistCardPropsSchema> & {
  onKeyDown?: (e: React.KeyboardEvent) => void
}

/**
 * Store badge colors
 */
const storeBadgeColors: Record<string, string> = {
  LEGO: 'bg-yellow-500 text-yellow-950',
  Barweer: 'bg-green-500 text-white',
  Cata: 'bg-purple-500 text-white',
  BrickLink: 'bg-blue-500 text-white',
  Other: 'bg-gray-500 text-white',
}

/**
 * Priority colors (0-5 scale)
 */
const priorityColors: Record<number, string> = {
  0: 'text-muted-foreground',
  1: 'text-gray-400',
  2: 'text-blue-400',
  3: 'text-green-400',
  4: 'text-yellow-400',
  5: 'text-red-400',
}

/**
 * Format price with currency
 */
const formatPrice = (price: string | null, currency: string): string => {
  if (!price) return ''

  const numPrice = parseFloat(price)
  if (isNaN(numPrice)) return ''

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return formatter.format(numPrice)
}

/**
 * WishlistCard Component
 *
 * Renders a wishlist item using GalleryCard with:
 * - Store badge in metadata
 * - Price display
 * - Piece count with icon
 * - Priority stars indicator
 * - Got It button (WISH-2042)
 * - WISH-2006: Keyboard navigation support and ARIA labels
 */
export const WishlistCard = forwardRef<HTMLDivElement, WishlistCardProps>(function WishlistCard(
  {
    item,
    onClick,
    onGotIt,
    onDelete,
    className,
    tabIndex,
    onKeyDown,
    isSelected,
    index,
    totalItems,
  },
  ref,
) {
  const {
    id,
    title,
    setNumber,
    store,
    imageUrl,
    imageVariants,
    price,
    currency,
    pieceCount,
    priority,
  } = item

  // Build subtitle with set number
  const subtitle = setNumber ? `Set #${setNumber}` : undefined

  // Build metadata content
  const metadata = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Store Badge */}
      <AppBadge
        size="sm"
        className={storeBadgeColors[store] || storeBadgeColors.Other}
        data-testid="wishlist-card-store"
      >
        {store}
      </AppBadge>

      {/* Price */}
      {price ? (
        <span className="text-sm font-semibold text-foreground" data-testid="wishlist-card-price">
          {formatPrice(price, currency)}
        </span>
      ) : null}

      {/* Piece Count */}
      {pieceCount ? (
        <span
          className="flex items-center gap-1 text-xs text-muted-foreground"
          data-testid="wishlist-card-pieces"
        >
          <Puzzle className="h-3 w-3" aria-hidden="true" />
          {pieceCount.toLocaleString()}
        </span>
      ) : null}

      {/* Priority Stars */}
      {priority !== undefined && priority > 0 && (
        <span
          className={`flex items-center ${priorityColors[priority] || priorityColors[0]}`}
          data-testid="wishlist-card-priority"
          aria-label={`Priority ${priority} of 5`}
        >
          {Array.from({ length: priority }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-current" aria-hidden="true" />
          ))}
        </span>
      )}

      {/* Build Status Toggle (SETS-MVP-004) - only for owned items */}
      {item.status === 'owned' && (
        <BuildStatusToggle
          itemId={item.id}
          currentStatus={item.buildStatus ?? null}
          itemTitle={item.title}
        />
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Delete Button (WISH-2041) */}
        {onDelete ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onDelete()
            }}
            data-testid="wishlist-card-delete"
            aria-label={`Delete ${title}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </Button>
        ) : null}

        {/* Got It Button (WISH-2042) */}
        {onGotIt ? (
          <CustomButton
            size="sm"
            style="bold"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onGotIt()
            }}
            data-testid="wishlist-card-got-it"
            aria-label={`Mark ${title} as purchased`}
          >
            <CheckCircleIcon className="h-4 w-4" />
            Got It
          </CustomButton>
        ) : null}
      </div>
    </div>
  )

  // WISH-2016: Use optimized thumbnail for gallery display
  const imageSrc = getBestImageUrl(imageVariants, 'thumbnail', imageUrl)

  // WISH-2006: Generate accessible label for screen readers
  const ariaLabel =
    index !== undefined && totalItems !== undefined
      ? generateItemAriaLabel(item, index, totalItems)
      : title

  // WISH-2006: Combine base classes with focus ring for keyboard navigation
  const cardClassName = className ? `${className} ${focusRingClasses}` : focusRingClasses

  // WISH-2006: Handle click on wrapper for accessibility
  const handleWrapperClick = onClick
    ? (e: React.MouseEvent) => {
        // Don't trigger if clicking on a button inside
        if ((e.target as HTMLElement).closest('button')) {
          return
        }
        onClick()
      }
    : undefined

  // WISH-2006: Handle keyboard activation
  const handleWrapperKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter/Space for activation
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
    // Pass through other keyboard events
    onKeyDown?.(e)
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      onClick={handleWrapperClick}
      onKeyDown={handleWrapperKeyDown}
      data-testid={`wishlist-card-${id}`}
      data-index={index}
      className={cardClassName}
    >
      <GalleryCard
        image={{
          src: imageSrc,
          alt: title,
          aspectRatio: '4/3',
        }}
        title={title}
        subtitle={subtitle}
        metadata={metadata}
      />
    </div>
  )
})
