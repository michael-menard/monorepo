# Story insp-2015: Stack-to-Create-Album Gesture

## Status

Draft

## Consolidates

- insp-1035.stack-to-create-album-gesture
- insp-1036.stack-undo-toast

## Story

**As a** user,
**I want** to drag images onto each other to create albums,
**so that** I can quickly organize related images.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - Interaction Patterns > Stack-to-Create-Album Gesture

## Dependencies

- **insp-2006**: Create Album
- **insp-2014**: Drag-and-Drop Reorder

## Acceptance Criteria

### Stack Gesture

1. Drag image A over image B for 500ms triggers "stack" mode
2. Visual feedback: merge icon overlay appears on drop target
3. Distinct from reorder visual (line indicator)
4. Drop triggers album creation prompt
5. Keyboard alternative: select multiple → press "G" (group)

### Album Creation Prompt

6. Quick modal appears: "Create album?"
7. Album name input field (pre-filled with suggestion?)
8. "Create" and "Cancel" buttons
9. Create adds both images to new album
10. Cancel reverts to original positions

### Undo Toast

11. Toast appears after album creation: "Album '[name]' created"
12. "Undo" button in toast
13. 5-second timeout for undo
14. Undo deletes album, restores images to original positions
15. Keyboard: Ctrl+Z triggers undo within timeout

### Discoverability

16. Onboarding tooltip on first gallery visit (see insp-2019)
17. Tooltip: "Tip: Drag images onto each other to create albums"

## Tasks / Subtasks

### Task 1: Detect Stack vs Reorder (AC: 1-4)

- [ ] Track hover duration over target
- [ ] After 500ms, switch to "stack" mode
- [ ] Change visual feedback (merge icon)
- [ ] Track which mode is active

### Task 2: Stack Visual Feedback

- [ ] Create merge icon overlay component
- [ ] Show when in stack mode
- [ ] Animate transition from reorder indicator
- [ ] Clear distinction from reorder

### Task 3: Album Creation Prompt (AC: 6-10)

- [ ] Create StackAlbumPrompt modal
- [ ] Pass source and target images
- [ ] Generate album name suggestion
- [ ] Handle create and cancel

### Task 4: Implement Undo Toast (AC: 11-15)

- [ ] Create toast with undo action
- [ ] Track recently created album ID
- [ ] 5-second timeout
- [ ] Undo API call and UI update
- [ ] Ctrl+Z keyboard handler

### Task 5: Keyboard Group Shortcut (AC: 5)

- [ ] Track multi-selected items
- [ ] "G" key triggers group prompt
- [ ] Same album creation flow

## Dev Notes

### Enhanced DnD with Stack Detection

```typescript
// Extend DraggableGalleryGrid to support stack gesture
import { useState, useRef, useCallback } from 'react'

interface DragState {
  mode: 'reorder' | 'stack'
  sourceId: string | null
  targetId: string | null
  hoverStartTime: number | null
}

const STACK_THRESHOLD_MS = 500

export function DraggableGalleryGrid({ items, onItemsChange, onCreateAlbum }) {
  const [dragState, setDragState] = useState<DragState>({
    mode: 'reorder',
    sourceId: null,
    targetId: null,
    hoverStartTime: null,
  })
  const [showStackPrompt, setShowStackPrompt] = useState(false)
  const [stackItems, setStackItems] = useState<string[]>([])
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      // Clear hover state
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
      setDragState(prev => ({ ...prev, mode: 'reorder', targetId: null, hoverStartTime: null }))
      return
    }

    // Check if hovering over same target
    if (dragState.targetId === over.id && dragState.hoverStartTime) {
      const hoverDuration = Date.now() - dragState.hoverStartTime

      if (hoverDuration >= STACK_THRESHOLD_MS && dragState.mode !== 'stack') {
        // Switch to stack mode
        setDragState(prev => ({ ...prev, mode: 'stack' }))
      }
    } else {
      // New target, reset timer
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }

      setDragState(prev => ({
        ...prev,
        targetId: over.id as string,
        hoverStartTime: Date.now(),
        mode: 'reorder',
      }))

      // Set timer to switch to stack mode
      hoverTimerRef.current = setTimeout(() => {
        setDragState(prev => ({ ...prev, mode: 'stack' }))
      }, STACK_THRESHOLD_MS)
    }
  }, [dragState])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    // Clear timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }

    if (!over) {
      setDragState({ mode: 'reorder', sourceId: null, targetId: null, hoverStartTime: null })
      return
    }

    if (dragState.mode === 'stack' && active.id !== over.id) {
      // Stack mode - show album creation prompt
      setStackItems([active.id as string, over.id as string])
      setShowStackPrompt(true)
    } else if (active.id !== over.id) {
      // Reorder mode - normal reorder
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)
      const newItems = arrayMove(items, oldIndex, newIndex)
      onItemsChange(newItems)
      await reorderInspirations({ orderedIds: newItems.map(i => i.id) })
    }

    setDragState({ mode: 'reorder', sourceId: null, targetId: null, hoverStartTime: null })
  }, [dragState.mode, items, onItemsChange])

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                isStackTarget={dragState.mode === 'stack' && dragState.targetId === item.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Stack Album Prompt */}
      <StackAlbumPrompt
        open={showStackPrompt}
        inspirationIds={stackItems}
        onOpenChange={setShowStackPrompt}
        onSuccess={(albumId) => {
          setShowStackPrompt(false)
          setStackItems([])
          onCreateAlbum?.(albumId)
        }}
        onCancel={() => {
          setShowStackPrompt(false)
          setStackItems([])
        }}
      />
    </>
  )
}
```

### Stack Visual Indicator

```typescript
// Sortable item with stack indicator
interface SortableItemProps {
  item: Inspiration
  isStackTarget: boolean
}

function SortableItem({ item, isStackTarget }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
      className="relative"
    >
      <InspirationCard inspiration={item} />

      {/* Stack indicator overlay */}
      {isStackTarget && (
        <div className="absolute inset-0 bg-primary/30 rounded-lg flex items-center justify-center animate-pulse">
          <div className="bg-primary text-primary-foreground rounded-full p-3">
            <FolderPlus className="w-8 h-8" />
          </div>
        </div>
      )}
    </div>
  )
}
```

### Stack Album Prompt

```typescript
// apps/web/main-app/src/routes/inspiration/-components/StackAlbumPrompt/index.tsx
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
} from '@repo/ui'
import { useCreateAlbumMutation } from '@repo/api-client/rtk/inspiration-api'

interface StackAlbumPromptProps {
  open: boolean
  inspirationIds: string[]
  onOpenChange: (open: boolean) => void
  onSuccess: (albumId: string) => void
  onCancel: () => void
}

export function StackAlbumPrompt({
  open,
  inspirationIds,
  onOpenChange,
  onSuccess,
  onCancel,
}: StackAlbumPromptProps) {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createAlbum] = useCreateAlbumMutation()

  const handleCreate = async () => {
    if (!name.trim()) return

    setIsCreating(true)
    try {
      const result = await createAlbum({
        title: name.trim(),
        inspirationIds,
      }).unwrap()

      onSuccess(result.id)
    } catch (error) {
      console.error('Failed to create album:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create album?</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Album name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                handleCreate()
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Undo Toast

```typescript
// apps/web/main-app/src/routes/inspiration/-components/UndoToast/index.tsx
import { useEffect, useState } from 'react'
import { Toast, ToastAction, ToastDescription, ToastTitle } from '@repo/ui'
import { useDeleteAlbumMutation } from '@repo/api-client/rtk/inspiration-api'

const UNDO_TIMEOUT_MS = 5000

export function useUndoAlbum() {
  const [recentAlbum, setRecentAlbum] = useState<{ id: string; title: string } | null>(null)
  const [deleteAlbum] = useDeleteAlbumMutation()

  // Show toast when album created
  const showUndoToast = (album: { id: string; title: string }) => {
    setRecentAlbum(album)
  }

  // Auto-clear after timeout
  useEffect(() => {
    if (recentAlbum) {
      const timer = setTimeout(() => {
        setRecentAlbum(null)
      }, UNDO_TIMEOUT_MS)
      return () => clearTimeout(timer)
    }
  }, [recentAlbum])

  // Ctrl+Z handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && recentAlbum) {
        e.preventDefault()
        handleUndo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [recentAlbum])

  const handleUndo = async () => {
    if (!recentAlbum) return

    try {
      await deleteAlbum({ id: recentAlbum.id, deleteContents: false }).unwrap()
      setRecentAlbum(null)
    } catch (error) {
      console.error('Failed to undo:', error)
    }
  }

  const UndoToastComponent = recentAlbum ? (
    <Toast open={!!recentAlbum} onOpenChange={() => setRecentAlbum(null)}>
      <ToastTitle>Album "{recentAlbum.title}" created</ToastTitle>
      <ToastDescription>
        Press Ctrl+Z to undo
      </ToastDescription>
      <ToastAction altText="Undo" onClick={handleUndo}>
        Undo
      </ToastAction>
    </Toast>
  ) : null

  return { showUndoToast, UndoToastComponent }
}
```

## Testing

### Stack Gesture Tests

- [ ] Hover 500ms switches to stack mode
- [ ] Merge icon appears on target
- [ ] Drop in stack mode opens prompt
- [ ] Cancel reverts to original positions
- [ ] Create makes album with both items

### Undo Tests

- [ ] Toast appears after album creation
- [ ] Undo button deletes album
- [ ] Ctrl+Z works within timeout
- [ ] Toast auto-dismisses after 5s
- [ ] Images restored after undo

### Keyboard Tests

- [ ] Multi-select items
- [ ] Press "G" opens group prompt
- [ ] Same album creation flow

## Definition of Done

- [ ] Stack gesture working with visual feedback
- [ ] Album creation prompt functional
- [ ] Undo toast with 5s timeout
- [ ] Ctrl+Z keyboard shortcut
- [ ] "G" keyboard alternative
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1035, insp-1036         | Claude   |
