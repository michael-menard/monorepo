/**
 * WishlistFormFields Component
 *
 * Reusable form fields for add/edit wishlist item forms.
 * Works with react-hook-form and Zod validation.
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { z } from 'zod'
import { UseFormReturn, Controller } from 'react-hook-form'
import {
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/app-component-library'
import type { UpdateWishlistItem } from '@repo/api-client/schemas/wishlist'

/**
 * WishlistFormFields props schema
 */
export const WishlistFormFieldsPropsSchema = z.object({
  /** React Hook Form instance */
  form: z.custom<UseFormReturn<UpdateWishlistItem>>(),
  /** Disable all fields */
  disabled: z.boolean().default(false),
  /** Additional CSS classes */
  className: z.string().optional(),
})

export type WishlistFormFieldsProps = z.infer<typeof WishlistFormFieldsPropsSchema>

/**
 * Store options for dropdown
 */
const storeOptions = [
  { value: 'LEGO', label: 'LEGO' },
  { value: 'Barweer', label: 'Barweer' },
  { value: 'Cata', label: 'Cata' },
  { value: 'BrickLink', label: 'BrickLink' },
  { value: 'Other', label: 'Other' },
]

/**
 * Priority options for dropdown
 */
const priorityOptions = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Low' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'High' },
  { value: '4', label: 'Very High' },
  { value: '5', label: 'Must Have' },
]

/**
 * Currency options for dropdown
 */
const currencyOptions = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20ac)' },
  { value: 'GBP', label: 'GBP (\u00a3)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
]

/**
 * WishlistFormFields Component
 *
 * Renders all form fields for wishlist item add/edit forms.
 */
export function WishlistFormFields({
  form,
  disabled = false,
  className = '',
}: WishlistFormFieldsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form

  return (
    <div className={cn('space-y-6', className)}>
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="Enter item title"
          disabled={disabled}
          {...register('title')}
          aria-invalid={errors.title ? 'true' : 'false'}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className={cn(errors.title && 'border-red-500')}
          data-testid="wishlist-form-title"
        />
        {errors.title ? (
          <p id="title-error" className="text-sm text-red-500" role="alert">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      {/* Store */}
      <div className="space-y-2">
        <Label htmlFor="store">Store *</Label>
        <Controller
          name="store"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
              <SelectTrigger
                id="store"
                className={cn(errors.store && 'border-red-500')}
                data-testid="wishlist-form-store"
              >
                <SelectValue placeholder="Select a store" />
              </SelectTrigger>
              <SelectContent>
                {storeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.store ? (
          <p className="text-sm text-red-500" role="alert">
            {errors.store.message}
          </p>
        ) : null}
      </div>

      {/* Set Number */}
      <div className="space-y-2">
        <Label htmlFor="setNumber">Set Number</Label>
        <Input
          id="setNumber"
          placeholder="e.g., 75192"
          disabled={disabled}
          {...register('setNumber')}
          data-testid="wishlist-form-set-number"
        />
      </div>

      {/* Source URL */}
      <div className="space-y-2">
        <Label htmlFor="sourceUrl">Source URL</Label>
        <Input
          id="sourceUrl"
          type="url"
          placeholder="https://..."
          disabled={disabled}
          {...register('sourceUrl')}
          aria-invalid={errors.sourceUrl ? 'true' : 'false'}
          className={cn(errors.sourceUrl && 'border-red-500')}
          data-testid="wishlist-form-source-url"
        />
        {errors.sourceUrl ? (
          <p className="text-sm text-red-500" role="alert">
            {errors.sourceUrl.message}
          </p>
        ) : null}
      </div>

      {/* Price and Currency Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            placeholder="0.00"
            disabled={disabled}
            {...register('price')}
            aria-invalid={errors.price ? 'true' : 'false'}
            className={cn(errors.price && 'border-red-500')}
            data-testid="wishlist-form-price"
          />
          {errors.price ? (
            <p className="text-sm text-red-500" role="alert">
              {errors.price.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                <SelectTrigger id="currency" data-testid="wishlist-form-currency">
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Piece Count */}
      <div className="space-y-2">
        <Label htmlFor="pieceCount">Piece Count</Label>
        <Input
          id="pieceCount"
          type="number"
          min={0}
          placeholder="e.g., 7541"
          disabled={disabled}
          {...register('pieceCount', { valueAsNumber: true })}
          data-testid="wishlist-form-piece-count"
        />
      </div>

      {/* Release Date */}
      <div className="space-y-2">
        <Label htmlFor="releaseDate">Release Date</Label>
        <Input
          id="releaseDate"
          type="date"
          disabled={disabled}
          {...register('releaseDate')}
          data-testid="wishlist-form-release-date"
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? 0)}
              onValueChange={val => field.onChange(parseInt(val, 10))}
              disabled={disabled}
            >
              <SelectTrigger id="priority" data-testid="wishlist-form-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          placeholder="e.g., star-wars, ucs, display"
          disabled={disabled}
          {...register('tags', {
            setValueAs: (value: string) =>
              value
                ? value
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean)
                : [],
          })}
          data-testid="wishlist-form-tags"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any notes about this item..."
          rows={4}
          disabled={disabled}
          {...register('notes')}
          data-testid="wishlist-form-notes"
        />
      </div>
    </div>
  )
}

export default WishlistFormFields
