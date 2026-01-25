# Dev Implement Reference

Reference documentation for the `/dev-implement-story` workflow.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (thin)                      │
│  - Reads story ID                                           │
│  - Spawns phase leaders in sequence                         │
│  - Checks phase completion signals                          │
│  - ~80 lines                                                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Setup Leader  │     │ Planning      │     │ Implementation│
│ (Phase 0)     │     │ Leader        │     │ Leader        │
│               │     │ (Phase 1)     │     │ (Phase 2)     │
│ - Validate    │     │               │     │               │
│ - Move story  │     │ ┌──────────┐  │     │ ┌──────────┐  │
│ - Update idx  │     │ │ Planner  │  │     │ │ Backend  │──┼──► Contracts
│ - Write scope │     │ └────┬─────┘  │     │ └──────────┘  │    (after)
│               │     │      │        │     │ ┌──────────┐  │
│               │     │ ┌────▼─────┐  │     │ │ Frontend │  │
│               │     │ │Validator │  │     │ └──────────┘  │
│               │     │ └──────────┘  │     │   (parallel)  │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
        ┌───────────────────────────────────────────┘
        ▼
┌───────────────┐     ┌───────────────┐
│ Verification  │     │ Documentation │
│ Leader        │     │ Leader        │
│ (Phase 3)     │     │ (Phase 4)     │
│               │     │               │
│ ┌──────────┐  │     │ ┌──────────┐  │
│ │ Verifier │  │     │ │ Proof    │  │
│ └──────────┘  │     │ └──────────┘  │
│ ┌──────────┐  │     │ ┌──────────┐  │
│ │Playwright│  │     │ │Learnings │  │
│ └──────────┘  │     │ └──────────┘  │
│  (parallel)   │     │  (sequential) │
└───────────────┘     └───────────────┘
```

---

## Execution Flow

```
Phase 0 (Setup Leader)
       │
       ▼
Phase 1: Planning Leader
       │
       ├── Planner Worker
       │
       └── Validator Worker
       │
       ▼
Phase 2: Implementation Leader
       │
       ├── Backend Worker ──► Contracts Worker
       │         ↓
       └── Frontend Worker
       │   (parallel, Contracts after Backend)
       │
       ▼
Phase 3: Verification Leader
       │
       ├── Verifier Worker
       │
       └── Playwright Worker
       │   (parallel)
       │
       ▼
Phase 4: Documentation Leader
       │
       ├── Proof Writer
       │
       ├── Learnings Worker
       │
       └── Status Updates
       │
       ▼
DONE → /dev-code-review STORY-XXX
```

---

## Phase Leaders

| Phase | Leader | Workers | Completion Signal |
|-------|--------|---------|-------------------|
| 0 | `dev-implement-setup-leader.agent.md` | (self-contained) | `SETUP COMPLETE` |
| 1 | `dev-implement-planning-leader.agent.md` | Planner → Validator | `PLANNING COMPLETE` |
| 2 | `dev-implement-implementation-leader.agent.md` | Backend + Frontend → Contracts | `IMPLEMENTATION COMPLETE` |
| 3 | `dev-implement-verification-leader.agent.md` | Verifier + Playwright | `VERIFICATION COMPLETE` |
| 4 | `dev-implement-documentation-leader.agent.md` | Proof → Learnings | `DOCUMENTATION COMPLETE` |

---

## Worker Agents

| Phase | Worker | Agent File | Output |
|-------|--------|------------|--------|
| 1A | Planner | `dev-implement-planner.md` | `IMPLEMENTATION-PLAN.md` |
| 1B | Validator | `dev-implement-plan-validator.agent.md` | `PLAN-VALIDATION.md` |
| 2A | Backend Coder | `dev-implement-backend-coder.agent.md` | `BACKEND-LOG.md` |
| 2B | Frontend Coder | `dev-implement-frontend-coder.agent.md` | `FRONTEND-LOG.md` |
| 2C | Contracts | `dev-implement-contracts.md` | `CONTRACTS.md` |
| 3A | Verifier | `dev-implement-verifier.agent.md` | `VERIFICATION.md` |
| 3B | Playwright | `dev-implement-playwright.agent.md` | Appends to `VERIFICATION.md` |
| 4A | Proof Writer | `dev-implement-proof-writer.agent.md` | `PROOF-STORY-XXX.md` |
| 4B | Learnings | `dev-implement-learnings.agent.md` | `LESSONS-LEARNED.md` |

---

## Artifact Directory Structure

```
plans/stories/in-progress/STORY-XXX/
├── STORY-XXX.md                    # PM-owned story definition
├── PROOF-STORY-XXX.md              # Created by Proof Writer
└── _implementation/
    ├── SCOPE.md                    # Created by Setup Leader
    ├── IMPLEMENTATION-PLAN.md      # Created by Planner
    ├── PLAN-VALIDATION.md          # Created by Validator
    ├── BACKEND-LOG.md              # Created by Backend Coder (if backend)
    ├── FRONTEND-LOG.md             # Created by Frontend Coder (if frontend)
    ├── CONTRACTS.md                # Created by Contracts (if API)
    ├── VERIFICATION.md             # Created by Verifier
    ├── VERIFICATION-SUMMARY.md     # Created by Verification Leader
    ├── TOKEN-SUMMARY.md            # Created by Documentation Leader
    └── BLOCKERS.md                 # Created if blocked (optional)
```

---

## Completion Signals

| Signal | Meaning |
|--------|---------|
| `SETUP COMPLETE` | Phase 0 done, story moved and scope written |
| `SETUP BLOCKED: <reason>` | Precondition failed |
| `PLANNING COMPLETE` | Plan created and validated |
| `PLANNING BLOCKED: <reason>` | Planner found blocker |
| `PLANNING FAILED: <issues>` | Validator found plan issues |
| `IMPLEMENTATION COMPLETE` | All code written |
| `IMPLEMENTATION BLOCKED: <reason>` | Coder blocked or retry exhausted |
| `VERIFICATION COMPLETE` | All checks passed |
| `VERIFICATION FAILED: <summary>` | One or more checks failed |
| `DOCUMENTATION COMPLETE` | Proof written, status updated |

---

## Multi-Agent Design Patterns

### Hierarchical Decomposition
- Orchestrator → Phase Leaders → Workers
- Each layer has focused responsibility
- Reduces context per agent

### Supervisor Pattern
- Implementation Leader can retry on type errors
- Max 1 retry per worker
- Escalates to BLOCKERS.md if retry fails

### Fan-Out/Fan-In
- Phase 2: Backend + Frontend in parallel
- Phase 3: Verifier + Playwright in parallel
- Aggregation at leader level

### Blackboard Pattern
- `_implementation/` directory as shared memory
- Agents communicate via artifact files
- Each agent reads predecessors, writes own output

---

## Retry Policy

| Scenario | Retry? | Action |
|----------|--------|--------|
| Type errors (1st) | Yes | Retry with error context |
| Type errors (2nd) | No | Create BLOCKERS.md |
| Lint errors | No | Return BLOCKED |
| Build fails | No | Return FAILED |
| Tests fail | No | Return FAILED |
| Planner blocked | No | Return BLOCKED (needs human) |
| Validator invalid | No | Return FAILED (needs plan fix) |

---

## Token Logging

All agents must log token usage in this format:

```markdown
## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: file.md | input | 8,000 | ~2,000 |
| Write: output.md | output | 4,000 | ~1,000 |
| **Total** | — | 12,000 | **~3,000** |
```

Estimation: `tokens ≈ bytes / 4`

See `.claude/agents/_token-logging.md` for full specification.

---

## Enhancement History

### v2.0 - Phase Leader Pattern (Current)
- Hierarchical decomposition with 5 phase leaders
- Retry logic for type errors
- Verification aggregation
- 85% reduction in orchestrator size

### v1.0 - Original Design
- Flat orchestrator with 9 inline sub-agent prompts
- 551 lines in orchestrator command
- No retry logic
- No aggregation

---

## Troubleshooting

### Story Not Found
- Check: `plans/stories/ready-to-work/STORY-XXX/` exists
- Check: Story ID matches exactly (case-sensitive)

### QA-AUDIT Not Passed
- Run `/qa-verify STORY-XXX` first
- Check `## QA-AUDIT` section shows `PASS`

### Implementation Blocked (Type Errors)
- Check `BLOCKERS.md` for specific errors
- Manual fix required, then re-run `/dev-implement-story`

### Verification Failed
- Check `VERIFICATION-SUMMARY.md` for which check failed
- Fix the issue, then re-run from Phase 3 (not implemented yet)

### Index Not Updated
- Check glob pattern: `plans/stories/*.stories.index.md`
- Ensure story section exists: `## STORY-XXX:`
