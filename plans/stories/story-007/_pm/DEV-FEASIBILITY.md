# DEV-FEASIBILITY: STORY-007 — Gallery Images Read

## Overall Assessment: FEASIBLE ✅

This story is feasible with medium complexity. The main challenges are:
1. OpenSearch integration vs PostgreSQL fallback decision
2. Proper extraction of core logic into reusable package
3. Seed data creation for testing

---

## Change Surface Analysis

### New Files to Create

| File | Purpose |
|------|---------|
| `packages/backend/gallery-images-core/src/index.ts` | Core exports |
| `packages/backend/gallery-images-core/src/get-image.ts` | Get single image logic |
| `packages/backend/gallery-images-core/src/list-images.ts` | List images logic |
| `packages/backend/gallery-images-core/src/search-images.ts` | Search images logic |
| `packages/backend/gallery-images-core/src/flag-image.ts` | Flag image logic |
| `packages/backend/gallery-images-core/src/__types__/index.ts` | Zod schemas |
| `apps/api/platforms/vercel/api/gallery/images/index.ts` | List endpoint |
| `apps/api/platforms/vercel/api/gallery/images/[id].ts` | Get by ID endpoint |
| `apps/api/platforms/vercel/api/gallery/images/search.ts` | Search endpoint |
| `apps/api/platforms/vercel/api/gallery/images/flag.ts` | Flag endpoint |
| `apps/api/core/database/seeds/gallery.ts` | Seed data |
| `__http__/gallery.http` | HTTP test file |

### Existing Files Affected

| File | Change Type |
|------|-------------|
| `packages/backend/db/src/schema.ts` | READ ONLY (schema already exists) |
| `apps/api/platforms/vercel/vercel.json` | Add routes for gallery endpoints |

---

## Risk Analysis

### Risk 1: OpenSearch Dependency (MEDIUM)

**Issue**: AWS handler uses OpenSearch for search with PostgreSQL fallback. Vercel doesn't have direct OpenSearch access.

**Mitigation**:
- For MVP, implement PostgreSQL-only search using ILIKE queries
- OpenSearch integration deferred to future story (out of scope)
- Document this limitation in AC

**PM Decision Required**: None — PostgreSQL fallback is acceptable for Vercel deployment.

---

### Risk 2: Redis Caching (LOW)

**Issue**: AWS handlers cache results in Redis. Vercel deployment won't have Redis.

**Mitigation**:
- Remove caching for Vercel handlers (acceptable for read operations)
- Document this as known limitation
- Future story can add Vercel KV caching if needed

**PM Decision Required**: None — caching is out of scope for migration.

---

### Risk 3: S3 URL Handling (LOW)

**Issue**: Images are stored in S3. Handlers return S3 URLs directly (no presigning for read operations).

**Mitigation**:
- S3 URLs are public read or use CloudFront
- No presigning needed for GET operations
- Existing URL pattern works unchanged

**PM Decision Required**: None — existing pattern continues.

---

### Risk 4: Seed Data Coordination (MEDIUM)

**Issue**: Tests require deterministic seed data for gallery_images, gallery_albums, gallery_flags tables.

**Mitigation**:
- Create `apps/api/core/database/seeds/gallery.ts`
- Add to `pnpm seed` command
- Ensure idempotent (upsert pattern)

**PM Decision Required**: None — seed implementation is dev responsibility.

---

## Hidden Dependencies

### 1. Database Schema
- `galleryImages` table exists in `packages/backend/db/src/schema.ts`
- `galleryAlbums` table exists (for album filtering)
- `galleryFlags` table exists (for flagging)
- Relations defined for lazy loading

### 2. Zod Schemas
- Existing schemas in `apps/api/platforms/aws/endpoints/gallery/schemas/index.ts`
- These should be extracted to core package for reuse

### 3. Auth Pattern
- Uses `@repo/vercel-adapter` auth middleware
- `AUTH_BYPASS` mode for local development
- Pattern established in STORY-002/003

---

## Reuse Opportunities

### MUST Reuse

| Package | Purpose |
|---------|---------|
| `@repo/logger` | Logging |
| `@repo/vercel-adapter` | Request/response transformation |
| `packages/backend/db` | Drizzle schema and client |
| `packages/backend/lambda-responses` | Response helpers |

### Should Create (New Package)

| Package | Justification |
|---------|--------------|
| `packages/backend/gallery-images-core` | Core logic extraction (ports & adapters pattern) |

---

## Missing AC / Clarifications Needed

### Clarification 1: Search Implementation (RESOLVED)

**Question**: Should search use OpenSearch or PostgreSQL?

**PM Decision**: PostgreSQL ILIKE for MVP. OpenSearch integration is out of scope for Vercel migration.

### Clarification 2: Album Filter Behavior (RESOLVED)

**Question**: If `albumId` is not provided, return all images or only standalone images?

**PM Decision**: Match existing behavior — if `albumId` is null/undefined, return only standalone images (images with `albumId = null`). This is per existing AWS handler logic.

### Clarification 3: Flag Endpoint Method (RESOLVED)

**Question**: The index says POST but this is a "read" story. Is flag included?

**PM Decision**: Yes, `flag-image` is included per index entry. While it writes to `gallery_flags`, it's grouped with image reading operations for UX cohesion.

---

## Recommended Mitigations for Dev

1. **Extract schemas first**: Move Zod schemas from AWS handler to `gallery-images-core/__types__/`
2. **Use established patterns**: Follow `sets-core` and `wishlist-core` package structure
3. **PostgreSQL search**: Implement simple ILIKE search on title, description, and tags (JSONB)
4. **Test with seed data**: Don't rely on manual database setup

---

## Conclusion

Story is **FEASIBLE** with no blocking issues. Main work is:
1. Create `gallery-images-core` package
2. Port 4 handlers to Vercel
3. Create seed data
4. Write `.http` test file

Estimated complexity: **Medium** (similar to STORY-004/005 combined)
