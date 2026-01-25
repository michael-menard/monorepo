---
doc_type: plan_exec
title: "pref — User Settings Epic Execution Plan"
status: active
story_prefix: "pref"
epic_source: "docs/stories.bak/epic-8-settings"
created_at: "2026-01-24T23:30:00-07:00"
updated_at: "2026-01-24T23:30:00-07:00"
tags:
  - user-settings
  - preferences
  - theme
  - avatar
  - react
  - aws-lambda
---

# pref — User Settings Epic Execution Plan

## Story Prefix

All stories use the **pref** prefix (lowercase). Commands use the full prefixed ID:
- `/pm-generate-story pref-2000`
- `/elab-story pref-2000`
- `/dev-implement-story pref-2000`

## Story Consolidation

This epic was consolidated from 17 granular stories into 6 cohesive stories for efficient AI-driven implementation.

| Old Story ID | Old Title | New Story ID | New Title |
|--------------|-----------|--------------|-----------|
| pref-1001 | Settings API Slice | pref-2000 | API Foundation |
| pref-1002 | Get Settings Endpoint | pref-2000 | API Foundation |
| pref-1003 | Update Settings Endpoint | pref-2000 | API Foundation |
| pref-1000 | Settings Project Scaffolding | pref-2001 | Settings Page & Shell Integration |
| pref-1004 | Settings Page | pref-2001 | Settings Page & Shell Integration |
| pref-1014 | Settings Loading State | pref-2001 | Settings Page & Shell Integration |
| pref-1015 | Settings Error Handling | pref-2001 | Settings Page & Shell Integration |
| pref-1005 | Appearance Section | pref-2002 | Appearance Settings |
| pref-1006 | Theme Selector | pref-2002 | Appearance Settings |
| pref-1007 | Gallery Density Selector | pref-2002 | Appearance Settings |
| pref-1008 | Account Section | pref-2003 | Account Settings |
| pref-1009 | Display Name Editor | pref-2003 | Account Settings |
| pref-1010 | Avatar Uploader | pref-2003 | Account Settings |
| pref-1011 | Avatar Preview | pref-2003 | Account Settings |
| pref-1012 | Save Settings | pref-2004 | Save Flow & Feedback |
| pref-1013 | Success Feedback | pref-2004 | Save Flow & Feedback |
| pref-1016 | Settings Unit Tests | pref-2005 | Unit & Integration Tests |

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/pref-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

All artifacts use the story prefix (lowercase):

| Artifact | Filename |
|----------|----------|
| Story file | `pref-XXX.md` |
| Elaboration | `elab-pref-XXX.md` |
| Proof | `proof-pref-XXX.md` |
| Code Review | `code-review-pref-XXX.md` |
| QA Verify | `qa-verify-pref-XXX.md` |
| QA Gate | `qa-gate-pref-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

---

## Dependency Graph (Visual)

```
                        ┌─────────────┐
                        │  pref-2000  │
                        │    API      │
                        │ Foundation  │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │  pref-2001  │  │  pref-2002  │  │  pref-2003  │
       │  Settings   │  │  Appearance │  │  Account    │
       │  Page       │  │  Settings   │  │  Settings   │
       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  pref-2004  │
                        │  Save Flow  │
                        │  & Feedback │
                        └──────┬──────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  pref-2005  │
                        │  Unit &     │
                        │  Int Tests  │
                        └─────────────┘
```

---

## Execution Phases

### Phase 1: API Foundation (1 story)

Sequential execution required.

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| pref-2000 | API Foundation | 3 | — |

**Goals:**
- RTK Query API slice with cache invalidation
- GET /settings endpoint
- PATCH /settings endpoint with partial updates
- Optimistic update support
- Zod schemas for request/response types

**Key Deliverables:**
- `apps/api/endpoints/settings/get/handler.ts`
- `apps/api/endpoints/settings/update/handler.ts`
- `packages/core/api-client/src/schemas/settings.ts`
- `packages/core/api-client/src/rtk/settings-api.ts`

**Backend Dependencies:**
- User settings table in database (or user preferences column)

---

### Phase 2: Page Foundation (1 story)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| pref-2001 | Settings Page & Shell Integration | 3 | pref-2000 |

**Goals:**
- Settings app scaffolding (`apps/web/settings-app`)
- Shell integration with lazy loading
- Route `/settings` configured
- Settings page container component
- Skeleton loading states
- Error state with retry

**Key Deliverables:**
- `apps/web/settings-app/` folder structure
- `apps/web/settings-app/package.json`
- `apps/web/settings-app/src/pages/SettingsPage.tsx`
- `apps/web/settings-app/src/components/SettingsSkeleton.tsx`
- `apps/web/settings-app/src/components/SettingsErrorState.tsx`

---

### Phase 3: UI Sections (2 stories - can run in parallel)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| pref-2002 | Appearance Settings | 3 | pref-2001 |
| pref-2003 | Account Settings | 5 | pref-2001 |

**Goals (pref-2002):**
- Appearance section card with header
- Theme selector (Light/Dark/System) with icons
- Gallery density selector with descriptions
- Immediate updates via mutation
- Sync with Redux themeSlice

**Key Deliverables (pref-2002):**
- `apps/web/settings-app/src/components/AppearanceSection.tsx`
- `apps/web/settings-app/src/components/ThemeSelector.tsx`
- `apps/web/settings-app/src/components/GalleryDensitySelector.tsx`

**Goals (pref-2003):**
- Account section card with header
- Display name editor with inline edit mode
- Validation (2-50 characters)
- Avatar uploader with file validation (jpg, png, webp, max 2MB)
- Avatar preview modal before confirming
- S3 presigned URL upload flow

**Key Deliverables (pref-2003):**
- `apps/web/settings-app/src/components/AccountSection.tsx`
- `apps/web/settings-app/src/components/DisplayNameEditor.tsx`
- `apps/web/settings-app/src/components/AvatarUploader.tsx`
- `apps/web/settings-app/src/components/AvatarPreviewModal.tsx`
- `apps/api/endpoints/settings/avatar/presign/handler.ts`
- `apps/api/endpoints/settings/avatar/register/handler.ts`

**Parallel Execution:** These stories have no interdependencies.

---

### Phase 4: Save & Feedback (1 story)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| pref-2004 | Save Flow & Feedback | 2 | pref-2002, pref-2003 |

**Goals:**
- Auto-save on change for appearance settings
- Debounce rapid changes (500ms)
- Saving indicator (inline spinner)
- Success feedback (checkmark animation, toast for manual saves)
- Error feedback (toast with retry option)
- Accessible status announcements

**Key Deliverables:**
- `apps/web/settings-app/src/hooks/useAutoSave.ts`
- `apps/web/settings-app/src/components/SaveIndicator.tsx`
- Toast configuration for settings

---

### Phase 5: Testing (1 story)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| pref-2005 | Unit & Integration Tests | 3 | All previous stories |

**Goals:**
- Component tests for ThemeSelector, DisplayNameEditor, AvatarUploader
- Integration tests for settings page load
- Integration tests for auto-save flow
- API endpoint tests
- Minimum 45% code coverage
- MSW handlers for API mocking

**Key Deliverables:**
- `apps/web/settings-app/src/**/__tests__/*.test.tsx`
- `apps/api/endpoints/settings/**/__tests__/*.test.ts`
- MSW handlers in `apps/web/settings-app/src/test/handlers.ts`

---

## Recommended Execution Order

For maximum parallelism:

| Wave | Stories | Can Start After |
|------|---------|-----------------|
| 1 | pref-2000 | — |
| 2 | pref-2001 | Wave 1 |
| 3 | pref-2002, pref-2003 | Wave 2 (parallel) |
| 4 | pref-2004 | Wave 3 |
| 5 | pref-2005 | Wave 4 |

---

## MVP Scope

**Minimum Viable Product includes:**
- pref-2000: API Foundation
- pref-2001: Settings Page & Shell Integration
- pref-2002: Appearance Settings
- pref-2003: Account Settings

This gives users the ability to:
- Access settings via `/settings` route
- Change theme (light/dark/system)
- Adjust gallery density
- Update display name
- Upload profile avatar

**Post-MVP enhancements:**
- pref-2004: Save Flow & Feedback (polish)
- pref-2005: Unit & Integration Tests (quality)

---

## Artifact Rules (Project-Specific)

### Reuse Gate (Required for QA PASS)

For each story:
- PM story doc MUST include: `## Reuse Plan`
- Dev proof MUST include: `## Reuse Verification`

### Prohibited Patterns

- `console.log` - use `@repo/logger`
- TypeScript interfaces without Zod - use `z.infer<>`
- Barrel files (index.ts re-exports)
- Per-story one-off utilities - extend shared packages
- Direct shadcn imports - use `@repo/app-component-library`

### Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

---

## Definition of Done (Epic)

Epic 8 is complete when:

- [ ] All 6 consolidated stories are implemented
- [ ] All API endpoints return correct data
- [ ] All UI components render correctly
- [ ] Theme changes apply immediately across app
- [ ] Gallery density changes reflect in galleries
- [ ] Avatar upload works end-to-end
- [ ] All tests pass (unit, integration)
- [ ] Accessibility audit passes (WCAG AA)
- [ ] Code reviewed and merged
- [ ] Documentation updated

---

## Original Story Reference

For detailed acceptance criteria, refer to the original stories:

| Story ID | Title | Key Acceptance Criteria |
|----------|-------|------------------------|
| pref-1000 | Settings Project Scaffolding | App folder, package.json, shell integration |
| pref-1001 | Settings API Slice | RTK Query slice, cache invalidation, optimistic updates |
| pref-1002 | Get Settings Endpoint | `useGetSettingsQuery` hook, returns UserSettings |
| pref-1003 | Update Settings Endpoint | `useUpdateSettingsMutation`, PATCH with partial data |
| pref-1004 | Settings Page | Page container, sections, loads settings on mount |
| pref-1005 | Appearance Section | Card layout, contains theme and density |
| pref-1006 | Theme Selector | Light/Dark/System options, syncs with Redux |
| pref-1007 | Gallery Density Selector | Comfortable/Compact options, saves to API |
| pref-1008 | Account Section | Card layout, display name and avatar |
| pref-1009 | Display Name Editor | Inline edit, 2-50 char validation |
| pref-1010 | Avatar Uploader | jpg/png/webp, max 2MB |
| pref-1011 | Avatar Preview | Preview modal, confirm/cancel |
| pref-1012 | Save Settings | Auto-save, debounce, saving indicator |
| pref-1013 | Success Feedback | Toast, checkmark animation |
| pref-1014 | Settings Loading State | Skeleton loaders matching layout |
| pref-1015 | Settings Error Handling | Error state, retry button, toast for failures |
| pref-1016 | Settings Unit Tests | 45% coverage minimum |

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-24 23:30 | bootstrap | Initial execution plan | settings.plan.exec.md |
