# Lean Documentation Standard

All agent-generated documentation follows these rules to minimize token waste.

---

## Rule 1: Structured Over Prose

**WRONG (verbose):**
```markdown
## Implementation Summary
The implementation adds a new endpoint for user authentication.
We created a handler in the auth package that validates credentials
against the database and returns a JWT token. Error handling covers
invalid credentials, missing fields, and database failures. The tests
verify all these scenarios are handled correctly.
```

**RIGHT (structured):**
```markdown
## Implementation
| Item | Value |
|------|-------|
| Endpoint | POST /auth/login |
| Handler | packages/backend/auth/login.ts |
| Tests | 4 added |
| Coverage | 89% |

### Files Changed
- `+` packages/backend/auth/login.ts
- `~` packages/backend/auth/index.ts
- `+` packages/backend/auth/__tests__/login.test.ts
```

---

## Rule 2: Skip Empty Sections

**WRONG:**
```markdown
## Security Considerations
None identified.

## Breaking Changes
None.

## Migration Required
No.

## Dependencies Added
None.
```

**RIGHT:**
Omit sections entirely if empty. Only include sections with actual content.

---

## Rule 3: YAML for Structured Data

Use YAML instead of markdown tables for machine-readable output:

**For verification/gate files:**
```yaml
verdict: PASS
findings:
  - id: SEC-001
    severity: high
    issue: "Missing rate limit"
    file: src/api/login.ts
    line: 45
```

**For status tracking:**
```yaml
story: STORY-XXX
status: ready-for-qa
phases:
  implementation: complete
  code_review: complete
  qa: pending
```

---

## Rule 4: Evidence as References, Not Copies

**WRONG:**
```markdown
## Test Output
```
PASS src/auth/login.test.ts
  ✓ should return 200 for valid credentials (45ms)
  ✓ should return 401 for invalid password (12ms)
  ✓ should return 400 for missing email (8ms)
  ✓ should return 400 for missing password (7ms)
  ✓ should hash password before storage (23ms)
... (50 more lines of test output)
```
```

**RIGHT:**
```markdown
## Test Results
| Suite | Pass | Fail | File |
|-------|------|------|------|
| login | 5 | 0 | src/auth/login.test.ts |
| session | 3 | 0 | src/auth/session.test.ts |

Full output: `_implementation/test-output.log`
```

---

## Rule 5: One-Line Verdicts

**WRONG:**
```markdown
## Final Assessment

After careful review of all the acceptance criteria, test results,
code quality metrics, and architectural compliance checks, I have
determined that this implementation meets all requirements and is
ready to proceed to the next phase of the workflow.

**Verdict: PASS**
```

**RIGHT:**
```markdown
## Verdict
PASS - All ACs met, tests pass, no violations.
```

---

## Standard File Formats

### VERIFICATION.yaml (replaces CODE-REVIEW + QA-VERIFY + QA-GATE)

```yaml
schema: 1
story: STORY-XXX
updated: 2024-01-15T10:30:00Z

# Overall verdict
verdict: PASS | CONCERNS | FAIL
reason: "One line summary"

# Code review results
code_review:
  verdict: PASS | FAIL
  lint: PASS
  types: PASS
  security: PASS
  findings: []  # Only if issues found

# QA verification results
qa_verify:
  verdict: PASS | FAIL
  tests_run: true
  test_results:
    unit: { pass: 12, fail: 0 }
    integration: { pass: 4, fail: 0 }
    e2e: { pass: 2, fail: 0 }
  coverage: 87%
  acs_verified:
    - ac: "User can log in with valid credentials"
      status: PASS
      evidence: "test:login.test.ts:12"
    - ac: "Invalid credentials return 401"
      status: PASS
      evidence: "test:login.test.ts:28"

# Issues (only if any exist)
issues:
  - id: TEST-001
    severity: medium
    issue: "Missing edge case test for expired tokens"
    action: "Add test in session.test.ts"

# Gate decision
gate:
  decision: PASS | CONCERNS | FAIL | WAIVED
  waiver: null  # or { reason: "...", approved_by: "..." }
```

### EPIC-REVIEW.yaml (replaces 6 separate review files)

```yaml
schema: 1
epic: PREFIX
reviewed: 2024-01-15T10:30:00Z

verdict: READY | CONCERNS | BLOCKED
summary: "One line overall assessment"

perspectives:
  engineering:
    verdict: READY | CONCERNS | BLOCKED
    critical: []
    high: []
    recommendations: []

  product:
    verdict: READY | CONCERNS | BLOCKED
    gaps: []
    prioritization_changes: []

  qa:
    verdict: READY | CONCERNS | BLOCKED
    testability_issues: []
    coverage_gaps: []

  ux:
    verdict: READY | CONCERNS | BLOCKED
    a11y_issues: []
    flow_gaps: []

  platform:
    verdict: READY | CONCERNS | BLOCKED
    infra_concerns: []
    deployment_risks: []

  security:
    verdict: READY | CONCERNS | BLOCKED
    owasp_gaps: []
    data_concerns: []

# Aggregated findings (only non-empty)
findings:
  critical: []
  high: []
  medium: []

# Recommendations
new_stories: []
stories_to_split: []
stories_to_defer: []
```

---

## Token Savings Estimate

| Change | Tokens Saved |
|--------|--------------|
| Structured over prose | ~40% per section |
| Skip empty sections | ~500 per file |
| YAML over markdown | ~20% for tables |
| References over copies | ~1k for test output |
| One-line verdicts | ~200 per verdict |

**Total: ~50% reduction in documentation tokens**
