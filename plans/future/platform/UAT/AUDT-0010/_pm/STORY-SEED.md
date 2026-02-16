---
generated: "2026-02-14"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: AUDT-0010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None - baseline is current and active

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| LangGraph graphs (metrics, story-creation, elaboration) | Deployed | AUDT-0010 follows same pattern |
| Zod artifact schemas | Deployed | audit-findings.ts already exists |
| Index exports pattern | Established | graphs/index.ts, nodes/index.ts, artifacts/index.ts |
| Integration test pattern | Established | graphs/__tests__/*.test.ts with Vitest |
| Orchestrator package structure | Established | src/graphs/, src/nodes/, src/artifacts/ |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| None | - | No active platform stories conflict with AUDT-0010 |

### Constraints to Respect

- **Zod-first types** (REQUIRED): All schemas must use Zod with z.infer<>, no TypeScript interfaces
- **No barrel files**: Import directly from source files, not re-export indices
- **Named exports preferred**: Use function declarations and named exports
- **Vitest for testing**: All tests use Vitest + React Testing Library patterns
- **Minimum test coverage**: 45% global coverage required
- **Package structure**: Follow existing orchestrator package layout

---

## Retrieved Context

### Related Endpoints
- None - This is backend orchestrator package work, no API endpoints involved

### Related Components
- `/packages/backend/orchestrator/src/graphs/code-audit.ts` - LangGraph StateGraph (scaffolded)
- `/packages/backend/orchestrator/src/artifacts/audit-findings.ts` - Zod schemas (scaffolded)
- `/packages/backend/orchestrator/src/nodes/audit/scan-scope.ts` - File discovery node (scaffolded)
- `/packages/backend/orchestrator/src/nodes/audit/lens-*.ts` - 9 lens nodes (scaffolded)
- `/packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` - Orchestration node (scaffolded)
- `/packages/backend/orchestrator/src/nodes/audit/roundtable.ts` - Orchestration node (scaffolded)
- `/packages/backend/orchestrator/src/nodes/audit/synthesize.ts` - Orchestration node (scaffolded)
- `/packages/backend/orchestrator/src/nodes/audit/deduplicate.ts` - Orchestration node (scaffolded)
- `/packages/backend/orchestrator/src/nodes/audit/persist-findings.ts` - Orchestration node (scaffolded)
- `/packages/backend/orchestrator/src/nodes/audit/persist-trends.ts` - Orchestration node (scaffolded)

### Reuse Candidates

**Testing Patterns:**
- `/packages/backend/orchestrator/src/artifacts/__tests__/checkpoint.test.ts` - Zod schema validation pattern
- `/packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts` - LangGraph integration test pattern
- `/packages/backend/orchestrator/src/graphs/__tests__/metrics.test.ts` - Graph compilation test pattern

**Export Patterns:**
- `/packages/backend/orchestrator/src/graphs/index.ts` - Graph export pattern (see metrics/elaboration)
- `/packages/backend/orchestrator/src/nodes/index.ts` - Node export pattern (see reality/story/metrics)
- `/packages/backend/orchestrator/src/artifacts/index.ts` - Artifact export pattern (see checkpoint/scope/plan)

**Package Structure:**
- Follow existing orchestrator structure: graphs/, nodes/, artifacts/
- Use __tests__/ subdirectories for test files
- Export from top-level index.ts with clear JSDoc

---

## Knowledge Context

### Lessons Learned

**Note:** No lesson-learned KB entries loaded (KB search not available in this context). This story should establish baseline patterns for code audit testing and export conventions.

### Blockers to Avoid (from past stories)

None identified - this is foundation work with no prior blockers documented.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | N/A | No ADRs directly apply to this backend orchestrator work |

**Note:** The primary constraints come from CLAUDE.md project guidelines:
- Zod-first types (REQUIRED)
- No barrel files for re-exports
- Vitest for testing
- Named exports preferred

### Patterns to Follow

1. **Zod Schema Testing** (from checkpoint.test.ts):
   - Test valid schema parsing
   - Test invalid input rejection
   - Test factory functions produce valid schema output
   - Test edge cases (invalid versions, bad formats)

2. **LangGraph Testing** (from elaboration.test.ts, metrics.test.ts):
   - Test graph compiles successfully
   - Test conditional routing logic
   - Test state transitions through graph phases
   - Test node imports and dynamic loading

3. **Export Pattern** (from graphs/index.ts):
   - JSDoc header explaining module purpose
   - Grouped exports by graph/feature
   - Export factories, runners, node adapters, schemas, types
   - Use descriptive type aliases to avoid collisions

4. **Index Organization**:
   - Create barrel index at `nodes/audit/index.ts`
   - Register graph in `graphs/index.ts`
   - Register nodes in `nodes/index.ts`
   - Register artifacts in `artifacts/index.ts`
   - Update package-level `index.ts`

### Patterns to Avoid

1. **TypeScript interfaces** - Must use Zod schemas with z.infer<>
2. **Barrel files for re-exports** - Import directly from source files
3. **Console.log** - Use @repo/logger instead
4. **Hardcoded file paths** - Use path resolution utilities
5. **Missing test coverage** - Ensure 45%+ coverage for new code

---

## Conflict Analysis

**No conflicts detected.**

---

## Story Seed

### Title
Polish Code Audit Graph & Schemas - Add Exports and Integration Tests

### Description

**Context:**
The Code Audit Engine (AUDT epic) has scaffolded LangGraph components for multi-lens codebase analysis. The graph, schemas, and all 15 nodes exist but are not wired into the package export system and lack comprehensive testing.

**Problem:**
1. Code audit graph and nodes are not exported from package indices
2. No integration tests verify graph compilation and routing
3. Zod schemas lack validation test fixtures
4. scan-scope node lacks tests for all scope types (full, delta, domain, story)

**Solution:**
Polish the scaffolded audit infrastructure by:
1. Creating `nodes/audit/index.ts` barrel export
2. Registering graph in `graphs/index.ts`
3. Registering nodes in `nodes/index.ts`
4. Registering artifacts in `artifacts/index.ts`
5. Adding integration tests for graph compilation and routing
6. Adding Zod schema validation tests with fixtures
7. Adding scan-scope tests for all scope types

This establishes the foundation for AUDT-0020 (9 Audit Lens Nodes) and AUDT-0030 (Audit Orchestration Nodes).

### Initial Acceptance Criteria

- [ ] AC-1: `nodes/audit/index.ts` exports all 16 audit nodes (scan-scope + 9 lenses + 6 orchestration)
- [ ] AC-2: `graphs/index.ts` exports code-audit graph with same pattern as metrics/elaboration
- [ ] AC-3: `nodes/index.ts` exports audit nodes (at minimum scan-scope node)
- [ ] AC-4: `artifacts/index.ts` exports audit-findings schemas and types
- [ ] AC-5: Integration test verifies StateGraph compiles successfully
- [ ] AC-6: Integration test verifies pipeline routing (scan → lenses → synthesize → persist → END)
- [ ] AC-7: Integration test verifies roundtable routing (scan → lenses → devil's advocate → roundtable → synthesize → persist → END)
- [ ] AC-8: Zod schema tests validate AuditFindingsSchema with fixtures
- [ ] AC-9: Zod schema tests validate LensResultSchema with fixtures
- [ ] AC-10: scan-scope tests verify file discovery for scope='full'
- [ ] AC-11: scan-scope tests verify file categorization (frontend/backend/tests/config/shared)
- [ ] AC-12: `pnpm check-types --filter orchestrator` passes with no errors

### Non-Goals

- **Not implementing lens logic** - Lens nodes already scaffolded, AUDT-0020 will polish them
- **Not testing orchestration logic** - Orchestration nodes exist, AUDT-0030 will add full tests
- **Not writing findings to filesystem** - Persistence nodes exist but full testing deferred to AUDT-0030
- **Not integrating with Claude Code agents** - Agent specs exist in .claude/agents/ but integration is future work
- **Not creating /code-audit CLI command** - Command spec exists but wiring deferred to later story

### Reuse Plan

**Components:**
- Follow graph export pattern from `graphs/index.ts` (metrics/elaboration examples)
- Follow node export pattern from `nodes/index.ts` (reality/story/metrics examples)
- Follow artifact export pattern from `artifacts/index.ts` (checkpoint/scope/plan examples)

**Patterns:**
- Zod schema testing: Use pattern from `artifacts/__tests__/checkpoint.test.ts`
- LangGraph testing: Use pattern from `graphs/__tests__/elaboration.test.ts` and `graphs/__tests__/metrics.test.ts`
- Integration test: Verify graph.compile() succeeds and routing logic works

**Packages:**
- `@langchain/langgraph` - StateGraph, Annotation, START, END
- `zod` - Schema validation
- `vitest` - Test framework
- `@repo/logger` - Logging (if needed for debug)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Scope:**
1. **Schema Validation Tests** (Vitest):
   - AuditFindingsSchema: valid/invalid fixtures
   - LensResultSchema: valid/invalid fixtures
   - ChallengeResultSchema: valid/invalid fixtures
   - RoundtableResultSchema: valid/invalid fixtures
   - DedupResultSchema: valid/invalid fixtures
   - TrendSnapshotSchema: valid/invalid fixtures

2. **Integration Tests** (Vitest):
   - Graph compilation: createCodeAuditGraph() compiles successfully
   - Pipeline routing: mode='pipeline' skips devil's advocate + roundtable
   - Roundtable routing: mode='roundtable' includes devil's advocate + roundtable
   - State transitions: verify state updates through graph

3. **scan-scope Unit Tests** (Vitest):
   - File discovery for scope='full' (walks directory, excludes node_modules/dist/.next/.turbo/.git)
   - File categorization (frontend/backend/tests/config/shared based on path)
   - Previous audit detection (finds FINDINGS-{date}.yaml in plans/audit/)

**Test Fixtures:**
- Create sample audit findings with all severity levels (critical/high/medium/low)
- Create sample lens results with findings arrays
- Create sample file trees for scan-scope testing

**Coverage Targets:**
- graphs/code-audit.ts: 80%+ (graph compilation, routing logic)
- artifacts/audit-findings.ts: 90%+ (schema validation, factory functions)
- nodes/audit/scan-scope.ts: 80%+ (file discovery, categorization)

### For UI/UX Advisor

**N/A** - This is backend orchestrator work with no UI/UX components.

### For Dev Feasibility

**Implementation Considerations:**

1. **Export Registration Order:**
   - Start with `artifacts/index.ts` (schemas first)
   - Then `nodes/audit/index.ts` (node barrel)
   - Then `nodes/index.ts` (register audit nodes)
   - Then `graphs/index.ts` (register graph)
   - Finally `src/index.ts` (package exports)

2. **Testing Strategy:**
   - Write schema tests first (fast, no graph dependencies)
   - Then scan-scope tests (unit tests, no graph dependencies)
   - Finally integration tests (graph compilation, routing)

3. **Potential Challenges:**
   - **Dynamic imports in createLensParallelNode**: May complicate testing, consider mocking strategy
   - **File system access in scan-scope**: Use fixtures/temp directories for tests
   - **Conditional routing**: Ensure test cases cover both pipeline and roundtable modes

4. **File Structure:**
```
packages/backend/orchestrator/src/
  artifacts/
    audit-findings.ts (exists)
    __tests__/
      audit-findings.test.ts (NEW)
    index.ts (UPDATE - add audit exports)
  graphs/
    code-audit.ts (exists)
    __tests__/
      code-audit.test.ts (NEW)
    index.ts (UPDATE - add code-audit exports)
  nodes/
    audit/
      scan-scope.ts (exists)
      lens-*.ts (9 files exist)
      devils-advocate.ts, roundtable.ts, synthesize.ts, deduplicate.ts, persist-*.ts (exist)
      __tests__/
        scan-scope.test.ts (NEW)
      index.ts (NEW - barrel exports)
    index.ts (UPDATE - add audit node exports)
  index.ts (UPDATE - add audit exports)
```

5. **Dependencies:**
   - No new dependencies required
   - All imports from @langchain/langgraph, zod, vitest already available

6. **TypeScript Considerations:**
   - Ensure all exports have proper JSDoc
   - Use descriptive type aliases to avoid collisions (e.g., `type GraphStateWithCodeAudit`)
   - Verify strict mode compliance

7. **Time Estimates:**
   - Schema tests: 1-2 hours
   - scan-scope tests: 1-2 hours
   - Integration tests: 2-3 hours
   - Export registration: 1 hour
   - Total: 5-8 hours (T-shirt size: M)
