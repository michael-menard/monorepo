import type { FC } from 'react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Checkbox,
  useToast,
} from '@repo/app-component-library'
import type { WishlistItem, MarkPurchasedResponse } from '@repo/api-client/schemas/wishlist'
import { useMarkAsPurchasedMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import { Loader2, Package, Check } from 'lucide-react'

const PurchaseFormSchema = z.object({
  purchasePrice: z.number().nonnegative(),
  purchaseTax: z.number().nonnegative().optional(),
  purchaseShipping: z.number().nonnegative().optional(),
  quantity: z.number().int().min(1).default(1),
  purchaseDate: z.string(),
  keepOnWishlist: z.boolean().default(false),
})

export type PurchaseFormValues = z.infer<typeof PurchaseFormSchema>

export interface GotItModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: WishlistItem
  onCompleted?: (params: { item: WishlistItem; response: MarkPurchasedResponse }) => void
}

export const GotItModal: FC<GotItModalProps> = ({ open, onOpenChange, item, onCompleted }) => {
  const { success, error } = useToast()
  const [markAsPurchased, { isLoading }] = useMarkAsPurchasedMutation()

  const defaultPrice = useMemo(() => {
    if (!item.price) return 0
    const parsed = Number(item.price)
    return Number.isNaN(parsed) ? 0 : parsed
  }, [item.price])

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(PurchaseFormSchema) as any,
    defaultValues: {
      purchasePrice: defaultPrice,
      purchaseTax: undefined,
      purchaseShipping: undefined,
      quantity: 1,
      purchaseDate: new Date().toISOString().slice(0, 10),
      keepOnWishlist: false,
    },
  })

  const handleSubmit = async (values: PurchaseFormValues) => {
    try {
      const response = await markAsPurchased({
        id: item.id,
        data: {
          purchasePrice: values.purchasePrice,
          purchaseTax: values.purchaseTax,
          purchaseShipping: values.purchaseShipping,
          quantity: values.quantity,
          purchaseDate: new Date(values.purchaseDate).toISOString(),
          keepOnWishlist: values.keepOnWishlist,
        },
      }).unwrap()

      onOpenChange(false)

      if (onCompleted) {
        onCompleted({ item, response })
      } else {
        success(
          'Added to your collection!',
          values.keepOnWishlist
            ? 'Item marked as purchased and kept on wishlist.'
            : 'Item marked as purchased and removed from wishlist.',
        )
      }
    } catch (err) {
      error(err, 'Failed to mark item as purchased')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Got it!
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 flex gap-4 rounded-lg bg-muted p-4">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="h-16 w-16 rounded object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-background">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium">{item.title}</p>
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

        <Form {...(form as any)}>
          <form onSubmit={(form as any).handleSubmit(handleSubmit as any)} className="space-y-4">
            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel htmlFor="purchasePrice">
                    Price paid
                    <span className="text-destructive ml-1" aria-hidden="true">
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        className="pl-7"
                        aria-required="true"
                        aria-invalid={fieldState.error ? 'true' : 'false'}
                        aria-describedby={fieldState.error ? 'purchasePrice-error' : undefined}
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={event => {
                          const value = event.target.value
                          field.onChange(value ? Number(value) : 0)
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage id="purchasePrice-error" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseTax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          value={field.value ?? ''}
                          onChange={event => {
                            const value = event.target.value
                            field.onChange(value ? Number(value) : undefined)
                          }}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseShipping"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          value={field.value ?? ''}
                          onChange={event => {
                            const value = event.target.value
                            field.onChange(value ? Number(value) : undefined)
                          }}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="quantity">Quantity</FormLabel>
                  <FormControl>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={event => {
                        const value = Number(event.target.value) || 1
                        field.onChange(value < 1 ? 1 : value)
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="purchaseDate">Purchase date</FormLabel>
                  <FormControl>
                    <Input id="purchaseDate" type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keepOnWishlist"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={checked => field.onChange(Boolean(checked))}
                    />
                  </FormControl>
                  <FormLabel className="m-0 font-normal">
                    Keep a copy on wishlist (I want another)
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Add to collection
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
