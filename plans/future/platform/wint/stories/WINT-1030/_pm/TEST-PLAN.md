# Test Plan: WINT-1030 - Populate Story Status from Directories

## Overview

This test plan covers the population script that scans story directories, infers status from frontmatter or lifecycle directory location, and populates the wint.stories database table.

## Test Strategy

### Unit Tests
- Test individual functions: status inference, enum mapping, directory scanning
- Mock filesystem and database operations
- Zod schema validation for migration artifacts

### Integration Tests
- Test full script execution with fixture data
- Real database operations (test database)
- Real filesystem operations (fixture directories)

### Performance Tests
- Large epic processing (100+ stories)
- Batch insert performance
- Connection pooling behavior

## Critical Test Cases

### 1. Status Inference from Frontmatter

**Test:** Story with `status: in-progress` in YAML frontmatter

**Setup:**
```yaml
---
id: TEST-0010
title: Test Story
status: in-progress
---
```

**Expected:** Database state = 'in_progress'

**Validation:** Query wint.stories WHERE story_id = 'TEST-0010' → state = 'in_progress'

---

### 2. Status Inference from Directory

**Test:** Story in UAT/ directory without status field in frontmatter

**Setup:**
- Story file: plans/future/platform/test-epic/UAT/TEST-0020/TEST-0020.md
- Frontmatter has no `status:` field

**Expected:** Database state = 'done' (UAT directory maps to 'done')

**Validation:** Query wint.stories WHERE story_id = 'TEST-0020' → state = 'done'

---

### 3. Priority Hierarchy for Duplicates

**Test:** Story exists in both backlog/ AND in-progress/ directories

**Setup:**
- plans/future/platform/test-epic/backlog/TEST-0030/TEST-0030.md
- plans/future/platform/test-epic/in-progress/TEST-0030/TEST-0030.md

**Expected:** Database state = 'in_progress' (most advanced lifecycle)

**Priority Hierarchy:**
1. UAT → 'done' (highest)
2. ready-for-qa → 'ready_for_qa'
3. in-progress → 'in_progress'
4. ready-to-work → 'ready_to_work'
5. elaboration → 'elaboration'
6. backlog → 'backlog' (lowest)

**Validation:** Query wint.stories WHERE story_id = 'TEST-0030' → state = 'in_progress'

---

### 4. Malformed YAML Handling

**Test:** Story with invalid YAML frontmatter

**Setup:**
```
---
id: TEST-0040
title: Missing closing delimiter
status: backlog
(no closing ---)
```

**Expected:**
- Story skipped
- Warning logged: "Skipping TEST-0040: malformed YAML"
- Processing continues for remaining stories
- Exit code 0 (success with warnings)

**Validation:**
- Query wint.stories WHERE story_id = 'TEST-0040' → 0 rows
- migration-log.json contains skip entry

---

### 5. Missing Frontmatter

**Test:** Story directory with no markdown file

**Setup:**
- Directory: plans/future/platform/test-epic/backlog/TEST-0050/
- No .md files in directory

**Expected:**
- Story skipped
- Warning logged: "Skipping TEST-0050: no story file found"
- Processing continues

**Validation:**
- Query wint.stories WHERE story_id = 'TEST-0050' → 0 rows
- migration-log.json contains skip entry

---

### 6. Enum Mapping

**Test:** Frontmatter status values map correctly to database enum

**Test Cases:**
| Frontmatter | Database Enum |
|-------------|---------------|
| backlog | backlog |
| elaboration | elaboration |
| ready-to-work | ready_to_work |
| in-progress | in_progress |
| ready-for-qa | ready_for_qa |
| done | done |
| cancelled | cancelled |
| blocked | blocked |

**Setup:** Stories with each status value in frontmatter

**Expected:** Correct enum mapping for all values

**Validation:** Query wint.stories, verify state column has correct enum value

---

### 7. Duplicate Story IDs

**Test:** Two stories with same ID in different epics

**Setup:**
- plans/future/platform/epic-a/TEST-0060/TEST-0060.md
- plans/future/platform/epic-b/TEST-0060/TEST-0060.md

**Expected:**
- First insert succeeds
- Second insert fails with unique constraint violation
- Error logged: "Duplicate story_id TEST-0060, skipping"
- Processing continues

**Validation:**
- Query wint.stories WHERE story_id = 'TEST-0060' → 1 row
- migration-log.json contains duplicate error

---

### 8. Dry-Run Verification

**Test:** Dry-run mode produces population plan without database writes

**Command:**
```bash
npx tsx populate-story-status.ts --dry-run
```

**Expected:**
- Population plan written to dry-run-plan.json
- Plan contains: story_id, inferred_status, directory_path for all discovered stories
- Zero database INSERT operations executed
- Console output: "DRY RUN: Would insert X stories"

**Validation:**
- Query wint.stories → 0 rows (or same count as before)
- dry-run-plan.json exists and is valid JSON

---

### 9. Large Epic Performance

**Test:** Epic with 100+ stories completes in <60 seconds

**Setup:**
- Generate 150 test stories across 6 lifecycle directories
- Mix of frontmatter and directory-inferred statuses

**Expected:**
- Execution time < 60 seconds
- All 150 stories inserted successfully
- No memory issues or connection pool exhaustion

**Validation:**
- Measure execution time
- Query wint.stories → 150 rows
- migration-log.json contains 150 success entries

---

### 10. Database Verification

**Test:** Post-population query confirms all stories inserted with correct status

**Command:**
```bash
npx tsx populate-story-status.ts --verify
```

**Expected:**
- Verification query: SELECT story_id, state, COUNT(*) FROM wint.stories GROUP BY state
- Output shows distribution by state
- Console output: "Verification PASSED: X stories inserted"

**Validation:**
- State distribution matches expected from fixtures
- No stories with NULL state
- All story_ids unique

---

## Edge Cases

### Edge Case 1: Frontmatter Overrides Directory

**Test:** Story in in-progress/ directory but frontmatter says `status: backlog`

**Expected:** Database state = 'backlog' (frontmatter wins)

**Rationale:** Frontmatter is explicit, directory is implicit

---

### Edge Case 2: Cancelled Status

**Test:** Story with `status: cancelled` in frontmatter

**Expected:** Database state = 'cancelled'

**Validation:** Enum mapping handles cancelled status

---

### Edge Case 3: Blocked Status

**Test:** Story with `status: blocked` in frontmatter

**Expected:** Database state = 'blocked'

**Validation:** Enum mapping handles blocked status

---

### Edge Case 4: Nested Epic Structure

**Test:** Story in nested epic directory

**Setup:**
- plans/future/platform/parent-epic/child-epic/TEST-0070/TEST-0070.md

**Expected:**
- Story discovered and processed
- Epic inferred as 'child-epic'

**Validation:** Query wint.stories WHERE story_id = 'TEST-0070' → epic = 'child-epic'

---

### Edge Case 5: Missing Required Fields

**Test:** Story with missing title or id in frontmatter

**Setup:**
```yaml
---
status: backlog
# title missing
---
```

**Expected:**
- Story skipped
- Error logged: "Skipping: missing required field 'title'"
- Processing continues

**Validation:**
- Story not in database
- migration-log.json contains validation error

---

## Test Data Requirements

### Fixture Structure

Create test fixture at `packages/backend/orchestrator/src/scripts/__fixtures__/story-population/`:

```
backlog/
  TEST-B010/TEST-B010.md (minimal frontmatter)
  TEST-B020/TEST-B020.md (complete frontmatter)
elaboration/
  TEST-E010/TEST-E010.md
ready-to-work/
  TEST-R010/TEST-R010.md
in-progress/
  TEST-I010/TEST-I010.md (with status field)
  TEST-I020/TEST-I020.md (without status field)
ready-for-qa/
  TEST-Q010/TEST-Q010.md
UAT/
  TEST-U010/TEST-U010.md
malformed/
  TEST-M010/TEST-M010.md (invalid YAML)
  TEST-M020/ (no .md file)
duplicates/
  epic-a/TEST-D010/TEST-D010.md
  epic-b/TEST-D010/TEST-D010.md
```

### Fixture Stories

Each fixture should have:
- Valid YAML frontmatter (except malformed tests)
- Mix of complete metadata (title, description, epic, priority, surfaces) and minimal (id, title only)
- Various status field combinations (present, absent, different values)

---

## Test Execution

### Unit Tests

```bash
pnpm test packages/backend/orchestrator/src/scripts/__tests__/populate-story-status.test.ts
```

**Coverage Target:** 80%+ for core functions

---

### Integration Tests

```bash
pnpm test packages/backend/orchestrator/src/scripts/__tests__/populate-story-status.integration.test.ts
```

**Requirements:**
- Test database available
- Fixture data seeded
- Database reset between tests

---

### Performance Tests

```bash
pnpm test packages/backend/orchestrator/src/scripts/__tests__/populate-story-status.perf.test.ts
```

**Requirements:**
- 150-story fixture set
- Timing instrumentation
- Resource monitoring

---

## Test Environment

### Database Setup

```bash
# Create test database
createdb wint_test

# Apply schema migrations
pnpm db:migrate:test

# Verify schema
psql wint_test -c "\d wint.stories"
```

### Fixture Setup

```bash
# Generate fixtures
pnpm tsx generate-test-fixtures.ts --count 150

# Verify fixtures
ls -R packages/backend/orchestrator/src/scripts/__fixtures__/story-population/
```

---

## Validation Queries

### Post-Population Verification

```sql
-- Total stories inserted
SELECT COUNT(*) FROM wint.stories;

-- Distribution by state
SELECT state, COUNT(*)
FROM wint.stories
GROUP BY state
ORDER BY COUNT(*) DESC;

-- Stories with NULL state (should be 0)
SELECT COUNT(*) FROM wint.stories WHERE state IS NULL;

-- Duplicate story_ids (should be 0)
SELECT story_id, COUNT(*)
FROM wint.stories
GROUP BY story_id
HAVING COUNT(*) > 1;

-- Stories with missing required fields
SELECT story_id FROM wint.stories WHERE title IS NULL OR title = '';
```

---

## Success Criteria

- [ ] All 10 critical test cases pass
- [ ] All 5 edge cases handled correctly
- [ ] Unit test coverage ≥ 80%
- [ ] Integration tests pass with real database
- [ ] Performance test: 100+ stories in <60s
- [ ] Dry-run mode produces accurate plan
- [ ] Verify mode confirms database state
- [ ] Malformed YAML skipped gracefully
- [ ] Duplicate story IDs handled without failure
- [ ] Migration log captures all operations

---

## Test Execution Log

Document test execution results in migration-log.json:

```json
{
  "timestamp": "2026-02-16T...",
  "mode": "execute",
  "stories_discovered": 150,
  "stories_inserted": 145,
  "stories_skipped": 5,
  "errors": [
    {
      "story_id": "TEST-M010",
      "reason": "malformed YAML",
      "action": "skipped"
    }
  ],
  "duration_ms": 18234
}
```

---

TEST PLAN COMPLETE
