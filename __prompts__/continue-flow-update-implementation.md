# Continue: Evidence-First Workflow Implementation

## Context

We implemented the core evidence-first architecture for the Dev → Review → QA workflow. The goal is to reduce token usage by ~40% per story by:

1. Using EVIDENCE.yaml as single source of truth
2. Minimizing story file re-reads (2 times vs 15+)
3. Caching KNOWLEDGE-CONTEXT.yaml instead of re-querying KB
4. Using haiku for review workers instead of sonnet

## What Was Completed

### 1. YAML Schemas (all done)

Location: `packages/backend/orchestrator/src/artifacts/`

- `checkpoint.ts` - Phase tracking
- `scope.ts` - What surfaces touched
- `plan.ts` - Structured implementation plan
- `knowledge-context.ts` - Lessons + ADRs
- `evidence.ts` - Single source of truth
- `review.ts` - Code review findings
- `qa-verify.ts` - QA verification results
- `index.ts` - Exports all schemas

Exported from `packages/backend/orchestrator/src/index.ts`

### 2. New/Updated Agents (done)

- `.claude/agents/dev-setup-leader.agent.md` - v4.0.0, outputs YAML
- `.claude/agents/dev-plan-leader.agent.md` - NEW, replaces planning-leader + workers
- `.claude/agents/dev-execute-leader.agent.md` - NEW, produces EVIDENCE.yaml
- `.claude/agents/dev-proof-leader.agent.md` - NEW, reads EVIDENCE.yaml only
- `.claude/agents/knowledge-context-loader.agent.md` - v2.0.0, writes YAML
- `.claude/agents/qa-verify-setup-leader.agent.md` - v4.0.0, evidence-first
- `.claude/agents/qa-verify-verification-leader.agent.md` - v4.0.0, evidence-first

### 3. Updated Command (done)

- `.claude/commands/dev-implement-story.md` - v6.0.0, new phase flow

### 4. Audit Documents (done)

- `plans/workflow-audit/DEV_REVIEW_QA_AUDIT.md` - Current state inventory
- `plans/workflow-audit/DEV_REVIEW_QA_REDESIGN.md` - Architecture proposal

## What Remains

### 1. Update Review Workers to Output YAML

The 6 review workers need updating to:
- Use haiku model (was sonnet)
- Output structured YAML findings
- Read touched files from EVIDENCE.yaml

Files to update:
- `.claude/agents/code-review-lint.agent.md`
- `.claude/agents/code-review-style-compliance.agent.md`
- `.claude/agents/code-review-syntax.agent.md`
- `.claude/agents/code-review-security.agent.md`
- `.claude/agents/code-review-typecheck.agent.md`
- `.claude/agents/code-review-build.agent.md`

Key changes for each:
```yaml
# Frontmatter
model: haiku  # was sonnet
schema: packages/backend/orchestrator/src/artifacts/review.ts

# Output format - YAML only
findings:
  - file: "path/to/file.ts"
    line: 42
    message: "Issue description"
    severity: error | warning | info
    auto_fixable: true | false
```

### 2. Create review-aggregate-leader Agent

New agent to aggregate worker outputs into REVIEW.yaml:
- Model: haiku
- Reads: Worker YAML outputs
- Writes: REVIEW.yaml with ranked_patches

### 3. Update /dev-code-review Command

File: `.claude/commands/dev-code-review.md`

Changes needed:
- Update to use EVIDENCE.yaml as input
- Spawn haiku workers
- Output REVIEW.yaml

### 4. Update /qa-verify-story Command

File: `.claude/commands/qa-verify-story.md`

Changes needed:
- Reference new QA-VERIFY.yaml schema
- Update phase flow to match agents
- Read EVIDENCE.yaml as primary input

### 5. Update qa-verify-completion-leader Agent

File: `.claude/agents/qa-verify-completion-leader.agent.md`

Changes needed:
- Read QA-VERIFY.yaml
- Trigger KB write-back for lessons_to_record
- Update CHECKPOINT.yaml to done

### 6. Update dev-fix-fix-leader Agent

File: `.claude/agents/dev-fix-fix-leader.agent.md`

Changes needed:
- Read REVIEW.yaml for ranked_patches
- Update EVIDENCE.yaml after fixes
- Use structured FIX-CONTEXT.yaml

### 7. Tests for Schemas

Create tests in `packages/backend/orchestrator/src/artifacts/__tests__/`:
- `checkpoint.test.ts`
- `evidence.test.ts`
- `review.test.ts`
- etc.

### 8. Fix TypeScript Build

There's a pre-existing `axe-core` type definition error in the orchestrator package. May need:
```bash
pnpm add -D @types/axe-core --filter @repo/orchestrator
```

## Architecture Reference

```
EVIDENCE-FIRST FLOW:

Story File (read 2x max)
       │
       ▼
┌──────────────────────────────────────────────┐
│ Phase 0: dev-setup-leader (haiku)            │
│   Writes: CHECKPOINT.yaml, SCOPE.yaml        │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Phase 1: dev-plan-leader (sonnet)            │
│   Writes: PLAN.yaml, KNOWLEDGE-CONTEXT.yaml  │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Phase 2: dev-execute-leader (sonnet)         │
│   Writes: EVIDENCE.yaml ← SINGLE SOURCE      │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Phase 3: dev-proof-leader (haiku)            │
│   Reads: EVIDENCE.yaml ONLY                  │
│   Writes: PROOF-{STORY_ID}.md                │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Review: Workers (haiku × 6)                  │
│   Reads: touched_files from EVIDENCE.yaml    │
│   Writes: REVIEW.yaml                        │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ QA: qa-verify-verification-leader (sonnet)   │
│   Reads: EVIDENCE.yaml (primary)             │
│   Writes: QA-VERIFY.yaml                     │
└──────────────────────────────────────────────┘
```

## Token Savings Target

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Story file reads | 15+ × 7k | 2 × 7k | ~90k |
| LESSONS-LEARNED.md | 3-5 × 18k | 0 (cached) | ~60k |
| Review workers | sonnet | haiku | ~50% cost |
| Proof generation | Re-read logs | EVIDENCE.yaml | ~13k |

**Target: 40%+ reduction (~120k tokens per story)**

## Commands to Verify

After completing remaining work:

```bash
# Type check
pnpm tsc --noEmit -p packages/backend/orchestrator/tsconfig.json

# Lint new files
pnpm eslint packages/backend/orchestrator/src/artifacts/*.ts

# Run tests (once created)
pnpm test --filter @repo/orchestrator
```

## Files Modified in This Session

New files:
- `packages/backend/orchestrator/src/artifacts/*.ts` (7 files)
- `.claude/agents/dev-plan-leader.agent.md`
- `.claude/agents/dev-execute-leader.agent.md`
- `.claude/agents/dev-proof-leader.agent.md`
- `plans/workflow-audit/DEV_REVIEW_QA_AUDIT.md`
- `plans/workflow-audit/DEV_REVIEW_QA_REDESIGN.md`

Updated files:
- `packages/backend/orchestrator/src/index.ts`
- `.claude/agents/dev-setup-leader.agent.md`
- `.claude/agents/knowledge-context-loader.agent.md`
- `.claude/agents/qa-verify-setup-leader.agent.md`
- `.claude/agents/qa-verify-verification-leader.agent.md`
- `.claude/commands/dev-implement-story.md`
