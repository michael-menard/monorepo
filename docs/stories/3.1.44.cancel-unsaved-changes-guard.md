# Story 3.1.44: Cancel & Unsaved Changes Guard

## GitHub Issue
- Issue: #267
- URL: https://github.com/michael-menard/monorepo/issues/267
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** to be warned before losing unsaved edits,
**so that** I don't accidentally discard my work.

## Epic Context

This is **Story 2.6 of Epic 2: Edit UX & Frontend**.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32)
- All Epic 1 stories (3.1.33-3.1.38)
- Story 3.1.41: Edit Form & Validation
- Story 3.1.42: File Management UI

## Acceptance Criteria

1. Cancel button shows confirmation if changes exist
2. Browser navigation (back, close tab) shows native confirm if changes exist
3. In-app navigation shows custom modal if changes exist
4. "Discard" option returns to detail page
5. "Keep Editing" option stays on edit page
6. No warning if no changes made

## Tasks / Subtasks

- [ ] **Task 1: Track Dirty State** (AC: 6)
  - [ ] Create hook to track form + file changes
  - [ ] Compare current state to initial state
  - [ ] Expose `hasUnsavedChanges` boolean

- [ ] **Task 2: Cancel Button Confirmation** (AC: 1)
  - [ ] Add Cancel button to edit form
  - [ ] If dirty: show confirmation dialog
  - [ ] If clean: navigate directly

- [ ] **Task 3: Browser Navigation Guard** (AC: 2)
  - [ ] Add `beforeunload` event listener
  - [ ] Show native browser confirm if dirty
  - [ ] Remove listener on unmount

- [ ] **Task 4: In-App Navigation Guard** (AC: 3)
  - [ ] Use TanStack Router's `useBlocker` hook
  - [ ] Block navigation if dirty
  - [ ] Show custom modal with options

- [ ] **Task 5: Confirmation Modal** (AC: 4, 5)
  - [ ] Create `UnsavedChangesModal` component
  - [ ] "Discard Changes" button -> navigate away
  - [ ] "Keep Editing" button -> close modal, stay on page
  - [ ] Clear warning message

## Dev Notes

### Dirty State Hook

```typescript
// apps/web/main-app/src/components/MocEdit/useUnsavedChanges.ts
import { useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { isEqual } from 'lodash-es'

interface UseUnsavedChangesOptions {
  initialFormValues: EditMocInput
  initialFiles: EditableFile[]
  currentFiles: FileManagerState
}

export const useUnsavedChanges = ({
  initialFormValues,
  initialFiles,
  currentFiles,
}: UseUnsavedChangesOptions) => {
  const form = useFormContext()
  const currentFormValues = form.watch()

  const hasFormChanges = useMemo(() => {
    return !isEqual(currentFormValues, initialFormValues)
  }, [currentFormValues, initialFormValues])

  const hasFileChanges = useMemo(() => {
    return (
      currentFiles.pendingAdditions.length > 0 ||
      currentFiles.pendingRemovals.length > 0 ||
      currentFiles.pendingReplacements.size > 0
    )
  }, [currentFiles])

  const hasUnsavedChanges = hasFormChanges || hasFileChanges

  return {
    hasUnsavedChanges,
    hasFormChanges,
    hasFileChanges,
  }
}
```

### Browser Navigation Guard

```typescript
// apps/web/main-app/src/components/MocEdit/useBrowserLeaveGuard.ts
import { useEffect } from 'react'

export const useBrowserLeaveGuard = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // Chrome requires returnValue to be set
      return '' // For other browsers
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled])
}
```

### TanStack Router Navigation Guard

```typescript
// apps/web/main-app/src/components/MocEdit/useRouterLeaveGuard.ts
import { useBlocker } from '@tanstack/react-router'

export const useRouterLeaveGuard = (shouldBlock: boolean) => {
  const blocker = useBlocker({
    shouldBlock,
  })

  return blocker
}

// Usage in component
function EditPage() {
  const { hasUnsavedChanges } = useUnsavedChanges(...)
  const blocker = useRouterLeaveGuard(hasUnsavedChanges)

  return (
    <>
      {/* Form content */}

      {blocker.status === 'blocked' && (
        <UnsavedChangesModal
          onDiscard={() => blocker.proceed()}
          onKeepEditing={() => blocker.reset()}
        />
      )}
    </>
  )
}
```

### Unsaved Changes Modal

```typescript
// apps/web/main-app/src/components/MocEdit/UnsavedChangesModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@repo/ui'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onDiscard: () => void
  onKeepEditing: () => void
}

export function UnsavedChangesModal({
  isOpen,
  onDiscard,
  onKeepEditing,
}: UnsavedChangesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => onKeepEditing()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-muted-foreground">
            You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onKeepEditing}>
            Keep Editing
          </Button>
          <Button variant="destructive" onClick={onDiscard}>
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Cancel Button

```typescript
// In EditForm.tsx
function EditForm({ moc, onCancel }: EditFormProps) {
  const { hasUnsavedChanges } = useUnsavedChanges(...)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowConfirm(true)
    } else {
      onCancel()
    }
  }

  return (
    <>
      <form>
        {/* Form fields */}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!hasUnsavedChanges}>
            Save Changes
          </Button>
        </div>
      </form>

      <UnsavedChangesModal
        isOpen={showConfirm}
        onDiscard={onCancel}
        onKeepEditing={() => setShowConfirm(false)}
      />
    </>
  )
}
```

### Integration in Edit Page

```typescript
function InstructionsEditPage() {
  const { moc } = Route.useLoaderData()
  const navigate = useNavigate()
  const { hasUnsavedChanges, ... } = useUnsavedChanges(...)

  // Browser leave guard
  useBrowserLeaveGuard(hasUnsavedChanges)

  // Router leave guard
  const blocker = useRouterLeaveGuard(hasUnsavedChanges)

  const handleCancel = () => {
    navigate({ to: '/mocs/$slug', params: { slug: moc.slug } })
  }

  return (
    <>
      <EditForm
        moc={moc}
        onCancel={handleCancel}
        // ...
      />

      {blocker.status === 'blocked' && (
        <UnsavedChangesModal
          isOpen
          onDiscard={() => blocker.proceed()}
          onKeepEditing={() => blocker.reset()}
        />
      )}
    </>
  )
}
```

## Testing

### Test Location
- `apps/web/main-app/src/components/MocEdit/__tests__/useUnsavedChanges.test.ts`
- `apps/web/main-app/src/components/MocEdit/__tests__/UnsavedChangesModal.test.tsx`

### Test Requirements
- Unit: `hasUnsavedChanges` false when no changes
- Unit: `hasUnsavedChanges` true when form changed
- Unit: `hasUnsavedChanges` true when files changed
- Unit: Cancel shows modal when dirty
- Unit: Cancel navigates directly when clean
- Unit: Modal "Keep Editing" closes modal
- Unit: Modal "Discard" proceeds with navigation
- Integration: Browser beforeunload fires when dirty
- Integration: Router blocker activates when dirty

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

- `apps/web/main-app/src/components/MocEdit/useUnsavedChanges.ts` - New
- `apps/web/main-app/src/components/MocEdit/useBrowserLeaveGuard.ts` - New
- `apps/web/main-app/src/components/MocEdit/useRouterLeaveGuard.ts` - New
- `apps/web/main-app/src/components/MocEdit/UnsavedChangesModal.tsx` - New
- `apps/web/main-app/src/components/MocEdit/EditForm.tsx` - Modified (add cancel handling)
