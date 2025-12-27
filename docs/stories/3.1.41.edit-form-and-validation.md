# Story 3.1.41: Edit Form & Validation

## GitHub Issue
- Issue: #264
- URL: https://github.com/michael-menard/monorepo/issues/264
- Status: Todo

## Status

Ready for Review

## Story

**As an** owner,
**I want** form validation as I edit,
**so that** I catch errors before submitting.

## Epic Context

This is **Story 2.3 of Epic 2: Edit UX & Frontend**.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32)
- All Epic 1 stories (3.1.33-3.1.38)
- Story 3.1.40: Edit Page & Data Fetching

## Acceptance Criteria

1. Reuse validation schema from create flow (via `@repo/upload-types`)
2. Title: required, 1-100 chars
3. Description: optional, max 2000 chars
4. Tags: optional, max 10 tags, each max 30 chars
5. Theme: optional, predefined list or custom
6. Slug: optional edit, validated format `[a-z0-9-]+`, uniqueness check on blur
7. Real-time validation as user types
8. Submit button disabled when form invalid or unchanged

## Tasks / Subtasks

- [x] **Task 1: Use Shared Validation Schema** (AC: 1)
  - [x] Import `EditMocSchema` from `@repo/upload-types`
  - [x] Use as resolver for react-hook-form
  - [x] Ensure schema matches API validation

- [x] **Task 2: Implement Title Field** (AC: 2)
  - [x] Required field validation
  - [x] Min 1 char, max 100 chars
  - [x] Show character count
  - [x] Show error on blur if invalid

- [x] **Task 3: Implement Description Field** (AC: 3)
  - [x] Textarea with max 2000 chars
  - [x] Show character count
  - [x] Optional field

- [x] **Task 4: Implement Tags Field** (AC: 4)
  - [x] Tag input component (comma-separated or chips)
  - [x] Max 10 tags
  - [x] Each tag max 30 chars
  - [x] Show tag count

- [x] **Task 5: Implement Theme Field** (AC: 5)
  - [x] Select dropdown with predefined themes
  - [x] "Other" option for custom theme
  - [x] Optional field

- [x] **Task 6: Implement Slug Field** (AC: 6)
  - [x] Text input with validation pattern
  - [x] Auto-generate from title (if empty and title changed)
  - [x] Debounced uniqueness check on blur
  - [x] Show availability indicator (green check / red x)

- [x] **Task 7: Real-time Validation** (AC: 7)
  - [x] Use react-hook-form mode: 'onChange'
  - [x] Show inline errors as user types
  - [x] Debounce validation for performance

- [x] **Task 8: Submit Button State** (AC: 8)
  - [x] Disable when form has validation errors
  - [x] Disable when no changes made (compare to initial values)
  - [x] Show "No changes" tooltip when disabled due to no changes

## Dev Notes

### Shared Validation Schema

```typescript
// @repo/upload-types
import { z } from 'zod'

export const EditMocSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  tags: z
    .array(z.string().max(30, 'Tag too long'))
    .max(10, 'Too many tags')
    .optional()
    .default([]),
  theme: z.string().max(50).nullable().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .max(100)
    .optional(),
})

export type EditMocInput = z.infer<typeof EditMocSchema>
```

### Form Implementation

```typescript
// apps/web/main-app/src/components/MocEdit/EditForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EditMocSchema, EditMocInput } from '@repo/upload-types'

interface EditFormProps {
  moc: MocForEditResponse
  onSubmit: (data: EditMocInput) => Promise<void>
}

function EditForm({ moc, onSubmit }: EditFormProps) {
  const initialValues: EditMocInput = {
    title: moc.title,
    description: moc.description,
    tags: moc.tags,
    theme: moc.theme,
    slug: moc.slug,
  }

  const form = useForm<EditMocInput>({
    resolver: zodResolver(EditMocSchema),
    defaultValues: initialValues,
    mode: 'onChange', // Real-time validation
  })

  const { formState: { errors, isDirty, isValid } } = form
  const isSubmitDisabled = !isDirty || !isValid

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Title Field */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title *</FormLabel>
            <FormControl>
              <Input {...field} maxLength={100} />
            </FormControl>
            <div className="flex justify-between text-sm text-muted-foreground">
              <FormMessage />
              <span>{field.value.length}/100</span>
            </div>
          </FormItem>
        )}
      />

      {/* Description Field */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} maxLength={2000} rows={6} />
            </FormControl>
            <div className="flex justify-between text-sm text-muted-foreground">
              <FormMessage />
              <span>{field.value?.length ?? 0}/2000</span>
            </div>
          </FormItem>
        )}
      />

      {/* Tags Field */}
      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tags ({field.value.length}/10)</FormLabel>
            <FormControl>
              <TagInput
                value={field.value}
                onChange={field.onChange}
                maxTags={10}
                maxTagLength={30}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Slug Field */}
      <SlugField
        control={form.control}
        currentSlug={moc.slug}
        ownerId={moc.userId}
      />

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitDisabled}>
        {!isDirty ? 'No changes to save' : 'Save Changes'}
      </Button>
    </form>
  )
}
```

### Slug Uniqueness Check

```typescript
// SlugField component
function SlugField({ control, currentSlug, ownerId }) {
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  const checkSlugAvailability = useDebouncedCallback(async (slug: string) => {
    if (slug === currentSlug) {
      setIsAvailable(true)
      return
    }

    setIsChecking(true)
    try {
      const response = await fetch(`/api/mocs/check-slug?slug=${slug}`)
      const { available } = await response.json()
      setIsAvailable(available)
    } catch {
      setIsAvailable(null)
    } finally {
      setIsChecking(false)
    }
  }, 500)

  return (
    <FormField
      control={control}
      name="slug"
      render={({ field }) => (
        <FormItem>
          <FormLabel>URL Slug</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                {...field}
                onBlur={() => checkSlugAvailability(field.value)}
              />
            </FormControl>
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isChecking && <Spinner className="w-4 h-4" />}
              {!isChecking && isAvailable === true && (
                <CheckIcon className="w-4 h-4 text-green-500" />
              )}
              {!isChecking && isAvailable === false && (
                <XIcon className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
          <FormMessage />
          {isAvailable === false && (
            <p className="text-sm text-destructive">
              This slug is already used by another of your MOCs
            </p>
          )}
        </FormItem>
      )}
    />
  )
}
```

### Change Detection

```typescript
// Hook to detect actual changes (deep comparison)
const useFormHasChanges = (form, initialValues) => {
  const currentValues = form.watch()
  return useMemo(() => {
    return !isEqual(currentValues, initialValues)
  }, [currentValues, initialValues])
}
```

## Testing

### Test Location
- `apps/web/main-app/src/components/MocEdit/__tests__/EditForm.test.tsx`

### Test Requirements
- Unit: Title validation (required, length)
- Unit: Description validation (length)
- Unit: Tags validation (count, length)
- Unit: Slug validation (format, uniqueness mock)
- Unit: Submit disabled when no changes
- Unit: Submit disabled when invalid
- Unit: Real-time error display
- Integration: Form submission with valid data

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-08 | 0.1 | Initial draft from Edit MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes

All 8 tasks completed:
- Created shared validation schema `EditMocFormSchema` in `@repo/upload-types/src/edit.ts`
- Implemented EditForm with all fields (title, description, tags, theme, slug)
- TagInput component with chip UI, max 10 tags, 30 chars each
- SlugField with pattern validation and debounced uniqueness check
- Real-time validation using react-hook-form mode: 'onChange'
- Submit button disabled when form invalid or unchanged
- 23 tests passing (14 EditForm, 9 InstructionsEditPage)

### File List

- `packages/core/upload-types/src/edit.ts` - New (shared validation schema)
- `packages/core/upload-types/src/index.ts` - Modified (exports new types)
- `apps/web/main-app/src/components/MocEdit/EditForm.tsx` - New
- `apps/web/main-app/src/components/MocEdit/SlugField.tsx` - New
- `apps/web/main-app/src/components/MocEdit/TagInput.tsx` - New
- `apps/web/main-app/src/components/MocEdit/__tests__/EditForm.test.tsx` - New
- `apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx` - Modified
- `apps/web/main-app/src/routes/modules/InstructionsEditModule.tsx` - Modified
- `apps/web/main-app/src/routes/pages/__tests__/InstructionsEditPage.test.tsx` - Modified
