# PROOF-APIP-4050

**Generated**: 2026-03-02T20:50:00Z
**Story**: APIP-4050
**Evidence Version**: 1

---

## Summary

This implementation delivers a fully-functional Dead Code Reaper system — a monthly cron job that identifies and verifies dead exports, unused files, and unused dependencies across the monorepo, then automatically generates CLEANUP stories for verified findings. All 14 acceptance criteria passed with 36 unit tests, zero new type errors, and zero lint warnings.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | DeadCodeReaperConfigSchema with validation and defaults |
| AC-2 | PASS | scanDeadExports parses ts-prune output with injectable execFn |
| AC-3 | PASS | scanUnusedFiles detects no-importer files with execFn injection |
| AC-4 | PASS | scanUnusedDeps uses depcheck with injectable execFn |
| AC-5 | PASS | Dynamic import guard and excludePatterns filtering verified |
| AC-6 | PASS | microVerify dryRun mode returns safe/false-positive/error |
| AC-7 | PASS | runDeadCodeReaper orchestrates scanners and micro-verify |
| AC-8 | PASS | withTimeout wrapping with NodeTimeoutError → status:'partial' |
| AC-9 | PASS | generateCleanupStory writes CLEANUP-NNNN to backlog |
| AC-10 | PASS | Cron registration with LOCK_KEYS.DEAD_CODE_REAPER = 42_002 |
| AC-11 | PASS | Structured logger emission on all run paths |
| AC-12 | PASS | All 36 unit tests pass (subcases a-h plus advisory lock skip) |
| AC-13 | PASS | Zero new type errors or lint warnings |
| AC-14 | PASS | CLEANUP-NNNN format passes StoryArtifactSchema validation |

### Detailed Evidence

#### AC-1: DeadCodeReaperConfigSchema with correct defaults and validation

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - DeadCodeReaperConfigSchema.parse({}) applies all defaults (minAgeDays:30, maxFindingsPerRun:50, timeoutMs:600000, dryRun:false); parse({minAgeDays:-5}) throws ZodError. 6 passing tests in DeadCodeReaperConfigSchema describe block.

#### AC-2: scanDeadExports with injectable execFn parses ts-prune output

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - scanDeadExports with mock execFn returning ts-prune fixture — DeadExportFinding[] validated, excludePatterns respected. 4 passing tests in scanDeadExports describe block.

#### AC-3: scanUnusedFiles with injectable execFn for no-importer detection

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - scanUnusedFiles with mock execFn returning compiler output — UnusedFileFinding[] extraction and excludePatterns filtering verified. 4 passing tests.

#### AC-4: scanUnusedDeps using depcheck with injectable execFn

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - scanUnusedDeps with mock execFn returning depcheck JSON — UnusedDepFinding[] extraction verified. 3 passing tests in scanUnusedDeps describe block.

#### AC-5: Dynamic import guard and excludePatterns filtering

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - scanDeadExports test "excludes dynamic-import-only entries" verifies that lines with "(used in module)" are filtered. excludePatterns tests in both scanDeadExports and scanUnusedFiles suites verify pattern exclusion.

#### AC-6: microVerify with dryRun mode returning safe/false-positive/error

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - microVerify returns status:'safe' when execFn returns ''. microVerify returns status:'false-positive' when execFn returns 'error TS...'. 4 passing tests across safe and false-positive describe blocks.

#### AC-7: runDeadCodeReaper orchestrates scanners and micro-verify

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - runDeadCodeReaper with dryRun:true produces DeadCodeReaperResultSchema-conformant result. DeadCodeReaperResultSchema.parse(result) does not throw. 3 passing tests in runDeadCodeReaper dryRun describe block.

#### AC-8: withTimeout wrapping with NodeTimeoutError → status:'partial'

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - runDeadCodeReaper with very short timeoutMs via vi.useFakeTimers() → result.status === 'partial' and error contains 'Timed out'. NodeTimeoutError catch-and-convert logic in runner.ts. vi.useRealTimers() restored in afterEach.

#### AC-9: generateCleanupStory writes CLEANUP-NNNN story.yaml to backlog

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - generateCleanupStory output passes StoryArtifactSchema.parse(); story.yaml written to backlog/CLEANUP-NNNN/story.yaml. 3 passing tests in generateCleanupStory describe block.

#### AC-10: Cron registration with LOCK_KEYS.DEAD_CODE_REAPER = 42_002 and schedule '0 3 1 * *'

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - InMemoryCronAdapter.hasJob('dead-code-reaper') === true after registerDeadCodeReaperJob(); getSchedule('dead-code-reaper') === '0 3 1 * *' verified. Advisory lock skip test with LOCK_KEYS.DEAD_CODE_REAPER = 42_002. 3 passing cron registration tests + advisory lock skip test.

#### AC-11: Structured logger emission on all run paths

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/runner.ts` - runner.ts emits logger.info('cron.dead-code-reaper.completed', { jobName, startedAt, completedAt, durationMs, status, findingsTotal, verifiedDeletions, falsePositives, cleanupStoriesGenerated }) on every run path (success, partial, skipped, error). @repo/logger mock confirms no console usage.

#### AC-12: All unit test subcases a through h plus advisory lock skip path pass

**Status**: PASS

**Evidence Items**:
- **command**: `pnpm --filter @repo/orchestrator test -- src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - 36 tests passed (36)

#### AC-13: Zero new type errors or lint warnings

**Status**: PASS

**Evidence Items**:
- **command**: `pnpm --filter @repo/orchestrator check-types` - tsc --noEmit (exit 0, no errors)
- **command**: `pnpm eslint packages/backend/orchestrator/src/nodes/dead-code/ packages/backend/orchestrator/src/graphs/dead-code-reaper.ts packages/backend/orchestrator/src/cron/jobs/dead-code-reaper.job.ts packages/backend/orchestrator/src/cron/constants.ts` - No errors, no warnings

#### AC-14: CLEANUP-NNNN format (not APIP-CLEANUP-NNNN), passes StoryArtifactSchema id regex

**Status**: PASS

**Evidence Items**:
- **test**: `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` - AC-12g test "uses CLEANUP-NNNN format (not APIP-CLEANUP-NNNN)" verifies parsed.id matches /^CLEANUP-\d+$/, does not contain 'APIP', and passes /^[A-Z]+-\d+$/.test(). APIP-CLEANUP-NNNN format NOT used anywhere in implementation.

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `packages/backend/orchestrator/src/nodes/dead-code/schemas.ts` | created | 186 |
| `packages/backend/orchestrator/src/nodes/dead-code/scanners.ts` | created | 282 |
| `packages/backend/orchestrator/src/nodes/dead-code/micro-verify.ts` | created | 99 |
| `packages/backend/orchestrator/src/nodes/dead-code/runner.ts` | created | 291 |
| `packages/backend/orchestrator/src/nodes/dead-code/cleanup-story-generator.ts` | created | 149 |
| `packages/backend/orchestrator/src/graphs/dead-code-reaper.ts` | created | 215 |
| `packages/backend/orchestrator/src/cron/jobs/dead-code-reaper.job.ts` | created | 68 |
| `packages/backend/orchestrator/src/cron/constants.ts` | modified | 22 |
| `packages/backend/orchestrator/src/nodes/dead-code/__tests__/dead-code-reaper.test.ts` | created | 735 |

**Total**: 9 files, 2047 lines

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `pnpm --filter @repo/orchestrator check-types` | SUCCESS | 2026-03-02T20:50:00Z |
| `pnpm --filter @repo/orchestrator test` | SUCCESS | 2026-03-02T20:50:00Z |
| `pnpm eslint packages/backend/orchestrator/src/nodes/dead-code/ packages/backend/orchestrator/src/graphs/dead-code-reaper.ts packages/backend/orchestrator/src/cron/jobs/dead-code-reaper.job.ts packages/backend/orchestrator/src/cron/constants.ts` | SUCCESS | 2026-03-02T20:50:00Z |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit | 3847 | 0 |
| E2E | 0 | 0 |

**Coverage**: Not measured (backend monorepo coverage)

**E2E Status**: EXEMPT — story_type: backend-only, touches_frontend: false, no UI surface

---

## Implementation Notes

### Notable Decisions

- **ARCH-001**: withTimeout uses TimeoutOptions object { timeoutMs, nodeName }. NodeTimeoutError caught explicitly in runner.ts and converted to status:'partial' with accumulated data.
- **ARCH-002**: LOCK_KEYS.DEAD_CODE_REAPER = 42_002 (integer constant, increments from PATTERN_MINER 42_001). No hashtext() used.
- **ARCH-003**: CronRunResultSchema not extended globally. runner.ts logs a superset object with domain counts (findingsTotal, verifiedDeletions, falsePositives, cleanupStoriesGenerated) via @repo/logger.info independently.
- **CLEANUP-NNNN format verified in both implementation and tests. APIP-CLEANUP-NNNN format not used anywhere.**

### Known Deviations

None.

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| Execute | 45000 | 18000 | 63000 |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
