---
generated: "2026-02-05"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: INST-1102

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline file found. Seed generated from codebase scanning and ADR review.

### Relevant Existing Features

| Feature | Status | Files |
|---------|--------|-------|
| Wishlist Add Item Page | Production | `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx` |
| Wishlist Form Component | Production | `apps/web/app-wishlist-gallery/src/components/WishlistForm/` |
| Wishlist POST /wishlist Route | Production | `apps/api/lego-api/domains/wishlist/routes.ts` |
| Database moc_instructions table | Exists | `packages/backend/database-schema/src/migrations/app/0000_productive_puppet_master.sql` |
| Zod Validation Schemas | Established | `packages/core/api-client/src/schemas/wishlist.ts` |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| INST-1008 | Wire RTK Query Mutations | UAT | BLOCKING - Need `useCreateMocMutation` |
| INST-1100 | View MOC Gallery | Created | Affects navigation (Create button location) |

### Constraints to Respect

From codebase:
- **CLAUDE.md**: All types MUST use Zod schemas with `z.infer<>` - no TypeScript interfaces
- **CLAUDE.md**: NO barrel files - import directly from source files
- **CLAUDE.md**: Use `@repo/app-component-library` for all UI components
- **Project structure**: React 19, Tailwind CSS, Hono backend, Vitest + Playwright testing

---

## Retrieved Context

### Related Endpoints

| Endpoint | Method | File | Notes |
|----------|--------|------|-------|
| `/wishlist` | POST | `apps/api/lego-api/domains/wishlist/routes.ts` | Pattern for create operations |
| `/wishlist` | GET | `apps/api/lego-api/domains/wishlist/routes.ts` | Pattern for list operations |
| `/wishlist/:id` | GET | `apps/api/lego-api/domains/wishlist/routes.ts` | Pattern for get single item |

### Related Components

| Component | Path | Reuse Potential |
|-----------|------|-----------------|
| AddItemPage | `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx` | HIGH - Complete create page pattern |
| WishlistForm | `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx` | HIGH - Form validation, structure, UX patterns |
| TagInput | `apps/web/app-wishlist-gallery/src/components/TagInput/` | HIGH - Multi-select tags component |

### Reuse Candidates

**Components:**
- `Button`, `Input`, `Textarea`, `Label`, `Select` from `@repo/app-component-library`
- `WishlistForm` structure as template (fields, validation, submission flow)
- `TagInput` for multi-select tags
- Form validation pattern with inline errors
- Optimistic UI pattern from WISH-2032

**Patterns:**
- Zod schema validation: `CreateWishlistItemInputSchema` pattern
- Route structure: Hono router with auth, permissions, feature gates
- Service/Repository architecture from wishlist domain
- RTK Query mutation hooks pattern
- React Router navigation with `useNavigate`
- Focus management on mount
- Escape key navigation

**Schemas:**
- Database table exists: `moc_instructions` with columns: `id`, `user_id`, `title`, `description`, `theme`, `tags`, `created_at`, `updated_at`
- Table has slug support via `set_number` field

---

## Knowledge Context

### Lessons Learned

No knowledge base available - lessons loaded: false

### Blockers to Avoid (from patterns observed)

From wishlist implementation:
- **API path mismatch**: Frontend uses `/api/v2/{domain}`, backend uses `/{domain}` - must align with ADR-001
- **Schema drift**: Keep frontend/backend Zod schemas in sync
- **Missing auth middleware**: All routes require `auth`, `loadPermissions`, `requireFeature`

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/mocs`, Backend: `/mocs` |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test required |

### Patterns to Follow

From ADR-001:
- Frontend RTK Query endpoints use `/api/v2/mocs`
- Backend Hono routes use `/mocs`
- Vite proxy rewrites for local dev

From wishlist implementation:
- Form validation with Zod schema
- Inline error display with disabled submit until valid
- Optimistic UI with toast notifications
- localStorage recovery for failed submissions
- Focus management (auto-focus title on mount)
- Keyboard shortcuts (Escape to cancel)

### Patterns to Avoid

- Do NOT use TypeScript interfaces - use Zod schemas
- Do NOT create barrel files (index.ts re-exports)
- Do NOT hardcode colors - use Tailwind classes
- Do NOT use console.log - use `@repo/logger`

---

## Conflict Analysis

### Conflict: Blocking Dependency
- **Severity**: blocking
- **Description**: INST-1008 (Wire RTK Query Mutations) is still in UAT status. This story requires `useCreateMocMutation` to be available in `@repo/api-client/rtk/mocs-api.ts` before implementation can begin.
- **Resolution Hint**: Wait for INST-1008 to complete and be merged. Alternatively, create the RTK mutation as part of this story if INST-1008 scope allows.

---

## Story Seed

### Title
Create Basic MOC

### Description

**Context:**
The MOC Instructions feature allows users to manage their custom LEGO builds. The `moc_instructions` database table exists with fields for title, description, theme, and tags. The wishlist domain provides a proven pattern for create pages with form validation, optimistic UI, and error recovery.

**Problem:**
Users currently have no way to add MOCs to their collection. Before users can upload files or view details, they need a way to create a MOC record with basic metadata.

**Solution:**
Implement a vertical slice for MOC creation following the established wishlist pattern:
- **Frontend**: Create page at `/mocs/new` with form validation and optimistic submission
- **Backend**: `POST /mocs` endpoint with Zod validation and auth
- **Database**: Insert into `moc_instructions` table with userId and generated slug

### Initial Acceptance Criteria

- [ ] **AC1**: User can navigate to `/mocs/new` from gallery page "Create MOC" button
- [ ] **AC2**: Create page renders form with fields: title (required, min 3 chars), description (optional), theme (select dropdown), tags (multi-select)
- [ ] **AC3**: Title field auto-focuses on page load
- [ ] **AC4**: Form shows inline validation errors for required fields
- [ ] **AC5**: Submit button is disabled until title meets minimum length
- [ ] **AC6**: Form submission triggers `useCreateMocMutation` from `@repo/api-client`
- [ ] **AC7**: Success shows toast notification "MOC created!" and redirects to `/mocs/:id`
- [ ] **AC8**: Backend `POST /mocs` endpoint validates request with Zod schema
- [ ] **AC9**: Backend extracts userId from auth context middleware
- [ ] **AC10**: Backend generates URL-friendly slug from title for future use
- [ ] **AC11**: Backend inserts record into `moc_instructions` table
- [ ] **AC12**: Backend returns 201 with created MOC including `id`, `title`, `description`, `theme`, `tags`, `createdAt`
- [ ] **AC13**: Validation errors from API (e.g., duplicate title) display in form
- [ ] **AC14**: Escape key cancels form and navigates back to gallery
- [ ] **AC15**: Form state persists to localStorage on submission failure for recovery

### Non-Goals

- File uploads (covered by INST-1103, INST-1104, INST-1106)
- Edit functionality (covered by INST-1108)
- Delete functionality (covered by INST-1109)
- Image optimization or variants
- Full-text search or filtering
- MOC detail page display (covered by INST-1101)
- Gallery page implementation (covered by INST-1100)

### Reuse Plan

**Components (from @repo/app-component-library):**
- `Button`, `Input`, `Textarea`, `Label`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`

**Components (from app-wishlist-gallery):**
- `TagInput` - multi-select tags component (copy/adapt)
- `WishlistForm` structure as reference for validation pattern

**Hooks:**
- `useNavigate` from `@tanstack/react-router` for navigation
- `useLocalStorage` pattern for form recovery (from wishlist)
- `useCreateMocMutation` from `@repo/api-client/rtk/mocs-api` (INST-1008)

**Patterns:**
- Form validation with Zod schema matching backend
- Inline error display with field-level messages
- Submit button disabled state based on validation
- Optimistic UI with immediate navigation
- localStorage recovery on failure
- Focus management (auto-focus title)
- Keyboard shortcuts (Escape to cancel)

**Packages:**
- `@repo/api-client` for RTK mutation
- `@repo/app-component-library` for UI primitives
- `@repo/logger` for logging (not console.log)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Context:**
- Reference `apps/web/app-wishlist-gallery/src/pages/__tests__/AddItemPage.test.tsx` for unit test patterns
- Reference `apps/web/playwright/tests/wishlist/` for E2E test patterns
- MUST include at least one happy-path E2E test per ADR-006
- E2E tests MUST use live API (no MSW) per ADR-005

**Test Coverage:**
- Unit: Form rendering, validation logic, submit button state
- Integration: API call with correct body, error handling, navigation
- E2E: Full create flow from gallery button to detail page redirect

### For UI/UX Advisor

**UX Context:**
- Follow wishlist AddItemPage UX patterns: back button, page header with description, centered form
- Maintain consistency with existing form components
- Consider theme dropdown options (needs domain knowledge - flag if unknown)
- Tags input should support comma-separated entry and deletion
- Loading state should disable form and show loading indicator

**Accessibility:**
- Form labels with proper `htmlFor` attributes
- ARIA labels on all interactive elements
- Focus management on mount and after validation errors
- Keyboard navigation (Tab, Enter, Escape)

### For Dev Feasibility

**Implementation Context:**
- BLOCKING: Depends on INST-1008 for `useCreateMocMutation`
- Database table `moc_instructions` already exists - no migration needed
- Backend needs new route file: `apps/api/lego-api/domains/mocs/routes.ts`
- Backend needs service/repository (similar to wishlist pattern)
- Frontend needs new page: `apps/web/app-instructions-gallery/src/pages/CreateMocPage.tsx`

**Constraints:**
- Theme dropdown options need clarification (LEGO themes? Custom themes?)
- Slug generation logic needs decision (unique constraint? collision handling?)
- Tag storage format: JSONB array of strings (matches existing pattern)

**Estimated Complexity:**
- Frontend: Medium (reuse patterns, new component)
- Backend: Medium (new domain setup, route, service, repository)
- Database: Low (table exists)
- Overall: Medium (2-3 days with testing)
