# QA Verification Plan - CDBE-0010

**Story**: pgtap Test Harness Setup for DB Infrastructure Stories
**Story ID**: CDBE-0010
**Feature**: consolidate-db-enhancements
**Priority**: P1
**Type**: Infrastructure (Shell, SQL, Docker, CI)
**E2E Gate**: EXEMPT (infra story, no TypeScript)

**QA Lead**: [Your Name]
**Start Date**: 2026-03-18
**Status**: READY FOR QA VERIFICATION

---

## Executive Summary

CDBE-0010 sets up PostgreSQL unit testing infrastructure using pgtap (PostgreSQL TAP - Test Anything Protocol). The story is a prerequisite for all Phase 1 trigger stories (CDBE-1010 through CDBE-1040).

**Previous Phases Status**:

- Code Review: PASS (iteration 3, verdict PASS, 0 errors, 3 low-severity warnings)
- Verification (Fix Iteration 2): PASS (security fixes verified)

**Current Status**: Ready for QA acceptance criteria verification.

---

## Acceptance Criteria Overview

| AC ID | Description                                         | Status in Evidence | Verification Task                                               |
| ----- | --------------------------------------------------- | ------------------ | --------------------------------------------------------------- |
| AC1   | pgtap installed and runnable in local dev and CI    | PASS               | Verify docker-compose.pgtap.yml, Dockerfile, and CI workflow    |
| AC2   | Transaction-rollback test fixture helper documented | PASS               | Review tests/db/README.md and fixtures/rollback-helper.sql      |
| AC3   | Example trigger unit test passing                   | PASS               | Verify test_set_story_completed_at.sql test file and assertions |
| AC4   | CI pipeline runs pgtap suite on each PR             | PASS               | Verify .github/workflows/pgtap.yml workflow configuration       |

---

## Detailed Verification Tasks

### AC1: pgtap Installation and Runability

**Objective**: Verify pgtap is properly installed and configured in both development and CI environments.

**Files to Inspect**:

- `/tree/story/CDBE-0010/docker-compose.pgtap.yml`
- `/tree/story/CDBE-0010/infra/pgtap/Dockerfile`
- `/tree/story/CDBE-0010/scripts/db/run-pgtap.sh`

**Checklist**:

- [ ] **docker-compose.pgtap.yml**
  - [ ] Service named `pgtap-postgres` exists
  - [ ] Builds from `./infra/pgtap/Dockerfile`
  - [ ] Exposes port 5434 (bound to 127.0.0.1 for local dev only)
  - [ ] Sets environment variables: POSTGRES_PASSWORD (required)
  - [ ] Includes health check (expected: test connection to postgres)

- [ ] **infra/pgtap/Dockerfile**
  - [ ] Base image is `postgres:16`
  - [ ] Runs `apt-get update && apt-get install -y postgresql-16-pgtap libtap-parser-sourcehandler-pgtap-perl`
  - [ ] Installation succeeds without errors
  - [ ] No hardcoded passwords in Dockerfile

- [ ] **scripts/db/run-pgtap.sh**
  - [ ] Script syntax is valid (`bash -n scripts/db/run-pgtap.sh` should pass)
  - [ ] Defines PGTAP*DB*\* environment variables
  - [ ] Uses `:?` pattern to fail if PGTAP_DB_PASS not set: `PGTAP_DB_PASS="${PGTAP_DB_PASS:?error message}"`
  - [ ] Calls `pg_prove` with correct parameters: `--host`, `--port`, `--dbname`, `--username`
  - [ ] All variable expansions are properly quoted to prevent shell injection

**Evidence from Story**:

- Command: `docker compose -f docker-compose.pgtap.yml up -d`
- Result: SUCCESS — container pgtap-postgres started and became healthy
- Command: `docker compose -f docker-compose.pgtap.yml exec pgtap-postgres pg_prove --version`
- Result: `pg_prove 3.37` (pgtap installation confirmed)

**QA Verdict**:

- [ ] PASS (all checks pass)
- [ ] FAIL (document failures below)

**Notes**:

---

### AC2: Transaction-Rollback Test Fixture Helper Documented

**Objective**: Verify the transaction-rollback fixture helper is properly documented with clear explanation of the pattern.

**Files to Inspect**:

- `/tree/story/CDBE-0010/tests/db/fixtures/rollback-helper.sql`
- `/tree/story/CDBE-0010/tests/db/README.md`

**Checklist**:

- [ ] **fixtures/rollback-helper.sql**
  - [ ] File exists and contains SQL fixture code
  - [ ] Begins with `BEGIN;` (transaction start)
  - [ ] Ends with `ROLLBACK;` (rollback for test isolation)
  - [ ] Includes inline documentation explaining the pattern
  - [ ] Comments explain why ROLLBACK is used (test isolation, cleanup)

- [ ] **tests/db/README.md**
  - [ ] "Rollback Pattern" section exists
  - [ ] Explains BEGIN/ROLLBACK isolation model
  - [ ] Explains why rollback is important (prevents test pollution)
  - [ ] Shows example usage of the fixture
  - [ ] Documents pg_prove installation instructions
  - [ ] Includes reference to pgtap assertion reference
  - [ ] Mentions environment setup (.env.pgtap.example)

**QA Verdict**:

- [ ] PASS (documentation is clear and complete)
- [ ] FAIL (document issues below)

**Notes**:

---

### AC3: Example Trigger Unit Test Passing

**Objective**: Verify the example trigger unit test is present and passes all assertions.

**Files to Inspect**:

- `/tree/story/CDBE-0010/tests/db/triggers/test_set_story_completed_at.sql`

**Checklist**:

- [ ] **test_set_story_completed_at.sql**
  - [ ] File exists
  - [ ] Contains pgtap test function definition
  - [ ] Tests the `set_story_completed_at()` trigger function
  - [ ] Includes at least 6 test assertions (per evidence)
  - [ ] Assertions cover:
    - [ ] Trigger function exists
    - [ ] completed_at is NULL before transition
    - [ ] completed_at is set on transition to 'completed'
    - [ ] completed_at is not overwritten on second transition
    - [ ] completed_at works for multiple stories (idempotency)
    - [ ] completed_at remains NULL for non-completed states

**Test Execution Verification**:

- Command executed: `pg_prove --host localhost --username pgtap --dbname pgtap_test --verbose /tmp/test_set_story_completed_at.sql`
- Expected output: `1..6` (TAP test count)
- All assertions: `ok 1 - <description>`, `ok 2 - <description>`, ..., `ok 6 - <description>`
- Final line: `All tests successful. Files=1, Tests=6, 0 wallclock secs`
- Result: `PASS`

**QA Verdict**:

- [ ] PASS (test file exists and all assertions pass)
- [ ] FAIL (document failures below)

**Notes**:

---

### AC4: CI Pipeline Runs pgtap Suite on Each PR

**Objective**: Verify the GitHub Actions workflow is properly configured to run pgtap tests on pull requests.

**Files to Inspect**:

- `/.github/workflows/pgtap.yml`

**Checklist**:

- [ ] **Workflow File Structure**
  - [ ] Name: `name: pgtap` (or descriptive name)
  - [ ] Triggers on PRs: `on: [pull_request]` or `on: { pull_request: {...} }`
  - [ ] Triggers on pushes to main/develop (if applicable)
  - [ ] Conditional trigger: only when DB-related files change (via `paths:` filter)

- [ ] **Service Configuration**
  - [ ] Defines PostgreSQL service container: `services.postgres`
  - [ ] Image: `postgres:16`
  - [ ] Environment variable for password: `POSTGRES_PASSWORD: ${{ secrets.PGTAP_DB_PASSWORD }}`
  - [ ] Exposed port: 5432 (standard)
  - [ ] Health check configured

- [ ] **Steps Configuration**
  - [ ] Step 1: Check out code (`actions/checkout@v4` or similar)
  - [ ] Step 2: Install pgtap extension
    - [ ] Uses `apt-get update && apt-get install -y postgresql-16-pgtap pg_prove`
    - [ ] Sets PGPASSWORD environment variable: `${{ secrets.PGTAP_DB_PASSWORD }}`
  - [ ] Step 3: Apply database schema (baseline)
    - [ ] Runs migration/schema file (e.g., `999_full_schema_baseline.sql`)
  - [ ] Step 4: Run pgtap test suite
    - [ ] Executes `bash scripts/db/run-pgtap.sh`
    - [ ] Or equivalent pg_prove command

- [ ] **Security Best Practices**
  - [ ] No hardcoded passwords in workflow file
  - [ ] Uses GitHub Secrets: `${{ secrets.PGTAP_DB_PASSWORD }}`
  - [ ] No fallback environment variable defaults
  - [ ] Password only available in specific steps that need it

- [ ] **CI Environment Setup**
  - [ ] Sets `CI=true` environment variable (to suppress verbose mode)
  - [ ] Documented in README (verbose suppression in CI)

**QA Verdict**:

- [ ] PASS (workflow is properly configured)
- [ ] FAIL (document issues below)

**Notes**:

---

## Security Verification

This story includes security fixes from Fix Iteration 2. QA should verify:

### Shell Script Security

**File**: `scripts/db/run-pgtap.sh`

- [ ] **Password Error Handling**
  - [ ] Uses `:?` pattern: `PGTAP_DB_PASS="${PGTAP_DB_PASS:?error message}"`
  - [ ] Does NOT use fallback defaults: `${PGTAP_DB_PASS:-default}` (would allow unset passwords)
  - [ ] Script fails immediately if password unset

- [ ] **Shell Injection Protection**
  - [ ] All variable expansions are quoted: `"$VAR"` not `$VAR`
  - [ ] Array expansions use safe form: `"${ARRAY[@]}"` not `${ARRAY[@]}`
  - [ ] No command substitution without quoting
  - [ ] No unquoted paths in shell commands

- [ ] **Directory Traversal Protection**
  - [ ] Blocks paths containing `..` (prevents `../../etc/passwd`)
  - [ ] Verifies paths stay within `TESTS_DIR`
  - [ ] Resolves relative paths to absolute for validation
  - [ ] Exits with error message if validation fails

### CI Credential Management

**File**: `.github/workflows/pgtap.yml`

- [ ] **GitHub Secrets Only**
  - [ ] All password references use: `${{ secrets.PGTAP_DB_PASSWORD }}`
  - [ ] NO environment variable defaults: `${VAR:-default}`
  - [ ] NO hardcoded password values
  - [ ] Secret only injected at step-level environment

### Docker Security

**File**: `docker-compose.pgtap.yml`

- [ ] **Network Isolation**
  - [ ] Port binding: `127.0.0.1:5434:5432` (localhost only, not `0.0.0.0`)
  - [ ] Ephemeral test database unreachable from network

- [ ] **Password Error Handling**
  - [ ] Uses `:?` pattern: `POSTGRES_PASSWORD: ${PGTAP_DB_PASS:?error message}`
  - [ ] Docker Compose fails if password unset

**QA Verdict**:

- [ ] PASS (all security checks pass)
- [ ] FAIL (document issues below)

**Security Notes**:

---

## Testing and Documentation Verification

### File Structure

- [ ] Verify directory structure matches acceptance criteria:
  - [ ] `docker-compose.pgtap.yml` (in root of story)
  - [ ] `infra/pgtap/Dockerfile` (pgtap image definition)
  - [ ] `scripts/db/run-pgtap.sh` (test runner script)
  - [ ] `tests/db/fixtures/rollback-helper.sql` (fixture helper)
  - [ ] `tests/db/README.md` (complete documentation)
  - [ ] `tests/db/triggers/test_set_story_completed_at.sql` (example test)
  - [ ] `.github/workflows/pgtap.yml` (CI workflow)
  - [ ] `.env.pgtap.example` (example environment file)

### Documentation Quality

- [ ] **tests/db/README.md**
  - [ ] Clear, step-by-step instructions for local setup
  - [ ] Example: how to run pgtap tests locally
  - [ ] Environment variable reference table
  - [ ] Security guidance (credentials, verbose suppression, port binding)
  - [ ] Reference to pgtap assertion syntax
  - [ ] Example test case walkthrough

**QA Verdict**:

- [ ] PASS (documentation is complete and clear)
- [ ] PARTIAL (some sections incomplete, document below)
- [ ] FAIL (major gaps, document below)

**Documentation Notes**:

---

## Integration Verification

### CI Workflow Execution

To verify CI workflow execution, you may perform a test push or create a draft PR:

- [ ] Create a draft PR with a change to a DB-related file (e.g., update .env.pgtap.example)
- [ ] Observe that `.github/workflows/pgtap.yml` triggers
- [ ] Verify workflow runs all steps without error
- [ ] Confirm pgtap tests execute and pass in CI environment
- [ ] Check that verbose mode is suppressed (CI=true)

**Workflow Test Verdict**:

- [ ] PASS (workflow executes successfully)
- [ ] FAIL (document failures below)

**CI Test Notes**:

---

## Non-Acceptance Issues

List any issues found that are NOT acceptance criteria blockers:

- [ ] None
- [ ] (describe issues)

---

## Final QA Verdict

**All Acceptance Criteria Met**: [ ] YES [ ] NO

**Overall Status**:

- [ ] **PASS** — Story ready for deployment
- [ ] **FAIL** — Story must return to development/review

**QA Sign-Off**:

- QA Lead Name: **********\_\_\_\_**********
- Date: **********\_\_\_\_**********
- Signature: **********\_\_\_\_**********

**Issues Preventing Pass** (if any):

---

## Recommended Next Steps

1. **If PASS**: Story is ready for release/merge
2. **If FAIL**: Return story to development with documented issues

---

## Appendix: File Checklist

Quick reference for all files that should exist:

```
tree/story/CDBE-0010/
├── docker-compose.pgtap.yml              [AC1]
├── infra/pgtap/
│   └── Dockerfile                        [AC1]
├── scripts/db/
│   └── run-pgtap.sh                      [AC1, AC4]
├── tests/db/
│   ├── README.md                         [AC2, AC3]
│   ├── fixtures/
│   │   └── rollback-helper.sql           [AC2]
│   └── triggers/
│       └── test_set_story_completed_at.sql [AC3]
├── .github/workflows/
│   └── pgtap.yml                         [AC4]
├── .env.pgtap.example                    [AC2]
└── _implementation/
    ├── EVIDENCE.yaml                     [QA Input]
    ├── REVIEW.yaml                       [QA Input]
    ├── QA-SETUP.yaml                     [QA Setup]
    └── QA-VERIFICATION-PLAN.md           [This File]
```

All files should exist. Missing files indicate incomplete implementation.

---

## References

- Story Location: `/tree/story/CDBE-0010`
- Evidence Artifact: `_implementation/EVIDENCE.yaml`
- Code Review Results: `_implementation/REVIEW.yaml` (iteration 3)
- Verification Report: `_implementation/VERIFICATION.iter2.md`
- PR: #523
- Branch: `story/CDBE-0010`
