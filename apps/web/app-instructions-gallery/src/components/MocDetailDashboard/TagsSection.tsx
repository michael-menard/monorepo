import { useState, useCallback, useRef, type KeyboardEvent } from 'react'
import { AppBadge as Badge, Button, Input } from '@repo/app-component-library'
import { Pencil, Check, X, Plus, Scissors, Merge } from 'lucide-react'
import { logger } from '@repo/logger'
import {
  useUpdateMocMutation,
  useSplitTagMutation,
  useMergeTagsMutation,
  useRenameTagMutation,
} from '@repo/api-client/rtk/instructions-api'

type EditMode = 'tags' | 'split' | 'merge' | 'rename'

interface TagsSectionProps {
  mocId: string
  tags: string[]
}

export function TagsSection({ mocId, tags }: TagsSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [mode, setMode] = useState<EditMode>('tags')
  const [draft, setDraft] = useState<string[]>(tags)
  const [inputValue, setInputValue] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Split state
  const [splittingTag, setSplittingTag] = useState<string | null>(null)
  const [splitInput, setSplitInput] = useState('')

  // Merge state
  const [mergeSelected, setMergeSelected] = useState<string[]>([])
  const [mergeTarget, setMergeTarget] = useState('')

  // Rename state
  const [renamingTag, setRenamingTag] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')

  const [updateMoc, { isLoading }] = useUpdateMocMutation()
  const [splitTag, { isLoading: isSplitting }] = useSplitTagMutation()
  const [mergeTagsMutation, { isLoading: isMerging }] = useMergeTagsMutation()
  const [renameTagMutation, { isLoading: isRenaming }] = useRenameTagMutation()
  const inputRef = useRef<HTMLInputElement>(null)
  const splitInputRef = useRef<HTMLInputElement>(null)
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setSaveError(null)
    setInputValue('')
    setSplittingTag(null)
    setSplitInput('')
    setMergeSelected([])
    setMergeTarget('')
    setRenamingTag(null)
    setRenameInput('')
    setMode('tags')
  }, [])

  const handleEdit = useCallback(() => {
    setDraft([...tags])
    resetState()
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [tags, resetState])

  const handleCancel = useCallback(() => {
    setDraft([...tags])
    resetState()
    setIsEditing(false)
  }, [tags, resetState])

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

  // Split handlers
  const handleStartSplit = useCallback((tag: string) => {
    setSplittingTag(tag)
    setSplitInput(tag)
    setSaveError(null)
    setMode('split')
    setTimeout(() => splitInputRef.current?.focus(), 0)
  }, [])

  const handleCancelSplit = useCallback(() => {
    setSplittingTag(null)
    setSplitInput('')
    setSaveError(null)
    setMode('tags')
  }, [])

  const handleConfirmSplit = useCallback(async () => {
    if (!splittingTag) return
    const newTags = splitInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    if (newTags.length < 2) {
      setSaveError('Enter at least 2 comma-separated tags to split into')
      return
    }
    try {
      setSaveError(null)
      await splitTag({ oldTag: splittingTag, newTags }).unwrap()
      setDraft(prev => {
        const without = prev.filter(t => t !== splittingTag)
        return [
          ...without,
          ...newTags.filter(nt => !without.some(w => w.toLowerCase() === nt.toLowerCase())),
        ]
      })
      setSplittingTag(null)
      setSplitInput('')
      setMode('tags')
    } catch (err) {
      logger.error('Failed to split tag', err)
      setSaveError('Failed to split tag. Please try again.')
    }
  }, [splittingTag, splitInput, splitTag])

  const handleSplitKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirmSplit()
      }
      if (e.key === 'Escape') handleCancelSplit()
    },
    [handleConfirmSplit, handleCancelSplit],
  )

  // Merge handlers
  const handleStartMerge = useCallback(() => {
    setMergeSelected([])
    setMergeTarget('')
    setSaveError(null)
    setMode('merge')
  }, [])

  const handleCancelMerge = useCallback(() => {
    setMergeSelected([])
    setMergeTarget('')
    setSaveError(null)
    setMode('tags')
  }, [])

  const toggleMergeTag = useCallback((tag: string) => {
    setMergeSelected(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      // Pre-fill merge target with the first selected tag
      if (next.length === 1) setMergeTarget(next[0])
      return next
    })
  }, [])

  const handleConfirmMerge = useCallback(async () => {
    const target = mergeTarget.trim()
    if (!target) {
      setSaveError('Enter the tag name to keep')
      return
    }
    if (mergeSelected.length < 2) {
      setSaveError('Select at least 2 tags to merge')
      return
    }
    try {
      setSaveError(null)
      await mergeTagsMutation({ oldTags: mergeSelected, newTag: target }).unwrap()
      setDraft(prev => {
        const without = prev.filter(t => !mergeSelected.includes(t))
        if (!without.some(w => w.toLowerCase() === target.toLowerCase())) {
          return [...without, target]
        }
        return without
      })
      setMergeSelected([])
      setMergeTarget('')
      setMode('tags')
    } catch (err) {
      logger.error('Failed to merge tags', err)
      setSaveError('Failed to merge tags. Please try again.')
    }
  }, [mergeSelected, mergeTarget, mergeTagsMutation])

  const handleMergeKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirmMerge()
      }
      if (e.key === 'Escape') handleCancelMerge()
    },
    [handleConfirmMerge, handleCancelMerge],
  )

  // Rename handlers
  const handleStartRename = useCallback((tag: string) => {
    setRenamingTag(tag)
    setRenameInput(tag)
    setSaveError(null)
    setMode('rename')
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }, [])

  const handleCancelRename = useCallback(() => {
    setRenamingTag(null)
    setRenameInput('')
    setSaveError(null)
    setMode('tags')
  }, [])

  const handleConfirmRename = useCallback(async () => {
    if (!renamingTag) return
    const newName = renameInput.trim()
    if (!newName) {
      setSaveError('Tag name cannot be empty')
      return
    }
    if (newName === renamingTag) {
      handleCancelRename()
      return
    }
    try {
      setSaveError(null)
      await renameTagMutation({ oldTag: renamingTag, newTag: newName }).unwrap()
      setDraft(prev => prev.map(t => (t === renamingTag ? newName : t)))
      setRenamingTag(null)
      setRenameInput('')
      setMode('tags')
    } catch (err) {
      logger.error('Failed to rename tag', err)
      setSaveError('Failed to rename tag. Please try again.')
    }
  }, [renamingTag, renameInput, renameTagMutation, handleCancelRename])

  const handleRenameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirmRename()
      }
      if (e.key === 'Escape') handleCancelRename()
    },
    [handleConfirmRename, handleCancelRename],
  )

  const busy = isLoading || isSplitting || isMerging || isRenaming

  if (!isEditing) {
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

  // Split mode
  if (mode === 'split' && splittingTag) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          Edit below — separate each tag with a comma:
        </p>
        <Input
          ref={splitInputRef}
          type="text"
          value={splitInput}
          onChange={e => {
            setSplitInput(e.target.value)
            setSaveError(null)
          }}
          onKeyDown={handleSplitKeyDown}
          disabled={busy}
          className="text-xs h-8"
          aria-label="Split tag values"
        />
        <p className="text-xs text-muted-foreground">Applies to all MOCs with this tag</p>
        {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
        <div className="flex gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelSplit}
            disabled={busy}
            className="h-7 text-xs px-2"
          >
            Back
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmSplit}
            disabled={busy}
            className="h-7 text-xs px-2"
          >
            <Scissors className="h-3 w-3 mr-1" />
            {isSplitting ? 'Splitting...' : 'Split'}
          </Button>
        </div>
      </div>
    )
  }

  // Merge mode
  if (mode === 'merge') {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Select tags to combine:</p>
        <div className="flex flex-wrap gap-1.5 min-h-[2.25rem] p-2 border rounded-md bg-background border-input">
          {draft.map(tag => {
            const selected = mergeSelected.includes(tag)
            return (
              <Badge
                key={tag}
                variant="secondary"
                className={`text-xs py-1 cursor-pointer transition-colors ${
                  selected
                    ? 'bg-sky-500/30 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500/50'
                    : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20'
                } border-0`}
                onClick={() => toggleMergeTag(tag)}
                role="checkbox"
                aria-checked={selected}
              >
                {tag}
              </Badge>
            )
          })}
        </div>
        {mergeSelected.length >= 2 ? (
          <>
            <p className="text-xs text-muted-foreground">Keep as:</p>
            <Input
              ref={mergeInputRef}
              type="text"
              value={mergeTarget}
              onChange={e => {
                setMergeTarget(e.target.value)
                setSaveError(null)
              }}
              onKeyDown={handleMergeKeyDown}
              disabled={busy}
              className="text-xs h-8"
              aria-label="Merged tag name"
            />
            <p className="text-xs text-muted-foreground">Applies to all MOCs with these tags</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {mergeSelected.length === 0
              ? 'Click tags to select them'
              : 'Select at least one more tag'}
          </p>
        )}
        {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
        <div className="flex gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelMerge}
            disabled={busy}
            className="h-7 text-xs px-2"
          >
            Back
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmMerge}
            disabled={busy || mergeSelected.length < 2}
            className="h-7 text-xs px-2"
          >
            <Merge className="h-3 w-3 mr-1" />
            {isMerging ? 'Merging...' : 'Merge'}
          </Button>
        </div>
      </div>
    )
  }

  // Rename mode
  if (mode === 'rename' && renamingTag) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          Rename <span className="font-medium text-foreground">{renamingTag}</span>:
        </p>
        <Input
          ref={renameInputRef}
          type="text"
          value={renameInput}
          onChange={e => {
            setRenameInput(e.target.value)
            setSaveError(null)
          }}
          onKeyDown={handleRenameKeyDown}
          disabled={busy}
          className="text-xs h-8"
          aria-label="New tag name"
        />
        <p className="text-xs text-muted-foreground">Applies to all MOCs with this tag</p>
        {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
        <div className="flex gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelRename}
            disabled={busy}
            className="h-7 text-xs px-2"
          >
            Back
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmRename}
            disabled={busy}
            className="h-7 text-xs px-2"
          >
            <Check className="h-3 w-3 mr-1" />
            {isRenaming ? 'Renaming...' : 'Rename'}
          </Button>
        </div>
      </div>
    )
  }

  // Default edit mode
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[2.25rem] p-2 border rounded-md bg-background border-input">
        {draft.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-0 text-xs gap-0.5 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleStartRename(tag)}
              disabled={busy}
              className="ml-0.5 hover:bg-sky-500/20 rounded-full p-0.5 transition-colors"
              aria-label={`Rename tag: ${tag}`}
              title="Rename tag"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleStartSplit(tag)}
              disabled={busy}
              className="ml-0.5 hover:bg-sky-500/20 rounded-full p-0.5 transition-colors"
              aria-label={`Split tag: ${tag}`}
              title="Split tag"
            >
              <Scissors className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={busy}
              className="hover:bg-sky-500/20 rounded-full p-0.5 transition-colors"
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
          disabled={busy || draft.length >= 20}
          className="flex-1 min-w-[80px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-6 text-xs shadow-none"
          aria-label="Add tag"
        />
      </div>
      {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
      <div className="flex gap-1.5 justify-end">
        {draft.length >= 2 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartMerge}
            disabled={busy}
            className="h-7 text-xs px-2 mr-auto"
          >
            <Merge className="h-3 w-3 mr-1" />
            Merge
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={busy}
          className="h-7 text-xs px-2"
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={busy} className="h-7 text-xs px-2">
          <Check className="h-3 w-3 mr-1" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
