# Vercel Migration Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 16 |
| generated | 1 |
| in-progress | 0 |
| pending | 2 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| STORY-017 | Multipart Upload Sessions | — |
| STORY-019 | WebSocket Support | — |

**Waiting on STORY-017:**
- STORY-018

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

## STORY-017: Image Uploads - Phase 3 (Multipart Sessions)
**Status:** generated
**Depends On:** none
**Feature:** Image Uploads - Multipart Upload Sessions
**Endpoints:**
- `moc-uploads/sessions/create/handler.ts`
- `moc-uploads/sessions/register-file/handler.ts`
- `moc-uploads/sessions/complete-file/handler.ts`
- `moc-uploads/sessions/upload-part/handler.ts`
- `moc-uploads/sessions/finalize/handler.ts`

**Vercel Infrastructure:**
- 5 serverless functions (moc-upload-sessions-*)
- Cognito auth middleware
- PostgreSQL connection
- S3 multipart upload API
- Session state management
- Redis/DynamoDB for session persistence (if needed)
- Cleanup for incomplete uploads
- Env vars: DB connection, Cognito config, S3 bucket, S3 region, upload limits, session timeout, part size config

**Goal:** Migrate complex multipart upload sessions for large files with resumable uploads

**Risk Notes:** Auth required, S3 multipart API, stateful session management, timeout handling, cleanup jobs, part ordering, memory limits, concurrent upload coordination

---

## STORY-018: Background Jobs
**Status:** pending
**Depends On:** STORY-017
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
**Status:** BLOCKED
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
