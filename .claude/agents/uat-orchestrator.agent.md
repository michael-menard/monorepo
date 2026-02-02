---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
type: leader
permission_level: orchestrator
triggers: ["/qa-verify-story (UAT mode)", "/uat-run"]
related_adr: ADR-005
workers:
  - uat-precondition-check.agent.md
---

# Agent: uat-orchestrator

**Model**: sonnet

## Role

UAT Test Orchestrator - Coordinates User Acceptance Testing with mandatory precondition checks to ensure NO MOCKING is used.

**Critical Rule**: UAT tests MUST NOT run if precondition check fails.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   UAT Orchestrator                      │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │  Precondition Check     │
              │  (uat-precondition-     │
              │   check.agent.md)       │
              │                         │
              │  • MSW disabled?        │
              │  • API reachable?       │
              │  • Cognito reachable?   │
              └────────────┬────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
               PASS ▼        FAIL ▼
         ┌──────────────┐  ┌──────────────┐
         │  Run UAT     │  │  BLOCK       │
         │  Playwright  │  │  Output      │
         │  Tests       │  │  Error       │
         └──────────────┘  └──────────────┘
```

---

## Inputs

From caller:
- `feature_dir`: Feature directory (e.g., `plans/future/wishlist`)
- `story_id`: Story ID (e.g., `WISH-001`)
- `test_pattern`: Optional Playwright test pattern (e.g., `**/uat/*.spec.ts`)
- `env_file`: Environment file to check (default: `apps/web/main-app/.env.development`)

---

## Execution Flow

### Phase 1: Precondition Check (MANDATORY)

**This phase CANNOT be skipped.**

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "UAT precondition check"
  prompt: |
    <contents of uat-precondition-check.agent.md>

    CONTEXT:
    env_file_path: {env_file}
    feature_dir: {feature_dir}
    story_id: {story_id}

    Execute all precondition checks and output UAT-PRECONDITION-CHECK.yaml
```

Wait for completion. Read output file.

### Phase 2: Gate Decision

```python
precondition_result = read_yaml("UAT-PRECONDITION-CHECK.yaml")

if precondition_result.verdict == "FAIL":
    # HARD STOP - Do not proceed
    output_block_message(precondition_result)
    signal("UAT BLOCKED: Precondition check failed")
    return  # EXIT - No UAT tests run

# Only reach here if PASS
proceed_to_uat_tests()
```

### Phase 3: Run UAT Tests (Only if Preconditions Pass)

```bash
# Run Playwright UAT tests
cd apps/web/playwright

# Use UAT-specific config (no MSW, real services)
pnpm playwright test \
  --config=playwright.uat.config.ts \
  --grep="@uat" \
  {test_pattern}
```

**Environment for UAT tests**:
```bash
VITE_ENABLE_MSW=false
PLAYWRIGHT_TEST_ENV=uat
```

---

## Output Files

| File | When | Content |
|------|------|---------|
| `UAT-PRECONDITION-CHECK.yaml` | Always | Precondition check results |
| `UAT-RESULTS.yaml` | If tests run | Playwright test results |
| `UAT-BLOCKED.md` | If precondition fails | Block reason and fix instructions |

### UAT-BLOCKED.md Template

```markdown
# UAT BLOCKED

**Story**: {STORY_ID}
**Timestamp**: {ISO_TIMESTAMP}
**Reason**: Precondition check failed

## Failed Checks

{list of failed checks from UAT-PRECONDITION-CHECK.yaml}

## Why This Matters

UAT (User Acceptance Testing) validates the REAL end-to-end user experience.
Using mocks defeats this purpose entirely - you'd only be testing that your
mocks match your expectations, not that the real system works.

## How to Fix

{specific fix instructions based on failure type}

## Reference

See `plans/stories/ADR-LOG.md` → ADR-005: Testing Strategy - UAT Must Use Real Services
```

---

## Signals

| Signal | Meaning |
|--------|---------|
| `UAT PRECONDITION: PASS` | Preconditions met, proceeding to tests |
| `UAT PRECONDITION: FAIL` | Preconditions not met, UAT blocked |
| `UAT TESTS: PASS` | All UAT tests passed |
| `UAT TESTS: FAIL` | Some UAT tests failed |
| `UAT BLOCKED: {reason}` | UAT did not run |

---

## Integration with /qa-verify-story

When called from `/qa-verify-story` during UAT phase:

```python
# In qa-verify-story orchestrator

if phase == "uat":
    # Spawn UAT orchestrator
    result = spawn_agent("uat-orchestrator", {
        feature_dir: feature_dir,
        story_id: story_id,
        test_pattern: story.uat_test_pattern or "**/*.spec.ts"
    })

    if "BLOCKED" in result.signal:
        # UAT cannot proceed - this is a HARD FAILURE
        update_story_status("uat-blocked")
        return FAIL

    if "TESTS: FAIL" in result.signal:
        # UAT ran but tests failed
        update_story_status("uat-failed")
        return FAIL

    # UAT passed
    update_story_status("uat-passed")
    return PASS
```

---

## CI/CD Integration

For CI/CD pipelines, use the shell script:

```bash
# In CI workflow
./scripts/uat-preflight.sh

if [ $? -ne 0 ]; then
  echo "UAT preconditions not met"
  exit 1
fi

# Preconditions passed, run UAT
pnpm --filter playwright test:uat
```

---

## Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--skip-precondition` | N/A | **NOT SUPPORTED** - Preconditions cannot be skipped |
| `--verbose` | false | Show detailed check output |
| `--dry-run` | false | Run precondition check only, don't run tests |

**Note**: There is intentionally NO flag to skip precondition checks. This is a hard requirement per ADR-005.
