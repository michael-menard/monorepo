# Story 3.1.42: File Management UI

## GitHub Issue
- Issue: #265
- URL: https://github.com/michael-menard/monorepo/issues/265
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** to add, remove, and replace files during edit,
**so that** I can update my MOC content.

## Epic Context

This is **Story 2.4 of Epic 2: Edit UX & Frontend**.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32)
- All Epic 1 stories (3.1.33-3.1.38)
- Story 3.1.40: Edit Page & Data Fetching
- Story 3.1.41: Edit Form & Validation

## Acceptance Criteria

1. Show existing files grouped by category (instruction, image, parts-list, thumbnail)
2. "Remove" button marks file for deletion (with confirmation)
3. "Replace" button opens file picker for same category
4. "Add" button for categories allowing multiples (images, parts-lists)
5. Drag-and-drop reorder for images (order preserved in save)
6. Preview thumbnails for images
7. Uses `@repo/upload-client` for upload operations
8. Pending changes visually distinguished from saved state

## Tasks / Subtasks

- [ ] **Task 1: Create File Manager Component** (AC: 1)
  - [ ] Create `FileManager.tsx` component
  - [ ] Group files by category
  - [ ] Show category headers with counts
  - [ ] Display file cards for each file

- [ ] **Task 2: Implement Remove Action** (AC: 2)
  - [ ] Add remove button to each file card
  - [ ] Show confirmation dialog
  - [ ] Mark file as "pending removal" (visual indicator)
  - [ ] Track removed file IDs for finalize

- [ ] **Task 3: Implement Replace Action** (AC: 3)
  - [ ] Add replace button to file card
  - [ ] Open file picker with same category validation
  - [ ] Show new file as "pending replacement"
  - [ ] Track original file ID for removal

- [ ] **Task 4: Implement Add Action** (AC: 4)
  - [ ] Add "Add" button for images and parts-lists
  - [ ] Validate file count limits
  - [ ] Show new file as "pending addition"
  - [ ] Validate file type and size

- [ ] **Task 5: Implement Drag-and-Drop Reorder** (AC: 5)
  - [ ] Use dnd-kit for drag-and-drop
  - [ ] Only enable for images category
  - [ ] Update order state on drop
  - [ ] Show order indicator (1, 2, 3...)

- [ ] **Task 6: Display Thumbnails** (AC: 6)
  - [ ] Show thumbnail for image files
  - [ ] Use presigned URL for existing files
  - [ ] Use object URL for new files (client-side preview)
  - [ ] Fallback icon for non-image files

- [ ] **Task 7: Integrate Upload Client** (AC: 7)
  - [ ] Use `@repo/upload-client` for new file uploads
  - [ ] Show upload progress
  - [ ] Handle upload errors

- [ ] **Task 8: Visual Distinction for Pending Changes** (AC: 8)
  - [ ] Existing (unchanged): normal styling
  - [ ] Pending addition: green border/badge
  - [ ] Pending removal: red strikethrough/opacity
  - [ ] Pending replacement: orange border/badge

## Dev Notes

### File Manager State

```typescript
interface FileManagerState {
  existingFiles: EditableFile[]      // From server, unchanged
  pendingAdditions: PendingFile[]    // New files to upload
  pendingRemovals: string[]          // IDs of files to remove
  pendingReplacements: Map<string, PendingFile>  // Original ID -> new file
  imageOrder: string[]               // Ordered file IDs for images
}

interface EditableFile {
  id: string
  category: FileCategory
  filename: string
  size: number
  mimeType: string
  url: string
  status: 'existing' | 'pending-removal' | 'pending-replacement'
}

interface PendingFile {
  id: string  // Client-generated ID
  file: File
  category: FileCategory
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  progress?: number
  s3Key?: string
}
```

### File Manager Component

```typescript
// apps/web/main-app/src/components/MocEdit/FileManager.tsx
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

function FileManager({ initialFiles, onChange }: FileManagerProps) {
  const [state, dispatch] = useReducer(fileManagerReducer, {
    existingFiles: initialFiles.map(f => ({ ...f, status: 'existing' })),
    pendingAdditions: [],
    pendingRemovals: [],
    pendingReplacements: new Map(),
    imageOrder: initialFiles.filter(f => f.category === 'image').map(f => f.id),
  })

  const handleRemove = (fileId: string) => {
    dispatch({ type: 'MARK_FOR_REMOVAL', fileId })
    onChange(state) // Notify parent of changes
  }

  const handleReplace = (fileId: string, newFile: File) => {
    dispatch({ type: 'MARK_FOR_REPLACEMENT', fileId, newFile })
    onChange(state)
  }

  const handleAdd = (category: FileCategory, files: File[]) => {
    files.forEach(file => {
      dispatch({ type: 'ADD_FILE', category, file })
    })
    onChange(state)
  }

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map(category => (
        <FileCategory
          key={category}
          category={category}
          files={getFilesForCategory(state, category)}
          onRemove={handleRemove}
          onReplace={handleReplace}
          onAdd={handleAdd}
          onReorder={category === 'image' ? handleReorder : undefined}
        />
      ))}
    </div>
  )
}
```

### File Card with Status

```typescript
function FileCard({ file, onRemove, onReplace }: FileCardProps) {
  const statusStyles = {
    'existing': '',
    'pending-removal': 'opacity-50 line-through border-destructive',
    'pending-replacement': 'border-orange-500 border-2',
    'pending-addition': 'border-green-500 border-2',
  }

  return (
    <Card className={cn('relative', statusStyles[file.status])}>
      <CardContent className="flex items-center gap-4 p-4">
        <FileThumbnail file={file} />

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.filename}</p>
          <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
        </div>

        <div className="flex gap-2">
          {file.status === 'pending-removal' ? (
            <Button variant="outline" size="sm" onClick={() => onUndoRemove(file.id)}>
              Undo
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onReplace(file.id)}>
                Replace
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onRemove(file.id)}>
                Remove
              </Button>
            </>
          )}
        </div>
      </CardContent>

      {/* Status badge */}
      {file.status !== 'existing' && (
        <Badge className="absolute -top-2 -right-2">
          {file.status === 'pending-addition' && 'New'}
          {file.status === 'pending-removal' && 'Removing'}
          {file.status === 'pending-replacement' && 'Replacing'}
        </Badge>
      )}
    </Card>
  )
}
```

### Drag-and-Drop for Images

```typescript
function ImageCategory({ files, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
        {files.map((file, index) => (
          <SortableFileCard key={file.id} file={file} index={index} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

### File Limits by Category

```typescript
const FILE_LIMITS = {
  instruction: { min: 1, max: 1, canAdd: false, canRemove: false, canReplace: true },
  image: { min: 0, max: 10, canAdd: true, canRemove: true, canReplace: true },
  'parts-list': { min: 0, max: 5, canAdd: true, canRemove: true, canReplace: true },
  thumbnail: { min: 0, max: 1, canAdd: true, canRemove: true, canReplace: true },
}
```

## Testing

### Test Location
- `apps/web/main-app/src/components/MocEdit/__tests__/FileManager.test.tsx`

### Test Requirements
- Unit: Files grouped by category
- Unit: Remove marks file for deletion
- Unit: Replace shows replacement UI
- Unit: Add validates limits
- Unit: Drag-and-drop reorders images
- Unit: Visual distinction for each status
- Unit: Undo remove restores file
- Integration: Upload client called for new files

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-08 | 0.1 | Initial draft from Edit MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

N/A

### Debug Log References

N/A

### Completion Notes

N/A

### File List

- `apps/web/main-app/src/components/MocEdit/FileManager.tsx` - New
- `apps/web/main-app/src/components/MocEdit/FileCard.tsx` - New
- `apps/web/main-app/src/components/MocEdit/FileThumbnail.tsx` - New
- `apps/web/main-app/src/components/MocEdit/CategorySection.tsx` - New
- `apps/web/main-app/src/components/MocEdit/useFileManager.ts` - New (reducer hook)
