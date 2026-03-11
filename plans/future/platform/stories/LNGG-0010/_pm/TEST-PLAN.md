# Test Plan: LNGG-0010 — Story File Adapter

## Scope Summary

- **Endpoints touched:** None (file I/O adapter, not HTTP API)
- **UI touched:** No
- **Data/storage touched:** Yes — file system (story YAML files in `plans/future/*/`)

## Happy Path Tests

### Test 1: Read Existing Story File
- **Setup:** Use existing story file `plans/future/workflow-learning/UAT/WKFL-001/story.yaml`
- **Action:** Call `StoryFileAdapter.read(storyPath)`
- **Expected outcome:**
  - Returns `StoryArtifact` object
  - Frontmatter fields parsed and validated against `StoryArtifactSchema`
  - Markdown content preserved (if stored separately)
  - All required fields present: `id`, `title`, `feature`, `type`, `state`, `goal`, `acs`, etc.
- **Evidence:**
  - Assert `result.id === 'WKFL-001'`
  - Assert `result.schema === 1`
  - Assert Zod validation passes (no validation errors)
  - Log parsed object structure

### Test 2: Write New Story File
- **Setup:** Create test `StoryArtifact` object with minimal required fields
- **Action:** Call `StoryFileAdapter.write(storyPath, storyArtifact)`
- **Expected outcome:**
  - File created at specified path
  - YAML frontmatter properly formatted with `---` delimiters
  - All fields serialized correctly
  - File is valid YAML
- **Evidence:**
  - Assert file exists at path
  - Re-read file and verify content matches original artifact
  - Run `js-yaml` parser on file, assert no parse errors
  - Verify file permissions (should be readable/writable)

### Test 3: Round-Trip Fidelity
- **Setup:** Create test story artifact with all fields populated (including optional fields)
- **Action:**
  1. Write artifact to disk
  2. Read it back
  3. Compare original vs. read artifact
- **Expected outcome:**
  - All fields match exactly (deep equality)
  - No data loss in serialization/deserialization
  - Field types preserved (strings, numbers, booleans, arrays, objects)
- **Evidence:**
  - Assert `JSON.stringify(original) === JSON.stringify(readBack)`
  - Log diff if mismatch found
  - Verify array order preserved
  - Verify null vs undefined handling

### Test 4: Update Existing Story File
- **Setup:**
  - Read existing story file
  - Modify `state` field from `backlog` to `ready-to-work`
  - Update `updated_at` timestamp
- **Action:** Call `StoryFileAdapter.update(storyPath, updates)`
- **Expected outcome:**
  - Only `state` and `updated_at` fields changed
  - All other fields preserved exactly
  - Markdown content unchanged (if applicable)
- **Evidence:**
  - Re-read file, assert only targeted fields changed
  - Assert `updated_at` is newer timestamp
  - Assert `created_at` unchanged
  - Verify no formatting changes to untouched fields

### Test 5: Batch Read (Performance)
- **Setup:** Identify 50+ story files across `plans/future/*/UAT/*/story.yaml`
- **Action:** Call `StoryFileAdapter.readBatch(storyPaths)`
- **Expected outcome:**
  - All files read successfully
  - Total time < 5 seconds
  - Average time per file < 100ms
  - Parallel reads execute concurrently
- **Evidence:**
  - Log start/end timestamps
  - Calculate total duration
  - Assert `duration < 5000ms`
  - Verify all returned artifacts valid

## Error Cases

### Error 1: File Not Found
- **Setup:** Provide path to non-existent story file
- **Action:** Call `StoryFileAdapter.read('/path/to/missing/story.yaml')`
- **Expected outcome:**
  - Throws `StoryNotFoundError` (custom error class)
  - Error message includes file path
  - Error is catchable and typed
- **Evidence:**
  - Assert `error instanceof StoryNotFoundError`
  - Assert `error.message.includes(filePath)`
  - Assert error has `code` property (e.g., `ENOENT`)

### Error 2: Invalid YAML Syntax
- **Setup:** Create test file with corrupted YAML (unclosed quote, invalid indentation)
- **Action:** Call `StoryFileAdapter.read(corruptedFilePath)`
- **Expected outcome:**
  - Throws `InvalidYAMLError` (custom error class)
  - Error message includes parse error details
  - Error includes line/column of YAML syntax error
- **Evidence:**
  - Assert `error instanceof InvalidYAMLError`
  - Assert error message describes YAML issue
  - Log original YAML content for debugging

### Error 3: Schema Validation Failure
- **Setup:** Create YAML file missing required field (e.g., `id` field)
- **Action:** Call `StoryFileAdapter.read(invalidStoryPath)`
- **Expected outcome:**
  - Throws `StoryValidationError` (custom error class)
  - Error includes Zod validation errors
  - Error message lists all validation failures
- **Evidence:**
  - Assert `error instanceof StoryValidationError`
  - Assert `error.zodErrors` present
  - Assert error message includes "missing required field: id"

### Error 4: Permission Denied
- **Setup:** Create test file, set permissions to read-only, attempt to write
- **Action:** Call `StoryFileAdapter.write(readOnlyPath, artifact)`
- **Expected outcome:**
  - Throws `FilePermissionError` (custom error class)
  - Error message indicates permission issue
  - No partial file left on disk
- **Evidence:**
  - Assert `error instanceof FilePermissionError`
  - Assert `error.code === 'EACCES'`
  - Verify no `.tmp` file remains

### Error 5: Write Failure Mid-Operation
- **Setup:** Mock `fs.rename()` to throw error (simulate disk full, network failure)
- **Action:** Call `StoryFileAdapter.write(path, artifact)`
- **Expected outcome:**
  - Write fails gracefully
  - No partial/corrupted file at target path
  - Temp file cleaned up
  - Error propagated to caller
- **Evidence:**
  - Assert target file does NOT exist or is unchanged
  - Assert no `.tmp` file remains
  - Assert error is thrown

## Edge Cases (Reasonable)

### Edge 1: Empty Arrays and Null Fields
- **Setup:** Create story with empty `non_goals: []`, `risks: []`, `depends_on: []`, and `blocked_by: null`
- **Action:** Write and re-read
- **Expected outcome:**
  - Empty arrays serialized as `[]` (not omitted)
  - Null fields serialized as `null` or omitted (per schema)
  - Round-trip preserves emptiness
- **Evidence:**
  - Assert arrays are arrays (not undefined)
  - Assert null fields handled consistently

### Edge 2: Special Characters in Strings
- **Setup:** Create story with title containing quotes, newlines, emojis, Unicode
- **Action:** Write and re-read
- **Expected outcome:**
  - Special characters properly escaped in YAML
  - Round-trip preserves exact string content
  - No character corruption
- **Evidence:**
  - Assert `readBack.title === original.title`
  - Test specific characters: `"`, `'`, `\n`, `🚀`

### Edge 3: Large Story (Many ACs and Risks)
- **Setup:** Create story with 50 acceptance criteria, 20 risks
- **Action:** Write and re-read
- **Expected outcome:**
  - All ACs and risks preserved
  - No truncation
  - Performance acceptable (< 200ms write)
- **Evidence:**
  - Assert `readBack.acs.length === 50`
  - Assert `readBack.risks.length === 20`
  - Measure write time

### Edge 4: Concurrent Writes (Same File)
- **Setup:** Attempt to write to same file from two parallel calls
- **Action:**
  ```js
  await Promise.all([
    adapter.write(path, artifact1),
    adapter.write(path, artifact2)
  ])
  ```
- **Expected outcome:**
  - One write succeeds, other may fail OR both succeed (last-write-wins)
  - No file corruption
  - Final file is valid YAML
- **Evidence:**
  - Re-read file, verify it parses successfully
  - Assert file contains complete artifact (not partial merge)
  - Document behavior (no locking for MVP)

### Edge 5: Path Handling (Cross-Platform)
- **Setup:** Test with Windows-style paths (if applicable), paths with spaces, relative paths
- **Action:**
  - Write to path with spaces: `/path/with spaces/story.yaml`
  - Resolve relative paths correctly
- **Expected outcome:**
  - Paths normalized using `path.join()`
  - Spaces handled (quoted if necessary)
  - Works on macOS, Linux, Windows (if tested)
- **Evidence:**
  - File created at correct location
  - Path resolution correct
  - No path escaping issues

### Edge 6: Existing Story Files Compatibility
- **Setup:** Read 10 random existing story files from `plans/future/*/UAT/*/story.yaml`
- **Action:** Parse each with adapter
- **Expected outcome:**
  - All files parse successfully OR mismatches documented
  - If schema mismatch, note fields needing migration
  - Compatibility report generated
- **Evidence:**
  - Log success/failure for each file
  - Document any schema version differences
  - Create migration plan if needed

## Required Tooling Evidence

### Backend Testing

**Unit Tests (Vitest):**
- Test file: `packages/backend/orchestrator/src/adapters/__tests__/story-file-adapter.test.ts`
- Coverage target: >80% for adapter class
- Run: `pnpm test story-file-adapter`
- Assert:
  - All public methods tested
  - Error paths covered
  - Edge cases validated

**Integration Tests (Vitest):**
- Test file: `packages/backend/orchestrator/src/adapters/__tests__/story-file-adapter.integration.test.ts`
- Uses real story files from `plans/future/`
- Run: `pnpm test:integration story-file-adapter`
- Assert:
  - Real file I/O works
  - Existing stories parse correctly
  - Performance benchmarks met

**Performance Tests:**
- Separate test suite for performance validation
- Run: `pnpm test:perf story-file-adapter`
- Assert:
  - Batch read < 5s for 50 files
  - Single write < 100ms
  - Single read < 50ms

**Test Fixtures:**
Create fixtures directory: `packages/backend/orchestrator/src/adapters/__tests__/fixtures/`
- `minimal-story.yaml` — minimal valid story
- `full-story.yaml` — all fields populated
- `invalid-missing-id.yaml` — missing required field
- `invalid-yaml-syntax.yaml` — corrupted YAML
- `story-with-special-chars.yaml` — Unicode, quotes, newlines
- `large-story.yaml` — 50 ACs, 20 risks

## Risks to Call Out

1. **Schema Version Mismatch:**
   - Existing story files may not match `StoryArtifactSchema` version 1
   - Mitigation: Survey existing files first, document mismatches, add migration logic if needed

2. **Atomic Write Reliability:**
   - `fs.rename()` is atomic on most systems but not guaranteed across filesystems
   - Mitigation: Document behavior, test on target environments, add retry logic if needed

3. **Performance on Large Repos:**
   - Reading 50+ files may be slow on network drives or slow disks
   - Mitigation: Implement parallel reads, add caching if needed, document performance characteristics

4. **Cross-Platform Path Issues:**
   - Windows path separators, case sensitivity differences
   - Mitigation: Use `path.join()` everywhere, test on multiple OSes if available

5. **YAML Library Compatibility:**
   - `gray-matter` + `js-yaml` may not round-trip perfectly for all YAML features
   - Mitigation: Test round-trip fidelity thoroughly, document any known limitations

6. **File Encoding:**
   - Story files may have different encodings (UTF-8, UTF-16)
   - Mitigation: Always read/write as UTF-8, add encoding detection if needed

## Test Execution Order

1. **Unit tests first** (fast, no I/O)
2. **Integration tests** (real files, slower)
3. **Performance tests** (benchmark, separate suite)
4. **Compatibility survey** (one-time validation of existing files)

## Success Criteria

- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ >80% code coverage
- ✅ Performance benchmarks met
- ✅ Existing story files parse successfully (or migration plan documented)
- ✅ Error handling validated for all error types
- ✅ Round-trip fidelity verified
