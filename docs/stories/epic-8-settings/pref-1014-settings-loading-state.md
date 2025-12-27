# Story 6.15: Settings Loading State

## Status

Approved

## Story

**As a** user,
**I want** skeleton loaders while loading,
**so that** I see visual feedback.

## Acceptance Criteria

1. ⬜ SettingsSkeleton component
2. ⬜ Matches section layout
3. ⬜ Animated pulse effect
4. ⬜ Two card skeletons
5. ⬜ Input placeholders

## Tasks / Subtasks

- [ ] **Task 1: Create Skeleton**
  - [ ] Create SettingsSkeleton.tsx
  - [ ] Match card shapes

## Dev Notes

```typescript
export function SettingsSkeleton() {
  return (
    <div className="container max-w-2xl py-6 space-y-8">
      <Skeleton className="h-8 w-32" />

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
