# REPA-017 Reality Context

## Current State Findings

### Duplicate FileValidationResultSchema Instances

**Frontend Components (2 duplicates):**

1. **InstructionsUpload** (apps/web/app-instructions-gallery/src/components/InstructionsUpload/__types__/index.ts):
   ```typescript
   export const FileValidationResultSchema = z.object({
     valid: z.boolean(),
     error: z.string().optional(),
   })
   ```

2. **ThumbnailUpload** (apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__types__/index.ts):
   ```typescript
   export const FileValidationResultSchema = z.object({
     valid: z.boolean(),
     error: z.string().optional(),
   })
   ```

**Backend Package (different shape):**

3. **moc-instructions-core** (packages/backend/moc-instructions-core/src/__types__/index.ts):
   ```typescript
   export const FileValidationResultSchema = z.object({
     fileId: z.string().uuid(),
     filename: z.string(),
     success: z.boolean(),
     errors: z.array(z.object({...})).optional(),
     warnings: z.array(z.object({...})).optional(),
     pieceCount: z.number().optional(),
   })
   ```

### Key Observations

1. **Frontend schemas are identical** (simple valid/error structure)
2. **Backend schema is different** (richer structure with fileId, filename, errors array, warnings array)
3. **Different purposes**:
   - Frontend: Client-side validation result for single file upload
   - Backend: Server-side validation result with detailed per-file error reporting
4. **No imports detected** between frontend and backend schemas (separate domains)

### @repo/upload Package Structure (Post-REPA-006)

**Current types in @repo/upload/src/types/:**
- session.ts (170 LOC) - session management
- upload.ts (279 LOC) - upload state and errors
- slug.ts (111 LOC) - slug utilities
- edit.ts (185 LOC) - MOC edit types
- index.ts (barrel export)

**Note:** No validation schemas currently exist in @repo/upload/types

### Dependency Context

**REPA-005 Status:** pending (blocked on REPA-003, REPA-004)
- REPA-005 will migrate ThumbnailUpload and InstructionsUpload components to @repo/upload/components
- These components have not been migrated yet
- Components still live in apps/web/app-instructions-gallery/

**REPA-006 Status:** completed
- @repo/upload/types structure exists and exports session, upload, slug, edit schemas
- Barrel export pattern established

### Related Schemas in Components

**InstructionsUpload also defines:**
- InstructionsUploadPropsSchema
- FileItemSchema (upload queue management)
- ALLOWED_PDF_MIME_TYPES, ALLOWED_PDF_EXTENSIONS constants
- MAX_FILE_SIZE, MIN_FILE_SIZE constants

**ThumbnailUpload also defines:**
- ThumbnailUploadPropsSchema
- ALLOWED_FILE_TYPES constants
- MAX_FILE_SIZE, MIN_FILE_SIZE constants

### Reuse Candidates

**For validation types:**
- @repo/upload/types (established by REPA-006)
- Could add validation.ts module similar to session.ts, upload.ts, slug.ts, edit.ts

**Pattern consistency:**
- Follow existing module structure in @repo/upload/src/types/
- Each domain gets its own file (validation.ts)
- Exported via types/index.ts barrel
