# Future Opportunities - INST-1108

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No concurrent edit detection (last write wins) | Medium | High | Future story: Add `version` field to mocs table + optimistic locking in PATCH endpoint. Service checks version match before update, returns 409 Conflict if stale. Frontend shows conflict resolution UI. Requires database migration, service layer changes, frontend conflict UI. Effort: 5-8 hours (1-2 points). |
| 2 | No validation on unchanged form submission | Low | Low | Frontend currently allows saving form with no changes (AC-19 says "changed fields only" but doesn't enforce prevention of no-op saves). Enhancement: Disable Save button when form values equal initialValues. Compare form state to initialValues on every change. Show "No changes to save" tooltip on disabled button. Effort: 1 hour. |
| 3 | No rate limiting on PATCH endpoint | Medium | Medium | Backend PATCH /mocs/:id has no rate limiting (story AC-12 only covers auth and validation errors). Risk: User could spam updates. Enhancement: Add rate limit middleware (e.g., 10 updates per minute per user). Already planned in Phase 2 story INST-1203 (Rate Limiting & Observability). Defer to that story. |
| 4 | No audit trail for metadata changes | Low | High | Story explicitly excludes edit history (Non-Goals line 53). Enhancement: Add moc_edit_history table to track who changed what when. Requires schema change, history write on every update, admin UI to view history. Defer to post-MVP moderation features. Effort: 8-12 hours (2-3 points). |
| 5 | No partial failure handling for cache invalidation | Low | Medium | RTK Query cache invalidation (AC-32, AC-33) fails silently if refetch fails after successful PATCH. User sees stale data until manual refresh. Enhancement: Add refetch error handling in mutation callbacks. Show toast "Update saved, but failed to refresh. Please reload." with Reload button. Effort: 2 hours. |
| 6 | Form recovery overwrites manual edits on return | Low | Low | Form recovery (AC-23) always shows recovery toast if localStorage draft exists, even if user intentionally discarded changes. Edge case: User edits, error occurs, user clicks Cancel (intending to discard), returns to edit page, recovery prompt appears. Enhancement: Clear localStorage draft on Cancel action. Add check: "If user explicitly cancelled, don't offer recovery." Effort: 1 hour. |
| 7 | No slug regeneration on title change | Low | Medium | Story excludes slug editing (Non-Goals line 56: "Slug is auto-generated from title, not directly editable"). However, if user changes title from "Castle MOC" to "Medieval Castle", slug remains "castle-moc" (stale). Enhancement: Backend regenerates slug on title change OR frontend shows "New slug will be: medieval-castle" preview. Risk: URL change breaks external links. Consider slug redirect strategy. Defer to future slug management story. Effort: 3-5 hours. |
| 8 | No field-level dirty tracking for form recovery | Low | Medium | Form recovery (AC-23) saves entire form state to localStorage on error. Enhancement: Track dirty fields only. If user only changed title, only save title to draft. Reduces localStorage size and avoids restoring unchanged fields. Implementation: Use react-hook-form's `dirtyFields` metadata. Effort: 2 hours. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Optimistic UI updates | High | Medium | Story explicitly defers optimistic updates (Non-Goals line 52). User experience enhancement: Immediately update cache on submit, rollback on error. Users see instant feedback instead of waiting for backend response. Implementation: RTK Query `optimisticUpdate` + rollback on mutation error. Risk: User sees success UI before backend validates (could show invalid state briefly). Recommendation: Implement after MVP proven stable. Effort: 3-4 hours. |
| 2 | Unsaved changes navigation guard | High | Low | Deferred to INST-1200 (Non-Goals line 51). User experience polish: Warn user before navigating away with unsaved changes. Implementation: React Router `beforeunload` listener + confirmation modal. Reuse DeleteConfirmationModal from INST-1023. Already planned in Phase 2. Effort: 2-3 hours (included in INST-1200). |
| 3 | Auto-save drafts during editing | Medium | High | Proactive form recovery: Save form state to localStorage on every change (debounced 2s). Users never lose work, even without error. Enhancement over current error-triggered recovery (AC-23). Implementation: Add debounced effect on form state change. Clear on successful save. Show "Draft saved" indicator. Effort: 3-4 hours. |
| 4 | Keyboard shortcut discoverability | Medium | Low | Story implements Cmd+Enter (save) and Escape (cancel) shortcuts (AC-26, AC-27) but doesn't show them in UI. Enhancement: Add subtle keyboard shortcut hints in button labels or tooltips. "Save (⌘↵)" button text. Or add "Keyboard Shortcuts" help icon with modal listing all shortcuts. Aligns with Phase 8 story INST-2043 (Keyboard Shortcuts Modal). Effort: 1-2 hours. |
| 5 | Rich text editor for description | Medium | High | Current description field is plain textarea (AC-18). Enhancement: Replace with rich text editor (e.g., Tiptap, Lexical) for formatted descriptions. Users can add bold, italic, lists, links. Backend stores HTML or Markdown. Risk: Schema change (description type), XSS sanitization required, editor bundle size. Defer to post-MVP content editing features. Effort: 12-16 hours (3-4 points). |
| 6 | Theme autocomplete with icons | Low | Medium | Current theme select is plain dropdown (AC-18). Enhancement: Add theme icons (🏰 Castle, 🚀 Space, 🏙️ City) and autocomplete search in select. Improve discoverability of 20+ themes. Implementation: Upgrade Select component to use Combobox pattern from shadcn/ui. Add theme icon mapping. Effort: 3-4 hours. |
| 7 | Tag suggestions from existing MOCs | Medium | Medium | Current tags input is free-form (AC-18). Enhancement: Autocomplete tag suggestions from user's existing tags + popular community tags. Improves tag consistency and discoverability. Implementation: Backend endpoint GET /mocs/tags?userId=X (returns user's tags + top 20 global tags). Frontend autocomplete on TagInput component. Effort: 4-5 hours. |
| 8 | Preview changes before saving | Medium | High | Enhancement: Add "Preview" button that shows read-only detail page with updated metadata before committing changes. Users can verify title/description/tags look correct in context. Implementation: New preview modal or route /mocs/:id/edit/preview. Render MocDetailPage with form values (not saved MOC data). Effort: 6-8 hours (1-2 points). |
| 9 | Diff view for changes | Low | High | Power user feature: Show side-by-side diff of original vs edited values before saving. "Title changed from 'Castle MOC' to 'Medieval Castle'". Useful for reviewing changes. Implementation: Create DiffView component, compare initialValues to current form state, highlight changed fields. Effort: 5-6 hours. |
| 10 | Bulk edit tags across multiple MOCs | Low | High | Deferred (Non-Goals line 54: "Bulk edit multiple MOCs"). Future enhancement: Select multiple MOCs in gallery, edit tags in batch. Useful for adding theme tags to 10+ MOCs at once. Implementation: Gallery multi-select + bulk PATCH endpoint. Effort: 10-12 hours (2-3 points). |

## Categories

### Edge Cases
- **Gap #2**: No validation on unchanged form submission (no-op save allowed)
- **Gap #6**: Form recovery overwrites manual edits on return to page
- **Gap #7**: Slug not regenerated when title changes (stale URLs)

### UX Polish
- **Enhancement #1**: Optimistic UI updates (instant feedback)
- **Enhancement #2**: Unsaved changes navigation guard (prevent accidental loss)
- **Enhancement #3**: Auto-save drafts during editing (proactive recovery)
- **Enhancement #4**: Keyboard shortcut discoverability (hints in UI)
- **Enhancement #8**: Preview changes before saving (verify in context)
- **Enhancement #9**: Diff view for changes (review before save)

### Performance
- **Gap #5**: Partial failure handling for cache invalidation (refetch error recovery)
- **Gap #8**: Field-level dirty tracking for form recovery (optimize localStorage size)

### Observability
- **Gap #3**: No rate limiting on PATCH endpoint (defer to INST-1203)
- **Gap #4**: No audit trail for metadata changes (defer to post-MVP)

### Integrations
- **Gap #1**: No concurrent edit detection (future: optimistic locking)
- **Enhancement #5**: Rich text editor for description (formatted content)
- **Enhancement #6**: Theme autocomplete with icons (improve UX)
- **Enhancement #7**: Tag suggestions from existing MOCs (autocomplete)
- **Enhancement #10**: Bulk edit tags across multiple MOCs (power user feature)

---

## Prioritization Guidance

**Implement Next (Post-MVP Phase 2):**
1. **Enhancement #2**: Unsaved changes guard (already planned in INST-1200, high impact, low effort)
2. **Enhancement #1**: Optimistic updates (high impact, medium effort, improves perceived performance)
3. **Enhancement #4**: Keyboard shortcut hints (low effort, improves discoverability)
4. **Gap #2**: Disable Save on unchanged form (low effort, prevents confusion)

**Defer to Later Phases:**
- **Gap #1**: Concurrent edit detection (high effort, low frequency of conflicts in personal use)
- **Gap #3**: Rate limiting (already planned in INST-1203)
- **Enhancement #5**: Rich text editor (high effort, schema change required)
- **Enhancement #10**: Bulk edit (high effort, niche power user feature)

**Monitor and Decide:**
- **Gap #7**: Slug regeneration (needs product decision on URL stability vs freshness)
- **Enhancement #8**: Preview changes (nice-to-have, but adds complexity)
