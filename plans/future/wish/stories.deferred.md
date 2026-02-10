---
doc_type: stories_deferred
title: "WISH Deferred Stories"
parent: stories.index.md
created_at: "2026-02-09T00:00:00Z"
updated_at: "2026-02-09T00:00:00Z"
---

# WISH Deferred Stories

This file contains 41 deferred stories moved from [stories.index.md](./stories.index.md) to reduce file size.
When a deferred story is promoted, move its full entry back to the main index.

---

## WISH-2005d: Haptic feedback on mobile drag

**Status:** deferred
**Depends On:** WISH-2005a
**Phase:** 4 - UX Polish

**Feature:** Mobile vibration feedback during drag-and-drop operations using the Vibration API to provide tactile confirmation on drag start, during drag, and on drop for iOS and Android users.

**Complexity:** Small

**Goal:** Provide tactile feedback for mobile users during drag-and-drop reordering operations

**Risk Notes:** Vibration API support varies across devices; requires graceful fallback for unsupported browsers

**Source:** WISH-2005a QA Elaboration (Enhancement Opportunity #2)

---

## WISH-20620: Advanced ARIA Features (Landmarks, Skip Links, Heading Hierarchy)

**Status:** deferred
**Depends On:** WISH-2006
**Follow-up From:** WISH-2006
**Phase:** 5 - Accessibility (Future Enhancement)

### Scope

Add advanced ARIA landmarks, skip links, and semantic heading hierarchy to enable efficient screen reader navigation beyond basic WCAG AA compliance from WISH-2006. Enhances navigation efficiency for assistive technology users.

**Features:**
- ARIA landmarks for major page regions (main, header, navigation, search, complementary)
- Skip link component (visually hidden, visible on focus, jumps to main content)
- Semantic heading hierarchy (h1-h6, no skipped levels)
- All landmarks have unique aria-label or aria-labelledby for disambiguation
- Screen reader landmark and heading navigation support

**Packages Affected:**
- `apps/web/app-wishlist-gallery` - Add semantic landmarks, skip links, and heading hierarchy to existing components

**Acceptance Criteria:** 18 ACs covering ARIA landmarks, skip links, heading hierarchy, testing, and axe-core validation

**Complexity:** Medium (semantic HTML restructuring and skip link implementation)

**Effort:** 3 points

**Priority:** P2 (Enhancement to baseline accessibility from WISH-2006)

### Source

Follow-up from QA Elaboration of WISH-2006 (Enhancement Opportunity #5)

**Original Finding:** Add advanced ARIA features (landmarks, skip links, heading hierarchy)

**Category:** Enhancement Opportunity
**Impact:** Medium (Significantly improves navigation for screen reader users)
**Effort:** Medium (Requires semantic HTML restructuring and skip link implementation)

---

## WISH-20300: VS Code snippets for test utility discovery (createMockFile, mockS3Upload)

**Status:** deferred
**Depends On:** WISH-2120
**Follow-up From:** WISH-2120
**Phase:** 2 - Infrastructure

### Scope

Create VS Code snippets for test utilities from WISH-2120 to improve discoverability, accelerate test writing, and ensure consistent test patterns across the codebase. Provides autocomplete-driven snippets for `createMockFile()` and `mockS3Upload()` utilities.

**VS Code Snippets:**
- `cmf` - Create mock file with defaults
- `cmfc` - Create mock file with custom properties
- `ms3s` - Mock S3 upload success scenario
- `ms3e` - Mock S3 upload error scenarios (presign-error, s3-error, timeout)
- `ms3p` - Mock S3 upload with progress simulation

**Packages Affected:**
- `.vscode/test-utils.code-snippets` - New snippet definitions
- `.vscode/README.md` - Document snippet usage

**Benefits:**
- Improve utility discoverability via autocomplete
- Accelerate test writing (reduce boilerplate)
- Ensure consistent test patterns across codebase
- Faster onboarding for new developers

**Acceptance Criteria:** 13 ACs covering snippet creation, TypeScript integration, autocomplete behavior, documentation, and manual testing.

**Complexity:** Small (JSON snippet definitions only)

**Effort:** Low (1 point)

**Priority:** P2 (Developer Experience enhancement)

### Source

Follow-up from QA Elaboration of WISH-2120 (Enhancement Opportunity #1)

**Original Finding:** "VS Code snippets for test utility discovery - Create VS Code snippet for createMockFile() and mockS3Upload() in .vscode/test-utils.code-snippets to improve discoverability for developers"

**Category:** Enhancement Opportunity
**Impact:** Medium (Developer Experience improvement)
**Effort:** Low

---

## WISH-2123: Content Moderation - AI/ML Image Scanning

**Status:** deferred
**Depends On:** WISH-2013
**Follow-up From:** WISH-2013
**Phase:** 4 - Security Enhancements

### Scope

AI/ML-based content moderation to automatically detect and flag inappropriate, offensive, or adult content in uploaded wishlist images. Provides admin tooling for content review, user notification, and policy enforcement.

**Features:**
- AWS Rekognition DetectModerationLabels integration
- Automatic flagging based on confidence thresholds (≥90% auto-flag, <50% auto-approve)
- Admin moderation queue for manual review
- Approve/Reject workflow with audit logging
- Moderation status tracking in database

**Endpoints:**
- `GET /api/admin/moderation/queue` - Get pending moderation items
- `POST /api/admin/moderation/:id/approve` - Approve flagged content
- `POST /api/admin/moderation/:id/reject` - Reject and remove flagged content
- `GET /api/admin/moderation/stats` - Moderation metrics and trends

**Packages Affected:**
- `apps/api/lego-api/domains/wishlist/` - Integrate moderation into upload flow
- `apps/api/lego-api/core/moderation/` - AI/ML moderation service (new)
- `apps/api/lego-api/domains/admin/` - Admin moderation review endpoints (new)
- `apps/web/admin-dashboard/` - Admin moderation review UI (new or extend existing)
- `packages/backend/database-schema/` - Moderation results table, audit log

**Infrastructure:**
- Database table: `moderation_results` with labels, confidence scores, review status
- Database column: `wishlist_items.moderation_status` ('pending-scan', 'clean', 'pending-review', 'approved', 'rejected')
- AWS Rekognition IAM policy for DetectModerationLabels API (~$0.001 per image)

**Acceptance Criteria:** 15 ACs covering AI/ML integration, automatic flagging, admin queue, image preview, approve/reject workflow, database schema, metrics dashboard, adapter pattern, async moderation, authorization, and MSW test coverage.

**Complexity:** Large (AI/ML integration + admin UI + workflow)

**Effort:** High (5-8 points)

**Priority:** P2 (Trust & Safety requirement for production platform)

**Goal:** Implement AI/ML-based content moderation to automatically detect and flag inappropriate content in uploaded wishlist images

**Risks:**
- High false positive rate from AWS Rekognition (mitigate with conservative thresholds ≥90%)
- Moderation costs scale with user growth (~$0.001/image)
- Async moderation creates UX gap for flagged content (mitigate with "Processing" badges)
- Admin review backlog grows faster than capacity (mitigate with queue monitoring and SLA)

### Source

Follow-up from QA Elaboration of WISH-2013 (Follow-up Stories Suggested - Finding #1)

**Original Finding:** "Content Moderation - AI/ML-based scanning for inappropriate/offensive images"

**Category:** Enhancement Opportunity
**Impact:** Medium (Trust & Safety requirement for production platform)
**Effort:** High (AI/ML pipeline integration, moderation workflow, review tooling)

---

## WISH-20320: Redis Cluster mode for high availability (multi-AZ failover, load balancing)

**Status:** deferred
**Depends On:** WISH-2124
**Follow-up From:** WISH-2124
**Phase:** 3 - Advanced Infrastructure

### Scope

Migrate ElastiCache from single-instance to Cluster mode with multi-AZ deployment for production-grade high availability. Enable automatic failover, horizontal scaling, and fault tolerance for feature flag caching infrastructure.

**Features:**
- ElastiCache Cluster mode with 3 nodes (1 primary, 2 replicas)
- Multi-AZ deployment across 3 availability zones
- Automatic failover with <60 second recovery time
- Read replica load balancing for distributed read traffic
- `ioredis` cluster client configuration
- Zero-downtime blue-green migration from single-instance
- Cluster health monitoring and alerting
- Backup and recovery configuration

**Packages Affected:**
- `apps/api/lego-api/core/cache/redis-client.ts` - Cluster mode client initialization
- Infrastructure code (CDK/Terraform) - ElastiCache cluster configuration
- Docker Compose - 6-node local Redis Cluster simulation

**Acceptance Criteria:** 12 ACs covering cluster provisioning, client configuration, automatic failover validation, multi-AZ resilience, read replica load balancing, zero-downtime migration, cluster health monitoring, backup/recovery, connection string migration, local development cluster, cost monitoring, and graceful degradation.

**Complexity:** High (Distributed infrastructure + migration + failover testing)

**Effort:** 5 points

**Priority:** P2 (Production availability requirement)

**Goal:** Enable production-grade high availability for Redis caching with automatic failover and multi-AZ fault tolerance.

**Risks:**
- Increased infrastructure cost (~3x single-instance, mitigated by billing alarms)
- Replication lag under high write load (mitigated by monitoring and eventual consistency acceptance)
- Complex failover behavior (mitigated by staging tests and rollback plan)
- Client library compatibility issues (mitigated by ioredis v5.x cluster support)
- Network latency between AZs (mitigated by cross-AZ optimization and monitoring)

### Source

Follow-up from QA Elaboration of WISH-2124 (Enhancement Opportunity #1)

**Original Finding:** "Redis Cluster mode for high availability (multi-AZ failover, load balancing)"

**Category:** Enhancement Opportunity
**Impact:** High (production availability and fault tolerance)
**Effort:** High (infrastructure redesign and migration)

---

## WISH-20340: Multi-region Redis replication (global latency optimization)

**Status:** deferred
**Depends On:** WISH-2124
**Follow-up From:** WISH-2124
**Phase:** 5 - Global Optimization

### Scope

Deploy multi-region Redis replication for feature flag caching to optimize latency for global users. Enable each AWS region's Lambda functions to read from local Redis read replicas while maintaining centralized write control.

**Features:**
- ElastiCache Global Datastore with primary and secondary clusters
- Region-aware Redis client (auto-detect region, connect to local replica)
- Read-write split in RedisCacheAdapter (reads from local replica, writes to primary)
- Graceful degradation on replica failure (fallback to primary)
- Manual failover procedures with runbook
- Replication lag monitoring and alerting
- Cross-region latency validation (P95 < 50ms per region)

**Packages Affected:**
- `apps/api/lego-api/core/cache/redis-client.ts` - Region detection and dual-client creation
- `apps/api/lego-api/domains/config/adapters/RedisCacheAdapter.ts` - Read-write split routing
- Infrastructure code (CDK/Terraform) - ElastiCache Global Datastore
- Environment configuration - REDIS_PRIMARY_URL, REDIS_REPLICA_URL per region

**Acceptance Criteria:** 12 ACs covering Global Datastore setup, region-aware Redis client, read-write split, replica failover, primary failover procedures, replication lag monitoring, cross-region latency validation, write latency acceptance, environment configuration, cost monitoring, cache invalidation propagation, and disaster recovery testing.

**Complexity:** High (Multi-region infrastructure + failover orchestration)

**Effort:** 5 points

**Priority:** P3 (Global user experience optimization, deferred until multi-region deployment active)

**Goal:** Optimize cache read latency for global users by deploying read replicas in multiple AWS regions while maintaining centralized write control and eventual consistency.

**Risks:**
- Replication lag spikes during high traffic (mitigated by monitoring and TTL)
- Primary region failure requires manual intervention (mitigated by runbook and DR drills)
- Split-brain scenario with two primaries (mitigated by validation steps in failover process)
- Network partition between regions (mitigated by graceful degradation to database)
- Cost overruns from additional regions (mitigated by billing alarms and t3.micro instances)

### Source

Follow-up from QA Elaboration of WISH-2124 (Enhancement Opportunity #3)

**Original Finding:** "Multi-region Redis replication (global latency optimization)"

**Category:** Enhancement Opportunity
**Impact:** Medium (global user experience)
**Effort:** High (multi-region infrastructure)

---

## WISH-2122: Usage Quotas - Per-User Storage Quotas and Upload Rate Limits

**Status:** deferred
**Depends On:** WISH-2013
**Follow-up From:** WISH-2013
**Phase:** 4 - Resource Management

### Scope

Implement per-user storage quotas and upload rate limits to control S3 costs, prevent abuse, and enable tier-based resource allocation. Provides quota tracking, enforcement in presign endpoint, and user visibility via QuotaUsageWidget.

**Features:**
- Per-user storage quotas (default: 100MB for free tier, configurable by tier)
- Upload rate limits (default: 10 uploads/hour, configurable by tier)
- Real-time quota tracking in database (used_bytes, file_count)
- Quota enforcement on presign requests (reject when quota exceeded or rate limit hit)
- QuotaUsageWidget displaying current usage and remaining quota
- Sliding window rate limiting algorithm (60-minute window)
- Migration script to backfill quotas for existing users

**Endpoints:**
- `GET /api/wishlist/quota` - Get current quota usage
- Enhanced `POST /api/wishlist/images/presign` - Reject when quota/rate limit exceeded (429)

**Database:**
- New table: `user_storage_quotas` (user_id, tier, total_quota_bytes, used_bytes, file_count)
- New table: `upload_rate_limits` (user_id, window_start, upload_count)

**Packages Affected:**
- `apps/api/lego-api/domains/wishlist/` - Quota enforcement in presign endpoint
- `apps/api/lego-api/core/quotas/` - Quota service (new)
- `apps/api/lego-api/core/rate-limit/` - Upload rate limiter (new or extend existing)
- `packages/backend/database-schema/` - New quota tables
- `apps/web/app-wishlist-gallery/src/components/QuotaUsageWidget/` - Quota UI component (new)

**Acceptance Criteria:** 17 ACs covering quota initialization, enforcement, tracking accuracy, rate limiting, UI display, client error handling, tier configuration, concurrent safety, audit logging, migration, and documentation.

**Complexity:** Medium (Database tracking + enforcement logic + rate limiting)

**Effort:** 3-5 points

**Priority:** P2 (Cost control and abuse prevention for Phase 4+)

### Source

Follow-up from QA Elaboration of WISH-2013 (Follow-up Stories Suggested - Finding #3)

**Original Finding:** "User Quota Management: Per-user storage quotas or upload rate limits (deferred to future story)"

**Category:** Enhancement Opportunity
**Impact:** Medium (Cost control and abuse prevention)
**Effort:** Medium (Database tracking + enforcement logic + rate limiting)

**Story File:** _(deleted - deferred)_

---

## WISH-2023: Add Compression Failure Telemetry

**Status:** deferred
**Depends On:** WISH-2022
**Follow-up From:** WISH-2022
**Phase:** 4 - UX Polish
**Deferred Reason:** Not MVP - telemetry is a post-launch enhancement

### Scope

Track compression failures via CloudWatch metrics and structured logs to identify patterns by format, size, browser, and error type. Enables data-driven improvements to compression logic and fallback behavior from WISH-2022.

**Features:**
- Compression failure logging with structured metadata (format, size, browser, error type)
- Backend telemetry endpoint `POST /api/observability/compression-failures`
- CloudWatch Metrics namespace: `Wishlist/ImageCompression`
- Metrics: `CompressionFailureCount`, `CompressionFailureRate`
- Dimensions: `Format`, `SizeBucket`, `Browser`, `ErrorType`
- CloudWatch Logs structured JSON format
- Fire-and-forget telemetry (non-blocking, 2-second timeout)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/compressionTelemetry.ts` (new) - Frontend telemetry helpers
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Add error logging
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Instrument failures
- `apps/api/lego-api/domains/observability/routes.ts` - Telemetry endpoint
- `apps/api/lego-api/core/observability/metrics.ts` - CloudWatch metrics publisher

**Acceptance Criteria:** 12 ACs covering error logging, telemetry endpoint, CloudWatch Metrics/Logs, size bucketing, browser detection, error classification, privacy compliance, and documentation.

**Complexity:** Small-Medium (telemetry endpoint + CloudWatch integration)

**Effort:** 2 points

**Priority:** P2 (Observability enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2022 (Gaps Identified - Finding #3)

**Original Finding:** Compression failure telemetry - Track compression failures (format, size, browser, error) via CloudWatch/analytics to identify patterns and improve fallback logic

**Category:** Gap
**Impact:** Medium (Observability improvement for compression failures)
**Effort:** Low (CloudWatch metrics + error logging)

**Story File:** `plans/future/wish/deferred/WISH-2023/WISH-2023.md`

---

## WISH-20550: Per-image Preset Selection for Multi-Upload Workflows

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-2046
**Phase:** 5 - Future Enhancements

### Scope

Enable users to select compression quality presets on a per-image basis during multi-upload workflows. Extends WISH-2046's global preset selection to allow fine-grained control over individual images based on their content type and quality needs.

**Features:**
- Per-image preset selector UI in multi-upload queue
- Independent preset selection for each image in upload batch
- Default preset from global setting (WISH-2046)
- Per-image "skip compression" checkbox
- Toast notifications showing preset used for each image
- Preserved per-image selections when adding/removing images from queue

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/` - Per-image preset selector UI
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Track per-image preset selection
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Accept per-image preset parameter

**Acceptance Criteria:** 13 ACs covering per-image preset UI, independent selection, default preset inheritance, state management, toast notifications, skip compression per-image, and test coverage

**Complexity:** Medium (UI redesign for multi-upload workflows + per-image state management)

**Effort:** 3 points

**Priority:** P3 (Phase 5+ enhancement)

### Source

Follow-up from QA Elaboration of WISH-2046 (Gaps Identified - Finding #1)

**Original Finding:** Per-image preset selection - Story non-goal states preset applies globally. Could be future enhancement.

**Category:** Gap
**Impact:** Medium (enables fine-grained compression control for mixed image types)
**Effort:** Medium (requires UI redesign and per-image state management)

**Story File:** _(deleted - deferred)_

---

## WISH-20570: Dynamic Preset Recommendations Based on Upload History

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-2046
**Phase:** 5+ - Future Enhancements

### Scope

Implement intelligent preset recommendations based on user upload history and compression preferences to reduce decision fatigue. Analyzes last 20 upload events (file size, preset used, compression ratio) to suggest optimal preset using rule-based logic.

**Features:**
- Upload history tracking in localStorage (last 20 events)
- Rule-based recommendation logic: frequent usage (80%+ same preset), large files (avg > 3MB), quality preference (low compression ratio)
- "Recommended for you" badge in preset selector UI
- Recommendation updates after each upload
- Client-side only (no server-side tracking)
- FIFO eviction for upload history (capped at 20 events)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Recommendation logic
- `apps/web/app-wishlist-gallery/src/utils/uploadAnalytics.ts` - NEW: Upload history tracking
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/` - Recommendation badge UI
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Log upload events

**Acceptance Criteria:** 15 ACs covering upload history tracking, recommendation rules, UI badge, localStorage persistence, and test coverage

**Complexity:** Medium (requires analytics logic and user preference tracking)

**Effort:** 3 points

**Priority:** P3 (Future enhancement - Phase 5+)

### Source

Follow-up from QA Elaboration of WISH-2046 (Enhancement Opportunities - Finding #1)

**Original Finding:** Dynamic preset recommendations based on usage patterns - Future enhancement (Phase 5+). Out-of-scope for MVP.

**Category:** Enhancement Opportunity
**Impact:** Medium (improves UX by reducing decision fatigue with smart defaults)
**Effort:** Medium (analytics logic + UI)

---

## WISH-20370: Schema Change Impact Analysis Tool

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-20180
**Phase:** 2 - Infrastructure

### Scope

Implement an automated schema change impact analysis tool that identifies affected services, API endpoints, GraphQL queries, and application code when database schema changes are proposed. Integrates with the CI pipeline from WISH-20180 to provide developers with impact reports in PR comments.

**Features:**
- Schema change detection from migration SQL files
- Service impact analysis (backend services, Lambda functions)
- API endpoint impact analysis (GraphQL schema, REST endpoints)
- Frontend impact analysis (GraphQL queries, API client calls, TypeScript types)
- Impact report generation (JSON + markdown formats)
- CI integration with PR comment posting
- Categorized impacts by severity (breaking, warning, informational)

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - Impact analysis script
- `.github/workflows/schema-validation.yml` - CI workflow extension
- `packages/backend/database-schema/docs/` - Impact analysis documentation

**Acceptance Criteria:** 20 ACs covering schema change detection, service impact analysis, API endpoint analysis, frontend impact analysis, report generation, and CI integration

**Complexity:** Medium-High (AST parsing + codebase scanning + impact classification)

**Effort:** 3 points

**Priority:** P1 (Automated impact visibility for Phase 2)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20180 (Follow-up Stories Suggested - Finding #2)

**Original Finding:** "Schema change impact analysis (service/endpoint impact detection)"

**Category:** Enhancement Opportunity
**Impact:** Medium (helps developers understand downstream consequences)
**Effort:** Medium (AST parsing + codebase scanning)

---

## WISH-20380: Migration Performance Profiling

**Status:** deferred
**Depends On:** WISH-20180
**Follow-up From:** WISH-20180
**Phase:** 2 - Infrastructure

### Scope

Implement migration performance profiling tooling that estimates execution time of schema changes on production-sized datasets. Provide developers with runtime estimates, execution plan analysis, and warnings for long-running migrations during PR review.

**Features:**
- Performance profiling script (`profile-migration.ts`) for isolated migration testing
- Seed data generator for production-scale datasets (configurable sizes)
- CI workflow integration with WISH-20180 schema validation
- Performance reports posted as PR comments with threshold warnings
- EXPLAIN analysis for execution plan inspection
- Lock detection and zero-downtime strategy recommendations

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - Profiling and seed scripts
- `.github/workflows/schema-validation.yml` - CI workflow extension
- `packages/backend/database-schema/docs/` - Performance profiling documentation

**Infrastructure:**
- Isolated test databases with production-scale seed data
- Performance thresholds: 30s (small), 5min (medium), 10min (critical)
- PostgreSQL EXPLAIN analysis for query plan insights

**Benefits:**
- Prevents production incidents from slow migrations
- Enables data-driven decisions on migration strategies
- Provides visibility into migration runtime before deployment
- Identifies table locks and performance risks proactively

**Acceptance Criteria:** 20 ACs covering profiling script, seed data generator, performance reports, CI integration, and documentation

**Complexity:** Medium (profiling script + seed generator + EXPLAIN analysis + CI integration)

**Effort:** Medium (2-3 points)

**Priority:** P2 (Operational enhancement for Phase 2)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20180 (Enhancement Opportunities - Finding #3)

**Original Finding:** "Migration performance profiling - Estimate migration execution time on production-sized datasets"

**Category:** Enhancement Opportunity
**Impact:** Medium (prevents slow migrations, enables planning)
**Effort:** Medium (test database + seed data + timing + EXPLAIN analysis)

---

## WISH-20390: Visual Schema Diff Tool for PR Reviews

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-20180
**Phase:** 2 - Infrastructure

### Scope

Implement a visual schema diff tool that generates graphical representations of database schema changes for PR reviews. Integrates with WISH-20180 CI workflow to automatically post visual diffs as PR comments, improving review velocity and comprehension.

**Features:**
- Schema diff parser extracting table/column/index/constraint changes
- Visual renderer generating Mermaid diagrams showing before/after state
- CI integration embedding visual diffs in PR comments
- Color-coded highlighting (green=added, red=removed, yellow=modified)
- Graceful fallback for unparseable SQL or complex changes

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - Visual diff generator script
- `.github/workflows/schema-validation.yml` - CI workflow extension
- `packages/backend/database-schema/docs/` - Visual diff documentation

**Acceptance Criteria:** 18 ACs covering schema diff parser, visual renderer, CI integration, and documentation

**Complexity:** Low-Medium (SQL parsing + Mermaid rendering + GitHub PR integration)

**Effort:** 2 points

**Priority:** P2 (Developer experience enhancement for schema reviews)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20180 (Enhancement Opportunities - Finding #4)

**Original Finding:** "Visual schema diff tool - Show table/column changes graphically in PR reviews"

**Category:** Enhancement Opportunity
**Impact:** Medium (improves review velocity and comprehension)
**Effort:** Low (leverages existing parser from WISH-20180, Mermaid.js for rendering)

---

## WISH-20400: Real-time CI Integration for Schema Change Impact Analysis

**Status:** deferred
**Depends On:** WISH-20210
**Follow-up From:** WISH-20210
**Phase:** 3 - Infrastructure

### Scope

Integrate the schema change impact analysis tool (from WISH-20210) into GitHub Actions CI/CD pipelines to automatically analyze schema changes, post impact reports as PR comments, and optionally block high-impact changes pending manual review.

**Features:**
- GitHub Actions workflow triggering on schema file changes
- Automated detection of schema modifications (column/enum/constraint changes)
- Impact report formatting as GitHub-flavored Markdown PR comments
- Threshold enforcement with blocking rules for high-impact/breaking changes
- Multi-change aggregation for PRs modifying multiple tables

**Packages Affected:**
- `.github/workflows/` - New `schema-impact-analysis.yml` workflow
- `scripts/` - Detection, formatting, and threshold enforcement scripts
- `packages/backend/database-schema/` - Reuses existing `pnpm db:impact-analysis` from WISH-20210

**Acceptance Criteria:** 26 ACs covering CI workflow basics, schema change detection, impact report formatting, threshold enforcement, multi-change scenarios, error handling, and documentation

**Complexity:** Medium (GitHub Actions workflow + detection script + formatting + threshold logic)

**Effort:** 3 points

**Priority:** High (automation for schema change workflow)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20210 (Follow-up Stories Suggested - Finding #1)

**Original Finding:** "Real-time CI integration for schema change impact analysis (automated PR comments, blocking checks)"

**Category:** Enhancement Opportunity
**Impact:** High (automated guardrails for schema evolution)
**Effort:** Medium (CI workflow + detection logic + integration with existing tool)

---

## WISH-20410: Visual Dependency Graph UI for Schema Impact Analysis

**Status:** deferred
**Depends On:** WISH-20210
**Follow-up From:** WISH-20210
**Phase:** 3 - Infrastructure

### Scope

Add an interactive visual dependency graph to the Schema Change Impact Analysis Tool (WISH-20210) that displays table → service → endpoint → component relationships as a hierarchical graph, enabling developers to quickly understand multi-layer impacts from schema changes.

**Features:**
- `--graph` flag for `pnpm db:impact-analysis` command
- Interactive HTML graph with hierarchical layout (table as root node)
- Color-coded node types (Database=cyan, Repository=blue, Service=green, Route=orange, Schema=purple, Component=pink, Test=gray)
- Edge types showing dependency relationships (solid=direct, dashed=type import)
- Interactive features: hover tooltips, click to highlight downstream dependencies, toggle test files, zoom/pan
- Static SVG export option for embedding in documentation

**Output Files:**
- Interactive HTML graph: `impact-reports/{timestamp}-{table}-{operation}-graph.html`
- Static SVG graph (optional): `impact-reports/{timestamp}-{table}-{operation}-graph.svg`

**Packages Affected:**
- `packages/backend/database-schema/scripts/impact-analysis.ts` - Extend CLI with `--graph` flag
- `packages/backend/database-schema/src/analysis/graph-builder.ts` - New dependency graph construction module
- `packages/backend/database-schema/src/renderers/graph-renderer.ts` - New HTML/SVG rendering module
- `packages/backend/database-schema/package.json` - Add vis-network or D3.js dependency

**Technical Implementation:**
- AST analysis enhancement: Track dependency relationships (not just affected files)
- Graph data structure: Nodes (files) + Edges (dependencies)
- Rendering: vis-network for interactive HTML, headless SVG generation
- Self-contained output: Embedded JavaScript/CSS (no external CDN dependencies)

**Acceptance Criteria:** 22 ACs covering CLI integration, graph structure, interactive features, dependency analysis, output quality, test coverage, and documentation

**Complexity:** Medium (graph builder + HTML renderer + AST enhancement)

**Effort:** 3 points

**Priority:** P2 (Developer experience enhancement for schema impact visualization)

**Goal:** Make complex dependency chains immediately clear through visual graph representation, improving developer understanding of schema change impacts.

**Benefits:**
- Quick identification of full impact scope at a glance
- Clear visualization of direct vs indirect dependencies
- Improved communication of impact to stakeholders
- Better understanding of update order (database → backend → frontend)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20210 (Follow-up Stories Suggested - Finding #2)

**Original Finding:** "Add visual dependency graph UI showing table → service → endpoint relationships"

**Category:** Enhancement Opportunity
**Impact:** Medium (improves developer understanding of complex dependency chains)
**Effort:** Medium (graph construction + interactive rendering + CLI integration)

---

## WISH-20192: Schema Drift Detection - Advanced Features

**Status:** deferred
**Depends On:** WISH-20191
**Split From:** WISH-20190
**Split Part:** 2 of 3
**Phase:** 1 - Foundation

### Scope

Extend the drift detection tool with advanced features: `.driftignore` file support for excluding intentional drift, automated drift remediation to generate migration scripts, verbose mode for debugging, and historical drift tracking for trend analysis.

**Features:**
- `.driftignore` file support to exclude intentional drift (e.g., test tables in staging)
- Automated drift remediation: generate migration scripts to fix detected drift
- Verbose mode: detailed logging of comparison steps for debugging
- Historical drift tracking: store drift detection results over time for trend analysis

**Packages Affected:**
- `packages/backend/database-schema/src/drift-detector/ignore-parser.ts` - .driftignore parser (new)
- `packages/backend/database-schema/src/drift-detector/remediation-generator.ts` - Migration script generator (new)
- `packages/backend/database-schema/src/drift-detector/history-tracker.ts` - Drift history storage (new)
- `packages/backend/database-schema/docs/SCHEMA-DRIFT-DETECTION.md` - Update with advanced features

**Acceptance Criteria:** 4 ACs covering .driftignore support (AC 21), automated remediation (AC 22), verbose mode (AC 23), historical tracking (AC 24)

**Complexity:** Medium (requires migration script generation and persistence layer)

**Effort:** 3 points

**Priority:** P2 (Enhancement of core tool)

**Story File:** _(deleted - deferred)_

### Source

Split from WISH-20190 during QA Elaboration. User decisions from gaps #1, #4 and enhancements #1, #5.

**Original Parent:** WISH-20190 (Schema Drift Detection Tool)
**Split Reason:** Advanced features added during elaboration requiring separate implementation after MVP.

**Category:** Enhancement Opportunity
**Impact:** Medium (improves drift tool usability and automation)
**Effort:** Medium (migration generation + persistence)

---

## WISH-20193: Schema Drift Detection - CI/CD Integration

**Status:** deferred
**Depends On:** WISH-20191, WISH-20192
**Split From:** WISH-20190
**Split Part:** 3 of 3
**Phase:** 2 - Infrastructure

### Scope

Integrate drift detection into CI/CD pipelines with deployment blocking capabilities and configurable drift severity levels. Enables enforcement of schema consistency policies in deployment workflows.

**Features:**
- CI/CD integration: block deployments if drift detected in target environment
- Drift severity levels: classify drift as error/warning/info with configurable thresholds
- GitHub Actions workflow integration examples
- Deployment gate configuration for different environments

**Packages Affected:**
- `packages/backend/database-schema/src/drift-detector/severity-classifier.ts` - Drift severity logic (new)
- `.github/workflows/drift-check.yml` - CI drift detection workflow (new)
- `packages/backend/database-schema/docs/SCHEMA-DRIFT-DETECTION.md` - Update with CI/CD integration

**Acceptance Criteria:** 2 ACs covering CI/CD integration (AC 25) and drift severity levels (AC 26)

**Complexity:** Low (leverages existing drift detection, adds CI integration)

**Effort:** 2 points

**Priority:** P2 (Operational hardening)

**Story File:** _(deleted - deferred)_

### Source

Split from WISH-20190 during QA Elaboration. User decisions from enhancements #2, #6.

**Original Parent:** WISH-20190 (Schema Drift Detection Tool)
**Split Reason:** CI/CD integration requires deployment infrastructure coordination and separate implementation phase.

**Category:** Enhancement Opportunity
**Impact:** Medium (improves deployment safety and consistency)
**Effort:** Low (integration work + configuration)

---

## WISH-20530: Server-side HEIC Conversion Fallback

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-2045
**Phase:** 4 - UX Polish

### Scope

Implement server-side HEIC to JPEG conversion as a fallback when client-side conversion fails, ensuring all users can upload iPhone photos with compression benefits regardless of browser capabilities.

**Features:**
- Detect client-side HEIC conversion failures from WISH-2045
- Upload original HEIC to S3 with fallback metadata
- S3 event triggers Lambda function for server-side conversion
- HEIC to JPEG conversion using `sharp` library (quality 90%)
- Automatic compression to target <1MB file size
- CloudWatch metrics for conversion success/failure rates
- Frontend polling for converted image (30-second timeout)
- Asynchronous processing with user notifications

**Backend Components:**
- New Lambda: `apps/api/lego-api/functions/image-processing/heicConverter.ts`
- S3 event notification configuration
- Dead letter queue for failed conversions
- CloudWatch alarms for conversion failures

**Frontend Components:**
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Fallback detection and polling
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Signal fallback needed

**Infrastructure:**
- Lambda layer for `libheif` native library
- S3 lifecycle policy bucket for original HEIC files
- CloudWatch metrics and alarms

**Acceptance Criteria:** 21 ACs covering client-side failure detection, S3 upload with metadata, Lambda conversion workflow, error handling, frontend polling, toast notifications, CloudWatch metrics, and comprehensive test coverage.

**Complexity:** Medium (Lambda function + S3 events + image processing + frontend polling)

**Effort:** 3 points

**Priority:** P2 (Reliability enhancement for browsers with failed client-side conversion)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-2045

**Original Finding:** Server-side HEIC conversion fallback (if client-side conversion fails in production)

**Category:** Enhancement Opportunity
**Impact:** Medium (Improves reliability for users whose browsers fail client-side HEIC conversion)
**Effort:** Medium (Requires Lambda function integration with image processing library)

---

## WISH-2050: Compression Preview Comparison

**Status:** deferred
**Depends On:** WISH-2022
**Follow-up From:** WISH-2022
**Phase:** 5 - UX Polish

### Scope

Provide a visual comparison of original vs. compressed images to help users understand quality trade-offs and build trust in the compression feature. Implements side-by-side or slider comparison UI after compression completes.

**Features:**
- Slider comparison UI showing original (left) vs. compressed (right) images
- File size and dimensions labels for both versions
- Keyboard-accessible slider with arrow key control
- Toggle on/off with "Show comparison" checkbox (localStorage preference)
- Responsive layout: vertical stack on mobile (< 768px)
- Tooltips explaining quality trade-offs

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/components/ImageComparisonPreview/` (new)
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`
- `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`

**Acceptance Criteria:** 12 ACs covering comparison UI rendering, slider interaction, file size/dimension labels, keyboard accessibility, localStorage preference persistence, responsive layout, and test coverage.

**Complexity:** Medium (Comparison UI + responsive design + preference persistence)

**Effort:** 3 points

**Priority:** P2 (Trust-building UX enhancement for Phase 5)

### Source

Follow-up from QA Elaboration of WISH-2022 (Enhancement Opportunities - Finding #3)

**Original Finding:** Compression preview comparison - Side-by-side or slider comparison of original vs compressed image. Helps users understand quality trade-offs and builds trust in compression feature.

**Category:** Enhancement Opportunity
**Impact:** Medium (improves user understanding and trust in compression)
**Effort:** Medium (dual image preview and comparison UI)

**Note:** Marked out-of-scope during WISH-2022 elaboration due to UI complexity, but documented as follow-up for future consideration.

---

## WISH-2068: Browser Compatibility & Fallback for WebP

**Status:** deferred
**Depends On:** none
**Split From:** WISH-2048
**Phase:** 4 - UX Polish

### Scope

Detect browsers without WebP support (Safari < 14, IE11) and provide graceful fallback to JPEG compression with clear user messaging. This is part 2 of 2 from the WISH-2048 split, focusing on edge case handling for older browsers (< 3% of users).

**Features:**
- Browser compatibility detection using canvas API
- Preventive check: Warn users on unsupported browsers before compression
- Reactive fallback: If WebP compression fails, retry with JPEG
- Distinct toast notifications for WebP success vs JPEG fallback
- Filename extension matches actual output format (.webp or .jpeg)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Add browser detection
- `apps/web/app-wishlist-gallery/src/utils/browserSupport.ts` - New utility for WebP detection

**Benefits:**
- Graceful degradation for older browsers
- Clear user communication about format selection
- Ensures all users can upload images successfully

**Acceptance Criteria:** 2 ACs covering browser compatibility detection and fallback logic.

**Complexity:** Small (browser detection and error handling)

**Effort:** Low (1 point)

**Priority:** P3 (Edge case handling for < 3% of users)

**Story File:** `plans/future/wish/backlog/WISH-2068/WISH-2068.md`

### Source

Split from WISH-2048 (WebP Format Conversion) during QA Elaboration. Browser compatibility and fallback logic separated from core conversion functionality.

**Category:** Enhancement Opportunity - Edge Case Handling
**Impact:** Low (covers edge case for Safari < 14 and IE11)
**Effort:** Low (browser detection and fallback logic)

---

## WISH-20420: Schema Migration Code Generation Tool

**Status:** deferred
**Depends On:** WISH-20210
**Follow-up From:** WISH-20210
**Phase:** 3 - Infrastructure

### Scope

Build an automated CLI tool (`pnpm db:generate-migration`) that consumes schema change impact analysis reports (from WISH-20210) and generates skeleton code modifications for affected files, including Drizzle schema updates, Zod schema changes, service layer boilerplate, and frontend component scaffolding.

**Features:**
- CLI tool accepting `--report` flag pointing to impact analysis Markdown file
- Template-based code generation for common schema change patterns
- Drizzle schema updates (column additions, enum extensions, migrations)
- Zod schema updates (field additions, enum extensions, validation)
- Service layer boilerplate (method signatures, repository mappings)
- Frontend scaffolding (form fields, type imports, display components)
- Test fixture updates (mock data, test assertions)

**Code Generation Capabilities:**
- Adding optional/required columns with defaults
- Adding/renaming enum values
- Generating Drizzle SQL migrations + TypeScript schema updates
- Generating Zod schema field additions with validation
- Generating service layer code with field mappings
- Generating frontend form fields and display components
- Generating test fixture updates

**Generated Output Structure:**
- `generated-migrations/{timestamp}-{table}-{operation}/`
  - `drizzle/` - SQL migrations and schema updates
  - `backend/` - `.patch` files for services, repositories, schemas
  - `frontend/` - `.patch` files for components, hooks
  - `tests/` - `.patch` files for fixtures, mocks
  - `README.md` - Step-by-step application instructions

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - New `generate-migration.ts` CLI tool
- `packages/backend/database-schema/templates/` - Code generation templates
- Reuses `impact-analysis.ts` output from WISH-20210

**Safety Mechanisms:**
- No automatic application (developer must review patches)
- Dry-run mode by default (`--apply` flag required)
- Generated code includes "REVIEW REQUIRED" comments
- TypeScript compilation validation before writing files
- Unified diff `.patch` format for manual application

**Benefits:**
- Reduces manual boilerplate from hours to minutes
- Eliminates repetitive schema migration work
- Provides consistent code patterns across migrations
- Reduces human error in schema change implementation
- Complements WISH-20210 analysis with automated scaffolding

**Acceptance Criteria:** 24 ACs covering CLI basics, Drizzle/Zod generation, service layer boilerplate, frontend scaffolding, test fixture updates, code quality, and documentation.

**Complexity:** Medium (Template system + AST code insertion + patch generation)

**Effort:** 5 points

**Priority:** P2 (Developer productivity enhancement, builds on WISH-20210)

### Source

Follow-up from QA Elaboration of WISH-20210 (Follow-up Stories Suggested - Finding #3)

**Original Finding:** "Build schema migration code generation based on impact analysis output"

**Category:** Enhancement Opportunity
**Impact:** High (reduces manual migration work from hours to minutes)
**Effort:** Medium (code generation templates + AST utilities)

**Story File:** _(deleted - deferred)_

---

## WISH-20500: Schedule Management Dashboard (Core UI)

**Status:** deferred
**Depends On:** WISH-2119
**Blocker:** WISH-2119 in QA (status: ready-for-qa)
**Split From:** WISH-20220
**Phase:** 3 - Infrastructure

### Scope

Provide the foundational dashboard page and RTK Query API integration for schedule management. Implements page scaffolding, view toggle (calendar/timeline), auto-refresh polling, authorization enforcement, and error handling.

**Features:**
- Schedule management dashboard page at `/admin/feature-flags/:flagKey/schedules`
- View toggle between calendar and timeline views (preference saved to localStorage)
- RTK Query endpoints: getSchedules, createSchedule, cancelSchedule
- Auto-refresh polling (60-second interval)
- Authorization enforcement (admin-only access)
- Error handling (404, 403, network errors)

**Packages Affected:**
- `apps/web/admin-dashboard/src/pages/ScheduleManagementPage.tsx` - Main dashboard page (new)
- `packages/core/api-client/src/rtk/feature-flags-api.ts` - RTK Query endpoints (new)

**Acceptance Criteria:** 9 ACs covering dashboard navigation, view toggle, auto-refresh, authorization, error handling, and testing.

**Complexity:** Medium (Core foundation + RTK Query + admin dashboard scaffolding)

**Effort:** 2 points

**Priority:** P1 (Foundation for WISH-20510 and WISH-20520)

### Split Context

This is part 1 of 3 from the split of WISH-20220. Original story had 20 ACs (2.5x over threshold).

**Split Allocation:**
- WISH-20500 (this story): Core Dashboard - 2 points
- WISH-20510: Timeline & Cards - 1 point (depends on this)
- WISH-20520: Calendar View - 2 points (depends on this)

---

## WISH-20510: Schedule Timeline & Cards

**Status:** deferred
**Depends On:** WISH-20500
**Split From:** WISH-20220
**Phase:** 3 - Infrastructure

### Scope

Build the timeline view and schedule card components for the schedule management dashboard. Implements chronological schedule list, expandable schedule cards with status badges, cancel functionality for pending schedules, and countdown timers.

**Features:**
- ScheduleTimeline component (chronological list with past/future separation)
- ScheduleCard component (details, status badges, countdown timers)
- Cancel pending schedule flow (confirmation modal + RTK Query mutation)
- Test fixtures for mock schedule data (mockPendingSchedule, mockAppliedSchedule, mockFailedSchedule)
- Performance optimization (single interval for all countdown timers)

**Packages Affected:**
- `apps/web/admin-dashboard/src/components/ScheduleTimeline/` - Timeline visualization (new)
- `apps/web/admin-dashboard/src/components/ScheduleCard/` - Schedule card (new)
- `apps/web/admin-dashboard/src/hooks/useCountdown.ts` - Countdown timer hook (new)

**Acceptance Criteria:** 6 ACs covering timeline rendering, card rendering, cancel functionality, and testing.

**Complexity:** Low-Medium (Timeline + cards + cancel flow)

**Effort:** 1 point

**Priority:** P2 (Depends on WISH-20500)

### Split Context

This is part 2 of 3 from the split of WISH-20220. Depends on WISH-20500 (core dashboard + RTK Query API).

**Split Allocation:**
- WISH-20500: Core Dashboard - 2 points (prerequisite)
- WISH-20510 (this story): Timeline & Cards - 1 point
- WISH-20520: Calendar View - 2 points (can run in parallel after WISH-20500)

---

## WISH-20520: Schedule Calendar View

**Status:** deferred
**Depends On:** WISH-20500
**Split From:** WISH-20220
**Phase:** 3 - Infrastructure

### Scope

Build the calendar view and schedule creation form for the schedule management dashboard. Implements full month calendar with color-coded schedule markers, schedule creation form with validation, keyboard navigation, and screen reader support.

**Features:**
- ScheduleCalendar component (full month view, color-coded markers)
- CreateScheduleForm modal (date/time picker, validation, submission)
- Click date to pre-fill creation form
- Navigate between months (prev/next buttons)
- Keyboard navigation (arrow keys, Enter, Tab)
- Screen reader support (aria-labels, aria-live regions)
- Focus management (modal trap, restoration)

**Packages Affected:**
- `apps/web/admin-dashboard/src/components/ScheduleCalendar/` - Calendar view (new)
- `apps/web/admin-dashboard/src/components/CreateScheduleForm/` - Schedule form (new)
- `packages/core/app-component-library/_primitives/Slider/` - Radix UI slider (new)

**New Dependencies:**
- `react-calendar` (~15 KB, better a11y)
- `react-datepicker` (~20 KB)
- `date-fns` (tree-shakable date formatting)
- `@radix-ui/react-slider` (rollout percentage slider)

**Acceptance Criteria:** 8 ACs covering calendar rendering, form validation, form submission, keyboard navigation, screen reader support, focus management, and testing.

**Complexity:** Medium (Calendar + form + a11y + new libraries)

**Effort:** 2 points

**Priority:** P2 (Depends on WISH-20500)

### Split Context

This is part 3 of 3 from the split of WISH-20220. Depends on WISH-20500 (core dashboard + RTK Query API).

**Split Allocation:**
- WISH-20500: Core Dashboard - 2 points (prerequisite)
- WISH-20510: Timeline & Cards - 1 point (can run in parallel after WISH-20500)
- WISH-20520 (this story): Calendar View - 2 points

---

## WISH-20540: HEIC Telemetry Tracking for Conversion Success/Failure Rates

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-2045
**Phase:** 4 - UX Polish

### Scope

Instrument HEIC conversion workflow with telemetry to track success/failure rates, error types, conversion performance, and file characteristics for data-driven optimization. Provides visibility into real-world HEIC conversion reliability from WISH-2045 implementation.

**Features:**
- Telemetry events: HEIC_CONVERSION_STARTED, HEIC_CONVERSION_SUCCESS, HEIC_CONVERSION_FAILED, HEIC_FALLBACK_UPLOAD
- Metrics tracked: success/failure rates, conversion duration, file sizes, error type distribution
- Error categorization: BROWSER_INCOMPATIBLE, TIMEOUT, MEMORY_ERROR, CORRUPTED_FILE, UNKNOWN_ERROR
- PII sanitization for error messages and filenames
- Structured logging via @repo/logger
- Fire-and-forget telemetry (non-blocking)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - HEIC conversion telemetry
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Upload workflow telemetry

**Acceptance Criteria:** 17 ACs covering telemetry events, metrics tracking, error categorization, PII sanitization, test coverage, and documentation.

**Complexity:** Small (Straightforward telemetry instrumentation)

**Effort:** 2 points

**Priority:** P2 (Data collection for future HEIC optimization)

### Source

Follow-up from QA Elaboration of WISH-2045 (Follow-up Story Suggested #2)

**Original Finding:** Consider adding telemetry to track HEIC conversion success/failure rates for future optimization

**Category:** Enhancement Opportunity
**Impact:** Medium (Provides data-driven insights for improving HEIC conversion reliability)
**Effort:** Low (Straightforward telemetry instrumentation)

**Story File:** _(deleted - deferred)_

---

## WISH-20230: Recurring schedules (cron-like syntax for automated recurring flag updates)

**Status:** deferred
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 4 - Infrastructure

### Scope

Extend WISH-2119's one-time flag scheduling with cron-like recurring schedules for automated periodic flag updates. Enables weekly A/B tests, seasonal features, maintenance windows, and business hours restrictions without manual intervention.

**Features:**
- Cron expression syntax for recurring schedules (standard 5-field format)
- Automatic next execution calculation using `cron-parser` library
- Recurring schedule creation, listing, and cancellation via admin endpoints
- Extended cron job to process recurring schedules and recalculate nextExecutionAt
- Database columns: `recurrence` (cron expression), `nextExecutionAt` (next execution timestamp)

**Endpoints:**
- `POST /api/admin/flags/:flagKey/schedule` - Add optional `recurrence` field with cron expression
- `GET /api/admin/flags/:flagKey/schedule` - Include `recurrence`, `nextExecutionAt` in response
- `DELETE /api/admin/flags/:flagKey/schedule/:scheduleId` - Cancel recurring schedule (stops future executions)

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Extend schedule service and repository
- `apps/api/lego-api/jobs/process-flag-schedules.ts` - Generate next execution for recurring schedules
- `packages/backend/database-schema/` - Add `recurrence`, `nextExecutionAt` columns to feature_flag_schedules table
- `packages/core/api-client/src/schemas/feature-flags.ts` - Add RecurringScheduleSchema

**Infrastructure:**
- Database migration: Add `recurrence` (VARCHAR 100), `nextExecutionAt` (TIMESTAMP WITH TIME ZONE) columns
- npm dependency: `cron-parser` library (MIT license)
- Index on `nextExecutionAt` for fast cron job queries

**Use Cases:**
- Weekly A/B tests (auto-enable every Monday 9am, auto-disable Friday 5pm)
- Seasonal features (auto-enable winter theme Dec 1-Feb 28 every year)
- Maintenance windows (auto-disable features every Sunday 2am-4am)
- Business hours restrictions (auto-enable features Monday-Friday 9am-5pm only)
- Monthly promotions (auto-enable discount features on 1st day of each month)

**Acceptance Criteria:** 16 ACs covering cron expression validation, recurring schedule creation, next execution calculation, cron job processing, cancellation, and testing

**Complexity:** Medium (cron expression parsing + recurring schedule generation + next execution calculation)

**Effort:** 5 points

**Priority:** P2 (Infrastructure enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2119 (Enhancement Opportunity #1)

**Original Finding:** "Recurring schedules (cron-like syntax) - Deferred to Phase 4+ follow-up story"

**Category:** Enhancement Opportunity
**Impact:** Medium (enables automated recurring flag operations without manual intervention)
**Effort:** Medium (cron expression parsing + recurring schedule generation + next execution calculation)

**Story File:** `plans/future/wish/deferred/WISH-20230/WISH-20230.md`

---
---

## WISH-20240: Schedule preview endpoint (simulate flag state before schedule applies)

**Status:** deferred
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 4 - Infrastructure Enhancements

### Scope

Enable admins to preview the exact flag state that will result from a scheduled update before it executes. Read-only endpoint simulates applying pending schedules in chronological order and returns the resulting flag state without modifying flags or schedules.

**Features:**
- GET /api/admin/flags/:flagKey/schedule/preview endpoint (admin only)
- Fetches current flag state and all pending schedules
- Simulates applying schedules in chronological order
- Returns currentState, previewedState, pendingSchedules array, stateChanged boolean
- Handles partial updates (enabled or rolloutPercentage only)
- Read-only operation (no side effects)

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Add previewSchedules method to schedule service
- `packages/core/api-client/src/schemas/` - Preview response schema

**Use Cases:**
- Verify complex scheduling scenarios before execution
- Identify conflicting schedules that may produce unexpected flag states
- Build admin confidence when scheduling critical flag changes
- Debug scheduling issues without affecting live flags

**Acceptance Criteria:** 12 ACs covering preview endpoint, simulation logic, schema alignment, and testing

**Complexity:** Small (read-only simulation logic)

**Effort:** 2 points

**Priority:** P2 (Admin tooling enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2119 (Enhancement Opportunity #2)

**Original Finding:** "Schedule preview endpoint (simulate flag state before schedule applies)"

**Category:** Enhancement Opportunity
**Impact:** Medium (improves admin confidence and reduces configuration errors)
**Effort:** Low (2 points - read-only simulation logic)

---

## WISH-20250: Bulk schedule creation (multiple schedules in single API call)

**Status:** deferred
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 4 - Infrastructure

### Scope

Enable admins to create multiple flag schedules in a single atomic API call, reducing operational overhead and ensuring consistency for coordinated rollout scenarios.

**Features:**
- Bulk schedule creation endpoint accepting array of schedules
- Atomic transaction processing (all-or-nothing)
- Duplicate time detection within batch
- Maximum batch size: 50 schedules per request
- Batch INSERT for database efficiency

**Endpoints:**
- `POST /api/admin/flags/:flagKey/schedule/bulk` - Create multiple schedules atomically

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Extend schedule service with bulk creation
- `packages/core/api-client/src/schemas/` - Bulk schedule schemas

**Use Cases:**
- Phased rollouts: Create 5 schedules to gradually increase rollout percentage (0% → 25% → 50% → 75% → 100%)
- Multi-flag coordination: Enable multiple related flags simultaneously
- Time-windowed features: Create enable/disable schedule pairs for temporary features
- Multi-environment rollouts: Schedule same flag changes across dev/staging/production

**Acceptance Criteria:** 10 ACs covering bulk endpoint validation, atomic batch creation, duplicate detection, authorization, schema alignment, and comprehensive test coverage.

**Complexity:** Small (Extension of existing schedule creation endpoint)

**Effort:** 2 points

**Priority:** P2 (Operational efficiency enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2119 (Enhancement Opportunity #3)

**Original Finding:** "Bulk schedule creation (multiple schedules in single API call)"

**Category:** Enhancement Opportunity
**Impact:** Medium (Operational efficiency for admins managing complex rollout schedules)
**Effort:** Low (Extension of existing schedule creation endpoint)

**Story File:** `plans/future/wish/backlog/WISH-20250/WISH-20250.md`

---

## WISH-20350: Cache analytics dashboard (Grafana/Prometheus integration)

**Status:** deferred
**Depends On:** WISH-2124
**Follow-up From:** WISH-2124
**Phase:** 3 - Observability

### Scope

Implement Grafana/Prometheus analytics dashboard for Redis cache observability. Provide centralized, long-term metric storage and advanced visualization for cache performance, capacity planning, and cost optimization.

**Features:**
- Prometheus server deployment (AWS Fargate/EC2) with 90-day metric retention
- CloudWatch Exporter for scraping ElastiCache metrics
- Grafana server deployment with cache performance dashboard
- 6-panel dashboard: cache hit rate, latency P95, connection errors, active connections, memory utilization, network throughput
- Alert configuration for cache degradation (Slack notifications)
- VPN-only access with AWS SSO authentication

**Packages Affected:**
- Infrastructure code (CDK/Terraform) - Prometheus, Grafana, CloudWatch Exporter
- `apps/api/lego-api/core/monitoring/` - CloudWatch metric namespace configuration
- Grafana dashboard JSON: `infrastructure/grafana/dashboards/redis-cache.json`

**Monitoring Components:**
- Prometheus: Metric collection, storage (90-day retention), query engine
- CloudWatch Exporter: Scrapes CloudWatch metrics, exposes Prometheus endpoint
- Grafana: Visualization, dashboards, alerting via Slack

**Benefits:**
- Long-term metric retention (90 days vs. CloudWatch 15 days)
- Advanced analytics and custom dashboards
- Cross-service metric correlation
- Centralized observability for all Redis-backed services
- Proactive alerting for cache performance issues

**Acceptance Criteria:** 10 ACs covering Prometheus deployment, CloudWatch Exporter configuration, Grafana setup, cache performance dashboard (6 panels), alert rules, 90-day retention, IAM permissions, access control, cost monitoring, and dashboard version control.

**Complexity:** Medium (Monitoring Infrastructure + Dashboard + Alerting)

**Effort:** 3 points

**Priority:** P2 (Observability enhancement for production scaling)

**Goal:** Provide production-grade observability for Redis cache infrastructure with long-term trend analysis, custom dashboards, and proactive alerting.

**Risks:**
- CloudWatch API rate limiting (mitigated by 1-minute scrape interval and batching)
- Prometheus storage exhaustion (mitigated by 50 GB EBS, 90-day retention, monitoring)
- Grafana dashboard complexity (mitigated by starting with 6 essential panels)
- Infrastructure cost overruns (mitigated by billing alarms, Fargate spot instances)

### Source

Follow-up from QA Elaboration of WISH-2124 (Enhancement Opportunity #4)

**Original Finding:** "Cache analytics dashboard (Grafana/Prometheus integration)"

**Category:** Enhancement Opportunity
**Impact:** Medium (observability improvement)
**Effort:** Medium (new monitoring infrastructure)

**Story File:** _(deleted - deferred)_

---

## WISH-20330: Cache warming strategy (pre-populate on cold start, CloudWatch triggers)

**Status:** deferred
**Depends On:** WISH-2124
**Follow-up From:** WISH-2124
**Phase:** 2 - Core Infrastructure

### Scope

Implement proactive cache warming for feature flags to eliminate cold start cache misses and maintain consistently high cache hit rates across deployments and Lambda scaling events. Pre-populate frequently accessed flags before user requests arrive.

**Features:**
- CacheWarmer service for proactive flag loading
- Batch Redis operations (pipeline) for efficient warming
- Scheduled warming via EventBridge (hourly triggers)
- Post-deployment warming hook
- Cold start warming strategy (background task)
- Manual admin warming endpoint (`POST /api/admin/cache/warm`)
- CloudWatch metrics for warming observability

**Packages Affected:**
- `apps/api/lego-api/domains/config/application/cache-warmer.ts` - New cache warming service
- `apps/api/lego-api/domains/config/adapters/redis-cache-adapter.ts` - Add `setMany()` batch operation
- `apps/api/lego-api/infrastructure/lambdas/warm-cache-handler.ts` - Scheduled warming Lambda
- EventBridge schedule rule (hourly warming trigger)
- Lambda post-deployment hook

**Endpoints:**
- `POST /api/admin/cache/warm` - Manual warming trigger (admin only)

**Infrastructure:**
- EventBridge schedule: `rate(1 hour)` for periodic warming
- Lambda post-deployment hook: Warm cache before traffic shift
- CloudWatch metrics: `cache_warming_duration`, `cache_warming_flags_count`, `cache_warming_errors`

**Acceptance Criteria:** 12 ACs covering CacheWarmer service, batch Redis pipeline, top flags selection, scheduled/post-deployment/cold-start warming, admin endpoint, metrics, error handling, and performance validation

**Complexity:** Medium (infrastructure orchestration + cache preloading logic)

**Effort:** 3 points

**Priority:** P2 (Performance enhancement for Phase 2)

### Source

Follow-up from QA Elaboration of WISH-2124 (Enhancement Opportunity #2)

**Original Finding:** "Cache warming on deployment - Pre-populating cache on cold start adds complexity. MVP relies on lazy population (cache-on-read)."

**Category:** Enhancement Opportunity
**Impact:** Medium (reduces cold start latency, improves cache hit rates from ~80% to >95%)
**Effort:** Medium (requires infrastructure orchestration)

---

## WISH-20360: Automated Migration Rollback Testing

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-20180
**Phase:** 3 - Infrastructure

### Scope

Implement automated CI testing that verifies database migrations can be successfully rolled back. For each migration in a PR, create a temporary test database, apply the migration, execute the rollback, and verify the database returns to the pre-migration state.

**Features:**
- Test database provisioning (Docker container with PostgreSQL)
- Migration apply/rollback cycle testing
- Schema state comparison (pre-migration vs post-rollback)
- Data integrity validation (test data preserved after rollback)
- CI workflow integration (GitHub Actions)
- Rollback SQL requirement enforcement

**Packages Affected:**
- `.github/workflows/` - New CI workflow for rollback testing
- `packages/backend/database-schema/scripts/` - Rollback test script implementation
- `packages/backend/database-schema/docs/` - Rollback testing documentation
- `packages/backend/database-schema/migrations/` - Migration format with rollback SQL

**Testing:**
- Ephemeral PostgreSQL database creation
- Schema comparison (tables, columns, indexes, constraints)
- Data integrity checks (test data preservation)
- CI integration (PR comment generation, pass/fail behavior)

**Acceptance Criteria:** 20 ACs covering test infrastructure setup (5 ACs), rollback execution and verification (5 ACs), data integrity validation (3 ACs), CI workflow integration (4 ACs), and documentation (3 ACs)

**Complexity:** Medium (test infrastructure + schema comparison + CI integration)

**Effort:** 3 points

**Priority:** P2 (Migration safety enhancement for production deployments)

**Goal:** Catch irreversible migrations before production deployment by automatically testing rollback procedures in CI.

**Risks:**
- Test database provisioning complexity (mitigated by GitHub Actions service containers)
- Schema comparison false positives (mitigated by normalized schema representations)
- Slow CI execution (mitigated by test optimization, 60s timeout target)

### Source

Follow-up from QA Elaboration of WISH-20180 (Enhancement Opportunity #1)

**Original Finding:** "Automated migration rollback testing (test database creation and rollback verification)"

**Category:** Enhancement Opportunity
**Impact:** High (prevents irreversible migrations, reduces rollback risk)
**Effort:** Medium (test infrastructure + schema comparison)

**Story File:** _(deleted - deferred)_

---

## WISH-20560: Real-time Compression Preview Before Upload

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-2046
**Phase:** 5 - UX Polish

### Scope

Add real-time compression preview that shows users the exact compressed image and file size before upload, enabling informed preset selection decisions. Addresses the limitation of approximate estimates in WISH-2046 by showing actual compression results.

**Features:**
- Real-time preview component with before/after image comparison
- Side-by-side comparison layout (desktop) or stacked layout (mobile)
- Shows original vs compressed image with actual file size labels
- Preview automatically re-compresses when user changes preset
- Web Worker compression to avoid blocking UI thread
- "Use this compression" confirmation button to proceed with upload
- Caches compressed blob for reuse during actual upload

**UI/UX:**
- Preview appears after image selection, before form submission
- Each preview pane shows image label and file size with percentage reduction
- Loading spinner during re-compression (target < 1 second)
- Handles edge cases: compression failure, small images, skip compression checkbox
- Keyboard accessible with proper ARIA labels

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/components/CompressionPreview/` - Preview component (new)
- `apps/web/app-wishlist-gallery/src/hooks/useCompressionPreview.ts` - Preview hook (new)
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/` - Integration
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Reuse compression logic

**Acceptance Criteria:** 24 ACs covering core preview functionality (6 ACs), preset integration (5 ACs), UI/UX requirements (7 ACs), performance optimization (5 ACs), edge cases (4 ACs), and testing/documentation (5 ACs)

**Complexity:** High (dual image preview, Web Worker integration, real-time re-compression)

**Effort:** 5 points

**Priority:** P3 (Phase 5+ enhancement, validates need after WISH-2046 adoption)

### Source

Follow-up from QA Elaboration of WISH-2046 (Enhancement Opportunities - Finding #3)

**Original Finding:** "Real-time compression preview before upload - Future enhancement. Would improve decision-making but is high-effort."

**Category:** Enhancement Opportunity
**Impact:** High (significantly improves user understanding and confidence in compression decisions)
**Effort:** High (dual image preview, on-the-fly compression, comparison UI)

---

## WISH-20580: Compression Telemetry per Preset

**Status:** deferred
**Depends On:** WISH-2023
**Follow-up From:** WISH-2046
**Phase:** 5 - Future Enhancements

### Scope

Track compression telemetry metrics per preset to enable data-driven analysis of preset usage and effectiveness from WISH-2046. Integrates with WISH-2023 telemetry infrastructure to track which presets are most frequently used, compression ratios per preset, and user satisfaction.

**Features:**
- Compression telemetry events include `preset` field with preset name
- Track original size, compressed size, compression ratio per preset
- Track compression duration and success/failure per preset
- Track preset selection changes and compression skip events
- Track auto-skip and fallback events per preset
- Integration with existing WISH-2023 telemetry infrastructure

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Emit telemetry with preset metadata
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Track preset selection in upload flow

**Acceptance Criteria:** 12 ACs covering telemetry event schema, preset metadata tracking, success/failure/skip/fallback tracking, integration with WISH-2023, test coverage, and documentation

**Complexity:** Small (extends existing telemetry infrastructure)

**Effort:** 2 points

**Priority:** P3 (Data collection for future preset optimization)

### Source

Follow-up from QA Elaboration of WISH-2046 (Enhancement Opportunity #4)

**Original Finding:** Compression telemetry per preset - Could integrate with WISH-2023 telemetry tracking

**Category:** Enhancement Opportunity
**Impact:** Medium (Provides data-driven insights into preset usage and compression effectiveness)
**Effort:** Low (Extends existing WISH-2023 telemetry infrastructure with preset-specific metrics)

**Story File:** _(deleted - deferred)_

---

## WISH-20590: Migrate Accessibility Hooks to @repo/accessibility

**Status:** deferred
**Depends On:** WISH-2006
**Follow-up From:** WISH-2006
**Phase:** 5 - Future Enhancements

### Scope

Migrate proven accessibility hooks (useRovingTabIndex, useKeyboardShortcuts, useAnnouncer) from app-wishlist-gallery to shared @repo/accessibility package for reuse across all React apps. Enables consistent accessibility patterns across the platform and reduces code duplication.

**Features:**
- Move useRovingTabIndex, useKeyboardShortcuts, useAnnouncer from app-local to shared package
- Export all three hooks from @repo/accessibility barrel export
- Update app-wishlist-gallery imports to use shared package
- Migrate unit tests to shared package location
- Add TSDoc documentation and usage examples for each hook
- Update @repo/accessibility README with new exports

**Packages Affected:**
- `packages/core/accessibility` - Add three new hook exports with documentation
- `apps/web/app-wishlist-gallery` - Update imports to use @repo/accessibility

**Acceptance Criteria:** 7 ACs covering file migration, barrel exports, import updates, test migration, documentation, no breaking changes, and regression testing

**Complexity:** Small (straightforward refactor with zero user-facing impact)

**Effort:** 3 points

**Priority:** P3 (Improves developer experience and code reuse)

### Source

Follow-up from QA Elaboration of WISH-2006 (Enhancement Opportunity #1)

**Original Finding:** Migrate accessibility hooks to @repo/accessibility package once proven in production

**Category:** Enhancement Opportunity
**Impact:** Medium (Enables reuse of accessibility patterns across multiple apps)
**Effort:** Low (Straightforward migration of proven utilities to shared package)

**Story File:** _(deleted - deferred)_

---

## WISH-20600: WCAG AAA Compliance for Wishlist Gallery

**Status:** deferred
**Depends On:** WISH-2006
**Follow-up From:** WISH-2006
**Phase:** 5 - Accessibility

### Scope

Enhance the wishlist gallery with configurable WCAG AAA compliance mode, providing 7:1 contrast ratios for all text and UI elements. Currently, WISH-2006 implements WCAG AA standards (4.5:1 contrast). This story adds optional AAA mode for enterprise customers or government organizations requiring stricter compliance without compromising existing AA implementation.

**Features:**
- AAA color variants with 7:1 contrast for normal text, 4.5:1 for large text
- Configuration via `WCAG_MODE` environment variable (AA or AAA)
- Runtime configuration hooks (`useWcagMode`, `useContrastColors`)
- axe-core AAA compliance validation
- No breaking changes to existing WCAG AA mode

**Packages Affected:**
- `apps/web/app-wishlist-gallery` - Add AAA color variants and configuration
- `packages/core/design-system` - Add AAA-compliant color tokens (if needed)

**Acceptance Criteria:** 14 ACs covering AAA contrast ratios, configuration, design system compliance, and testing

**Complexity:** Medium (color palette extension with configuration layer)

**Effort:** 3 points

**Priority:** P3 (Enhancement for enterprise/government compliance requirements)

### Source

Follow-up from QA Elaboration of WISH-2006 (Enhancement Opportunity #3)

**Original Finding:** Add WCAG AAA compliance (7:1 contrast) if required by enterprise customers

**Category:** Enhancement Opportunity
**Impact:** Medium (Enables enterprise/government compliance, benefits users with low vision)
**Effort:** Medium (Requires color palette audit and AAA variant creation)

**Story File:** _(deleted - deferred)_

---

## WISH-20610: Automated Screen Reader Testing with @guidepup

**Status:** deferred
**Depends On:** WISH-2006
**Follow-up From:** WISH-2006
**Phase:** 5 - Accessibility

### Scope

Add automated screen reader testing using @guidepup to verify accessibility announcements, ARIA labels, and keyboard navigation work correctly with real screen readers (VoiceOver on macOS, NVDA on Windows). Builds on WISH-2006 manual testing by adding automated regression coverage for screen reader UX.

**Features:**
- Automated VoiceOver tests on macOS (via @guidepup)
- Automated NVDA tests on Windows (via @guidepup)
- CI/CD integration with macOS and Windows runners
- Test coverage for all announcements from WISH-2006 (gallery navigation, priority changes, item deletion, modal interactions)
- Reusable test helpers for screen reader assertions

**Packages Affected:**
- `apps/web/app-wishlist-gallery/e2e/screen-reader.spec.ts` - New test suite
- `.github/workflows/ci.yml` - Add macOS/Windows runners

**Acceptance Criteria:** 16 ACs covering VoiceOver/NVDA test coverage, CI integration, test maintainability, and regression detection

**Complexity:** Medium (requires screen reader automation and CI runner setup)

**Effort:** 3 points

**Priority:** P2 (Improves accessibility test coverage and regression detection)

### Source

Follow-up from QA Elaboration of WISH-2006 (Enhancement Opportunity #4)

**Original Finding:** "Automated screen reader testing (@guidepup) - Manual testing sufficient for MVP. Consider once @guidepup library matures."

**Category:** Enhancement Opportunity
**Impact:** Medium (Catches screen reader regressions in CI, improves accessibility test coverage)
**Effort:** Medium (Requires @guidepup integration and CI runner configuration)

**Story File:** _(deleted - deferred)_

---

## SETS-MVP-0360: Build History and Date Tracking

**Status:** deferred
**Depends On:** SETS-MVP-004
**Follow-up From:** SETS-MVP-004
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Track and display build completion dates and maintain a history of build status changes over time. Extends SETS-MVP-004 (Build Status Toggle) to add temporal context for when items were marked as built.

**Feature:** Database schema additions for `build_completed_at` timestamp and `wishlist_item_build_history` table, backend service updates to track status changes, and frontend components to display "Built on [date]" badges and optional build history timeline.

**Goal:** Enable users to see when they marked items as built and maintain a history of build status changes over time, providing timeline context for their collection.

**Dependencies:** SETS-MVP-004 (Build Status Toggle must be completed first)

**Acceptance Criteria:** 37 ACs covering:
- Database Schema (AC1-7): build_completed_at column, build_history table, indexes, Drizzle/Zod schemas
- Backend Service Layer (AC8-12): updateBuildStatus enhancements, getBuildHistory method, authorization
- API Response Updates (AC13-15): include build_completed_at in responses
- Frontend Display - Build Date Badge (AC16-19): date badge on cards, formatting, positioning
- Frontend Display - Item Detail (AC20-22): date display in detail view, relative time
- Build History Timeline (AC23-27): collapsible history section, chronological list, empty state
- Backend Testing (AC28-29): .http tests, unit tests for history retrieval
- Migration & Rollback (AC30-32): safe migration, rollback script, null initial values
- Type Safety (AC33-35): TypeScript types, Zod schemas
- Accessibility (AC36-37): ARIA labels, keyboard navigation

**Risk Notes:** Medium complexity; requires database migration and careful timestamp handling. Build history timeline is optional for MVP. All schema changes are additive (no data loss risk).

**Source:** Follow-up from QA Elaboration of SETS-MVP-004 (Finding #2: "Build history and date tracking")

**Story File:** `plans/future/wish/backlog/SETS-MVP-0360/SETS-MVP-0360.md`

---

## SETS-MVP-0350: Batch Build Status Updates

**Status:** deferred
**Depends On:** SETS-MVP-004
**Follow-up From:** SETS-MVP-004
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Enable batch build status updates allowing users to mark multiple collection items as built or in pieces simultaneously, with progress feedback, error handling, and undo support.

**Feature:** Multi-select UI for collection items, batch API endpoint for updating multiple items at once, progress indicator for batch operations, partial failure handling with detailed error reporting, and undo support for batch operations.

**Goal:** Improve UX efficiency for users managing large collections by enabling batch operations instead of updating items one at a time.

**Dependencies:** SETS-MVP-004 (Build Status Toggle - requires buildStatus field and single-item toggle functionality)

**Source:** Follow-up from QA Elaboration of SETS-MVP-004 - Finding #1: "Batch build status updates (mark multiple items as built in one action)"

**Acceptance Criteria:** 49 ACs covering:
- Multi-select UI (AC1-5): checkboxes, visual feedback, selection count
- Batch Action Toolbar (AC6-10): sticky toolbar, action buttons, keyboard accessibility
- Selection Modes (AC11-14): select mode toggle, keyboard shortcuts
- Batch API Endpoint (AC15-19): PATCH /api/wishlist/batch/build-status, validation, transaction processing
- Progress Feedback (AC20-23): progress indicator, summary toast, partial failure warnings
- Error Handling (AC24-27): complete/partial failure handling, error details, retry support
- Undo Support (AC28-31): undo button, revert functionality, extended toast duration
- Optimistic Updates (AC32-34): immediate UI updates, selective revert on errors
- Backend Service Layer (AC35-37): batchUpdateBuildStatus service method
- Input Validation & Schema (AC38-40): BatchBuildStatusInputSchema with Zod
- Backend Testing (AC41-42): .http test file, unit tests
- Accessibility (AC43-46): ARIA labels, screen reader announcements, focus management
- Performance (AC47-49): 50 item limit, warning for oversized batches, parallel processing

**Risk Notes:** Medium complexity - requires handling partial failures and maintaining consistent state between client and server. Performance considerations for large batches.

**Story File:** `plans/future/wish/backlog/SETS-MVP-0350/SETS-MVP-0350.md`

---

## SETS-MVP-0370: Build Status Analytics

**Status:** deferred
**Depends On:** SETS-MVP-004
**Follow-up From:** SETS-MVP-004
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Collection-level build status analytics showing completion percentage, built vs in_pieces breakdown, and filtering capabilities.

**Feature:** Stats card displaying collection completion metrics (total owned, total built, percentage complete), visual progress indicator (bar or pie chart), and build status filter to show only built or only unbuilt items.

**Goal:** Help users understand their collection progress at a glance and motivate them to build more sets by showing meaningful statistics.

**Dependencies:** SETS-MVP-004 (Build Status Toggle - requires buildStatus field and toggle functionality)

**Source:** Follow-up from QA Elaboration of SETS-MVP-004 - Enhancement opportunity identified during elaboration

**Acceptance Criteria:**
- Backend stats calculation service method with database aggregation
- GET /api/wishlist/collection/stats endpoint returning completion metrics
- CollectionStatsCard component with total/built/in_pieces counts and percentage
- Visual progress bar or pie chart showing built vs in_pieces ratio
- Build status filter dropdown with URL persistence
- Empty states for no owned items, all built, no built items
- Accessibility compliance (ARIA labels, keyboard navigation)

**Story File:** `plans/future/wish/backlog/SETS-MVP-0370/SETS-MVP-0370.md`

---

## SETS-MVP-0380: WISH-2004 Endpoint Deprecation and Migration Strategy

**Status:** deferred
**Depends On:** SETS-MVP-0310
**Follow-up From:** SETS-MVP-0310
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Documentation-only story to define deprecation timeline and migration strategy for the legacy WISH-2004 endpoint (`POST /api/wishlist/:id/purchased`) after SETS-MVP-0310 implements the unified model approach.

**Feature:** Migration strategy document covering deprecation timeline, feature flag approach, service layer conflict resolution, consumer notification plan, and rollback strategy.

**Goal:** Document a clear deprecation timeline and migration strategy for the WISH-2004 endpoint to ensure smooth transition to the unified model approach with minimal disruption to consumers.

**Dependencies:** SETS-MVP-0310 (Status Update Flow - must complete implementation before deprecation can occur)

**Source:** Follow-up from QA Elaboration of SETS-MVP-0310 - Gap identified during elaboration (Finding #1: "WISH-2004 migration strategy undefined")

**Acceptance Criteria:**
- Migration strategy document with deprecation timeline, specific dates/phases
- Feature flag approach specified or explanation of why not needed
- Service layer resolution strategy for `markAsPurchased()` method conflict
- Consumer notification plan with communication templates
- Consumer migration guide with code examples showing old vs new approach
- Rollback plan with specific trigger conditions and procedures
- Document reviewed by backend and frontend engineers
- Monitoring/metrics plan to track migration progress
- Backward compatibility constraints documented

**Story File:** `plans/future/wish/backlog/SETS-MVP-0380/SETS-MVP-0380.md`

---

## SETS-MVP-0400: Consumer Notification and Migration Guide for API Endpoint Transition

**Status:** deferred
**Depends On:** SETS-MVP-0310
**Follow-up From:** SETS-MVP-0310
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Create comprehensive migration documentation and establish notification strategy to guide API consumers through the transition from `POST /api/wishlist/:id/purchased` to `PATCH /api/wishlist/:id/purchase`.

**Feature:** API migration guide documenting behavioral differences, request/response schema changes, and migration steps; consumer notification plan covering channels, timing, and stakeholders; API documentation updates with deprecation notices.

**Goal:** Ensure smooth adoption of the unified model approach by providing clear migration guidance and proactive communication to all API consumers.

**Dependencies:** SETS-MVP-0310 (Status Update Flow - must be implemented before migration documentation is finalized)

**Source:** Follow-up from QA Elaboration of SETS-MVP-0310 - Enhancement opportunity identified during elaboration (Finding #3: "Consumer notification strategy for API transition")

**Acceptance Criteria:**
- Migration guide documenting behavioral differences between old and new endpoints
- Request/response schema change documentation with code examples
- Migration timeline and deprecation schedule documented
- Feature flag behavior documented (if applicable)
- Notification channels and timing defined
- All API consumers identified (GotItModal, external consumers)
- Notification message templates created
- API documentation updated with deprecation notices
- New endpoint documentation with migration guide links
- API changelog updated with migration information

**Story File:** `plans/future/wish/backlog/SETS-MVP-0400/SETS-MVP-0400.md`

---
