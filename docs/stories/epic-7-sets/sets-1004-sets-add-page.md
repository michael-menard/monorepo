# Story 3.4.5: Sets Add Page

## Status

Draft

## Story

**As a** user,
**I want** to add sets to my collection,
**so that** I can track what I own.

## Acceptance Criteria

1. ⬜ Route `/sets/add` configured
2. ⬜ Form to enter set details
3. ⬜ Set number lookup (optional future enhancement)
4. ⬜ Image upload support
5. ⬜ Purchase info fields (date, price)
6. ⬜ Success redirects to sets gallery

## Tasks / Subtasks

- [ ] **Task 1: Create Add Route**
  - [ ] Create `routes/sets/add.tsx`
  - [ ] Configure route

- [ ] **Task 2: Add Set Form**
  - [ ] Name input (required)
  - [ ] Set number input (required)
  - [ ] Piece count input
  - [ ] Theme selector
  - [ ] Tags input
  - [ ] Purchase date picker
  - [ ] Purchase price and currency
  - [ ] Notes textarea

- [ ] **Task 3: Image Upload**
  - [ ] Image upload zone
  - [ ] Multiple images support
  - [ ] Image preview and reorder

- [ ] **Task 4: Form Submission**
  - [ ] Validation with Zod
  - [ ] Submit to API
  - [ ] Upload images after set created
  - [ ] Success toast and redirect

## Dev Notes

### Page Component

```typescript
// routes/sets/add.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export const Route = createFileRoute('/sets/add')({
  component: AddSetPage,
})

const setSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  setNumber: z.string().min(1, 'Set number is required'),
  pieceCount: z.number().int().positive('Piece count must be positive'),
  theme: z.string().min(1, 'Theme is required'),
  tags: z.array(z.string()).default([]),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  purchaseCurrency: z.string().default('USD'),
  notes: z.string().optional(),
})

type SetFormData = z.infer<typeof setSchema>

function AddSetPage() {
  const navigate = useNavigate()
  const [addSet, { isLoading }] = useAddSetMutation()
  const [uploadImage] = useUploadSetImageMutation()
  const { success, error } = useToast()
  const [images, setImages] = useState<File[]>([])

  const form = useForm<SetFormData>({
    resolver: zodResolver(setSchema),
    defaultValues: {
      purchaseCurrency: 'USD',
      tags: [],
    },
  })

  const onSubmit = async (data: SetFormData) => {
    try {
      const set = await addSet(data).unwrap()

      // Upload images
      for (const image of images) {
        const formData = new FormData()
        formData.append('file', image)
        await uploadImage({ setId: set.id, formData })
      }

      success('Set added to collection')
      navigate({ to: '/sets' })
    } catch (err) {
      error('Failed to add set')
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
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
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Set Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Medieval Castle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Set Number & Piece Count Row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="setNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Set Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10305" {...field} />
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
                      <FormLabel>Piece Count *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 2500"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Theme */}
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {themes.map((theme) => (
                          <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
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
                      />
                    </FormControl>
                    <FormDescription>Press Enter to add a tag</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Purchase Info */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Information</CardTitle>
              <CardDescription>Optional - track when and how much you paid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Price Paid</FormLabel>
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
                  name="purchaseCurrency"
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
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Add photos of your set</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUploadZone
                images={images}
                onImagesChange={setImages}
                maxImages={10}
              />
            </CardContent>
          </Card>

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
                        placeholder="Any additional notes about this set..."
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

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate({ to: '/sets' })}>
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
const themes = [
  'Architecture',
  'Castle',
  'City',
  'Classic',
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

## Testing

- [ ] Form validates required fields
- [ ] Images can be uploaded and previewed
- [ ] Purchase info fields are optional
- [ ] Form submits successfully
- [ ] Success redirects to sets gallery
- [ ] Error toast on failure

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
