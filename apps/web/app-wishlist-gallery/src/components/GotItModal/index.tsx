/**
 * GotItModal Component
 *
 * Modal for marking a wishlist item as purchased with purchase details.
 * Captures price paid, tax, shipping, quantity, and date.
 *
 * Story wish-2004: Got It Flow Modal
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PartyPopper, Package, Loader2, Check, Minus, Plus } from 'lucide-react'
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogFooter,
  AppDialogTitle,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Checkbox,
  Input,
  showSuccessToast,
  showErrorToast,
} from '@repo/app-component-library'
import { useMarkAsPurchasedMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { logger } from '@repo/logger'

/**
 * Purchase Details Form Schema
 */
export const PurchaseDetailsSchema = z.object({
  pricePaid: z.number().nonnegative('Price must be non-negative'),
  tax: z.number().nonnegative('Tax must be non-negative').optional(),
  shipping: z.number().nonnegative('Shipping must be non-negative').optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  keepOnWishlist: z.boolean(),
})

export type PurchaseDetails = z.infer<typeof PurchaseDetailsSchema>

/**
 * Props schema for GotItModal
 */
export const GotItModalPropsSchema = z.object({
  open: z.boolean(),
  onOpenChange: z.function().args(z.boolean()).returns(z.void()),
  item: z.custom<WishlistItem>(),
  onCompleted: z.function().returns(z.void()).optional(),
})

export type GotItModalProps = z.infer<typeof GotItModalPropsSchema>

/**
 * Format price string to number
 */
function parsePrice(priceString: string | null | undefined): number {
  if (!priceString) return 0
  const parsed = parseFloat(priceString)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * GotItModal
 *
 * Shows a form to capture purchase details when user marks item as "got it".
 * Pre-fills price from wishlist item, defaults date to today.
 */
export function GotItModal({ open, onOpenChange, item, onCompleted }: GotItModalProps) {
  const [markPurchased, { isLoading }] = useMarkAsPurchasedMutation()

  const form = useForm<PurchaseDetails>({
    resolver: zodResolver(PurchaseDetailsSchema),
    defaultValues: {
      pricePaid: parsePrice(item.price),
      tax: undefined,
      shipping: undefined,
      quantity: 1,
      purchaseDate: getTodayDateString(),
      keepOnWishlist: false,
    },
  })

  const handleSubmit = async (data: PurchaseDetails) => {
    try {
      const result = await markPurchased({
        id: item.id,
        data: {
          purchasePrice: data.pricePaid,
          purchaseTax: data.tax,
          purchaseShipping: data.shipping,
          quantity: data.quantity,
          purchaseDate: new Date(data.purchaseDate).toISOString(),
          keepOnWishlist: data.keepOnWishlist,
        },
      }).unwrap()

      onOpenChange(false)

      if (result.newSetId) {
        showSuccessToast('Added to your collection! View it in your Sets gallery.')
      } else {
        showSuccessToast('Marked as purchased!')
      }

      onCompleted?.()
    } catch (error) {
      logger.error('Failed to mark item as purchased:', error)
      showErrorToast('Failed to mark as purchased. Please try again.')
    }
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  const quantity = form.watch('quantity')

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="default" className="sm:max-w-md">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-primary" />
            Add to Your Collection
          </AppDialogTitle>
        </AppDialogHeader>

        {/* Item Summary */}
        <div className="flex gap-4 p-4 bg-muted rounded-lg">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="w-16 h-16 object-cover rounded" />
          ) : (
            <div className="w-16 h-16 bg-background rounded flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.title}</p>
            {item.setNumber ? (
              <p className="text-sm text-muted-foreground">Set #{item.setNumber}</p>
            ) : null}
            {item.pieceCount ? (
              <p className="text-sm text-muted-foreground">
                {item.pieceCount.toLocaleString()} pieces
              </p>
            ) : null}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Price Paid */}
            <FormField
              control={form.control}
              name="pricePaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Paid</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        {...field}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Tax & Shipping Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => field.onChange(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-medium" aria-live="polite">
                        {quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => field.onChange(quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Purchase Date */}
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <Input type="date" max={getTodayDateString()} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Keep on Wishlist */}
            <FormField
              control={form.control}
              name="keepOnWishlist"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Keep a copy on wishlist (want another)
                  </FormLabel>
                </FormItem>
              )}
            />

            <AppDialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Add to Collection
                  </>
                )}
              </Button>
            </AppDialogFooter>
          </form>
        </Form>
      </AppDialogContent>
    </AppDialog>
  )
}
