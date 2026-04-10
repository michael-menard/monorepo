import { useState, useCallback, useRef, type KeyboardEvent } from 'react'
import { AppBadge as Badge, Button, Input } from '@repo/app-component-library'
import { Pencil, Check, X, Plus } from 'lucide-react'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'

interface TagsSectionProps {
  mocId: string
  tags: string[]
}

export function TagsSection({ mocId, tags }: TagsSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(tags)
  const [inputValue, setInputValue] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updateMoc, { isLoading }] = useUpdateMocMutation()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleEdit = useCallback(() => {
    setDraft([...tags])
    setSaveError(null)
    setInputValue('')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [tags])

  const handleCancel = useCallback(() => {
    setDraft([...tags])
    setSaveError(null)
    setInputValue('')
    setIsEditing(false)
  }, [tags])

  const handleSave = useCallback(async () => {
    try {
      setSaveError(null)
      await updateMoc({ id: mocId, input: { tags: draft } }).unwrap()
      setIsEditing(false)
    } catch (err) {
      logger.error('Failed to save tags', err)
      setSaveError('Failed to save. Please try again.')
    }
  }, [mocId, draft, updateMoc])

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim()
      if (!tag) return
      if (draft.length >= 20) return
      if (draft.some(t => t.toLowerCase() === tag.toLowerCase())) {
        setInputValue('')
        return
      }
      setDraft(prev => [...prev, tag])
      setInputValue('')
    },
    [draft],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
        e.preventDefault()
        addTag(inputValue)
      }
      if (e.key === 'Backspace' && !inputValue && draft.length > 0) {
        setDraft(prev => prev.slice(0, -1))
      }
    },
    [inputValue, addTag, draft.length],
  )

  const removeTag = useCallback((tagToRemove: string) => {
    setDraft(prev => prev.filter(t => t !== tagToRemove))
  }, [])

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 min-h-[2.25rem] p-2 border rounded-md bg-background border-input">
          {draft.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-0 text-xs gap-1 py-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={isLoading}
                className="ml-0.5 hover:bg-sky-500/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remove tag: ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={draft.length === 0 ? 'Add a tag...' : 'Add...'}
            disabled={isLoading || draft.length >= 20}
            className="flex-1 min-w-[80px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-6 text-xs shadow-none"
            aria-label="Add tag"
          />
        </div>
        {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
        <div className="flex gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-7 text-xs px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading} className="h-7 text-xs px-2">
            <Check className="h-3 w-3 mr-1" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group/tags relative">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Tags">
          {tags.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              role="listitem"
              className="bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 border-0 text-xs"
            >
              {tag}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No tags</p>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEdit}
        className="absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover/tags:opacity-100 transition-opacity"
        aria-label="Edit tags"
      >
        {tags.length > 0 ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </Button>
    </div>
  )
}
