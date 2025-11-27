# Story 1.1: Clean Main-App and Establish Shell Layout

**Sprint:** 1 (Weeks 1-2)  
**Story Points:** 21  
**Priority:** High  
**Dependencies:** None  

## User Story
```
As a user
I want a consistent application shell with navigation
So that I can access different sections of the app seamlessly
```

## Acceptance Criteria

### Frontend Changes
- [ ] Remove Gallery components from main-app/src/components/
  - [ ] Delete Gallery/ directory and all subcomponents
  - [ ] Remove GalleryControls, MocCard, GridView, ListView components
  - [ ] Update imports and remove unused dependencies
- [ ] Remove gallerySlice from main-app store
  - [ ] Delete store/slices/gallerySlice.ts
  - [ ] Remove gallery state from root reducer
  - [ ] Clean up gallery-related selectors
- [ ] Remove gallery routes from main-app routing
  - [ ] Delete routes/modules/GalleryModule.tsx
  - [ ] Remove gallery route definitions
  - [ ] Update main routing configuration
- [ ] Create AppBar component with logo and user menu
  - [ ] Implement responsive AppBar with LEGO-inspired design
  - [ ] Add logo/brand element with proper sizing
  - [ ] Create user menu dropdown with profile/settings links
  - [ ] Apply design system colors and typography
- [ ] Create Sidebar component with main navigation
  - [ ] Build navigation menu with Gallery, MOC, User sections
  - [ ] Implement active state indicators
  - [ ] Add navigation icons using design system
  - [ ] Ensure keyboard navigation support
- [ ] Create Footer component with app info
  - [ ] Add copyright and version information
  - [ ] Include links to help and support
  - [ ] Apply consistent styling with design system
- [ ] Create MainArea component for content rendering
  - [ ] Implement proper content area with scrolling
  - [ ] Add loading states for content transitions
  - [ ] Ensure proper focus management
- [ ] Implement responsive behavior (mobile sidebar overlay)
  - [ ] Create mobile hamburger menu
  - [ ] Implement sidebar overlay for mobile screens
  - [ ] Add touch gestures for mobile navigation
  - [ ] Test on various screen sizes (320px to 1920px)

### Backend/Data Changes
- [ ] Update routing configuration to support shell pattern
  - [ ] Modify TanStack Router configuration for shell layout
  - [ ] Create route guards for authenticated sections
  - [ ] Implement proper route hierarchy
- [ ] Create navigation data structure for dynamic menu generation
  - [ ] Define navigation menu configuration
  - [ ] Create navigation permissions system
  - [ ] Add navigation metadata for breadcrumbs
- [ ] Setup authentication context for shell components
  - [ ] Create AuthProvider for shell-level authentication
  - [ ] Implement user session management
  - [ ] Add authentication state to shell components

### Testing & Quality
- [ ] Unit tests for all shell components (>90% coverage)
  - [ ] Test AppBar component rendering and interactions
  - [ ] Test Sidebar navigation and active states
  - [ ] Test Footer component display
  - [ ] Test MainArea content rendering
  - [ ] Test responsive behavior across screen sizes
- [ ] Integration tests for navigation flow
  - [ ] Test navigation between different sections
  - [ ] Test deep linking and URL handling
  - [ ] Test authentication flow integration
- [ ] Accessibility tests pass (WCAG 2.1 AA)
  - [ ] Test keyboard navigation through all components
  - [ ] Verify screen reader compatibility
  - [ ] Check color contrast ratios
  - [ ] Test focus management and indicators
- [ ] Linter runs and passes
  - [ ] ESLint passes with no errors
  - [ ] Prettier formatting applied consistently
  - [ ] TypeScript compilation successful
- [ ] All existing functionality still works
  - [ ] Verify no regressions in remaining features
  - [ ] Test that non-gallery features continue to work
  - [ ] Ensure performance is maintained

## Technical Implementation Notes

### Shell Layout Structure
```typescript
// apps/web/main-app/src/components/Layout/ShellLayout.tsx
export function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <AppBar />
        <div className="flex flex-1">
          <Sidebar />
          <MainArea>
            {children}
          </MainArea>
        </div>
        <Footer />
      </div>
    </AuthProvider>
  )
}
```

### Navigation Configuration
```typescript
// Navigation menu structure
const navigationItems = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/gallery', label: 'Gallery', icon: 'grid' },
  { path: '/moc', label: 'MOCs', icon: 'brick' },
  { path: '/user', label: 'Profile', icon: 'user' },
]
```

### Responsive Breakpoints
- **Mobile:** < 768px (sidebar overlay)
- **Tablet:** 768px - 1024px (collapsible sidebar)
- **Desktop:** > 1024px (full sidebar)

## Definition of Done Checklist
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Integration tests passing
- [ ] **Linter runs and passes (ESLint + Prettier)**
- [ ] Accessibility requirements met
- [ ] Performance requirements met
- [ ] Documentation updated
- [ ] QA testing completed
- [ ] Product Owner acceptance

## Dependencies
- Design system color palette and typography
- Authentication system requirements
- Navigation structure decisions

## Risks & Mitigation
- **Risk:** Breaking existing functionality during cleanup
- **Mitigation:** Comprehensive testing and gradual removal
- **Risk:** Responsive design complexity
- **Mitigation:** Mobile-first approach and thorough device testing
