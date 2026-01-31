# Test Plan - wrkf-1050: elab_graph Subgraph

## Scope Summary

**Endpoints touched:** None (backend infrastructure)
**UI touched:** No
**Data/storage touched:** No (filesystem I/O only)

**Components affected:**
- `packages/backend/orchestrator/src/subgraphs/elab-graph/` (new directory)
- Story elaboration nodes (story reader, codebase explorer, elaboration writer, AC validator)
- LangGraph state management for elaboration workflow

---

## Happy Path Tests

### Test 1: Generate Elaboration from Valid Story File
**Setup:**
- Valid story file exists at `{FEATURE_DIR}/{STORY_ID}/{STORY_ID}.md`
- Story contains all required sections (Context, Goal, Scope, Acceptance Criteria)
- Output directory exists

**Action:**
- Invoke `elab_graph` subgraph with story ID
- Graph executes: story reader → codebase explorer → elaboration writer → AC validator

**Expected outcome:**
- Elaboration file created at `{FEATURE_DIR}/{STORY_ID}/ELAB-{STORY_ID}.md`
- Elaboration contains all required sections (Scope, Implementation Plan, Acceptance Criteria breakdown, Technical Approach)
- No validation errors
- GraphState contains expected artifact paths

**Evidence:**
- Elaboration file exists at expected path
- All required sections present in elaboration
- Log shows successful node execution sequence
- GraphState inspection confirms artifact paths populated

### Test 2: Story Reader Node Loads Story Content
**Setup:**
- Story file exists with valid YAML frontmatter and markdown sections
- Story ID provided in GraphState

**Action:**
- Execute story reader node

**Expected outcome:**
- GraphState populated with story content (title, context, goal, ACs, scope)
- Story frontmatter parsed correctly
- No file read errors

**Evidence:**
- GraphState inspection shows story content loaded
- Log shows successful file read
- Story sections extracted correctly (title, scope, ACs)

### Test 3: Codebase Explorer Node Gathers Context
**Setup:**
- Story reader has populated GraphState with story scope (packages affected)
- Relevant packages exist in monorepo (e.g., `packages/backend/orchestrator`)

**Action:**
- Execute codebase explorer node
- Node reads relevant package files, types, and existing test patterns

**Expected outcome:**
- GraphState populated with codebase context (file paths, type definitions, test examples)
- Context includes package structure and existing patterns
- No file read errors or permission issues

**Evidence:**
- GraphState inspection shows codebase context loaded
- Log shows files read by explorer
- Context includes type definitions and test patterns from relevant packages

### Test 4: Elaboration Writer Node Produces Complete Elaboration
**Setup:**
- GraphState populated with story content and codebase context
- Output directory exists

**Action:**
- Execute elaboration writer node (LLM call to Claude)

**Expected outcome:**
- Elaboration markdown generated with all required sections
- Content follows elaboration template structure
- Implementation guidance is concrete and actionable
- No placeholder text in critical sections

**Evidence:**
- Elaboration file written to filesystem
- Content includes all required sections (Scope, Implementation Plan, Technical Approach)
- Implementation guidance references actual codebase patterns
- Log shows successful LLM completion

### Test 5: AC Validator Node Checks Elaboration Completeness
**Setup:**
- Elaboration writer produces complete elaboration

**Action:**
- Execute AC validator node
- Node checks that all acceptance criteria from story are addressed in elaboration

**Expected outcome:**
- Validation passes with all ACs accounted for
- GraphState contains validation results (`isValid: true`)
- No missing AC coverage

**Evidence:**
- Validation success logged
- GraphState contains validation results
- Elaboration explicitly addresses each acceptance criterion from story

---

## Error Cases

### Error 1: Story File Not Found
**Setup:** Story file does not exist at expected path
**Action:** Invoke graph with invalid story path
**Expected:** Graph fails with "Story not found" error, no output files created
**Evidence:** Error logged with story path, GraphState status = "failed"

### Error 2: Story File Has Missing Required Sections
**Setup:** Story file exists but missing "Acceptance Criteria" section
**Action:** Execute story reader node
**Expected:** Story reader node fails with validation error, clear error message
**Evidence:** Validation error logged, GraphState contains error with missing section name

### Error 3: Codebase Explorer Cannot Access Package
**Setup:** Story scope references package that doesn't exist or has permission issues
**Action:** Execute codebase explorer node
**Expected:** Node catches file access error, logs warning, continues with available context
**Evidence:** Warning logged with package path, GraphState contains partial context, graph continues

### Error 4: LLM Node Fails or Times Out
**Setup:** Elaboration writer node encounters LLM API error (rate limit, timeout, etc.)
**Action:** Execute elaboration writer when LLM service unavailable
**Expected:** Node catches LLM error, graph fails gracefully, retry logic triggered
**Evidence:** LLM error logged with error type, GraphState contains LLM failure details, retry attempts logged

### Error 5: Output Directory Write Permissions Denied
**Setup:** Output directory exists but write permissions denied
**Action:** Attempt to write elaboration file
**Expected:** File write error caught, graph fails with clear error
**Evidence:** Filesystem error logged, GraphState contains write failure, no partial files

### Error 6: AC Validator Detects Missing Coverage
**Setup:** Elaboration writer produces elaboration that doesn't address all ACs
**Action:** Execute AC validator node
**Expected:** Validation fails with list of uncovered ACs, graph halts
**Evidence:** Validation failure logged, GraphState contains list of missing ACs, error actionable

---

## Edge Cases

### Edge 1: Story Has Many Dependencies
**Setup:** Story references 10+ related stories in dependencies
**Action:** Execute codebase explorer to gather context
**Expected:** Explorer gathers relevant context from all dependencies without timeout
**Evidence:** GraphState contains context from all dependencies, no context truncation warnings

### Edge 2: Large Story Scope (Multiple Packages)
**Setup:** Story scope touches 5+ packages across monorepo
**Action:** Execute codebase explorer with large scope
**Expected:** Explorer gathers context from all packages, LLM context window managed appropriately
**Evidence:** GraphState contains context from all packages, log shows exploration time

### Edge 3: Elaboration Already Exists (Re-elaboration)
**Setup:** Elaboration file already exists at output path
**Action:** Attempt to generate elaboration again
**Expected:** Graph detects existing elaboration, fails with error (prevents accidental overwrite)
**Evidence:** Existing file check logged, error message indicates elaboration exists

### Edge 4: Story Has No Scope Section (Minimal Story)
**Setup:** Story file contains only title, context, and goal (no explicit scope)
**Action:** Execute codebase explorer
**Expected:** Explorer infers scope from context and goal, continues with best-effort context
**Evidence:** Warning logged about missing scope, GraphState contains inferred context

### Edge 5: Codebase Explorer Reads Large Files
**Setup:** Story scope includes package with very large type definition files (>1MB)
**Action:** Execute codebase explorer
**Expected:** Explorer reads files with size limits, truncates or summarizes large files
**Evidence:** Log shows file truncation if necessary, context size reasonable for LLM

### Edge 6: Special Characters in Story ID or Paths
**Setup:** Story ID contains special chars or paths contain spaces/unicode
**Action:** Execute story reader with non-standard ID/paths
**Expected:** Path sanitization occurs or clear error if ID format invalid
**Evidence:** Path validation logged, files read with sanitized names

---

## Required Tooling Evidence

### Backend (LangGraph Orchestrator)

**Required test execution:**
- Unit tests for each node (story reader, codebase explorer, elaboration writer, AC validator)
- Integration test for full `elab_graph` execution
- Error handling tests for each error case (story not found, missing sections, LLM failure, write failure)

**Assertions:**
- Node execution order: story reader → codebase explorer → elaboration writer → AC validator
- GraphState transitions correctly through nodes
- File I/O operations succeed (read story, write elaboration)
- Codebase explorer accesses relevant packages and files
- LLM node receives correct prompt structure with story + codebase context
- AC validator checks each acceptance criterion for coverage
- Error states propagate correctly in GraphState

**Test framework:**
- Vitest for unit and integration tests
- Mocked filesystem for file I/O tests
- Mocked LLM client for elaboration writer tests (deterministic responses)
- Real filesystem in E2E tests (use temp directories and test fixtures)

**Evidence artifacts:**
- Test coverage report (>45% minimum, aim for >80% on new code)
- Sample elaboration outputs from test runs
- Error case logs showing proper error handling
- GraphState snapshots at each node transition
- Codebase explorer context samples (show what files/types were gathered)

### Frontend
Not applicable - backend infrastructure only

---

## Risks to Call Out

**Risk 1: Codebase Explorer Context Overload**
- **Description:** Codebase explorer may gather too much context, exceeding LLM context window
- **Mitigation:** Implement context size limits, prioritize most relevant files, log context size, fail gracefully with clear error if context too large

**Risk 2: LLM Hallucinations in Elaboration**
- **Description:** Elaboration writer may generate incorrect technical details or invalid implementation guidance
- **Mitigation:** Include actual codebase context in LLM prompt, AC validator checks coverage, manual PM review post-generation

**Risk 3: AC Validator False Positives**
- **Description:** Validator may incorrectly flag ACs as covered when they're not addressed
- **Mitigation:** Define strict validation rules, test with known incomplete elaborations, iterate based on PM feedback

**Risk 4: File System Race Conditions**
- **Description:** Concurrent graph executions may corrupt elaboration files
- **Mitigation:** Implement file locking or atomic writes, test concurrent execution scenarios

**Risk 5: Codebase Explorer Performance on Large Monorepo**
- **Description:** Exploring large monorepo packages may be slow or exceed memory limits
- **Mitigation:** Implement file size limits, smart file filtering (skip dist/, node_modules/), log exploration time, consider caching patterns

**Risk 6: Missing MCP Read Tools Integration**
- **Description:** Story notes "requires MCP read tools integration" - may block implementation if tools unavailable
- **Mitigation:** Confirm MCP read tools availability before implementation, design codebase explorer to work with fallback filesystem reads if MCP unavailable

**Risk 7: Test Fragility from External Dependencies**
- **Description:** Tests depend on filesystem, LLM mocks, which may be brittle
- **Mitigation:** Use dependency injection, provide test fixtures, document test setup requirements clearly
