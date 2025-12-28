# Epic 6: Wishlist

**Story Location:** `docs/stories/epic-6-wishlist/`
**Status:** Draft

---

## Epic Goal

Enable users to track LEGO and alt-brick sets they want to purchase, with URL-based scraping for easy data entry and a "Got it" flow to transition items to their Sets collection.

---

## Epic Description

### Context

The Wishlist is a purchase tracking tool for LEGO builders. Users add sets they want to buy, track priority and notes, and eventually mark items as purchased (moving them to the Sets Gallery).

**Key Differentiators from other galleries:**
- Focused on external products (sets from LEGO.com and other retailers)
- URL scraping to auto-populate set data
- Images stored in S3 (not hotlinked)
- "Got it" flow transitions items to Sets Gallery
- Draggable for manual priority ordering
- Hard delete (no restore)

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Wishlist Item** | A set the user wants to purchase, with scraped or manually entered data |
| **Scraper** | Shared service that extracts set data from retailer URLs (MVP: LEGO.com only) |
| **"Got it" Flow** | Marks item as purchased, prompts for purchase details, moves to Sets Gallery |
| **Priority** | User-defined ordering via drag-and-drop |

### Success Criteria

- Users can add sets via URL paste with auto-scrape
- Users can manually enter/edit set data when scraping fails
- Review step before saving scraped data
- Gallery supports sorting, filtering, and tagging (via shared gallery package)
- Draggable reordering for priority
- "Got it" button triggers purchase flow and moves item to Sets
- Hard delete with confirmation works correctly

---

## Data Model

### Wishlist Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary identifier |
| `userId` | UUID | Yes | Owner |
| `setNumber` | string | No | LEGO set number (e.g., "75192") |
| `title` | string | Yes | Set name |
| `store` | string | Yes | Retailer name (LEGO, Barweer, Cata, etc.) |
| `sourceUrl` | string | No | Original product URL |
| `imageUrl` | string | No | S3 URL to stored product image |
| `price` | number | No | Listed price |
| `currency` | string | No | Price currency (USD, EUR, etc.) |
| `pieceCount` | number | No | Number of pieces |
| `releaseDate` | date | No | Set release date |
| `tags` | string[] | No | Theme/category tags |
| `priority` | number | No | User-defined priority (1-5 or similar) |
| `notes` | string | No | User notes (e.g., "wait for sale") |
| `sortOrder` | number | Yes | Position in gallery (for drag reorder) |
| `createdAt` | datetime | Yes | Added to wishlist timestamp |
| `updatedAt` | datetime | Yes | Last modified timestamp |

---

## CRUD Operations

### Create

| Operation | Trigger | Flow |
|-----------|---------|------|
| **Add via URL** | "Add" button → paste URL | Paste URL → scrape data → review/edit step → save to S3 and database |
| **Add manually** | "Add" button → manual entry | Open form → enter all fields manually → save |
| **Scrape failure** | Auto or manual | If scrape fails/partial, show form with available data pre-filled, user completes |

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
| **Refresh from URL** | Item with sourceUrl | Re-scrape to update price/availability (future) |

### Delete

| Operation | Flow |
|-----------|------|
| **Delete Item** | Confirmation modal ("Are you sure? This is permanent.") → hard delete |
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
   - Delete wishlist item
   - Navigate to Sets Gallery (optional) or show success toast

---

## Scraper Service

### Overview
A shared package that handles URL-based data extraction. Used by both Wishlist and Sets.

### MVP Scope
- **LEGO.com only** for initial release
- Extract: title, set number, price, piece count, images, release date
- Download and store images in S3 (no hotlinking)

### Architecture
```
packages/
  backend/
    scraper-service/        # Shared scraper package
      src/
        scrapers/
          lego.ts           # LEGO.com scraper
          base.ts           # Base scraper interface
        index.ts            # Unified scraping API
        cron/               # Scheduled refresh jobs (future)
```

### Future Expansion
- Additional retailers (Barweer, Cata, BrickLink, etc.)
- Cron jobs for price monitoring
- Price history tracking

---

## User Interface

### Gallery View
- Uses shared gallery package (sorting, filtering, tags)
- Grid or list layout (user preference)
- Drag-and-drop reordering for priority
- "Add" button opens URL input modal
- Each card shows: image, title, store, price, piece count
- "Got it" button on each card (prominent, celebratory color)
- Visual priority indicators (position = priority)

### Add Modal

#### Step 1: URL Input
- Large paste field with placeholder: "Paste a LEGO.com product URL"
- Immediate URL validation (pattern check before scrape)
- "Fetch Product Info" button (disabled until valid URL)
- "Enter manually instead" link below
- Supported sites indicator: "Currently supports: LEGO.com"

#### Step 2: Scraping State
```
┌─────────────────────────────────────────────────────┐
│  Fetching product info from LEGO.com...            │
│                                                     │
│           [=====>          ] 60%                    │
│                                                     │
│  Taking longer than expected?                       │
│  [Keep waiting]  [Enter manually]                   │
└─────────────────────────────────────────────────────┘
```
- Progress indicator (indeterminate or estimated)
- Timeout after 15 seconds prompts user
- Cancel option always available

#### Step 3: Review & Edit
- Header: "We found this product. Review and edit before saving."
- Auto-filled fields show subtle "auto-filled" indicator
- Missing/empty fields highlighted: "Not found - please enter"
- Image preview with "Replace image" option
- All fields editable
- "Save to Wishlist" and "Cancel" buttons
- Optional: "Quick Save" for power users (skips review on future adds)

### Detail View
- Large product image
- Full metadata display (price, piece count, release date, store)
- Priority indicator (position in list)
- Notes field (expandable)
- Tags section
- Edit button
- **"Got it!" button** (prominent, primary action)
- Delete button (secondary, with confirmation)

### "Got it" Modal
```
┌─────────────────────────────────────────────────────┐
│  🎉 Add to Your Collection                          │
│                                                     │
│  [Image]  LEGO Star Wars Millennium Falcon         │
│           Set #75192 · 7,541 pieces                │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Purchase Details                                   │
│                                                     │
│  Price paid:     [$849.99    ]                     │
│  Tax:            [$72.25     ]                     │
│  Shipping:       [$0.00      ]                     │
│  Quantity:       [- 1 +]                           │
│  Purchase date:  [Dec 27, 2024 ▼]                  │
│                                                     │
│  ☐ Keep a copy on wishlist (want another)          │
│                                                     │
│              [Cancel]  [Add to Sets ✓]             │
└─────────────────────────────────────────────────────┘
```
- Pre-fills price from wishlist item
- "Keep on wishlist" checkbox for wanting multiples
- Date defaults to today
- Clear celebration moment

### Empty States

| State | Design |
|-------|--------|
| **Empty wishlist (new user)** | Illustration of dreaming about LEGO sets. "Nothing on your wishlist yet. Start adding sets you're dreaming about!" with prominent Add CTA |
| **Empty wishlist (all purchased)** | Celebration: "🎉 You got everything on your list! Time to dream bigger." with Add CTA |
| **No search/filter results** | "No wishlist items match your filters." with clear filters button |

### Loading & Error States

| State | Design |
|-------|--------|
| **Gallery loading** | Skeleton cards matching grid layout |
| **Invalid URL** | Inline error below field: "That doesn't look like a LEGO.com URL. Check the link and try again." |
| **Scraping in progress** | Modal with progress, timeout option at 15s |
| **Scrape partial success** | Show found fields, highlight missing: "We couldn't find the image. You can add one manually." |
| **Scrape failure** | "Couldn't fetch product details. LEGO.com may be unavailable. [Try again] [Enter manually]" |
| **Scrape timeout** | "Taking too long. [Keep waiting] [Enter manually]" |
| **Save failure** | Toast: "Couldn't save to wishlist. [Retry]" |
| **"Got it" failure** | Toast: "Couldn't add to Sets. Your wishlist item is safe. [Retry]" - ensure wishlist item NOT deleted |

---

## Interaction Patterns

### URL Validation Flow
1. User pastes URL
2. **Immediate check:** Does it match `lego.com/*/product/*` pattern?
3. If no: Show inline error, disable Fetch button
4. If yes: Enable Fetch button, show green checkmark

### Scrape Flow with Graceful Degradation
```
URL Pasted
    │
    ▼
┌─────────────┐
│ Valid URL?  │──No──▶ Show error, suggest manual
└─────────────┘
    │ Yes
    ▼
┌─────────────┐
│ Start Scrape│
└─────────────┘
    │
    ▼
┌─────────────┐     ┌─────────────────┐
│ Success?    │──No─▶│ Partial success?│
└─────────────┘     └─────────────────┘
    │ Yes               │ Yes        │ No
    ▼                   ▼            ▼
Review with         Review with    "Couldn't fetch.
all fields          missing        Enter manually?"
filled              highlighted
```

### "Got it" Flow with Undo
1. User clicks "Got it" on wishlist item
2. Modal opens with purchase details form
3. User fills in price, tax, shipping, quantity, date
4. Optional: Check "Keep on wishlist" if want another
5. User clicks "Add to Sets"
6. **Transaction:** Create Set item first, then delete Wishlist item (if checkbox unchecked)
7. Item fades from wishlist with brief animation
8. Toast appears: "Added to Sets! [View] [Undo]"
9. **Undo (5 second window):** Restores wishlist item, deletes set item
10. "View" navigates to the new item in Sets gallery

### Drag-and-Drop Priority
- **Visual feedback:** Ghost image follows cursor, drop zone highlighted
- **Keyboard alternative:** Select item → Arrow keys → Enter to confirm
- **Touch:** Long-press (300ms) to initiate drag
- **Auto-save:** Position saved immediately on drop
- **Undo:** Toast "Priority updated" with Undo action

---

## Mobile Considerations

**MVP Scope:** Responsive design, touch-optimized.

| Feature | Desktop | Mobile |
|---------|---------|--------|
| View gallery | ✅ Grid | ✅ List (default) or Grid |
| View detail | ✅ | ✅ |
| Add via URL | ✅ | ✅ (paste from clipboard) |
| Scrape flow | ✅ | ✅ |
| Drag to reorder | ✅ | ⚠️ Long-press to drag (can be fiddly) |
| "Got it" flow | ✅ | ✅ |
| Edit/Delete | ✅ | ✅ |

**Mobile-specific UX:**
- "Paste from clipboard" button on URL input (one-tap paste)
- Swipe actions: Swipe right → "Got it", Swipe left → Delete
- Bottom sheet for modals instead of centered dialogs

---

## Accessibility Requirements

### Keyboard Navigation

| Action | Keyboard Shortcut |
|--------|-------------------|
| Navigate gallery | Arrow keys |
| Select item | Space |
| Open detail view | Enter |
| Close modal | Escape |
| Reorder item | Select → Arrow keys → Enter |
| Delete | Select → Delete/Backspace |
| "Got it" on selected | G |
| Add new | A (when in gallery) |

### Screen Reader Support

| Element | Announcement |
|---------|--------------|
| Wishlist item | "[Title], [price], [piece count] pieces, priority [position] of [total]" |
| "Got it" button | "Got it, moves [title] to your Sets collection" |
| Scraping state | "Fetching product information, please wait" |
| Scrape complete | "Product found: [title]" |
| Scrape failed | "Could not fetch product. Enter details manually or try again." |
| Priority changed | "[Title] moved to priority [new position]" |

### Focus Management

| Scenario | Focus Behavior |
|----------|----------------|
| Add modal opens | Focus on URL input field |
| Scrape completes | Focus on first editable field |
| "Got it" modal opens | Focus on price field |
| Modal closes | Focus returns to triggering element |
| Item deleted | Focus moves to next item |
| "Got it" completes | Focus on toast action or next wishlist item |

### Form Accessibility
- All fields have visible labels (not just placeholders)
- Error messages linked to fields via aria-describedby
- Required fields marked with aria-required
- Price inputs have currency announced

---

## Stories Overview

### Existing Stories (Read-focused)
- `wish-1000`: Gallery scaffolding
- `wish-1001`: Card component
- `wish-1002`: API endpoints (partial)
- `wish-1003`: Add item page

### New Stories Needed (CRUD completion)

| Story | Description | Priority |
|-------|-------------|----------|
| **wish-1004** | Scraper service package scaffolding | High |
| **wish-1005** | LEGO.com scraper implementation | High |
| **wish-1006** | Add modal with URL validation and scrape flow | High |
| **wish-1007** | Review/edit step with auto-fill indicators | High |
| **wish-1008** | Image download and S3 storage | High |
| **wish-1009** | Wishlist CRUD endpoints (create, update, delete) | High |
| **wish-1010** | "Got it" flow modal with undo capability | High |
| **wish-1011** | Transition to Sets logic (atomic transaction) | High |
| **wish-1012** | Drag-and-drop priority reorder with undo | Medium |
| **wish-1013** | Manual entry fallback form | Medium |
| **wish-1014** | Hard delete with confirmation | Medium |
| **wish-1015** | Sort by price, date, piece count | Low |
| **wish-1016** | Tag management integration | Low |
| **wish-1017** | Empty states and onboarding | Medium |
| **wish-1018** | Scraping states (loading, partial, error, timeout) | High |
| **wish-1019** | Keyboard navigation and accessibility | Medium |
| **wish-1020** | Mobile responsive design and swipe actions | Low |
| **wish-1021** | "Keep on wishlist" option in Got it flow | Medium |

---

## Dependencies

### Internal Dependencies
- Shared gallery package (sorting, filtering)
- S3 infrastructure (image storage)
- Sets Gallery (for "Got it" transition)
- Authentication/authorization

### External Dependencies
- LEGO.com (scraping target - may change without notice)

---

## Technical Notes

### Scraping Considerations
- LEGO.com structure may change; scraper needs maintenance
- Use headless browser or fetch with proper headers
- Respect robots.txt and rate limits
- Cache scraped data to avoid repeated requests
- Handle failures gracefully with manual fallback

### Image Handling
- Download product images during scrape
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
| LEGO.com blocks scraping | Medium | High | Respectful scraping, user-agent rotation, manual fallback always available |
| LEGO.com changes page structure | High | Medium | Modular scraper design, quick update path, automated tests against live site |
| Large images slow to download | Low | Low | Background processing, progress indicator |
| "Got it" flow loses data | Low | High | Transaction-based: create Set before deleting Wishlist item |

---

## Definition of Done

### Core Functionality
- [ ] Users can add items via URL with auto-scrape (LEGO.com)
- [ ] URL validation provides immediate feedback
- [ ] Review/edit step shows auto-filled vs. missing fields
- [ ] Manual entry fallback works
- [ ] Images stored in S3, not hotlinked
- [ ] Gallery sorting and filtering works
- [ ] Drag-and-drop priority reordering works with undo
- [ ] "Got it" flow transitions items to Sets correctly (atomic)
- [ ] "Keep on wishlist" option works for wanting multiples
- [ ] Hard delete with confirmation works

### UX & Polish
- [ ] Scraping states implemented (loading, partial success, error, timeout)
- [ ] Empty states for all scenarios
- [ ] Undo available for "Got it" action (5 second window)
- [ ] Toast notifications for success/error states
- [ ] Mobile responsive with swipe actions

### Accessibility
- [ ] Keyboard navigation for all actions (including G for "Got it")
- [ ] Screen reader announcements for state changes
- [ ] Focus management for modals and flows
- [ ] Form fields have visible labels and error associations
- [ ] WCAG AA contrast compliance

### Technical
- [ ] All new API endpoints have tests
- [ ] Scraper has tests (including against live LEGO.com)
- [ ] No TypeScript errors
- [ ] Code reviewed and merged

---

**Related Epics:**
- Epic 7: Sets Gallery (receives "Got it" items)
- Epic 4: MOC Instructions
- Epic 5: Inspiration Gallery
