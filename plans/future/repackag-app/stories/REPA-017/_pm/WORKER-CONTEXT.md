# REPA-017 Worker Context

## Story Information

**Story ID:** REPA-017
**Title:** Consolidate Component-Level Schemas
**Epic:** repackag-app
**Feature:** Upload schema consolidation
**Status:** pending
**Depends On:** REPA-005 (Migrate Upload Components)

## Index Entry

```yaml
Feature: Move duplicate component schemas to shared locations. Move FileValidationResultSchema from ThumbnailUpload and InstructionsUpload to @repo/upload/types.
Goal: No duplicate schemas in component __types__ directories.
Risk Notes: —
```

## Key Context

### Duplicate Schemas Found

**FileValidationResultSchema duplicates:**
1. apps/web/app-instructions-gallery/src/components/InstructionsUpload/__types__/index.ts
2. apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__types__/index.ts

Both are identical:
```typescript
export const FileValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
})
```

### Target Package

**@repo/upload** (packages/core/upload/)
- Created by REPA-001
- Types migrated by REPA-006 (completed)
- Current structure: session.ts, upload.ts, slug.ts, edit.ts
- Barrel export at types/index.ts

### Dependencies

**REPA-005 (pending):** Migrate Upload Components
- Will move ThumbnailUpload and InstructionsUpload to @repo/upload/components
- Currently blocked on REPA-003 (hooks), REPA-004 (image processing)
- Components remain in app-instructions-gallery until REPA-005 completes

**REPA-006 (completed):** Migrate Upload Types
- Established @repo/upload/types structure
- Migrated session, upload, slug, edit schemas
- Provides pattern for adding validation.ts

### Backend Schema (Different Purpose)

**packages/backend/moc-instructions-core** has a different FileValidationResultSchema:
- Much richer structure (fileId, filename, success, errors[], warnings[], pieceCount)
- Server-side validation result
- Different domain than frontend client validation
- Should NOT be consolidated (different purposes)

### Technical Constraints

- Zod 4.1.13
- TypeScript strict mode
- Minimum 45% test coverage
- No breaking changes to existing schemas
- Follow @repo/upload module pattern (one file per domain)

### Reuse Pattern

**Suggested approach:**
1. Create @repo/upload/src/types/validation.ts
2. Move frontend FileValidationResultSchema there
3. Add tests in __tests__/validation.test.ts
4. Export via types/index.ts barrel
5. Update component imports (but components haven't migrated yet - see REPA-005)

### Important Constraint

**REPA-005 Dependency:**
- Components (ThumbnailUpload, InstructionsUpload) are NOT in @repo/upload yet
- They are still in apps/web/app-instructions-gallery
- This story moves the schema ahead of component migration
- REPA-005 will later move components and update their imports
