# Story wish-2002: Add Item Flow

## Status

In Progress

## Consolidates

- wish-1002: Wishlist API Endpoints (create endpoint)
- wish-1003: Wishlist Add Item Page

## Story

**As a** user,
**I want** to add items to my wishlist,
**so that** I can track LEGO sets and instructions I want to purchase.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- CRUD Operations > Create
- User Interface > Add Modal
- Scraper Service (future - MVP is manual entry)

## Dependencies

- **wish-2000**: Database Schema & Shared Types
- **wish-2001**: Wishlist Gallery MVP (provides navigation target)

## Acceptance Criteria

### API Endpoint

1. POST /api/wishlist creates new item
2. Request validated with CreateWishlistItemSchema
3. Returns created item with ID
4. sortOrder auto-assigned (max + 1)
5. Handles image URL from S3

### Add Page

6. Route `/wishlist/add` configured
7. Form validates required fields (title, store)
8. Store selection (LEGO, Barweer, Cata, Other)
9. All optional fields available (setNumber, price, pieceCount, etc.)
10. Image upload with S3 presigned URL
11. Image preview with remove option
12. Priority selection (0-5 scale)
13. Tags input (chip-style)
14. Notes textarea
15. Success redirects to wishlist gallery
16. Error shows toast notification

### RTK Query Integration

17. useAddToWishlistMutation hook available
18. Cache invalidation on success

## Tasks / Subtasks

### Task 1: Create POST Endpoint

- [ ] Create `apps/api/endpoints/wishlist/create/handler.ts`
- [ ] Validate request body with CreateWishlistItemSchema
- [ ] Calculate sortOrder (max existing + 1 for user)
- [ ] Insert into database
- [ ] Return created item

### Task 2: Add RTK Query Mutation

- [ ] Add `addToWishlist` mutation to wishlist-api.ts
- [ ] Configure request body
- [ ] Set up cache invalidation (LIST tag)
- [ ] Export `useAddToWishlistMutation` hook

### Task 3: Create Add Page Route

- [ ] Create `apps/web/app-wishlist-gallery/src/routes/add.tsx`
- [ ] Configure TanStack Router file-based route
- [ ] Add lazy loading
- [ ] Header with back navigation

### Task 4: Create Add Item Form

- [ ] Set up react-hook-form with zodResolver
- [ ] Store selection (Select component)
- [ ] Title input (required)
- [ ] Set number input (optional)
- [ ] Piece count input (optional, number)
- [ ] Price and currency inputs (side by side)
- [ ] Priority selector (0-5 scale dropdown)
- [ ] Source URL input
- [ ] Notes textarea
- [ ] Tags input component

### Task 5: Image Upload

- [ ] Create `apps/web/app-wishlist-gallery/src/components/ImageUploadField/index.tsx`
- [ ] Use existing S3 presigned URL infrastructure
- [ ] Show upload progress
- [ ] Image preview after upload
- [ ] Remove image button
- [ ] Handle upload errors

### Task 6: Form Submission

- [ ] Submit via useAddToWishlistMutation
- [ ] Show loading state on submit button
- [ ] Upload image first if present
- [ ] Handle validation errors inline
- [ ] Success toast and redirect to /wishlist
- [ ] Error toast on failure

### Task 7: Storybook Stories

- [ ] Create `apps/web/app-wishlist-gallery/src/components/ImageUploadField/__stories__/ImageUploadField.stories.tsx`
  - [ ] Default empty state
  - [ ] With preview image
  - [ ] Upload in progress state
  - [ ] Error state
- [ ] Create `apps/web/app-wishlist-gallery/src/routes/__stories__/AddItemPage.stories.tsx`
  - [ ] Empty form
  - [ ] Form with validation errors
  - [ ] Form submitting state

## Dev Notes

### API Handler

```typescript
// apps/api/endpoints/wishlist/create/handler.ts
import { APIGatewayProxyEvent } from 'aws-lambda'
import { db } from '@/database'
import { wishlistItems } from '@/database/schema/wishlist'
import { CreateWishlistItemSchema } from '@repo/api-client/schemas/wishlist'
import { getUserIdFromEvent } from '@/utils/auth'
import { eq, max } from 'drizzle-orm'

export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = getUserIdFromEvent(event)
  const body = CreateWishlistItemSchema.parse(JSON.parse(event.body!))

  // Get max sortOrder for this user
  const maxSortResult = await db
    .select({ maxSort: max(wishlistItems.sortOrder) })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))

  const nextSortOrder = (maxSortResult[0]?.maxSort ?? -1) + 1

  const [newItem] = await db
    .insert(wishlistItems)
    .values({
      ...body,
      userId,
      sortOrder: nextSortOrder,
      sourceUrl: body.sourceUrl || null,
      tags: body.tags || [],
    })
    .returning()

  return {
    statusCode: 201,
    body: JSON.stringify(newItem),
  }
}
```

### RTK Query Mutation

```typescript
// Add to wishlist-api.ts
addToWishlist: builder.mutation<WishlistItem, CreateWishlistItem>({
  query: (data) => ({
    url: '/wishlist',
    method: 'POST',
    body: data,
  }),
  transformResponse: (response) => WishlistItemSchema.parse(response),
  invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
}),

// Export hook
export const { useAddToWishlistMutation } = wishlistApi
```

### Add Page Component

```typescript
// apps/web/app-wishlist-gallery/src/routes/add.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateWishlistItemSchema, CreateWishlistItem } from '@repo/api-client/schemas/wishlist'
import { useAddToWishlistMutation } from '@repo/api-client/rtk/wishlist-api'
import {
  Button, Form, FormControl, FormDescription, FormField, FormItem,
  FormLabel, FormMessage, Input, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Textarea,
} from '@repo/ui'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@repo/ui/hooks/use-toast'
import { ImageUploadField } from './-components/ImageUploadField'

export const Route = createFileRoute('/wishlist/add')({
  component: AddWishlistItemPage,
})

const STORES = ['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'] as const
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

function AddWishlistItemPage() {
  const navigate = useNavigate()
  const [addToWishlist, { isLoading }] = useAddToWishlistMutation()
  const { toast } = useToast()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const form = useForm<CreateWishlistItem>({
    resolver: zodResolver(CreateWishlistItemSchema),
    defaultValues: {
      store: 'LEGO',
      priority: 0,
      currency: 'USD',
      tags: [],
    },
  })

  const onSubmit = async (data: CreateWishlistItem) => {
    try {
      // If there's an image, upload it first
      let imageUrl: string | undefined
      if (imageFile) {
        imageUrl = await uploadImageToS3(imageFile)
      }

      await addToWishlist({ ...data, imageUrl }).unwrap()

      toast({
        title: 'Success',
        description: 'Item added to wishlist',
      })
      navigate({ to: '/wishlist' })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add item to wishlist',
        variant: 'destructive',
      })
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
                <FormLabel>Priority</FormLabel>
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
            <FormLabel>Image</FormLabel>
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
            <FormDescription>Upload a product image (optional)</FormDescription>
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
                    placeholder="Any additional notes (e.g., wait for sale)..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/wishlist' })}
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
```

### ImageUploadField Component

```typescript
// apps/web/app-wishlist-gallery/src/components/ImageUploadField/index.tsx
import { useRef } from 'react'
import { Button } from '@repo/ui'
import { Upload, X } from 'lucide-react'

interface ImageUploadFieldProps {
  file: File | null
  preview: string | null
  onFileChange: (file: File | null) => void
  onRemove: () => void
}

export function ImageUploadField({ file, preview, onFileChange, onRemove }: ImageUploadFieldProps) {
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
          className="flex flex-col items-center justify-center py-4 cursor-pointer hover:bg-muted/50 transition-colors"
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
// utils/uploadImage.ts
// Reuse existing S3 presigned URL infrastructure
export async function uploadImageToS3(file: File): Promise<string> {
  // 1. Get presigned URL from API
  const response = await fetch('/api/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      folder: 'wishlist',
    }),
  })
  const { presignedUrl, imageUrl } = await response.json()

  // 2. Upload directly to S3
  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })

  return imageUrl
}
```

### Route Structure

```
apps/web/app-wishlist-gallery/src/
  routes/
    add.tsx                     # Add page
  components/
    ImageUploadField/
      index.tsx                 # Reusable image upload
      __tests__/
        ImageUploadField.test.tsx
      __stories__/
        ImageUploadField.stories.tsx
```

## Testing

### API Tests

- [ ] POST /api/wishlist creates item with valid data
- [ ] POST /api/wishlist returns 400 for invalid data
- [ ] POST /api/wishlist sets correct sortOrder
- [ ] Created item includes all submitted fields

### Component Tests

- [ ] Form validates required fields (title, store)
- [ ] Form allows optional fields to be empty
- [ ] Store selector shows all options
- [ ] Priority selector shows 0-5 options
- [ ] Image upload shows preview
- [ ] Image can be removed before submission

### Integration Tests

- [ ] Form submits successfully with image
- [ ] Form submits successfully without image
- [ ] Success redirects to wishlist gallery
- [ ] New item appears in gallery after redirect
- [ ] Error toast shows on API failure

### Playwright E2E Tests (Mocked APIs)

- [ ] Create `apps/web/playwright/e2e/wishlist/add-item.spec.ts`
- [ ] Happy path: Fill form and submit successfully
- [ ] Validation: Required field errors display
- [ ] Image upload: Preview displays after file selection
- [ ] API error: Toast displays on submission failure
- [ ] Navigation: Cancel returns to gallery
- [ ] Navigation: Success redirects to gallery with new item

## Definition of Done

- [ ] POST endpoint creates items correctly
- [ ] Form validates all inputs
- [ ] Image upload works with S3
- [ ] RTK Query cache invalidates on success
- [ ] All unit/component tests pass
- [ ] Storybook stories created for custom components
- [ ] Playwright E2E tests pass with mocked APIs
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1002 (create), wish-1003 | Claude   |

## QA Results

### Review Date: 2025-12-28

### Reviewed By: Quinn (Test Architect)

### CodeRabbit Analysis

**Source:** N/A (Local review) | **Status:** Skipped

### Code Quality Assessment

**Overall: Good** - Implementation follows project patterns with proper Zod schema usage, @repo/app-component-library imports, functional components, and comprehensive test coverage (50 tests). Code is well-structured with appropriate separation of concerns.

**Strengths:**
- Proper use of Zod schemas for props validation (`AddItemPagePropsSchema`, `ImageUploadFieldPropsSchema`)
- Good memoization with `useCallback` for event handlers
- Comprehensive error handling with toast notifications
- Full accessibility support (ARIA labels, keyboard navigation, form labels)
- 35 new tests (16 ImageUploadField + 19 AddItemPage)

### Refactoring Performed

None - code quality is acceptable for this phase.

### Compliance Check

- Coding Standards: ✓ Follows project patterns (Zod, functional components, @repo/ui)
- Project Structure: ✓ Correct directory structure with __tests__ folders
- Testing Strategy: ✓ Component and unit tests present (50 total)
- All ACs Met: ✗ AC 10 (S3 upload) and AC 13 (Tags UI) incomplete

### Improvements Checklist

- [x] API handler with sortOrder calculation
- [x] RTK Query mutation with cache invalidation
- [x] Form with react-hook-form + Zod validation
- [x] ImageUploadField component with drag-drop
- [x] Route configuration with auth guard
- [x] 50 tests passing
- [ ] AC 10: Implement S3 presigned URL upload (has TODO placeholder)
- [ ] AC 13: Add Tags input component (chip-style UI)
- [ ] Task 7: Create Storybook stories for components

### Security Review

**PASS** - Authentication check present in handler (`getUserIdFromEvent`), Zod validation on all inputs, no injection vulnerabilities detected.

### Performance Considerations

**PASS** - Cache invalidation properly configured via RTK Query tags, useCallback hooks for memoization, no N+1 patterns.

### Files Modified During Review

None.

### Gate Status

**Gate: CONCERNS** → docs/qa/gates/wish-2002-add-item-flow.yml

**Issues:**
| ID | Severity | Description |
|----|----------|-------------|
| FEAT-001 | Medium | S3 image upload not implemented (TODO placeholder) |
| FEAT-002 | Medium | Tags input UI not implemented |
| TEST-001 | Low | Storybook stories missing |

### Recommended Status

**✗ Changes Required** - Two acceptance criteria are incomplete (AC 10, AC 13). Either:
1. Implement the missing features, OR
2. Split into separate stories and update AC scope

(Story owner decides final status)
