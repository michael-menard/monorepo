# Wishlist Epic Bootstrap Context

**Generated**: 2026-01-24
**Phase**: 0 (Setup)

---

## Validated Inputs

| Field | Value | Status |
|-------|-------|--------|
| Story Prefix | `WISH` | ✓ Valid (uppercase, 4 characters) |
| Project Name | `wishlist` | ✓ Valid |
| PRD Location | `plans/future/wishlist/PRD.md` | ✓ Exists |
| PLAN Location | `plans/future/wishlist/PLAN.md` | ✓ Exists |
| Output Directory | `plans/` | ✓ Valid |

---

## Raw Plan Summary

### PRD Overview (Epic 6: Wishlist)

**Goal**: Enable users to track LEGO and alt-brick sets they want to purchase, with URL-based scraping for easy data entry and a "Got it" flow to transition items to their Sets collection.

**Key Features**:
- Add items via URL paste with auto-scrape (LEGO.com MVP)
- Manual entry fallback when scraping fails
- Review/edit step before saving with auto-fill indicators
- Images stored in S3 (no hotlinking)
- Gallery with sorting, filtering, and tagging
- Drag-and-drop priority reordering
- "Got it" flow to mark items as purchased and transition to Sets Gallery
- Hard delete with confirmation
- Full keyboard navigation and screen reader support

**Data Model**:
- Wishlist items with: id, userId, title, store, setNumber, sourceUrl, imageUrl, price, currency, pieceCount, releaseDate, tags, priority, notes, sortOrder, createdAt, updatedAt

**Key Differentiators**:
- Focused on external products (not user-generated like MOC Instructions)
- URL scraping for auto-population
- "Got it" flow transitions to Sets Gallery
- Draggable for manual priority ordering
- Hard delete (no restore)

**Success Criteria** (21 items):
- URL-based add with auto-scrape
- Manual entry fallback
- Review step before saving
- Gallery with sorting/filtering/tagging
- Drag-and-drop reordering
- "Got it" button for purchase flow
- Hard delete with confirmation
- Scraping states (loading, partial, error, timeout)
- Keyboard navigation (G for "Got it", A for add, arrow keys for nav)
- Mobile responsive with swipe actions

**Risks Mitigated**:
- LEGO.com blocks scraping → Respectful scraping, rate limits, manual fallback
- Page structure changes → Modular design, quick update path, automated tests
- "Got it" data loss → Transaction-based (create Set before delete Wishlist)

### PLAN Overview (Epic 6: Wishlist Feature Plan)

**Tech Stack**:
- Frontend: React 19, TanStack Router, RTK Query, Tailwind CSS, shadcn/ui, dnd-kit
- Backend: AWS Lambda, Drizzle ORM, Aurora PostgreSQL
- Validation: Zod schemas

**Implementation Phases**:

1. **Phase 1: Foundation** (wish-2000, wish-2007)
   - Drizzle schema for wishlist_items table
   - Zod schemas in api-client package
   - Database migration
   - Status: wish-2000 Ready for Review, wish-2007 Approved

2. **Phase 2: Vertical Slice - Gallery MVP** (wish-2001)
   - GET /api/wishlist and GET /api/wishlist/:id endpoints
   - WishlistCard component
   - Gallery page with store filter tabs, search, sorting
   - RTK Query hooks
   - Status: Ready for Review

3. **Phase 3: Core Features** (wish-2002, wish-2003, wish-2004) - parallel work
   - Track A: Add Item Flow (wish-2002) - POST /api/wishlist, form, image upload - Approved
   - Track B: Detail & Edit Pages (wish-2003) - PATCH /api/wishlist/:id - Done (PR #350)
   - Track C: Modals & Transitions (wish-2004) - DELETE and purchased endpoints, modals - Approved

4. **Phase 4: UX Polish** (wish-2005)
   - Drag-and-drop reordering with dnd-kit
   - PATCH /api/wishlist/reorder endpoint
   - Empty states, loading skeletons
   - Optimistic updates with undo

5. **Phase 5: Accessibility** (wish-2006)
   - Keyboard navigation with roving tabindex
   - Keyboard shortcuts (A, G, Delete)
   - Screen reader announcements
   - WCAG AA compliance

**API Endpoints**:
- GET /api/wishlist - List with filters/pagination/sorting
- GET /api/wishlist/:id - Single item
- POST /api/wishlist - Create
- PATCH /api/wishlist/:id - Update
- DELETE /api/wishlist/:id - Delete
- POST /api/wishlist/:id/purchased - Mark as purchased/"Got it"
- PATCH /api/wishlist/reorder - Reorder items

**Story Status**:
- wish-2000: Ready for Review
- wish-2001: Ready for Review
- wish-2002: Approved
- wish-2003: Done (PR #350)
- wish-2004: Approved
- wish-2005: Draft
- wish-2006: Draft
- wish-2007: Approved

**Dependency Chain**:
```
wish-2000 (Schema) → wish-2007 (Migration)
                  ↓
             wish-2001 (Gallery)
                  ↓
        wish-2002/2003/2004 (parallel)
                  ↓
             wish-2005 (UX Polish)
                  ↓
             wish-2006 (A11y)
```

---

## Source Files

- **PRD**: `/Users/michaelmenard/Development/Monorepo/plans/future/wishlist/PRD.md`
- **PLAN**: `/Users/michaelmenard/Development/Monorepo/plans/future/wishlist/PLAN.md`

---

## Next Steps (Phase 1: Analysis)

1. Review and validate story definitions in PLAN.md
2. Identify any gaps in story specifications
3. Generate story documents based on plan
4. Establish story status tracking
5. Create detailed story cards with acceptance criteria
