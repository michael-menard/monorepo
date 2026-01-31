/**
 * WishlistDragPreviewContent Component
 *
 * The actual content of the drag preview thumbnail.
 * Displays item image, title, and price with animations.
 *
 * Story WISH-2005c: Drag preview thumbnail
 */

import { motion } from 'framer-motion'
import { Package } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  cn,
} from '@repo/app-component-library'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import {
  MAX_TITLE_LENGTH,
  ANIMATION_DURATION_MS,
  TOOLTIP_DELAY_MS,
  PREVIEW_SCALE,
  PREVIEW_OPACITY,
} from './__types__'

/**
 * Props for WishlistDragPreviewContent
 */
type WishlistDragPreviewContentProps = {
  item: WishlistItem
}

/**
 * Format price with currency
 * Replicates same logic from WishlistCard (AC-10)
 */
function formatPrice(price: string | null, currency: string): string {
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
 * Truncate title with ellipsis (AC-6)
 */
function truncateTitle(title: string, maxLength: number = MAX_TITLE_LENGTH): string {
  if (title.length <= maxLength) return title
  return `${title.slice(0, maxLength)}...`
}

/**
 * Check if title needs truncation
 */
function needsTruncation(title: string): boolean {
  return title.length > MAX_TITLE_LENGTH
}

/**
 * WishlistDragPreviewContent Component
 *
 * Renders the preview thumbnail with:
 * - Item image at 4:3 aspect ratio (or Package icon fallback)
 * - Truncated title with tooltip for long titles
 * - Formatted price
 * - Framer Motion fade animation
 * - Shadow and border highlight styling
 */
export function WishlistDragPreviewContent({ item }: WishlistDragPreviewContentProps) {
  const { title, imageUrl, price, currency, store } = item
  const hasImage = imageUrl && imageUrl.length > 0
  const displayTitle = truncateTitle(title)
  const showTooltip = needsTruncation(title)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: PREVIEW_OPACITY }}
      exit={{ opacity: 0 }}
      transition={{ duration: ANIMATION_DURATION_MS / 1000 }}
      className={cn(
        // Container with card styling
        'bg-card rounded-lg overflow-hidden',
        // Shadow for visual lift (AC-11)
        'shadow-xl',
        // Border highlight (AC-12)
        'ring-2 ring-primary',
        // Fixed width for consistent preview
        'w-48',
        // Pointer events none to not interfere with drag
        'pointer-events-auto',
      )}
      style={{
        // Scale to 70% (AC-1)
        transform: `scale(${PREVIEW_SCALE})`,
        transformOrigin: 'top left',
      }}
      data-testid="wishlist-drag-preview"
    >
      {/* Image or Fallback (AC-5, AC-10) */}
      <div className="relative w-full aspect-[4/3] bg-muted">
        {hasImage ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            // Browser handles caching natively (AC-8)
            loading="eager"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            data-testid="wishlist-drag-preview-fallback"
          >
            <Package className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Content: Title and Price */}
      <div className="p-3 space-y-1">
        {/* Title with conditional tooltip (AC-6) */}
        {showTooltip ? (
          <TooltipProvider>
            <Tooltip delayDuration={TOOLTIP_DELAY_MS}>
              <TooltipTrigger asChild>
                <h4
                  className="text-sm font-medium text-foreground truncate cursor-default"
                  data-testid="wishlist-drag-preview-title"
                >
                  {displayTitle}
                </h4>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="max-w-xs">{title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <h4
            className="text-sm font-medium text-foreground truncate"
            data-testid="wishlist-drag-preview-title"
          >
            {displayTitle}
          </h4>
        )}

        {/* Price and Store */}
        <div className="flex items-center justify-between">
          {price ? (
            <span
              className="text-sm font-semibold text-foreground"
              data-testid="wishlist-drag-preview-price"
            >
              {formatPrice(price, currency)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No price</span>
          )}
          <span className="text-xs text-muted-foreground" data-testid="wishlist-drag-preview-store">
            {store}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default WishlistDragPreviewContent
