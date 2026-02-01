# Scope - WISH-2039

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | Feature flag user override service, repository, routes, and database schema |
| frontend | false | No frontend changes - backend-only infrastructure story |
| infra | false | Uses existing cache infrastructure from WISH-2009/WISH-2019 |

## Scope Summary

This story extends the existing WISH-2009 feature flag infrastructure to support user-level targeting through explicit include/exclude lists. The implementation adds a new `feature_flag_user_overrides` database table, updates the `evaluateFlag` service method to check user overrides before percentage-based rollout, and introduces three new admin endpoints for managing user overrides.

## Key Implementation Files

### Database Schema
- `packages/backend/database-schema/src/schema/feature-flags.ts` - Add `featureFlagUserOverrides` table

### Backend Service Layer
- `apps/api/lego-api/domains/config/application/services.ts` - Update `evaluateFlag` with user override logic

### Backend Adapter Layer
- `apps/api/lego-api/domains/config/adapters/repositories.ts` - Add user override repository methods

### Backend Types & Ports
- `apps/api/lego-api/domains/config/types.ts` - Add user override Zod schemas
- `apps/api/lego-api/domains/config/ports/index.ts` - Add user override repository port interface

### Backend Routes
- `apps/api/lego-api/domains/config/routes.ts` - Add 3 new admin endpoints

### Shared Schemas
- `packages/core/api-client/src/schemas/feature-flags.ts` - Add user override Zod schemas

### Tests
- `apps/api/lego-api/domains/config/__tests__/user-overrides.test.ts` - 12+ unit tests
- `apps/api/lego-api/__http__/feature-flags-user-targeting.http` - 6+ HTTP integration tests
