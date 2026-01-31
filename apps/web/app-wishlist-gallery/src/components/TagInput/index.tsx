/**
 * TagInput Component
 *
 * Chip-based tag input for wishlist items.
 * Supports adding via Enter/comma, removing via click or backspace.
 *
 * Story wish-2002: Add Item Flow
 */

import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'
import { X } from 'lucide-react'
import { Badge, Input, cn } from '@repo/app-component-library'

const MAX_TAGS = 20
const MAX_TAG_LENGTH = 50

export interface TagInputProps {
  /**
   * Current tags
   */
  value: string[]

  /**
   * Called when tags change
   */
  onChange: (tags: string[]) => void

  /**
   * Placeholder text
   */
  placeholder?: string

  /**
   * Whether the input is disabled
   */
  disabled?: boolean

  /**
   * Additional class names
   */
  className?: string

  /**
   * ID for the input element
   */
  id?: string
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Add tag...',
  disabled = false,
  className,
  id,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase()

      // Validate
      if (!trimmed) return
      if (trimmed.length > MAX_TAG_LENGTH) return
      if (value.length >= MAX_TAGS) return
      if (value.includes(trimmed)) return

      onChange([...value, trimmed])
      setInputValue('')
    },
    [value, onChange],
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter(tag => tag !== tagToRemove))
    },
    [value, onChange],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag(inputValue)
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        // Remove last tag on backspace with empty input
        const lastTag = value[value.length - 1]
        if (lastTag) {
          removeTag(lastTag)
        }
      }
    },
    [inputValue, value, addTag, removeTag],
  )

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value

      // Check for comma and add tag
      if (newValue.includes(',')) {
        const parts = newValue.split(',')
        parts.forEach((part, index) => {
          if (index < parts.length - 1) {
            addTag(part)
          } else {
            setInputValue(part)
          }
        })
      } else {
        setInputValue(newValue)
      }
    },
    [addTag],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text')

      // If pasted text contains commas, split and add as tags
      if (pastedText.includes(',')) {
        e.preventDefault()
        const parts = pastedText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
        const newTags = [...value]

        for (const part of parts) {
          if (
            newTags.length < MAX_TAGS &&
            part.length <= MAX_TAG_LENGTH &&
            !newTags.includes(part.toLowerCase())
          ) {
            newTags.push(part.toLowerCase())
          }
        }

        onChange(newTags)
      }
    },
    [value, onChange],
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Tags display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Selected tags">
          {value.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
              role="listitem"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={value.length >= MAX_TAGS ? 'Max tags reached' : placeholder}
        disabled={disabled || value.length >= MAX_TAGS}
        className="h-9"
        aria-describedby={`${id}-hint`}
      />

      {/* Hint text */}
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Press Enter or comma to add. {MAX_TAGS - value.length} tags remaining.
      </p>
    </div>
  )
}
