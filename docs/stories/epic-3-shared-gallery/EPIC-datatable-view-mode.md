# Epic: Gallery Datatable View Mode - Brownfield Enhancement

## Epic Goal

Add a datatable view mode to the shared gallery package (`@repo/gallery`) with composable column configuration and multi-column sorting, enabling users to view and sort gallery items in a structured table format optimized for desktop/tablet experiences.

## Epic Description

### Existing System Context

**Current Functionality:**
- Shared gallery package located at `/packages/core/gallery`
- Grid-only view using `GalleryGrid` and `GalleryCard` components
- Card-based pattern where each gallery type (wishlist, sets, mocs) extends base `GalleryCard`
- Comprehensive Zod-based type system for filters, sorting, and pagination
- Uses React 19, @repo/app-component-library (shadcn/ui), Tailwind CSS
- TanStack Router for URL state management

**Technology Stack:**
- React 19
- TypeScript with strict mode + Zod schemas
- shadcn/ui components (includes Data Table built on TanStack Table)
- Tailwind CSS for styling
- Framer Motion for animations
- Vitest + React Testing Library

**Integration Points:**
- Consumed by: `app-wishlist-gallery`, `app-sets-gallery`, `apps/web/main-app` (MOCs gallery)
- NOT used by: `app-inspiration-gallery` (excluded from datatable feature)

### Enhancement Details

**What's Being Added:**

1. **View Mode System**
   - Introduce concept of view modes to gallery (first alternate view)
   - View toggle component (grid vs datatable, extensible for future masonry view)
   - Responsive: datatable hidden on mobile (< tablet breakpoint)

2. **Datatable Component**
   - Built on shadcn Data Table + TanStack Table
   - Composable column headers using children pattern (matches new filter architecture)
   - Custom empty state component for table layout
   - Infinite scroll pagination (consistent with grid view)

3. **Multi-Column Sorting**
   - Click column headers to sort
   - Support up to 2 simultaneous sort columns
   - Visual priority indicators (1, 2)
   - Click cycle: ascending → descending → removed
   - Removing column 1 promotes column 2 to column 1
   - Default sort by title when no user sorting active

4. **Composable Architecture**
   - Column config passed as children (not props) for consistency with filter refactor
   - Each gallery (wishlist, sets, mocs) defines own column components
   - Row clicks open detail view (same behavior as cards)

**How It Integrates:**
- Extends existing gallery package without breaking grid view
- Follows established composability pattern from filter refactor (glry-1001a)
- Reuses existing `GalleryFilterBar` architecture (children-based filters)
- Works with current state management hooks (`useGalleryState`, `useGalleryUrl`)

**Success Criteria:**
- Users can toggle between grid and datatable views on desktop/tablet
- Datatable displays items with custom columns per gallery type
- Multi-column sorting works with visual priority feedback
- Mobile users see grid view only (datatable gracefully hidden)
- No breaking changes to existing grid view functionality
- All three target galleries (wishlist, sets, mocs) successfully integrate datatable

### UX Considerations

**View Toggle Design:**
- **Placement:** Toggle positioned in consistent toolbar alongside sort/filter controls
- **Discoverability:** First-time users see dismissible tooltip hint ("Try table view!")
- **Touch targets:** Minimum 44x44px for accessibility
- **Persistence:** View preference saved in localStorage per gallery type (e.g., `gallery_view_mode_wishlist`)
- **Responsive breakpoint:** md (768px) - toggle visible on tablet/desktop only

**UI States & Feedback:**
- **Loading states:**
  - Initial table render: skeleton with shimmer effect
  - Infinite scroll: bottom-loading spinner
- **Error states:** Retry action with clear error messaging
- **Empty states:**
  - No items: `GalleryTableEmpty` with CTA
  - No results after filtering: Different variant with "Clear filters" action
- **Row interactions:**
  - Hover: Subtle background highlight, pointer cursor
  - Focus-visible: Keyboard navigation ring
  - Navigating: Reduced opacity while detail view loads

**Multi-Column Sort UX:**
- **Visual indicators:** Sort direction arrow (↑/↓) + superscript priority number (₁, ₂)
- **Sort limit behavior:** When 2 columns sorted, dim remaining column headers with tooltip "Remove a sort column first"
- **Clear action:** "Clear sorts" button near view toggle for easy reset
- **Screen reader:** Announce sort changes via aria-live region

**Micro-interactions:**
- Row hover transitions (150ms ease)
- View mode switch animation using Framer Motion (fade + subtle slide)
- Smooth scroll to top when switching views
- Column header click feedback (ripple or scale effect)

## Stories

### Story 1: View Mode Infrastructure + Toggle Component
**glry-1004: Gallery View Mode System and Toggle**

Add view mode state management and toggle UI to support switching between grid and datatable views, with extensibility for future view types (masonry).

**Key Deliverables:**
- ViewMode type (`'grid' | 'datatable'`) with Zod schema
- View mode state management in `useGalleryState` hook
- `GalleryViewToggle` component with grid/table icons
- Responsive: toggle hidden on mobile, defaulting to grid
- URL sync for view mode preference (optional, non-persisted)
- Integration with existing `GalleryGrid` component

**Acceptance Criteria:**
- View toggle renders on tablet/desktop (>= md breakpoint: 768px)
- Clicking toggle switches between grid and datatable modes
- View mode state accessible via `useGalleryState` hook
- Mobile users always see grid view regardless of state
- Existing grid view functionality unchanged

**UX-Specific Criteria:**
- Toggle positioned in toolbar with filters/sort controls (consistent placement)
- Minimum 44x44px touch target for accessibility
- First-time users see dismissible tooltip hint ("Try table view!")
- View preference persists in localStorage per gallery (e.g., `gallery_view_mode_wishlist`)
- Preference fallback order: localStorage → URL param → default grid
- Smooth view transition animation (Framer Motion: fade + subtle y-axis slide, 300ms)
- Scroll position resets to top when switching views
- Active view has visual feedback (icon highlighted or background change)

---

### Story 2: Basic Datatable Component with Composable Columns
**glry-1005: Gallery Datatable with Composable Column Configuration**

Create the core datatable component using shadcn/TanStack Table with composable column headers passed as children, following the same pattern as the filter refactor.

**Key Deliverables:**
- `GalleryDataTable` component built on TanStack Table
- Composable column architecture using children pattern
- `GalleryTableColumn` component for defining columns
- Custom `GalleryTableEmpty` empty state component
- Row click handler for detail view navigation
- Infinite scroll integration
- Responsive: component not rendered on mobile

**Acceptance Criteria:**
- Datatable renders items with columns defined as children
- Each column accepts: field, label, sortable, custom format/render
- Row clicks trigger same navigation as card clicks
- Empty state displays when no items match filters
- Infinite scroll loads more items as user scrolls
- Table follows existing design system (Tailwind classes)
- Accessibility: proper ARIA labels, keyboard navigation

**UX-Specific Criteria:**
- **Loading states:**
  - Initial load: `GalleryDataTableSkeleton` with shimmer effect (10 rows, dynamic columns)
  - Infinite scroll: Bottom spinner indicator
- **Error state:** `GalleryTableError` component with retry action and clear error message
- **Empty states (2 variants):**
  - No items at all: `GalleryTableEmpty` with appropriate CTA
  - Zero results after filtering: Variant with "Clear filters" action
- **Row interactions:**
  - Hover state: Subtle background highlight (e.g., `bg-accent/5`), pointer cursor, 150ms transition
  - Focus-visible: Clear keyboard focus ring for accessibility
  - Navigating state: Reduced opacity (60%) while detail view loads
- **Text overflow:** Long content truncates with ellipsis, full text on hover via tooltip
- **Column widths:** Auto-fit with min-width constraints, horizontal scroll only if necessary
- **Table footer:** Pagination info or "Scroll for more" hint for infinite scroll

**Example Usage:**
```tsx
<Gallery mode="table">
  <GalleryFilters>
    <WishlistStoreFilter />
    <PriorityFilter />
  </GalleryFilters>

  <GalleryTableColumns>
    <Column field="title" label="Title" sortable />
    <Column field="price" label="Price" sortable format="currency" />
    <Column field="pieceCount" label="Pieces" sortable />
  </GalleryTableColumns>
</Gallery>
```

---

### Story 3: Multi-Column Sorting + Gallery Integration
**glry-1006: Datatable Multi-Column Sorting and Full Integration**

Implement multi-column sorting with priority indicators and integrate datatable view into all three target galleries (wishlist, sets, mocs).

**Key Deliverables:**
- Multi-column sort state management (max 2 columns)
- Visual priority indicators (1, 2) on sorted column headers
- Click-to-cycle sorting: ascending → descending → removed
- Promotion logic: removing column 1 promotes column 2
- Default sort by title when no user sorting
- Integration with `app-wishlist-gallery`
- Integration with `app-sets-gallery`
- Integration with MOCs gallery in `main-app`

**Acceptance Criteria:**
- Users can sort by up to 2 columns simultaneously
- Column headers show sort direction (↑/↓) and priority (1/2)
- Clicking sorted column cycles through states
- Removing primary sort promotes secondary to primary
- Default title sort applies when all user sorts removed
- Wishlist gallery displays with custom columns (store, priority, price, etc.)
- Sets gallery displays with custom columns (theme, piece count, etc.)
- MOCs gallery displays with custom columns (instructions count, etc.)
- All galleries work correctly in both grid and datatable modes

**UX-Specific Criteria:**
- **Visual sort indicators:**
  - Sort direction: Arrows (↑ ascending, ↓ descending)
  - Priority: Superscript numbers (₁ primary, ₂ secondary)
  - Example: `Title ↑₁` or `Price ↓₂`
  - Unsorted columns: Subtle neutral icon or no icon
- **Sort limit behavior:**
  - When 2 columns sorted, visually disable (dim/reduce opacity) other column headers
  - Disabled headers show tooltip on hover: "Remove a sort column first (max 2)"
  - Click on disabled header shows toast: "Maximum 2 sort columns. Remove one first."
- **Clear sorts action:**
  - "Clear sorts" button positioned near view toggle
  - Only visible when user has active sorts
  - Resets to default title sort
- **Column header interactions:**
  - Hover: Subtle background change to indicate clickable
  - Click feedback: Brief scale or ripple animation
  - Active state: Highlighted background or border
- **Accessibility:**
  - Screen reader announces: "Sorted by [column] [direction], priority [number]"
  - aria-live region announces sort changes
  - Keyboard: Enter/Space on focused header toggles sort
- **Sort state persistence:**
  - Sort preferences do NOT persist (reset on page load)
  - Always start with default title sort

## Compatibility Requirements

- [x] Existing grid view APIs remain unchanged
- [x] No database schema changes required
- [x] UI changes follow existing Tailwind/shadcn patterns
- [x] Performance impact is minimal (TanStack Table is optimized)
- [x] Filter system compatibility maintained
- [x] URL state management backward compatible

## Dependencies

**Required Before Starting:**
- **glry-1001a**: Generic Filter State Management - MUST be completed
  - Provides children-based filter architecture pattern
  - Generic filter state hooks needed for datatable integration
  - FilterContext foundation for composable components

**Optional/Nice-to-Have:**
- glry-1001b: Filter Helper Components (enhances UX but not blocking)
- glry-1001c: Advanced Column Filtering (future enhancement)
- glry-1002: Advanced Multi-Column Sort with Drag (future enhancement)

## Risk Mitigation

**Primary Risk:**
Breaking existing grid view functionality or filter behavior when introducing view mode system

**Mitigation:**
- Feature flag or conditional rendering for datatable (can be disabled per gallery)
- Comprehensive regression testing for grid view
- Story 1 isolated to view mode infrastructure only
- Stories 2-3 additive only, no modifications to grid components
- Each story includes "verify existing functionality" acceptance criteria

**Rollback Plan:**
- View mode toggle can be hidden via feature flag or removed from consuming apps
- Datatable components are opt-in, removal doesn't affect grid view
- URL state changes are backward compatible (view mode param simply ignored)
- No database migrations or API changes required

**Secondary Risk:**
Performance degradation with large datasets in datatable view

**Mitigation:**
- TanStack Table handles virtualization for large lists
- Infinite scroll limits rendered items
- Sort operations debounced
- Performance testing with 500+ item datasets in Story 3

## Definition of Done

### Functional Requirements
- [x] All three stories completed with acceptance criteria met
- [x] Existing grid view functionality verified through regression testing
- [x] Datatable integrated into wishlist, sets, and mocs galleries
- [x] View toggle works correctly on desktop/tablet
- [x] Mobile experience unchanged (grid view only)
- [x] Multi-column sorting works with visual feedback
- [x] No breaking changes to existing consumers
- [x] Documentation updated (README, component docs, Storybook stories)
- [x] All tests passing (unit, integration, E2E)

### UX Requirements
- [x] View preference persists in localStorage per gallery type
- [x] First-time user sees tooltip hint on view toggle (dismissible)
- [x] All UI states implemented (loading, error, empty, navigating)
- [x] Row hover and focus states with smooth transitions (150ms)
- [x] View switch animation using Framer Motion
- [x] Sort indicators clearly show direction + priority (↑₁, ↓₂)
- [x] "Clear sorts" button visible when sorts active
- [x] Disabled column headers when sort limit reached (with tooltip)
- [x] Touch targets meet 44x44px minimum
- [x] Text truncation with tooltip on hover for long content

### Accessibility Requirements
- [x] Keyboard navigation verified (Tab, Enter, Space, Arrow keys)
- [x] Screen reader support tested with NVDA/JAWS
- [x] ARIA labels on all interactive elements
- [x] aria-live region announces filter/sort changes
- [x] Focus-visible states clearly visible
- [x] Color contrast meets WCAG AA standards

### Performance & Quality
- [x] Performance benchmarks met (table render < 100ms for 100 items)
- [x] Infinite scroll smooth with 500+ items
- [x] No layout shift during view transitions
- [x] Images/icons optimized and lazy loaded

## Validation Checklist

### Scope Validation

- [x] Epic can be completed in 3 stories maximum ✓
- [x] No architectural documentation required ✓ (follows existing patterns)
- [x] Enhancement follows existing patterns ✓ (composable children, Zod schemas)
- [x] Integration complexity is manageable ✓ (three galleries, known interfaces)

### Risk Assessment

- [x] Risk to existing system is low ✓ (additive only, feature-flaggable)
- [x] Rollback plan is feasible ✓ (remove opt-in components)
- [x] Testing approach covers existing functionality ✓ (regression tests required)
- [x] Team has sufficient knowledge ✓ (TanStack Table, shadcn, existing gallery code)

### Completeness Check

- [x] Epic goal is clear and achievable ✓
- [x] Stories are properly scoped ✓ (1: infrastructure, 2: datatable, 3: sorting + integration)
- [x] Success criteria are measurable ✓ (view toggle works, sorting works, 3 galleries integrated)
- [x] Dependencies are identified ✓ (glry-1001a required)

---

## Story Manager Handoff

**Story Manager Handoff:**

Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running **React 19, TypeScript, shadcn/ui, TanStack Table, Tailwind CSS**
- Integration points:
  - Core package: `/packages/core/gallery`
  - Consuming apps: `app-wishlist-gallery`, `app-sets-gallery`, `main-app` (MOCs)
  - Excluded: `app-inspiration-gallery`
- Existing patterns to follow:
  - Zod-first type definitions
  - Composable children pattern (from filter refactor glry-1001a)
  - Card extension pattern (base + specific implementations)
  - shadcn/ui components from @repo/app-component-library
- Critical compatibility requirements:
  - No breaking changes to grid view
  - Must work with existing filter system
  - Mobile-first responsive design (datatable desktop/tablet only)
  - Infinite scroll pagination maintained
- Each story must include verification that existing grid view functionality remains intact

The epic should maintain system integrity while delivering **a foundational datatable view mode with composable columns and simple multi-column sorting for desktop/tablet users**.

---

---

## Future UX Enhancements (Out of Scope)

These items are intentionally excluded from this epic but documented for future consideration:

**Keyboard Shortcuts for Power Users:**
- `Alt+G`: Switch to grid view
- `Alt+T`: Switch to table view
- `Alt+C`: Clear all sorts/filters
- Implement in a separate "Keyboard Shortcuts" epic

**Advanced Column Features:**
- Column resizing (drag column borders)
- Column reordering (drag column headers)
- Column visibility toggle (show/hide columns)
- See glry-1001c for advanced column filtering with operators

**Enhanced Multi-Column Sort:**
- Increase limit from 2 to 3 columns
- Drag-and-drop to reorder sort priority
- Sort profiles (save custom sort configurations)
- See glry-1002 for advanced multi-column sort spec

**View Mode Enhancements:**
- Masonry view mode (Pinterest-style layout)
- List view mode (compact single-column)
- Split view (grid + detail panel)

---

**Epic Status:** Draft
**Created:** 2025-12-28
**Last Updated:** 2025-12-28 (UX review by Sally)
**Type:** Brownfield Enhancement
**Target Package:** `@repo/gallery`
**Estimated Effort:** 3 stories, ~2-3 sprints
