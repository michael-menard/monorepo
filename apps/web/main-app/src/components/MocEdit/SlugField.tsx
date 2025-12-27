/**
 * SlugField Component
 * Story 3.1.41: Edit Form & Validation - Task 6
 *
 * Slug input with pattern validation and debounced uniqueness check.
 */
import { useState, useEffect, useCallback } from 'react'
import { useController, type Control } from 'react-hook-form'
import { Input, FormItem, FormLabel, FormControl, FormMessage } from '@repo/app-component-library'
import { Check, X, Loader2, RefreshCw } from 'lucide-react'
import { logger } from '@repo/logger'
import { slugify } from '@repo/upload-types'
import type { EditMocFormInput } from '@repo/upload-types'

interface SlugFieldProps {
  control: Control<EditMocFormInput>
  currentSlug: string | null
  mocId: string
  title: string
}

type AvailabilityState = 'idle' | 'checking' | 'available' | 'unavailable' | 'error'

export const SlugField = ({ control, currentSlug, mocId, title }: SlugFieldProps) => {
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>('idle')
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const {
    field,
    fieldState: { error },
  } = useController({
    name: 'slug',
    control,
  })

  const checkSlugAvailability = useCallback(
    async (slug: string) => {
      // Skip if slug is same as current
      if (slug === currentSlug) {
        setAvailabilityState('available')
        return
      }

      // Skip if empty
      if (!slug) {
        setAvailabilityState('idle')
        return
      }

      setAvailabilityState('checking')

      try {
        // TODO: Replace with RTK Query endpoint
        // For now, use fetch directly
        const response = await fetch(
          `/api/v2/mocs/check-slug?slug=${encodeURIComponent(slug)}&excludeId=${encodeURIComponent(mocId)}`,
          {
            credentials: 'include',
          },
        )

        if (!response.ok) {
          throw new Error('Failed to check slug availability')
        }

        const data = await response.json()
        setAvailabilityState(data.available ? 'available' : 'unavailable')
      } catch (err) {
        logger.error('Failed to check slug availability', { slug, error: err })
        setAvailabilityState('error')
      }
    },
    [currentSlug, mocId],
  )

  // Debounced availability check
  const handleSlugChange = useCallback(
    (value: string) => {
      field.onChange(value)

      // Clear previous timer
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      // Set new debounced check
      const timer = setTimeout(() => {
        if (value && value !== currentSlug) {
          checkSlugAvailability(value)
        } else if (!value) {
          setAvailabilityState('idle')
        }
      }, 500)

      setDebounceTimer(timer)
    },
    [field, debounceTimer, currentSlug, checkSlugAvailability],
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  // Generate slug from title
  const handleGenerateFromTitle = () => {
    if (title) {
      const generatedSlug = slugify(title)
      handleSlugChange(generatedSlug)
    }
  }

  const renderAvailabilityIndicator = () => {
    switch (availabilityState) {
      case 'checking':
        return (
          <span title="Checking availability...">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </span>
        )
      case 'available':
        return (
          <span title="Slug is available" role="status">
            <Check className="w-4 h-4 text-green-500" />
          </span>
        )
      case 'unavailable':
        return (
          <span title="Slug is already in use" role="status">
            <X className="w-4 h-4 text-destructive" />
          </span>
        )
      case 'error':
        return (
          <span title="Could not check availability" role="status">
            <X className="w-4 h-4 text-amber-500" />
          </span>
        )
      default:
        return null
    }
  }

  return (
    <FormItem>
      <FormLabel>URL Slug</FormLabel>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ''}
              onChange={e => handleSlugChange(e.target.value.toLowerCase())}
              placeholder="my-awesome-moc"
              className="pr-10"
              aria-invalid={!!error || availabilityState === 'unavailable'}
            />
          </FormControl>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {renderAvailabilityIndicator()}
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerateFromTitle}
          disabled={!title}
          className="p-2 rounded-md border border-input hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Generate slug from title"
          title="Generate from title"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <FormMessage />
      {availabilityState === 'unavailable' && (
        <p className="text-sm text-destructive">
          This slug is already used by another of your MOCs
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Leave empty to auto-generate, or enter a custom URL-friendly slug
      </p>
    </FormItem>
  )
}
