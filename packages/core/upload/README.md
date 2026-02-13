# @repo/upload

Consolidated upload package for the LEGO MOC instructions platform. This package is the single source of truth for all upload-related functionality including client code, hooks, image processing, UI components, and type definitions.

## Status

**Under Construction** - This package was created as part of the REPA epic to consolidate ~10,800 lines of duplicate upload code scattered across multiple packages and apps.

## Directory Structure

```
src/
  client/       # XHR upload client functions (from @repo/upload-client) — REPA-002
  hooks/        # Upload hooks (useUploadManager, useUploaderSession) — REPA-003
  image/        # Image processing utilities (compression, HEIC) — REPA-004
  components/   # Upload UI components (Uploader, ThumbnailUpload) — REPA-005
  types/        # Zod schemas and type definitions — REPA-006
  index.ts      # Main barrel export
```

## Usage

```typescript
// Main import (all exports)
import { ... } from '@repo/upload'

// Subpath imports (targeted)
import { ... } from '@repo/upload/client'
import { ... } from '@repo/upload/hooks'
import { ... } from '@repo/upload/image'
import { ... } from '@repo/upload/components'
import { ... } from '@repo/upload/types'
```

## Migration Roadmap

| Story | Directory | Source | Status |
|-------|-----------|--------|--------|
| REPA-002 | `client/` | @repo/upload-client | Pending |
| REPA-003 | `hooks/` | apps/web/main-app hooks | Pending |
| REPA-004 | `image/` | app-wishlist-gallery | Pending |
| REPA-005 | `components/` | apps/web upload components | Pending |
| REPA-006 | `types/` | @repo/upload-types | Pending |

## Packages Being Consolidated

- `@repo/upload-client` (packages/core/upload-client)
- `@repo/upload-types` (packages/core/upload-types)
- `@repo/upload-config` (packages/tools/upload-config)
- Upload hooks from apps/web/main-app
- Upload components from apps/web/main-app and app-instructions-gallery
- Image processing from app-wishlist-gallery

## Known Issues

### FileValidationResult Schema - No Duplication ✅ (REPA-0510)

**Status**: AC-10 verified as NON-ISSUE. Both `ThumbnailUpload` and `InstructionsUpload` components already import `FileValidationResult` from `@repo/upload/types` - there is NO duplication.

**Current state**:
- `ThumbnailUpload/__types__/index.ts`: Re-exports FileValidationResult from @repo/upload/types
- `InstructionsUpload/__types__/index.ts`: Re-exports FileValidationResult from @repo/upload/types

The TODO comments in both files reference REPA-005 (parent story before split) and are now obsolete since the components have been migrated to @repo/upload in REPA-0510.

## Development

```bash
pnpm --filter @repo/upload build        # Build package
pnpm --filter @repo/upload check-types  # Type check
pnpm --filter @repo/upload lint         # Lint
pnpm --filter @repo/upload test         # Run tests
pnpm --filter @repo/upload test:watch   # Watch mode
```
