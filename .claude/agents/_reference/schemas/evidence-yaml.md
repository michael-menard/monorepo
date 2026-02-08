# EVIDENCE.yaml Schema

Complete schema for the evidence bundle produced by dev-execute-leader.

---

## Core Structure

```yaml
schema: 1
story_id: "{STORY_ID}"
version: 1
timestamp: "{ISO timestamp}"

acceptance_criteria: []
touched_files: []
commands_run: []
endpoints_exercised: []
notable_decisions: []
known_deviations: []
test_summary: {}
e2e_tests: {}
coverage: {}
token_summary: {}
```

---

## Acceptance Criteria Mapping

```yaml
acceptance_criteria:
  - ac_id: "AC1"
    ac_text: "Format function works correctly"
    status: PASS | MISSING | PARTIAL
    evidence_items:
      - type: test
        path: "packages/*/src/__tests__/function.test.ts"
        description: "12 unit tests pass"
      - type: command
        command: "pnpm test"
        result: "PASS"
      - type: e2e
        path: "apps/web/playwright/tests/feature/flow.spec.ts"
        description: "Happy path E2E passes"
      - type: http
        path: "apps/api/__http__/endpoint.http"
        description: "GET /endpoint returns 200"
```

---

## Touched Files

```yaml
touched_files:
  - path: "packages/core/utils/src/format.ts"
    action: created | modified | deleted
    lines: 45
    description: "Core function implementation"
```

---

## Commands Run

```yaml
commands_run:
  - command: "pnpm build"
    result: SUCCESS | FAILURE
    output: "Build complete"
    timestamp: "2026-02-01T10:05:00Z"
```

---

## E2E Tests Section

```yaml
e2e_tests:
  status: pass | fail | exempt
  exempt_reason: null | "story_type: infra" | "story_type: docs"
  config: playwright.legacy.config.ts
  project: chromium-live | api-live
  mode: "live"
  tests_written: true | false

  results:
    total: 5
    passed: 5
    failed: 0
    skipped: 0

  failed_tests:
    - name: "test name"
      error: "error message"

  config_issues:
    - type: url_mismatch | env_var_missing | response_shape_mismatch
      description: "Description"
      expected: "Expected value"
      actual: "Actual value"
      files: ["file1.ts", "file2.ts"]
      resolution: "How it was fixed"

  videos: []
  screenshots: []
```

---

## Test Summary

```yaml
test_summary:
  unit: { pass: 24, fail: 0 }
  http: { pass: 4, fail: 0 }
  e2e: { pass: 3, fail: 0 }
```

---

## Token Summary

```yaml
token_summary:
  setup: { in: 1500, out: 800 }
  plan: { in: 8000, out: 3000 }
  execute: { in: 25000, out: 15000 }
```

---

## Full Example

```yaml
schema: 1
story_id: "WISH-2030"
version: 1
timestamp: "2026-02-01T10:10:00Z"

acceptance_criteria:
  - ac_id: "AC1"
    ac_text: "Format function works correctly"
    status: PASS
    evidence_items:
      - type: test
        path: "packages/core/utils/src/__tests__/format.test.ts"
        description: "12 unit tests pass"

touched_files:
  - path: "packages/core/utils/src/format.ts"
    action: created
    lines: 45

commands_run:
  - command: "pnpm build"
    result: SUCCESS
    timestamp: "2026-02-01T10:05:00Z"

endpoints_exercised:
  - method: GET
    path: "/wishlist/format"
    status: 200

test_summary:
  unit: { pass: 24, fail: 0 }
  e2e: { pass: 3, fail: 0 }

e2e_tests:
  status: pass
  config: playwright.legacy.config.ts
  project: chromium-live
  mode: "live"
  results:
    total: 3
    passed: 3
    failed: 0
    skipped: 0

coverage:
  lines: 96.5
  branches: 88.2

notable_decisions:
  - "Used existing pattern from @repo/gallery-core"

known_deviations: []
```
