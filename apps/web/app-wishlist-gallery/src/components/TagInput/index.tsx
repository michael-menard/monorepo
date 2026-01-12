/**
 * TagInput component for adding/removing tags with chip-style UI
 *
 * Story wish-2002: Add Item Flow - AC 13
 */
import { useState, KeyboardEvent } from 'react'
import { Input, Badge } from '@repo/app-component-library'
import { X } from 'lucide-react'
import { z } from 'zod'

const TagInputPropsSchema = z.object({
  value: z.array(z.string()).default([]),
  onChange: z.function().args(z.array(z.string())).returns(z.void()),
  placeholder: z.string().optional(),
  maxTags: z.number().optional(),
  maxTagLength: z.number().optional(),
  disabled: z.boolean().optional(),
  className: z.string().optional(),
})

type TagInputProps = z.infer<typeof TagInputPropsSchema>

export function TagInput({
  value = [],
  onChange,
  placeholder = 'Add tags...',
  maxTags = 10,
  maxTagLength = 30,
  disabled = false,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()

      const newTag = inputValue.trim().toLowerCase()

      // Check max tags
      if (maxTags && value.length >= maxTags) {
        return
      }

      // Check tag length
      if (newTag.length > maxTagLength) {
        return
      }

      // Check for duplicates (case-insensitive)
      if (value.some(t => t.toLowerCase() === newTag)) {
        setInputValue('')
        return
      }

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
  }

  return (
    <div className={className}>
      <div
        className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-background"
        data-testid="tag-input-container"
      >
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1" data-testid="tag-badge">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
              aria-label={`Remove ${tag} tag`}
              data-testid={`remove-tag-${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
          data-testid="tag-input"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {value.length}/{maxTags} tags (press Enter to add)
      </p>
    </div>
  )
}

export default TagInput
