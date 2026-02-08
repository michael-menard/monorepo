# Future Opportunities - WISH-2015

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Real-time multi-tab sync via storage event | Low | Low | Add storage event listener to sync sort mode across open tabs in real-time |
| 2 | localStorage pollution cleanup strategy | Low | Low | Document or implement cleanup of old/deprecated localStorage keys during Phase 6 |
| 3 | Server-side preference sync for multi-device users | Medium | High | Store user preferences in database for cross-device sync (deferred to Phase 6) |
| 4 | localStorage performance monitoring | Low | Low | Track localStorage quota usage and read/write latency in analytics |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Persist other filter/view state (store filter, search query, pagination) | Medium | Medium | Extend localStorage persistence to full filter state for seamless experience |
| 2 | Sort history or "recently used sorts" | Low | Low | Track last N sort selections for quick access via dropdown |
| 3 | Sort mode analytics tracking | Low | Low | Track which sort modes are most popular to guide future feature development |
| 4 | User preference export/import | Low | Medium | Allow users to export/import localStorage preferences across browsers/devices |
| 5 | Progressive localStorage quota management | Low | Medium | Implement LRU eviction strategy if localStorage quota nears limit |
| 6 | Conditional persistence based on user setting | Low | Low | Add "Remember my preferences" toggle in settings |
| 7 | Migration strategy for localStorage schema changes | Low | Medium | Document versioning strategy for localStorage keys to handle breaking changes |
| 8 | Visual indicator for persisted preferences | Low | Low | Show subtle badge or icon when preferences are loaded from localStorage |

## Categories

### Edge Cases
- **#1**: Real-time multi-tab sync - Nice UX polish but not MVP-critical (users can refresh)
- **#2**: localStorage pollution cleanup - Maintenance concern for Phase 6

### UX Polish
- **#6**: Conditional persistence toggle - Power user feature
- **#8**: Visual indicator for persisted state - Subtle feedback improvement

### Performance
- **#4**: localStorage performance monitoring - Analytics for optimization
- **#5**: Progressive quota management - Edge case (rare to hit quota)

### Observability
- **#3**: Sort mode analytics - Product insights for engagement
- **#4**: Performance monitoring - Operational insights

### Integrations
- **#2**: Server-side preference sync - Multi-device feature (Phase 6)
- **#4**: Export/import preferences - Cross-browser portability

### Architecture
- **#7**: Migration strategy for schema changes - Long-term maintenance
- **#1**: Persist other filter/view state - Broader persistence strategy

---

## Follow-up Story Suggestions

### WISH-2015a: Real-time Multi-Tab Sync

**Description**: Add storage event listener to sync sort mode (and other persisted state) across open tabs in real-time. When user changes sort in Tab A, Tab B immediately updates dropdown and re-fetches.

**Scope**:
- Add `window.addEventListener('storage', ...)` to detect external localStorage changes
- Update React state when storage event detected
- Trigger RTK Query refetch if sort mode changed
- Debounce rapid storage events to prevent thrashing

**Impact**: Low (nice-to-have UX polish)
**Effort**: Low (1-2 points)
**Depends On**: WISH-2015

---

### WISH-2015b: Full Filter State Persistence

**Description**: Extend localStorage persistence from sort mode to full filter state: store filter, search query, selected tags, pagination page.

**Scope**:
- Persist all `FilterProvider` state to localStorage
- Restore full filter state on page load
- Handle schema changes (filter options may change)
- Add "Reset to defaults" button to clear all persisted filters

**Impact**: Medium (improves user experience for frequent visitors)
**Effort**: Medium (2-3 points)
**Depends On**: WISH-2015

---

### WISH-2015c: Sort History / Recently Used Sorts

**Description**: Track last 3-5 sort selections and display as "Recent" section in sort dropdown for quick access.

**Scope**:
- Track sort history in localStorage (array of recent sort modes)
- Display "Recent" separator in dropdown with last 3 used sorts
- Update history on each sort selection (LRU strategy)
- Limit to 3-5 recent items to avoid clutter

**Impact**: Low (power user feature)
**Effort**: Low (1-2 points)
**Depends On**: WISH-2015

---

### WISH-2015d: User Preferences Settings Page

**Description**: Add settings page for managing persisted preferences with toggles, export/import, and reset options.

**Scope**:
- Settings page UI with sections: Sort Preferences, Filter Preferences, View Preferences
- Toggles: "Remember sort mode", "Remember filters", "Remember view mode"
- Export/Import preferences as JSON file
- Reset all preferences button with confirmation

**Impact**: Low (power user feature)
**Effort**: Medium (3-4 points)
**Depends On**: WISH-2015, WISH-2015b

---

## Notes

All opportunities are **non-MVP** and deferred to future phases. WISH-2015 as scoped is complete for MVP.

Key themes for future work:
1. **Broader Persistence**: Extend to filters, pagination, view mode
2. **Multi-Device Sync**: Server-side storage for cross-device preferences (Phase 6)
3. **Analytics**: Track sort mode usage patterns for product insights
4. **Power User Features**: Sort history, export/import, granular control
