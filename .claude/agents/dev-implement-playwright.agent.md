---
created: 2026-01-24
updated: 2026-02-01
version: 4.0.0
type: worker
permission_level: test-run
requires_live_mode: true
---

# Agent: dev-implement-playwright

## Mission
Run Playwright tests for UI changes and/or API endpoints based on scope flags.
Captures video evidence for UI tests and response validation for API tests.

**CRITICAL (v4 - ADR-006)**: This agent MUST run with LIVE resources. NO MOCKING.
See ADR-005 and ADR-006 for rationale.

## Inputs (authoritative)
- Feature directory (e.g., `plans/features/wishlist`)
- Story ID (e.g., `WISH-001`)
- **mode**: MUST be `LIVE` (no mocking)
- Scope flags:
  - `frontend_impacted`: true/false (run UI tests)
  - `backend_impacted`: true/false (run API tests)

Read from story directory:
- `{FEATURE_DIR}/in-progress/{STORY_ID}/{STORY_ID}.md`
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/PLAN.yaml`
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/SCOPE.yaml`

## When to Run
When `frontend_impacted=true` OR `backend_impacted=true` (check SCOPE.yaml or prompt context).

---

## Pre-Flight Checks (REQUIRED)

**Before running ANY tests, verify these conditions:**

### Check 1: MSW is Disabled
```bash
# VITE_ENABLE_MSW must NOT be "true"
if [ "$VITE_ENABLE_MSW" = "true" ]; then
  echo "ERROR: MSW is enabled. E2E tests require live mode."
  exit 1
fi
```

### Check 2: Backend is Running (if backend_impacted)
```bash
# Health check must succeed
curl -s -f http://localhost:3001/health || {
  echo "ERROR: Backend not running. Start with: pnpm --filter lego-api dev"
  exit 1
}
```

### Check 3: Correct Playwright Config
```bash
# MUST use playwright.legacy.config.ts for live mode
CONFIG_FILE="playwright.legacy.config.ts"
```

### Check 4: Cognito Credentials Available
```bash
# Test credentials must be set
if [ -z "$VITE_AWS_USER_POOL_ID" ]; then
  # Use test pool defaults
  export VITE_AWS_USER_POOL_ID="us-east-1_vtW1Slo3o"
  export VITE_AWS_USER_POOL_WEB_CLIENT_ID="4527ui02h63b7c0ra7vs00gua5"
fi
```

**If any pre-flight check fails, report BLOCKED and do not proceed.**

---

## Test Types

### UI Tests (when frontend_impacted=true)
- Run Playwright browser tests for UI changes
- Generate video recordings of test execution
- Verify visual behavior matches acceptance criteria

### API Tests (when backend_impacted=true)
- Run Playwright API tests for backend endpoints
- Validate request/response contracts
- Test error handling and edge cases
- Verify API behavior matches acceptance criteria

## Non-negotiables
- **MUST use LIVE mode** - No MSW mocking (ADR-005, ADR-006)
- **MUST use playwright.legacy.config.ts** - This config is set for live APIs
- **MUST verify pre-flight checks** before running tests
- Run REAL Playwright tests, not hypothetical ones
- For UI tests: Generate actual video recordings
- For API tests: Capture actual request/response data
- If tests fail, record the failure clearly AND log config issues
- Run BOTH test types if BOTH scope flags are true
- **NEVER set VITE_ENABLE_MSW=true**
- **NEVER use chromium-mocked or api-mocked projects**

## Required Steps

### Step 1: Determine Test Scope
Read scope flags from prompt context:
- If `frontend_impacted=true`: Run UI tests
- If `backend_impacted=true`: Run API tests
- If both: Run both test suites

### Step 2: Identify Relevant Tests

**For UI tests:**
1. Identify which Playwright tests cover the story's UI changes
2. Look in `apps/web/playwright/tests/` for relevant test files

**For API tests:**
1. Identify which Playwright API tests cover the story's endpoints
2. Look in `apps/web/playwright/tests/` for API test files (e.g., `*.api.spec.ts`)
3. If no API tests exist for the new endpoints, note this as a gap

### Step 3: Run Tests (LIVE MODE ONLY)

**CRITICAL**: Always use `playwright.legacy.config.ts` and `chromium-live` project.

**Environment Setup (before running):**
```bash
export VITE_ENABLE_MSW=false
export VITE_SERVERLESS_API_BASE_URL=http://localhost:3001
```

**UI Tests (if frontend_impacted):**
```bash
pnpm --filter playwright test \
  --config=playwright.legacy.config.ts \
  --project=chromium-live \
  --grep "<relevant-test-pattern>" \
  --video on
```

**API Tests (if backend_impacted):**
```bash
pnpm --filter playwright test \
  --config=playwright.legacy.config.ts \
  --project=api-live \
  --grep "<api-test-pattern>"
```

**Both (if both impacted):**
```bash
pnpm --filter playwright test \
  --config=playwright.legacy.config.ts \
  --project=chromium-live \
  --project=api-live \
  --grep "<pattern>"
```

**NEVER use these (mocked projects):**
- `--project=chromium-mocked` ❌
- `--project=api-mocked` ❌
- `VITE_ENABLE_MSW=true` ❌

### Step 4: Capture Evidence

**For UI tests:**
- Video URL/path from test output
- Screenshots of key states

**For API tests:**
- Request/response logs
- Status codes and response times
- Validation results

### Step 5: Map to Acceptance Criteria
Verify that test results demonstrate the expected behavior from the story's acceptance criteria.

### Step 6: Log Config Issues (IMPORTANT)

If ANY test fails due to configuration mismatches, log them for workflow improvement:

**Common Config Issues to Watch For:**

| Issue Type | Symptom | Common Cause |
|------------|---------|--------------|
| `url_mismatch` | 404 errors | MSW mock path ≠ real API path |
| `env_var_missing` | undefined errors | Missing VITE_* variable |
| `response_shape_mismatch` | Type errors | Mock returns different shape than real API |
| `auth_config_mismatch` | 401 errors | Wrong Cognito pool/client |
| `cors_issue` | CORS errors | Backend missing headers |

**Log format (for EVIDENCE.yaml):**
```yaml
config_issues:
  - type: url_mismatch
    description: "Frontend expects /api/v2/wishlist but backend serves /wishlist"
    expected: "/api/v2/wishlist/items"
    actual: "/wishlist"
    files:
      - apps/web/main-app/src/mocks/handlers.ts
      - apps/api/lego-api/server.ts
      - apps/web/main-app/vite.config.ts
    resolution: "Added Vite proxy rewrite for /api/v2/wishlist -> /wishlist"
```

**This feedback loop is critical for improving the workflow over time.**

## Output (MUST APPEND)
Append to:
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/VERIFICATION.md`

## Required Structure (append to VERIFICATION.md)

```markdown
# Playwright E2E Tests

## UI Tests
- **Scope**: frontend_impacted = {true/false}
- **Command**: `<command>`
- **Result**: PASS / FAIL / SKIPPED
- **Tests run**: <count>
- **Tests passed**: <count>
- **Video URL**: <path or URL>
- **Behavior demonstrated**:
  - <what the video shows, mapped to story AC>
- **Output**:
```
<relevant snippet>
```

## API Tests
- **Scope**: backend_impacted = {true/false}
- **Command**: `<command>`
- **Result**: PASS / FAIL / SKIPPED
- **Tests run**: <count>
- **Tests passed**: <count>
- **Endpoints tested**:
  - `<METHOD> <endpoint>` - <status>
- **Behavior demonstrated**:
  - <what the tests verify, mapped to story AC>
- **Output**:
```
<relevant snippet>
```

## Summary
| Test Type | Result | Tests Passed |
|-----------|--------|--------------|
| UI | PASS/FAIL/SKIPPED | X/Y |
| API | PASS/FAIL/SKIPPED | X/Y |
```

## Completion Signal
- `PLAYWRIGHT COMPLETE` - All applicable tests passed
- `PLAYWRIGHT FAILED: <reason>` - One or more tests failed
- `PLAYWRIGHT PARTIAL: UI passed, API failed` (or vice versa)

## Blockers
If unable to run Playwright, write details to:
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/BLOCKERS.md`
and end with "BLOCKED: <reason>".

## API Test Conventions

API tests should be placed in `apps/web/playwright/tests/` with naming:
- `*.api.spec.ts` for pure API tests
- Tests can use `request` fixture from Playwright for API calls

Example API test pattern:
```typescript
import { test, expect } from '@playwright/test'

test.describe('API: /api/endpoint', () => {
  test('should return expected data', async ({ request }) => {
    const response = await request.get('/api/endpoint')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data).toMatchObject({ /* expected shape */ })
  })
})
```
