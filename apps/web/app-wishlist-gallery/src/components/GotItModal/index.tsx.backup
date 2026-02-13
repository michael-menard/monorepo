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
  AppSelect,
  LoadingSpinner,
} from '@repo/app-component-library'
import type { WishlistItem, BuildStatus } from '@repo/api-client/schemas/wishlist'
import { useUpdateItemPurchaseMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
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
  const [updateItemPurchase, { isLoading: isPurchasing }] = useUpdateItemPurchaseMutation()

  // Form state
  const [pricePaid, setPricePaid] = useState('')
  const [tax, setTax] = useState('')
  const [shipping, setShipping] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateString())
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('not_started')

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
      setPurchaseDate(getTodayDateString())
      setBuildStatus('not_started')
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [pricePaid, tax, shipping])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!item || !validate()) return

      try {
        // Build API input (SETS-MVP-0310: new PurchaseDetailsInput format)
        const input = {
          purchasePrice: pricePaid || undefined,
          purchaseTax: tax || undefined,
          purchaseShipping: shipping || undefined,
          purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
          buildStatus,
        }

        // Call API (SETS-MVP-0310: new PATCH endpoint)
        await updateItemPurchase({
          itemId: item.id,
          input,
        }).unwrap()

        // Close modal
        onClose()

        // Show success toast
        showPurchaseSuccessToast(item)

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
      purchaseDate,
      buildStatus,
      updateItemPurchase,
      onClose,
      onSuccess,
    ],
  )

  // Show success toast (SETS-MVP-0310: simplified - no Set navigation)
  const showPurchaseSuccessToast = useCallback((wishlistItem: WishlistItem) => {
    toast.success('Item marked as owned', {
      description: wishlistItem.title,
      duration: 5000,
    })
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
        data-testid="got-it-modal"
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

          {/* Purchase Date and Build Status Row */}
          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <label htmlFor="buildStatus" className="text-sm font-medium">
                Build Status
              </label>
              <AppSelect
                value={buildStatus}
                onValueChange={value => setBuildStatus(value as BuildStatus)}
                disabled={isPurchasing}
                placeholder="Select build status"
                options={[
                  { value: 'not_started', label: 'Not Started' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
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
