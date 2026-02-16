---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0160

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found (ADRs not loaded), Knowledge Base lessons not queried

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| doc-sync Skill | `.claude/skills/doc-sync/SKILL.md` | Implemented (WINT-0150 ready-for-qa) |
| doc-sync Command | `.claude/commands/doc-sync.md` | Implemented (v1.0.0) |
| doc-sync Agent | `.claude/agents/doc-sync.agent.md` | Implemented (v1.0.0, worker type) |
| LangGraph Orchestrator | `packages/backend/orchestrator/` | Established system with nodes, graphs, adapters |
| Orchestrator Nodes | `packages/backend/orchestrator/src/nodes/` | Multiple domain-specific nodes (reality, story, metrics, gates, elaboration, persistence, completion, llm, audit) |
| Orchestrator Graphs | `packages/backend/orchestrator/src/graphs/` | Story creation, elaboration, metrics collection, code audit graphs |

### Active In-Progress Work

| Story ID | Title | Status | Potential Conflict |
|----------|-------|--------|-------------------|
| WINT-0150 | Create doc-sync Skill | ready-for-qa | None - WINT-0160 depends on this, no conflict |

### Constraints to Respect

**From Baseline:**
- Zod-first types (REQUIRED) - no TypeScript interfaces
- Functional components only, named exports
- No barrel files - import directly from source files
- Use `@repo/logger` for logging (never console.log)
- Orchestrator artifact schemas use Zod validation
- LangGraph nodes follow established patterns with factory functions and Zod schemas

**From Code Patterns:**
- Node exports include: main node function, createNode factory, Zod schemas, types
- Nodes are organized by domain: `packages/backend/orchestrator/src/nodes/{domain}/`
- Each node has companion test file in `__tests__/` directory
- State annotations define graph state structure

---

## Retrieved Context

### Related Endpoints
N/A - This is orchestrator/backend infrastructure, not API endpoints

### Related Components

**Orchestrator Node Structure:**
- `packages/backend/orchestrator/src/nodes/index.ts` - Central export point for all nodes
- `packages/backend/orchestrator/src/nodes/{domain}/index.ts` - Domain-specific exports
- Node factories follow pattern: `createXxxNode(config) => node function`
- All nodes use Zod schemas for config, result, and state types

**Existing Agent Files:**
- `.claude/agents/doc-sync.agent.md` - Worker agent (type: worker, model: haiku)
- Pattern: frontmatter with metadata, Mission, Input, Process (phases), Output sections
- Tools used: Read, Grep, Glob, Write, Edit, Bash

**LangGraph Integration Points:**
- `packages/backend/orchestrator/src/graphs/index.ts` - Graph compositions
- Graph factories: `createXxxGraph(config)` pattern
- Graph runners: `runXxx(config)` convenience functions
- State annotations: `XxxStateAnnotation` for type-safe state

### Reuse Candidates

**Node Implementation Patterns:**
1. **Reality Domain Nodes** (`packages/backend/orchestrator/src/nodes/reality/`)
   - `load-baseline.ts` - Loads baseline reality files
   - `retrieve-context.ts` - Retrieves codebase context
   - `load-knowledge-context.ts` - Loads knowledge from KB
   - Pattern: Pure functions + node factory + Zod schemas

2. **Persistence Domain Nodes** (`packages/backend/orchestrator/src/nodes/persistence/`)
   - `load-from-db.ts` - Database loading
   - `save-to-db.ts` - Database saving
   - Pattern: Async operations with error handling

3. **LLM Domain Nodes** (`packages/backend/orchestrator/src/nodes/llm/`)
   - `code-review-lint.ts` - LLM-powered code review
   - Pattern: LLM invocation with structured output

**Agent Integration Pattern:**
- Agents are Claude Code `.agent.md` files invoked via command system
- Agents are NOT LangGraph nodes themselves
- LangGraph nodes can orchestrate agent invocations as part of workflow
- Node wraps agent invocation, handles state management, error handling

**Existing doc-sync Infrastructure:**
- Skill: User-facing documentation and interface (`.claude/skills/doc-sync/SKILL.md`)
- Command: Invocation wrapper (`.claude/commands/doc-sync.md`)
- Agent: Implementation logic (`.claude/agents/doc-sync.agent.md`)
- **Missing:** LangGraph node to integrate doc-sync into orchestrated workflows

---

## Knowledge Context

### Lessons Learned

No lessons loaded from Knowledge Base (KB query not performed in autonomous seed generation).

### Blockers to Avoid (from past stories)

Not available without KB query.

### Architecture Decisions (ADRs)

ADR-LOG.md not found in expected locations. No ADRs loaded.

### Patterns to Follow

**LangGraph Node Pattern (from existing nodes):**
1. Create domain folder if needed: `packages/backend/orchestrator/src/nodes/workflow/`
2. Node file structure:
   ```typescript
   // Zod schemas
   const ConfigSchema = z.object({ ... })
   const ResultSchema = z.object({ ... })

   // Pure implementation function
   async function docSyncImpl(config: Config): Promise<Result> { ... }

   // Node factory
   export function createDocSyncNode(config: Config) {
     return async (state: State) => {
       const result = await docSyncImpl(config)
       return { ...state, docSync: result }
     }
   }

   // Main node (default config)
   export const docSyncNode = createDocSyncNode({})
   ```
3. Export from domain index: `packages/backend/orchestrator/src/nodes/workflow/index.ts`
4. Export from main index: `packages/backend/orchestrator/src/nodes/index.ts`
5. Create test file: `packages/backend/orchestrator/src/nodes/workflow/__tests__/doc-sync.test.ts`

**Agent Invocation Pattern (from existing LLM nodes):**
- LangGraph nodes can shell out to agents via command system
- Use `Bash` tool equivalent or subprocess execution
- Parse agent output (SYNC-REPORT.md) and return structured result
- Handle errors gracefully, provide fallback behavior

### Patterns to Avoid

- Do NOT create barrel files (index.ts re-exports)
- Do NOT use console.log (use @repo/logger)
- Do NOT use TypeScript interfaces (use Zod with z.infer)
- Do NOT mix agent logic into node - node orchestrates, agent implements
- Do NOT skip Zod validation - all inputs/outputs must be validated

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Create doc-sync Agent (LangGraph Node Integration)

### Description

**Context:**
The doc-sync capability currently exists as a Skill (user-facing interface), Command (invocation wrapper), and Agent (implementation logic). However, there is no LangGraph node to integrate doc-sync into orchestrated workflows. As the platform transitions to LangGraph-based orchestration (stories 1-97 in Claude Code, then 98-237 in LangGraph), doc-sync needs a LangGraph node wrapper to be invoked as part of automated workflow graphs.

**Current State:**
- WINT-0150 delivered doc-sync Skill (ready-for-qa) at `.claude/skills/doc-sync/SKILL.md`
- doc-sync Command exists at `.claude/commands/doc-sync.md` (v1.0.0)
- doc-sync Agent exists at `.claude/agents/doc-sync.agent.md` (v1.0.0, worker type)
- LangGraph orchestrator has established node patterns in `packages/backend/orchestrator/src/nodes/`
- No LangGraph node exists for doc-sync

**Problem:**
Without a LangGraph node, doc-sync cannot be integrated into orchestrated workflows like story creation, elaboration, or batch processing. This blocks automation opportunities where documentation sync should happen automatically (e.g., after agent file changes during story implementation).

**Proposed Solution:**
Create a LangGraph node at `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` that:
1. Wraps invocation of the doc-sync agent via command system
2. Provides structured configuration (flags: --check-only, --force)
3. Parses SYNC-REPORT.md output into Zod-validated result
4. Integrates into LangGraph state management
5. Handles errors gracefully with fallback behavior

The node will NOT duplicate agent logic - it orchestrates the existing agent, parses its output, and provides workflow integration.

### Initial Acceptance Criteria

- [ ] **AC-1**: Create `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` with Zod schemas
  - `DocSyncConfigSchema` with `checkOnly: boolean`, `force: boolean`, `agentPath: string` (optional override)
  - `DocSyncResultSchema` with `success: boolean`, `filesChanged: number`, `sectionsUpdated: number`, `diagramsRegenerated: number`, `manualReviewNeeded: number`, `changelogDrafted: boolean`, `reportPath: string`, `errors: string[]`
  - `GraphStateWithDocSync` type extending base graph state

- [ ] **AC-2**: Implement node factory function `createDocSyncNode(config: DocSyncConfig)`
  - Factory returns async node function compatible with LangGraph
  - Node function accepts graph state, invokes agent, returns updated state
  - Config validated with Zod before invocation

- [ ] **AC-3**: Implement doc-sync invocation logic
  - Construct command: `/doc-sync` with optional `--check-only`, `--force` flags
  - Execute via subprocess/shell (equivalent to Bash tool)
  - Capture stdout/stderr for error handling
  - Parse SYNC-REPORT.md from expected location (current directory or story artifacts)

- [ ] **AC-4**: Parse SYNC-REPORT.md output into structured result
  - Extract "Files Changed" count
  - Extract "Sections Updated" count
  - Extract "Diagrams Regenerated" count
  - Extract "Manual Review Needed" items count
  - Extract "Changelog Entry" status (drafted: true/false)
  - Populate `errors` array if parsing fails or agent returns error

- [ ] **AC-5**: Export node from domain and main indexes
  - Export `docSyncNode`, `createDocSyncNode`, schemas, types from `packages/backend/orchestrator/src/nodes/workflow/index.ts`
  - Re-export from `packages/backend/orchestrator/src/nodes/index.ts`
  - Follow existing export pattern from other domains

- [ ] **AC-6**: Create comprehensive unit tests at `packages/backend/orchestrator/src/nodes/workflow/__tests__/doc-sync.test.ts`
  - Test successful sync (mock subprocess, mock SYNC-REPORT.md parsing)
  - Test check-only mode (verify flag passed correctly)
  - Test force mode (verify flag passed correctly)
  - Test SYNC-REPORT.md parsing edge cases (missing sections, malformed report)
  - Test error handling (agent failure, missing report file)
  - Test Zod validation (invalid config, invalid result)
  - Minimum 80% coverage

- [ ] **AC-7**: Add TypeScript types and documentation
  - All exports have JSDoc comments
  - Type exports use `z.infer<typeof Schema>` pattern (no manual interfaces)
  - Example usage in JSDoc for `createDocSyncNode`

### Non-Goals

- **Do NOT modify existing doc-sync agent** - This story only creates the LangGraph wrapper
- **Do NOT modify doc-sync Skill or Command** - Those are already complete
- **Do NOT create a graph** - This story creates a node; graph integration is future work
- **Do NOT implement agent logic in the node** - Node orchestrates, agent implements
- **Do NOT add UI/frontend** - Backend node only
- **Do NOT add database persistence** - Node returns in-memory result; persistence is caller's responsibility
- **Do NOT create LangGraph adapters** - Those are separate stories (LNGG-0010, 0020, 0040, 0060)

### Reuse Plan

**Components:**
- Existing node structure from `packages/backend/orchestrator/src/nodes/reality/load-baseline.ts` (file reading, parsing pattern)
- Existing LLM node structure from `packages/backend/orchestrator/src/nodes/llm/code-review-lint.ts` (external tool invocation pattern)
- Existing doc-sync agent at `.claude/agents/doc-sync.agent.md` (implementation to invoke)

**Patterns:**
- Node factory pattern: `createXxxNode(config) => async (state) => updatedState`
- Zod schemas: `ConfigSchema`, `ResultSchema`, state type extension
- Test structure: Vitest with mocked subprocess execution, mocked file parsing
- Export pattern: domain index → main index

**Packages:**
- `zod` - Schema validation (already in orchestrator package)
- `vitest` - Testing framework (already in orchestrator package)
- `@repo/logger` - Logging (instead of console)
- Node.js `child_process` - Subprocess execution for agent invocation

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Considerations:**
- Unit tests must mock subprocess execution to avoid actually running doc-sync agent
- Mock SYNC-REPORT.md file parsing with various edge cases
- Test Zod validation failures explicitly
- Test error handling when agent fails or report is malformed
- Integration test (if feasible) that runs actual doc-sync agent in test environment

**Suggested Test Cases:**
1. Successful sync with all sections populated in SYNC-REPORT.md
2. Successful sync with minimal report (no diagrams, no manual review)
3. Check-only mode returns correct exit code interpretation
4. Force mode processes all files
5. Agent returns non-zero exit code (error handling)
6. SYNC-REPORT.md missing (error handling)
7. SYNC-REPORT.md malformed (partial parsing, graceful degradation)
8. Invalid config schema (Zod validation failure)

### For UI/UX Advisor

N/A - This is backend infrastructure with no user-facing UI. The existing doc-sync Skill provides user documentation.

### For Dev Feasibility

**Implementation Complexity:**
- **Estimated Size:** S (single node file, ~200-300 lines including tests)
- **Estimated Effort:** 3-4 hours (implementation + tests + docs)
- **Risk Level:** Low (well-defined pattern, existing examples, no external dependencies)

**Key Implementation Details:**
1. **Subprocess Invocation:**
   - Use Node.js `child_process.execFile` or `spawn` for `/doc-sync` command
   - Pass flags as arguments: `['--check-only']`, `['--force']`
   - Capture stdout/stderr, wait for completion
   - Handle exit codes (0 = success, 1 = out of sync in check-only mode, other = error)

2. **SYNC-REPORT.md Parsing:**
   - Read file from current working directory or configured path
   - Parse markdown sections: "Files Changed", "Sections Updated", etc.
   - Use regex or markdown parser to extract counts
   - Graceful degradation if sections missing (return 0 for counts, log warning)

3. **State Management:**
   - Node adds `docSync: DocSyncResult` to graph state
   - Follow immutable state pattern: `return { ...state, docSync: result }`
   - State type uses Zod schema inference: `type State = z.infer<typeof StateSchema>`

4. **Error Handling:**
   - Wrap subprocess call in try/catch
   - Populate `errors` array in result if failure
   - Log errors with `@repo/logger.error`
   - Return structured result even on failure (success: false, errors: [...])

**Dependencies:**
- WINT-0150 (doc-sync Skill) must be in ready-for-qa or UAT (currently ready-for-qa, OK to proceed)
- No database dependencies
- No API dependencies
- No LangGraph adapter dependencies (adapters are separate stories)

**Unknown Risks:**
- None identified - straightforward orchestration wrapper

**Recommendation:**
Story is ready for implementation. Clear scope, well-defined pattern, no blocking dependencies.
