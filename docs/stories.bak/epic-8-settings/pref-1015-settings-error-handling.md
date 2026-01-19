# Story 6.16: Settings Error Handling

## Status

Approved

## Story

**As a** user,
**I want** clear error messages for settings,
**so that** I know when something fails.

## Acceptance Criteria

1. ⬜ Error state on failed load
2. ⬜ Retry button
3. ⬜ Field-level errors
4. ⬜ Toast for save failures
5. ⬜ Network error handling

## Tasks / Subtasks

- [ ] **Task 1: Load Errors**
  - [ ] Error state component
  - [ ] Retry functionality

- [ ] **Task 2: Save Errors**
  - [ ] Toast notifications
  - [ ] Preserve user input

## Dev Notes

```typescript
// Load error state
function SettingsErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="container max-w-2xl py-6">
      <Card className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Settings</h2>
        <p className="text-muted-foreground mb-4">
          {error.message || 'An error occurred while loading your settings.'}
        </p>
        <Button onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </Card>
    </div>
  )
}

// Save error handling
try {
  await updateSettings(data).unwrap()
} catch (error) {
  if (error.status === 'FETCH_ERROR') {
    toast.error('Network error. Please check your connection.')
  } else {
    toast.error('Failed to save settings. Please try again.')
  }
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
