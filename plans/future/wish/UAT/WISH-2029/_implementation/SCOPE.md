# Scope - WISH-2029

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | Documentation only - no code changes |
| frontend | false | Documentation only - no code changes |
| infra | false | Documentation only |
| documentation | true | Updating docs/architecture/api-layer.md |

## Scope Summary

This story updates the architecture documentation to reflect the current hexagonal architecture pattern at `apps/api/lego-api/domains/`. No code changes required.

## Target Files

- **Primary:** `docs/architecture/api-layer.md` - Complete rewrite

## Reference Files (Verification Only)

- `apps/api/lego-api/domains/gallery/` - Example domain with adapters/ports
- `apps/api/lego-api/domains/wishlist/` - Example with cross-domain dependencies
- `apps/api/lego-api/domains/health/` - Simplest example (no adapters/ports)
- `apps/api/lego-api/domains/instructions/` - Full pattern example
- `apps/api/lego-api/domains/sets/` - Full pattern example
- `apps/api/lego-api/domains/parts-lists/` - Full pattern example
- `apps/api/lego-api/domains/config/` - Config/caching domain
- `CLAUDE.md` - Cross-reference for consistency check

## Domain Pattern Verification

| Domain | application/ | adapters/ | ports/ | routes.ts | types.ts | __tests__/ |
|--------|-------------|-----------|--------|-----------|----------|-----------|
| gallery | yes | yes | yes | yes | yes | yes |
| wishlist | yes | yes | yes | yes | yes | yes |
| health | yes | no | no | yes | yes | yes |
| instructions | yes | yes | yes | yes | yes | yes |
| sets | yes | yes | yes | yes | yes | yes |
| parts-lists | yes | yes | yes | yes | yes | yes |
| config | yes | yes | yes | yes | yes | yes |

**Note:** Health domain is simplified - no external infrastructure dependencies, so no adapters/ or ports/ directories needed.
