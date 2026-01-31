# Dev Feasibility Review - wrkf-1050: elab_graph Subgraph

## Feasibility Summary

**Feasible:** Yes
**Confidence:** Medium-High
**Why:**

This story is feasible with manageable complexity. The infrastructure from wrkf-1010 (GraphState), wrkf-1020 (Node Runner), and wrkf-1030/1040 (subgraph patterns) provides solid foundation. However, the codebase explorer node introduces novel complexity around:

1. Smart context gathering from monorepo packages
2. MCP read tools integration (noted as requirement in index)
3. Context size management for LLM consumption
4. AC coverage validation logic

The LLM integration patterns are established in wrkf-1040 (pm_generate_graph), so the elaboration writer node is low risk. The main uncertainty is the codebase explorer's ability to efficiently gather relevant context without overwhelming the LLM or exceeding memory limits.

**Confidence is medium-high because:**
- Core infrastructure exists and is tested
- Subgraph patterns established in previous stories
- LLM integration is proven
- Main uncertainty is codebase exploration scope and performance

---

## Likely Change Surface

### Areas/Packages Likely Impacted

**Primary:**
- `packages/backend/orchestrator/src/subgraphs/elab-graph/` (new directory)
  - `index.ts` - Subgraph entry point and graph definition
  - `nodes/story-reader.ts` - Node to read and parse story file
  - `nodes/codebase-explorer.ts` - Node to gather codebase context (NEW PATTERN - complex)
  - `nodes/elaboration-writer.ts` - LLM node to generate elaboration via Claude API
  - `nodes/ac-validator.ts` - Node to validate AC coverage in elaboration
  - `graph.ts` - LangGraph composition and edge definitions
  - `__tests__/` - Unit and integration tests for all nodes and graph

**Supporting:**
- `packages/backend/orchestrator/src/core/state/graph-state.ts` (extend with elaboration fields)
- `packages/backend/orchestrator/src/utils/` (may need file I/O, markdown parsing utilities from wrkf-1040)
- `packages/backend/orchestrator/templates/elaboration-template.md` (new file - elaboration template)
- `packages/backend/orchestrator/src/clients/claude-client.ts` (reuse from wrkf-1040 if exists)

**Adjacent:**
- `.claude/commands/elab-story.md` - Command documentation (may require updates to reference new subgraph)
- `packages/backend/orchestrator/src/adapters/mcp/` (new directory - MCP read tools adapter, if not already exists)

### Endpoints Likely Impacted

**None** - This is backend infrastructure, not HTTP API.

The subgraph is invoked via the `/elab-story` CLI command, not via HTTP endpoints.

### Migration/Deploy Touchpoints

**None** - No database migrations or AWS infrastructure changes required.

This is local CLI infrastructure running on developer machines. Deployment considerations:
- Environment variable: `ANTHROPIC_API_KEY` must be available
- MCP tools server must be running (if MCP integration required)
- Filesystem access to monorepo packages for codebase exploration

---

## Risk Register

### Risk 1: Codebase Explorer Context Overload
**Why it's risky:**
The codebase explorer must gather relevant context from potentially large packages (e.g., `packages/backend/orchestrator` with many TypeScript files). Without smart filtering, context size may exceed LLM context window (200k tokens for Claude Opus 4.5) or cause slow performance.

**Mitigation PM should bake into AC or testing plan:**
- Add AC requiring context size limit (e.g., max 100KB total context)
- Add AC requiring smart file filtering (skip `dist/`, `node_modules/`, test fixtures)
- Add AC requiring context prioritization (prefer type definitions, interfaces, recent changes)
- Add test case for large package scope (5+ packages) with assertion on context size
- Add logging requirement to track context size and exploration duration

### Risk 2: MCP Read Tools Availability and Integration
**Why it's risky:**
The index notes "requires MCP read tools integration" but the orchestrator codebase may not have MCP adapters implemented yet. If wrkf-1120 (MCP Read Tools) is not completed first, this story may be blocked or require fallback filesystem access.

**Mitigation PM should bake into AC or testing plan:**
- Add "Depends On: wrkf-1120" to story frontmatter (clarify dependency)
- Add AC requiring fallback to direct filesystem access if MCP unavailable
- Add AC for MCP tool registration and error handling (if MCP server unreachable)
- Add test case for MCP tool failure with fallback to filesystem reads
- Alternatively, clarify in Non-goals that MCP integration is optional (v1 uses filesystem, v2 adds MCP)

### Risk 3: AC Validator Logic Complexity
**Why it's risky:**
Validating that elaboration "addresses" each acceptance criterion is subjective and may require semantic analysis (not just keyword matching). False positives (flagging coverage when AC isn't addressed) or false negatives (missing coverage) could undermine trust in validator.

**Mitigation PM should bake into AC or testing plan:**
- Add AC defining validation approach (e.g., LLM-based validation, keyword matching + section headers, or manual PM review)
- Add AC requiring validator to output coverage report (which ACs addressed, which missing)
- Add test cases with known incomplete elaborations to test validator accuracy
- Consider making validator output "warnings" instead of hard failures (allow PM review)
- Add AC for validator error handling (graceful failure if validation logic errors out)

### Risk 4: LLM Prompt Engineering for Elaboration Writer
**Why it's risky:**
The elaboration writer LLM node must produce high-quality, actionable implementation guidance. Poor prompt design may result in vague elaborations, hallucinated details, or missing technical depth.

**Mitigation PM should bake into AC or testing plan:**
- Add AC requiring prompt to include story content + codebase context (types, patterns)
- Add AC requiring elaboration to include concrete examples (e.g., file paths, function signatures)
- Add test case with manual review of elaboration quality (PM validates output)
- Add AC requiring elaboration template to define expected sections and detail level
- Consider adding few-shot examples in prompt (show example elaboration for similar story)

### Risk 5: File System Race Conditions (Concurrent Elaboration)
**Why it's risky:**
If multiple `/elab-story` commands run concurrently for the same story (unlikely but possible), file writes may corrupt elaboration output.

**Mitigation PM should bake into AC or testing plan:**
- Add AC requiring atomic file writes (write to temp file, rename on success)
- Add AC requiring check for existing elaboration file (fail if exists, prevent overwrite)
- Add test case for concurrent graph execution with same story ID
- Consider adding file locking mechanism (or document that concurrent runs are unsupported in v1)

### Risk 6: Codebase Explorer Performance on Large Monorepo
**Why it's risky:**
Exploring large packages (e.g., `packages/core/app-component-library` with 100+ components) may be slow, exceed memory limits, or cause node timeouts.

**Mitigation PM should bake into AC or testing plan:**
- Add AC requiring file size limits (e.g., skip files >500KB)
- Add AC requiring timeout for codebase exploration (e.g., max 30 seconds)
- Add AC requiring smart directory filtering (skip `node_modules/`, `dist/`, `.next/`)
- Add performance test case with large package scope, assert exploration completes within time limit
- Add logging requirement to track exploration duration and files read

### Risk 7: Story Reader Parsing Robustness
**Why it's risky:**
Story files may have inconsistent formatting (missing sections, malformed YAML frontmatter, etc.). Story reader must handle edge cases gracefully or fail with actionable errors.

**Mitigation PM should bake into AC or testing plan:**
- Add AC requiring story reader to validate YAML frontmatter (parse errors surfaced clearly)
- Add AC requiring story reader to validate required sections (Context, Goal, Scope, ACs)
- Add test cases for malformed stories (missing YAML, missing sections, empty sections)
- Add AC for error messages to include file path and specific parsing issue
- Consider adding schema validation for story file structure (Zod schema)

### Risk 8: Elaboration Writer LLM Costs
**Why it's risky:**
Elaboration writer uses Claude API for each elaboration. Large context (story + codebase) may result in high token costs, especially if context exploration is inefficient.

**Mitigation PM should bake into AC or testing plan:**
- Add AC requiring token usage logging (input/output tokens per elaboration)
- Add context size limit to control costs (e.g., max 100KB context)
- Add test case to assert token usage is reasonable (e.g., <50k input tokens)
- Consider using Claude Sonnet (cheaper) instead of Opus for elaboration writer (tradeoff: quality vs cost)
- Add documentation on expected cost per elaboration run

---

## Scope Tightening Suggestions (Non-breaking)

### Clarifications to Add to AC

1. **Codebase Explorer Context Limits:**
   - Add explicit context size limit (e.g., max 100KB total context)
   - Add file size limit (e.g., skip files >500KB)
   - Add timeout (e.g., max 30 seconds for exploration)

2. **MCP Dependency Clarification:**
   - If MCP tools are required, add "Depends On: wrkf-1120" to frontmatter
   - If MCP is optional, add fallback to filesystem access as non-goal or future enhancement

3. **AC Validator Approach:**
   - Specify validation method: keyword matching, LLM-based validation, or manual PM review
   - Clarify if validator outputs hard failures or warnings for missing coverage

4. **Elaboration Writer Model Selection:**
   - Specify which Claude model to use (Sonnet for cost, Opus for quality)
   - Specify temperature and max tokens for LLM call

5. **Error Handling Strategy:**
   - Clarify fail-fast vs graceful degradation (e.g., if codebase explorer fails, continue with partial context or fail entire graph?)

### Constraints to Avoid Rabbit Holes

1. **No Multi-turn Elaboration Refinement:**
   - V1 generates elaboration in one shot (no iterative refinement based on validator feedback)
   - If validation fails, graph halts (manual fix required)

2. **No Codebase Indexing or Caching:**
   - Codebase explorer reads files on-demand (no pre-indexing or caching layer)
   - Future enhancement: add caching to improve performance

3. **No Visual Elaboration (Diagrams, Flowcharts):**
   - Elaboration is markdown text only (no auto-generated diagrams)
   - Future enhancement: integrate diagramming tools

4. **No Git History Analysis:**
   - Codebase explorer reads current state only (no git blame, commit history, or change analysis)
   - Future enhancement: add git context to elaboration

5. **No Inter-story Context Linking:**
   - Elaboration focuses on current story only (no automatic linking to related stories or dependencies)
   - Future enhancement: add cross-story references in elaboration

### Explicit OUT OF SCOPE Candidates

1. **Semantic Code Analysis:**
   - Codebase explorer does not perform static analysis, type checking, or linting (reads files as text)
   - Out of scope: integrating TypeScript compiler API for type inference

2. **Elaboration Versioning:**
   - Elaborations are generated once (no versioning, diff tracking, or re-elaboration workflow)
   - Out of scope: tracking elaboration changes over time

3. **Custom Elaboration Templates per Story Type:**
   - Single elaboration template for all stories (no custom templates for frontend vs backend stories)
   - Out of scope: template selection based on story scope

4. **Integration with External Documentation:**
   - Elaboration does not pull context from external docs (e.g., API docs, design specs)
   - Out of scope: fetching context from external URLs or knowledge bases

---

## Missing Requirements / Ambiguities

### What's Unclear

1. **MCP Dependency Status:**
   - Index notes "requires MCP read tools integration" but unclear if wrkf-1120 must be completed first
   - Is MCP integration mandatory for v1, or can codebase explorer use filesystem access as fallback?

2. **Codebase Explorer Scope:**
   - How does codebase explorer determine which files to read? Based on story scope (package names)?
   - Should explorer read only src/ files, or also tests, types, configs?

3. **AC Validator Implementation Approach:**
   - Should validator use LLM-based semantic validation, keyword matching, or manual PM review?
   - Should validator fail graph or just output warnings?

4. **Elaboration Output Format:**
   - What sections are required in elaboration? (Scope, Implementation Plan, Technical Approach confirmed from index)
   - Are there additional sections (e.g., Reuse Plan, Test Strategy, Rollback Plan)?

5. **Error Handling Philosophy:**
   - Fail-fast on any error, or graceful degradation (e.g., continue with partial codebase context if some files unreadable)?
   - Should graph halt on AC validation failure, or output elaboration with warnings?

6. **LLM Model Selection:**
   - Which Claude model for elaboration writer? (Sonnet for cost, Opus for quality)
   - What temperature and max tokens?

### Recommended Concrete Decision Text PM Should Include

1. **MCP Dependency:**
   - "wrkf-1050 depends on wrkf-1120 (MCP Read Tools). Codebase explorer MUST use MCP tools for file access."
   - OR: "wrkf-1050 uses filesystem access for v1. MCP integration is future enhancement (wrkf-1120 not required)."

2. **Codebase Explorer Scope:**
   - "Codebase explorer reads files from packages listed in story scope (Packages Affected section). Explorer reads: src/**/*.ts, src/**/*.tsx, but skips tests, dist/, node_modules/."

3. **AC Validator Approach:**
   - "AC validator uses keyword matching + section header analysis. Validator checks that each AC from story appears in elaboration (by AC ID or text). Validator outputs warnings (does not fail graph) if coverage missing."

4. **Elaboration Required Sections:**
   - "Elaboration MUST include: Scope (packages, files affected), Implementation Plan (step-by-step guidance), Technical Approach (architecture, patterns), AC Breakdown (each AC with implementation notes), Reuse Plan (existing utilities), Test Strategy (how to test each AC)."

5. **Error Handling Strategy:**
   - "Graph uses fail-fast strategy. Any node error halts graph immediately. Codebase explorer errors (file unreadable) log warning and continue with partial context."

6. **LLM Configuration:**
   - "Elaboration writer uses Claude Sonnet 4.5 (cost-effective). Temperature: 0.3. Max tokens: 16000. Retry on transient errors (rate limit, 5xx) up to 3 times with exponential backoff."

---

## Evidence Expectations

### What Proof/Dev Should Capture

1. **Codebase Explorer Evidence:**
   - Log output showing files explored (paths, sizes)
   - Context size metrics (total bytes, number of files)
   - Exploration duration (time to gather context)
   - Sample of gathered context (snippet of type definitions, patterns)

2. **Elaboration Writer Evidence:**
   - Input prompt sent to Claude API (story + codebase context)
   - Output elaboration content (full markdown)
   - Token usage (input tokens, output tokens, cost estimate)
   - LLM call duration

3. **AC Validator Evidence:**
   - Validation report (which ACs covered, which missing)
   - Coverage percentage (e.g., 8/10 ACs addressed)
   - Validator output (pass/fail, warnings)

4. **Integration Test Evidence:**
   - Full graph execution log (node sequence, state transitions)
   - GraphState snapshots at each node (show state changes)
   - Final elaboration file content (sample output)
   - Test coverage report (>45% minimum)

5. **Error Handling Evidence:**
   - Logs for each error case (story not found, LLM failure, write failure)
   - Error messages (actionable, include file paths and error types)
   - Retry attempts (for LLM failures)

### What Might Fail in CI/Deploy

1. **Environment Variable Missing:**
   - CI may not have `ANTHROPIC_API_KEY` set (LLM calls will fail)
   - Mitigation: Document env var requirement, add CI setup instructions

2. **Filesystem Permissions:**
   - CI may not have write permissions to output directory
   - Mitigation: Test uses temp directories, CI runs with appropriate permissions

3. **LLM API Rate Limits:**
   - High test volume may hit Claude API rate limits
   - Mitigation: Use mocked LLM client in unit tests, only call real API in manual tests

4. **Test Fixtures Missing:**
   - Tests depend on story files, package structures as fixtures
   - Mitigation: Include test fixtures in repo, document fixture structure

5. **MCP Server Unavailable (if MCP required):**
   - CI may not have MCP tools server running
   - Mitigation: Mock MCP adapter in tests, or skip MCP integration tests in CI

6. **Large Context Timeout:**
   - Tests with large package scope may timeout in CI
   - Mitigation: Add timeout limits to tests, use smaller fixtures for CI tests
