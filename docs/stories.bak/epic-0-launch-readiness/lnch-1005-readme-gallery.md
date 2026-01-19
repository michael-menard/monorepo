# Story lnch-1005: README for gallery Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the gallery package,
**so that** I can use shared gallery utilities across applications.

## Epic Context

This is **Story 6 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **Medium** - Shared utilities for gallery features.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other README stories)

## Related Stories

- lnch-1000: README for app-component-library Package (gallery uses UI components)

## Acceptance Criteria

1. README.md exists at `packages/core/gallery/README.md`
2. Documents all exported utilities
3. Shows usage examples
4. Documents grid layout helpers
5. Documents image optimization utilities
6. Shows integration with gallery apps

## Tasks / Subtasks

- [ ] **Task 1: Audit Package Exports** (AC: 2)
  - [ ] Review `packages/core/gallery/src/index.ts`
  - [ ] List all exported utilities
  - [ ] Categorize by function

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/core/gallery/README.md`
  - [ ] Add package overview
  - [ ] Add installation section

- [ ] **Task 3: Document Grid Utilities** (AC: 4)
  - [ ] Grid layout calculations
  - [ ] Responsive breakpoints
  - [ ] Masonry layout helpers

- [ ] **Task 4: Document Image Utilities** (AC: 5)
  - [ ] Lazy loading helpers
  - [ ] Placeholder generation
  - [ ] Aspect ratio utilities

- [ ] **Task 5: Show App Integration** (AC: 6)
  - [ ] Usage in instructions-gallery
  - [ ] Usage in inspiration-gallery

- [ ] **Task 6: Add Usage Examples** (AC: 3)
  - [ ] Basic usage example
  - [ ] Advanced configuration

## Dev Notes

### Package Location
- `packages/core/gallery/`

### Consuming Apps
- `apps/web/app-instructions-gallery`
- `apps/web/app-inspiration-gallery`
- `apps/web/app-wishlist-gallery`
- `apps/web/app-sets-gallery`

## Testing

### Verification
- README renders correctly in GitHub
- Code examples are syntactically correct

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
