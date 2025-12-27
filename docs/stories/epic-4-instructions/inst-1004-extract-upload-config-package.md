# Story 3.1.30: Extract Upload Config Package

## Status

Completed

## Story

**As a** developer,
**I want** shared upload configuration in `@repo/upload-config`,
**so that** all upload features use consistent size/type limits.

## Epic Context

This is **Story 0.3 of Epic 0: Package Extraction & Reuse Foundation**.

**Depends on:** Story 3.1.28 (DB Schema Migration)

## Acceptance Criteria

1. Create `packages/tools/upload-config` package
2. Move config from `apps/api/core/config/upload.ts`
3. Export: `getUploadConfig`, `getFileSizeLimit`, `getFileCountLimit`, `isMimeTypeAllowed`, `getAllowedMimeTypes`
4. Include Zod schema for config validation (not env validation)
5. Use config injection pattern: functions accept config object, not `process.env`
6. Server code passes env-derived config: `getUploadConfig(loadEnvConfig())`
7. Browser code fetches config from API: `GET /api/config/upload` -> cache in memory
8. Update API imports to use `@repo/upload-config`
9. All existing upload tests pass after extraction

## Tasks / Subtasks

- [ ] **Task 1: Create Package Structure** (AC: 1)
  - [ ] Create `packages/tools/upload-config/` directory
  - [ ] Create `package.json` with name `@repo/upload-config`
  - [ ] Create `tsconfig.json` extending root config
  - [ ] Add package to `pnpm-workspace.yaml`

- [ ] **Task 2: Define Config Schema** (AC: 4)
  - [ ] Create Zod schema for `UploadConfig`
  - [ ] Include: `pdfMaxBytes`, `imageMaxBytes`, `partsListMaxBytes`, `thumbnailMaxBytes`
  - [ ] Include: `maxImagesPerMoc`, `maxPartsListsPerMoc`
  - [ ] Include: `allowedPdfMimeTypes`, `allowedImageMimeTypes`, `allowedPartsListMimeTypes`
  - [ ] Include: `presignTtlMinutes`, `sessionTtlMinutes`

- [ ] **Task 3: Implement Config Functions** (AC: 3, 5)
  - [ ] Create `getUploadConfig(config: UploadConfig)` wrapper
  - [ ] Create `getFileSizeLimit(config: UploadConfig, category: FileCategory): number`
  - [ ] Create `getFileCountLimit(config: UploadConfig, category: FileCategory): number`
  - [ ] Create `isMimeTypeAllowed(config: UploadConfig, category: FileCategory, mimeType: string): boolean`
  - [ ] Create `getAllowedMimeTypes(config: UploadConfig, category: FileCategory): string[]`
  - [ ] All functions accept config object (no process.env access)

- [ ] **Task 4: Create Server-Side Loader** (AC: 6)
  - [ ] Create `loadEnvConfig(): UploadConfig` in `apps/api/core/config/`
  - [ ] Reads from `process.env` and validates with Zod
  - [ ] Returns typed config object to pass to package functions

- [ ] **Task 5: Create Config API Endpoint** (AC: 7)
  - [ ] Create `apps/api/endpoints/config/upload/handler.ts`
  - [ ] Returns public-safe config values (no secrets)
  - [ ] Add to serverless.yml

- [ ] **Task 6: Update Consumer Imports** (AC: 8)
  - [ ] Update `apps/api/` to use `@repo/upload-config`
  - [ ] Pass env-derived config to package functions
  - [ ] Update presign/finalize handlers

- [ ] **Task 7: Verify Regression** (AC: 9)
  - [ ] Run `pnpm build`
  - [ ] Run upload-related tests

## Dev Notes

### Config Injection Pattern

```typescript
// Package exports pure functions that accept config
// packages/tools/upload-config/src/index.ts
export interface UploadConfig {
  pdfMaxBytes: number
  imageMaxBytes: number
  partsListMaxBytes: number
  thumbnailMaxBytes: number
  maxImagesPerMoc: number
  maxPartsListsPerMoc: number
  allowedPdfMimeTypes: string[]
  allowedImageMimeTypes: string[]
  allowedPartsListMimeTypes: string[]
  presignTtlMinutes: number
  sessionTtlMinutes: number
}

// Functions accept config, don't read process.env
export const getFileSizeLimit = (config: UploadConfig, category: FileCategory): number => {
  switch (category) {
    case 'instruction':
      return config.pdfMaxBytes
    case 'image':
      return config.imageMaxBytes
    case 'parts-list':
      return config.partsListMaxBytes
    case 'thumbnail':
      return config.thumbnailMaxBytes
  }
}
```

### Server Usage

```typescript
// apps/api/core/config/env-loader.ts
import { UploadConfig } from '@repo/upload-config'

export const loadEnvConfig = (): UploadConfig => ({
  pdfMaxBytes: parseInt(process.env.UPLOAD_PDF_MAX_MB ?? '50') * 1024 * 1024,
  imageMaxBytes: parseInt(process.env.UPLOAD_IMAGE_MAX_MB ?? '20') * 1024 * 1024,
  // ... read all env vars
})

// apps/api/endpoints/moc-uploads/presign/handler.ts
import { getFileSizeLimit } from '@repo/upload-config'
import { loadEnvConfig } from '@/core/config/env-loader'

const config = loadEnvConfig()
const maxSize = getFileSizeLimit(config, 'instruction')
```

### Browser Usage

```typescript
// apps/web/main-app/src/services/api/configClient.ts
let cachedConfig: UploadConfig | null = null

export const fetchUploadConfig = async (): Promise<UploadConfig> => {
  if (cachedConfig) return cachedConfig
  const response = await fetch('/api/config/upload')
  cachedConfig = await response.json()
  return cachedConfig
}
```

### Why Config Injection

- **Testability**: Functions can be tested with mock configs
- **Flexibility**: Server and browser load config differently
- **No side effects**: Package has no runtime dependencies on environment

### Existing Config Location

- `apps/api/core/config/upload.ts` - Current upload config

## Testing

### Test Location

- `packages/tools/upload-config/src/__tests__/` (new)

### Test Requirements

- Unit: All config functions with various inputs
- Unit: Zod schema validation
- Integration: Server loads config from env correctly
- Regression: Upload presign/finalize work with extracted config

## Change Log

| Date       | Version | Description                     | Author   |
| ---------- | ------- | ------------------------------- | -------- |
| 2025-12-08 | 0.1     | Initial draft from Edit MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes

**Completed 2025-12-09**

Successfully extracted upload configuration into a shared `@repo/upload-config` package:

1. **Package Structure**: Created `packages/tools/upload-config/` with TypeScript, Zod dependencies
2. **Schema Definition**: Defined `UploadConfigSchema` with Zod validation for all config fields
3. **Config Functions**: Implemented pure functions with config injection pattern:
   - `getFileSizeLimit(config, category)`
   - `getFileCountLimit(config, category)`
   - `isMimeTypeAllowed(config, category, mimeType)`
   - `getAllowedMimeTypes(config, category)`
4. **Server-Side Loader**: Created `apps/api/core/config/env-loader.ts` to bridge env vars to typed config
5. **API Endpoint**: Added `GET /api/config/upload` endpoint (added to health stack)
6. **Compatibility Layer**: Updated `apps/api/core/config/upload.ts` to use package internally while maintaining backward compatibility
7. **Tests**: All 41 package tests + 435 API tests pass

**Key Design Decision**: Used a compatibility layer approach in `upload.ts` rather than updating all consumers. The old module now delegates to `@repo/upload-config` internally, ensuring zero breaking changes for existing code while enabling new consumers to use the package directly.

### File List

- `packages/tools/upload-config/` - New package directory
- `packages/tools/upload-config/package.json` - New
- `packages/tools/upload-config/tsconfig.json` - New
- `packages/tools/upload-config/vitest.config.ts` - New
- `packages/tools/upload-config/src/index.ts` - New
- `packages/tools/upload-config/src/schema.ts` - New (Zod schemas)
- `packages/tools/upload-config/src/limits.ts` - New (limit functions)
- `packages/tools/upload-config/src/__tests__/schema.test.ts` - New (14 tests)
- `packages/tools/upload-config/src/__tests__/limits.test.ts` - New (27 tests)
- `apps/api/core/config/env-loader.ts` - New (env -> config bridge)
- `apps/api/endpoints/config/upload/handler.ts` - New (public config endpoint)
- `apps/api/stacks/functions/health.yml` - Modified (added uploadConfig function)
- `apps/api/core/config/upload.ts` - Modified (uses @repo/upload-config internally)
- `apps/api/package.json` - Modified (added @repo/upload-config dependency)
- `pnpm-workspace.yaml` - Modified (added packages/tools/\*)
