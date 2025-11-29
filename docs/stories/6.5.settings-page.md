# Story 6.5: Settings Page

## Status

Approved

## Story

**As a** user,
**I want** a settings page,
**so that** I can manage my preferences.

## Acceptance Criteria

1. ⬜ SettingsPage component created
2. ⬜ Page header with title
3. ⬜ Sections for Appearance and Account
4. ⬜ Loads settings on mount
5. ⬜ Shows loading state

## Tasks / Subtasks

- [ ] **Task 1: Create Page**
  - [ ] Create pages/SettingsPage.tsx
  - [ ] Layout with sections

- [ ] **Task 2: Data Loading**
  - [ ] Use getSettings query
  - [ ] Handle loading/error

## Dev Notes

```typescript
export function SettingsPage() {
  const { data: settings, isLoading, error } = useGetSettingsQuery()

  if (isLoading) return <SettingsSkeleton />
  if (error) return <ErrorState error={error} />

  return (
    <div className="container max-w-2xl py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-8">
        <AppearanceSection settings={settings.appearance} />
        <AccountSection settings={settings.account} />
      </div>
    </div>
  )
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
