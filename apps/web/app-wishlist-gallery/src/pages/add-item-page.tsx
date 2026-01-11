import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { CreateWishlistItemSchema, type CreateWishlistItem } from '@repo/api-client/schemas/wishlist'
import {
  Badge,
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@repo/app-component-library'
import { useAddToWishlistMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import { ImageUploadField } from '../components/ImageUploadField'
import { uploadWishlistImage } from '../utils/uploadWishlistImage'

const STORES = ['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'] as const
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

export function AddWishlistItemPage() {
  const { toast } = useToast()
  const [addToWishlist, { isLoading }] = useAddToWishlistMutation()

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')

  const form = useForm<CreateWishlistItem>({
    resolver: zodResolver(CreateWishlistItemSchema),
    defaultValues: {
      title: '',
      store: 'LEGO',
      setNumber: undefined,
      sourceUrl: '',
      imageUrl: undefined,
      price: '',
      currency: 'USD',
      pieceCount: undefined,
      releaseDate: undefined,
      tags: [],
      priority: 0,
      notes: '',
    },
  })

  const handleSubmit = async (values: CreateWishlistItem) => {
    try {
      const payload: CreateWishlistItem = {
        ...values,
        // Normalize optional string fields so schema + backend handle them correctly
        sourceUrl: values.sourceUrl || undefined,
        price: values.price || undefined,
      }

      // 1. Create wishlist item
      const created = await addToWishlist(payload).unwrap()

      // 2. If we have an image file, upload it before redirecting
      if (imageFile) {
        try {
          await uploadWishlistImage(created.id, imageFile)
        } catch (uploadError) {
          toast({
            title: 'Image upload failed',
            description: 'The item was created, but the image could not be uploaded.',
            variant: 'destructive',
          })
          // Do not redirect so the user can retry if desired
          return
        }
      }

      toast({
        title: 'Item added',
        description: 'The item was added to your wishlist.',
      })

      // Redirect back to wishlist gallery
      if (window.location.pathname !== '/wishlist') {
        window.location.href = '/wishlist'
      }
    } catch (error) {
      toast({
        title: 'Failed to add item',
        description: 'Something went wrong while adding this item to your wishlist.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            window.location.href = '/wishlist'
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Wishlist
        </Button>
        <h1 className="text-2xl font-bold">Add Wishlist Item</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Store selection */}
          <FormField
            control={form.control}
            name="store"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STORES.map(store => (
                      <SelectItem key={store} value={store}>
                        {store}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Medieval Castle" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Set number */}
          <FormField
            control={form.control}
            name="setNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Set Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 10305" {...field} />
                </FormControl>
                <FormDescription>Official set number (if applicable).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Piece count */}
          <FormField
            control={form.control}
            name="pieceCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Piece Count</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g., 2500"
                    value={field.value ?? ''}
                    onChange={event => {
                      const value = event.target.value
                      field.onChange(value ? Number(value) : undefined)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price + Currency */}
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 199.99"
                      value={field.value ?? ''}
                      onChange={event => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Priority */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select
                  onValueChange={value => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">0 - Unset</SelectItem>
                    <SelectItem value="1">1 - Low</SelectItem>
                    <SelectItem value="2">2 - Medium-Low</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4 - High</SelectItem>
                    <SelectItem value="5">5 - Must Have</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Image upload */}
          <ImageUploadField
            file={imageFile}
            preview={imagePreview}
            onFileChange={file => {
              setImageFile(file)
              if (file) {
                const url = URL.createObjectURL(file)
                setImagePreview(url)
              } else {
                setImagePreview(null)
              }
            }}
            onRemove={() => {
              setImageFile(null)
              setImagePreview(null)
            }}
          />

          {/* Tags */}
          <div className="space-y-2">
            <FormLabel>Tags</FormLabel>
            <div className="flex gap-2">
              <Input
                value={newTag}
                placeholder="Add tag and press Enter or click Add"
                onChange={event => setNewTag(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const trimmed = newTag.trim()
                    if (!trimmed) return
                    const currentTags = form.getValues('tags') ?? []
                    if (currentTags.includes(trimmed)) return
                    form.setValue('tags', [...currentTags, trimmed])
                    setNewTag('')
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const trimmed = newTag.trim()
                  if (!trimmed) return
                  const currentTags = form.getValues('tags') ?? []
                  if (currentTags.includes(trimmed)) return
                  form.setValue('tags', [...currentTags, trimmed])
                  setNewTag('')
                }}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.watch('tags') ?? []).map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button
                    type="button"
                    className="ml-1 text-xs leading-none"
                    onClick={() => {
                      const currentTags = form.getValues('tags') ?? []
                      form.setValue(
                        'tags',
                        currentTags.filter(t => t !== tag),
                      )
                    }}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Source URL */}
          <FormField
            control={form.control}
            name="sourceUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://www.lego.com/product/..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>Link to the product or instructions page.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Any additional notes (e.g., wait for sale)..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = '/wishlist'
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Wishlist
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
