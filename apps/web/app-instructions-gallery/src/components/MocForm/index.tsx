/**
 * MocForm Component
 *
 * Reusable form for creating new MOC instructions.
 * Provides title, description, theme select, and tags input.
 *
 * Story INST-1102: Create Basic MOC
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/app-component-library'
import type { CreateMocInput } from '@repo/api-client/schemas/instructions'
import { TagInput } from '../MocEdit/TagInput'

/**
 * Form validation schema
 * Matches backend CreateMocInputSchema requirements
 */
const MocFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(500, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional(),
  theme: z.string().min(1, 'Theme is required'),
  tags: z.array(z.string()).max(20, 'Maximum 20 tags allowed').optional(),
})

/**
 * Theme options for the select dropdown
 */
const THEME_OPTIONS = [
  { value: 'Castle', label: 'Castle' },
  { value: 'Space', label: 'Space' },
  { value: 'City', label: 'City' },
  { value: 'Technic', label: 'Technic' },
  { value: 'Creator', label: 'Creator' },
  { value: 'Star Wars', label: 'Star Wars' },
  { value: 'Harry Potter', label: 'Harry Potter' },
  { value: 'Marvel', label: 'Marvel' },
  { value: 'DC', label: 'DC' },
  { value: 'Friends', label: 'Friends' },
  { value: 'Other', label: 'Other' },
]

export interface MocFormProps {
  /**
   * Initial values for form recovery or editing
   */
  initialValues?: Partial<CreateMocInput>

  /**
   * Called when form is submitted successfully with validated data
   */
  onSubmit: (data: CreateMocInput) => Promise<void>

  /**
   * Called when cancel button is clicked
   */
  onCancel?: () => void

  /**
   * Whether the form is in a loading/submitting state
   */
  isSubmitting?: boolean

  /**
   * API error message to display
   */
  apiError?: string

  /**
   * Additional class names
   */
  className?: string
}

type FormErrors = Partial<Record<string, string>>

export function MocForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  apiError,
  className,
}: MocFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState(initialValues?.title || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [theme, setTheme] = useState(initialValues?.theme || '')
  const [tags, setTags] = useState<string[]>(initialValues?.tags || [])
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Update form when initialValues change (for recovery)
  useEffect(() => {
    if (initialValues) {
      if (initialValues.title) setTitle(initialValues.title)
      if (initialValues.description) setDescription(initialValues.description)
      if (initialValues.theme) setTheme(initialValues.theme)
      if (initialValues.tags) setTags(initialValues.tags)
    }
  }, [initialValues])

  // Auto-focus title input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      titleInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Handle keyboard shortcut (Cmd/Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  /**
   * Validate field on blur
   */
  const validateField = useCallback(
    (field: string, value: string | string[]) => {
      const formData = {
        title,
        description: description || undefined,
        theme,
        tags,
      }

      // Update with the new value
      const dataToValidate = { ...formData, [field]: value }

      const result = MocFormSchema.safeParse(dataToValidate)

      if (!result.success) {
        const fieldError = result.error.errors.find(e => e.path[0] === field)
        if (fieldError) {
          setErrors(prev => ({ ...prev, [field]: fieldError.message }))
          return false
        }
      }

      // Clear error if valid
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
      return true
    },
    [title, description, theme, tags],
  )

  /**
   * Validate entire form
   */
  const validateForm = useCallback(() => {
    const formData = {
      title,
      description: description || undefined,
      theme,
      tags,
    }

    const result = MocFormSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: FormErrors = {}
      for (const error of result.error.errors) {
        const field = error.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = error.message
        }
      }
      setErrors(fieldErrors)
      return null
    }

    setErrors({})
    return formData
  }, [title, description, theme, tags])

  /**
   * Check if form is valid (for submit button state)
   */
  const isFormValid = useCallback(() => {
    const formData = {
      title,
      description: description || undefined,
      theme,
      tags,
    }
    const result = MocFormSchema.safeParse(formData)
    return result.success
  }, [title, description, theme, tags])

  const handleFormSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      // Mark all fields as touched
      setTouched({ title: true, description: true, theme: true, tags: true })

      const data = validateForm()
      if (data) {
        // Build the CreateMocInput object
        const createMocData: CreateMocInput = {
          title: data.title,
          description: data.description,
          theme: data.theme,
          tags: data.tags,
          type: 'moc',
          status: 'draft',
          visibility: 'private',
        }
        await onSubmit(createMocData)
      }
    },
    [validateForm, onSubmit],
  )

  const handleBlur = useCallback(
    (field: string) => {
      setTouched(prev => ({ ...prev, [field]: true }))
      const value = field === 'title' ? title : field === 'description' ? description : theme
      validateField(field, value)
    },
    [title, description, theme, validateField],
  )

  const isDisabled = isSubmitting
  const showSubmitDisabled = isDisabled || !isFormValid()

  return (
    <form
      ref={formRef}
      onSubmit={handleFormSubmit}
      className={cn('space-y-6', className)}
      data-testid="moc-form"
    >
      {/* API Error Banner */}
      {apiError ? (
        <div
          className="rounded-md bg-destructive/10 p-4 text-destructive text-sm"
          role="alert"
          data-testid="api-error-banner"
        >
          {apiError}
        </div>
      ) : null}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          ref={titleInputRef}
          id="title"
          name="title"
          placeholder="e.g., Medieval Castle MOC"
          disabled={isDisabled}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => handleBlur('title')}
          aria-invalid={touched.title ? !!errors.title : null}
          aria-describedby={errors.title ? 'title-error' : undefined}
          data-testid="title-input"
        />
        {touched.title && errors.title ? (
          <p id="title-error" className="text-sm text-destructive" data-testid="title-error">
            {errors.title}
          </p>
        ) : null}
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <Label htmlFor="theme">Theme *</Label>
        <Select value={theme} onValueChange={setTheme} disabled={isDisabled}>
          <SelectTrigger
            id="theme"
            aria-invalid={touched.theme ? !!errors.theme : null}
            aria-describedby={errors.theme ? 'theme-error' : undefined}
            data-testid="theme-select"
          >
            <SelectValue placeholder="Select a theme" />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {touched.theme && errors.theme ? (
          <p id="theme-error" className="text-sm text-destructive" data-testid="theme-error">
            {errors.theme}
          </p>
        ) : null}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe your MOC build..."
          className="min-h-24 resize-y"
          disabled={isDisabled}
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => handleBlur('description')}
          aria-invalid={touched.description ? !!errors.description : null}
          aria-describedby={errors.description ? 'description-error' : undefined}
          data-testid="description-input"
        />
        {touched.description && errors.description ? (
          <p
            id="description-error"
            className="text-sm text-destructive"
            data-testid="description-error"
          >
            {errors.description}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">Optional. Add details about your MOC.</p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <TagInput
          value={tags}
          onChange={newTags => {
            setTags(newTags)
            setTouched(prev => ({ ...prev, tags: true }))
          }}
          placeholder="Add tags..."
          disabled={isDisabled}
          maxTags={20}
          maxTagLength={30}
          error={touched.tags ? errors.tags : undefined}
          aria-invalid={touched.tags ? !!errors.tags : null}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-muted-foreground">
          Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">
            {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac')
              ? 'Cmd'
              : 'Ctrl'}
            +Enter
          </kbd>{' '}
          to submit
        </p>
        <div className="flex gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isDisabled}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={showSubmitDisabled} data-testid="submit-button">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create MOC'
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

export default MocForm
