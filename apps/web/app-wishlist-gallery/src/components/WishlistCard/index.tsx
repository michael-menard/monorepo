/**
 * WishlistCard Component
 *
 * Wishlist-specific card that wraps GalleryCard with store badges,
 * price display, piece count, and priority indicators.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story wish-2004: Added action buttons for delete and "got it" modals
 */

import { useState } from 'react'
import { z } from 'zod'
import { GalleryCard } from '@repo/gallery'
import { Badge, Button } from '@repo/app-component-library'
import { Star, Puzzle, Trash2, PartyPopper } from 'lucide-react'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { DeleteConfirmationModal } from '../DeleteConfirmationModal'
import { GotItModal } from '../GotItModal'

/**
 * WishlistCard props schema
 */
export const WishlistCardPropsSchema = z.object({
  /** Wishlist item data */
  item: z.custom<WishlistItem>(),
  /** Click handler */
  onClick: z.function().optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
  /** Show action buttons (delete, got it) */
  showActions: z.boolean().optional(),
  /** Callback when item is deleted */
  onDeleted: z.function().returns(z.void()).optional(),
  /** Callback when item is marked as purchased */
  onPurchased: z.function().returns(z.void()).optional(),
})

export type WishlistCardProps = z.infer<typeof WishlistCardPropsSchema>

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
 * - Optional action buttons (delete, got it)
 */
export function WishlistCard({
  item,
  onClick,
  className,
  showActions = false,
  onDeleted,
  onPurchased,
}: WishlistCardProps) {
  const { id, title, setNumber, store, imageUrl, price, currency, pieceCount, priority } = item

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [gotItModalOpen, setGotItModalOpen] = useState(false)

  // Build subtitle with set number
  const subtitle = setNumber ? `Set #${setNumber}` : undefined

  // Build metadata content
  const metadata = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Store Badge */}
      <Badge
        className={storeBadgeColors[store] || storeBadgeColors.Other}
        data-testid="wishlist-card-store"
      >
        {store}
      </Badge>

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
    </div>
  )

  // Action buttons for delete and got it (overlay on image)
  const cardActions = showActions ? (
    <div className="flex gap-1">
      <Button
        variant="secondary"
        size="sm"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          setGotItModalOpen(true)
        }}
        className="h-8"
        data-testid="wishlist-card-got-it-btn"
      >
        <PartyPopper className="h-4 w-4 mr-1" aria-hidden="true" />
        Got it!
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          setDeleteModalOpen(true)
        }}
        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        aria-label={`Remove ${title} from wishlist`}
        data-testid="wishlist-card-delete-btn"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  ) : null

  return (
    <>
      <GalleryCard
        image={{
          src: imageUrl || '/images/placeholder-lego.png',
          alt: title,
          aspectRatio: '4/3',
        }}
        title={title}
        subtitle={subtitle}
        metadata={metadata}
        actions={cardActions}
        onClick={onClick}
        className={className}
        data-testid={`wishlist-card-${id}`}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemId={id}
        itemTitle={title}
        onDeleted={onDeleted}
      />

      {/* Got It Modal */}
      <GotItModal
        open={gotItModalOpen}
        onOpenChange={setGotItModalOpen}
        item={item}
        onCompleted={onPurchased}
      />
    </>
  )
}

export default WishlistCard
