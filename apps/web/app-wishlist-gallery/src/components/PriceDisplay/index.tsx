/**
 * PriceDisplay Component
 *
 * Formats and displays a price with currency symbol.
 * Handles null/undefined values gracefully.
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { z } from 'zod'

/**
 * PriceDisplay props schema
 */
export const PriceDisplayPropsSchema = z.object({
  /** Price value as string (decimal format) */
  price: z.string().nullable().optional(),
  /** Currency code (ISO 4217) */
  currency: z.string().default('USD'),
  /** Size variant */
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  /** Additional CSS classes */
  className: z.string().optional(),
})

export type PriceDisplayProps = z.infer<typeof PriceDisplayPropsSchema>

/**
 * Size-based styling
 */
const sizeStyles: Record<string, string> = {
  sm: 'text-sm font-medium',
  md: 'text-lg font-semibold',
  lg: 'text-2xl font-bold',
}

/**
 * Format price with currency
 */
function formatPrice(price: string, currency: string): string {
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
 * PriceDisplay Component
 *
 * Renders a formatted price with currency symbol.
 * Returns null if no price is provided.
 */
export function PriceDisplay({
  price,
  currency = 'USD',
  size = 'md',
  className = '',
}: PriceDisplayProps) {
  if (!price) {
    return null
  }

  const formattedPrice = formatPrice(price, currency)
  if (!formattedPrice) {
    return null
  }

  return (
    <span className={`text-primary ${sizeStyles[size]} ${className}`} data-testid="price-display">
      {formattedPrice}
    </span>
  )
}

export default PriceDisplay
