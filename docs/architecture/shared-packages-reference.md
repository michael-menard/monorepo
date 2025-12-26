# Shared Packages Quick Reference

## 🔄 The Golden Rule: Check Here FIRST Before Implementing Anything!

Before writing ANY code, check if it already exists in one of these packages.

## Frontend Packages (packages/core/)

### @repo/ui (app-component-library)
**What:** All shared UI components
**When to use:** Any time you need a UI component
**Common components:**
- Button, Card, Table, Form, Input, Select, Checkbox, Radio
- Dialog, Modal, Drawer, Popover, Tooltip
- Badge, Avatar, Skeleton, Spinner
- Tabs, Accordion, Collapsible

**Import:**
```typescript
import { Button, Card, Table } from '@repo/ui'
```

**❌ Don't:** Create app-specific versions of these components
**✅ Do:** Use these components in all apps

---

### @repo/gallery
**What:** Gallery components for displaying collections
**When to use:** Any gallery/grid view (instructions, inspiration, sets, wishlist)
**Common components:**
- GalleryGrid - Responsive grid layout
- GalleryCard - Card for gallery items
- GalleryFilters - Filter controls
- GallerySearch - Search component
- GalleryPagination - Pagination controls
- GallerySort - Sort controls
- GalleryLightbox - Image lightbox

**Import:**
```typescript
import { GalleryGrid, GalleryCard, GalleryFilters } from '@repo/gallery'
```

**❌ Don't:** Reimplement gallery in each app
**✅ Do:** Compose gallery package in feature apps

**Example:**
```typescript
// apps/web/app-instructions-gallery/src/pages/InstructionsGalleryPage.tsx
import { GalleryGrid, GalleryCard } from '@repo/gallery'

export function InstructionsGalleryPage() {
  const { data } = useGetInstructionsQuery()
  
  return (
    <GalleryGrid>
      {data?.map(item => <GalleryCard key={item.id} {...item} />)}
    </GalleryGrid>
  )
}
```

---

### @repo/upload & @repo/upload-client
**What:** File upload utilities and components
**When to use:** Any file upload functionality
**Common components/utilities:**
- FileUploader - Upload component with drag-and-drop
- UploadProgress - Progress indicator
- FileValidator - File validation utilities
- UploadSession - Session management

**Import:**
```typescript
import { FileUploader, UploadProgress } from '@repo/upload-client'
```

**❌ Don't:** Reimplement upload logic in each app
**✅ Do:** Use upload packages for all file uploads

---

### @repo/api-client
**What:** API client and auth utilities
**When to use:** Making API calls, auth operations
**Common utilities:**
- apiClient - Configured API client
- Auth utilities - Cognito integration
- Token management

**Import:**
```typescript
import { apiClient } from '@repo/api-client'
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'
```

**❌ Don't:** Create custom API clients in apps
**✅ Do:** Use shared API client

---

### @repo/logger
**What:** Logging utility
**When to use:** ALL logging (NEVER use console.log)
**Common methods:**
- logger.info()
- logger.warn()
- logger.error()
- logger.debug()

**Import:**
```typescript
import { logger } from '@repo/logger'
```

**❌ Don't:** Use console.log, console.warn, console.error
**✅ Do:** Always use @repo/logger

---

### @repo/cache
**What:** Caching utilities
**When to use:** Client-side caching

---

### @repo/charts
**What:** Chart components
**When to use:** Data visualization

---

### @repo/design-system
**What:** Design tokens (colors, spacing, typography)
**When to use:** Accessing design system values

---

### @repo/accessibility
**What:** Accessibility utilities
**When to use:** A11y helpers and utilities

---

## Backend Packages (packages/backend/)

### @repo/lambda-utils
**What:** Lambda helper functions
**When to use:** Building Lambda functions

---

### @repo/cognito-client
**What:** Cognito SDK wrapper
**When to use:** Cognito operations in backend

---

### @repo/s3-client
**What:** S3 SDK wrapper
**When to use:** S3 operations in backend

---

### @repo/db
**What:** Database utilities
**When to use:** Database operations

---

## Shared Packages (packages/shared/)

### @repo/api-types
**What:** Types shared between frontend and backend
**When to use:** Defining API contracts
**Common types:**
- User types
- MOC types
- API request/response types

**Import:**
```typescript
import { UserSchema } from '@repo/api-types'
```

---

## Quick Checklist Before Implementing

- [ ] Checked `@repo/ui` for UI components
- [ ] Checked `@repo/gallery` for gallery components
- [ ] Checked `@repo/upload` / `@repo/upload-client` for upload functionality
- [ ] Checked `@repo/api-client` for API utilities
- [ ] Will use `@repo/logger` instead of console.log
- [ ] Checked `packages/backend/` for backend utilities
- [ ] Checked `@repo/api-types` for shared types

## When to Create a New Package

Create a new package in `packages/` when:
1. ✅ Functionality will be used by 2+ apps
2. ✅ It's a distinct, reusable concern
3. ✅ It doesn't fit in existing packages

Don't create a new package when:
1. ❌ It's app-specific logic
2. ❌ It could be added to an existing package
3. ❌ It's only used by one app

