# Story wish-1003: Wishlist Add Item Page

## Status

Draft

## Story

**As a** user,
**I want** to add items to my wishlist,
**so that** I can track sets and instructions I want to purchase.

## Dependencies

- **wish-1004**: Database Schema & Zod Types (provides WishlistItem type and CreateWishlistItemSchema)
- **wish-1002**: API Endpoints (provides useAddToWishlistMutation hook)

## Acceptance Criteria

1. ⬜ Route `/wishlist/add` configured
2. ⬜ Form to enter item details
3. ⬜ Store selection (LEGO, Barweer, Other)
4. ⬜ Image upload support (uses existing S3 upload infrastructure)
5. ⬜ Price and source fields
6. ⬜ Priority selection (0-5 scale)
7. ⬜ Success redirects to wishlist gallery

## Tasks / Subtasks

- [ ] **Task 1: Create Add Route**
  - [ ] Create `routes/wishlist/add.tsx`
  - [ ] Configure route with lazy loading

- [ ] **Task 2: Add Item Form**
  - [ ] Store selection (LEGO, Barweer, Other)
  - [ ] Title input (required)
  - [ ] Set number input
  - [ ] Piece count input
  - [ ] Tags input (chip-style)
  - [ ] Price and currency
  - [ ] Source URL
  - [ ] Priority selector (0-5)
  - [ ] Notes textarea

- [ ] **Task 3: Image Upload**
  - [ ] Use existing S3 presigned URL infrastructure
  - [ ] Single image upload (imageUrl field)
  - [ ] Image preview with remove option
  - [ ] Upload progress indicator

- [ ] **Task 4: Form Submission**
  - [ ] Validation with CreateWishlistItemSchema from wish-1004
  - [ ] Submit via useAddToWishlistMutation
  - [ ] Success toast and redirect to /wishlist

## Dev Notes

### Page Component

```typescript
// routes/wishlist/add.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateWishlistItemSchema } from '@repo/api-client/schemas/wishlist'
import { useAddToWishlistMutation } from '@repo/api-client/rtk/wishlist-api'
import { z } from 'zod'

export const Route = createFileRoute('/wishlist/add')({
  component: AddWishlistItemPage,
})

// Extend the API schema with form-specific fields
const AddWishlistFormSchema = CreateWishlistItemSchema.extend({
  // imageFile is handled separately, not part of API request
})

type AddWishlistFormData = z.infer<typeof AddWishlistFormSchema>

const STORES = ['LEGO', 'Barweer', 'Cata', 'Other'] as const
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'] as const

function AddWishlistItemPage() {
  const navigate = useNavigate()
  const [addToWishlist, { isLoading }] = useAddToWishlistMutation()
  const { toast } = useToast()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const form = useForm<AddWishlistFormData>({
    resolver: zodResolver(AddWishlistFormSchema),
    defaultValues: {
      store: 'LEGO',
      priority: 0,
      currency: 'USD',
      tags: [],
    },
  })

  const onSubmit = async (data: AddWishlistFormData) => {
    try {
      // If there's an image, upload it first via presigned URL
      let imageUrl: string | undefined
      if (imageFile) {
        // Use existing S3 presigned URL infrastructure
        // Similar to MOC instruction upload flow
        imageUrl = await uploadImageToS3(imageFile)
      }

      await addToWishlist({ ...data, imageUrl }).unwrap()

      toast({ title: 'Success', description: 'Item added to wishlist' })
      navigate({ to: '/wishlist' })
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add item', variant: 'destructive' })
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/wishlist' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add to Wishlist</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Store Selection */}
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
                    {STORES.map((store) => (
                      <SelectItem key={store} value={store}>{store}</SelectItem>
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

          {/* Set Number */}
          <FormField
            control={form.control}
            name="setNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Set Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 10305" {...field} />
                </FormControl>
                <FormDescription>Official set number (if applicable)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Piece Count */}
          <FormField
            control={form.control}
            name="pieceCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Piece Count</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 2500"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price & Currency Row */}
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
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
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
                <FormLabel>Priority (0-5)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(parseInt(v))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
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

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUploadField
              file={imageFile}
              preview={imagePreview}
              onFileChange={(file) => {
                setImageFile(file)
                if (file) {
                  setImagePreview(URL.createObjectURL(file))
                } else {
                  setImagePreview(null)
                }
              }}
              onRemove={() => {
                setImageFile(null)
                setImagePreview(null)
              }}
            />
            <FormDescription>
              Upload a product image (optional)
            </FormDescription>
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
                <FormDescription>Link to the product page</FormDescription>
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
                    placeholder="Any additional notes..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate({ to: '/wishlist' })}>
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
```

### ImageUploadField Component

The `ImageUploadField` is a simple component for single image uploads:

```typescript
// routes/wishlist/-components/ImageUploadField.tsx
// Or reuse from existing upload infrastructure if available

interface ImageUploadFieldProps {
  file: File | null
  preview: string | null
  onFileChange: (file: File | null) => void
  onRemove: () => void
}

function ImageUploadField({ file, preview, onFileChange, onRemove }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="border-2 border-dashed rounded-lg p-4">
      {preview ? (
        <div className="relative w-32 h-32">
          <img src={preview} alt="Preview" className="w-full h-full object-cover rounded" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-4 cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Click to upload image</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
```

### S3 Upload Helper

```typescript
// Reuse existing S3 upload infrastructure from MOC instructions
// See existing presign endpoint implementation

async function uploadImageToS3(file: File): Promise<string> {
  // 1. Get presigned URL from API
  const { presignedUrl, imageUrl } = await getPresignedUrl({
    filename: file.name,
    contentType: file.type,
  })

  // 2. Upload directly to S3
  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })

  return imageUrl
}
```

## Testing

- [ ] Form validates required fields (title, store)
- [ ] Store selector shows all options
- [ ] Image can be uploaded and previewed
- [ ] Image can be removed before submission
- [ ] Form submits successfully with image
- [ ] Form submits successfully without image
- [ ] Success redirects to wishlist gallery
- [ ] Error toast on failure

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
