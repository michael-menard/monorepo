# Story sets-1010: Add Set Form (Manual Entry)

## Status

Draft

## Story

**As a** user,
**I want** to manually add a set to my collection,
**So that** I can track sets I own.

## Acceptance Criteria

1. [ ] Route `/sets/add` renders add form
2. [ ] Form validates with CreateSetSchema
3. [ ] Required field: title
4. [ ] Optional fields: setNumber, pieceCount, theme, tags, purchase details, notes
5. [ ] Build status toggle (default: In Pieces)
6. [ ] Quantity field (default: 1, minimum: 1)
7. [ ] Submit creates set and navigates to gallery
8. [ ] Cancel returns to gallery
9. [ ] Success toast on creation
10. [ ] Error handling with user feedback

## Tasks

- [ ] **Task 1: Create add route**
  - [ ] Create routes/sets/add.tsx
  - [ ] Configure route

- [ ] **Task 2: Build form with react-hook-form**
  - [ ] Use zodResolver with CreateSetSchema
  - [ ] Set default values
  - [ ] Wire up useAddSetMutation

- [ ] **Task 3: Form sections**
  - [ ] Basic Info section (title, setNumber, pieceCount, theme)
  - [ ] Tags input
  - [ ] Status section (isBuilt toggle, quantity)
  - [ ] Purchase Details section (optional)
  - [ ] Notes textarea

- [ ] **Task 4: Submission handling**
  - [ ] Call addSet mutation
  - [ ] Show loading state
  - [ ] Navigate on success
  - [ ] Toast feedback

## Dev Notes

### Page Component

```typescript
// routes/sets/add.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateSetSchema, CreateSetInput, useAddSetMutation } from '@repo/api-client'

export const Route = createFileRoute('/sets/add')({
  component: AddSetPage,
})

function AddSetPage() {
  const navigate = useNavigate()
  const [addSet, { isLoading }] = useAddSetMutation()
  const { toast } = useToast()

  const form = useForm<CreateSetInput>({
    resolver: zodResolver(CreateSetSchema),
    defaultValues: {
      title: '',
      setNumber: '',
      pieceCount: undefined,
      theme: '',
      tags: [],
      isBuilt: false,
      quantity: 1,
      purchasePrice: undefined,
      tax: undefined,
      shipping: undefined,
      purchaseDate: undefined,
      notes: '',
    },
  })

  const onSubmit = async (data: CreateSetInput) => {
    try {
      await addSet(data).unwrap()
      toast({ title: 'Set added to collection' })
      navigate({ to: '/sets' })
    } catch (error) {
      toast({
        title: 'Failed to add set',
        description: 'Please try again',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/sets' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add Set</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Set Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value}
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

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <QuantityStepper
                        value={field.value}
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

          {/* Purchase Details (optional) */}
          <PurchaseDetailsSection control={form.control} />

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
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

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/sets' })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Collection
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

### Theme Options

```typescript
const THEMES = [
  'Architecture',
  'Castle',
  'City',
  'Creator',
  'Creator Expert',
  'Disney',
  'Friends',
  'Harry Potter',
  'Icons',
  'Ideas',
  'Marvel',
  'Minecraft',
  'Ninjago',
  'Speed Champions',
  'Star Wars',
  'Technic',
  'Other',
]
```

### Note

Image upload is handled in a separate story (sets-1012) to keep this story focused on the core form functionality.

## Testing

- [ ] Route renders add form
- [ ] Title field is required
- [ ] Form validates on submit
- [ ] Invalid form shows error messages
- [ ] Valid form submits successfully
- [ ] Success toast shows on creation
- [ ] Navigates to gallery after success
- [ ] Error toast on API failure
- [ ] Cancel button returns to gallery
- [ ] Default values applied correctly
- [ ] Quantity minimum is 1

## Dependencies

- sets-1004: Create Set Endpoint
- sets-1001: Zod Schemas

## References

- PRD: docs/prd/epic-7-sets-gallery.md (User Interface - Add Modal)
