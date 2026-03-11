---
generated: "2026-02-15"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: LNGG-0080

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: ADR-LOG.md not found at expected location (plans/stories/ADR-LOG.md does not exist)

### Relevant Existing Features
| Feature | Location | Status |
|---------|----------|--------|
| Story File Adapter | packages/backend/orchestrator/src/adapters/story-file-adapter.ts | Implemented |
| Index Management Adapter | packages/backend/orchestrator/src/adapters/index-adapter.ts | Implemented |
| Stage Movement Adapter | packages/backend/orchestrator/src/adapters/stage-movement-adapter.ts | Implemented |
| Checkpoint Adapter | packages/backend/orchestrator/src/adapters/checkpoint-adapter.ts | Implemented |
| Decision Callback System | packages/backend/orchestrator/src/adapters/decision-callbacks/ | Implemented |
| KB Writer Adapter | packages/backend/orchestrator/src/adapters/kb-writer/ | Implemented |
| Integration Test Suite (LNGG-0070) | packages/backend/orchestrator/src/adapters/__tests__/ | Done - QA PASS |
| LangGraph workflows | packages/backend/orchestrator/src/graphs/ | Implemented (story-creation, elaboration) |
| Workflow nodes | packages/backend/orchestrator/src/nodes/workflow/ | Partial (doc-sync.ts exists) |
| Workflow commands | .claude/commands/ | Implemented (dev-implement-story, qa-verify-story, story-move, etc.) |

### Active In-Progress Work
| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| None | - | No active stories in platform epic |

### Constraints to Respect
- All adapters are implemented but not yet integrated into workflow commands
- LNGG-001 through LNGG-006 are in backlog (not formally executed through story workflow)
- LNGG-0070 integration tests validate adapters work correctly but in isolation
- Workflow commands (.claude/commands/) currently do NOT use the adapter implementations
- LangGraph graphs exist (story-creation, elaboration) but need workflow command integration
- Zod-first type definitions required (no TypeScript interfaces)
- ESM module pattern with .js extensions in imports

---

## Retrieved Context

### Related Endpoints
None - this is an internal orchestration story with no API exposure.

### Related Components

**Workflow Commands (Integration Points):**
- /dev-implement-story - Main implementation workflow orchestrator
- /qa-verify-story - Post-implementation verification workflow
- /story-move - Story stage transition utility
- /checkpoint - Checkpoint management
- /index-update - Index management
- /pm-story - Story generation workflow
- /elab-story - Story elaboration workflow

**Existing Adapters (To Be Integrated):**
- StoryFileAdapter - Read/write story YAML files
- IndexAdapter - Manage stories.index.md files
- StageMovementAdapter - Move stories between workflow stages
- CheckpointAdapter - Read/write CHECKPOINT.yaml files
- DecisionCallback system - Interactive user prompts
- KBWriterAdapter - Write to knowledge base

**LangGraph Integration:**
- packages/backend/orchestrator/src/graphs/story-creation.ts
- packages/backend/orchestrator/src/graphs/elaboration.ts
- packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts (example pattern)

### Reuse Candidates

**Patterns:**
- Integration test patterns from LNGG-0070
- Node factory pattern from graphs/story-creation.ts
- State update helpers from runner/state-helpers.ts
- Tool node creation from runner/node-factory.js

**Packages:**
- @langchain/langgraph - StateGraph, Annotation, START, END
- Zod for schema validation
- @repo/logger for logging

**Test Fixtures:**
- packages/backend/orchestrator/src/adapters/__tests__/__fixtures__/
- packages/backend/orchestrator/src/adapters/__tests__/fixtures/

---

## Knowledge Context

### Lessons Learned

- **[LNGG-0010]** Backward compatibility is critical - test both legacy and v2 story formats to prevent schema regression (pattern)
  - *Applies because*: LNGG-0080 must integrate with existing story files in various stages

- **[LNGG-0020]** Integration tests with real files catch schema mismatches that unit tests miss (pattern)
  - *Applies because*: Command integration requires real workflow testing

- **[LNGG-0030]** Atomic write pattern (temp + rename) prevents file corruption on error (pattern)
  - *Applies because*: Workflow commands must maintain data integrity during operations

- **[LNGG-0040]** Separate unit tests (functionality) from integration tests (workflow scenarios) (pattern)
  - *Applies because*: Need both adapter unit tests (existing) and workflow integration tests (new)

- **[LNGG-0050]** Always use absolute paths and temp directories for test isolation (blocker)
  - *Applies because*: Integration tests will exercise full workflow commands

- **[LNGG-0060]** Clean up all temp files in afterEach hooks to prevent disk space issues in CI (blocker)
  - *Applies because*: Workflow tests will create many temp story directories

- **[LNGG-0070]** Use real adapter implementations in integration tests, not mocks (pattern)
  - *Applies because*: This story validates adapters work correctly within workflow commands

### Blockers to Avoid (from past stories)
- Hardcoded file paths - use path.join and temp directories
- Skipping cleanup in afterEach - causes test pollution and disk space issues
- Manual YAML parsing - use gray-matter or js-yaml
- console.log debugging - use @repo/logger
- Shared test state - isolate with beforeEach/afterEach

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Integration tests should use real adapter implementations. |

Note: ADR-LOG.md not found at expected location. Only ADR-005 referenced from KNOWLEDGE-CONTEXT.yaml.

### Patterns to Follow
- Vitest integration test pattern with fs.mkdtemp() for temp directories
- Real file testing with absolute paths
- Logger mocking with vi.mock('@repo/logger')
- Zod-first type definitions with z.infer<>
- ESM module pattern with .js extensions
- @repo/logger usage (never console.log)
- Backward compatibility testing (legacy + v2 formats)
- Error path coverage for branch coverage >80%

### Patterns to Avoid
- TypeScript interfaces without Zod schemas
- Barrel files (index.ts re-exports)
- console.log usage
- Hardcoded paths
- Shared test state

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Workflow Command Integration - Connect Adapters to LangGraph Commands

### Description

**Context:**
LNGG-001 through LNGG-006 implemented six core adapters for LangGraph workflows:
1. Story File Adapter (YAML read/write/parse)
2. Index Management Adapter (stories.index.md updates)
3. Decision Callback System (interactive user prompts)
4. Stage Movement Adapter (directory-based stage transitions)
5. KB Writing Adapter (knowledge base integration)
6. Checkpoint Adapter (resume support)

LNGG-0070 validated these adapters work correctly through comprehensive integration tests (48/48 tests passing, 96.5% coverage).

However, the actual workflow commands in .claude/commands/ (dev-implement-story, qa-verify-story, story-move, etc.) do NOT yet use these adapters. The adapters exist but are not integrated into the command execution flow.

**Problem:**
- Workflow commands duplicate adapter logic or use manual file operations
- No standardized interface for story file operations across commands
- Missing validation, atomic writes, and error handling that adapters provide
- Commands cannot leverage checkpoint resume, decision callbacks, or KB writing
- Integration gaps prevent full LangGraph workflow automation

**Proposed Solution:**
Create LangGraph workflow nodes that integrate adapters with workflow commands. Build bridge layer that:
1. Connects workflow commands to StoryFileAdapter for story YAML operations
2. Integrates IndexAdapter for stories.index.md updates during stage transitions
3. Wires StageMovementAdapter to /story-move command
4. Connects CheckpointAdapter to checkpoint read/write operations
5. Integrates DecisionCallback system for user prompts in autonomous modes
6. Optionally connects KBWriterAdapter for deferred KB writes

This allows commands to leverage validated, tested, atomic adapter operations instead of manual file handling.

### Initial Acceptance Criteria

- [ ] AC-1: Create workflow nodes in src/nodes/workflow/ that wrap each adapter (story-file, index, stage-movement, checkpoint, decision-callback, kb-writer)
- [ ] AC-2: Integrate StoryFileAdapter into story read/write operations for workflow commands
- [ ] AC-3: Integrate IndexAdapter into index update operations (stage transitions, status updates)
- [ ] AC-4: Integrate StageMovementAdapter into /story-move command execution
- [ ] AC-5: Integrate CheckpointAdapter into checkpoint read/write for dev-implement-story phases
- [ ] AC-6: Integrate DecisionCallback system into autonomous mode decisions (--autonomous flag)
- [ ] AC-7: Add integration tests validating adapters work within workflow command context
- [ ] AC-8: Update workflow command documentation with adapter integration details
- [ ] AC-9: Verify backward compatibility with existing story files (legacy and v2 formats)
- [ ] AC-10: Validate atomic operations and error handling work end-to-end in workflows

### Non-Goals
- Modifying adapter implementations (LNGG-001 through LNGG-006 are complete)
- Creating new workflow commands (integrate with existing commands only)
- Database integration (file-based adapters only, DB is future work)
- Real KB integration tests (deferred KB writes only, real KB is LNGG-0073)
- Performance optimization (use existing performance from LNGG-0070 baselines)
- LangGraph graph refactoring (use existing graphs in src/graphs/)
- Changing workflow command CLI interfaces (maintain existing signatures)

### Reuse Plan

**Components:**
- All 6 adapter implementations from packages/backend/orchestrator/src/adapters/
- Integration test patterns from LNGG-0070
- Node factory patterns from src/graphs/story-creation.ts
- State update helpers from src/runner/state-helpers.ts
- Existing workflow nodes in src/nodes/workflow/doc-sync.ts as example

**Patterns:**
- Vitest integration test setup (temp directories, logger mocking)
- Real file testing with absolute paths
- Zod-first type definitions
- ESM module imports with .js extensions
- Atomic write operations (temp + rename)
- Error handling with typed errors

**Packages:**
- @langchain/langgraph (StateGraph, Annotation)
- Zod for validation
- @repo/logger for logging
- gray-matter for YAML frontmatter (already used by adapters)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on integration tests validating adapters within workflow command execution
- Test both happy path (successful workflow) and error paths (adapter failures)
- Validate atomic operations maintain data integrity during failures
- Test backward compatibility with existing story files in all stages
- Verify checkpoint resume works across phase boundaries
- Consider testing autonomous mode decisions with different decision callback configurations
- Reuse test fixtures from LNGG-0070 where applicable (60% reuse target)

### For UI/UX Advisor
- N/A - This is an internal orchestration story with no UI components
- Decision callbacks have CLI prompts but existing UX is acceptable
- Focus on error messages being clear and actionable for developers

### For Dev Feasibility
- Review existing adapter interfaces before implementation to confirm stability
- Consider incremental integration: start with StoryFileAdapter, then IndexAdapter, then others
- Evaluate whether to create wrapper nodes or integrate adapters directly into commands
- Assess impact on existing workflow command execution (breaking changes?)
- Consider feature flags or gradual rollout if integration is risky
- Review LangGraph node patterns in src/nodes/workflow/doc-sync.ts for consistency
- Confirm ESM module compatibility across all integration points
- Estimate token cost for reading workflow command files (high-cost operations)

---

## Token Log

| Phase | Tokens | Notes |
|-------|--------|-------|
| Baseline Load | ~3,000 | BASELINE-REALITY-2026-02-13.md |
| Index Read | ~2,500 | stories.index.md |
| Context Retrieval | ~8,000 | Adapter files, command files, graphs |
| Knowledge Context | ~2,000 | LNGG-0070 KNOWLEDGE-CONTEXT.yaml |
| Seed Generation | ~1,500 | This file |
| **Total** | **~17,000** | Within budget |

---

**STORY-SEED COMPLETE**
