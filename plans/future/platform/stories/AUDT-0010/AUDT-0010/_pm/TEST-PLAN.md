# Test Plan: AUDT-0010

## Scope Summary

- **Endpoints touched**: None (backend orchestrator package work)
- **UI touched**: No
- **Data/storage touched**: Yes (audit findings persisted to filesystem as YAML)

## Happy Path Tests

### Test 1: Schema Validation - AuditFindingsSchema

**Setup**:
- Import AuditFindingsSchema from artifacts/audit-findings.ts
- Create valid fixture with all required fields

**Action**:
- Parse fixture with schema

**Expected Outcome**:
- Schema validates successfully
- All fields correctly typed

**Evidence**:
- Vitest assertion passes
- Type inference matches expected structure

### Test 2: Graph Compilation - createCodeAuditGraph

**Setup**:
- Import createCodeAuditGraph from graphs/code-audit.ts
- Import StateGraph from @langchain/langgraph

**Action**:
- Call createCodeAuditGraph()
- Call graph.compile()

**Expected Outcome**:
- Graph compiles successfully without errors
- Returns CompiledStateGraph instance

**Evidence**:
- No compilation errors logged
- typeof result === 'object' with expected methods

### Test 3: Pipeline Routing - mode='pipeline'

**Setup**:
- Create initial state with mode='pipeline'
- Compile graph

**Action**:
- Trace routing through graph (conditional edges)

**Expected Outcome**:
- After parallel lenses, routes directly to synthesize
- Skips devils_advocate and roundtable nodes

**Evidence**:
- Graph routing logic passes conditional check
- State transitions: scan -> lenses -> synthesize -> persist

### Test 4: Roundtable Routing - mode='roundtable'

**Setup**:
- Create initial state with mode='roundtable'
- Compile graph

**Action**:
- Trace routing through graph

**Expected Outcome**:
- After parallel lenses, routes to devils_advocate
- Then roundtable -> synthesize -> persist

**Evidence**:
- Conditional routing includes orchestration nodes
- State transitions: scan -> lenses -> devils_advocate -> roundtable -> synthesize -> persist

### Test 5: scan-scope File Discovery - scope='full'

**Setup**:
- Create temp directory with sample file tree
- Include: apps/, packages/, .git/, node_modules/
- Set scope='full'

**Action**:
- Call scan-scope node function
- Walk directory tree

**Expected Outcome**:
- Discovers all source files in apps/ and packages/
- Excludes: .git, node_modules, dist, .next, .turbo

**Evidence**:
- Returned file list contains expected files
- Excluded directories not in results
- File paths correctly resolved

### Test 6: scan-scope File Categorization

**Setup**:
- Create file list with known paths
- Examples: apps/web/app-dashboard/src/pages/Dashboard.tsx, packages/backend/db/src/index.ts

**Action**:
- Run categorization logic

**Expected Outcome**:
- Frontend: apps/web/* files
- Backend: packages/backend/* files
- Tests: __tests__/* files
- Config: .ts config files
- Shared: packages/core/* files

**Evidence**:
- Categorization map correctly populated
- Each file in exactly one category

## Error Cases

### Error 1: Invalid Schema Input

**Setup**:
- Create invalid fixture (missing required field)

**Action**:
- Attempt to parse with AuditFindingsSchema

**Expected Outcome**:
- Zod validation error thrown
- Error message indicates missing field

**Evidence**:
- expect(() => schema.parse(invalid)).toThrow()
- Error message matches expected pattern

### Error 2: Malformed Graph State

**Setup**:
- Create state missing required fields

**Action**:
- Attempt graph execution

**Expected Outcome**:
- Graph validation error
- State annotation enforces required fields

**Evidence**:
- Type error or runtime validation failure
- Clear error message

### Error 3: scan-scope with Invalid Path

**Setup**:
- Set cwd to non-existent directory

**Action**:
- Call scan-scope node

**Expected Outcome**:
- Graceful error handling
- Returns empty file list or clear error

**Evidence**:
- No unhandled exceptions
- Appropriate error logged

## Edge Cases (Reasonable)

### Edge 1: Empty Audit Scope

**Setup**:
- Set scope to directory with no source files

**Action**:
- Run scan-scope

**Expected Outcome**:
- Returns empty file list
- No crash

**Evidence**:
- result.files.length === 0
- Graph continues without error

### Edge 2: All Lenses Return Zero Findings

**Setup**:
- Mock lens nodes to return empty findings arrays

**Action**:
- Run full graph

**Expected Outcome**:
- Synthesize handles empty input
- persist-findings writes empty FINDINGS.yaml
- No crash

**Evidence**:
- FINDINGS.yaml contains empty findings array
- Graph completes to END state

### Edge 3: Large File Trees (1000+ files)

**Setup**:
- Create temp directory with 1000 files

**Action**:
- Run scan-scope with scope='full'

**Expected Outcome**:
- Scan completes within reasonable time (< 5s)
- All files discovered
- No memory issues

**Evidence**:
- Performance benchmark passes
- Memory usage stays within bounds

### Edge 4: Previous Audit Detection

**Setup**:
- Create plans/audit/ with FINDINGS-{date}.yaml from prior run

**Action**:
- Run scan-scope with delta scope

**Expected Outcome**:
- Detects previous audit
- Loads previous findings for deduplication

**Evidence**:
- scan-scope returns previous_findings_path
- File correctly read and parsed

## Required Tooling Evidence

### Backend:
- **Vitest tests required**:
  - artifacts/__tests__/audit-findings.test.ts
  - graphs/__tests__/code-audit.test.ts
  - nodes/audit/__tests__/scan-scope.test.ts

- **Test assertions**:
  - Schema validation: `expect(schema.parse(fixture)).toMatchObject(...)`
  - Graph compilation: `expect(graph.compile).not.toThrow()`
  - Routing logic: `expect(nextNode).toBe('synthesize')`
  - File discovery: `expect(files).toContain('expected-file.ts')`

- **Coverage targets**:
  - artifacts/audit-findings.ts: 90%+
  - graphs/code-audit.ts: 80%+
  - nodes/audit/scan-scope.ts: 80%+

### Frontend:
- N/A (backend-only story)

### Integration:
- Run full graph with mock state
- Verify state transitions through all nodes
- Check FINDINGS.yaml written correctly

## Risks to Call Out

1. **Dynamic imports in createLensParallelNode**: May complicate testing. Consider mocking strategy or testing compiled graph instead of individual node loading.

2. **Filesystem access in scan-scope**: Tests need temp directories or fixtures. Use os.tmpdir() for test isolation.

3. **Conditional routing complexity**: Ensure both pipeline and roundtable modes have explicit test coverage. Easy to miss edge cases in routing logic.

4. **Missing baseline**: No prior test fixtures exist for audit schemas. Need to create comprehensive happy/error fixtures from scratch.

5. **Export registration order**: Tests may fail if indices not updated correctly. Verify all exports registered before running integration tests.
