# Epic 6: Wishlist Feature

**Status:** In Progress
**Story Location:** `plans/future/wish/`

---

## Epic Goal

Enable users to track LEGO and alt-brick sets they want to purchase, with a gallery view for easy browsing and a "Got it" flow to transition items to their Sets collection.

---

## Epic Description

### Context

The Wishlist is a purchase tracking tool for LEGO builders. Users add sets they want to buy, track priority and notes, and eventually mark items as purchased (moving them to the Sets Gallery).

**Key Differentiators from other galleries:**
- Focused on external products (sets from LEGO.com and other retailers)
- Images stored in S3 (not hotlinked)
- "Got it" flow transitions items to Sets Gallery
- Draggable for manual priority ordering
- Hard delete (no restore)

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Wishlist Item** | A set the user wants to purchase, with manually entered data |
| **"Got it" Flow** | Marks item as purchased, prompts for purchase details, moves to Sets Gallery |
| **Priority** | User-defined ordering via drag-and-drop |

### Success Criteria

- Users can add sets with manual entry
- Gallery supports sorting, filtering, and tagging (via shared gallery package)
- Draggable reordering for priority
- "Got it" button triggers purchase flow and moves item to Sets
- Hard delete with confirmation works correctly

---

## Tech Stack

- **Frontend**: React 19, TanStack Router, RTK Query, Tailwind CSS, shadcn/ui, dnd-kit
- **Backend**: AWS Lambda, Drizzle ORM, Aurora PostgreSQL
- **Validation**: Zod schemas for runtime validation and TypeScript type inference

---

## Backend API Architecture

The backend uses a **Ports and Adapters (Hexagonal Architecture)** pattern to keep business logic platform-agnostic and deployable to multiple runtimes.

### Directory Structure

```
apps/api/
  core/                           # Shared domain logic (the "ports")
    database/
      schema/                     # Drizzle schemas (wishlistItems, etc.)
      client.ts                   # Database connection
      migrations/                 # SQL migrations
    auth/                         # Authentication utilities
    cache/                        # Redis client
    storage/                      # S3 utilities
    observability/                # Logging, metrics, tracing
    utils/                        # Shared helpers (responses, errors, etc.)

  platforms/                      # Platform-specific adapters
    aws/
      endpoints/
        wishlist/
          list/handler.ts         # AWS Lambda handler
          get-item/handler.ts
          create-item/handler.ts
          ...
    vercel/
      api/
        wishlist/
          list.ts                 # Vercel serverless function
          [id].ts
          ...
```

### How It Works

1. **Core (`apps/api/core/`)** contains all shared business logic:
   - Database schemas and queries (Drizzle)
   - Validation schemas (Zod)
   - Service utilities (auth, caching, storage)
   - Response/error formatting

2. **Platform Adapters (`apps/api/platforms/`)** translate platform-specific request/response formats:
   - **AWS Lambda**: Handles `APIGatewayProxyEventV2` and returns `APIGatewayProxyResultV2`
   - **Vercel**: Handles `VercelRequest` and `VercelResponse`

3. **Both platforms import from core**:
   ```typescript
   // AWS Lambda handler
   import { db } from '@/core/database/client'
   import { wishlistItems } from '@/core/database/schema'
   import { successResponse, errorResponse } from '@/core/utils/responses'
   ```

### Benefits

- **Single source of truth** for business logic
- **Deploy to multiple platforms** without duplicating code
- **Easier testing** - core logic can be unit tested without platform dependencies
- **Flexibility** - add new platforms (e.g., Cloudflare Workers) by creating new adapters

### Wishlist Endpoints by Platform

| Endpoint | AWS Lambda | Vercel |
|----------|------------|--------|
| List | `platforms/aws/endpoints/wishlist/list/handler.ts` | `platforms/vercel/api/wishlist/list.ts` |
| Get | `platforms/aws/endpoints/wishlist/get-item/handler.ts` | `platforms/vercel/api/wishlist/[id].ts` |
| Create | `platforms/aws/endpoints/wishlist/create-item/handler.ts` | `platforms/vercel/api/wishlist/create.ts` |
| Update | `platforms/aws/endpoints/wishlist/update-item/handler.ts` | `platforms/vercel/api/wishlist/[id].ts` |
| Delete | `platforms/aws/endpoints/wishlist/delete-item/handler.ts` | `platforms/vercel/api/wishlist/[id].ts` |
| Reorder | `platforms/aws/endpoints/wishlist/reorder/handler.ts` | `platforms/vercel/api/wishlist/reorder.ts` |

---

## Data Model

### Wishlist Item Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary identifier |
| `userId` | UUID | Yes | Owner |
| `title` | string | Yes | Set name |
| `store` | string | Yes | Retailer name (LEGO, Barweer, Cata, BrickLink, Other) |
| `setNumber` | string | No | LEGO set number (e.g., "75192") |
| `sourceUrl` | string | No | Original product URL |
| `imageUrl` | string | No | S3 URL to stored product image |
| `price` | decimal | No | Listed price |
| `currency` | string | No | Price currency (default: USD) |
| `pieceCount` | number | No | Number of pieces |
| `releaseDate` | date | No | Set release date |
| `tags` | string[] | No | Theme/category tags |
| `priority` | number | No | User-defined priority (0-5 scale) |
| `notes` | string | No | User notes (e.g., "wait for sale") |
| `sortOrder` | number | Yes | Position in gallery (for drag reorder) |
| `createdAt` | datetime | Yes | Added to wishlist timestamp |
| `updatedAt` | datetime | Yes | Last modified timestamp |

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

## CRUD Operations

### Create

| Operation | Trigger | Flow |
|-----------|---------|------|
| **Add manually** | "Add" button | Open form -> enter all fields -> save |

### Read

| Operation | Description |
|-----------|-------------|
| **Gallery View** | Grid/list of wishlist items. Uses shared gallery package. |
| **Detail View** | Full item details with image, metadata, notes |
| **Filter** | By text, store, tags |
| **Sort** | By price, date released/added, piece count, priority |

### Update

| Operation | Scope | Notes |
|-----------|-------|-------|
| **Edit Metadata** | Any field | Title, price, notes, tags, priority, etc. |
| **Reorder** | Gallery view | Drag to new position (priority ordering) |

### Delete

| Operation | Flow |
|-----------|------|
| **Delete Item** | Confirmation modal ("Are you sure? This is permanent.") -> hard delete |
| **"Got it"** | Not a delete - see Transition to Sets below |

---

## Transition to Sets ("Got it" Flow)

When user clicks "Got it" on a wishlist item:

1. **Modal opens** with pre-filled data from wishlist item
2. **Additional fields requested:**
   - Purchase price (may differ from listed price)
   - Tax amount
   - Shipping cost
   - Quantity purchased
   - Purchase date (defaults to today)
3. **On confirm:**
   - Create new Set item with all data
   - Delete wishlist item (unless "Keep on wishlist" checked)
   - Show success toast with Undo option

### "Got it" Modal

```
+-----------------------------------------------------+
|  Add to Your Collection                             |
|                                                     |
|  [Image]  LEGO Star Wars Millennium Falcon          |
|           Set #75192 - 7,541 pieces                 |
|                                                     |
|  ---------------------------------------------------+
|                                                     |
|  Purchase Details                                   |
|                                                     |
|  Price paid:     [$849.99    ]                      |
|  Tax:            [$72.25     ]                      |
|  Shipping:       [$0.00      ]                      |
|  Quantity:       [- 1 +]                            |
|  Purchase date:  [Dec 27, 2024 v]                   |
|                                                     |
|  [ ] Keep a copy on wishlist (want another)         |
|                                                     |
|              [Cancel]  [Add to Sets]                |
+-----------------------------------------------------+
```

---

## User Interface

### Gallery View

- Uses shared gallery package (sorting, filtering, tags)
- Grid or list layout (user preference)
- Drag-and-drop reordering for priority
- "Add" button opens add form
- Each card shows: image, title, store badge, price, piece count, priority indicator
- Hover action menu: View, Edit, Remove, Got It
- Visual priority indicators (position = priority)

### Add Item Form

**Form Fields:**
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

### Detail Page

- Large product image with fallback
- Full metadata display (price, piece count, release date, store)
- Priority indicator
- Notes field (expandable)
- Tags section
- Action buttons: Got It!, Edit, Delete, Back

### Empty States

| State | Design |
|-------|--------|
| **Empty wishlist (new user)** | "Nothing on your wishlist yet. Start adding sets you're dreaming about!" with prominent Add CTA |
| **Empty wishlist (all purchased)** | Celebration: "You got everything on your list! Time to dream bigger." with Add CTA |
| **No search/filter results** | "No wishlist items match your filters." with clear filters button |

### Loading & Error States

| State | Design |
|-------|--------|
| **Gallery loading** | Skeleton cards matching grid layout |
| **Save failure** | Toast: "Couldn't save to wishlist. [Retry]" |
| **"Got it" failure** | Toast: "Couldn't add to Sets. Your wishlist item is safe. [Retry]" - ensure wishlist item NOT deleted |

---

## Route Structure

```
/wishlist                 # Gallery page
/wishlist/add             # Add item page
/wishlist/:id             # Detail page
/wishlist/:id/edit        # Edit page
```

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
- `apps/api/platforms/aws/endpoints/wishlist/list/handler.ts`
- `apps/api/platforms/aws/endpoints/wishlist/get-item/handler.ts`
- `apps/api/platforms/vercel/api/wishlist/list.ts`
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

**Files**:
- `apps/api/platforms/aws/endpoints/wishlist/create-item/handler.ts`
- `apps/api/platforms/vercel/api/wishlist/create.ts`
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

**Files**:
- `apps/api/platforms/aws/endpoints/wishlist/update-item/handler.ts`
- `apps/api/platforms/vercel/api/wishlist/[id].ts`
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

**Files**:
- `apps/api/platforms/aws/endpoints/wishlist/delete-item/handler.ts`
- `apps/api/platforms/aws/endpoints/wishlist/purchased/handler.ts`
- `apps/api/platforms/vercel/api/wishlist/[id].ts` (DELETE method)
- `apps/api/platforms/vercel/api/wishlist/purchased.ts`
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

**Files**:
- `apps/api/platforms/aws/endpoints/wishlist/reorder/handler.ts`
- `apps/api/platforms/vercel/api/wishlist/reorder.ts`
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
    |
    +-- wish-2007 (Run Migration)
    |
    v
wish-2001 (Gallery MVP)
    |
    +----------+----------+
    v          v          v
wish-2002  wish-2003  wish-2004
(Add Flow) (Detail/   (Modals)
           Edit)
    |          |          |
    +----------+----------+----------+
                                     |
                                     v
                             wish-2005 (UX Polish)
                                     |
                                     v
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

## Mobile Considerations

**MVP Scope:** Responsive design, touch-optimized.

| Feature | Desktop | Mobile |
|---------|---------|--------|
| View gallery | Grid | List (default) or Grid |
| View detail | Yes | Yes |
| Add item | Yes | Yes |
| Drag to reorder | Yes | Long-press to drag |
| "Got it" flow | Yes | Yes |
| Edit/Delete | Yes | Yes |

**Mobile-specific UX:**
- Bottom sheet for modals instead of centered dialogs
- Touch-optimized tap targets

---

## Accessibility Requirements

### Keyboard Navigation

| Action | Keyboard Shortcut |
|--------|-------------------|
| Navigate gallery | Arrow keys |
| Select item | Space |
| Open detail view | Enter |
| Close modal | Escape |
| Reorder item | Select -> Arrow keys -> Enter |
| Delete | Select -> Delete/Backspace |
| "Got it" on selected | G |
| Add new | A (when in gallery) |

### Screen Reader Support

| Element | Announcement |
|---------|--------------|
| Wishlist item | "[Title], [price], [piece count] pieces, priority [position] of [total]" |
| "Got it" button | "Got it, moves [title] to your Sets collection" |
| Priority changed | "[Title] moved to priority [new position]" |

### Focus Management

| Scenario | Focus Behavior |
|----------|----------------|
| Modal opens | Focus on first interactive element |
| Modal closes | Focus returns to triggering element |
| Item deleted | Focus moves to next item |
| "Got it" completes | Focus on toast action or next wishlist item |

### Form Accessibility

- All fields have visible labels (not just placeholders)
- Error messages linked to fields via aria-describedby
- Required fields marked with aria-required
- Price inputs have currency announced

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
- Automated contrast checking (axe)

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

## Dependencies

### Internal Dependencies
- Shared gallery package (sorting, filtering)
- S3 infrastructure (image storage)
- Sets Gallery (for "Got it" transition)
- Authentication/authorization

---

## Technical Notes

### Image Handling
- Download product images during add
- Store in S3 with user-scoped prefix
- Generate thumbnails for gallery view
- Never hotlink to external images

### Shared Gallery Integration
Must integrate with existing gallery package for:
- Virtualized grid/list rendering
- Sort controls (price, date, piece count)
- Filter sidebar (text, store, tags)
- Tag chips

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Large images slow to download | Low | Low | Background processing, progress indicator |
| "Got it" flow loses data | Low | High | Transaction-based: create Set before deleting Wishlist item |

---

## Definition of Done

### Core Functionality
- [ ] Users can add items manually
- [ ] Images stored in S3, not hotlinked
- [ ] Gallery sorting and filtering works
- [ ] Drag-and-drop priority reordering works with undo
- [ ] "Got it" flow transitions items to Sets correctly (atomic)
- [ ] "Keep on wishlist" option works for wanting multiples
- [ ] Hard delete with confirmation works

### UX & Polish
- [ ] Empty states for all scenarios
- [ ] Undo available for "Got it" action (5 second window)
- [ ] Toast notifications for success/error states
- [ ] Mobile responsive

### Accessibility
- [ ] Keyboard navigation for all actions (including G for "Got it")
- [ ] Screen reader announcements for state changes
- [ ] Focus management for modals and flows
- [ ] Form fields have visible labels and error associations
- [ ] WCAG AA contrast compliance

### Technical
- [ ] All new API endpoints have tests
- [ ] No TypeScript errors
- [ ] Code reviewed and merged

---

## Change Log

| Date | Description |
|------|-------------|
| 2025-12-27 | Original 13 stories created |
| 2025-12-27 | Consolidated to 7 stories for cohesive implementation |
| 2025-12-27 | wish-2000 implementation complete |
| 2025-12-28 | wish-2003 merged (PR #350) |
| 2026-01-24 | Migrated from docs/stories.bak to plans directory |
| 2026-01-25 | Combined PRD.md and PLAN.md into single document |
| 2026-01-25 | Added Backend API Architecture section (Ports & Adapters pattern) |

---

**Related Epics:**
- Epic 7: Sets Gallery (receives "Got it" items)
- Epic 4: MOC Instructions
- Epic 5: Inspiration Gallery
