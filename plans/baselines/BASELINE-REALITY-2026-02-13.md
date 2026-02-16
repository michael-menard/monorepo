---
doc_type: baseline_reality
status: active
created_at: "2026-02-13T00:00:00Z"
updated_at: "2026-02-13T00:00:00Z"
---

# Baseline Reality — 2026-02-13

## Deployed Features

### Database Layer (Drizzle ORM + Aurora PostgreSQL)
- **Gallery**: `galleryImages`, `galleryAlbums`, `galleryFlags`
- **MOC Instructions**: `mocInstructions`, `mocFiles`, `mocGalleryImages`, `mocGalleryAlbums`
- **Sets**: `sets`, `setImages`
- **Wishlist**: `wishlistItems` (with store/currency/status/build enums)
- **Parts**: `mocPartsLists`, `mocParts`
- **Upload Sessions**: `uploadSessions`, `uploadSessionFiles`, `uploadSessionParts`
- **Feature Flags**: `featureFlags`, `featureFlagUserOverrides`, `featureFlagSchedules`
- **User Quotas**: `userQuotas`, `userAddons` (authorization & tier system)
- **Admin**: `adminAuditLog`
- **Inspiration Gallery**: `inspirations`, `inspirationAlbums`, `inspirationAlbumItems`, `albumParents` (DAG), `inspirationMocs`, `albumMocs`
- **Rate Limiting**: `userDailyUploads`
- **Umami Analytics** (separate `umami` pgSchema): `account`, `website`, `session`, `websiteEvent`, `eventData`, `team`, `teamUser`, `teamWebsite`

### Knowledge Base (pgvector)
- Separate PostgreSQL instance (port 5433)
- `knowledgeEntries` table with `vector(1536)` embeddings (OpenAI text-embedding-3-small)
- Fields: content, embedding, role, entryType, storyId, tags, verified
- Located at `apps/api/knowledge-base/`

### Docker Compose for Local Dev
- Compose file: `infra/compose.lego-app.yaml`
- Services: PostgreSQL (5432), Redis (6379), Prometheus (9090), Grafana (3003), OTel Collector (4317/4318)
- Persistent volumes for all stateful services

### Orchestrator YAML Artifacts
- Location: `packages/backend/orchestrator/src/artifacts/`
- Zod-validated schemas: story, knowledge-context, checkpoint, scope, plan, evidence, review, qa-verify, audit-findings
- YAML files persisted in feature directories under `plans/future/`

## Established Patterns

### Database
- Drizzle ORM v0.44.3 schemas in `packages/backend/database-schema/src/schema/`
- Auto-generated Zod schemas via `drizzle-zod` in `packages/backend/db/src/generated-schemas.ts`
- `@repo/db` client package with connection pooling (max: 1 per Lambda)
- Exports: `db`, `getPool()`, `closePool()`, `testConnection()`

### Code Conventions
- Zod-first types (REQUIRED) — no TypeScript interfaces
- Functional components only, named exports
- No barrel files — import directly from source
- `@repo/logger` for logging, `@repo/ui` for UI components
- Prettier: no semicolons, single quotes, trailing commas, 100 char width

### Workflow
- YAML artifact persistence with Zod validation
- Knowledge context loading with KB fallback
- Token optimization tracking per story
- Lessons learned extraction from evidence

## Active Stories

None currently in-progress for the platform epic. The unified stories index (`platform.stories.index.md`) with 235 stories across 11 epics is newly bootstrapped.

## Deprecated Patterns

None known.

## Protected Features

- All production DB schemas in `packages/backend/database-schema/`
- Knowledge base schemas and pgvector setup
- Umami analytics schema (separate pgSchema namespace)
- `@repo/db` client package API surface
- Orchestrator artifact schemas

## In-Progress

- Platform stories index bootstrapped with XXYZ ID format
- Story lifecycle directories created (backlog, elaboration, ready-to-work, in-progress, ready-for-qa, UAT)
