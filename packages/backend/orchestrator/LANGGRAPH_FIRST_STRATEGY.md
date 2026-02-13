# LangGraph-First Development Strategy

**Decision Date:** 2026-02-12
**Status:** ✅ ACTIVE STRATEGY

## Strategic Decision

**Freeze Claude Code workflow development** and focus exclusively on LangGraph for all future orchestration work.

### Rationale

1. **Single Source of Truth** - One orchestration system instead of two parallel ones
2. **TypeScript-Native** - Better integration with monorepo, type safety, testability
3. **Cost Optimization** - 56% savings via Ollama hybrid from day one
4. **Programmatic Control** - Full control over workflow logic, no CLI tool limitations
5. **Better DevEx** - IDE support, debugging, testing, CI/CD integration
6. **Future-Proof** - LangGraph ecosystem is actively developed, well-documented

## What You're Gaining

### ✅ Advantages of LangGraph Over Claude Code

| Feature | Claude Code | LangGraph | Winner |
|---------|------------|-----------|--------|
| **Cost** | 100% Claude API | 56% Ollama, 44% Claude | 🏆 LangGraph |
| **Type Safety** | YAML + Markdown | TypeScript + Zod | 🏆 LangGraph |
| **Testing** | Manual testing | Unit + integration tests | 🏆 LangGraph |
| **Debugging** | Log parsing | Native debugger | 🏆 LangGraph |
| **CI/CD** | External CLI calls | Native npm scripts | 🏆 LangGraph |
| **Flexibility** | Fixed agent patterns | Custom node logic | 🏆 LangGraph |
| **State Management** | Implicit (files) | Explicit (GraphState) | 🏆 LangGraph |
| **Iteration Speed** | Edit YAML → test | Edit TS → compile → test | 🏆 LangGraph |
| **Observability** | Limited logs | Full state snapshots | 🏆 LangGraph |
| **DB Integration** | Manual | Built-in repositories | 🏆 LangGraph |

## What You're Losing (and How to Replace)

### Claude Code Features → LangGraph Equivalents

| Claude Code Feature | LangGraph Replacement |
|---------------------|----------------------|
| `/elab-story` command | `runElaboration()` function |
| `/pm-story` command | `runStoryCreation()` function |
| File I/O (Read/Write/Edit) | `fs` + `YamlArtifactBridge` |
| AskUserQuestion prompts | Custom input callbacks |
| Agent orchestration | StateGraph with nodes |
| Checkpoint resume | State snapshots + persistence |
| Model assignments YAML | Already supported! |
| KB operations | MCP integration (future) or direct DB |

### Features to Build for Parity

**Must-Have (Core Workflows):**
1. ✅ Story creation graph - **EXISTS** (`createStoryCreationGraph`)
2. ✅ Elaboration graph - **EXISTS** (`createElaborationGraph`)
3. ❌ Bootstrap workflow graph - **NEED TO BUILD**
4. ❌ Code review graph - **NEED TO BUILD**
5. ❌ Implementation graph - **NEED TO BUILD**
6. ❌ QA verification graph - **NEED TO BUILD**

**Nice-to-Have (Utilities):**
7. ❌ Story file I/O adapter - **NEED TO BUILD**
8. ❌ Index management utilities - **NEED TO BUILD**
9. ❌ CLI wrapper (optional) - **FUTURE**

---

## Development Roadmap

### Phase 1: Foundation (Week 1) ✅ DONE
- [x] Ollama installed and running
- [x] Models downloaded
- [x] Model assignments configured
- [x] Test existing workflows
- [x] Verify cost optimization

**Status:** ✅ Complete - You're here!

---

### Phase 2: Core Workflows (Weeks 2-4)

Build the essential workflows needed for daily development.

#### Week 2: Story Creation & Bootstrap

**Goal:** Replace `/pm-story` and `/pm-bootstrap-workflow`

**Tasks:**
- [ ] Build `createBootstrapGraph()` for PLAN.md parsing
  - Nodes: setup, analysis, generation
  - Input: PLAN.md file path
  - Output: Story files in backlog/
- [ ] Extend `createStoryCreationGraph()` with file I/O
  - Add node: write story file to disk
  - Add node: update stories.index.md
  - Add node: create directory structure
- [ ] Create `StoryFileAdapter` class
  - `readStory(storyId, featureDir)` → YAML object
  - `writeStory(storyId, content, stage)` → file
  - `moveStory(storyId, fromStage, toStage)` → rename
  - `updateIndex(storyId, updates)` → modify index

**Test:**
```typescript
// Create story from description
const result = await runStoryCreation({
  domain: 'feat/test',
  description: 'Test story',
  stakeholder: 'Engineering',
  priority: 'low'
})

// Writes to: plans/future/test/backlog/TEST-0001.md
// Updates: plans/future/test/stories.index.md
```

**Success Criteria:**
- ✅ Can create stories from descriptions
- ✅ Files written to correct locations
- ✅ Index updated automatically
- ✅ Quality matches `/pm-story` output
- ✅ Cost ≤ $0.30 per story

---

#### Week 3: Elaboration

**Goal:** Replace `/elab-story`

**Tasks:**
- [ ] Extend `createElaborationGraph()` with autonomous mode
  - Add `autonomousDecisionNode` (replaces interactive prompts)
  - Reads ANALYSIS.md
  - Auto-adds MVP-critical gaps as ACs
  - Writes non-blocking findings to KB (future: direct DB)
- [ ] Add verdict routing (PASS → ready-to-work/, FAIL → backlog/)
- [ ] Create test suite with real story files

**Test:**
```typescript
// Elaborate existing story
const result = await runElaboration({
  storyId: 'INST-1008',
  currentVersion: fs.readFileSync('INST-1008.md', 'utf-8'),
  config: { autonomous: true }
})

// Moves to: plans/future/instructions/ready-to-work/INST-1008/
// Writes: _implementation/ANALYSIS.md, DECISIONS.yaml
```

**Success Criteria:**
- ✅ Autonomous decisions work correctly
- ✅ MVP gaps added as ACs automatically
- ✅ Story moved to correct stage
- ✅ Quality matches `/elab-story` output
- ✅ Cost ≤ $0.25 per elaboration

---

#### Week 4: Code Review

**Goal:** Replace `/dev-code-review`

**Tasks:**
- [ ] Build `createCodeReviewGraph()`
  - Parallel worker fanout (6 workers)
  - Workers: lint, syntax, style, security, typecheck, build
  - 5/6 workers use Ollama (qwen2.5-coder:7b)
  - 1/6 worker uses Claude (security analysis)
- [ ] Add selective re-review logic
  - Carry forward PASS results from previous run
  - Re-run only FAIL + typecheck + build
- [ ] Add aggregation node for ranked patches
- [ ] Create file reader adapter (uses `fs` or calls Claude Code)

**Test:**
```typescript
// Review changed files
const result = await runCodeReview({
  storyId: 'INST-1008',
  changedFiles: ['src/api.ts', 'src/hooks.ts'],
  previousReview: 'REVIEW.yaml' // optional
})

// Writes: _implementation/REVIEW.yaml with ranked patches
```

**Success Criteria:**
- ✅ All 6 workers run in parallel
- ✅ Selective re-review works (skips PASS)
- ✅ Security analysis uses Claude Sonnet
- ✅ Quality matches `/dev-code-review`
- ✅ Cost ≤ $0.20 per review (75% savings)

---

### Phase 3: Implementation & Verification (Weeks 5-7)

#### Week 5-6: Implementation Workflow

**Goal:** Replace `/dev-implement-story`

**Tasks:**
- [ ] Build `createImplementationGraph()`
  - 8 phases: setup → plan → execute → proof → review → fix (loop)
  - E2E gate node (MANDATORY check)
  - Fix loop with max iterations (default: 3)
- [ ] Integration strategy decision:
  - **Option A:** LangGraph orchestrates, delegate to external editor for code changes
  - **Option B:** Use LLM to generate code, write with `fs` (risky)
  - **Option C:** Hybrid - LangGraph plans, external tool executes
- [ ] Build evidence writer (EVIDENCE.yaml, CHECKPOINT.yaml)

**Recommended: Option C (Hybrid)**
- LangGraph orchestrates phases and gates
- External code editor (VSCode extension, copilot, etc.) does actual edits
- LangGraph validates evidence and checkpoints

**Test:**
```typescript
const result = await runImplementation({
  storyId: 'INST-1008',
  planFile: '_implementation/PLAN.yaml',
  maxIterations: 3
})

// Orchestrates phases, tracks evidence, enforces E2E gate
```

---

#### Week 7: QA Verification

**Goal:** Replace `/qa-verify-story`

**Tasks:**
- [ ] Build `createQAVerificationGraph()`
  - Nodes: setup, verification, completion
  - Cross-domain checks (frontend + backend + DB)
  - Pattern matching against known issues
- [ ] Add verdict routing
  - PASS → UAT/
  - FAIL → in-progress/ (back to dev)

**Test:**
```typescript
const result = await runQAVerification({
  storyId: 'INST-1008',
  evidenceFile: '_implementation/EVIDENCE.yaml'
})

// Writes: _implementation/VERIFICATION.yaml
// Moves story based on verdict
```

---

### Phase 4: Integration Layer (Weeks 8-9)

Build the glue code to make LangGraph workflows feel natural.

#### Week 8: CLI Wrapper (Optional)

Make LangGraph workflows callable from command line:

```bash
# Instead of Claude Code commands, use npm scripts
pnpm story:create "feat/test" "Add user authentication"
pnpm story:elaborate "INST-1008"
pnpm story:review "INST-1008"
pnpm story:implement "INST-1008"
pnpm story:verify "INST-1008"
```

**Implementation:**
```typescript
// packages/backend/orchestrator/bin/story-create.ts
#!/usr/bin/env node
import { runStoryCreation } from '../dist/index.js'

const [domain, description] = process.argv.slice(2)

runStoryCreation({ domain, description, /* ... */ })
  .then(result => {
    console.log('Story created:', result.storyId)
    process.exit(0)
  })
  .catch(err => {
    console.error('Failed:', err)
    process.exit(1)
  })
```

Add to `package.json`:
```json
{
  "bin": {
    "story-create": "./bin/story-create.js",
    "story-elaborate": "./bin/story-elaborate.js",
    "story-review": "./bin/story-review.js"
  }
}
```

---

#### Week 9: VSCode Extension (Future)

For ultimate DevEx, create a VSCode extension:

```
Command Palette:
  > LangGraph: Create Story
  > LangGraph: Elaborate Story
  > LangGraph: Review Code
  > LangGraph: Show Story Status
```

**Implementation:**
- Use VSCode Extension API
- Call LangGraph workflows from extension
- Show progress in status bar
- Display results in panel

---

### Phase 5: Advanced Features (Weeks 10-12)

#### Week 10: Database Integration

Add PostgreSQL persistence for workflow state.

**Tasks:**
- [ ] Set up Postgres (or use existing)
- [ ] Run migrations for story + workflow tables
- [ ] Enable `persistToDb: true` in workflow configs
- [ ] Test resume from DB state

**Usage:**
```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const storyRepo = createStoryRepository(pool)
const workflowRepo = createWorkflowRepository(pool)

const result = await runStoryCreation(request, null, {
  persistToDb: true,
  storyRepo,
  workflowRepo
})

// Story state saved to DB, can resume if interrupted
```

---

#### Week 11: Meta-Orchestration

Build a meta-orchestrator that runs full lifecycle.

**Tasks:**
- [ ] Build `createMetaOrchestrationGraph()`
  - Calls other graphs in sequence
  - Handles gate approvals
  - Auto-progress when gates pass
- [ ] Add batch decision mode
  - Collect decisions, defer or auto-approve

**Usage:**
```typescript
// Run full lifecycle: create → elaborate → implement → review → verify
const result = await runFullLifecycle({
  domain: 'feat/test',
  description: 'Add feature',
  config: {
    autoApprove: ['elaboration', 'code-review'], // Skip manual gates
    maxIterations: 3
  }
})
```

---

#### Week 12: Learning & Optimization

Build feedback loops for continuous improvement.

**Tasks:**
- [ ] Build `createCalibrationGraph()` for confidence analysis
- [ ] Build `createPatternMiningGraph()` for outcome analysis
- [ ] Build `createWorkflowRetroGraph()` for story retrospectives
- [ ] Store learnings in KB or DB
- [ ] Use learnings to improve future stories

---

## Migration from Claude Code Commands

### Immediate Actions (This Week)

**1. Freeze Claude Code Development**
- ✅ No new commands
- ✅ No new agents
- ✅ No workflow enhancements
- ✅ Bug fixes only (if critical)

**2. Document Current State**
```bash
# Create snapshot of Claude Code workflows
cp -r .claude/commands .claude/commands.frozen
cp -r .claude/agents .claude/agents.frozen

# Add README
cat > .claude/commands.frozen/README.md << 'EOF'
# Frozen Claude Code Workflows

These workflows are frozen as of 2026-02-12.

**Status:** Maintenance mode (bug fixes only)
**Replacement:** LangGraph workflows in packages/backend/orchestrator

See: LANGGRAPH_FIRST_STRATEGY.md
EOF
```

**3. Set Expectations**
- Existing Claude Code commands still work (maintenance mode)
- New features only in LangGraph
- Gradual migration over 12 weeks
- Delete Claude Code commands after validation

---

### Transition Plan

**Weeks 1-4: Dual Mode**
- Old: Use Claude Code for production work
- New: Build and test LangGraph workflows
- Test LangGraph against Claude Code for quality

**Weeks 5-8: LangGraph Primary**
- Default: Use LangGraph workflows
- Fallback: Claude Code if LangGraph has issues
- Focus on LangGraph bug fixes

**Weeks 9-12: LangGraph Only**
- Retire Claude Code commands
- Archive `.claude/commands/` directory
- Update all documentation
- Train team on LangGraph workflows

---

## Technical Architecture

### LangGraph Workflow Pattern

Every workflow follows this structure:

```typescript
// 1. Define state schema
const MyWorkflowStateAnnotation = Annotation.Root({
  ...GraphStateSchema.spec,
  customField: Annotation<string>(),
})

// 2. Create nodes
const setupNode = createSimpleNode('setup', async (state) => {
  // Setup logic
  return { routingFlags: [...state.routingFlags, 'setup-complete'] }
})

const analysisNode = createLLMPoweredNode(
  { name: 'my-analyst' }, // Uses model from model-assignments.yaml
  async (state, config) => {
    const llm = config.configurable?.llm
    if (llm?.provider === 'ollama') {
      // Use Ollama (free)
    } else {
      // Use Claude API (paid)
    }
    return { /* state updates */ }
  }
)

// 3. Build graph
const workflow = new StateGraph(MyWorkflowStateAnnotation)
workflow.addNode('setup', setupNode)
workflow.addNode('analysis', analysisNode)
workflow.addEdge(START, 'setup')
workflow.addEdge('setup', 'analysis')
workflow.addEdge('analysis', END)

// 4. Compile & export
export const myWorkflowGraph = workflow.compile()

// 5. Create runner function
export async function runMyWorkflow(input, config) {
  const initialState = createInitialState({
    storyId: input.storyId,
    customField: input.customField,
  })

  const result = await myWorkflowGraph.invoke(initialState, config)

  return {
    success: !result.errors || result.errors.length === 0,
    data: result.customField,
  }
}
```

---

### File Organization

```
packages/backend/orchestrator/
├── src/
│   ├── graphs/               # Workflow definitions
│   │   ├── story-creation.ts
│   │   ├── elaboration.ts
│   │   ├── bootstrap.ts      # NEW
│   │   ├── code-review.ts    # NEW
│   │   ├── implementation.ts # NEW
│   │   ├── qa-verification.ts # NEW
│   │   └── index.ts
│   ├── nodes/                # Reusable node implementations
│   │   ├── story/            # Story-related nodes
│   │   ├── review/           # Code review nodes
│   │   ├── llm/              # LLM-powered nodes
│   │   └── index.ts
│   ├── adapters/             # NEW - Integration layer
│   │   ├── story-file-adapter.ts    # Story YAML I/O
│   │   ├── index-manager.ts         # stories.index.md updates
│   │   ├── checkpoint-manager.ts    # CHECKPOINT.md handling
│   │   └── index.ts
│   ├── config/               # Configuration
│   │   ├── model-assignments.ts
│   │   ├── llm-provider.ts
│   │   └── index.ts
│   └── index.ts              # Package exports
├── bin/                      # NEW - CLI wrappers
│   ├── story-create.ts
│   ├── story-elaborate.ts
│   └── story-review.ts
└── package.json
```

---

## Key Decisions

### 1. File I/O Strategy: **Adapters**

Use adapter pattern to abstract file operations:

```typescript
// Clean interface
const adapter = new StoryFileAdapter(rootDir)
const story = await adapter.readStory('INST-1008', 'plans/future/instructions')
await adapter.writeStory('INST-1008', updatedContent, 'ready-to-work')
```

Benefits:
- ✅ Testable (can mock adapters)
- ✅ Flexible (can swap implementations)
- ✅ Clean separation of concerns

---

### 2. LLM Integration: **Hybrid (Ollama + Anthropic API)**

Use Ollama for routine tasks, Anthropic API for reasoning:

```typescript
const llm = await getLLMForAgent('code-review-lint')

if (llm.provider === 'ollama') {
  // Fast, free, local
  const response = await llm.llm.invoke([...])
} else {
  // Powerful reasoning, paid
  const response = await llm.llm.invoke([...])
}
```

Benefits:
- ✅ 56% cost reduction
- ✅ Quality preserved for critical tasks
- ✅ Can tune over time

---

### 3. User Interaction: **Callbacks**

Replace `AskUserQuestion` with callback functions:

```typescript
type DecisionCallback = (question: string, options: string[]) => Promise<string>

const result = await runElaboration(input, {
  onDecisionNeeded: async (question, options) => {
    // Could be CLI prompt, web UI, or auto-decision
    return options[0] // Auto-accept first option
  }
})
```

Benefits:
- ✅ Flexible UI (CLI, web, auto)
- ✅ Testable (inject mock callback)
- ✅ Async-friendly

---

### 4. Testing Strategy: **Unit + Integration**

```typescript
// Unit test (fast)
describe('setupNode', () => {
  it('validates story exists', async () => {
    const state = createInitialState({ storyId: 'TEST-001' })
    const result = await setupNode(state, {})
    expect(result.routingFlags).toContain('validated')
  })
})

// Integration test (slower, uses real LLMs)
describe('runStoryCreation', () => {
  it('creates story from description', async () => {
    const result = await runStoryCreation({
      domain: 'test/example',
      description: 'Test',
      stakeholder: 'Eng',
      priority: 'low'
    })
    expect(result.success).toBe(true)
  })
})
```

---

## Success Metrics

Track these weekly:

| Metric | Week 4 Target | Week 8 Target | Week 12 Target |
|--------|---------------|---------------|----------------|
| Workflows migrated | 2/7 (29%) | 5/7 (71%) | 7/7 (100%) |
| Cost per story | $2.00 | $1.20 | $0.90 |
| Ollama usage % | 40% | 55% | 65% |
| Test coverage | 60% | 75% | 85% |
| Story quality score | Baseline | ≥ Baseline | > Baseline |

---

## Immediate Next Steps (Today)

1. **✅ Set ANTHROPIC_API_KEY**
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-api03-..."
   ```

2. **✅ Test existing workflows**
   ```bash
   cd packages/backend/orchestrator
   node test-story-creation.ts
   ```

3. **✅ Verify cost savings**
   - Check Anthropic console after test
   - Should be ~$0.20-0.30 vs $0.75

4. **📝 Create first adapter (tomorrow)**
   ```bash
   mkdir -p src/adapters
   touch src/adapters/story-file-adapter.ts
   ```

5. **📝 Plan Week 2 work**
   - Bootstrap graph implementation
   - Story file I/O adapter
   - Index manager

---

## Resources

- **LangGraph Docs:** https://langchain-ai.github.io/langgraphjs/
- **Anthropic API:** https://docs.anthropic.com/
- **Ollama:** https://ollama.ai/
- **Migration Strategy:** `MIGRATION_STRATEGY.md`
- **Quick Start:** `QUICK_START.md`
- **Model Strategy:** `MODEL_STRATEGY.md`

---

## Questions to Answer

Before starting Week 2 work, decide:

1. **File I/O:** Use `fs` directly or create full adapter abstraction?
2. **CLI:** Build CLI wrapper or use programmatic API only?
3. **Database:** Start with DB integration now or defer to Week 10?
4. **Testing:** Write tests alongside code or batch at end?
5. **Documentation:** Update docs per workflow or batch at end?

---

**Status:** Ready to begin Week 2 (Bootstrap + Story Creation)

**Next Review:** End of Week 4 (assess progress, adjust timeline)
