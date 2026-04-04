import { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Input } from '@repo/app-component-library'
import { Pencil, Check, X } from 'lucide-react'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'
import type { Moc } from './__types__/moc'

interface MetaCardProps {
  moc: Pick<Moc, 'id' | 'title'>
}

export function MetaCard({ moc }: MetaCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(moc.title)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updateMoc, { isLoading }] = useUpdateMocMutation()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleEdit = useCallback(() => {
    setDraft(moc.title)
    setSaveError(null)
    setIsEditing(true)
  }, [moc.title])

  const handleCancel = useCallback(() => {
    setDraft(moc.title)
    setSaveError(null)
    setIsEditing(false)
  }, [moc.title])

  const handleSave = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    try {
      setSaveError(null)
      await updateMoc({ id: moc.id, input: { title: trimmed } }).unwrap()
      setIsEditing(false)
    } catch (err) {
      logger.error('Failed to save title', err)
      setSaveError('Failed to save. Please try again.')
    }
  }, [moc.id, draft, updateMoc])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave()
      if (e.key === 'Escape') handleCancel()
    },
    [handleSave, handleCancel],
  )

  if (isEditing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-3xl font-bold h-auto py-1 px-2"
            disabled={isLoading}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isLoading}
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSave}
            disabled={isLoading || !draft.trim()}
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
        {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
      </div>
    )
  }

  return (
    <div className="group relative flex items-center gap-2">
      <h1 className="text-3xl font-bold leading-tight text-balance text-foreground">{moc.title}</h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEdit}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        aria-label="Edit title"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  )
}
