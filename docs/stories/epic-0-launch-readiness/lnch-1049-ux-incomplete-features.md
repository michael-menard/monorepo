# Story lnch-1049: Navigation for Incomplete Features

## Status

Draft

## Story

**As a** user,
**I want** clear indication of which features are available,
**so that** I don't get confused by incomplete areas.

## Epic Context

This is **Story 11 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **High** - Prevents confusion about platform capabilities.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other UX stories)

## Related Stories

- lnch-1041: Empty States (empty vs coming soon)

## Acceptance Criteria

1. Incomplete features have "Coming Soon" badge
2. Incomplete routes redirect to appropriate page
3. Navigation clearly shows available vs upcoming
4. Empty sections explain what's coming
5. Users can express interest in upcoming features
6. Feature visibility can be toggled (admin/config)
7. No broken links to incomplete features

## Tasks / Subtasks

- [ ] **Task 1: Inventory Incomplete Features** (AC: 1, 3)
  - [ ] List features in progress
  - [ ] Determine visibility (hide vs coming soon)
  - [ ] Document decision per feature

- [ ] **Task 2: Create Coming Soon Badge** (AC: 1)
  - [ ] Design badge component
  - [ ] Consistent styling
  - [ ] Add to navigation items

- [ ] **Task 3: Handle Incomplete Routes** (AC: 2, 7)
  - [ ] Redirect to parent or home
  - [ ] Or show coming soon page
  - [ ] No 404 for known incomplete features

- [ ] **Task 4: Update Navigation** (AC: 3)
  - [ ] Clearly mark available features
  - [ ] Gray out or badge upcoming
  - [ ] Consider hiding vs badging

- [ ] **Task 5: Create Coming Soon Page** (AC: 4)
  - [ ] Explain what's coming
  - [ ] Show expected timeframe (if known)
  - [ ] Include waitlist/interest form

- [ ] **Task 6: Add Interest Capture** (AC: 5)
  - [ ] "Notify me" button
  - [ ] Email capture
  - [ ] Store interest data

- [ ] **Task 7: Feature Flag System** (AC: 6)
  - [ ] Config-based feature visibility
  - [ ] Easy to toggle on launch
  - [ ] No code changes needed

## Dev Notes

### Current Feature Status

| Feature | Status | Action |
|---------|--------|--------|
| Dashboard | Complete | Show |
| MOC Instructions | Complete | Show |
| Wishlist | Partial | Coming Soon |
| Inspiration | Partial | Coming Soon |
| Sets | Partial | Coming Soon |
| User Settings | Complete | Show |

### Coming Soon Badge
```tsx
<Badge variant="outline" className="text-muted-foreground">
  Coming Soon
</Badge>

// In navigation
<NavigationMenuItem>
  <span className="flex items-center gap-2 text-muted-foreground">
    <span>Wishlist</span>
    <Badge variant="outline" className="text-xs">Soon</Badge>
  </span>
</NavigationMenuItem>
```

### Coming Soon Page
```tsx
<div className="flex flex-col items-center justify-center py-20">
  <RocketIcon className="h-16 w-16 text-muted-foreground" />
  <h1 className="text-2xl font-semibold mt-4">Coming Soon</h1>
  <p className="text-muted-foreground mt-2 text-center max-w-md">
    We're working hard to bring you this feature.
    Want to be the first to know when it's ready?
  </p>
  <Button className="mt-6">
    Notify Me
  </Button>
</div>
```

### Feature Flags
```typescript
// config/features.ts
export const features = {
  dashboard: true,
  instructions: true,
  wishlist: false,
  inspiration: false,
  sets: false,
  settings: true,
}

// Usage
if (features.wishlist) {
  // Show wishlist
} else {
  // Show coming soon or hide
}
```

### Route Handling
```tsx
// Option 1: Redirect
<Route
  path="/wishlist"
  element={<Navigate to="/coming-soon/wishlist" />}
/>

// Option 2: Coming Soon Page
<Route
  path="/wishlist"
  element={<ComingSoonPage feature="wishlist" />}
/>
```

### Interest Capture
```typescript
// Store in user preferences or separate table
const CaptureInterestSchema = z.object({
  email: z.string().email(),
  feature: z.enum(['wishlist', 'inspiration', 'sets']),
})
```

## Testing

### Test Requirements
- Unit: Coming soon badge renders
- Integration: Routes redirect correctly
- E2E: Navigation shows correct state
- Config: Feature flags work

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
