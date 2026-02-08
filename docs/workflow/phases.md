# Workflow Phases

This document details each phase of the Unified Development Flow.

## Table of Contents

- [Phase 1: Bootstrap](#phase-1-bootstrap-one-time-per-epic)
  - [Step 1a: Bootstrap Workflow](#step-1a-bootstrap-workflow)
  - [Step 1b: Harness Story](#step-1b-harness-story-story-000)
  - [Step 1c: Epic Elaboration](#step-1c-epic-elaboration-optional-but-recommended)
  - [Step 1d: Feature Triage](#step-1d-feature-triage-ongoing)
- [Phase 2: PM Story Generation](#phase-2-pm-story-generation)
- [Phase 3: QA Elaboration](#phase-3-qa-elaboration)
- [Phase 4: Dev Implementation](#phase-4-dev-implementation-with-integrated-code-review)
- [Phase 5: Code Review](#phase-5-code-review-standalone---usually-integrated)
- [Phase 6: QA Verification](#phase-6-qa-verification)
- [Phase 7: QA Gate](#phase-7-qa-gate)
- [Phase 8: Merge & Cleanup](#phase-8-merge--cleanup)

---

## Phase 1: Bootstrap (One-Time per Epic)

Bootstrap consists of two steps that run once per epic/project:

### Step 1a: Bootstrap Workflow

**Command:** `/pm-bootstrap-workflow`
**When:** Once per epic/project, before any stories are generated

#### Agents & Sub-Agents

```
/pm-bootstrap-workflow
    │
    ├─→ Phase 0: pm-bootstrap-setup-leader.agent.md (haiku)
    │       └─→ Validates inputs, creates AGENT-CONTEXT.md
    │
    ├─→ Phase 1: pm-bootstrap-analysis-leader.agent.md (sonnet)
    │       └─→ Analyzes plan, creates ANALYSIS.yaml
    │
    └─→ Phase 2: pm-bootstrap-generation-leader.agent.md (haiku)
            └─→ Generates all artifact files
```

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | `pm-bootstrap-setup-leader.agent.md` | `AGENT-CONTEXT.md`, `CHECKPOINT.md` |
| 1 | `pm-bootstrap-analysis-leader.agent.md` | `ANALYSIS.yaml` |
| 2 | `pm-bootstrap-generation-leader.agent.md` | All artifact files |

#### How to Use

1. Run `/pm-bootstrap-workflow`
2. Provide required inputs:
   - **Raw Plan/PRD** - The unstructured plan, migration outline, or feature description
   - **Project Name** - Short identifier (e.g., "vercel-migration", "auth-refactor")
   - **Story Prefix** - Prefix for story IDs (e.g., "STORY", "WRKF", "AUTH")
3. Claude analyzes the plan and generates planning artifacts

#### Features

- `--dry-run` - Run analysis only, don't generate files
- Checkpoint & resume on interruption

### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `AGENT-CONTEXT.md` | `plans/{PREFIX}.bootstrap/` | Bootstrap context |
| `CHECKPOINT.md` | `plans/{PREFIX}.bootstrap/` | Resume state |
| `ANALYSIS.yaml` | `plans/{PREFIX}.bootstrap/` | Structured story data |
| `{PREFIX}.stories.index.md` | `plans/stories/` | Master story index with all stories, statuses, dependencies |
| `{PREFIX}.plan.meta.md` | `plans/` | Documentation structure, principles, package boundary rules |
| `{PREFIX}.plan.exec.md` | `plans/` | Artifact rules, naming conventions, reuse gates |
| `{PREFIX}.roadmap.md` | `plans/` | Visual dependency graphs with Mermaid |
| `LESSONS-LEARNED.md` | `plans/stories/` | Empty template for accumulating learnings across stories |
| `TOKEN-BUDGET-TEMPLATE.md` | `plans/stories/` | Template for token tracking per story |

### Example

For a Vercel migration project with prefix `STORY`, Bootstrap creates:
- `plans/stories/STORY.stories.index.md`
- `plans/STORY.plan.meta.md`
- `plans/STORY.plan.exec.md`

### Story Index Structure

The `{PREFIX}.stories.index.md` file contains:
- Progress summary (counts by status)
- Ready-to-start list (stories with no blockers)
- Per-story entries with:
  - Status (see lifecycle in README)
  - Dependencies
  - Feature description
  - Endpoints (if applicable)
  - Infrastructure requirements
  - Risk notes

---

### Step 1b: Harness Story (Story-000)

**Command:** `/pm-generate-story-000-harness {PREFIX}`
**When:** Immediately after bootstrap, before any feature stories

#### Agents & Sub-Agents

```
/pm-generate-story-000-harness
    │
    ├─→ Phase 0: pm-harness-setup-leader.agent.md (haiku)
    │       ├─→ Validate prefix provided
    │       ├─→ Check harness doesn't exist
    │       ├─→ Verify bootstrap completed
    │       └─→ Create directory structure
    │
    └─→ Phase 1: pm-harness-generation-leader.agent.md (haiku)
            ├─→ Generate {PREFIX}-000-HARNESS.md
            ├─→ Generate _pm/TEST-PLAN.md
            ├─→ Generate _pm/DEV-FEASIBILITY.md
            └─→ Generate _pm/BLOCKERS.md
```

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | `pm-harness-setup-leader.agent.md` | `AGENT-CONTEXT.md` |
| 1 | `pm-harness-generation-leader.agent.md` | Story + PM artifacts |

#### Purpose

Story-000 is a special "harness" story that:
- Does NOT migrate any features
- Validates the workflow mechanics work correctly
- Establishes "process law" for all future stories
- Creates reusable templates in `_templates/`

#### What It Proves

1. The story lifecycle works: PM → Elab → Dev → Code Review → QA Verify → QA Gate
2. Artifact generation for each phase
3. Reuse-first rules are enforceable
4. Local verification standards (`.http` files, Playwright)
5. Evidence requirements are clear

#### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `AGENT-CONTEXT.md` | `plans/stories/{PREFIX}-000/_implementation/` | Context for all phases |
| `{PREFIX}-000-HARNESS.md` | `plans/stories/{PREFIX}-000/` | Harness story specification |
| `TEST-PLAN.md` | `plans/stories/{PREFIX}-000/_pm/` | Verification approach |
| `DEV-FEASIBILITY.md` | `plans/stories/{PREFIX}-000/_pm/` | Technical notes |
| `BLOCKERS.md` | `plans/stories/{PREFIX}-000/_pm/` | Known blockers |

#### Important

- Run the full workflow on Story-000 before starting feature stories
- This validates your setup and creates templates other stories will reference
- Story-000 should PASS QA gate before proceeding to Story-001

---

### Step 1c: Epic Elaboration (Optional but Recommended)

**Command:** `/elab-epic {PREFIX}`
**When:** After bootstrap and harness validation, before generating feature stories

#### Purpose

Multi-stakeholder review of the entire epic to:
- Find gaps in story coverage
- Identify missing dependencies
- Validate technical approach
- Ensure user value is clear
- Surface risks early
- Recommend improvements

#### Agents & Sub-Agents

```
/elab-epic
    │
    ├─→ elab-epic-setup-leader.agent.md (haiku)
    │       └─→ Validates inputs, creates AGENT-CONTEXT.md, CHECKPOINT.md
    │
    ├─→ elab-epic-reviews-leader.agent.md (haiku)
    │       ├─→ elab-epic-engineering.agent.md ──┐
    │       ├─→ elab-epic-product.agent.md ──────┤
    │       ├─→ elab-epic-qa.agent.md ───────────┼─→ 6 parallel
    │       ├─→ elab-epic-ux.agent.md ───────────┤
    │       ├─→ elab-epic-platform.agent.md ─────┤
    │       └─→ elab-epic-security.agent.md ─────┘
    │
    ├─→ elab-epic-aggregation-leader.agent.md (haiku)
    │       └─→ Merges findings to EPIC-REVIEW.yaml
    │
    ├─→ elab-epic-interactive-leader.agent.md (sonnet)
    │       └─→ Presents findings, collects user decisions
    │
    └─→ elab-epic-updates-leader.agent.md (haiku)
            └─→ Applies approved changes to artifacts
```

#### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `AGENT-CONTEXT.md` | `plans/{PREFIX}.epic-elab/` | Context for all phases |
| `CHECKPOINT.md` | `plans/{PREFIX}.epic-elab/` | Resume state |
| `EPIC-REVIEW.yaml` | `plans/{PREFIX}.epic-elab/` | Unified findings |
| `DECISIONS.yaml` | `plans/{PREFIX}.epic-elab/` | User decisions |
| `UPDATES-LOG.yaml` | `plans/{PREFIX}.epic-elab/` | Changes made |

#### Verdicts

| Verdict | Meaning | Next Step |
|---------|---------|-----------|
| `READY` | No critical issues | → `/pm-story generate {PREFIX}-001` |
| `CONCERNS` | Minor issues noted | → `/pm-story generate {PREFIX}-001` (with notes) |
| `BLOCKED` | Critical issues | Address findings, re-run |

---

### Step 1d: Feature Triage (Ongoing)

**Command:** `/pm-refine-story [FEAT-ID | all | top <N>]`
**When:** Anytime to vet and prioritize features in the backlog

#### Purpose

Interactive PM-led brainstorming session to:
- Evaluate feature ideas critically
- Challenge assumptions and necessity
- Define scope and MVP
- Set informed priorities
- Promote features to story-ready status

#### Agents & Sub-Agents

```
/pm-refine-story
    │
    ├─→ Phase 0: (orchestrator, haiku)
    │       ├─→ Parse arguments
    │       ├─→ Bootstrap FEATURES.md if missing
    │       └─→ Load and filter features
    │
    └─→ Phase 1: pm-triage-leader.agent.md (sonnet)
            ├─→ Interactive triage conversation
            ├─→ Update priorities in FEATURES.md
            ├─→ Save session log to YAML
            └─→ Offer chain to /pm-story generate
```

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | (orchestrator) | Setup, bootstrap |
| 1 | `pm-triage-leader.agent.md` | Updated `FEATURES.md`, session log |

#### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `FEATURES.md` | `plans/future/` | Feature backlog |
| `<date>.yaml` | `plans/future/triage-sessions/` | Session log |

#### Conversation Phases

| Phase | Purpose | Example Questions |
|-------|---------|-------------------|
| Understanding | Learn about feature | "What problem does this solve?" |
| Challenge | Test assumptions | "What if users don't need this?" |
| Scope | Define boundaries | "What's the MVP version?" |
| Prioritize | Set priority | "Based on discussion, what priority?" |

#### Quick Commands

| Command | Action |
|---------|--------|
| `skip` | Next feature, no changes |
| `stop` | End session, save progress |
| `promote` | Mark ready for story |
| `archive` | Mark as not doing |

#### Feature Statuses

- `pending` → `promoted` | `archived`
- Promoted features are candidates for `/pm-story generate`

---

## Phase 2: PM Story Generation

**Command:** `/pm-story <action> [args]`
**Input:** Story entry from `{PREFIX}.stories.index.md` (for generate action)
**Output:** Full story file with all required sections

### Unified Command Actions

| Action | Usage | Purpose |
|--------|-------|---------|
| `generate` | `/pm-story generate {PREFIX}-XXX \| next` | Create story from index |
| `generate --elab` | `/pm-story generate {ID} --elab` | Generate + elaborate (interactive) |
| `generate --elab --autonomous` | `/pm-story generate {ID} --elab --autonomous` | Generate + elaborate (auto-decisions) |
| `generate --ad-hoc` | `/pm-story generate --ad-hoc [ID]` | Create emergent/one-off story |
| `bug` | `/pm-story bug [BUG-XXX]` | Create bug/defect story |
| `followup` | `/pm-story followup STORY-XXX [#]` | Create follow-up from QA findings |
| `split` | `/pm-story split STORY-XXX` | Split oversized story |

### Pipeline Mode (--elab)

When `--elab` flag is used, story generation chains directly to elaboration:

```
/pm-story generate WISH-001 --elab
    │
    ├─→ Phase 2: Generate story (normal flow)
    │       └─→ On PM COMPLETE...
    │
    └─→ Phase 3: Chain to /elab-story WISH-001
            └─→ Interactive elaboration
            └─→ On PASS: Story is ready-to-work

/pm-story generate WISH-001 --elab --autonomous
    │
    ├─→ Phase 2: Generate story (normal flow)
    │       └─→ On PM COMPLETE...
    │
    └─→ Phase 3: Chain to /elab-story WISH-001 --autonomous
            ├─→ MVP gaps auto-added as ACs
            ├─→ Non-blocking items logged to KB
            └─→ On PASS: Story is ready-to-work
```

**Benefits of autonomous mode:**
- Reduces PM overhead - no interactive prompts
- MVP-blocking gaps automatically become ACs
- Non-blocking findings persisted to KB for future reference
- Story goes directly to `ready-to-work` status

### Agents & Sub-Agents

```
/pm-story <action>
    │
    ├─→ action: generate ──→ pm-story-generation-leader.agent.md
    │                            ├─→ pm-story-seed-agent.agent.md (seeds story with reality & knowledge context)
    │                            │       └─→ knowledge-context-loader.agent.md (loads lessons + ADRs)
    │                            ├─→ pm-draft-test-plan.agent.md (parallel)
    │                            ├─→ pm-dev-feasibility-review.agent.md (parallel)
    │                            └─→ pm-uiux-recommendations.agent.md (parallel, if UI)
    │
    ├─→ action: generate --ad-hoc ──→ pm-story-adhoc-leader.agent.md
    │
    ├─→ action: bug ──→ pm-story-bug-leader.agent.md
    │
    ├─→ action: followup ──→ pm-story-followup-leader.agent.md
    │
    └─→ action: split ──→ pm-story-split-leader.agent.md
```

| Agent | Purpose |
|-------|---------|
| `pm-story-generation-leader.agent.md` | Orchestrates standard story generation |
| `pm-story-seed-agent.agent.md` | Seeds story with baseline reality and knowledge context |
| `knowledge-context-loader.agent.md` | Loads lessons learned and ADR constraints |
| `pm-story-adhoc-leader.agent.md` | Generates emergent/one-off stories |
| `pm-story-bug-leader.agent.md` | Generates bug/defect stories |
| `pm-story-followup-leader.agent.md` | Generates follow-up stories from QA findings |
| `pm-story-split-leader.agent.md` | Splits oversized stories |
| `pm-draft-test-plan.agent.md` | Worker: Drafts test plan |
| `pm-dev-feasibility-review.agent.md` | Worker: Assesses technical feasibility |
| `pm-uiux-recommendations.agent.md` | Worker: Adds UX considerations |

### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `{PREFIX}-XXX.md` | `plans/stories/{PREFIX}-XXX/` | Full story specification |
| `TEST-PLAN.md` | `plans/stories/{PREFIX}-XXX/_pm/` | How QA will verify |
| `DEV-FEASIBILITY.md` | `plans/stories/{PREFIX}-XXX/_pm/` | Technical approach notes |
| `BLOCKERS.md` | `plans/stories/{PREFIX}-XXX/_pm/` | Known blockers (empty if none) |

### Knowledge Context Integration

Story generation now automatically loads and applies knowledge from past stories and architecture decisions:

#### Sources

1. **Lessons Learned** (via Knowledge Base `kb_search`):
   - Past blockers from similar stories
   - Patterns that caused rework
   - Time sinks to avoid
   - Successful patterns to reuse

2. **Architecture Decision Records** (`plans/stories/ADR-LOG.md`):
   - ADR-001: API Path Schema (frontend/backend path conventions)
   - ADR-002: Infrastructure Patterns
   - ADR-003: Storage/CDN Architecture
   - ADR-004: Authentication Patterns
   - ADR-005: Testing Requirements (UAT must use real services)

#### How It's Used

- **Story Seed**: Knowledge context informs initial story structure
- **Conflict Detection**: Checks if story violates ADRs or repeats past mistakes
- **Attack Analysis**: Past failures become attack vectors for assumption challenges
- **Recommendations**: Story includes patterns to follow and avoid

#### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `STORY-SEED.md` | `_pm/` | Initial story seed with knowledge context |

### Knowledge Base Architecture

The workflow integrates with a PostgreSQL Knowledge Base (KB) for persistent institutional knowledge.

#### KB Tools

| Tool | Purpose | Used By |
|------|---------|---------|
| `kb_search` | Hybrid semantic + keyword search | `load-knowledge-context.ts`, agents querying past lessons |
| `kb_add` | Add new entry with auto-embedding | `kb-writer.agent.md` |
| `kb_bulk_import` | Import multiple entries | Migration scripts |
| `kb_stats` | Get entry counts and metadata | Verification scripts |

#### Knowledge Flow

```
READ PATH (Story Generation)
┌─────────────────────────────────────────────────────────────┐
│  /pm-story generate                                         │
│       │                                                     │
│       └─► load-knowledge-context.ts                         │
│               │                                             │
│               ├─► kb_search (domain lessons)                │
│               ├─► kb_search (blockers to avoid)             │
│               └─► Parse ADR-LOG.md                          │
│                       │                                     │
│                       └─► Return LessonsLearned + ADRs      │
│                               │                             │
│                               └─► Story seeding & attack    │
└─────────────────────────────────────────────────────────────┘

WRITE PATH (Knowledge Capture)
┌─────────────────────────────────────────────────────────────┐
│  Story completion (/dev-implement-story)                    │
│       │                                                     │
│       └─► dev-implement-learnings.agent.md                  │
│               │                                             │
│               └─► Spawns kb-writer.agent.md (per category)  │
│                       │                                     │
│                       ├─► Check for duplicates (kb_search)  │
│                       ├─► Generate standardized tags        │
│                       └─► kb_add (if not duplicate)         │
│                                                             │
│  QA verification (/qa-verify-story)                         │
│       │                                                     │
│       └─► qa-verify-completion-leader.agent.md              │
│               │                                             │
│               └─► Spawns kb-writer.agent.md (if notable)    │
│                       └─► Capture test strategies/edge cases│
└─────────────────────────────────────────────────────────────┘
```

#### Fallback Behavior

- **KB unavailable**: Silent fallback to hardcoded defaults
- **Workflow NOT blocked**: Story generation proceeds with default lessons
- **Warning logged**: For monitoring and debugging

#### kb-writer Agent

`kb-writer.agent.md` is the standard agent for writing to KB:

| Feature | Description |
|---------|-------------|
| Deduplication | Skips if >0.85 similarity exists |
| Standardized tags | `lesson-learned`, `story:xxx`, `category:xxx`, `date:YYYY-MM` |
| Consistent format | `**[STORY-ID] Category**` header |
| Silent fallback | Returns `skipped` if KB unavailable |

#### Stages That Write to KB

| Stage | Agent | What Gets Written |
|-------|-------|-------------------|
| Story Completion | `dev-implement-learnings` | Blockers, patterns, time sinks |
| QA Verification | `qa-verify-completion-leader` | Test strategies, edge cases |
| Elaboration | `elab-completion-leader` | Sizing insights, gap patterns (future) |
| Architecture | `dev-implement-planning-leader` | Confirmed decisions (future) |
| Bug Fixes | `dev-setup-leader` (fix mode) | Debug patterns, root causes (future) |

All use `kb-writer.agent.md` for consistent tagging and deduplication.

### Required Story Sections

- YAML frontmatter (id, title, status, created_at)
- Goal / Non-Goals
- Scope (In/Out)
- Acceptance Criteria
- Reuse Plan
- Local Testing Expectations
- Token Budget
- **Knowledge Context** (lessons applied, ADRs respected)

### Status Change

`{PREFIX}.stories.index.md`: pending → generated

---

## Phase 3: QA Elaboration

**Command:** `/elab-story {PREFIX}-XXX [--autonomous]`
**Input:** Story file from PM phase
**Output:** Elaboration/audit with PASS/FAIL verdict

### Modes

| Mode | Command | Behavior |
|------|---------|----------|
| Interactive (default) | `/elab-story WISH-001` | Prompts user for each finding |
| Autonomous | `/elab-story WISH-001 --autonomous` | Auto-decides, logs to KB |

### Agents & Sub-Agents

**Interactive Mode (default):**
```
/elab-story
    │
    ├─→ Phase 0: elab-setup-leader.agent.md (haiku)
    │       └─→ Validates story, moves to elaboration/
    │
    ├─→ Phase 1: elab-analyst.agent.md (sonnet)
    │       ├─→ Reads story + TEST-PLAN + DEV-FEASIBILITY
    │       ├─→ Runs 8-point audit checklist
    │       ├─→ Identifies gaps, ambiguities, risks
    │       └─→ Writes _implementation/ANALYSIS.md + FUTURE-OPPORTUNITIES.md
    │
    ├─→ Interactive Discussion (orchestrator)
    │       └─→ Presents findings, collects user decisions
    │
    └─→ Phase 2: elab-completion-leader.agent.md (haiku)
            └─→ Writes ELAB-{PREFIX}-XXX.md with verdict
```

**Autonomous Mode (--autonomous):**
```
/elab-story --autonomous
    │
    ├─→ Phase 0: elab-setup-leader.agent.md (haiku)
    │       └─→ Validates story, moves to elaboration/
    │
    ├─→ Phase 1: elab-analyst.agent.md (sonnet)
    │       └─→ Writes ANALYSIS.md + FUTURE-OPPORTUNITIES.md
    │
    ├─→ Phase 1.5: elab-autonomous-decider.agent.md (sonnet)
    │       ├─→ MVP-critical gaps → Add as new ACs
    │       ├─→ Non-blocking items → Spawn kb-writer (persist to KB)
    │       └─→ Writes _implementation/DECISIONS.yaml
    │
    └─→ Phase 2: elab-completion-leader.agent.md (haiku)
            └─→ Writes ELAB-{PREFIX}-XXX.md with verdict
```

| Phase | Agent | Purpose |
|-------|-------|---------|
| 0 | `elab-setup-leader.agent.md` | Validates story exists, moves to elaboration directory |
| 1 | `elab-analyst.agent.md` | Performs audit and discovery analysis |
| 1.5 | `elab-autonomous-decider.agent.md` | (autonomous only) Makes decisions, logs to KB |
| — | (orchestrator) | (interactive only) Discussion with user |
| 2 | `elab-completion-leader.agent.md` | Writes final elaboration report, updates status |

### Autonomous Decision Rules

When `--autonomous` is used, the decider applies these rules:

| Finding Type | Decision | Action |
|--------------|----------|--------|
| MVP-critical gap | Add as AC | Append to story's Acceptance Criteria |
| Security vulnerability | Add as AC | Append to story's Acceptance Criteria |
| Non-blocking gap | KB-logged | Spawn kb-writer with `category: future-opportunities` |
| Enhancement opportunity | KB-logged | Spawn kb-writer with appropriate tags |
| Audit failure (resolvable) | Auto-resolve | Add notes to Implementation Notes |
| Audit failure (scope/consistency) | Flag for PM | Cannot auto-resolve |

**What autonomous mode does NOT do:**
- Create follow-up stories (requires PM judgment)
- Modify story scope
- Auto-resolve Scope Alignment or Internal Consistency failures

### Purpose

The elaboration phase determines whether the story is:
- Safe to implement
- Unambiguous
- Locally testable
- Aligned with the plan
- Compliant with reuse-first and ports & adapters rules

**This is a HARD GATE.** Stories cannot proceed to implementation without PASS.

### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `ANALYSIS.md` | `plans/stories/{PREFIX}-XXX/_implementation/` | Audit and discovery findings |
| `FUTURE-OPPORTUNITIES.md` | `plans/stories/{PREFIX}-XXX/_implementation/` | Non-blocking findings for future |
| `DECISIONS.yaml` | `plans/stories/{PREFIX}-XXX/_implementation/` | (autonomous only) Auto-decisions made |
| `ELAB-{PREFIX}-XXX.md` | `plans/stories/{PREFIX}-XXX/` | Final elaboration report with verdict |

### Audit Checklist

1. Scope Alignment
2. Internal Consistency
3. Reuse-First Enforcement
4. Ports & Adapters Compliance
5. Local Testability
6. Decision Completeness
7. Risk Disclosure
8. Story Sizing (too large detection)

### Verdicts

| Verdict | Meaning | Status Change |
|---------|---------|---------------|
| PASS | Ready for implementation | → `ready-to-work` |
| CONDITIONAL PASS | Minor fixes needed, then proceed | → `ready-to-work` (after fixes) |
| NEEDS REFINEMENT | Gaps identified, needs elicitation | → `needs-refinement` |
| FAIL | Significant issues, needs PM revision | → `needs-refinement` |
| SPLIT REQUIRED | Story too large, must be split | → `needs-split` (then prompts for split) |

### Split Handling

When verdict is `SPLIT REQUIRED`, the command:
1. Updates story status to `needs-split`
2. Asks user: "Would you like to split now?"
3. If yes: Chains to `/pm-story split` which creates splits and **deletes the original**
4. If no: Leaves story for manual split later

This streamlines the workflow by allowing immediate continuation after split.

---

## Phase 4: Dev Implementation (with Integrated Code Review)

**Command:** `/dev-implement-story {PREFIX}-XXX [--max-iterations=N] [--force-continue]`
**Input:** Story with `status: ready-to-work`
**Output:** Implementation artifacts, proof, and passing code review

### Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--max-iterations=N` | 3 | Max review/fix loop iterations |
| `--force-continue` | false | Proceed to QA with warnings after max iterations |
| `--dry-run` | — | Analyze story without executing |

### Architecture: Context Boundaries

```
/dev-implement-story
    │
    ORCHESTRATOR (minimal context, manages loop)
    │
    ├─► IMPLEMENTATION AGENT (spawned fresh)
    │     ├─→ dev-setup-leader (Phase 0)
    │     ├─→ dev-implement-planning-leader (Phase 1)
    │     │     ├── dev-implement-planner (worker)
    │     │     └── dev-implement-plan-validator (worker)
    │     ├─→ dev-implement-implementation-leader (Phase 2)
    │     │     ├── dev-implement-backend-coder (parallel)
    │     │     ├── dev-implement-frontend-coder (parallel)
    │     │     └── dev-implement-contracts (after backend)
    │     ├─→ dev-verification-leader (Phase 3)
    │     │     ├── dev-implement-verifier
    │     │     └── dev-implement-playwright (if UI)
    │     └─→ dev-documentation-leader (Phase 4)
    │           ├── dev-implement-proof-writer
    │           └── dev-implement-learnings
    │
    └─► REVIEW/FIX LOOP (max N iterations)
          │
          ├─► REVIEW AGENT (spawned fresh each iteration)
          │     └─→ 6 parallel workers:
          │           ├── code-review-lint
          │           ├── code-review-style-compliance
          │           ├── code-review-syntax
          │           ├── code-review-security
          │           ├── code-review-typecheck
          │           └── code-review-build
          │     └─→ Aggregate → VERIFICATION.yaml
          │
          │   PASS → exit loop
          │   FAIL ↓
          │
          └─► FIX AGENT (spawned fresh each iteration)
                ├─→ dev-fix-fix-leader
                ├─→ dev-verification-leader (mode: fix)
                └─→ dev-documentation-leader (mode: fix)
                └─→ Loop back to REVIEW AGENT
```

**Context is cleared between Implementation, Review, and Fix agents.**

### Auto-Resume

No `--resume` flag needed. The orchestrator automatically detects existing artifacts:

1. **CHECKPOINT.md** → Resume from checkpoint stage
2. **VERIFICATION.yaml with FAIL** → Skip to Fix
3. **VERIFICATION.yaml with PASS** → Done
4. **PROOF + LOGs exist** → Skip to Review
5. **Nothing** → Start from Implementation

### Multi-Agent Pipeline

| Stage | Phase | Agent File | Output |
|-------|-------|------------|--------|
| Implementation | 0 | `dev-setup-leader.agent.md` | `SCOPE.md`, `CHECKPOINT.md` |
| Implementation | 1A | `dev-implement-planner.agent.md` | `IMPLEMENTATION-PLAN.md` |
| Implementation | 1B | `dev-implement-plan-validator.agent.md` | `PLAN-VALIDATION.md` |
| Implementation | 2A | `dev-implement-backend-coder.agent.md` | `BACKEND-LOG.md` |
| Implementation | 2A | `dev-implement-frontend-coder.agent.md` | `FRONTEND-LOG.md` |
| Implementation | 2B | `dev-implement-contracts.agent.md` | `CONTRACTS.md` |
| Implementation | 3A | `dev-implement-verifier.agent.md` | `VERIFICATION.md` |
| Implementation | 3B | `dev-implement-playwright.agent.md` | Appends to `VERIFICATION.md` |
| Implementation | 4 | `dev-implement-proof-writer.agent.md` | `PROOF-{PREFIX}-XXX.md` |
| Implementation | 5 | `dev-implement-learnings.agent.md` | Appends to `LESSONS-LEARNED.md` |
| Review | 5-6 | 6 code-review workers | `VERIFICATION.yaml` |
| Fix | 7-9 | fix-leader, verification, documentation | Updated artifacts |

### Related Skills

| Skill | When Used |
|-------|-----------|
| `/wt-new` | Create worktree before starting implementation |
| `/wt-sync` | Sync with upstream during long implementations |

### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `CHECKPOINT.md` | `_implementation/` | Stage tracking, resume state |
| `SCOPE.md` | `_implementation/` | Backend/frontend/infra impact flags |
| `IMPLEMENTATION-PLAN.md` | `_implementation/` | Step-by-step plan |
| `PLAN-VALIDATION.md` | `_implementation/` | Plan validation results |
| `BACKEND-LOG.md` | `_implementation/` | Backend implementation log |
| `FRONTEND-LOG.md` | `_implementation/` | Frontend implementation log |
| `VERIFICATION.md` | `_implementation/` | Build/lint/test results |
| `VERIFICATION.yaml` | `_implementation/` | Code review results (schema v3) |
| `TOKEN-SUMMARY.md` | `_implementation/` | Aggregated token usage |
| `PROOF-{PREFIX}-XXX.md` | `{PREFIX}-XXX/` | Final proof document |

### Status Change

- **Clean pass**: `ready-to-work` → `in-progress` → `ready-for-qa`
- **Forced continue**: `ready-to-work` → `in-progress` → `ready-for-qa-with-warnings`
- **Blocked**: `ready-to-work` → `in-progress` → `blocked` (after max iterations without pass)

---

## Phase 5: Code Review (Standalone - Usually Integrated)

**Command:** `/dev-code-review {PREFIX}-XXX`
**Input:** Implementation with proof
**Output:** Review findings and disposition

> **Note:** Code review is now **integrated into `/dev-implement-story`** with an automatic fix loop. This standalone command is available for:
> - Re-running code review manually after external changes
> - Running code review on stories implemented outside the workflow
> - Debugging specific review failures

### Agents & Sub-Agents

```
/dev-code-review
    │
    ├─→ Phase 0: Setup (validates preconditions)
    │
    ├─→ Phase 1: Parallel Review (6 workers)
    │     ├─→ code-review-lint.agent.md
    │     ├─→ code-review-syntax.agent.md
    │     ├─→ code-review-style-compliance.agent.md
    │     ├─→ code-review-security.agent.md
    │     ├─→ code-review-typecheck.agent.md
    │     └─→ code-review-build.agent.md
    │
    ├─→ Phase 2: Aggregate results
    │
    └─→ Phase 3: Finalize (update status)
```

### Multi-Agent Pipeline

| Agent File | Focus Area |
|------------|------------|
| `code-review-lint.agent.md` | ESLint, Prettier compliance |
| `code-review-syntax.agent.md` | TypeScript errors, type safety |
| `code-review-style-compliance.agent.md` | CLAUDE.md rules, Zod-first types, import rules |
| `code-review-security.agent.md` | OWASP top 10, injection risks, auth issues |
| `code-review-typecheck.agent.md` | TypeScript type checking (`pnpm check-types`) |
| `code-review-build.agent.md` | Production build verification (`pnpm build`) |

### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `VERIFICATION.yaml` | `_implementation/` | Review findings (schema v3) |

### Review Verdict

- **All 6 PASS** → Overall PASS → `status: ready-for-qa`
- **Any FAIL** → Overall FAIL → `status: code-review-failed`

### Status Change (standalone mode)

`status: ready-for-code-review` → `status: ready-for-qa` (PASS) or `status: code-review-failed` (FAIL)

---

## Phase 6: QA Verification

**Command:** `/qa-verify-story {PREFIX}-XXX`
**Input:** Implementation with code review complete
**Output:** Verification results with evidence

### Agents & Sub-Agents

```
/qa-verify-story
    │
    ├─→ Phase 0: qa-verify-setup-leader.agent.md (haiku)
    │       ├─→ Validate preconditions (4 gates)
    │       ├─→ Move story to QA directory
    │       ├─→ Update status to in-qa
    │       └─→ Create AGENT-CONTEXT.md
    │
    ├─→ Phase 1: qa-verify-verification-leader.agent.md (sonnet)
    │       ├─→ 1. AC Verification (HARD GATE)
    │       ├─→ 2. Test Quality Review (HARD GATE)
    │       ├─→ 3. Test Coverage Check (HARD GATE)
    │       ├─→ 4. Test Execution (HARD GATE)
    │       ├─→ 5. Proof Quality Check
    │       ├─→ 6. Architecture Compliance
    │       └─→ Update VERIFICATION.yaml
    │
    └─→ Phase 2: qa-verify-completion-leader.agent.md (haiku)
            ├─→ Write gate decision to VERIFICATION.yaml
            ├─→ Update story status (uat or needs-work)
            ├─→ Move story to UAT or back to in-progress
            ├─→ Spawn Index Updater (on PASS only)
            └─→ Log tokens via /token-log
```

| Phase | Agent | Model | Purpose |
|-------|-------|-------|---------|
| 0 | `qa-verify-setup-leader.agent.md` | haiku | Validates preconditions, moves story |
| 1 | `qa-verify-verification-leader.agent.md` | sonnet | Executes all verification checks |
| 2 | `qa-verify-completion-leader.agent.md` | haiku | Updates status, finalizes gate |

### Related Skills

| Skill | When Used |
|-------|-----------|
| `/ui-ux-review` | Optional UX audit for UI-heavy stories |
| `/token-log` | Called by completion leader to log phase tokens |

### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `AGENT-CONTEXT.md` | `_implementation/` | Context for all phases |
| `VERIFICATION.yaml` | `_implementation/` | qa_verify + gate sections |

### Verification Requirements (6 Hard Gates)

1. AC Verification - All ACs mapped to evidence
2. Test Quality - No anti-patterns
3. Coverage - 80% new code, 90% critical paths
4. Test Execution - All tests pass (.http, unit, E2E)
5. Proof Quality - Complete and verifiable
6. Architecture - No violations

### Status Change

- PASS: `ready-for-qa` → `in-qa` → `uat` (story moves to `UAT/`)
- FAIL: `ready-for-qa` → `in-qa` → `needs-work` (story moves to `in-progress/`)

---

## Phase 7: QA Gate

**Command:** `/qa-gate {PREFIX}-XXX`
**Input:** Verification results
**Output:** Final ship decision

### Agents & Sub-Agents

```
/qa-gate
    │
    └─→ qa.agent.md (single agent)
            │
            ├─→ Aggregates all evidence:
            │     • ELAB-{PREFIX}-XXX.md
            │     • PROOF-{PREFIX}-XXX.md
            │     • CODE-REVIEW-{PREFIX}-XXX.md
            │     • QA-VERIFY-{PREFIX}-XXX.md
            │
            ├─→ Evaluates gate criteria
            └─→ Writes QA-GATE-{PREFIX}-XXX.yaml
```

| Agent | Purpose |
|-------|---------|
| `qa.agent.md` | Makes final ship/no-ship decision based on all evidence |

### Files Created

| File | Location | Purpose |
|------|----------|---------|
| `QA-GATE-{PREFIX}-XXX.yaml` | `plans/stories/{PREFIX}-XXX/` | Gate decision |

### Gate Decisions

| Decision | Meaning |
|----------|---------|
| PASS | Ready to merge |
| CONCERNS | Advisory issues, can still merge |
| FAIL | Blocking issues, cannot merge |
| WAIVED | Known issues accepted with justification |

### Status Change

`status: ready-for-gate` → `status: done` (on PASS)

---

## Phase 8: Merge & Cleanup

**Skill:** `/wt-finish` (or manual git operations)
**Input:** Story with PASS gate decision
**Output:** Changes merged, worktree cleaned up

### Skills Used

```
/wt-finish
    │
    ├─→ Validates QA gate passed
    ├─→ Merges feature branch to main
    ├─→ Pushes to remote
    ├─→ Deletes worktree directory
    └─→ Optionally deletes branch
```

| Skill | Purpose |
|-------|---------|
| `/wt-finish` | Automates merge, push, and worktree cleanup |
| `/wt-cleanup` | Removes stale worktrees (bulk cleanup) |

### Actions

1. Merge feature branch to main
2. Push to remote
3. Delete worktree
4. Delete branch (optional)
5. Update `{PREFIX}.stories.index.md` status to `completed`

---

## PM Fix Story (Remediation)

**Command:** `/pm-fix-story STORY-XXX`
**When:** Story has `status: needs-refinement` after failed elaboration

### Agents & Sub-Agents

```
/pm-fix-story
    │
    └─→ Phase 0: pm-story-fix-leader.agent.md (sonnet)
            ├─→ Load story + QA feedback
            ├─→ Analyze gaps (inline)
            ├─→ Apply fixes to story
            └─→ Update status → backlog
```

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | `pm-story-fix-leader.agent.md` | Updated `STORY-XXX.md` |

### Status Transition

`needs-refinement` → `backlog`

**Next Step:** `/elab-story STORY-XXX` (re-audit)

---

## Elicitation / Refinement

When Elab identifies gaps, ambiguities, or scope issues, the story enters **Elicitation**:

- **Missing requirements** - Gather details from stakeholders
- **Ambiguous acceptance criteria** - Clarify expected behavior
- **Scope creep detection** - Decide what's in/out
- **Split decisions** - Determine how to break up oversized stories

After elicitation, the story returns to PM for rework with the new information.
