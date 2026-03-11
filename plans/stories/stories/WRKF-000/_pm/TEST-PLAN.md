# Test Plan: WRKF-000 Story Workflow Harness

## Overview

This test plan validates that the story workflow machinery operates correctly by executing a trivial change through all lifecycle phases.

## Test Strategy

### Scope
- Verify artifact generation at each phase
- Verify phase transitions gate correctly
- Verify QA gate produces objective PASS/FAIL
- Verify no functional changes introduced

### Out of Scope
- Performance testing
- Load testing
- Security testing
- Feature behavior validation

## Test Scenarios

### TS1: Artifact Generation

| ID | Scenario | Expected Outcome |
|----|----------|------------------|
| TS1.1 | PM phase completes | All `_pm/*.md` files exist |
| TS1.2 | QA Audit completes | `QA-AUDIT-WRKF-000.md` exists |
| TS1.3 | Dev phase completes | `PROOF-WRKF-000.md` exists with evidence |
| TS1.4 | Elab phase completes | `ELAB-WRKF-000.md` exists |
| TS1.5 | Code Review completes | `CODE-REVIEW-WRKF-000.md` exists |
| TS1.6 | QA Verify completes | `QA-VERIFY-WRKF-000.md` exists |
| TS1.7 | QA Gate completes | `QA-GATE-WRKF-000.yaml` exists |

### TS2: Phase Gate Validation

| ID | Scenario | Expected Outcome |
|----|----------|------------------|
| TS2.1 | Attempt QA Audit without story file | Phase blocked |
| TS2.2 | Attempt Dev without QA Audit | Phase blocked |
| TS2.3 | Attempt QA Gate with missing evidence | FAIL decision |
| TS2.4 | All artifacts present with evidence | PASS decision |

### TS3: Evidence Quality

| ID | Scenario | Expected Outcome |
|----|----------|------------------|
| TS3.1 | PROOF file contains command output | Verifiable evidence |
| TS3.2 | QA-VERIFY contains test results | Actual output captured |
| TS3.3 | Evidence is prose only | QA Gate FAIL |

### TS4: No Functional Changes

| ID | Scenario | Expected Outcome |
|----|----------|------------------|
| TS4.1 | Run full test suite before harness | Baseline captured |
| TS4.2 | Run full test suite after harness | Identical results |
| TS4.3 | Compare API responses before/after | No differences |

## Verification Methods

### Automated
```bash
# Build passes
pnpm build

# Lint passes
pnpm lint

# Types check
pnpm check-types

# Tests pass
pnpm test
```

### Manual
1. Review each artifact for substantive content
2. Verify evidence sections contain actual output
3. Confirm no new utility files created
4. Verify trivial change is truly trivial

## Pass/Fail Criteria

### PASS
- All test scenarios pass
- All artifacts exist with substantive content
- Build/lint/test all pass
- No functional changes detected

### FAIL
- Any test scenario fails
- Any artifact missing or placeholder-only
- Build/lint/test failure
- Functional change detected

## Test Evidence Requirements

Each test scenario must produce:
1. Command output or screenshot
2. Timestamp of execution
3. Pass/Fail determination

Example:
```
## TS1.1: PM phase completes

**Executed:** 2026-01-22 10:30 MST
**Result:** PASS

$ ls -la plans/stories/WRKF-000/_pm/
total 24
drwxr-xr-x  5 user  staff   160 Jan 22 10:30 .
drwxr-xr-x  4 user  staff   128 Jan 22 10:25 ..
-rw-r--r--  1 user  staff  1234 Jan 22 10:30 BLOCKERS.md
-rw-r--r--  1 user  staff  2345 Jan 22 10:30 DEV-FEASIBILITY.md
-rw-r--r--  1 user  staff  3456 Jan 22 10:30 TEST-PLAN.md
```
