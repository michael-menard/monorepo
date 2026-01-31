/**
 * GotItModal Component
 *
 * Modal for marking a wishlist item as purchased.
 * Collects purchase details and creates a Set item.
 *
 * Story WISH-2042: Purchase/Got It Flow
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogFooter,
  Button,
  Input,
  Checkbox,
  LoadingSpinner,
} from '@repo/app-component-library'
import { CheckCircle, Package, Undo2 } from 'lucide-react'
import type { WishlistItem, SetItem } from '@repo/api-client/schemas/wishlist'
import { useMarkAsPurchasedMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import type { GotItModalProps } from './__types__'

/**
 * Format today's date as YYYY-MM-DD for date input
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Validate price format
 */
function isValidPrice(value: string): boolean {
  if (!value) return true
  return /^\d+(\.\d{1,2})?$/.test(value)
}

/**
 * Progress messages for loading states
 */
const PROGRESS_MESSAGES = ['Creating your set item...', 'Copying image...', 'Finalizing...']

/**
 * GotItModal Component
 *
 * Modal form for marking a wishlist item as purchased.
 * Features:
 * - Purchase price, tax, shipping fields
 * - Quantity with stepper
 * - Purchase date (defaults to today)
 * - "Keep on wishlist" checkbox
 * - Loading states with progress messages
 * - Keyboard accessible (ESC to cancel, focus trap)
 * - Undo capability via toast
 */
export function GotItModal({ isOpen, onClose, item, onSuccess }: GotItModalProps) {
  const [markAsPurchased, { isLoading: isPurchasing }] = useMarkAsPurchasedMutation()

  // Form state
  const [pricePaid, setPricePaid] = useState('')
  const [tax, setTax] = useState('')
  const [shipping, setShipping] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateString())
  const [keepOnWishlist, setKeepOnWishlist] = useState(false)

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Loading progress state
  const [progressMessage, setProgressMessage] = useState(PROGRESS_MESSAGES[0])
  const progressRef = useRef(0)

  // Reset form when modal opens with new item
  useEffect(() => {
    if (isOpen && item) {
      setPricePaid(item.price || '')
      setTax('')
      setShipping('')
      setQuantity(1)
      setPurchaseDate(getTodayDateString())
      setKeepOnWishlist(false)
      setErrors({})
    }
  }, [isOpen, item])

  // Progress message cycling during loading
  useEffect(() => {
    if (!isPurchasing) {
      progressRef.current = 0
      setProgressMessage(PROGRESS_MESSAGES[0])
      return
    }

    const interval = setInterval(() => {
      progressRef.current = (progressRef.current + 1) % PROGRESS_MESSAGES.length
      setProgressMessage(PROGRESS_MESSAGES[progressRef.current])
    }, 1500)

    return () => clearInterval(interval)
  }, [isPurchasing])

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (pricePaid && !isValidPrice(pricePaid)) {
      newErrors.pricePaid = 'Price must be a valid decimal (e.g., 99.99)'
    }
    if (tax && !isValidPrice(tax)) {
      newErrors.tax = 'Tax must be a valid decimal'
    }
    if (shipping && !isValidPrice(shipping)) {
      newErrors.shipping = 'Shipping must be a valid decimal'
    }
    if (quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [pricePaid, tax, shipping, quantity])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!item || !validate()) return

      try {
        // Build API input
        const input = {
          pricePaid: pricePaid || undefined,
          tax: tax || undefined,
          shipping: shipping || undefined,
          quantity,
          purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
          keepOnWishlist,
        }

        // Call API
        const result = await markAsPurchased({
          itemId: item.id,
          input,
        }).unwrap()

        // Close modal
        onClose()

        // Show success toast with undo button
        showPurchaseSuccessToast(item, result)

        // Call success callback if provided
        onSuccess?.()
      } catch (error) {
        // Show error toast
        toast.error('Failed to mark as purchased', {
          description: error instanceof Error ? error.message : 'Please try again',
        })
      }
    },
    [
      item,
      validate,
      pricePaid,
      tax,
      shipping,
      quantity,
      purchaseDate,
      keepOnWishlist,
      markAsPurchased,
      onClose,
      onSuccess,
    ],
  )

  // Show success toast with undo button
  const showPurchaseSuccessToast = useCallback((wishlistItem: WishlistItem, setItem: SetItem) => {
    const toastId = toast.custom(
      () => (
        <div
          className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md"
          role="alert"
          aria-live="polite"
        >
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Item added to your collection</p>
            <p className="text-sm text-gray-600 mt-1 truncate">{wishlistItem.title}</p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Undo not fully implemented in MVP
                  toast.info('Undo feature coming soon')
                  toast.dismiss(toastId)
                }}
                className="flex items-center gap-1"
              >
                <Undo2 className="h-3 w-3" />
                Undo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.location.href = `/sets/${setItem.id}`
                }}
                className="flex items-center gap-1"
              >
                <Package className="h-3 w-3" />
                View in Sets
              </Button>
            </div>
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: 'bottom-right',
      },
    )
  }, [])

  // Don't render if no item
  if (!item) {
    return null
  }

  return (
    <AppDialog open={isOpen} onOpenChange={open => !open && !isPurchasing && onClose()}>
      <AppDialogContent
        size="default"
        className="sm:max-w-md"
        onEscapeKeyDown={e => isPurchasing && e.preventDefault()}
        onPointerDownOutside={e => isPurchasing && e.preventDefault()}
      >
        <AppDialogHeader>
          <AppDialogTitle>Got It!</AppDialogTitle>
          <AppDialogDescription>
            Add &quot;{item.title}&quot; to your collection
          </AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Price Paid */}
          <div className="space-y-2">
            <label htmlFor="pricePaid" className="text-sm font-medium">
              Price Paid
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="pricePaid"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className="pl-7"
                value={pricePaid}
                onChange={e => setPricePaid(e.target.value)}
                disabled={isPurchasing}
                data-testid="price-paid-input"
              />
            </div>
            {errors.pricePaid ? <p className="text-sm text-red-500">{errors.pricePaid}</p> : null}
          </div>

          {/* Tax and Shipping Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="tax" className="text-sm font-medium">
                Tax
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="tax"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="pl-7"
                  value={tax}
                  onChange={e => setTax(e.target.value)}
                  disabled={isPurchasing}
                  data-testid="tax-input"
                />
              </div>
              {errors.tax ? <p className="text-sm text-red-500">{errors.tax}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="shipping" className="text-sm font-medium">
                Shipping
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="shipping"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="pl-7"
                  value={shipping}
                  onChange={e => setShipping(e.target.value)}
                  disabled={isPurchasing}
                  data-testid="shipping-input"
                />
              </div>
              {errors.shipping ? <p className="text-sm text-red-500">{errors.shipping}</p> : null}
            </div>
          </div>

          {/* Quantity and Purchase Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity
              </label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
                disabled={isPurchasing}
                data-testid="quantity-input"
              />
              {errors.quantity ? <p className="text-sm text-red-500">{errors.quantity}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="purchaseDate" className="text-sm font-medium">
                Purchase Date
              </label>
              <Input
                id="purchaseDate"
                type="date"
                max={getTodayDateString()}
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                disabled={isPurchasing}
                data-testid="purchase-date-input"
              />
            </div>
          </div>

          {/* Keep on Wishlist Checkbox */}
          <div className="flex flex-row items-start space-x-3">
            <Checkbox
              id="keepOnWishlist"
              checked={keepOnWishlist}
              onCheckedChange={checked => setKeepOnWishlist(checked === true)}
              disabled={isPurchasing}
              data-testid="keep-on-wishlist-checkbox"
            />
            <div className="space-y-1 leading-none">
              <label htmlFor="keepOnWishlist" className="text-sm font-normal cursor-pointer">
                Keep on wishlist
              </label>
              <p className="text-xs text-muted-foreground">
                Item will remain on your wishlist after adding to collection
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isPurchasing ? (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" role="status">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-muted-foreground">{progressMessage}</span>
            </div>
          ) : null}

          {/* Footer Buttons */}
          <AppDialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={isPurchasing}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPurchasing} data-testid="submit-button">
              {isPurchasing ? 'Adding...' : 'Add to Collection'}
            </Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  )
}
