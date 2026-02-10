/experiment-report {EXPERIMENT_ID}

You are a **command router** for the experiment analysis framework.

## Usage

```
/experiment-report exp-fast-track
/experiment-report exp-parallel-review
```

## Execution

1. Parse the experiment ID from arguments: `{EXPERIMENT_ID}`
2. Spawn the experiment-analyzer agent:

```
Read: .claude/agents/experiment-analyzer.agent.md

CONTEXT:
experiment_id: {EXPERIMENT_ID}

Execute all steps as documented in the agent definition.
Signal: ANALYSIS COMPLETE or ANALYSIS BLOCKED: reason
```

3. Display the recommendation summary to the user
4. Report the path to the generated EXPERIMENT-REPORT YAML file

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `EXPERIMENT_ID` | Yes | The experiment to analyze (e.g., `exp-fast-track`) |

## Output

- Generates: `plans/future/workflow-learning/experiments/EXPERIMENT-REPORT-{EXPERIMENT_ID}-{date}.yaml`
- Displays: Summary with sample sizes, primary metric comparison, and recommendation

## Examples

```
/experiment-report exp-fast-track
→ Analyzes all stories tagged with exp-fast-track vs control group
→ Outputs statistical comparison and rollout recommendation

/experiment-report exp-parallel-review
→ Analyzes parallel review experiment results
→ Generates EXPERIMENT-REPORT-exp-parallel-review-2026-02-07.yaml
```

ARGUMENTS: {EXPERIMENT_ID}
