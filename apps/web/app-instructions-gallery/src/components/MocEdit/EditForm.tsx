/**
 * EditForm Component
 * Story 3.1.41: Edit Form & Validation
 *
 * Complete edit form with real-time validation for MOC metadata.
 * Uses react-hook-form with Zod resolver for validation.
 */
import { useCallback, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/app-component-library'
import { Save, Loader2, AlertCircle } from 'lucide-react'
import {
  EditMocFormSchema,
  LEGO_THEMES,
  hasFormChanges,
  toFormValues,
  type EditMocFormInput,
  type MocForEditResponse,
  type LegoTheme,
} from '@repo/upload/types'
import { TagInput } from './TagInput'
import { SlugField } from './SlugField'

interface EditFormProps {
  moc: MocForEditResponse
  onSubmit: (data: EditMocFormInput) => Promise<void>
  isSubmitting?: boolean
}

export const EditForm = ({ moc, onSubmit, isSubmitting = false }: EditFormProps) => {
  // Initialize form with MOC data
  const initialValues = useMemo(() => toFormValues(moc), [moc])

  const form = useForm<EditMocFormInput>({
    resolver: zodResolver(EditMocFormSchema),
    defaultValues: initialValues,
    mode: 'onChange', // Real-time validation (AC: 7)
  })

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = form

  // Watch all form values for change detection
  const watchedValues = useWatch({ control })

  // Check if form has changes (AC: 8)
  const hasChanges = useMemo(() => {
    return hasFormChanges(watchedValues as EditMocFormInput, initialValues)
  }, [watchedValues, initialValues])

  // Watch title for slug generation
  const title = useWatch({ control, name: 'title' })

  // Submit handler
  const handleFormSubmit = useCallback(
    async (data: EditMocFormInput) => {
      await onSubmit(data)
    },
    [onSubmit],
  )

  // Submit button disabled state (AC: 8)
  const isSubmitDisabled = !hasChanges || !isValid || isSubmitting

  // Get submit button label and tooltip
  const getSubmitButtonContent = () => {
    if (isSubmitting) {
      return {
        label: 'Saving...',
        tooltip: 'Saving your changes...',
      }
    }
    if (!hasChanges) {
      return {
        label: 'No changes',
        tooltip: 'Make changes to enable saving',
      }
    }
    if (!isValid) {
      return {
        label: 'Fix errors',
        tooltip: 'Fix validation errors before saving',
      }
    }
    return {
      label: 'Save Changes',
      tooltip: 'Save your changes',
    }
  }

  const buttonContent = getSubmitButtonContent()

  return (
    <>
      <Form {...form}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Title Field (AC: 2) */}
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Title <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter MOC title"
                    maxLength={100}
                    aria-invalid={!!errors.title}
                  />
                </FormControl>
                <div className="flex justify-between text-xs">
                  <FormMessage />
                  <span
                    className={`text-muted-foreground ${
                      field.value.length > 90 ? 'text-amber-500' : ''
                    } ${field.value.length >= 100 ? 'text-destructive' : ''}`}
                  >
                    {field.value.length}/100
                  </span>
                </div>
              </FormItem>
            )}
          />

          {/* Description Field (AC: 3) */}
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Describe your MOC build, techniques used, difficulty level..."
                    rows={5}
                    maxLength={2000}
                    aria-invalid={!!errors.description}
                  />
                </FormControl>
                <div className="flex justify-between text-xs">
                  <FormMessage />
                  <span
                    className={`text-muted-foreground ${
                      (field.value?.length ?? 0) > 1800 ? 'text-amber-500' : ''
                    } ${(field.value?.length ?? 0) >= 2000 ? 'text-destructive' : ''}`}
                  >
                    {field.value?.length ?? 0}/2000
                  </span>
                </div>
              </FormItem>
            )}
          />

          {/* Tags Field (AC: 4) */}
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
                    onBlur={field.onBlur}
                    maxTags={10}
                    maxTagLength={30}
                    error={errors.tags?.message}
                    aria-invalid={!!errors.tags}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Theme Field (AC: 5) */}
          <FormField
            control={control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ''}
                  defaultValue={field.value ?? ''}
                >
                  <FormControl>
                    <SelectTrigger aria-invalid={!!errors.theme}>
                      <SelectValue placeholder="Select a theme (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {LEGO_THEMES.map((theme: LegoTheme) => (
                      <SelectItem key={theme} value={theme}>
                        {theme}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
                <p className="text-xs text-muted-foreground">Select a LEGO theme or leave empty</p>
              </FormItem>
            )}
          />

          {/* Slug Field (AC: 6) */}
          <SlugField control={control} currentSlug={moc.slug} mocId={moc.id} title={title} />

          {/* Submit Button (AC: 8) */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            {/* Show validation summary if there are errors */}
            {Object.keys(errors).length > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>Please fix the errors above</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="min-w-[140px]"
              title={isSubmitDisabled ? buttonContent.tooltip : undefined}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {buttonContent.label}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}
