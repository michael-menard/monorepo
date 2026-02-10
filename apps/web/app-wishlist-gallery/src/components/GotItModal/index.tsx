/**
 * GotItModal Component
 *
 * Modal for marking a wishlist item as purchased.
 * Collects purchase details and creates a Set item.
 *
 * Story WISH-2042: Purchase/Got It Flow
 * Story SETS-MVP-0320: Enhanced success toast with navigation
 * Story SETS-MVP-0340: Form validation and accessibility
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
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
  cn,
} from '@repo/app-component-library'
import type { WishlistItem, BuildStatus } from '@repo/api-client/schemas/wishlist'
import { useUpdateItemPurchaseMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import { focusRingClasses } from '../../utils/a11y'
import type { GotItModalProps, PurchaseDetailsForm } from './__types__'
import { PurchaseDetailsFormSchema } from './__types__'

/**
 * Format today's date as YYYY-MM-DD for date input
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
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
 * - Purchase price, tax, shipping fields with Zod validation (AC18, AC21)
 * - Purchase date with future date prevention (AC19)
 * - Keyboard accessible (Enter to submit, proper tab order) (AC20)
 * - ARIA attributes for screen readers (AC20)
 * - Loading states with progress messages
 * - Success toast with "View in Collection" navigation (SETS-MVP-0320)
 */
export function GotItModal({ isOpen, onClose, item, onSuccess }: GotItModalProps) {
  const [updateItemPurchase, { isLoading: isPurchasing }] = useUpdateItemPurchaseMutation()
  const navigate = useNavigate()

  // React Hook Form setup (AC18, AC19, AC21)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
    setValue,
  } = useForm<PurchaseDetailsForm>({
    resolver: zodResolver(PurchaseDetailsFormSchema),
    mode: 'onBlur', // Validate on blur (non-intrusive)
    reValidateMode: 'onChange', // Re-validate on change after first error
    defaultValues: {
      purchaseDate: getTodayDateString(),
      pricePaid: undefined,
      tax: undefined,
      shipping: undefined,
      buildStatus: 'not_started',
    },
  })

  // Loading progress state
  const [progressMessage, setProgressMessage] = useState(PROGRESS_MESSAGES[0])
  const progressRef = useRef(0)

  // Reset form when modal opens with new item
  useEffect(() => {
    if (isOpen && item) {
      reset({
        purchaseDate: getTodayDateString(),
        pricePaid: item.price ? parseFloat(item.price) : undefined,
        tax: undefined,
        shipping: undefined,
        buildStatus: 'not_started',
      })
    }
  }, [isOpen, item, reset])

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

  /**
   * Show success toast with navigation to collection
   * SETS-MVP-0320 AC11-12: Enhanced toast with "View in Collection" action button
   */
  const showPurchaseSuccessToast = useCallback(
    (wishlistItem: WishlistItem) => {
      toast.success('Added to your collection!', {
        description: wishlistItem.title,
        duration: 5000,
        action: {
          label: 'View in Collection',
          onClick: () => {
            try {
              navigate({ to: '/collection' })
            } catch (error) {
              toast.error('Could not navigate to collection', {
                description: 'Please navigate manually',
              })
            }
          },
        },
      })
    },
    [navigate],
  )

  /**
   * Handle form submission with focus management on validation errors (AC20)
   */
  const onSubmit = useCallback(
    async (data: PurchaseDetailsForm) => {
      if (!item) return

      try {
        // Build API input (SETS-MVP-0310: new PurchaseDetailsInput format)
        const input = {
          purchasePrice: data.pricePaid?.toString() || undefined,
          purchaseTax: data.tax?.toString() || undefined,
          purchaseShipping: data.shipping?.toString() || undefined,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate).toISOString() : undefined,
          buildStatus: data.buildStatus,
        }

        // Call API (SETS-MVP-0310: new PATCH endpoint)
        await updateItemPurchase({
          itemId: item.id,
          input,
        }).unwrap()

        // Close modal
        onClose()

        // Show success toast (SETS-MVP-0320: enhanced with navigation)
        showPurchaseSuccessToast(item)

        // Call success callback if provided (SETS-MVP-0320: triggers item removal)
        onSuccess?.()
      } catch (error) {
        // Show error toast
        toast.error('Failed to mark as purchased', {
          description: error instanceof Error ? error.message : 'Please try again',
        })
      }
    },
    [item, updateItemPurchase, onClose, onSuccess, showPurchaseSuccessToast],
  )

  /**
   * Handle validation errors by focusing first error field (AC20)
   */
  const onSubmitError = useCallback(
    (validationErrors: FieldErrors<PurchaseDetailsForm>) => {
      const firstErrorField = Object.keys(validationErrors)[0] as keyof PurchaseDetailsForm
      if (firstErrorField) {
        setFocus(firstErrorField)
      }
    },
    [setFocus],
  )

  /**
   * Handle Enter key to submit form (AC20)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLFormElement>) => {
      if (e.key === 'Enter' && !isPurchasing) {
        e.preventDefault()
        handleSubmit(onSubmit, onSubmitError)()
      }
    },
    [isPurchasing, handleSubmit, onSubmit, onSubmitError],
  )

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

        <form
          onSubmit={handleSubmit(onSubmit, onSubmitError)}
          onKeyDown={handleKeyDown}
          className="space-y-4"
        >
          {/* Price Paid (AC18, AC21) */}
          <div className="space-y-2">
            <label htmlFor="pricePaid" className="text-sm font-medium">
              Price Paid
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                {...register('pricePaid', { valueAsNumber: true })}
                id="pricePaid"
                type="number"
                step="0.01"
                min="0"
                max="999999.99"
                placeholder="0.00"
                className={cn(
                  'pl-7',
                  focusRingClasses,
                  errors.pricePaid && 'border-red-500 focus-visible:ring-red-500',
                )}
                disabled={isPurchasing}
                aria-invalid={!!errors.pricePaid}
                aria-describedby={errors.pricePaid ? 'pricePaid-error' : undefined}
                data-testid="price-paid-input"
              />
            </div>
            {errors.pricePaid ? (
              <p
                id="pricePaid-error"
                className="text-sm text-red-600 dark:text-red-400 mt-1"
                role="alert"
              >
                {errors.pricePaid.message}
              </p>
            ) : null}
          </div>

          {/* Tax and Shipping Row (AC18, AC21) */}
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
                  {...register('tax', { valueAsNumber: true })}
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999.99"
                  placeholder="0.00"
                  className={cn(
                    'pl-7',
                    focusRingClasses,
                    errors.tax && 'border-red-500 focus-visible:ring-red-500',
                  )}
                  disabled={isPurchasing}
                  aria-invalid={!!errors.tax}
                  aria-describedby={errors.tax ? 'tax-error' : undefined}
                  data-testid="tax-input"
                />
              </div>
              {errors.tax ? (
                <p
                  id="tax-error"
                  className="text-sm text-red-600 dark:text-red-400 mt-1"
                  role="alert"
                >
                  {errors.tax.message}
                </p>
              ) : null}
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
                  {...register('shipping', { valueAsNumber: true })}
                  id="shipping"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999.99"
                  placeholder="0.00"
                  className={cn(
                    'pl-7',
                    focusRingClasses,
                    errors.shipping && 'border-red-500 focus-visible:ring-red-500',
                  )}
                  disabled={isPurchasing}
                  aria-invalid={!!errors.shipping}
                  aria-describedby={errors.shipping ? 'shipping-error' : undefined}
                  data-testid="shipping-input"
                />
              </div>
              {errors.shipping ? (
                <p
                  id="shipping-error"
                  className="text-sm text-red-600 dark:text-red-400 mt-1"
                  role="alert"
                >
                  {errors.shipping.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* Purchase Date and Build Status Row (AC19) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="purchaseDate" className="text-sm font-medium">
                Purchase Date
              </label>
              <Input
                {...register('purchaseDate')}
                id="purchaseDate"
                type="date"
                max={getTodayDateString()}
                className={cn(
                  focusRingClasses,
                  errors.purchaseDate && 'border-red-500 focus-visible:ring-red-500',
                )}
                disabled={isPurchasing}
                aria-invalid={!!errors.purchaseDate}
                aria-describedby={errors.purchaseDate ? 'purchaseDate-error' : undefined}
                data-testid="purchase-date-input"
              />
              {errors.purchaseDate ? (
                <p
                  id="purchaseDate-error"
                  className="text-sm text-red-600 dark:text-red-400 mt-1"
                  role="alert"
                >
                  {errors.purchaseDate.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="buildStatus" className="text-sm font-medium">
                Build Status
              </label>
              <AppSelect
                value={item.buildStatus || 'not_started'}
                onValueChange={value => setValue('buildStatus', value as BuildStatus)}
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
