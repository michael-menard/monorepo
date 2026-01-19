# Story lnch-1039: First-Time User Onboarding Flow

## Status

Draft

## Story

**As a** new user,
**I want** a clear onboarding experience when I first sign up,
**so that** I understand how to use the platform and feel welcomed.

## Epic Context

This is **Story 1 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **Critical** - First impression for all new users.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (first story in UX workstream)

## Related Stories

- lnch-1041: Empty States Audit (first-time user sees empty states)
- lnch-1048: User Feedback Channel (new user help)

## Acceptance Criteria

1. New users see a welcome screen after first login
2. Onboarding explains key features (MOCs, galleries)
3. Users can skip onboarding if desired
4. Onboarding progress is tracked (don't show again)
5. Empty dashboard has clear call-to-action
6. First upload flow has helpful guidance
7. Onboarding is accessible (keyboard nav, screen reader)

## Tasks / Subtasks

- [ ] **Task 1: Audit Current First-Login Experience** (AC: 1, 5)
  - [ ] Document what new users currently see
  - [ ] Identify gaps in guidance
  - [ ] Screenshot current empty states

- [ ] **Task 2: Design Welcome Screen** (AC: 1, 2)
  - [ ] Create welcome modal/page design
  - [ ] Write welcome copy
  - [ ] Identify 3-5 key features to highlight

- [ ] **Task 3: Implement Skip Option** (AC: 3, 4)
  - [ ] Add "Skip" button
  - [ ] Store onboarding completion in user preferences
  - [ ] Ensure skip persists across sessions

- [ ] **Task 4: Design Empty Dashboard CTA** (AC: 5)
  - [ ] Create empty state component
  - [ ] Add "Create Your First MOC" button
  - [ ] Include helpful illustration

- [ ] **Task 5: Add Upload Guidance** (AC: 6)
  - [ ] Tooltips for first-time uploaders
  - [ ] File type guidance
  - [ ] Progress indicators with labels

- [ ] **Task 6: Ensure Accessibility** (AC: 7)
  - [ ] Keyboard navigation works
  - [ ] Screen reader announces content
  - [ ] Focus management in modals

- [ ] **Task 7: Test Complete Flow**
  - [ ] Test with new account
  - [ ] Verify onboarding only shows once
  - [ ] Test skip functionality

## Dev Notes

### Current State
- New users land on dashboard
- Dashboard may show empty state or nothing
- No explicit onboarding guidance

### Proposed Onboarding Flow
1. User completes signup
2. Redirect to dashboard
3. Show welcome modal (dismissible)
4. If dismissed without action, show dashboard with empty state CTA
5. First upload shows contextual tooltips

### User Preference Storage
```typescript
// Store in user settings (API)
{
  onboardingCompleted: boolean,
  onboardingCompletedAt: string | null,
  onboardingSkipped: boolean
}
```

### Empty State Component
```tsx
<EmptyState
  icon={<FileIcon />}
  title="Welcome to LEGO MOC Instructions!"
  description="Share your custom LEGO creations with the world."
  action={
    <Button onClick={navigateToCreate}>
      Create Your First MOC
    </Button>
  }
/>
```

## Testing

### Test Location
- `apps/web/main-app/src/components/Onboarding/__tests__/`

### Test Requirements
- Unit: Welcome modal renders
- Unit: Skip button works
- Integration: Onboarding state persists
- E2E: New user sees onboarding

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
