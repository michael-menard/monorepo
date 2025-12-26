# Story Creation Checklist

## Before Creating a Story

- [ ] **Check for existing packages** - Does this already exist in `packages/`?
- [ ] Review [Monorepo Boundaries](../architecture/monorepo-boundaries.md)
- [ ] Identify which app/package the code belongs in
- [ ] List all shared packages that will be used
- [ ] Check for similar existing stories for consistency
- [ ] Verify dependencies on other stories

## The Golden Rule: Reuse Before Reinvent 🔄

**Before implementing ANYTHING:**
1. Check `packages/core/` - Does this component/utility already exist?
2. Check `packages/backend/` - Does this backend utility already exist?
3. If YES → **USE IT** in your story, don't duplicate
4. If NO but will be used by 2+ apps → **CREATE IT** in `packages/`
5. If truly app-specific → implement in the app

**Common Packages to Check:**
- `@repo/ui` - Buttons, Cards, Tables, Forms, etc.
- `@repo/gallery` - Gallery Grid, Cards, Filters, Search, Pagination
- `@repo/upload` / `@repo/upload-client` - File upload components
- `@repo/api-client` - API client and auth utilities
- `@repo/logger` - Logging (never use console.log)

## Required Story Sections

### 1. Implementation Location ⭐ CRITICAL
**Purpose:** Prevent code duplication and ensure proper package reuse

Must specify:
- [ ] **Checked existing packages** - List what you checked
- [ ] Primary package/app path (e.g., `apps/web/main-app/src/lib/`)
- [ ] Shared packages **USED** (what you're importing)
- [ ] Shared packages **CREATED** (if creating new reusable package)
- [ ] Rationale for location choice

**Examples:**

✅ **Good - Using Existing Packages:**
```markdown
## Implementation Location

**Checked:** `@repo/gallery` exists with GalleryGrid, GalleryCard, GalleryFilters
**Primary:** `apps/web/app-instructions-gallery/src/pages/InstructionsGalleryPage.tsx`
**Shared Packages Used:** @repo/gallery, @repo/ui, @repo/api-client
**Shared Packages Created:** N/A
**Rationale:** App composes existing gallery package, doesn't reimplement. Feature app is thin wrapper.
```

✅ **Good - App-Specific Config:**
```markdown
## Implementation Location

**Checked:** No existing Amplify config (app-specific initialization)
**Primary:** `apps/web/main-app/src/lib/amplify-config.ts`
**Shared Packages Used:** @repo/logger
**Shared Packages Created:** N/A
**Rationale:** App-specific initialization, not reusable
```

✅ **Good - Creating New Shared Package:**
```markdown
## Implementation Location

**Checked:** No existing chart components in packages/
**Primary:** `packages/core/charts/`
**Shared Packages Used:** @repo/ui
**Shared Packages Created:** @repo/charts (will be used by dashboard, analytics, reports)
**Rationale:** Chart components will be reused by 3+ apps, belongs in shared package
```

❌ **Bad - Didn't Check for Existing:**
```markdown
## Implementation Location

**Primary:** `apps/web/app-instructions-gallery/src/components/GalleryGrid/`
**Rationale:** Need a gallery grid for instructions
```
**Problem:** Didn't check that `@repo/gallery` already has GalleryGrid!

❌ **Bad - Vague:**
```markdown
## Implementation Location

Somewhere in the auth package
```

### 2. Story
- [ ] Clear user role
- [ ] Specific action
- [ ] Measurable benefit

### 3. Acceptance Criteria
- [ ] Testable criteria
- [ ] Include file paths where applicable
- [ ] Mark FE+BE coordination items

### 4. Tasks / Subtasks
- [ ] Broken down into 2-4 hour chunks
- [ ] Reference specific files/paths
- [ ] Include testing tasks

### 5. Dev Notes
- [ ] Relevant architecture context
- [ ] Code examples with correct paths
- [ ] Testing standards
- [ ] Dependencies on other stories

## Common Mistakes to Avoid

### ❌ Mistake 1: Reimplementing Existing Packages
**The #1 Most Common Mistake**

```markdown
## Implementation Location
**Primary:** `apps/web/app-instructions-gallery/src/components/GalleryGrid/`
**Rationale:** Need a gallery grid component
```

**Problem:** Didn't check that `@repo/gallery` already exists!

### ✅ Fix:
```markdown
## Implementation Location
**Checked:** `@repo/gallery` exists with GalleryGrid, GalleryCard, GalleryFilters
**Primary:** `apps/web/app-instructions-gallery/src/pages/InstructionsGalleryPage.tsx`
**Shared Packages Used:** @repo/gallery, @repo/ui
**Rationale:** Compose existing gallery package, don't reimplement
```

---

### ❌ Mistake 2: Creating App-Specific UI Components
```markdown
## Implementation Location
**Primary:** `apps/web/app-dashboard/src/components/Button/`
**Rationale:** Dashboard needs a button
```

**Problem:** All UI components should be in `@repo/ui`!

### ✅ Fix:
```markdown
## Implementation Location
**Checked:** `@repo/ui` has Button component
**Primary:** `apps/web/app-dashboard/src/components/DashboardHeader.tsx`
**Shared Packages Used:** @repo/ui (Button, Card, etc.)
**Rationale:** Use shared UI components, don't duplicate
```

---

### ❌ Mistake 3: Duplicating Upload Logic
```markdown
## Implementation Location
**Primary:** `apps/web/app-instructions-gallery/src/components/FileUploader/`
**Rationale:** Need file upload for instructions
```

**Problem:** `@repo/upload-client` already has FileUploader!

### ✅ Fix:
```markdown
## Implementation Location
**Checked:** `@repo/upload-client` has FileUploader component
**Primary:** `apps/web/app-instructions-gallery/src/pages/UploadPage.tsx`
**Shared Packages Used:** @repo/upload-client, @repo/ui
**Rationale:** Use existing upload package, configure for instructions
```

---

### ❌ Mistake 4: Vague Implementation Location
```markdown
## Implementation Location
In the auth module
```

### ✅ Fix:
```markdown
## Implementation Location
**Checked:** No existing Cognito integration in packages/
**Primary:** `packages/core/api-client/auth/cognito-integration.ts`
**Shared Packages Used:** @repo/logger
**Shared Packages Created:** N/A (adding to existing @repo/api-client)
**Rationale:** Reusable auth utility used by multiple apps
```

---

### ❌ Mistake 5: Wrong Package Choice
```markdown
## Implementation Location
**Primary:** `packages/core/auth/amplify-config.ts`
```

**Problem:** App-specific config shouldn't be in shared packages!

### ✅ Fix:
```markdown
## Implementation Location
**Checked:** App-specific initialization, not reusable
**Primary:** `apps/web/main-app/src/lib/amplify-config.ts`
**Shared Packages Used:** @repo/logger
**Rationale:** App-specific initialization, not reusable
```

## Decision Tree for Implementation Location

```
STEP 1: Does this already exist in packages/?
   Check: packages/core/, packages/backend/, packages/shared/
   YES → USE IT! Don't duplicate. Story should import from existing package.
   NO  → Continue to Step 2

STEP 2: Will this be used by 2+ apps?
   YES → CREATE IT in packages/
   NO  → Continue to Step 3

STEP 3: What type of code is it?

   Is it a UI component (Button, Card, Table, etc.)?
      → Check @repo/ui first!
      → If exists: USE IT
      → If not exists: CREATE in packages/core/app-component-library/

   Is it a gallery component (Grid, Filters, Search, Pagination)?
      → Check @repo/gallery first!
      → If exists: USE IT
      → If not exists: CREATE in packages/core/gallery/

   Is it upload-related (uploader, file validation, progress)?
      → Check @repo/upload and @repo/upload-client first!
      → If exists: USE IT
      → If not exists: CREATE in packages/core/upload/

   Is it auth configuration/initialization?
      → apps/web/main-app/src/lib/

   Is it specific to one feature (dashboard, gallery, etc.)?
      → apps/web/app-{feature}/src/
      → BUT: Only app-specific logic, compose from packages/

   Is it a backend utility (Lambda, AWS SDK, etc.)?
      → Check packages/backend/ first!
      → If exists: USE IT
      → If not exists: CREATE in packages/backend/{service}/

   Is it a type shared between frontend and backend?
      → packages/shared/api-types/

   Is it a frontend utility used by multiple apps?
      → Check packages/core/ first!
      → If exists: USE IT
      → If not exists: CREATE in packages/core/{utility}/

When in doubt, ask in the story or create an ADR!
```

## Story Review Checklist

Before marking a story as "Approved":

- [ ] Implementation Location is specific and correct
- [ ] Location follows [Monorepo Boundaries](../architecture/monorepo-boundaries.md)
- [ ] No code duplication across apps
- [ ] Shared code is in appropriate packages
- [ ] File paths are explicit in tasks
- [ ] Dependencies are clearly stated

## Examples

### Example 1: Auth Configuration (App-Specific)
```markdown
## Implementation Location

**Primary:** `apps/web/main-app/src/lib/amplify-config.ts`
**Shared:** N/A
**Rationale:** 
- Auth initialization runs before React renders
- App-specific configuration, not reusable
- Belongs in main-app shell per architectural rules
```

### Example 2: Shared UI Component
```markdown
## Implementation Location

**Primary:** `packages/core/app-component-library/src/StatsCard/`
**Shared:** Exports via `@repo/ui`
**Rationale:**
- Reusable component used by dashboard and other apps
- Follows design system patterns
- Centralized in component library per architectural rules
```

### Example 3: Feature-Specific Component
```markdown
## Implementation Location

**Primary:** `apps/web/app-dashboard/src/components/DashboardHeader/`
**Shared:** Uses `@repo/ui` components internally
**Rationale:**
- Dashboard-specific layout component
- Not reusable across other apps
- Self-contained in feature app per architectural rules
```

## Resources

- [Monorepo Boundaries](../architecture/monorepo-boundaries.md)
- [Story Template](.bmad-core/templates/story-tmpl.yaml)
- [Architecture Documentation](../architecture/)

