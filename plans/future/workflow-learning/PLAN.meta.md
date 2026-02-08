# WKFL Meta Documentation

## Architecture Principles

### 1. Data Before Intelligence

Every learning component depends on quality data capture. The foundation phase (WKFL-001, WKFL-004, WKFL-005) establishes consistent data before any analysis or adaptation.

```
WRONG: Build pattern miner → realize we don't have good data
RIGHT: Build outcome capture → accumulate data → build pattern miner
```

### 2. Proposals Over Auto-Changes

All learning outputs are proposals first. No automatic modification of:
- Agent prompts
- Workflow configuration
- Decision thresholds
- Documentation

Human approval required for all changes, tracked in KB.

### 3. Compounding Knowledge

Each component adds to shared knowledge:
- Retro → lessons
- Feedback → calibration data
- Patterns → agent hints
- Experiments → validated changes

The KB is the central nervous system.

### 4. Graceful Degradation

Learning components are optional enhancements:
- Workflow works without retro running
- Predictions are advisory, not blocking
- Calibration informs but doesn't override

No learning component can break core workflow.

### 5. Measurable Impact

Every component has success metrics:
- Before/after comparisons
- Statistical significance requirements
- Rollback triggers if metrics degrade

## Component Relationships

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     STORY EXECUTION                          │
│   PM → Elab → Dev → Review → QA Verify → QA Gate → Merge    │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │       OUTCOME.yaml        │
                    │   (tokens, cycles, etc)   │
                    └─────────────┬─────────────┘
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
    ▼                             ▼                             ▼
┌───────────┐             ┌───────────┐             ┌───────────┐
│ WKFL-001  │             │ WKFL-004  │             │ WKFL-005  │
│   Retro   │             │ Feedback  │             │ Doc Sync  │
└─────┬─────┘             └─────┬─────┘             └───────────┘
      │                         │
      │     ┌───────────────────┤
      │     │                   │
      ▼     ▼                   ▼
┌───────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE BASE                           │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐│
│  │ Lessons │ │Decisions │ │Feedback │ │ Patterns │ │Calibra-││
│  │         │ │          │ │         │ │          │ │tion    ││
│  └─────────┘ └──────────┘ └─────────┘ └──────────┘ └────────┘│
└───────────────────────────────┬───────────────────────────────┘
                                │
    ┌───────────────────────────┼───────────────────────────────┐
    │               │           │           │                   │
    ▼               ▼           ▼           ▼                   ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ WKFL-002  │ │ WKFL-006  │ │ WKFL-008  │ │ WKFL-003  │ │ WKFL-009  │
│Calibration│ │ Patterns  │ │Experiments│ │Heuristics │ │ Compress  │
└─────┬─────┘ └─────┬─────┘ └───────────┘ └─────┬─────┘ └───────────┘
      │             │                           │
      │             │                           │
      ▼             ▼                           ▼
┌───────────┐ ┌───────────┐             ┌───────────────────────────┐
│ WKFL-007  │ │ WKFL-010  │             │   CONFIGURATION CHANGES   │
│Risk Pred. │ │ Proposals │──proposals──│  (human-approved only)    │
└───────────┘ └───────────┘             └───────────────────────────┘
```

### KB Categories

| Category | Writers | Readers |
|----------|---------|---------|
| `lesson` | WKFL-001, existing | WKFL-006, all agents |
| `feedback` | WKFL-004 | WKFL-002, WKFL-003 |
| `calibration` | WKFL-002 | WKFL-003, WKFL-010 |
| `pattern` | WKFL-006 | WKFL-007, all agents |
| `experiment` | WKFL-008 | WKFL-010 |
| `proposal` | WKFL-010 | Humans |

## Package Boundaries

### New Packages (if needed)

```
packages/
  backend/
    workflow-learning/           # New package for learning logic
      src/
        outcome/                  # Outcome capture and schema
        calibration/              # Calibration calculation
        patterns/                 # Pattern mining algorithms
        experiments/              # Experiment framework
        proposals/                # Proposal generation
```

### Integration Points

| From | To | Method |
|------|----|--------|
| dev-documentation-leader | OUTCOME.yaml | Direct write |
| /wt-finish | workflow-retro | Task spawn |
| /feedback | KB | `kb_add` |
| pattern-miner | AGENT-HINTS.yaml | Direct write |
| risk-predictor | pm-story output | Merge into YAML |

## Schema Evolution

### OUTCOME.yaml v1 → v2 Migration Path

```yaml
# v1 (initial)
story_id: WISH-001
phases:
  pm_story: { tokens: 12000 }

# v2 (add predictions for validation)
story_id: WISH-001
predictions:
  split_risk: 0.3
  review_cycles: 2
  token_estimate: 150000
actuals:
  split: false
  review_cycles: 3
  tokens: 167000
phases:
  pm_story: { tokens: 12000 }
```

Migration: Add `predictions` and `actuals` sections, leave `phases` unchanged.

## Security Considerations

### KB Access Control

- All learning agents read/write to same KB
- No PII in KB entries (story IDs, not user names)
- Proposals don't include secrets or credentials

### Experiment Safety

- Experiments cannot modify production data
- Traffic splits are advisory (no enforcement)
- Rollback always available

### Proposal Review

- All proposals go through human approval
- No auto-apply, even for high-confidence changes
- Audit log of all applied proposals

## Future Considerations

### Cross-Project Learning (Not in Scope)

The current design is single-repo. Future extensions could:
- Anonymize patterns for cross-project sharing
- Create pattern marketplace
- Federated learning across teams

### LLM-Based Analysis (Potential Enhancement)

Currently using heuristic-based analysis. Could enhance with:
- Embedding-based pattern similarity
- LLM-powered proposal generation
- Natural language queries over KB

### Real-Time Learning (Not in Scope)

Current design is batch-oriented (weekly/monthly). Real-time would require:
- Streaming outcome capture
- Incremental calibration updates
- Online experiment analysis

## Glossary

| Term | Definition |
|------|------------|
| Calibration | Measuring stated confidence vs actual outcomes |
| Outcome | Captured metrics from story completion |
| Pattern | Recurring behavior detected across stories |
| Proposal | Suggested change to workflow, awaiting approval |
| Heuristic | Rule for auto-accepting/escalating decisions |
| Experiment | A/B test of workflow variation |
| Flywheel | Self-reinforcing improvement cycle |
