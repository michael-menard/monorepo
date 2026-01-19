# Story lnch-1047: 404 & Error Page Design

## Status

Draft

## Story

**As a** user who encounters an error,
**I want** a helpful error page,
**so that** I can navigate back to working content.

## Epic Context

This is **Story 9 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **Medium** - Improves experience during failures.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1040: Error Message Standardization (error handling context)

## Related Stories

- lnch-1040: Error Messages (in-app error handling)
- lnch-1048: User Feedback Channel (error page contact)

## Acceptance Criteria

1. 404 page exists with clear messaging
2. 404 page includes navigation options
3. Generic error page exists (500-level)
4. Error pages match brand design
5. Error pages are accessible
6. Error pages work without JavaScript
7. Error boundaries catch React errors

## Tasks / Subtasks

- [ ] **Task 1: Design 404 Page** (AC: 1, 2, 4)
  - [ ] Create 404 page design
  - [ ] Include friendly messaging
  - [ ] Add navigation links (Home, Search)
  - [ ] Match design system

- [ ] **Task 2: Design Error Page** (AC: 3, 4)
  - [ ] Create generic error page
  - [ ] "Something went wrong" messaging
  - [ ] Include retry option
  - [ ] Match design system

- [ ] **Task 3: Implement 404 Route** (AC: 1)
  - [ ] Create catch-all route
  - [ ] Render 404 component
  - [ ] Log 404s for analysis

- [ ] **Task 4: Implement Error Boundary** (AC: 7)
  - [ ] Create ErrorBoundary component
  - [ ] Wrap app or key sections
  - [ ] Show error page on crash
  - [ ] Log errors for debugging

- [ ] **Task 5: Ensure Accessibility** (AC: 5)
  - [ ] Semantic HTML
  - [ ] Focus management
  - [ ] Screen reader friendly

- [ ] **Task 6: No-JS Fallback** (AC: 6)
  - [ ] Static 404 HTML
  - [ ] Basic styling inline
  - [ ] Navigation links work

- [ ] **Task 7: Test Error Pages**
  - [ ] Navigate to invalid URL
  - [ ] Trigger JavaScript error
  - [ ] Verify links work
  - [ ] Test accessibility

## Dev Notes

### 404 Page Content
```tsx
<div className="flex flex-col items-center justify-center min-h-screen">
  <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
  <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>
  <p className="text-muted-foreground mt-2">
    The page you're looking for doesn't exist or has been moved.
  </p>
  <div className="flex gap-4 mt-8">
    <Button asChild>
      <Link to="/">Go Home</Link>
    </Button>
    <Button variant="outline" asChild>
      <Link to="/gallery">Browse Gallery</Link>
    </Button>
  </div>
</div>
```

### Error Boundary
```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log to error tracking service
    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} />
    }
    return this.props.children
  }
}
```

### Router Setup
```tsx
// React Router
<Routes>
  <Route path="/" element={<Dashboard />} />
  {/* ... other routes ... */}
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

### Error Page Content
```tsx
<div className="flex flex-col items-center justify-center min-h-screen">
  <AlertCircle className="h-16 w-16 text-destructive" />
  <h1 className="text-2xl font-semibold mt-4">Something went wrong</h1>
  <p className="text-muted-foreground mt-2 text-center max-w-md">
    We're sorry, but something unexpected happened. Please try again.
  </p>
  <div className="flex gap-4 mt-8">
    <Button onClick={() => window.location.reload()}>
      Try Again
    </Button>
    <Button variant="outline" asChild>
      <Link to="/">Go Home</Link>
    </Button>
  </div>
</div>
```

## Testing

### Test Requirements
- Unit: 404 page renders
- Unit: Error boundary catches errors
- Integration: Invalid routes show 404
- E2E: Full error flow works

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
