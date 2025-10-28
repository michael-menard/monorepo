# Microservices Architecture Migration - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2025-01-27
**Author:** Winston (System Architect)
**Status:** Draft - Awaiting Prioritization

---

## Executive Summary

This PRD outlines a phased migration strategy to decompose the LEGO Projects API monolith into a microservices architecture. The migration follows Domain-Driven Design (DDD) principles, respecting aggregate boundaries while extracting independent bounded contexts. The approach uses the **Strangler Fig Pattern** to minimize risk and maintain development velocity during the transition.

**Key Benefits:**
- **Independent Scaling**: Scale file processing and search independently from CRUD operations
- **Team Autonomy**: Enable parallel development across domain teams
- **Technology Flexibility**: Use optimal tech stacks per service (e.g., Go for CPU-intensive parsing)
- **Fault Isolation**: Service failures don't cascade to entire platform
- **Deployment Velocity**: Deploy services independently without monolith rebuild

**Migration Scope**: 3 phases over 9-12 months, extracting 8 microservices from current monolith.

---

## Goals and Background Context

### Goals

1. **Scalability**: Enable independent scaling of CPU-intensive workloads (file processing, search indexing) separate from database-bound CRUD operations
2. **Team Velocity**: Support multiple teams working on different domains without merge conflicts and deployment coordination overhead
3. **Technology Optimization**: Use specialized technology where beneficial (Python/Go for file parsing, dedicated search infrastructure)
4. **Operational Excellence**: Improve observability, reduce blast radius of failures, enable canary deployments per service
5. **Cost Efficiency**: Right-size infrastructure per workload instead of scaling entire monolith
6. **Maintainability**: Enforce clear domain boundaries, reduce coupling, improve testability

### Background Context

The LEGO Projects API currently operates as a **modular monolith** with the following characteristics:

**Current Architecture:**
- **Single codebase**: All features in `apps/api/lego-projects-api`
- **Shared database**: PostgreSQL with 10 tables (`moc_instructions`, `gallery_images`, `wishlist_items`, etc.)
- **Monolithic deployment**: Single ECS service, deployed as one unit
- **Shared infrastructure**: Redis, Elasticsearch, S3 accessed directly by all handlers
- **Domain modules**: Code organized by domain (MOC, Gallery, Profile, Wishlist) but tightly coupled

**Pain Points Driving Migration:**
1. **File Processing Bottleneck**: Parts list parsing (BrickLink XML, Rebrickable CSV) blocks API response threads, causing timeouts under load
2. **Search Performance**: Elasticsearch indexing on write path slows down MOC creation by 300-500ms
3. **Deployment Risk**: Single bug in wishlist feature requires full API redeploy, risking MOC/Gallery stability
4. **Scaling Inefficiency**: Must scale entire API to handle file upload spikes, over-provisioning for simple CRUD operations
5. **Team Coordination**: 3+ developers working on different domains experience frequent merge conflicts
6. **Technology Lock-in**: Cannot use specialized tools (Go for parsing performance, Python for ML-based part recognition) without introducing them to entire monolith

**Why Now?**
- User base growing 40% MoM, file upload volume increasing faster than CRUD operations
- Team expanding from 2 to 5+ developers, collaboration friction increasing
- Product roadmap includes ML features (part recognition from images) that don't belong in Node.js monolith

### Success Metrics & KPIs

#### Technical Performance Metrics

**Scalability:**
- **File Processing Throughput**: Increase from 10 concurrent uploads (current) to 100+ concurrent uploads without degrading API response times (Target: <200ms p95 for CRUD ops during file upload spike)
- **Search Latency**: Reduce MOC creation time by 60% by moving Elasticsearch indexing off critical path (Target: <500ms p95 for POST /api/mocs)
- **Independent Scaling**: Achieve 3x file processing capacity without scaling database/CRUD tier (measured via separate ECS task counts)

**Reliability:**
- **Blast Radius Reduction**: Limit service failures to single domain (Target: Gallery service outage does NOT impact MOC CRUD operations)
- **Deployment Success Rate**: Increase from 85% (monolith) to 95%+ (microservices) due to reduced scope per deployment
- **Recovery Time Objective (RTO)**: Reduce from 15 minutes (full monolith restart) to <2 minutes (single service rollback)

**Development Velocity:**
- **Deployment Frequency**: Increase from 2-3 deploys/week (monolith) to 10+ deploys/week (services deployed independently)
- **Lead Time for Changes**: Reduce from 3-5 days (feature branch → production) to 1-2 days (smaller PRs, faster CI/CD)
- **Merge Conflict Rate**: Reduce by 70% (measured via Git metrics - conflicts per PR)

#### Business Impact Metrics

**Cost Efficiency:**
- **Infrastructure Cost per Request**: Reduce by 30% through right-sized service provisioning (baseline: current AWS spend / monthly API requests)
- **Developer Productivity**: Increase feature output by 40% measured by story points/sprint (baseline: current 6-month average)

**User Experience:**
- **Upload Success Rate**: Maintain 99.5%+ success rate during migration (no regression)
- **API Response Time (p95)**: Improve CRUD operations from 450ms to <200ms by removing file processing from critical path
- **Search Availability**: Improve from 95% (shared monolith) to 99.9% (dedicated search service with circuit breakers)

#### Migration Health Metrics

**Phase 1 (Months 1-3):**
- Zero production incidents caused by migration
- Wishlist + Profile services handling 100% of traffic with <1% error rate
- Team completes 2+ features in extracted services (validates independent development)

**Phase 2 (Months 4-6):**
- File Processing service handles 80%+ of uploads (vs. legacy monolith fallback)
- Search service indexing latency <5 seconds (p95) for new MOCs
- Infrastructure cost neutral or improved (no cost increase from added services)

**Phase 3 (Months 7-12):**
- All 8 services deployed independently with <5% error budget consumed
- Monolith fully retired or reduced to orchestration layer only
- Team productivity metrics show 35%+ improvement over baseline

**Success Threshold:**
- **MVP Success**: Phase 1 completes with zero rollbacks and 95%+ of KPIs met
- **Full Success**: All 8 services in production by Month 12 with error rates <1%
- **Go/No-Go Decision Point**: After Phase 1, evaluate whether benefits justify continued investment

### Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Distributed Transaction Complexity** | High | High | Use Saga pattern with compensating transactions; start with read-only services (Profile, Wishlist) |
| **Service Discovery/Networking Issues** | Medium | High | Implement API Gateway early; use AWS App Mesh or service mesh; extensive integration testing |
| **Data Consistency Across Services** | High | Medium | Event-driven architecture with idempotent consumers; eventual consistency acceptable for non-critical paths |
| **Increased Operational Overhead** | High | Medium | Invest in observability (DataDog/New Relic); centralized logging; automated deployment pipelines |
| **Performance Regression (Network Hops)** | Medium | High | API Gateway caching; service co-location in same VPC; gRPC for inter-service calls |
| **Team Learning Curve** | Medium | Medium | Training sessions on microservices patterns; pair programming during Phase 1; architecture guild |
| **Partial Migration Complexity** | High | Low | Maintain clear service boundaries; use feature flags; monolith calls services via API (not shared DB) |

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-27 | 1.0 | Initial PRD for microservices migration | Winston (Architect) |

---

## Domain Analysis & Service Boundaries

### Current Monolith Architecture

**Database Tables (PostgreSQL):**
```
gallery_images          → Gallery Service
gallery_albums          → Gallery Service
gallery_flags           → Gallery Service
moc_instructions        → MOC Management Service
moc_files               → MOC Management Service
moc_parts_lists         → MOC Management Service
moc_gallery_images      → Join table (requires refactoring)
moc_gallery_albums      → Join table (requires refactoring)
wishlist_items          → Wishlist Service
user_profiles*          → Profile Service
```
*Currently in Auth Service (MongoDB) - may migrate to PostgreSQL

**Code Organization:**
```
src/
├── routes/
│   ├── index.ts              → Gallery routes
│   ├── moc-instructions.ts   → MOC routes
│   ├── wishlist.ts           → Wishlist routes
│   └── profile-routes.ts     → Profile routes
├── handlers/
│   ├── gallery.ts
│   ├── moc.ts
│   ├── moc-parts-lists.ts
│   ├── wishlist.ts
│   └── profile.ts
├── storage/
│   ├── s3.ts                 → File Storage Service
│   ├── moc-storage.ts
│   ├── avatar-storage.ts
│   └── wishlist-storage.ts
└── utils/
    ├── redis.ts              → Caching (cross-cutting)
    └── elasticsearch.ts      → Search Service
```

### Bounded Contexts & Aggregates

#### **1. MOC Management Context** (Core Domain)

**Aggregate Root**: `MOC Instruction`

**Entities**:
- MOC Instruction (root)
- MOC Files (child)
- Parts Lists (child)

**Value Objects**:
- Gallery Image References (IDs only)
- Build Metadata (author, theme, piece count)

**Invariants**:
- Parts list must belong to a MOC
- Total piece count = sum of all parts lists
- At least one instruction file required for "complete" MOC

**Domain Events**:
- `MocCreated`, `MocUpdated`, `MocDeleted`
- `PartsListAdded`, `PartsListUpdated`
- `BuildStatusChanged` (0% → 100% parts acquired)

---

#### **2. Gallery Context** (Supporting Domain)

**Aggregate Root**: `Gallery Image`

**Entities**:
- Gallery Image (root)
- Image Flags (child)

**Aggregate Root**: `Gallery Album`

**Entities**:
- Gallery Album (root)
- Cover Image Reference (value object)

**Invariants**:
- Images can exist without albums (null albumId allowed)
- Album cover image must be one of album's images
- Flagged images hidden from public gallery

**Domain Events**:
- `ImageUploaded`, `ImageDeleted`, `ImageFlagged`
- `AlbumCreated`, `AlbumUpdated`

**Cross-Context Dependencies**:
- MOC Management Context references Gallery Images (read-only)
- Gallery Context unaware of MOC Context

---

#### **3. Wishlist Context** (Supporting Domain)

**Aggregate Root**: `Wishlist Item`

**Entities**:
- Wishlist Item (root)

**Invariants**:
- Sort order must be unique per user
- Category values from predefined list (LEGO themes)

**Domain Events**:
- `WishlistItemAdded`, `WishlistItemUpdated`, `WishlistItemDeleted`
- `WishlistReordered`

**Cross-Context Dependencies**:
- **None** - completely independent bounded context

---

#### **4. Profile Context** (Generic Subdomain)

**Aggregate Root**: `User Profile`

**Entities**:
- User Profile (root)

**Value Objects**:
- Avatar URL
- Display Preferences

**Invariants**:
- userId must match Auth Service userId
- Avatar must pass content validation

**Domain Events**:
- `ProfileCreated`, `ProfileUpdated`, `AvatarChanged`

**Cross-Context Dependencies**:
- Auth Service (MongoDB) owns user identity
- Profile Service extends with additional attributes

---

#### **5. File Processing Context** (Generic Subdomain)

**Responsibilities**:
- Parse parts list files (BrickLink XML, Rebrickable CSV, LEGO.com)
- Extract part metadata (part number, color, quantity)
- Validate against LEGO parts catalog
- Calculate totals and cost estimates
- Asynchronous processing with status tracking

**Domain Events**:
- `FileUploadReceived`, `ParsingStarted`, `ParsingCompleted`, `ParsingFailed`

**Cross-Context Dependencies**:
- MOC Management Context triggers file parsing
- File Processing publishes results back to MOC Management

---

#### **6. Inventory Tracking Context** (Core Domain - Future)

**Aggregate Root**: `Inventory Item`

**Entities**:
- Inventory Item (root)
- Purchase Records (child)

**Invariants**:
- Acquired count ≤ total count
- Cost tracking optional but immutable once set

**Domain Events**:
- `PartsAcquired`, `PartsPurchased`, `InventoryUpdated`

**Cross-Context Dependencies**:
- Can track inventory for MOC parts, wishlist items, or sets
- Source-agnostic design (polymorphic source references)

---

#### **7. Search & Discovery Context** (Generic Subdomain)

**Responsibilities**:
- Full-text search across MOCs, sets, gallery images
- Autocomplete suggestions
- Faceted filtering (theme, author, piece count ranges)
- Search analytics

**Domain Events**:
- Subscribes to: `MocCreated`, `MocUpdated`, `MocDeleted`, `ImageUploaded`
- Publishes: `SearchQueryExecuted`, `SearchResultsServed`

**Cross-Context Dependencies**:
- Read-only denormalized views of all contexts
- Eventually consistent (5-10 second lag acceptable)

---

#### **8. File Storage Context** (Generic Subdomain)

**Responsibilities**:
- S3 upload/download orchestration
- Signed URL generation
- Image processing (resize, compress, watermark)
- Virus scanning integration
- Storage quota management

**Domain Events**:
- `FileStored`, `FileDeleted`, `FileProcessed`

**Cross-Context Dependencies**:
- All contexts use File Storage for media assets
- Stateless service (no domain logic, pure infrastructure)

---

## Target Microservices Architecture

### Service Inventory

| # | Service Name | Port | Database | Infrastructure | Team Ownership |
|---|--------------|------|----------|----------------|----------------|
| 1 | **MOC Management Service** | 9100 | PostgreSQL (moc_instructions, moc_files, moc_parts_lists) | Redis, S3 | Core Domain Team |
| 2 | **Gallery Service** | 9200 | PostgreSQL (gallery_images, gallery_albums, gallery_flags) | Redis, S3 | Content Team |
| 3 | **Profile Service** | 9300 | PostgreSQL (user_profiles) OR MongoDB (TBD) | S3 | Identity Team |
| 4 | **Wishlist Service** | 9400 | PostgreSQL (wishlist_items) | Redis, S3 | Features Team |
| 5 | **File Processing Service** | 9500 | PostgreSQL (file_processing_jobs) | S3, SQS | Platform Team |
| 6 | **Inventory Tracking Service** | 9600 | PostgreSQL (inventory_items, purchase_records) | Redis | Core Domain Team (Future) |
| 7 | **Search Service** | 9700 | Elasticsearch/OpenSearch | Redis | Platform Team |
| 8 | **File Storage Service** | 9800 | None (stateless) | S3, CloudFront | Platform Team |

**Additional Components:**
- **API Gateway**: Kong, AWS API Gateway, or custom Express gateway (Port 9000)
- **Event Bus**: AWS EventBridge, RabbitMQ, or Kafka
- **Service Mesh**: AWS App Mesh or Istio (optional, evaluate in Phase 2)

---

## Requirements

### Functional Requirements

#### FR1: Service Independence

**FR1.1**: Each microservice shall have its own dedicated database schema or database instance, with no shared tables across services.

**FR1.2**: Services shall communicate exclusively via documented APIs (REST or gRPC) or asynchronous events; direct database access across service boundaries is prohibited.

**FR1.3**: Each service shall be independently deployable without requiring coordinated deployments of other services.

**FR1.4**: Service APIs shall be versioned (e.g., `/v1/mocs`, `/v2/mocs`) to support backward compatibility during rolling deployments.

#### FR2: API Gateway

**FR2.1**: The API Gateway shall provide a unified entry point for all client requests at `https://api.legomoc.com`.

**FR2.2**: The API Gateway shall route requests to appropriate services based on URL path:
- `/api/mocs/*` → MOC Management Service
- `/api/gallery/*` → Gallery Service
- `/api/wishlist/*` → Wishlist Service
- `/api/users/*` → Profile Service
- `/api/search/*` → Search Service

**FR2.3**: The API Gateway shall validate JWT tokens once and pass verified user context to downstream services via headers (`X-User-Id`, `X-User-Email`, `X-User-Roles`).

**FR2.4**: The API Gateway shall implement rate limiting per user/IP address to protect backend services.

**FR2.5**: The API Gateway shall provide request/response logging, request correlation IDs, and circuit breaker patterns for fault tolerance.

#### FR3: Data Consistency

**FR3.1**: For operations requiring cross-service data consistency (e.g., creating MOC + linking gallery images), the system shall implement the Saga pattern with compensating transactions.

**FR3.2**: The system shall use event-driven architecture for eventual consistency where strong consistency is not required (e.g., search indexing, cache invalidation).

**FR3.3**: Each service shall publish domain events to a central event bus (EventBridge/RabbitMQ) when aggregate state changes occur.

**FR3.4**: Services shall implement idempotent event handlers to handle duplicate event delivery.

#### FR4: MOC Management Service

**FR4.1**: Shall expose REST API for MOC CRUD operations (`POST /v1/mocs`, `GET /v1/mocs/:id`, `PATCH /v1/mocs/:id`, `DELETE /v1/mocs/:id`).

**FR4.2**: Shall manage Parts Lists as sub-resources of MOCs (`POST /v1/mocs/:mocId/parts-lists`).

**FR4.3**: Shall publish events:
- `moc.created` (with MOC metadata)
- `moc.updated` (with changed fields)
- `moc.deleted` (with mocId)
- `parts-list.updated` (with new total piece count)

**FR4.4**: Shall call Gallery Service API to validate gallery image IDs before associating with MOC.

**FR4.5**: Shall call File Processing Service to parse parts list files asynchronously.

**FR4.6**: Shall maintain eventual consistency for gallery image associations (store image IDs, validate asynchronously).

#### FR5: Gallery Service

**FR5.1**: Shall expose REST API for gallery CRUD operations (`POST /v1/images`, `GET /v1/albums/:id`).

**FR5.2**: Shall publish events:
- `image.uploaded` (with imageId, userId, metadata)
- `image.deleted` (with imageId)
- `image.flagged` (with imageId, reason)

**FR5.3**: Shall provide validation endpoint (`GET /v1/images/:id/exists`) for MOC Service to check image validity.

**FR5.4**: Shall implement image flagging workflow (manual review queue) independent of MOC service.

#### FR6: Wishlist Service

**FR6.1**: Shall expose REST API for wishlist CRUD operations.

**FR6.2**: Shall implement debounced reorder API (`POST /v1/wishlist/reorder/debounced`) with 500ms debounce to handle rapid drag-and-drop.

**FR6.3**: Shall provide reorder status endpoint (`GET /v1/wishlist/reorder/status`) for optimistic UI updates.

**FR6.4**: Shall have **zero dependencies** on other domain services (completely independent).

#### FR7: Profile Service

**FR7.1**: Shall expose REST API for profile CRUD operations.

**FR7.2**: Shall sync userId with Auth Service (MongoDB) to maintain referential integrity.

**FR7.3**: Shall provide profile enrichment endpoint (`GET /v1/users/:id/public`) for other services to display user names/avatars.

**FR7.4**: Shall cache profile data in Redis with 5-minute TTL to reduce database load.

#### FR8: File Processing Service

**FR8.1**: Shall expose async API (`POST /v1/process-file`) that returns `jobId` immediately and processes file in background.

**FR8.2**: Shall support file formats:
- BrickLink XML
- Rebrickable CSV
- LEGO.com order exports
- Custom CSV format

**FR8.3**: Shall publish events:
- `file-processing.started` (jobId, fileUrl)
- `file-processing.completed` (jobId, parsedData)
- `file-processing.failed` (jobId, error)

**FR8.4**: Shall provide job status endpoint (`GET /v1/jobs/:jobId`) for polling.

**FR8.5**: Shall validate parsed data against LEGO parts catalog (part numbers, colors exist).

**FR8.6**: Shall calculate cost estimates by querying BrickLink/Rebrickable pricing APIs.

#### FR9: Search Service

**FR9.1**: Shall expose search API (`GET /v1/search?q={query}&type=moc|image|wishlist`).

**FR9.2**: Shall index data by subscribing to events:
- `moc.created`, `moc.updated`, `moc.deleted` → update MOC index
- `image.uploaded`, `image.deleted` → update image index

**FR9.3**: Shall maintain Elasticsearch indices with <10 second lag from source updates (eventual consistency).

**FR9.4**: Shall implement circuit breaker: if Elasticsearch down, return cached results or degraded search (database query).

#### FR10: File Storage Service

**FR10.1**: Shall expose internal API (`POST /internal/v1/upload`) for file uploads to S3.

**FR10.2**: Shall generate signed URLs for downloads (`GET /internal/v1/signed-url`).

**FR10.3**: Shall process images asynchronously:
- Resize to thumbnails (200x200, 400x400)
- Compress to WebP format
- Generate blurhash for progressive loading

**FR10.4**: Shall integrate virus scanning (ClamAV or AWS Macie) before confirming upload success.

**FR10.5**: Shall implement storage quotas per user (configurable, default 1GB).

---

### Non-Functional Requirements

#### NFR1: Performance

**NFR1.1**: API Gateway response time shall be <50ms p95 for routing decisions.

**NFR1.2**: CRUD operations (MOC, Gallery, Wishlist, Profile) shall respond in <200ms p95 (database round-trip + logic).

**NFR1.3**: File Processing Service shall parse parts list files in <5 seconds p95 for files <1MB.

**NFR1.4**: Search Service shall return results in <500ms p95 for queries with <1000 results.

**NFR1.5**: Event propagation shall complete within 10 seconds p95 (event published → all consumers processed).

#### NFR2: Scalability

**NFR2.1**: Each service shall scale independently via ECS auto-scaling based on CPU/memory metrics.

**NFR2.2**: File Processing Service shall scale to 100 concurrent jobs without degrading API response times.

**NFR2.3**: MOC Management Service shall handle 500 req/sec sustained load (current peak: 50 req/sec).

**NFR2.4**: Database connection pooling shall be configured per service (max 20 connections per instance).

#### NFR3: Reliability

**NFR3.1**: Each service shall have 99.9% uptime SLA (measured monthly).

**NFR3.2**: Services shall implement health check endpoints (`GET /health`) for ALB target groups.

**NFR3.3**: Services shall implement graceful shutdown (drain connections, finish in-flight requests, max 30s).

**NFR3.4**: Event consumers shall implement retry logic with exponential backoff (3 retries, then dead-letter queue).

**NFR3.5**: Services shall implement circuit breakers for external dependencies (timeout: 5s, failure threshold: 50%).

#### NFR4: Observability

**NFR4.1**: All services shall emit structured logs (JSON format) to CloudWatch Logs.

**NFR4.2**: All services shall track metrics (request count, latency, error rate) via CloudWatch or DataDog.

**NFR4.3**: All requests shall include correlation IDs (X-Correlation-Id header) propagated across service calls.

**NFR4.4**: Services shall emit distributed traces (AWS X-Ray or Jaeger) for request flows spanning multiple services.

**NFR4.5**: Dashboard shall visualize service health (error rates, latency p50/p95/p99, throughput) in real-time.

#### NFR5: Security

**NFR5.1**: Inter-service communication shall use mTLS or VPC-private networking (no public endpoints).

**NFR5.2**: API Gateway shall validate JWT tokens using shared public key from Auth Service.

**NFR5.3**: Services shall NOT trust user context from API Gateway without validating signature.

**NFR5.4**: Database credentials shall be stored in AWS Secrets Manager and rotated every 90 days.

**NFR5.5**: S3 buckets shall enforce encryption at rest (AES-256) and signed URLs for downloads.

#### NFR6: Maintainability

**NFR6.1**: Each service shall have a dedicated Git repository under monorepo (`apps/services/{service-name}`).

**NFR6.2**: Each service shall have independent CI/CD pipeline (build, test, deploy stages).

**NFR6.3**: Services shall use shared libraries for common functionality (logging, metrics, auth middleware) via npm packages.

**NFR6.4**: API contracts shall be documented using OpenAPI 3.0 and published to developer portal.

**NFR6.5**: Breaking API changes shall require new version endpoint (e.g., `/v2/mocs`) with deprecation notice for v1.

---

## Migration Strategy (Strangler Fig Pattern)

### Overview

The migration follows the **Strangler Fig Pattern**: new services are deployed alongside the monolith, gradually taking over traffic until the monolith is fully retired. This minimizes risk and allows rollback at any phase.

**Key Principles:**
1. **No Big Bang**: Services extracted incrementally, one phase at a time
2. **Feature Parity**: Each extracted service must match monolith functionality before traffic cutover
3. **Dual Running**: Monolith and services run in parallel during transition (dark launch → canary → full traffic)
4. **Data Migration Last**: Code migrated first, database split happens after traffic cutover stabilizes

---

### Phase 1: Foundation & Independent Services (Months 1-3)

**Goal**: Extract services with zero dependencies to validate architecture and tooling.

**Services Extracted:**
1. **Wishlist Service** (Week 1-4)
2. **Profile Service** (Week 5-8)
3. **API Gateway** (Week 9-12)

**Infrastructure Setup:**
- Deploy API Gateway (Kong or AWS API Gateway)
- Set up EventBridge for event bus
- Create shared npm packages:
  - `@lego-moc/auth-middleware`
  - `@lego-moc/logger`
  - `@lego-moc/metrics`
- Implement CI/CD pipeline template for services

**Deliverables:**
- [ ] Wishlist Service deployed to production handling 100% of wishlist traffic
- [ ] Profile Service deployed to production handling 100% of profile traffic
- [ ] API Gateway routing traffic to Wishlist/Profile services + monolith fallback
- [ ] Zero production incidents caused by migration
- [ ] Team trained on microservices patterns (Saga, circuit breakers, event-driven)

**Success Criteria:**
- Wishlist API response time <200ms p95
- Profile API response time <150ms p95
- Error rate <1% for extracted services
- Developer satisfaction survey: 4/5+ stars on microservices tooling

**Rollback Plan:**
- API Gateway routes 100% traffic back to monolith
- Services remain deployed for testing but receive no production traffic

---

### Phase 2: Infrastructure Services (Months 4-6)

**Goal**: Extract cross-cutting concerns to reduce complexity in domain services.

**Services Extracted:**
3. **File Storage Service** (Week 13-16)
4. **File Processing Service** (Week 17-20)
5. **Search Service** (Week 21-24)

**Key Challenges:**
- **File Processing**: Implement Saga pattern for MOC creation + file upload
- **Search Service**: Backfill Elasticsearch index from PostgreSQL
- **Dual Writes**: Monolith writes to both S3 directly AND File Storage Service during transition

**Deliverables:**
- [ ] File Storage Service handling 100% of new uploads
- [ ] File Processing Service parsing 80%+ of parts lists (fallback to monolith for unsupported formats)
- [ ] Search Service indexing all new MOCs/images within 10 seconds
- [ ] Elasticsearch backfill complete for existing data
- [ ] Monolith calls File Storage/Processing services via API (not direct S3 access)

**Success Criteria:**
- File upload success rate >99.5%
- Parts list parsing completes in <5 seconds p95
- Search indexing lag <10 seconds p95
- Zero data loss during migration

**Rollback Plan:**
- File Storage Service: Route traffic back to monolith S3 logic
- File Processing: Disable service, use synchronous parsing in monolith
- Search Service: Disable service, use PostgreSQL full-text search fallback

---

### Phase 3: Core Domain Services (Months 7-12)

**Goal**: Extract Gallery and MOC services, refactor join tables, retire monolith.

**Services Extracted:**
6. **Gallery Service** (Week 25-30)
7. **MOC Management Service** (Week 31-40)
8. **Inventory Tracking Service** (Week 41-48, optional)

**Key Challenges:**
- **Gallery ↔ MOC Coupling**: Migrate `moc_gallery_images` join table to API-based associations
- **Data Migration**: Split PostgreSQL database into service-specific schemas
- **Transaction Boundaries**: Implement Saga for "Create MOC + link gallery images" workflow

**Migration Steps for Gallery Service:**

**Step 1: Deploy Service (Weeks 25-26)**
- Deploy Gallery Service with read-only replica of gallery tables
- Dual-write: Monolith writes to PostgreSQL, Gallery Service mirrors writes

**Step 2: Traffic Cutover (Weeks 27-28)**
- API Gateway routes 10% → 50% → 100% of gallery traffic to Gallery Service
- Monolith still handles MOC ↔ Gallery joins via database

**Step 3: Refactor Joins (Weeks 29-30)**
- MOC Service stores `galleryImageIds: string[]` in `moc_instructions.metadata` JSON field
- Publish event: `moc.gallery-images-linked` when associations change
- Gallery Service subscribes to `image.deleted`, notifies MOC Service to remove dangling references

**Step 4: Database Split (Week 31)**
- Gallery Service gets own PostgreSQL schema/instance
- Drop `moc_gallery_images` table from shared database

**Migration Steps for MOC Service:**

**Step 1: Deploy Service (Weeks 31-34)**
- Deploy MOC Service with full `moc_instructions`, `moc_files`, `moc_parts_lists` tables
- Dual-write: Monolith writes to PostgreSQL, MOC Service mirrors writes

**Step 2: Event-Driven Integration (Weeks 35-36)**
- MOC Service publishes `moc.created`, `moc.updated`, `moc.deleted` events
- Search Service, Gallery Service, File Processing subscribe to events

**Step 3: Traffic Cutover (Weeks 37-38)**
- API Gateway routes 10% → 50% → 100% of MOC traffic to MOC Service
- Monitor error rates, rollback if >2% errors detected

**Step 4: Retire Monolith (Weeks 39-40)**
- Verify all traffic handled by services
- Monolith serves only legacy /health endpoint for monitoring
- Database cleanup: archive old tables, document schema per service

**Deliverables:**
- [ ] Gallery Service handling 100% of gallery traffic
- [ ] MOC Management Service handling 100% of MOC traffic
- [ ] All join tables migrated to API-based associations or denormalized data
- [ ] Monolith retired or serving <5% of traffic
- [ ] Database split into service-specific schemas/instances
- [ ] Zero data inconsistencies detected in post-migration audit

**Success Criteria:**
- Gallery API response time <250ms p95
- MOC API response time <400ms p95 (includes Gallery validation call)
- Event propagation lag <10 seconds p95
- Data consistency audit: 100% match between old join tables and new associations

**Rollback Plan:**
- API Gateway routes traffic back to monolith
- Services remain deployed but disabled
- Database rollback: restore join tables from backups

---

### Phase 4: Optimization & Future Services (Month 13+)

**Optional Services:**
- **Inventory Tracking Service**: Extract if inventory features expand beyond parts lists
- **Analytics Service**: Dedicated service for usage metrics, A/B testing
- **Recommendation Service**: ML-based recommendations for MOCs, sets, parts

**Optimization Work:**
- Evaluate gRPC for inter-service calls (reduce latency vs. REST)
- Implement GraphQL gateway for frontend (reduce over-fetching)
- Service mesh (Istio/App Mesh) for advanced traffic management
- Multi-region deployment for global latency reduction

---

## Technical Architecture

### Service Communication Patterns

#### Synchronous (REST API)

**Use Cases:**
- Real-time validation (MOC Service → Gallery Service: validate image IDs)
- User-facing CRUD operations (client → services)
- Profile enrichment (any service → Profile Service: get user display name)

**Implementation:**
- REST with JSON payloads
- HTTP/2 for multiplexing
- Timeouts: 5 seconds default, 30 seconds for file uploads
- Retries: 3 attempts with exponential backoff (100ms, 200ms, 400ms)

**Example: MOC Service calls Gallery Service**
```typescript
// MOC Service: Validate gallery image before linking
async linkGalleryImage(mocId: string, imageId: string) {
  // Synchronous API call to Gallery Service
  const imageExists = await galleryServiceClient.validateImage(imageId)
  if (!imageExists) {
    throw new Error('Gallery image not found')
  }

  // Store association in MOC metadata
  await db.update(mocInstructions)
    .set({
      metadata: sql`jsonb_set(metadata, '{galleryImageIds}',
        coalesce(metadata->'galleryImageIds', '[]'::jsonb) || ${imageId}::jsonb)`
    })
    .where(eq(mocInstructions.id, mocId))

  // Publish event for other services
  await eventBus.publish('moc.gallery-image-linked', { mocId, imageId })
}
```

---

#### Asynchronous (Event-Driven)

**Use Cases:**
- Search indexing (MOC created → Search Service indexes)
- Cache invalidation (MOC updated → Redis cache cleared)
- Eventual consistency (Gallery image deleted → MOC Service removes dangling references)

**Implementation:**
- AWS EventBridge or RabbitMQ
- Event schema: JSON with required fields (`eventType`, `eventId`, `timestamp`, `payload`)
- Consumer guarantees: At-least-once delivery (idempotent handlers required)

**Event Schema Example:**
```json
{
  "eventType": "moc.created",
  "eventId": "uuid-v4",
  "timestamp": "2025-01-27T12:34:56Z",
  "correlationId": "request-trace-id",
  "source": "moc-management-service",
  "payload": {
    "mocId": "moc-uuid",
    "userId": "user-id",
    "title": "Epic Castle MOC",
    "description": "...",
    "tags": ["castle", "medieval"],
    "thumbnailUrl": "https://..."
  }
}
```

**Example: Search Service subscribes to MOC events**
```typescript
// Search Service event handler
eventBus.subscribe('moc.created', async (event) => {
  const { mocId, title, description, tags } = event.payload

  // Idempotent: Check if already indexed
  const exists = await esClient.exists({ index: 'mocs', id: mocId })
  if (exists) {
    logger.info('MOC already indexed, skipping', { mocId })
    return
  }

  // Index document
  await esClient.index({
    index: 'mocs',
    id: mocId,
    document: {
      title,
      description,
      tags,
      indexedAt: new Date().toISOString()
    }
  })

  logger.info('MOC indexed successfully', { mocId })
})
```

---

#### Saga Pattern (Distributed Transactions)

**Use Case: Create MOC with Files**

**Workflow:**
1. Client uploads MOC metadata + files to API Gateway
2. API Gateway routes to MOC Service
3. MOC Service orchestrates Saga:
   - Step 1: Save MOC metadata to database → `mocId` generated
   - Step 2: Call File Storage Service to upload files → `fileUrls[]` returned
   - Step 3: Save file records to `moc_files` table
   - Step 4: Call File Processing Service to parse parts lists (async)
   - Step 5: Publish `moc.created` event
4. File Processing Service parses files, publishes `file-processing.completed`
5. MOC Service handles event, updates `total_piece_count`

**Compensating Transactions (on failure):**
- If Step 2 fails: Delete MOC record from database
- If Step 3 fails: Delete uploaded files from S3, delete MOC record
- If Step 4 fails: Mark MOC as "incomplete", notify user

**Implementation:**
```typescript
// MOC Service: Saga orchestrator
async createMocWithFiles(data: CreateMocDto, files: File[]) {
  const saga = new Saga('create-moc-with-files')

  try {
    // Step 1: Create MOC record
    const moc = await saga.execute(
      'create-moc',
      () => db.insert(mocInstructions).values(data).returning(),
      (result) => db.delete(mocInstructions).where(eq(mocInstructions.id, result[0].id))
    )

    // Step 2: Upload files
    const uploadedFiles = await saga.execute(
      'upload-files',
      () => fileStorageClient.uploadMultiple(files),
      (fileUrls) => fileStorageClient.deleteMultiple(fileUrls)
    )

    // Step 3: Save file records
    await saga.execute(
      'save-file-records',
      () => db.insert(mocFiles).values(
        uploadedFiles.map(f => ({ mocId: moc.id, fileUrl: f.url, fileType: f.type }))
      ),
      () => db.delete(mocFiles).where(eq(mocFiles.mocId, moc.id))
    )

    // Step 4: Trigger file processing (async, no compensation)
    await fileProcessingClient.processFiles(uploadedFiles, { mocId: moc.id })

    // Step 5: Publish event
    await eventBus.publish('moc.created', { ...moc })

    return moc
  } catch (error) {
    // Execute compensating transactions in reverse order
    await saga.rollback()
    throw error
  }
}
```

---

### Data Consistency Strategies

#### Strong Consistency (Within Service)

**Use Cases:**
- MOC + Parts Lists (same aggregate)
- Gallery Image + Flags (same aggregate)

**Implementation:**
- PostgreSQL ACID transactions
- All operations within single database connection

```typescript
// MOC Service: Strong consistency for aggregate
await db.transaction(async (tx) => {
  // Create MOC
  const moc = await tx.insert(mocInstructions).values(mocData).returning()

  // Create parts list (same transaction)
  await tx.insert(mocPartsLists).values({
    mocId: moc.id,
    title: 'Main Build',
    totalPartsCount: 1234
  })

  // Update MOC total piece count (same transaction)
  await tx.update(mocInstructions)
    .set({ total_piece_count: 1234 })
    .where(eq(mocInstructions.id, moc.id))
})
```

---

#### Eventual Consistency (Across Services)

**Use Cases:**
- Search indexing (MOC created → Elasticsearch updated within 10 seconds)
- Cache invalidation (MOC updated → Redis cache cleared)
- Gallery image deletion → MOC Service removes dangling references

**Implementation:**
- Event-driven with retry logic
- Idempotent event handlers
- Dead-letter queue for failed events

**Consistency Guarantees:**
- **Lag**: <10 seconds p95 (event published → all consumers processed)
- **Accuracy**: 99.99%+ (audit jobs detect and fix inconsistencies)

**Example: Gallery Image Deleted**
```typescript
// Gallery Service: Publish deletion event
await db.delete(galleryImages).where(eq(galleryImages.id, imageId))
await eventBus.publish('image.deleted', { imageId, userId })

// MOC Service: Handle deletion (eventual consistency)
eventBus.subscribe('image.deleted', async (event) => {
  const { imageId } = event.payload

  // Remove image from all MOCs (eventually consistent)
  await db.update(mocInstructions)
    .set({
      metadata: sql`jsonb_set(metadata, '{galleryImageIds}',
        (metadata->'galleryImageIds')::jsonb - ${imageId}::text)`
    })
    .where(sql`metadata->'galleryImageIds' ? ${imageId}`)

  logger.info('Removed dangling gallery image references', { imageId })
})
```

---

#### Read-Your-Writes Consistency

**Use Case:** User creates MOC, immediately searches for it

**Problem:** Search Service has 5-second lag, MOC doesn't appear in search results

**Solution:** Hybrid approach
1. Write to MOC Service (immediate, strong consistency)
2. Publish event to Search Service (eventual consistency)
3. Search API checks PostgreSQL first (fallback), then Elasticsearch
4. After 10 seconds, assume Elasticsearch has indexed, use only Elasticsearch

**Implementation:**
```typescript
// Search Service: Hybrid search
async search(query: string, userId: string) {
  // Primary: Elasticsearch
  const esResults = await esClient.search({
    index: 'mocs',
    query: { match: { title: query } }
  })

  // Fallback: Check PostgreSQL for recent writes (<10 seconds old)
  const recentMocs = await db.select()
    .from(mocInstructions)
    .where(and(
      eq(mocInstructions.userId, userId),
      sql`created_at > NOW() - INTERVAL '10 seconds'`,
      sql`title ILIKE ${`%${query}%`}`
    ))

  // Merge results (deduplicate by mocId)
  return mergeResults(esResults, recentMocs)
}
```

---

### Database Strategy

#### Option A: Shared PostgreSQL with Service-Specific Schemas ⭐ **RECOMMENDED**

**Pros:**
- Simpler operations (single RDS instance)
- Lower cost (no multiple database instances)
- Easier backups and disaster recovery

**Cons:**
- Services share infrastructure (blast radius of database outage)
- Connection pooling requires coordination

**Implementation:**
```sql
-- Create schemas per service
CREATE SCHEMA moc_service;
CREATE SCHEMA gallery_service;
CREATE SCHEMA wishlist_service;
CREATE SCHEMA profile_service;

-- Grant access per service
GRANT USAGE ON SCHEMA moc_service TO moc_service_user;
GRANT ALL ON ALL TABLES IN SCHEMA moc_service TO moc_service_user;
```

**Connection Strings:**
- MOC Service: `postgres://moc_service_user:***@rds-endpoint/lego_projects?schema=moc_service`
- Gallery Service: `postgres://gallery_service_user:***@rds-endpoint/lego_projects?schema=gallery_service`

---

#### Option B: Separate PostgreSQL Instances per Service

**Pros:**
- True service isolation (database failure doesn't cascade)
- Independent scaling per service

**Cons:**
- Higher cost ($100+/month per RDS instance)
- Complex backups (multiple instances)
- Cannot use database joins across services (must use API calls)

**When to Use:**
- Compliance requirements mandate isolation
- Services scale very differently (MOC Service needs 10x capacity of Wishlist)

---

### API Gateway Design

**Technology Options:**
1. **Kong** (open-source, plugin ecosystem)
2. **AWS API Gateway** (managed, serverless)
3. **Custom Express Gateway** (full control, more operational overhead)

**Recommendation:** **Kong** (balance of features, control, community support)

**Kong Configuration Example:**
```yaml
# kong.yml - Declarative configuration
_format_version: "3.0"

services:
  - name: moc-service
    url: http://moc-service.internal:9100
    routes:
      - name: moc-routes
        paths:
          - /api/mocs
        strip_path: false
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: local
      - name: jwt
        config:
          key_claim_name: sub
          secret_is_base64: false
      - name: correlation-id
        config:
          header_name: X-Correlation-Id
          generator: uuid

  - name: gallery-service
    url: http://gallery-service.internal:9200
    routes:
      - name: gallery-routes
        paths:
          - /api/gallery
          - /api/images
          - /api/albums
    plugins:
      - name: rate-limiting
        config:
          minute: 200
      - name: jwt

  - name: wishlist-service
    url: http://wishlist-service.internal:9400
    routes:
      - name: wishlist-routes
        paths:
          - /api/wishlist
    plugins:
      - name: rate-limiting
        config:
          minute: 150
      - name: jwt
```

**Traffic Flow:**
```
Client → Kong API Gateway (Port 80/443)
         ↓
         ├→ /api/mocs/*      → MOC Service (Port 9100)
         ├→ /api/gallery/*   → Gallery Service (Port 9200)
         ├→ /api/wishlist/*  → Wishlist Service (Port 9400)
         ├→ /api/users/*     → Profile Service (Port 9300)
         └→ /api/search/*    → Search Service (Port 9700)
```

---

## Infrastructure & Deployment

### AWS Architecture

**Compute:**
- **ECS Fargate**: Each service runs as separate ECS service
- **Auto-scaling**: CPU >70% or Memory >80% triggers scale-out
- **Service Discovery**: AWS Cloud Map for internal DNS resolution

**Networking:**
- **VPC**: Shared VPC from existing infrastructure
- **Subnets**: Private subnets for services, public for ALB
- **Security Groups**: Per-service security groups (least privilege)

**Load Balancing:**
- **ALB (Public)**: Handles client traffic → API Gateway
- **ALB (Internal)**: Service-to-service communication (optional, or use Cloud Map)

**Database:**
- **RDS PostgreSQL**: Shared instance with service-specific schemas (Phase 1-2)
- **RDS PostgreSQL**: Separate instances per service (Phase 3+, optional)

**Caching:**
- **ElastiCache Redis**: Shared cluster, service-specific key prefixes (`moc:*`, `gallery:*`)

**Storage:**
- **S3**: Shared bucket with prefixes per service (`mocs/`, `gallery/`, `wishlist/`)
- **CloudFront**: CDN for serving static assets (images, files)

**Messaging:**
- **EventBridge**: Event bus for service-to-service events
- **SQS**: Dead-letter queues for failed events

**Observability:**
- **CloudWatch Logs**: Centralized logging per service
- **CloudWatch Metrics**: Custom metrics (request count, latency, errors)
- **AWS X-Ray**: Distributed tracing
- **DataDog (optional)**: Unified observability dashboard

---

### Deployment Pipeline

**CI/CD Tool:** GitHub Actions

**Pipeline Stages:**
1. **Build**: Compile TypeScript, run linter
2. **Test**: Unit tests, integration tests
3. **Package**: Build Docker image, push to ECR
4. **Deploy (Dev)**: Deploy to dev environment (auto-deploy on main branch)
5. **Deploy (Staging)**: Deploy to staging (manual approval)
6. **Deploy (Production)**: Blue/Green deployment with smoke tests

**Example: GitHub Actions Workflow**
```yaml
name: Deploy MOC Service

on:
  push:
    branches: [main]
    paths:
      - 'apps/services/moc-management/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build -t moc-service:${{ github.sha }} \
            -f apps/services/moc-management/Dockerfile .
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URL
          docker tag moc-service:${{ github.sha }} $ECR_URL/moc-service:${{ github.sha }}
          docker push $ECR_URL/moc-service:${{ github.sha }}

  deploy-dev:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster lego-moc-dev \
            --service moc-service \
            --force-new-deployment

  deploy-production:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Blue/Green deployment
        run: |
          # Deploy to green environment
          aws ecs update-service \
            --cluster lego-moc-prod \
            --service moc-service-green \
            --task-definition moc-service:${{ github.sha }}

          # Run smoke tests
          ./scripts/smoke-test.sh https://green.api.legomoc.com

          # Switch traffic (ALB target group swap)
          ./scripts/swap-target-groups.sh moc-service
```

---

### Monitoring & Alerting

**Metrics to Track:**

**Service Health:**
- Request rate (req/sec)
- Error rate (%)
- Response time (p50, p95, p99)
- Availability (uptime %)

**Infrastructure:**
- ECS task count (desired vs. running)
- CPU utilization (%)
- Memory utilization (%)
- Database connections (active vs. max)

**Business Metrics:**
- MOCs created per hour
- File uploads per hour
- Search queries per hour
- User registrations per day

**Alerting Rules:**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate >5% | Critical | Page on-call engineer |
| Response time >1s p95 | Warning | Slack alert to team |
| ECS task crash loop | Critical | Page on-call engineer |
| Database connections >80% | Warning | Scale database instance |
| Event lag >60 seconds | Warning | Check EventBridge health |

**Dashboard Widgets:**
- Service map (visualize service dependencies)
- Latency heatmap (per service, per endpoint)
- Error rate timeline (last 24 hours)
- Traffic distribution (% traffic per service)

---

## Testing Strategy

### Unit Tests

**Coverage Target:** 80%+ per service

**Scope:**
- Business logic (handlers, domain models)
- Utility functions (parsers, validators)
- Mocked external dependencies (database, S3, APIs)

**Example:**
```typescript
// MOC Service unit test
describe('createMoc', () => {
  it('should create MOC with valid data', async () => {
    const mockDb = createMockDb()
    const service = new MocService(mockDb)

    const result = await service.createMoc({
      userId: 'user-123',
      title: 'Epic Castle',
      description: 'A beautiful castle'
    })

    expect(result.id).toBeDefined()
    expect(result.title).toBe('Epic Castle')
    expect(mockDb.insert).toHaveBeenCalledWith(mocInstructions)
  })

  it('should throw error if title is empty', async () => {
    const service = new MocService(mockDb)
    await expect(service.createMoc({ title: '' }))
      .rejects.toThrow('Title is required')
  })
})
```

---

### Integration Tests

**Coverage Target:** Critical paths (create MOC, upload file, search)

**Scope:**
- Service + real database (test database container)
- Service + real Redis/S3 (LocalStack or Minio)
- No mocked external dependencies

**Example:**
```typescript
// MOC Service integration test
describe('MOC Service Integration', () => {
  let db: Database
  let service: MocService

  beforeAll(async () => {
    db = await createTestDatabase() // Spin up PostgreSQL container
    service = new MocService(db)
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('should create MOC and retrieve it', async () => {
    const moc = await service.createMoc({
      userId: 'user-123',
      title: 'Integration Test MOC'
    })

    const retrieved = await service.getMoc(moc.id)
    expect(retrieved.title).toBe('Integration Test MOC')
  })
})
```

---

### Contract Tests

**Purpose:** Ensure service APIs match consumer expectations

**Tool:** Pact or Spring Cloud Contract

**Example:**
```typescript
// Gallery Service contract test
describe('Gallery Service Provider Contract', () => {
  it('should validate image exists (MOC Service consumer)', async () => {
    const provider = new Pact({
      consumer: 'moc-service',
      provider: 'gallery-service'
    })

    await provider
      .given('image abc123 exists')
      .uponReceiving('validate image request')
      .withRequest({
        method: 'GET',
        path: '/v1/images/abc123/exists'
      })
      .willRespondWith({
        status: 200,
        body: { exists: true }
      })

    await provider.verify()
  })
})
```

---

### End-to-End Tests

**Coverage Target:** Happy paths only (not exhaustive)

**Scope:**
- Full user journeys across multiple services
- Real APIs, real database (staging environment)

**Example Scenarios:**
1. User creates MOC → uploads files → searches for MOC → finds it
2. User uploads gallery image → links to MOC → deletes image → MOC association removed
3. User creates wishlist item → reorders items → verifies new order persists

**Tool:** Playwright or Cypress (if frontend involved), or Postman/Newman for API-only

---

## Cost Analysis

### Current Monolith Costs (Baseline)

| Resource | Configuration | Monthly Cost |
|----------|---------------|--------------|
| ECS Fargate (Monolith) | 2 tasks, 1 vCPU, 2GB RAM | $60 |
| RDS PostgreSQL | db.t3.small | $35 |
| ElastiCache Redis | cache.t3.micro | $15 |
| Elasticsearch | t3.small.search | $40 |
| S3 + CloudFront | 100GB storage, 1TB transfer | $25 |
| ALB | 1 ALB, low traffic | $20 |
| **Total Monolith** | | **$195/month** |

---

### Microservices Costs (Projected)

#### Phase 1 (Months 1-3) - Add Wishlist, Profile, Gateway

| Resource | Configuration | Monthly Cost |
|----------|---------------|--------------|
| ECS Fargate (Monolith, reduced) | 1 task, 0.5 vCPU, 1GB RAM | $30 |
| ECS Fargate (Wishlist Service) | 1 task, 0.25 vCPU, 0.5GB RAM | $15 |
| ECS Fargate (Profile Service) | 1 task, 0.25 vCPU, 0.5GB RAM | $15 |
| ECS Fargate (API Gateway - Kong) | 1 task, 0.5 vCPU, 1GB RAM | $30 |
| RDS PostgreSQL | db.t3.small (shared) | $35 |
| ElastiCache Redis | cache.t3.micro (shared) | $15 |
| S3 + CloudFront | Same | $25 |
| ALB (Internal + Public) | 2 ALBs | $40 |
| EventBridge | 1M events/month | $1 |
| **Phase 1 Total** | | **$206/month** |
| **Delta vs. Baseline** | | **+$11/month (+6%)** |

---

#### Phase 2 (Months 4-6) - Add File Processing, Search, Storage

| Resource | Configuration | Monthly Cost |
|----------|---------------|--------------|
| ECS Fargate (All services) | 6 tasks total (Gateway, Wishlist, Profile, File Processing, Search, File Storage) | $150 |
| RDS PostgreSQL | db.t3.small (shared) | $35 |
| ElastiCache Redis | cache.t3.small (upgraded) | $30 |
| Elasticsearch | t3.medium.search (upgraded) | $80 |
| S3 + CloudFront | 200GB storage, 2TB transfer | $50 |
| ALB | 2 ALBs | $40 |
| EventBridge | 5M events/month | $5 |
| SQS (DLQ) | 1M messages/month | $1 |
| **Phase 2 Total** | | **$391/month** |
| **Delta vs. Baseline** | | **+$196/month (+100%)** |

---

#### Phase 3 (Months 7-12) - Add Gallery, MOC, Retire Monolith

| Resource | Configuration | Monthly Cost |
|----------|---------------|--------------|
| ECS Fargate (All services) | 8 tasks (all services, monolith retired) | $200 |
| RDS PostgreSQL | db.t3.medium (upgraded) or separate instances | $70 |
| ElastiCache Redis | cache.t3.small | $30 |
| Elasticsearch | t3.medium.search | $80 |
| S3 + CloudFront | 300GB storage, 3TB transfer | $75 |
| ALB | 2 ALBs | $40 |
| EventBridge | 10M events/month | $10 |
| SQS | 2M messages/month | $2 |
| CloudWatch Logs | 50GB/month | $25 |
| AWS X-Ray | 1M traces/month | $5 |
| **Phase 3 Total** | | **$537/month** |
| **Delta vs. Baseline** | | **+$342/month (+175%)** |

---

### Cost Optimization Opportunities

**After Migration Stabilizes (Month 13+):**
1. **Reserved Instances**: Save 30% on RDS/ElastiCache ($35/month savings)
2. **Fargate Spot**: Save 50% on non-critical services ($50/month savings)
3. **S3 Lifecycle Policies**: Move old files to Glacier ($10/month savings)
4. **CloudFront Optimization**: Reduce transfer costs with better caching ($15/month savings)

**Optimized Steady-State Cost:** $427/month (+$232/month vs. baseline, +119%)

---

### ROI Calculation

**Cost Increase:** $232/month = $2,784/year

**Efficiency Gains:**
- **Developer Productivity**: 40% increase = 16 hours/week saved per developer
  - 2 developers × 16 hours × $75/hour × 52 weeks = **$124,800/year**
- **Reduced Downtime**: 99.9% vs. 95% uptime = 4 hours/month saved
  - 4 hours × 12 months × $500/hour (opportunity cost) = **$24,000/year**
- **Faster Feature Delivery**: 10 deploys/week vs. 2 deploys/week = 8 extra deploys/week
  - 8 deploys × 52 weeks × $200/deploy value = **$83,200/year**

**Total Annual Value:** $232,000
**Total Annual Cost:** $2,784
**Net ROI:** $229,216/year (**8,233% ROI**)

---

## Risks and Mitigations

### Technical Risks

**Risk 1: Event Delivery Failures**

**Impact:** High - Data inconsistencies across services

**Mitigation:**
- Implement dead-letter queues (SQS DLQ)
- Retry logic with exponential backoff (3 retries)
- Monitoring alerts for DLQ depth >10 messages
- Weekly reconciliation jobs to detect and fix inconsistencies

---

**Risk 2: Distributed Transaction Failures**

**Impact:** High - Partial data saved, user sees errors

**Mitigation:**
- Saga pattern with compensating transactions
- Idempotent API endpoints (duplicate POST requests safe)
- Correlation IDs for debugging failed workflows
- Transaction timeouts (30 seconds max)

---

**Risk 3: Network Latency (Service-to-Service)**

**Impact:** Medium - API response times increase

**Mitigation:**
- Co-locate services in same VPC/availability zone
- Use gRPC for inter-service calls (faster than REST)
- Cache frequently accessed data (profile names, gallery image metadata)
- Circuit breakers to fail fast on slow dependencies

---

**Risk 4: Database Connection Pool Exhaustion**

**Impact:** High - Services fail to query database

**Mitigation:**
- Configure connection pools per service (max 10-20 connections)
- Database connection monitoring (alert at 80% utilization)
- Graceful degradation (return cached data if database unavailable)
- Read replicas for read-heavy services (Gallery, Search)

---

### Organizational Risks

**Risk 5: Team Learning Curve**

**Impact:** Medium - Slower development during migration

**Mitigation:**
- Training sessions on microservices patterns (Saga, circuit breakers)
- Pair programming for first service extraction
- Internal documentation (service templates, best practices)
- Architecture guild for knowledge sharing

---

**Risk 6: Operational Overhead**

**Impact:** Medium - More services to monitor and maintain

**Mitigation:**
- Invest in observability platform (DataDog or similar)
- Automated deployment pipelines (CI/CD templates)
- Standardized service templates (all services use same logging/metrics)
- Runbooks for common failure scenarios

---

### Rollback Strategy

**Phase 1 Rollback:**
- API Gateway routes 100% traffic to monolith
- Wishlist/Profile services remain deployed (no traffic)
- Zero data loss (services wrote to same database as monolith)

**Phase 2 Rollback:**
- Disable File Processing Service (monolith handles file parsing synchronously)
- Disable Search Service (monolith uses PostgreSQL full-text search)
- File Storage Service routes traffic to monolith S3 logic

**Phase 3 Rollback:**
- Re-enable monolith with full codebase
- Services remain deployed but receive no traffic
- Database schema rollback (restore join tables from backups)

---

## Success Criteria

### Phase 1 Success Criteria (Months 1-3)

- [ ] Wishlist Service deployed to production
- [ ] Profile Service deployed to production
- [ ] API Gateway routing traffic to services
- [ ] Zero production incidents caused by migration
- [ ] Wishlist API response time <200ms p95
- [ ] Profile API response time <150ms p95
- [ ] Error rate <1% for extracted services
- [ ] Team completes 2+ features in extracted services

**Go/No-Go Decision:** If error rate >2% or >1 production incident, pause migration and fix issues before Phase 2.

---

### Phase 2 Success Criteria (Months 4-6)

- [ ] File Processing Service parsing 80%+ of parts lists
- [ ] Search Service indexing all new MOCs within 10 seconds
- [ ] File Storage Service handling 100% of new uploads
- [ ] Elasticsearch backfill complete for existing data
- [ ] File upload success rate >99.5%
- [ ] Parts list parsing completes in <5 seconds p95
- [ ] Zero data loss during migration

**Go/No-Go Decision:** If upload success rate <99%, rollback and investigate file processing failures.

---

### Phase 3 Success Criteria (Months 7-12)

- [ ] Gallery Service handling 100% of gallery traffic
- [ ] MOC Management Service handling 100% of MOC traffic
- [ ] Monolith retired or serving <5% of traffic
- [ ] Database split into service-specific schemas/instances
- [ ] Gallery API response time <250ms p95
- [ ] MOC API response time <400ms p95
- [ ] Event propagation lag <10 seconds p95
- [ ] Data consistency audit: 100% match between old and new data models

**Final Success:** All 8 services in production with <1% error budget consumed, developer productivity increased by 35%+.

---

## Appendix

### Glossary

- **Aggregate**: A cluster of domain objects that can be treated as a single unit (DDD concept)
- **Bounded Context**: A logical boundary within which a domain model is defined (DDD concept)
- **Circuit Breaker**: A design pattern that prevents cascading failures by failing fast
- **Compensating Transaction**: A transaction that reverses the effects of a previous transaction
- **Event-Driven Architecture**: Architecture where services communicate via asynchronous events
- **Idempotent**: An operation that can be applied multiple times without changing the result
- **Saga Pattern**: A sequence of local transactions coordinated to achieve distributed consistency
- **Strangler Fig Pattern**: Incrementally replacing a monolith by extracting services one at a time

---

### References

- [Domain-Driven Design by Eric Evans](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Building Microservices by Sam Newman](https://samnewman.io/books/building_microservices_2nd_edition/)
- [AWS Microservices Best Practices](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/microservices-on-aws.html)
- [Saga Pattern Explained](https://microservices.io/patterns/data/saga.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

---

### Open Questions

1. **Database Strategy**: Should we use shared PostgreSQL with schemas (Option A) or separate instances (Option B)? Recommend Option A for Phase 1-2, evaluate Option B if services scale very differently.

2. **API Gateway Technology**: Kong, AWS API Gateway, or custom Express? Recommend Kong for balance of features and control.

3. **Event Bus**: AWS EventBridge, RabbitMQ, or Kafka? Recommend EventBridge for Phase 1-2 (serverless, less operational overhead), evaluate Kafka if event volume >1M/day.

4. **Service Mesh**: Do we need Istio/App Mesh in Phase 1? Recommend deferring to Phase 3+ (added complexity, evaluate if traffic management needs arise).

5. **GraphQL Gateway**: Should we add GraphQL layer for frontend? Recommend deferring to Phase 4+ (optimize after microservices stabilize).

6. **Inventory Tracking Service**: Extract in Phase 3 or defer to Phase 4? Recommend Phase 4+ (wait for inventory features to expand beyond parts lists).

---

**Document Status:** Draft - Awaiting Prioritization
**Next Steps:** Review with engineering team, validate migration timeline, approve Phase 1 scope.

---

_Generated by Winston, System Architect | Version 1.0 | 2025-01-27_
