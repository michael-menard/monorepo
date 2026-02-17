# Test Data Fixtures for WINT-1090 Migration

This directory contains SQL test fixtures for validating the WINT-1090 Phase 0 migration (workflow artifact tables).

## Purpose

These fixtures provide sample data for testing the 5 new workflow artifact tables:
- `wint.elaborations`
- `wint.implementation_plans`
- `wint.verifications`
- `wint.proofs`
- `wint.token_usage`

## Files

### test-data-stories.sql
Sample story records in various states to serve as foreign key targets for workflow artifacts.

**Contents:**
- 5-10 stories covering all story states (draft, backlog, in_progress, ready_for_qa, in_qa, done)
- Mix of priorities (P0-P4)
- Mix of story types (feature, bug, tech-debt, spike)
- Both with and without feature_id foreign keys

**Usage:**
```bash
psql -h localhost -p 5432 -U postgres -d lego_projects -f test-data-stories.sql
```

### test-data-workflow-artifacts.sql
Sample workflow artifact records demonstrating typical usage patterns.

**Contents:**
- Elaborations for 2-3 stories (various verdict types)
- Implementation plans for 2-3 stories (multiple versions per story)
- Verifications for 2-3 stories (qa_verify, review, uat types)
- Proofs for 2-3 stories (various AC pass rates)
- Token usage for 2-3 stories (multiple phases per story)

**Usage:**
```bash
# Load stories first (required for foreign keys)
psql -h localhost -p 5432 -U postgres -d lego_projects -f test-data-stories.sql

# Then load workflow artifacts
psql -h localhost -p 5432 -U postgres -d lego_projects -f test-data-workflow-artifacts.sql
```

### test-data-edge-cases.sql
Edge case data for testing constraints and boundary conditions.

**Contents:**
- NULL optional columns
- Large JSONB content
- High version numbers
- Large token counts (>1M tokens)
- Empty arrays/objects in JSONB

**Usage:**
```bash
# Load after stories and artifacts
psql -h localhost -p 5432 -U postgres -d lego_projects -f test-data-edge-cases.sql
```

## Load Order

**IMPORTANT:** Load fixtures in this order to satisfy foreign key constraints:

1. `test-data-stories.sql` (provides story UUIDs)
2. `test-data-workflow-artifacts.sql` (references stories)
3. `test-data-edge-cases.sql` (references stories)

## Cleanup

To remove all test data:

```sql
-- Remove workflow artifacts (CASCADE will handle this)
DELETE FROM wint.elaborations WHERE created_by = 'test-fixture';
DELETE FROM wint.implementation_plans WHERE created_by = 'test-fixture';
DELETE FROM wint.verifications WHERE created_by = 'test-fixture';
DELETE FROM wint.proofs WHERE created_by = 'test-fixture';
DELETE FROM wint.token_usage WHERE story_id IN (
  SELECT id FROM wint.stories WHERE story_id LIKE 'WINT-TEST-%'
);

-- Remove test stories
DELETE FROM wint.stories WHERE story_id LIKE 'WINT-TEST-%';
```

## Validation Queries

After loading fixtures, validate with these queries:

```sql
-- Verify story count
SELECT COUNT(*) FROM wint.stories WHERE story_id LIKE 'WINT-TEST-%';

-- Verify workflow artifact counts
SELECT COUNT(*) FROM wint.elaborations;
SELECT COUNT(*) FROM wint.implementation_plans;
SELECT COUNT(*) FROM wint.verifications;
SELECT COUNT(*) FROM wint.proofs;
SELECT COUNT(*) FROM wint.token_usage;

-- Verify foreign key constraints
SELECT
  e.id,
  e.story_id,
  s.story_id as story_identifier
FROM wint.elaborations e
JOIN wint.stories s ON e.story_id = s.id
WHERE s.story_id LIKE 'WINT-TEST-%';

-- Verify unique constraints (should return 0 duplicates)
SELECT story_id, version, COUNT(*)
FROM wint.implementation_plans
GROUP BY story_id, version
HAVING COUNT(*) > 1;

SELECT story_id, type, version, COUNT(*)
FROM wint.verifications
GROUP BY story_id, type, version
HAVING COUNT(*) > 1;
```

## Notes

- All test data uses `created_by = 'test-fixture'` for easy identification
- Story IDs follow pattern `WINT-TEST-XXX` (e.g., WINT-TEST-001)
- UUIDs are generated via `gen_random_uuid()`
- JSONB content includes realistic structure but placeholder data
