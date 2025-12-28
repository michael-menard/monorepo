# Story lnch-1050: Confirmation & Success Feedback Audit

## Status

Draft

## Story

**As a** user completing actions,
**I want** clear confirmation of success,
**so that** I know my actions were completed.

## Epic Context

This is **Story 12 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **Medium** - Improves user confidence.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other UX stories)

## Related Stories

- lnch-1040: Error Messages (opposite of success feedback)
- lnch-1042: Loading States (precedes success feedback)

## Acceptance Criteria

1. All create/update actions show success feedback
2. Delete actions show confirmation
3. Upload completion is clearly communicated
4. Success messages use consistent styling
5. Success messages auto-dismiss appropriately
6. Critical actions have extra confirmation
7. Undo option available where appropriate

## Tasks / Subtasks

- [ ] **Task 1: Audit Current Success Feedback** (AC: 1, 2, 3)
  - [ ] List all create/update actions
  - [ ] Document current feedback
  - [ ] Identify gaps

- [ ] **Task 2: Standardize Success Toasts** (AC: 1, 4)
  - [ ] Create success toast component
  - [ ] Consistent green styling
  - [ ] Include action description

- [ ] **Task 3: Add Delete Confirmations** (AC: 2)
  - [ ] Confirm dialog before delete
  - [ ] Clear description of impact
  - [ ] Success toast after delete

- [ ] **Task 4: Improve Upload Feedback** (AC: 3)
  - [ ] Progress indicator during upload
  - [ ] Success message on completion
  - [ ] Clear error if failed

- [ ] **Task 5: Configure Auto-Dismiss** (AC: 5)
  - [ ] Success: 3-5 seconds
  - [ ] Errors: Manual dismiss
  - [ ] Warnings: 5-10 seconds

- [ ] **Task 6: Add Extra Confirmation** (AC: 6)
  - [ ] Delete account: Type to confirm
  - [ ] Bulk delete: Explicit confirmation
  - [ ] Irreversible actions: Extra step

- [ ] **Task 7: Add Undo Where Possible** (AC: 7)
  - [ ] Soft-deleted items: Undo toast
  - [ ] Recent changes: Undo option
  - [ ] Time-limited undo window

## Dev Notes

### Success Feedback Inventory

| Action | Current Feedback | Target |
|--------|------------------|--------|
| Create MOC | Unknown | Success toast |
| Update MOC | Unknown | Success toast |
| Delete MOC | Unknown | Confirm → Success toast |
| Upload file | Progress bar | Progress → Success toast |
| Save settings | Unknown | Success toast |
| Delete account | Unknown | Confirm (type) → Success |

### Success Toast Pattern
```tsx
import { toast } from '@repo/ui'

// After successful action
toast.success({
  title: 'MOC created!',
  description: 'Your MOC "Build Name" has been saved.',
  duration: 5000, // 5 seconds
})
```

### Delete Confirmation Pattern
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this MOC?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. The MOC and all associated
        files will be permanently deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Type-to-Confirm Pattern
```tsx
const [confirmText, setConfirmText] = useState('')
const canDelete = confirmText === 'DELETE'

<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete your account?</DialogTitle>
      <DialogDescription>
        This will permanently delete your account and all data.
        Type DELETE to confirm.
      </DialogDescription>
    </DialogHeader>
    <Input
      value={confirmText}
      onChange={e => setConfirmText(e.target.value)}
      placeholder="Type DELETE to confirm"
    />
    <DialogFooter>
      <Button variant="destructive" disabled={!canDelete}>
        Delete Account
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Undo Toast Pattern
```tsx
toast.success({
  title: 'MOC deleted',
  action: {
    label: 'Undo',
    onClick: () => restoreMoc(mocId)
  },
  duration: 10000, // 10 seconds to undo
})
```

## Testing

### Test Requirements
- Unit: Toast components render
- Integration: Actions show correct feedback
- E2E: Delete flow shows confirmation
- UX: Auto-dismiss timing appropriate

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
