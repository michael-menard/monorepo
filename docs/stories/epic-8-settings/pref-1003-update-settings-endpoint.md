# Story 6.4: Update Settings Endpoint

## Status

Approved

## Story

**As a** user,
**I want** to save my settings,
**so that** preferences persist.

## Acceptance Criteria

1. ⬜ `useUpdateSettingsMutation` hook available
2. ⬜ PATCH /settings with partial data
3. ⬜ Returns updated settings
4. ⬜ Optimistic update
5. 🔄 Backend: PATCH /settings endpoint required

## Tasks / Subtasks

- [ ] **Task 1: Define Mutation**
  - [ ] Add updateSettings mutation
  - [ ] Configure optimistic update

## Dev Notes

```typescript
updateSettings: builder.mutation<UserSettings, Partial<UserSettings>>({
  query: (data) => ({
    url: '/settings',
    method: 'PATCH',
    body: data,
  }),
  invalidatesTags: ['Settings'],
  async onQueryStarted(data, { dispatch, queryFulfilled }) {
    const patchResult = dispatch(
      settingsApi.util.updateQueryData('getSettings', undefined, (draft) => {
        Object.assign(draft, data)
      })
    )
    try {
      await queryFulfilled
    } catch {
      patchResult.undo()
    }
  },
}),
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
