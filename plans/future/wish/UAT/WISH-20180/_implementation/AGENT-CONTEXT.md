# Agent Context - WISH-20180

## Story Context

```yaml
story_id: WISH-20180
feature_dir: plans/future/wish
command: qa-verify-story
current_phase: setup
status: in-qa
base_path: plans/future/wish/UAT/WISH-20180/
artifacts_path: plans/future/wish/UAT/WISH-20180/_implementation/
created: 2026-01-29T19:00:00Z
updated: 2026-01-31T23:00:00Z
```

## Story Summary

Implement CI job to validate schema changes against policy. This is a follow-up to WISH-2057 that automates enforcement of schema evolution policies via GitHub Actions CI validation.

## Key Files

### Inputs
- Story: `plans/future/wish/UAT/WISH-20180/WISH-20180.md`
- Elaboration: `plans/future/wish/UAT/WISH-20180/ELAB-WISH-20180.md`
- Proof: `plans/future/wish/UAT/WISH-20180/PROOF-WISH-20180.md`
- Verification: `plans/future/wish/UAT/WISH-20180/_implementation/VERIFICATION.yaml`
- Analysis: `_implementation/ANALYSIS.md`
- Scope: `_implementation/SCOPE.md`

### Outputs (to be created)
- Implementation Plan: `_implementation/IMPLEMENTATION-PLAN.md`
- Plan Validation: `_implementation/PLAN-VALIDATION.md`
- Backend Log: `_implementation/BACKEND-LOG.md` (N/A - no API)
- Frontend Log: `_implementation/FRONTEND-LOG.md` (N/A - no UI)
- Verification: `_implementation/VERIFICATION.md`
- Verification Summary: `_implementation/VERIFICATION-SUMMARY.md`
- Proof: `PROOF-WISH-20180.md`

## Implementation Files

### Primary Deliverables
1. `.github/workflows/schema-validation.yml` - CI workflow
2. `packages/backend/database-schema/scripts/validate-schema-changes.ts` - Validation script
3. `packages/backend/database-schema/scripts/__tests__/validate-schema-changes.test.ts` - Tests
4. `packages/backend/database-schema/docs/CI-SCHEMA-VALIDATION.md` - Documentation

### Package.json Updates
- `packages/backend/database-schema/package.json` - Add `validate:schema` script

## Reference Files

### Existing Infrastructure
- `.github/workflows/ci.yml` - Existing CI patterns
- `packages/backend/database-schema/src/migrations/app/meta/_journal.json` - Migration journal
- `packages/backend/database-schema/src/migrations/app/*.sql` - Migration files
- `packages/backend/database-schema/drizzle.config.ts` - Drizzle configuration

## Acceptance Criteria Count

- Total: 20 ACs
- CI Workflow: 5 ACs (1-5)
- Migration Validation: 4 ACs (6-9)
- Breaking Changes: 5 ACs (10-14)
- Non-Breaking Changes: 4 ACs (15-18)
- Documentation: 2 ACs (19-20)

## Notes

- This is a CI/tooling story with NO API endpoints
- No backend or frontend coders needed
- Implementation is infrastructure-focused (GitHub Actions + TypeScript script)
- Parent story WISH-2057's SCHEMA-EVOLUTION-POLICY.md may not exist yet
