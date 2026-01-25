# BLOCKERS: STORY-013 - MOC Instructions Edit (No Files)

## Status: NO BLOCKERS

All dependencies are available and patterns are established. This story is ready for implementation.

---

## Decisions Made

### 1. OpenSearch Re-indexing

**Decision: SKIP for Vercel MVP**

- AWS handler calls `updateMocIndex()` after update
- STORY-011 deferred OpenSearch integration
- AWS implementation is already fail-open
- Reconciliation job will sync when OpenSearch is added

### 2. Handler Structure

**Decision: Inline handler per STORY-011/012 pattern**

- Do NOT extract to `moc-instructions-core` package
- Keep database schema inline in handler
- Use singleton DB connection pattern

### 3. Route Configuration

**Decision: Nested file structure**

- Create `apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
- Alternative: Handle PATCH in existing `[id].ts` (but separate files is cleaner)

---

## Dependencies Verified

- [x] `@repo/upload-types` exports `findAvailableSlug`
- [x] `mocInstructions` table exists in database schema
- [x] Auth bypass pattern established (DEV_USER_SUB, AUTH_BYPASS)
- [x] Vercel route rewrite patterns documented
- [x] Existing seed data includes editable MOCs

---

## No Open Questions

All implementation decisions have been made. Story is unblocked.
