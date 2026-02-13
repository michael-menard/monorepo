# Future Opportunities - BUGF-003

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No undo functionality for delete operation | Low | Medium | Listed in Non-Goals as "future enhancement, not MVP". Users can re-add deleted sets if needed. Consider implementing as BUGF-031: "Implement Undo for Delete Operations Across Galleries" |
| 2 | No bulk delete operations | Low | Medium | Listed in Non-Goals as "single delete only". Useful for cleaning up multiple test sets at once. Consider as future enhancement for power users. |
| 3 | No real-time conflict detection if set edited by another session | Low | High | Listed in Non-Goals. Edge case - single user typically only has one active session. Would require WebSocket infrastructure. |
| 4 | No audit log of changes to set metadata | Low | Medium | Listed in Non-Goals. Useful for tracking what changed and when, but not critical for MVP. Could be addressed as part of broader audit logging feature. |
| 5 | Image reordering not supported in edit page | Medium | Medium | Listed in Non-Goals as "images can be deleted via existing delete image API but not reordered". Users can delete and re-upload to change order, but not ideal UX. |
| 6 | Validation of duplicate set numbers | Low | Low | Listed in Non-Goals as "backend concern". Frontend could add client-side warning before submission. Backend should handle authoritative validation. |
| 7 | Edit page image upload flow differs from add page | Low | Low | Listed in Non-Goals as "keep separate for now". Potential to unify the two flows for consistency, but requires refactoring both pages. |
| 8 | No conversion from wishlist item to set | Medium | High | Listed in Non-Goals as "separate feature". Common user journey (wishlist → purchase → set) currently requires manual data entry. Consider as BUGF-032: "Implement Wishlist to Set Conversion Flow" |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Optimistic update for set mutations | Medium | Low | Story implements optimistic update for delete (AC-3, AC-28) but not for update mutation. Could improve perceived performance by optimistically updating detail page during save. |
| 2 | Auto-save draft functionality | Medium | Medium | Currently relies on browser "unsaved changes" warning. Could implement localStorage-based auto-save to preserve work across browser crashes or accidental closes. |
| 3 | Keyboard shortcut for save (Cmd/Ctrl+S) | Low | Low | Edit page could capture Cmd+S / Ctrl+S to save instead of browser save dialog. Small UX improvement for power users. |
| 4 | Field-level validation feedback during typing | Low | Medium | Story specifies "inline validation on blur". Real-time validation feedback (e.g., "Set number must be 5 digits") could improve UX but may be distracting. |
| 5 | Change preview before saving | Low | High | Show diff of what changed before committing update. Useful for large edits but adds UI complexity. |
| 6 | Batch edit functionality | High | High | Edit multiple sets at once (e.g., change theme for 10 sets). Significant feature requiring new UI paradigm. |
| 7 | Edit history / version control | Medium | High | Track all edits with ability to revert to previous version. Requires audit log infrastructure (see Gap #4). |
| 8 | Mobile-optimized edit page layout | Medium | Medium | Story specifies responsive layout ("stack vertically on mobile") but may benefit from mobile-specific optimizations for smaller screens. |
| 9 | Duplicate set functionality | Medium | Low | Clone existing set as starting point for new set. Useful when adding multiple similar sets (e.g., different color variants). |
| 10 | Smart defaults based on set number | Medium | High | Auto-populate theme, piece count, release date by looking up official LEGO set data when set number entered. Requires external LEGO API integration (e.g., Rebrickable, Brickset). |

## Categories

### Edge Cases
- Gaps #3, #4: Concurrent edit conflicts, audit logging
- Gap #6: Duplicate set number validation

### UX Polish
- Enhancement #2: Auto-save drafts
- Enhancement #3: Keyboard shortcuts
- Enhancement #4: Real-time validation
- Enhancement #5: Change preview
- Enhancement #8: Mobile optimization
- Enhancement #9: Duplicate set

### Performance
- Enhancement #1: Optimistic updates for all mutations

### Observability
- Gap #4: Audit log of changes

### Integrations
- Gap #8: Wishlist to Set conversion flow
- Enhancement #10: External LEGO API integration for smart defaults

### Future Features
- Gap #1: Undo functionality
- Gap #2: Bulk delete
- Gap #5: Image reordering in edit page
- Enhancement #6: Batch edit functionality
- Enhancement #7: Edit history / version control
