# @repo/upload-client (DEPRECATED)

> ⚠️ **DEPRECATED**: This package has been consolidated into `@repo/upload` as of story REPA-002.
> Please migrate to `@repo/upload` instead.

## Migration Guide

All functionality from `@repo/upload-client` has been moved to `@repo/upload/client`.

### Before (Old)

```typescript
import { uploadFile, uploadToPresignedUrl, createUploadManager } from '@repo/upload-client'
```

### After (New)

```typescript
import { uploadFile, uploadToPresignedUrl, createUploadManager } from '@repo/upload'
```

### What Changed?

1. **Package name**: `@repo/upload-client` → `@repo/upload`
2. **Source location**: Code migrated from `packages/core/upload-client/src/` to `packages/core/upload/src/client/`
3. **All exports available at root**: No need to import from `/client` subpath - use `@repo/upload` directly

### Migration Steps

1. Update `package.json`:
   ```diff
   - "@repo/upload-client": "workspace:*",
   + "@repo/upload": "workspace:*",
   ```

2. Update imports:
   ```diff
   - import { ... } from '@repo/upload-client'
   + import { ... } from '@repo/upload'
   ```

3. Run `pnpm install`

### Finalize Client Migration

The `finalizeClient.ts` duplicate files in `apps/web/main-app` and `apps/web/app-instructions-gallery` have been consolidated into `@repo/upload/client/finalize.ts`.

**Before:**
```typescript
import { finalizeSession } from '@/services/api/finalizeClient'
```

**After:**
```typescript
import { finalizeSession } from '@repo/upload'
```

## Why Was This Deprecated?

As part of the repackaging effort (REPA epic), we consolidated upload-related functionality into a single, cohesive package to:

- Reduce duplication (finalize client was duplicated across apps)
- Improve discoverability (all upload features in one place)
- Simplify dependency management
- Create a single source of truth for upload client code

## Support

For migration assistance or questions, see:
- Story REPA-002: Upload client consolidation
- `packages/core/upload/README.md`

---

**Last updated**: 2026-02-10 (Story REPA-002)
