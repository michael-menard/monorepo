# @repo/upload-types (DEPRECATED)

**This package has been deprecated and merged into `@repo/upload/types`.**

## Migration Guide

All types have been migrated to `@repo/upload/types`. Update your imports as follows:

### Before:
```typescript
import { UploaderSession, FileMetadata, UploadBatchState } from '@repo/upload-types'
```

### After:
```typescript
import { UploaderSession, FileMetadata, UploadBatchState } from '@repo/upload/types'
```

## What Changed

- **Old location**: `packages/core/upload-types/src/`
- **New location**: `packages/core/upload/src/types/`

All types, schemas, and utilities remain the same. Only the import path has changed.

## Timeline

- This package will remain available during the transition period
- A deprecation warning will be shown when importing from this package
- The package will be removed in a future release

## Need Help?

See the migration story REPA-006 for detailed migration steps and affected files.
