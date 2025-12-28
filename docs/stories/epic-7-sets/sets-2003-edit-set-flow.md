# Story sets-2003: Edit Set Flow

## Status

Draft

## Consolidates

- sets-1005: Update Set Endpoint
- sets-1011: Edit Set Form

## Story

**As a** user,
**I want** to edit my set's information,
**So that** I can correct or update details.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - CRUD Operations > Update

## Dependencies

- **sets-2000**: Database Schema & Shared Types
- **sets-2001**: Sets Gallery MVP (for detail page)
- **sets-2002**: Add Set Flow (for shared form components and image endpoints)

## Acceptance Criteria

### Update Endpoint

1. [ ] PATCH /api/sets/:id updates set fields
2. [ ] Validates request body with UpdateSetSchema
3. [ ] Returns 404 if set not found
4. [ ] Returns 403 if set belongs to different user
5. [ ] Supports partial updates (only provided fields updated)
6. [ ] Updates updatedAt timestamp
7. [ ] RTK Query mutation hook created and exported

### Edit Form

8. [ ] Route `/sets/:setId/edit` renders edit form
9. [ ] Form pre-populated with existing set data
10. [ ] All fields editable (same as add form)
11. [ ] Image management (add/remove/reorder)
12. [ ] Submit updates set and navigates to detail page
13. [ ] Cancel returns to detail page
14. [ ] Success toast on update
15. [ ] 404 if set not found

## Tasks / Subtasks

### Task 1: Create Update Endpoint (AC: 1-6)

- [ ] Create `apps/api/endpoints/sets/update/handler.ts`
- [ ] Extract setId from path params
- [ ] Verify ownership before update
- [ ] Validate body with UpdateSetSchema
- [ ] Partial update: only update provided fields
- [ ] Update updatedAt timestamp
- [ ] Return updated set with images

### Task 2: RTK Query Mutation (AC: 7)

- [ ] Add `updateSet` mutation to setsApi
- [ ] Accept setId and partial data
- [ ] Configure cache invalidation
- [ ] Export `useUpdateSetMutation` hook

### Task 3: Create Edit Page (AC: 8-15)

- [ ] Create `routes/sets/$setId/edit.tsx`
- [ ] Fetch existing set data with useGetSetByIdQuery
- [ ] Pre-populate form with existing values
- [ ] Reuse form sections from Add form
- [ ] Include ImageUploadZone with existing images
- [ ] Handle image additions/removals
- [ ] Submit to updateSet mutation
- [ ] Navigate to detail page on success
- [ ] Handle loading and not found states

### Task 4: Shared Form Components

- [ ] Extract SetInfoSection from Add form
- [ ] Extract SetStatusSection from Add form
- [ ] Extract PurchaseDetailsSection from Add form
- [ ] Extract NotesSection from Add form
- [ ] Create `routes/sets/-components/SetFormSections.tsx`

## Dev Notes

### Update Endpoint Handler

```typescript
// apps/api/endpoints/sets/update/handler.ts
import { UpdateSetSchema, SetSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id

  if (!setId) {
    return badRequest('Set ID required')
  }

  // Verify ownership
  const existingSet = await getSetById(setId)
  if (!existingSet) {
    return notFound('Set not found')
  }
  if (existingSet.userId !== userId) {
    return forbidden('Not authorized to update this set')
  }

  const input = UpdateSetSchema.parse(JSON.parse(event.body || '{}'))

  // Partial update - only update provided fields
  const [updated] = await db.update(sets)
    .set({
      ...input,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sets.id, setId))
    .returning()

  // Fetch with images
  const images = await db.select()
    .from(setImages)
    .where(eq(setImages.setId, setId))
    .orderBy(asc(setImages.position))

  return success(SetSchema.parse({ ...updated, images }))
}
```

### RTK Query Mutation

```typescript
// In sets-api.ts
updateSet: builder.mutation<Set, { id: string; data: UpdateSetInput }>({
  query: ({ id, data }) => ({
    url: `/sets/${id}`,
    method: 'PATCH',
    body: data,
  }),
  transformResponse: (response) => SetSchema.parse(response),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Set', id },
    { type: 'Set', id: 'LIST' },
  ],
}),
```

### Shared Form Sections

```typescript
// routes/sets/-components/SetFormSections.tsx
import { Control } from 'react-hook-form'
import { CreateSetInput, UpdateSetInput } from '@repo/api-client'

type FormInput = CreateSetInput | UpdateSetInput

export function SetInfoSection({ control }: { control: Control<FormInput> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Millennium Falcon" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="setNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Set Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 75192" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="pieceCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Piece Count</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 7541"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Theme</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {THEMES.map((theme) => (
                    <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <TagInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Add tags..."
                  maxTags={10}
                />
              </FormControl>
              <FormDescription>Press Enter to add a tag (max 10)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

export function SetStatusSection({ control }: { control: Control<FormInput> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="isBuilt"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between">
              <div>
                <FormLabel>Build Status</FormLabel>
                <FormDescription>Is this set currently built?</FormDescription>
              </div>
              <FormControl>
                <SegmentedControl
                  value={field.value ? 'built' : 'pieces'}
                  onChange={(v) => field.onChange(v === 'built')}
                  options={[
                    { value: 'pieces', label: 'In Pieces' },
                    { value: 'built', label: 'Built' },
                  ]}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <QuantityStepper
                  value={field.value ?? 1}
                  onChange={field.onChange}
                  min={1}
                />
              </FormControl>
              <FormDescription>How many of this set do you own?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

export function PurchaseDetailsSection({ control }: { control: Control<FormInput> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Details</CardTitle>
        <CardDescription>Optional</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="purchasePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Paid</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value?.split('T')[0] ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="tax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="shipping"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shipping</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function NotesSection({ control }: { control: Control<FormInput> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
```

### Edit Page

```typescript
// routes/sets/$setId/edit.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  UpdateSetSchema,
  UpdateSetInput,
  useGetSetByIdQuery,
  useUpdateSetMutation,
  useDeleteSetImageMutation,
} from '@repo/api-client'
import {
  SetInfoSection,
  SetStatusSection,
  PurchaseDetailsSection,
  NotesSection,
} from '../-components/SetFormSections'

export const Route = createFileRoute('/sets/$setId/edit')({
  component: EditSetPage,
})

function EditSetPage() {
  const { setId } = Route.useParams()
  const navigate = useNavigate()
  const { data: set, isLoading: isLoadingSet } = useGetSetByIdQuery(setId)
  const [updateSet, { isLoading: isUpdating }] = useUpdateSetMutation()
  const [deleteImage] = useDeleteSetImageMutation()
  const { toast } = useToast()

  // Track images (existing + new)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])

  // Initialize images from set data
  useEffect(() => {
    if (set) {
      setImages(set.images.map(img => ({
        id: img.id,
        preview: img.thumbnailUrl ?? img.imageUrl,
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
      })))
    }
  }, [set])

  const form = useForm<UpdateSetInput>({
    resolver: zodResolver(UpdateSetSchema),
    values: set ? {
      title: set.title,
      setNumber: set.setNumber ?? '',
      pieceCount: set.pieceCount ?? undefined,
      theme: set.theme ?? '',
      tags: set.tags,
      isBuilt: set.isBuilt,
      quantity: set.quantity,
      purchasePrice: set.purchasePrice ?? undefined,
      tax: set.tax ?? undefined,
      shipping: set.shipping ?? undefined,
      purchaseDate: set.purchaseDate ?? undefined,
      notes: set.notes ?? '',
    } : undefined,
  })

  if (isLoadingSet) return <FormSkeleton />
  if (!set) return <NotFoundPage message="Set not found" />

  const handleImageRemove = (index: number) => {
    const removed = images[index]
    if (removed.id) {
      // Track for deletion on submit
      setDeletedImageIds(prev => [...prev, removed.id!])
    }
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: UpdateSetInput) => {
    try {
      // Delete removed images
      for (const imageId of deletedImageIds) {
        await deleteImage({ setId, imageId }).unwrap()
      }

      // Upload new images
      const newImages = images.filter(i => i.file)
      for (const image of newImages) {
        // Same upload flow as Add
        // ...presign, upload, register
      }

      // Update set data
      await updateSet({ id: setId, data }).unwrap()

      toast({ title: 'Set updated' })
      navigate({ to: '/sets/$setId', params: { setId } })
    } catch (error) {
      toast({
        title: 'Failed to update set',
        description: 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = () => {
    navigate({ to: '/sets/$setId', params: { setId } })
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Set</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <SetInfoSection control={form.control} />

          {/* Images Card */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploadZone
                images={images}
                onImagesChange={setImages}
                onRemove={handleImageRemove}
              />
            </CardContent>
          </Card>

          <SetStatusSection control={form.control} />
          <PurchaseDetailsSection control={form.control} />
          <NotesSection control={form.control} />

          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

## Testing

### API Tests

- [ ] PATCH /api/sets/:id updates all fields
- [ ] PATCH /api/sets/:id with single field only updates that field
- [ ] Preserves unchanged fields
- [ ] Updates updatedAt timestamp
- [ ] Returns 404 for non-existent ID
- [ ] Returns 403 for unauthorized user
- [ ] Validates partial data correctly
- [ ] Empty body is valid (no changes)
- [ ] Invalid data returns validation error

### Component Tests

- [ ] Form sections render correctly
- [ ] TagInput adds/removes tags
- [ ] QuantityStepper increments/decrements
- [ ] SegmentedControl toggles build status

### Page Tests

- [ ] Route renders with valid set ID
- [ ] Form pre-populated with existing data
- [ ] Shows 404 for non-existent set
- [ ] Form validates on submit
- [ ] Valid changes save successfully
- [ ] Success toast shows on update
- [ ] Navigates to detail page after save
- [ ] Cancel returns to detail page without saving
- [ ] Error toast on API failure
- [ ] Partial updates work (unchanged fields preserved)
- [ ] Images can be added/removed
- [ ] Image deletion persists on save

## Definition of Done

- [ ] Sets can be updated with partial data
- [ ] Images can be added/removed on edit
- [ ] Form reuses components from Add flow
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                            | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1005, 1011        | Claude |
