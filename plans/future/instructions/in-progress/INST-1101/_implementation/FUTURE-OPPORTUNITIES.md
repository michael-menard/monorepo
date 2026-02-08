# Future Opportunities: INST-1101

**Story:** View MOC Details
**Date:** 2026-02-06

This document captures **non-blocking gaps** and **enhancement opportunities** identified during Phase 1 Analysis. These items are NOT required for MVP but represent valuable improvements for future iterations.

---

## Edge Cases

### 1. Stale Data Handling
**Description:** User views detail page while another tab/device modifies the MOC.

**Current State:** No refresh mechanism specified.

**Opportunity:**
- Add `refetchOnFocus` to RTK Query config
- Display "Data updated" toast with refresh button
- WebSocket notifications for cross-device sync (advanced)

**Benefit:** Prevents user confusion when data changes externally.

**Story Candidate:** INST-1201 (Session Persistence & Error Recovery)

---

### 2. Partial File Load Failure
**Description:** MOC metadata loads but file list fails (e.g., S3 presigned URL generation error).

**Current State:** AC-11 only covers invalid mocId (404). No spec for partial failures.

**Opportunity:**
- Display MOC metadata with "Files unavailable" message
- Retry button for file list
- Degrade gracefully: show metadata, hide file sections

**Benefit:** User can still view basic MOC info even if files fail.

**Story Candidate:** INST-1202 (Error Recovery Flows)

---

### 3. Card Order Sync Across Devices
**Description:** User reorders cards on desktop, then views on mobile.

**Current State:** localStorage is device-specific.

**Opportunity:**
- Store card preferences in `moc_preferences` table
- Sync across devices via API
- Merge strategy: last-write-wins or per-device preferences

**Benefit:** Consistent experience across devices.

**Story Candidate:** INST-3062 (User Preferences Sync)

---

### 4. Large File Count Performance
**Description:** MOC with 50+ files (instructions, gallery images) may cause slow page load.

**Current State:** All files loaded in single request.

**Opportunity:**
- Paginate file list (e.g., 20 per page)
- Virtual scrolling for large lists
- Lazy-load gallery images

**Benefit:** Improved performance for power users.

**Story Candidate:** INST-3080 (Large MOC Optimization)

---

## UX Polish

### 5. Card Drag Visual Feedback
**Description:** Enhance drag-drop UX with animations and ghost images.

**Current State:** AC-7 specifies draggable cards but no visual spec.

**Opportunity:**
- Drop shadow during drag
- Smooth reorder animation (Framer Motion)
- Ghost/placeholder showing drop target
- Haptic feedback on mobile (navigator.vibrate)

**Benefit:** More polished, professional drag-drop experience.

**Story Candidate:** INST-2044 (UI Polish - Animations)

---

### 6. Empty State for Missing Files
**Description:** MOC with no files should show encouraging empty state.

**Current State:** Dashboard cards render but may show empty lists.

**Opportunity:**
- "No instructions yet" illustration with "Add Instructions" CTA
- "No parts list" with "Upload Parts List" CTA
- Link to upload flows (INST-1104, INST-1106)

**Benefit:** Guides user to next action, reduces confusion.

**Story Candidate:** INST-2045 (Empty State Illustrations)

---

### 7. Breadcrumb Navigation
**Description:** Help user understand location in app hierarchy.

**Current State:** No breadcrumb spec. User may get lost.

**Opportunity:**
- Breadcrumb: Home > My MOCs > [MOC Title]
- Reuse EnhancedBreadcrumb from main-app
- Mobile: Collapse to back button

**Benefit:** Improved navigation, especially on mobile.

**Story Candidate:** INST-2046 (Navigation Enhancements)

---

### 8. Shareable Link with Preview
**Description:** Allow users to share MOC detail page with others.

**Current State:** Detail page requires authentication.

**Opportunity:**
- Public share link with token
- Open Graph tags for social media previews
- Read-only view for non-owners

**Benefit:** Social sharing, community building.

**Story Candidate:** INST-3090 (Public MOC Sharing)

---

## Performance

### 9. Prefetch MOC Data on Gallery Hover
**Description:** Reduce perceived load time by prefetching before click.

**Current State:** Data fetched only on navigation.

**Opportunity:**
- RTK Query `prefetch` on gallery card hover
- Conditional: only on desktop (not mobile)
- Cancel prefetch if hover ends before timeout

**Benefit:** Instant page load feel for desktop users.

**Story Candidate:** INST-3081 (Performance - Prefetching)

---

### 10. Image Optimization
**Description:** MOC thumbnails and gallery images may be large.

**Current State:** Images served as-is from S3.

**Opportunity:**
- Serve WebP with JPEG fallback
- Responsive images with srcset
- CDN caching headers
- Image resizing on upload (INST-2033)

**Benefit:** Faster page load, lower bandwidth costs.

**Story Candidate:** INST-2033 (Image Optimization)

---

### 11. Lazy Load Dashboard Cards
**Description:** Defer loading of below-fold cards until scroll.

**Current State:** All cards render immediately.

**Opportunity:**
- Intersection Observer for lazy render
- Skeleton loaders for off-screen cards
- Prioritize above-fold cards

**Benefit:** Faster initial page render for MOCs with many files.

**Story Candidate:** INST-3082 (Lazy Load Optimization)

---

## Observability

### 12. Page Load Metrics
**Description:** Track detail page performance for monitoring.

**Current State:** No observability spec.

**Opportunity:**
- Log time-to-interactive (TTI)
- Track API response times
- Monitor card reorder events
- Error rate tracking for file loads

**Benefit:** Data-driven performance optimization.

**Story Candidate:** INST-1203 (Rate Limiting & Observability)

---

### 13. User Interaction Analytics
**Description:** Understand how users interact with detail page.

**Current State:** No analytics spec.

**Opportunity:**
- Track which dashboard cards users interact with most
- Monitor card reorder frequency
- A/B test card default order
- Heatmap analysis for mobile layout

**Benefit:** Inform future UX decisions with data.

**Story Candidate:** INST-3091 (User Analytics)

---

## Integrations

### 14. Related MOCs Recommendation
**Description:** Suggest similar MOCs based on theme, tags, or parts.

**Current State:** Detail page is isolated, no discovery.

**Opportunity:**
- "Similar MOCs" section in sidebar
- Algorithm: theme match > tag overlap > part similarity
- Clickable cards navigate to other MOC details

**Benefit:** Encourages exploration, increases engagement.

**Story Candidate:** INST-3092 (MOC Recommendations)

---

### 15. Parts Inventory Integration
**Description:** Show which parts user already owns from inventory.

**Current State:** Parts list is static file, no inventory link.

**Opportunity:**
- Parse parts list (INST-3040)
- Cross-reference with user inventory
- Highlight owned parts in green
- Generate shopping list for missing parts (INST-2042)

**Benefit:** Helps user decide if they can build the MOC.

**Story Candidate:** INST-2041 (Inventory Integration)

---

### 16. Export to PDF
**Description:** Allow user to export MOC summary as PDF.

**Current State:** Detail page is web-only.

**Opportunity:**
- "Export as PDF" button
- Server-side rendering of detail page
- Include metadata, stats, file list
- Watermark with user name

**Benefit:** Offline viewing, archival, printing.

**Story Candidate:** INST-3093 (PDF Export)

---

## Technical Debt Opportunities

### 17. Card State Machine
**Description:** Dashboard card collapse/expand state could be modeled with XState.

**Current State:** Likely ad-hoc useState management.

**Opportunity:**
- XState machine for card states: collapsed, expanded, dragging, dropped
- Clearer state transitions
- Easier testing of state logic

**Benefit:** More maintainable, testable card state.

**Story Candidate:** Refactor during INST-2044 (UI Polish)

---

### 18. Responsive Layout with CSS Grid
**Description:** Use modern CSS Grid for responsive layout instead of 12-column Tailwind.

**Current State:** AC-2 specifies 12-column grid with 4/8 split.

**Opportunity:**
- CSS Grid with `grid-template-areas`
- Easier responsive breakpoints
- Less Tailwind class clutter

**Benefit:** Cleaner code, more maintainable layout.

**Story Candidate:** Refactor during INST-2046 (Layout Refactor)

---

### 19. Shared Loading Skeleton Component
**Description:** Extract loading skeleton to @repo/ui for reuse.

**Current State:** AC-10 specifies loading skeleton, likely page-specific.

**Opportunity:**
- Create `DetailPageSkeleton` in @repo/ui
- Parameterize: sidebar columns, main columns, card count
- Reuse across detail pages (sets, wishlist, instructions)

**Benefit:** DRY principle, consistent loading UX.

**Story Candidate:** Create during INST-2046 (Loading State Consistency)

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Edge Cases | 4 |
| UX Polish | 4 |
| Performance | 3 |
| Observability | 2 |
| Integrations | 3 |
| Technical Debt | 3 |
| **Total Opportunities** | **19** |

---

## Prioritization Guidance

**High Value, Low Effort:**
- Empty state for missing files (#6)
- Page load metrics (#12)
- Shared loading skeleton (#19)

**High Value, High Effort:**
- Shareable link with preview (#8)
- Parts inventory integration (#15)
- Export to PDF (#16)

**Low Priority:**
- Card order sync across devices (#3)
- Related MOCs recommendation (#14)
- User interaction analytics (#13)

**Post-MVP:**
- All opportunities deferred until core vertical slices complete
- Revisit during Phase 2 (UX & Reliability) or later phases
