# Story lnch-1002: README for accessibility Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the accessibility package,
**so that** I can implement a11y features correctly and consistently.

## Epic Context

This is **Story 3 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **High** - Essential for WCAG compliance.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other README stories)

## Related Stories

- lnch-1000: README for app-component-library Package (uses a11y features)
- lnch-1043: UX Accessibility Audit (validates a11y implementation)

## Acceptance Criteria

1. README.md exists at `packages/core/accessibility/README.md`
2. Documents all exported utilities and hooks
3. Shows usage examples for focus management
4. Documents keyboard navigation helpers
5. Includes ARIA utility functions
6. Links to WCAG 2.1 AA requirements
7. Shows integration with shadcn/ui components

## Tasks / Subtasks

- [ ] **Task 1: Audit Package Exports** (AC: 2)
  - [ ] Review `packages/core/accessibility/src/index.ts`
  - [ ] List all exported utilities
  - [ ] Categorize by function (focus, keyboard, ARIA)

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/core/accessibility/README.md`
  - [ ] Add package overview
  - [ ] Add installation section

- [ ] **Task 3: Document Focus Management** (AC: 3)
  - [ ] Focus trap utilities
  - [ ] Focus restoration
  - [ ] Skip link helpers

- [ ] **Task 4: Document Keyboard Navigation** (AC: 4)
  - [ ] Arrow key handlers
  - [ ] Tab index management
  - [ ] Escape key handling

- [ ] **Task 5: Document ARIA Utilities** (AC: 5)
  - [ ] Live region helpers
  - [ ] Role assignment utilities
  - [ ] State announcements

- [ ] **Task 6: Add WCAG References** (AC: 6)
  - [ ] Link to WCAG 2.1 AA guidelines
  - [ ] Map utilities to specific WCAG criteria

- [ ] **Task 7: Show Component Integration** (AC: 7)
  - [ ] Example with Dialog component
  - [ ] Example with custom component

## Dev Notes

### Package Location
- `packages/core/accessibility/`

### WCAG 2.1 AA Requirements
- Focus visible (2.4.7)
- Keyboard accessible (2.1.1)
- Focus order (2.4.3)
- Skip links (2.4.1)

## Testing

### Verification
- README renders correctly in GitHub
- All code examples are syntactically correct
- Links to WCAG docs are valid

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
