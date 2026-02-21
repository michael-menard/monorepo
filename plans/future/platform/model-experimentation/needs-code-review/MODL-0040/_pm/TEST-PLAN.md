# Test Plan: MODL-0040 — Model Leaderboards

## Scope Summary

- **Endpoints touched**: None (backend TypeScript library — no HTTP API)
- **UI touched**: No
- **Data/storage touched**: Yes — YAML file persistence via atomic write pattern
- **Packages touched**: `packages/backend/orchestrator/src/model-selector/`
- **Test framework**: Vitest (node environment)
- **Test locations**: `packages/backend/orchestrator/src/model-selector/__tests__/`

---

## Happy Path Tests

### Test 1: Schema definition and Zod validation (AC-1)

- **Setup**: Import `RunRecordSchema`, `LeaderboardEntrySchema`, `LeaderboardSchema` from `model-selector/__types__/index.ts`
- **Action**: Call `.safeParse()` with valid fixture data for each schema
- **Expected outcome**: All `.safeParse()` calls return `success: true`; `z.infer<>` types are exported correctly
- **Evidence**: TypeScript compilation passes (`pnpm check-types --filter @repo/orchestrator`); no parse errors in test output

### Test 2: Record a single run (AC-2, AC-3)

- **Setup**: Empty leaderboard (no existing YAML file), `RunRecord` with `task_id: 'code-review'`, `model: 'anthropic/claude-sonnet-4.5'`, `provider: 'anthropic'`, `qualityScore: 85.0`, `cost_usd: 0.002`, `latency_ms: 1200`
- **Action**: Call `recordRun(runRecord, leaderboardPath)`
- **Expected outcome**: Returns `LeaderboardEntry` with `runs_count: 1`, `avg_quality: 85.0`, `avg_cost_usd: 0.002`, `avg_latency_ms: 1200`, `value_score: 42500.0` (85/0.002), `convergence_status: 'exploring'`
- **Evidence**: Returned entry matches expected values; YAML file written at `leaderboardPath`

### Test 3: Running averages update correctly on second run (AC-2)

- **Setup**: Leaderboard with one existing entry (`runs_count: 1`, `avg_quality: 80.0`, `avg_cost_usd: 0.001`); second `RunRecord` with `qualityScore: 90.0`, `cost_usd: 0.003`
- **Action**: Call `recordRun(secondRun, leaderboardPath)`
- **Expected outcome**: `runs_count: 2`, `avg_quality: 85.0` ((80+90)/2), `avg_cost_usd: 0.002` ((0.001+0.003)/2), `value_score: 42500.0` (85/0.002)
- **Evidence**: Assertion on all three averaged fields in the returned entry

### Test 4: Value score with zero cost (AC-3 — Ollama case)

- **Setup**: `RunRecord` with `cost_usd: 0.0`, `qualityScore: 75.0` (Ollama provider)
- **Action**: Call `recordRun(runRecord, leaderboardPath)`
- **Expected outcome**: `value_score === 75.0` (falls back to avg_quality when cost === 0); not `NaN`, not `Infinity`; YAML file serializes without error
- **Evidence**: Assertion `entry.value_score === 75.0`; YAML parse of written file succeeds; no `Infinity` or `NaN` in YAML output

### Test 5: Convergence detection — converged (AC-4)

- **Setup**: Leaderboard entry for `(task_id: 'story-gen', model: 'anthropic/claude-opus-4.5')` with 25 runs, `avg_quality: 92.0`; competing entry for same task with 20 runs, `avg_quality: 75.0`
- **Action**: Call convergence detection logic (or `recordRun` which triggers it)
- **Expected outcome**: `convergence_status: 'converged'`, `convergence_confidence >= 0.95`
- **Evidence**: Assertion on status and confidence fields in returned entry

### Test 6: Report generation — summary mode (AC-7)

- **Setup**: Leaderboard with 3 entries: value_scores [100.0, 50.0, 25.0]
- **Action**: Call `generateSummaryReport(leaderboard)`
- **Expected outcome**: Returns string containing a markdown table sorted by `value_score` descending; first row is the entry with `value_score: 100.0`
- **Evidence**: String contains `|` characters (table format); entries appear in correct order

### Test 7: Report generation — by task filter (AC-7)

- **Setup**: Leaderboard with entries for `task_id: 'code-review'` (2 models) and `task_id: 'story-gen'` (1 model)
- **Action**: Call `generateByTaskReport(leaderboard, 'code-review')`
- **Expected outcome**: Returns table with exactly 2 rows; no entry for `story-gen` appears
- **Evidence**: Only `code-review` entries in output; correct row count

### Test 8: Report generation — by model filter (AC-7)

- **Setup**: Same leaderboard as Test 7
- **Action**: Call `generateByModelReport(leaderboard, 'anthropic/claude-sonnet-4.5')`
- **Expected outcome**: Returns rows for all tasks where this model has runs; excludes other models
- **Evidence**: Only entries with matching model in output

### Test 9: YAML persistence round-trip (AC-6)

- **Setup**: In-memory leaderboard with 2 entries; use temp directory
- **Action**: Call `saveLeaderboard(leaderboard, tempPath)` then `loadLeaderboard(tempPath)`
- **Expected outcome**: Loaded leaderboard deep-equals original; schema validation passes; float precision preserved (e.g., `avg_quality: 85.333` survives round-trip)
- **Evidence**: Deep equality assertion; `LeaderboardSchema.safeParse(loaded).success === true`

### Test 10: Load from non-existent file returns empty leaderboard (AC-6)

- **Setup**: Path to a file that does not exist
- **Action**: Call `loadLeaderboard(nonExistentPath)`
- **Expected outcome**: Returns empty leaderboard object (not an error); `entries: []`
- **Evidence**: No exception thrown; returned leaderboard has zero entries

---

## Error Cases

### Error Case 1: Malformed YAML on load

- **Setup**: YAML file at leaderboard path with invalid syntax (e.g., broken indentation)
- **Action**: Call `loadLeaderboard(corruptPath)`
- **Expected outcome**: Error thrown with descriptive message (not a silent empty leaderboard); logged via `logger.error`
- **Evidence**: Exception caught in test; `logger.error` mock called with schema/parse error context

### Error Case 2: File write permission error

- **Setup**: Mock `fs/promises.writeFile` to throw EACCES error
- **Action**: Call `saveLeaderboard(leaderboard, readOnlyPath)`
- **Expected outcome**: Error propagated to caller; temp file cleaned up (no orphaned `.tmp` files)
- **Evidence**: Error thrown; no `.tmp` file remains in directory after failure

### Error Case 3: Schema validation failure on load (extra fields, wrong types)

- **Setup**: YAML file with extra unknown fields and a wrong type for `runs_count` (string instead of number)
- **Action**: Call `loadLeaderboard(path)`
- **Expected outcome**: Zod strips unknown fields (passthrough not needed); type coercion error for `runs_count` causes parse failure; error is surfaced
- **Evidence**: Zod parse result `success: false` with appropriate error path

### Error Case 4: Division by zero in value_score (already handled)

- **Setup**: `avg_cost_usd === 0` after averaging (all Ollama runs)
- **Action**: Call value_score computation function
- **Expected outcome**: Returns `avg_quality` (not `NaN`, not `Infinity`, not `0`)
- **Evidence**: Explicit unit test assertion on sentinel handling

### Error Case 5: recordRun called with invalid RunRecord (missing required field)

- **Setup**: RunRecord missing `cost_usd` field (schema violation)
- **Action**: Call `recordRun(invalidRecord, path)` — or validate before calling
- **Expected outcome**: Zod validation error surfaced before any filesystem write; leaderboard YAML unchanged
- **Evidence**: Error thrown; no new file written; existing leaderboard file unmodified

---

## Edge Cases

### Edge Case 1: Convergence boundary — exactly 19 vs 20 runs (AC-4)

- **Setup A**: Entry with `runs_count: 19`; **Setup B**: Entry with `runs_count: 20`; same quality gap
- **Action**: Compute convergence for both
- **Expected outcome A**: `convergence_status: 'exploring'` (< 20 threshold); **Expected B**: convergence evaluation runs (may be converging or converged depending on confidence)
- **Evidence**: Boundary condition assertion; convergence logic guarded by `runs_count >= 20`

### Edge Case 2: Convergence confidence boundary — 0.94 vs 0.95 (AC-4)

- **Setup**: Two entries for same task; inject computed confidence of 0.9499 in one test, 0.9500 in another
- **Action**: Check convergence status
- **Expected outcome**: `0.9499 → converging`; `0.9500 → converged`
- **Evidence**: Exact float boundary assertion; use fixture data that produces these confidence values

### Edge Case 3: Single model for a task — trivial convergence (AC-4)

- **Setup**: Task with only one model and 25 runs
- **Action**: Compute convergence
- **Expected outcome**: `convergence_status: 'converged'`; `convergence_confidence: 1.0` (no competition)
- **Evidence**: Single-model task always converges after minimum runs threshold

### Edge Case 4: Degradation at exactly 10.0% boundary (AC-5)

- **Setup**: Baseline `avg_quality: 80.0`; inject 5 runs with avg `72.0` (exactly 10% below 80.0)
- **Action**: Compute `quality_trend`
- **Expected outcome**: `quality_trend: 'stable'` (10.0% is the boundary, not "degrading")
- **Evidence**: Boundary assertion; `stable` not `degrading` at exact 10%

### Edge Case 5: Degradation at 10.01% — triggers alert (AC-5)

- **Setup**: Baseline `avg_quality: 80.0`; inject 5 runs with avg `71.99` (~10.01% below)
- **Action**: Compute `quality_trend`
- **Expected outcome**: `quality_trend: 'degrading'`; `logger.warn` called with `{ event: 'quality_degradation', task_id, model, drop_pct }`
- **Evidence**: `logger.warn` mock called; trend is `degrading`

### Edge Case 6: Only 3 runs available for last-5 window (AC-5)

- **Setup**: Entry with `runs_count: 3`; check degradation with last-5 window
- **Action**: Compute `quality_trend`
- **Expected outcome**: Uses all 3 available runs (not undefined behavior); no index-out-of-bounds error; `quality_trend` computed correctly
- **Evidence**: No exception; trend is one of `improving | stable | degrading`

### Edge Case 7: Recovery from degrading → stable (AC-5)

- **Setup**: Entry already in `degrading` state; inject 5 new runs with avg quality above the 10% threshold
- **Action**: Call `recordRun` 5 times with recovered quality scores
- **Expected outcome**: `quality_trend` transitions from `degrading` to `stable`
- **Evidence**: Final trend assertion is `stable`

### Edge Case 8: Float precision in YAML serialization (AC-6, AC-10)

- **Setup**: Entry with `avg_quality: 85.3333333333...` (repeating)
- **Action**: `saveLeaderboard` then `loadLeaderboard`
- **Expected outcome**: Loaded `avg_quality` is within acceptable float tolerance (e.g., `Math.abs(loaded - original) < 1e-6`); no YAML parsing error
- **Evidence**: Float tolerance assertion; no YAML serialization error

### Edge Case 9: Empty leaderboard in each report mode (AC-7)

- **Setup**: Empty leaderboard (`entries: []`)
- **Action**: Call `generateSummaryReport`, `generateByTaskReport('unknown')`, `generateByModelReport('unknown')`
- **Expected outcome**: Each returns a non-empty string with an empty-state message (not an empty string, not an error)
- **Evidence**: String includes message like `"No runs recorded yet"` or similar

### Edge Case 10: Very high value_score (100 quality / 0.0001 cost) (AC-3)

- **Setup**: `avg_quality: 100.0`, `avg_cost_usd: 0.0001`
- **Action**: Compute value_score
- **Expected outcome**: `value_score: 1000000.0` (no artificial capping); YAML file serializes this large number correctly
- **Evidence**: Assertion `value_score === 1000000`; YAML parse of file does not error

---

## Integration Tests (AC-10)

### Integration Test 1: Write → reload → update → reload cycle

- **Setup**: Real temp directory (`os.tmpdir()` + unique suffix); no mocks
- **Action**:
  1. `recordRun(run1, tempPath)` → loads empty, writes entry
  2. `loadLeaderboard(tempPath)` → verify entry present
  3. `recordRun(run2SameTaskModel, tempPath)` → loads existing, updates averages, writes
  4. `loadLeaderboard(tempPath)` → verify updated averages
- **Expected outcome**: All four steps succeed; data round-trips correctly; `runs_count: 2` after two calls
- **Evidence**: Step 4 assertion on `runs_count`, `avg_quality`, `avg_cost_usd`

### Integration Test 2: Atomic rename leaves no temp files

- **Setup**: Real temp directory
- **Action**: Call `saveLeaderboard(leaderboard, tempPath)`; immediately check directory listing
- **Expected outcome**: No `.tmp` files remain; only the leaderboard YAML file present
- **Evidence**: `fs.readdirSync(tempDir)` has no `.tmp` entries after write

### Integration Test 3: Sequential writes preserve last writer wins (concurrency model)

- **Setup**: Real temp directory; two `recordRun` calls for different tasks
- **Action**: Call `recordRun(runA, path)` sequentially then `recordRun(runB, path)` (same file)
- **Expected outcome**: Final leaderboard contains entries for both `runA.task_id` and `runB.task_id`; no data loss
- **Evidence**: Final load has both entries; `entries.length === 2`

---

## Required Tooling Evidence

### Backend Tests

```bash
# Run all MODL-0040 unit tests
pnpm test --filter @repo/orchestrator -- model-selector

# Run integration tests specifically
pnpm test --filter @repo/orchestrator -- model-selector/integration

# Type check
pnpm check-types --filter @repo/orchestrator

# Coverage check (must be >= 80% for model-selector/)
pnpm test --filter @repo/orchestrator --coverage -- model-selector
```

**Required assertions in test output:**
- All tests in `leaderboard.test.ts` pass
- All tests in `reports.test.ts` pass
- All tests in `integration.test.ts` pass
- `logger.warn` called exactly once in degradation alert test (AC-5)
- `logger.error` NOT called during happy path tests

### Frontend / Playwright

Not applicable — no UI components.

---

## Risks to Call Out

1. **Convergence confidence algorithm is underspecified**: The story uses Wilson score interval, but a simplified heuristic (quality gap + run count) may be used instead. Test cases for AC-4 need to be written against whichever algorithm is implemented; the boundary value test cases in this plan assume a deterministic confidence function. If the algorithm changes, boundary tests will need adjustment.

2. **Rolling window implementation for degradation**: The `quality_trend` relies on "last 5 runs" but `LeaderboardEntry` only stores aggregate averages in the seed spec. Dev may need to add a `recent_run_scores: number[]` field to `LeaderboardEntry` to support this. Tests should cover both the field presence and the rolling window logic.

3. **YAML float precision**: The `yaml` package may round floats differently than JavaScript. Tests should use `toBeCloseTo` for float assertions rather than strict equality where precision matters.

4. **Missing YAML file on load**: The "return empty leaderboard" behavior for missing files is critical to avoid a chicken-and-egg problem on first run. This must be tested explicitly (Edge Case — happy path test 10).

5. **`.claude/commands/model-leaderboard.md` is not executable code**: AC-8 can only be validated by reading the file contents for correct structure and documentation; no automated test is possible for the command itself.
