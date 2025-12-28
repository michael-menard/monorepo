# Story wish-2002: Add Item Flow

## GitHub Issue

- Issue: #TBD
- URL: https://github.com/michael-menard/monorepo/issues/TBD
- Status: Todo

## Status

Approved

## Consolidates

- wish-1002: Wishlist API Endpoints (create endpoint)
- wish-1003: Wishlist Add Item Page

## Story

**As a** user,
**I want** to add items to my wishlist,
**so that** I can track LEGO sets and instructions I want to purchase.

## Epic Context

This is **Story 2 of Epic 6: Wishlist Gallery**.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- CRUD Operations > Create
- User Interface > Add Modal
- Scraper Service (future - MVP is manual entry)

## Blocked By

- wish-2000: Database Schema & Shared Types
- wish-2001: Wishlist Gallery MVP

## Dependencies

- **wish-2000**: Database Schema & Shared Types (Zod schemas in `@repo/api-client/schemas/wishlist`)
- **wish-2001**: Wishlist Gallery MVP (provides navigation target)

## Technical Requirements

### Type System

- **All types must be derived from Zod schemas** using `z.infer<>`
- **NO TypeScript interfaces** - use Zod schemas exclusively for runtime validation
- Shared schemas live in `@repo/api-client/schemas/wishlist.ts`

### Form Architecture

- **react-hook-form** with `zodResolver` for all forms
- Validation mode: `mode: 'onChange'` for real-time feedback
- Submit button disabled when form invalid

### Target Application

- **app-wishlist-gallery** (`apps/web/app-wishlist-gallery/`) - standalone app
- Route: `/add` within the wishlist app context

## UX Requirements

### Form Layout & Flow

- **Progressive disclosure**: Group fields logically - Essential (store, title) → Details (set number, pieces, price) → Media (image) → Notes
- **Visual hierarchy**: Required fields prominently marked, optional fields visually de-emphasized
- **Mobile-first**: Single column layout, touch-friendly tap targets (min 44x44px)

### Interaction Design

- **Autofocus**: Title field receives focus on page load
- **Tab order**: Logical keyboard navigation through all form fields
- **Sticky footer**: Submit/Cancel buttons fixed at bottom on mobile for easy thumb access

### Feedback & States

- **Real-time validation**: Inline errors appear as user leaves field (onBlur), not while typing
- **Character counts**: Show for title (if max length) and notes fields
- **Loading states**:
  - Image upload: Progress bar with percentage
  - Form submit: Button shows spinner, form fields disabled
- **Success celebration**: Brief success animation before redirect (confetti optional)

### Error Handling UX

- **Validation errors**: Scroll to first error, focus the field, shake animation
- **API errors**: Toast notification with retry option for transient failures
- **Network offline**: Detect and show banner, disable submit until reconnected

### Accessibility (WCAG 2.1 AA)

- All form fields have visible labels (not just placeholders)
- Error messages linked to fields via `aria-describedby`
- Focus visible on all interactive elements
- Color is not the only indicator of required/error state
- Image upload has keyboard-accessible alternative

### Empty & Edge States

- **Image upload area**: Drag-and-drop support with visual feedback
- **Store "Other"**: Show text input for custom store name
- **Price without currency**: Default to USD, show currency symbol in input

## Acceptance Criteria

### API Endpoint

1. POST /api/wishlist creates new item
2. Request validated with `CreateWishlistItemSchema` (Zod)
3. Returns created item parsed with `WishlistItemSchema`
4. sortOrder auto-assigned (max + 1)
5. Handles image URL from S3

### Add Page

6. Route configured in `app-wishlist-gallery/src/pages/AddPage.tsx`
7. Form uses react-hook-form + zodResolver with `CreateWishlistItemSchema`
8. Store selection (LEGO, Barweer, Cata, BrickLink, Other)
9. All optional fields available (setNumber, price, pieceCount, etc.)
10. Image upload with S3 presigned URL
11. Image preview with remove option
12. Priority selection (0-5 scale)
13. Tags input (chip-style)
14. Notes textarea
15. Success redirects to wishlist gallery
16. Error shows toast notification

### RTK Query Integration

17. `useAddToWishlistMutation` hook available
18. Cache invalidation on success
19. Response validated with `WishlistItemSchema.parse()`

### UX & Accessibility

20. Title field autofocused on page load
21. Keyboard navigation works through entire form
22. All fields have visible labels (not placeholder-only)
23. Error messages use `aria-describedby` for screen readers
24. Image upload supports drag-and-drop
25. Loading states shown during image upload and form submit
26. Success toast shown before redirect

### E2E Tests (Playwright)

27. Feature file: `apps/web/playwright/features/wishlist/add-item.feature`
28. Step definitions: `apps/web/playwright/steps/wishlist-add.steps.ts`
29. API mocking for all endpoints (no real backend calls)
30. Tests cover: happy path, validation errors, API errors, image upload

## Tasks / Subtasks

### Task 1: Create POST Endpoint

- [ ] Create `apps/api/endpoints/wishlist/create/handler.ts`
- [ ] Validate request body with `CreateWishlistItemSchema.parse()`
- [ ] Calculate sortOrder (max existing + 1 for user)
- [ ] Insert into database
- [ ] Return created item validated with `WishlistItemSchema`

### Task 2: Add RTK Query Mutation

- [ ] Add `addToWishlist` mutation to `wishlist-api.ts`
- [ ] Configure request body typed as `CreateWishlistItem` (from Zod)
- [ ] `transformResponse` using `WishlistItemSchema.parse()`
- [ ] Set up cache invalidation (LIST tag)
- [ ] Export `useAddToWishlistMutation` hook

### Task 3: Create Add Page in app-wishlist-gallery

- [ ] Create `apps/web/app-wishlist-gallery/src/pages/AddPage.tsx`
- [ ] Create `apps/web/app-wishlist-gallery/src/pages/AddPage/index.tsx`
- [ ] Configure routing in app-wishlist-gallery's Module.tsx
- [ ] Header with back navigation to gallery

### Task 4: Create Add Item Form (react-hook-form + Zod)

- [ ] Set up `useForm<CreateWishlistItem>` with `zodResolver(CreateWishlistItemSchema)`
- [ ] Use `mode: 'onBlur'` for validation (errors show after leaving field, not while typing)
- [ ] **Field grouping** - organize in logical sections:
  - Essential: Store (required), Title (required, autofocus)
  - Details: Set number, Piece count, Price + Currency (side by side)
  - Priority: 0-5 scale with descriptive labels
  - Media: Image upload (separate section)
  - Additional: Source URL, Tags, Notes
- [ ] Store selection (Select component) - required, with "Other" option for custom store
- [ ] Title input - required, with `autoFocus` prop
- [ ] Set number input (optional)
- [ ] Piece count input (optional, number)
- [ ] Price input with currency symbol prefix, currency selector alongside
- [ ] Priority selector (0-5 scale dropdown with labels: "0 - Unset" through "5 - Must Have")
- [ ] Source URL input (validated as URL by Zod)
- [ ] Notes textarea with character count
- [ ] Tags input component (TagInput with chip UI)
- [ ] Submit button disabled when `!formState.isValid`
- [ ] **Accessibility**: All fields have visible `<label>`, error messages use `aria-describedby`
- [ ] **Keyboard nav**: Logical tab order, Enter submits from any field

### Task 5: Image Upload (Enhanced UX)

- [ ] Create `apps/web/app-wishlist-gallery/src/components/ImageUploadField/index.tsx`
- [ ] **Drag-and-drop**: Support file drop with visual feedback (border highlight, "Drop here" text)
- [ ] **Click to upload**: Click anywhere in drop zone to open file picker
- [ ] **Keyboard accessible**: Focusable drop zone, Enter/Space to trigger file picker
- [ ] Use existing S3 presigned URL infrastructure
- [ ] **Progress indicator**: Show progress bar with percentage during upload
- [ ] **Image preview**: Show thumbnail after selection, before upload completes
- [ ] **Remove button**: X button on preview to clear selection
- [ ] **File validation**: Client-side check for image types (jpg, png, webp), max size 5MB
- [ ] **Error states**: Show inline error for invalid file type/size
- [ ] Add `data-testid="image-upload"` and `data-testid="image-preview"` for E2E tests

### Task 6: Form Submission (UX Polish)

- [ ] Submit via `useAddToWishlistMutation`
- [ ] **Loading state**: Spinner in button, all form fields disabled during submit
- [ ] Upload image first if present (with its own progress state)
- [ ] **Validation error handling**:
  - Scroll to first error field
  - Focus the error field
  - Subtle shake animation on error fields
- [ ] **Success flow**:
  - Success toast with item title ("Added 'Medieval Castle' to wishlist")
  - Brief delay (300ms) then redirect to gallery
- [ ] **Error handling**:
  - Toast with descriptive error message
  - Retry button for network/server errors
  - Keep form data intact on failure
- [ ] **Unsaved changes guard**: Warn user if navigating away with unsaved data

### Task 7: E2E Tests with API Mocking

- [ ] Create `apps/web/playwright/features/wishlist/add-item.feature`
- [ ] Create `apps/web/playwright/steps/wishlist-add.steps.ts`
- [ ] Create `apps/web/playwright/steps/pages/wishlist-add.page.ts` (Page Object)
- [ ] Add wishlist API mocks to `apps/web/playwright/utils/api-mocks.ts`
- [ ] Test scenarios:
  - [ ] Happy path: fill form, submit, verify redirect
  - [ ] Validation errors: empty required fields
  - [ ] API error handling: 500, 401, 400
  - [ ] Image upload flow with mocked S3

## Dev Notes

### API Handler

```typescript
// apps/api/endpoints/wishlist/create/handler.ts
import { APIGatewayProxyEvent } from 'aws-lambda'
import { db } from '@/database'
import { wishlistItems } from '@/database/schema/wishlist'
import {
  CreateWishlistItemSchema,
  WishlistItemSchema,
} from '@repo/api-client/schemas/wishlist'
import { getUserIdFromEvent } from '@/utils/auth'
import { eq, max } from 'drizzle-orm'

export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = getUserIdFromEvent(event)

  // Zod validation - throws on invalid input
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

  // Validate response matches expected schema
  return {
    statusCode: 201,
    body: JSON.stringify(WishlistItemSchema.parse(newItem)),
  }
}
```

### RTK Query Mutation

```typescript
// Add to packages/core/api-client/src/rtk/wishlist-api.ts
import {
  CreateWishlistItemSchema,
  WishlistItemSchema,
  type CreateWishlistItem,
  type WishlistItem,
} from '../schemas/wishlist'

// In endpoints:
addToWishlist: builder.mutation<WishlistItem, CreateWishlistItem>({
  query: (data) => ({
    url: '/wishlist',
    method: 'POST',
    body: data,
  }),
  // Runtime validation of API response
  transformResponse: (response: unknown) => WishlistItemSchema.parse(response),
  invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
}),

// Export hook
export const { useAddToWishlistMutation } = wishlistApi
```

### Add Page Component (app-wishlist-gallery)

```typescript
// apps/web/app-wishlist-gallery/src/pages/AddPage/index.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CreateWishlistItemSchema,
  WishlistStoreSchema,
  CurrencySchema,
  type CreateWishlistItem,
} from '@repo/api-client/schemas/wishlist'
import { useAddToWishlistMutation } from '@repo/api-client/rtk/wishlist-api'
import {
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
} from '@repo/ui'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@repo/ui/hooks/use-toast'
import { ImageUploadField } from '../../components/ImageUploadField'
import { uploadImageToS3 } from '../../utils/uploadImage'

// Derive stores and currencies from Zod schemas
const STORES = WishlistStoreSchema.options
const CURRENCIES = CurrencySchema.options

export function AddPage() {
  const navigate = useNavigate()
  const [addToWishlist, { isLoading }] = useAddToWishlistMutation()
  const { toast } = useToast()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // react-hook-form with Zod resolver
  const form = useForm<CreateWishlistItem>({
    resolver: zodResolver(CreateWishlistItemSchema),
    mode: 'onChange', // Real-time validation
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
      navigate('/') // Back to gallery
    } catch {
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
        <Button variant="ghost" onClick={() => navigate('/')}>
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
                    onChange={e =>
                      field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                    }
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
                    <Input type="text" placeholder="e.g., 199.99" {...field} />
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
                  onValueChange={v => field.onChange(parseInt(v))}
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
              onFileChange={file => {
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
                  <Input type="url" placeholder="https://www.lego.com/product/..." {...field} />
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

          {/* Submit - disabled when form invalid */}
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !form.formState.isValid}>
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

### ImageUploadField Component (Zod Props Schema)

```typescript
// apps/web/app-wishlist-gallery/src/components/ImageUploadField/index.tsx
import { useRef } from 'react'
import { z } from 'zod'
import { Button } from '@repo/ui'
import { Upload, X } from 'lucide-react'

// Zod schema for component props
const ImageUploadFieldPropsSchema = z.object({
  file: z.instanceof(File).nullable(),
  preview: z.string().nullable(),
  onFileChange: z.function().args(z.instanceof(File).nullable()).returns(z.void()),
  onRemove: z.function().returns(z.void()),
})

type ImageUploadFieldProps = z.infer<typeof ImageUploadFieldPropsSchema>

export function ImageUploadField({ preview, onFileChange, onRemove }: ImageUploadFieldProps) {
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
        onChange={e => onFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
```

### S3 Upload Helper

```typescript
// apps/web/app-wishlist-gallery/src/utils/uploadImage.ts
import { z } from 'zod'

// Zod schema for presign response
const PresignResponseSchema = z.object({
  presignedUrl: z.string().url(),
  imageUrl: z.string().url(),
})

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

  const data = PresignResponseSchema.parse(await response.json())

  // 2. Upload directly to S3
  await fetch(data.presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })

  return data.imageUrl
}
```

### Route Structure (app-wishlist-gallery)

```
apps/web/app-wishlist-gallery/src/
  pages/
    AddPage/
      index.tsx              # Add page component
      __tests__/
        AddPage.test.tsx     # Unit tests
  components/
    ImageUploadField/
      index.tsx              # Image upload component
  utils/
    uploadImage.ts           # S3 upload helper
```

## Testing

### API Tests (Vitest)

- [ ] POST /api/wishlist creates item with valid data
- [ ] POST /api/wishlist returns 400 for invalid data (Zod validation)
- [ ] POST /api/wishlist sets correct sortOrder
- [ ] Created item validated with `WishlistItemSchema`

### Component Tests (Vitest + React Testing Library)

- [ ] Form validates required fields (title, store) via Zod
- [ ] Form allows optional fields to be empty
- [ ] Store selector shows all `WishlistStoreSchema.options`
- [ ] Priority selector shows 0-5 options
- [ ] Image upload shows preview
- [ ] Image can be removed before submission
- [ ] Submit button disabled when `!formState.isValid`

### E2E Tests (Playwright with API Mocking)

#### Feature File: `apps/web/playwright/features/wishlist/add-item.feature`

```gherkin
Feature: Add Wishlist Item
  As a user
  I want to add items to my wishlist
  So that I can track LEGO sets I want to purchase

  Background:
    Given I am logged in
    And the wishlist API is mocked

  Scenario: Successfully add item with required fields only
    Given I am on the add wishlist item page
    When I select store "LEGO"
    And I fill in title "Medieval Castle"
    And I click the "Add to Wishlist" button
    Then I should see a success toast
    And I should be redirected to the wishlist gallery

  Scenario: Successfully add item with all fields
    Given I am on the add wishlist item page
    When I select store "Barweer"
    And I fill in title "Custom Spaceship"
    And I fill in set number "MOC-12345"
    And I fill in price "49.99"
    And I select currency "EUR"
    And I fill in piece count "1500"
    And I select priority "4"
    And I fill in source URL "https://example.com/spaceship"
    And I fill in notes "Wait for sale"
    And I click the "Add to Wishlist" button
    Then I should see a success toast
    And I should be redirected to the wishlist gallery

  Scenario: Form validation prevents submission without required fields
    Given I am on the add wishlist item page
    When I clear the title field
    Then the "Add to Wishlist" button should be disabled

  Scenario: API error shows error toast
    Given I am on the add wishlist item page
    And the API will return a 500 error
    When I select store "LEGO"
    And I fill in title "Test Item"
    And I click the "Add to Wishlist" button
    Then I should see an error toast

  Scenario: Upload image with item
    Given I am on the add wishlist item page
    And the S3 presign API is mocked
    When I select store "LEGO"
    And I fill in title "Castle with Image"
    And I upload an image
    Then I should see the image preview
    When I click the "Add to Wishlist" button
    Then I should see a success toast
```

#### Page Object: `apps/web/playwright/steps/pages/wishlist-add.page.ts`

```typescript
import type { Page, Locator } from '@playwright/test'

export class WishlistAddPage {
  readonly page: Page
  readonly storeSelect: Locator
  readonly titleInput: Locator
  readonly setNumberInput: Locator
  readonly priceInput: Locator
  readonly currencySelect: Locator
  readonly pieceCountInput: Locator
  readonly prioritySelect: Locator
  readonly sourceUrlInput: Locator
  readonly notesTextarea: Locator
  readonly imageUpload: Locator
  readonly imagePreview: Locator
  readonly submitButton: Locator
  readonly successToast: Locator
  readonly errorToast: Locator

  constructor(page: Page) {
    this.page = page
    this.storeSelect = page.getByLabel('Store')
    this.titleInput = page.getByLabel('Title')
    this.setNumberInput = page.getByLabel('Set Number')
    this.priceInput = page.getByLabel('Price')
    this.currencySelect = page.getByLabel('Currency')
    this.pieceCountInput = page.getByLabel('Piece Count')
    this.prioritySelect = page.getByLabel('Priority')
    this.sourceUrlInput = page.getByLabel('Source URL')
    this.notesTextarea = page.getByLabel('Notes')
    this.imageUpload = page.locator('[data-testid="image-upload"]')
    this.imagePreview = page.locator('[data-testid="image-preview"]')
    this.submitButton = page.getByRole('button', { name: /add to wishlist/i })
    this.successToast = page.getByText('Item added to wishlist')
    this.errorToast = page.getByText('Failed to add item')
  }

  async goto() {
    await this.page.goto('/add')
  }

  async selectStore(store: string) {
    await this.storeSelect.click()
    await this.page.getByRole('option', { name: store }).click()
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title)
  }

  async fillCompleteForm(data: {
    store: string
    title: string
    setNumber?: string
    price?: string
    currency?: string
    pieceCount?: string
    priority?: string
    sourceUrl?: string
    notes?: string
  }) {
    await this.selectStore(data.store)
    await this.fillTitle(data.title)
    if (data.setNumber) await this.setNumberInput.fill(data.setNumber)
    if (data.price) await this.priceInput.fill(data.price)
    if (data.currency) {
      await this.currencySelect.click()
      await this.page.getByRole('option', { name: data.currency }).click()
    }
    if (data.pieceCount) await this.pieceCountInput.fill(data.pieceCount)
    if (data.priority) {
      await this.prioritySelect.click()
      await this.page.getByRole('option', { name: new RegExp(data.priority) }).click()
    }
    if (data.sourceUrl) await this.sourceUrlInput.fill(data.sourceUrl)
    if (data.notes) await this.notesTextarea.fill(data.notes)
  }

  async submit() {
    await this.submitButton.click()
  }
}
```

#### API Mocks: Add to `apps/web/playwright/utils/api-mocks.ts`

```typescript
// Add wishlist API mocks
export async function setupWishlistMocks(
  page: Page,
  options: {
    createError?: 'server' | 'validation' | 'auth'
  } = {},
) {
  // Mock create wishlist item
  await page.route('**/api/wishlist', async (route: Route) => {
    if (route.request().method() === 'POST') {
      switch (options.createError) {
        case 'server':
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'INTERNAL_ERROR' }),
          })
          break
        case 'validation':
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'VALIDATION_ERROR', message: 'Invalid data' }),
          })
          break
        case 'auth':
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'UNAUTHORIZED' }),
          })
          break
        default: {
          const body = JSON.parse((await route.request().postData()) || '{}')
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: `wishlist-${Date.now()}`,
              userId: 'test-user-id',
              ...body,
              sortOrder: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          })
        }
      }
    } else {
      await route.continue()
    }
  })

  // Mock S3 presign for image upload
  await page.route('**/api/presign', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        presignedUrl: 'https://mock-s3.example.com/upload',
        imageUrl: 'https://mock-s3.example.com/wishlist/image.jpg',
      }),
    })
  })

  // Mock S3 upload
  await page.route('**/mock-s3.example.com/**', async (route: Route) => {
    await route.fulfill({ status: 200 })
  })
}
```

## Definition of Done

- [ ] POST endpoint creates items correctly with Zod validation
- [ ] Form uses react-hook-form + zodResolver for all validation
- [ ] All types derived from Zod schemas (no TypeScript interfaces)
- [ ] Image upload works with S3 (drag-and-drop + click)
- [ ] RTK Query cache invalidates on success
- [ ] Component lives in `app-wishlist-gallery` (standalone app)
- [ ] **UX requirements met**:
  - [ ] Title field autofocused on load
  - [ ] Keyboard navigation works throughout
  - [ ] Loading states for upload and submit
  - [ ] Error handling with scroll-to-error
  - [ ] Success toast before redirect
- [ ] **Accessibility (WCAG 2.1 AA)**:
  - [ ] All fields have visible labels
  - [ ] Error messages linked via aria-describedby
  - [ ] Focus visible on all interactive elements
- [ ] Unit tests pass (Vitest)
- [ ] E2E tests pass with API mocking (Playwright)
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1002 (create), wish-1003 | Claude   |
| 2025-12-27 | 0.3     | Updated: Zod-only types, app-wishlist-gallery target, react-hook-form + zodResolver, E2E tests with API mocking | Bob (SM) |
| 2025-12-27 | 0.4     | Added GitHub Issue section, Epic Context, and Blocked By sections | Bob (SM) |
| 2025-12-27 | 0.5     | **UX Review**: Added UX Requirements section (form layout, interactions, feedback states, a11y). Enhanced Tasks 4-6 with detailed UX specs. Added UX & Accessibility acceptance criteria (AC 20-26). Updated Definition of Done with UX/a11y checkboxes. | Sally (UX) |
| 2025-12-27 | 0.6     | **Story Checklist Validation**: PASS on all 5 categories. Status changed to Approved. | Bob (SM) |
