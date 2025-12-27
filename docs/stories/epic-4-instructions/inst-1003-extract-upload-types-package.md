# Story 3.1.29: Extract Upload Types Package

## GitHub Issue
- Issue: #249
- URL: https://github.com/michael-menard/monorepo/issues/249
- Status: Todo

## Status

Ready for Review

## Story

**As a** developer,
**I want** shared upload types in `@repo/upload-types`,
**so that** edit and future upload features use consistent type definitions.

## Epic Context

This is **Story 0.2 of Epic 0: Package Extraction & Reuse Foundation**.

**Depends on:** Story 3.1.28 (DB Schema Migration)

## Acceptance Criteria

1. Create `packages/core/upload-types` with proper `package.json` and `tsconfig.json`
2. Move types from `apps/web/main-app/src/types/uploader-session.ts` and `uploader-upload.ts`
3. Export: `UploaderSession`, `FileCategory`, `UploadStatus`, `UploadErrorCode`, `UploaderFileItem`, `UploadBatchState`
4. Move slug utilities from `apps/api/core/utils/slug.ts`: `slugify`, `findAvailableSlug`
5. Update imports in main-app and API to use `@repo/upload-types`
6. All existing upload tests pass

## Tasks / Subtasks

- [x] **Task 1: Create Package Structure** (AC: 1)
  - [x] Create `packages/core/upload-types/` directory
  - [x] Create `package.json` with name `@repo/upload-types`
  - [x] Create `tsconfig.json` extending root config
  - [x] Add package to `pnpm-workspace.yaml` (already included via `packages/core/*`)

- [x] **Task 2: Move Session/Upload Types** (AC: 2, 3)
  - [x] Move `UploaderSession` schema/type from `apps/web/main-app/src/types/uploader-session.ts`
  - [x] Move `FileCategory` enum/type
  - [x] Move `UploadStatus` enum/type
  - [x] Move `UploadErrorCode` enum/type
  - [x] Move `UploaderFileItem` schema/type
  - [x] Move `UploadBatchState` schema/type
  - [x] Create `src/index.ts` with all exports (package boundary barrel is acceptable)

- [x] **Task 3: Move Slug Utilities** (AC: 4)
  - [x] Move `slugify` function from `apps/api/core/utils/slug.ts`
  - [x] Move `findAvailableSlug` function
  - [x] Create `src/slug.ts` for slug utilities
  - [x] Export from package index

- [x] **Task 4: Update Consumer Imports** (AC: 5)
  - [x] Update `apps/web/main-app/` imports to use `@repo/upload-types`
  - [x] Update `apps/api/` imports to use `@repo/upload-types`
  - [x] Remove old type files from apps (left as re-exports with deprecation comments)

- [x] **Task 5: Verify Regression** (AC: 6)
  - [x] Run `pnpm build` to verify TypeScript compilation
  - [x] Run upload-related tests in main-app
  - [x] Run upload-related tests in API

## Dev Notes

### Package Structure

```
packages/core/upload-types/
├── src/
│   ├── index.ts           # Package exports (barrel file OK at package boundary)
│   ├── session.ts         # Session-related types
│   ├── upload.ts          # Upload-related types
│   └── slug.ts            # Slug utilities
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### package.json Template

```json
{
  "name": "@repo/upload-types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -b tsconfig.build.json",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "workspace:*"
  }
}
```

### Types to Extract

From `apps/web/main-app/src/types/uploader-session.ts`:
- `UploaderSessionSchema` / `UploaderSession`
- `FileCategory` (instruction, image, parts-list, thumbnail)

From `apps/web/main-app/src/types/uploader-upload.ts`:
- `UploadStatus` (pending, uploading, completed, failed)
- `UploadErrorCode`
- `UploaderFileItemSchema` / `UploaderFileItem`
- `UploadBatchStateSchema` / `UploadBatchState`

From `apps/api/core/utils/slug.ts`:
- `slugify(title: string): string`
- `findAvailableSlug(baseSlug: string, existingSlugs: string[]): string`

### Import Update Pattern

```typescript
// Before
import { UploaderSession } from '@/types/uploader-session'
import { slugify } from '@/core/utils/slug'

// After
import { UploaderSession, slugify } from '@repo/upload-types'
```

### Why Package Extraction

- **Shared across features**: Upload, Edit, future Sets/Gallery/Profile uploads
- **Single source of truth**: Zod schemas define both types and validation
- **Consistent slug generation**: Same logic for upload and edit flows

## Testing

### Test Location
- `packages/core/upload-types/src/__tests__/` (new)
- Existing tests in `apps/web/main-app/` and `apps/api/`

### Test Requirements
- Unit: Zod schema validation tests for all exported schemas
- Unit: `slugify` and `findAvailableSlug` function tests
- Regression: All existing upload feature tests pass

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-08 | 0.1 | Initial draft from Edit MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A

### Completion Notes

- Created `@repo/upload-types` package with 85 unit tests
- Moved session types, upload types, and slug utilities
- Updated imports in 7 consumer files (hooks, components, API handlers)
- Left old files as re-exports with deprecation comments for backward compatibility
- All tests pass: 85 package tests + 26 consumer tests

### File List

- `packages/core/upload-types/package.json` - New
- `packages/core/upload-types/tsconfig.json` - New
- `packages/core/upload-types/vitest.config.ts` - New
- `packages/core/upload-types/src/index.ts` - New
- `packages/core/upload-types/src/session.ts` - New
- `packages/core/upload-types/src/upload.ts` - New
- `packages/core/upload-types/src/slug.ts` - New
- `packages/core/upload-types/src/__tests__/session.test.ts` - New
- `packages/core/upload-types/src/__tests__/upload.test.ts` - New
- `packages/core/upload-types/src/__tests__/slug.test.ts` - New
- `apps/web/main-app/package.json` - Modified (added dependency)
- `apps/api/package.json` - Modified (added dependency)
- `apps/web/main-app/src/types/uploader-session.ts` - Modified (re-export with deprecation)
- `apps/web/main-app/src/types/uploader-upload.ts` - Modified (re-export with deprecation)
- `apps/web/main-app/src/types/__tests__/uploader-upload.test.ts` - Modified (updated imports)
- `apps/web/main-app/src/hooks/useUploadManager.ts` - Modified (updated imports)
- `apps/web/main-app/src/hooks/useUploaderSession.ts` - Modified (updated imports)
- `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx` - Modified (updated imports)
- `apps/web/main-app/src/components/Uploader/UploaderList/index.tsx` - Modified (updated imports)
- `apps/web/main-app/src/components/Uploader/UploaderFileItem/index.tsx` - Modified (updated imports)
- `apps/api/core/utils/slug.ts` - Modified (re-export with deprecation)
- `apps/api/endpoints/moc-instructions/edit/handler.ts` - Modified (updated imports)
- `apps/api/endpoints/moc-uploads/sessions/finalize/handler.ts` - Modified (updated imports)
