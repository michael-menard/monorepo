# Edit MOC Instructions Product Requirements Document (PRD)

## 1. Goals and Background Context

### Goals

- **PRIMARY: Extract reusable infrastructure to `packages/`** — The upload-moc-instructions implementation contains significant reusable code. This PRD prioritizes extracting shared functionality BEFORE building edit-specific features. Future modules (Sets upload, Gallery management, Profile images, Wishlist) depend on these extracted packages.
- Enable registered users to edit their own MOC instruction packages end-to-end (metadata + files)
- Maintain owner-only visibility: users can only edit their own uploads
- **Maximize code reuse** — Edit should add minimal new code; most functionality exists in upload implementation
- Support field updates: title, description, tags, theme, PDF (replace), images (add/remove/replace), parts lists (add/remove/replace)
- Handle slug changes with conflict detection (409) against owner's existing slugs
- Conform to repo standards (React 19, Zod-first, @repo/ui, AWS serverless, @repo/logger, Tailwind, a11y)

### Background Context

The platform now supports user uploads via a secure owner-only flow with presign → client upload → finalize pattern. However, users cannot correct mistakes, update content, or add new files after initial upload — a critical gap in the content lifecycle.

**Strategic Context: Package Extraction is the Primary Deliverable**

The upload-moc-instructions feature contains ~80% of the code needed for edit, and ~70% of the code needed for future upload modules. Rather than duplicate this code, **Epic 0 (Package Extraction) must complete before Epic 1 and Epic 2 begin**. This ensures:

1. Edit feature development is faster (reusing extracted packages)
2. Future modules (Sets, Gallery, Profile, Wishlist) have a solid foundation
3. Bug fixes and improvements benefit all consumers
4. Consistent patterns across the platform

**Existing Code to Extract (from upload-moc-instructions):**

| Source Location                                      | Target Package                 | Consumers                              |
| ---------------------------------------------------- | ------------------------------ | -------------------------------------- |
| `apps/api/core/config/upload.ts`                     | `@repo/upload-config`          | Upload, Edit, Sets, Gallery, Profile   |
| `apps/api/core/rate-limit/`                          | `@repo/rate-limit`             | Upload, Edit, Delete, all API features |
| `apps/web/main-app/src/types/uploader-*.ts`          | `@repo/upload-types`           | All upload UIs                         |
| `apps/web/main-app/src/services/api/uploadClient.ts` | `@repo/upload-client`          | All upload UIs                         |
| `apps/api/endpoints/moc-uploads/sessions/`           | Extend for edit                | Edit, future multipart uploads         |
| `apps/web/main-app/src/hooks/useUpload*.ts`          | `@repo/upload-client`          | All upload UIs                         |
| `apps/web/main-app/src/components/Upload*/`          | `@repo/ui` or keep in main-app | All upload UIs                         |

**Edit-Specific Code (minimal new code):**

- GET endpoint for fetching MOC data to pre-fill form
- PATCH endpoint for metadata-only updates
- Edit-specific presign/finalize (extends upload pattern)
- `useEditSession` hook (extends `useUploaderSession` with pre-fill logic)
- Edit page wrapper (passes existing data to upload form)

**Key Design Decision: Edit Reuses the Upload Form**

The edit page uses the **same form component** as the upload page, pre-filled with existing data:

| Aspect          | Upload Mode     | Edit Mode                                     |
| --------------- | --------------- | --------------------------------------------- |
| Form component  | `MocUploadForm` | `MocUploadForm` (same component)              |
| Initial state   | Empty           | Pre-filled from GET `/mocs/:mocId/edit`       |
| Metadata fields | User enters new | User modifies existing                        |
| File handling   | Add files       | Add new files, remove existing files          |
| File editing    | N/A             | **OUT OF SCOPE** — cannot edit uploaded files |
| Submit action   | Create MOC      | Update MOC                                    |

**File Management Scope:**

- ✅ Remove existing files (instructions, parts lists, images)
- ✅ Add new files (within limits)
- ❌ Edit uploaded files (e.g., modify PDF content) — OUT OF SCOPE
- ❌ Reorder files — OUT OF SCOPE for MVP

### Change Log

| Date       | Version | Description                                                                                                                                                                      | Author       |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2025-12-06 | 0.1     | Initial PRD draft (Goals, Requirements, Epics, Stories)                                                                                                                          | PM Agent     |
| 2025-12-06 | 0.2     | Architecture review: added database migration (Story 0.5), S3 cleanup (Story 1.6), idempotency token strategy, config injection pattern, OpenSearch strategy, thumbnail handling | Architect    |
| 2025-12-06 | 0.3     | Emphasized package extraction as primary deliverable; added code reuse inventory table; Epic 0 marked as blocking dependency; added dependency graph                             | Architect    |
| 2025-12-06 | 0.4     | Clarified form reuse: edit uses MocUploadForm with mode='edit'; file operations limited to add/remove (no edit/reorder); updated file structure to show thin wrapper pattern     | PM/Architect |

## 2. Requirements

### Functional Requirements (FR)

- FR1: Provide "Edit" CTA on MOC detail page and in "My Instructions" list; both open the edit flow (`/dashboard/mocs/:mocId/edit`).
- FR2: Restrict editor to authenticated owner; non-owners receive 403; signed-out users redirect to sign-in then return.
- FR3: GET endpoint returns existing MOC data (metadata + file URLs) for pre-populating the edit form.
- FR4: Editor displays current values: title, description, tags, theme, PDF, images, parts lists.
- FR5: Allow metadata-only updates via PATCH without re-uploading files.
- FR6: Allow PDF replacement: user removes current, uploads new; reuses presign/finalize pattern.
- FR7: Allow image add/remove/replace: manage image set; max count from env; reuses existing upload components.
- FR8: Allow parts list add/remove/replace: manage parts list set; max count from env.
- FR9: Slug updates allowed; on 409 conflict (owner's existing slugs), suggest available slug with in-place correction.
- FR10: File removals are soft-marked until save; finalize commits deletions and new uploads atomically.
- FR11: Save persists: updated metadata, new file keys, removed file keys; timestamps updated.
- FR12: After save, redirect to MOC detail page showing updated content.
- FR13: Server-side validation: same size/type/extension rules as upload (env-configured).
- FR14: API enforces owner-only edit; non-owners receive 403 without existence leak.
- FR15: Accessible inline errors and error summary; Save disabled until required fields valid.
- FR16: Presign failures show retry; log with @repo/logger and user-friendly message.
- FR17: Session expiry during edit preserves form state; redirect to sign-in and restore on return.
- FR18: Unsaved changes guard: prompt before navigating away with pending edits.
- FR19: Rate limiting: shared daily limit with upload (configurable); show 429 with next-allowed time.
- FR20: Cancel edit returns to MOC detail without saving changes.

### Non-Functional Requirements (NFR)

- NFR1: Adhere to repo standards (React 19, Zod-first, @repo/ui, @repo/logger, Tailwind, a11y-first, no barrel files).
- NFR2: Accessibility target WCAG AA; ARIA live regions for async/validation messaging.
- NFR3: **Code Reuse Mandate**: Import from `@repo/*` packages; do NOT duplicate code from upload implementation. Any shared logic must be extracted to packages before use.
- NFR4: Edit page load (GET) target ≤ 2s; save operation target ≤ 60s under normal network.
- NFR5: Security: owner verification on all edit operations; same file validation as upload.
- NFR6: Resilience: preserve form state locally; retries for presign/upload; state recovery after transient failures.
- NFR7: Observability: structured logs with correlationId/requestId; no PII beyond ownerId.
- NFR8: Testing: maintain ≥45% global coverage; unit/integration/E2E for edit flows.
- NFR9: **Package Extraction Gate**: Epic 0 must complete with passing regression tests before Epic 1/2 development begins.
- NFR10: **Future-Proofing**: Extracted packages must be designed for reuse by Sets, Gallery, Profile, Wishlist, and Delete features.

### Compatibility Requirements (CR)

- CR1: Existing upload endpoints remain unchanged; edit uses new endpoints or clearly separated handlers.
- CR2: Database schema changes must be backward-compatible; no breaking changes to existing MOC records.
- CR3: UI/UX consistency: edit form mirrors upload form patterns; reuses same components where possible.
- CR4: Existing presign/finalize patterns reused for file replacement; no new S3 access patterns.
- CR5: Extracted packages must maintain API compatibility with existing upload feature consumers.

## 3. User Interface Design Goals

### Integration with Existing UI

**The edit page reuses the upload form component directly.** There is no separate "edit form" — the same `MocUploadForm` component is used in both contexts, initialized differently:

| Aspect              | Upload Page              | Edit Page                     |
| ------------------- | ------------------------ | ----------------------------- |
| Route               | `/dashboard/mocs/upload` | `/dashboard/mocs/:mocId/edit` |
| Form component      | `MocUploadForm`          | `MocUploadForm` (SAME)        |
| Initial data        | Empty/defaults           | Pre-filled from API           |
| Submit button       | "Upload MOC"             | "Save Changes"                |
| Cancel destination  | Dashboard                | MOC detail page               |
| Success destination | My Instructions          | MOC detail page               |

**Form Component Props for Mode Switching:**

```typescript
interface MocUploadFormProps {
  mode: 'create' | 'edit'
  initialData?: MocEditData // undefined for create, populated for edit
  onSubmit: (data: MocFormData) => Promise<void>
  onCancel: () => void
}
```

**Shared Components (100% reuse from upload implementation):**

- `MocUploadForm` — the main form (metadata + file management)
- `UploadArea` — file drop zones
- `FilePreview` — displaying current/new files with remove action
- `ProgressIndicator` — upload progress
- Form inputs (TextField, TextArea, TagInput, Select)
- Error summary and inline validation patterns
- Unsaved changes dialog

### Modified/New Screens and Views

| Screen                   | Type             | Description                                                                   |
| ------------------------ | ---------------- | ----------------------------------------------------------------------------- |
| MOC Detail Page          | Modified         | Add "Edit" button (owner-only, conditionally rendered)                        |
| My Instructions List     | Modified         | Add "Edit" action to each item's menu (existing pattern)                      |
| Edit MOC Page            | **Wrapper only** | Thin wrapper that fetches data and renders `MocUploadForm` with `mode='edit'` |
| Edit Success State       | Reuse            | Same success pattern as upload, different redirect target                     |
| File Remove Confirmation | **New**          | Confirm file removal before marking for deletion                              |

**Note:** The edit "page" is primarily a data-fetching wrapper. The actual form UI is 100% reused from upload.

### Edit Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Edit MOC Instructions                    [Cancel]   │
├─────────────────────────────────────────────────────┤
│ Title*          [Pre-filled input_________________] │
│ Description*    [Pre-filled textarea______________] │
│                 [________________________________] │
│ Tags            [tag1] [tag2] [+ Add tag]          │
│ Theme           [Dropdown: Current theme ▼]        │
├─────────────────────────────────────────────────────┤
│ Instructions PDF* (Required)                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📄 current-instructions.pdf (2.4 MB)  [Replace] │ │
│ │                                       [Remove]  │ │
│ └─────────────────────────────────────────────────┘ │
│ [Drop zone for replacement - shown when removed]    │
├─────────────────────────────────────────────────────┤
│ Images (Optional, max 10)                           │
│ ┌────┐ ┌────┐ ┌────┐ ┌──────────┐                  │
│ │img1│ │img2│ │img3│ │ + Add    │                  │
│ │ ✕  │ │ ✕  │ │ ✕  │ │  Image   │                  │
│ └────┘ └────┘ └────┘ └──────────┘                  │
├─────────────────────────────────────────────────────┤
│ Parts Lists (Optional, max 5)                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📋 parts.csv (12 KB)                   [Remove] │ │
│ │ 📋 parts.xml (8 KB)                    [Remove] │ │
│ └─────────────────────────────────────────────────┘ │
│ [+ Add Parts List]                                  │
├─────────────────────────────────────────────────────┤
│ [Error Summary - if any]                            │
│                                                     │
│              [Cancel]  [Save Changes]               │
└─────────────────────────────────────────────────────┘
```

### UI Consistency Requirements

- Visual Design: Use existing @repo/ui components; LEGO-inspired sky/teal palette; consistent spacing
- Form Patterns: Same validation timing as upload (on blur + on submit); inline errors below fields
- File Chips: Same design as upload — filename, size, type icon, action buttons (Replace/Remove)
- Progress States: Reuse ProgressIndicator for file uploads during save
- Loading States: Skeleton loaders for initial data fetch; disabled form during save
- Error States: Same error summary component; 403/404/409/429 mapped to user-friendly messages
- Accessibility: Focus management on form load; keyboard-operable file actions; ARIA live regions for async feedback

### Target Platforms

- Web Responsive (desktop-first, mobile-friendly)
- Keyboard alternatives for all drag-and-drop interactions
- Touch-friendly file action buttons (44px minimum touch targets)

## 4. Technical Constraints and Integration Requirements

### Existing Technology Stack

| Layer          | Technology                                  | Version/Notes                     |
| -------------- | ------------------------------------------- | --------------------------------- |
| **Languages**  | TypeScript                                  | Strict mode, Zod-first types      |
| **Frontend**   | React 19, Vite, Tailwind CSS, Framer Motion | pnpm monorepo with Turborepo      |
| **Backend**    | AWS Lambda, API Gateway, Node.js            | Serverless Framework              |
| **Database**   | PostgreSQL                                  | Via existing data layer           |
| **Storage**    | AWS S3                                      | Presigned URLs for direct uploads |
| **Search**     | OpenSearch                                  | MOC indexing                      |
| **UI Library** | @repo/ui (shadcn-based)                     | All primitives                    |
| **Validation** | Zod, @repo/file-validator                   | Schema + magic bytes              |

### Integration Approach

**Database Integration Strategy:**

- No new tables required; existing `mocInstructions` and `mocFiles` tables support edit
- **Migration required**: Add `deletedAt` and `updatedAt` columns to `mocFiles` table (Story 0.5)
- Add `updatedAt` timestamp update on edit (`mocInstructions.updatedAt` already exists)
- Soft-delete pattern for files: mark `deletedAt` on remove, hard delete on finalize
- Slug uniqueness: Add unique index `(userId, slug)` if not exists (verify in Story 0.5)

**Schema Changes Required:**

```sql
-- Add to mocFiles table (Story 0.5)
ALTER TABLE moc_files ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE moc_files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
CREATE INDEX idx_moc_files_deleted_at ON moc_files (deleted_at) WHERE deleted_at IS NOT NULL;

-- Verify/add slug uniqueness per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_moc_slug_per_user
  ON moc_instructions (user_id, slug) WHERE slug IS NOT NULL;
```

**API Integration Strategy:**

| Endpoint                     | Method | Purpose                               | Reuse                    |
| ---------------------------- | ------ | ------------------------------------- | ------------------------ |
| `/mocs/:mocId`               | GET    | Fetch MOC for editing                 | Existing (add file URLs) |
| `/mocs/:mocId`               | PATCH  | Update metadata only                  | **New**                  |
| `/mocs/:mocId/edit/presign`  | POST   | Presign for replacement files         | Reuse presign logic      |
| `/mocs/:mocId/edit/finalize` | POST   | Commit edit (metadata + file changes) | Reuse finalize pattern   |
| `/mocs/:mocId/files/:fileId` | DELETE | Mark file for removal                 | Existing                 |

**Frontend Integration Strategy:**

- Edit page at `apps/web/main-app/src/routes/dashboard/mocs/$mocId/edit.tsx` (TanStack Router file-based routing)
- Reuse `packages/core/upload` components (UploadArea, FilePreview, ProgressIndicator)
- Reuse hooks: `useUpload`, `useUploadManager`, `useUploaderSession` (adapt for edit context)
- New hook: `useEditSession` — extends `useUploaderSession` with pre-populated data
- RTK Query: Add `getMocForEdit` and `updateMoc` endpoints

**Testing Integration Strategy:**

- Unit tests: Zod schemas, edit-specific validation, slug conflict handling
- Integration tests: GET/PATCH/presign/finalize endpoints, owner verification
- E2E tests: Edit happy path, file replacement, cancel without save, 403/404/409 scenarios
- Regression tests: Verify upload feature still works after package extraction

### Code Organization

**File Structure:**

```
apps/web/main-app/src/
  routes/dashboard/mocs/
    upload.tsx                  # Upload page (EXISTING)
    $mocId/
      edit.tsx                  # Edit page wrapper (NEW - thin wrapper only)
  hooks/
    useEditSession.ts           # Edit-specific session (extends useUploaderSession)
  components/
    MocUploadForm/              # EXISTING - reused for both upload and edit
      index.tsx                 # Form component with mode prop
      MetadataFields.tsx        # Title, description, tags, theme
      FileManager.tsx           # File add/remove UI
      __tests__/
        MocUploadForm.test.tsx

apps/api/endpoints/moc-instructions/
  get-for-edit/
    handler.ts                  # GET /mocs/:mocId/edit - fetch for pre-fill
  edit/
    handler.ts                  # PATCH metadata
  edit-presign/
    handler.ts                  # Presign for edit uploads
  edit-finalize/
    handler.ts                  # Commit edit changes
  _shared/
    edit-service.ts             # Edit business logic (extends upload patterns)

packages/                       # Extracted shared packages
  core/
    upload-types/               # @repo/upload-types (browser + server)
  tools/
    upload-config/              # @repo/upload-config (config injection pattern)
    rate-limit/                 # @repo/rate-limit (server only)
    upload-client/              # @repo/upload-client (browser only)
```

**Key Point:** No `EditMoc/` component directory — edit uses `MocUploadForm` directly with `mode='edit'`.

**Package Extraction Strategy:**

- `@repo/upload-types`: Pure TypeScript types/Zod schemas (works everywhere)
- `@repo/upload-config`: Use config injection pattern — functions accept config object rather than reading `process.env` directly. Server passes env config, client fetches from API endpoint `/api/config/upload`
- `@repo/rate-limit`: Server-only (database access required)
- `@repo/upload-client`: Browser-only (XHR, AbortController)

### Risk Assessment

| Risk                               | Impact | Likelihood | Mitigation                                                                   |
| ---------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------- |
| Package extraction breaks upload   | High   | Medium     | Comprehensive regression tests; extract incrementally                        |
| Concurrent edit conflicts          | Medium | Low        | Last-write-wins for MVP; add optimistic locking later if needed              |
| Orphaned S3 files on failed edit   | Medium | Medium     | Synchronous cleanup on finalize failure; scheduled job as backup (Story 1.6) |
| Slug change breaks external links  | Medium | Low        | Document in UI; add redirects in future phase                                |
| Rate limit gaming (edit vs upload) | Low    | Low        | Shared quota prevents gaming; only finalize counts against limit             |
| Database migration issues          | Medium | Low        | Backward-compatible migrations; feature flag for edit UI                     |

### Edit Idempotency Token Strategy

To prevent duplicate submissions during edit finalize, we use a token-based idempotency pattern:

```typescript
// Edit token structure
interface EditToken {
  mocId: string // MOC being edited
  timestamp: number // Client-generated timestamp (ms since epoch)
  hash: string // SHA-256(mocId + timestamp + userId)
}

// Token lifecycle:
// 1. Client generates token when edit page loads
// 2. Token stored in localStorage with edit session
// 3. Token sent with finalize request
// 4. Server stores token in `edit_tokens` table on success
// 5. Duplicate token returns 200 with existing result (idempotent)
// 6. Tokens expire after 24 hours (cleanup job)
```

**Alternative (simpler):** Use `mocId + updatedAt` as natural idempotency key:

- Before finalize: fetch current `updatedAt`
- During finalize: UPDATE ... WHERE updatedAt = @expectedValue
- If 0 rows updated: concurrent edit detected (409 Conflict)

**Recommendation:** Use the simpler `updatedAt` approach for MVP.

## 5. Epic List

- **Epic 0**: Package Extraction & Reuse Foundation — Extract shared upload infrastructure to reusable packages (**BLOCKING: Must complete first**)
- **Epic 1**: Backend Edit Pipeline — Secure, owner-only API endpoints for editing MOC instructions (depends on Epic 0)
- **Epic 2**: Edit UX & Frontend — Accessible, resilient edit UI reusing upload components (depends on Epic 0)

**Dependency Graph:**

```
Epic 0 (Package Extraction)
    │
    ├──► Epic 1 (Backend Edit) ──► Epic 2 (Frontend Edit)
    │
    └──► Future: Sets Upload, Gallery, Profile, Wishlist, Delete cleanup
```

## 6. Epic 0 Details: Package Extraction & Reuse Foundation

**Epic Goal**: Extract shared upload infrastructure to reusable packages, enabling edit feature and future upload modules (Sets, Gallery, Profile) to share common code.

**⚠️ BLOCKING: Epic 0 must complete before Epic 1 and Epic 2 begin.** This ensures edit development uses extracted packages rather than duplicating upload code.

**Success Metrics:**

- Existing upload feature works identically after extraction (regression tests pass)
- Edit feature imports from `@repo/*` packages, not from `apps/` directories
- No duplicate code between upload and edit implementations

### Story 0.1: Extract Upload Types Package

As a developer, I want shared upload types in `@repo/upload-types`, so that edit and future upload features use consistent type definitions.

**Acceptance Criteria:**

1. Create `packages/upload-types` with proper package.json and tsconfig
2. Move types from `apps/web/main-app/src/types/uploader-session.ts` and `uploader-upload.ts`
3. Export: `UploaderSession`, `FileCategory`, `UploadStatus`, `UploadErrorCode`, `UploaderFileItem`, `UploadBatchState`
4. Update imports in main-app to use `@repo/upload-types`
5. All existing upload tests pass

### Story 0.2: Extract Upload Config Package

As a developer, I want shared upload configuration in `@repo/upload-config`, so that all upload features use consistent size/type limits.

**Acceptance Criteria:**

1. Create `packages/tools/upload-config` package
2. Move config from `apps/api/core/config/upload.ts`
3. Export: `getUploadConfig`, `getFileSizeLimit`, `getFileCountLimit`, `isMimeTypeAllowed`, `getAllowedMimeTypes`
4. Include Zod schema for config validation (not env validation)
5. Use config injection pattern: functions accept config object, not `process.env`
6. Server code passes env-derived config: `getUploadConfig(loadEnvConfig())`
7. Browser code fetches config from API: `GET /api/config/upload` → cache in memory
8. Update API imports to use `@repo/upload-config`
9. All existing upload tests pass after extraction

**Technical Notes:**

```typescript
// Config injection pattern
interface UploadConfig {
  pdfMaxBytes: number
  imageMaxBytes: number
  // ...
}

// Functions accept config, don't read process.env
function getFileSizeLimit(config: UploadConfig, category: FileCategory): number

// Server: pass from env
const config = loadEnvConfig() // reads process.env
getFileSizeLimit(config, 'instruction')

// Browser: fetch from API
const config = await fetchUploadConfig() // GET /api/config/upload
getFileSizeLimit(config, 'instruction')
```

### Story 0.3: Extract Rate Limit Package

As a developer, I want rate limiting utilities in `@repo/rate-limit`, so that all API features can apply consistent rate limiting.

**Acceptance Criteria:**

1. Create `packages/rate-limit` package
2. Move logic from `apps/api/core/rate-limit/upload-rate-limit.ts`
3. Export: `checkAndIncrementDailyLimit`, `RateLimitResult` type
4. Generalize for any feature (not upload-specific naming)
5. Update upload endpoints to use `@repo/rate-limit`

### Story 0.4: Extract Upload Client Package

As a developer, I want browser upload utilities in `@repo/upload-client`, so that all frontend upload features share XHR/progress logic.

**Acceptance Criteria:**

1. Create `packages/upload-client` package (browser-only)
2. Move logic from `apps/web/main-app/src/services/api/uploadClient.ts`
3. Export: `uploadFile`, `uploadToPresignedUrl`, related types
4. Include AbortController and progress event handling
5. Update main-app imports to use `@repo/upload-client`

### Story 0.5: Database Schema Migration for Edit Support

As a developer, I want the database schema updated to support edit operations, so that files can be soft-deleted and slug uniqueness is enforced per user.

**Acceptance Criteria:**

1. Add `deleted_at` column to `moc_files` table (nullable timestamp)
2. Add `updated_at` column to `moc_files` table (default NOW())
3. Create partial index on `deleted_at` for efficient filtering
4. Verify/create unique index on `(user_id, slug)` for `moc_instructions`
5. Update Drizzle schema to include new columns
6. Migration is backward-compatible (nullable columns, no data changes)
7. Update existing list/get queries to filter `WHERE deleted_at IS NULL`
8. All existing upload/list tests pass after migration

**Technical Notes:**

```sql
-- Migration script
ALTER TABLE moc_files ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE moc_files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
CREATE INDEX idx_moc_files_deleted_at ON moc_files (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_moc_slug_per_user
  ON moc_instructions (user_id, slug) WHERE slug IS NOT NULL;
```

## 7. Epic 1 Details: Backend Edit Pipeline

**Epic Goal**: Implement secure, owner-only API endpoints for editing MOC instructions, reusing presign/finalize patterns from upload.

### Story 1.1: GET MOC for Edit Endpoint

As an owner, I want to fetch my MOC data with file URLs for editing, so that the edit form can be pre-populated.

**Acceptance Criteria:**

1. GET `/mocs/:mocId/edit` returns full MOC data including signed file URLs
2. Returns 401 for unauthenticated requests
3. Returns 403 for non-owners (no existence leak)
4. Returns 404 for non-existent MOCs
5. Response includes: metadata, files with download URLs, images with URLs
6. Zod schema validates response

### Story 1.2: PATCH MOC Metadata Endpoint

As an owner, I want to update my MOC metadata without re-uploading files, so that I can quickly fix titles, descriptions, or tags.

**Acceptance Criteria:**

1. PATCH `/mocs/:mocId` accepts partial metadata updates
2. Validates: title (required if provided), description, tags, theme
3. Slug update triggers uniqueness check (owner scope); 409 with suggestion on conflict
4. Returns 401/403/404 appropriately
5. Updates `updatedAt` timestamp
6. Re-indexes in OpenSearch (synchronous, fail-open with warning log)

**OpenSearch Re-indexing Strategy:**

- Synchronous update after successful database commit
- If OpenSearch update fails: log warning, return success (fail-open)
- Background reconciliation job catches drift (existing pattern)
- Update indexed fields: title, description, tags, theme, slug, updatedAt
- Do NOT update: file URLs, thumbnail (handled by finalize endpoint)

### Story 1.3: Edit Presign Endpoint

As an owner, I want to get presigned URLs for replacement files during edit, so that I can upload new files directly to S3.

**Acceptance Criteria:**

1. POST `/mocs/:mocId/edit/presign` accepts file metadata array
2. Validates file types/sizes against @repo/upload-config
3. Generates S3 keys with edit context: `{env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid.ext}`
4. Returns signed URLs with TTL from config
5. Applies rate limiting via @repo/rate-limit
6. Returns 401/403/404/429 appropriately

### Story 1.4: Edit Finalize Endpoint

As an owner, I want to commit my edit changes atomically, so that metadata updates, new files, and removed files are saved together.

**Acceptance Criteria:**

1. POST `/mocs/:mocId/edit/finalize` accepts: metadata changes, new file keys, removed file IDs
2. Verifies new files exist in S3 with magic bytes validation
3. Soft-deletes removed files (mark `deletedAt`)
4. Updates MOC record atomically
5. Idempotent by edit token (prevents duplicate submissions)
6. Re-indexes in OpenSearch
7. Returns updated MOC data

### Story 1.5: Edit Rate Limiting & Observability

As a platform operator, I want edit operations logged and rate-limited, so that I can monitor usage and prevent abuse.

**Acceptance Criteria:**

1. Edit operations share daily quota with upload
2. Structured logs: `moc.edit.start`, `moc.edit.presign`, `moc.edit.finalize`
3. Logs include correlationId, ownerId, mocId
4. 429 response includes `retryAfterSeconds` and next-allowed time
5. No PII in logs beyond ownerId

### Story 1.6: S3 Cleanup for Failed Edit Uploads

As a platform operator, I want orphaned S3 files from failed edits cleaned up, so that storage costs are controlled and stale files don't accumulate.

**Acceptance Criteria:**

1. Edit presign creates files in `edit/` path prefix: `{env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid.ext}`
2. On finalize success: move files from `edit/` to permanent location, or keep in `edit/` prefix with proper references
3. On finalize failure: files remain in `edit/` prefix as orphans
4. Scheduled cleanup job (daily) deletes files in `edit/` prefix older than 24 hours
5. Cleanup job logs each deleted file with correlationId
6. Synchronous rollback on finalize transaction failure: delete newly uploaded files before returning error
7. Cleanup uses S3 batch delete (up to 1000 objects per request) for efficiency

**Technical Notes:**

- Reuse existing orphan cleanup job pattern from upload implementation
- Edit prefix allows easy identification of orphaned files
- Transaction rollback provides immediate cleanup; scheduled job is backup

## 8. Epic 2 Details: Edit UX & Frontend

**Epic Goal**: Build accessible, resilient edit UI that reuses upload components and provides consistent UX patterns.

### Story 2.1: Edit Routes & Entry Points

As an owner, I want Edit buttons on my MOC detail page and My Instructions list, so that I can easily access the edit flow.

**Acceptance Criteria:**

1. "Edit" button on MOC detail page (owner-only, conditionally rendered)
2. "Edit" action in My Instructions list item menu
3. Both navigate to `/dashboard/mocs/:mocId/edit`
4. Non-authenticated users redirect to sign-in with return URL
5. Non-owners see no edit button (403 if direct URL access)

### Story 2.2: Edit Page & Data Fetching

As an owner, I want the edit page to load my current MOC data, so that I can see what I'm editing.

**Acceptance Criteria:**

1. Edit page at `/dashboard/mocs/:mocId/edit`
2. Fetches MOC data via RTK Query `getMocForEdit`
3. Shows loading skeleton during fetch
4. Pre-populates form with current values
5. Displays current files with thumbnails/previews
6. Handles 403/404 with appropriate error UI

### Story 2.3: Edit Form & Validation

As an owner, I want to modify title, description, tags, and theme, so that I can update my MOC metadata.

**Acceptance Criteria:**

1. Zod schema validates form (reuse/extend upload schema)
2. Inline validation on blur; error summary on submit
3. Title and description required; tags and theme optional
4. Slug auto-updates on title change (with manual override option)
5. "Save Changes" disabled until form valid and changes detected
6. Track dirty state for unsaved changes guard

### Story 2.4: File Management UI

As an owner, I want to add and remove files, so that I can update my MOC content.

**Acceptance Criteria:**

1. Display existing files with: filename, size, type icon, "Remove" action
2. "Remove" marks file for deletion (soft, until save) — requires confirmation
3. "Add" opens file picker (reuses `UploadArea` component from upload form)
4. Reuse 100% of file UI components from upload: `UploadArea`, `FilePreview`, `ProgressIndicator`
5. Enforce file count limits from @repo/upload-config
6. Show validation errors for invalid files (same validation as upload)
7. Image thumbnails: display existing thumbnails from S3; generate previews for new images client-side
8. Thumbnail selection: first image is default thumbnail; user can select different image as thumbnail
9. PDF thumbnail: if instruction PDF is removed and new one added, regenerate thumbnail (server-side on finalize)

**Scope Clarification:**

- ✅ IN SCOPE: Remove existing files, add new files
- ❌ OUT OF SCOPE: Edit uploaded file content (e.g., modify PDF)
- ❌ OUT OF SCOPE: Reorder files
- ❌ OUT OF SCOPE: Replace file in-place (user removes then adds new)

### Story 2.5: Save Flow & Presign/Upload Handling

As an owner, I want to save my changes with new files uploaded, so that my edits are persisted.

**Acceptance Criteria:**

1. "Save Changes" triggers: presign → upload → finalize sequence
2. Reuse `useUploadManager` for concurrent uploads
3. Show progress for file uploads
4. Handle presign/upload failures with retry
5. On 409 slug conflict, show suggestion with in-place correction
6. On success, redirect to MOC detail page with success toast

### Story 2.6: Cancel & Unsaved Changes Guard

As an owner, I want to cancel editing and be warned about unsaved changes, so that I don't lose work accidentally.

**Acceptance Criteria:**

1. "Cancel" button returns to MOC detail page
2. If unsaved changes, show confirmation dialog
3. Browser beforeunload also triggers warning
4. Unsaved changes detection covers: metadata changes, file additions, file removals
5. Confirming discard clears local state

### Story 2.7: Session Persistence & Error Recovery

As an owner, I want my edit progress preserved across page reloads, so that I don't lose work on accidental refresh.

**Acceptance Criteria:**

1. Create `useEditSession` hook (extends useUploaderSession pattern)
2. Persist form state to localStorage with debounce
3. On session expiry, redirect to sign-in with return URL
4. Restore edit state after re-authentication
5. Clear session on successful save or cancel

### Story 2.8: Accessibility & Polish

As a user with accessibility needs, I want the edit page to be fully accessible, so that I can edit my MOCs using assistive technology.

**Acceptance Criteria:**

1. WCAG AA compliance verified
2. ARIA live regions for async feedback (save progress, errors)
3. Keyboard navigation for all file actions
4. Focus management: initial focus on first field; focus error summary on validation fail
5. Screen reader announcements for file add/remove
6. Touch-friendly action buttons (44px minimum)

## 9. Next Steps

### UX Expert Prompt

Design the edit MOC instructions flow using @repo/ui components with WCAG AA compliance. The edit flow mirrors the upload flow but pre-populates with existing data. Users can modify metadata (title, description, tags, theme) and manage files (add/remove/replace PDF, images, parts lists).

Deliverables:

1. Wireframes for: Edit page (form + file management), Slug conflict modal, Unsaved changes dialog, Success state
2. Interaction specifications for file Replace/Remove actions
3. Error state designs matching upload patterns
4. Accessibility annotations (focus order, ARIA labels, keyboard shortcuts)
5. Responsive breakpoint considerations

Constraints: Reuse upload components (UploadArea, FilePreview, ProgressIndicator); follow existing design system (LEGO sky/teal); no new component patterns without justification.

### Architect Prompt

Validate and refine the edit API design, package extraction strategy, and data model implications. Edit feature adds GET/PATCH/presign/finalize endpoints for owner-only MOC editing. Package extraction moves shared upload code to `@repo/upload-types`, `@repo/upload-config`, `@repo/rate-limit`, `@repo/upload-client`.

Deliverables:

1. Confirm existing tables support edit (no migrations) or specify required changes
2. Validate endpoint design; propose consolidation with upload endpoints if beneficial
3. Review package extraction plan; identify any missing utilities
4. Define edit token/idempotency key strategy for finalize
5. Specify S3 key structure for edit uploads vs. original uploads
6. Document cleanup strategy for orphaned edit files (failed saves)

Constraints: No breaking changes to existing upload API; maintain backward compatibility; prefer reuse over duplication.

## 10. Checklist Results Report

To be populated after running the PM checklist against this document.
