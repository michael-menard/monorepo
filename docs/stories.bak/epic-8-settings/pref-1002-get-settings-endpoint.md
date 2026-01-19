# Story 6.3: Get Settings Endpoint

## Status

Approved

## Story

**As a** user,
**I want** to fetch my settings,
**so that** my preferences are loaded.

## Acceptance Criteria

1. ⬜ `useGetSettingsQuery` hook available
2. ⬜ Fetches GET /settings
3. ⬜ Returns user settings object
4. ⬜ Includes appearance and account settings
5. 🔄 Backend: /settings endpoint required

## Tasks / Subtasks

- [ ] **Task 1: Define Endpoint**
  - [ ] Add getSettings query
  - [ ] Define response type

## Dev Notes

```typescript
getSettings: builder.query<UserSettings, void>({
  query: () => '/settings',
  providesTags: ['Settings'],
}),

interface UserSettings {
  appearance: {
    theme: 'light' | 'dark' | 'system'
    galleryDensity: 'comfortable' | 'compact'
  }
  account: {
    displayName: string
    avatarUrl?: string
  }
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
