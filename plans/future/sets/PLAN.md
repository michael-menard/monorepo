# Epic 7: Sets Gallery

**Story Location:** `docs/stories/epic-7-sets/`
**Status:** Draft

---

## Epic Goal

Enable users to catalog and manage their LEGO and alt-brick set collection, tracking ownership details, build status, and purchase information, with integration to the Wishlist "Got it" flow.

---

## Epic Description

### Context

The Sets Gallery is a collection management tool for LEGO builders to track sets they own. It serves as the destination for Wishlist items when purchased, and can link to MOC Instructions to indicate which sets were used for builds.

**Key Differentiators from other galleries:**
- Tracks owned sets (vs. Wishlist = wanted, Inspiration = ideas)
- Receives items from Wishlist via "Got it" flow
- Tracks purchase details (price, tax, shipping, date)
- Tracks build status (is built boolean)
- Quantity support (can own multiples of same set)
- Links to MOC Instructions ("used this set for this build")
- Hard delete (no restore)

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Set** | A LEGO or alt-brick set the user owns, with purchase and build details |
| **Build Status** | Boolean indicating if the set is currently built or in pieces |
| **Purchase Details** | Price, tax, shipping, date, quantity for collection value tracking |
| **MOC Link** | Connection to MOC Instructions indicating set was used in a build |
| **Scraper** | Shared service (with Wishlist) for URL-based data entry |

### Success Criteria

- Users can add sets via URL scrape or manual entry
- Users can receive sets from Wishlist "Got it" flow
- Sets track purchase details and build status
- Gallery supports sorting, filtering, and tagging (via shared gallery package)
- Sets can link to MOC Instructions
- Hard delete with confirmation works correctly

---

## Data Model

### Set Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary identifier |
| `userId` | UUID | Yes | Owner |
| `setNumber` | string | No | LEGO set number (e.g., "75192") |
| `title` | string | Yes | Set name |
| `store` | string | No | Where purchased (LEGO, Barweer, etc.) |
| `sourceUrl` | string | No | Original product URL |
| `imageUrl` | string | No | S3 URL to stored product image |
| `pieceCount` | number | No | Number of pieces |
| `releaseDate` | date | No | Set release date |
| `theme` | string | No | LEGO theme (Star Wars, Technic, etc.) |
| `tags` | string[] | No | User-defined tags |
| `isBuilt` | boolean | Yes | Currently built or in pieces (default: false) |
| `quantity` | number | Yes | Number owned (default: 1) |
| `purchasePrice` | number | No | What user paid per unit |
| `tax` | number | No | Tax paid |
| `shipping` | number | No | Shipping cost |
| `purchaseDate` | date | No | When purchased |
| `notes` | string | No | User notes |
| `mocIds` | UUID[] | No | Linked MOC Instructions (many-to-many) |
| `wishlistItemId` | UUID | No | Source wishlist item if came from "Got it" flow |
| `brickLinkValue` | number | No | Current BrickLink value (future) |
| `partsList` | object | No | Parts inventory (future) |
| `createdAt` | datetime | Yes | Added to collection timestamp |
| `updatedAt` | datetime | Yes | Last modified timestamp |

---

## CRUD Operations

### Create

| Operation | Trigger | Flow |
|-----------|---------|------|
| **Add via URL** | "Add" button → paste URL | Paste URL → scrape data → review/edit step → add purchase details → save |
| **Add manually** | "Add" button → manual entry | Open form → enter all fields manually → save |
| **From Wishlist** | "Got it" on wishlist item | Pre-filled from wishlist → add purchase details modal → save to Sets, delete from Wishlist |

### Read

| Operation | Description |
|-----------|-------------|
| **Gallery View** | Grid/list of owned sets. Uses shared gallery package. |
| **Detail View** | Full set details with image, metadata, purchase info, notes |
| **Filter** | By text, store, theme, tags, build status |
| **Sort** | By title, purchase date, price, piece count, release date |

### Update

| Operation | Scope | Notes |
|-----------|-------|-------|
| **Edit Metadata** | Any field | Title, notes, tags, etc. |
| **Toggle Built** | isBuilt field | Quick toggle on card or detail view |
| **Update Quantity** | quantity field | Increment/decrement or direct edit |
| **Link to MOC** | mocIds | Associate with MOC Instructions |
| **Unlink from MOC** | mocIds | Remove MOC association |
| **Update Purchase Details** | price, tax, shipping, date | Edit purchase information |

### Delete

| Operation | Flow |
|-----------|------|
| **Delete Set** | Confirmation modal ("Are you sure? This is permanent.") → hard delete |

---

## Wishlist Integration ("Got it" Flow)

When a Wishlist item transitions to Sets:

1. **Wishlist "Got it" clicked** → modal opens
2. **Modal pre-fills** from wishlist: title, set number, store, image, piece count, etc.
3. **User enters purchase details:**
   - Purchase price
   - Tax
   - Shipping
   - Quantity
   - Purchase date (defaults to today)
4. **On confirm:**
   - Create Set item with all data + `wishlistItemId` reference
   - Delete Wishlist item
   - Redirect to Sets Gallery or show success toast

---

## User Interface

### Gallery View
- Uses shared gallery package (sorting, filtering, tags)
- Grid or list layout (user preference)
- "Add" button opens URL input modal
- Each card shows: image, title, set number, piece count, build status badge
- Quick "Toggle Built" action on card (one-click, no confirmation)
- Visual indicator for quantity > 1 (badge: "×3")
- Filter chips: "All", "Built", "In Pieces"

### Build Status Toggle Design
```
Card View:                    Detail View:
┌─────────────────┐          ┌─────────────────────────┐
│  [Image]        │          │  Status:                │
│  Title          │          │  ┌─────────┬─────────┐  │
│  #75192         │          │  │In Pieces│ Built ✓ │  │
│  ───────────    │          │  └─────────┴─────────┘  │
│  🧱 In Pieces   │◀─ badge  │         ▲               │
│     [Toggle]    │◀─ quick  │   segmented control     │
└─────────────────┘          └─────────────────────────┘
```
- **Card:** Badge shows current status, small toggle button
- **Detail:** Segmented control for clarity
- **Feedback:** Toast "Marked as built" / "Marked as in pieces" with [Undo]
- **Animation:** Brief celebration on "Built" (confetti or glow)

### Quantity Display & Controls
```
Detail View:
┌─────────────────────────────┐
│  Quantity:                  │
│  ┌───┬─────┬───┐           │
│  │ - │  3  │ + │           │
│  └───┴─────┴───┘           │
│  Tap number to edit directly│
└─────────────────────────────┘
```
- **Stepper:** -/+ buttons for quick adjustment
- **Direct edit:** Tap quantity number to type
- **Minimum:** 1 (can't decrement to 0; must delete explicitly)
- **Feedback:** Toast "Quantity updated to 3" with [Undo]
- **Same set, different price?** Prompt: "Add as new entry with different purchase details?"

### Add Modal

#### Step 1: URL Input (same as Wishlist)
- Paste URL field with validation
- "Fetch Product Info" button
- "Enter manually" link
- "Currently supports: LEGO.com"

#### Step 2: Review/Edit
- Pre-filled form with scraped data
- Auto-filled indicators on fields
- Missing fields highlighted
- Image preview with replace option

#### Step 3: Purchase Details
```
┌─────────────────────────────────────────────────────┐
│  Purchase Details                                   │
│                                                     │
│  Price paid:     [$___.__    ]  (per unit)         │
│  Tax:            [$___.__    ]                     │
│  Shipping:       [$___.__    ]                     │
│  Quantity:       [- 1 +]                           │
│  Purchase date:  [Dec 27, 2024 ▼]                  │
│                                                     │
│  Is it built?    [In Pieces] [Built]               │
│                                                     │
│            [Back]  [Add to Collection ✓]           │
└─────────────────────────────────────────────────────┘
```
- All purchase fields optional
- Build status choice during add
- Back button to return to Review step

### Detail View
- Large product image
- Full metadata (set number, piece count, theme, release date)
- **Build status toggle** (segmented control, prominent)
- **Quantity display** with +/- stepper
- **Purchase details section** (collapsible if empty)
  - Price, tax, shipping, total
  - Purchase date
- **MOC links section**
  - List of linked MOCs with thumbnails
  - "+ Link to MOC" button opens MOC picker
- Edit button (opens full edit form)
- Delete button (with confirmation)

### Collection Stats (Future)
- Total sets owned (with quantity)
- Total unique sets
- Total pieces across all sets
- Total collection value (sum of purchase prices)
- BrickLink estimated value (future)

### Empty States

| State | Design |
|-------|--------|
| **Empty collection (new user)** | "Your collection is empty. Add your first set!" with Add CTA and option to browse Wishlist |
| **Empty collection (came from Wishlist)** | "No sets yet. Check your wishlist for sets to add!" with link to Wishlist |
| **No search/filter results** | "No sets match your filters." with clear filters button |
| **No built sets (filtered)** | "None of your sets are currently built. Time to start building!" |
| **No MOC links** | (in detail view) "This set isn't linked to any MOCs. [Link to MOC]" |

### Loading & Error States

| State | Design |
|-------|--------|
| **Gallery loading** | Skeleton cards matching grid layout |
| **Scraping** | Same as Wishlist (shared flow) |
| **Toggle save failure** | Toast: "Couldn't update status. [Retry]" - revert toggle visually |
| **Quantity save failure** | Toast: "Couldn't update quantity. [Retry]" - revert to previous |
| **Delete failure** | Toast: "Couldn't delete. [Retry]" |
| **MOC link failure** | Toast: "Couldn't link to MOC. [Retry]" |

---

## Interaction Patterns

### Build Status Toggle
1. User taps toggle (card or detail view)
2. Optimistic update: UI changes immediately
3. Brief celebration animation on "Built"
4. Toast: "Marked as built" with [Undo] (5 seconds)
5. API call in background
6. If API fails: Revert UI, show error toast with Retry

### Quantity Adjustment
1. User taps +/- or edits directly
2. Optimistic update
3. Toast: "Quantity: 3" with [Undo]
4. Minimum enforced: At 1, "-" is disabled
5. If user tries to go below 1: "Delete this set instead?" prompt

### "Got it" Success (from Wishlist)
1. Transaction completes in Wishlist epic
2. If user was on Wishlist: Toast "Added to Sets! [View] [Undo]"
3. "View" navigates to Sets gallery, scrolls to new item
4. New item has brief highlight animation (2 seconds)
5. If user taps "Undo": Item removed from Sets, restored to Wishlist

### MOC Linking Flow
1. User taps "+ Link to MOC" in detail view
2. MOC picker modal opens (searchable list of user's MOCs)
3. User selects MOC(s) - multi-select allowed
4. Confirm adds links
5. Toast: "Linked to [MOC name]"
6. Detail view updates to show new links

### Same Set, Different Purchase
When adding a set that matches an existing set number:
```
┌─────────────────────────────────────────────────────┐
│  You already own this set!                          │
│                                                     │
│  You have 2 of Set #75192 in your collection.       │
│                                                     │
│  ○ Add to existing quantity (+1 = 3 total)          │
│    Purchase details won't be tracked separately     │
│                                                     │
│  ○ Add as new entry                                 │
│    Track separate purchase details                  │
│                                                     │
│              [Cancel]  [Continue]                   │
└─────────────────────────────────────────────────────┘
```

---

## Mobile Considerations

**MVP Scope:** Responsive design, touch-optimized.

| Feature | Desktop | Mobile |
|---------|---------|--------|
| View gallery | ✅ Grid | ✅ List (default) or Grid |
| View detail | ✅ | ✅ (bottom sheet style) |
| Add via URL | ✅ | ✅ (paste from clipboard) |
| Toggle built | ✅ Click | ✅ Tap |
| Quantity +/- | ✅ | ✅ |
| MOC linking | ✅ | ✅ |
| Edit/Delete | ✅ | ✅ |

**Mobile-specific UX:**
- Swipe actions: Swipe to toggle built status
- Bottom sheet for detail view (slide up)
- Quantity stepper sized for touch (44px touch targets)
- "Paste from clipboard" button for URL input

---

## Accessibility Requirements

### Keyboard Navigation

| Action | Keyboard Shortcut |
|--------|-------------------|
| Navigate gallery | Arrow keys |
| Select item | Space |
| Open detail view | Enter |
| Close modal/detail | Escape |
| Toggle built status | B (when item selected) |
| Increase quantity | + or = |
| Decrease quantity | - |
| Link to MOC | M (in detail view) |
| Delete | Delete/Backspace |
| Add new | A (when in gallery) |

### Screen Reader Support

| Element | Announcement |
|---------|--------------|
| Set item | "[Title], set [number], [piece count] pieces, [built/in pieces], quantity [X]" |
| Build toggle | "Build status: [current]. Press to change to [opposite]." |
| Quantity stepper | "Quantity [X]. Press plus to increase, minus to decrease." |
| MOC link | "[MOC name], linked MOC. Press to view." |
| Toggle success | "Set marked as [built/in pieces]" |
| Quantity change | "Quantity changed to [X]" |

### Focus Management

| Scenario | Focus Behavior |
|----------|----------------|
| Add modal opens | Focus on URL input |
| "Got it" from Wishlist | Focus on new set in gallery (after navigation) |
| Toggle changed | Focus remains on toggle |
| Detail view opens | Focus on first interactive element |
| MOC picker opens | Focus on search field |
| Modal closes | Focus returns to trigger |

### Color & Contrast
- Build status uses both color AND icon (🧱 vs ✓)
- Quantity stepper buttons have visible borders
- WCAG AA contrast for all text

---

## Stories Overview

### Existing Stories (Read-focused)
- `sets-1000`: Gallery scaffolding
- `sets-1001`: Card component
- `sets-1002`: API endpoints (partial)
- `sets-1003`: Detail page
- `sets-1004`: Add page

### New Stories Needed (CRUD completion)

| Story | Description | Priority |
|-------|-------------|----------|
| **sets-1005** | Add modal with URL scrape flow (shared with Wishlist) | High |
| **sets-1006** | Purchase details step with build status choice | High |
| **sets-1007** | Sets CRUD endpoints (create, update, delete) | High |
| **sets-1008** | Wishlist "Got it" integration with undo | High |
| **sets-1009** | Build status toggle with optimistic update and undo | High |
| **sets-1010** | Quantity stepper with minimum enforcement | Medium |
| **sets-1011** | MOC linking picker and bidirectional display | Medium |
| **sets-1012** | Hard delete with confirmation | Medium |
| **sets-1013** | Manual entry form | Medium |
| **sets-1014** | Sort/filter by build status, purchase date | Low |
| **sets-1015** | Tag management integration | Low |
| **sets-1016** | Collection stats display (future) | Low |
| **sets-1017** | Empty states for all scenarios | Medium |
| **sets-1018** | Duplicate set detection (add to quantity vs. new entry) | Medium |
| **sets-1019** | Keyboard navigation and accessibility | Medium |
| **sets-1020** | Mobile responsive with swipe actions | Low |
| **sets-1021** | "Got it" success experience (highlight, scroll to new) | Medium |

---

## Dependencies

### Internal Dependencies
- Shared gallery package (sorting, filtering)
- Scraper service package (shared with Wishlist)
- S3 infrastructure (image storage)
- Wishlist (for "Got it" flow)
- MOC Instructions (for linking)
- Authentication/authorization

### External Dependencies
- LEGO.com (scraping target via shared scraper)

---

## Technical Notes

### Wishlist → Sets Transaction
The "Got it" flow must be atomic:
1. Create Set item first
2. On success, delete Wishlist item
3. On failure, rollback (don't delete wishlist item)
4. Store `wishlistItemId` for traceability

### Quantity Handling
- Default quantity is 1
- Can own multiple of same set (e.g., 3x of set 10281)
- Consider: separate entries vs. quantity field (using quantity field)
- Purchase details are per-entry (if bought at different prices, may want separate entries)

### Build Status
- Simple boolean for MVP
- Future: could expand to enum (sealed, built, parted out, sold)
- Toggle should be quick action (one click)

### Shared Scraper Integration
Uses same scraper service as Wishlist:
- Same URL parsing
- Same image download to S3
- Same LEGO.com support

### MOC Linking
Many-to-many relationship:
- One set can be linked to multiple MOCs
- One MOC can use parts from multiple sets
- UI shows linked MOCs on set detail page
- Future: parts usage tracking

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| "Got it" flow loses data | Low | High | Transaction-based: create Set before deleting Wishlist item, maintain wishlistItemId reference |
| Duplicate sets confusing | Medium | Low | Clear quantity display, option for separate entries if needed |
| Scraper shared with Wishlist has issues | Medium | Medium | Modular design, can update independently |
| Large collections slow | Low | Medium | Pagination, virtualized list, proper indexing |

---

## Future Enhancements

| Feature | Description |
|---------|-------------|
| **Parts List** | Store individual brick inventory for each set |
| **BrickLink Value** | Fetch and display current market value |
| **Price History** | Track value over time |
| **Collection Stats** | Dashboard with total pieces, value, etc. |
| **Build Tracking** | More detailed status (sealed, built, modified, parted out) |
| **Export** | Export collection to CSV, BrickLink, Brickset |
| **Import** | Import from BrickLink, Brickset, Rebrickable |

---

## Definition of Done

### Core Functionality
- [ ] Users can add sets via URL with auto-scrape
- [ ] Users can add sets manually
- [ ] Purchase details captured on add (with build status choice)
- [ ] Wishlist "Got it" flow works correctly with undo
- [ ] Duplicate detection prompts for quantity vs. new entry
- [ ] Build status toggle works with optimistic update and undo
- [ ] Quantity stepper works (minimum 1, direct edit, undo)
- [ ] Gallery sorting and filtering works (including by build status)
- [ ] MOC linking picker works with bidirectional display
- [ ] Hard delete with confirmation works

### UX & Polish
- [ ] Empty states for all scenarios
- [ ] Build status toggle has celebration animation
- [ ] "Got it" success highlights new item in gallery
- [ ] Optimistic updates with revert on failure
- [ ] Toast notifications with undo actions
- [ ] Mobile responsive with swipe actions

### Accessibility
- [ ] Keyboard navigation (B for toggle, +/- for quantity, M for MOC link)
- [ ] Screen reader announcements for state changes
- [ ] Focus management for modals and navigation
- [ ] Build status uses color AND icon
- [ ] WCAG AA contrast compliance

### Technical
- [ ] All new API endpoints have tests
- [ ] No TypeScript errors
- [ ] Code reviewed and merged

---

**Related Epics:**
- Epic 6: Wishlist (source of "Got it" items)
- Epic 4: MOC Instructions (for linking)
- Epic 5: Inspiration Gallery
