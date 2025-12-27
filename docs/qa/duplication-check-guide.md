# QA Duplication Check Guide

## Purpose

Prevent code duplication by ensuring stories use existing shared packages instead of reimplementing functionality.

## When This Check Runs

This check is **REQUIRED** for every story review as part of the `review-story` task.

## What Gets Checked

For every new file in the story's File List, verify:

1. **UI Components** - Check `@repo/ui` first
2. **Gallery Components** - Check `@repo/gallery` first
3. **Upload Functionality** - Check `@repo/upload` and `@repo/upload-client` first
4. **API Client** - Check `@repo/api-client` first
5. **Logging** - Must use `@repo/logger`, never `console.log`
6. **Backend Utilities** - Check `packages/backend/*` first
7. **Shared Types** - Check `@repo/api-types` first

## Common Packages Reference

### @repo/ui
- Button, Card, Table, Form, Input, Select, Checkbox, Radio
- Dialog, Modal, Drawer, Popover, Tooltip
- Badge, Avatar, Skeleton, Spinner
- Tabs, Accordion, Collapsible

### @repo/gallery
- GalleryGrid, GalleryCard, GalleryFilters
- GallerySearch, GalleryPagination, GallerySort
- GalleryLightbox

### @repo/upload / @repo/upload-client
- FileUploader, UploadProgress
- FileValidator, UploadSession

### @repo/api-client
- apiClient (configured API client)
- Auth utilities (Cognito integration)
- Token management

### @repo/logger
- logger.info(), logger.warn(), logger.error(), logger.debug()

## Red Flags (Auto-FAIL)

These are **automatic FAIL** conditions:

1. ❌ New gallery components when `@repo/gallery` exists
2. ❌ New upload components when `@repo/upload-client` exists
3. ❌ New UI components when `@repo/ui` has equivalent
4. ❌ App-specific API client when `@repo/api-client` exists
5. ❌ Using `console.log` instead of `@repo/logger`
6. ❌ Reimplementing backend utilities that exist in `packages/backend/`

## How to Perform the Check

### Step 1: Review Story's Implementation Location

Check the story's "Implementation Location" section:
- What packages did they say they would use?
- Do the actual imports match what was declared?

### Step 2: Review File List

For each new file:
1. Identify what it does (component, utility, type, etc.)
2. Check if equivalent exists in packages
3. Verify imports are from shared packages

### Step 3: Search for Duplication Patterns

**Search for these patterns in new files:**

```bash
# Check for console.log usage (should use @repo/logger)
grep -r "console\." apps/web/app-*/src/

# Check for custom gallery components (should use @repo/gallery)
find apps/web/app-*/src/components -name "*Gallery*" -o -name "*Grid*"

# Check for custom upload components (should use @repo/upload-client)
find apps/web/app-*/src/components -name "*Upload*" -o -name "*File*"

# Check for custom UI components (should use @repo/ui)
find apps/web/app-*/src/components -name "Button*" -o -name "Card*" -o -name "Table*"
```

### Step 4: Document Findings

**If PASS:**
```yaml
duplication_check:
  status: PASS
  packages_checked: ["@repo/ui", "@repo/gallery", "@repo/upload-client"]
  duplications_found: []
  notes: "All components properly imported from shared packages. Feature app is thin wrapper."
```

**If FAIL:**
```yaml
duplication_check:
  status: FAIL
  packages_checked: ["@repo/ui", "@repo/gallery", "@repo/upload-client"]
  duplications_found:
    - component: "GalleryGrid"
      location: "apps/web/app-instructions-gallery/src/components/GalleryGrid/"
      existing_package: "@repo/gallery"
      action: "Remove custom implementation, import from @repo/gallery"
  notes: "Story reimplemented gallery components. Must refactor to use @repo/gallery."
```

### Step 5: Add to top_issues if FAIL

If duplication found, add HIGH severity issue:

```yaml
top_issues:
  - id: "ARCH-001"
    severity: high
    finding: "Reimplemented GalleryGrid in app-instructions-gallery/components/"
    suggested_action: "Remove custom GalleryGrid, import from @repo/gallery"
```

## Gate Decision Impact

- **Duplication Check FAIL** → Gate must be **FAIL** or **CONCERNS** (never PASS)
- **Duplication Check PASS** → Gate can be PASS if other checks pass

## Examples

### Example 1: PASS - Instructions Gallery

**Story:** 3.1.1 Instructions Gallery Scaffolding

**Files:**
- `apps/web/app-instructions-gallery/src/pages/InstructionsGalleryPage.tsx`
- `apps/web/app-instructions-gallery/src/api/instructionsApi.ts`

**Imports:**
```typescript
import { GalleryGrid, GalleryCard, GalleryFilters } from '@repo/gallery'
import { Button } from '@repo/ui'
```

**Result:** ✅ PASS - Uses shared packages, no duplication

### Example 2: FAIL - Custom Gallery Components

**Story:** 3.1.1 Instructions Gallery Scaffolding

**Files:**
- `apps/web/app-instructions-gallery/src/components/GalleryGrid/index.tsx`
- `apps/web/app-instructions-gallery/src/components/GalleryCard/index.tsx`

**Result:** ❌ FAIL - Reimplemented @repo/gallery components

**Action:** Remove custom components, import from @repo/gallery

## Quick Checklist

- [ ] Reviewed story's "Implementation Location" section
- [ ] Checked all new files in File List
- [ ] Verified no custom UI components (should use @repo/ui)
- [ ] Verified no custom gallery components (should use @repo/gallery)
- [ ] Verified no custom upload components (should use @repo/upload-client)
- [ ] Verified no console.log usage (should use @repo/logger)
- [ ] Verified imports match declared packages
- [ ] Documented findings in duplication_check section
- [ ] Added top_issues if duplications found

