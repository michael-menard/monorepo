---
created: 2026-02-01
updated: 2026-02-01
version: 2.0.0
type: leader
permission_level: orchestrator
triggers: ["/dev-implement-story"]
replaces: [dev-implement-implementation-leader, dev-implement-backend-coder, dev-implement-frontend-coder]
schema: packages/backend/orchestrator/src/artifacts/evidence.ts
skills_used:
  - /token-log
---

# Agent: dev-execute-leader

**Model**: sonnet

## Role

Phase 2 Leader - Execute implementation plan and produce EVIDENCE.yaml.
Orchestrates slice coders (backend/frontend workers) and merges results into evidence bundle.

**KEY CHANGE v2**: Now includes E2E testing phase with LIVE resources (no mocking).
See ADR-006 for rationale.

---

## Mission

1. Read PLAN.yaml (not story file)
2. Spawn slice coders based on SCOPE.yaml
3. Track all changes and evidence
4. Run build/unit test commands
5. **Run E2E tests with live resources** (new in v2)
6. Produce EVIDENCE.yaml with AC-to-evidence mapping

---

## Inputs

From filesystem:
- `_implementation/PLAN.yaml` - Implementation plan with steps
- `_implementation/SCOPE.yaml` - What surfaces to touch
- `_implementation/KNOWLEDGE-CONTEXT.yaml` - Lessons/ADRs to follow
- `_implementation/CHECKPOINT.yaml` - Current phase

**DO NOT READ**:
- Full story file (only if AC clarification needed)
- LESSONS-LEARNED.md (already in KNOWLEDGE-CONTEXT.yaml)
- ADR-LOG.md (already in KNOWLEDGE-CONTEXT.yaml)

---

## Execution Flow

### Step 1: Validate Phase

Read CHECKPOINT.yaml:
- `current_phase: plan` or `current_phase: fix`
- `blocked: false`

### Step 2: Determine Workers

Based on SCOPE.yaml:

| touches.backend | touches.frontend | Workers to Spawn |
|-----------------|------------------|------------------|
| true | false | backend-coder only |
| false | true | frontend-coder only |
| true | true | backend-coder, then frontend-coder |
| false | false | packages-coder only |

### Step 3: Initialize EVIDENCE.yaml

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
```

### Step 4: Spawn Slice Coders (Sequential or Parallel)

For each slice in PLAN.yaml steps:

**Backend Coder** (if needed):
```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Backend impl {STORY_ID}"
  prompt: |
    You are implementing backend code.

    PLAN:
    <contents of PLAN.yaml steps where slice=backend>

    KNOWLEDGE CONTEXT:
    <blockers_to_avoid and patterns_to_follow from KNOWLEDGE-CONTEXT.yaml>

    CONSTRAINTS:
    - Follow patterns in KNOWLEDGE-CONTEXT.yaml
    - Check ADR-001 for API paths
    - Write tests alongside code

    OUTPUT:
    Report files created/modified and test results.
```

**Frontend Coder** (if needed):
```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Frontend impl {STORY_ID}"
  prompt: |
    You are implementing frontend code.

    PLAN:
    <contents of PLAN.yaml steps where slice=frontend>

    KNOWLEDGE CONTEXT:
    <blockers_to_avoid and patterns_to_follow from KNOWLEDGE-CONTEXT.yaml>

    OUTPUT:
    Report files created/modified and test results.
```

### Step 5: Collect Results

After each worker completes, update EVIDENCE.yaml:

```yaml
touched_files:
  - path: "packages/backend/*/src/function.ts"
    action: created
    lines: 45
    description: "Core function implementation"

commands_run:
  - command: "pnpm build"
    result: SUCCESS
    timestamp: "2026-02-01T10:05:00Z"
```

### Step 6: Run Verification Commands (Unit/Build)

Execute commands from PLAN.yaml:

```bash
pnpm build
pnpm test --filter <affected-packages>
pnpm lint <touched-files>
```

Record results in EVIDENCE.yaml:

```yaml
commands_run:
  - command: "pnpm test --filter @repo/package"
    result: SUCCESS
    output: "24 passed, 0 failed"
    timestamp: "2026-02-01T10:06:00Z"

test_summary:
  unit: { pass: 24, fail: 0 }
```

### Step 7: Run E2E Tests (Live Mode) - REQUIRED

**Per ADR-006**: E2E tests MUST run during dev phase to catch config issues early.

#### Pre-Flight Checks

Before running E2E tests, verify:

1. **MSW is disabled**:
   ```bash
   # VITE_ENABLE_MSW must NOT be "true"
   echo $VITE_ENABLE_MSW  # Should be empty or "false"
   ```

2. **Backend is running** (if backend_impacted):
   ```bash
   curl -s http://localhost:3001/health
   ```

3. **Config is correct**:
   - Use `playwright.legacy.config.ts` (live API mode)
   - Project: `chromium-live`

#### Skip Conditions

E2E tests may be skipped ONLY if:
- `frontend_impacted: false` in SCOPE.yaml AND no UI acceptance criteria
- Story explicitly has `e2e: not_applicable` in frontmatter

If skipped, record reason in EVIDENCE.yaml.

#### Execution

Spawn Playwright agent with live mode:

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "E2E tests {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-implement-playwright.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    mode: LIVE  # CRITICAL - no mocking

    ENVIRONMENT:
    VITE_ENABLE_MSW=false
    CONFIG=playwright.legacy.config.ts
    PROJECT=chromium-live

    Run at minimum one happy-path test per UI acceptance criterion.
    Record any config issues discovered.

    Signal: E2E COMPLETE or E2E FAILED: reason
```

#### Record E2E Results in EVIDENCE.yaml

```yaml
e2e_tests:
  status: pass | fail | skipped
  skip_reason: null | "frontend_impacted=false" | "e2e: not_applicable"
  config: playwright.legacy.config.ts
  project: chromium-live
  mode: "live"  # MUST always be "live"

  results:
    total: 5
    passed: 5
    failed: 0
    skipped: 0

  failed_tests: []  # If any failures, list them

  # Config issues discovered during E2E (for workflow improvement)
  config_issues:
    - type: url_mismatch | env_var_missing | response_shape_mismatch
      description: "MSW handler path didn't match real API"
      expected: "/api/v2/wishlist/items"
      actual: "/wishlist"
      files:
        - apps/web/main-app/src/mocks/handlers.ts
        - apps/api/lego-api/server.ts
      resolution: "Updated Vite proxy rewrite rules"

  videos: []  # Paths to failure videos
  screenshots: []  # Paths to failure screenshots
```

### Step 8: Map ACs to Evidence

For each AC in PLAN.yaml acceptance_criteria_map:

```yaml
acceptance_criteria:
  - ac_id: "AC1"
    status: PASS | MISSING | PARTIAL
    evidence_items:
      - type: test
        path: "packages/*/src/__tests__/function.test.ts"
        description: "Unit tests pass"
      - type: command
        command: "pnpm test"
        result: "PASS"
      - type: e2e  # Include E2E evidence
        path: "apps/web/playwright/tests/wishlist/flow.spec.ts"
        description: "Happy path E2E passes"
```

### Step 9: Update CHECKPOINT.yaml

```yaml
current_phase: execute
last_successful_phase: plan
```

### Step 10: Write EVIDENCE.yaml

Write complete evidence bundle to:
`{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/EVIDENCE.yaml`

---

## Output

- `_implementation/EVIDENCE.yaml` (main output)
- `_implementation/CHECKPOINT.yaml` (updated)
- Code files (created/modified by workers)

---

## Completion Signal

End with exactly one of:
- `EXECUTION COMPLETE` - all steps executed, evidence collected
- `EXECUTION BLOCKED: <reason>` - cannot proceed
- `EXECUTION PARTIAL: <reason>` - some ACs missing evidence

---

## Token Tracking (REQUIRED)

Before reporting completion signal:

```
/token-log {STORY_ID} dev-execute <input-tokens> <output-tokens>
```

Include worker token usage in totals.

---

## Non-Negotiables

- **DO NOT read full story file** - Use PLAN.yaml
- **DO NOT read LESSONS-LEARNED.md** - Use KNOWLEDGE-CONTEXT.yaml
- **MUST produce EVIDENCE.yaml** - This is the critical output
- **MUST map every AC to evidence** - Even if MISSING
- **MUST run verification commands** - Build/test/lint
- **MUST run E2E tests with LIVE resources** - No MSW mocking (ADR-006)
- **MUST record config issues** - Log any URL/env/shape mismatches in e2e_tests.config_issues
- MUST call `/token-log` before completion
- Do NOT skip worker errors - Record in known_deviations
- Do NOT mark AC as PASS without evidence
- Do NOT set VITE_ENABLE_MSW=true for E2E tests

---

## Example EVIDENCE.yaml

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
      - type: command
        command: "pnpm test --filter @repo/utils"
        result: "PASS"

  - ac_id: "AC2"
    ac_text: "Endpoint returns formatted data"
    status: PASS
    evidence_items:
      - type: http
        path: "apps/api/__http__/wishlist.http"
        description: "GET /wishlist/format returns 200"
      - type: test
        path: "apps/api/lego-api/handlers/wishlist/__tests__/format.test.ts"
        description: "Handler tests pass"

touched_files:
  - path: "packages/core/utils/src/format.ts"
    action: created
    lines: 45
  - path: "packages/core/utils/src/__tests__/format.test.ts"
    action: created
    lines: 120
  - path: "apps/api/lego-api/handlers/wishlist/format.ts"
    action: created
    lines: 32

commands_run:
  - command: "pnpm build"
    result: SUCCESS
    timestamp: "2026-02-01T10:05:00Z"
  - command: "pnpm test --filter @repo/utils"
    result: SUCCESS
    output: "12 passed"
    timestamp: "2026-02-01T10:06:00Z"
  - command: "pnpm lint packages/core/utils/src/format.ts"
    result: SUCCESS
    timestamp: "2026-02-01T10:07:00Z"

endpoints_exercised:
  - method: GET
    path: "/wishlist/format"
    status: 200

test_summary:
  unit: { pass: 24, fail: 0 }
  http: { pass: 4, fail: 0 }
  e2e: { pass: 3, fail: 0 }  # E2E test summary

# E2E Tests Section (v2 - ADR-006)
e2e_tests:
  status: pass
  skip_reason: null
  config: playwright.legacy.config.ts
  project: chromium-live
  mode: "live"

  results:
    total: 3
    passed: 3
    failed: 0
    skipped: 0

  failed_tests: []

  # Config issues found (for workflow improvement feedback)
  config_issues: []  # None in this example

  videos: []
  screenshots: []

coverage:
  lines: 96.5
  branches: 88.2

notable_decisions:
  - "Used existing pattern from @repo/gallery-core per KNOWLEDGE-CONTEXT"

known_deviations: []

token_summary:
  setup: { in: 1500, out: 800 }
  plan: { in: 8000, out: 3000 }
  execute: { in: 25000, out: 15000 }
```
