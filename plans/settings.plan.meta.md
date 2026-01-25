---
doc_type: plan_meta
title: "pref — User Settings Epic Meta Plan"
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

# pref — User Settings Epic Meta Plan

## Story Prefix

All stories in this project use the **pref** prefix (lowercase).
- Story IDs: `pref-1000`, `pref-2000`, `pref-2001`, etc.
- Story folders: `plans/stories/pref-XXX/`
- Artifact files: `elab-pref-XXX.md`, `proof-pref-XXX.md`, etc.

## Project Goal

Implement a comprehensive User Settings feature that allows users to customize their experience. The feature includes appearance settings (theme, gallery density) and account settings (display name, avatar upload) with auto-save functionality and optimistic updates.

## PRD Reference

See [Epic 8: User Settings PRD](/docs/prd/epic-8-settings.md) (if available)

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/pref-XXX/` contains all per-story artifacts
- `docs/stories.bak/epic-8-settings/` contained the original story documents (archived)

## Naming Rule (timestamps in filenames)

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Principles

### Story folders are atomic and self-contained
Each story folder contains all artifacts for that story:
- Story document
- Elaboration
- Proof
- Code review
- QA verification
- QA gate

### Documentation structure must be automation-friendly
- YAML front matter for metadata
- Consistent section headers
- Machine-parseable artifact references

### Stories represent units of intent, validation, and evidence
- Intent: What should be built
- Validation: How to verify it works
- Evidence: Proof that it was built correctly

## Principles (Project-Specific)

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package

### Package Boundary Rules

| Package | Purpose | Stories |
|---------|---------|---------|
| `apps/api/endpoints/settings` | Settings API Lambda handlers | pref-2000 |
| `apps/web/settings-app` | Settings React feature module | pref-2001-pref-2005 |
| `packages/core/api-client` | RTK Query slices and schemas | pref-2000+ |
| `packages/core/app-component-library` | Shared UI components | pref-2002, pref-2003 |

### Import Policy

- Shared code MUST be imported via workspace package names
- Use `@repo/app-component-library` for UI primitives
- Use `@repo/api-client` for API hooks and schemas
- Use `@repo/logger` for logging (never console.log)

### Zod-First Types (Required)

All types MUST be defined as Zod schemas with inferred types:

```typescript
import { z } from 'zod'

const UserSettingsSchema = z.object({
  appearance: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    galleryDensity: z.enum(['comfortable', 'compact']),
  }),
  account: z.object({
    displayName: z.string().min(2).max(50),
    avatarUrl: z.string().url().optional(),
  }),
})

type UserSettings = z.infer<typeof UserSettingsSchema>
```

### UI Component Patterns

- Settings sections use Card components from `@repo/app-component-library`
- Inline editing for display name with save/cancel buttons
- Avatar upload with preview modal before confirming
- Auto-save with debounce for appearance settings
- Accessibility-first: ARIA labels, keyboard nav, focus management

### Testing Requirements

- API tests for all endpoints
- Component tests for all UI components
- MSW handlers for network mocking (no direct mock API imports)
- E2E tests via Playwright in `apps/web/playwright`

---

## Data Model Summary

### User Settings (API Response)

| Field | Type | Required | Default |
|-------|------|----------|---------|
| appearance.theme | enum | Yes | 'system' |
| appearance.galleryDensity | enum | Yes | 'comfortable' |
| account.displayName | string | Yes | - |
| account.avatarUrl | string | No | - |

### Theme Options

| Value | Description |
|-------|-------------|
| light | Light color scheme |
| dark | Dark color scheme |
| system | Follow OS preference |

### Gallery Density Options

| Value | Description |
|-------|-------------|
| comfortable | Larger cards with more spacing |
| compact | Smaller cards, more items visible |

---

## API Endpoints Summary

| Method | Endpoint | Story | Description |
|--------|----------|-------|-------------|
| GET | /api/settings | pref-2000 | Get user settings |
| PATCH | /api/settings | pref-2000 | Update user settings (partial) |
| POST | /api/settings/avatar/presign | pref-2003 | Get presigned S3 URL for avatar |
| POST | /api/settings/avatar | pref-2003 | Register uploaded avatar |

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-24 23:30 | bootstrap | Initial plan creation | settings.plan.meta.md, settings.plan.exec.md |
