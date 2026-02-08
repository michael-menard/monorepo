---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
type: orchestrator
agents: ["workflow-retro.agent.md"]
story_id: WKFL-001
---

/workflow-retro {STORY_ID} [--batch] [--scope=epic] [--days=N]

Analyze completed story outcomes and generate workflow improvement proposals.

## Usage

```bash
/workflow-retro WISH-2045                         # Single story retro
/workflow-retro --batch                           # All completions last 30 days
/workflow-retro --batch --days=7                  # Completions last 7 days
/workflow-retro --scope=epic plans/future/wishlist  # All done stories in epic
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `STORY_ID` | No* | Story ID to analyze (required unless --batch or --scope) |
| `--batch` | No | Analyze all recently completed stories |
| `--scope=epic` | No | Analyze all done stories in specified epic |
| `--days=N` | No | Days to look back for batch mode (default: 30) |
| `--feature-dir` | No | Feature directory path (auto-detected if possible) |

*At least one of STORY_ID, --batch, or --scope is required.

---

## Modes

### Single Story Mode

```bash
/workflow-retro WISH-2045
```

Analyze one completed story:
1. Locate story in `done/` directory
2. Read OUTCOME.yaml, story.yaml, TOKEN-LOG.md
3. Calculate token variance, review cycles, phase metrics
4. Generate RETRO-{STORY_ID}.yaml
5. Query KB for related patterns
6. Update WORKFLOW-RECOMMENDATIONS.md if significant patterns found

### Batch Mode

```bash
/workflow-retro --batch --days=14
```

Analyze all stories completed in time range:
1. Scan all feature directories for `done/` stories
2. Filter by completion date (from OUTCOME.yaml)
3. Aggregate patterns across stories
4. Detect cross-story correlations
5. Log significant patterns to KB
6. Generate comprehensive WORKFLOW-RECOMMENDATIONS.md

### Epic Scope Mode

```bash
/workflow-retro --scope=epic plans/future/wishlist
```

Analyze all completed stories in one epic:
1. Scan `{feature_dir}/done/` for all stories
2. Build epic-specific patterns
3. Compare to cross-epic baselines (if available)
4. Generate epic-focused recommendations

---

## Output

### Single Story

| File | Location | Description |
|------|----------|-------------|
| `RETRO-{STORY_ID}.yaml` | `{story_dir}/_implementation/` | Story-level analysis |

### Batch/Epic

| File | Location | Description |
|------|----------|-------------|
| `RETRO-{STORY_ID}.yaml` | Per story | Individual analyses |
| `WORKFLOW-RECOMMENDATIONS.md` | `plans/future/workflow-learning/` | Aggregate proposals |
| KB entries | Knowledge Base | Patterns meeting thresholds |

---

## Spawns

This command spawns:

```yaml
agent: workflow-retro.agent.md
model: sonnet
mode: bypassPermissions  # Read-only analysis + KB writes
inputs:
  story_ids: ["{STORY_ID}"] | detected from scope
  feature_dir: "{FEATURE_DIR}" | detected
  scope: single | batch | epic
  time_range: "{DAYS} days" | null
```

---

## Pattern Detection Thresholds

Patterns must meet these thresholds to be logged to KB:

| Pattern Type | Minimum Occurrences | Minimum Variance |
|--------------|---------------------|------------------|
| Token overrun | 3 stories | 20% |
| Review failure | 3 stories | N/A |
| Agent correlation | 3 stories | 60% |
| AC failure rate | 3 stories | 40% |

---

## Prerequisites

Story must be in `done/` directory with:
- `_implementation/OUTCOME.yaml` - Required
- `story.yaml` - Required
- `_implementation/TOKEN-LOG.md` - Optional but recommended

If OUTCOME.yaml is missing, the retro will skip that story with a warning.

---

## Examples

### Analyze Single Story

```bash
/workflow-retro WISH-2045
```

Output:
```
RETROSPECTIVE COMPLETE: 2 patterns detected, 0 KB entries created
- Token variance: +15% (below threshold)
- Review cycles: 2 (at baseline)
- RETRO-WISH-2045.yaml created
```

### Batch Analysis with Findings

```bash
/workflow-retro --batch --days=30
```

Output:
```
RETROSPECTIVE COMPLETE: 5 patterns detected, 2 KB entries created

High Priority Patterns:
1. Token Budget: Integration stories exceed budget by 32% (5 stories)
   → KB entry created: kb_retro_001

2. Review Failure: routes.ts fails lint in 63% of stories (5/8)
   → KB entry created: kb_retro_002

Medium Priority Patterns:
3. Agent Correlation: backend-coder → security-review at 75%

WORKFLOW-RECOMMENDATIONS.md updated with proposals.
```

---

## Integration

### Trigger After Story Completion

The retro can be manually run after each story, or configured to auto-trigger:

```yaml
# Future: Hook configuration
hooks:
  post_qa_gate:
    - /workflow-retro {STORY_ID}
```

### Feed Into Calibration

RETRO-{STORY_ID}.yaml files are consumed by:
- Calibration agent (WKFL-002) for budget adjustment
- Pattern miner (WKFL-006) for cross-epic analysis

---

## Related Commands

| Command | Description |
|---------|-------------|
| `/story-status` | Check story location/status |
| `/token-report` | Generate token summary for story |
| `/qa-gate` | QA gate decision (produces data for retro) |
