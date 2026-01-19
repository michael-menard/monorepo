# Story 6.13: Save Settings

## Status

Approved

## Story

**As a** user,
**I want** settings to save automatically,
**so that** changes persist without manual saving.

## Acceptance Criteria

1. ⬜ Auto-save on change
2. ⬜ Debounce rapid changes
3. ⬜ Shows saving indicator
4. ⬜ Handles errors gracefully
5. ⬜ Offline queue (stretch)

## Tasks / Subtasks

- [ ] **Task 1: Auto-save**
  - [ ] Save on each change
  - [ ] Debounce if needed

- [ ] **Task 2: Feedback**
  - [ ] Saving indicator
  - [ ] Error handling

## Dev Notes

```typescript
// Most settings save immediately via mutation
// For grouped changes, use debounce

function useAutoSave<T>(value: T, onSave: (value: T) => Promise<void>, delay = 500) {
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await onSave(value)
      } finally {
        setIsSaving(false)
      }
    }, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [value, delay])

  return { isSaving }
}

// Saving indicator
{isSaving && (
  <span className="text-sm text-muted-foreground flex items-center gap-1">
    <Loader2 className="h-3 w-3 animate-spin" />
    Saving...
  </span>
)}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
