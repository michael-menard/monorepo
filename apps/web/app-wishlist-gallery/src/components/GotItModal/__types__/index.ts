/**
 * GotItModal Type Definitions
 *
 * Zod schemas for GotItModal component props and data validation.
 */

import { z } from 'zod'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { validationMessages } from '@repo/app-component-library/forms/validation-messages'

/**
 * GotItModal props schema
 */
export const GotItModalPropsSchema = z.object({
  /** Whether the modal is open */
  isOpen: z.boolean(),
  /** Callback when modal should close */
  onClose: z.function(),
  /** The wishlist item being purchased */
  item: z.custom<WishlistItem>().nullable(),
  /** Optional callback when purchase is completed successfully */
  onSuccess: z.function().optional(),
})

export type GotItModalProps = z.infer<typeof GotItModalPropsSchema>

/**
 * Helper to create optional price field schema
 * AC18: Accepts 0.00-999999.99 range (nonnegative to allow 0.00)
 * AC21: valueAsNumber converts empty inputs to NaN, which we treat as undefined
 *
 * Uses union of z.nan() (empty input) and z.number() (valid input) to avoid
 * z.preprocess which produces `unknown` input types incompatible with React Hook Form.
 */
const optionalPrice = (fieldName: string) =>
  z
    .union([
      z.nan().transform(() => undefined),
      z
        .number()
        .min(0, validationMessages.number.min(fieldName, 0))
        .max(999999.99, validationMessages.number.max(fieldName, 999999.99)),
    ])
    .optional()

/**
 * Purchase details form schema
 *
 * AC18: Price fields validate decimals (0.00-999999.99) using Zod + React Hook Form
 * AC19: Purchase date cannot be in the future (Zod validation as fallback to HTML5 max)
 * AC21: Price schema handles string-to-number conversion via valueAsNumber + NaN handling
 */
export const PurchaseDetailsFormSchema = z.object({
  // AC19: Date validation - cannot be in the future
  purchaseDate: z
    .string()
    .refine(
      date => {
        if (!date) return true // Optional field
        return new Date(date) <= new Date()
      },
      { message: validationMessages.date.past('Purchase date') },
    )
    .optional(),

  // AC18 + AC21: Price fields accept 0.00-999999.99
  // valueAsNumber option in register() converts input values to numbers (NaN when empty)
  pricePaid: optionalPrice('Price paid'),
  tax: optionalPrice('Tax'),
  shipping: optionalPrice('Shipping'),

  // Build status is required
  buildStatus: z.enum(['not_started', 'in_progress', 'completed']),
})

export type PurchaseDetailsForm = z.infer<typeof PurchaseDetailsFormSchema>
