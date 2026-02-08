# Bootstrap Context: Inspiration Gallery

**Date:** 2026-02-04
**Phase:** 0 (Validated)
**Status:** Bootstrap Context Created

## Feature Directory
- **Path:** `/Users/michaelmenard/Development/Monorepo/plans/future/inspiration-gallery`
- **Prefix:** `INSP` (derived from "inspiration-gallery")

## Validation Summary

### Pre-Flight Checks
- Directory exists: ✅ YES
- PRD.md exists: ✅ YES
- Prefix collision check: ✅ PASS (INSP is unique)
- stories.index.md collision: ✅ NO (file does not exist, safe to create)

### Derived Metadata
| Field | Value |
|-------|-------|
| Feature Name | Inspiration Gallery |
| Derived Prefix | INSP |
| Epic Number | 5 |
| Epic Goal | Enable users to collect, organize, and manage visual inspiration for their LEGO MOC builds through a flexible album-based system with nested hierarchies and MOC linking. |

## Epic Summary (from PRD.md)

### Core Concepts
- **Inspiration:** A single image with optional metadata (title, description, URL, tags)
- **Album:** A named collection of inspirations and/or other albums with metadata and tags
- **Hierarchy:** Albums can be nested; inspirations can belong to multiple albums; albums can have multiple parents (DAG structure)
- **Orphans:** Inspirations not in any album remain visible in the root gallery
- **MOC Link:** Inspirations and albums can be linked to MOC Instructions

### Key Differentiators
- Images are the primary content (not file packages like MOC Instructions)
- Nested album hierarchy with many-to-many relationships
- No file management complexity (single image per item)
- Hard delete (no soft delete/restore)
- Drag-and-drop organization including "stack to create album"

### Data Model Overview
**Inspiration Item:**
- id, userId, imageUrl, title, description, sourceUrl, tags, albumIds, mocIds, sortOrder, timestamps

**Album:**
- id, userId, title, description, coverImageId, tags, parentAlbumIds, mocIds, sortOrder, timestamps

## Stories Overview (20 Total)

### Existing Stories (Read-focused, may be partially complete)
- `INSP-1000`: Gallery scaffolding
- `INSP-1001`: Card component
- `INSP-1002`: API endpoints (partial)
- `INSP-1003`: Upload page
- `INSP-1004`: Collection management
- `INSP-1005`: Link to MOC

### New Stories Needed (CRUD completion, 14 Total)
| Story | Title | Priority |
|-------|-------|----------|
| INSP-1006 | Album data model and nested hierarchy | High |
| INSP-1007 | Upload modal with multi-image support | High |
| INSP-1008 | Album create/edit endpoints | High |
| INSP-1009 | Inspiration create/edit endpoints | High |
| INSP-1010 | Drag-and-drop reorder in gallery | Medium |
| INSP-1011 | Stack-to-create-album gesture with undo | Medium |
| INSP-1012 | Album navigation and breadcrumbs (session-based path) | Medium |
| INSP-1013 | MOC linking UI and endpoints | Medium |
| INSP-1014 | Delete flows (album options, multi-album awareness) | Medium |
| INSP-1015 | Metadata edit modal with album membership | Low |
| INSP-1016 | Tag management integration | Low |
| INSP-1017 | Empty states and onboarding tooltips | Medium |
| INSP-1018 | Keyboard navigation and accessibility | Medium |
| INSP-1019 | Loading states and error handling | Low |
| INSP-1020 | Multi-select mode and bulk operations | Low |

## Key Technical Requirements

### Architecture
- Uses shared gallery package (sorting, filtering)
- S3 infrastructure for image storage
- Many-to-many relationships (DAG structure for album hierarchy)
- Cycle detection required when adding parent relationships
- Image thumbnails generated on upload (consider Lambda@Edge or on-demand)

### UI/UX Highlights
- Gallery view with drag-and-drop reordering
- Stack gesture to create albums with undo
- Breadcrumb trail shows path taken (session-based, not canonical)
- Detail view with "Also in:" section showing all album membership
- Modal delete confirmation with album-specific options
- Empty states for various scenarios
- Keyboard navigation support (arrow keys, G for group, U for upload)
- Screen reader announcements for all state changes

### Accessibility Requirements
- Keyboard navigation for all actions (Arrow keys, Space, Shift+Click, G, U, Delete)
- Screen reader support with proper announcements
- Focus management for modals and deletions
- Alt text generation from titles
- WCAG AA contrast compliance

### Mobile Scope (MVP: Desktop-first, View-only Mobile)
Desktop: All features enabled
Mobile: View gallery, view detail, upload, create album, edit metadata, delete
Future mobile enhancements: Touch-optimized drag-and-drop, swipe actions

## Dependencies
### Internal
- Shared gallery package (sorting, filtering)
- S3 infrastructure (image storage)
- Existing MOC Instructions (for linking)
- Authentication/authorization

### External
- None

## Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Complex drag-and-drop interactions | Use established library (dnd-kit), prototype early |
| Many-to-many queries slow at scale | Proper indexing, consider denormalization |
| Large image uploads timeout | Multipart upload, client-side compression option |
| Cycle detection in album DAG | Validate on parent assignment, reject cycles |

## Next Steps
1. Generate `stories.index.md` with all story templates
2. Begin elaboration phase on HIGH priority stories (INSP-1006, 1007, 1008, 1009)
3. Create initial database schema for inspiration and album models
4. Establish API endpoint contracts

## Files Reviewed
- `/Users/michaelmenard/Development/Monorepo/plans/future/inspiration-gallery/PRD.md` (447 lines)
- `/Users/michaelmenard/Development/Monorepo/plans/future/inspiration-gallery/IMPLEMENTATION-PLAN.md`
- `/Users/michaelmenard/Development/Monorepo/plans/future/inspiration-gallery/STORY-INDEX.md`
- `/Users/michaelmenard/Development/Monorepo/plans/future/inspiration-gallery/TECHNICAL-DETAILS.md`
