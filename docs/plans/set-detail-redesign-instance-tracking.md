# Set Detail Page Redesign + Instance Tracking

## Feature Summary

Redesign the set detail page to display all available product data and introduce per-copy instance tracking. Split the concept of "a LEGO set" (product catalog) from "a physical copy I own" (instance with condition, build status, purchase data).

## Problem Statement

The set detail page hides data that already exists in the database (condition, completeness, retire date, store) and lacks data that should be scraped (MSRP, weight, availability, minifig details). Quantity tracking is a single integer with no per-copy metadata — users can't track that one copy is sealed and another is built. The detail page needs to show all product data and provide an editable instances table for per-copy tracking.

## Proposed Solution

Add new product-level columns to `sets` (msrpPrice, weight, availabilityStatus, etc.) defaulting to null. Create a `set_instances` table for per-copy ownership data. Redesign the detail page with all product fields, an inline-editable instances table, and a minifigs section. New fields display as empty/placeholder until populated by users or future scraper runs.

## Scope

### In Scope (Layer 1)

- `set_instances` table + DB migration
- New product columns on `sets` (msrpPrice, msrpCurrency, weight, availabilityStatus, lastScrapedAt, lastScrapedSource, quantityWanted)
- API endpoints: CRUD for set instances
- API update: set detail endpoint returns instances + minifig data
- Redesigned set detail page with all sections
- Click-to-edit inline editing on instances table
- Graceful null handling for all new fields
- Unit, integration, and e2e tests with hard gates

### Explicitly Out of Scope

- **Scraper enrichment** — updating lego.com, BrickLink, or Rebrickable scrapers to collect new fields. This is a separate follow-up plan. New product columns will be null until that plan is executed.
- **Layer 2:** Purchase summary aggregation, email receipt agent integration
- Dropping legacy ownership columns from `sets` (keep for backward compat)
- Location tracking for physical copies
- Age range field (explicitly excluded)
- Shared product catalog across users
- Theme group / theme hierarchy (existing `theme` field is sufficient)

## Minimum Path

Layer 1: Schema migration + API + UI. All new product fields default to null and display as editable placeholders. Instances table works for CRUD. Existing sets continue to work unchanged — legacy ownership fields on `sets` are read as fallback.

## Data & Architecture

### Schema Changes

**New table: `set_instances`**

```sql
CREATE TABLE set_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  condition TEXT,                    -- 'new' | 'used'
  completeness TEXT,                 -- 'sealed' | 'complete' | 'incomplete'
  build_status TEXT DEFAULT 'not_started', -- 'not_started' | 'in_progress' | 'completed' | 'parted_out'
  includes_minifigs BOOLEAN,
  purchase_price DECIMAL(10,2),
  purchase_tax DECIMAL(10,2),
  purchase_shipping DECIMAL(10,2),
  purchase_date TIMESTAMP,
  store_id UUID REFERENCES stores(id),
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX set_instances_user_id_idx ON set_instances(user_id);
CREATE INDEX set_instances_set_id_idx ON set_instances(set_id);
```

**New columns on `sets`:**

```sql
ALTER TABLE sets ADD COLUMN msrp_price DECIMAL(10,2);
ALTER TABLE sets ADD COLUMN msrp_currency TEXT DEFAULT 'USD';
ALTER TABLE sets ADD COLUMN weight DECIMAL(10,2);          -- grams
ALTER TABLE sets ADD COLUMN availability_status TEXT;       -- 'available' | 'retiring_soon' | 'retired'
ALTER TABLE sets ADD COLUMN quantity_wanted INTEGER DEFAULT 0;
ALTER TABLE sets ADD COLUMN last_scraped_at TIMESTAMP;
ALTER TABLE sets ADD COLUMN last_scraped_source TEXT;
```

**Existing columns kept (not dropped):** `status`, `condition`, `completeness`, `buildStatus`, `purchasePrice`, `purchaseTax`, `purchaseShipping`, `purchaseDate`, `quantity`, `priority`, `sortOrder`, `storeId` — read as fallback until instances are created.

### Status Model

Drop the `status` enum ('wanted'/'owned') as source of truth. Replace with derived state:

- **Wanted** = `quantityWanted > 0` on the `sets` row
- **Owned** = `COUNT(set_instances) > 0` for the set
- A set can be both wanted AND owned simultaneously ("I have 3, want 10 more")
- The `status` column is kept for backward compatibility but the derived model is authoritative

### Auto-flip Logic

When the first instance is created for a set, if `status` is `wanted`, auto-update to `owned`. Creating an instance does not change `quantityWanted`. Deleting the last instance does NOT auto-flip back. External systems (email receipt agent) can also trigger this transition.

### Minifig Data

No new table needed. Minifig count is derived from existing `minifig_variants.appearsInSets` JSONB relationship. The detail page queries minifig variants where `appearsInSets` contains the set number to build the minifigs grid.

### API Changes

**New endpoints:**

- `GET /api/sets/:id/instances` — list instances for a set
- `POST /api/sets/:id/instances` — create instance (triggers auto-flip)
- `PATCH /api/sets/:id/instances/:instanceId` — update instance fields
- `DELETE /api/sets/:id/instances/:instanceId` — delete instance

**Updated endpoints:**

- `GET /api/sets/:id` — response includes `instances[]` array and `minifigs[]` array
- `PATCH /api/sets/:id` — accepts new product fields (msrpPrice, weight, availabilityStatus, quantityWanted)

### Data Source Priority (for future scraper plan)

| Field | Primary Source | Fallback |
|-------|---------------|----------|
| Title, MSRP, description, images, dimensions, weight | lego.com | Rebrickable |
| Piece count, year, theme, parts inventory | Rebrickable | lego.com |
| Market pricing, availability | BrickLink | — |
| Release date, retire date | Rebrickable | lego.com |
| Minifig list per set | BrickLink (via minifig_variants.appearsInSets) | — |

Scrapers write product data only — never purchase prices. Purchase prices only come from user input or the email receipt agent via `set_instances`.

## Detail Page Layout

### Header

- Title, set number, theme badge, availability badge

### Hero Section

- Image gallery (left 2/3)
- Product specs card (right 1/3): piece count, minifig count (derived), MSRP, weight, dimensions, year, release/retire dates, brand, availability

### Instances Table

- Editable table of owned copies
- Columns: #, Condition, Completeness, Build Status, Includes Minifigs, Purchase Price, Purchase Date, Store, Notes
- "Add copy" button appends row with defaults
- Click-to-edit per cell, auto-save on blur
- Delete button with confirmation dialog per row
- Zero instances: grayed-out skeleton showing table structure with "Add your first copy" prompt

### Minifigs Section

- Grid of minifig cards from appearsInSets data
- Each card: image, name, quantity in set
- Link to minifig detail page if in user's collection

### Parts Section (if available)

- Parts table (existing functionality)

### Purchase Summary

- Aggregated from instances: total spent, count owned

### Notes

- Product-level notes (editable)

### Provenance Footer

- Last scraped date, source

## User Flows

### Flow 1: View set detail with full product data

- **Actor:** Authenticated user
- **Trigger:** Navigate to `/sets/:id`
- **Steps:** Page loads -> API returns set with instances and minifigs -> Hero section shows product image + specs -> Instances table shows owned copies (or grayed skeleton if none) -> Minifigs grid shows included figures -> Notes section shows product notes
- **Success:** All available data displayed. Null fields show as empty placeholders with click-to-edit affordance.
- **Failure:** Set not found -> 404. API error -> error state with retry.

### Flow 2: Add a new owned copy

- **Actor:** Authenticated user on set detail page
- **Trigger:** Click "Add copy" button
- **Steps:** New row appears in instances table with defaults (buildStatus: not_started, everything else null) -> First editable cell auto-focuses -> User clicks each cell to set condition, completeness, purchase price, etc. -> Each field auto-saves on blur via PATCH
- **Success:** Instance row created and visible. If this is the first instance and set was `wanted`, status auto-flips to `owned`.
- **Failure:** API error -> toast with error message, row shows error state.

### Flow 3: Edit an existing instance

- **Actor:** Authenticated user viewing instances table
- **Trigger:** Click a cell value (e.g., "new" condition badge)
- **Steps:** Cell transforms to select/input -> User changes value -> On blur, PATCH request fires -> Cell returns to read-only with new value
- **Success:** Instance updated. Toast confirmation.
- **Failure:** API error -> revert to previous value, show error toast.

### Flow 4: Delete an instance

- **Actor:** Authenticated user
- **Trigger:** Click delete button on instance row
- **Steps:** Confirmation dialog -> User confirms -> DELETE request -> Row removed from table
- **Success:** Instance deleted. Instance count updates.
- **Failure:** API error -> row stays, error toast.

## Resolved Decisions

| # | Decision | Resolution | Rationale |
|---|----------|-----------|-----------|
| 1 | Set vs instance | Full split — sets is product catalog, set_instances is per-copy | Clean separation of product data from ownership data |
| 2 | Data source strategy | Source priority hierarchy per field | Each scraper writes what it's best at. Scraper updates are a separate follow-up plan. |
| 3 | Product fields | Added msrpPrice, weight, availabilityStatus, lastScrapedAt/Source, quantityWanted. Dropped ageRange, themeGroup. minifigCount derived. | Based on gap analysis + user priorities |
| 4 | Wanted -> owned | Auto-flip on first instance, no auto-flip back | Convenient but not destructive |
| 5 | Detail page layout | Hero+specs, instances table, minifigs, parts, purchase summary, notes, provenance | Data-first, iterate on layout later |
| 6 | Minifig data | Existing minifig_variants.appearsInSets relationship | No new table needed |
| 7 | set_instances columns | condition, completeness, buildStatus, includesMinifigs, purchase fields, storeId, notes | Matches user's "each copy has its own metadata" requirement |
| 8 | Scraper writes | Product data only, never purchase prices. Scraper enrichment is a separate plan. | Scrapers seed catalog, users/agents create instances |
| 9 | Minimum path | Layer 1: schema+API+UI with full test gates | Delivers value fastest |
| 10 | Inline editing | Click-to-edit per cell, auto-save on blur | Matches existing stepper pattern |
| 11 | Status model | Drop status enum, use quantityWanted + instance count. Both wanted and owned simultaneously. | "I have 3, want 10 more" is natural |
| 12 | Migration strategy | Additive only — new columns default null, old columns kept. No data moved. | Non-destructive, backfill later via scrapers |

## Test Plan

### Unit Tests

**API — set_instances CRUD:**

- [ ] `POST /api/sets/:id/instances` creates instance with correct defaults
- [ ] `POST /api/sets/:id/instances` auto-flips status to owned on first instance
- [ ] `POST /api/sets/:id/instances` does NOT change quantityWanted
- [ ] `POST /api/sets/:id/instances` returns 404 for non-existent set
- [ ] `POST /api/sets/:id/instances` returns 403 for wrong user
- [ ] `PATCH /api/sets/:id/instances/:instanceId` updates individual fields
- [ ] `PATCH /api/sets/:id/instances/:instanceId` validates condition enum values
- [ ] `PATCH /api/sets/:id/instances/:instanceId` validates completeness enum values
- [ ] `PATCH /api/sets/:id/instances/:instanceId` validates buildStatus enum values
- [ ] `PATCH /api/sets/:id/instances/:instanceId` returns 404 for non-existent instance
- [ ] `DELETE /api/sets/:id/instances/:instanceId` removes instance
- [ ] `DELETE /api/sets/:id/instances/:instanceId` does NOT auto-flip status back
- [ ] `DELETE /api/sets/:id/instances/:instanceId` returns 404 for non-existent instance
- [ ] `GET /api/sets/:id` includes `instances[]` array in response
- [ ] `GET /api/sets/:id` includes `minifigs[]` array from appearsInSets data
- [ ] `GET /api/sets/:id` returns empty arrays when no instances/minifigs exist

**API — set product fields:**

- [ ] `PATCH /api/sets/:id` accepts new product fields (msrpPrice, weight, availabilityStatus, quantityWanted)
- [ ] `PATCH /api/sets/:id` validates availabilityStatus enum
- [ ] New product fields default to null for existing sets
- [ ] quantityWanted defaults to 0

**UI — Instances table component:**

- [ ] Renders empty skeleton when no instances exist
- [ ] Renders rows for each instance with correct data
- [ ] "Add copy" button creates new row with defaults
- [ ] Click-to-edit on condition cell opens select dropdown
- [ ] Click-to-edit on completeness cell opens select dropdown
- [ ] Click-to-edit on buildStatus cell opens select dropdown
- [ ] Click-to-edit on includesMinifigs cell toggles boolean
- [ ] Click-to-edit on purchasePrice cell opens number input
- [ ] Click-to-edit on purchaseDate cell opens date picker
- [ ] Click-to-edit on notes cell opens text input
- [ ] Auto-save fires PATCH on blur
- [ ] Delete button shows confirmation dialog
- [ ] Confirmation dialog calls DELETE on confirm

**UI — Detail page sections:**

- [ ] Hero section renders product image gallery
- [ ] Specs card shows all product fields (piece count, MSRP, weight, dimensions, theme, year, brand, release date, retire date, availability)
- [ ] Null product fields render as empty placeholders (not hidden)
- [ ] quantityWanted is editable inline
- [ ] Minifigs section renders grid of figures from appearsInSets
- [ ] Minifigs section shows empty state when no minifig data
- [ ] Notes section renders product-level notes
- [ ] Provenance footer shows lastScrapedAt and lastScrapedSource

### Integration Tests

**API integration:**

- [ ] Create set -> add instance -> GET set returns instance in array
- [ ] Create set (wanted) -> add first instance -> GET set shows status=owned
- [ ] Create set -> add 2 instances -> delete 1 -> GET set still shows 1 instance
- [ ] Create set -> add instance -> delete last instance -> status remains owned
- [ ] Create set -> update product fields -> GET set returns updated fields
- [ ] Set detail endpoint returns minifigs from minifig_variants.appearsInSets

**UI integration:**

- [ ] Full detail page renders with instances table populated from API
- [ ] Add copy -> row appears -> edit cells -> values persist on page refresh
- [ ] Delete copy -> row removed -> count updates
- [ ] Edit product-level fields (quantityWanted, notes) -> persist on refresh
- [ ] Detail page with zero instances shows skeleton table
- [ ] Detail page with null product fields shows placeholders
- [ ] Navigation from gallery to detail to gallery preserves state

### E2E Tests (Playwright)

- [ ] Navigate to `/sets/:id` -> full detail page renders with all sections
- [ ] Click "Add copy" -> fill condition, price, date -> row saved and visible on reload
- [ ] Click condition cell -> change to "used" -> auto-saves -> reload confirms
- [ ] Click delete on instance -> confirm -> row gone -> reload confirms
- [ ] Set with no instances shows skeleton table with "Add your first copy" prompt
- [ ] Set with null product fields shows editable placeholders
- [ ] Navigate from sets gallery -> set detail -> back to gallery works

### Test Gates

**Gate 1: Schema + API (must pass before UI work begins)**

- All API unit tests pass
- All API integration tests pass
- Migration runs cleanly on fresh and existing databases

**Gate 2: UI components (must pass before E2E)**

- All UI unit tests pass
- All UI integration tests pass

**Gate 3: Full stack (must pass before Layer 1 is complete)**

- All E2E tests pass
- Zero TypeScript errors across all packages
- Layer 1 complete — sign off before any follow-up work

## Acceptance Criteria

- [ ] `set_instances` table exists with all specified columns
- [ ] New product columns on `sets` exist, default to null
- [ ] `GET /api/sets/:id` returns `instances[]` and `minifigs[]`
- [ ] `POST/PATCH/DELETE /api/sets/:id/instances/:instanceId` work correctly
- [ ] Creating first instance auto-flips status to owned
- [ ] Detail page hero section shows product image gallery + all product specs (null fields show as placeholders)
- [ ] Detail page instances table renders with click-to-edit per cell
- [ ] "Add copy" creates a new instance row with defaults
- [ ] Instance delete works with confirmation dialog
- [ ] Auto-save on blur for every editable cell
- [ ] Minifigs section shows figures from appearsInSets data
- [ ] Empty instances state shows grayed skeleton preview
- [ ] quantityWanted is editable on the set level
- [ ] All existing sets continue to work unchanged
- [ ] All test gates pass

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Zero TypeScript errors
- [ ] All unit tests pass (Gate 1 + Gate 2)
- [ ] All integration tests pass (Gate 1 + Gate 2)
- [ ] All E2E tests pass (Gate 3)
- [ ] Layer 1 signed off before any follow-up work begins

## Constraints

- Additive migration only — no columns dropped, no data moved
- Legacy ownership fields on `sets` read as fallback
- Minifig count derived from relationship, not stored
- New product fields nullable — UI must handle null gracefully

## Dependencies

- Existing `minifig_variants.appearsInSets` JSONB must be populated for minifigs section to work
- `stores` table must exist for storeId FK on instances

## Warnings / Assumptions

- New product fields will be null until a separate scraper enrichment plan is executed
- The email receipt agent (existing KB plan) will be a future source for creating instances automatically
- `status` column kept on `sets` for backward compatibility but the derived model (quantityWanted + instance count) is the source of truth going forward
- Scraper updates are explicitly out of scope — separate follow-up plan required
