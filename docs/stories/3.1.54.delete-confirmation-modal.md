# Story 3.1.54: Delete Confirmation Modal

## GitHub Issue
- Issue: #278
- URL: https://github.com/michael-menard/monorepo/issues/278
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** to confirm deletion explicitly with a checkbox,
**so that** I don't accidentally delete my MOC.

## Epic Context

This is **Story 2.2 of Epic 2: Delete UX & Frontend** from the Delete MOC Instructions PRD.

**⚠️ PACKAGE REQUIREMENT:** This component MUST be created in `/packages` for reuse across all delete flows app-wide.

## Blocked By

- Story 3.1.48 (Delete Endpoint)
- Story 3.1.53 (Delete Entry Points)

## Acceptance Criteria

1. Modal shows MOC title and warning text
2. Modal shows MOC stats (views, downloads, upload date) for emotional pause
3. Checkbox "I understand this will hide my MOC" required
4. "Delete MOC" button disabled until checkbox checked
5. Cancel closes modal without action
6. Delete triggers API call with loading state
7. On success: close modal, redirect to My Instructions, show success toast
8. On error: show error toast with retry option

## Tasks / Subtasks

- [ ] **Task 1: Create Package Component** (AC: 1, 2, 3, 4)
  - [ ] Create `packages/core/app-component-library/src/DeleteConfirmationModal/index.tsx`
  - [ ] OR create new `packages/core/delete-components/` package
  - [ ] Component must be GENERIC (not MOC-specific)
  - [ ] Props: `entityType`, `title`, `stats`, `onDelete`, `onCancel`, `open`

- [ ] **Task 2: Modal Layout** (AC: 1, 2)
  - [ ] Use `AlertDialog` from `@repo/ui`
  - [ ] Display entity title prominently
  - [ ] Display stats (configurable via props)
  - [ ] Warning box with bullet points

- [ ] **Task 3: Checkbox Confirmation** (AC: 3, 4)
  - [ ] Add checkbox with label
  - [ ] Disable delete button until checked
  - [ ] Use `aria-describedby` for accessibility

- [ ] **Task 4: Delete Flow** (AC: 5, 6, 7, 8)
  - [ ] Cancel button closes modal (calls `onCancel`)
  - [ ] Delete button calls `onDelete` with loading state
  - [ ] Show spinner on delete button during API call
  - [ ] Success: close modal, call success callback
  - [ ] Error: show error toast with retry

- [ ] **Task 5: Toast Notifications** (AC: 7, 8)
  - [ ] Success toast: "MOC deleted. You have 30 days to restore it." with [View Deleted] link
  - [ ] Error toast: "Couldn't delete MOC. Please try again." with [Retry] button

- [ ] **Task 6: Export from Package** (AC: 1)
  - [ ] Export `DeleteConfirmationModal` from package
  - [ ] Add to package's public API

## Dev Notes

### Package Location (CRITICAL)

[Source: PRD delete-moc-instructions.md#Section-3]

```
packages/core/app-component-library/src/
└── DeleteConfirmationModal/
    ├── index.tsx
    ├── __tests__/
    │   └── DeleteConfirmationModal.test.tsx
    └── __types__/
        └── index.ts
```

### Generic Component Props

```typescript
// packages/core/app-component-library/src/DeleteConfirmationModal/__types__/index.ts
import { z } from 'zod'

export const DeleteConfirmationModalPropsSchema = z.object({
  open: z.boolean(),
  entityType: z.string(),  // "MOC", "Collection", "Account"
  title: z.string(),
  stats: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  warningPoints: z.array(z.string()).optional(),
  retentionDays: z.number().default(30),
  onDelete: z.function(),
  onCancel: z.function(),
  isDeleting: z.boolean().optional(),
})

export type DeleteConfirmationModalProps = z.infer<typeof DeleteConfirmationModalPropsSchema>
```

### Modal Layout (Desktop)

[Source: PRD delete-moc-instructions.md#Section-3]

```tsx
<AlertDialog open={open}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>⚠️ Delete {entityType}</AlertDialogTitle>
    </AlertDialogHeader>
    
    <div className="space-y-4">
      <p>Are you sure you want to delete:</p>
      <p className="font-semibold">📄 "{title}"</p>
      
      {stats && (
        <p className="text-sm text-muted-foreground">
          {stats.map(s => `${s.value} ${s.label}`).join(' · ')}
        </p>
      )}
      
      <div className="bg-muted p-4 rounded-md">
        <ul className="list-disc list-inside text-sm">
          {warningPoints.map(point => <li key={point}>{point}</li>)}
        </ul>
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox id="confirm" checked={confirmed} onCheckedChange={setConfirmed} />
        <label htmlFor="confirm">I understand this will hide my {entityType.toLowerCase()}</label>
      </div>
    </div>
    
    <AlertDialogFooter>
      <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
      <Button variant="destructive" disabled={!confirmed || isDeleting} onClick={onDelete}>
        {isDeleting ? <Spinner /> : null}
        Delete {entityType}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Testing

### Test Location
- `packages/core/app-component-library/src/DeleteConfirmationModal/__tests__/DeleteConfirmationModal.test.tsx`

### Test Requirements
- Unit: Modal renders with title and stats
- Unit: Delete button disabled until checkbox checked
- Unit: Cancel calls onCancel
- Unit: Delete calls onDelete
- Unit: Loading state shows spinner
- Unit: Accessible (axe audit passes)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-09 | 0.1 | Initial draft from Delete MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

N/A

### Debug Log References

N/A

### Completion Notes

N/A

### File List

- `packages/core/app-component-library/src/DeleteConfirmationModal/index.tsx` - New
- `packages/core/app-component-library/src/DeleteConfirmationModal/__types__/index.ts` - New
- `packages/core/app-component-library/src/DeleteConfirmationModal/__tests__/` - New

