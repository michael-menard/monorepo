# FUTURE-RISKS.md - REPA-011: Non-MVP Concerns

**Story ID:** REPA-011
**Created:** 2026-02-10
**Author:** PM Dev Feasibility Reviewer (Haiku)

---

## Non-MVP Risks

### Risk 1: Active Filters Display Incompleteness

**Description:**
GalleryActiveFilters component shows chips for selected tags and theme, but NOT for build status filter. Users may expect to see build status in active filters row when not set to "all".

**Impact (if not addressed post-MVP):**
- Slightly inconsistent UX (some filters shown in active row, others not)
- Users can't click build status chip to clear it (must use dropdown)
- Minor discoverability issue for new users

**Recommended Timeline:**
- Phase 3 of REPACK (Gallery Enhancement follow-up)
- Create story: "Extend GalleryActiveFilters to support custom filters"
- Estimate: 1-2 SP

**Technical Notes:**
- Requires extending GalleryActiveFilters API to accept custom filter chips
- Would benefit all galleries using custom filters (wishlist store tabs too)
- Could be abstracted as FilterChip component in @repo/app-component-library

---

### Risk 2: Clear All Filters Incompleteness

**Description:**
Sets gallery `onClearAll` handler may not reset build status filter to "all". Depends on current implementation - if onClearAll only resets search/theme/sort, build status will persist.

**Impact (if not addressed post-MVP):**
- "Clear all" button doesn't clear ALL filters
- Users must manually reset build status dropdown
- Confusing UX if user clicks "Clear all" and build status remains

**Recommended Timeline:**
- Include in this story if easy to add
- If complex, defer to Phase 3 follow-up (1 SP max)

**Technical Notes:**
- Check current onClearAll implementation
- If simple state reset, add `setBuiltFilter('all')` to handler
- If complex, may require GalleryFilterBar API enhancement

---

### Risk 3: Build Status Filter Label Clarity

**Description:**
"Build Status" filter label may not be immediately clear to new users. Labels "Built" and "In Pieces" are informal and may not match user mental models.

**Impact (if not addressed post-MVP):**
- Slight increase in user confusion
- Users may try filter to understand what it does
- Not a blocking issue - users learn quickly through interaction

**Recommended Timeline:**
- Monitor user feedback post-launch
- Consider UX research study on filter labels
- Iterate in Phase 4 if data shows confusion

**Technical Notes:**
- Could add tooltip explaining "Filter sets by whether you've built them"
- Could add icon (🔨 hammer) to build status filter
- Could rename options for clarity (test with users first)

---

### Risk 4: Build Status Filter Reusability

**Description:**
BuildStatusFilter is app-specific to sets gallery. If other galleries want similar "status" filters (e.g., wishlist "purchased" vs "not purchased"), they'll need to duplicate or generalize the component.

**Impact (if not addressed post-MVP):**
- Code duplication if other apps need status filters
- Missed opportunity for reusable pattern
- Minor maintenance burden if multiple status filters exist

**Recommended Timeline:**
- Monitor for second use case
- If another gallery needs status filter, generalize to StatusFilter component
- Promote to @repo/gallery or @repo/app-component-library (1-2 SP)

**Technical Notes:**
- Generalized StatusFilter could accept options as props instead of hardcoding
- Would follow same pattern as AppSelect (generic dropdown with configurable options)
- Not worth doing speculatively - wait for real need

---

### Risk 5: Mobile Touch Target Sizing

**Description:**
On mobile viewports, filter dropdowns may have touch targets smaller than recommended 44x44px minimum. AppSelect handles this, but BuildStatusFilter wrapper div could interfere.

**Impact (if not addressed post-MVP):**
- Slightly harder to tap on mobile devices
- Potential accessibility issue (WCAG 2.1 Level AAA)
- Not blocking for MVP (Level AA compliance sufficient)

**Recommended Timeline:**
- Manual testing on mobile devices during implementation
- If issue found, adjust min-height/padding in BuildStatusFilter
- If no issue, close risk (likely AppSelect already compliant)

**Technical Notes:**
- Test on real iOS and Android devices (not just Chrome DevTools)
- Check both portrait and landscape orientations
- Use Chrome DevTools "Show paint flashing rectangles" to verify touch targets

---

### Risk 6: Theme Consistency Across Apps

**Description:**
With three different custom filter implementations (wishlist store tabs, inspiration custom filters, sets build status), there's no consistent pattern documented for future developers.

**Impact (if not addressed post-MVP):**
- Developers reinvent pattern each time
- Inconsistent implementation approaches
- Missed opportunities for code reuse

**Recommended Timeline:**
- Phase 3: Document CustomFilter slot pattern in design system
- Create Storybook examples of custom filter extensions
- Write ADR documenting pattern (0.5 SP documentation work)

**Technical Notes:**
- Pattern is already defined (children slot for custom filters)
- Just needs documentation and examples
- Could be part of larger design system documentation initiative

---

### Risk 7: Performance of Multiple Filters

**Description:**
As number of active filters increases, gallery re-renders may become slower. Currently not an issue with 4-5 filters, but could be noticeable with 10+ filters.

**Impact (if not addressed post-MVP):**
- Slight performance degradation on slower devices
- Not noticeable at current scale
- Could become issue if filter complexity grows

**Recommended Timeline:**
- Monitor performance metrics post-launch
- Profile render times if users report slowness
- Optimize in Phase 4 if data shows issue (1 SP performance work)

**Technical Notes:**
- Consider memoizing filter components
- Use React.memo on BuildStatusFilter if re-render performance is issue
- Profile with Chrome DevTools Performance tab
- Likely not a real issue at current scale

---

## Scope Tightening Suggestions

### Out of Scope for REPA-011 (Defer to Future Stories)

1. **Inspiration Gallery Refactoring**
   - app-inspiration-gallery has custom filter UI (not using GalleryFilterBar)
   - Larger effort, separate story (REPA-010 or future)
   - Not blocking this story

2. **Active Filters Enhancement**
   - Extending GalleryActiveFilters to show custom filter chips
   - Deferred to Phase 3 follow-up (REPA-012?)
   - Not MVP-blocking for this story

3. **Filter Presets / Saved Filters**
   - Nice-to-have feature, not related to refactoring goal
   - Separate feature story if desired
   - Complex, high effort

4. **Generalized StatusFilter Component**
   - Wait for second use case before generalizing
   - Not worth doing speculatively
   - Revisit if needed

---

## Future Requirements

### Nice-to-Have Enhancements

1. **Build Status Filter Tooltip**
   - Explain filter purpose on hover
   - Low effort, high discoverability value
   - Deferred to polish phase

2. **Build Status Filter Icon**
   - Add 🔨 hammer or 📦 box icon to label
   - Visual polish, not functional enhancement
   - Deferred to UI polish phase

3. **Filter Count Badges**
   - Show count of sets matching each build status
   - Example: "Built (42)" vs "Built"
   - Requires additional data fetching/calculation

4. **Filter Animations**
   - Framer Motion transitions when filters change
   - Polish, not functional requirement
   - Deferred to Phase 4 polish

---

## Success Metrics (Post-Launch Monitoring)

### Quantitative Metrics

1. **Filter Usage Rates**
   - Track how often build status filter is used
   - Compare to theme filter usage (baseline)
   - Target: >20% of users use build status filter

2. **Filter Combination Patterns**
   - Track common filter combinations
   - Understand user workflows
   - Inform future filter enhancements

3. **Error Rates**
   - Monitor console errors related to filter bar
   - Track broken filter states
   - Target: 0 errors post-launch

### Qualitative Metrics

1. **User Feedback**
   - Monitor support tickets about filters
   - Track user comments on build status filter
   - Identify confusion points

2. **Developer Feedback**
   - Track developer experience refactoring to shared component
   - Document pain points for future refactorings
   - Improve pattern documentation if issues arise

---

**Future Risks Document Complete**
**For Reference Only - Not Blocking MVP**
**Recommended: Monitor metrics post-launch to inform Phase 3/4 work**
