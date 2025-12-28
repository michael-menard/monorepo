# Story sets-1011: Edit Set Form

## Status

Draft

## Story

**As a** user,
**I want** to edit my set's information,
**So that** I can correct or update details.

## Acceptance Criteria

1. [ ] Route `/sets/:setId/edit` renders edit form
2. [ ] Form pre-populated with existing set data
3. [ ] All fields editable (same as add form)
4. [ ] Submit updates set and navigates to detail page
5. [ ] Cancel returns to detail page
6. [ ] Success toast on update
7. [ ] 404 if set not found

## Tasks

- [ ] **Task 1: Create edit route**
  - [ ] Create routes/sets/$setId/edit.tsx
  - [ ] Fetch existing set data
  - [ ] Handle loading and not found states

- [ ] **Task 2: Reuse form components**
  - [ ] Extract shared form sections from add form
  - [ ] Pre-populate form with existing data
  - [ ] Use useUpdateSetMutation

- [ ] **Task 3: Submission handling**
  - [ ] Call updateSet mutation
  - [ ] Navigate to detail page on success
  - [ ] Toast feedback

## Dev Notes

### Page Component

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
} from '@repo/api-client'

export const Route = createFileRoute('/sets/$setId/edit')({
  component: EditSetPage,
})

function EditSetPage() {
  const { setId } = Route.useParams()
  const navigate = useNavigate()
  const { data: set, isLoading: isLoadingSet } = useGetSetByIdQuery(setId)
  const [updateSet, { isLoading: isUpdating }] = useUpdateSetMutation()
  const { toast } = useToast()

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

  const onSubmit = async (data: UpdateSetInput) => {
    try {
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
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Set</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Reuse same form sections as Add */}
          <SetInfoSection control={form.control} />
          <SetStatusSection control={form.control} />
          <PurchaseDetailsSection control={form.control} />
          <NotesSection control={form.control} />

          {/* Actions */}
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

### Shared Form Sections

Extract reusable form sections to reduce duplication:

```typescript
// routes/sets/-components/SetFormSections.tsx

export function SetInfoSection({ control }: { control: Control<any> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title, setNumber, pieceCount, theme, tags fields */}
      </CardContent>
    </Card>
  )
}

export function SetStatusSection({ control }: { control: Control<any> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* isBuilt toggle, quantity stepper */}
      </CardContent>
    </Card>
  )
}

export function PurchaseDetailsSection({ control }: { control: Control<any> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Details</CardTitle>
        <CardDescription>Optional</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* purchasePrice, tax, shipping, purchaseDate fields */}
      </CardContent>
    </Card>
  )
}

export function NotesSection({ control }: { control: Control<any> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        {/* notes textarea */}
      </CardContent>
    </Card>
  )
}
```

## Testing

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

## Dependencies

- sets-1005: Update Set Endpoint
- sets-1003: Get Set Endpoint
- sets-1010: Add Set Form (shared form sections)

## References

- PRD: docs/prd/epic-7-sets-gallery.md (CRUD Operations - Update)
