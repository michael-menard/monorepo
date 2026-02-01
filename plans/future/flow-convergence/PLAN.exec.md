---
doc_type: plan_exec
title: "FLOW — Execution Plan"
status: active
story_prefix: "FLOW"
created_at: "2026-01-31T00:00:00Z"
updated_at: "2026-01-31T00:00:00Z"
tags:
  - workflow
  - langraph
  - metrics
  - convergence
---

# FLOW — Execution Plan

## Story Prefix

All stories use the **FLOW** prefix. Commands use the full prefixed ID:

```bash
/elab-story FLOW-001
/dev-implement-story FLOW-001
/qa-verify-story FLOW-001
```

---

## Story Workflow

Stories progress through the following stages:

```
backlog/FLOW-XXX/
    ↓ (elab-story)
elaboration/FLOW-XXX/
    ↓ (story ready)
ready-to-work/FLOW-XXX/
    ↓ (dev-implement-story)
in-progress/FLOW-XXX/
    ↓ (dev complete)
UAT/FLOW-XXX/
    ↓ (qa-verify-story)
[completed]
```

---

## Artifact Rules

- Each story outputs artifacts under: `plans/future/flow-convergence/{stage}/FLOW-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

---

## Artifact Naming Convention

| Artifact | Filename | Stage |
|----------|----------|-------|
| Story file | `FLOW-XXX.md` | All |
| Elaboration | `ELAB-FLOW-XXX-{TIMESTAMP}.md` | elaboration/ |
| Proof | `PROOF-FLOW-XXX-{TIMESTAMP}.md` | ready-to-work/ |
| Code Review | `CODE-REVIEW-FLOW-XXX-{TIMESTAMP}.md` | in-progress/ |
| QA Verify | `QA-VERIFY-FLOW-XXX-{TIMESTAMP}.md` | UAT/ |
| QA Gate | `QA-GATE-FLOW-XXX-{TIMESTAMP}.yaml` | UAT/ |

Timestamp format: `YYYYMMDD-HHMM` (America/Denver)

---

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

### Token Budget Template

```markdown
## Token Budget

### Phase Summary

| Phase | Estimated | Actual | Delta | Notes |
|-------|-----------|--------|-------|-------|
| Elaboration | ~15k | — | — | — |
| Implementation | ~50k | — | — | — |
| Code Review | ~20k | — | — | — |
| QA Verify | ~15k | — | — | — |
| **Total** | ~100k | — | — | — |

### Actual Measurements

| Date | Phase | Before | After | Delta | Notes |
|------|-------|--------|-------|-------|-------|
```

---

## Critical Acceptance Rules

### Reuse Gate (Required for QA PASS)

For each story:
- **PM story doc** MUST include: `## Reuse Plan`
  - List all packages being reused
  - Document why reuse was appropriate
  - List any package extensions or new capabilities added

- **Dev proof** MUST include: `## Reuse Verification`
  - Confirm all planned reuse was implemented
  - Document any deviations from plan
  - List actual files/packages touched

### Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

---

## Elaboration Workflow

### Phase Contract Framework

All elaboration must follow explicit phase contracts:

| Phase | Expected Churn | Cost Range | Ownership |
|-------|---|---|---|
| Initial Elaboration | 30-50% | 15-25k tokens | PM + Tech Lead |
| Gap Analysis | 20-30% | 10-15k tokens | PM + Specialists |
| Delta Elaboration | 5-10% | 5-10k tokens | PM (focused review only) |

### Delta-Only Elaboration

- After initial elaboration, review ONLY changed sections
- Document what changed and why
- Use escape hatch when cross-cutting concerns detected

### Escape Hatch Triggers

Triggers for full re-review despite delta-only approach:
- Changes affecting >3 acceptance criteria
- Architectural or dependency changes
- Downstream impacts on other stories
- Risk assessment indicates missing context

---

## Commitment Gate

Stories cannot enter development until:

| Criterion | Requirement |
|-----------|-------------|
| Readiness Score | ≥ 85 |
| Blockers | = 0 |
| Unknowns | ≤ 5 (and documented) |
| Acceptance Criteria | ≥ 3 and clear |
| Reuse Plan | Complete and reviewed |

---

## Implementation Tracks

### Track 1: Claude Code Workflow Updates (FLOW-001 series)

Stories FLOW-001 through FLOW-017 update workflow infrastructure:

```
.claude/
├── commands/
│   ├── pm-story.md (+ Reality Intake integration)
│   ├── dev-implement-story.md (+ Commitment Gate)
│   └── new: story-creation-flow.md
├── agents/
│   ├── new: reality-intake-agent.agent.md
│   ├── new: pm-story-seed-agent.agent.md
│   ├── new: story-fanout-pm.agent.md
│   ├── new: story-fanout-ux.agent.md
│   ├── new: story-fanout-qa.agent.md
│   ├── new: story-attack-agent.agent.md
│   ├── new: story-synthesize-agent.agent.md
│   ├── elab-*.agent.md (delta-only updates)
│   └── new: commitment-gate-validator.agent.md
└── nodes/
    └── new: metrics/ (for metrics infrastructure)
```

### Track 2: LangGraph Implementation (FLOW-021+ series)

Stories FLOW-021 through FLOW-044 build graph infrastructure:

```
packages/backend/orchestrator/
├── nodes/
│   ├── reality/
│   │   ├── load-baseline.ts
│   │   └── retrieve-context.ts
│   ├── story/
│   │   ├── seed.ts
│   │   ├── fanout-pm.ts
│   │   ├── fanout-ux.ts
│   │   ├── fanout-qa.ts
│   │   ├── attack.ts
│   │   ├── gap-hygiene.ts
│   │   ├── readiness-score.ts
│   │   └── synthesize.ts
│   ├── elaboration/
│   │   ├── delta-detect.ts
│   │   ├── delta-review.ts
│   │   └── escape-hatch.ts
│   ├── gates/
│   │   └── commitment-gate.ts
│   └── metrics/
│       ├── collect-events.ts
│       ├── calc-ttdc.ts
│       ├── calc-pcar.ts
│       ├── count-turns.ts
│       ├── calc-churn.ts
│       ├── track-leakage.ts
│       └── gap-analytics.ts
└── graphs/
    ├── story-creation.ts
    ├── elaboration.ts
    └── metrics.ts
```

---

## Quality Gates

All stories must pass:

1. **Code Quality**
   - TypeScript strict mode
   - ESLint with no errors
   - Prettier formatting

2. **Testing**
   - Unit tests for new logic (>45% coverage)
   - Integration tests for workflow changes
   - E2E tests for user-facing changes

3. **Documentation**
   - Clear README for new packages
   - Inline comments for complex logic
   - Agent Log properly maintained

4. **Reuse**
   - Reuse Plan completed
   - Reuse Verification completed

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-31T00:00:00Z | pm-bootstrap-generation-leader | Phase 2: Generated execution plan | PLAN.exec.md |

---
