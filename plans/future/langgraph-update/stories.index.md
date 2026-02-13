# LangGraph Integration Adapters - Story Index

## Metadata
- **Feature ID:** LNGG
- **Feature Name:** LangGraph Integration Adapters
- **Total Stories:** 7
- **Status:** Planning
- **Owner:** Engineering
- **Start Date:** 2026-02-17 (Week 2)
- **Target Date:** 2026-03-14 (Week 5)

## Progress Summary

| Status | Count |
|--------|-------|
| Backlog | 7 |
| Ready to Work | 0 |
| In Progress | 0 |
| UAT | 0 |
| Done | 0 |

**Completion:** 0% (0/7 stories done)

---

## Critical Path

```
LNGG-001 (Story File Adapter)
   ├─> LNGG-002 (Index Adapter)
   ├─> LNGG-004 (Stage Adapter)
   └─> LNGG-006 (Checkpoint Adapter)
        └─> LNGG-007 (Integration Tests)

LNGG-003 (Decision Callbacks)
   └─> LNGG-007 (Integration Tests)

LNGG-005 (KB Adapter)
   └─> LNGG-007 (Integration Tests)
```

**Blockers:** None - all prerequisites met

**Parallel Work:**
- LNGG-001 and LNGG-003 can be built in parallel
- LNGG-005 can be built independently

---

## Stories

### Phase 0: Infrastructure (P0 - Week 2-3)

#### LNGG-001: Story File Adapter - YAML Read/Write/Parse
- **Status:** backlog
- **Priority:** P0 (Critical)
- **Size:** medium (8 hours)
- **Complexity:** medium
- **Risk:** high (file corruption possible)
- **Blocked By:** None
- **Blocks:** LNGG-002, LNGG-004, LNGG-006, LNGG-007
- **Tags:** foundation, file-io, yaml, zod
- **Description:** Read/write story files with YAML frontmatter, atomic operations, Zod validation
- **Key Deliverables:**
  - `StoryFileAdapter` class with read/write/update methods
  - Zod schemas for frontmatter and content
  - Atomic write implementation (temp + rename)
  - Error handling (StoryNotFoundError, InvalidYAMLError, etc.)
  - 80%+ test coverage

---

#### LNGG-002: Index Management Adapter - stories.index.md Updates
- **Status:** backlog
- **Priority:** P0 (Critical)
- **Size:** medium (6 hours)
- **Complexity:** medium
- **Risk:** medium (index drift)
- **Blocked By:** LNGG-001
- **Blocks:** LNGG-007
- **Tags:** index, metrics, transactions
- **Description:** Manage stories.index.md with atomic updates, metric calculation, transaction support
- **Key Deliverables:**
  - `IndexAdapter` class with add/update/remove methods
  - Metric recalculation (status counts, completion %)
  - Transaction support (commit/rollback)
  - Circular dependency detection
  - Index validation

---

#### LNGG-003: Decision Callback System - Interactive User Prompts
- **Status:** backlog
- **Priority:** P0 (Critical)
- **Size:** large (10 hours)
- **Complexity:** high
- **Risk:** high (blocking workflows)
- **Blocked By:** None
- **Blocks:** LNGG-007
- **Tags:** user-interaction, cli, auto-mode
- **Description:** Callback system for user decisions, CLI prompts, auto-decision mode, timeouts
- **Key Deliverables:**
  - `DecisionCallback` interface
  - `CLIDecisionCallback` implementation (using inquirer)
  - `AutoDecisionCallback` with rule engine
  - Timeout and cancellation support
  - Integration with LangGraph nodes

---

#### LNGG-004: Stage Movement Adapter - Directory-Based Stage Transitions
- **Status:** backlog
- **Priority:** P0 (Critical)
- **Size:** small (4 hours)
- **Complexity:** low
- **Risk:** medium (data loss on move)
- **Blocked By:** LNGG-001
- **Blocks:** LNGG-007
- **Tags:** file-operations, stage-management
- **Description:** Move stories between stages (backlog/ → ready-to-work/ → in-progress/ → UAT/)
- **Key Deliverables:**
  - `StageAdapter` class with moveStory() method
  - Atomic directory operations
  - Stage transition validation
  - Update story frontmatter status on move
  - Rollback on failure

---

### Phase 1: Optional/Future (P1 - Week 4)

#### LNGG-005: KB Writing Adapter - Knowledge Base Integration
- **Status:** backlog
- **Priority:** P1 (High)
- **Size:** medium (6 hours)
- **Complexity:** medium
- **Risk:** low (non-blocking feature)
- **Blocked By:** None
- **Blocks:** LNGG-007
- **Tags:** kb, integration, future-opportunities
- **Description:** Write non-blocking findings to Knowledge Base for future reference
- **Key Deliverables:**
  - `KBAdapter` class with writeEntry() method
  - Entry categorization (future-opportunity, anti-pattern, lesson-learned)
  - Deduplication support
  - Optional DB or MCP integration
  - Mock mode for testing

---

#### LNGG-006: Checkpoint Adapter - Resume Support
- **Status:** backlog
- **Priority:** P1 (High)
- **Size:** small (4 hours)
- **Complexity:** low
- **Risk:** low (nice-to-have)
- **Blocked By:** LNGG-001
- **Blocks:** LNGG-007
- **Tags:** checkpoint, resume, state-management
- **Description:** Read/write CHECKPOINT.md files for workflow resume capability
- **Key Deliverables:**
  - `CheckpointAdapter` class with read/write methods
  - Phase tracking
  - Token usage logging
  - Resume-from support
  - Checkpoint validation

---

### Phase 2: Validation (P0 - Week 5)

#### LNGG-007: Integration Test Suite - End-to-End Validation
- **Status:** backlog
- **Priority:** P0 (Critical)
- **Size:** large (8 hours)
- **Complexity:** high
- **Risk:** medium (quality gate)
- **Blocked By:** LNGG-001, LNGG-002, LNGG-003, LNGG-004
- **Blocks:** None
- **Tags:** testing, integration, e2e, quality
- **Description:** Comprehensive test suite validating all adapters working together
- **Key Deliverables:**
  - Integration tests for adapter combinations
  - E2E tests with LangGraph workflows
  - Real story file testing (INST-1008)
  - Performance benchmarks
  - Quality comparison vs Claude Code

---

## Dependencies

### External Dependencies
- ✅ Anthropic API key (for Claude Sonnet calls)
- ✅ Ollama models installed
- ✅ Model assignments configured
- ⏳ `gray-matter` npm package (for YAML frontmatter)
- ⏳ `inquirer` npm package (for CLI prompts)

### Internal Dependencies
- ✅ LangGraph workflows exist (story-creation, elaboration)
- ✅ Zod installed and configured
- ✅ TypeScript strict mode enabled
- ⏳ Test fixtures needed (sample story files)

---

## Risks and Mitigations

### Risk 1: File Corruption (HIGH)
**Mitigation:** Atomic writes (temp + rename), validation before write, rollback support

### Risk 2: Index Drift (MEDIUM)
**Mitigation:** Transaction support, periodic reconciliation, validation on every update

### Risk 3: Blocking Prompts (MEDIUM)
**Mitigation:** Timeout handling, auto-decision fallback, cancellation support

### Risk 4: Performance (MEDIUM)
**Mitigation:** Caching, batch operations, parallel reads, performance tests

---

## Success Metrics

### Technical Metrics
- **Test Coverage:** >80% for all adapters
- **File Read:** <50ms p95
- **File Write:** <100ms p95
- **Index Update:** <100ms p95
- **Decision Prompt:** <5s p95 (user-dependent)

### Business Metrics
- **Cost Reduction:** 56% vs Claude Code baseline
- **Quality:** ≥ Claude Code baseline (manual review)
- **Migration Progress:** 3/32 commands by Week 5

---

## Timeline

| Week | Stories | Milestone |
|------|---------|-----------|
| **Week 2 (Feb 17-21)** | LNGG-001, LNGG-002, LNGG-003 | Core adapters complete |
| **Week 3 (Feb 24-28)** | LNGG-004, LNGG-007 | Integration tests passing |
| **Week 4 (Mar 3-7)** | LNGG-005, LNGG-006 | Optional adapters complete |
| **Week 5 (Mar 10-14)** | Testing, validation | Production-ready |

---

## Next Actions

1. ✅ Review and approve PLAN.md
2. ✅ Review individual story specs
3. ⏳ Set up `src/adapters/` directory
4. ⏳ Install dependencies (gray-matter, inquirer)
5. ⏳ Start LNGG-001 (Story File Adapter)
6. ⏳ Weekly progress sync

---

## Notes

- All adapters use Zod for validation
- All file operations are atomic (no partial writes)
- All adapters are testable (mockable)
- All errors are typed and include context
- Performance is monitored and enforced

---

## References

- **PLAN.md** - Epic overview and architecture
- **WORKFLOW_STATE_DIAGRAMS.md** - Gap analysis and requirements
- **MIGRATION_STRATEGY.md** - Cost analysis and rollout
- **LANGGRAPH_FIRST_STRATEGY.md** - Strategic decision
