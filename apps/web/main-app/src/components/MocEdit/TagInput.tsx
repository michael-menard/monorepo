/**
 * TagInput Component
 * Story 3.1.41: Edit Form & Validation - Task 4
 *
 * Tag input with chip display, validation for max tags and tag length.
 */
import { useState, type KeyboardEvent } from 'react'
import { Input, Badge } from '@repo/app-component-library'
import { X } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  onBlur?: () => void
  placeholder?: string
  maxTags?: number
  maxTagLength?: number
  disabled?: boolean
  error?: string
  'aria-invalid'?: boolean
}

export const TagInput = ({
  value = [],
  onChange,
  onBlur,
  placeholder = 'Type and press Enter to add tags...',
  maxTags = 10,
  maxTagLength = 30,
  disabled = false,
  error,
  'aria-invalid': ariaInvalid,
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault()

      const newTag = inputValue.trim().toLowerCase()

      // Validate max tags
      if (value.length >= maxTags) {
        setLocalError(`Maximum ${maxTags} tags allowed`)
        return
      }

      // Validate tag length
      if (newTag.length > maxTagLength) {
        setLocalError(`Tags must be ${maxTagLength} characters or less`)
        return
      }

      // Validate format (letters, numbers, spaces, hyphens only)
      if (!/^[a-zA-Z0-9\s-]+$/.test(newTag)) {
        setLocalError('Tags can only contain letters, numbers, spaces, and hyphens')
        return
      }

      // Check for duplicates
      if (value.some(tag => tag.toLowerCase() === newTag)) {
        setInputValue('')
        setLocalError('Tag already exists')
        return
      }

      setLocalError(null)
      onChange([...value, newTag])
      setInputValue('')
    }

    // Remove last tag on backspace if input is empty
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
    setLocalError(null)
  }

  const displayError = error || localError
  const isAtLimit = value.length >= maxTags

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-wrap gap-2 min-h-[2.75rem] p-2 border rounded-md bg-background ${
          ariaInvalid || displayError ? 'border-destructive' : 'border-input'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1 py-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
              aria-label={`Remove tag: ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {!isAtLimit && (
          <Input
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              setLocalError(null)
            }}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            placeholder={value.length === 0 ? placeholder : 'Add another...'}
            disabled={disabled}
            className="flex-1 min-w-[140px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto shadow-none"
            aria-label="Add tag"
          />
        )}
      </div>
      <div className="flex justify-between text-xs">
        {displayError ? (
          <span className="text-destructive">{displayError}</span>
        ) : (
          <span className="text-muted-foreground">Press Enter or comma to add a tag</span>
        )}
        <span className="text-muted-foreground">
          {value.length}/{maxTags}
        </span>
      </div>
    </div>
  )
}
