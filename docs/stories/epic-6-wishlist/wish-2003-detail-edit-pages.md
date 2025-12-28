# Story wish-2003: Detail & Edit Pages

## GitHub Issue

- Issue: #TBD
- URL: https://github.com/michael-menard/monorepo/issues/TBD
- Status: Todo

## Status

Approved

## Consolidates

- wish-1002: Wishlist API Endpoints (update endpoint)
- wish-1006: Wishlist Detail Page
- wish-1007: Wishlist Edit Page

## Story

**As a** user,
**I want** to view and edit wishlist item details,
**so that** I can see full information and update items as needed.

## Epic Context

This is **Story 3 of Epic 6: Wishlist Gallery**.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- CRUD Operations > Read, Update
- User Interface > Detail View

## Blocked By

- wish-2000: Database Schema & Shared Types (Zod schemas must exist)
- wish-2001: Wishlist Gallery MVP (provides navigation context)
- wish-2002: Add Item Flow (reuse form components)

## Dependencies

- **wish-2000**: Database Schema & Shared Types
- **wish-2001**: Wishlist Gallery MVP (provides navigation context)
- **wish-2002**: Add Item Flow (reuse form components)

## Technical Requirements

### Type System

- **All types must be derived from Zod schemas** using `z.infer<>`
- **NO TypeScript interfaces** - use Zod schemas exclusively for runtime validation
- Shared schemas live in `@repo/api-client/schemas/wishlist.ts`

### Form Architecture

- **react-hook-form** with `zodResolver` for all forms
- Validation mode: `mode: 'onBlur'` for real-time feedback after field exit
- Submit button disabled when form invalid

### Target Application

- **app-wishlist-gallery** (`apps/web/app-wishlist-gallery/`) - standalone app
- Routes: `/wishlist/:id` (detail) and `/wishlist/:id/edit` (edit) within the wishlist app context

## UX Requirements

### Form Layout & Flow

- **Progressive disclosure**: Group fields logically - Essential (title, store) visible first, Details (set number, pieces, price) in expandable section
- **Visual hierarchy**: Required fields prominently marked, optional fields visually de-emphasized
- **Mobile-first**: Single column layout, touch-friendly tap targets (min 44x44px)
- **Responsive detail view**: Image left/details right on desktop, stacked on mobile

### Interaction Design

- **Autofocus**: Title field receives focus on edit page load
- **Tab order**: Logical keyboard navigation through all form fields and action buttons
- **Sticky footer**: Submit/Cancel buttons fixed at bottom on mobile for easy thumb access
- **Detail page actions**: Primary "Got it!" button prominent, Edit/Delete secondary

### Feedback & States

- **Real-time validation**: Inline errors appear as user leaves field (onBlur), not while typing
- **Character counts**: Show for notes field
- **Loading states**:
  - Detail page: Skeleton with image placeholder and text bars
  - Edit page: Form skeleton while fetching item data
  - Image upload: Progress bar with percentage
  - Form submit: Button shows spinner, form fields disabled
- **Success celebration**: Toast notification before redirect

### Error Handling UX

- **Validation errors**: Scroll to first error, focus the field, subtle shake animation
- **API errors**: Toast notification with retry option for transient failures
- **404 handling**: Friendly "Item not found" state with back-to-gallery button
- **Network offline**: Detect and show banner, disable submit until reconnected

### Accessibility (WCAG 2.1 AA)

- All form fields have visible labels (not just placeholders)
- Error messages linked to fields via `aria-describedby`
- Focus visible on all interactive elements (outline ring)
- Color is not the only indicator of required/error state (icons + text)
- Image upload has keyboard-accessible alternative
- Action buttons have descriptive `aria-label` for screen readers
- Detail page metadata uses proper heading hierarchy

### Empty & Edge States

- **No image**: Show package icon placeholder, not broken image
- **No notes**: Hide notes section entirely, don't show empty box
- **Long titles**: Truncate with ellipsis, show full on hover/focus

## Acceptance Criteria

### API Endpoint

1. PATCH /api/wishlist/:id updates item
2. Request validated with UpdateWishlistItemSchema
3. Returns updated item
4. Handles partial updates (only changed fields)
5. Image URL can be updated or cleared

### Detail Page

6. Route `/wishlist/:id` displays item details
7. Shows large product image with fallback
8. Displays all metadata: title, store, price, piece count, release date
9. Shows priority indicator with label
10. Shows notes section (expandable)
11. Shows tags as chips
12. "Got it!" button prominently displayed
13. Edit button navigates to edit page
14. Delete button triggers confirmation (from wish-2004)
15. Back button returns to gallery

### Edit Page

16. Route `/wishlist/:id/edit` loads existing item data
17. Form pre-populated with current values
18. All fields from add form are editable
19. Can update image (upload new or remove existing)
20. Save button updates item via PATCH API
21. Cancel button returns to detail page without saving
22. Success shows toast and navigates to detail page
23. Validation errors displayed inline

### RTK Query Integration

24. useUpdateWishlistItemMutation hook available
25. Cache invalidation on success

### UX & Accessibility

26. Detail page shows skeleton loading state with proper structure
27. Edit page title field autofocused on load
28. Keyboard navigation works through entire form and action buttons
29. All form fields have visible labels (not placeholder-only)
30. Error messages use `aria-describedby` for screen readers
31. Loading states shown during fetch, image upload, and form submit
32. 404 state has clear messaging and back navigation
33. Success toast shown before redirect to detail page
34. Focus visible on all interactive elements

### E2E Tests (Playwright)

35. Feature file: `apps/web/playwright/features/wishlist/detail-edit.feature`
36. Step definitions: `apps/web/playwright/steps/wishlist-detail-edit.steps.ts`
37. API mocking for all endpoints (no real backend calls)
38. Tests cover: detail view, edit happy path, validation errors, 404 handling, image update

## Tasks / Subtasks

### Task 1: Create PATCH Endpoint

- [ ] Create `apps/api/endpoints/wishlist/update/handler.ts`
- [ ] Validate path param (id) is UUID
- [ ] Validate request body with UpdateWishlistItemSchema
- [ ] Verify user owns item
- [ ] Update only provided fields
- [ ] Set updatedAt timestamp
- [ ] Return updated item

### Task 2: Add RTK Query Mutation

- [ ] Add `updateWishlistItem` mutation to wishlist-api.ts
- [ ] Configure request body
- [ ] Set up cache invalidation (item ID + LIST)
- [ ] Export `useUpdateWishlistItemMutation` hook

### Task 3: Create Detail Page (Enhanced UX)

- [ ] Create `apps/web/app-wishlist-gallery/src/pages/DetailPage/index.tsx`
- [ ] Configure route in app routing
- [ ] Fetch item with useGetWishlistItemQuery
- [ ] **Loading state**: Skeleton with image placeholder (aspect-square) and text bars matching layout
- [ ] **Error/404 state**: Friendly message with "Back to Wishlist" button, proper heading
- [ ] **Layout**: Image left, details right on desktop (grid cols-2), stacked on mobile (flex-col)
- [ ] Display all metadata fields with proper hierarchy (h1 for title, sections for metadata)
- [ ] **Action buttons**: Primary "Got it!" button (size="lg"), secondary Edit and Delete (variant="outline")
- [ ] **Accessibility**:
  - Proper heading levels (h1 for title, h2 for sections)
  - Action buttons have `aria-label` attributes
  - Back button has clear text label, not just icon
- [ ] **Keyboard navigation**: Tab through all interactive elements in logical order
- [ ] Add `data-testid` attributes for E2E testing

### Task 4: Create Edit Page (Enhanced UX)

- [ ] Create `apps/web/app-wishlist-gallery/src/pages/EditPage/index.tsx`
- [ ] Fetch existing item data with loading skeleton
- [ ] Initialize form with item values using `useEffect` on item change
- [ ] **Autofocus**: Title field receives focus on page load (`autoFocus` prop)
- [ ] Reuse WishlistFormFields component from add page (wish-2002)
- [ ] **Handle image states**:
  - Show current image with remove (X) button
  - If removed, show upload area
  - If new image selected, show preview with replace option
- [ ] **Form submission**:
  - Submit via useUpdateWishlistItemMutation
  - Spinner in button, all fields disabled during submit
  - Upload new image first if present
- [ ] **Validation errors**:
  - Scroll to first error field
  - Focus the error field
  - Subtle shake animation on error fields
- [ ] **Success flow**:
  - Toast: "Wishlist item updated"
  - Navigate to detail page (`/wishlist/${id}`)
- [ ] **Unsaved changes guard**: Warn user if navigating away with dirty form
- [ ] **Accessibility**:
  - All fields have visible `<label>` elements
  - Error messages linked via `aria-describedby`
  - Focus visible ring on all inputs
- [ ] Add `data-testid` attributes for E2E testing

### Task 5: Shared Components

- [ ] Extract WishlistFormFields component from add page (if not already done in wish-2002)
- [ ] Create PriceDisplay helper component for consistent currency formatting
- [ ] Create PriorityBadge component with color coding and label
- [ ] Ensure all shared components are keyboard accessible

### Task 6: E2E Tests with API Mocking

- [ ] Create `apps/web/playwright/features/wishlist/detail-edit.feature`
- [ ] Create `apps/web/playwright/steps/wishlist-detail-edit.steps.ts`
- [ ] Create `apps/web/playwright/steps/pages/wishlist-detail.page.ts` (Page Object)
- [ ] Create `apps/web/playwright/steps/pages/wishlist-edit.page.ts` (Page Object)
- [ ] Add wishlist detail/update API mocks to `apps/web/playwright/utils/api-mocks.ts`
- [ ] Test scenarios:
  - [ ] Detail page: displays all item information correctly
  - [ ] Detail page: handles 404 gracefully
  - [ ] Detail page: action buttons navigate correctly
  - [ ] Edit page: form loads with existing data
  - [ ] Edit page: validation errors display inline
  - [ ] Edit page: save updates item and redirects
  - [ ] Edit page: cancel returns to detail without saving
  - [ ] Edit page: image can be removed and replaced

## Dev Notes

### API Handler

```typescript
// apps/api/endpoints/wishlist/update/handler.ts
import { APIGatewayProxyEvent } from 'aws-lambda'
import { db } from '@/database'
import { wishlistItems } from '@/database/schema/wishlist'
import { UpdateWishlistItemSchema, WishlistItemSchema } from '@repo/api-client/schemas/wishlist'
import { getUserIdFromEvent } from '@/utils/auth'
import { eq, and } from 'drizzle-orm'

export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = getUserIdFromEvent(event)
  const { id } = event.pathParameters!
  const body = UpdateWishlistItemSchema.parse(JSON.parse(event.body!))

  // Verify item exists and belongs to user
  const existing = await db
    .select()
    .from(wishlistItems)
    .where(and(
      eq(wishlistItems.id, id),
      eq(wishlistItems.userId, userId)
    ))
    .get()

  if (!existing) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Item not found' }),
    }
  }

  // Update item
  const [updated] = await db
    .update(wishlistItems)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(wishlistItems.id, id))
    .returning()

  return {
    statusCode: 200,
    body: JSON.stringify(WishlistItemSchema.parse(updated)),
  }
}
```

### RTK Query Mutation

```typescript
// Add to wishlist-api.ts
updateWishlistItem: builder.mutation<WishlistItem, { id: string; data: UpdateWishlistItem }>({
  query: ({ id, data }) => ({
    url: `/wishlist/${id}`,
    method: 'PATCH',
    body: data,
  }),
  transformResponse: (response) => WishlistItemSchema.parse(response),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Wishlist', id },
    { type: 'Wishlist', id: 'LIST' },
  ],
}),

// Export hook
export const { useUpdateWishlistItemMutation } = wishlistApi
```

### Detail Page Component

```typescript
// pages/DetailPage/index.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useGetWishlistItemQuery } from '@repo/api-client/rtk/wishlist-api'
import { Button, Badge, Skeleton } from '@repo/ui'
import { ArrowLeft, Pencil, Trash, ShoppingCart, Package } from 'lucide-react'

export function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useGetWishlistItemQuery(id!)

  // State for modals (Got It and Delete from wish-2004)
  const [gotItModalOpen, setGotItModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  if (isLoading) return <DetailSkeleton />
  if (error || !item) return <NotFoundState />

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        aria-label="Back to wishlist gallery"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Wishlist
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        {/* Image */}
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Title & Store */}
          <div>
            <Badge variant="secondary">{item.store}</Badge>
            <h1 className="text-3xl font-bold mt-2">{item.title}</h1>
            {item.setNumber && (
              <p className="text-muted-foreground">Set #{item.setNumber}</p>
            )}
          </div>

          {/* Price */}
          {item.price && (
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(item.price, item.currency)}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {item.pieceCount && (
              <div>
                <span className="text-muted-foreground">Pieces</span>
                <p className="font-medium">{item.pieceCount.toLocaleString()}</p>
              </div>
            )}
            {item.releaseDate && (
              <div>
                <span className="text-muted-foreground">Release Date</span>
                <p className="font-medium">{formatDate(item.releaseDate)}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Priority</span>
              <p className="font-medium">{getPriorityLabel(item.priority)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Added</span>
              <p className="font-medium">{formatDate(item.createdAt)}</p>
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Source URL */}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              View on {item.store}
            </a>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="bg-muted p-4 rounded-lg">
              <h2 className="font-medium mb-2">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => setGotItModalOpen(true)}
              data-testid="got-it-button"
            >
              <ShoppingCart className="w-5 h-5 mr-2" aria-hidden="true" />
              Got it!
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/wishlist/${id}/edit`)}
              aria-label="Edit item"
              data-testid="edit-button"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setDeleteModalOpen(true)}
              aria-label="Delete item"
              data-testid="delete-button"
            >
              <Trash className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modals (from wish-2004) */}
      <GotItModal
        open={gotItModalOpen}
        onOpenChange={setGotItModalOpen}
        item={item}
      />
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemTitle={item.title}
        onConfirm={() => handleDelete(id)}
      />
    </div>
  )
}

// Helper functions
function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getPriorityLabel(priority: number) {
  const labels = ['None', 'Low', 'Medium', 'High', 'Very High', 'Must Have']
  return labels[priority] || 'None'
}

function DetailSkeleton() {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      </div>
    </div>
  )
}

function NotFoundState() {
  const navigate = useNavigate()
  return (
    <div className="container mx-auto py-12 text-center">
      <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold mb-2">Item Not Found</h1>
      <p className="text-muted-foreground mb-6">
        This wishlist item doesn't exist or has been removed.
      </p>
      <Button onClick={() => navigate('/')}>
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        Back to Wishlist
      </Button>
    </div>
  )
}
```

### Edit Page Component

```typescript
// pages/EditPage/index.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateWishlistItemSchema, UpdateWishlistItem } from '@repo/api-client/schemas/wishlist'
import {
  useGetWishlistItemQuery,
  useUpdateWishlistItemMutation,
} from '@repo/api-client/rtk/wishlist-api'
import { Button, Form } from '@repo/ui'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@repo/ui/hooks/use-toast'

export function EditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: item, isLoading: isLoadingItem } = useGetWishlistItemQuery(id!)
  const [updateItem, { isLoading: isSaving }] = useUpdateWishlistItemMutation()

  const form = useForm<UpdateWishlistItem>({
    resolver: zodResolver(UpdateWishlistItemSchema),
    mode: 'onBlur', // Validate on field exit, not while typing
    defaultValues: item ? mapItemToFormValues(item) : undefined,
  })

  // Reset form when item loads
  useEffect(() => {
    if (item) {
      form.reset(mapItemToFormValues(item))
    }
  }, [item, form])

  const onSubmit = async (data: UpdateWishlistItem) => {
    try {
      // Handle image changes if needed
      let imageUrl = data.imageUrl
      if (newImageFile) {
        imageUrl = await uploadImageToS3(newImageFile)
      } else if (removeImage) {
        imageUrl = undefined
      }

      await updateItem({
        id: id!,
        data: { ...data, imageUrl },
      }).unwrap()

      toast({
        title: 'Success',
        description: 'Wishlist item updated',
      })
      navigate(`/wishlist/${id}`)
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      })
    }
  }

  if (isLoadingItem) return <FormSkeleton />
  if (!item) return <NotFoundState />

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/wishlist/${id}`)}
          aria-label="Cancel and return to item details"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Cancel
        </Button>
        <h1 className="text-2xl font-bold">Edit Wishlist Item</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Reuse form fields from add page - extract to shared component */}
          <WishlistFormFields form={form} autoFocusTitle />

          {/* Image Section with current image display */}
          <div className="space-y-2">
            <Label htmlFor="image-upload">Image</Label>
            {item.imageUrl && !removeImage ? (
              <div className="relative inline-block">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-32 h-32 object-cover rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => setRemoveImage(true)}
                  aria-label="Remove current image"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <ImageUploadField
                id="image-upload"
                file={newImageFile}
                preview={imagePreview}
                onFileChange={handleImageChange}
                onRemove={() => {
                  setNewImageFile(null)
                  setImagePreview(null)
                }}
              />
            )}
          </div>

          {/* Submit - sticky on mobile */}
          <div className="flex gap-4 pt-4 sticky bottom-0 bg-background py-4 md:static md:bg-transparent md:py-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/wishlist/${id}`)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !form.formState.isValid}
              data-testid="save-button"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

function mapItemToFormValues(item: WishlistItem): UpdateWishlistItem {
  return {
    title: item.title,
    store: item.store,
    setNumber: item.setNumber ?? undefined,
    sourceUrl: item.sourceUrl ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
    price: item.price ?? undefined,
    currency: item.currency,
    pieceCount: item.pieceCount ?? undefined,
    releaseDate: item.releaseDate ?? undefined,
    tags: item.tags,
    priority: item.priority,
    notes: item.notes ?? undefined,
  }
}
```

### Route Structure

```
apps/web/app-wishlist-gallery/src/
  pages/
    DetailPage/
      index.tsx           # Detail page component
      __tests__/
        DetailPage.test.tsx
    EditPage/
      index.tsx           # Edit page component
      __tests__/
        EditPage.test.tsx
  components/
    WishlistFormFields/
      index.tsx           # Shared form fields (from wish-2002)
    PriceDisplay/
      index.tsx           # Currency formatting component
    PriorityBadge/
      index.tsx           # Priority indicator with color
```

### E2E Feature File

```gherkin
# apps/web/playwright/features/wishlist/detail-edit.feature
Feature: Wishlist Detail and Edit Pages
  As a user
  I want to view and edit wishlist item details
  So that I can see full information and update items as needed

  Background:
    Given I am logged in
    And the wishlist API is mocked

  Scenario: View item details
    Given a wishlist item exists with id "item-123"
    When I navigate to "/wishlist/item-123"
    Then I should see the item title
    And I should see the item store badge
    And I should see the item price
    And I should see the "Got it!" button
    And I should see the edit button
    And I should see the delete button

  Scenario: Item not found shows friendly error
    Given the API returns 404 for item "nonexistent"
    When I navigate to "/wishlist/nonexistent"
    Then I should see "Item Not Found"
    And I should see a "Back to Wishlist" button

  Scenario: Edit item with valid data
    Given a wishlist item exists with id "item-123"
    When I navigate to "/wishlist/item-123/edit"
    Then the form should be pre-populated with item data
    When I change the title to "Updated Title"
    And I click "Save Changes"
    Then I should see a success toast
    And I should be redirected to "/wishlist/item-123"

  Scenario: Edit form validation
    Given a wishlist item exists with id "item-123"
    When I navigate to "/wishlist/item-123/edit"
    And I clear the title field
    And I blur the title field
    Then I should see a validation error for title
    And the "Save Changes" button should be disabled

  Scenario: Cancel edit returns to detail
    Given a wishlist item exists with id "item-123"
    When I navigate to "/wishlist/item-123/edit"
    And I click "Cancel"
    Then I should be redirected to "/wishlist/item-123"

  Scenario: Remove and replace image
    Given a wishlist item exists with id "item-123" and has an image
    When I navigate to "/wishlist/item-123/edit"
    And I click the remove image button
    Then the image should be removed
    And I should see the image upload area
```

## Testing

### API Tests

- [ ] PATCH /api/wishlist/:id updates item with valid data
- [ ] PATCH /api/wishlist/:id returns 400 for invalid data
- [ ] PATCH /api/wishlist/:id returns 404 for nonexistent item
- [ ] PATCH /api/wishlist/:id returns 403 for other user's item
- [ ] Partial updates work (only provided fields change)

### Detail Page Tests

- [ ] Route renders with valid item ID
- [ ] Shows loading skeleton while fetching
- [ ] Shows 404 for invalid ID
- [ ] All metadata fields display correctly
- [ ] Image fallback shows when no image
- [ ] "Got it!" button opens modal (from wish-2004)
- [ ] Edit button navigates correctly
- [ ] Delete button opens confirmation (from wish-2004)
- [ ] Back button returns to gallery
- [ ] Keyboard navigation through action buttons works

### Edit Page Tests

- [ ] Form loads with existing item data
- [ ] Title field is autofocused on load
- [ ] All fields are editable
- [ ] Validation errors show inline on blur
- [ ] Save button calls PATCH API
- [ ] Success navigates to detail page with toast
- [ ] Cancel navigates without saving
- [ ] Image can be removed
- [ ] New image can be uploaded
- [ ] Submit button disabled when form invalid

## Definition of Done

- [ ] PATCH endpoint updates items correctly
- [ ] Detail page displays all item information
- [ ] Edit page allows updating all fields
- [ ] RTK Query cache invalidates correctly
- [ ] All types derived from Zod schemas (no TypeScript interfaces)
- [ ] Form uses react-hook-form + zodResolver
- [ ] **UX requirements met**:
  - [ ] Title field autofocused on edit page load
  - [ ] Keyboard navigation works throughout
  - [ ] Loading states for fetch, upload, and submit
  - [ ] Error handling with scroll-to-error
  - [ ] 404 state with friendly messaging
  - [ ] Success toast before redirect
- [ ] **Accessibility (WCAG 2.1 AA)**:
  - [ ] All fields have visible labels
  - [ ] Error messages linked via aria-describedby
  - [ ] Focus visible on all interactive elements
  - [ ] Action buttons have aria-labels
  - [ ] Proper heading hierarchy on detail page
- [ ] Unit tests pass (Vitest)
- [ ] E2E tests pass with API mocking (Playwright)
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                            | Author   |
| ---------- | ------- | ------------------------------------------------------ | -------- |
| 2025-12-27 | 0.1     | Initial draft                                          | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1002 (update), wish-1006, 1007 | Claude   |
| 2025-12-27 | 0.3     | Added GitHub Issue section, Epic Context, Blocked By section | Bob (SM) |
| 2025-12-27 | 0.4     | Added Technical Requirements: Zod-only types, react-hook-form + zodResolver, app-wishlist-gallery target | Bob (SM) |
| 2025-12-27 | 0.5     | **UX Review**: Added UX Requirements section (form layout, interactions, feedback states, error handling, accessibility). Enhanced Tasks 3-4 with detailed UX specs including autofocus, keyboard nav, loading states, aria-labels. | Sally (UX) |
| 2025-12-27 | 0.6     | Added UX & Accessibility acceptance criteria (AC 26-34). Added E2E Tests acceptance criteria (AC 35-38). | Bob (SM) |
| 2025-12-27 | 0.7     | Added Task 6: E2E Tests with API Mocking. Updated existing tasks with accessibility and testid requirements. | Bob (SM) |
| 2025-12-27 | 0.8     | Updated Definition of Done with UX and accessibility checkboxes. Added E2E feature file example. | Bob (SM) |
| 2025-12-27 | 0.9     | **Story Checklist Validation**: PASS - All required sections present, technical requirements specified, UX/a11y covered, E2E tests defined, DoD complete. Status changed to Approved. | Bob (SM) |
