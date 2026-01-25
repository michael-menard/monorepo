# Inspiration Gallery - Story Index

Quick reference for all 22 stories in Epic 5.

---

## Phase 1: Foundation

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2000 | Database Schema & Shared Types | Small | Draft |
| insp-2001 | S3 Upload Infrastructure | Small | Draft |

**Deliverables:**
- Drizzle schema for inspirations, albums, junction tables
- Database migrations
- Zod schemas for all entities
- S3 presigned URL infrastructure
- Thumbnail generation pipeline

---

## Phase 2: Vertical Slice

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2002 | Inspiration Gallery MVP | Medium | Draft |

**Deliverables:**
- GET /api/inspirations (list with pagination)
- GET /api/inspirations/:id (single item)
- InspirationCard component
- Gallery page with filtering
- Detail view page
- RTK Query integration

---

## Phase 3: Inspiration CRUD

| ID | Title | Effort | Status | Parallel |
|----|-------|--------|--------|----------|
| insp-2003 | Upload Single Inspiration | Medium | Draft | A |
| insp-2004 | Edit Inspiration | Medium | Draft | B |
| insp-2005 | Delete Inspiration | Small | Draft | C |

**Deliverables:**
- POST /api/inspirations
- PATCH /api/inspirations/:id
- DELETE /api/inspirations/:id
- Upload modal with S3 integration
- Edit modal with form
- Delete confirmation with album awareness

---

## Phase 4: Album Core

| ID | Title | Effort | Status | Parallel |
|----|-------|--------|--------|----------|
| insp-2006 | Create Album | Small | Draft | A |
| insp-2007 | Album Gallery & View | Medium | Draft | B |
| insp-2008 | Edit Album | Small | Draft | C |
| insp-2009 | Delete Album | Small | Draft | D |

**Deliverables:**
- Full album CRUD endpoints
- AlbumCard component
- Album view page
- Delete options (album only vs. contents)

---

## Phase 5: Album Membership

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2010 | Add/Remove from Album | Medium | Draft |
| insp-2011 | Nested Albums & Breadcrumbs | Medium | Draft |

**Deliverables:**
- POST /api/albums/:id/items
- DELETE /api/albums/:id/items/:itemId
- Add-to-album picker UI
- "Also in:" badges
- Breadcrumb navigation
- DAG cycle detection

---

## Phase 6: Multi-Image Upload

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2012 | Multi-Image Upload Modal | Medium | Draft |
| insp-2013 | Upload Progress & Error Handling | Medium | Draft |

**Deliverables:**
- Multi-file drag-and-drop
- "Create as album?" prompt
- Per-file progress indicators
- Partial failure handling with retry

---

## Phase 7: Drag-and-Drop

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2014 | Drag-and-Drop Reorder | Medium | Draft |
| insp-2015 | Stack-to-Create-Album Gesture | Medium | Draft |

**Deliverables:**
- Visual reorder indicator
- Keyboard reorder alternative
- Stack gesture with merge icon
- Undo toast

---

## Phase 8: Bulk Operations

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2016 | Multi-Select & Bulk Operations | Medium | Draft |

**Deliverables:**
- Multi-select mode toggle
- Selection checkboxes
- Bulk action menu
- "Create album from selected"

---

## Phase 9: MOC Integration

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2017 | MOC Linking | Medium | Draft |

**Deliverables:**
- Link/unlink endpoints for inspirations and albums
- MOC picker modal
- Linked MOCs display
- Navigation to linked MOCs

---

## Phase 10: Polish

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2018 | Empty & Loading States | Small | Draft |
| insp-2019 | Tag Management & Onboarding | Small | Draft |

**Deliverables:**
- Empty states for all scenarios
- Loading skeletons
- Error states with retry
- Onboarding tooltip
- Tag autocomplete

---

## Phase 11: Accessibility

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2020 | Keyboard & Screen Reader Support | Medium | Draft |

**Deliverables:**
- Full keyboard navigation
- Screen reader announcements
- Focus management
- ARIA labels and live regions
- WCAG AA compliance

---

## Phase 12: E2E Testing

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| insp-2021 | E2E Test Suite | Medium | Draft |

**Deliverables:**
- Playwright tests for all flows
- Upload/download fixtures
- Album hierarchy tests
- Mobile viewport tests

---

## Story Files Reference

All original story files are located at:
```
/docs/stories.bak/epic-5-inspiration/
├── IMPLEMENTATION-ORDER.md
├── insp-2000-database-schema-shared-types.md
├── insp-2001-s3-upload-infrastructure.md
├── insp-2002-inspiration-gallery-mvp.md
├── insp-2003-upload-single-inspiration.md
├── insp-2004-edit-inspiration.md
├── insp-2005-delete-inspiration.md
├── insp-2006-create-album.md
├── insp-2007-album-gallery-view.md
├── insp-2008-edit-album.md
├── insp-2009-delete-album.md
├── insp-2010-album-membership.md
├── insp-2011-nested-albums-breadcrumbs.md
├── insp-2012-multi-image-upload.md
├── insp-2013-upload-progress-errors.md
├── insp-2014-drag-drop-reorder.md
├── insp-2015-stack-gesture.md
├── insp-2016-multi-select-bulk.md
├── insp-2017-moc-linking.md
├── insp-2018-empty-loading-states.md
├── insp-2019-tags-onboarding.md
├── insp-2020-accessibility.md
└── insp-2021-e2e-tests.md
```

---

## Effort Summary

| Effort | Count | Stories |
|--------|-------|---------|
| Small | 8 | 2000, 2001, 2005, 2006, 2008, 2009, 2018, 2019 |
| Medium | 14 | 2002, 2003, 2004, 2007, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2020, 2021 |

**Total: 22 stories**
