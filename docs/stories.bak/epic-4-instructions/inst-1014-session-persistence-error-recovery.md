# Story 3.1.45: Session Persistence & Error Recovery

## GitHub Issue
- Issue: #268
- URL: https://github.com/michael-menard/monorepo/issues/268
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** my edit session state preserved across browser refreshes,
**so that** I don't lose work if my browser crashes or I accidentally close the tab.

## Epic Context

This is **Story 2.7 of Epic 2: Edit UX & Frontend**.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32)
- All Epic 1 stories (3.1.33-3.1.38)
- Story 3.1.42: File Management UI
- Story 3.1.43: Save Flow & Presign/Upload Handling

## Acceptance Criteria

1. Edit state persisted to localStorage on every change (debounced)
2. On edit page load: check for persisted state
3. If persisted state exists and differs from server: offer to restore
4. "Restore" loads persisted state into form
5. "Discard" clears persisted state, uses server data
6. Persisted state expires after 24 hours
7. Persisted state cleared on successful save

## Tasks / Subtasks

- [ ] **Task 1: Create Persistence Service** (AC: 1, 6)
  - [ ] Create localStorage wrapper with expiry support
  - [ ] Key format: `moc-edit-draft:${mocId}`
  - [ ] Include timestamp for expiry check
  - [ ] Debounce saves (500ms)

- [ ] **Task 2: Save State on Changes** (AC: 1)
  - [ ] Create hook to persist form state
  - [ ] Save: form values, file changes, timestamp
  - [ ] Do NOT save: file blobs (too large)
  - [ ] Track file metadata only (name, size, type)

- [ ] **Task 3: Check for Persisted State on Load** (AC: 2)
  - [ ] On edit page mount, check localStorage
  - [ ] Compare with server data `updatedAt`
  - [ ] If persisted is newer: show restore prompt

- [ ] **Task 4: Restore Dialog** (AC: 3, 4, 5)
  - [ ] Create `RestoreSessionModal` component
  - [ ] Show what will be restored (changed fields)
  - [ ] "Restore Draft" button
  - [ ] "Discard Draft" button
  - [ ] Auto-dismiss if user starts editing

- [ ] **Task 5: Clear on Success** (AC: 7)
  - [ ] After successful save, clear persisted state
  - [ ] Clear for this specific MOC ID only

- [ ] **Task 6: Handle File References** (AC: 1)
  - [ ] Store file metadata, not file content
  - [ ] On restore: show "file needs re-selection" if file was added
  - [ ] Allow re-attaching files after restore

## Dev Notes

### Persistence Service

```typescript
// apps/web/main-app/src/services/editPersistence.ts
interface PersistedEditState {
  mocId: string
  formValues: EditMocInput
  fileChanges: {
    // Store metadata only, not blobs
    pendingRemovals: string[]
    pendingAdditions: Array<{
      id: string
      category: FileCategory
      filename: string
      size: number
      mimeType: string
      // Note: file content NOT stored, needs re-selection
    }>
  }
  serverUpdatedAt: string // To detect if server changed
  savedAt: string // For expiry check
}

const EXPIRY_HOURS = 24
const STORAGE_PREFIX = 'moc-edit-draft:'

export const editPersistence = {
  save: (mocId: string, state: Omit<PersistedEditState, 'savedAt'>) => {
    const key = `${STORAGE_PREFIX}${mocId}`
    const value: PersistedEditState = {
      ...state,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(value))
  },

  load: (mocId: string): PersistedEditState | null => {
    const key = `${STORAGE_PREFIX}${mocId}`
    const raw = localStorage.getItem(key)

    if (!raw) return null

    try {
      const state = JSON.parse(raw) as PersistedEditState

      // Check expiry
      const savedAt = new Date(state.savedAt)
      const now = new Date()
      const hoursSinceSave = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60)

      if (hoursSinceSave > EXPIRY_HOURS) {
        localStorage.removeItem(key)
        return null
      }

      return state
    } catch {
      localStorage.removeItem(key)
      return null
    }
  },

  clear: (mocId: string) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${mocId}`)
  },
}
```

### Auto-Save Hook

```typescript
// apps/web/main-app/src/components/MocEdit/useAutoSave.ts
import { useDebouncedCallback } from 'use-debounce'

export const useAutoSave = (
  mocId: string,
  serverUpdatedAt: string,
  formValues: EditMocInput,
  fileChanges: FileChanges
) => {
  const debouncedSave = useDebouncedCallback(
    () => {
      editPersistence.save(mocId, {
        mocId,
        formValues,
        fileChanges: {
          pendingRemovals: fileChanges.removals,
          pendingAdditions: fileChanges.additions.map(f => ({
            id: f.id,
            category: f.category,
            filename: f.file.name,
            size: f.file.size,
            mimeType: f.file.type,
          })),
        },
        serverUpdatedAt,
      })
    },
    500 // 500ms debounce
  )

  useEffect(() => {
    debouncedSave()
  }, [formValues, fileChanges, debouncedSave])
}
```

### Restore Session Hook

```typescript
// apps/web/main-app/src/components/MocEdit/useRestoreSession.ts
export const useRestoreSession = (mocId: string, serverUpdatedAt: string) => {
  const [persistedState, setPersistedState] = useState<PersistedEditState | null>(null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)

  useEffect(() => {
    const saved = editPersistence.load(mocId)

    if (saved && saved.serverUpdatedAt === serverUpdatedAt) {
      // Server hasn't changed, safe to restore
      setPersistedState(saved)
      setShowRestorePrompt(true)
    } else if (saved) {
      // Server changed, discard stale draft
      editPersistence.clear(mocId)
    }
  }, [mocId, serverUpdatedAt])

  const restore = () => {
    setShowRestorePrompt(false)
    return persistedState
  }

  const discard = () => {
    editPersistence.clear(mocId)
    setPersistedState(null)
    setShowRestorePrompt(false)
  }

  return {
    showRestorePrompt,
    persistedState,
    restore,
    discard,
  }
}
```

### Restore Modal

```typescript
function RestoreSessionModal({
  isOpen,
  persistedState,
  onRestore,
  onDiscard,
}: RestoreSessionModalProps) {
  const savedAt = new Date(persistedState.savedAt)
  const relativeSavedAt = formatDistanceToNow(savedAt, { addSuffix: true })

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore Previous Draft?</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-muted-foreground">
            You have an unsaved draft from {relativeSavedAt}. Would you like to restore it?
          </p>

          {/* Show what changed */}
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-2">Draft includes changes to:</p>
            <ul className="list-disc pl-4 space-y-1">
              {persistedState.formValues.title && <li>Title</li>}
              {persistedState.formValues.description && <li>Description</li>}
              {persistedState.fileChanges.pendingAdditions.length > 0 && (
                <li>{persistedState.fileChanges.pendingAdditions.length} new file(s) (will need re-selection)</li>
              )}
              {persistedState.fileChanges.pendingRemovals.length > 0 && (
                <li>{persistedState.fileChanges.pendingRemovals.length} file(s) marked for removal</li>
              )}
            </ul>
          </div>

          {persistedState.fileChanges.pendingAdditions.length > 0 && (
            <Alert>
              <AlertDescription>
                New files will need to be re-selected as file content cannot be stored locally.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDiscard}>
            Discard Draft
          </Button>
          <Button onClick={onRestore}>
            Restore Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Integration in Edit Page

```typescript
function InstructionsEditPage() {
  const { moc } = Route.useLoaderData()
  const [formInitialized, setFormInitialized] = useState(false)
  const form = useForm<EditMocInput>({ ... })

  const { showRestorePrompt, persistedState, restore, discard } = useRestoreSession(
    moc.id,
    moc.updatedAt
  )

  // Auto-save current state
  useAutoSave(moc.id, moc.updatedAt, form.watch(), fileChanges)

  const handleRestore = () => {
    const saved = restore()
    if (saved) {
      form.reset(saved.formValues)
      // Restore file changes (metadata only)
      setFileChanges(saved.fileChanges)
    }
    setFormInitialized(true)
  }

  const handleDiscard = () => {
    discard()
    setFormInitialized(true)
  }

  // Clear draft on successful save
  const handleSaveSuccess = () => {
    editPersistence.clear(moc.id)
  }

  if (!formInitialized && showRestorePrompt) {
    return (
      <RestoreSessionModal
        isOpen
        persistedState={persistedState!}
        onRestore={handleRestore}
        onDiscard={handleDiscard}
      />
    )
  }

  return <EditForm moc={moc} ... />
}
```

## Testing

### Test Location
- `apps/web/main-app/src/services/__tests__/editPersistence.test.ts`
- `apps/web/main-app/src/components/MocEdit/__tests__/useRestoreSession.test.tsx`

### Test Requirements
- Unit: Persistence saves to localStorage
- Unit: Persistence respects 24h expiry
- Unit: Auto-save debounces correctly
- Unit: Restore prompt shows when draft exists
- Unit: Restore applies saved form values
- Unit: Discard clears localStorage
- Unit: Save clears localStorage
- Unit: Stale draft (server changed) is discarded
- Integration: Full restore flow

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

- `apps/web/main-app/src/services/editPersistence.ts` - New
- `apps/web/main-app/src/components/MocEdit/useAutoSave.ts` - New
- `apps/web/main-app/src/components/MocEdit/useRestoreSession.ts` - New
- `apps/web/main-app/src/components/MocEdit/RestoreSessionModal.tsx` - New
- `apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx` - Modified
