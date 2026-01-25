---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
type: utility-skill
permission_level: read-only
---

# /precondition-check STORY-ID --command=X [options]

Validate preconditions before starting a workflow phase.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `STORY-ID` | Yes | Story identifier (e.g., STORY-007, WRKF-1020) |
| `--command=X` | Yes | The command to validate preconditions for |
| `--status=X` | No | Required story status |
| `--requires=FILE1,FILE2` | No | Required artifact files |
| `--in-stage=X` | No | Required stage directory |

## Purpose

Standardized precondition checking for all setup leaders. Ensures:
- Story exists
- Story is in correct status
- Required artifacts are present
- Story is in expected stage directory

Returns structured pass/fail with specific failure reasons.

## Output Format

### All Checks Pass

```yaml
story: {STORY-ID}
command: {COMMAND}
verdict: PASS
checks:
  story_exists: true
  status_valid: true
  stage_correct: true
  artifacts_present: true
details:
  story_path: plans/stories/{STAGE}/{STORY-ID}/{STORY-ID}.md
  current_status: {STATUS}
  current_stage: {STAGE}
```

### Check Fails

```yaml
story: {STORY-ID}
command: {COMMAND}
verdict: FAIL
checks:
  story_exists: true
  status_valid: false
  stage_correct: true
  artifacts_present: false
failures:
  - check: status_valid
    expected: ready-to-work
    actual: backlog
    message: "Story status must be ready-to-work"
  - check: artifacts_present
    missing:
      - ELAB-{STORY-ID}.md
    message: "Required artifact ELAB file not found"
```

## Precondition Sets by Command

### `/dev-implement-story`

```yaml
--command=dev-implement-story
--status=ready-to-work
--in-stage=ready-to-work
--requires=ELAB-{STORY-ID}.md
```

Checks:
1. Story file exists
2. Status is `ready-to-work`
3. In `ready-to-work/` directory
4. ELAB file exists with passing verdict

### `/elab-story`

```yaml
--command=elab-story
--status=backlog,generated
--in-stage=backlog
```

Checks:
1. Story file exists
2. Status is `backlog` or `generated`
3. In `backlog/` directory

### `/qa-verify-story`

```yaml
--command=qa-verify-story
--status=ready-for-qa
--in-stage=in-progress
--requires=PROOF-{STORY-ID}.md,_implementation/VERIFICATION.yaml
```

Checks:
1. Story file exists
2. Status is `ready-for-qa`
3. In `in-progress/` directory
4. PROOF file exists
5. VERIFICATION.yaml exists with code_review.verdict: PASS

### `/dev-code-review`

```yaml
--command=dev-code-review
--status=in-progress
--in-stage=in-progress
--requires=PROOF-{STORY-ID}.md
```

Checks:
1. Story file exists
2. Status is `in-progress`
3. PROOF file exists

### `/ui-ux-review`

```yaml
--command=ui-ux-review
--in-stage=in-progress,QA
--requires=PROOF-{STORY-ID}.md
```

Checks:
1. Story file exists
2. PROOF file exists
3. Story touches UI (check scope)

### `/pm-generate-story`

```yaml
--command=pm-generate-story
--status=pending
```

Checks:
1. Story entry exists in index
2. Status is `pending`

## Execution Steps

### 1. Find Story

Search all stage directories for `{STORY-ID}/`.

If not found: `FAIL: Story not found`

### 2. Check Stage (if --in-stage)

Verify story is in expected stage directory.

```yaml
# If --in-stage=in-progress but found in backlog/
FAIL: Story in wrong stage
expected: in-progress
actual: backlog
```

### 3. Check Status (if --status)

Read frontmatter, verify status matches.

```yaml
# If --status=ready-to-work but status is backlog
FAIL: Invalid status
expected: ready-to-work
actual: backlog
```

### 4. Check Artifacts (if --requires)

For each required file, check existence:
- `{STORY-ID}.md` → `{base}/{STORY-ID}.md`
- `PROOF-{STORY-ID}.md` → `{base}/PROOF-{STORY-ID}.md`
- `ELAB-{STORY-ID}.md` → `{base}/ELAB-{STORY-ID}.md`
- `_implementation/X` → `{base}/_implementation/X`
- `_pm/X` → `{base}/_pm/X`

### 5. Custom Checks (command-specific)

Some commands need additional checks:

**For qa-verify-story:**
- Parse `VERIFICATION.yaml`
- Check `code_review.verdict: PASS`

**For ui-ux-review:**
- Scan story scope for UI indicators
- Return SKIPPED verdict if no UI

### 6. Return Result

Structured YAML (see Output Format above).

## Signal

- `PRECONDITIONS MET` - All checks pass
- `PRECONDITIONS FAILED: <summary>` - One or more checks failed

## Integration Points

Called at start of every setup leader:
- `dev-setup-leader`
- `elab-setup-leader`
- `qa-verify-setup-leader`
- `ui-ux-review-setup-leader`
- `pm-harness-setup-leader`
- `pm-bootstrap-setup-leader`

## Example Usage

```bash
# Check dev-implement preconditions
/precondition-check WRKF-1021 --command=dev-implement-story

# Check QA preconditions with explicit requirements
/precondition-check WRKF-1021 --command=qa-verify-story \
  --status=ready-for-qa \
  --requires=PROOF-WRKF-1021.md

# Check elaboration preconditions
/precondition-check WRKF-1021 --command=elab-story \
  --status=backlog \
  --in-stage=backlog
```

## Error Handling

| Error | Behavior |
|-------|----------|
| Story not found | FAIL with "Story not found" |
| File read error | FAIL with "Cannot read {file}" |
| Invalid command | FAIL with "Unknown command" |
| Invalid stage | FAIL with "Invalid stage name" |
