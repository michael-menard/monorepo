# Dev → Review → QA Workflow Audit

**Date**: 2026-02-01
**Purpose**: Inventory current commands, agents, and identify token waste hotspots.

---

## 1. Command Inventory

### Commands and Responsibilities

| Command | Path | Purpose | Status Changes |
|---------|------|---------|----------------|
| `/dev-implement-story` | `.claude/commands/dev-implement-story.md` | Main implementation orchestrator | `ready-to-work` → `in-progress` → `ready-for-qa` |
| `/dev-code-review` | `.claude/commands/dev-code-review.md` | Standalone code review | `in-progress` → `ready-for-qa` or `code-review-failed` |
| `/dev-fix-story` | `.claude/commands/dev-fix-story.md` | Fix issues from failed review | `code-review-failed` → `in-progress` |
| `/qa-verify-story` | `.claude/commands/qa-verify-story.md` | Post-implementation verification | `ready-for-qa` → `uat` or `needs-work` |
| `/token-log` | `.claude/skills/token-log/SKILL.md` | Log token usage per phase | N/A |

### Command Flow

```
┌─────────────────────┐
│ /dev-implement-story│
│  (Orchestrator)     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Commitment Gate    │ ← haiku
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Implementation     │
│  (Phases 0-4)       │
│  - Setup            │ ← haiku
│  - Planning         │ ← sonnet (spawns workers)
│  - Implementation   │ ← sonnet (spawns coders)
│  - Verification     │ ← sonnet
│  - Documentation    │ ← haiku
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Review/Fix Loop    │ ← Fresh agents per iteration
│  (max 3 iterations) │
│  - Review Agent     │ ← sonnet (spawns 6 workers)
│  - Fix Agent        │ ← sonnet (if FAIL)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ /qa-verify-story    │
│  - Setup            │ ← haiku
│  - Verification     │ ← sonnet
│  - Completion       │ ← haiku
└─────────────────────┘
```

---

## 2. Agent Inventory

### Dev Implementation Agents

| Agent | Phase | Model | Inputs Read | Outputs Written |
|-------|-------|-------|-------------|-----------------|
| `commitment-gate-agent` | Pre-0 | haiku | READINESS.yaml, story file | GATE-RESULT.yaml |
| `dev-setup-leader` | 0 | haiku | Story file, index | SCOPE.md, AGENT-CONTEXT.md, CHECKPOINT.md |
| `dev-implement-planning-leader` | 1 | sonnet | Story file, SCOPE.md, KB | IMPLEMENTATION-PLAN.md, ARCHITECTURAL-DECISIONS.yaml |
| `dev-implement-planner` | 1-worker | sonnet | Story file, codebase | IMPLEMENTATION-PLAN.md |
| `dev-implement-plan-validator` | 1-worker | sonnet | Story file, IMPLEMENTATION-PLAN.md | PLAN-VALIDATION.md |
| `dev-implement-implementation-leader` | 2 | sonnet | Story file, IMPLEMENTATION-PLAN.md | Code changes, logs |
| `dev-implement-backend-coder` | 2-worker | sonnet | Story file, plan | Backend code |
| `dev-implement-frontend-coder` | 2-worker | sonnet | Story file, plan | Frontend code |
| `dev-verification-leader` | 3 | sonnet | Story file, code changes | Test results |
| `dev-documentation-leader` | 4 | haiku | Story file, logs | PROOF-{STORY}.md |

### Code Review Agents

| Agent | Phase | Model | Inputs Read | Outputs Written |
|-------|-------|-------|-------------|-----------------|
| `code-review-lint` | 1-worker | sonnet | Touched files | YAML findings |
| `code-review-style-compliance` | 1-worker | sonnet | Touched files | YAML findings |
| `code-review-syntax` | 1-worker | sonnet | Touched files | YAML findings |
| `code-review-security` | 1-worker | sonnet | Touched files | YAML findings |
| `code-review-typecheck` | 1-worker | sonnet | Touched files | YAML findings |
| `code-review-build` | 1-worker | sonnet | Touched files | YAML findings |

### Fix Agents

| Agent | Phase | Model | Inputs Read | Outputs Written |
|-------|-------|-------|-------------|-----------------|
| `dev-fix-fix-leader` | 7 | sonnet | VERIFICATION.yaml, story | Code fixes |

### QA Verify Agents

| Agent | Phase | Model | Inputs Read | Outputs Written |
|-------|-------|-------|-------------|-----------------|
| `qa-verify-setup-leader` | 0 | haiku | VERIFICATION.yaml, story | AGENT-CONTEXT.md |
| `qa-verify-verification-leader` | 1 | sonnet | Story, PROOF, VERIFICATION.yaml, code | VERIFICATION.yaml (qa_verify section) |
| `qa-verify-completion-leader` | 2 | haiku | VERIFICATION.yaml, story | Status update, KB write-back |

### Shared/Utility Agents

| Agent | Purpose | Model |
|-------|---------|-------|
| `knowledge-context-loader` | Load lessons learned + ADRs | haiku |
| `kb-writer` | Write lessons to KB | haiku |
| `_token-logging.md` | Token tracking specification | N/A |

---

## 3. Duplication Map

### Story Context Re-Reading (CRITICAL - 30-40% Token Waste)

```
Story File (~7,000 tokens) Read By:
├── commitment-gate-agent        (Phase Pre-0)
├── dev-setup-leader             (Phase 0)
├── dev-implement-planning-leader (Phase 1)
├── dev-implement-planner         (Phase 1 worker)
├── dev-implement-plan-validator  (Phase 1 worker)
├── dev-implement-implementation-leader (Phase 2)
├── dev-implement-backend-coder   (Phase 2 worker)
├── dev-implement-frontend-coder  (Phase 2 worker)
├── dev-verification-leader       (Phase 3)
├── dev-documentation-leader      (Phase 4)
├── code-review-* (6 workers)     (Review phase)
├── dev-fix-fix-leader           (Fix phase)
├── qa-verify-setup-leader       (QA Phase 0)
├── qa-verify-verification-leader (QA Phase 1)
└── qa-verify-completion-leader  (QA Phase 2)
    = ~15 agents × 7,000 tokens = ~105,000 tokens wasted on re-reads
```

### IMPLEMENTATION-PLAN.md Re-Reading

```
IMPLEMENTATION-PLAN.md (~5,000 tokens) Read By:
├── dev-implement-plan-validator  (Phase 1)
├── dev-implement-implementation-leader (Phase 2)
├── dev-implement-backend-coder   (Phase 2)
├── dev-implement-frontend-coder  (Phase 2)
├── dev-verification-leader       (Phase 3)
└── dev-documentation-leader      (Phase 4)
    = ~6 agents × 5,000 tokens = ~30,000 tokens on re-reads
```

### PROOF File Re-Reading

```
PROOF-{STORY}.md (~4,000 tokens) Read By:
├── code-review-* (6 workers)    (Review)
├── dev-fix-fix-leader          (Fix)
├── qa-verify-verification-leader (QA)
└── qa-verify-completion-leader (QA)
    = ~9 agents × 4,000 tokens = ~36,000 tokens on re-reads
```

### Other Duplications

| Artifact | Read Count | Est. Tokens | Total Waste |
|----------|------------|-------------|-------------|
| LESSONS-LEARNED.md | 3-5 agents | 18,000 | ~72,000 |
| ADR-LOG.md | 3-5 agents | 12,000 | ~48,000 |
| SCOPE.md | 5+ agents | 800 | ~4,000 |
| CHECKPOINT.md | All agents | 500 | ~7,500 |

**Estimated Total Re-Read Waste Per Story: ~300,000+ tokens**

---

## 4. Token Risk Hotspots

### High-Risk Operations

| Operation | Tokens | Frequency | Risk Level |
|-----------|--------|-----------|------------|
| Story file re-read | ~7,000 | 15+ times | **CRITICAL** |
| LESSONS-LEARNED.md full read | ~18,000 | 3-5 times | **HIGH** |
| IMPLEMENTATION-PLAN.md re-read | ~5,000 | 6 times | **HIGH** |
| PROOF file re-read | ~4,000 | 9 times | **HIGH** |
| ADR-LOG.md full read | ~12,000 | 3-5 times | **MEDIUM** |
| Codebase exploration | ~25,000+ | Variable | **MEDIUM** |

### Problematic Patterns

1. **No Context Passing Between Phases**
   - Each phase spawns fresh agents
   - Agents re-read all context files from scratch
   - No mechanism to pass extracted data between phases

2. **Full File Reads When Summary Sufficient**
   - Story file read in full when only ACs needed
   - LESSONS-LEARNED.md read in full when only 3-5 relevant entries needed
   - PROOF read in full when only file list needed

3. **Redundant Review Workers**
   - All 6 workers run on first iteration
   - Each worker reads the same touched files
   - Selective re-review helps but still duplicates common file reads

4. **No Artifact-Based Skip Logic**
   - If PLAN.yaml exists, planning could be skipped
   - If EVIDENCE.yaml exists, proof generation could be minimal
   - No structured artifact to signal "this phase is complete"

---

## 5. Current Artifact Structure

### Artifacts Written By Each Phase

| Phase | Artifacts | Format | Purpose |
|-------|-----------|--------|---------|
| Setup | SCOPE.md, AGENT-CONTEXT.md | Markdown | Minimal scope info |
| Planning | IMPLEMENTATION-PLAN.md, ARCHITECTURAL-DECISIONS.yaml | Mixed | Implementation blueprint |
| Implementation | Code files, BACKEND-LOG.md, FRONTEND-LOG.md | Mixed | Tracked changes |
| Verification | Test results | — | Test execution |
| Documentation | PROOF-{STORY}.md | Markdown | Implementation evidence |
| Review | VERIFICATION.yaml | YAML | Review findings |
| QA | VERIFICATION.yaml (extended) | YAML | QA findings |

### Missing Artifacts (per PLAN.md requirements)

| Artifact | Purpose | Why Missing |
|----------|---------|-------------|
| CHECKPOINT.yaml | Structured phase tracking | Using CHECKPOINT.md instead |
| SCOPE.yaml | Structured scope with touched_paths | Using SCOPE.md instead |
| PLAN.yaml | Structured plan with steps/files | Using IMPLEMENTATION-PLAN.md |
| KNOWLEDGE-CONTEXT.yaml | Lessons + ADRs for story | Loaded inline, not persisted |
| EVIDENCE.yaml | Single source of truth for verification | Not implemented |
| REVIEW.yaml | Aggregated review results | Using VERIFICATION.yaml |
| QA-VERIFY.yaml | QA verification results | Using VERIFICATION.yaml section |

---

## 6. Summary

### Key Problems

1. **Token Waste**: ~300,000+ tokens per story wasted on re-reading the same files
2. **No Evidence Bundle**: Each phase re-discovers what was done
3. **Markdown Over YAML**: Artifacts are prose-heavy, requiring parsing
4. **No Skip Logic**: Phases always run full even if artifacts exist
5. **Knowledge Context Not Persisted**: Lessons/ADRs queried repeatedly

### Recommended Changes

1. **Introduce EVIDENCE.yaml** as single source of truth
2. **Persist KNOWLEDGE-CONTEXT.yaml** once per story
3. **Convert key artifacts to YAML** for machine readability
4. **Pass summaries between phases** instead of full file re-reads
5. **Implement skip logic** based on existing artifacts
6. **Reduce model usage** - haiku for setup/aggregation, sonnet only for reasoning

---

## Appendix: File Paths

### Commands
- `.claude/commands/dev-implement-story.md`
- `.claude/commands/dev-code-review.md`
- `.claude/commands/dev-fix-story.md`
- `.claude/commands/qa-verify-story.md`

### Agents
- `.claude/agents/commitment-gate-agent.agent.md`
- `.claude/agents/dev-setup-leader.agent.md`
- `.claude/agents/dev-implement-planning-leader.agent.md`
- `.claude/agents/dev-implement-planner.agent.md`
- `.claude/agents/dev-implement-plan-validator.agent.md`
- `.claude/agents/dev-implement-implementation-leader.agent.md`
- `.claude/agents/dev-implement-backend-coder.agent.md`
- `.claude/agents/dev-implement-frontend-coder.agent.md`
- `.claude/agents/dev-verification-leader.agent.md`
- `.claude/agents/dev-documentation-leader.agent.md`
- `.claude/agents/code-review-lint.agent.md`
- `.claude/agents/code-review-style-compliance.agent.md`
- `.claude/agents/code-review-syntax.agent.md`
- `.claude/agents/code-review-security.agent.md`
- `.claude/agents/code-review-typecheck.agent.md`
- `.claude/agents/code-review-build.agent.md`
- `.claude/agents/dev-fix-fix-leader.agent.md`
- `.claude/agents/qa-verify-setup-leader.agent.md`
- `.claude/agents/qa-verify-verification-leader.agent.md`
- `.claude/agents/qa-verify-completion-leader.agent.md`
- `.claude/agents/knowledge-context-loader.agent.md`
- `.claude/agents/kb-writer.agent.md`

### Shared
- `.claude/agents/_token-logging.md`
- `.claude/agents/_shared/story-context.md`
- `.claude/agents/_shared/permissions.md`
