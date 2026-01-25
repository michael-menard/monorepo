# Inspiration Gallery - Implementation Plan

> Epic 5: A visual reference management system for LEGO MOC builders to collect, organize, and link inspiration images to their build projects.

---

## Executive Summary

The Inspiration Gallery is a core feature enabling users to:
- Upload and organize reference images for their LEGO builds
- Create albums for grouping related inspirations
- Link inspirations/albums to MOC Instructions for project context
- Use advanced features like drag-drop, multi-select, and bulk operations

### Scope

- **22 consolidated stories** (from 50+ granular stories)
- **12 implementation phases** with clear dependencies
- **MVP scope**: Stories 1-9 (basic CRUD for inspirations and albums)
- **Enhanced scope**: Stories 10-17 (advanced features)
- **Complete scope**: Stories 18-22 (polish and testing)

---

## Architecture Overview

### Data Model

```
┌─────────────────┐       ┌─────────────────┐
│   Inspiration   │       │     Album       │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ userId (FK)     │       │ userId (FK)     │
│ imageUrl        │       │ title           │
│ title?          │       │ description?    │
│ description?    │       │ coverImageId?   │
│ sourceUrl?      │       │ tags[]          │
│ tags[]          │       │ sortOrder       │
│ sortOrder       │       │ createdAt       │
│ createdAt       │       │ updatedAt       │
│ updatedAt       │       └────────┬────────┘
└────────┬────────┘                │
         │                         │
         │    Junction Tables      │
         │    ─────────────────    │
         │                         │
    ┌────┴────┐    ┌──────────────┴────┐    ┌────────────┐
    │inspiration_albums │    │album_parents│    │inspiration_mocs│
    │(many-to-many)     │    │(DAG)        │    │(many-to-many)  │
    └─────────────────┘    └─────────────┘    └────────────────┘
                                                      │
                                              ┌───────┴───────┐
                                              │  album_mocs   │
                                              │ (many-to-many)│
                                              └───────────────┘
```

### Key Design Decisions

1. **Many-to-Many Album Membership**: An inspiration can belong to multiple albums
2. **DAG Album Hierarchy**: Albums can have multiple parents (not a strict tree)
3. **S3 Direct Upload**: Presigned URLs for client-side image uploads
4. **Thumbnail Generation**: On-upload Lambda or on-demand resizing

---

## Dependency Graph

```
Phase 1: Foundation
─────────────────────────────────────────────────────
insp-2000 (Schema & Types)
    │
    └── insp-2001 (S3 Infrastructure)

Phase 2: Vertical Slice
─────────────────────────────────────────────────────
                    insp-2002 (Gallery MVP)
                         │
Phase 3: Inspiration CRUD (parallel)
─────────────────────────────────────────────────────
    ┌────────────────────┼────────────────────┐
    │                    │                    │
insp-2003           insp-2004           insp-2005
(Upload)            (Edit)              (Delete)

Phase 4: Album Core (parallel)
─────────────────────────────────────────────────────
    ┌─────────┬──────────┬──────────┐
    │         │          │          │
insp-2006  insp-2007  insp-2008  insp-2009
(Create)   (View)     (Edit)     (Delete)

Phase 5: Album Membership
─────────────────────────────────────────────────────
    ┌──────────────────┴──────────────────┐
    │                                     │
insp-2010                            insp-2011
(Add/Remove)                         (Nested)

Phase 6-8: Enhanced Features
─────────────────────────────────────────────────────
insp-2012 ─┬─ insp-2014 ─┬─ insp-2015
(Multi)    │  (Drag)     │  (Stack)
           │             │
insp-2013 ─┘             └─ insp-2016
(Progress)                  (Bulk)

Phase 9-11: Integration & Polish
─────────────────────────────────────────────────────
insp-2017 (MOC Link)
insp-2018 (Empty/Loading)
insp-2019 (Tags/Onboarding)
    │
    └── insp-2020 (Accessibility)
            │
            └── insp-2021 (E2E Tests)
```

---

## Implementation Phases

### Phase 1: Foundation (2 stories)

**No dependencies - Start here**

| Story | Title | Effort | Key Deliverables |
|-------|-------|--------|------------------|
| insp-2000 | Database Schema & Shared Types | Small | Drizzle schema, migrations, Zod schemas |
| insp-2001 | S3 Upload Infrastructure | Small | Presigned URLs, CORS, thumbnail pipeline |

**Technical Details:**

```typescript
// Drizzle Tables
- inspirations (id, userId, imageUrl, title, description, sourceUrl, tags, sortOrder)
- albums (id, userId, title, description, coverImageId, tags, sortOrder)
- inspiration_albums (inspirationId, albumId, sortOrder)
- album_parents (albumId, parentAlbumId)
- inspiration_mocs (inspirationId, mocId)
- album_mocs (albumId, mocId)

// S3 Configuration
- Bucket: ${project}-inspirations-${stage}
- Key pattern: users/{userId}/inspirations/{uuid}/{filename}
- Presign expiration: 5 minutes
- Max file size: 10MB
- Allowed types: jpeg, png, gif, webp
```

---

### Phase 2: Vertical Slice (1 story)

**Depends on: Phase 1**

| Story | Title | Effort | Key Deliverables |
|-------|-------|--------|------------------|
| insp-2002 | Inspiration Gallery MVP | Medium | List/Get endpoints, Gallery page, Card component, Detail view |

**API Endpoints:**
- `GET /api/inspirations` - List with pagination, filtering, sorting
- `GET /api/inspirations/:id` - Single item with relations

**Frontend Routes:**
- `/inspiration` - Gallery page
- `/inspiration/:id` - Detail page

**Components:**
- `InspirationCard` - Image thumbnail, title, tags
- `InspirationCardSkeleton` - Loading state
- Gallery grid layout

---

### Phase 3: Inspiration CRUD (3 stories - parallel)

**Depends on: Phase 2**

| Story | Title | Effort | Track |
|-------|-------|--------|-------|
| insp-2003 | Upload Single Inspiration | Medium | A |
| insp-2004 | Edit Inspiration | Medium | B |
| insp-2005 | Delete Inspiration | Small | C |

**Track A - Upload:**
- `POST /api/inspirations` endpoint
- Upload modal with S3 integration
- Title, description, tags, source URL fields

**Track B - Edit:**
- `PATCH /api/inspirations/:id` endpoint
- Edit modal with form validation
- Tag editing

**Track C - Delete:**
- `DELETE /api/inspirations/:id` endpoint
- Confirmation modal
- Multi-album awareness message

---

### Phase 4: Album Core (4 stories - parallel)

**Depends on: Phase 3**

| Story | Title | Effort | Track |
|-------|-------|--------|-------|
| insp-2006 | Create Album | Small | A |
| insp-2007 | Album Gallery & View | Medium | B |
| insp-2008 | Edit Album | Small | C |
| insp-2009 | Delete Album | Small | D |

**Track A - Create:**
- `POST /api/albums` endpoint
- Create album modal

**Track B - View:**
- `GET /api/albums` - List albums
- `GET /api/albums/:id` - Single album
- `GET /api/albums/:id/contents` - Album items
- `AlbumCard` component
- Album view page

**Track C - Edit:**
- `PATCH /api/albums/:id` endpoint
- Edit album modal

**Track D - Delete:**
- `DELETE /api/albums/:id` endpoint
- Options: delete album only vs. delete contents

---

### Phase 5: Album Membership (2 stories)

**Depends on: Phase 4**

| Story | Title | Effort |
|-------|-------|--------|
| insp-2010 | Add/Remove from Album | Medium |
| insp-2011 | Nested Albums & Breadcrumbs | Medium |

**Key Features:**
- `POST /api/albums/:id/items` - Add item
- `DELETE /api/albums/:id/items/:itemId` - Remove item
- "Add to album" picker UI
- "Also in:" badges showing album membership
- Session-based breadcrumb navigation
- Cycle detection for nested albums (DAG validation)

---

### Phase 6: Multi-Image Upload (2 stories)

**Depends on: Phase 5**

| Story | Title | Effort |
|-------|-------|--------|
| insp-2012 | Multi-Image Upload Modal | Medium |
| insp-2013 | Upload Progress & Error Handling | Medium |

**Key Features:**
- Multi-file drag-and-drop zone
- "Create as album?" prompt for 2+ images
- Per-file progress indicators
- Partial failure handling with retry
- Cancel individual uploads

---

### Phase 7: Drag-and-Drop (2 stories)

**Depends on: Phase 6**

| Story | Title | Effort |
|-------|-------|--------|
| insp-2014 | Drag-and-Drop Reorder | Medium |
| insp-2015 | Stack-to-Create-Album Gesture | Medium |

**Key Features:**
- Visual line indicator for reorder position
- Keyboard alternative for reordering (a11y)
- Stack gesture with merge icon overlay
- Undo toast for accidental stacks
- Persist sort order changes

---

### Phase 8: Bulk Operations (1 story)

**Depends on: Phase 7**

| Story | Title | Effort |
|-------|-------|--------|
| insp-2016 | Multi-Select & Bulk Operations | Medium |

**Key Features:**
- Multi-select mode toggle
- Selection checkboxes on cards
- Bulk action menu (delete, add to album, tag)
- "Create album from selected" action
- Clear selection action

---

### Phase 9: MOC Integration (1 story)

**Depends on: Phase 4 + MOC Instructions Epic**

| Story | Title | Effort |
|-------|-------|--------|
| insp-2017 | MOC Linking | Medium |

**API Endpoints:**
- `POST /api/inspirations/:id/mocs` - Link to MOC
- `DELETE /api/inspirations/:id/mocs/:mocId` - Unlink
- `POST /api/albums/:id/mocs` - Link album to MOC
- `DELETE /api/albums/:id/mocs/:mocId` - Unlink

**UI Features:**
- "Link to MOC" picker modal
- Linked MOCs display in detail view
- Navigation to linked MOCs
- Unlink action

---

### Phase 10: Polish (2 stories)

**Depends on: Phases 1-9**

| Story | Title | Effort |
|-------|-------|--------|
| insp-2018 | Empty & Loading States | Small |
| insp-2019 | Tag Management & Onboarding | Small |

**Key Features:**
- Empty states (new user, empty album, no search results)
- Loading skeletons for all views
- Error states with retry actions
- Onboarding tooltip for stack gesture
- Tag autocomplete integration

---

### Phase 11: Accessibility (1 story)

**Depends on: Phase 10**

| Story | Title | Effort |
|-------|-------|--------|
| insp-2020 | Keyboard & Screen Reader Support | Medium |

**Requirements (WCAG AA):**
- Full keyboard navigation (Tab, Arrow keys, Enter, Escape)
- Screen reader announcements for state changes
- Focus management for modals and deletions
- ARIA labels and live regions
- Visible focus indicators
- Reduced motion support

---

### Phase 12: E2E Testing (1 story)

**Depends on: Phase 11**

| Story | Title | Effort |
|-------|-------|--------|
| insp-2021 | E2E Test Suite | Medium |

**Playwright Test Coverage:**
- Gallery navigation and filtering
- Upload flow (single and multi)
- Edit and delete operations
- Album CRUD and membership
- Nested album navigation
- Multi-select and bulk operations
- MOC linking
- Mobile viewport tests
- Accessibility tests

---

## API Endpoints Summary

| Endpoint | Method | Story | Purpose |
|----------|--------|-------|---------|
| `/api/inspirations` | GET | 2002 | List with filters/pagination |
| `/api/inspirations/:id` | GET | 2002 | Single item |
| `/api/inspirations` | POST | 2003 | Create inspiration |
| `/api/inspirations/:id` | PATCH | 2004 | Update inspiration |
| `/api/inspirations/:id` | DELETE | 2005 | Delete inspiration |
| `/api/inspirations/presign` | POST | 2001 | Get S3 presigned URL |
| `/api/inspirations/:id/mocs` | POST | 2017 | Link to MOC |
| `/api/inspirations/:id/mocs/:mocId` | DELETE | 2017 | Unlink from MOC |
| `/api/albums` | GET | 2007 | List albums |
| `/api/albums/:id` | GET | 2007 | Single album |
| `/api/albums/:id/contents` | GET | 2007 | Album items |
| `/api/albums` | POST | 2006 | Create album |
| `/api/albums/:id` | PATCH | 2008 | Update album |
| `/api/albums/:id` | DELETE | 2009 | Delete album |
| `/api/albums/:id/items` | POST | 2010 | Add item to album |
| `/api/albums/:id/items/:itemId` | DELETE | 2010 | Remove from album |
| `/api/albums/:id/mocs` | POST | 2017 | Link album to MOC |
| `/api/albums/:id/mocs/:mocId` | DELETE | 2017 | Unlink album from MOC |

---

## Frontend Routes

| Route | Component | Story |
|-------|-----------|-------|
| `/inspiration` | InspirationGalleryPage | 2002 |
| `/inspiration/:id` | InspirationDetailPage | 2002 |
| `/inspiration/album/:id` | AlbumViewPage | 2007 |

---

## File Structure

```
apps/api/
  database/schema/
    inspiration.ts              # Drizzle schema (2000)
  endpoints/inspirations/
    list/handler.ts            # GET /inspirations (2002)
    get/handler.ts             # GET /inspirations/:id (2002)
    create/handler.ts          # POST /inspirations (2003)
    update/handler.ts          # PATCH /inspirations/:id (2004)
    delete/handler.ts          # DELETE /inspirations/:id (2005)
    presign/handler.ts         # POST /inspirations/presign (2001)
    mocs/
      link/handler.ts          # POST /inspirations/:id/mocs (2017)
      unlink/handler.ts        # DELETE /inspirations/:id/mocs/:mocId (2017)
  endpoints/albums/
    list/handler.ts            # GET /albums (2007)
    get/handler.ts             # GET /albums/:id (2007)
    contents/handler.ts        # GET /albums/:id/contents (2007)
    create/handler.ts          # POST /albums (2006)
    update/handler.ts          # PATCH /albums/:id (2008)
    delete/handler.ts          # DELETE /albums/:id (2009)
    items/
      add/handler.ts           # POST /albums/:id/items (2010)
      remove/handler.ts        # DELETE /albums/:id/items/:itemId (2010)
    mocs/
      link/handler.ts          # POST /albums/:id/mocs (2017)
      unlink/handler.ts        # DELETE /albums/:id/mocs/:mocId (2017)
  functions/
    generate-thumbnails/       # S3 trigger Lambda (2001)

packages/core/api-client/src/
  schemas/
    inspiration.ts             # Zod schemas (2000)
  rtk/
    inspiration-api.ts         # RTK Query (2002+)

apps/web/main-app/src/routes/inspiration/
  index.tsx                    # Gallery page (2002)
  $id.tsx                      # Detail page (2002)
  album/
    $id.tsx                    # Album view (2007)
  -components/
    InspirationCard/           # Card component (2002)
    InspirationUploadModal/    # Upload modal (2003, 2012)
    InspirationEditModal/      # Edit modal (2004)
    AlbumCard/                 # Album card (2007)
    AlbumCreateModal/          # Create album (2006)
    AlbumEditModal/            # Edit album (2008)
    AddToAlbumModal/           # Album picker (2010)
    MocPickerModal/            # MOC linker (2017)
    BulkActionsToolbar/        # Multi-select (2016)
```

---

## Parallel Execution Strategy

For teams or AI agents working in parallel:

```
Week 1: Sequential Foundation
├── Day 1-2: insp-2000 (Schema)
├── Day 2-3: insp-2001 (S3)
└── Day 3-5: insp-2002 (Gallery MVP)

Week 2: Parallel CRUD Tracks
├── Track A: insp-2003 (Upload)
├── Track B: insp-2004 (Edit)
└── Track C: insp-2005 (Delete)

Week 3: Parallel Album Tracks
├── Track A: insp-2006 (Create Album)
├── Track B: insp-2007 (Album View)
├── Track C: insp-2008 (Edit Album)
└── Track D: insp-2009 (Delete Album)

Week 4: Album Features + Enhanced
├── insp-2010 (Album Membership)
├── insp-2011 (Nested Albums)
├── insp-2012 (Multi-Upload)
└── insp-2013 (Progress)

Week 5: Advanced Interactions
├── insp-2014 (Drag-Drop)
├── insp-2015 (Stack Gesture)
├── insp-2016 (Multi-Select)
└── insp-2017 (MOC Link)

Week 6: Polish & Testing
├── insp-2018 (Empty/Loading)
├── insp-2019 (Tags/Onboarding)
├── insp-2020 (Accessibility)
└── insp-2021 (E2E Tests)
```

---

## MVP Definition

### MVP Scope: Stories 2000-2009

Complete CRUD for inspirations and albums:
- View gallery with filtering/sorting
- Upload single images
- Edit inspiration metadata
- Delete inspirations with confirmation
- Create/edit/delete albums
- Basic album organization

### Enhanced Scope: Stories 2010-2016

Album membership and advanced features:
- Add/remove from albums
- Nested album navigation
- Multi-image upload
- Drag-and-drop reordering
- Stack-to-create-album gesture
- Multi-select bulk operations

### Complete Scope: Stories 2017-2021

Integration and polish:
- MOC linking
- Empty/loading/error states
- Tag management
- Onboarding
- Full accessibility
- E2E test coverage

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| S3 CORS issues | Medium | High | Test early with actual domains |
| Thumbnail generation latency | Medium | Medium | Consider on-demand resizing |
| DAG cycle detection complexity | Low | Medium | Well-tested algorithm |
| Drag-drop on mobile | High | Medium | Fallback to long-press menu |
| Large album performance | Medium | High | Virtual scrolling, pagination |

---

## Success Metrics

- **Upload Success Rate**: >99% of uploads complete successfully
- **Gallery Load Time**: <2s for first 20 items
- **Image Load Performance**: Lazy loading, thumbnails served
- **Accessibility**: WCAG AA compliance
- **Test Coverage**: >80% for critical paths

---

## References

- [Original Story Files](/docs/stories.bak/epic-5-inspiration)
- [PRD: Epic 5 - Inspiration Gallery](/docs/prd/epic-5-inspiration-gallery.md)
- [Tech Stack: Frontend](/docs/tech-stack/frontend.md)
- [Tech Stack: Backend](/docs/tech-stack/backend.md)

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-24 | 1.0 | Initial implementation plan created from epic stories | Claude |
