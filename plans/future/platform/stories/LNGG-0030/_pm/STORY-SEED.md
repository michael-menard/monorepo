---
generated: "2026-02-13"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: LNGG-0030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| LangGraph workflows (story-creation, elaboration) | Deployed | Core workflows exist but lack decision callback system |
| Orchestrator package | Deployed | Location for adapters at `packages/backend/orchestrator/src/` |
| Knowledge Base | Deployed | PostgreSQL instance with pgvector for storing decisions |
| Decision handling protocol | Deployed | Documented in `.claude/agents/_shared/decision-handling.md` |
| Zod validation | Deployed | Used throughout for type safety |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| None | N/A | No active stories conflict with LNGG-0030 |

### Constraints to Respect

1. **Zod-First Types** - All data structures must use Zod schemas with `z.infer<>`, never TypeScript interfaces
2. **Functional Components** - Use functional patterns, named exports preferred
3. **No Barrel Files** - Import directly from source files
4. **@repo/logger** - Use for all logging, never console.log
5. **File Structure** - Component directories must have index.tsx, __tests__/, __types__/, utils/

---

## Retrieved Context

### Related Endpoints
- No REST endpoints currently - this story creates the decision callback infrastructure
- Future: REST API for web UI decision callbacks (out of scope for LNGG-0030)

### Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `elaboration.ts` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Needs decision callbacks for gap handling |
| `story-creation.ts` | `packages/backend/orchestrator/src/graphs/story-creation.ts` | May need callbacks for ambiguous requirements |
| `decision-handling.md` | `.claude/agents/_shared/decision-handling.md` | Existing decision tier classification protocol |
| LangGraph nodes | `packages/backend/orchestrator/src/nodes/` | Node implementations that will invoke callbacks |

### Reuse Candidates

**Packages:**
- `inquirer@^9.2.0` - CLI prompts for terminal interaction
- `zod@^3.x` - Schema validation (already in use)
- `@repo/logger` - Logging utility

**Patterns:**
- Decision tier classification (5 tiers) from `.claude/agents/_shared/decision-handling.md`
- Auto-decision rules pattern from existing autonomy framework
- Registry pattern for managing multiple callback implementations
- Timeout handling with Promise.race pattern

---

## Knowledge Context

### Lessons Learned

**[KB Query Results - Decision Systems]**
- **Pattern to follow**: Use discriminated unions for result types (`{ success: true, data } | { success: false, error }`)
- **Pattern to follow**: Registry pattern for managing multiple implementations (from model assignments)
- **Blocker to avoid**: Reading full serverless.yml - extract only relevant sections (token optimization)
- **Time sink to avoid**: Multiple agents reading same files - use shared context or caching

### Blockers to Avoid (from past stories)
- **API path mismatches** (ADR-001) - Not applicable to this story (no REST API yet)
- **Reading large files repeatedly** - Keep callback implementations lightweight
- **Missing timeout handling** - Critical for decision callbacks to prevent workflow hangs

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: /api/v2/{domain}, Backend: /{domain} - NOT applicable (no REST API in scope) |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks - Callbacks must be testable with real LangGraph workflows |

### Patterns to Follow
- **Zod-first validation**: All schemas must be Zod with `z.infer<>`
- **Discriminated unions**: Result types must use `{ success: boolean }` discriminator
- **Registry pattern**: Use class-based registry for managing callback implementations
- **Timeout handling**: Always use Promise.race for user-blocking operations
- **Functional patterns**: Prefer functions over classes where appropriate

### Patterns to Avoid
- **TypeScript interfaces**: Use Zod schemas instead
- **Barrel files**: Import directly from source
- **console.log**: Use @repo/logger
- **Blocking indefinitely**: All callbacks must have timeout configuration

---

## Conflict Analysis

**No conflicts detected.**

This story is in Wave 1 with no dependencies and no overlapping active work.

---

## Story Seed

### Title
Decision Callback System - Interactive User Prompts for LangGraph Workflows

### Description

**Context:**

LangGraph workflows currently have no mechanism for requesting user decisions during execution. Claude Code workflows use `AskUserQuestion` to present choices (e.g., "Add this gap as AC or create follow-up story?"), but LangGraph operates entirely programmatically. This blocks migration of interactive workflows like `/elab-story` and `/dev-implement-story` to LangGraph.

**Problem:**

Without a decision callback system, LangGraph workflows cannot:
- Present choices to users for ambiguous requirements
- Collect user input for gap handling during elaboration
- Support both autonomous and interactive execution modes
- Block workflow execution while waiting for decisions
- Handle timeouts when users don't respond
- Support multiple UI modes (CLI, web, auto-decision)

**Solution Direction:**

Create a flexible callback system that:
1. Defines a clean interface for decision requests/responses
2. Implements CLI-based interactive prompts using `inquirer`
3. Supports auto-decision mode with configurable rules
4. Integrates with LangGraph nodes via configuration
5. Handles timeouts gracefully with fallback options
6. Supports cancellation and cleanup

**Integration Points:**
- LangGraph elaboration graph nodes for gap decision handling
- Future: Story creation graph for requirement clarification
- Future: Implementation graph for architectural decisions

### Initial Acceptance Criteria

- [ ] AC-1: Define DecisionCallback interface with Zod schemas
  - Request schema with id, type, question, options, context, timeout
  - Response schema with answer, cancelled, timedOut flags
  - Support single-choice, multi-select, and text-input question types

- [ ] AC-2: Implement CLIDecisionCallback using inquirer
  - Display question and options in terminal
  - Accept user input with arrow keys + enter
  - Return validated DecisionResponse
  - Handle timeout with Promise.race pattern
  - Support cancellation via Ctrl+C

- [ ] AC-3: Implement AutoDecisionCallback with rule engine
  - Accept configurable decision rules array
  - Match rules based on context conditions
  - Return auto-decision with logged rationale
  - Support default fallback rule
  - No user interaction required

- [ ] AC-4: Create DecisionCallbackRegistry
  - Register callbacks by name (cli, auto, noop)
  - Retrieve callback by name
  - Provide getDefault() method
  - Support custom callback registration

- [ ] AC-5: Integrate with LangGraph nodes
  - Pass callback via graph configuration
  - Invoke callback from node implementations
  - Wait for response before continuing workflow
  - Handle timeout and cancellation gracefully

- [ ] AC-6: Write unit tests (>80% coverage)
  - Test CLIDecisionCallback with mocked inquirer
  - Test AutoDecisionCallback rule matching
  - Test timeout handling
  - Test cancellation handling
  - Test registry operations

- [ ] AC-7: Write integration tests with LangGraph
  - Test callback invocation from elaboration graph
  - Test workflow continuation after decision
  - Test auto-decision mode end-to-end
  - Test CLI mode with mocked input

### Non-Goals

**Out of Scope for LNGG-0030:**
- ❌ Web UI implementation (REST API for web-based decisions) - Future story
- ❌ VSCode extension integration - Future story
- ❌ Persistent decision history to database - Future story
- ❌ Multi-user decision workflows - Future story
- ❌ Decision replay/audit trail - Future story
- ❌ Integration with ALL LangGraph workflows - Only elaboration graph initially
- ❌ Migration of Claude Code commands - Separate epic (KBAR)
- ❌ Batch decision queuing - Future enhancement
- ❌ Knowledge Base decision logging - Can defer to workflow layer

### Reuse Plan

**Components:**
- `inquirer` package for CLI prompts
- `zod` for schema validation
- `@repo/logger` for logging

**Patterns:**
- Decision tier classification from `.claude/agents/_shared/decision-handling.md`
- Registry pattern from model assignments system
- Timeout handling with Promise.race
- Discriminated union result types

**Packages:**
- Install `inquirer@^9.2.0` as dependency
- Use existing `zod` and `@repo/logger`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Context:**
- Focus on timeout edge cases - callbacks must never hang indefinitely
- Test with real LangGraph workflows (ADR-005: no mocks for integration tests)
- Validate all three callback types (CLI, auto, noop) work independently
- Ensure cancellation cleanup prevents resource leaks
- Mock `inquirer` for unit tests but use real prompts for integration tests

**Key Test Scenarios:**
1. Timeout triggers and returns appropriate response
2. Cancellation cleans up and allows graceful exit
3. Auto-decision rules match correctly based on context
4. CLI callback displays options correctly
5. Integration with elaboration graph node works end-to-end

### For UI/UX Advisor

**UX Constraints:**
- CLI prompts must be clear and concise (limited terminal space)
- Options should have descriptions for context
- Recommended options should be visually indicated
- Timeout should show countdown or warning
- Cancellation should be obvious (Ctrl+C documented)

**Future Considerations:**
- Web UI will need async callback queue mechanism
- Consider accessibility for screen readers in future
- Mobile support may need different interaction patterns

### For Dev Feasibility

**Implementation Constraints:**
- Must work in both TypeScript and compiled JavaScript
- `inquirer` is ESM-only in v9+ - verify compatibility with current build
- Timeout implementation must not leave hanging promises
- Registry must be singleton to avoid duplicate registrations
- Callback interface must be extensible for future implementations (web, Slack, etc.)

**Technical Risks:**
1. **inquirer ESM compatibility** - May need CommonJS fallback or build config changes
2. **Promise cleanup** - Timeout and cancellation must clean up properly
3. **Node.js signal handling** - Ctrl+C handling varies across platforms
4. **State management** - Callbacks must be stateless or properly clean up state

**Integration Points:**
- LangGraph config object for passing callbacks
- Node implementations must support optional callback parameter
- Error handling for missing or invalid callbacks

**File Structure:**
```
packages/backend/orchestrator/src/
├── adapters/                      # NEW
│   ├── decision-callbacks/        # NEW
│   │   ├── index.ts              # Exports
│   │   ├── types.ts              # Zod schemas
│   │   ├── cli-callback.ts       # CLI implementation
│   │   ├── auto-callback.ts      # Auto-decision implementation
│   │   ├── noop-callback.ts      # No-op implementation
│   │   ├── registry.ts           # Callback registry
│   │   └── __tests__/            # Unit tests
│   │       ├── cli-callback.test.ts
│   │       ├── auto-callback.test.ts
│   │       ├── registry.test.ts
│   │       └── integration.test.ts
│   └── index.ts                  # Export all adapters
```

---

## Success Criteria Summary

**Technical Milestones:**
1. All Zod schemas defined and validated
2. CLI callback working with inquirer
3. Auto-decision rules engine working
4. Registry managing all callback types
5. Integration with elaboration graph successful
6. >80% test coverage achieved

**Quality Gates:**
1. TypeScript strict mode passes
2. All unit tests pass
3. Integration tests pass with real LangGraph workflow
4. Timeout handling prevents indefinite hangs
5. Cancellation cleanup verified

**Dependencies Satisfied:**
- Blocks LNGG-0070 (Integration Test Suite) - provides decision callback infrastructure

---

## Estimated Complexity

**Size:** Large (10 hours)
- Interface definition: 1 hour
- CLI implementation: 3 hours (inquirer integration + timeout + cancellation)
- Auto-decision implementation: 2 hours (rule engine + logging)
- Registry implementation: 1 hour
- LangGraph integration: 2 hours
- Testing: 3 hours (unit + integration)

**Risk Level:** High
- Complex state management for timeouts and cancellation
- Platform-specific signal handling (Ctrl+C)
- ESM module compatibility with inquirer
- Race conditions between timeout and user input

**Complexity Drivers:**
1. Timeout handling requires careful Promise management
2. Cancellation cleanup must prevent leaks
3. CLI UX must be polished and intuitive
4. Integration with LangGraph config is novel
5. Testing async timeout/cancellation is complex

---

**STORY-SEED COMPLETE**
