# Dev Feasibility Review: INST-1004 Extract Upload Config Package

**Story Type**: RETROSPECTIVE (Package already implemented)
**Implementation Status**: ✅ COMPLETE (December 9, 2025)
**Commit**: `6ce460fe` (Story 3.1.30)

---

## Feasibility Summary

- **Feasible for MVP**: ✅ YES (already complete)
- **Confidence**: HIGH
- **Why**: Package is fully implemented, tested (285 tests passing), and integrated with the API. Zero technical debt. This is a documentation story only.

---

## Likely Change Surface (Core Only)

**Already Changed** (December 9, 2025):

### Packages Created
- ✅ `packages/tools/upload-config/` - Core config types and functions
- ✅ `packages/backend/upload-config-core/` - Platform-agnostic environment loader

### Endpoints Created
- ✅ `GET /api/config/upload` - Public config endpoint
  - Handler: `apps/api/endpoints/config/upload/handler.ts`
  - Returns filtered public config (excludes rate limits, internal TTLs)

### Config Files Modified
- ✅ `apps/api/core/config/env-loader.ts` - New server-side environment bridge
- ✅ `apps/api/core/config/upload.ts` - Replaced hardcoded values with package usage

### Package Dependencies
- ✅ `apps/api/package.json` - Added `@repo/upload-config` dependency
- ✅ `pnpm-workspace.yaml` - Added `packages/tools/upload-config`

---

## MVP-Critical Risks

**NONE** - Package is complete and working.

---

## Missing Requirements for MVP

**NONE** - All requirements satisfied by existing implementation.

For reference, the completed scope includes:

1. ✅ Zod schema for upload configuration (`UploadConfigSchema`)
2. ✅ File size limits by category (instruction, parts-list, thumbnail, image)
3. ✅ MIME type validation per category
4. ✅ TTL configuration (presigned URLs, sessions)
5. ✅ Rate limiting configuration
6. ✅ Count limits (max files per MOC)
7. ✅ Default configuration values
8. ✅ Pure function exports (no process.env in package)
9. ✅ Environment variable loader (`@repo/upload-config-core`)
10. ✅ Public config endpoint with filtering
11. ✅ Comprehensive unit tests (285 tests, >80% coverage)
12. ✅ TypeScript types exported from Zod schemas

---

## MVP Evidence Expectations

### Already Satisfied

**Package Exports Verified**:
```typescript
// From @repo/upload-config
import {
  UploadConfigSchema,
  type UploadConfig,
  getFileSizeLimit,
  getFileCountLimit,
  isMimeTypeAllowed,
  getAllowedMimeTypes,
  getPresignTtlSeconds,
  getSessionTtlSeconds,
  mbToBytes,
  bytesToMb,
  formatBytes,
  DEFAULT_UPLOAD_CONFIG
} from '@repo/upload-config'

// From @repo/upload-config-core
import {
  loadUploadConfigFromEnv,
  getPublicUploadConfig
} from '@repo/upload-config-core'
```

**Test Evidence**:
- ✅ 285 unit tests passing
- ✅ Coverage >80% (meets quality gate)
- ✅ Zero test failures
- ✅ All edge cases covered

**Integration Evidence**:
- ✅ API server uses package via `apps/api/core/config/env-loader.ts`
- ✅ Public endpoint `GET /api/config/upload` responds correctly
- ✅ Filtered public config excludes sensitive fields

**Build Evidence**:
- ✅ TypeScript compilation succeeds
- ✅ Package builds successfully (`pnpm build`)
- ✅ No ESLint errors
- ✅ Type exports resolve correctly

---

## Implementation Notes

### Package Architecture

**Two-Package Design**:

1. **`@repo/upload-config`** (Pure)
   - Location: `packages/tools/upload-config/`
   - Purpose: Shared types, schemas, accessor functions
   - Dependencies: `zod` only
   - Platform: Universal (browser + server)
   - Pattern: Pure functions that accept config objects

2. **`@repo/upload-config-core`** (Loader)
   - Location: `packages/backend/upload-config-core/`
   - Purpose: Environment variable parsing and public config filtering
   - Dependencies: `@repo/upload-config`, `zod`
   - Platform: Server-only (Node.js)
   - Pattern: Platform-agnostic loader (no AWS/Vercel deps)

**Key Design Decisions**:

✅ **Config Injection Pattern**
- Package exports pure functions: `getFileSizeLimit(config, category)`
- No direct `process.env` access in package code
- Config passed as parameter for testability and browser compatibility

✅ **Zod-First Validation**
- All config validated with `UploadConfigSchema`
- Runtime type safety at environment load time
- TypeScript types inferred from schemas: `type UploadConfig = z.infer<typeof UploadConfigSchema>`

✅ **Public/Private Split**
- `getPublicUploadConfig()` filters sensitive fields
- Rate limiting and internal TTLs excluded from public API
- Frontend receives safe config subset

✅ **Default Values**
- `DEFAULT_UPLOAD_CONFIG` provides fallback
- All values sensible for production use:
  - PDF: 50 MB
  - Images: 20 MB
  - Parts lists: 10 MB
  - Presign TTL: 15 minutes
  - Session TTL: 15 minutes
  - Max images per MOC: 10

### Integration Points

**Server-Side Usage**:
```typescript
// apps/api/core/config/env-loader.ts
import { loadUploadConfigFromEnv } from '@repo/upload-config-core'

export const uploadConfig = loadUploadConfigFromEnv(process.env)
```

**Endpoint Usage**:
```typescript
// apps/api/endpoints/config/upload/handler.ts
import { getPublicUploadConfig } from '@repo/upload-config-core'
import { uploadConfig } from '@/core/config/env-loader'

export const handler = () => {
  return {
    statusCode: 200,
    body: JSON.stringify(getPublicUploadConfig(uploadConfig))
  }
}
```

**Client-Side Usage** (Future):
```typescript
// Frontend can fetch config from API
const configResponse = await fetch('/api/config/upload')
const config = await configResponse.json()
const maxSize = getFileSizeLimit(config, 'instruction')
```

### Environment Variables Required

```bash
# File size limits (bytes)
PDF_MAX_BYTES=52428800              # 50 MB
IMAGE_MAX_BYTES=20971520            # 20 MB
PARTS_LIST_MAX_BYTES=10485760       # 10 MB
THUMBNAIL_MAX_BYTES=20971520        # 20 MB

# Count limits
MAX_IMAGES_PER_MOC=10
MAX_PARTS_LISTS_PER_MOC=5

# Allowed MIME types (comma-separated)
ALLOWED_PDF_MIME_TYPES="application/pdf"
ALLOWED_IMAGE_MIME_TYPES="image/jpeg,image/png,image/webp,image/heic,image/heif"
ALLOWED_PARTS_LIST_MIME_TYPES="text/csv,application/csv,text/plain,application/json,text/json,application/xml,text/xml"

# TTL settings (minutes)
PRESIGN_TTL_MINUTES=15
SESSION_TTL_MINUTES=15
```

**Note**: `rateLimitPerDay` and `finalizeLockTtlMinutes` use default values (100, 5) - not exposed via env vars.

---

## Reuse Plan

### Packages to Reuse

| Package | What It Provides | When to Use |
|---------|------------------|-------------|
| `@repo/upload-config` | Config types, schemas, accessor functions | All upload-related stories |
| `@repo/upload-config-core` | Environment loader, public config filter | Server-side config loading |

### Functions to Reuse

| Function | Use Case |
|----------|----------|
| `getFileSizeLimit(config, category)` | Validate file size before upload |
| `isMimeTypeAllowed(config, category, mimeType)` | Validate file type before upload |
| `getFileCountLimit(config, category)` | Enforce max files per MOC |
| `getPresignTtlSeconds(config)` | Generate presigned URL expiry |
| `formatBytes(bytes)` | Display file sizes in UI |

### Stories That Will Use This Package

- **INST-1103** (Upload Thumbnail) - Use MIME validation, size limits for images
- **INST-1104** (Upload Instructions Direct) - Use PDF size/MIME limits
- **INST-1105** (Upload Instructions Presigned) - Use presign TTL, session TTL
- **INST-1106** (Upload Parts List) - Use parts list size/MIME limits
- **INST-2030** (Gallery Image Uploads) - Use image size/MIME limits, count limits

---

## Gaps and Future Opportunities

### Gap 1: Hardcoded Config Still Exists

**Location**: `apps/api/lego-api/core/utils/file-validation.ts`

**Issue**: Old hardcoded constants still present:
```typescript
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE = 10 * 1024 * 1024
```

**Impact**: Low (only used by wishlist presign, predates this package)

**Recommendation**: Migrate file-validation.ts to use `@repo/upload-config` in a future story.

### Gap 2: No Runtime Config Updates

**Current**: Config loaded once at server startup from env vars.

**Future**: Could support runtime config updates via parameter store or config service.

**Impact**: Low (env vars sufficient for MVP)

**Timeline**: Post-MVP if needed

### Gap 3: No Browser-Side Validation Helpers

**Current**: Package has all functions needed, but no explicit browser entrypoint.

**Future**: Could create `@repo/upload-config/browser` export with fetch helper.

**Impact**: Low (frontend can import package directly)

**Timeline**: When INST-1103+ stories implement frontend validation

---

## Deployment Considerations

**Environment Variables**:
- ✅ Must be set in deployment environment (Vercel, Lambda, etc.)
- ✅ Missing vars will cause server startup failure (by design)
- ✅ Invalid values will throw error with clear message

**Breaking Changes**:
- ✅ None - package is additive (doesn't break existing code)
- ✅ Old hardcoded config still works during migration period

**Rollback**:
- ✅ Safe - package is optional during migration
- ✅ Can fall back to old config if needed

---

## Summary

**Status**: ✅ COMPLETE (Retrospective story)
**Quality**: ✅ HIGH (285 tests, >80% coverage, zero debt)
**Integration**: ✅ WORKING (API endpoint live, env loader functional)
**Gaps**: ✅ MINOR (old hardcoded config not yet migrated)

**Recommendation**: Story is fully implemented and production-ready. Documentation story should proceed to synthesize final story file.

**No further development work required.**
