---
doc_type: story_seed
story_id: REPA-016
title: "Create @repo/moc-schemas Package"
created_at: "2026-02-10"
agent_version: "pm-story-seed-agent-v1.0"
baseline_warning: "No baseline reality file exists - codebase scanning only"
---

# REPA-016: Create @repo/moc-schemas Package - Story Seed

## Index Entry

```markdown
## REPA-016: Create @repo/moc-schemas Package

**Status:** pending
**Depends On:** none
**Feature:** Consolidate MOC-related Zod schemas. Move moc-form.ts (328 lines) from main-app. Delete exact duplicate from app-instructions-gallery.
**Goal:** Single source of truth for MOC type definitions.
**Risk Notes:** —
```

## Reality Baseline Status

⚠️ **WARNING:** No baseline reality file exists at `plans/baselines/`. This seed is generated from codebase scanning only.

## Current State Analysis

### Schema Duplication Problem

#### Exact Duplicates Found

1. **moc-form.ts (328 lines, identical):**
   - `/Users/michaelmenard/Development/monorepo/apps/web/main-app/src/types/moc-form.ts`
   - `/Users/michaelmenard/Development/monorepo/apps/web/app-instructions-gallery/src/types/moc-form.ts`

   **Created by:** Story 3.1.16: MOC Form Validation Schemas

   **Content:** Complete form validation schemas with discriminated union for MOC vs Set types

   **Current Consumers:**
   - `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`
   - `apps/web/app-instructions-gallery/src/pages/upload-page.tsx`
   - `apps/web/app-instructions-gallery/src/components/MocForm/index.tsx`

2. **Test File:**
   - `/Users/michaelmenard/Development/monorepo/apps/web/main-app/src/types/__tests__/moc-form.test.ts` (252 lines)
   - Comprehensive test suite covering both MOC and Set form validation

#### Related Schemas in Monorepo

**Frontend API Client Schemas:**
- `/packages/core/api-client/src/schemas/instructions.ts` (377 lines)
  - Exported as `@repo/api-client/schemas/instructions`
  - Contains: `MocInstructionsSchema`, `CreateMocInputSchema`, `UpdateMocInputSchema`
  - Aligned with backend types but tailored for API client usage
  - Already has lenient UUID validation for test compatibility

**Backend Shared Types:**
- `/packages/shared/api-types/src/moc/index.ts` (962 lines)
  - Comprehensive MOC schema with all metadata fields
  - Created for backend/frontend consistency
  - Contains: `MocInstructionSchema`, `CreateMocWithFilesSchema`, `UpdateMocSchema`
  - Includes all sub-schemas: Designer, Dimensions, Features, etc.

**Component-Level Schemas:**
- `/apps/web/app-instructions-gallery/src/components/MocDetailDashboard/__types__/moc.ts` (59 lines)
  - Display-specific schemas for MOC detail view
  - Contains: `MocOrderSchema`, `MocGalleryImageSchema`, `MocPartsListSchema`, `MocSchema`

**Backend Core Package:**
- `/packages/backend/moc-instructions-core/src/__types__/index.js`
  - Backend domain types with Zod schemas
  - Exports: `MocRowSchema`, `MocFileRowSchema`, `MocDetailSchema`

### Schema Purpose Analysis

| Schema File | Purpose | Scope | Line Count |
|-------------|---------|-------|------------|
| **moc-form.ts** (duplicate) | Form validation with react-hook-form | Frontend forms only | 328 |
| **api-client/schemas/instructions.ts** | API response validation | API client layer | 377 |
| **shared/api-types/src/moc/index.ts** | Backend/Frontend shared types | Full platform | 962 |
| **MocDetailDashboard moc.ts** | Display component types | Component-specific | 59 |

### Key Differences Between Schemas

#### moc-form.ts (Form Layer)
- **Focus:** Client-side form validation with react-hook-form
- **Key Features:**
  - Discriminated union for MOC vs Set types
  - Custom error messages for form fields
  - Helper functions: `createEmptyMocForm()`, `normalizeTags()`, `getFormErrors()`
  - Validation constraints optimized for user input
  - Uses `.or(z.literal(''))` for optional URLs (allows empty strings)

#### api-client/schemas/instructions.ts (API Layer)
- **Focus:** Runtime validation of API responses
- **Key Features:**
  - Lenient UUID validation for test environment compatibility
  - Date string transformations (converts to Date objects)
  - Nullable fields aligned with database schema
  - Input schemas for mutations (Create/Update)

#### shared/api-types/src/moc (Domain Layer)
- **Focus:** Comprehensive domain model with all metadata
- **Key Features:**
  - Full BrickLink-inspired metadata (designer stats, event badges, moderation)
  - Rich documentation with field explanations
  - Gallery images, alternate builds, source platform tracking
  - Both MOC and Set entity types
  - Audit trail fields

### Import Pattern Analysis

**Current Usage Pattern:**
```typescript
// Apps import from local types
import { MocInstructionFormSchema } from '@/types/moc-form'

// Some apps use API client schemas
import { MocInstructionsSchema } from '@repo/api-client/schemas/instructions'

// Backend uses shared/api-types
import { MocInstructionSchema } from '@repo/api-types/moc'
```

### Existing Package Structure Reference

**@repo/api-client** (packages/core/api-client):
```
package.json exports:
  "./schemas/wishlist"     → src/schemas/wishlist.ts
  "./schemas/instructions" → src/schemas/instructions.ts
  "./schemas/sets"         → src/schemas/sets.ts
  "./schemas/inspiration"  → src/schemas/inspiration.ts
```

**Dependencies in @repo/api-client:**
- `zod: ^3.23.8`
- `@repo/cache: workspace:*`
- `@repo/logger: workspace:*`

## Proposed Package Structure

### Option A: New Package @repo/moc-schemas

**Location:** `packages/core/moc-schemas/`

**Structure:**
```
packages/core/moc-schemas/
  src/
    form/
      index.ts              # Form schemas from moc-form.ts
      __tests__/
        index.test.ts       # Migrated tests
    domain/
      index.ts              # Re-export from @repo/api-types or duplicate
    display/
      index.ts              # Display component schemas
    utils/
      index.ts              # Helper functions (normalizeTags, etc.)
    index.ts                # Main exports
  package.json
  tsconfig.json
  vitest.config.ts
```

**Exports:**
```typescript
// Form layer
export * from './form'
// Domain layer
export * from './domain'
// Display layer
export * from './display'
// Utilities
export * from './utils'
```

**Concerns with Option A:**
- Creates another schema package (already have api-client/schemas and api-types)
- Risk of further fragmentation
- Unclear separation of concerns between packages

### Option B: Consolidate into @repo/api-client (RECOMMENDED)

**Rationale:**
- `@repo/api-client` already has `schemas/` directory with instructions, wishlist, sets
- Form schemas are CLIENT-SIDE validation for API operations
- Maintains clear boundary: client-side schemas in one place
- Follows existing pattern established by wishlist/sets schemas

**Enhanced Structure:**
```
packages/core/api-client/
  src/
    schemas/
      instructions/
        index.ts           # Re-export all instruction schemas
        api.ts             # Current instructions.ts content (API response schemas)
        form.ts            # moc-form.ts content (form validation schemas)
        display.ts         # Display component schemas (optional)
        utils.ts           # Helper functions
        __tests__/
          api.test.ts
          form.test.ts
      wishlist.ts
      sets.ts
      inspiration.ts
      ...
    index.ts
  package.json
```

**package.json additions:**
```json
{
  "exports": {
    "./schemas/instructions": {
      "import": "./src/schemas/instructions/index.ts",
      "types": "./src/schemas/instructions/index.ts"
    },
    "./schemas/instructions/form": {
      "import": "./src/schemas/instructions/form.ts",
      "types": "./src/schemas/instructions/form.ts"
    },
    "./schemas/instructions/api": {
      "import": "./src/schemas/instructions/api.ts",
      "types": "./src/schemas/instructions/api.ts"
    }
  }
}
```

**Migration Impact:**
- Update 3 files importing `@/types/moc-form` to use `@repo/api-client/schemas/instructions/form`
- Delete 2 duplicate moc-form.ts files
- Move 1 test file to api-client package
- Maintain backward compatibility with existing `@repo/api-client/schemas/instructions` exports

### Option C: Use @repo/api-types (Backend-First)

**Rationale:**
- Shared types package already exists at `packages/shared/api-types`
- Contains comprehensive MOC domain schemas
- Backend and frontend can share from same source

**Concerns:**
- Form-specific validation logic doesn't belong in shared backend types
- Helper functions like `createEmptyMocForm()` are frontend-specific
- Would mix concerns (domain types vs form validation)

## Recommended Approach: Option B (Enhance @repo/api-client)

### Why This is Best

1. **Follows Established Pattern:** Other schema categories (wishlist, sets) already in api-client
2. **Clear Separation:** Form schemas are inherently client-side validation artifacts
3. **No New Package Needed:** Reuses existing, well-structured package
4. **Backward Compatible:** Can maintain existing exports while adding new ones
5. **Logical Grouping:** All client-side Zod schemas in one discoverable location

### Migration Strategy

#### Phase 1: Restructure api-client/schemas/instructions

1. Create subdirectory structure:
   ```
   src/schemas/instructions/
     api.ts      # Rename current instructions.ts
     form.ts     # Copy from moc-form.ts
     utils.ts    # Extract helper functions
     index.ts    # Re-export all
   ```

2. Maintain exports in `src/schemas/index.ts` for backward compatibility:
   ```typescript
   // Existing exports still work
   export * from './instructions'

   // New granular exports available
   export * from './instructions/api'
   export * from './instructions/form'
   ```

#### Phase 2: Update Consumers

Update these files:
1. `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`
   - Change: `import { MocInstructionFormSchema } from '@/types/moc-form'`
   - To: `import { MocInstructionFormSchema } from '@repo/api-client/schemas/instructions/form'`

2. `apps/web/app-instructions-gallery/src/pages/upload-page.tsx`
   - Same import change

3. `apps/web/app-instructions-gallery/src/components/MocForm/index.tsx`
   - Same import change

#### Phase 3: Migrate Tests

1. Move `apps/web/main-app/src/types/__tests__/moc-form.test.ts`
   - To: `packages/core/api-client/src/schemas/instructions/__tests__/form.test.ts`

2. Update test setup to use api-client's vitest config

#### Phase 4: Delete Duplicates

1. Delete `apps/web/main-app/src/types/moc-form.ts`
2. Delete `apps/web/app-instructions-gallery/src/types/moc-form.ts`
3. Delete `apps/web/main-app/src/types/__tests__/moc-form.test.ts` (after migration)

### Schema Relationships After Migration

```
@repo/api-client/schemas/instructions/
  ├── api.ts              → API response schemas (for RTK Query)
  ├── form.ts             → Form validation schemas (for react-hook-form)
  ├── utils.ts            → Shared utilities (normalizeTags, etc.)
  └── index.ts            → Unified exports

Backend Domain:
  @repo/api-types/moc/    → Comprehensive domain schemas (backend shared)

Frontend Specific:
  Component __types__/    → Component-specific display schemas (keep local)
```

## Schema Content Inventory

### moc-form.ts Schemas (To Migrate)

**Sub-schemas (reusable):**
- `DesignerStatsSchema` (22 lines)
- `SocialLinksSchema` (32 lines)
- `DesignerSchema` (44 lines)
- `DimensionMeasurementSchema` (52 lines)
- `WidthDimensionSchema` (60 lines)
- `WeightSchema` (68 lines)
- `DimensionsSchema` (80 lines)
- `InstructionsMetadataSchema` (91 lines)
- `AlternateBuildSchema` (102 lines)
- `FeatureSchema` (111 lines)
- `SourcePlatformSchema` (123 lines)
- `EventBadgeSchema` (134 lines)
- `ModerationSchema` (144 lines)

**Main schemas:**
- `BaseFormSchema` (150-192)
- `MocFormSchema` (198-205)
- `SetFormSchema` (211-224)
- `MocInstructionFormSchema` (233) - Discriminated union

**Helper functions:**
- `normalizeTags(tags)` (259-264)
- `createEmptyMocForm()` (269-284)
- `createEmptySetForm()` (289-304)
- `isFormValidForFinalize(form)` (309-312)
- `getFormErrors(form)` (317-327)

**Type exports:**
- `MocInstructionForm`, `MocForm`, `SetForm`
- `MocInstructionFormInput`, `MocFormInput`, `SetFormInput`
- `Designer`, `Dimensions`, `Feature`, `AlternateBuild`, `SourcePlatform`, `EventBadge`

### Comparison with api-client/schemas/instructions.ts

**Overlap (same concepts, different validation):**
- Designer schema (form uses strict validation, api uses nullable)
- Dimensions schema (form uses `.optional()`, api uses `.nullable().optional()`)
- InstructionsMetadata schema (similar structure)
- Feature schema (nearly identical)

**Unique to moc-form.ts:**
- Discriminated union for MOC vs Set
- Form-specific error messages ("Title is required", etc.)
- Helper functions for form initialization
- `.or(z.literal(''))` pattern for optional URLs (allows empty strings in forms)

**Unique to api.ts (instructions.ts):**
- Lenient UUID validation
- Date string transformations
- Pagination schemas
- File upload schemas
- MOC detail response schemas

## Acceptance Criteria (Initial Draft)

### AC1: Package Structure Created
- [ ] `packages/core/api-client/src/schemas/instructions/` directory exists
- [ ] Four files created: `api.ts`, `form.ts`, `utils.ts`, `index.ts`
- [ ] All schemas from moc-form.ts present in form.ts
- [ ] All helper functions from moc-form.ts present in utils.ts
- [ ] Current instructions.ts content moved to api.ts (with imports fixed)

### AC2: Exports Configured
- [ ] `package.json` exports updated with granular paths
- [ ] `src/schemas/index.ts` maintains backward compatibility
- [ ] `src/schemas/instructions/index.ts` re-exports all sub-modules
- [ ] TypeScript types properly exported from all modules

### AC3: Consumers Updated
- [ ] `main-app/InstructionsNewPage.tsx` imports from api-client
- [ ] `app-instructions-gallery/upload-page.tsx` imports from api-client
- [ ] `app-instructions-gallery/MocForm/index.tsx` imports from api-client
- [ ] No TypeScript errors in updated files
- [ ] Form validation still works correctly

### AC4: Tests Migrated
- [ ] Tests moved to `api-client/src/schemas/instructions/__tests__/form.test.ts`
- [ ] All tests pass with new import paths
- [ ] Test coverage maintained (45% minimum as per CLAUDE.md)
- [ ] Vitest config properly configured in api-client

### AC5: Cleanup Complete
- [ ] `apps/web/main-app/src/types/moc-form.ts` deleted
- [ ] `apps/web/app-instructions-gallery/src/types/moc-form.ts` deleted
- [ ] `apps/web/main-app/src/types/__tests__/moc-form.test.ts` deleted
- [ ] No references to old paths remain in codebase

### AC6: Quality Gates
- [ ] All TypeScript compilation passes (`pnpm check-types`)
- [ ] All linting passes (`pnpm lint`)
- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)

## Risk Assessment

### Low Risks
- **Schema migration:** Copy-paste operation, minimal transformation
- **Test migration:** Tests are comprehensive and well-structured
- **TypeScript safety:** Compile-time verification of import changes

### Medium Risks
- **Import path updates:** Must find all consumers (mitigated by TypeScript compiler)
- **Backward compatibility:** Existing imports to instructions.ts must still work (addressed by maintaining index.ts exports)

### Mitigation Strategies
- Use TypeScript compiler to find all import references
- Keep comprehensive tests to verify schema behavior unchanged
- Maintain backward-compatible exports during migration
- Run full test suite before deleting duplicate files

## Dependencies & Blockers

### Dependencies
- None (standalone refactoring story)

### Potential Conflicts
- If INST-* stories are actively modifying moc-form.ts, coordinate timing
- Check for open PRs touching these files before starting

## Open Questions

1. **Should we also move display schemas?**
   - `MocDetailDashboard/__types__/moc.ts` is component-specific
   - Recommendation: Keep component-specific schemas local (don't over-centralize)

2. **Should form.ts re-export sub-schemas individually?**
   - Example: Export `DesignerSchema` separately for reuse?
   - Recommendation: Yes, for flexibility

3. **Should we align field validation between form and API schemas?**
   - Current: Form uses strict validation, API uses nullable
   - Recommendation: Keep separate - different validation contexts

4. **Documentation updates needed?**
   - Update any architecture docs referencing schema locations
   - Add schema organization guide to docs/

## Success Metrics

- **Code Duplication:** Reduced by 328 lines (duplicate file eliminated)
- **Import Consistency:** All MOC schemas imported from single package
- **Maintainability:** Changes to MOC schemas only need updates in one location
- **Developer Experience:** Clear schema organization by purpose (form vs api vs domain)

## Related Context

### Similar Migrations
- REPA-008: Moved gallery keyboard hooks to @repo/gallery
- REPA-015: Enhanced @repo/accessibility with shared hooks

### Existing Schema Packages
- `@repo/api-client/schemas/*` - Client-side API schemas (current home)
- `@repo/api-types` - Backend/frontend shared domain types
- Component `__types__/` - Component-specific display schemas

### Project Guidelines (CLAUDE.md)
- ✅ Use Zod schemas exclusively (no TypeScript interfaces)
- ✅ Minimum 45% test coverage
- ✅ Named exports preferred
- ✅ No barrel files (direct imports)
- ✅ Package structure follows monorepo conventions

## Next Steps

After Story Seed approval, proceed to:
1. **Test Plan:** Comprehensive test strategy for migration
2. **Dev Feasibility:** Technical implementation details
3. **UI/UX Notes:** N/A (no UI changes)
4. **Elaboration:** Detailed file-by-file migration steps
