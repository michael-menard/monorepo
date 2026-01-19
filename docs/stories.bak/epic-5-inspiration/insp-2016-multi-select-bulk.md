# Story insp-2016: Multi-Select & Bulk Operations

## Status

Draft

## Consolidates

- insp-1037.multi-select-mode
- insp-1038.bulk-operations-menu

## Story

**As a** user,
**I want** to select multiple items and perform bulk operations,
**so that** I can efficiently organize many inspirations at once.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - User Interface > Gallery View (Multi-select mode)

## Dependencies

- **insp-2002**: Inspiration Gallery MVP
- **insp-2006**: Create Album
- **insp-2010**: Add/Remove from Album

## Acceptance Criteria

### Multi-Select Mode

1. Toggle button to enter multi-select mode
2. Checkboxes appear on each item when active
3. Click item toggles selection
4. Shift+click selects range
5. Ctrl/Cmd+click adds to selection
6. "Select All" option
7. Selection count badge shown
8. Exit button to leave multi-select mode

### Bulk Operations Menu

9. Context menu appears when items selected
10. "Add to album..." opens album picker
11. "Create album from selected" creates new album
12. "Delete selected" with confirmation
13. "Add tags..." opens tag editor
14. "Remove tags..." removes tags from all
15. Operations only enabled when applicable

### Keyboard Shortcuts

16. Ctrl/Cmd+A selects all
17. Escape exits multi-select mode
18. Delete/Backspace triggers delete confirmation
19. "A" opens add to album picker
20. "G" creates album from selected

## Tasks / Subtasks

### Task 1: Implement Selection State (AC: 1-8)

- [ ] Create useMultiSelect hook
- [ ] Track selected IDs in state
- [ ] Add selection checkbox to cards
- [ ] Implement shift-click range selection
- [ ] Implement ctrl-click toggle
- [ ] Add select all functionality
- [ ] Add selection count display

### Task 2: Create Bulk Operations Menu (AC: 9-15)

- [ ] Create BulkOperationsBar component
- [ ] "Add to album" with album picker
- [ ] "Create album" flow
- [ ] "Delete" with confirmation
- [ ] "Add tags" with tag input
- [ ] "Remove tags" with tag selection

### Task 3: Implement Keyboard Shortcuts (AC: 16-20)

- [ ] Ctrl+A select all
- [ ] Escape exit mode
- [ ] Delete key handler
- [ ] "A" for album picker
- [ ] "G" for create album

### Task 4: Bulk API Endpoints

- [ ] POST /api/inspirations/bulk/add-to-album
- [ ] POST /api/inspirations/bulk/add-tags
- [ ] POST /api/inspirations/bulk/remove-tags
- [ ] DELETE /api/inspirations/bulk

## Dev Notes

### Multi-Select Hook

```typescript
// apps/web/main-app/src/hooks/useMultiSelect.ts
import { useState, useCallback } from 'react'

interface UseMultiSelectOptions<T> {
  items: T[]
  getId: (item: T) => string
}

export function useMultiSelect<T>({ items, getId }: UseMultiSelectOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const toggleSelection = useCallback((id: string, event?: React.MouseEvent) => {
    const newSelected = new Set(selectedIds)

    if (event?.shiftKey && lastSelectedId) {
      // Range selection
      const itemIds = items.map(getId)
      const lastIndex = itemIds.indexOf(lastSelectedId)
      const currentIndex = itemIds.indexOf(id)
      const [start, end] = lastIndex < currentIndex
        ? [lastIndex, currentIndex]
        : [currentIndex, lastIndex]

      for (let i = start; i <= end; i++) {
        newSelected.add(itemIds[i])
      }
    } else if (event?.ctrlKey || event?.metaKey) {
      // Toggle single
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
    } else {
      // Toggle single
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
    }

    setSelectedIds(newSelected)
    setLastSelectedId(id)

    // Auto-enable multi-select mode if something selected
    if (newSelected.size > 0 && !isMultiSelectMode) {
      setIsMultiSelectMode(true)
    }
  }, [selectedIds, lastSelectedId, items, getId, isMultiSelectMode])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)))
    setIsMultiSelectMode(true)
  }, [items, getId])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false)
    clearSelection()
  }, [clearSelection])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    isMultiSelectMode,
    setIsMultiSelectMode,
    toggleSelection,
    selectAll,
    clearSelection,
    exitMultiSelectMode,
    isSelected,
  }
}
```

### Bulk Operations Bar

```typescript
// apps/web/main-app/src/routes/inspiration/-components/BulkOperationsBar/index.tsx
import { Button, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@repo/ui'
import { X, FolderPlus, Folder, Trash, Tag, MoreHorizontal } from 'lucide-react'

interface BulkOperationsBarProps {
  selectedCount: number
  onAddToAlbum: () => void
  onCreateAlbum: () => void
  onDelete: () => void
  onAddTags: () => void
  onRemoveTags: () => void
  onClearSelection: () => void
}

export function BulkOperationsBar({
  selectedCount,
  onAddToAlbum,
  onCreateAlbum,
  onDelete,
  onAddTags,
  onRemoveTags,
  onClearSelection,
}: BulkOperationsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-background border rounded-full shadow-lg px-4 py-2">
        {/* Selection count */}
        <Badge variant="secondary" className="text-sm">
          {selectedCount} selected
        </Badge>

        <div className="h-6 w-px bg-border" />

        {/* Quick actions */}
        <Button variant="ghost" size="sm" onClick={onAddToAlbum}>
          <Folder className="w-4 h-4 mr-2" />
          Add to Album
        </Button>

        <Button variant="ghost" size="sm" onClick={onCreateAlbum}>
          <FolderPlus className="w-4 h-4 mr-2" />
          Create Album
        </Button>

        {/* More options dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onAddTags}>
              <Tag className="w-4 h-4 mr-2" />
              Add Tags
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRemoveTags}>
              <Tag className="w-4 h-4 mr-2" />
              Remove Tags
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border" />

        {/* Clear selection */}
        <Button variant="ghost" size="icon" onClick={onClearSelection}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
```

### Keyboard Shortcuts

```typescript
// apps/web/main-app/src/routes/inspiration/-hooks/useBulkKeyboardShortcuts.ts
import { useEffect } from 'react'

interface UseBulkKeyboardShortcutsOptions {
  isMultiSelectMode: boolean
  selectedCount: number
  onSelectAll: () => void
  onExit: () => void
  onDelete: () => void
  onAddToAlbum: () => void
  onCreateAlbum: () => void
}

export function useBulkKeyboardShortcuts({
  isMultiSelectMode,
  selectedCount,
  onSelectAll,
  onExit,
  onDelete,
  onAddToAlbum,
  onCreateAlbum,
}: UseBulkKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        onSelectAll()
        return
      }

      // Only process these if in multi-select mode with selections
      if (!isMultiSelectMode || selectedCount === 0) return

      // Escape: Exit multi-select
      if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
        return
      }

      // Delete/Backspace: Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onDelete()
        return
      }

      // A: Add to album
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onAddToAlbum()
        return
      }

      // G: Create album (Group)
      if (e.key === 'g') {
        e.preventDefault()
        onCreateAlbum()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMultiSelectMode, selectedCount, onSelectAll, onExit, onDelete, onAddToAlbum, onCreateAlbum])
}
```

### Bulk Delete Confirmation

```typescript
// apps/web/main-app/src/routes/inspiration/-components/BulkDeleteModal/index.tsx
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@repo/ui'
import { useBulkDeleteInspirationsMutation } from '@repo/api-client/rtk/inspiration-api'

interface BulkDeleteModalProps {
  selectedIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BulkDeleteModal({
  selectedIds,
  open,
  onOpenChange,
  onSuccess,
}: BulkDeleteModalProps) {
  const [bulkDelete, { isLoading }] = useBulkDeleteInspirationsMutation()

  const handleDelete = async () => {
    try {
      await bulkDelete({ ids: selectedIds }).unwrap()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Bulk delete failed:', error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the selected images and remove them from all albums.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Bulk API Endpoints

```typescript
// apps/api/endpoints/inspirations/bulk/delete/handler.ts
export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  const { ids } = JSON.parse(event.body || '{}')

  // Verify all belong to user
  const owned = await db
    .select({ id: inspirations.id })
    .from(inspirations)
    .where(and(
      eq(inspirations.userId, userId),
      inArray(inspirations.id, ids)
    ))

  const ownedIds = owned.map(o => o.id)

  // Delete S3 files
  // ... (similar to single delete)

  // Delete from junction tables
  await db.delete(inspirationAlbums).where(inArray(inspirationAlbums.inspirationId, ownedIds))
  await db.delete(inspirationMocs).where(inArray(inspirationMocs.inspirationId, ownedIds))

  // Delete inspirations
  await db.delete(inspirations).where(inArray(inspirations.id, ownedIds))

  return {
    statusCode: 200,
    body: JSON.stringify({ deleted: ownedIds.length }),
  }
}
```

## Testing

### Selection Tests

- [ ] Checkbox appears in multi-select mode
- [ ] Click toggles selection
- [ ] Shift+click selects range
- [ ] Ctrl+click adds to selection
- [ ] Select all works
- [ ] Clear selection works

### Bulk Operations Tests

- [ ] Add to album with multiple items
- [ ] Create album from selected
- [ ] Bulk delete with confirmation
- [ ] Add tags to multiple items
- [ ] Remove tags from multiple items

### Keyboard Tests

- [ ] Ctrl+A selects all
- [ ] Escape exits mode
- [ ] Delete key triggers confirmation
- [ ] "A" opens album picker
- [ ] "G" creates album

## Definition of Done

- [ ] Multi-select mode toggleable
- [ ] All selection methods work
- [ ] Bulk operations bar functional
- [ ] All bulk operations work
- [ ] Keyboard shortcuts work
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1037, insp-1038         | Claude   |
