# Story lnch-1041: Empty States Audit & Implementation

## Status

Draft

## Story

**As a** user,
**I want** helpful empty states throughout the app,
**so that** I understand what to do when there's no content.

## Epic Context

This is **Story 3 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **High** - Affects user understanding and engagement.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other UX stories)

## Related Stories

- lnch-1039: Onboarding Flow (new users see empty states)
- lnch-1042: Loading States (loading before empty state)

## Acceptance Criteria

1. Dashboard has empty state with CTA
2. Instructions gallery has empty state with CTA
3. Wishlist has empty state with CTA
4. Inspiration gallery has empty state with CTA
5. Sets gallery has empty state with CTA
6. Search "no results" has helpful suggestions
7. All empty states are visually consistent

## Tasks / Subtasks

- [ ] **Task 1: Audit Current Empty States** (AC: 1-6)
  - [ ] Check each gallery for empty state
  - [ ] Document what exists vs missing
  - [ ] Screenshot current implementations

- [ ] **Task 2: Design Empty State Component** (AC: 7)
  - [ ] Create reusable EmptyState component
  - [ ] Include icon, title, description, action props
  - [ ] Match design system

- [ ] **Task 3: Implement Dashboard Empty State** (AC: 1)
  - [ ] "You haven't created any MOCs yet"
  - [ ] CTA: "Create Your First MOC"
  - [ ] Include illustration

- [ ] **Task 4: Implement Gallery Empty States** (AC: 2, 3, 4, 5)
  - [ ] Instructions: "No MOC instructions yet"
  - [ ] Wishlist: "Your wishlist is empty"
  - [ ] Inspiration: "No inspirations saved"
  - [ ] Sets: "No sets in your collection"

- [ ] **Task 5: Implement Search Empty State** (AC: 6)
  - [ ] "No results found for [query]"
  - [ ] Suggestions: "Try different keywords"
  - [ ] Link to browse all

- [ ] **Task 6: Verify Visual Consistency** (AC: 7)
  - [ ] Same component used everywhere
  - [ ] Consistent spacing/sizing
  - [ ] Icons match theme

- [ ] **Task 7: Test All Empty States**
  - [ ] Test with new account (no data)
  - [ ] Test search with no results
  - [ ] Verify CTAs work

## Dev Notes

### EmptyState Component
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

<EmptyState
  icon={<FolderOpenIcon />}
  title="No MOC instructions yet"
  description="Create your first MOC to share your custom LEGO builds."
  action={{
    label: "Create MOC",
    onClick: () => navigate('/create')
  }}
/>
```

### Empty State Content

| Screen | Title | Description | CTA |
|--------|-------|-------------|-----|
| Dashboard | "Welcome!" | "Create your first MOC..." | "Create MOC" |
| Instructions | "No instructions yet" | "Start sharing..." | "Upload MOC" |
| Wishlist | "Wishlist is empty" | "Save sets you want..." | "Browse Sets" |
| Inspiration | "No inspirations" | "Save images for..." | "Add Inspiration" |
| Sets | "No sets tracked" | "Track your LEGO..." | "Add Set" |
| Search | "No results" | "Try different..." | "Browse All" |

### Component Location
- `packages/core/ui/src/app-components/EmptyState/`
- Or `apps/web/main-app/src/components/EmptyState/`

## Testing

### Test Requirements
- Unit: EmptyState renders with all prop variations
- Integration: Each page shows correct empty state
- E2E: New user sees empty states, CTAs work

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
