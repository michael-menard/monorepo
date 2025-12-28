# Story Consolidation Prompts

This document contains copy-paste-ready prompts for consolidating epic stories into more cohesive, AI-friendly implementation units.

---

## How to Use This Document

### Quick Start

1. **Choose an epic** to consolidate (Epic 5: Inspiration or Epic 7: Sets)
2. **Find the prompt section** below (Section 2 or Section 3)
3. **Copy the entire prompt** from the markdown code block
4. **Paste into Claude Code** and run it
5. **Review the created stories** and adjust as needed

### When to Run These Prompts

Run these prompts **after** the foundation work is complete:
- ✅ API Portability Phase 1-2 done (hskp-2000, hskp-2001)
- ✅ MCP servers configured (hskp-2002, hskp-2003)
- ✅ Scaffold skills available (hskp-2005, hskp-2006)

### What the Prompts Do

Each prompt will:
1. Read all existing stories in the epic directory
2. Create new consolidated stories (numbered 2xxx)
3. Create/update `IMPLEMENTATION-ORDER.md`
4. **Preserve** original stories (does not delete them)

### After Running

1. Review the new stories for accuracy
2. Archive old 1xxx stories when satisfied
3. Update any cross-references in other documents
4. Begin implementation using `/implement` or `/develop`

### Example: Epic 6 Wishlist (Already Done)

The Wishlist epic was consolidated as a proof-of-concept:
- **Before**: 13 stories (wish-1000 through wish-1012)
- **After**: 7 stories (wish-2000 through wish-2006)
- **Location**: `docs/stories/epic-6-wishlist/`

Use the wish-2xxx stories as templates for the consolidation pattern.

---

## 1. Introduction: The Consolidation Philosophy

### Why Consolidate Stories?

When working with AI automation tools (like `/implement` or `/scaffold-feature`), having many small, fragmented stories creates friction:

- **Context switching**: Each story requires loading new context
- **Dependency chains**: Many small stories create complex dependency graphs
- **Incomplete features**: A story that creates an endpoint without its UI isn't testable end-to-end
- **Parallel execution blockers**: Fine-grained dependencies prevent parallel work

### The Consolidation Pattern

**Before (Epic 6 Wishlist)**: 13 stories
**After**: 7 consolidated stories (46% reduction)

The pattern organizes stories into implementation phases:

| Phase | Type | Description |
|-------|------|-------------|
| 1 | **Foundation** | Database schema, Zod types, migrations |
| 2 | **Vertical Slice** | End-to-end MVP (API + UI) for core read operations |
| 3 | **Core Features** | CRUD operations (can run in parallel) |
| 4 | **Advanced Features** | Complex interactions, integrations |
| 5 | **Polish** | Empty states, loading states, error handling |
| 6 | **Accessibility** | Keyboard nav, screen reader, WCAG compliance |

### Consolidation Benefits

1. **Cohesive deliverables**: Each story delivers a testable feature
2. **Reduced context switching**: Fewer, larger stories with complete context
3. **Parallel execution**: Independent features can be worked simultaneously
4. **Better AI performance**: LLMs work better with complete feature context
5. **Clearer dependencies**: Simpler dependency graph

### Naming Convention

- Original stories: `{prefix}-1xxx` (e.g., `insp-1000`, `sets-1001`)
- Consolidated stories: `{prefix}-2xxx` (e.g., `insp-2000`, `sets-2001`)
- Preserves original stories for reference; new stories replace them

---

## 2. Epic 5: Inspiration Gallery Consolidation Prompt

Copy and paste the following prompt into Claude Code to consolidate Epic 5 stories:

---

```markdown
# Consolidate Epic 5: Inspiration Gallery Stories

## Context

Epic 5 currently has 56 granular stories that need consolidation into approximately 20-25 cohesive stories for efficient AI-driven implementation.

## PRD Reference

Read the Epic 5 PRD at: `/docs/prd/epic-5-inspiration-gallery.md`

## Current Stories (56 files)

### Legacy Stories (6 files - older format)
- insp-1000-inspiration-gallery-scaffolding.md
- insp-1001-inspiration-card-component.md
- insp-1002-inspiration-api-endpoints.md
- insp-1003-inspiration-upload-page.md
- insp-1004-inspiration-collection-management.md
- insp-1005-inspiration-link-to-moc.md

### New Stories (50 files - granular format)
- insp-1000.database-schema.md
- insp-1001.zod-schemas-shared-types.md
- insp-1002.s3-presign-infrastructure.md
- insp-1003.create-inspiration-endpoint.md
- insp-1004.list-inspirations-endpoint.md
- insp-1005.gallery-page-scaffolding.md
- insp-1006.inspiration-card-component.md
- insp-1007.get-inspiration-endpoint.md
- insp-1008.inspiration-detail-view.md
- insp-1009.upload-modal-single-image.md
- insp-1010.update-inspiration-endpoint.md
- insp-1011.edit-inspiration-modal.md
- insp-1012.delete-inspiration-endpoint.md
- insp-1013.delete-inspiration-ui.md
- insp-1014.create-album-endpoint.md
- insp-1015.create-album-modal.md
- insp-1016.list-albums-endpoint.md
- insp-1017.album-card-component.md
- insp-1018.get-album-contents-endpoint.md
- insp-1019.album-view-page.md
- insp-1020.update-album-endpoint.md
- insp-1021.edit-album-modal.md
- insp-1022.delete-album-endpoint.md
- insp-1023.delete-album-ui.md
- insp-1024.add-inspiration-to-album-endpoint.md
- insp-1025.add-to-album-ui.md
- insp-1026.remove-from-album-endpoint.md
- insp-1027.remove-from-album-ui.md
- insp-1028.nested-albums-endpoint.md
- insp-1029.album-breadcrumb-navigation.md
- insp-1030.multi-image-upload-modal.md
- insp-1031.create-as-album-flow.md
- insp-1032.upload-progress-partial-failure.md
- insp-1033.drag-and-drop-reorder.md
- insp-1034.keyboard-reorder.md
- insp-1035.stack-to-create-album-gesture.md
- insp-1036.stack-undo-toast.md
- insp-1037.multi-select-mode.md
- insp-1038.bulk-operations-menu.md
- insp-1039.link-inspiration-to-moc-endpoint.md
- insp-1040.link-album-to-moc-endpoint.md
- insp-1041.moc-link-ui.md
- insp-1042.unlink-moc.md
- insp-1043.empty-states.md
- insp-1044.loading-states.md
- insp-1045.error-handling.md
- insp-1046.keyboard-navigation.md
- insp-1047.screen-reader-support.md
- insp-1048.tag-management-integration.md
- insp-1049.onboarding-tooltips.md
- insp-1050.e2e-test-suite.md

## Proposed Consolidation Plan (Target: 22 stories)

### Phase 1: Foundation (2 stories)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2000 | Database Schema & Shared Types | insp-1000.database-schema, insp-1001.zod-schemas-shared-types |
| insp-2001 | S3 Upload Infrastructure | insp-1002.s3-presign-infrastructure |

### Phase 2: Vertical Slice (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2002 | Inspiration Gallery MVP | insp-1004.list-inspirations, insp-1005.gallery-page-scaffolding, insp-1006.inspiration-card-component, insp-1007.get-inspiration-endpoint, insp-1008.inspiration-detail-view |

### Phase 3: Core Inspiration CRUD (3 stories - can run in parallel)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2003 | Upload Single Inspiration | insp-1003.create-inspiration-endpoint, insp-1009.upload-modal-single-image |
| insp-2004 | Edit Inspiration | insp-1010.update-inspiration-endpoint, insp-1011.edit-inspiration-modal |
| insp-2005 | Delete Inspiration | insp-1012.delete-inspiration-endpoint, insp-1013.delete-inspiration-ui |

### Phase 4: Album Core Features (4 stories - can run in parallel after Phase 3)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2006 | Create Album | insp-1014.create-album-endpoint, insp-1015.create-album-modal |
| insp-2007 | Album Gallery & Card | insp-1016.list-albums-endpoint, insp-1017.album-card-component, insp-1018.get-album-contents-endpoint, insp-1019.album-view-page |
| insp-2008 | Edit Album | insp-1020.update-album-endpoint, insp-1021.edit-album-modal |
| insp-2009 | Delete Album | insp-1022.delete-album-endpoint, insp-1023.delete-album-ui |

### Phase 5: Album Membership (2 stories)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2010 | Add/Remove from Album | insp-1024.add-inspiration-to-album-endpoint, insp-1025.add-to-album-ui, insp-1026.remove-from-album-endpoint, insp-1027.remove-from-album-ui |
| insp-2011 | Nested Albums & Breadcrumbs | insp-1028.nested-albums-endpoint, insp-1029.album-breadcrumb-navigation |

### Phase 6: Multi-Image Upload (2 stories)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2012 | Multi-Image Upload Modal | insp-1030.multi-image-upload-modal, insp-1031.create-as-album-flow |
| insp-2013 | Upload Progress & Error Handling | insp-1032.upload-progress-partial-failure |

### Phase 7: Drag-and-Drop & Reorder (2 stories)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2014 | Drag-and-Drop Reorder | insp-1033.drag-and-drop-reorder, insp-1034.keyboard-reorder |
| insp-2015 | Stack-to-Create-Album Gesture | insp-1035.stack-to-create-album-gesture, insp-1036.stack-undo-toast |

### Phase 8: Multi-Select & Bulk Operations (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2016 | Multi-Select & Bulk Operations | insp-1037.multi-select-mode, insp-1038.bulk-operations-menu |

### Phase 9: MOC Integration (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2017 | MOC Linking | insp-1039.link-inspiration-to-moc-endpoint, insp-1040.link-album-to-moc-endpoint, insp-1041.moc-link-ui, insp-1042.unlink-moc |

### Phase 10: Polish (2 stories)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2018 | Empty & Loading States | insp-1043.empty-states, insp-1044.loading-states, insp-1045.error-handling |
| insp-2019 | Tag Management & Onboarding | insp-1048.tag-management-integration, insp-1049.onboarding-tooltips |

### Phase 11: Accessibility (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2020 | Keyboard & Screen Reader Support | insp-1046.keyboard-navigation, insp-1047.screen-reader-support |

### Phase 12: E2E Testing (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| insp-2021 | E2E Test Suite | insp-1050.e2e-test-suite |

## Instructions

1. **Read the PRD** at `/docs/prd/epic-5-inspiration-gallery.md` for complete requirements

2. **Read existing consolidated story examples** for the template format:
   - `/docs/stories/epic-6-wishlist/wish-2000-database-schema-types.md`
   - `/docs/stories/epic-6-wishlist/wish-2001-wishlist-gallery-mvp.md`

3. **For each consolidated story, create a new file** in `/docs/stories/epic-5-inspiration/`:
   - Use naming: `insp-2xxx-{slug}.md`
   - Include a "Consolidates" section listing original stories
   - Include complete acceptance criteria from all consolidated stories
   - Include dev notes with code examples
   - Include comprehensive testing section

4. **Create IMPLEMENTATION-ORDER.md** in `/docs/stories/epic-5-inspiration/`:
   - Include dependency graph (ASCII art)
   - Define implementation phases
   - Identify parallel execution opportunities
   - Define MVP scope (which stories are required for MVP)
   - Include story mapping table (old -> new)
   - Include API endpoints summary
   - Include data model summary

5. **DO NOT delete original stories** - they serve as reference documentation

## Story Template

Each consolidated story should follow this structure:

```
# Story insp-2xxx: [Title]

## Status
Draft

## Consolidates
- insp-1xxx: [Original title]
- insp-1yyy: [Original title]

## Story
**As a** [user type],
**I want** [action],
**So that** [benefit].

## PRD Reference
See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - [Relevant Section]

## Dependencies
- [List dependencies on other stories]

## Acceptance Criteria
[Combined ACs from all consolidated stories, numbered]

## Tasks / Subtasks
[Combined and organized tasks]

## Dev Notes
[Code examples, file locations, implementation guidance]

## Testing
[Test cases from all consolidated stories]

## Definition of Done
[Consolidated DoD checklist]

## Change Log
| Date | Version | Description | Author |
```

## Expected Output

After running this prompt:
- 22 new story files: `insp-2000-*.md` through `insp-2021-*.md`
- 1 implementation order file: `IMPLEMENTATION-ORDER.md`
- Original 56 stories preserved for reference
```

---

## 3. Epic 7: Sets Gallery Consolidation Prompt

Copy and paste the following prompt into Claude Code to consolidate Epic 7 stories:

---

```markdown
# Consolidate Epic 7: Sets Gallery Stories

## Context

Epic 7 currently has 22 granular stories that need consolidation into approximately 10-12 cohesive stories for efficient AI-driven implementation.

## PRD Reference

Read the Epic 7 PRD at: `/docs/prd/epic-7-sets-gallery.md`

## Current Stories (22 files)

- sets-1000-database-schema.md
- sets-1001-zod-schemas.md
- sets-1002-list-sets-endpoint.md
- sets-1003-get-set-endpoint.md
- sets-1004-create-set-endpoint.md
- sets-1005-update-set-endpoint.md
- sets-1006-delete-set-endpoint.md
- sets-1007-gallery-page.md
- sets-1008-set-card.md
- sets-1009-detail-page.md
- sets-1010-add-set-form.md
- sets-1011-edit-set-form.md
- sets-1012-image-upload.md
- sets-1013-build-status-toggle.md
- sets-1014-quantity-stepper.md
- sets-1015-delete-confirmation.md
- sets-1016-moc-linking.md
- sets-1017-wishlist-integration.md
- sets-1018-empty-states.md
- sets-1019-accessibility.md
- sets-1020-duplicate-detection.md
- sets-1021-e2e-tests.md

## Proposed Consolidation Plan (Target: 11 stories)

### Phase 1: Foundation (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2000 | Database Schema & Shared Types | sets-1000-database-schema, sets-1001-zod-schemas |

### Phase 2: Vertical Slice (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2001 | Sets Gallery MVP | sets-1002-list-sets-endpoint, sets-1003-get-set-endpoint, sets-1007-gallery-page, sets-1008-set-card, sets-1009-detail-page |

### Phase 3: Create/Add Flow (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2002 | Add Set Flow | sets-1004-create-set-endpoint, sets-1010-add-set-form, sets-1012-image-upload |

### Phase 4: Edit/Update Flow (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2003 | Edit Set Flow | sets-1005-update-set-endpoint, sets-1011-edit-set-form |

### Phase 5: Delete Flow (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2004 | Delete Set Flow | sets-1006-delete-set-endpoint, sets-1015-delete-confirmation |

### Phase 6: Build Status & Quantity (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2005 | Build Status & Quantity Controls | sets-1013-build-status-toggle, sets-1014-quantity-stepper |

### Phase 7: Wishlist Integration (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2006 | Wishlist "Got It" Integration | sets-1017-wishlist-integration, sets-1020-duplicate-detection |

### Phase 8: MOC Linking (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2007 | MOC Linking | sets-1016-moc-linking |

### Phase 9: Polish (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2008 | Empty States & Loading | sets-1018-empty-states |

### Phase 10: Accessibility (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2009 | Keyboard & Accessibility | sets-1019-accessibility |

### Phase 11: E2E Testing (1 story)

| New Story | Title | Consolidates |
|-----------|-------|--------------|
| sets-2010 | E2E Test Suite | sets-1021-e2e-tests |

## Instructions

1. **Read the PRD** at `/docs/prd/epic-7-sets-gallery.md` for complete requirements

2. **Read existing consolidated story examples** for the template format:
   - `/docs/stories/epic-6-wishlist/wish-2000-database-schema-types.md`
   - `/docs/stories/epic-6-wishlist/wish-2001-wishlist-gallery-mvp.md`

3. **For each consolidated story, create a new file** in `/docs/stories/epic-7-sets/`:
   - Use naming: `sets-2xxx-{slug}.md`
   - Include a "Consolidates" section listing original stories
   - Include complete acceptance criteria from all consolidated stories
   - Include dev notes with code examples
   - Include comprehensive testing section

4. **Create IMPLEMENTATION-ORDER.md** in `/docs/stories/epic-7-sets/`:
   - Include dependency graph (ASCII art)
   - Define implementation phases
   - Identify parallel execution opportunities
   - Define MVP scope (which stories are required for MVP)
   - Include story mapping table (old -> new)
   - Include API endpoints summary
   - Include data model summary

5. **DO NOT delete original stories** - they serve as reference documentation

## Special Considerations for Sets Gallery

### Wishlist Integration
The "Got It" flow (sets-2006) has a cross-epic dependency on Epic 6: Wishlist. Ensure the story:
- References the Wishlist API endpoint for marking items purchased
- Handles the transaction atomically (create Set, then delete Wishlist item)
- Preserves `wishlistItemId` reference for traceability
- Implements undo functionality

### Build Status Toggle
The build status toggle (sets-2005) should include:
- Optimistic UI updates
- Undo functionality via toast
- Celebration animation on "Built"
- Keyboard shortcut (B)

### Quantity Handling
The quantity stepper (sets-2005) should:
- Enforce minimum of 1
- Offer "delete set instead?" when trying to decrement below 1
- Handle same set with different purchase prices (duplicate detection)

### Duplicate Detection
When adding a set that already exists (sets-2006):
- Detect by set number
- Offer: "Add to existing quantity" vs "Add as new entry"
- New entry option useful for tracking different purchase prices

## Story Template

Each consolidated story should follow this structure:

```
# Story sets-2xxx: [Title]

## Status
Draft

## Consolidates
- sets-1xxx: [Original title]
- sets-1yyy: [Original title]

## Story
**As a** [user type],
**I want** [action],
**So that** [benefit].

## PRD Reference
See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - [Relevant Section]

## Dependencies
- [List dependencies on other stories]

## Acceptance Criteria
[Combined ACs from all consolidated stories, numbered]

## Tasks / Subtasks
[Combined and organized tasks]

## Dev Notes
[Code examples, file locations, implementation guidance]

## Testing
[Test cases from all consolidated stories]

## Definition of Done
[Consolidated DoD checklist]

## Change Log
| Date | Version | Description | Author |
```

## Expected Output

After running this prompt:
- 11 new story files: `sets-2000-*.md` through `sets-2010-*.md`
- 1 implementation order file: `IMPLEMENTATION-ORDER.md`
- Original 22 stories preserved for reference
```

---

## 4. General Consolidation Guidelines

### Identifying Stories That Should Merge

Stories are candidates for merging when:

1. **API + UI pairs**: An endpoint story and its corresponding UI story should merge
   - Example: `create-inspiration-endpoint` + `upload-modal-single-image`

2. **Sequential workflow steps**: Stories that form a single user flow
   - Example: `upload-modal` + `upload-progress` + `upload-error-handling`

3. **Related CRUD operations**: Sometimes create/update or update/delete can merge
   - Example: `edit-inspiration-modal` + `update-inspiration-endpoint`

4. **Shared component stories**: Component + its usage context
   - Example: `set-card` + `gallery-page` (card is only used in gallery)

5. **Polish sets**: Related UX improvements
   - Example: `empty-states` + `loading-states` + `error-handling`

### Stories That Should Stay Separate

Keep stories separate when:

1. **Different developers/tracks**: Can be worked in parallel by different people
2. **Different skill sets**: Backend vs. frontend vs. design
3. **Large scope**: Individual story would take > 1-2 days
4. **Different testing strategies**: Unit tests vs. E2E tests
5. **Optional features**: Features that might not make MVP

### Handling Dependencies in Consolidated Stories

When consolidating, update the dependency section:

```markdown
## Dependencies

### Required (blocking)
- sets-2000: Database Schema & Shared Types (must complete first)

### Recommended (non-blocking)
- sets-2005: Build Status Toggle (for full functionality, but can develop in parallel)

### Cross-Epic
- wish-2004: Wishlist "Got It" endpoint (for Wishlist integration)
```

### Template Structure Reference

Every consolidated story should include:

```markdown
# Story {prefix}-2xxx: {Title}

## Status
Draft | In Progress | Complete

## Consolidates
- {prefix}-1xxx: Original story title
- {prefix}-1yyy: Another original story title

## Story
**As a** user type,
**I want** action,
**So that** benefit.

## PRD Reference
See [Epic N: Name](/docs/prd/epic-n-name.md) - Relevant Section

## Dependencies
- {prefix}-2xxx: Dependency title

## Acceptance Criteria
1. First criterion
2. Second criterion
...

## Tasks / Subtasks

### Task 1: Description (AC: 1, 2)
- [ ] Subtask A
- [ ] Subtask B

### Task 2: Description (AC: 3, 4)
- [ ] Subtask C

## Dev Notes

### Component Structure
```typescript
// Code example
```

### File Locations
```
path/to/file.ts    # Description
```

## Testing
- [ ] Test case 1
- [ ] Test case 2

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests pass
- [ ] Code reviewed
- [ ] No TypeScript errors

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| YYYY-MM-DD | 0.1 | Initial draft | Name |
```

### What To Do With Old Stories

**DO NOT DELETE** original stories. They serve as:

1. **Reference documentation**: Original intent and context
2. **Audit trail**: Why decisions were made
3. **Rollback option**: If consolidation doesn't work out
4. **Detailed specs**: Sometimes contain more detail than consolidated version

Instead, the IMPLEMENTATION-ORDER.md file should include a mapping table:

```markdown
## Legacy Stories

| Old Story | Status | Consolidated Into |
|-----------|--------|-------------------|
| prefix-1000 | Replaced | prefix-2001 |
| prefix-1001 | Replaced | prefix-2001 |
| prefix-1002 | Replaced | prefix-2001, prefix-2002 |
```

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 1.0 | Initial prompts document | Claude |
