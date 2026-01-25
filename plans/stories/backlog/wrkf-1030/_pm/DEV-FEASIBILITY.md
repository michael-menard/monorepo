# DEV-FEASIBILITY: wrkf-1030

**Story:** wrkf-1030: bootstrap_graph Subgraph
**Date:** 2026-01-24
**Reviewer:** pm-dev-feasibility-review

---

## Dependency Analysis

### wrkf-1020 Dependency Status

| Dependency | Status | Impact |
|------------|--------|--------|
| wrkf-1010 (GraphState Schema) | **completed** | Full state types available |
| wrkf-1020 (Node Runner Infrastructure) | **generated** | Story document exists, implementation NOT done |

**Critical Finding:** wrkf-1020 is marked `generated` in the stories index, meaning the story document and elaboration exist, but the actual `src/runner/` module has NOT been implemented. This is a **soft blocker**.

**Current orchestrator package exports:**
- `src/state/` module is fully implemented (from wrkf-1010)
- `src/runner/` does NOT exist yet
- No `createNode()`, `withNodeRetry()`, `updateState()` exports available

### Dependency Risk Assessment

| Risk Level | Analysis |
|------------|----------|
| **MEDIUM** | wrkf-1030 can be designed and stubbed in parallel with wrkf-1020 implementation |
| **Mitigation** | Define node interfaces using TypeScript types; swap to real `createNode()` once wrkf-1020 completes |
| **Recommendation** | Start wrkf-1030 after wrkf-1020 reaches `in-progress` status with at least `createNode()` stubbed |

**Parallel Development Strategy:**

```typescript
// Option 1: Define bootstrap subgraph with mock node factory
// packages/backend/orchestrator/src/graphs/bootstrap/nodes/plan-analyzer.ts

import type { GraphState } from '@repo/orchestrator'

// Placeholder until wrkf-1020 provides createNode()
type NodeFunction = (state: GraphState) => Promise<Partial<GraphState>>

export const planAnalyzerNode: NodeFunction = async (state) => {
  // Implementation
}
```

Once wrkf-1020 is complete, refactor to:

```typescript
import { createNode, GraphState } from '@repo/orchestrator'

export const planAnalyzerNode = createNode(
  { name: 'plan-analyzer' },
  async (state: GraphState) => {
    // Same implementation
  }
)
```

---

## Technical Feasibility

### LangGraphJS Subgraph Patterns

LangGraphJS provides well-documented subgraph patterns. Based on [LangGraph documentation](https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs):

**Pattern 1: Direct Subgraph Composition (Recommended)**

```typescript
import { StateGraph, START, END } from '@langchain/langgraph'
import { z } from 'zod'

// Subgraph state can be a subset of parent state
const BootstrapStateSchema = z.object({
  rawPlan: z.string(),
  parsedStories: z.array(z.string()),
  indexContent: z.string().optional(),
  metaContent: z.string().optional(),
  execContent: z.string().optional(),
})

const bootstrapGraph = new StateGraph(BootstrapStateSchema)
  .addNode('plan-analyzer', planAnalyzerNode)
  .addNode('story-splitter', storySplitterNode)
  .addNode('index-generator', indexGeneratorNode)
  .addNode('meta-exec-generator', metaExecGeneratorNode)
  .addEdge(START, 'plan-analyzer')
  .addEdge('plan-analyzer', 'story-splitter')
  .addEdge('story-splitter', 'index-generator')
  .addEdge('index-generator', 'meta-exec-generator')
  .addEdge('meta-exec-generator', END)
  .compile()
```

**Pattern 2: Wrapper Function (For State Transformation)**

If the bootstrap subgraph needs different state schema than the parent orchestrator:

```typescript
// Wrapper node invokes subgraph with transformed state
const bootstrapWrapperNode = async (parentState: GraphState) => {
  const subgraphInput = { rawPlan: parentState.rawPlanContent }
  const result = await bootstrapGraph.invoke(subgraphInput)
  return { artifactPaths: result.artifactPaths }
}
```

**Technical Verdict:** LangGraphJS subgraph patterns are well-documented and straightforward. No technical barriers.

### File I/O Requirements

The bootstrap subgraph needs to:
1. **Read** raw plan files (from user input or file path)
2. **Write** generated artifacts:
   - `plans/stories/{PREFIX}.stories.index.md`
   - `plans/{PREFIX}.plan.meta.md`
   - `plans/{PREFIX}.plan.exec.md`

**Node.js File Operations:**

```typescript
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'

async function writeArtifact(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf-8')
}
```

**Consideration:** File writes are side effects. Nodes should be pure functions. Recommended pattern:

```typescript
// Node returns planned writes as data
const indexGeneratorNode = async (state) => ({
  plannedWrites: [
    { path: 'plans/stories/wrkf.stories.index.md', content: '...' }
  ]
})

// Separate "commit" node performs actual writes
const fileWriterNode = async (state) => {
  for (const write of state.plannedWrites) {
    await writeArtifact(write.path, write.content)
  }
  return { artifactPaths: { /* ... */ } }
}
```

### Markdown Parsing Requirements

The plan analyzer node must parse unstructured markdown plans. Required capabilities:

| Parsing Task | Approach |
|--------------|----------|
| Extract sections by heading | Regex: `/^##\s+(.+)$/gm` |
| Extract bullet lists | Regex: `/^[-*]\s+(.+)$/gm` |
| Extract code blocks | Regex: `/```[\s\S]*?```/g` |
| Extract YAML frontmatter | Regex: `/^---\n([\s\S]*?)\n---/` |

**No external markdown parser needed** - simple regex-based extraction is sufficient for plan structure.

### State Communication Between Nodes

Nodes communicate via the subgraph's state object:

```typescript
interface BootstrapSubgraphState {
  // Input
  rawPlan: string
  projectName: string
  storyPrefix: string
  outputDirectory: string

  // Intermediate
  parsedGoal?: string
  parsedPhases?: string[]
  parsedStories?: ParsedStory[]
  parsedDependencies?: Map<string, string[]>
  parsedRisks?: string[]

  // Output (planned file contents)
  indexContent?: string
  metaContent?: string
  execContent?: string

  // Final (written paths)
  writtenPaths?: string[]
}
```

---

## Change Surface

| Path | Action | Notes |
|------|--------|-------|
| `packages/backend/orchestrator/src/graphs/bootstrap/index.ts` | CREATE | Main subgraph export and StateGraph definition |
| `packages/backend/orchestrator/src/graphs/bootstrap/state.ts` | CREATE | BootstrapSubgraphState Zod schema |
| `packages/backend/orchestrator/src/graphs/bootstrap/nodes/plan-analyzer.ts` | CREATE | Parse raw plan, extract structure |
| `packages/backend/orchestrator/src/graphs/bootstrap/nodes/story-splitter.ts` | CREATE | Split into individual story entries |
| `packages/backend/orchestrator/src/graphs/bootstrap/nodes/index-generator.ts` | CREATE | Generate stories.index.md content |
| `packages/backend/orchestrator/src/graphs/bootstrap/nodes/meta-exec-generator.ts` | CREATE | Generate plan.meta.md and plan.exec.md |
| `packages/backend/orchestrator/src/graphs/bootstrap/nodes/file-writer.ts` | CREATE | Write planned content to filesystem |
| `packages/backend/orchestrator/src/graphs/bootstrap/utils/markdown.ts` | CREATE | Markdown parsing utilities |
| `packages/backend/orchestrator/src/graphs/bootstrap/utils/templates.ts` | CREATE | File content templates |
| `packages/backend/orchestrator/src/graphs/bootstrap/__tests__/plan-analyzer.test.ts` | CREATE | Unit tests |
| `packages/backend/orchestrator/src/graphs/bootstrap/__tests__/story-splitter.test.ts` | CREATE | Unit tests |
| `packages/backend/orchestrator/src/graphs/bootstrap/__tests__/index-generator.test.ts` | CREATE | Unit tests |
| `packages/backend/orchestrator/src/graphs/bootstrap/__tests__/meta-exec-generator.test.ts` | CREATE | Unit tests |
| `packages/backend/orchestrator/src/graphs/bootstrap/__tests__/integration.test.ts` | CREATE | End-to-end subgraph tests |
| `packages/backend/orchestrator/src/graphs/index.ts` | CREATE | Graphs module export |
| `packages/backend/orchestrator/src/index.ts` | MODIFY | Export graphs module |

**Estimated Files:** 16 files (10 source, 5 tests, 1 modify)

---

## Hidden Dependencies

### 1. File System Access

The bootstrap subgraph writes files to disk. This is a side effect that:
- May fail due to permissions
- May fail due to disk space
- Requires path validation to prevent writes outside project

**Mitigation:** Add path validation utility:

```typescript
function validateOutputPath(basePath: string, targetPath: string): boolean {
  const resolved = resolve(targetPath)
  return resolved.startsWith(resolve(basePath))
}
```

### 2. Logger Integration (@repo/logger)

All nodes must use `@repo/logger` per project conventions. This dependency is already noted in wrkf-1020 but applies here too.

```typescript
import { createLogger } from '@repo/logger'

const logger = createLogger('orchestrator:bootstrap:plan-analyzer')
```

### 3. Template Patterns from Existing Commands

The `/pm-bootstrap-workflow` command (`.claude/commands/pm-bootstrap-workflow.md`) defines the expected output format for:
- `{PREFIX}.stories.index.md`
- `{PREFIX}.plan.meta.md`
- `{PREFIX}.plan.exec.md`

The subgraph MUST produce content matching these templates. Template extraction should reference this command file.

### 4. Existing Plan Files as Reference

The codebase contains existing generated plans that serve as reference implementation:
- `plans/stories/wrkf.stories.index.md`
- `plans/wrkf.plan.meta.md`
- `plans/wrkf.plan.exec.md`

These provide concrete examples of expected output format.

### 5. Timestamp Formatting

All generated files require timestamps in `YYYYMMDD-HHMM` format (America/Denver timezone):

```typescript
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

function formatTimestamp(date: Date = new Date()): string {
  const denverTime = toZonedTime(date, 'America/Denver')
  return format(denverTime, 'yyyyMMdd-HHmm')
}
```

**New dependency:** `date-fns` and `date-fns-tz` should be added to package.json.

---

## AC Gaps / Recommendations

### Current Story Scope (from stories.index.md)

The wrkf-1030 entry in `wrkf.stories.index.md` specifies:

**Nodes:**
- Plan analyzer node
- Story splitter node
- Index generator node
- Meta/exec plan generator node

**Goal:** Convert raw plans into structured story artifacts

### Missing Acceptance Criteria

The story document has NOT been generated yet (no `wrkf-1030.md` file exists). The following ACs should be defined:

| # | Recommended AC |
|---|----------------|
| AC-1 | `bootstrap_graph` subgraph is defined using LangGraphJS `StateGraph` with proper typing |
| AC-2 | Subgraph accepts required inputs: `rawPlan`, `projectName`, `storyPrefix`, `outputDirectory` |
| AC-3 | Plan analyzer node extracts: overall goal, major phases, individual stories, dependencies, risks |
| AC-4 | Story splitter node produces properly numbered story entries (PREFIX-001, PREFIX-002, etc.) |
| AC-5 | Index generator node produces `{PREFIX}.stories.index.md` matching template format |
| AC-6 | Meta generator node produces `{PREFIX}.plan.meta.md` matching template format |
| AC-7 | Exec generator node produces `{PREFIX}.plan.exec.md` matching template format |
| AC-8 | File writer node validates output paths are within project directory |
| AC-9 | All nodes log entry/exit via `@repo/logger` |
| AC-10 | Subgraph integrates with `createNode()` from wrkf-1020 node runner |
| AC-11 | Unit tests cover each node with 80%+ coverage for `src/graphs/bootstrap/` |
| AC-12 | Integration test verifies full subgraph execution produces valid artifacts |

### Unclear Requirements

| Question | Recommendation |
|----------|----------------|
| What format is the "raw plan" input? | Accept markdown string; document expected structure in AC |
| How is plan parsing validated? | Add schema validation for parsed structure |
| Should stories be numbered starting at 1000 or 001? | Follow existing pattern: start at 1000, increment by 10 (wrkf-1000, wrkf-1010, etc.) |
| Does the subgraph handle LLM calls for plan analysis? | Clarify: is plan analysis pure parsing or does it use Claude? |

### Critical Clarification Needed

**Is plan analysis LLM-assisted or pure parsing?**

The `/pm-bootstrap-workflow` command appears to expect human-driven analysis ("Analyze the raw plan and extract..."). The subgraph could:

**Option A: Pure Parsing** - Extract structure via regex/heuristics
- Pro: Deterministic, testable, no API costs
- Con: Limited understanding of plan intent

**Option B: LLM-Assisted** - Use Claude to analyze and structure
- Pro: Better understanding of complex plans
- Con: Requires adapter integration (wrkf-1110 scope), non-deterministic

**Recommendation:** Start with Option A (pure parsing) for wrkf-1030. LLM enhancement can be added in a follow-up story.

---

## Mitigations

### For PM to Add to Story AC

1. **Add explicit node input/output contracts**
   ```markdown
   ### Plan Analyzer Node Contract
   **Input:** `{ rawPlan: string }`
   **Output:** `{ parsedGoal: string, parsedPhases: Phase[], parsedStories: ParsedStory[] }`
   ```

2. **Add file write validation AC**
   ```markdown
   - [ ] AC-X: File writer validates all output paths are within `outputDirectory` before writing
   ```

3. **Add template compliance AC**
   ```markdown
   - [ ] AC-X: Generated index/meta/exec files match structure defined in `/pm-bootstrap-workflow` command
   ```

4. **Add error handling AC**
   ```markdown
   - [ ] AC-X: If plan parsing fails, subgraph returns error in state without writing partial files
   ```

### Testing Considerations

1. **Unit Test Each Node Independently**
   - Mock state input
   - Verify state output matches expected schema
   - No file system interaction in unit tests

2. **Integration Test with Temp Directory**
   ```typescript
   import { mkdtemp, rm } from 'node:fs/promises'
   import { tmpdir } from 'node:os'

   let tempDir: string
   beforeEach(async () => {
     tempDir = await mkdtemp(join(tmpdir(), 'bootstrap-test-'))
   })
   afterEach(async () => {
     await rm(tempDir, { recursive: true })
   })
   ```

3. **Snapshot Tests for Generated Content**
   - Store expected output as snapshots
   - Detect unintended template changes

### Dependency Sequencing

| Phase | Action |
|-------|--------|
| 1 | Wait for wrkf-1020 to reach `in-progress` with `createNode()` stubbed |
| 2 | Implement bootstrap subgraph using stub |
| 3 | Once wrkf-1020 completes, verify integration |
| 4 | Run full E2E test |

---

## Risk Rating

**MEDIUM**

### Risk Factors

| Factor | Risk Level | Notes |
|--------|------------|-------|
| Dependency on wrkf-1020 | Medium | Can work around with stubs |
| LangGraphJS subgraph patterns | Low | Well-documented, straightforward |
| File I/O side effects | Low | Standard Node.js APIs |
| Template compliance | Low | Existing examples to reference |
| Plan parsing accuracy | Medium | May need iteration for edge cases |

### Complexity Assessment

- **Estimated LOC:** ~800-1200 (nodes + tests)
- **Estimated Time:** 12-16 hours
- **Technical Risk:** Low - standard patterns, no novel techniques

---

## Verdict

**PROCEED** with the following conditions:

1. **Sequence after wrkf-1020 starts** - Begin wrkf-1030 implementation once wrkf-1020 reaches `in-progress` status with at least the `createNode()` factory stubbed

2. **Generate story document first** - Run `/pm-generate-story wrkf-1030` to create the full story document with detailed ACs before implementation

3. **Clarify plan analysis approach** - Confirm whether plan analyzer uses pure parsing (recommended for v1) or LLM assistance (defer to follow-up)

4. **Add recommended ACs** - Include the acceptance criteria listed in "AC Gaps / Recommendations" section

**The story is technically feasible** and aligns with codebase patterns. The wrkf-1020 dependency is a soft blocker that can be worked around with interface stubs.

---

*Generated by pm-dev-feasibility-review agent | 2026-01-24*

## Sources

- [LangGraph Subgraphs Documentation](https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs)
- [StateGraph API Reference](https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html)
- [LangGraph Subgraph State Management](https://langchain-ai.github.io/langgraphjs/how-tos/subgraphs-manage-state/)
