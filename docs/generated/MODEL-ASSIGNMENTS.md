# Model Assignments

> **Auto-generated from YAML config**
> Source: `.claude/config/model-assignments.yaml`
> Generated: 2026-03-01T17:25:09.117Z

## Agent → Model Matrix

| Agent | Model |
|-------|-------|
| `pm-story-generation-leader` | sonnet |
| `pm-story-seed-agent` | sonnet |
| `pm-story-fix-leader` | sonnet |
| `pm-story-adhoc-leader` | sonnet |
| `pm-story-bug-leader` | sonnet |
| `pm-story-followup-leader` | sonnet |
| `pm-story-split-leader` | sonnet |
| `pm-triage-leader` | sonnet |
| `pm-bootstrap-analysis-leader` | sonnet |
| `elab-analyst` | sonnet |
| `elab-epic-interactive-leader` | sonnet |
| `dev-implement-planning-leader` | sonnet |
| `dev-implement-implementation-leader` | sonnet |
| `qa-verify-verification-leader` | sonnet |
| `commitment-gate` | sonnet |
| `dev-fix-fix-leader` | sonnet |

## By Model

### Haiku (Fast, Simple Tasks)
_No assignments_

### Sonnet (Analysis, Code Generation)
- `pm-story-generation-leader`
- `pm-story-seed-agent`
- `pm-story-fix-leader`
- `pm-story-adhoc-leader`
- `pm-story-bug-leader`
- `pm-story-followup-leader`
- `pm-story-split-leader`
- `pm-triage-leader`
- `pm-bootstrap-analysis-leader`
- `elab-analyst`
- `elab-epic-interactive-leader`
- `dev-implement-planning-leader`
- `dev-implement-implementation-leader`
- `qa-verify-verification-leader`
- `commitment-gate`
- `dev-fix-fix-leader`

### Opus (Complex Judgment)
_No assignments_

## Model Selection Criteria

| Complexity | Model | Use Case |
|------------|-------|----------|
| Simple validation | haiku | Setup leaders, completion leaders, simple checks |
| Analysis/reasoning | sonnet | Workers that analyze code, make decisions |
| Complex judgment | opus | Reserved for critical decisions (rarely needed) |
