# Story lnch-1044: Mobile Responsive Audit

## Status

Draft

## Story

**As a** mobile user,
**I want** the application to work well on my phone,
**so that** I can access my content on any device.

## Epic Context

This is **Story 6 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **High** - Significant portion of users will be mobile.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other UX stories)

## Related Stories

- lnch-1046: Browser Compatibility (mobile browsers)
- lnch-1043: Accessibility Audit (touch targets)

## Acceptance Criteria

1. All pages render correctly at 375px width (iPhone SE)
2. All pages render correctly at 768px width (iPad)
3. Navigation is accessible on mobile (hamburger menu or similar)
4. Touch targets are at least 44x44px
5. Text is readable without zooming
6. Forms are usable on mobile
7. File upload works on mobile

## Tasks / Subtasks

- [ ] **Task 1: Audit All Pages at Mobile Width** (AC: 1)
  - [ ] Test Dashboard
  - [ ] Test Galleries
  - [ ] Test Create/Edit forms
  - [ ] Test Detail pages
  - [ ] Document issues

- [ ] **Task 2: Audit at Tablet Width** (AC: 2)
  - [ ] Test all pages at 768px
  - [ ] Check layout breakpoints
  - [ ] Document issues

- [ ] **Task 3: Fix Navigation** (AC: 3)
  - [ ] Implement mobile nav (hamburger)
  - [ ] Ensure all links accessible
  - [ ] Test open/close behavior

- [ ] **Task 4: Fix Touch Targets** (AC: 4)
  - [ ] Buttons min 44px height
  - [ ] Links have adequate spacing
  - [ ] Icons are tappable

- [ ] **Task 5: Fix Typography** (AC: 5)
  - [ ] Base font size readable (16px min)
  - [ ] Line length appropriate
  - [ ] Headings scale correctly

- [ ] **Task 6: Fix Forms** (AC: 6)
  - [ ] Input fields full width
  - [ ] Labels visible
  - [ ] Keyboard doesn't obscure inputs
  - [ ] Submit button accessible

- [ ] **Task 7: Test File Upload** (AC: 7)
  - [ ] Test on iOS Safari
  - [ ] Test on Android Chrome
  - [ ] Camera capture works
  - [ ] File picker works

## Dev Notes

### Breakpoints (Tailwind)
```css
/* Default: Mobile first */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Mobile Navigation Pattern
```tsx
// Mobile: hamburger menu
// Desktop: full nav bar

<nav className="md:hidden">
  <Sheet>
    <SheetTrigger>
      <MenuIcon />
    </SheetTrigger>
    <SheetContent>
      {/* Mobile nav items */}
    </SheetContent>
  </Sheet>
</nav>

<nav className="hidden md:flex">
  {/* Desktop nav items */}
</nav>
```

### Touch Target Sizing
```tsx
// Minimum 44x44px for touch targets
<Button className="min-h-[44px] min-w-[44px] p-3">
  <Icon />
</Button>
```

### Testing Devices

| Device | Width | Priority |
|--------|-------|----------|
| iPhone SE | 375px | Critical |
| iPhone 14 | 390px | High |
| iPhone 14 Pro Max | 430px | High |
| iPad | 768px | High |
| iPad Pro | 1024px | Medium |

### Testing Tools
- Chrome DevTools device mode
- Real device testing (recommended)
- BrowserStack for cross-device

## Testing

### Test Requirements
- Visual: Screenshot at each breakpoint
- Functional: All features work on mobile
- Performance: Reasonable load times
- Touch: All interactions work

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
