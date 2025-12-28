# Epic 5: Inspiration Gallery

**Story Location:** `docs/stories/epic-5-inspiration/`
**Status:** Draft

---

## Epic Goal

Enable users to collect, organize, and manage visual inspiration for their LEGO MOC builds through a flexible album-based system with nested hierarchies and MOC linking.

---

## Epic Description

### Context

The Inspiration Gallery is a visual collection tool for LEGO builders to gather reference images, concept art, and build ideas. Unlike MOC Instructions (which are structured uploads with files), Inspirations are lightweight image-centric items that can be freely organized into nested albums.

**Key Differentiators from MOC Instructions:**
- Images are the primary content (not file packages)
- Nested album hierarchy with many-to-many relationships
- No file management complexity (single image per item)
- Hard delete (no soft delete/restore)
- Drag-and-drop organization including "stack to create album"

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Inspiration** | A single image with optional metadata (title, description, URL, tags) |
| **Album** | A named collection of inspirations and/or other albums. Has its own metadata and tags. |
| **Hierarchy** | Albums can be nested. Inspirations can belong to multiple albums. Albums can have multiple parents. (DAG structure) |
| **Orphans** | Inspirations not in any album remain visible in the root gallery |
| **MOC Link** | Inspirations and albums can be linked to one or more MOC Instructions |

### Success Criteria

- Users can upload single or multiple images via modal
- Users can create albums manually or via multi-image upload prompt
- Users can drag to reorder and stack to create albums in gallery view
- Nested album navigation works correctly
- Images/albums can be linked to MOC Instructions
- Gallery supports sorting, filtering, and tagging (via shared gallery package)
- Hard delete with confirmation works correctly

---

## Data Model

### Inspiration Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary identifier |
| `userId` | UUID | Yes | Owner |
| `imageUrl` | string | Yes | S3 URL to stored image |
| `title` | string | No | Optional title |
| `description` | string | No | Optional description |
| `sourceUrl` | string | No | Original source URL if applicable |
| `tags` | string[] | No | Theme/category tags (tree, castle, car, 1:8 scale, etc.) |
| `albumIds` | UUID[] | No | Albums this inspiration belongs to (many-to-many) |
| `mocIds` | UUID[] | No | Linked MOC Instructions (many-to-many) |
| `sortOrder` | number | Yes | Position in gallery/album |
| `createdAt` | datetime | Yes | Created timestamp |
| `updatedAt` | datetime | Yes | Last modified timestamp |

### Album

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary identifier |
| `userId` | UUID | Yes | Owner |
| `title` | string | Yes | Album name |
| `description` | string | No | Optional description |
| `coverImageId` | UUID | No | Inspiration to use as cover (defaults to first) |
| `tags` | string[] | No | Theme/category tags |
| `parentAlbumIds` | UUID[] | No | Parent albums (many-to-many, enables nesting) |
| `mocIds` | UUID[] | No | Linked MOC Instructions (many-to-many) |
| `sortOrder` | number | Yes | Position in parent/gallery |
| `createdAt` | datetime | Yes | Created timestamp |
| `updatedAt` | datetime | Yes | Last modified timestamp |

---

## CRUD Operations

### Create

| Operation | Trigger | Flow |
|-----------|---------|------|
| **Add Inspiration** | "Add" button in gallery | Opens modal → upload one or more images → if multiple, prompt "Create album?" → save |
| **Create Album (explicit)** | Menu action or modal option | Enter album name/metadata → create empty album |
| **Create Album (implicit)** | Stack images in gallery | Drag image onto another → prompt for album name → create album with both |
| **Bulk Upload** | Modal with multi-select | Upload N images → prompt to create album or add individually |

### Read

| Operation | Description |
|-----------|-------------|
| **Gallery View** | Grid of inspirations and albums at root level. Uses shared gallery package. |
| **Album View** | Contents of specific album (inspirations + nested albums) |
| **Detail View** | Full-size image with metadata panel |
| **Filter/Sort** | By tags, date, title. Via shared gallery package. |

### Update

| Operation | Scope | Notes |
|-----------|-------|-------|
| **Edit Metadata** | Inspiration or Album | Title, description, tags, source URL |
| **Reorder** | Gallery or Album view | Drag to new position |
| **Move to Album** | Inspiration | Add to album (can be in multiple) |
| **Remove from Album** | Inspiration | Remove from specific album (orphan allowed) |
| **Unlink Album** | Album | Remove from parent album |
| **Link to MOC** | Inspiration or Album | Associate with MOC Instructions |
| **Unlink from MOC** | Inspiration or Album | Remove MOC association |

### Delete

| Operation | Flow |
|-----------|------|
| **Delete Inspiration** | Confirmation modal ("Are you sure? This is permanent.") → hard delete from S3 and database |
| **Delete Album** | Confirmation modal → hard delete album. **Contents NOT deleted** - inspirations/nested albums become orphaned or remain in other parents. |

---

## User Interface

### Gallery View
- Uses shared gallery package (sorting, filtering, tags)
- Grid layout with drag-and-drop reordering
- Stack gesture to create albums (see Interaction Patterns below)
- Visual distinction between inspirations (single image) and albums (stacked/folder icon)
- "Add" button opens upload modal
- Multi-select mode for bulk operations (context menu: "Create album from selected")

### Upload Modal
- Drag-and-drop zone or file picker
- Multi-file support
- Preview thumbnails before upload
- If multiple files: "Create as album?" prompt with album name field
- Progress indicator for each file
- Partial failure handling: show success/fail per file, allow retry

### Album Navigation
- Breadcrumb trail shows **path taken** (session-based), not canonical path
- "Back" button returns to previous location (not necessarily parent)
- Album header shows "Also in:" badges when album has multiple parents
- Album cover displays first image or user-selected cover

### Detail View
- Full-size image display
- Metadata panel (title, description, tags, source URL)
- **"Also in:" section** showing all albums this image belongs to
- Edit button for metadata
- "Link to MOC" action
- Two delete actions:
  - "Remove from this album" (if viewing within album context)
  - "Delete permanently" (with confirmation showing album count)

### Empty States

| State | Design |
|-------|--------|
| **Empty gallery (new user)** | Welcoming illustration, "Start your inspiration collection" headline, prominent "Upload your first image" CTA |
| **Empty gallery (all deleted)** | "No inspirations yet. Upload images to start collecting ideas." |
| **Empty album** | "This album is empty. Drag images here or click to upload." with drop zone highlight |
| **No search/filter results** | "No inspirations match your filters. Try adjusting your search or clearing filters." with clear filters button |

### Loading & Error States

| State | Design |
|-------|--------|
| **Gallery loading** | Skeleton cards matching grid layout |
| **Image loading** | Blurred placeholder or skeleton, lazy-load on scroll |
| **Upload in progress** | Modal stays open, per-file progress bars, "X of Y uploaded" |
| **Upload failure** | Red indicator on failed file, "Retry" button, option to skip |
| **Save failure** | Toast: "Couldn't save changes. Retry?" with retry action |
| **Delete failure** | Toast: "Couldn't delete. Please try again." |

---

## Interaction Patterns

### Drag-and-Drop Reorder
- **Visual feedback:** Line indicator appears between items showing drop position
- **Keyboard alternative:** Select item → Arrow keys to move → Enter to confirm
- **Touch:** Long-press (300ms) to initiate drag

### Stack-to-Create-Album Gesture

| Aspect | Design |
|--------|--------|
| **Discoverability** | Onboarding tooltip on first gallery visit: "Tip: Drag images onto each other to create albums" |
| **Visual feedback** | Drop target highlights with "merge" icon overlay, distinct from reorder line |
| **Confirmation** | Quick modal: "Create album?" with name field, "Create" / "Cancel" |
| **Undo** | Toast appears: "Album '[name]' created" with "Undo" action (5 second timeout) |
| **Alternative** | Multi-select → Context menu → "Create album from selected" for precision |
| **Keyboard** | Select multiple items → Press "G" (group) → Name prompt |

### Album Delete Confirmation

Modal presents clear options:

```
┌─────────────────────────────────────────────────────┐
│  Delete "Diorama Ideas"?                            │
│                                                     │
│  This album contains 12 images and 2 sub-albums.    │
│                                                     │
│  ○ Delete album only                                │
│    Images and sub-albums will remain in the gallery │
│                                                     │
│  ○ Delete album and all contents                    │
│    12 images and 2 sub-albums will be permanently   │
│    deleted. This cannot be undone.                  │
│                                                     │
│              [Cancel]  [Delete]                     │
└─────────────────────────────────────────────────────┘
```

Default selection: "Delete album only" (safer option)

### Image Delete Confirmation

When image belongs to multiple albums:

```
┌─────────────────────────────────────────────────────┐
│  Delete this image?                                 │
│                                                     │
│  This image is in 3 albums:                         │
│  • Castle Ideas                                     │
│  • Medieval Builds                                  │
│  • Favorites                                        │
│                                                     │
│  Deleting will remove it from all albums.           │
│  This cannot be undone.                             │
│                                                     │
│              [Cancel]  [Delete permanently]         │
└─────────────────────────────────────────────────────┘
```

### Multi-Album Visibility

Detail view sidebar shows album membership:

```
┌─────────────────────┐
│  Also in:           │
│  [Castle Ideas]     │  ← Clickable badges
│  [Medieval Builds]  │
│  [Favorites]        │
│  + Add to album...  │  ← Opens album picker
└─────────────────────┘
```

---

## Mobile Considerations

**MVP Scope:** Desktop-first. Mobile is view-only with limited interactions.

| Feature | Desktop | Mobile (MVP) |
|---------|---------|--------------|
| View gallery | ✅ | ✅ |
| View detail | ✅ | ✅ |
| Upload images | ✅ | ✅ (camera roll) |
| Drag to reorder | ✅ | ❌ (future) |
| Stack to create album | ✅ | ❌ (use menu instead) |
| Create album | ✅ | ✅ (via menu) |
| Edit metadata | ✅ | ✅ |
| Delete | ✅ | ✅ |

**Future mobile enhancements:**
- Touch-optimized drag-and-drop
- Swipe actions (swipe to delete, swipe to add to album)
- Share sheet integration ("Save to Inspiration Gallery")

---

## Accessibility Requirements

### Keyboard Navigation

| Action | Keyboard Shortcut |
|--------|-------------------|
| Navigate gallery | Arrow keys |
| Select item | Space |
| Multi-select | Shift + Arrow / Shift + Click |
| Open detail view | Enter |
| Close modal/detail | Escape |
| Reorder item | Select → Arrow keys → Enter to confirm |
| Group into album | Select multiple → G |
| Delete | Select → Delete/Backspace |
| Upload | U (when in gallery) |

### Screen Reader Support

| Element | Announcement |
|---------|--------------|
| Gallery item (image) | "[Title or 'Untitled inspiration'], image, [position] of [total]" |
| Gallery item (album) | "[Album name], album containing [count] items, [position] of [total]" |
| Drag operation | "Grabbed [item]. Use arrow keys to move. Enter to drop. Escape to cancel." |
| Drop completed | "[Item] moved to position [X]" or "Album [name] created with [count] images" |
| Delete completed | "[Item] deleted" or "Album [name] deleted" |
| Upload progress | "[X] of [Y] images uploaded" |

### Focus Management

| Scenario | Focus Behavior |
|----------|----------------|
| Modal opens | Focus moves to first interactive element in modal |
| Modal closes | Focus returns to element that triggered modal |
| Item deleted | Focus moves to next item (or previous if last) |
| Album created | Focus moves to new album |
| Upload complete | Focus moves to first uploaded item |

### Image Alt Text
- `title` field auto-populates `alt` attribute
- If no title: "User uploaded inspiration image"
- Albums use: "[Album name] album cover"

### Color & Contrast
- All interactive states meet WCAG AA contrast (4.5:1 for text)
- Selection state uses both color AND visual indicator (border/outline)
- Error states use icon + text, not color alone

---

## Stories Overview

### Existing Stories (Read-focused)
- `insp-1000`: Gallery scaffolding
- `insp-1001`: Card component
- `insp-1002`: API endpoints (partial)
- `insp-1003`: Upload page
- `insp-1004`: Collection management
- `insp-1005`: Link to MOC

### New Stories Needed (CRUD completion)

| Story | Description | Priority |
|-------|-------------|----------|
| **insp-1006** | Album data model and nested hierarchy | High |
| **insp-1007** | Upload modal with multi-image support | High |
| **insp-1008** | Album create/edit endpoints | High |
| **insp-1009** | Inspiration create/edit endpoints | High |
| **insp-1010** | Drag-and-drop reorder in gallery | Medium |
| **insp-1011** | Stack-to-create-album gesture with undo | Medium |
| **insp-1012** | Album navigation and breadcrumbs (session-based path) | Medium |
| **insp-1013** | MOC linking UI and endpoints | Medium |
| **insp-1014** | Delete flows (album options, multi-album awareness) | Medium |
| **insp-1015** | Metadata edit modal with album membership | Low |
| **insp-1016** | Tag management integration | Low |
| **insp-1017** | Empty states and onboarding tooltips | Medium |
| **insp-1018** | Keyboard navigation and accessibility | Medium |
| **insp-1019** | Loading states and error handling | Low |
| **insp-1020** | Multi-select mode and bulk operations | Low |

---

## Dependencies

### Internal Dependencies
- Shared gallery package (sorting, filtering)
- S3 infrastructure (image storage)
- Existing MOC Instructions (for linking)
- Authentication/authorization

### External Dependencies
- None

---

## Technical Notes

### Many-to-Many Relationships
The album hierarchy is a DAG (Directed Acyclic Graph), not a tree:
- Inspirations can belong to multiple albums
- Albums can have multiple parents
- Cycle detection required when adding parent relationships

### Image Storage
- Images uploaded to S3 with user-scoped prefix
- Thumbnails generated on upload (consider Lambda@Edge or on-demand)
- Original preserved for full-size viewing

### Shared Gallery Integration
Must integrate with existing gallery package for:
- Virtualized grid rendering
- Sort controls
- Filter sidebar
- Tag chips

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Complex drag-and-drop interactions | Medium | Medium | Use established library (dnd-kit), prototype early |
| Many-to-many queries slow at scale | Low | Medium | Proper indexing, consider denormalization |
| Large image uploads timeout | Medium | Low | Multipart upload, client-side compression option |
| Cycle detection in album DAG | Low | High | Validate on parent assignment, reject cycles |

---

## Definition of Done

### Core Functionality
- [ ] Users can upload single and multiple images
- [ ] Albums can be created explicitly and via stacking (with undo)
- [ ] Nested album navigation works with session-based breadcrumbs
- [ ] Drag-and-drop reordering works
- [ ] MOC linking works for inspirations and albums
- [ ] Delete flows work correctly (album options, multi-album awareness)
- [ ] Gallery sorting/filtering works via shared package

### UX & Polish
- [ ] Empty states implemented for all scenarios
- [ ] Onboarding tooltip for stack gesture
- [ ] Loading states (skeleton cards, image placeholders)
- [ ] Error states with retry actions
- [ ] "Also in:" visibility for multi-album membership
- [ ] Multi-select mode with bulk operations

### Accessibility
- [ ] Keyboard navigation for all actions
- [ ] Screen reader announcements for state changes
- [ ] Focus management for modals and deletions
- [ ] Alt text generated from titles
- [ ] WCAG AA contrast compliance

### Technical
- [ ] All new API endpoints have tests
- [ ] No TypeScript errors
- [ ] Code reviewed and merged
- [ ] Mobile view-only experience works

---

**Related Epics:**
- Epic 4: MOC Instructions (for MOC linking)
- Epic 6: Wishlist
- Epic 7: Sets Gallery
