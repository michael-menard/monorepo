# Workflow Learning System (WKFL Epic)

## Vision

Transform the development workflow from a static process into a self-improving learning system that gets smarter with every story completed.

## Problem Statement

The current workflow:
- Generates massive signal (outcomes, tokens, cycles, failures) but doesn't systematically learn from it
- Has hand-tuned heuristics that don't adapt to observed patterns
- Relies on manual documentation updates that drift from reality
- Lacks calibration for agent confidence levels
- Doesn't surface improvement opportunities proactively

## Solution

A 10-component learning system that creates a flywheel:

```
Stories complete → Outcomes captured → Patterns mined
       ↑                                      ↓
 Agents improved ← Heuristics tuned ← Calibration updated
       ↑                                      ↓
 Workflow experiments → Winners rolled out → Better outcomes
```

## Components

| ID | Component | Description | Dependencies |
|----|-----------|-------------|--------------|
| WKFL-001 | Meta-Learning Loop | Retrospective agent that analyzes completed stories and proposes workflow changes | None |
| WKFL-002 | Confidence Calibration | Track stated vs actual confidence, auto-adjust thresholds | WKFL-001 |
| WKFL-003 | Emergent Heuristic Discovery | Mine decision outcomes to evolve autonomy tiers | WKFL-002 |
| WKFL-004 | Human Feedback Capture | `/feedback` command to capture explicit human judgment | None |
| WKFL-005 | Doc Sync Agent | Auto-update FULL_WORKFLOW.md from agent/command changes | None |
| WKFL-006 | Cross-Story Pattern Mining | Weekly job to distill patterns across all stories | WKFL-001 |
| WKFL-007 | Story Risk Predictor | Predict split risk, review cycles, token cost before elaboration | WKFL-006 |
| WKFL-008 | Workflow Experimentation | A/B test workflow variations with metrics | WKFL-001 |
| WKFL-009 | Knowledge Compressor | Cluster and deduplicate KB entries monthly | WKFL-006 |
| WKFL-010 | Improvement Proposal Generator | Proactively suggest workflow improvements | WKFL-006, WKFL-002 |

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Gate pass rate (first attempt) | ~70% | 85%+ | VERIFICATION.yaml outcomes |
| Rework cycles per story | 2.1 | <1.5 | Checkpoint iteration counts |
| Token cost per story | ~180K | -30% | TOKEN-LOG.md aggregation |
| Agent confidence accuracy | Unknown | >90% for "high" | Calibration tracking |
| Doc drift (manual edits needed) | Weekly | Monthly | Git history analysis |
| Time to identify anti-patterns | Manual | <7 days | Pattern miner runs |

## Technical Approach

### Data Layer

All learning requires consistent data capture:

```yaml
# New: _implementation/OUTCOME.yaml (written at story completion)
story_id: WISH-2045
completed_at: 2026-02-06T15:00:00Z

phases:
  pm_story:
    tokens: 12340
    duration_ms: 45000

  elaboration:
    tokens: 8900
    duration_ms: 32000
    verdict: PASS
    cycles: 1

  dev_implementation:
    tokens: 156000
    duration_ms: 890000
    review_cycles: 2
    findings_by_agent:
      code-review-security: 3
      code-review-lint: 1

  qa_verify:
    tokens: 23000
    verdict: PASS

  qa_gate:
    verdict: PASS
    concerns: 0

decisions:
  auto_accepted: 8
  escalated: 1
  overridden: 0
  deferred: 2

human_feedback: []  # Populated via /feedback command
```

### Agent Enhancements

Each learning component adds new agents:

| Component | New Agents | Model |
|-----------|-----------|-------|
| WKFL-001 | `workflow-retro.agent.md` | sonnet |
| WKFL-002 | `confidence-calibrator.agent.md` | haiku |
| WKFL-003 | `heuristic-evolver.agent.md` | sonnet |
| WKFL-004 | (command only, no agent) | — |
| WKFL-005 | `doc-sync.agent.md` | haiku |
| WKFL-006 | `pattern-miner.agent.md` | sonnet |
| WKFL-007 | `risk-predictor.agent.md` | haiku |
| WKFL-008 | `experiment-analyzer.agent.md` | sonnet |
| WKFL-009 | `kb-compressor.agent.md` | haiku |
| WKFL-010 | `improvement-proposer.agent.md` | sonnet |

### Integration Points

```
                    ┌─────────────────────────────────────────┐
                    │          Story Lifecycle                │
                    │  PM → Elab → Dev → Review → QA → Merge  │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │         OUTCOME.yaml                    │
                    │  (captured at story completion)          │
                    └─────────────────┬───────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  WKFL-001       │        │  WKFL-004       │        │  WKFL-005       │
│  Retro Agent    │        │  Feedback       │        │  Doc Sync       │
│  (per story)    │        │  (on demand)    │        │  (on file change)│
└────────┬────────┘        └────────┬────────┘        └─────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Knowledge Base                                   │
│  lessons | decisions | calibration | feedback | patterns                 │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  WKFL-002       │        │  WKFL-006       │        │  WKFL-008       │
│  Calibration    │        │  Pattern Miner  │        │  Experiments    │
│  (weekly)       │        │  (weekly)       │        │  (continuous)   │
└────────┬────────┘        └────────┬────────┘        └────────┬────────┘
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  WKFL-003       │        │  WKFL-007       │        │  WKFL-009       │
│  Heuristics     │        │  Risk Predictor │        │  KB Compress    │
│  (on calibration)│       │  (on patterns)  │        │  (monthly)      │
└────────┬────────┘        └─────────────────┘        └─────────────────┘
         │
         ▼
┌─────────────────┐
│  WKFL-010       │
│  Proposals      │
│  (weekly)       │
└─────────────────┘
```

## Implementation Phases

### Phase 1: Foundation (WKFL-001, WKFL-004, WKFL-005)
- Capture outcomes consistently
- Enable human feedback loop
- Keep docs in sync
- **No learning yet, just data capture**

### Phase 2: Analysis (WKFL-002, WKFL-006)
- Start analyzing captured data
- Mine patterns across stories
- Calculate calibration scores
- **Learning starts, but no auto-changes**

### Phase 3: Adaptation (WKFL-003, WKFL-007, WKFL-009)
- Evolve heuristics based on data
- Predict story risk
- Compress knowledge base
- **System starts self-improving**

### Phase 4: Experimentation (WKFL-008, WKFL-010)
- A/B test workflow changes safely
- Generate improvement proposals
- **Full learning flywheel active**

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Over-automation breaks quality | All auto-changes are proposals first, human approves |
| Calibration drift | Weekly reports, hard floors on thresholds |
| KB bloat from noise | Deduplication + monthly compression |
| Experiments pollute data | Clear experiment tagging, control group always exists |
| Runaway self-modification | Version control on all config, easy rollback |

## Non-Goals

- Replace human judgment on architecture decisions
- Auto-merge without gate PASS
- Modify production systems without approval
- Learn across different projects (single-repo focus)

## Open Questions

1. Should calibration be per-agent or per-agent-per-domain?
2. What's the minimum sample size for pattern mining (10 stories? 20?)
3. Should experiments have automatic rollout or always require approval?
4. How long to retain raw outcome data before archiving?

## References

- Current workflow: `docs/FULL_WORKFLOW.md` (v2.25.0)
- KB integration: `.claude/agents/_shared/kb-integration.md`
- Expert intelligence: `.claude/agents/_shared/expert-intelligence.md`
- Autonomy tiers: `.claude/agents/_shared/autonomy-tiers.md`
