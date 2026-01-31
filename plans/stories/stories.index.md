# Vercel Migration Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 17 |
| generated | 1 |
| in-elaboration | 2 |
| in-progress | 0 |
| pending | 5 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

(None - all unblocked stories have been generated and are in elaboration or later phases)

**Waiting on STORY-01711:**
- STORY-01721
- STORY-018

**Waiting on STORY-01711:**
- STORY-01721
- STORY-01725

**Waiting on STORY-01721:**
- STORY-01722
- STORY-01723
- STORY-01724

**Waiting on STORY-01722:**
- STORY-01723

**Waiting on STORY-01725:**
- STORY-01726
- STORY-018

**Waiting on STORY-01726:**
- STORY-01727

**Waiting on STORY-019 + STORY-01721:**
- STORY-01724

---

## STORY-001: Health Check & Config
**Status:** completed
**Feature:** System Health & Upload Configuration
**Endpoints:**
- `health/handler.ts`
- `config/upload/handler.ts`

**Vercel Infrastructure:**
- 2 serverless functions (health, config-upload)
- No auth required for health endpoint
- Basic env vars for upload config

**Goal:** Establish baseline monitoring and upload configuration endpoints

**Risk Notes:** Minimal risk - no auth, no database, no external services

---

## STORY-002: Sets - Read Operations
**Status:** completed
**Feature:** Sets Gallery - Read
**Endpoints:**
- `sets/get/handler.ts`
- `sets/list/handler.ts`

**Vercel Infrastructure:**
- 2 serverless functions (sets-get, sets-list)
- Cognito auth middleware
- PostgreSQL connection
- Env vars: DB connection, Cognito config

**Goal:** Enable read-only access to LEGO sets catalog

**Risk Notes:** Auth required, DB reads, no writes, no S3

---

## STORY-003: Sets - Write Operations (No Images)
**Status:** completed
**Feature:** Sets Gallery - Create
**Endpoints:**
- `sets/create/handler.ts`

**Vercel Infrastructure:**
- 1 serverless function (sets-create)
- Cognito auth middleware
- PostgreSQL connection
- Env vars: DB connection, Cognito config

**Goal:** Enable creation of set records without image uploads

**Risk Notes:** Auth required, DB writes, no file uploads yet

---

## STORY-004: Wishlist - Read Operations
**Status:** completed
**Feature:** Wishlist Gallery - Read
**Endpoints:**
- `wishlist/get-item/handler.ts`
- `wishlist/list/handler.ts`
- `wishlist/search/handler.ts`

**Vercel Infrastructure:**
- 3 serverless functions (wishlist-get, wishlist-list, wishlist-search)
- Cognito auth middleware
- PostgreSQL + OpenSearch (for search)
- Env vars: DB connection, Cognito config, OpenSearch endpoint

**Goal:** Enable read access to user wishlists with search capability

**Risk Notes:** Auth required, DB + OpenSearch reads, no writes

---

## STORY-005: Wishlist - Write Operations (No Images)
**Status:** completed
**Feature:** Wishlist Gallery - Mutations
**Endpoints:**
- `wishlist/create-item/handler.ts`
- `wishlist/update-item/handler.ts`
- `wishlist/delete-item/handler.ts`
- `wishlist/reorder/handler.ts`

**Vercel Infrastructure:**
- 4 serverless functions (wishlist-create, update, delete, reorder)
- Cognito auth middleware
- PostgreSQL connection
- Env vars: DB connection, Cognito config

**Goal:** Enable CRUD operations on wishlist items without image uploads

**Risk Notes:** Auth required, DB writes, no file uploads yet

---

## STORY-006: Gallery - Albums
**Status:** completed
**Feature:** Inspiration Gallery - Album Management
**Endpoints:**
- `gallery/create-album/handler.ts`
- `gallery/get-album/handler.ts`
- `gallery/list-albums/handler.ts`
- `gallery/update-album/handler.ts`
- `gallery/delete-album/handler.ts`

**Vercel Infrastructure:**
- 5 serverless functions (gallery-album-*)
- Cognito auth middleware
- PostgreSQL connection
- Env vars: DB connection, Cognito config

**Goal:** Enable full CRUD for inspiration image albums

**Risk Notes:** Auth required, DB writes, album hierarchy support needed

---

## STORY-007: Gallery - Images Read
**Status:** completed
**Depends On:** none
**Feature:** Inspiration Gallery - Image Browsing
**Endpoints:**
- `gallery/get-image/handler.ts`
- `gallery/list-images/handler.ts`
- `gallery/search-images/handler.ts`
- `gallery/flag-image/handler.ts`

**Vercel Infrastructure:**
- 4 serverless functions (gallery-image-get, list, search, flag)
- Cognito auth middleware
- PostgreSQL + OpenSearch (for search)
- S3 for image URLs (read-only)
- Env vars: DB connection, Cognito config, OpenSearch endpoint, S3 bucket

**Goal:** Enable browsing, searching, and flagging of inspiration images

**Risk Notes:** Auth required, DB + OpenSearch reads, S3 URL generation

---

## STORY-008: Gallery - Images Write (No Upload)
**Status:** completed
**Depends On:** none
**Feature:** Inspiration Gallery - Image Metadata
**Endpoints:**
- `gallery/update-image/handler.ts`
- `gallery/delete-image/handler.ts`

**Vercel Infrastructure:**
- 2 serverless functions (gallery-image-update, delete)
- Cognito auth middleware
- PostgreSQL connection
- S3 for deletion (if hard delete)
- Env vars: DB connection, Cognito config, S3 bucket

**Goal:** Enable image metadata updates and deletion without upload handling

**Risk Notes:** Auth required, DB writes, S3 deletion coordination

---

## STORY-009: Image Uploads - Phase 1 (Simple Presign Pattern)
**Status:** completed
**Depends On:** none
**Feature:** Image Uploads - Sets, Wishlist, Gallery
**Endpoints:**
- `sets/images/presign/handler.ts`
- `sets/images/register/handler.ts`
- `sets/images/delete/handler.ts`
- `wishlist/upload-image/handler.ts`
- `gallery/upload-image/handler.ts`

**Vercel Infrastructure:**
- 5 serverless functions (sets-images-*, wishlist-upload-image, gallery-upload-image)
- Cognito auth middleware
- PostgreSQL connection
- S3 presigned URL generation
- S3 upload/delete permissions
- Env vars: DB connection, Cognito config, S3 bucket, S3 region, upload limits

**Goal:** Migrate all simple single-file image uploads using presign/register pattern

**Risk Notes:** Auth required, S3 presigned URLs, file size limits, CORS config, content-type validation

---

## STORY-010: MOC Parts Lists
**Status:** completed
**Depends On:** none
**Feature:** MOC Parts Lists Management
**Endpoints:**
- `moc-parts-lists/create/handler.ts`
- `moc-parts-lists/get/handler.ts`
- `moc-parts-lists/get-user-summary/handler.ts`
- `moc-parts-lists/update/handler.ts`
- `moc-parts-lists/update-status/handler.ts`
- `moc-parts-lists/delete/handler.ts`
- `moc-parts-lists/parse/handler.ts`

**Vercel Infrastructure:**
- 7 serverless functions (moc-parts-lists-*)
- Cognito auth middleware
- PostgreSQL connection
- CSV/XML parsing logic
- Env vars: DB connection, Cognito config, parsing limits

**Goal:** Enable CRUD operations and parsing for MOC parts lists

**Risk Notes:** Auth required, DB writes, file parsing (CSV/XML), validation logic, memory limits for large files

---

## STORY-011: MOC Instructions - Read Operations
**Status:** completed
**Depends On:** none
**Feature:** MOC Instructions Gallery - Read
**Endpoints:**
- `moc-instructions/get/handler.ts`
- `moc-instructions/list/handler.ts`
- `moc-instructions/get-stats/handler.ts`
- `moc-instructions/get-uploads-over-time/handler.ts`

**Vercel Infrastructure:**
- 4 serverless functions (moc-instructions-get, list, stats, uploads-over-time)
- Cognito auth middleware
- PostgreSQL connection (ILIKE for search - OpenSearch deferred)
- Env vars: DB connection, Cognito config

**Goal:** Enable read access to MOC instruction metadata and statistics

**Risk Notes:** Auth required, DB reads with ILIKE search, aggregation queries

---

## STORY-012: MOC Instructions - Gallery Linking
**Status:** completed
**Depends On:** none
**Feature:** MOC Instructions - Gallery Image Links
**Endpoints:**
- `moc-instructions/get-gallery-images/handler.ts`
- `moc-instructions/link-gallery-image/handler.ts`
- `moc-instructions/unlink-gallery-image/handler.ts`

**Vercel Infrastructure:**
- 3 serverless functions (moc-instructions-gallery-*)
- Cognito auth middleware
- PostgreSQL connection
- Cross-entity relationship validation
- Env vars: DB connection, Cognito config

**Goal:** Enable linking inspiration gallery images to MOC instructions

**Risk Notes:** Auth required, DB writes, referential integrity, cross-entity validation

---

## STORY-013: MOC Instructions - Edit (No Files)
**Status:** completed
**Depends On:** none
**Feature:** MOC Instructions - Metadata Edit
**Endpoints:**
- `moc-instructions/edit/handler.ts`

**Vercel Infrastructure:**
- 1 serverless function (moc-instructions-edit)
- Cognito auth middleware
- PostgreSQL connection
- Env vars: DB connection, Cognito config

**Goal:** Enable editing MOC metadata without file upload handling

**Risk Notes:** Auth required, DB writes, validation logic

---

## STORY-014: MOC Instructions - Import
**Status:** completed
**Depends On:** none
**Feature:** MOC Instructions - External Import
**Endpoints:**
- `moc-instructions/import-from-url/handler.ts`

**Vercel Infrastructure:**
- 1 serverless function (moc-instructions-import)
- Cognito auth middleware
- PostgreSQL connection
- HTTP client for external APIs (Rebrickable, BrickLink)
- Rate limiting for external calls
- Env vars: DB connection, Cognito config, external API keys/tokens

**Goal:** Enable importing MOC data from Rebrickable and BrickLink Studio URLs

**Risk Notes:** Auth required, DB writes, external HTTP calls, rate limiting, parsing logic, timeout handling

---

## STORY-015: MOC Instructions - Initialization & Finalization
**Status:** completed
**Depends On:** none
**Feature:** MOC Instructions - Create Flow
**Endpoints:**
- `moc-instructions/initialize-with-files/handler.ts`
- `moc-instructions/finalize-with-files/handler.ts`

**Vercel Infrastructure:**
- 2 serverless functions (moc-instructions-initialize, finalize)
- Cognito auth middleware
- PostgreSQL connection
- S3 coordination
- Transaction management
- Env vars: DB connection, Cognito config, S3 bucket

**Goal:** Enable multi-step MOC creation with file registration and finalization

**Risk Notes:** Auth required, DB writes, transactional integrity, S3 state coordination, rollback handling

---

## STORY-016: Image Uploads - Phase 2 (MOC Files)
**Status:** completed
**Depends On:** none
**Feature:** Image Uploads - MOC File Management
**Endpoints:**
- `moc-instructions/upload-file/handler.ts`
- `moc-instructions/download-file/handler.ts`
- `moc-instructions/delete-file/handler.ts`
- `moc-instructions/upload-parts-list/handler.ts`
- `moc-instructions/edit-presign/handler.ts`
- `moc-instructions/edit-finalize/handler.ts`

**Vercel Infrastructure:**
- 6 serverless functions (moc-instructions-file-*)
- Cognito auth middleware
- PostgreSQL connection
- S3 presigned URL generation
- S3 upload/download/delete permissions
- Large file support (up to 100MB for PDFs)
- Env vars: DB connection, Cognito config, S3 bucket, S3 region, upload limits, timeout config

**Goal:** Migrate MOC-specific file uploads including PDFs, images, and parts lists with presign/finalize pattern

**Risk Notes:** Auth required, S3 presigned URLs, large file sizes (PDFs), timeout limits, CORS config, content-type validation, edit session coordination

---

## STORY-01711: Session & File Management - CRUD Only
**Status:** completed
**Depends On:** none
**Split From:** STORY-0171

### Scope
Core session management functionality: create upload sessions, register files within sessions, and complete file uploads. Establishes the foundational session infrastructure with authentication and validation, excluding advanced features and enhancements.

### Acceptance Criteria (from parent)
AC-1: Create Session Endpoint
AC-2: Register File Endpoint
AC-4: Complete File Endpoint (with clarifications)
AC-6: Authentication (All Endpoints)
AC-7: Vercel Function Configuration
AC-8: Core Package (for code organization)
AC-9: Database Schema (for clarity)

### Completion Note
QA verification PASSED on 2026-01-25. All code review workers passed (lint, style, syntax, security, typecheck, build). All 7 acceptance criteria verified with evidence mapping. Ready for deployment.

---

## STORY-01721: Session & File Management - Gap Remediations

**Status:** in-elaboration
**Depends On:** STORY-01711
**Split From:** STORY-01712

### Scope
Low-risk documentation and edge case handling for session management endpoints. Addresses 8 critical gaps identified during STORY-01712 elaboration: session cleanup timing, part size configuration rationale, concurrent registration handling, complete file idempotency, session expiration edge cases, MIME type validation documentation, file count limits enforcement, and rate limit bypass for testing. No new endpoints or schema changes - extends STORY-01711 handlers with clarifications and test cases.

### Acceptance Criteria (from parent)
- AC-10: Session cleanup timing specification
- AC-11: Part size configuration with rationale
- AC-12: Concurrent file registration race condition handling
- AC-13: Complete file idempotency clarification
- AC-14: Session expiration window edge case handling
- AC-15: MIME type validation documentation
- AC-16: File count limits enforcement
- AC-17: Rate limit bypass for testing

---

## STORY-01722: Session & File Management - Upload Enhancements

**Status:** pending
**Depends On:** STORY-01721
**Split From:** STORY-01712

### Scope
High-value upload UX features that improve developer experience with the session management API. Adds presigned URL batch generation (return all part URLs upfront), batch file registration endpoint (register multiple files in one call), and upload resume capability (query completed parts to resume interrupted uploads). Adds 2 new endpoints (batch registration, parts query). Builds on completed gap remediations from STORY-01721.

### Acceptance Criteria (from parent)
- AC-19: Presigned URL batch generation
- AC-24: Batch file registration endpoint
- AC-25: Upload resume capability

---

## STORY-01723: Session & File Management - Analytics & Detection

**Status:** pending
**Depends On:** STORY-01721
**Split From:** STORY-01712

### Scope
Observability and deduplication features for session management. Tracks session lifecycle analytics (success rate, upload time, failure points), implements duplicate file detection by hash, adds automatic session extension for active uploads, and generates TypeScript SDK from HTTP contracts. Requires analytics table migration and duplicate detection index. Independent from core upload flow.

### Acceptance Criteria (from parent)
- AC-20: TypeScript SDK generation
- AC-21: Session analytics tracking
- AC-22: Duplicate file detection
- AC-23: Automatic session extension

---

## STORY-01724: Session & File Management - WebSocket Progress

**Status:** pending
**Depends On:** STORY-019, STORY-01721
**Split From:** STORY-01712

### Scope
WebSocket progress tracking integration for real-time upload notifications. Emits progress events at key upload lifecycle points (session created, file registered, part uploaded, file completed, session finalized). Requires STORY-019 WebSocket server infrastructure to be complete. Gracefully no-ops if WebSocket server unavailable.

### Acceptance Criteria (from parent)
- AC-18: WebSocket progress tracking hooks

---

## STORY-01725: Binary Upload & Finalization - Core MVP

**Status:** pending
**Depends On:** STORY-01711
**Split From:** STORY-0172

### Scope
Core binary part upload and session finalization endpoints. Establishes working upload-part handler with Vercel bodyParser: false configuration and finalize endpoint with two-phase locking for MOC creation. Happy path functionality with basic error cases.

### Acceptance Criteria (from parent)
- AC-3: Upload Part Endpoint (Binary Handling)
- AC-5: Finalize Session Endpoint
- AC-8: Part Size Configuration

---

## STORY-01726: Binary Upload & Finalization - Reliability & Resilience

**Status:** pending
**Depends On:** STORY-01725
**Split From:** STORY-0172

### Scope
Production-ready hardening for binary upload and finalization. Adds S3 retry strategies, Vercel timeout handling, enhanced validation (partNumber range 1-10000, ETag format documentation), slug conflict UX, structured logging, stale lock recovery testing, CORS preflight handling, database transaction boundaries, and rate limiting for finalize endpoint.

### Acceptance Criteria (from parent)
- gap_1_s3_retry: S3 retry strategy and exhaustion handling
- gap_2_vercel_timeout: Vercel 30s timeout + client timeout coordination
- gap_3_partnumber_range: Validate partNumber in range [1, 10000]
- gap_4_etag_format: Document ETag format differences (multipart vs single-part)
- gap_5_slug_conflict_ux: Slug conflict UX guidance (auto-retry vs prompt)
- gap_6_upload_logging: Structured logging strategy (partNumber, size, etag)
- gap_7_lock_recovery_testing: Explicit test for stale lock recovery (>5 min)
- gap_8_cors_handling: CORS preflight for browser uploads
- gap_9_db_transactions: Database transaction boundary specification
- gap_10_rate_limiting: Rate limiting for finalize endpoint

---

## STORY-01727: Binary Upload & Finalization - Performance & Observability

**Status:** pending
**Depends On:** STORY-01726
**Split From:** STORY-0172

### Scope
Advanced features for upload UX and operational visibility. WebSocket progress tracking, parallel file validation, MD5/SHA checksum verification, batch upload-part endpoint, auto-thumbnail generation, webhook notifications, resume from partial finalize, and OpenTelemetry spans for finalize critical path.

### Acceptance Criteria (from parent)
- enhance_1_websocket_progress: Real-time progress tracking via WebSocket
- enhance_2_parallel_validation: Parallel file validation during finalize
- enhance_3_checksum_validation: MD5/SHA checksum verification
- enhance_4_batch_upload: Batch upload-part endpoint (multiple parts per request)
- enhance_5_thumbnail_generation: Auto-generate thumbnails from images
- enhance_6_webhook_notifications: Post-finalize webhook notifications
- enhance_7_resume_from_failure: Upload resume from partial finalize state
- enhance_8_opentelemetry: Structured finalize telemetry

---

## STORY-018: Background Jobs
**Status:** pending
**Depends On:** STORY-01725
**Feature:** Background Cleanup Tasks
**Endpoints:**
- `cleanup/edit-orphans/handler.ts`

**Vercel Infrastructure:**
- 1 serverless function (cleanup-edit-orphans)
- Cron trigger or scheduled function
- PostgreSQL connection
- S3 cleanup operations
- Env vars: DB connection, S3 bucket, cleanup thresholds

**Goal:** Migrate background cleanup jobs for orphaned upload sessions and files

**Risk Notes:** No auth (internal trigger), DB writes, S3 deletes, scheduling configuration, idempotency, batch processing

---

## STORY-019: WebSocket Support
**Status:** Created
**Depends On:** none
**Feature:** Real-Time WebSocket Connections
**Endpoints:**
- `websocket/connect/handler.ts`
- `websocket/disconnect/handler.ts`
- `websocket/default/handler.ts`

**Vercel Infrastructure:**
- 3 serverless functions (websocket-*)
- WebSocket API Gateway (different from REST API)
- Connection state storage (DynamoDB)
- Broadcast mechanism
- Cognito auth for WebSocket connections
- Env vars: WebSocket API endpoint, connection table, Cognito config

**Goal:** Migrate real-time WebSocket support for dashboard updates and notifications

**Risk Notes:** Auth required, WebSocket-specific API Gateway config, connection state management, broadcast logic, scaling considerations, connection limits, different deployment pattern than REST
