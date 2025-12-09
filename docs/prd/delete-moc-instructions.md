# Delete MOC Instructions Product Requirements Document (PRD)

**Version:** 0.7
**Last Updated:** December 9, 2025
**Status:** Ready for Architect Review

| Version | Date        | Author    | Changes                                                                                                                                                                             |
| ------- | ----------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7     | Dec 9, 2025 | UX Expert | Added `/packages` reusable component architecture requirement                                                                                                                       |
| 0.6     | Dec 9, 2025 | UX Expert | UX enhancements: delete button placement, enhanced modal with stats, three-tier expiring soon treatment, mobile layout, toast content, deleted MOC detail view, expanded ARIA table |
| 0.5     | Dec 9, 2025 | PM        | Added Success Metrics, Target Users, Out of Scope sections                                                                                                                          |
| 0.1–0.4 | —           | —         | Initial drafts                                                                                                                                                                      |

## 1. Goals and Background Context

### Goals

- Enable registered users to delete their own MOC instruction packages
- Implement soft-delete pattern with configurable retention period before hard delete
- Maintain owner-only authorization: users can only delete their own uploads
- Provide clear confirmation UX to prevent accidental deletion
- Support undo/recovery within retention window
- Clean up associated S3 assets after retention period expires
- **Reuse extracted packages** from Edit PRD Epic 0: `@repo/rate-limit`, `@repo/upload-config`
- **Coordinate database migration** with Edit PRD Story 0.5 (shared `deletedAt` column)
- Conform to repo standards (React 19, Zod-first, @repo/ui, AWS serverless, @repo/logger, Tailwind, a11y)

### Background Context

With upload and edit capabilities in place, users need the ability to remove content they no longer want published. Without delete, users have no recourse for outdated, duplicate, or mistakenly uploaded content — creating clutter and potential embarrassment.

This enhancement adds owner-only delete with soft-delete pattern. Content is marked deleted immediately (hidden from all views) but retained for a configurable period (default 30 days) to allow recovery. After retention expires, a cleanup job permanently removes database records and S3 assets.

The delete feature is intentionally simple compared to upload/edit — a single confirmation action that triggers soft-delete. Complexity is deferred to the background cleanup job.

### Success Metrics

| Metric                  | Target                                                | Measurement                             |
| ----------------------- | ----------------------------------------------------- | --------------------------------------- |
| Delete adoption         | >5% of MOC owners use delete within 90 days of launch | Analytics event tracking                |
| Restore rate            | <10% of soft-deletes are restored                     | Database query (restored/deleted ratio) |
| Cleanup job reliability | >99% success rate                                     | CloudWatch metrics, DLQ depth           |
| Support tickets         | <5 delete-related tickets/month                       | Support system tagging                  |
| Operation latency       | Delete/restore ≤2s p95                                | API latency metrics                     |

### Target Users

Registered users who have uploaded at least one MOC instruction package and need to:

- Remove outdated or superseded instructions
- Delete duplicate uploads
- Remove content they no longer want publicly visible
- Recover accidentally deleted content within the retention window

**Dependency on Edit PRD**

This PRD depends on Edit PRD Epic 0 (Package Extraction) for:

- `@repo/rate-limit` — shared rate limiting across upload/edit/delete
- Database migration adding `deletedAt` column (Edit Story 0.5)

Delete should begin implementation AFTER Edit Epic 0 completes.

**Soft-Delete Design Decision**

Use `deletedAt` timestamp alone — do NOT change the `status` field:

- `deletedAt IS NOT NULL` indicates soft-deleted
- Original `status` preserved for seamless restore
- Simpler queries: `WHERE deleted_at IS NULL` vs status checks
- No need for `previousStatus` column

### Change Log

| Date       | Version | Description                                                                                                                                                                                                               | Author    |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2025-12-06 | 0.1     | Initial PRD draft (Goals, Requirements, Epics, Stories)                                                                                                                                                                   | PM Agent  |
| 2025-12-08 | 0.2     | Architecture review: simplified status handling (deletedAt only); added Edit PRD dependency; fixed route structure to TanStack Router; added S3 enumeration details; added related tables behavior; emphasized code reuse | Architect |
| 2025-12-08 | 0.3     | Added Drizzle ORM examples; added cascading delete with orphaned gallery image cleanup; clarified what gets deleted                                                                                                       | Architect |
| 2025-12-08 | 0.4     | Bricks preservation: mocParts (bricks) return to inventory pool; mocPartsLists (metadata) can cascade delete; added Story 1.1b for mocParts schema change; status column on mocParts not mocPartsLists                    | Architect |
| 2025-12-09 | 0.5     | PM checklist validation: added Success Metrics, Target Users, Out of Scope sections; renamed from brief to full PRD                                                                                                       | PM Agent  |

## 2. Requirements

### Functional Requirements (FR)

- FR1: Provide "Delete" action on MOC detail page and in "My Instructions" list (owner-only, conditionally rendered).
- FR2: Restrict delete to authenticated owner; non-owners receive 403; signed-out users redirect to sign-in.
- FR3: Delete action opens confirmation modal with MOC title and warning text.
- FR4: Confirmation requires explicit action (type MOC title or check confirmation box).
- FR5: DELETE endpoint marks MOC as soft-deleted: sets `deletedAt` timestamp only (status field unchanged for seamless restore).
- FR6: Soft-deleted MOCs immediately hidden from all views (owner's list, public gallery, search).
- FR7: Owner can view "Recently Deleted" list showing soft-deleted MOCs within retention period.
- FR8: Owner can restore soft-deleted MOC from "Recently Deleted" (clears `deletedAt`; original status already preserved).
- FR9: Retention period configurable via env (default 30 days); shown in UI.
- FR10: After retention expires, background job hard-deletes: removes DB records, S3 files, OpenSearch index.
- FR11: Hard-delete is irreversible; no recovery after retention period.
- FR12: API returns 404 for soft-deleted MOCs (no existence leak to non-owners).
- FR13: Owner accessing soft-deleted MOC detail sees "This MOC was deleted" with restore option.
- FR14: Delete operation logged with correlationId, ownerId, mocId.
- FR15: Rate limiting: delete operations share daily quota with upload/edit (prevent abuse).
- FR16: After successful delete, redirect to My Instructions with success toast.
- FR17: After successful restore, redirect to MOC detail with success toast.
- FR18: Cancel in confirmation modal returns to previous view without action.

### Non-Functional Requirements (NFR)

- NFR1: Adhere to repo standards (React 19, Zod-first, @repo/ui, @repo/logger, Tailwind, a11y-first, no barrel files).
- NFR2: Accessibility target WCAG AA; confirmation modal fully keyboard accessible.
- NFR3: **Code Reuse Mandate**: Import `@repo/rate-limit` from Edit Epic 0; use same S3 cleanup patterns as Edit Story 1.6.
- NFR4: Delete operation target ≤ 2s; restore operation target ≤ 2s.
- NFR5: Security: owner verification on all delete/restore operations; audit logging.
- NFR6: Observability: structured logs for delete, restore, and cleanup operations.
- NFR7: Testing: maintain ≥45% global coverage; unit/integration/E2E for delete flows.
- NFR8: Cleanup job runs daily; handles failures gracefully with retry logic.
- NFR9: S3 cleanup uses batch delete for efficiency (up to 1000 objects per request).

### Compatibility Requirements (CR)

- CR1: Existing MOC endpoints (GET, list) filter out soft-deleted records by default.
- CR2: Database schema adds `deletedAt` column (nullable timestamp) if not present.
- CR3: OpenSearch index updated to exclude soft-deleted MOCs from search.
- CR4: No breaking changes to existing upload/edit functionality.
- CR5: Soft-delete pattern compatible with future "archive" feature if needed.

### Out of Scope (Future Consideration)

The following features are explicitly NOT included in this PRD and may be considered for future enhancement:

- **Bulk delete**: Deleting multiple MOCs in a single operation
- **Admin/moderator delete**: Platform operators deleting user content (requires separate moderation PRD)
- **Public deletion requests**: GDPR-style "right to be forgotten" workflow
- **Permanent delete bypass**: Option to skip soft-delete and immediately hard-delete
- **Delete scheduling**: Schedule a MOC for future deletion
- **Delete notifications**: Email notifications when MOC is about to be permanently deleted
- **Archive feature**: Hiding MOC without triggering deletion countdown

## 3. User Interface Design Goals

### Integration with Existing UI

The delete feature adds minimal UI — a confirmation modal and a "Recently Deleted" section:

| Existing Pattern               | Delete Addition                                 |
| ------------------------------ | ----------------------------------------------- |
| MOC detail page actions        | Add "Delete" button (owner-only)                |
| My Instructions list item menu | Add "Delete" action                             |
| Dashboard sections             | Add "Recently Deleted" section (if items exist) |

**Shared Components (from `@repo/ui`):**

- AlertDialog for confirmation modal
- Button for actions
- Toast for success/error feedback
- Badge for "Deleted" status indicator

### ⚠️ IMPORTANT: Reusable Component Architecture

> **All delete-related components MUST live in `/packages` for cross-app reuse.**

The delete flow components built for this PRD will be reused across multiple delete flows throughout the application (e.g., delete collections, delete user accounts, delete comments, etc.). To ensure consistency and avoid duplication:

| Component                                | Package Location                        | Reuse Scope                      |
| ---------------------------------------- | --------------------------------------- | -------------------------------- |
| `DeleteConfirmationModal`                | `@repo/ui` or `@repo/delete-components` | All delete flows app-wide        |
| `RecentlyDeletedList`                    | `@repo/ui` or `@repo/delete-components` | Any soft-delete feature          |
| `ExpiringBadge`                          | `@repo/ui`                              | Any time-sensitive status        |
| `DeletedBanner`                          | `@repo/ui` or `@repo/delete-components` | Any deleted resource detail view |
| Delete hooks (`useDelete`, `useRestore`) | `@repo/delete-components`               | All delete flows                 |
| Delete Zod schemas                       | `@repo/delete-components`               | Shared validation                |

**Implementation Guidance:**

1. **DO NOT** create delete components in `apps/web/main-app/src/components/`
2. **DO** create a new `@repo/delete-components` package OR extend `@repo/ui`
3. Components must be generic (accept entity type, title, stats as props)
4. Hooks should be entity-agnostic (pass API endpoints as config)

This ensures future delete flows (collections, accounts, etc.) can import and use these components without reimplementation.

### New Screens and Views

| Screen                    | Type    | Description                                                           |
| ------------------------- | ------- | --------------------------------------------------------------------- |
| Delete Confirmation Modal | **New** | Warning text, MOC title, explicit confirmation, Cancel/Delete buttons |
| Recently Deleted Section  | **New** | List of soft-deleted MOCs with restore/days remaining                 |
| Deleted MOC Detail        | **New** | "This MOC was deleted" message with restore option                    |

### Delete Button Placement

```
┌─────────────────────────────────────────────────────────────────────┐
│ MOC DETAIL PAGE — ACTION BUTTON PLACEMENT                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  [← Back]                                                    │  │
│  │                                                              │  │
│  │  🏰 My Awesome Castle MOC                                    │  │
│  │  by @username                                                │  │
│  │                                                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │  ✏️ Edit  │  │  📤 Share │  │  📊 Stats │  │   ⋮ More   │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │  │
│  │                                                  │           │  │
│  │                                                  ▼           │  │
│  │                                           ┌──────────────┐  │  │
│  │                                           │ 🗑️ Delete     │  │  │
│  │                                           └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Delete is in "More" dropdown to prevent accidental clicks         │
│  Uses destructive color (red-600) text only, no fill               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Delete Confirmation Modal Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Delete MOC Instructions                               [✕]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Are you sure you want to delete:                                │
│                                                                 │
│   📄 "My Awesome Spaceship MOC"                                 │
│   143 views · 12 downloads · Uploaded Oct 15, 2025              │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  ℹ️ What happens next:                                       │ │
│ │                                                              │ │
│ │  • Immediately hidden from your gallery and search          │ │
│ │  • You have 30 days to change your mind                     │ │
│ │  • After 30 days, it's gone forever                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ☐ I understand this will hide my MOC                           │
│                                                                 │
│        ┌─────────────────┐    ┌───────────────────────┐        │
│        │     Cancel      │    │    🗑️ Delete MOC       │        │
│        └─────────────────┘    └───────────────────────┘        │
│           (secondary)            (destructive, disabled)        │
│                                                                 │
│  Focus: Cancel button (safe default)                            │
│  Keyboard: Escape → Cancel, Tab order: checkbox → Cancel → Delete
└─────────────────────────────────────────────────────────────────┘
```

### Delete Confirmation Modal (Mobile)

```
┌─────────────────────────────────┐
│ Delete MOC Instructions     [✕] │
├─────────────────────────────────┤
│                                 │
│ Are you sure you want to        │
│ delete:                         │
│                                 │
│ 📄 "My Awesome Spaceship MOC"   │
│ 143 views · 12 downloads        │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ • Hidden from gallery       │ │
│ │ • 30 days to restore        │ │
│ │ • Permanent after 30 days   │ │
│ └─────────────────────────────┘ │
│                                 │
│ ☐ I understand                  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │       🗑️ Delete MOC          │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │         Cancel              │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘

Mobile: Full-width buttons stacked
Delete button on TOP (primary action in thumb zone)
48px minimum touch targets
Bottom sheet style on small screens
```

### Recently Deleted Section Layout

```
┌─────────────────────────────────────────────────────┐
│ Recently Deleted                          [?] Help  │
├─────────────────────────────────────────────────────┤
│ These MOCs will be permanently deleted after the    │
│ shown number of days.                               │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📄 My Spaceship MOC          27 days remaining  │ │
│ │    Deleted Dec 4, 2025              [Restore]   │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📄 Castle Build v2            3 days remaining  │ │
│ │    Deleted Nov 3, 2025              [Restore]   │ │
│ │                               ⚠️ Expiring soon   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Expiring Soon Visual Treatment

Three-tier urgency system based on days remaining:

```
┌─────────────────────────────────────────────────────────────────┐
│ EXPIRING SOON VISUAL TREATMENT                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NORMAL (>7 days remaining):                                    │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 📄 My Spaceship MOC            27 days remaining   [Restore]│
│  │    Deleted Dec 4, 2025                                      │
│  └─────────────────────────────────────────────────────────────┘
│  Background: white, Text: gray-600, Restore: ghost button      │
│                                                                 │
│  WARNING (3-7 days remaining):                                  │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 📄 Castle Build v2              5 days remaining   [Restore]│
│  │    Deleted Nov 28, 2025         ⚠️ Expiring soon             │
│  └─────────────────────────────────────────────────────────────┘
│  Background: amber-50, Border-left: 4px amber-500              │
│  Badge: amber-100 bg, amber-700 text                           │
│                                                                 │
│  CRITICAL (<3 days remaining):                                  │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 📄 Old Prototype               1 day remaining    [Restore] │
│  │    Deleted Dec 1, 2025         🔴 Expires tomorrow!          │
│  └─────────────────────────────────────────────────────────────┘
│  Background: red-50, Border-left: 4px red-500                  │
│  Badge: red-100 bg, red-700 text                               │
│  Restore button: primary variant (not ghost) — draw attention  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deleted MOC Detail View (Owner Only)

When owner navigates to a deleted MOC via direct link:

```
┌─────────────────────────────────────────────────────────────────┐
│ DELETED MOC DETAIL VIEW                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  ⚠️ This MOC was deleted on December 4, 2025                 │ │
│ │                                                              │ │
│ │  It will be permanently deleted in 27 days.                  │ │
│ │                                                              │ │
│ │  ┌─────────────────┐                                        │ │
│ │  │    Restore      │                                        │ │
│ │  └─────────────────┘                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  (MOC preview content - read-only, dimmed)                │  │
│  │                                                           │  │
│  │  🏰 My Awesome Castle MOC                                 │  │
│  │  [Image gallery - 50% opacity]                            │  │
│  │  [Description - visible but muted]                        │  │
│  │                                                           │  │
│  │  Action buttons disabled:                                 │  │
│  │  [Edit ✗] [Share ✗] [Download - hidden]                   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Banner: amber-50 background, amber-700 text, amber-500 border  │
│  Content: 50% opacity overlay to indicate "deleted" state       │
│  Non-owner accessing this URL: 404 (no existence leak)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Toast Notifications

| Action          | Toast Content                                                    | Duration | Style           |
| --------------- | ---------------------------------------------------------------- | -------- | --------------- |
| Delete success  | ✅ "MOC deleted. You have 30 days to restore it." [View Deleted] | 6s       | Success (green) |
| Restore success | ✅ "MOC restored successfully!" [View MOC]                       | 5s       | Success (green) |
| Delete error    | ⚠️ "Couldn't delete MOC. Please try again." [Retry]              | Sticky   | Error (red)     |
| Restore error   | ⚠️ "Couldn't restore MOC. Please try again." [Retry]             | Sticky   | Error (red)     |

**Optional Enhancement — Inline Undo:**

For extra safety, show undo option immediately after delete:

```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ "My Spaceship MOC" deleted.                    [Undo] [✕]   │
│    You have 30 days to restore it from Recently Deleted.       │
└─────────────────────────────────────────────────────────────────┘

Undo: Available for 10 seconds, then toast auto-dismisses
Undo action: Immediately calls restore endpoint
Nice-to-have for V1.1 — not required for MVP
```

### UI Consistency Requirements

- Visual Design: Use AlertDialog from @repo/ui; destructive button variant for delete
- Confirmation Pattern: Checkbox confirmation (simpler than typing title for MVP)
- Warning Colors: Use destructive/warning color tokens consistently
- Loading States: Disable buttons during delete/restore operations
- Error States: Toast with retry option on failure
- Accessibility: Focus trap in modal; ESC to cancel; Enter to confirm (when enabled)

### Target Platforms

- Web Responsive (desktop-first, mobile-friendly)
- Keyboard fully operable (Tab, Enter, ESC)
- Touch-friendly buttons (44px minimum touch targets)

## 4. Technical Constraints and Integration Requirements

### Database Changes

**⚠️ DEPENDENCY: Edit PRD Story 0.5 adds `deleted_at` column to `moc_instructions` table.**

This PRD does NOT create a separate migration — it uses the column added by Edit Story 0.5:

```sql
-- Added by Edit Story 0.5 (NOT duplicated here)
ALTER TABLE moc_instructions
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX idx_moc_instructions_deleted_at
ON moc_instructions (deleted_at)
WHERE deleted_at IS NOT NULL;
```

**Query Changes (Drizzle ORM):**

```typescript
import { isNull, isNotNull, eq, and, lt, sql } from 'drizzle-orm'
import { mocInstructions, mocFiles, mocGalleryImages, galleryImages } from '@/core/database/schema'

// Filter active MOCs (not deleted)
const activeMocs = await db.select().from(mocInstructions).where(isNull(mocInstructions.deletedAt))

// Recently deleted (owner's soft-deleted MOCs)
const deletedMocs = await db
  .select()
  .from(mocInstructions)
  .where(and(isNotNull(mocInstructions.deletedAt), eq(mocInstructions.userId, userId)))

// Expired MOCs ready for hard-delete
const expiredMocs = await db
  .select()
  .from(mocInstructions)
  .where(lt(mocInstructions.deletedAt, sql`NOW() - INTERVAL '${retentionDays} days'`))
```

**Related Tables Behavior:**

| Table              | Soft-Delete     | Hard-Delete        | Notes                           |
| ------------------ | --------------- | ------------------ | ------------------------------- |
| `mocInstructions`  | Set `deletedAt` | DELETE row         | Triggers cascades               |
| `mocFiles`         | Unchanged       | CASCADE            | Automatic via FK                |
| `mocPartsLists`    | Unchanged       | CASCADE            | Metadata deleted with MOC       |
| `mocParts`         | Unchanged       | **Preserved**      | Bricks return to available pool |
| `mocGalleryImages` | Unchanged       | CASCADE            | Join table, automatic           |
| `galleryImages`    | Unchanged       | **Orphan cleanup** | Delete if no other MOC links    |
| `uploadSessions`   | Unchanged       | Clear FK first     | Set `mocInstructionId = NULL`   |

**Parts/Bricks Preservation (Important):**

Parts lists are metadata (can be deleted), but **parts/bricks are inventory** that persist. When a MOC is deleted:

- `mocPartsLists` ARE deleted (metadata about what the MOC needs)
- `mocParts` (individual bricks) are NOT deleted — they return to the user's available pool
- Parts are disassociated from their parts list before deletion

```typescript
// Before deleting MOC: preserve bricks by disassociating from parts lists
await db
  .update(mocParts)
  .set({
    partsListId: null,
    status: 'available', // Return to inventory pool
  })
  .where(
    inArray(
      mocParts.partsListId,
      db.select({ id: mocPartsLists.id }).from(mocPartsLists).where(eq(mocPartsLists.mocId, mocId)),
    ),
  )

// Now safe to delete MOC — parts lists cascade, but parts are preserved
```

**Schema Change Required:**

- `mocParts.partsListId` FK must be nullable (currently NOT NULL with CASCADE)
- Add `status` column to `mocParts`: `'allocated' | 'available'`
- Change CASCADE to SET NULL on `mocParts.partsListId` FK

**Orphaned Gallery Images Cleanup:**

When a MOC is hard-deleted, gallery images that are no longer linked to ANY MOC must also be deleted:

```typescript
// Find gallery images that will become orphaned after this MOC deletion
const orphanedImages = await db
  .select({ id: galleryImages.id, imageUrl: galleryImages.imageUrl })
  .from(galleryImages)
  .innerJoin(mocGalleryImages, eq(galleryImages.id, mocGalleryImages.galleryImageId))
  .where(eq(mocGalleryImages.mocId, mocId))
  .groupBy(galleryImages.id)
  .having(sql`COUNT(DISTINCT ${mocGalleryImages.mocId}) = 1`)

// After MOC deletion (which cascades mocGalleryImages), delete orphaned images
for (const image of orphanedImages) {
  await deleteS3File(image.imageUrl)
  await db.delete(galleryImages).where(eq(galleryImages.id, image.id))
}
```

**Note:** During soft-delete, all related records remain intact for restoration. On hard-delete, CASCADE handles most cleanup; orphaned gallery images require explicit cleanup.

### API Integration

| Endpoint               | Method | Purpose                                    |
| ---------------------- | ------ | ------------------------------------------ |
| `/mocs/:mocId`         | DELETE | Soft-delete MOC (set deletedAt)            |
| `/mocs/:mocId/restore` | POST   | Restore soft-deleted MOC (clear deletedAt) |
| `/mocs/deleted`        | GET    | List owner's soft-deleted MOCs             |

**Response Codes:**

- 200: Success (delete/restore)
- 401: Unauthenticated
- 403: Not owner
- 404: Not found (or already hard-deleted)
- 410: Gone (already soft-deleted, for idempotency info)
- 429: Rate limited

### Background Cleanup Job

**Implementation:**

- Runs daily via CloudWatch Events → Lambda
- Queries MOCs where `deleted_at < NOW() - retention_period`
- For each expired MOC, performs cascading cleanup (see below)
- Logs each hard-delete with correlationId
- Handles partial failures with DLQ for retry

**Cleanup Implementation (Drizzle ORM):**

```typescript
import { eq, lt, sql, isNull } from 'drizzle-orm'
import {
  mocInstructions,
  mocFiles,
  mocGalleryImages,
  galleryImages,
  uploadSessions,
} from '@/core/database/schema'

async function hardDeleteMoc(mocId: string) {
  // 1. Get all S3 files to delete
  const mocRecord = await db
    .select({ thumbnailUrl: mocInstructions.thumbnailUrl })
    .from(mocInstructions)
    .where(eq(mocInstructions.id, mocId))
    .limit(1)

  const files = await db
    .select({ fileUrl: mocFiles.fileUrl })
    .from(mocFiles)
    .where(eq(mocFiles.mocId, mocId))

  // 2. Find gallery images that will become orphaned
  const orphanedImages = await db
    .select({
      id: galleryImages.id,
      imageUrl: galleryImages.imageUrl,
      thumbnailUrl: galleryImages.thumbnailUrl,
    })
    .from(galleryImages)
    .innerJoin(mocGalleryImages, eq(galleryImages.id, mocGalleryImages.galleryImageId))
    .where(eq(mocGalleryImages.mocId, mocId))
    .groupBy(galleryImages.id)
    .having(sql`COUNT(DISTINCT ${mocGalleryImages.mocId}) = 1`)

  // 3. Collect all S3 keys (NOT including parts list files - those are preserved)
  const s3Keys: string[] = [
    ...files.map(f => extractS3Key(f.fileUrl)),
    ...orphanedImages.flatMap(img =>
      [extractS3Key(img.imageUrl), img.thumbnailUrl ? extractS3Key(img.thumbnailUrl) : null].filter(
        Boolean,
      ),
    ),
    mocRecord[0]?.thumbnailUrl ? extractS3Key(mocRecord[0].thumbnailUrl) : null,
  ].filter(Boolean)

  // 4. Delete S3 files (batch, up to 1000)
  await deleteS3FilesBatch(s3Keys)

  // 5. PRESERVE BRICKS: Disassociate parts from their parts lists (return to pool)
  await db
    .update(mocParts)
    .set({
      partsListId: null,
      status: 'available', // Return to inventory pool
    })
    .where(
      inArray(
        mocParts.partsListId,
        db
          .select({ id: mocPartsLists.id })
          .from(mocPartsLists)
          .where(eq(mocPartsLists.mocId, mocId)),
      ),
    )
  // Parts lists will CASCADE delete, but bricks are now preserved

  // 6. Clear upload session FK references
  await db
    .update(uploadSessions)
    .set({ mocInstructionId: null })
    .where(eq(uploadSessions.mocInstructionId, mocId))

  // 7. Delete orphaned gallery images
  for (const img of orphanedImages) {
    await db.delete(galleryImages).where(eq(galleryImages.id, img.id))
  }

  // 8. Delete MOC (CASCADE handles mocFiles, mocPartsLists, mocGalleryImages)
  await db.delete(mocInstructions).where(eq(mocInstructions.id, mocId))
}
```

**Cleanup Order (critical):**

1. Query all data needed BEFORE any deletions
2. Delete S3 files (external, can fail independently)
3. Disassociate `mocParts` from parts lists (set `partsListId = NULL`, `status = 'available'`)
4. Clear `uploadSessions.mocInstructionId` FK
5. Delete orphaned `galleryImages` records
6. DELETE `mocInstructions` (CASCADE handles mocFiles, mocPartsLists, mocGalleryImages)

**What Gets Deleted:**

- ✅ `mocInstructions` record
- ✅ `mocFiles` (CASCADE) — instruction PDFs
- ✅ `mocPartsLists` (CASCADE) — parts list metadata
- ✅ `mocGalleryImages` (CASCADE) — join table entries
- ✅ `galleryImages` — **only if orphaned** (no other MOC links)
- ✅ S3 files — instruction files, thumbnails, orphaned images

**What Gets PRESERVED (returned to inventory pool):**

- ✅ `mocParts` — individual bricks, disassociated, marked `status = 'available'`

**Configuration:**

```
DELETE_RETENTION_DAYS=30        # Days before hard delete
DELETE_CLEANUP_BATCH_SIZE=100   # MOCs per job run
DELETE_CLEANUP_DLQ_RETRIES=3    # Retry attempts before alerting
```

### Code Organization

**File Structure:**

```
apps/web/main-app/src/
  routes/dashboard/
    recently-deleted.tsx          # Recently deleted page (TanStack Router)
  components/DeleteMoc/
    DeleteConfirmationModal.tsx   # Confirmation dialog (uses @repo/ui AlertDialog)
    RecentlyDeletedList.tsx       # Deleted items list
    DeletedMocBanner.tsx          # Banner for deleted MOC detail

apps/api/endpoints/moc-instructions/
  delete/
    handler.ts                    # DELETE soft-delete
  restore/
    handler.ts                    # POST restore
  list-deleted/
    handler.ts                    # GET deleted list

apps/api/jobs/
  moc-cleanup/
    handler.ts                    # Scheduled cleanup job (CloudWatch Events trigger)
    cleanup-service.ts            # Cleanup business logic
```

**Code Reuse:**

- `DeleteConfirmationModal` uses `AlertDialog` from `@repo/ui`
- Rate limiting uses `@repo/rate-limit` (from Edit Epic 0)
- S3 batch delete pattern reused from Edit Story 1.6 cleanup job
- Structured logging follows existing patterns from upload/edit

### Risk Assessment

| Risk                                | Impact | Likelihood | Mitigation                                               |
| ----------------------------------- | ------ | ---------- | -------------------------------------------------------- |
| Accidental deletion                 | High   | Medium     | Confirmation modal with checkbox; 30-day recovery window |
| Cleanup job failure                 | Medium | Low        | DLQ for failed items; manual recovery possible           |
| Orphaned S3 files                   | Low    | Low        | Cleanup job handles; existing orphan cleanup as backup   |
| Race condition (delete during edit) | Low    | Low        | Edit checks `deleted_at`; returns 404 if deleted         |

## 5. Epic List

- **Epic 1**: Backend Delete Pipeline — Soft-delete endpoint, restore endpoint, deleted list, cleanup job (depends on Edit Epic 0)
- **Epic 2**: Delete UX & Frontend — Confirmation modal, Recently Deleted section, restore flow

**Dependency Graph:**

```
Edit PRD Epic 0 (Package Extraction)
    │
    ├──► Edit PRD Epic 1 & 2
    │
    └──► Delete PRD Epic 1 ──► Delete PRD Epic 2
              │
              └── Uses: @repo/rate-limit, deletedAt column from Story 0.5
```

## 6. Epic 1 Details: Backend Delete Pipeline

**Epic Goal**: Implement secure, owner-only soft-delete with retention-based hard-delete cleanup.

### Story 1.1: Database Schema for Soft Delete

**⚠️ DEPENDENCY: This story is satisfied by Edit PRD Story 0.5. No separate migration needed.**

As a developer, I want the database schema to support soft-delete, so that MOCs can be marked deleted without immediate removal.

**Acceptance Criteria:**

1. ~~Add `deleted_at` column to `moc_instructions` table~~ — Done by Edit Story 0.5
2. ~~Create index on `deleted_at` for efficient filtering~~ — Done by Edit Story 0.5
3. Verify Edit Story 0.5 migration is deployed before Delete feature development
4. Update existing MOC list/get queries to filter `WHERE deleted_at IS NULL`
5. Zod schemas updated to include `deletedAt` field (optional, nullable)

**Note:** Delete implementation should begin after Edit Epic 0 completes.

### Story 1.1b: Schema Change for Bricks Preservation

As a developer, I want the parts/bricks schema updated to support disassociation from parts lists, so that bricks return to inventory when MOCs are deleted.

**Acceptance Criteria:**

1. Make `mocParts.partsListId` FK nullable (currently NOT NULL with CASCADE)
2. Change CASCADE to SET NULL on `mocParts.partsListId` FK
3. Add `status` column to `mocParts`: `text('status').default('allocated')`
4. Status values: `'allocated'` (assigned to a parts list) | `'available'` (in inventory pool)
5. Update Drizzle schema to reflect changes
6. Migration is backward-compatible (existing records keep `status = 'allocated'`)
7. Update queries to filter available bricks for inventory views

**Schema Migration:**

```typescript
// Drizzle schema update
export const mocParts = pgTable('moc_parts', {
  // ... existing fields ...
  partsListId: uuid('parts_list_id').references(() => mocPartsLists.id, {
    onDelete: 'set null', // Changed from CASCADE
  }), // Now nullable
  status: text('status').notNull().default('allocated'),
  // 'allocated' = assigned to a parts list/MOC
  // 'available' = in user's inventory pool, ready for reuse
  // ...
})
```

**Note:** Parts lists (`mocPartsLists`) still CASCADE delete with MOCs — they're just metadata. Individual bricks (`mocParts`) are inventory and persist.

### Story 1.2: DELETE Endpoint (Soft Delete)

As an owner, I want to delete my MOC, so that it's hidden from all views.

**Acceptance Criteria:**

1. DELETE `/mocs/:mocId` sets `deleted_at = NOW()` (status field unchanged)
2. Returns 401 for unauthenticated requests
3. Returns 403 for non-owners
4. Returns 404 for non-existent MOCs
5. Returns 200 with deletion confirmation: `{ deletedAt, daysUntilPermanent }`
6. Idempotent: re-deleting already-deleted MOC returns 200 with existing `deletedAt`
7. Removes from OpenSearch index immediately (synchronous, fail-open with warning)
8. Logs deletion with correlationId, ownerId, mocId
9. Rate-limited via `@repo/rate-limit` (shared quota with upload/edit)

### Story 1.3: Restore Endpoint

As an owner, I want to restore a deleted MOC, so that I can recover from accidental deletion.

**Acceptance Criteria:**

1. POST `/mocs/:mocId/restore` clears `deleted_at` (sets to NULL)
2. Original `status` already preserved — no status change needed
3. Returns 401/403/404 appropriately
4. Returns 404 if MOC was hard-deleted (past retention period)
5. Returns 409 if MOC is not currently soft-deleted
6. Returns 200 with restored MOC data
7. Re-indexes in OpenSearch (synchronous, fail-open with warning)
8. Logs restoration with correlationId, ownerId, mocId
9. Rate-limited via `@repo/rate-limit` (shared quota)

### Story 1.4: List Deleted Endpoint

As an owner, I want to see my recently deleted MOCs, so that I can decide what to restore.

**Acceptance Criteria:**

1. GET `/mocs/deleted` returns owner's soft-deleted MOCs
2. Includes: mocId, title, deletedAt, daysRemaining, thumbnailUrl
3. Ordered by deletedAt descending (most recent first)
4. Paginated (default 20 per page)
5. Returns empty array if no deleted MOCs
6. Only returns MOCs within retention period

### Story 1.5: Cleanup Job

As a platform operator, I want expired MOCs permanently removed, so that storage is reclaimed and data retention policies are met.

**Acceptance Criteria:**

1. CloudWatch Events triggers Lambda daily at low-traffic hour (e.g., 3 AM UTC)
2. Queries MOCs where `deleted_at < NOW() - retention_period` using Drizzle ORM
3. For each expired MOC:
   - **DELETE**: `mocInstructions`, `mocFiles` (CASCADE), `mocPartsLists` (CASCADE), `mocGalleryImages` (CASCADE)
   - **DELETE**: `galleryImages` — only if orphaned (no other MOC links)
   - **DELETE**: S3 files for instructions, thumbnails, orphaned images
   - **PRESERVE**: `mocParts` — disassociate from parts lists, mark `status = 'available'`
4. Orphaned gallery images identified using GROUP BY/HAVING query before deletion
5. Bricks disassociated from parts lists BEFORE MOC deletion (order critical)
6. Processes in batches (configurable, default 100 MOCs per run)
7. Logs each hard-delete operation with correlationId
8. Failed items sent to DLQ for retry (max 3 retries)
9. Metrics: items processed, items failed, S3 files deleted, images orphaned, bricks returned, duration
10. Alert on: >10% failure rate, DLQ depth > 50

**Technical Notes:**

- All queries use Drizzle ORM (no raw SQL)
- Orphaned image query: `HAVING COUNT(DISTINCT moc_id) = 1`
- Bricks preservation requires schema change: `mocParts.partsListId` must be nullable (Story 1.1b)
- Reuse S3 batch delete pattern from Edit Story 1.6
- S3 failures should not block DB deletion (log warning, continue)
- DB transaction per MOC (not per batch) for isolation
- Query all data BEFORE any deletions (order critical)

### Story 1.6: Delete Rate Limiting & Observability

As a platform operator, I want delete operations logged and rate-limited, so that I can monitor and prevent abuse.

**Acceptance Criteria:**

1. Delete/restore share daily quota with upload/edit
2. Structured logs: `moc.delete`, `moc.restore`, `moc.cleanup`
3. Logs include correlationId, ownerId, mocId
4. 429 response includes `retryAfterSeconds`
5. Cleanup job logs summary metrics

## 7. Epic 2 Details: Delete UX & Frontend

**Epic Goal**: Build accessible confirmation and recovery UI for delete operations.

### Story 2.1: Delete Entry Points

As an owner, I want Delete buttons on my MOC detail page and My Instructions list, so that I can initiate deletion.

**Acceptance Criteria:**

1. "Delete" button on MOC detail page (owner-only, destructive variant)
2. "Delete" action in My Instructions list item menu
3. Both open DeleteConfirmationModal
4. Non-owners see no delete option
5. Unauthenticated users don't see delete option

### Story 2.2: Delete Confirmation Modal

As an owner, I want to confirm deletion explicitly, so that I don't accidentally delete my MOC.

**Acceptance Criteria:**

1. Modal shows MOC title and warning text
2. Checkbox "I understand this will hide my MOC" required
3. "Delete MOC" button disabled until checkbox checked
4. Cancel closes modal without action
5. Delete triggers API call with loading state
6. On success: close modal, redirect to My Instructions, show success toast
7. On error: show error toast with retry option

**⚠️ Package Requirement:**

- `DeleteConfirmationModal` MUST be created in `/packages` (either `@repo/ui` or new `@repo/delete-components`)
- Component must be generic: accept `entityType`, `title`, `stats`, `onDelete`, `onCancel` as props
- See §3 "Reusable Component Architecture" for full component list

### Story 2.3: Recently Deleted Section

As an owner, I want to see my recently deleted MOCs, so that I can restore them if needed.

**Acceptance Criteria:**

1. "Recently Deleted" section in Dashboard (hidden if empty)
2. Shows list of soft-deleted MOCs with: title, deleted date, days remaining
3. Visual warning for items expiring soon (< 7 days)
4. "Restore" button for each item
5. Link to full "Recently Deleted" page if > 3 items
6. Empty state: "No recently deleted MOCs"

**⚠️ Package Requirement:**

- `RecentlyDeletedList` and `ExpiringBadge` MUST be created in `/packages`
- Components must be generic: accept `items[]` with `entityType`, `title`, `deletedAt`, `onRestore`
- Three-tier expiring treatment (normal/warning/critical) must be configurable via props

### Story 2.4: Restore Flow

As an owner, I want to restore a deleted MOC, so that it's visible again.

**Acceptance Criteria:**

1. "Restore" button triggers API call with loading state
2. On success: remove from deleted list, show success toast with link to MOC
3. On error: show error toast with retry option
4. Restored MOC appears in My Instructions list
5. Restored MOC detail page accessible

### Story 2.5: Deleted MOC Detail View

As an owner accessing a deleted MOC, I want to see it's deleted and have the option to restore, so that I can recover it if I have the direct link.

**Acceptance Criteria:**

1. Owner accessing deleted MOC sees banner: "This MOC was deleted on [date]"
2. Banner shows days remaining before permanent deletion
3. "Restore" button in banner
4. Non-owner accessing deleted MOC gets 404
5. Content preview still visible to owner (read-only)

### Story 2.6: Accessibility & Polish

As a user with accessibility needs, I want the delete flow to be fully accessible, so that I can manage my MOCs using assistive technology.

**Acceptance Criteria:**

1. Confirmation modal has focus trap
2. ESC key closes modal
3. Tab order: checkbox → Cancel → Delete
4. Delete button announces disabled state
5. Success/error toasts announced by screen reader
6. Recently Deleted list navigable by keyboard

**ARIA Accessibility Requirements:**

| Element               | ARIA Attributes                                                                                             | Notes                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| Delete button         | `aria-label="Delete MOC: [title]"`                                                                          | Clear action target        |
| Confirmation modal    | `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`, `aria-describedby="modal-desc"` | Semantic dialog            |
| Confirmation checkbox | `aria-describedby="delete-warning"`                                                                         | Links to warning text      |
| Delete submit button  | `aria-disabled="true"` (when unchecked)                                                                     | Announces disabled state   |
| Expiring soon badge   | `role="status"`, `aria-live="polite"`                                                                       | Screen reader announces    |
| Critical expiry badge | `role="alert"`, `aria-live="assertive"`                                                                     | Urgent announcement        |
| Restore button        | `aria-label="Restore MOC: [title]"`                                                                         | Clear action target        |
| Deleted banner        | `role="alert"`, `aria-live="polite"`                                                                        | Announces state            |
| Recently Deleted list | `role="list"`, items have `role="listitem"`                                                                 | Semantic structure         |
| Toast notification    | `role="status"`, `aria-live="polite"`                                                                       | Non-intrusive announcement |
| Error toast           | `role="alert"`, `aria-live="assertive"`                                                                     | Urgent error               |

**Keyboard Navigation:**

| Context               | Key          | Action                                       |
| --------------------- | ------------ | -------------------------------------------- |
| Modal open            | `Escape`     | Close modal, return focus to trigger         |
| Modal open            | `Tab`        | Cycle: checkbox → Cancel → Delete → checkbox |
| Modal open            | `Shift+Tab`  | Reverse tab order                            |
| Modal open            | `Enter`      | Activate focused button                      |
| Modal open            | `Space`      | Toggle checkbox                              |
| Recently Deleted list | `Arrow Down` | Next item                                    |
| Recently Deleted list | `Arrow Up`   | Previous item                                |
| Recently Deleted list | `Enter`      | Activate Restore for focused item            |

## 8. Next Steps

### Architect Prompt

Validate the delete pipeline design, database schema changes, and cleanup job architecture.

Deliverables:

1. Confirm `deleted_at` column addition is sufficient (vs. separate status table)
2. Validate cleanup job architecture (Lambda + CloudWatch Events)
3. Review S3 batch delete approach for efficiency
4. Confirm cascade delete behavior for related tables (mocFiles, etc.)
5. Specify DLQ handling and retry strategy for failed cleanups
6. Review rate limiting integration (shared quota with upload/edit)

Constraints: No breaking changes; soft-delete must be reversible within retention; cleanup must be reliable.

### UX Expert Prompt

Validate the delete confirmation UX and Recently Deleted section design.

Deliverables:

1. Review confirmation modal pattern (checkbox vs. type title)
2. Validate warning text is clear but not alarming
3. Design Recently Deleted section placement in Dashboard
4. Specify "expiring soon" visual treatment
5. Accessibility review of modal focus management

Constraints: Use @repo/ui AlertDialog; follow existing destructive action patterns; WCAG AA compliance.

## 9. Checklist Results Report

### UX Expert Review — December 9, 2025

| Aspect               | Rating  | Notes                                            |
| -------------------- | ------- | ------------------------------------------------ |
| Confirmation Pattern | ✅ PASS | Checkbox confirmation appropriate for risk level |
| Recovery UX          | ✅ PASS | 30-day window with visible countdown             |
| Accessibility        | ✅ PASS | WCAG AA target, comprehensive ARIA table added   |
| Visual Hierarchy     | ✅ PASS | Three-tier expiring soon treatment defined       |
| Error Recovery       | ✅ PASS | Toast retry patterns specified                   |
| Mobile UX            | ✅ PASS | Mobile modal layout added                        |

**Enhancements Applied (v0.6):**

1. ✅ Added delete button placement wireframe (in "More" dropdown)
2. ✅ Enhanced confirmation modal with MOC stats (views, downloads, upload date)
3. ✅ Defined three-tier expiring soon visual treatment (normal/warning/critical)
4. ✅ Added mobile modal layout with thumb-zone optimization
5. ✅ Specified success/error toast content table
6. ✅ Added deleted MOC detail view wireframe
7. ✅ Expanded ARIA accessibility table in Story 2.6
8. ✅ Added inline undo pattern as optional V1.1 enhancement

**Status:** ✅ Ready for Architect Review
