# LangGraph Migration Strategy - Cost Optimization & Workflow Analysis

## Executive Summary

**Current State:**
- 32 Claude Code commands orchestrating 50+ agents
- Heavy reliance on Claude Sonnet ($3/1M input, $15/1M output)
- ~120 workflow phases across all commands
- Extensive file I/O, code exploration, and KB operations

**Migration Opportunity:**
- **High-value targets:** 7 core workflow commands (45% of all operations)
- **Cost savings potential:** 50-70% via Ollama hybrid approach
- **Hybrid strategy:** LangGraph for orchestration, Claude Code for I/O
- **Feature parity:** Requires 8 new LangGraph workflows

**Recommendation:** Phased migration starting with story creation and elaboration workflows.

---

## Migration Classification

### ✅ TIER 1: Migrate to LangGraph (High Value, Clear ROI)

These are **orchestration-heavy workflows** with minimal file I/O that can benefit from Ollama:

#### 1. **Story Creation Workflows** (3 commands)

**Commands:**
- `/pm-story` - Unified PM Story Management
- `/pm-bootstrap-workflow` - Feature Directory Setup
- `/pm-generate-story-000-harness` - Workflow Harness Story

**Migration Benefits:**
- ✅ Already have `createStoryCreationGraph` in LangGraph (partial match)
- ✅ Clear state machine: seed → gap analysis → synthesis
- ✅ Can use Ollama for setup/validation (haiku equivalent)
- ✅ High token usage (~50K tokens per story at current)
- ✅ Cost savings: ~60% with hybrid approach

**What Needs Building:**
- [ ] Bootstrap workflow graph (PLAN.md → story extraction)
- [ ] Harness story generation graph
- [ ] File I/O integration layer (read PLAN.md, write story files)

**What Stays in Claude Code:**
- File writing (story YAML files)
- Directory structure creation
- Index updates (via utility skills)

**Cost Estimate:**
- Current: ~$0.75 per story (all Sonnet)
- With LangGraph: ~$0.25 per story (Ollama setup/hygiene, Sonnet gap analysis)
- **Savings: 67% per story**

---

#### 2. **Elaboration Workflows** (2 commands)

**Commands:**
- `/elab-story` - Story Elaboration (QA Gate)
- `/elab-epic` - Multi-Stakeholder Epic Review

**Migration Benefits:**
- ✅ Already have `createElaborationGraph` in LangGraph (close match)
- ✅ Delta detection logic already implemented
- ✅ Decision logic can be programmatic
- ✅ High token usage (~30K tokens per elaboration)
- ✅ Cost savings: ~50% with hybrid

**What Needs Building:**
- [ ] Autonomous decision node (replace interactive prompts)
- [ ] Epic review graph (multi-stakeholder parallel reviews)
- [ ] File I/O layer for ANALYSIS.md, DECISIONS.yaml

**What Stays in Claude Code:**
- User interaction (AskUserQuestion for interactive mode)
- File moves (elaboration/ → ready-to-work/)
- Story file updates

**Cost Estimate:**
- Current: ~$0.45 per elaboration (Sonnet analysis)
- With LangGraph: ~$0.20 per elaboration (Ollama setup/completion)
- **Savings: 56% per elaboration**

---

#### 3. **Code Review & Verification** (2 commands)

**Commands:**
- `/dev-code-review` - Selective Code Review
- `/qa-verify-story` - Post-Implementation Verification

**Migration Benefits:**
- ✅ Worker pattern maps perfectly to LangGraph parallel nodes
- ✅ Most workers can use Ollama (lint, syntax, style, typecheck, build)
- ✅ Only security requires Sonnet
- ✅ Selective re-review logic fits conditional edges
- ✅ Very high token usage (~80K tokens per review cycle)

**What Needs Building:**
- [ ] Code review graph with parallel worker fanout
- [ ] Selective worker execution (carry forward PASS results)
- [ ] Aggregation node for ranked patches
- [ ] QA verification graph with cross-domain checks

**What Stays in Claude Code:**
- Code file reading (Read tool)
- REVIEW.yaml writing
- Evidence updates

**Cost Estimate:**
- Current: ~$0.60 per review (mostly Haiku, Sonnet for security)
- With LangGraph: ~$0.15 per review (Ollama for 5/6 workers)
- **Savings: 75% per review**

---

### 🟨 TIER 2: Partial Migration (Orchestration Only)

These commands have **clear orchestration logic** but **heavy file I/O**. Migrate orchestration to LangGraph, keep I/O in Claude Code.

#### 4. **Implementation Workflows** (2 commands)

**Commands:**
- `/dev-implement-story` - Full Development Orchestration
- `/dev-fix-story` - Fix Implementation Issues

**Hybrid Approach:**
- LangGraph orchestrates phases and gates
- Claude Code agents do actual file editing

**Migration Benefits:**
- ✅ Clear phase transitions (setup → plan → execute → proof → review → fix)
- ✅ Gate logic can be programmatic
- ✅ Retry/iteration logic maps to LangGraph loops
- ✅ Can use Ollama for planning validation, proof checking

**What Needs Building:**
- [ ] Implementation graph with 8 phases
- [ ] E2E gate node (MANDATORY check)
- [ ] Fix loop graph with max iterations
- [ ] Integration with Claude Code for file edits

**What Stays in Claude Code:**
- **ALL file editing** (Edit, Write tools)
- Code exploration (Glob, Grep)
- E2E test execution
- Evidence writing

**Cost Estimate:**
- Current: ~$1.20 per implementation (heavy Sonnet usage)
- With LangGraph: ~$0.60 per implementation (Ollama for setup/proof/verification)
- **Savings: 50% per implementation**

---

#### 5. **Meta-Orchestration** (2 commands)

**Commands:**
- `/scrum-master` - Full Lifecycle Meta-Orchestrator
- `/workflow-batch` - Batch Decision Mode

**Hybrid Approach:**
- LangGraph manages workflow state machine
- Claude Code handles individual phases

**Migration Benefits:**
- ✅ State machine logic (which phase to run next)
- ✅ Gate approvals (--approve flags)
- ✅ Batch decision aggregation
- ✅ Can optimize phase sequencing

**What Needs Building:**
- [ ] Meta-orchestration graph (calls other graphs)
- [ ] Batch decision collector node
- [ ] Auto-accept tier logic (Tier 1/3 auto, Tier 4 escalate)
- [ ] Dry-run support

**What Stays in Claude Code:**
- Individual workflow execution
- Decision escalation to user

**Cost Estimate:**
- Current: ~$2.50 per full lifecycle (runs all sub-workflows)
- With LangGraph: ~$1.20 per full lifecycle (orchestration overhead reduced)
- **Savings: 52% per lifecycle**

---

### 🟥 TIER 3: Keep in Claude Code (Heavy I/O, Exploration)

These commands **cannot be migrated** without significant feature loss:

#### 6. **PM & Planning Commands** (3 commands)
- `/pm-refine-story` - Heavy KB reading, FEATURES.md editing
- `/pm-fix-story` - Interactive story editing
- `/ui-ux-review` - Component file analysis, report writing

**Why Stay:**
- Heavy file exploration (Glob, Grep)
- Complex YAML/Markdown editing
- User interaction required
- Cost already optimized (mostly Haiku)

---

#### 7. **Learning & Improvement Commands** (5 commands)
- `/calibration-report` - KB aggregation, statistical analysis
- `/pattern-mine` - Cross-story pattern detection
- `/improvement-proposals` - Multi-source data mining
- `/feedback` - KB entry creation
- `/kb-compress` - Similarity computation, KB operations

**Why Stay:**
- Require KB access (MCP integration needed)
- Complex data aggregation
- File system operations
- Already cost-optimized (mostly Haiku)

---

#### 8. **Architecture & Documentation** (2 commands)
- `/architect-review` - Heavy code exploration, pattern matching
- `/doc-sync` - Git diff parsing, file synchronization

**Why Stay:**
- Extensive code exploration
- File reading/writing across many files
- Pattern matching in codebases

---

#### 9. **Utility Skills** (8 commands)
- All checkpoint, index, story-move, story-update, etc.

**Why Stay:**
- Simple, single-purpose utilities
- Already fast (no LLM calls)
- File I/O is the primary operation
- No cost to optimize

---

#### 10. **Data & Reporting** (2 commands)
- `/experiment-report` - KB analysis
- `/migrate-agents-v3` - File system operations

**Why Stay:**
- Special-purpose tools
- Low usage frequency

---

## Cost Analysis

### Current Monthly Costs (Estimated)

Assumptions:
- 100 stories/month through full lifecycle
- Average story: 1 creation + 1 elab + 1 impl + 2 reviews + 1 verify

| Workflow | Stories/Month | Cost per Story | Monthly Cost |
|----------|---------------|----------------|--------------|
| Story Creation | 100 | $0.75 | $75 |
| Elaboration | 100 | $0.45 | $45 |
| Implementation | 100 | $1.20 | $120 |
| Code Review | 200 | $0.60 | $120 |
| QA Verify | 100 | $0.30 | $30 |
| PM/Planning | 50 | $0.40 | $20 |
| Learning/Meta | - | $0.50 | $15 |
| **TOTAL** | - | - | **$425/month** |

### Post-Migration Costs (With LangGraph Hybrid)

| Workflow | Stories/Month | Cost per Story | Monthly Cost | Savings |
|----------|---------------|----------------|--------------|---------|
| Story Creation | 100 | $0.25 | $25 | **$50 (67%)** |
| Elaboration | 100 | $0.20 | $20 | **$25 (56%)** |
| Implementation | 100 | $0.60 | $60 | **$60 (50%)** |
| Code Review | 200 | $0.15 | $30 | **$90 (75%)** |
| QA Verify | 100 | $0.15 | $15 | **$15 (50%)** |
| PM/Planning | 50 | $0.40 | $20 | $0 (0%) |
| Learning/Meta | - | $0.50 | $15 | $0 (0%) |
| **TOTAL** | - | - | **$185/month** | **$240 (56%)** |

**Annual Savings: $2,880**

---

## Migration Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Set up LangGraph infrastructure for orchestration

- [ ] Install Ollama and pull models:
  ```bash
  ollama pull deepseek-coder-v2:33b
  ollama pull qwen2.5-coder:7b
  ollama pull codellama:13b
  ```
- [ ] Configure `.env` for Ollama + Anthropic API
- [ ] Test existing LangGraph workflows (story-creation, elaboration, metrics)
- [ ] Build file I/O bridge (read/write story files from LangGraph)
- [ ] Test hybrid execution (LangGraph orchestration + Claude Code I/O)

**Success Criteria:**
- ✅ Ollama running and responding
- ✅ Can invoke existing LangGraph workflows
- ✅ File bridge working for read/write operations

---

### Phase 2: Story Creation Migration (Weeks 3-4)
**Goal:** Migrate `/pm-story` and `/elab-story` to LangGraph

**Tasks:**
- [ ] Extend `createStoryCreationGraph` with:
  - [ ] Bootstrap node (PLAN.md parsing)
  - [ ] Harness generation node
  - [ ] File I/O integration
- [ ] Create elaboration autonomous decision node
- [ ] Build story file writer adapter
- [ ] Migrate model assignments to Ollama where possible
- [ ] Create wrapper command: `/pm-story-v2` (LangGraph version)
- [ ] A/B test against current `/pm-story` (10 stories)

**Success Criteria:**
- ✅ Stories generated match quality of current workflow
- ✅ Cost per story ≤ $0.30
- ✅ Execution time ≤ current (or acceptable increase)

**Rollback Plan:** Keep `/pm-story` as default, use `/pm-story-v2` opt-in

---

### Phase 3: Code Review Migration (Weeks 5-6)
**Goal:** Migrate `/dev-code-review` to LangGraph

**Tasks:**
- [ ] Create code review graph with parallel workers
- [ ] Implement selective worker execution (carry forward)
- [ ] Build aggregation node for ranked patches
- [ ] Integrate with Claude Code for file reading
- [ ] Migrate 5/6 workers to Ollama (keep security on Sonnet)
- [ ] Create wrapper: `/dev-code-review-v2`
- [ ] Test on 20 stories

**Success Criteria:**
- ✅ Review quality matches current
- ✅ Cost per review ≤ $0.20
- ✅ Selective re-review working correctly

---

### Phase 4: Implementation & Verification (Weeks 7-9)
**Goal:** Migrate `/dev-implement-story` and `/qa-verify-story`

**Tasks:**
- [ ] Create implementation graph (8 phases)
- [ ] Build E2E gate node (MANDATORY check)
- [ ] Create fix loop with max iterations
- [ ] Build QA verification graph
- [ ] Integrate with Claude Code for file editing
- [ ] Test on 10 stories end-to-end

**Success Criteria:**
- ✅ Implementation quality maintained
- ✅ E2E gate enforced
- ✅ Cost per implementation ≤ $0.70

---

### Phase 5: Meta-Orchestration (Weeks 10-11)
**Goal:** Migrate `/scrum-master` and `/workflow-batch`

**Tasks:**
- [ ] Create meta-orchestration graph
- [ ] Build batch decision collector
- [ ] Implement auto-accept tier logic
- [ ] Test full lifecycle with LangGraph

**Success Criteria:**
- ✅ Full lifecycle working
- ✅ Batch decisions collected correctly
- ✅ Cost per lifecycle ≤ $1.50

---

### Phase 6: Cleanup & Documentation (Week 12)
**Goal:** Deprecate old commands, update docs

**Tasks:**
- [ ] Update USAGE_GUIDE.md with LangGraph instructions
- [ ] Create migration guide for users
- [ ] Deprecate old commands (keep as fallback)
- [ ] Monitor costs for 1 month
- [ ] Adjust model assignments based on quality

---

## Feature Parity Requirements

### New LangGraph Workflows Needed (8 total)

1. **Bootstrap Workflow Graph** (`createBootstrapGraph`)
   - Nodes: setup, analysis, generation
   - Input: PLAN.md path
   - Output: Story files, index, roadmap

2. **Harness Generation Graph** (`createHarnessGraph`)
   - Nodes: setup, generation
   - Input: Feature prefix
   - Output: {PREFIX}-000-HARNESS.md

3. **Epic Elaboration Graph** (`createEpicElaborationGraph`)
   - Nodes: setup, parallel reviews, aggregation, interactive, updates
   - Input: Epic/feature directory
   - Output: EPIC-REVIEW.yaml, story updates

4. **Code Review Graph** (`createCodeReviewGraph`)
   - Nodes: setup, parallel workers (6), aggregation, finalize
   - Input: Story ID, changed files
   - Output: REVIEW.yaml with ranked patches

5. **QA Verification Graph** (`createQAVerifyGraph`)
   - Nodes: setup, verification, completion
   - Input: Story ID, EVIDENCE.yaml
   - Output: VERIFICATION.yaml, verdict

6. **Implementation Graph** (`createImplementationGraph`)
   - Nodes: setup, plan, execute, proof, review, fix (loop)
   - Input: Story ID, plan
   - Output: EVIDENCE.yaml, code changes

7. **Meta-Orchestration Graph** (`createMetaOrchestrationGraph`)
   - Nodes: phase selector, gate checker, workflow invoker
   - Input: Story ID, --from/--to flags
   - Output: Orchestrates other graphs

8. **Batch Decision Graph** (`createBatchDecisionGraph`)
   - Nodes: decision collector, tier classifier, auto-accept, escalate
   - Input: Decisions list
   - Output: BATCH-DECISIONS.yaml, auto-accepted actions

---

## Integration Architecture

### Hybrid Execution Model

```
┌─────────────────────────────────────────────────┐
│            Claude Code CLI (Parent)             │
│  - User interaction (AskUserQuestion)           │
│  - File I/O (Read, Write, Edit)                 │
│  - Code exploration (Glob, Grep)                │
│  - Git operations (Bash)                        │
│  - KB operations (MCP)                          │
└─────────────────┬───────────────────────────────┘
                  │ invokes
                  ▼
┌─────────────────────────────────────────────────┐
│       LangGraph Orchestrator (Child)            │
│  - Workflow state machine                       │
│  - Phase transitions                            │
│  - Gate logic                                   │
│  - Parallel worker coordination                 │
│  - Ollama LLM calls (local, fast)               │
│  - Claude API calls (strategic reasoning)       │
└─────────────────┬───────────────────────────────┘
                  │ calls back
                  ▼
┌─────────────────────────────────────────────────┐
│      Claude Code Adapters (Bridge)              │
│  - readStoryFile(storyId) → YAML               │
│  - writeStoryFile(storyId, content)            │
│  - moveStory(from, to)                          │
│  - updateIndex(storyId, status)                │
│  - writeEvidence(storyId, evidence)            │
└─────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **LangGraph handles orchestration, Claude Code handles I/O**
   - Clean separation of concerns
   - Leverage strengths of each system

2. **Anthropic API for Claude calls from LangGraph**
   - No reliance on Claude Code for LLM invocations
   - Can run LangGraph workflows independently

3. **Ollama for routine tasks, Claude for reasoning**
   - 60-75% of LLM calls use Ollama
   - Strategic tasks use Claude Sonnet
   - Security analysis always uses Claude

4. **File bridge for data exchange**
   - LangGraph reads/writes via adapter functions
   - Adapter calls Claude Code tools internally
   - Clean interface, testable

5. **Gradual migration with opt-in**
   - New commands: `/pm-story-v2`, `/elab-story-v2`
   - Keep old commands as fallback
   - Validate quality before deprecation

---

## Risk Mitigation

### Quality Risks
- **Risk:** LangGraph workflows produce lower quality
- **Mitigation:** A/B testing, quality gates, gradual rollout

### Cost Risks
- **Risk:** Ollama models degrade quality, forcing Sonnet fallback
- **Mitigation:** Monitor quality metrics, adjust model assignments

### Integration Risks
- **Risk:** File bridge creates bugs or data loss
- **Mitigation:** Extensive testing, atomic operations, backups

### Adoption Risks
- **Risk:** Team prefers old workflows
- **Mitigation:** Opt-in migration, show cost savings, improve DX

---

## Success Metrics

Track these monthly:

| Metric | Baseline | Target | Measure |
|--------|----------|--------|---------|
| **Cost per Story** | $3.30 | $1.50 | 55% reduction |
| **Monthly Costs** | $425 | $185 | 56% reduction |
| **Story Quality** | Baseline | ≥ Baseline | Story review scores |
| **Execution Time** | Baseline | ≤ 120% | Average seconds per workflow |
| **Ollama Usage %** | 0% | 65% | LLM calls to Ollama |
| **Migration Progress** | 0% | 50% | Workflows migrated |

---

## Conclusion

**Migrate These (7 commands):**
1. ✅ `/pm-story` → LangGraph bootstrap + story creation
2. ✅ `/pm-bootstrap-workflow` → LangGraph bootstrap
3. ✅ `/pm-generate-story-000-harness` → LangGraph harness
4. ✅ `/elab-story` → LangGraph elaboration
5. ✅ `/elab-epic` → LangGraph epic elaboration
6. ✅ `/dev-code-review` → LangGraph code review
7. ✅ `/qa-verify-story` → LangGraph QA verify

**Partial Migration (4 commands):**
- `/dev-implement-story` (orchestration only)
- `/dev-fix-story` (orchestration only)
- `/scrum-master` (meta-orchestration)
- `/workflow-batch` (batch decisions)

**Keep in Claude Code (21 commands):**
- All PM/planning, learning, architecture, utility, reporting

**Expected Outcome:**
- **56% cost reduction** ($240/month savings)
- **65% of LLM calls** use Ollama (free)
- **Quality maintained** via hybrid approach
- **12-week migration** timeline

**Next Step:** Begin Phase 1 (Foundation) by setting up Ollama and testing existing LangGraph workflows.
