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
| `--status=X` | No | Required story status (checked against KB state) |
| `--requires=FILE1,FILE2` | No | Required artifact files |

## Purpose

Standardized precondition checking for all setup leaders. Ensures:
- Story exists in KB
- Story is in correct KB state
- Required artifacts are present

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
  artifacts_present: true
details:
  story_path: {FEATURE_DIR}/stories/{STORY-ID}/{STORY-ID}.md
  current_status: {STATUS}
  kb_state: {KB_STATE}
```

### Check Fails

```yaml
story: {STORY-ID}
command: {COMMAND}
verdict: FAIL
checks:
  story_exists: true
  status_valid: false
  artifacts_present: false
failures:
  - check: status_valid
    expected: ready-to-work
    actual: backlog
    message: "Story KB state must be ready (ready-to-work)"
  - check: artifacts_present
    missing:
      - _implementation/ELAB.yaml
    message: "Required artifact ELAB.yaml not found"
```

## Precondition Sets by Command

### `/dev-implement-story`

```yaml
--command=dev-implement-story
--status=ready-to-work
--requires=_implementation/ELAB.yaml
```

Checks:
1. Story exists in KB with state `ready`
2. ELAB.yaml exists with `verdict: PASS` or `CONDITIONAL_PASS`

### `/elab-story`

```yaml
--command=elab-story
--status=backlog,generated
```

Checks:
1. Story exists in KB with state `backlog`

### `/qa-verify-story`

```yaml
--command=qa-verify-story
--status=ready-for-qa
--requires=_implementation/VERIFICATION.yaml
```

Checks:
1. Story exists in KB with state `ready_for_qa`
2. VERIFICATION.yaml exists with code_review.verdict: PASS

### `/dev-code-review`

```yaml
--command=dev-code-review
--status=in-progress
```

Checks:
1. Story exists in KB with state `in_progress`

### `/ui-ux-review`

```yaml
--command=ui-ux-review
```

Checks:
1. Story exists in KB
2. Story touches UI (check scope)

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

**KB-first**: Call `kb_get_story({storyId: STORY_ID})` to get authoritative state. If KB is unavailable or returns null, fall back to directory scan.

**Directory fallback**: Search for `{STORY-ID}/` in flat stories directory: `{FEATURE_DIR}/stories/{STORY_ID}/`

If not found via KB or directory: `FAIL: Story not found`

### 2. Check Status (if --status)

Use the KB `state` field (mapped to display label) from Step 1 for status comparison. KB is **required** — if KB lookup failed in Step 1, FAIL the precondition check with "KB unavailable for story state". Do NOT fall back to frontmatter status.

```yaml
# If --status=ready-to-work but KB state is backlog
FAIL: Invalid status
expected: ready-to-work (KB state: ready)
actual: backlog (KB state: backlog)
```

### 3. Check Artifacts (if --requires)

For each required file, check existence:
- `{STORY-ID}.md` → `{base}/{STORY-ID}.md`
- `_implementation/ELAB.yaml` → `{base}/_implementation/ELAB.yaml`
- `_implementation/X` → `{base}/_implementation/X`
- `_pm/X` → `{base}/_pm/X`

### 4. Custom Checks (command-specific)

Some commands need additional checks:

**For dev-implement-story:**
- Parse `_implementation/ELAB.yaml`
- Check `verdict: PASS` or `CONDITIONAL_PASS`

**For qa-verify-story:**
- Parse `VERIFICATION.yaml`
- Check `code_review.verdict: PASS`

**For ui-ux-review:**
- Scan story scope for UI indicators
- Return SKIPPED verdict if no UI

### 5. Return Result

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

# Check QA preconditions
/precondition-check WRKF-1021 --command=qa-verify-story \
  --status=ready-for-qa

# Check elaboration preconditions
/precondition-check WRKF-1021 --command=elab-story \
  --status=backlog
```

## Error Handling

| Error | Behavior |
|-------|----------|
| Story not found | FAIL with "Story not found" |
| File read error | FAIL with "Cannot read {file}" |
| Invalid command | FAIL with "Unknown command" |
| Invalid stage | FAIL with "Invalid stage name" |
