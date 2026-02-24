# Monorepo Health Audit Report
**Date:** 2026-02-22
**Scope:** All workspaces (excluding @repo/playwright)

---

## Executive Summary

| Check | Packages Checked | Passed | Failed |
|-------|-----------------|--------|--------|
| Build | 58 | 57 | 1 |
| Type Check | 25 | 13 | 12 |
| Lint | 34 | 25 | 9 |
| Test | 82 | 68 | 14 |

**Overall:** 35 of 199 check-package combinations are failing. The dominant root causes are three shared-source issues that fan out across many consumers: (1) `import.meta.env` not typed in the `@repo/api-client` tsconfig, (2) unused-var / missing-export issues in `@repo/app-component-library/src/indicators/QuotaIndicator.tsx`, and (3) a `react-hook-form` version split (7.66 vs 7.71) that breaks `Control` typing.

---

## Build Failures

### @repo/knowledge-base

**Path:** `apps/api/knowledge-base`
**Exit code:** 2

| File | Line:Col | Error |
|------|----------|-------|
| `src/mcp-server/tool-handlers.ts` | 3719:21 | TS2339 — Property `story` does not exist on result type (should be `.stories[0]`) |
| `src/mcp-server/tool-handlers.ts` | 3720:24 | TS2339 — Property `story` does not exist on result type |
| `src/scripts/db-init.ts` | 79:21 | TS2304 — Cannot find name `readFileSync` (missing `fs` import) |
| `src/scripts/migrate-artifacts-to-kb.ts` | 102:7 | TS6133 — `STAGES` declared but never read |
| `src/scripts/seed-kb-first-stories.ts` | 196:11 | TS6133 — `result` declared but never read |
| `src/scripts/seed-kb-stories.ts` | 160:31 | TS2339 — Property `stage` does not exist on type `never` |
| `src/scripts/seed-kb-stories.ts` | 160:48 | TS2339 — Property `dir` does not exist on type `never` |

**Root causes:**
- `tool-handlers.ts`: destructuring shape changed — result object exposes `.stories[]` array, not a `.story` property.
- `db-init.ts`: `readFileSync` used without `import { readFileSync } from 'fs'`.
- `seed-kb-stories.ts`: a narrowed union is resolving to `never`; likely an incorrect conditional or missing type guard.

---

## Type Check Failures

### @repo/api-client (2 unique errors)

**Path:** `packages/core/api-client`

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/test/performance-benchmarks.test.tsx` | 10:29 | TS2307 | Cannot find module `msw/node` |
| `src/test/performance-benchmarks.test.tsx` | 11:43 | TS2307 | Cannot find module `msw` |

**Root cause:** `msw` is not installed (or not declared) in `@repo/api-client`. The test file imports `msw/node` which does not resolve.

---

### @repo/app-component-library (17 unique errors)

**Path:** `packages/core/app-component-library`

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `../api-client/src/config/environments.ts` | 24–29 | TS2339 | `Property 'env' does not exist on type 'ImportMeta'` (6 occurrences) |
| `../api-client/src/rtk/gallery-api.ts` | 123:60 | TS2339 | `Property 'env' does not exist on type 'ImportMeta'` |
| `../api-client/src/rtk/instructions-api.ts` | 82:60 | TS2339 | `Property 'env' does not exist on type 'ImportMeta'` |
| `../api-client/src/rtk/wishlist-api.ts` | 151:60 | TS2339 | `Property 'env' does not exist on type 'ImportMeta'` |
| `src/indicators/index.ts` | 5:3 | TS2305 | `QuotaTypeSchema` not exported from `./QuotaIndicator` |
| `src/indicators/index.ts` | 6:3 | TS2305 | `QuotaInfoSchema` not exported from `./QuotaIndicator` |
| `src/indicators/index.ts` | 7:3 | TS2724 | `QuotaIndicatorPropsSchema` — did you mean `QuotaIndicatorProps`? |
| `src/indicators/index.ts` | 8:3 | TS2724 | `QuotaBarPropsSchema` — did you mean `QuotaBarProps`? |
| `src/indicators/index.ts` | 9:3 | TS2724 | `QuotaCardPropsSchema` — did you mean `QuotaCardProps`? |
| `src/indicators/index.ts` | 10:3 | TS2459 | `QUOTA_DISPLAY_NAMES` declared locally, not exported |
| `src/indicators/index.ts` | 19:3 | TS2459 | `QuotaType` declared locally, not exported |
| `src/indicators/index.ts` | 20:3 | TS2459 | `QuotaInfo` declared locally, not exported |

**Root causes:**
- `import.meta.env` errors: `@repo/api-client` tsconfig does not include `vite/client` types; the library is compiled outside a Vite context by downstream consumers.
- `indicators/index.ts`: re-exports Zod schema names (`QuotaTypeSchema`, `QuotaInfoSchema`, etc.) that were renamed to plain interfaces inside `QuotaIndicator.tsx`. The barrel needs updating to match what `QuotaIndicator.tsx` actually exports.

---

### @repo/app-dashboard (12 unique errors)

**Path:** `apps/web/app-dashboard`

All 12 errors are in shared upstream files surfaced through `app-dashboard`'s tsconfig:

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `../../../packages/core/api-client/src/rtk/gallery-api.ts` | 178:32 | TS6133 | `'error' is declared but its value is never read` |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 219:32 | TS6133 | `'error'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 307:64 | TS6133 | `'meta'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 326:27 | TS6133 | `'result'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 326:35 | TS6133 | `'error'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 445:64 | TS6133 | `'meta'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 461:24 | TS6133 | `'result'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 461:32 | TS6133 | `'error'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 520:64 | TS6133 | `'meta'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 536:27 | TS6133 | `'result'` unused |
| `../../../packages/core/api-client/src/rtk/wishlist-api.ts` | 536:35 | TS6133 | `'error'` unused |
| `../../../packages/core/app-component-library/src/indicators/QuotaIndicator.tsx` | 1:1 | TS6133 | `'z'` declared but never read |

**Root cause:** All errors are in shared library source, not app-dashboard itself. Fixing `@repo/api-client` RTK files and `QuotaIndicator.tsx` will clear this package.

---

### @repo/app-inspiration-gallery (24 unique errors)

**Path:** `apps/web/app-inspiration-gallery`

Includes the same 12 shared upstream errors as `@repo/app-dashboard`, plus 12 package-specific errors:

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/components/DraggableInspirationGallery/__tests__/DraggableInspirationGallery.test.tsx` | 14:5 | TS2698 | Spread types may only be created from object types |
| `src/components/DraggableInspirationGallery/__tests__/DraggableInspirationGallery.test.tsx` | 62:13 | TS2322 | Test fixture missing `userId` field added to item type |
| `src/components/DraggableInspirationGallery/__tests__/DraggableInspirationGallery.test.tsx` | 75:13 | TS2322 | Same — test fixture stale |
| `src/components/EmptyState/__tests__/EmptyState.test.tsx` | 15:15 | TS2741 | `variant` prop now required, test passes `{}` |
| `src/components/GalleryLoadingSkeleton/__tests__/GalleryLoadingSkeleton.test.tsx` | 6:18 | TS6133 | `screen` imported but never used |
| `src/components/SortableAlbumCard/__tests__/SortableAlbumCard.test.tsx` | 28:13 | TS2739 | Fixture missing `childAlbumCount`, `index`, `totalItems` |
| `src/components/SortableAlbumCard/__tests__/SortableAlbumCard.test.tsx` | 34:13 | TS2739 | Same |
| `src/components/SortableInspirationCard/__tests__/SortableInspirationCard.test.tsx` | 28:13 | TS2739 | Fixture missing `index`, `totalItems` |
| `src/components/SortableInspirationCard/__tests__/SortableInspirationCard.test.tsx` | 34:13 | TS2739 | Same |
| `src/pages/__tests__/main-page.test.tsx` | 18:5 | TS2698 | Spread types — mock object type resolution failure |
| `src/pages/__tests__/main-page.test.tsx` | 42:5 | TS2698 | Same |
| `src/pages/__tests__/main-page.test.tsx` | 57:5 | TS2698 | Same |

**Root cause (local):** Component prop interfaces were expanded (new required fields added), but the test fixtures were not updated.

---

### @repo/app-instructions-gallery (74 unique errors)

**Path:** `apps/web/app-instructions-gallery`

Includes the 12 shared upstream errors plus 62 package-specific errors. Key groupings:

**react-hook-form version mismatch (TS2741) — `_updateIsValidating` missing:**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/components/MocEdit/EditForm.tsx` | 114:8 | TS2322 | `UseFormReturn` incompatible — rhf 7.66 vs 7.71 |
| `src/components/MocEdit/EditForm.tsx` | 118:13 | TS2741 | `_updateIsValidating` missing in 7.66 `Control` type |
| `src/components/MocEdit/EditForm.tsx` | 149:13 | TS2741 | Same |
| `src/components/MocEdit/EditForm.tsx` | 180:13 | TS2741 | Same |
| `src/components/MocEdit/EditForm.tsx` | 203:13 | TS2741 | Same |
| `src/components/MocEdit/EditForm.tsx` | 51:27 | TS2769 | No overload — caused by the same mismatch |

**Missing module `@repo/upload-client`:**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/hooks/usePresignedUpload.ts` | 25:51 | TS2307 | Cannot find module `@repo/upload-client` |
| `src/hooks/__tests__/usePresignedUpload.test.ts` | 17:31 | TS2307 | Same |
| `src/components/InstructionsUpload/__tests__/presigned-integration.test.tsx` | 68:51 | TS2307 | Same |

**Missing exports from `@repo/api-client`:**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/hooks/usePresignedUpload.ts` | 21:3 | TS2305 | `useCreateUploadSessionMutation` not exported |
| `src/hooks/usePresignedUpload.ts` | 22:3 | TS2305 | `useCompleteUploadSessionMutation` not exported |
| `src/hooks/usePresignedUpload.ts` | 23:8 | TS2305 | `CompleteUploadSessionResponse` not exported |

**shadcn component prop changes (TS2322):**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/components/InstructionCard/index.tsx` | 87:7 | TS2322 | Card prop shape changed after shadcn upgrade |
| `src/components/MocForm/index.tsx` | 276:10 | TS2322 | `InputProps` changed |
| `src/components/MocForm/index.tsx` | 300:12 | TS2322 | `SelectTriggerProps` changed |
| `src/components/MocForm/index.tsx` | 326:10 | TS2322 | `TextareaHTMLAttributes` mismatch |
| `src/components/MocForm/index.tsx` | 354:10 | TS2322 | `TagInputProps` changed |

---

### @repo/app-sets-gallery (14 unique errors)

**Path:** `apps/web/app-sets-gallery`

Includes the 12 shared upstream errors plus 2 package-specific errors:

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/components/SetCard.tsx` | 165:7 | TS2322 | Card component prop shape changed (shadcn upgrade) |
| `src/test/a11y/__tests__/screen-reader.test.tsx` | 12:3 | TS6133 | `getAccessibleName` imported but never used |

---

### @repo/app-wishlist-gallery (12 unique errors)

**Path:** `apps/web/app-wishlist-gallery`

All 12 errors are the shared upstream errors (11 from `api-client` RTK files + 1 from `QuotaIndicator.tsx`). No package-specific TS errors.

---

### @repo/cache (2 unique errors)

**Path:** `packages/core/cache`

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/components/CacheDashboard/index.tsx` | 25:8 | TS2307 | Cannot find module `@repo/app-component-library` |
| `src/components/CacheDashboard/index.tsx` | 37:8 | TS2307 | Cannot find module `lucide-react` |

**Root cause:** `@repo/app-component-library` and `lucide-react` are not listed as dependencies in the `@repo/cache` `package.json`.

---

### @repo/knowledge-base (5 unique errors)

**Path:** `apps/api/knowledge-base`

Same as the build failures (TS errors prevent compilation):

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/scripts/db-init.ts` | 79:21 | TS2304 | `readFileSync` not defined |
| `src/scripts/migrate-artifacts-to-kb.ts` | 102:7 | TS6133 | `STAGES` unused |
| `src/scripts/seed-kb-first-stories.ts` | 196:11 | TS6133 | `result` unused |
| `src/scripts/seed-kb-stories.ts` | 160:31 | TS2339 | `stage` does not exist on type `never` |
| `src/scripts/seed-kb-stories.ts` | 160:48 | TS2339 | `dir` does not exist on type `never` |

---

### @repo/main-app (54 unique errors)

**Path:** `apps/web/main-app`

Includes the 12 shared upstream errors plus 42 package-specific errors. Key groupings:

**react-hook-form version mismatch (same as `app-instructions-gallery`):**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/components/MocEdit/EditForm.tsx` | 113:8 | TS2322 | `UseFormReturn` incompatible |
| `src/components/MocEdit/EditForm.tsx` | 117:13 | TS2741 | `_updateIsValidating` missing |
| `src/components/MocEdit/EditForm.tsx` | 148:13 | TS2741 | Same |
| `src/components/MocEdit/EditForm.tsx` | 179:13 | TS2741 | Same |
| `src/components/MocEdit/EditForm.tsx` | 202:13 | TS2741 | Same |
| `src/components/MocEdit/EditForm.tsx` | 50:27 | TS2769 | No overload |

**Missing local modules:**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/routes/pages/InstructionsNewPage.tsx` | 51:58 | TS2307 | Cannot find module `@/hooks/useUploadManager` |
| `src/routes/pages/InstructionsNewPage.tsx` | 52:59 | TS2307 | Cannot find module `@/services/api/finalizeClient` |
| `src/routes/pages/InstructionsNewPage.tsx` | 58:8 | TS2307 | Cannot find module `@/types/moc-form` |

**TanStack Router route path mismatches (TS2322) — paths not registered in router:**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `../app-dashboard/src/components/ActivityFeed/index.tsx` | 107:19 | TS2322 | `"/activity"` not a valid route |
| `../app-dashboard/src/components/PartsTable/index.tsx` | 116:23 | TS2322 | `"/mocs/$mocId"` not a valid route |
| `../app-dashboard/src/components/PartsTable/index.tsx` | 149:17 | TS2322 | `"/parts"` not a valid route |
| `../app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx` | 222:22 | TS2322 | `"/add"` not a valid route |
| `../app-wishlist-gallery/src/components/GotItModal/index.tsx` | 131:26 | TS2322 | `"/collection"` not a valid route |
| `../app-wishlist-gallery/src/pages/AddItemPage.tsx` | 236:29 | TS2322 | `"/add"` not valid |
| `../app-wishlist-gallery/src/pages/main-page.tsx` | 596:19 / 610:38 / 635:17 | TS2322 | `"/add"` not valid (×3) |

**shadcn prop type changes:**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `../app-instructions-gallery/src/components/InstructionCard/index.tsx` | 87:7 | TS2322 | Card prop shape changed |
| `../app-instructions-gallery/src/components/MocForm/index.tsx` | 276:10 / 300:12 / 326:10 / 354:10 | TS2322 | Input/Select/Textarea/TagInput prop shape changed |
| `../app-sets-gallery/src/components/SetCard.tsx` | 165:7 | TS2322 | Same card prop change |

**Implicit `any` / unknown errors:**

| File | Line:Col | Code | Message |
|------|----------|------|---------|
| `src/routes/pages/InstructionsNewPage.tsx` | 126:17 | TS7006 | `state` implicitly `any` |
| `src/routes/pages/InstructionsNewPage.tsx` | 129:15 / 129:23 | TS7006 | `fileId`, `errorCode` implicitly `any` |
| `src/routes/pages/InstructionsNewPage.tsx` | 315:7 / 358:5 | TS7006 | `f` implicitly `any` |
| `src/services/auth/__tests__/AuthStateSync.integration.test.tsx` | 104:25 / 109:29 / 139:25 / 144:29 | TS2345 | `unknown` not assignable to `{ auth: AuthState }` |

---

### @repo/reset-password (12 unique errors)

**Path:** `apps/web/reset-password`

All 12 errors are shared upstream errors (same 12 as `@repo/app-dashboard`). No package-specific TS errors.

---

### @repo/user-settings (12 unique errors)

**Path:** `apps/web/user-settings`

All 12 errors are shared upstream errors. No package-specific TS errors.

---

## Lint Failures

**9 packages failed lint** out of 34 checked.

### @repo/accessibility-testing — 55 errors

**Path:** `packages/core/accessibility-testing`
**Affected files:** `src/axe.ts`, `src/index.ts`, `src/keyboard.ts`, `src/screen-reader.ts`

| Rule | Count | Representative location |
|------|-------|------------------------|
| `no-undef` — `'Element' is not defined` | 52 | Throughout all 4 files |
| `no-undef` — `'require' is not defined` | 1 | `src/index.ts:14` |
| `no-undef` — `'MutationObserver' is not defined` | 2 | `src/screen-reader.ts:143, 160` |

**Root cause:** The ESLint config for this package does not include `browser` or `dom` globals. `Element`, `MutationObserver`, etc. are DOM globals that ESLint does not recognise without `env: { browser: true }` or equivalent.

---

### @repo/api-client — 1 error

**Path:** `packages/core/api-client`
**Affected file:** `src/rtk/wishlist-gallery-api.ts:344`

| Rule | Message |
|------|---------|
| `prettier/prettier` | Replace multi-line generic params with single-line form |

**Root cause:** Prettier formatting drift — auto-fixable with `eslint --fix`.

---

### @repo/api-core — 5 errors

**Path:** `packages/api-core`
**Affected files:** `src/auth-jose.ts`, `src/auth.ts`, `src/db.ts`, `src/types.ts`

| Rule | Count | Details |
|------|-------|---------|
| `prettier/prettier` — Insert `,` | 3 | Lines 20:88, 40:88, 61:31 |
| `prettier/prettier` — Replace multi-line block | 2 | Lines 7:51, 64:29 |

**Root cause:** Prettier formatting drift — all 5 are auto-fixable.

---

### @repo/app-component-library — 1 error

**Path:** `packages/core/app-component-library`
**Affected file:** `src/indicators/QuotaIndicator.tsx:1`

| Rule | Message |
|------|---------|
| `@typescript-eslint/no-unused-vars` | `'z'` is defined but never used |

**Root cause:** `z` was imported from `zod` but is no longer referenced after the QuotaIndicator was refactored away from Zod schemas.

---

### @repo/app-instructions-gallery — 26 errors (25 errors + 1 warning)

**Path:** `apps/web/app-instructions-gallery`
**Affected files:** `src/components/InstructionsUpload/__types__/index.ts`, `src/components/ThumbnailUpload/__types__/index.ts`, `src/pages/detail-page.tsx`, `src/pages/upload-page-fix.tsx`

| Rule | Count | Representative detail |
|------|-------|-----------------------|
| `import/order` — empty line between import groups | 2 | Lines 6:1 (two files) |
| `@typescript-eslint/no-unused-vars` | 22 | Imports and vars in `upload-page-fix.tsx` (icons, hooks, refs) |
| `no-console` | 1 | `src/pages/upload-page-fix.tsx:202` (warning) |

**Root cause:** `upload-page-fix.tsx` appears to be a work-in-progress file with many unused imports/variables (icons, hooks, refs) that were scaffolded but not yet wired up.

---

### @repo/knowledge-base — 29 errors

**Path:** `apps/api/knowledge-base`
**Affected files:** `src/audit/retention-policy.ts`, `src/mcp-server/tool-schemas.ts`, `src/scripts/db-init.ts`, `src/scripts/migrate-artifacts-simple.ts`, `src/scripts/migrate-artifacts-to-kb.ts`, `src/scripts/migrate-stories-to-yaml.ts`, `src/scripts/seed-kb-first-stories.ts`, `src/working-set/generator.ts`

| Rule | Count | Representative detail |
|------|-------|-----------------------|
| `no-useless-escape` — `\Z` in regex | 12 | `tool-schemas.ts` lines 204, 215, 230, 244, 363, 398, 426, 483, 497, 517, 587, 600 |
| `import/order` — empty line between groups | 5 | `tool-schemas.ts` lines 46, 1237, 1259, 1281, 1302, 1862 |
| `import/no-duplicates` | 3 | `tool-schemas.ts` lines 1264, 1285, 1307 |
| `no-undef` — `readFileSync` | 1 | `db-init.ts:79` |
| `no-constant-condition` | 1 | `retention-policy.ts:119` |
| `no-case-declarations` | 2 | `migrate-artifacts-simple.ts:192,193` |
| `@typescript-eslint/no-unused-vars` | 4 | `STAGES` (migrate-artifacts-to-kb.ts:102), `goal` (seed-kb-first-stories.ts:174), `result` (195), `effectivePriority` (generator.ts:129) |
| `no-useless-escape` — `\Z` | *(counted above)* | — |

---

### @repo/lego-api — 18 errors

**Path:** `apps/api/lego-api`
**Affected files:** `domains/gallery/adapters/storage.ts`, `domains/gallery/ports/index.ts`, `domains/inspiration/adapters/repositories.ts`, `domains/inspiration/adapters/storage.ts`

| Rule | Count | Detail |
|------|-------|--------|
| `@typescript-eslint/no-unused-vars` | 14 | Unused type imports (`err`, `CreateImageInput`, `isNull`, `Result`, `PaginatedResult`, `PaginationInput`, `Album`, `UpdateInspirationInput`, `UpdateAlbumInput`, `InspirationError`, `AlbumError`, `CreateInspirationInput`, `CreateAlbumInput`) |
| `prettier/prettier` | 2 | Lines 152:10, 153:3 |
| `import/order` | 2 | Lines 2:1, 12:1 |

---

### @repo/main-app — 5 errors (4 errors + 1 warning)

**Path:** `apps/web/main-app`

| Rule | Line | Detail |
|------|------|--------|
| `import/order` | 15:1 | `@/components/Layout/RootLayout` import order |
| `import/order` | 16:1 | `@/components/ErrorBoundary/ErrorBoundary` import order |
| `import/order` | 17:1 | Empty line between import groups |
| `import/order` | 17:1 | `@/store/slices/authSlice` type import order |
| `no-console` | 195:5 | `console.log` warning |

---

### @repo/upload-types — 1 warning (treated as error via `--max-warnings 0`)

**Path:** `packages/upload-types`

| Rule | Line | Detail |
|------|------|--------|
| `no-console` | 11:1 | `console.log` statement |

---

## Test Failures

### @repo/accessibility-testing

**Result:** No test files found — exits code 1.
**Root cause:** Test files appear to have been moved or excluded. The vitest config glob finds no `.test.ts(x)` files in `packages/core/accessibility-testing`.

---

### @repo/api-client (4 test files failed / 1 test case failed)

**Path:** `packages/core/api-client`
**Summary:** 4 failed | 19 passed | 1 failing assertion out of 461

| Test File | Error |
|-----------|-------|
| `src/test/backward-compatibility.test.ts` | `Failed to resolve import "msw/node"` — `msw` not installed |
| `src/test/comprehensive-integration.test.ts` | `Failed to resolve import "msw/node"` — same |
| `src/test/performance-benchmarks.test.tsx` | `Failed to resolve import "msw/node"` — same |
| `src/rtk/__tests__/wishlist-gallery-api.test.ts > WishlistQueryParamsSchema > should validate all query params` | `expected false to be true` — Zod schema validation change |

**Root cause:** `msw` is not in `@repo/api-client` dependencies. The `WishlistQueryParamsSchema` validation failure indicates a schema tightening that broke an existing test expectation.

---

### @repo/app-component-library (3 test files failed)

**Path:** `packages/core/app-component-library`
**Summary:** 3 failed | 23 passed | 0 test-level failures recorded (file-level only)

| Test File | Error |
|-----------|-------|
| `src/__tests__/loading-states.test.tsx` | `VITE_SERVERLESS_API_BASE_URL` env var required — config throws at import time |
| `src/gates/__tests__/FeatureGate.test.tsx` | `VITE_SERVERLESS_API_BASE_URL` env var required |
| `src/indicators/__tests__/QuotaIndicator.test.tsx` | `VITE_SERVERLESS_API_BASE_URL` env var required |

**Note:** 8 `HTMLFormElement.prototype.requestSubmit` errors also logged (jsdom limitation), but those tests still pass.
**Root cause:** `environments.ts` in `@repo/api-client` throws at module load time if `VITE_SERVERLESS_API_BASE_URL` is not set. Test environments don't load `.env` files by default.

---

### @repo/app-dashboard (5 files failed / 6 tests failed)

**Path:** `apps/web/app-dashboard`
**Summary:** 5 failed | 3 passed | 6 tests failed of 13

| Test | Error |
|------|-------|
| `src/App.test.tsx > renders the page heading` | `Cannot read properties of null (reading 'isServer')` |
| `src/App.test.tsx > displays the welcome message` | Same |
| `src/App.test.tsx > shows the Getting Started card` | Same |
| `src/components/__tests__/QuickActions.test.tsx > renders all action buttons` | `Unable to find element with text: 'Browse Gallery'` — text content changed |
| `src/components/__tests__/QuickActions.test.tsx > links to correct routes` | `expected [1] to have length 3` — button count changed |
| `src/components/__tests__/QuickActions.test.tsx > renders buttons with correct styling` | Same count mismatch |

**Root cause:** `Cannot read properties of null (reading 'isServer')` is a logger mock issue (`[vitest] No "createLogger" export`). `QuickActions` tests reflect a UI change where the number of action buttons was reduced.

---

### @repo/app-instructions-gallery (20 files failed / 28 tests failed)

**Path:** `apps/web/app-instructions-gallery`
**Summary:** 20 failed | 17 passed | 28 tests failed of 397

Key failure clusters:

| Cluster | Root Cause |
|---------|-----------|
| `src/App.test.tsx`, `src/pages/__tests__/upload-page.test.tsx`, `src/components/InstructionsUpload/__tests__/*.test.tsx` | Missing `@repo/upload-client` module — import fails at test startup |
| `src/hooks/__tests__/usePresignedUpload.test.ts`, `src/components/InstructionsUpload/__tests__/presigned-integration.test.tsx` | Same missing module + `useCreateUploadSessionMutation` / `useCompleteUploadSessionMutation` not exported from `@repo/api-client` |
| `src/components/MocDetailDashboard/__tests__/*.test.tsx`, `src/pages/__tests__/MocDetailPage*.test.tsx` | `useGetMocDetailQuery` returns `undefined` — RTK Query hook not properly mocked / missing |
| `src/pages/__tests__/main-page.test.tsx > toggles favorite`, `navigates to edit` | `data-testid="favorite-button"` / `data-testid="edit-button"` not found — component used different attributes after shadcn upgrade |
| `src/components/Uploader/__tests__/Accessibility.test.tsx`, `FinalizeFlow.integration.test.tsx` | `dataTransfer.effectAllowed` not supported in jsdom drag events |
| `src/components/ThumbnailUpload/__tests__/ThumbnailUpload*.test.tsx` | `useUploadThumbnailMutation` not a function — missing export from `@repo/api-client` |
| `src/pages/__tests__/MocDetailPage.integration.test.tsx` | MSW unhandled request — handler for GET `/mocs/:id` not in test setup |

---

### @repo/app-sets-gallery (3 files failed / 1 test failed)

**Path:** `apps/web/app-sets-gallery`
**Summary:** 3 failed | 10 passed | 1 test failed of 89

| Test | Error |
|------|-------|
| `src/components/__tests__/SetCard.test.tsx > renders actions menu and wires callbacks` | `Unable to find element by [data-testid="set-card-action-view"]` |
| `src/App.test.tsx` | `window.getComputedStyle(elt, pseudoElt)` not implemented (jsdom) |
| `src/pages/__tests__/add-set-page.test.tsx` | Same jsdom `getComputedStyle` error |

**Root cause (SetCard):** `data-testid` for the action view button was renamed or removed during component update.

---

### @repo/app-wishlist-gallery (8 files failed / 18 tests failed)

**Path:** `apps/web/app-wishlist-gallery`
**Summary:** 8 failed | 31 passed | 18 tests failed of 621

| Cluster | Root Cause |
|---------|-----------|
| `src/components/DeleteConfirmModal/__tests__/*.test.tsx` | `data-testid="delete-confirm-delete"` not found — button's `data-testid` changed |
| `src/components/WishlistDragPreview/__tests__/*.test.tsx` | `data-testid="wishlist-drag-preview"` not found — attribute removed or renamed |
| `src/components/TagInput/__tests__/*.test.tsx` | `data-testid` or DOM structure changed after component update |
| `src/components/SortableWishlistCard/__tests__/*.test.tsx` | Screen-reader instruction element not found |
| `src/pages/__tests__/main-page.datatable.test.tsx` | Multiple — `useUpdateItemPurchaseMutation` not exported from `@repo/api-client/rtk/wishlist-gallery-api` mock |
| `src/pages/__tests__/AddItemPage*.test.tsx` | `VITE_SERVERLESS_API_BASE_URL` env var + missing mock exports |

---

### @repo/db (1 test file failed / 1 test failed)

**Path:** `packages/backend/db`
**Summary:** 1 failed | 10 passed | 1 test failed of 118

| Test | Error |
|------|-------|
| `src/telemetry-sdk/__tests__/init.test.ts > SDK Initialization > INIT-002: should start flush timer on initialization` | `AssertionError: expected "spy" to be called with arguments: [5000, Any<Function>]` |

**Root cause:** The flush timer interval changed (or the test expectation for the interval argument is stale).

---

### @repo/gallery (9 files failed / 47 tests failed)

**Path:** `packages/core/gallery`
**Summary:** 9 failed | 26 passed | 47 tests failed of 534

Key failure clusters:

| Cluster | Root Cause |
|---------|-----------|
| `src/__tests__/GalleryCard.test.tsx > renders actions slot`, `stops propagation` | `data-testid="gallery-card-actions"` not found — component uses `data-slot` after shadcn upgrade |
| `src/__tests__/GalleryCard.test.tsx > aria-selected` | `aria-selected` attribute not present — component structure change |
| `src/__tests__/GalleryDataTable*.test.tsx` (7 files, 44 tests) | CSS class / sort state / column rendering failures — underlying table component changed |
| `src/hooks/__tests__/useGalleryKeyboard.test.ts`, `useKeyboardShortcuts.test.ts`, `useRovingTabIndex.test.ts` | Keyboard hook interface changes |

**Root cause:** A shadcn table upgrade replaced `data-testid` with `data-slot` attributes throughout `GalleryCard` and `GalleryDataTable`. All test selectors using `data-testid="gallery-card-actions"`, `data-testid="status-*"` etc. are now stale.

---

### @repo/kbar-sync (1 test file failed / 1 test failed)

**Path:** `packages/kbar-sync`
**Summary:** 1 failed | 9 passed | 1 test failed of 124

| Test | Error |
|------|-------|
| `scripts/__tests__/sync-story.test.ts > path security > rejects path traversal via validateFilePath` | `AssertionError: expected [Function] to throw an error` |

**Root cause:** `validateFilePath` no longer throws for the path traversal input used in the test. The security validation logic was loosened or the test input no longer triggers it.

---

### @repo/knowledge-base (4 files failed / 11 tests failed)

**Path:** `apps/api/knowledge-base`
**Summary:** 4 failed | 40 passed | 11 tests failed of 1050

| Test File | Root Cause |
|-----------|-----------|
| `src/embedding-client/__tests__/cache-manager.test.ts` | Transform error — TypeScript syntax the bundler couldn't process |
| `src/__tests__/smoke.test.ts > Vector Index > should have embedding index` | `expected 0 to be greater than 0` — pgvector IVFFlat index not created in test DB |
| `src/__tests__/smoke.test.ts > Vector Index > should use IVFFlat index type` | Same — index missing |
| `src/__tests__/smoke.test.ts > Tasks Table > should insert and retrieve task` | PG error `23502` — `task_id NOT NULL` constraint violation in `task_audit_log` (trigger firing with NULL) |
| `src/__tests__/smoke.test.ts > Data Operations > should cache and retrieve embedding` | Dependent failure after tasks table error |
| `src/crud-operations/__tests__/kb-list.test.ts` (6 tests) | `Failed query` — `?|` array operator not supported in the test DB (likely sqlite or missing pg extension) |
| `src/embedding-client/__tests__/batch-processor.test.ts > AC4 > should handle all cache hits` | Database-dependent integration test — DB not seeded correctly |

---

### @repo/main-app (1 test file failed)

**Path:** `apps/web/main-app`
**Summary:** 1 failed | 67 passed | 14 skipped

| Test File | Error |
|-----------|-------|
| `src/routes/__tests__/router.test.ts` | `Error: Not implemented: navigation (except hash changes)` — jsdom does not support full navigation |

**Root cause:** The router test exercises actual browser navigation that jsdom does not implement. Needs a `MemoryRouter` approach or `vitest-environment-jsdom` navigation polyfill.

---

### @repo/reset-password (1 test file failed)

**Path:** `apps/web/reset-password`
**Summary:** 1 failed | 0 tests run

| Test File | Error |
|-----------|-------|
| `src/components/__tests__/PasswordStrengthIndicator.test.tsx` | `Error: VITE_SERVERLESS_API_BASE_URL environment variable is required` |

**Root cause:** Same as `@repo/app-component-library` — `environments.ts` throws at import time when the env var is absent in test context.

---

### @repo/upload (2 files failed / 11 tests failed)

**Path:** `packages/core/upload`
**Summary:** 2 failed | 20 passed | 11 tests failed of 499

| Cluster | Root Cause |
|---------|-----------|
| `src/components/RateLimitBanner/__tests__/*.test.tsx > Accessibility > should hide icons from screen readers` | `expected 0 to be greater than 0` — icon visibility assertion |
| `src/components/InstructionsUpload/__tests__/InstructionsUpload.test.tsx` (10 tests) | `Unable to find element with text: /files to upload/i`, `test.pdf`, `file1.pdf` — text content split across DOM elements after component restructure |

**Root cause:** `InstructionsUpload` component restructuring split text nodes (file names, counts) into child elements. Tests using `getByText()` with exact strings now fail. Need `getByRole` or `findByText` with flexible matcher.

---

## Package × Check Matrix

| Package | Build | Types | Lint | Test |
|---------|-------|-------|------|------|
| @repo/accessibility-testing | PASS | — | FAIL | FAIL |
| @repo/api-client | PASS | FAIL | FAIL | FAIL |
| @repo/api-core | PASS | — | FAIL | — |
| @repo/app-component-library | PASS | FAIL | FAIL | FAIL |
| @repo/app-dashboard | PASS | FAIL | PASS | FAIL |
| @repo/app-inspiration-gallery | PASS | FAIL | PASS | — |
| @repo/app-instructions-gallery | PASS | FAIL | FAIL | FAIL |
| @repo/app-sets-gallery | PASS | FAIL | PASS | FAIL |
| @repo/app-wishlist-gallery | PASS | FAIL | PASS | FAIL |
| @repo/cache | PASS | FAIL | PASS | PASS |
| @repo/db | PASS | — | PASS | FAIL |
| @repo/gallery | PASS | — | PASS | FAIL |
| @repo/kbar-sync | PASS | — | PASS | FAIL |
| @repo/knowledge-base | **FAIL** | FAIL | FAIL | FAIL |
| @repo/lego-api | PASS | — | FAIL | PASS |
| @repo/main-app | PASS | FAIL | FAIL | FAIL |
| @repo/reset-password | PASS | FAIL | PASS | FAIL |
| @repo/upload | PASS | — | PASS | FAIL |
| @repo/upload-types | PASS | — | FAIL | PASS |
| @repo/user-settings | PASS | FAIL | PASS | PASS |

`—` = package not included in that check run or no issues found.
