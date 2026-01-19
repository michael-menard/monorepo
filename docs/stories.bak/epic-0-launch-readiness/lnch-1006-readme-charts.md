# Story lnch-1006: README for charts Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the charts package,
**so that** I can create consistent data visualizations.

## Epic Context

This is **Story 7 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **Low** - Dashboard-specific utilities.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other README stories)

## Related Stories

- lnch-1000: README for app-component-library Package (charts use UI components)

## Acceptance Criteria

1. README.md exists at `packages/core/charts/README.md`
2. Documents all exported chart components
3. Shows usage with Recharts
4. Documents theming integration
5. Shows data format requirements
6. Includes responsive behavior notes

## Tasks / Subtasks

- [ ] **Task 1: Audit Package Exports** (AC: 2)
  - [ ] Review `packages/core/charts/src/index.ts`
  - [ ] List all exported components
  - [ ] Document prop types

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/core/charts/README.md`
  - [ ] Add package overview
  - [ ] Add installation section

- [ ] **Task 3: Document Recharts Integration** (AC: 3)
  - [ ] Base Recharts components used
  - [ ] Custom wrappers and enhancements
  - [ ] Configuration options

- [ ] **Task 4: Document Theming** (AC: 4)
  - [ ] Color palette usage
  - [ ] Dark mode support
  - [ ] Custom theme overrides

- [ ] **Task 5: Document Data Formats** (AC: 5)
  - [ ] Expected data structures
  - [ ] Transformation utilities

- [ ] **Task 6: Document Responsiveness** (AC: 6)
  - [ ] Container queries
  - [ ] Mobile behavior

## Dev Notes

### Package Location
- `packages/core/charts/`

### Primary Consumer
- `apps/web/app-dashboard`

### Based on Recharts
- https://recharts.org/

## Testing

### Verification
- README renders correctly in GitHub
- Code examples are syntactically correct

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
