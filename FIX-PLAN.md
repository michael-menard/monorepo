# Fix Plan — Monorepo Health Audit
**Date:** 2026-02-22
**Source:** AUDIT-REPORT.md (same date)

---

## Priority Order

Fixes are ordered so that upstream shared-source issues are resolved before downstream consumers are re-checked. Fixing the shared root causes will automatically clear errors in packages that only fail because of a transitive problem.

---

### P1 — Build Failures (must fix first — blocks deployment)

| Package | Path | Error Count | Fix Approach | Effort |
|---------|------|-------------|--------------|--------|
| @repo/knowledge-base | `apps/api/knowledge-base` | 7 TS errors | See P1 detail below | S |

**P1-A: `src/mcp-server/tool-handlers.ts:3719–3720`**
- Error: `Property 'story' does not exist` — the result type exposes `.stories[]`, not `.story`.
- Fix: Replace `.story.id` / `.story.title` (etc.) with `.stories[0]?.id` / `.stories[0]?.title`, or destructure: `const [story] = result.stories`.

**P1-B: `src/scripts/db-init.ts:79`**
- Error: `Cannot find name 'readFileSync'`.
- Fix: Add `import { readFileSync } from 'fs'` at the top of the file.

**P1-C: `src/scripts/migrate-artifacts-to-kb.ts:102`**
- Error: `'STAGES' declared but never read`.
- Fix: Either remove the `STAGES` constant or use it. If intentionally unused, prefix with `_STAGES` or delete.

**P1-D: `src/scripts/seed-kb-first-stories.ts:196`**
- Error: `'result' declared but never read`.
- Fix: Remove the variable assignment (`const result = ...`) and call the expression directly, or prefix with `_result`.

**P1-E: `src/scripts/seed-kb-stories.ts:160`**
- Error: Property `stage` / `dir` does not exist on type `never`.
- Fix: The object being accessed is typed as `never` — a conditional branch returns nothing, making TypeScript narrow to `never`. Add an explicit type guard or check the return type of the function called on line ~155. Likely needs `if (!entry) return` or a correct type annotation.

---

### P2 — Shared Type Errors (fix once, clears many packages)

These are "multiplier" errors — fixing the source clears type failures in all consuming apps.

#### P2-A: `import.meta.env` not typed in `@repo/api-client`

**Affected:** `@repo/app-component-library` (9 errors), and transitively all app packages that include `api-client` in their tsconfig path.
**Files:** `packages/core/api-client/src/config/environments.ts:24–29`, `src/rtk/gallery-api.ts:123`, `src/rtk/instructions-api.ts:82`, `src/rtk/wishlist-api.ts:151`

| Package | Error Count Cleared |
|---------|-------------------|
| @repo/app-component-library | 9 |
| @repo/app-dashboard | 0 (upstream TS6133 errors, different root) |
| All apps via transitive include | propagates |

**Fix options (pick one):**
1. Add `"vite/client"` to `compilerOptions.types` in `packages/core/api-client/tsconfig.json`. This is the simplest fix if `api-client` is always used in Vite contexts.
2. Replace `import.meta.env.VITE_*` with a wrapper function that falls back gracefully:
   ```typescript
   // packages/core/api-client/src/config/environments.ts
   function getEnv(key: string): string {
     // @ts-ignore — import.meta.env is available in Vite builds
     return typeof import.meta !== 'undefined' && import.meta.env?.[key] || process.env[key] || ''
   }
   ```
3. Add an `env.d.ts` declaration inside `api-client/src/`:
   ```typescript
   /// <reference types="vite/client" />
   ```

#### P2-B: Unused variable TS6133 errors in `@repo/api-client` RTK files

**Affected:** `@repo/app-dashboard` (12 errors), `@repo/app-inspiration-gallery` (12), `@repo/app-instructions-gallery` (12), `@repo/app-sets-gallery` (12), `@repo/app-wishlist-gallery` (12), `@repo/main-app` (12), `@repo/reset-password` (12), `@repo/user-settings` (12) — all 12 are the same upstream errors.
**Files:**
- `packages/core/api-client/src/rtk/gallery-api.ts:178` — `error` unused
- `packages/core/api-client/src/rtk/wishlist-api.ts:219, 307, 326, 445, 461, 520, 536` — `error`, `meta`, `result` unused

**Fix:** Prefix unused destructured variables with `_` in RTK Query `onQueryStarted` / `onCacheEntryAdded` callbacks:
```typescript
// Before
onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
  try {
    const { data, meta, error } = await queryFulfilled
    // meta and error unused
  }
}
// After
onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
  try {
    const { data, _meta, _error } = await queryFulfilled
  }
}
```
Alternatively, suppress with `// eslint-disable-next-line @typescript-eslint/no-unused-vars` if the callback signature is required.

#### P2-C: `QuotaIndicator.tsx` — missing Zod exports / unused `z`

**Affected:** `@repo/app-component-library` (8 TS errors + 1 lint error), all apps that use `app-component-library` (transitively creates the `TS6133: 'z' declared` error in 7 app packages).
**Files:** `packages/core/app-component-library/src/indicators/QuotaIndicator.tsx`, `src/indicators/index.ts`

**Fix:**
1. In `QuotaIndicator.tsx` — remove the `import { z } from 'zod'` import if Zod is no longer used, or add Zod schemas to match what `index.ts` re-exports.
2. In `src/indicators/index.ts` — update re-exports to match what `QuotaIndicator.tsx` actually exports. Either:
   - Export `QuotaTypeSchema`, `QuotaInfoSchema`, `QuotaIndicatorPropsSchema`, etc. from `QuotaIndicator.tsx` (add the Zod schemas back), or
   - Update `index.ts` to export the plain types (`QuotaType`, `QuotaInfo`, `QuotaIndicatorProps`, etc.) instead.

Per project conventions (`CLAUDE.md`), the correct fix is to add Zod schemas and export them:
```typescript
// In QuotaIndicator.tsx — add back
import { z } from 'zod'
export const QuotaTypeSchema = z.enum(['upload', 'storage', 'api'])
export const QuotaInfoSchema = z.object({ ... })
export const QUOTA_DISPLAY_NAMES = { ... } as const
export type QuotaType = z.infer<typeof QuotaTypeSchema>
export type QuotaInfo = z.infer<typeof QuotaInfoSchema>
```

#### P2-D: react-hook-form version split (7.66 vs 7.71)

**Affected:** `@repo/app-instructions-gallery` (~6 TS2741 errors), `@repo/main-app` (~6 TS2741 errors).
**Files:** `apps/web/app-instructions-gallery/src/components/MocEdit/EditForm.tsx`, `apps/web/main-app/src/components/MocEdit/EditForm.tsx`

The error `Property '_updateIsValidating' is missing` means one package resolves `react-hook-form@7.71.1` and another resolves `7.66.1`. These two versions have an incompatible `Control` type.

**Fix:** Pin the entire workspace to a single version of `react-hook-form`:
```bash
pnpm add react-hook-form@7.71.1 -w   # add to workspace root
```
Or add an overrides entry in root `package.json`:
```json
"pnpm": {
  "overrides": {
    "react-hook-form": "7.71.1"
  }
}
```
Then run `pnpm install` to deduplicate.

#### P2-E: Missing `@repo/upload-client` module

**Affected:** `@repo/app-instructions-gallery` (3 TS2307 errors + 10+ test failures).
**Files:** `src/hooks/usePresignedUpload.ts:25`, test files.

**Fix:** Determine whether `@repo/upload-client` was renamed, moved, or not yet published. If it was renamed to `@repo/upload`:
```bash
# In apps/web/app-instructions-gallery/package.json
pnpm add @repo/upload@workspace:*
```
Then update the import path in `usePresignedUpload.ts`. If the package doesn't exist yet, create it.

#### P2-F: Missing exports from `@repo/api-client`

**Affected:** `@repo/app-instructions-gallery` (3 TS2305 errors + test failures for `useUploadThumbnailMutation`, `useCreateUploadSessionMutation`, `useCompleteUploadSessionMutation`).

**Fix:** Add the missing RTK Query endpoints to the relevant API slice in `@repo/api-client` and re-export from the package index:
```typescript
// In packages/core/api-client/src/rtk/instructions-api.ts (or appropriate file)
export const { useCreateUploadSessionMutation, useCompleteUploadSessionMutation } = instructionsApi
// In packages/core/api-client/src/rtk/gallery-api.ts (or appropriate file)  
export const { useUploadThumbnailMutation } = galleryApi
```

#### P2-G: `@repo/cache` — missing peer dependencies

**Affected:** `@repo/cache` (2 TS2307 errors).
**Files:** `src/components/CacheDashboard/index.tsx:25, 37`

**Fix:**
```bash
cd packages/core/cache
pnpm add @repo/app-component-library@workspace:* lucide-react
```

#### P2-H: TanStack Router route path mismatches in `@repo/main-app`

**Affected:** `@repo/main-app` (~8 TS2322 errors).
Routes like `"/activity"`, `"/mocs/$mocId"`, `"/parts"`, `"/add"`, `"/collection"` are used in sub-apps but not registered in the root router tree.

**Fix:**
1. Add missing routes to the main-app TanStack Router route tree, or
2. Update the sub-app components to use `Link` components from their own router scope rather than relying on the root app's route types.
The `/add` path (used in `app-wishlist-gallery`) and `/activity` (used in `app-dashboard`) are the most common offenders.

#### P2-I: Missing local modules in `@repo/main-app`

**Affected:** `@repo/main-app` (3 TS2307 errors in `src/routes/pages/InstructionsNewPage.tsx`).

| Module | Fix |
|--------|-----|
| `@/hooks/useUploadManager` | Create `src/hooks/useUploadManager.ts` or correct the import path |
| `@/services/api/finalizeClient` | Create `src/services/api/finalizeClient.ts` or correct the path |
| `@/types/moc-form` | Create `src/types/moc-form.ts` or correct the path |

---

### P3 — Test Failures

#### P3-A: `VITE_SERVERLESS_API_BASE_URL` env guard breaks tests at import time

**Affected:** `@repo/app-component-library` (3 test files), `@repo/reset-password` (1 test file), and likely `@repo/app-wishlist-gallery` (AddItemPage tests).

**Fix (preferred):** Add the env var to the Vitest setup for each affected package. In each package's `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    env: {
      VITE_SERVERLESS_API_BASE_URL: 'http://localhost:3000',
    },
  },
})
```
Or add a `.env.test` file at the package root:
```
VITE_SERVERLESS_API_BASE_URL=http://localhost:3000
```

**Alternative fix:** Make `environments.ts` return a default/empty string in non-Vite environments instead of throwing, guarded by checking whether the env var is defined.

#### P3-B: `msw/node` not found in `@repo/api-client` tests

**Affected:** `@repo/api-client` (3 test files).

**Fix:**
```bash
cd packages/core/api-client
pnpm add -D msw
```
Then ensure `msw` is set up with a `server.ts` in the test setup file, or if `msw` is already in the monorepo root, add it as a dev dependency with `workspace:*`.

#### P3-C: `data-testid` selectors broken after shadcn upgrade

**Affected packages:** `@repo/gallery` (47 tests), `@repo/app-wishlist-gallery` (~8 tests), `@repo/app-sets-gallery` (1 test), `@repo/app-instructions-gallery` (several tests).

**Pattern:** Components now render `data-slot="..."` attributes instead of `data-testid="..."` after the shadcn upgrade. Tests querying by `data-testid` find nothing.

**Systematic fix:**
1. Audit each failing test to determine which `data-testid` is missing.
2. Either:
   - Re-add `data-testid` props alongside `data-slot` in the component, or
   - Update tests to query by `role`, `label`, or text content (preferred approach per `CLAUDE.md`), or
   - Query by `data-slot` temporarily while migrating to semantic queries.

Key broken selectors:
- `data-testid="gallery-card-actions"` → use `getByRole('button', { name: /actions/i })`
- `data-testid="delete-confirm-delete"` → use `getByRole('button', { name: /delete/i })`
- `data-testid="wishlist-drag-preview"` → re-add `data-testid` to `WishlistDragPreview`
- `data-testid="set-card-action-view"` → re-add or query by role
- `data-testid="favorite-button"`, `data-testid="edit-button"` → re-add or query by `aria-label`
- `data-testid="alert-dialog"`, `data-testid="alert-dialog-content"` → query by `role="alertdialog"`

#### P3-D: `useUpdateItemPurchaseMutation` not in vi.mock

**Affected:** `@repo/app-wishlist-gallery` (~9 tests in `main-page.datatable.test.tsx` and others).

**Fix:** Update the `vi.mock('@repo/api-client/rtk/wishlist-gallery-api', ...)` factory in the affected test files to include `useUpdateItemPurchaseMutation`:
```typescript
vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useGetWishlistItemsQuery: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useUpdateItemPurchaseMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
  // ... other hooks
}))
```

#### P3-E: `@repo/knowledge-base` DB schema mismatches in tests

**Affected:** `@repo/knowledge-base` (11 tests).

| Test | Error | Fix |
|------|-------|-----|
| `smoke.test.ts > Vector Index` (2 tests) | pgvector IVFFlat index missing | Run the full migration in the test DB setup, including index creation (`CREATE INDEX ... USING ivfflat`) |
| `smoke.test.ts > Tasks Table` | `task_id NOT NULL` in `task_audit_log` | The trigger fires a cascade that nullifies `task_id`. Fix the trigger to use `ON DELETE CASCADE` instead of `SET NULL` on the `task_audit_log.task_id` FK |
| `crud-operations/__tests__/kb-list.test.ts` (6 tests) | `?|` operator fails | The `?|` PostgreSQL jsonb/array operator is unavailable — test DB may need pgvector or jsonb extension enabled |
| `embedding-client/__tests__/cache-manager.test.ts` | Transform error | TypeScript syntax error — check for unsupported syntax and ensure the Vitest config includes the correct transformer |
| `embedding-client/__tests__/batch-processor.test.ts > AC4` | Cache hit failure | DB integration test — ensure the test DB is seeded and the embedding cache table is populated |

#### P3-F: `@repo/gallery` GalleryDataTable test failures

**Affected:** `@repo/gallery` (44 tests across 7 test files for `GalleryDataTable`).

The gallery data table was significantly refactored (sorting, multi-sort, column composability). The tests were written against the previous API.

**Fix approach:**
1. Run failing tests individually to identify the exact assertion mismatch.
2. For CSS class assertions (`applies hover and transition classes`) — check if class names changed in the new table implementation.
3. For sort state assertions — verify the new sort state shape matches test expectations.
4. For `data-testid="status-*"` — re-add `data-testid` to status cells or update to `data-slot`.

Estimated scope: ~2 days of test updates across `GalleryDataTable.test.tsx`, `.sorting.test.tsx`, `.multiSort.test.tsx`, `.composable.test.tsx`, `.animations.test.tsx`.

#### P3-G: `@repo/app-dashboard` logger mock missing `createLogger`

**Affected:** `@repo/app-dashboard` (3 tests in `src/App.test.tsx`).

**Fix:** Update the `vi.mock('@repo/logger')` in `App.test.tsx` to export `createLogger`:
```typescript
vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  createLogger: vi.fn().mockReturnValue({ info: vi.fn(), error: vi.fn() }),
}))
```

#### P3-H: `@repo/app-dashboard` QuickActions text/count changes

**Affected:** 3 tests in `src/components/__tests__/QuickActions.test.tsx`.

**Fix:** Update test assertions to match the current number of action buttons (appears to be 1, not 3) and the current button text (not `"Browse Gallery"`). Or restore the removed buttons to the component.

#### P3-I: `@repo/upload` InstructionsUpload text selector failures

**Affected:** 10 tests in `src/components/InstructionsUpload/__tests__/InstructionsUpload.test.tsx`.

**Fix:** Replace `getByText('test.pdf')` / `getByText(/files to upload/i)` with selectors that handle split text nodes:
```typescript
// Instead of:
screen.getByText('test.pdf')
// Use:
screen.getByText((content, element) => element?.textContent?.includes('test.pdf') ?? false)
// Or wrap the text in a single element in the component and add a data-testid
```

#### P3-J: `@repo/main-app` router test — jsdom navigation

**Affected:** 1 test file `src/routes/__tests__/router.test.ts`.

**Fix:** Replace the test environment with a memory-based router or polyfill navigation:
```typescript
// In vitest.config.ts for main-app, or in the test file:
import { createMemoryHistory } from '@tanstack/react-router'
// Use createMemoryHistory() instead of relying on jsdom window.location
```

#### P3-K: `@repo/kbar-sync` path traversal test

**Affected:** 1 test — `scripts/__tests__/sync-story.test.ts > rejects path traversal via validateFilePath`.

**Fix:** Inspect `validateFilePath` to understand why it no longer throws for the path traversal input. Either restore the security check or update the test to use an input that is still rejected.

#### P3-L: `@repo/db` flush timer test

**Affected:** 1 test — `src/telemetry-sdk/__tests__/init.test.ts > INIT-002`.

**Fix:** Check what interval value the SDK now uses and update the assertion:
```typescript
// Current test expects:
expect(spy).toHaveBeenCalledWith(5000, expect.any(Function))
// If the interval changed, update to match the actual value
```

#### P3-M: `@repo/app-instructions-gallery` — MSW unhandled requests

**Affected:** Multiple integration tests.

**Fix:** Add MSW handlers for the missing routes in the test setup:
```typescript
// In src/test/setup.ts or the specific test file's beforeAll
server.use(
  http.get('/mocs/:mocId', ({ params }) => {
    return HttpResponse.json(mockMocData)
  }),
)
```

#### P3-N: `@repo/app-instructions-gallery` — drag event `dataTransfer` not supported in jsdom

**Affected:** `src/components/Uploader/__tests__/Accessibility.test.tsx`, `FinalizeFlow.integration.test.tsx`.

**Fix:** Mock `dataTransfer` in the test setup:
```typescript
Object.defineProperty(window, 'dataTransfer', {
  value: { effectAllowed: '', dropEffect: '' },
  writable: true,
})
```
Or use a drag-event polyfill library for jsdom.

---

### P4 — Lint Errors (code style, all auto-fixable or trivial)

| Package | Errors | Primary Rules | Fix Approach | Effort |
|---------|--------|--------------|--------------|--------|
| @repo/accessibility-testing | 55 | `no-undef` (Element, MutationObserver, require) | Add `env: { browser: true, node: true }` to ESLint config | XS |
| @repo/knowledge-base | 29 | `no-useless-escape`, `import/order`, `import/no-duplicates`, `no-undef`, `no-unused-vars` | Auto-fix with `eslint --fix`; manually remove `STAGES`, `goal`, `result`, `effectivePriority` | S |
| @repo/lego-api | 18 | `no-unused-vars`, `prettier/prettier`, `import/order` | Remove unused type imports; `eslint --fix` for prettier/order | S |
| @repo/app-instructions-gallery | 26 | `no-unused-vars` (upload-page-fix.tsx), `import/order` | Delete or complete `upload-page-fix.tsx`; if a WIP file, move unused vars to separate branch | S |
| @repo/api-core | 5 | `prettier/prettier` | `eslint --fix` (all auto-fixable) | XS |
| @repo/main-app | 5 | `import/order`, `no-console` | `eslint --fix` for order; replace `console.log` with `logger.info` | XS |
| @repo/api-client | 1 | `prettier/prettier` | `eslint --fix` | XS |
| @repo/app-component-library | 1 | `no-unused-vars` (`z`) | Remove `import { z } from 'zod'` or restore Zod schemas | XS |
| @repo/upload-types | 1 | `no-console` (warning→error) | Replace `console.log` with `logger.info` from `@repo/logger` | XS |

**Bulk auto-fix command (run from monorepo root):**
```bash
pnpm lint:all --fix
```
This will resolve all `prettier/prettier` and `import/order` issues automatically. Manual work is needed for `no-undef` (eslint config), `no-unused-vars`, and `no-console`.

---

## Fix Backlog (sorted by priority and blast radius)

### FIX-001 — Resolve `@repo/knowledge-base` build (BLOCKER)
**Priority:** P1 | **Effort:** S (2–4h) | **Blast Radius:** 1 package
**Files to change:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — fix `.story` → `.stories[0]`
- `apps/api/knowledge-base/src/scripts/db-init.ts` — add `import { readFileSync } from 'fs'`
- `apps/api/knowledge-base/src/scripts/migrate-artifacts-to-kb.ts` — prefix `_STAGES` or delete
- `apps/api/knowledge-base/src/scripts/seed-kb-first-stories.ts` — remove `result` assignment
- `apps/api/knowledge-base/src/scripts/seed-kb-stories.ts` — fix narrowed `never` type

---

### FIX-002 — Deduplicate `react-hook-form` version (HIGH BLAST RADIUS)
**Priority:** P2 | **Effort:** XS (30min) | **Blast Radius:** 2 app packages, clears ~12 TS errors
```bash
# root package.json pnpm.overrides
"react-hook-form": "7.71.1"
pnpm install
```

---

### FIX-003 — Fix `@repo/api-client` `import.meta.env` type error (HIGH BLAST RADIUS)
**Priority:** P2 | **Effort:** XS (30min) | **Blast Radius:** Clears 9+ TS errors across all consuming apps

Add to `packages/core/api-client/tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```
Or add `/// <reference types="vite/client" />` to `src/env.d.ts`.

---

### FIX-004 — Fix `QuotaIndicator.tsx` missing Zod exports and unused `z` (HIGH BLAST RADIUS)
**Priority:** P2 | **Effort:** S (1–2h) | **Blast Radius:** Clears 8 TS errors + 1 lint error + 3 test file failures

- Add Zod schemas back to `QuotaIndicator.tsx` (`QuotaTypeSchema`, `QuotaInfoSchema`, etc.)
- Export `QUOTA_DISPLAY_NAMES` and `QuotaType`, `QuotaInfo` types
- Update `src/indicators/index.ts` to re-export them correctly

---

### FIX-005 — Remove unused RTK callback variables in `@repo/api-client`
**Priority:** P2 | **Effort:** XS (30min) | **Blast Radius:** Clears 11 TS6133 errors shared across 8 packages

Prefix `error`, `meta`, `result` with `_` in:
- `packages/core/api-client/src/rtk/gallery-api.ts:178`
- `packages/core/api-client/src/rtk/wishlist-api.ts` (multiple lines)

---

### FIX-006 — Add `VITE_SERVERLESS_API_BASE_URL` to test env config
**Priority:** P3 | **Effort:** XS (30min) | **Blast Radius:** Fixes 4 test files across 2 packages

Add to `vitest.config.ts` for `@repo/app-component-library` and `@repo/reset-password`:
```typescript
test: { env: { VITE_SERVERLESS_API_BASE_URL: 'http://localhost:3000' } }
```

---

### FIX-007 — Install `msw` in `@repo/api-client` dev dependencies
**Priority:** P3 | **Effort:** XS (30min) | **Blast Radius:** Fixes 3 test files, 1 type check failure
```bash
cd packages/core/api-client && pnpm add -D msw
```

---

### FIX-008 — Resolve `@repo/upload-client` missing module
**Priority:** P2/P3 | **Effort:** M (4–8h) | **Blast Radius:** Fixes 3 TS errors + 10 test failures in `app-instructions-gallery`

Determine canonical package name (likely `@repo/upload`), update imports, add workspace dependency.

---

### FIX-009 — Add missing exports to `@repo/api-client` (upload mutations)
**Priority:** P2/P3 | **Effort:** S (2h) | **Blast Radius:** Fixes 3 TS errors + ~6 test failures

Add `useCreateUploadSessionMutation`, `useCompleteUploadSessionMutation`, `useUploadThumbnailMutation`, `CompleteUploadSessionResponse` to the appropriate API slice and re-export from index.

---

### FIX-010 — Update `@repo/gallery` tests after shadcn upgrade
**Priority:** P3 | **Effort:** L (1–2 days) | **Blast Radius:** 47 test failures across 9 test files

Systematically replace `getByTestId('gallery-card-actions')` etc. with `getByRole` or `data-slot` queries. Re-add `data-testid` to `GalleryCard` and `GalleryDataTable` if semantic queries are insufficient.

---

### FIX-011 — Update wishlist, dashboard, sets-gallery tests for `data-testid` changes
**Priority:** P3 | **Effort:** M (4–8h) | **Blast Radius:** ~20 test failures across 3 packages

Replace broken `data-testid` selectors in:
- `@repo/app-wishlist-gallery` — `delete-confirm-delete`, `wishlist-drag-preview`, screen-reader instructions
- `@repo/app-sets-gallery` — `set-card-action-view`
- `@repo/app-dashboard` — `QuickActions` text/count

---

### FIX-012 — Fix `vi.mock` factories missing new mutations
**Priority:** P3 | **Effort:** S (2h) | **Blast Radius:** ~9 test failures in `app-wishlist-gallery`

Update all `vi.mock('@repo/api-client/rtk/wishlist-gallery-api', ...)` factories to include `useUpdateItemPurchaseMutation`.

---

### FIX-013 — Fix `@repo/knowledge-base` test DB schema issues
**Priority:** P3 | **Effort:** M (4h) | **Blast Radius:** 11 test failures

- Apply full migration (including pgvector index creation) in test DB setup script
- Fix `task_audit_log` FK cascade from `SET NULL` to `CASCADE`
- Ensure `?|` array operator extension is loaded in test DB

---

### FIX-014 — Add `env: { browser: true }` to `@repo/accessibility-testing` ESLint config
**Priority:** P4 | **Effort:** XS (15min) | **Blast Radius:** 55 lint errors

```json
// packages/core/accessibility-testing/.eslintrc.json (or eslint.config.js)
{ "env": { "browser": true, "node": true } }
```

---

### FIX-015 — Auto-fix remaining lint issues
**Priority:** P4 | **Effort:** XS (1h) | **Blast Radius:** ~25 lint errors across 5 packages

```bash
# From monorepo root:
pnpm --filter @repo/api-core lint --fix
pnpm --filter @repo/api-client lint --fix
pnpm --filter @repo/main-app lint --fix
# Then manually:
# - Remove unused imports in lego-api
# - Replace console.log with logger.info in upload-types and main-app
# - Decide fate of apps/web/app-instructions-gallery/src/pages/upload-page-fix.tsx
```

---

### FIX-016 — Add missing peer deps to `@repo/cache`
**Priority:** P2 | **Effort:** XS (15min) | **Blast Radius:** 2 TS errors
```bash
cd packages/core/cache && pnpm add @repo/app-component-library@workspace:* lucide-react
```

---

### FIX-017 — Fix TanStack Router route registration in `@repo/main-app`
**Priority:** P2 | **Effort:** M (4h) | **Blast Radius:** ~8 TS errors
Register `/activity`, `/parts`, `/mocs/$mocId`, `/add`, `/collection` routes in the main-app router, or update sub-app components to not depend on root router type inference.

---

### FIX-018 — Fix `@repo/app-dashboard` logger mock + QuickActions test
**Priority:** P3 | **Effort:** XS (30min) | **Blast Radius:** 6 test failures
- Add `createLogger` to the logger vi.mock factory in `App.test.tsx`
- Reconcile `QuickActions` test with actual rendered button count/text

---

### FIX-019 — Fix `@repo/app-instructions-gallery` test infrastructure
**Priority:** P3 | **Effort:** M (4h) | **Blast Radius:** ~15 test failures
- Add MSW handlers for `/mocs/:mocId` in test setup
- Fix `dataTransfer` mock for drag events
- Resolve `useGetMocDetailQuery` mock to not return `undefined`

---

### FIX-020 — Fix minor single-package test issues
**Priority:** P3 | **Effort:** S (2h) | **Blast Radius:** 4 test failures across 4 packages
- `@repo/db` — update flush timer assertion to match actual interval value
- `@repo/kbar-sync` — restore path traversal check or update test input
- `@repo/main-app` — use `createMemoryHistory` in router test
- `@repo/upload` — update text selectors in `InstructionsUpload.test.tsx`

---

## Recommended Execution Order

```
Week 1 (blockers + shared root causes):
  FIX-001 → FIX-002 → FIX-003 → FIX-004 → FIX-005 → FIX-016
  → Re-run build + typecheck: should resolve @repo/knowledge-base build
    and clear 80+ type errors across 8 app packages

Week 1-2 (test infrastructure):
  FIX-006 → FIX-007 → FIX-008 → FIX-009
  → Unlocks 20+ test failures that stem from missing modules/env vars

Week 2 (test selectors):
  FIX-010 → FIX-011 → FIX-012 → FIX-018 → FIX-019
  → Addresses shadcn upgrade data-testid breakage across gallery/wishlist/dashboard

Week 2-3 (remaining type + route issues):
  FIX-017 → FIX-013 → FIX-020

Week 3 (lint cleanup):
  FIX-014 → FIX-015
```

**Expected outcome after all fixes:** 0 build failures, <5 type errors (acceptable skew), 0 lint failures, >95% test pass rate.
