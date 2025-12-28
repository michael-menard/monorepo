# Epic 6: Wishlist Implementation Order

This document provides the recommended implementation order for wishlist stories based on their dependencies.

## Consolidated Stories (v2.0)

The original 13 stories have been consolidated into 7 more cohesive stories for efficient implementation, especially when using AI automation tools like `/scaffold-feature`.

### Story Mapping

| New Story | Consolidates | Type |
|-----------|--------------|------|
| wish-2000 | wish-1004 | Foundation |
| wish-2001 | wish-1000, wish-1001, wish-1002 (list), wish-1005 | Vertical Slice |
| wish-2002 | wish-1002 (create), wish-1003 | Feature |
| wish-2003 | wish-1002 (update), wish-1006, wish-1007 | Feature |
| wish-2004 | wish-1002 (delete/purchased), wish-1008, wish-1009 | Feature |
| wish-2005 | wish-1002 (reorder), wish-1010, wish-1011 | Polish |
| wish-2006 | wish-1012 | Polish |

---

## Dependency Graph

```
wish-2000 (Schema & Types)
    │
    ▼
wish-2001 (Gallery MVP) ◄─────────────────────────────┐
    │                                                  │
    ├──────────┬──────────┐                           │
    ▼          ▼          ▼                           │
wish-2002  wish-2003  wish-2004                       │
(Add Flow) (Detail/   (Modals)                        │
           Edit)                                       │
    │          │          │                           │
    └──────────┴──────────┴───────────────────────────┤
                                                      │
                                                      ▼
                                              wish-2005 (UX Polish)
                                                      │
                                                      ▼
                                              wish-2006 (Accessibility)
```

---

## Implementation Phases

### Phase 1: Foundation

Implement first - no dependencies on other wishlist stories.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 1 | wish-2000 | Database Schema & Shared Types | Small |

**Deliverables:**
- Drizzle schema for `wishlist_items` table
- Zod schemas for all operations
- TypeScript types inferred from Zod
- Database migration

---

### Phase 2: Vertical Slice

Delivers end-to-end functionality from database to UI.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 2 | wish-2001 | Wishlist Gallery MVP | Medium |

**Deliverables:**
- GET /api/wishlist endpoint with filtering/pagination
- GET /api/wishlist/:id endpoint
- WishlistCard component
- Gallery page with filters and sorting
- RTK Query integration

---

### Phase 3: Core Features

Can be worked in parallel after Phase 2.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 3a | wish-2002 | Add Item Flow | Medium |
| 3b | wish-2003 | Detail & Edit Pages | Medium |
| 3c | wish-2004 | Modals & Transitions | Medium |

**Parallel Tracks:**

**Track A - Add Flow (wish-2002):**
- POST /api/wishlist endpoint
- Add item form page
- Image upload with S3
- Form validation

**Track B - Detail/Edit (wish-2003):**
- PATCH /api/wishlist/:id endpoint
- Detail page with full item view
- Edit page with form
- Navigation between pages

**Track C - Modals (wish-2004):**
- DELETE /api/wishlist/:id endpoint
- POST /api/wishlist/:id/purchased endpoint
- Delete confirmation modal
- Got It flow modal
- Toast notifications

---

### Phase 4: Polish

Enhances UX after core features are complete.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 4 | wish-2005 | UX Polish | Medium |

**Deliverables:**
- Drag-and-drop reordering with dnd-kit
- Reorder API endpoint
- Empty states (new user, all purchased, no results)
- Loading skeletons
- Undo functionality

---

### Phase 5: Accessibility

Final polish for inclusive design.

| Order | Story | Title | Effort |
|-------|-------|-------|--------|
| 5 | wish-2006 | Accessibility Complete | Medium |

**Deliverables:**
- Full keyboard navigation
- Screen reader support
- Focus management
- WCAG AA compliance
- Keyboard shortcuts

---

## Parallel Execution Strategy

For teams or parallel AI agents:

```
Week 1:
  └── wish-2000 (Schema) ─────────► wish-2001 (Gallery MVP)

Week 2:
  ├── wish-2002 (Add Flow)    ─────►┐
  ├── wish-2003 (Detail/Edit) ─────►├──► wish-2005 (UX Polish)
  └── wish-2004 (Modals)      ─────►┘

Week 3:
  └── wish-2005 (UX Polish) ───────► wish-2006 (Accessibility)
```

---

## MVP Definition

### MVP (Stories 1-4): wish-2000 through wish-2004

Complete CRUD functionality:
- View gallery of wishlist items with filtering
- Add new items manually
- View item details
- Edit items
- Delete items with confirmation
- Mark as purchased ("Got it" flow)

### Enhanced (Stories 5-6): wish-2005 and wish-2006

Polish and accessibility:
- Drag-and-drop reordering
- Thoughtful empty states
- Full keyboard navigation
- Screen reader support
- WCAG AA compliance

---

## Data Model Summary

All stories use this consistent data model (from wish-2000):

```typescript
interface WishlistItem {
  id: string           // UUID
  userId: string       // UUID, foreign key
  title: string        // Required
  store: string        // LEGO, Barweer, Cata, Other
  setNumber?: string
  sourceUrl?: string
  imageUrl?: string    // S3 URL
  price?: number
  currency: string     // USD, EUR, etc.
  pieceCount?: number
  releaseDate?: string
  tags: string[]
  priority: number     // 0-5 scale
  notes?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}
```

---

## API Endpoints Summary

| Endpoint | Method | Story | Purpose |
|----------|--------|-------|---------|
| /api/wishlist | GET | wish-2001 | List with filters/pagination |
| /api/wishlist/:id | GET | wish-2001 | Single item |
| /api/wishlist | POST | wish-2002 | Create item |
| /api/wishlist/:id | PATCH | wish-2003 | Update item |
| /api/wishlist/:id | DELETE | wish-2004 | Delete item |
| /api/wishlist/:id/purchased | POST | wish-2004 | Mark as purchased |
| /api/wishlist/reorder | PATCH | wish-2005 | Reorder items |

---

## Legacy Stories

The following stories from the v1.0 structure are now consolidated:

| Old Story | Status | Consolidated Into |
|-----------|--------|-------------------|
| wish-1000 | Replaced | wish-2001 |
| wish-1001 | Replaced | wish-2001 |
| wish-1002 | Replaced | wish-2001, 2002, 2003, 2004, 2005 |
| wish-1003 | Replaced | wish-2002 |
| wish-1004 | Replaced | wish-2000 |
| wish-1005 | Replaced | wish-2001 |
| wish-1006 | Replaced | wish-2003 |
| wish-1007 | Replaced | wish-2003 |
| wish-1008 | Replaced | wish-2004 |
| wish-1009 | Replaced | wish-2004 |
| wish-1010 | Replaced | wish-2005 |
| wish-1011 | Replaced | wish-2005 |
| wish-1012 | Replaced | wish-2006 |

---

## Change Log

| Date       | Version | Description | Author |
|------------|---------|-------------|--------|
| 2025-12-27 | 1.0 | Initial implementation order (13 stories) | SM Agent |
| 2025-12-27 | 2.0 | Consolidated to 7 stories for cohesive implementation | Claude |
