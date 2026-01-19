# Story 6.14: Success Feedback

## Status

Approved

## Story

**As a** user,
**I want** feedback when settings save,
**so that** I know changes are applied.

## Acceptance Criteria

1. ⬜ Toast on successful save
2. ⬜ Non-intrusive indicator
3. ⬜ Different for auto-save vs manual
4. ⬜ Checkmark animation
5. ⬜ Accessible announcement

## Tasks / Subtasks

- [ ] **Task 1: Toast Notifications**
  - [ ] Success toast
  - [ ] Configure duration

- [ ] **Task 2: Inline Indicators**
  - [ ] Checkmark on field
  - [ ] Fade after delay

## Dev Notes

```typescript
// Auto-save: subtle inline indicator
function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null

  return (
    <span className="text-sm flex items-center gap-1">
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span className="text-green-500">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Error saving</span>
        </>
      )}
    </span>
  )
}

// Manual save: toast notification
toast.success('Settings saved successfully')
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
