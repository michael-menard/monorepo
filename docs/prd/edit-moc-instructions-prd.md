# Edit MOC Instructions — Brownfield Enhancement PRD

## 1. Intro Project Analysis and Context

### 1.1 Analysis Source

- **IDE-based fresh analysis** combined with existing upload implementation review
- Reference: `apps/web/main-app/src/` (upload components), `apps/api/endpoints/moc-uploads/` (upload API)

### 1.2 Current Project State

The platform is a LEGO MOC instructions marketplace built with React 19 frontend and AWS serverless backend. Users can currently upload MOC instruction packages (PDF + images + parts lists) via a secure owner-only flow using presign → client upload → finalize pattern.

**Gap**: Users cannot edit their uploads after initial submission — no way to correct mistakes, update content, or add new files.

### 1.3 Available Documentation

- [x] Tech Stack Documentation (CLAUDE.md)
- [x] Source Tree/Architecture (monorepo structure documented)
- [x] Coding Standards (CLAUDE.md - Zod-first, no barrel files, @repo/ui)
- [x] API Documentation (upload endpoints documented)
- [ ] External API Documentation (partial)
- [x] UX/UI Guidelines (LEGO sky/teal palette, a11y-first)
- [ ] Technical Debt Documentation

### 1.4 Enhancement Scope Definition

**Enhancement Type:**

- [x] Major Feature Modification
- [x] New Feature Addition (edit capabilities)

**Enhancement Description:**
Enable registered users to edit their own MOC instruction packages end-to-end (metadata + files). The implementation prioritizes extracting reusable infrastructure from the upload feature before building edit-specific functionality.

**Impact Assessment:**

- [x] Moderate Impact (some existing code changes)
- Package extraction touches upload implementation
- New endpoints extend existing patterns
- Form component gains `mode` prop

### 1.5 Goals

- **PRIMARY: Extract reusable infrastructure to `packages/`** — The upload-moc-instructions implementation contains significant reusable code. This PRD prioritizes extracting shared functionality BEFORE building edit-specific features.
- Enable registered users to edit their own MOC instruction packages end-to-end (metadata + files)
- Maintain owner-only visibility: users can only edit their own uploads
- **Maximize code reuse** — Edit should add minimal new code; most functionality exists in upload implementation
- Support field updates: title, description, tags, theme, PDF (replace), images (add/remove/replace), parts lists (add/remove/replace)
- Handle slug changes with conflict detection (409) against owner's existing slugs
- Conform to repo standards (React 19, Zod-first, @repo/ui, AWS serverless, @repo/logger, Tailwind, a11y)

### 1.6 Background Context

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

### 1.7 Change Log

| Date       | Version | Description                                                                                                                                                                                                                                                            | Author       |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2025-12-06 | 0.1     | Initial PRD draft (Goals, Requirements, Epics, Stories)                                                                                                                                                                                                                | PM Agent     |
| 2025-12-06 | 0.2     | Architecture review: added database migration (Story 0.5), S3 cleanup (Story 1.6), idempotency token strategy, config injection pattern, OpenSearch strategy, thumbnail handling                                                                                       | Architect    |
| 2025-12-06 | 0.3     | Emphasized package extraction as primary deliverable; added code reuse inventory table; Epic 0 marked as blocking dependency; added dependency graph                                                                                                                   | Architect    |
| 2025-12-06 | 0.4     | Clarified form reuse: edit uses MocUploadForm with mode='edit'; file operations limited to add/remove (no edit/reorder); updated file structure to show thin wrapper pattern                                                                                           | PM/Architect |
| 2025-12-08 | 1.0     | Formalized as brownfield PRD                                                                                                                                                                                                                                           | PM Agent     |
| 2025-12-08 | 1.1     | Architect review: reordered Epic 0 (DB migration first); removed redundant slug index; added rate-limit store abstraction; added slug utility extraction; clarified session-based edit presign option; added feature flag recommendation; enhanced S3 cleanup strategy | Architect    |
| 2025-12-08 | 1.2     | UX review: added Section 11 with detailed wireframes, interaction specs, micro-interactions, accessibility annotations, error state designs, responsive breakpoints, and component behavior specifications                                                             | UX Expert    |
| 2025-12-08 | 1.3     | UX decisions: contextual slug warning (none/soft/strong based on publish age); auto-save to localStorage every 30s; image reordering and bulk ops deferred to backlog; updated Stories 2.3 and 2.7 with new acceptance criteria                                        | UX Expert    |

---

## 2. Requirements

### 2.1 Functional Requirements

- **FR1**: Provide "Edit" CTA on MOC detail page and in "My Instructions" list; both open the edit flow (`/dashboard/mocs/:mocId/edit`).
- **FR2**: Restrict editor to authenticated owner; non-owners receive 403; signed-out users redirect to sign-in then return.
- **FR3**: GET endpoint returns existing MOC data (metadata + file URLs) for pre-populating the edit form.
- **FR4**: Editor displays current values: title, description, tags, theme, PDF, images, parts lists.
- **FR5**: Allow metadata-only updates via PATCH without re-uploading files.
- **FR6**: Allow PDF replacement: user removes current, uploads new; reuses presign/finalize pattern.
- **FR7**: Allow image add/remove/replace: manage image set; max count from env; reuses existing upload components.
- **FR8**: Allow parts list add/remove/replace: manage parts list set; max count from env.
- **FR9**: Slug updates allowed; on 409 conflict (owner's existing slugs), suggest available slug with in-place correction.
- **FR10**: File removals are soft-marked until save; finalize commits deletions and new uploads atomically.
- **FR11**: Save persists: updated metadata, new file keys, removed file keys; timestamps updated.
- **FR12**: After save, redirect to MOC detail page showing updated content.
- **FR13**: Server-side validation: same size/type/extension rules as upload (env-configured).
- **FR14**: API enforces owner-only edit; non-owners receive 403 without existence leak.
- **FR15**: Accessible inline errors and error summary; Save disabled until required fields valid.
- **FR16**: Presign failures show retry; log with @repo/logger and user-friendly message.
- **FR17**: Session expiry during edit preserves form state; redirect to sign-in and restore on return.
- **FR18**: Unsaved changes guard: prompt before navigating away with pending edits.
- **FR19**: Rate limiting: shared daily limit with upload (configurable); show 429 with next-allowed time.
- **FR20**: Cancel edit returns to MOC detail without saving changes.

### 2.2 Non-Functional Requirements

- **NFR1**: Adhere to repo standards (React 19, Zod-first, @repo/ui, @repo/logger, Tailwind, a11y-first, no barrel files).
- **NFR2**: Accessibility target WCAG AA; ARIA live regions for async/validation messaging.
- **NFR3**: **Code Reuse Mandate**: Import from `@repo/*` packages; do NOT duplicate code from upload implementation. Any shared logic must be extracted to packages before use.
- **NFR4**: Edit page load (GET) target ≤ 2s; save operation target ≤ 60s under normal network.
- **NFR5**: Security: owner verification on all edit operations; same file validation as upload.
- **NFR6**: Resilience: preserve form state locally; retries for presign/upload; state recovery after transient failures.
- **NFR7**: Observability: structured logs with correlationId/requestId; no PII beyond ownerId.
- **NFR8**: Testing: maintain ≥45% global coverage; unit/integration/E2E for edit flows.
- **NFR9**: **Package Extraction Gate**: Epic 0 must complete with passing regression tests before Epic 1/2 development begins.
- **NFR10**: **Future-Proofing**: Extracted packages must be designed for reuse by Sets, Gallery, Profile, Wishlist, and Delete features.
- **NFR11**: **Feature Flag**: Edit feature UI gated behind `FEATURE_EDIT_MOC=true` environment variable until Epic 2 complete. Backend endpoints can be deployed earlier for integration testing.

### 2.3 Compatibility Requirements

- **CR1**: Existing upload endpoints remain unchanged; edit uses new endpoints or clearly separated handlers.
- **CR2**: Database schema changes must be backward-compatible; no breaking changes to existing MOC records.
- **CR3**: UI/UX consistency: edit form mirrors upload form patterns; reuses same components where possible.
- **CR4**: Existing presign/finalize patterns reused for file replacement; no new S3 access patterns.
- **CR5**: Extracted packages must maintain API compatibility with existing upload feature consumers.

---

## 3. User Interface Enhancement Goals

### 3.1 Integration with Existing UI

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

### 3.2 Modified/New Screens and Views

| Screen                   | Type             | Description                                                                   |
| ------------------------ | ---------------- | ----------------------------------------------------------------------------- |
| MOC Detail Page          | Modified         | Add "Edit" button (owner-only, conditionally rendered)                        |
| My Instructions List     | Modified         | Add "Edit" action to each item's menu (existing pattern)                      |
| Edit MOC Page            | **Wrapper only** | Thin wrapper that fetches data and renders `MocUploadForm` with `mode='edit'` |
| Edit Success State       | Reuse            | Same success pattern as upload, different redirect target                     |
| File Remove Confirmation | **New**          | Confirm file removal before marking for deletion                              |

### 3.3 Edit Page Layout

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

### 3.4 UI Consistency Requirements

- **Visual Design**: Use existing @repo/ui components; LEGO-inspired sky/teal palette; consistent spacing
- **Form Patterns**: Same validation timing as upload (on blur + on submit); inline errors below fields
- **File Chips**: Same design as upload — filename, size, type icon, action buttons (Replace/Remove)
- **Progress States**: Reuse ProgressIndicator for file uploads during save
- **Loading States**: Skeleton loaders for initial data fetch; disabled form during save
- **Error States**: Same error summary component; 403/404/409/429 mapped to user-friendly messages
- **Accessibility**: Focus management on form load; keyboard-operable file actions; ARIA live regions for async feedback

### 3.5 Target Platforms

- Web Responsive (desktop-first, mobile-friendly)
- Keyboard alternatives for all drag-and-drop interactions
- Touch-friendly file action buttons (44px minimum touch targets)

---

## 4. Technical Constraints and Integration Requirements

### 4.1 Existing Technology Stack

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

### 4.2 Integration Approach

#### Database Integration Strategy

- No new tables required; existing `mocInstructions` and `mocFiles` tables support edit
- **Migration required**: Add `deletedAt` and `updatedAt` columns to `mocFiles` table (Story 0.1)
- Add `updatedAt` timestamp update on edit (`mocInstructions.updatedAt` already exists)
- Soft-delete pattern for files: mark `deletedAt` on remove, hard delete on finalize
- Slug uniqueness: Already enforced by existing `moc_instructions_user_slug_unique` index

**Schema Changes Required:**

```sql
-- Add to mocFiles table (Story 0.1)
ALTER TABLE moc_files ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE moc_files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
CREATE INDEX idx_moc_files_deleted_at ON moc_files (deleted_at) WHERE deleted_at IS NOT NULL;

-- NOTE: Slug uniqueness already enforced by existing index:
-- moc_instructions_user_slug_unique ON (user_id, slug)
-- No additional migration needed for slug constraint.
```

#### API Integration Strategy

| Endpoint                     | Method | Purpose                               | Reuse                    |
| ---------------------------- | ------ | ------------------------------------- | ------------------------ |
| `/mocs/:mocId`               | GET    | Fetch MOC for editing                 | Existing (add file URLs) |
| `/mocs/:mocId`               | PATCH  | Update metadata only                  | **New**                  |
| `/mocs/:mocId/edit/presign`  | POST   | Presign for replacement files         | Reuse presign logic      |
| `/mocs/:mocId/edit/finalize` | POST   | Commit edit (metadata + file changes) | Reuse finalize pattern   |
| `/mocs/:mocId/files/:fileId` | DELETE | Mark file for removal                 | Existing                 |

**Alternative: Session-Based Edit Presign (Recommended)**

Instead of a separate edit presign endpoint, extend the existing upload session infrastructure:

```typescript
// Extend POST /sessions/create to support edit mode
POST /api/mocs/uploads/sessions/create
{
  "mode": "edit",           // NEW: "create" | "edit"
  "mocId": "uuid",          // Required when mode="edit"
  "files": [...]            // Files to upload
}
```

**Benefits:**

- Reuses existing multipart upload infrastructure (session management, parts tracking, expiry)
- Reduces new endpoint surface area
- Finalize handler already supports idempotency
- Cleanup job handles orphaned files in both create and edit modes

**Trade-off:** Slightly more coupling to upload session pattern, but significantly less new code.

#### Frontend Integration Strategy

- Edit page at `apps/web/main-app/src/routes/dashboard/mocs/$mocId/edit.tsx` (TanStack Router file-based routing)
- Reuse `packages/core/upload` components (UploadArea, FilePreview, ProgressIndicator)
- Reuse hooks: `useUpload`, `useUploadManager`, `useUploaderSession` (adapt for edit context)
- New hook: `useEditSession` — extends `useUploaderSession` with pre-populated data
- RTK Query: Add `getMocForEdit` and `updateMoc` endpoints

#### Testing Integration Strategy

- Unit tests: Zod schemas, edit-specific validation, slug conflict handling
- Integration tests: GET/PATCH/presign/finalize endpoints, owner verification
- E2E tests: Edit happy path, file replacement, cancel without save, 403/404/409 scenarios
- Regression tests: Verify upload feature still works after package extraction

### 4.3 Code Organization

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

#### Package Extraction Strategy

- `@repo/upload-types`: Pure TypeScript types/Zod schemas (works everywhere). Also include slug utilities (`slugify`, `findAvailableSlug`) from `apps/api/core/utils/slug.ts`.
- `@repo/upload-config`: Use config injection pattern — functions accept config object rather than reading `process.env` directly. Server passes env config, client fetches from API endpoint `/api/config/upload`
- `@repo/rate-limit`: Use store abstraction pattern for framework-agnostic rate limiting:

  ```typescript
  // Package exports abstract interface
  export interface RateLimitStore {
    checkAndIncrement(key: string, limit: number): Promise<RateLimitResult>
  }

  // Package exports core logic
  export function createRateLimiter(store: RateLimitStore): RateLimiter

  // apps/api provides PostgreSQL implementation
  const rateLimiter = createRateLimiter(new PostgresRateLimitStore(db))
  ```

- `@repo/upload-client`: Browser-only (XHR, AbortController)

### 4.4 Deployment and Operations

- **Build Process Integration**: Standard Turborepo build; new packages added to pipeline
- **Deployment Strategy**: Serverless Framework deploys new Lambda handlers
- **Monitoring and Logging**: Structured logs via @repo/logger; CloudWatch integration
- **Configuration Management**: Environment variables via SST; runtime config for client

### 4.5 Risk Assessment and Mitigation

| Risk                               | Impact | Likelihood | Mitigation                                                                   |
| ---------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------- |
| Package extraction breaks upload   | High   | Medium     | Comprehensive regression tests; extract incrementally                        |
| Concurrent edit conflicts          | Medium | Low        | Last-write-wins for MVP; add optimistic locking later if needed              |
| Orphaned S3 files on failed edit   | Medium | Medium     | Synchronous cleanup on finalize failure; scheduled job as backup (Story 1.6) |
| Slug change breaks external links  | Medium | Low        | Document in UI; add redirects in future phase                                |
| Rate limit gaming (edit vs upload) | Low    | Low        | Shared quota prevents gaming; only finalize counts against limit             |
| Database migration issues          | Medium | Low        | Backward-compatible migrations; feature flag for edit UI                     |

### 4.6 Edit Idempotency Token Strategy

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

### 4.7 Edit Flow Sequence Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT MOC INSTRUCTIONS — FULL FLOW SEQUENCE                                               │
└──────────────────────────────────────────────────────────────────────────────────────────┘

  User                Frontend              API Gateway           Lambda                S3
   │                     │                      │                    │                   │
   │  Navigate to edit   │                      │                    │                   │
   │────────────────────>│                      │                    │                   │
   │                     │                      │                    │                   │
   │                     │  GET /mocs/:id/edit  │                    │                   │
   │                     │─────────────────────>│ ───────────────────>│                   │
   │                     │                      │                    │                   │
   │                     │                      │    Verify owner    │                   │
   │                     │                      │    Fetch MOC data  │                   │
   │                     │                      │    Fetch files     │                   │
   │                     │                      │<───────────────────│                   │
   │                     │<─────────────────────│                    │                   │
   │                     │                      │                    │                   │
   │  Render edit form   │                      │                    │                   │
   │<────────────────────│                      │                    │                   │
   │                     │                      │                    │                   │
   │  Make changes       │                      │                    │                   │
   │  (metadata/files)   │                      │                    │                   │
   │────────────────────>│                      │                    │                   │
   │                     │                      │                    │                   │
   │                     │  Auto-save to        │                    │                   │
   │                     │  localStorage        │                    │                   │
   │                     │  (every 30s)         │                    │                   │
   │                     │                      │                    │                   │
   │  Add new file       │                      │                    │                   │
   │────────────────────>│                      │                    │                   │
   │                     │                      │                    │                   │
   │                     │ POST /mocs/:id/edit/presign               │                   │
   │                     │─────────────────────>│ ───────────────────>│                   │
   │                     │                      │                    │                   │
   │                     │                      │    Check rate limit │                   │
   │                     │                      │    Generate presign │                   │
   │                     │                      │<───────────────────│                   │
   │                     │<─────────────────────│                    │                   │
   │                     │                      │  {uploadUrl, key}  │                   │
   │                     │                      │                    │                   │
   │                     │  PUT to S3           │                    │                   │
   │                     │───────────────────────────────────────────────────────────────>│
   │                     │                      │                    │   ← Store in      │
   │                     │                      │                    │     edit/ prefix  │
   │                     │<───────────────────────────────────────────────────────────────│
   │                     │                      │                    │                   │
   │  Upload complete    │                      │                    │                   │
   │<────────────────────│                      │                    │                   │
   │                     │                      │                    │                   │
   │  Click Save         │                      │                    │                   │
   │────────────────────>│                      │                    │                   │
   │                     │                      │                    │                   │
   │                     │ POST /mocs/:id/edit/finalize              │                   │
   │                     │─────────────────────>│ ───────────────────>│                   │
   │                     │                      │                    │                   │
   │                     │                      │  ┌─────────────────────────────────┐   │
   │                     │                      │  │ TRANSACTION:                    │   │
   │                     │                      │  │ 1. Check updatedAt (conflict)   │   │
   │                     │                      │  │ 2. Update metadata               │   │
   │                     │                      │  │ 3. Soft-delete removed files    │   │
   │                     │                      │  │ 4. Add new file records         │   │
   │                     │                      │  │ 5. Update OpenSearch (sync)     │   │
   │                     │                      │  │ 6. Commit transaction           │   │
   │                     │                      │  └─────────────────────────────────┘   │
   │                     │                      │                    │                   │
   │                     │                      │<───────────────────│                   │
   │                     │<─────────────────────│   {success: true}  │                   │
   │                     │                      │                    │                   │
   │                     │  Clear localStorage  │                    │                   │
   │                     │  Navigate to detail  │                    │                   │
   │  Success toast      │                      │                    │                   │
   │<────────────────────│                      │                    │                   │


┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ERROR HANDLING FLOWS                                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────┘

  CONFLICT (409):
  ┌─────────────────────────────────────────────────────────────────────────────────────┐
  │ finalize → Check updatedAt → MISMATCH → Return 409 Conflict                        │
  │ Frontend shows: "This MOC was edited by another session. Reload to see changes?"   │
  └─────────────────────────────────────────────────────────────────────────────────────┘

  RATE LIMITED (429):
  ┌─────────────────────────────────────────────────────────────────────────────────────┐
  │ presign/finalize → Check quota → EXCEEDED → Return 429 + retryAfterSeconds         │
  │ Frontend shows: "Daily limit reached. Resets in X hours. Draft saved locally."     │
  └─────────────────────────────────────────────────────────────────────────────────────┘

  FINALIZE FAILURE (cleanup):
  ┌─────────────────────────────────────────────────────────────────────────────────────┐
  │ Transaction fails → Rollback DB → Best-effort S3 cleanup → Return 500              │
  │ Orphaned files cleaned by scheduled job (24h)                                       │
  └─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Epic Structure

### 5.1 Epic Approach

**Epic Structure Decision**: Three epics with Epic 0 as a blocking dependency.

The edit feature is structured as three epics because:

1. **Epic 0 (Package Extraction)** creates reusable foundation — must complete first
2. **Epic 1 (Backend)** can proceed once packages exist
3. **Epic 2 (Frontend)** depends on backend APIs from Epic 1

```
Epic 0 (Package Extraction)
    │
    ├──► Epic 1 (Backend Edit) ──► Epic 2 (Frontend Edit)
    │
    └──► Future: Sets Upload, Gallery, Profile, Wishlist, Delete cleanup
```

---

## 6. Epic 0: Package Extraction & Reuse Foundation

**Epic Goal**: Extract shared upload infrastructure to reusable packages, enabling edit feature and future upload modules (Sets, Gallery, Profile) to share common code.

**⚠️ BLOCKING: Epic 0 must complete before Epic 1 and Epic 2 begin.** This ensures edit development uses extracted packages rather than duplicating upload code.

**Success Metrics:**

- Existing upload feature works identically after extraction (regression tests pass)
- Edit feature imports from `@repo/*` packages, not from `apps/` directories
- No duplicate code between upload and edit implementations

**Story Execution Order:**

```
Story 0.1 (DB Migration) ─┬─► Story 0.2 (Types)
                          ├─► Story 0.3 (Config)
                          ├─► Story 0.4 (Rate Limit)
                          └─► Story 0.5 (Upload Client)
```

---

### Story 0.1: Database Schema Migration for Edit Support

**⚠️ EXECUTE FIRST** — All other Epic 0 stories depend on this migration being complete.

As a developer, I want the database schema updated to support edit operations, so that files can be soft-deleted and queries can filter active files.

**Acceptance Criteria:**

1. Add `deleted_at` column to `moc_files` table (nullable timestamp)
2. Add `updated_at` column to `moc_files` table (default NOW())
3. Create partial index on `deleted_at` for efficient filtering
4. Update Drizzle schema to include new columns
5. Migration is backward-compatible (nullable columns, no data changes)
6. Update existing list/get queries to filter `WHERE deleted_at IS NULL`
7. All existing upload/list tests pass after migration

**Technical Notes:**

```sql
-- Migration script
ALTER TABLE moc_files ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE moc_files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
CREATE INDEX idx_moc_files_deleted_at ON moc_files (deleted_at) WHERE deleted_at IS NOT NULL;

-- NOTE: Slug uniqueness already enforced by existing index:
-- moc_instructions_user_slug_unique ON (user_id, slug)
-- No additional migration needed for slug constraint.
```

**Integration Verification:**

- IV1: Existing MOC queries return same results
- IV2: New columns exist and accept values
- IV3: Existing upload/list functionality unchanged

---

### Story 0.2: Extract Upload Types Package

As a developer, I want shared upload types in `@repo/upload-types`, so that edit and future upload features use consistent type definitions.

**Acceptance Criteria:**

1. Create `packages/upload-types` with proper package.json and tsconfig
2. Move types from `apps/web/main-app/src/types/uploader-session.ts` and `uploader-upload.ts`
3. Export: `UploaderSession`, `FileCategory`, `UploadStatus`, `UploadErrorCode`, `UploaderFileItem`, `UploadBatchState`
4. Move slug utilities from `apps/api/core/utils/slug.ts`: `slugify`, `findAvailableSlug`
5. Update imports in main-app and API to use `@repo/upload-types`
6. All existing upload tests pass

**Integration Verification:**

- IV1: Upload feature functions identically after type extraction
- IV2: TypeScript compilation succeeds across all packages
- IV3: No runtime type errors in upload flow

---

### Story 0.3: Extract Upload Config Package

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

**Integration Verification:**

- IV1: Upload presign validates file sizes correctly
- IV2: Browser displays correct file size limits
- IV3: Config changes via env vars propagate correctly

---

### Story 0.4: Extract Rate Limit Package

As a developer, I want rate limiting utilities in `@repo/rate-limit`, so that all API features can apply consistent rate limiting.

**Acceptance Criteria:**

1. Create `packages/rate-limit` package
2. Move logic from `apps/api/core/rate-limit/upload-rate-limit.ts`
3. Use store abstraction pattern for framework-agnostic implementation:

   ```typescript
   // Package exports abstract interface
   export interface RateLimitStore {
     checkAndIncrement(key: string, limit: number): Promise<RateLimitResult>
   }

   // Package exports core logic
   export function createRateLimiter(store: RateLimitStore): RateLimiter
   ```

4. Export: `createRateLimiter`, `RateLimitStore`, `RateLimitResult` type
5. Provide `PostgresRateLimitStore` implementation in `apps/api`
6. Generalize for any feature (not upload-specific naming)
7. Update upload endpoints to use `@repo/rate-limit`

**Integration Verification:**

- IV1: Upload rate limiting works identically
- IV2: 429 responses include correct retry-after headers
- IV3: Daily limit resets at midnight UTC

---

### Story 0.5: Extract Upload Client Package

As a developer, I want browser upload utilities in `@repo/upload-client`, so that all frontend upload features share XHR/progress logic.

**Acceptance Criteria:**

1. Create `packages/upload-client` package (browser-only)
2. Move logic from `apps/web/main-app/src/services/api/uploadClient.ts`
3. Export: `uploadFile`, `uploadToPresignedUrl`, related types
4. Include AbortController and progress event handling
5. Update main-app imports to use `@repo/upload-client`

**Integration Verification:**

- IV1: File uploads complete successfully
- IV2: Progress events fire correctly
- IV3: Upload cancellation works

---

## 7. Epic 1: Backend Edit Pipeline

**Epic Goal**: Implement secure, owner-only API endpoints for editing MOC instructions, reusing presign/finalize patterns from upload.

---

### Story 1.1: GET MOC for Edit Endpoint

As an owner, I want to fetch my MOC data with file URLs for editing, so that the edit form can be pre-populated.

**Acceptance Criteria:**

1. GET `/mocs/:mocId/edit` returns full MOC data including signed file URLs
2. Returns 401 for unauthenticated requests
3. Returns 403 for non-owners (no existence leak)
4. Returns 404 for non-existent MOCs
5. Response includes: metadata, files with download URLs, images with URLs
6. Zod schema validates response

**Integration Verification:**

- IV1: Existing MOC detail page still works
- IV2: Owner can fetch their own MOC
- IV3: Non-owner receives 403 without MOC details

---

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

**Implementation Pattern:**

```typescript
// After successful DB commit
try {
  await opensearch.update({
    index: 'moc-instructions',
    id: mocId,
    body: { doc: { title, description, tags, theme, slug, updatedAt } },
  })
} catch (e) {
  logger.warn('OpenSearch update failed, reconciliation job will catch up', {
    mocId,
    error: e,
  })
  // Continue - don't fail the edit operation
}
```

**Integration Verification:**

- IV1: Existing MOC data unchanged for unmodified fields
- IV2: OpenSearch reflects updated metadata
- IV3: Slug conflict returns helpful suggestion

---

### Story 1.3: Edit Presign Endpoint

As an owner, I want to get presigned URLs for replacement files during edit, so that I can upload new files directly to S3.

**Acceptance Criteria:**

1. POST `/mocs/:mocId/edit/presign` accepts file metadata array
2. Validates file types/sizes against @repo/upload-config
3. Generates S3 keys with edit context: `{env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid.ext}`
4. Returns signed URLs with TTL from config
5. Applies rate limiting via @repo/rate-limit
6. Returns 401/403/404/429 appropriately

**Integration Verification:**

- IV1: Presigned URLs allow file upload
- IV2: Invalid file types rejected
- IV3: Rate limit enforced correctly

---

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

**Integration Verification:**

- IV1: All changes applied atomically
- IV2: Removed files excluded from queries
- IV3: Duplicate finalize returns same result

---

### Story 1.5: Edit Rate Limiting & Observability

As a platform operator, I want edit operations logged and rate-limited, so that I can monitor usage and prevent abuse.

**Acceptance Criteria:**

1. Edit operations share daily quota with upload
2. Structured logs: `moc.edit.start`, `moc.edit.presign`, `moc.edit.finalize`
3. Logs include correlationId, ownerId, mocId
4. 429 response includes `retryAfterSeconds` and next-allowed time
5. No PII in logs beyond ownerId
6. CloudWatch alarms configured for operational monitoring

**Alerting Thresholds:**
| Metric | Threshold | Alarm Action |
|--------|-----------|--------------|
| S3 cleanup failure rate | >5% over 1 hour | SNS → PagerDuty |
| Edit finalize p95 latency | >10 seconds | SNS → Slack |
| Edit presign error rate | >10% over 15 min | SNS → Slack |
| 429 rate limit responses | >100/hour | SNS → Slack (informational) |
| OpenSearch sync failures | >1% over 1 hour | SNS → Slack |

**Integration Verification:**

- IV1: Rate limit shared with upload
- IV2: CloudWatch logs contain expected fields
- IV3: 429 response parseable by frontend
- IV4: CloudWatch alarms configured and tested

---

### Story 1.6: S3 Cleanup for Failed Edit Uploads

As a platform operator, I want orphaned S3 files from failed edits cleaned up, so that storage costs are controlled and stale files don't accumulate.

**Acceptance Criteria:**

1. Edit presign creates files in `edit/` path prefix: `{env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid.ext}`
2. On finalize success: move files from `edit/` to permanent location, or keep in `edit/` prefix with proper references
3. On finalize failure: files remain in `edit/` prefix as orphans
4. Scheduled cleanup job (daily) deletes files in `edit/` prefix older than 24 hours
5. Cleanup job logs each deleted file with correlationId
6. **Best-effort synchronous cleanup** on finalize transaction failure: attempt to delete newly uploaded files before returning error
7. Cleanup uses S3 batch delete (up to 1000 objects per request) for efficiency

**Synchronous Cleanup Pattern:**

```typescript
} catch (error) {
  // Clear database lock
  await db.update(uploadSessions)
    .set({ finalizingAt: null })
    .where(eq(uploadSessions.id, sessionId))

  // Best-effort S3 cleanup of newly uploaded files
  await cleanupEditFiles(mocId, newFileKeys).catch(e =>
    logger.warn('Failed to cleanup edit files on rollback', {
      mocId,
      fileCount: newFileKeys.length,
      error: e
    })
  )

  throw error
}
```

**Integration Verification:**

- IV1: Successful edit files accessible
- IV2: Failed edit orphans cleaned after 24h
- IV3: Cleanup job logs accurate
- IV4: Best-effort cleanup attempted on finalize failure

---

## 8. Epic 2: Edit UX & Frontend

**Epic Goal**: Build accessible, resilient edit UI that reuses upload components and provides consistent UX patterns.

---

### Story 2.1: Edit Routes & Entry Points

As an owner, I want Edit buttons on my MOC detail page and My Instructions list, so that I can easily access the edit flow.

**Acceptance Criteria:**

1. "Edit" button on MOC detail page (owner-only, conditionally rendered)
2. "Edit" action in My Instructions list item menu
3. Both navigate to `/dashboard/mocs/:mocId/edit`
4. Non-authenticated users redirect to sign-in with return URL
5. Non-owners see no edit button (403 if direct URL access)
6. **Feature flag**: Edit UI elements only visible when `FEATURE_EDIT_MOC=true`

**Integration Verification:**

- IV1: Existing MOC detail page unchanged for non-owners
- IV2: Navigation works from both entry points
- IV3: Auth redirect preserves return URL
- IV4: Edit buttons hidden when feature flag is disabled

---

### Story 2.2: Edit Page & Data Fetching

As an owner, I want the edit page to load my current MOC data, so that I can see what I'm editing.

**Acceptance Criteria:**

1. Edit page at `/dashboard/mocs/:mocId/edit`
2. Fetches MOC data via RTK Query `getMocForEdit`
3. Shows loading skeleton during fetch
4. Pre-populates form with current values
5. Displays current files with thumbnails/previews
6. Handles 403/404 with appropriate error UI

**Integration Verification:**

- IV1: Loading state visible during fetch
- IV2: Form populated with correct values
- IV3: Error states render correctly

---

### Story 2.3: Edit Form & Validation

As an owner, I want to modify title, description, tags, and theme, so that I can update my MOC metadata.

**Acceptance Criteria:**

1. Zod schema validates form (reuse/extend upload schema)
2. Inline validation on blur; error summary on submit
3. Title and description required; tags and theme optional
4. Slug auto-updates on title change (with manual override option)
5. "Save Changes" disabled until form valid and changes detected
6. Track dirty state for unsaved changes guard
7. **Slug change warning** based on MOC status:
   - Draft/Private: No warning
   - Published < 7 days: Soft inline warning ("Changing URL may affect recent links")
   - Published > 7 days: Strong modal confirmation showing old→new URL
8. **Auto-save to localStorage** every 30 seconds when dirty; show subtle "Draft saved locally" indicator

**Integration Verification:**

- IV1: Validation matches upload form behavior
- IV2: Slug generation consistent with upload
- IV3: Dirty state detected correctly
- IV4: Slug warning appears for published MOCs
- IV5: Auto-save persists form state to localStorage

---

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

**Integration Verification:**

- IV1: File components render identically to upload
- IV2: Remove confirmation prevents accidental deletion
- IV3: File limits enforced correctly

---

### Story 2.5: Save Flow & Presign/Upload Handling

As an owner, I want to save my changes with new files uploaded, so that my edits are persisted.

**Acceptance Criteria:**

1. "Save Changes" triggers: presign → upload → finalize sequence
2. Reuse `useUploadManager` for concurrent uploads
3. Show progress for file uploads
4. Handle presign/upload failures with retry
5. On 409 slug conflict, show suggestion with in-place correction
6. On success, redirect to MOC detail page with success toast

**Integration Verification:**

- IV1: Upload progress accurate
- IV2: Retry recovers from transient failures
- IV3: Success redirect shows updated MOC

---

### Story 2.6: Cancel & Unsaved Changes Guard

As an owner, I want to cancel editing and be warned about unsaved changes, so that I don't lose work accidentally.

**Acceptance Criteria:**

1. "Cancel" button returns to MOC detail page
2. If unsaved changes, show confirmation dialog
3. Browser beforeunload also triggers warning
4. Unsaved changes detection covers: metadata changes, file additions, file removals
5. Confirming discard clears local state

**Integration Verification:**

- IV1: Clean cancel navigates without prompt
- IV2: Dirty cancel shows confirmation
- IV3: Browser close triggers warning

---

### Story 2.7: Session Persistence & Error Recovery

As an owner, I want my edit progress preserved across page reloads, so that I don't lose work on accidental refresh.

**Acceptance Criteria:**

1. Create `useEditSession` hook (extends useUploaderSession pattern)
2. Persist form state to localStorage with 30-second debounce (auto-save)
3. On session expiry, redirect to sign-in with return URL
4. Restore edit state after re-authentication
5. Clear session on successful save or explicit discard
6. **Recovery toast**: On page load with recovered draft, show "We restored your unsaved changes from [time]"
7. **Draft expiry**: Clear drafts older than 7 days on page load
8. Storage key format: `edit:moc:{mocId}:{userId}`

**Integration Verification:**

- IV1: Refresh preserves form state
- IV2: Re-auth restores session
- IV3: Successful save clears storage
- IV4: Recovery toast appears when draft restored
- IV5: Stale drafts (>7 days) are not restored

---

### Story 2.8: Accessibility & Polish

As a user with accessibility needs, I want the edit page to be fully accessible, so that I can edit my MOCs using assistive technology.

**Acceptance Criteria:**

1. WCAG AA compliance verified
2. ARIA live regions for async feedback (save progress, errors)
3. Keyboard navigation for all file actions
4. Focus management: initial focus on first field; focus error summary on validation fail
5. Screen reader announcements for file add/remove
6. Touch-friendly action buttons (44px minimum)

**Integration Verification:**

- IV1: Axe audit passes
- IV2: Keyboard-only navigation works
- IV3: Screen reader announces state changes

---

## 9. Next Steps

### UX Expert Prompt

Design the edit MOC instructions flow using @repo/ui components with WCAG AA compliance. The edit flow mirrors the upload flow but pre-populates with existing data. Users can modify metadata (title, description, tags, theme) and manage files (add/remove/replace PDF, images, parts lists).

**Deliverables:**

1. Wireframes for: Edit page (form + file management), Slug conflict modal, Unsaved changes dialog, Success state
2. Interaction specifications for file Replace/Remove actions
3. Error state designs matching upload patterns
4. Accessibility annotations (focus order, ARIA labels, keyboard shortcuts)
5. Responsive breakpoint considerations

**Constraints:** Reuse upload components (UploadArea, FilePreview, ProgressIndicator); follow existing design system (LEGO sky/teal); no new component patterns without justification.

### Architect Prompt

Validate and refine the edit API design, package extraction strategy, and data model implications. Edit feature adds GET/PATCH/presign/finalize endpoints for owner-only MOC editing. Package extraction moves shared upload code to `@repo/upload-types`, `@repo/upload-config`, `@repo/rate-limit`, `@repo/upload-client`.

**Deliverables:**

1. Confirm existing tables support edit (no migrations) or specify required changes
2. Validate endpoint design; propose consolidation with upload endpoints if beneficial
3. Review package extraction plan; identify any missing utilities
4. Define edit token/idempotency key strategy for finalize
5. Specify S3 key structure for edit uploads vs. original uploads
6. Document cleanup strategy for orphaned edit files (failed saves)

**Constraints:** No breaking changes to existing upload API; maintain backward compatibility; prefer reuse over duplication.

---

## 10. Checklist Results Report

### Architect Checklist Validation — December 9, 2025

#### Executive Summary

| Metric                             | Assessment                                                               |
| ---------------------------------- | ------------------------------------------------------------------------ |
| **Overall Architecture Readiness** | ✅ **HIGH (97%)**                                                        |
| **Critical Risks Identified**      | 2 (manageable)                                                           |
| **Key Strengths**                  | Package extraction strategy, comprehensive code reuse, detailed UX specs |
| **Project Type**                   | Full-Stack (Frontend + Backend + Package Extraction)                     |
| **Sections Evaluated**             | All 10 sections (no skips)                                               |

**This PRD is ready for development.** It has been through 4 architect reviews (v0.2, v0.3, v1.1, v1.2), includes detailed technical specifications, and demonstrates strong alignment between product requirements and technical implementation.

#### Section Pass Rates

| Section                        | Pass Rate | Status  |
| ------------------------------ | --------- | ------- |
| 1. Requirements Alignment      | 100%      | ✅ PASS |
| 2. Architecture Fundamentals   | 95%       | ✅ PASS |
| 3. Technical Stack & Decisions | 100%      | ✅ PASS |
| 4. Frontend Design             | 100%      | ✅ PASS |
| 5. Resilience & Operations     | 90%       | ✅ PASS |
| 6. Security & Compliance       | 95%       | ✅ PASS |
| 7. Implementation Guidance     | 100%      | ✅ PASS |
| 8. Dependency & Integration    | 95%       | ✅ PASS |
| 9. AI Agent Suitability        | 100%      | ✅ PASS |
| 10. Accessibility              | 100%      | ✅ PASS |

#### Top 5 Risks

| #   | Risk                             | Severity  | Mitigation                                                    |
| --- | -------------------------------- | --------- | ------------------------------------------------------------- |
| 1   | Package extraction breaks upload | 🔴 High   | Comprehensive regression tests; incremental extraction (NFR9) |
| 2   | Orphaned S3 files                | 🟡 Medium | Synchronous cleanup + scheduled job backup (Story 1.6)        |
| 3   | Concurrent edit conflicts        | 🟡 Medium | Last-write-wins for MVP; updatedAt idempotency key (§4.6)     |
| 4   | Feature flag complexity          | 🟢 Low    | Single `FEATURE_EDIT_MOC` env var (NFR11)                     |
| 5   | Slug change breaks links         | 🟡 Medium | UI warning, future redirect capability noted                  |

#### Recommendations Applied

| Item                                 | Status                             |
| ------------------------------------ | ---------------------------------- |
| Add alerting thresholds to Story 1.5 | ✅ Added                           |
| Add sequence diagram for edit flow   | ✅ Added (§4.7)                    |
| localStorage quota handling          | Noted for Story 2.7 implementation |

#### AI Implementation Readiness

**Status: Ready.** Stories are well-sized with clear acceptance criteria. Complexity hotspots identified:

- S3 cleanup logic (Story 1.6) — Medium-High complexity
- Package extraction (Epic 0) — Execute incrementally
- Slug conflict modal — Reuse existing @repo/ui patterns

#### Final Decision

✅ **READY FOR DEVELOPMENT** — Proceed with Epic 0 (Package Extraction) immediately.

---

## 11. UX Design Specifications

### 11.1 Design Principles for Edit Flow

| Principle                  | Application                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| **Predictability**         | Edit mirrors upload — users who've uploaded know how to edit      |
| **Non-Destructive**        | All removals are soft until save; clear "undo" path via Cancel    |
| **Progressive Disclosure** | Show current state first, reveal actions on hover/focus           |
| **Immediate Feedback**     | Every action has visible response within 100ms                    |
| **Recovery-Friendly**      | Session persistence, retry mechanisms, clear error recovery paths |

### 11.2 Enhanced Edit Page Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to My Instructions                                               │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🏗️ Edit MOC Instructions                                           │ │
│ │ ─────────────────────────────────────────────────────────────────── │ │
│ │ Last saved: Dec 8, 2025 at 2:34 PM                    [Cancel]     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────── METADATA ────────────────────────────┐ │
│ │                                                                     │ │
│ │  Title *                                                            │ │
│ │  ┌─────────────────────────────────────────────────────────────┐   │ │
│ │  │ King Mearas Castle - Medieval LEGO MOC                      │   │ │
│ │  └─────────────────────────────────────────────────────────────┘   │ │
│ │  ✓ 48/100 characters                                               │ │
│ │                                                                     │ │
│ │  Description *                                                      │ │
│ │  ┌─────────────────────────────────────────────────────────────┐   │ │
│ │  │ A majestic medieval castle inspired by classic LEGO sets.  │   │ │
│ │  │ Features working drawbridge, detailed interior rooms, and  │   │ │
│ │  │ modular tower sections for easy customization...           │   │ │
│ │  │                                                             │   │ │
│ │  └─────────────────────────────────────────────────────────────┘   │ │
│ │  234/2000 characters                                               │ │
│ │                                                                     │ │
│ │  Theme                           Tags                              │ │
│ │  ┌──────────────────────┐       ┌────────────────────────────────┐ │ │
│ │  │ Castle           ▼  │       │ [medieval ✕] [castle ✕] [+]    │ │ │
│ │  └──────────────────────┘       └────────────────────────────────┘ │ │
│ │                                                                     │ │
│ │  URL Slug (auto-generated from title)                              │ │
│ │  ┌─────────────────────────────────────────────────────────────┐   │ │
│ │  │ king-mearas-castle-medieval-lego-moc                        │   │ │
│ │  └─────────────────────────────────────────────────────────────┘   │ │
│ │  ⚠️ Changing the slug may break existing links                     │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌───────────────────────── INSTRUCTION PDF ───────────────────────────┐ │
│ │                                                                     │ │
│ │  Instructions PDF * (Required)                     Max: 50 MB      │ │
│ │                                                                     │ │
│ │  ┌─────────────────────────────────────────────────────────────┐   │ │
│ │  │  📄                                                         │   │ │
│ │  │  king-mearas-instructions-v2.pdf                            │   │ │
│ │  │  2.4 MB · Uploaded Dec 1, 2025                              │   │ │
│ │  │                                                             │   │ │
│ │  │  ┌──────────┐  ┌──────────┐                                │   │ │
│ │  │  │ Replace  │  │ Remove   │                                │   │ │
│ │  │  └──────────┘  └──────────┘                                │   │ │
│ │  └─────────────────────────────────────────────────────────────┘   │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────── IMAGES ──────────────────────────────────┐ │
│ │                                                                     │ │
│ │  Gallery Images (Optional)                        3/10 · Max: 20MB │ │
│ │                                                                     │ │
│ │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │ │
│ │  │            │  │            │  │            │  │            │   │ │
│ │  │   [img1]   │  │   [img2]   │  │   [img3]   │  │     +      │   │ │
│ │  │    ⭐      │  │            │  │            │  │    Add     │   │ │
│ │  │  ✕ Remove  │  │  ✕ Remove  │  │  ✕ Remove  │  │   Image    │   │ │
│ │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │ │
│ │                                                                     │ │
│ │  ⭐ = Cover image (click another to change)                        │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌───────────────────────── PARTS LISTS ───────────────────────────────┐ │
│ │                                                                     │ │
│ │  Parts Lists (Optional)                           2/5 · Max: 10MB  │ │
│ │                                                                     │ │
│ │  ┌─────────────────────────────────────────────────────────────┐   │ │
│ │  │  📋 parts-list-bricklink.csv          12 KB      [Remove]   │   │ │
│ │  │  📋 parts-list-rebrickable.xml         8 KB      [Remove]   │   │ │
│ │  └─────────────────────────────────────────────────────────────┘   │ │
│ │                                                                     │ │
│ │  ┌─────────────────────────────────────────────────────────────┐   │ │
│ │  │  + Add Parts List                                           │   │ │
│ │  │  Drag & drop or click to upload (.csv, .xml, .txt, .json)   │   │ │
│ │  └─────────────────────────────────────────────────────────────┘   │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │  ┌──────────────────────┐    ┌──────────────────────────────────┐  │ │
│ │  │      Cancel          │    │      💾 Save Changes             │  │ │
│ │  └──────────────────────┘    └──────────────────────────────────┘  │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Component State Diagrams

#### File Card States

```
┌─────────────────────────────────────────────────────────────────────────┐
│ EXISTING FILE STATES                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [DEFAULT]              [HOVER]               [MARKED FOR REMOVAL]      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│  │ 📄 file.pdf  │      │ 📄 file.pdf  │      │ 📄 file.pdf  │          │
│  │ 2.4 MB       │  →   │ 2.4 MB       │  →   │ ~~2.4 MB~~   │          │
│  │              │      │ [Replace]    │      │              │          │
│  │              │      │ [Remove]     │      │ [Undo]       │          │
│  └──────────────┘      └──────────────┘      └──────────────┘          │
│       ↑                                            │                    │
│       └────────────────── Undo ────────────────────┘                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ NEW FILE STATES (during edit session)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [QUEUED]              [UPLOADING]            [UPLOADED]                │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│  │ 📄 new.pdf   │      │ 📄 new.pdf   │      │ 📄 new.pdf   │          │
│  │ Pending...   │  →   │ ████░░ 67%   │  →   │ ✓ Ready      │          │
│  │ [Remove]     │      │ [Cancel]     │      │ [Remove]     │          │
│  └──────────────┘      └──────────────┘      └──────────────┘          │
│                                                                         │
│  [FAILED]                                                               │
│  ┌──────────────┐                                                       │
│  │ 📄 new.pdf   │                                                       │
│  │ ⚠️ Failed     │                                                       │
│  │ [Retry] [✕]  │                                                       │
│  └──────────────┘                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Image Thumbnail States

```
┌─────────────────────────────────────────────────────────────────────────┐
│ IMAGE CARD VARIATIONS                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [COVER IMAGE]         [REGULAR IMAGE]        [MARKED REMOVED]          │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│  │  ┌────────┐  │      │  ┌────────┐  │      │  ┌────────┐  │          │
│  │  │  IMG   │  │      │  │  IMG   │  │      │  │ ░░░░░░ │  │          │
│  │  │   ⭐   │  │      │  │        │  │      │  │   ✕    │  │          │
│  │  └────────┘  │      │  └────────┘  │      │  └────────┘  │          │
│  │  Cover Image │      │  Set as Cover│      │  [Undo]      │          │
│  │  [Remove]    │      │  [Remove]    │      │              │          │
│  └──────────────┘      └──────────────┘      └──────────────┘          │
│                                                                         │
│  Border: sky-500       Border: gray-200      Border: red-200 dashed    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.4 Modal & Dialog Specifications

#### Remove File Confirmation Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│     ⚠️ Remove File?                                                 │
│                                                                     │
│     Are you sure you want to remove                                 │
│     "king-mearas-instructions-v2.pdf"?                              │
│                                                                     │
│     This file will be deleted when you save changes.                │
│     You can undo this action before saving.                         │
│                                                                     │
│     ┌─────────────────┐    ┌─────────────────────┐                 │
│     │     Cancel      │    │   Remove File       │                 │
│     └─────────────────┘    └─────────────────────┘                 │
│                                 (destructive style)                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Focus: "Cancel" button (safe default)
Keyboard: Escape → Cancel, Enter → focused button
```

#### Unsaved Changes Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│     📝 Unsaved Changes                                              │
│                                                                     │
│     You have unsaved changes to your MOC.                           │
│     What would you like to do?                                      │
│                                                                     │
│     Changes you've made:                                            │
│     • Title updated                                                 │
│     • 1 file marked for removal                                     │
│     • 2 new images added                                            │
│                                                                     │
│     ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│     │ Keep Editing  │ │ Discard       │ │ Save & Exit   │          │
│     └───────────────┘ └───────────────┘ └───────────────┘          │
│          (primary)       (destructive)      (secondary)             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Focus: "Keep Editing" button (safe default)
Triggered by: Navigation away, Cancel button, browser close
```

#### Slug Conflict Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│     🔗 URL Slug Conflict                                            │
│                                                                     │
│     The slug "king-mearas-castle" is already used by                │
│     another of your MOCs.                                           │
│                                                                     │
│     Suggested alternative:                                          │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │ king-mearas-castle-2                                    │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│     Or enter a custom slug:                                         │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │ king-mearas-castle-medieval                             │    │
│     └─────────────────────────────────────────────────────────┘    │
│     ✓ Available                                                    │
│                                                                     │
│     ┌─────────────────┐    ┌─────────────────────┐                 │
│     │     Cancel      │    │   Use This Slug     │                 │
│     └─────────────────┘    └─────────────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Behavior: Real-time slug availability check with debounce (300ms)
```

### 11.5 Loading & Progress States

#### Initial Page Load (Skeleton)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to My Instructions                                           │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░░░░░░                                           │ │
│ │ ─────────────────────────────────────────────────────────────── │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  ░░░░░░░░                                                       │ │
│ │  ┌─────────────────────────────────────────────────────────┐   │ │
│ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ │  ░░░░░░░░░░░░░░                                                │ │
│ │  ┌─────────────────────────────────────────────────────────┐   │ │
│ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │ │
│ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │ │
│ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Skeleton uses subtle pulse animation (opacity 0.5 → 0.7 → 0.5)      │
│ Duration: 1.5s ease-in-out, infinite                                │
└─────────────────────────────────────────────────────────────────────┘
```

#### Save Progress Overlay

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│     (Form content dimmed with overlay)                              │
│                                                                     │
│     ┌───────────────────────────────────────────────────────────┐  │
│     │                                                           │  │
│     │                   💾 Saving Changes                       │  │
│     │                                                           │  │
│     │     ████████████████░░░░░░░░░░░░░░░░░░  45%               │  │
│     │                                                           │  │
│     │     ✓ Uploading new-image-1.jpg                          │  │
│     │     ⏳ Uploading new-image-2.jpg (2.1 MB)                 │  │
│     │     ○ Finalizing changes...                               │  │
│     │                                                           │  │
│     │     Do not close this page                                │  │
│     │                                                           │  │
│     └───────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Escape disabled during save
Browser close shows warning
```

### 11.6 Error States

#### Form Validation Errors

```
┌─────────────────────────────────────────────────────────────────────┐
│ ERROR SUMMARY (shown at top of form on submit with errors)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Please fix 2 errors before saving                        │   │
│  │                                                               │   │
│  │  • Title is required                                          │   │
│  │  • Instructions PDF is required                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Each error is a link that focuses the relevant field               │
│  Background: red-50, Border: red-200, Text: red-800                │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ INLINE FIELD ERROR                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Title *                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ⚠️ Title is required                                               │
│                                                                     │
│  Border: red-500, Error text: red-600                              │
│  aria-invalid="true", aria-describedby="title-error"               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### API Error States

```
┌─────────────────────────────────────────────────────────────────────┐
│ ERROR TYPE: 403 Forbidden (Not Owner)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │                        🔒                                   │   │
│  │                                                             │   │
│  │              Access Denied                                  │   │
│  │                                                             │   │
│  │   You don't have permission to edit this MOC.               │   │
│  │   Only the owner can make changes.                          │   │
│  │                                                             │   │
│  │              [Go to My Instructions]                        │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ERROR TYPE: 404 Not Found                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │                        🔍                                   │   │
│  │                                                             │   │
│  │              MOC Not Found                                  │   │
│  │                                                             │   │
│  │   This MOC may have been deleted or the link is invalid.    │   │
│  │                                                             │   │
│  │              [Go to My Instructions]                        │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ERROR TYPE: 429 Rate Limited                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  ⏱️ Daily Upload Limit Reached                               │   │
│  │                                                             │   │
│  │  You've reached your daily limit of 100 uploads/edits.      │   │
│  │  Your limit resets in 4 hours 23 minutes.                   │   │
│  │                                                             │   │
│  │  Your changes have been saved locally and will be           │   │
│  │  restored when you return.                                  │   │
│  │                                                             │   │
│  │         [Save Draft]    [Go to My Instructions]             │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ERROR TYPE: Network/Server Error (Retryable)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Toast notification (bottom-right, auto-dismiss after 8s):          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Save failed — please try again                     [✕]  │   │
│  │  Network error. Your changes are still saved locally.       │   │
│  │                                            [Retry Now]       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.7 Micro-Interactions & Animations

| Interaction          | Animation                              | Duration | Easing   |
| -------------------- | -------------------------------------- | -------- | -------- |
| **Page load**        | Fade in + slide up                     | 200ms    | ease-out |
| **Form field focus** | Border color transition                | 150ms    | ease     |
| **Button hover**     | Background color + slight scale (1.02) | 150ms    | ease     |
| **File card hover**  | Subtle shadow + action buttons appear  | 200ms    | ease     |
| **Remove file**      | Strikethrough + fade to 50% opacity    | 200ms    | ease-out |
| **Undo remove**      | Fade back to 100%                      | 200ms    | ease-in  |
| **Add file**         | Slide in from right + fade in          | 250ms    | ease-out |
| **Upload progress**  | Smooth width transition                | 100ms    | linear   |
| **Error shake**      | Horizontal shake (2px)                 | 300ms    | ease     |
| **Success toast**    | Slide in from bottom                   | 300ms    | spring   |
| **Modal open**       | Fade in + scale (0.95 → 1)             | 200ms    | ease-out |
| **Modal close**      | Fade out + scale (1 → 0.95)            | 150ms    | ease-in  |

### 11.8 Accessibility Specifications

#### Focus Order (Tab Sequence)

```
1.  "Back to My Instructions" link
2.  "Cancel" button (header)
3.  Title input
4.  Description textarea
5.  Theme dropdown
6.  Tags input
7.  Slug input
8.  PDF file card → Replace button → Remove button
9.  Each image card → Set as cover → Remove button
10. Add image button
11. Each parts list card → Remove button
12. Add parts list button
13. Cancel button (footer)
14. Save Changes button
```

#### ARIA Labels & Roles

```html
<!-- Form region -->
<main role="main" aria-labelledby="page-title">
  <h1 id="page-title">Edit MOC Instructions</h1>

  <!-- Error summary -->
  <div role="alert" aria-live="assertive" id="error-summary">
    <!-- Announced immediately when errors appear -->
  </div>

  <!-- Form -->
  <form aria-describedby="form-instructions">
    <p id="form-instructions" class="sr-only">
      Edit your MOC details and files. Required fields are marked with an asterisk.
    </p>

    <!-- Title field -->
    <label for="title">Title <span aria-hidden="true">*</span></label>
    <input
      id="title"
      aria-required="true"
      aria-invalid="false"
      aria-describedby="title-hint title-error"
    />
    <span id="title-hint">48/100 characters</span>
    <span id="title-error" role="alert"></span>

    <!-- File section -->
    <section aria-labelledby="pdf-section">
      <h2 id="pdf-section">Instructions PDF (Required)</h2>

      <!-- Existing file -->
      <div role="listitem" aria-label="Current file: king-mearas-instructions.pdf, 2.4 megabytes">
        <button aria-label="Replace file king-mearas-instructions.pdf">Replace</button>
        <button aria-label="Remove file king-mearas-instructions.pdf">Remove</button>
      </div>
    </section>

    <!-- Images section -->
    <section aria-labelledby="images-section">
      <h2 id="images-section">Gallery Images, 3 of 10</h2>

      <div role="list" aria-label="Gallery images">
        <div role="listitem" aria-label="Image 1, cover image">
          <button aria-pressed="true" aria-label="Cover image, currently selected">⭐</button>
          <button aria-label="Remove image 1">Remove</button>
        </div>
      </div>
    </section>

    <!-- Live region for async updates -->
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="status-announcer">
      <!-- "File uploaded successfully", "2 files remaining", etc. -->
    </div>
  </form>
</main>

<!-- Confirmation dialog -->
<dialog role="alertdialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
  <h2 id="dialog-title">Remove File?</h2>
  <p id="dialog-description">This file will be deleted when you save changes.</p>
</dialog>
```

#### Keyboard Shortcuts

| Key                | Action                                        | Context                     |
| ------------------ | --------------------------------------------- | --------------------------- |
| `Escape`           | Close modal / Cancel edit (with confirmation) | Always                      |
| `Ctrl/Cmd + S`     | Save changes                                  | Form focused                |
| `Ctrl/Cmd + Enter` | Save changes                                  | Form focused                |
| `Delete`           | Remove focused file                           | File card focused           |
| `Enter`            | Activate button / Open dropdown               | Button/dropdown focused     |
| `Space`            | Toggle checkbox / Activate button             | Interactive element focused |
| `Arrow keys`       | Navigate within dropdown / tag list           | Dropdown/tags focused       |

### 11.9 Responsive Breakpoints

| Breakpoint  | Width          | Layout Changes                                                                            |
| ----------- | -------------- | ----------------------------------------------------------------------------------------- |
| **Mobile**  | < 640px        | Single column, stacked sections, full-width buttons, touch-optimized (48px touch targets) |
| **Tablet**  | 640px - 1024px | Two-column metadata (theme + tags), 2-up image grid                                       |
| **Desktop** | > 1024px       | Full layout as wireframed, 4-up image grid, side-by-side buttons                          |

#### Mobile-Specific Adaptations

```
┌─────────────────────────────┐
│ ← Edit MOC          Cancel │
├─────────────────────────────┤
│                             │
│ Title *                     │
│ ┌─────────────────────────┐ │
│ │ King Mearas Castle...   │ │
│ └─────────────────────────┘ │
│                             │
│ Description *               │
│ ┌─────────────────────────┐ │
│ │ A majestic medieval...  │ │
│ │                         │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ Theme                       │
│ ┌─────────────────────────┐ │
│ │ Castle              ▼   │ │
│ └─────────────────────────┘ │
│                             │
│ Tags                        │
│ [medieval ✕] [castle ✕]     │
│ [+ Add tag]                 │
│                             │
├─────────────────────────────┤
│ Instructions PDF *          │
│ ┌─────────────────────────┐ │
│ │ 📄 instructions.pdf     │ │
│ │ 2.4 MB                  │ │
│ │                         │ │
│ │ [Replace]    [Remove]   │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ Images (3/10)               │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ img1 │ │ img2 │ │ img3 │ │
│ │  ⭐  │ │      │ │      │ │
│ └──────┘ └──────┘ └──────┘ │
│        [+ Add Image]        │
│                             │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │    💾 Save Changes      │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │        Cancel           │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘

Mobile: Primary action (Save) is full-width at bottom
Sticky header with title and cancel
Touch targets minimum 48px
```

### 11.10 Success State

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  After successful save, redirect to MOC detail page with toast:     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ✓ Changes saved successfully                          [✕]  │   │
│  │  Your MOC "King Mearas Castle" has been updated.            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Toast: Green background, auto-dismiss after 5 seconds              │
│  Position: Bottom-right on desktop, bottom-center on mobile         │
│                                                                     │
│  Focus: Move to main content heading on MOC detail page             │
│  Screen reader: Announce "Changes saved successfully"               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.11 Design Token Usage

| Element            | Token                                  | Value             |
| ------------------ | -------------------------------------- | ----------------- |
| Primary button     | `bg-sky-600 hover:bg-sky-700`          | #0284c7 → #0369a1 |
| Destructive button | `bg-red-600 hover:bg-red-700`          | #dc2626 → #b91c1c |
| Secondary button   | `bg-gray-100 hover:bg-gray-200`        | #f3f4f6 → #e5e7eb |
| Form border        | `border-gray-300 focus:border-sky-500` | #d1d5db → #0ea5e9 |
| Error border/text  | `border-red-500 text-red-600`          | #ef4444 / #dc2626 |
| Success accent     | `bg-teal-500`                          | #14b8a6           |
| Card background    | `bg-white`                             | #ffffff           |
| Section dividers   | `border-gray-200`                      | #e5e7eb           |
| Skeleton animation | `bg-gray-200 animate-pulse`            | #e5e7eb           |

---

## 12. UX Review Summary

### Validated Patterns

✅ Form reuse strategy (upload → edit with mode prop)
✅ Non-destructive file removal (soft-delete until save)
✅ Consistent component library usage (@repo/ui)
✅ Accessibility requirements (WCAG AA)
✅ Session persistence for resilience

### Recommendations Added

| Area                   | Enhancement                                         |
| ---------------------- | --------------------------------------------------- |
| **Visual Hierarchy**   | Added "Last saved" timestamp for orientation        |
| **File States**        | Defined 6 distinct states with visual treatments    |
| **Error Recovery**     | Enhanced 429 handling with local save option        |
| **Micro-interactions** | Specified animations for polish                     |
| **Mobile**             | Defined responsive layout adaptations               |
| **Accessibility**      | Complete ARIA specifications and keyboard shortcuts |

### UX Decisions (Resolved)

| Question              | Decision                                                                             | Priority                           |
| --------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- |
| **Slug warning**      | Strong modal for published MOCs > 7 days; soft warning for < 7 days; none for drafts | MVP                                |
| **Auto-save**         | Yes, localStorage every 30s with "Draft saved locally" indicator                     | MVP                                |
| **Image reordering**  | Out of scope for MVP                                                                 | V1.1 backlog                       |
| **Bulk file removal** | Out of scope                                                                         | Backlog (revisit if user feedback) |

#### Decision Details

**1. Slug Warning Implementation**

Show contextual warning based on MOC publish status:

| MOC Status         | Warning Level             |
| ------------------ | ------------------------- |
| Draft/Private      | None                      |
| Published < 7 days | Soft inline warning       |
| Published > 7 days | Strong modal confirmation |

Strong warning modal content:

- Shows old URL → new URL
- Warns "The old URL will stop working immediately"
- Default action: "Keep Old URL" (safe)
- Future enhancement: Auto-redirect old slugs for 90 days (out of scope for MVP)

**2. Auto-save to localStorage**

- Debounced save every 30 seconds when form is dirty
- Subtle "Draft saved locally" indicator (not intrusive)
- On page load with recovered draft: Toast "We restored your unsaved changes from [time]"
- Clear draft on: successful save, explicit discard, or after 7 days

```typescript
// Implementation pattern
useEffect(() => {
  const timer = setTimeout(() => {
    if (isDirty) {
      saveToLocalStorage(formState)
      setLastAutoSaved(new Date())
    }
  }, 30000)
  return () => clearTimeout(timer)
}, [formState, isDirty])
```

**3. Image Reordering — V1.1 Scope**

Not essential for MVP because:

- First image = thumbnail covers most use cases
- Workaround: remove and re-add in desired order
- Low frequency of use after initial setup

If prioritized later: drag-drop with keyboard support (Arrow keys), touch long-press.

**4. Bulk Operations — Backlog**

Not needed for MVP because:

- Typical MOC has few files (1 PDF, 3-5 images, 1-2 parts lists)
- Removing individually takes ~10 seconds
- Bulk delete increases accidental deletion risk

Revisit if user feedback indicates pain point.

---

*UX specifications complete. Ready for implementation or design tool export (Figma prompts available via `*generate-ui-prompt`).\* 🎨
