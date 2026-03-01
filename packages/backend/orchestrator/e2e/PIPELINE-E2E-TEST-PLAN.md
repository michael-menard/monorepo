# Pipeline E2E Test Plan

**Story**: APIP-5002 — E2E Test Plan and Playwright Framework Setup for Autonomous Pipeline Critical Path

---

## (a) Synthetic Test Story Design and ChangeSpec Rationale

The pipeline E2E framework uses a **pre-built synthetic test story** (`syntheticTestStory` in `fixtures/synthetic-story.ts`) to exercise the full pipeline without requiring real LLM elaboration or real user stories.

### Why a Synthetic Story?

The autonomous pipeline is designed to process real stories through LLM-powered elaboration, implementation, and review graphs. Running E2E tests against real stories would create non-determinism (LLM outputs vary), test pollution (real stories could be merged by accident), and operational dependencies (real work items must be in backlog). A synthetic fixture solves all three problems.

### Why the ChangeSpec is Trivially Passable

The synthetic story's `ChangeSpec` adds a single exported constant to `packages/backend/orchestrator/src/utils/string-utils.ts`:

```typescript
export const E2E_SYNTHETIC_MARKER = 'e2e-synthetic-marker-v1'
```

This is trivially passable through micro-verify (`pnpm check-types` + `pnpm test`) because:

1. **No type errors**: A string constant literal has no type-unsafe elements.
2. **No test failures**: No existing test asserts the absence of this constant.
3. **No LLM required**: The `ChangeSpec.codeToAdd` field contains the literal patch verbatim — the implementation graph applies it directly without LLM generation.
4. **No side effects**: Adding a constant to a utility file does not change behavior of any existing code.

The `storyId` is prefixed with `e2e-` (`e2e-synthetic-001`) to avoid conflicts with real story IDs.

### Artifact Stubs for Mid-Pipeline Seeding

The `syntheticEvidenceStub` export provides a pre-built `EVIDENCE.yaml`-compatible object for seeding the pipeline at the review stage. This allows phase1-elaboration tests to start at the review graph without running the full elaboration pipeline first.

---

## (b) Dependency Mapping per Test Scenario

| Test Scenario | File | Required Stories | Activation |
|---------------|------|-----------------|------------|
| Queue enqueue returns non-null jobId | `phase0-queue-supervisor.spec.ts` | APIP-0010 | Immediate after APIP-0010 |
| Job transitions waiting → active within 30s | `phase0-queue-supervisor.spec.ts` | APIP-0010 + APIP-0020 | After APIP-0020 |
| Job does not fail in observation window | `phase0-queue-supervisor.spec.ts` | APIP-0010 + APIP-0020 | After APIP-0020 |
| Elaboration stage writes valid EVIDENCE.yaml | `phase1-elaboration.spec.ts` | APIP-0010 + APIP-0020 + APIP-1010 | Auto-activates when APIP-1010 merges |
| Full critical path end-to-end | `phase1-critical-path.spec.ts` | APIP-0010 + APIP-0020 + APIP-1010 + APIP-1020 + APIP-1030 + APIP-1050 + APIP-1060 + APIP-1070 | Auto-activates when all 8 merge |

### Dependency Story Summary

| Story | Graph | Stage |
|-------|-------|-------|
| APIP-0010 | BullMQ queue setup | Phase 0 — queue infrastructure |
| APIP-0020 | Supervisor | Phase 0 — dispatch loop |
| APIP-1010 | Elaboration (structurer node) | Phase 1 — story decomposition |
| APIP-1020 | ChangeSpec planning | Phase 1 — implementation planning |
| APIP-1030 | Implementation loop | Phase 1 — code generation |
| APIP-1050 | Review | Phase 1 — code review |
| APIP-1060 | QA verify | Phase 1 — quality assurance |
| APIP-1070 | Squash-merge | Phase 1 — merge to main |

### skipIf Guard Pattern

Phase 1 specs use a programmatic module availability check at test start. When a dependency graph merges to main, its module export becomes importable and the skip condition resolves to `false` automatically:

```typescript
test.beforeAll(async () => {
  try {
    await import('@repo/orchestrator/graphs/elaboration')
    elaborationModuleAvailable = true
  } catch {
    elaborationModuleAvailable = false
  }
})

// In the test:
if (!elaborationModuleAvailable) {
  test.skip(true, 'SKIPPED: APIP-1010 (structurer node) not yet available')
  return
}
```

This pattern requires **no manual code changes** when dependency graphs merge — activation is automatic.

---

## (c) Port Isolation Strategy

### The Problem

APIP-1060 (QA Graph) invokes `pnpm exec playwright test` as a subprocess inside its `run-e2e-tests` node. If the pipeline E2E suite is running concurrently, Playwright process conflicts or port collisions can occur.

### Isolation Mechanisms

| Mechanism | Config | Effect |
|-----------|--------|--------|
| **Distinct project name** | `name: 'pipeline-e2e'` in `playwright.config.ts` | Prevents the QA graph's Playwright subprocess from accidentally matching pipeline E2E test files |
| **workers: 1** | `workers: 1` in `playwright.config.ts` | Prevents concurrent pipeline E2E runs — all tests run sequentially in a single worker |
| **Separate config file** | `e2e/playwright.config.ts` | Pipeline E2E and web app E2E are completely independent configurations |
| **No webServer block** | No `webServer` in config | Pipeline E2E does not start web servers — avoids port conflicts with web app tests |

### CI Serialization Requirement

In CI, the pipeline E2E job **MUST be serialized** with the QA graph test executions:

```yaml
# Example CI job ordering (GitHub Actions)
jobs:
  pipeline-e2e-phase0:
    needs: [apip-0010, apip-0020]
    steps:
      - run: pnpm --filter @repo/orchestrator e2e -- --project=pipeline-e2e
```

Do **not** run pipeline E2E and the QA graph simultaneously — the QA graph invokes Playwright internally, which creates process tree conflicts.

---

## (d) Environment Variables and Local Run Instructions

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string for BullMQ queue | `redis://localhost:6379` |
| `LANGGRAPH_SERVER_URL` | LangGraph server URL for graph execution | `http://localhost:8123` |
| `TEST_STORY_FEATURE_DIR` | Base directory for synthetic story artifacts | `plans/future/platform/autonomous-pipeline/e2e-fixtures` |

### Local Run Instructions

**Prerequisites:**
- Docker Compose stack running (Redis + LangGraph server)
- APIP-0010 and APIP-0020 implemented (for Phase 0)
- Relevant graph modules present (for Phase 1)

**Run Phase 0 E2E tests:**
```bash
# Start infrastructure
docker compose up -d redis langgraph-server

# Set environment variables
export REDIS_URL=redis://localhost:6379
export LANGGRAPH_SERVER_URL=http://localhost:8123
export TEST_STORY_FEATURE_DIR=plans/future/platform/autonomous-pipeline/e2e-fixtures

# Run Phase 0 E2E
pnpm --filter @repo/orchestrator e2e -- --project=pipeline-e2e
```

**Run a specific spec:**
```bash
pnpm --filter @repo/orchestrator e2e -- \
  --project=pipeline-e2e \
  --config packages/backend/orchestrator/e2e/playwright.config.ts \
  packages/backend/orchestrator/e2e/tests/phase0-queue-supervisor.spec.ts
```

**Run unit tests for E2E helpers (no live infrastructure required):**
```bash
pnpm test --filter @repo/orchestrator
```

**Run type check on E2E code:**
```bash
pnpm check-types --filter @repo/orchestrator
```

---

## (e) Phased Activation Strategy

The E2E framework is designed for incremental activation as dependency graphs become available.

### Phase 0: Queue + Supervisor (Available Immediately After APIP-0010 + APIP-0020)

**Spec**: `phase0-queue-supervisor.spec.ts`

**Timeout**: 2 minutes per test (30s observation window + margin)

**Tests**:
1. `queueClient.add()` returns non-null `jobId`
2. BullMQ job transitions `waiting → active` within 30s (supervisor is polling)
3. BullMQ job does NOT transition to `failed` within 10s observation window

**When to run**: After APIP-0020 merges to main. Can run as part of APIP-0020's own E2E validation.

**CI job**: Run after APIP-0020 merge, as a post-merge integration check.

---

### Phase 1: Elaboration Stage (Auto-activates When APIP-1010 Merges)

**Spec**: `phase1-elaboration.spec.ts`

**Timeout**: 10 minutes

**Tests**:
1. Elaboration stage writes schema-valid `EVIDENCE.yaml` within timeout

**Skip condition**: `import('@repo/orchestrator/graphs/elaboration')` throws. Resolves automatically when APIP-1010 merges and the module is importable.

**CI job**: Add to Phase 1 CI pipeline stage after APIP-1010 merges.

---

### Phase 1: Full Critical Path (Auto-activates When All 8 Dependencies Merge)

**Spec**: `phase1-critical-path.spec.ts`

**Timeout**: 30 minutes

**Tests**:
1. Full pipeline run from enqueue to MERGE.yaml + squash commit
2. All intermediate artifacts (EVIDENCE → REVIEW → QA-VERIFY → MERGE) schema-valid
3. BullMQ job reaches `completed` state

**Skip condition**: Any of the 6 required graph modules (`@repo/orchestrator/graphs/{elaboration,change-spec,implementation,review,qa-verify,merge}`) fails to import. Resolves automatically when all APIP-1010/1020/1030/1050/1060/1070 merge.

**CI job**: Final integration test — run as a nightly or post-merge job once all Phase 1 stories complete.

---

### CI Job Definition for Phase 0 E2E (Post-Merge Action Item)

After APIP-0010 and APIP-0020 merge, a CI job should be configured as follows:

```yaml
# GitHub Actions example — add to .github/workflows/pipeline-e2e.yml
name: Pipeline E2E Phase 0

on:
  push:
    branches: [main]
    paths:
      - 'packages/backend/orchestrator/**'

jobs:
  pipeline-e2e-phase0:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build --filter @repo/orchestrator
      - name: Run Phase 0 Pipeline E2E
        env:
          REDIS_URL: redis://localhost:6379
          LANGGRAPH_SERVER_URL: http://localhost:8123
          TEST_STORY_FEATURE_DIR: plans/future/platform/autonomous-pipeline/e2e-fixtures
        run: pnpm --filter @repo/orchestrator e2e -- --project=pipeline-e2e
```

**Note**: The LangGraph server service definition is omitted above — APIP-0030 (LangGraph server setup) must provide the Docker image and port configuration. The CI job definition above is a **post-merge action item** and should be finalized once APIP-0030 defines the LangGraph server Docker image.
