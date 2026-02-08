# INST-1102: Future Opportunities

**Story**: INST-1102 - Create Basic MOC
**Purpose**: Track non-MVP enhancements identified during Phase 1 Analysis
**Date**: 2026-02-05

---

## Overview

This document captures enhancements and features that were identified during story analysis but are explicitly OUT OF SCOPE for the MVP implementation. These items should be considered for future stories or epic iterations.

---

## Non-MVP Enhancements

### 1. Auto-Save Draft Mode

**Description**: Periodically save form state to localStorage while user is typing, not just on submission failure.

**Why Deferred**:
- MVP focuses on error recovery, not draft persistence
- Adds complexity to form state management
- WISH-2032 pattern only saves on failure

**Potential Future Story**: INST-12XX - Auto-save draft for create/edit forms

**Implementation Notes**:
- Debounced save (every 30 seconds or on blur)
- "Draft saved" indicator in UI
- Clear draft on successful submission
- Detect and offer to restore draft on page load

---

### 2. Duplicate Title Warning (Pre-Submit)

**Description**: Check for duplicate titles as user types, show warning before submission.

**Why Deferred**:
- MVP handles duplicate via API error response (AC-13)
- Pre-submit check requires additional API endpoint or debounced search
- UX improvement, not core functionality

**Potential Future Story**: INST-12XX - Real-time title uniqueness check

**Implementation Notes**:
- Debounced API call on title blur or after 500ms of typing
- `GET /mocs/check-title?title=xxx` endpoint
- Show warning icon and message if title exists
- Allow submission anyway (user may want to replace)

---

### 3. Rich Text Description Editor

**Description**: Replace plain textarea with rich text editor for description field.

**Why Deferred**:
- MVP uses simple textarea (matches wishlist pattern)
- Database schema has `descriptionHtml` field for future use
- Rich editor adds bundle size and complexity

**Potential Future Story**: INST-12XX - Rich text description with markdown/HTML

**Implementation Notes**:
- Consider TipTap or Lexical editor
- Store both `description` (plain) and `descriptionHtml`
- Preview mode toggle
- Image embedding in description (S3 integration)

---

### 4. Theme Auto-Suggest from Tags

**Description**: Automatically suggest theme based on tags entered by user.

**Why Deferred**:
- MVP has manual theme selection (11 options)
- Requires tag-to-theme mapping logic
- Nice-to-have UX enhancement

**Potential Future Story**: INST-12XX - Smart theme suggestions

**Implementation Notes**:
- Maintain tag-to-theme mapping
- Show suggested theme as user adds tags
- "Did you mean Castle theme?" prompt

---

### 5. Image Thumbnail on Create

**Description**: Allow thumbnail upload during initial MOC creation.

**Why Deferred**:
- Explicitly scoped to INST-1103 (Upload Thumbnail)
- MVP creates MOC metadata first, then adds files
- Simplifies create flow for v1

**Related Story**: INST-1103 - Upload Thumbnail (already planned)

---

### 6. Slug Customization

**Description**: Allow user to customize the URL slug instead of auto-generating from title.

**Why Deferred**:
- MVP auto-generates slug from title
- Custom slugs add validation complexity
- Edit flow (INST-1108) may address this

**Potential Future Story**: INST-12XX - Custom slug editing

**Implementation Notes**:
- Show generated slug preview
- "Edit" button to customize
- Validation: lowercase, alphanumeric, hyphens only
- Check uniqueness on change

---

### 7. Template Selection

**Description**: Start from a template instead of blank form (e.g., "Castle MOC", "Star Wars MOC").

**Why Deferred**:
- MVP is blank form creation
- Templates require template management system
- Phase 8+ feature

**Potential Future Story**: INST-30XX - MOC templates

**Implementation Notes**:
- Template library with pre-filled fields
- "Start from template" option on create page
- User-created templates from existing MOCs

---

### 8. Keyboard Shortcuts Beyond Escape

**Description**: Add keyboard shortcuts for form submission (Cmd+Enter), field navigation (Tab optimization).

**Why Deferred**:
- MVP has Escape to cancel (matches wishlist)
- Keyboard shortcuts modal is Phase 8 (INST-2043)
- Focus management is basic for MVP

**Related Story**: INST-2043 - Keyboard Shortcuts Modal

---

### 9. Batch Create Mode

**Description**: Create multiple MOCs in succession without returning to gallery.

**Why Deferred**:
- MVP is single MOC creation
- Power user feature
- Adds state management complexity

**Potential Future Story**: INST-30XX - Batch MOC creation

**Implementation Notes**:
- "Create Another" button on success
- Preserve common fields (theme, some tags)
- Counter showing "MOCs created this session"

---

### 10. Parts Count Estimate

**Description**: Show estimated parts count based on theme/complexity indicators.

**Why Deferred**:
- MVP doesn't require parts count on create
- Parts count comes from uploaded parts lists (INST-1106)
- Estimation is complex and potentially inaccurate

**Related Story**: INST-1106 - Upload Parts List

---

## Technical Debt Opportunities

### 1. TagInput Component Consolidation

**Current State**: Two TagInput components exist:
- `apps/web/app-wishlist-gallery/src/components/TagInput/`
- `apps/web/app-instructions-gallery/src/components/MocEdit/TagInput.tsx`

**Opportunity**: Extract to `@repo/app-component-library` as shared component.

**Impact**: Medium - reduces duplication, ensures consistency

**Potential Story**: COMP-XXX - Extract TagInput to component library

---

### 2. Form Recovery Hook Extraction

**Current State**: localStorage recovery pattern implemented in AddItemPage.tsx.

**Opportunity**: Extract `useFormRecovery` hook to shared package.

**Impact**: Low-Medium - promotes pattern reuse

**Potential Story**: HOOK-XXX - Extract form recovery hook

---

### 3. Theme Configuration Externalization

**Current State**: Theme list hardcoded in story/component.

**Opportunity**: Move to configuration (database, config file, or API).

**Impact**: Low - enables dynamic theme management

**Potential Story**: CONFIG-XXX - Externalize theme/category options

---

## Priority Matrix

| Enhancement | User Value | Effort | Priority |
|-------------|------------|--------|----------|
| Auto-Save Draft | High | Medium | P2 |
| Duplicate Title Warning | Medium | Low | P2 |
| Rich Text Description | Medium | High | P3 |
| Theme Auto-Suggest | Low | Medium | P4 |
| Slug Customization | Low | Low | P3 |
| Template Selection | High | High | P3 |
| Keyboard Shortcuts | Medium | Low | P2 |
| Batch Create | Low | Medium | P4 |
| Parts Count Estimate | Low | High | P5 |
| TagInput Consolidation | Low (dev) | Medium | P3 |

---

## Recommendation

For the next planning cycle after Phase 1 completion, consider prioritizing:

1. **Auto-Save Draft** - High user value, prevents data loss
2. **Duplicate Title Warning** - Low effort, improves UX
3. **Keyboard Shortcuts** - Pairs well with INST-2043

These three enhancements provide the best value-to-effort ratio and build on MVP patterns without requiring significant architectural changes.

---

**Document maintained by**: elab-analyst agent
**Last updated**: 2026-02-05
