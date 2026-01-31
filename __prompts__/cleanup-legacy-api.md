# Cleanup Legacy API Directory

## Context

The new `apps/lego-api` has been implemented with hexagonal architecture, replacing the functionality in `apps/api`. The following domains have been migrated:

- Gallery (images, albums)
- Instructions (MOCs, files)
- Wishlist
- Parts Lists
- Sets
- Health/Config

## Task

Analyze `apps/api/` and remove files/directories that are no longer necessary. The new API lives in `apps/lego-api/`.

## Rules

1. **KEEP** the following (still in use):
   - `apps/api/knowledge-base/` - MCP server (separate project, not migrated)
   - `apps/api/core/database/schema/` - Source of truth for DB schema (referenced by migrations)
   - `apps/api/core/database/migrations/` - Drizzle migrations
   - `apps/api/drizzle.config.ts` - Migration config
   - `apps/api/package.json` - Keep but can remove unused dependencies later

2. **DELETE** the following (replaced by lego-api):
   - `apps/api/platforms/aws/` - Lambda handlers (replaced by Hono routes)
   - `apps/api/platforms/vercel/` - Vercel handlers (replaced by Hono routes)
   - `apps/api/platforms/bun/` - Old Bun server (replaced by lego-api)
   - `apps/api/routes/` - Old route files (if they exist)
   - `apps/api/services/` - Old service files (replaced by domain services)
   - `apps/api/middleware/` - Old middleware (replaced by lego-api middleware)
   - `apps/api/core/storage/` - S3 utilities (replaced by @repo/api-core)
   - `apps/api/core/auth/` - Auth utilities (replaced by @repo/api-core)
   - `apps/api/core/cache/` - Redis cache (not used in MVP)
   - `apps/api/core/search/` - OpenSearch (not used in MVP)
   - `apps/api/core/observability/` - X-Ray/CloudWatch (not used in MVP)
   - `apps/api/core/utils/` - Utility functions (review before deleting)
   - `apps/api/core/config/` - Config bootstrap (review before deleting)

3. **REVIEW** before deleting:
   - Any file referenced by `apps/api/knowledge-base/`
   - Any shared types or utilities that might be imported elsewhere
   - Test files that might have useful patterns

## Steps

1. First, search for imports FROM `apps/api/` in other packages to identify dependencies
2. List all files/directories that will be deleted
3. Create a backup branch or tag before deletion
4. Delete the unnecessary files
5. Run `pnpm install` to update lockfile
6. Run type-check and tests to verify nothing broke
7. Update any remaining references

## Verification

After cleanup:
```bash
pnpm type-check          # Should pass
pnpm test               # Should pass
pnpm --filter @repo/lego-api test  # Should pass
```

## Output

Provide a summary of:
- Files/directories deleted
- Files/directories kept (and why)
- Any broken references found and fixed
- Total lines of code removed
