# Epic 6: Wishlist Feature Plan

## Overview

This plan covers the implementation of a Wishlist feature for tracking LEGO sets and MOC instructions users want to purchase. The feature includes a full CRUD interface with gallery view, filtering, drag-and-drop reordering, and a "Got It" flow to transition items to the user's collection.

## Tech Stack

- **Frontend**: React 19, TanStack Router, RTK Query, Tailwind CSS, shadcn/ui, dnd-kit
- **Backend**: AWS Lambda, Drizzle ORM, Aurora PostgreSQL
- **Validation**: Zod schemas for runtime validation and TypeScript type inference

---

## Data Model

### Database Schema (Drizzle)

```typescript
// apps/api/core/database/schema/wishlist.ts
export const wishlistItems = pgTable('wishlist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Core fields
  title: text('title').notNull(),
  store: text('store').notNull(),              // LEGO, Barweer, Cata, BrickLink, Other
  setNumber: text('set_number'),
  sourceUrl: text('source_url'),
  imageUrl: text('image_url'),                 // S3 URL

  // Pricing
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),

  // Details
  pieceCount: integer('piece_count'),
  releaseDate: timestamp('release_date'),
  tags: text('tags').array().default([]),

  // User organization
  priority: integer('priority').default(0),     // 0-5 scale
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('wishlist_user_id_idx').on(table.userId),
  userSortIdx: index('wishlist_user_sort_idx').on(table.userId, table.sortOrder),
}))
```

### Zod Schemas

Located in `packages/core/api-client/src/schemas/wishlist.ts`:

- `WishlistItemSchema` - Base item schema
- `CreateWishlistItemSchema` - POST body validation
- `UpdateWishlistItemSchema` - PATCH body validation (partial)
- `WishlistQueryParamsSchema` - GET query string validation
- `WishlistListResponseSchema` - List response with pagination

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wishlist` | GET | List items with filters, pagination, sorting |
| `/api/wishlist/:id` | GET | Get single item by ID |
| `/api/wishlist` | POST | Create new wishlist item |
| `/api/wishlist/:id` | PATCH | Update wishlist item |
| `/api/wishlist/:id` | DELETE | Remove item (hard delete) |
| `/api/wishlist/:id/purchased` | POST | Mark as purchased, optionally create Set |
| `/api/wishlist/reorder` | PATCH | Reorder items (update sortOrder) |

---

## Implementation Phases

### Phase 1: Foundation (wish-2000, wish-2007)

**Status**: wish-2000 Ready for Review, wish-2007 Approved

**Deliverables**:
- Drizzle schema for `wishlist_items` table with all PRD fields
- Zod schemas in shared types package
- TypeScript types inferred from Zod
- Database migration file
- Migration execution

**Files**:
- `apps/api/core/database/schema/index.ts` - Drizzle schema
- `apps/api/core/database/migrations/app/0005_wishlist_schema_update.sql` - Migration
- `packages/core/api-client/src/schemas/wishlist.ts` - Zod schemas
- `packages/core/api-client/src/schemas/__tests__/wishlist.test.ts` - Schema tests

---

### Phase 2: Vertical Slice - Gallery MVP (wish-2001)

**Status**: Ready for Review

**Deliverables**:
- GET `/api/wishlist` endpoint with filtering/pagination
- GET `/api/wishlist/:id` endpoint
- WishlistCard component using GalleryCard from @repo/gallery
- Gallery page with store filter tabs
- RTK Query hooks: `useGetWishlistQuery`, `useGetWishlistItemQuery`

**Key Features**:
- Store filter tabs (All, LEGO, Barweer, Other)
- Search by title/set number
- Sort by date, price, piece count, priority
- Card displays: image, title, store badge, price, piece count, priority indicator
- Hover action menu: View, Edit, Remove, Got It

**Files**:
- `apps/api/endpoints/wishlist/list/handler.ts`
- `apps/api/endpoints/wishlist/get/handler.ts`
- `packages/core/api-client/src/rtk/wishlist-api.ts`
- `apps/web/main-app/src/routes/wishlist/index.tsx`
- `apps/web/main-app/src/routes/wishlist/-components/WishlistCard.tsx`

---

### Phase 3: Core Features (wish-2002, wish-2003, wish-2004)

These can be worked in parallel after Phase 2.

#### Track A: Add Item Flow (wish-2002)

**Status**: Approved

**Deliverables**:
- POST `/api/wishlist` endpoint
- Add item page with form
- Image upload with S3 presigned URLs
- Form validation with Zod
- RTK Query mutation: `useAddToWishlistMutation`

**Form Fields**:
- Store (required): LEGO, Barweer, Cata, BrickLink, Other
- Title (required)
- Set Number (optional)
- Price + Currency
- Piece Count
- Priority (0-5 scale)
- Image upload
- Source URL
- Notes
- Tags

**Files**:
- `apps/api/endpoints/wishlist/create/handler.ts`
- `apps/web/main-app/src/routes/wishlist/add.tsx`
- `apps/web/main-app/src/components/ImageUploadField/index.tsx`

---

#### Track B: Detail & Edit Pages (wish-2003)

**Status**: Done (Merged PR #350)

**Deliverables**:
- PATCH `/api/wishlist/:id` endpoint
- Detail page showing full item information
- Edit page with pre-populated form
- RTK Query mutation: `useUpdateWishlistItemMutation`

**Detail Page Layout**:
- Large product image with fallback
- All metadata: title, store, price, pieces, release date
- Priority indicator, tags, notes
- Action buttons: Got It!, Edit, Delete, Back

**Files**:
- `apps/api/endpoints/wishlist/update/handler.ts`
- `apps/web/main-app/src/routes/wishlist/$id.tsx`
- `apps/web/main-app/src/routes/wishlist/$id.edit.tsx`

---

#### Track C: Modals & Transitions (wish-2004)

**Status**: Approved

**Deliverables**:
- DELETE `/api/wishlist/:id` endpoint
- POST `/api/wishlist/:id/purchased` endpoint
- Delete confirmation modal (AlertDialog)
- "Got It" modal with purchase details form
- Toast notifications with undo
- RTK Query mutations: `useRemoveFromWishlistMutation`, `useMarkAsPurchasedMutation`

**Got It Modal Form**:
- Price paid (pre-filled from wishlist)
- Tax (optional)
- Shipping (optional)
- Quantity
- Purchase date (defaults to today)
- "Keep on wishlist" checkbox

**Files**:
- `apps/api/endpoints/wishlist/delete/handler.ts`
- `apps/api/endpoints/wishlist/purchased/handler.ts`
- `apps/web/main-app/src/components/DeleteConfirmationModal/index.tsx`
- `apps/web/main-app/src/components/GotItModal/index.tsx`

---

### Phase 4: UX Polish (wish-2005)

**Status**: Draft

**Deliverables**:
- Drag-and-drop reordering with dnd-kit
- PATCH `/api/wishlist/reorder` endpoint
- Optimistic updates for instant feedback
- Undo functionality (5-second window)
- Empty states: new user, all purchased, no results
- Loading skeletons

**dnd-kit Setup**:
- Sensors: PointerSensor (8px threshold), TouchSensor (300ms long-press), KeyboardSensor
- SortableContext with rectSortingStrategy
- Visual feedback during drag

**Empty States**:
1. **New User**: "Nothing on your wishlist yet" with Add Item CTA
2. **All Purchased**: "You got everything!" celebration with Add More CTA
3. **No Results**: "No matches" with Clear Filters button

**Files**:
- `apps/api/endpoints/wishlist/reorder/handler.ts`
- `apps/web/main-app/src/components/wishlist/SortableGallery.tsx`
- `apps/web/main-app/src/components/wishlist/SortableWishlistCard.tsx`
- `apps/web/main-app/src/components/wishlist/WishlistEmptyStates.tsx`

---

### Phase 5: Accessibility (wish-2006)

**Status**: Draft

**Deliverables**:
- Full keyboard navigation with roving tabindex
- Keyboard shortcuts: A (add), G (got it), Delete (remove)
- Screen reader announcements via live regions
- Modal focus trap and return
- WCAG AA color contrast compliance

**Keyboard Navigation**:
- Arrow keys: Navigate gallery grid
- Space: Select/focus item
- Enter: Open detail view
- Escape: Close modals
- Home/End: First/last item
- Tab: Between interactive elements

**Screen Reader Announcements**:
- Card focus: "[Title], [price], [pieces] pieces, priority [n] of [total]"
- State changes: "Priority updated", "Item removed", "Added to collection"

**Files**:
- `apps/web/main-app/src/hooks/useWishlistKeyboardShortcuts.ts`
- `apps/web/main-app/src/hooks/useRovingTabindex.ts`
- `apps/web/main-app/src/components/common/Announcer.tsx`

---

## Dependency Graph

```
wish-2000 (Schema & Types)
    │
    ├── wish-2007 (Run Migration)
    │
    ▼
wish-2001 (Gallery MVP)
    │
    ├──────────┬──────────┐
    ▼          ▼          ▼
wish-2002  wish-2003  wish-2004
(Add Flow) (Detail/   (Modals)
           Edit)
    │          │          │
    └──────────┴──────────┴───────────┐
                                      │
                                      ▼
                              wish-2005 (UX Polish)
                                      │
                                      ▼
                              wish-2006 (Accessibility)
```

---

## MVP vs Enhanced

### MVP (wish-2000 through wish-2004)

Complete CRUD functionality:
- View gallery with filtering and sorting
- Add items manually
- View item details
- Edit items
- Delete with confirmation
- Mark as purchased ("Got it" flow)

### Enhanced (wish-2005 and wish-2006)

Polish and accessibility:
- Drag-and-drop reordering
- Thoughtful empty states
- Full keyboard navigation
- Screen reader support
- WCAG AA compliance

---

## Testing Strategy

### Unit Tests (Vitest)
- Zod schema validation (31 tests in wish-2000)
- Component rendering and interactions
- RTK Query hook behavior

### E2E Tests (Playwright - Mocked APIs)
- Happy path flows: add, view, edit, delete, got it
- Form validation errors
- Empty states
- Navigation flows

### Accessibility Tests
- VoiceOver testing (macOS)
- NVDA testing (Windows, if available)
- Automated contrast checking (axe)

---

## Route Structure

```
/wishlist                 # Gallery page (wish-2001)
/wishlist/add             # Add item page (wish-2002)
/wishlist/:id             # Detail page (wish-2003)
/wishlist/:id/edit        # Edit page (wish-2003)
```

---

## Story Status Summary

| Story | Title | Status |
|-------|-------|--------|
| wish-2000 | Database Schema & Types | Ready for Review |
| wish-2001 | Gallery MVP | Ready for Review |
| wish-2002 | Add Item Flow | Approved |
| wish-2003 | Detail & Edit Pages | Done (PR #350) |
| wish-2004 | Modals & Transitions | Approved |
| wish-2005 | UX Polish | Draft |
| wish-2006 | Accessibility | Draft |
| wish-2007 | Run Migration | Approved |

---

## Legacy Story Mapping

The original 13 stories were consolidated into 7 cohesive stories:

| New Story | Consolidates |
|-----------|--------------|
| wish-2000 | wish-1004 |
| wish-2001 | wish-1000, wish-1001, wish-1002 (list), wish-1005 |
| wish-2002 | wish-1002 (create), wish-1003 |
| wish-2003 | wish-1002 (update), wish-1006, wish-1007 |
| wish-2004 | wish-1002 (delete/purchased), wish-1008, wish-1009 |
| wish-2005 | wish-1002 (reorder), wish-1010, wish-1011 |
| wish-2006 | wish-1012 |

---

## Change Log

| Date | Description |
|------|-------------|
| 2025-12-27 | Original 13 stories created |
| 2025-12-27 | Consolidated to 7 stories for cohesive implementation |
| 2025-12-27 | wish-2000 implementation complete |
| 2025-12-28 | wish-2003 merged (PR #350) |
| 2026-01-24 | Migrated from docs/stories.bak to plans directory |
