/**
 * Simple TagInput component for adding/removing tags
 * Uses shadcn Input and Badge components
 */
import { useState, KeyboardEvent } from 'react'
import { Input, Badge } from '@repo/app-component-library'
import { X } from 'lucide-react'
import { z } from 'zod'

const TagInputPropsSchema = z.object({
  value: z.array(z.string()).default([]),
  onChange: z.function(z.tuple([z.array(z.string())]), z.void()),
  placeholder: z.string().optional(),
  maxTags: z.number().optional(),
  maxTagLength: z.number().optional(),
  disabled: z.boolean().optional(),
})

type TagInputProps = z.infer<typeof TagInputPropsSchema>

export const TagInput = ({
  value = [],
  onChange,
  placeholder = 'Add tags...',
  maxTags,
  maxTagLength = 30,
  disabled = false,
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()

      const newTag = inputValue.trim()

      // Check max tags
      if (maxTags && value.length >= maxTags) {
        return
      }

      // Check tag length
      if (newTag.length > maxTagLength) {
        return
      }

      // Check for duplicates
      if (value.includes(newTag)) {
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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-background">
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
              aria-label={`Remove ${tag}`}
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
        />
      </div>
      {maxTags ? (
        <p className="text-xs text-muted-foreground">
          {value.length}/{maxTags} tags
        </p>
      ) : null}
    </div>
  )
}
