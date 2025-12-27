# Story 6.9: Account Section

## Status

Approved

## Story

**As a** user,
**I want** an account settings section,
**so that** I can manage my profile.

## Acceptance Criteria

1. ⬜ AccountSection component
2. ⬜ Card with section header
3. ⬜ Display name setting
4. ⬜ Avatar setting
5. ⬜ User info display

## Tasks / Subtasks

- [ ] **Task 1: Create Section**
  - [ ] Create AccountSection.tsx
  - [ ] Card layout

- [ ] **Task 2: Section Content**
  - [ ] Profile info display
  - [ ] Edit options

## Dev Notes

```typescript
interface AccountSectionProps {
  settings: AccountSettings
}

export function AccountSection({ settings }: AccountSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Account
        </CardTitle>
        <CardDescription>
          Manage your profile information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AvatarUploader currentAvatar={settings.avatarUrl} />
        <Separator />
        <DisplayNameEditor value={settings.displayName} />
      </CardContent>
    </Card>
  )
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
