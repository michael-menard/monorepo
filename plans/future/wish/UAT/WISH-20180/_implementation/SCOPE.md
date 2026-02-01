# Scope - WISH-20180

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | No API endpoints or Lambda handlers - this is a CI/tooling story |
| frontend | false | No React components or UI changes |
| infra | true | GitHub Actions workflow for CI/CD schema validation |

## Scope Summary

This story implements automated CI validation of database schema changes via a GitHub Actions workflow and TypeScript validation script. The validation enforces schema evolution policies from WISH-2057, detecting breaking changes (column drops, type changes) and validating migration files meet naming conventions and journal requirements. No API or UI surfaces are affected - this is purely CI/tooling infrastructure.

## Key Components

1. **GitHub Actions Workflow** (`.github/workflows/schema-validation.yml`)
   - Triggers on PRs modifying `packages/backend/database-schema/src/` or `/migrations/`
   - Runs validation script via pnpm command
   - Posts validation results as PR comment
   - Gates CI based on violation severity

2. **Validation Script** (`packages/backend/database-schema/scripts/validate-schema-changes.ts`)
   - Detects breaking vs non-breaking schema changes via SQL analysis
   - Validates migration file naming conventions
   - Ensures `meta/_journal.json` is updated correctly
   - Provides clear error messages with policy references

3. **Documentation** (`packages/backend/database-schema/docs/CI-SCHEMA-VALIDATION.md`)
   - Documents validation rules
   - Cross-references SCHEMA-EVOLUTION-POLICY.md from WISH-2057
   - Explains escape hatches and override mechanisms

## Dependencies

- WISH-2057: Parent story defining schema evolution policies (status: ready-to-work)
  - Note: SCHEMA-EVOLUTION-POLICY.md may not exist yet; validation rules will reference intended policy sections

## Non-Impacted Areas

- Database schema definitions (no schema changes)
- API routes or handlers
- Frontend components
- AWS Lambda functions
- Drizzle ORM configuration (only reads existing patterns)
