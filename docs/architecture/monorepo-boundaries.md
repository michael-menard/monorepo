# Monorepo Package Boundaries & Architectural Rules

## Purpose
This document defines clear boundaries for where code should live in our monorepo to prevent architectural drift and ensure maintainability.

## Directory Structure

```
apps/
  web/
    main-app/              # Main shell application - orchestrates everything
    app-dashboard/         # Dashboard feature app
    app-instructions-gallery/  # Instructions gallery feature app
    app-inspiration-gallery/   # Inspiration gallery feature app
    app-sets-gallery/      # Sets gallery feature app
    app-wishlist-gallery/  # Wishlist gallery feature app
    reset-password/        # Reset password standalone app
    user-settings/         # User settings feature app
    playwright/            # E2E tests
  api/                     # Backend API (serverless)

packages/
  core/                    # Frontend shared packages
    app-component-library/ # UI components (@repo/ui)
    logger/                # Logging (@repo/logger)
    api-client/            # API client (@repo/api-client)
    upload/                # Upload utilities
    gallery/               # Gallery components
    cache/                 # Caching utilities
    design-system/         # Design tokens
    accessibility/         # A11y utilities
  backend/                 # Backend shared packages
    lambda-utils/          # Lambda utilities
    cognito-client/        # Cognito integration
    s3-client/             # S3 integration
    db/                    # Database utilities
  shared/                  # Cross-cutting packages
    api-types/             # Shared types
```

## Core Principles

### Principle 0: Reuse Before Reinvent 🔄
**The Golden Rule:** Before implementing anything, check if it already exists in `packages/`

**Process:**
1. Check `packages/core/` for existing shared components/utilities
2. Check `packages/backend/` for existing backend utilities
3. If it exists → **USE IT, don't duplicate**
4. If it doesn't exist but will be used by 2+ apps → **CREATE IT in packages/**
5. If it's truly app-specific → implement in the app

**Common Reusable Packages:**
- `@repo/ui` - All shared UI components (Button, Card, Table, etc.)
- `@repo/gallery` - Gallery components (Grid, Card, Filters, Search, Pagination)
- `@repo/upload` - Upload utilities and components
- `@repo/api-client` - API client and auth utilities
- `@repo/logger` - Logging (NEVER use console.log)

## Architectural Rules

### Rule 1: Auth Configuration Lives in main-app
**Rationale:** Auth is app-wide infrastructure that needs to be initialized before React renders.

✅ **Correct:**
- `apps/web/main-app/src/lib/amplify-config.ts` - Amplify configuration
- `apps/web/main-app/src/lib/auth-utils.ts` - Auth helper functions
- `apps/web/main-app/src/store/slices/authSlice.ts` - Auth state management

❌ **Incorrect:**
- `packages/core/auth/` - Don't create a separate auth package for app-specific config
- `apps/web/app-dashboard/src/lib/auth.ts` - Don't duplicate auth in feature apps

**Exception:** Reusable auth utilities that multiple apps need should go in `packages/core/api-client/auth/`

### Rule 2: Feature Apps Compose from Packages
**Rationale:** Feature apps should be thin wrappers that compose shared packages, not reimplementations.

✅ **Correct:**
- `apps/web/app-instructions-gallery/` imports `@repo/gallery` components
- `apps/web/app-inspiration-gallery/` imports `@repo/gallery` components
- App only contains app-specific configuration and data fetching

❌ **Incorrect:**
- `apps/web/app-instructions-gallery/src/components/GalleryGrid/` - Reimplementing gallery
- `apps/web/app-inspiration-gallery/src/components/ImageCard/` - Duplicating card component
- Importing from another feature app: `import { X } from '@repo/app-instructions-gallery'`

**Example - Instructions Gallery App Structure:**
```
apps/web/app-instructions-gallery/
  src/
    api/
      instructionsApi.ts        # App-specific API endpoints
    pages/
      InstructionsGalleryPage.tsx  # Composes @repo/gallery components
    types/
      instructions.ts           # App-specific types
```

**The page should look like:**
```typescript
import { GalleryGrid, GalleryCard, GalleryFilters } from '@repo/gallery'
import { useGetInstructionsQuery } from './api/instructionsApi'

export function InstructionsGalleryPage() {
  const { data } = useGetInstructionsQuery()

  return (
    <GalleryGrid>
      {data?.map(item => (
        <GalleryCard key={item.id} {...item} />
      ))}
    </GalleryGrid>
  )
}
```

### Rule 3: UI Components Go in app-component-library
**Rationale:** Shared UI components should be reusable across all apps.

✅ **Correct:**
- `packages/core/app-component-library/src/Button/` - Shared Button component
- Import: `import { Button } from '@repo/ui'`

❌ **Incorrect:**
- `apps/web/main-app/src/components/shared/Button/` - Don't duplicate in apps
- Creating app-specific variants of shared components (extend instead)

### Rule 4: Backend Utilities Stay in packages/backend
**Rationale:** Backend code should never leak into frontend packages.

✅ **Correct:**
- `packages/backend/lambda-utils/` - Lambda helper functions
- `packages/backend/cognito-client/` - Cognito SDK wrapper

❌ **Incorrect:**
- `packages/core/lambda-utils/` - Backend code in frontend package
- `apps/web/main-app/src/lib/lambda.ts` - Backend code in frontend app

### Rule 5: Shared Types Go in packages/shared/api-types
**Rationale:** Types used by both frontend and backend should be in a neutral location.

✅ **Correct:**
- `packages/shared/api-types/src/user.ts` - User type definitions
- Import: `import { UserSchema } from '@repo/api-types'`

❌ **Incorrect:**
- Duplicating types in frontend and backend
- Importing backend types in frontend or vice versa

## Decision Tree: Where Should My Code Go?

```
STEP 1: Does this already exist in packages/?
  YES → USE IT! Don't duplicate.
  NO  → Continue to Step 2

STEP 2: Will this be used by 2+ apps?
  YES → CREATE IT in packages/core/ or packages/backend/
  NO  → Continue to Step 3

STEP 3: What type of code is it?

  Is it a UI component (Button, Card, Table, etc.)?
    → packages/core/app-component-library/

  Is it a gallery component (Grid, Filters, Search, Pagination)?
    → packages/core/gallery/

  Is it upload-related (uploader, file validation, progress)?
    → packages/core/upload/ or packages/core/upload-client/

  Is it auth configuration/initialization?
    → apps/web/main-app/src/lib/

  Is it specific to one feature (dashboard, gallery, etc.)?
    → apps/web/app-{feature}/src/
    BUT: Only app-specific logic, compose from packages/

  Is it a backend utility (Lambda, AWS SDK, etc.)?
    → packages/backend/{service}/

  Is it a type shared between frontend and backend?
    → packages/shared/api-types/

  Is it a frontend utility used by multiple apps?
    → packages/core/{utility}/

When in doubt, ask in the story or create an ADR!
```

## Common Duplication Mistakes to Avoid

### ❌ Mistake 1: Reimplementing Gallery Components
**Wrong:**
```typescript
// apps/web/app-instructions-gallery/src/components/GalleryGrid.tsx
export function GalleryGrid() { /* reimplemented */ }
```

**Right:**
```typescript
// apps/web/app-instructions-gallery/src/pages/InstructionsGalleryPage.tsx
import { GalleryGrid } from '@repo/gallery'
```

### ❌ Mistake 2: Duplicating Upload Logic
**Wrong:**
```typescript
// apps/web/app-instructions-gallery/src/components/FileUploader.tsx
export function FileUploader() { /* reimplemented upload logic */ }
```

**Right:**
```typescript
// apps/web/app-instructions-gallery/src/pages/UploadPage.tsx
import { FileUploader } from '@repo/upload-client'
```

### ❌ Mistake 3: Creating App-Specific UI Components
**Wrong:**
```typescript
// apps/web/app-dashboard/src/components/Button.tsx
export function Button() { /* custom button */ }
```

**Right:**
```typescript
// apps/web/app-dashboard/src/components/DashboardHeader.tsx
import { Button } from '@repo/ui'
```

### ❌ Mistake 4: Duplicating API Client Logic
**Wrong:**
```typescript
// apps/web/app-dashboard/src/lib/api-client.ts
export const apiClient = createApiClient() // reimplemented
```

**Right:**
```typescript
// apps/web/app-dashboard/src/api/dashboardApi.ts
import { apiClient } from '@repo/api-client'
```

## Enforcement

1. **Story Template:** All stories must include "Implementation Location" section
2. **Story Template:** All stories must list "Shared Packages Used"
3. **Code Review:** PRs that violate these rules should be rejected
4. **Code Review:** PRs that duplicate existing packages should be rejected
5. **Linting:** Consider adding ESLint rules to enforce import boundaries
6. **Documentation:** Update this document when adding new packages

## Examples from Existing Stories

### Story 1.13: Amplify Configuration ✅
- **Location:** `apps/web/main-app/src/lib/amplify-config.ts`
- **Rationale:** App-wide auth initialization, runs before React
- **Correct:** Yes - auth config belongs in main-app

### Story 3.1.1: Instructions Gallery Scaffolding ✅
- **Location:** `apps/web/app-instructions-gallery/`
- **Uses:** `@repo/gallery` package for all gallery components
- **Rationale:** Feature app composes shared gallery package, doesn't reimplement
- **Correct:** Yes - app is thin wrapper around shared packages

### Anti-Example: Instructions Gallery (Wrong Way) ❌
```typescript
// ❌ WRONG - Reimplementing gallery in the app
apps/web/app-instructions-gallery/
  src/
    components/
      GalleryGrid/        // ❌ Don't reimplement
      GalleryCard/        // ❌ Don't reimplement
      GalleryFilters/     // ❌ Don't reimplement
```

### Correct Example: Instructions Gallery (Right Way) ✅
```typescript
// ✅ CORRECT - Composing from shared package
apps/web/app-instructions-gallery/
  src/
    api/
      instructionsApi.ts  // ✅ App-specific API
    pages/
      InstructionsGalleryPage.tsx  // ✅ Composes @repo/gallery
    types/
      instructions.ts     // ✅ App-specific types

// InstructionsGalleryPage.tsx
import { GalleryGrid, GalleryCard, GalleryFilters } from '@repo/gallery'
```

## Questions?

If you're unsure where code should live:
1. Check this document first
2. Look for similar existing code
3. Ask in the story issue or create an ADR
4. Update this document with the decision

