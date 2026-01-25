# TEST-PLAN: wrkf-1030

## Summary

This test plan covers the **bootstrap_graph** subgraph for the `/pm-bootstrap-workflow` command. The subgraph converts raw plans (PRDs, feature descriptions) into structured story artifacts:

- **{PREFIX}.stories.index.md** - Master story index with all stories, dependencies, and status
- **{PREFIX}.plan.meta.md** - Meta plan with principles and conventions
- **{PREFIX}.plan.exec.md** - Execution plan with phases and waves

The implementation creates four nodes:
1. **Plan Analyzer Node** - Extracts goal, phases, stories, dependencies, and risks from raw plan input
2. **Story Splitter Node** - Divides large plans into appropriately-sized stories with dependency tracking
3. **Index Generator Node** - Produces the `{PREFIX}.stories.index.md` file
4. **Meta/Exec Plan Generator Node** - Produces the `{PREFIX}.plan.meta.md` and `{PREFIX}.plan.exec.md` files

All nodes use the infrastructure from wrkf-1020 (`createNode()`, `updateState()`, error handling, logging).

---

## Happy Path Tests

| ID | Test Description | Expected Outcome | Evidence |
|----|------------------|------------------|----------|
| HP-1 | Plan analyzer node parses valid PRD with goal, phases, and stories | Returns structured PlanAnalysis in state with extracted goal, phases, stories, dependencies, risks | Unit test output |
| HP-2 | Plan analyzer extracts overall goal from plan text | `analysis.goal` contains single-sentence goal | Unit test output |
| HP-3 | Plan analyzer identifies major phases/milestones | `analysis.phases` array contains phase objects with names and descriptions | Unit test output |
| HP-4 | Plan analyzer extracts individual stories | `analysis.stories` array contains story objects with IDs, titles, descriptions | Unit test output |
| HP-5 | Plan analyzer detects explicit dependencies between stories | `analysis.dependencies` map contains story-to-story relationships | Unit test output |
| HP-6 | Plan analyzer identifies risk areas | `analysis.risks` array contains risk descriptions | Unit test output |
| HP-7 | Story splitter respects sizing guidelines (max 8 ACs per story) | No story in output exceeds 8 acceptance criteria | Unit test output |
| HP-8 | Story splitter assigns correct sequential numbering with prefix | Stories numbered as `{PREFIX}-1000`, `{PREFIX}-1010`, etc. | Unit test output |
| HP-9 | Story splitter maintains dependency relationships after splitting | Dependencies updated to reference new story IDs | Unit test output |
| HP-10 | Index generator produces valid Markdown structure | Output parses as valid Markdown with expected sections | Unit test output |
| HP-11 | Index generator includes Progress Summary table | Markdown contains status count table (completed, generated, in-progress, pending) | Unit test output |
| HP-12 | Index generator includes Ready to Start section | Lists stories with no blockers | Unit test output |
| HP-13 | Index generator includes per-story sections with all required fields | Each story has Status, Depends On, Feature, Goal, Risk Notes | Unit test output |
| HP-14 | Meta plan generator produces valid YAML frontmatter | Output has valid doc_type, title, status, story_prefix, created_at, updated_at, tags | Unit test output |
| HP-15 | Meta plan generator includes Story Prefix section | Documents the prefix and ID patterns | Unit test output |
| HP-16 | Meta plan generator includes Principles section | Contains Reuse First and Package Boundary Rules | Unit test output |
| HP-17 | Exec plan generator produces valid YAML frontmatter | Output has valid frontmatter matching schema | Unit test output |
| HP-18 | Exec plan generator includes Artifact Naming Convention table | Maps artifact types to filename patterns | Unit test output |
| HP-19 | Exec plan generator includes Token Budget Rule section | Documents token tracking requirements | Unit test output |
| HP-20 | Full bootstrap_graph execution produces all three output files | `artifactPaths` contains paths to all three generated files | Integration test output |
| HP-21 | Bootstrap graph updates state with epicPrefix from input | `state.epicPrefix` matches provided prefix | Unit test output |
| HP-22 | Bootstrap graph sets routingFlags.complete on success | `routingFlags.complete` is true after successful execution | Unit test output |
| HP-23 | Nodes log entry/exit with duration via createNodeLogger | Logger mock called with expected node names and timing | Unit test mock assertions |
| HP-24 | Story numbering starts at 1000 and increments by 10 | First story is `{PREFIX}-1000`, second is `{PREFIX}-1010`, etc. | Unit test output |

---

## Error Cases

| ID | Test Description | Expected Error | Evidence |
|----|------------------|----------------|----------|
| EC-1 | Plan analyzer receives empty plan input | Error captured in `state.errors` with message "Plan input is empty" | Unit test output |
| EC-2 | Plan analyzer receives malformed text (no discernible structure) | Error captured with message indicating parsing failure | Unit test output |
| EC-3 | Story splitter receives empty stories array | Error captured with message "No stories to split" | Unit test output |
| EC-4 | Story splitter detects circular dependency (A depends on B, B depends on A) | Error captured with message "Circular dependency detected: {PREFIX}-1000 <-> {PREFIX}-1010" | Unit test output |
| EC-5 | Story splitter detects dependency on non-existent story | Error captured with message "Dependency {PREFIX}-9999 does not exist" | Unit test output |
| EC-6 | Index generator receives invalid epicPrefix (empty string) | Validation error captured, node sets `routingFlags.blocked` | Unit test output |
| EC-7 | Index generator receives stories with missing required fields | Error captured listing missing fields | Unit test output |
| EC-8 | Meta/exec generator receives invalid output directory | Error captured with message "Output directory not writable" | Unit test output |
| EC-9 | Node execution fails and exhausts retry attempts | All intermediate errors captured in `state.errors`, `routingFlags.blocked` set | Unit test output |
| EC-10 | Plan input contains only whitespace | Error captured with message "Plan input is empty or whitespace only" | Unit test output |
| EC-11 | Story prefix contains invalid characters (spaces, special chars) | Validation error: "Story prefix must be alphanumeric with optional hyphens" | Unit test output |
| EC-12 | Dependency graph has transitive circular dependency (A -> B -> C -> A) | Error captured with message listing full cycle | Unit test output |

---

## Edge Cases

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| EDGE-1 | Minimal plan with single story and no dependencies | Single story generated with no blockers, all three files created | Unit test output |
| EDGE-2 | Plan with maximum recommended stories (50+) | All stories processed, performance within acceptable bounds (<5s) | Unit test output |
| EDGE-3 | Plan with deeply nested dependencies (10+ levels) | Dependencies correctly resolved and represented | Unit test output |
| EDGE-4 | Story prefix is already lowercase | Prefix used as-is without transformation | Unit test output |
| EDGE-5 | Story prefix is uppercase (e.g., "WRKF") | Prefix normalized to lowercase for file paths, preserved in display | Unit test output |
| EDGE-6 | Story prefix contains hyphen (e.g., "MY-EPIC") | Prefix handled correctly with hyphenated story IDs | Unit test output |
| EDGE-7 | Plan contains Unicode characters in descriptions | Unicode preserved correctly in output files | Unit test output |
| EDGE-8 | Plan has story at exact sizing threshold (8 ACs) | Story NOT split, passes through unchanged | Unit test output |
| EDGE-9 | Plan has story just over threshold (9 ACs) | Story IS split into two smaller stories | Unit test output |
| EDGE-10 | Plan specifies custom output directory | Files written to specified directory, not default | Unit test output |
| EDGE-11 | Stories have identical names but different IDs | Both stories included with unique IDs | Unit test output |
| EDGE-12 | Dependency on story that will be split | Dependencies updated to point to first resulting story | Unit test output |
| EDGE-13 | Plan with risks but no explicit risk section | Risks inferred from complexity indicators | Unit test output |
| EDGE-14 | Output files already exist (overwrite scenario) | Files overwritten, no error | Unit test output |
| EDGE-15 | Timestamps in output match expected timezone (America/Denver) | Agent Log timestamps use correct timezone format | Unit test output |
| EDGE-16 | Plan with only phases, no explicit stories | Stories inferred from phase descriptions | Unit test output |
| EDGE-17 | Story count at boundary (exactly 10, exactly 50) | Processed correctly without off-by-one errors | Unit test output |

---

## Integration Tests

| ID | Test Description | Expected Behavior | Evidence |
|----|------------------|-------------------|----------|
| INT-1 | Bootstrap graph uses createNode() from wrkf-1020 | All nodes created via factory with logging and error handling | Test mock assertions |
| INT-2 | Bootstrap graph uses GraphState schema from wrkf-1010 | State mutations use correct field types | Type-check output |
| INT-3 | Bootstrap graph updates artifactPaths with generated file paths | `artifactPaths.storiesIndex`, `artifactPaths.planMeta`, `artifactPaths.planExec` populated | Integration test output |
| INT-4 | Bootstrap graph uses @repo/logger for all logging | No console.log, all output via logger | Grep verification |
| INT-5 | Bootstrap graph state flows correctly between nodes | Plan analysis flows to splitter, splitter to generators | Integration test output |
| INT-6 | Bootstrap graph handles partial success (some nodes succeed, some fail) | Errors captured, successful outputs preserved | Integration test output |
| INT-7 | Bootstrap graph sets evidenceRefs for generated artifacts | Evidence bundle includes file paths and generation metadata | Integration test output |
| INT-8 | Node retry logic from wrkf-1020 works with bootstrap nodes | Transient failures retried, terminal failures captured | Integration test output |

---

## Evidence Requirements

### Build and Verification Commands

- [ ] `pnpm build --filter @repo/orchestrator` completes without errors
- [ ] `pnpm check-types --filter @repo/orchestrator` completes without errors
- [ ] `pnpm test --filter @repo/orchestrator` shows all tests passing
- [ ] `pnpm lint --filter @repo/orchestrator` shows no errors

### Coverage Expectations

- [ ] Test coverage report showing **80%+ for `src/graphs/bootstrap/`**
- [ ] All nodes individually tested with minimum 90% coverage
- [ ] Integration tests cover full graph execution path

### Import Verification

All exports accessible from `@repo/orchestrator`:

```typescript
import {
  // Bootstrap graph
  createBootstrapGraph,
  BootstrapGraphConfig,

  // Individual nodes (for testing)
  planAnalyzerNode,
  storySplitterNode,
  indexGeneratorNode,
  metaExecGeneratorNode,

  // Input/output types
  PlanAnalysis,
  BootstrapInput,
  BootstrapOutput,
} from '@repo/orchestrator'
```

### File Generation Verification

- [ ] Generated `{PREFIX}.stories.index.md` matches expected template structure
- [ ] Generated `{PREFIX}.plan.meta.md` has valid YAML frontmatter
- [ ] Generated `{PREFIX}.plan.exec.md` has valid YAML frontmatter
- [ ] All generated files are valid Markdown (linter passes)

### Dependency Verification

- [ ] wrkf-1020 (Node Runner Infrastructure) is implemented and passing
- [ ] GraphState schema from wrkf-1010 is correctly imported
- [ ] @repo/logger is correctly integrated

---

## Test File Structure

```
packages/backend/orchestrator/src/graphs/bootstrap/
├── __tests__/
│   ├── plan-analyzer.test.ts       # HP-1 through HP-6, EC-1, EC-2, EC-10
│   ├── story-splitter.test.ts      # HP-7 through HP-9, EC-3 through EC-5, EC-12
│   ├── index-generator.test.ts     # HP-10 through HP-13, EC-6, EC-7
│   ├── meta-exec-generator.test.ts # HP-14 through HP-19, EC-8
│   ├── bootstrap-graph.test.ts     # HP-20 through HP-24, INT-1 through INT-8
│   └── fixtures/
│       ├── minimal-plan.txt        # EDGE-1
│       ├── large-plan.txt          # EDGE-2
│       ├── complex-dependencies.txt # EDGE-3
│       └── unicode-plan.txt        # EDGE-7
```

---

## Demo Script

1. `cd /path/to/monorepo`
2. `pnpm build --filter @repo/orchestrator` - Verify build succeeds
3. `pnpm test --filter @repo/orchestrator` - Verify all tests pass
4. `pnpm check-types --filter @repo/orchestrator` - Verify type checking passes
5. Create test file verifying graph execution:
   ```typescript
   import {
     createBootstrapGraph,
     BootstrapInput,
   } from '@repo/orchestrator'
   import { createInitialState } from '@repo/orchestrator'

   const graph = createBootstrapGraph()

   const input: BootstrapInput = {
     rawPlan: `
       # Feature: User Authentication

       ## Goal
       Implement secure user authentication with OAuth2.

       ## Stories
       1. OAuth2 Provider Setup - Configure providers
       2. Login Flow - Implement login UI and backend
       3. Token Refresh - Handle token expiration

       ## Dependencies
       - Login Flow depends on OAuth2 Provider Setup
       - Token Refresh depends on Login Flow
     `,
     projectName: 'auth-feature',
     storyPrefix: 'AUTH',
     outputDirectory: 'plans/',
   }

   const state = createInitialState({ epicPrefix: 'auth', storyId: 'auth-1000' })
   const result = await graph.invoke({ ...state, bootstrapInput: input })

   console.log('Generated files:', result.artifactPaths)
   console.log('Stories created:', result.bootstrapOutput?.storyCount)
   console.log('Errors:', result.errors)
   ```
6. Verify all three output files are generated with correct structure

---

*Test Plan drafted by pm-draft-test-plan sub-agent | 2026-01-24*
