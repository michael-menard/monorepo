# LERN — Learning & Self-Optimization

## Goal

Close the loop: observe outcomes, detect regressions, propose changes, test them, promote winners. This is the "brain" that makes the system get smarter with every story completed.

## Dependencies

- **INFRA epic:** Event backbone for data (step_completed, gap_found, etc.)
- **MODL epic:** Model selector for model-agnostic execution (Task Contracts)
- **WKFL-001 (completed):** Retro agent + OUTCOME.yaml capture
- **WKFL-004 (completed):** Human feedback via `/feedback`

## What "Learning" Means

Not model training. It means **closing the loop**:

1. Observe outcomes (events + workflow artifacts)
2. Detect regressions/opportunities
3. Propose a change (prompt, guardrail, workflow, model, tool)
4. Test the change (A/B via flags or canary)
5. Promote if better; rollback if worse
6. Log the decision + evidence

## Components

```
OUTCOME.yaml + Events
    |
    +---> Confidence Calibration (LERN-001) ---> Threshold adjustments
    |
    +---> Pattern Mining (LERN-002) ---> Anti-patterns, agent hints
    |         |
    |         +---> KB Compression (LERN-003) ---> Clean knowledge base
    |
    +---> Heuristic Discovery (LERN-004) ---> Autonomy tier proposals
    |
    +---> Risk Predictor (LERN-005) ---> Story complexity forecasts
    |
    +---> Improvement Proposals (LERN-006) ---> Prioritized changes
    |
    +---> Workflow Experiments (LERN-007) ---> A/B tests + replay
```

All components run through Task Contracts (from MODL epic) — no hard-coded models.

## Learning Events (emitted via INFRA SDK)

| Event | When |
|-------|------|
| `workflow.experiment_assigned` | Run uses a prompt/model/workflow variant |
| `workflow.evaluation_recorded` | Quality score + rubric applied |
| `workflow.improvement_proposed` | Change suggestion generated |
| `workflow.improvement_applied` | Change shipped |
| `workflow.rollback` | Change reverted |
| `workflow.feedback` | Manual thumbs up/down |

## Weekly Self-Improvement Job

Minimal automated cycle:
1. Pull last 7 days of events
2. Summarize: top churn edges, missed requirement sources, expensive steps, regressions
3. Generate 3 improvement proposals
4. Define experiment flag + success criteria for each
5. Track results next week

## Replay Harness

Store per run:
- `run_id`, `workflow_name`, `agent_role`
- Input snapshot (IDs, config, prompt_version, experiment flags)
- Outputs (decisions, plans, ranked lists)
- Evaluation score (rubric)
- Cost + tokens

Replay flow: select prior run → re-run with new variant → compare quality/cost → promote or rollback.
