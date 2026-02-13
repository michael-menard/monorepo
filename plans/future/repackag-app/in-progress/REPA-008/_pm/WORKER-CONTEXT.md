# Worker Context for REPA-008

## Story ID
REPA-008

## Index Entry
**Feature:** Extract and standardize keyboard navigation hooks for galleries. Move useRovingTabIndex to @repo/gallery/hooks, useAnnouncer to @repo/accessibility. Create useGalleryKeyboard and useGallerySelection hooks.
**Goal:** Shared keyboard navigation hooks for all gallery apps.

## Seed Context Available
- Duplicate implementations identified (useRovingTabIndex, useAnnouncer)
- Divergent implementations (useKeyboardShortcuts vs useGalleryKeyboard)
- Proposed migration path to @repo/gallery and @repo/accessibility
- No blocking conflicts

## Reality Context
- Existing packages: @repo/gallery, @repo/accessibility
- Both packages already have hooks directories
- Full test suites exist in wishlist gallery
- Both gallery apps use these hooks extensively

## Constraints
- Must maintain backward compatibility during migration
- All tests must be migrated with hooks
- No breaking changes to existing implementations
- Export from package index files
