# Epic 5: Inspiration Gallery Implementation Order

This document provides the recommended implementation order for Inspiration Gallery stories based on their dependencies.

## Consolidated Stories (v2.0)

The original 50+ granular stories have been consolidated into 22 cohesive stories for efficient implementation, especially when using AI automation tools like `/implement`.

---

## Story Mapping (Old -> New)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2000 | Database Schema & Shared Types | insp-1000.database-schema, insp-1001.zod-schemas-shared-types |
| insp-2001 | S3 Upload Infrastructure | insp-1002.s3-presign-infrastructure |
| insp-2002 | Inspiration Gallery MVP | insp-1004.list-inspirations, insp-1005.gallery-page-scaffolding, insp-1006.inspiration-card-component, insp-1007.get-inspiration-endpoint, insp-1008.inspiration-detail-view |
| insp-2003 | Upload Single Inspiration | insp-1003.create-inspiration-endpoint, insp-1009.upload-modal-single-image |
| insp-2004 | Edit Inspiration | insp-1010.update-inspiration-endpoint, insp-1011.edit-inspiration-modal |
| insp-2005 | Delete Inspiration | insp-1012.delete-inspiration-endpoint, insp-1013.delete-inspiration-ui |
| insp-2006 | Create Album | insp-1014.create-album-endpoint, insp-1015.create-album-modal |
| insp-2007 | Album Gallery & View | insp-1016.list-albums-endpoint, insp-1017.album-card-component, insp-1018.get-album-contents-endpoint, insp-1019.album-view-page |
| insp-2008 | Edit Album | insp-1020.update-album-endpoint, insp-1021.edit-album-modal |
| insp-2009 | Delete Album | insp-1022.delete-album-endpoint, insp-1023.delete-album-ui |
| insp-2010 | Add/Remove from Album | insp-1024.add-inspiration-to-album-endpoint, insp-1025.add-to-album-ui, insp-1026.remove-from-album-endpoint, insp-1027.remove-from-album-ui |
| insp-2011 | Nested Albums & Breadcrumbs | insp-1028.nested-albums-endpoint, insp-1029.album-breadcrumb-navigation |
| insp-2012 | Multi-Image Upload Modal | insp-1030.multi-image-upload-modal, insp-1031.create-as-album-flow |
| insp-2013 | Upload Progress & Error Handling | insp-1032.upload-progress-partial-failure |
| insp-2014 | Drag-and-Drop Reorder | insp-1033.drag-and-drop-reorder, insp-1034.keyboard-reorder |
| insp-2015 | Stack-to-Create-Album Gesture | insp-1035.stack-to-create-album-gesture, insp-1036.stack-undo-toast |
| insp-2016 | Multi-Select & Bulk Operations | insp-1037.multi-select-mode, insp-1038.bulk-operations-menu |
| insp-2017 | MOC Linking | insp-1039.link-inspiration-to-moc-endpoint, insp-1040.link-album-to-moc-endpoint, insp-1041.moc-link-ui, insp-1042.unlink-moc |
| insp-2018 | Empty & Loading States | insp-1043.empty-states, insp-1044.loading-states, insp-1045.error-handling |
| insp-2019 | Tag Management & Onboarding | insp-1048.tag-management-integration, insp-1049.onboarding-tooltips |
| insp-2020 | Keyboard & Screen Reader Support | insp-1046.keyboard-navigation, insp-1047.screen-reader-support |
| insp-2021 | E2E Test Suite | insp-1050.e2e-test-suite |

---

## Dependency Graph

```
insp-2000 (Schema & Types)
    │
    ├── insp-2001 (S3 Infrastructure)
    │       │
    │       └───────────────────────┐
    │                               │
    └────────────────────┐          │
                         ▼          ▼
                    insp-2002 (Gallery MVP)
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    insp-2003       insp-2004       insp-2005
    (Upload)        (Edit)          (Delete)
         │               │               │
         └───────────────┴───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    insp-2006       insp-2007       insp-2008/2009
    (Create Album)  (Album View)    (Edit/Delete Album)
         │               │               │
         └───────────────┴───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    insp-2010                       insp-2011
    (Album Membership)              (Nested Albums)
         │                               │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    insp-2012       insp-2013       insp-2014
    (Multi-Upload)  (Progress)      (Drag-Drop)
         │               │               │
         └───────────────┴───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    insp-2015       insp-2016       insp-2017
    (Stack Gesture) (Multi-Select)  (MOC Link)
         │               │               │
         └───────────────┴───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    insp-2018                       insp-2019
    (Empty/Loading)                 (Tags/Onboarding)
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
                    insp-2020
                    (Accessibility)
                         │
                         ▼
                    insp-2021
                    (E2E Tests)
```

---

## Implementation Phases

### Phase 1: Foundation (2 stories)

No dependencies. Start here.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 1 | insp-2000 | Database Schema & Shared Types | Small |
| 2 | insp-2001 | S3 Upload Infrastructure | Small |

**Deliverables:**
- Drizzle schema for `inspirations`, `albums`, and junction tables
- Zod schemas for all entities and API operations
- S3 presigned URL infrastructure for image uploads
- Database migrations

---

### Phase 2: Vertical Slice (1 story)

Delivers end-to-end read functionality.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 3 | insp-2002 | Inspiration Gallery MVP | Medium |

**Deliverables:**
- GET /api/inspirations endpoint with pagination/filtering
- GET /api/inspirations/:id endpoint
- InspirationCard component
- Gallery page with filtering and sorting
- Detail view page
- RTK Query integration

---

### Phase 3: Inspiration CRUD (3 stories - can run in parallel)

Complete create, update, delete operations for inspirations.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 4a | insp-2003 | Upload Single Inspiration | Medium |
| 4b | insp-2004 | Edit Inspiration | Medium |
| 4c | insp-2005 | Delete Inspiration | Small |

**Parallel Tracks:**

**Track A - Upload (insp-2003):**
- POST /api/inspirations endpoint
- Upload modal with single image
- S3 presigned URL integration

**Track B - Edit (insp-2004):**
- PATCH /api/inspirations/:id endpoint
- Edit modal with form
- Tag editing

**Track C - Delete (insp-2005):**
- DELETE /api/inspirations/:id endpoint
- Delete confirmation modal
- Multi-album awareness in confirmation

---

### Phase 4: Album Core Features (4 stories - can run in parallel)

Album CRUD operations.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 5a | insp-2006 | Create Album | Small |
| 5b | insp-2007 | Album Gallery & View | Medium |
| 5c | insp-2008 | Edit Album | Small |
| 5d | insp-2009 | Delete Album | Small |

**Parallel Tracks:**

**Track A - Create (insp-2006):**
- POST /api/albums endpoint
- Create album modal

**Track B - View (insp-2007):**
- GET /api/albums endpoint
- GET /api/albums/:id/contents endpoint
- AlbumCard component
- Album view page

**Track C - Edit (insp-2008):**
- PATCH /api/albums/:id endpoint
- Edit album modal

**Track D - Delete (insp-2009):**
- DELETE /api/albums/:id endpoint
- Delete confirmation with options (album only vs. contents)

---

### Phase 5: Album Membership (2 stories)

Album organization features.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 6a | insp-2010 | Add/Remove from Album | Medium |
| 6b | insp-2011 | Nested Albums & Breadcrumbs | Medium |

**Deliverables:**
- POST /api/albums/:id/items endpoint
- DELETE /api/albums/:id/items/:itemId endpoint
- "Add to album" picker UI
- "Also in:" badges
- Session-based breadcrumb navigation
- Cycle detection for nested albums

---

### Phase 6: Multi-Image Upload (2 stories)

Enhanced upload experience.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 7a | insp-2012 | Multi-Image Upload Modal | Medium |
| 7b | insp-2013 | Upload Progress & Error Handling | Medium |

**Deliverables:**
- Multi-file drag-and-drop zone
- "Create as album?" prompt
- Per-file progress indicators
- Partial failure handling with retry

---

### Phase 7: Drag-and-Drop (2 stories)

Reordering and organization gestures.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 8a | insp-2014 | Drag-and-Drop Reorder | Medium |
| 8b | insp-2015 | Stack-to-Create-Album Gesture | Medium |

**Deliverables:**
- Visual line indicator for reorder position
- Keyboard alternative for reordering
- Stack gesture with merge icon overlay
- Undo toast for accidental stacks

---

### Phase 8: Bulk Operations (1 story)

Multi-select and batch actions.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 9 | insp-2016 | Multi-Select & Bulk Operations | Medium |

**Deliverables:**
- Multi-select mode toggle
- Selection checkboxes
- Bulk action menu (delete, add to album, tag)
- "Create album from selected" action

---

### Phase 9: MOC Integration (1 story)

Link inspirations/albums to MOC Instructions.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 10 | insp-2017 | MOC Linking | Medium |

**Deliverables:**
- POST/DELETE /api/inspirations/:id/mocs endpoints
- POST/DELETE /api/albums/:id/mocs endpoints
- "Link to MOC" picker UI
- Linked MOCs display in detail view

---

### Phase 10: Polish (2 stories)

UX refinements.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 11a | insp-2018 | Empty & Loading States | Small |
| 11b | insp-2019 | Tag Management & Onboarding | Small |

**Deliverables:**
- Empty states for all scenarios (new user, empty album, no results)
- Loading skeletons
- Error states with retry
- Onboarding tooltip for stack gesture
- Tag autocomplete integration

---

### Phase 11: Accessibility (1 story)

WCAG AA compliance.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 12 | insp-2020 | Keyboard & Screen Reader Support | Medium |

**Deliverables:**
- Full keyboard navigation
- Screen reader announcements for state changes
- Focus management for modals and deletions
- ARIA labels and live regions

---

### Phase 12: E2E Testing (1 story)

Comprehensive integration tests.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 13 | insp-2021 | E2E Test Suite | Medium |

**Deliverables:**
- Playwright tests for all user flows
- Upload/download test fixtures
- Album hierarchy tests
- Mobile viewport tests

---

## Parallel Execution Strategy

For teams or parallel AI agents:

```
Week 1:
  └── insp-2000 (Schema) ──► insp-2001 (S3) ──► insp-2002 (Gallery MVP)

Week 2:
  ├── insp-2003 (Upload)        ─────►┐
  ├── insp-2004 (Edit)          ─────►├──► Phase 4 (Albums)
  └── insp-2005 (Delete)        ─────►┘

Week 3:
  ├── insp-2006 (Create Album)  ─────►┐
  ├── insp-2007 (Album View)    ─────►├──► insp-2010, insp-2011
  ├── insp-2008 (Edit Album)    ─────►┤
  └── insp-2009 (Delete Album)  ─────►┘

Week 4:
  ├── insp-2012 (Multi-Upload)  ─────►┐
  ├── insp-2013 (Progress)      ─────►├──► insp-2014, insp-2015
  └── insp-2016 (Multi-Select)  ─────►┘

Week 5:
  ├── insp-2017 (MOC Link)      ─────►┐
  ├── insp-2018 (Empty States)  ─────►├──► insp-2020 (Accessibility)
  └── insp-2019 (Tags/Onboard)  ─────►┘

Week 6:
  └── insp-2020 (Accessibility) ──► insp-2021 (E2E Tests)
```

---

## MVP Definition

### MVP Scope (Stories 1-9): insp-2000 through insp-2009

Complete CRUD for inspirations and albums:
- View gallery with filtering/sorting
- Upload single images
- Edit inspiration metadata
- Delete inspirations with confirmation
- Create/edit/delete albums
- Basic album organization

### Enhanced Scope (Stories 10-17): insp-2010 through insp-2016

Album membership and advanced features:
- Add/remove from albums
- Nested album navigation
- Multi-image upload
- Drag-and-drop reordering
- Stack-to-create-album gesture
- Multi-select bulk operations

### Complete Scope (Stories 18-22): insp-2017 through insp-2021

Integration and polish:
- MOC linking
- Empty/loading/error states
- Tag management
- Onboarding
- Full accessibility
- E2E test coverage

---

## Data Model Summary

### Inspiration

```typescript
interface Inspiration {
  id: string           // UUID
  userId: string       // UUID, foreign key
  imageUrl: string     // S3 URL (required)
  title?: string       // Optional, max 200 chars
  description?: string // Optional, max 2000 chars
  sourceUrl?: string   // Original source URL
  tags: string[]       // Max 10 tags, 50 chars each
  albumIds: string[]   // Many-to-many (computed)
  mocIds: string[]     // Many-to-many (computed)
  sortOrder: number
  createdAt: string
  updatedAt: string
}
```

### Album

```typescript
interface Album {
  id: string           // UUID
  userId: string       // UUID, foreign key
  title: string        // Required
  description?: string
  coverImageId?: string // Inspiration ID for cover
  tags: string[]
  parentAlbumIds: string[] // Many-to-many (DAG)
  mocIds: string[]
  sortOrder: number
  createdAt: string
  updatedAt: string
}
```

### Junction Tables

- `inspiration_albums`: Inspiration <-> Album (many-to-many)
- `album_parents`: Album <-> Parent Album (DAG structure)
- `inspiration_mocs`: Inspiration <-> MOC (many-to-many)
- `album_mocs`: Album <-> MOC (many-to-many)

---

## API Endpoints Summary

| Endpoint | Method | Story | Purpose |
|----------|--------|-------|---------|
| /api/inspirations | GET | insp-2002 | List with filters/pagination |
| /api/inspirations/:id | GET | insp-2002 | Single item |
| /api/inspirations | POST | insp-2003 | Create inspiration |
| /api/inspirations/:id | PATCH | insp-2004 | Update inspiration |
| /api/inspirations/:id | DELETE | insp-2005 | Delete inspiration |
| /api/albums | GET | insp-2007 | List albums |
| /api/albums/:id | GET | insp-2007 | Single album |
| /api/albums/:id/contents | GET | insp-2007 | Album items |
| /api/albums | POST | insp-2006 | Create album |
| /api/albums/:id | PATCH | insp-2008 | Update album |
| /api/albums/:id | DELETE | insp-2009 | Delete album |
| /api/albums/:id/items | POST | insp-2010 | Add item to album |
| /api/albums/:id/items/:itemId | DELETE | insp-2010 | Remove from album |
| /api/inspirations/:id/mocs | POST | insp-2017 | Link to MOC |
| /api/inspirations/:id/mocs/:mocId | DELETE | insp-2017 | Unlink from MOC |
| /api/albums/:id/mocs | POST | insp-2017 | Link album to MOC |
| /api/albums/:id/mocs/:mocId | DELETE | insp-2017 | Unlink album from MOC |
| /api/inspirations/presign | POST | insp-2001 | Get S3 presigned URL |

---

## Legacy Stories

The following granular stories from v1.0 remain as reference documentation and are not deleted:

- insp-1000 through insp-1050 (original granular stories)
- insp-1000-1005 (legacy format stories)

---

## Change Log

| Date       | Version | Description | Author |
|------------|---------|-------------|--------|
| 2025-12-27 | 1.0 | Initial granular stories (50+) | SM Agent |
| 2025-12-27 | 2.0 | Consolidated to 22 stories for cohesive implementation | Claude |
