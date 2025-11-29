# Story 6.2: Settings API Slice

## Status

Approved

## Story

**As a** developer,
**I want** an RTK Query slice for settings,
**so that** I can manage user preferences.

## Acceptance Criteria

1. ⬜ `settingsApi` slice created
2. ⬜ Get/Update settings endpoints
3. ⬜ Cache invalidation configured
4. ⬜ Optimistic updates
5. 🔄 Backend: Settings endpoints required

## Tasks / Subtasks

- [ ] **Task 1: Create API Slice**
  - [ ] Create services/settingsApi.ts
  - [ ] Define tag types

- [ ] **Task 2: Integrate**
  - [ ] Add to store

## Dev Notes

```typescript
export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Settings'],
  endpoints: builder => ({
    // Endpoints in 6.3-6.4
  }),
})
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
