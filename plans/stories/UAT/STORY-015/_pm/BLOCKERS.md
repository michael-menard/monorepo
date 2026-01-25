# BLOCKERS: STORY-015 - MOC Instructions Initialization & Finalization

## Status: NO BLOCKERS

All dependencies are available and patterns are established from prior stories.

## Resolved Decisions

The following items were identified as needing PM decisions during feasibility review. They have been resolved:

### 1. OpenSearch Indexing
**Decision:** OUT OF SCOPE for STORY-015

The Postgres record is the source of truth. OpenSearch indexing will be handled separately:
- For local dev: Skip OpenSearch (graceful degradation with warning log)
- For production: Can be added via background job or future story

### 2. S3 Bucket Environment Variable
**Decision:** Use `MOC_BUCKET` environment variable

Consistent with `SETS_BUCKET` pattern from STORY-009. The story AC will document this requirement.

### 3. Parts Validation Packaging
**Decision:** Inline in core package first, refactor to `@repo/parts-validator` later if needed

The validation logic can be included in the core package initially. If it grows or needs reuse elsewhere, extract to shared package.

## Pre-Implementation Checklist

Before dev starts:

- [ ] Verify `MOC_BUCKET` env var is set in `.env.local`
- [ ] Verify AWS credentials are configured
- [ ] Verify `pnpm seed` creates required test MOCs
- [ ] Verify rate limit table exists in local Postgres
