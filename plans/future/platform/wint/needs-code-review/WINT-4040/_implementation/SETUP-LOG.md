# WINT-4040 Setup Log

## Story
**ID**: WINT-4040
**Title**: Infer Existing Capabilities from Story History and Populate graph.feature_capabilities
**Status**: ready-to-work → in-progress
**Priority**: high
**Points**: 5

## Scope Analysis

### Touches
- Backend: YES (TypeScript script)
- Frontend: NO
- Database: YES (graph.capabilities table)
- Infrastructure: NO

### Touched Paths
- `packages/backend/**` (script location)
- `apps/api/**` (API integration if needed)

### Risk Flags
- **Migrations**: TRUE (schema changes, population script)
- **Performance**: TRUE (bulk insert operations)
- **Auth**: FALSE
- **Payments**: FALSE
- **External APIs**: FALSE
- **Security**: FALSE

## Dependencies
- WINT-4010 (prerequisite)
- WINT-4030 (prerequisite - graph.features populated)

## CLAUDE.md Constraints Applied
1. ✓ Use Zod schemas for all types
2. ✓ No barrel files (named exports)
3. ✓ Use @repo/logger for logging (not console)
4. ✓ Minimum 45% test coverage required
5. ✓ Named exports preferred

## Story Requirements Summary
- Infer capabilities from feature story history keywords
- Map keywords to CRUD lifecycle stages (create/read/update/delete)
- Populate `graph.capabilities` table with inferred records
- Support --dry-run mode for preview
- Emit structured summary result (attempted, succeeded, failed, skipped)

## Setup Complete
- Checkpoint artifact: WINT-4040 iteration 0
- Scope artifact: backend + database, high migration risk
- Working set synced to KB
- Ready for implementation phase

## Next Steps
1. Read full story requirements from WINT-4040.md
2. Implement keyword mapping function (pure function)
3. Implement database insertion script with migration support
4. Write comprehensive unit and integration tests
5. Run full verification before code review
