# Agent Context - WISH-2009

## Story Context

```yaml
story_id: WISH-2009
feature_dir: plans/future/wish
mode: implement
base_path: plans/future/wish/in-progress/WISH-2009/
artifacts_path: plans/future/wish/in-progress/WISH-2009/_implementation/
story_file: plans/future/wish/in-progress/WISH-2009/WISH-2009.md
elaboration_file: plans/future/wish/in-progress/WISH-2009/ELAB-WISH-2009.md
```

## Key Implementation Details

### Backend (lego-api/domains/config/)
- In-memory cache using Map with TTL (5 minutes)
- SHA-256 hashing for deterministic user ID rollout
- Admin role check via existing auth middleware
- Three endpoints: GET /api/config/flags, GET /api/config/flags/:flagKey, POST /api/admin/flags/:flagKey

### Frontend (app-wishlist-gallery/)
- FeatureFlagContext.tsx - Context provider fetching flags
- useFeatureFlag.ts - Hook returning boolean for flag state

### Database
- feature_flags table with flag_key, enabled, rollout_percentage, environment

## Packages To Create/Modify

1. `apps/api/lego-api/domains/config/` - New domain (types.ts, ports/index.ts, adapters/, application/, routes.ts)
2. `apps/api/lego-api/middleware/feature-flag.ts` - Request middleware
3. `packages/core/api-client/src/schemas/feature-flags.ts` - Shared schemas
4. `apps/web/app-wishlist-gallery/src/contexts/FeatureFlagContext.tsx` - React context
5. `apps/web/app-wishlist-gallery/src/hooks/useFeatureFlag.ts` - React hook
6. `packages/backend/database-schema/src/schema/feature-flags.ts` - DB schema

## Acceptance Criteria Count

23 total (AC1-AC23)
