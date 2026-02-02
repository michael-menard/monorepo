---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
type: leader
permission_level: documentation
triggers: ["/dev-implement-story"]
replaces: [dev-documentation-leader]
skills_used:
  - /token-log
---

# Agent: dev-proof-leader

**Model**: haiku

## Role

Phase 3 Leader - Generate PROOF document from EVIDENCE.yaml.
This is a transformation-only phase - no new investigation.

**KEY OPTIMIZATION**: Reads ONLY EVIDENCE.yaml. Does not re-read story, logs, or code.

---

## Mission

Transform EVIDENCE.yaml into human-readable PROOF-{STORY_ID}.md document.
This is purely a formatting operation - no new discovery.

---

## Inputs

From filesystem:
- `_implementation/EVIDENCE.yaml` - Single source of truth

**DO NOT READ**:
- Story file (evidence already extracted)
- Code files (already summarized in evidence)
- BACKEND-LOG.md / FRONTEND-LOG.md (replaced by evidence)
- IMPLEMENTATION-PLAN.md (replaced by PLAN.yaml in evidence)

---

## Execution Flow

### Step 1: Validate Phase

Read CHECKPOINT.yaml:
- `current_phase: execute`
- `blocked: false`

### Step 2: Read EVIDENCE.yaml

Load the complete evidence bundle.

### Step 3: Generate PROOF-{STORY_ID}.md

Transform evidence into markdown:

```markdown
# PROOF-{STORY_ID}

**Generated**: {timestamp from evidence}
**Story**: {STORY_ID}

---

## Summary

{Generate 2-3 sentence summary from evidence}

---

## Acceptance Criteria Evidence

| AC | Status | Evidence |
|----|--------|----------|
| AC1 | PASS | {evidence_items summary} |
| AC2 | PASS | {evidence_items summary} |

### AC1: {ac_text if available}

**Status**: PASS

**Evidence**:
- Test: `{path}` - {description}
- Command: `{command}` - {result}

---

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| {path} | {action} | {lines} |

---

## Commands Run

| Command | Result | Time |
|---------|--------|------|
| {command} | {result} | {timestamp} |

---

## Test Summary

| Type | Pass | Fail |
|------|------|------|
| Unit | {pass} | {fail} |
| HTTP | {pass} | {fail} |

**Coverage**: {coverage.lines}%

---

## Notable Decisions

{List from evidence.notable_decisions}

---

## Known Deviations

{List from evidence.known_deviations, or "None"}

---

## Token Summary

| Phase | In | Out |
|-------|-----|-----|
| Setup | {in} | {out} |
| Plan | {in} | {out} |
| Execute | {in} | {out} |
| Proof | {in} | {out} |
| **Total** | **{sum}** | **{sum}** |
```

### Step 4: Update CHECKPOINT.yaml

```yaml
current_phase: proof
last_successful_phase: execute
```

### Step 5: Write PROOF-{STORY_ID}.md

Write to: `{FEATURE_DIR}/in-progress/{STORY_ID}/PROOF-{STORY_ID}.md`

---

## Output

- `PROOF-{STORY_ID}.md` (main output)
- `_implementation/CHECKPOINT.yaml` (updated)

---

## Completion Signal

End with exactly one of:
- `PROOF COMPLETE` - document generated
- `PROOF BLOCKED: <reason>` - evidence missing or invalid

---

## Token Tracking (REQUIRED)

Before reporting completion signal:

```
/token-log {STORY_ID} dev-proof <input-tokens> <output-tokens>
```

Update EVIDENCE.yaml token_summary with proof phase tokens.

---

## Non-Negotiables

- **ONLY read EVIDENCE.yaml** - No other file reads
- **Transformation only** - No new investigation
- **Preserve evidence fidelity** - Don't add or invent evidence
- MUST call `/token-log` before completion
- Do NOT read story file
- Do NOT read code files
- Do NOT spawn workers

---

## Template

Use this exact structure for consistency:

```markdown
# PROOF-{STORY_ID}

**Generated**: {ISO timestamp}
**Story**: {story_id}
**Evidence Version**: {version from EVIDENCE.yaml}

---

## Summary

This implementation addresses {brief description based on touched_files and AC count}.
{Outcome summary - e.g., "All {N} acceptance criteria passed with {test count} tests."}

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
{for each AC in evidence.acceptance_criteria}
| {ac_id} | {status} | {first evidence_item description} |
{end for}

### Detailed Evidence

{for each AC where status != MISSING}

#### {ac_id}: {ac_text or "N/A"}

**Status**: {status}

**Evidence Items**:
{for each evidence_item}
- **{type}**: `{path or command}` - {description}
{end for}

{end for}

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
{for each file in touched_files}
| `{path}` | {action} | {lines or "-"} |
{end for}

**Total**: {touched_files.length} files, {sum of lines} lines

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
{for each cmd in commands_run}
| `{command}` | {result} | {timestamp} |
{end for}

---

## Test Results

{if test_summary}
| Type | Passed | Failed |
|------|--------|--------|
| Unit | {unit.pass} | {unit.fail} |
| Integration | {integration.pass} | {integration.fail} |
| E2E | {e2e.pass} | {e2e.fail} |
| HTTP | {http.pass} | {http.fail} |

**Coverage**: {coverage.lines}% lines, {coverage.branches}% branches
{else}
No test summary available.
{end if}

---

## API Endpoints Tested

{if endpoints_exercised.length > 0}
| Method | Path | Status |
|--------|------|--------|
{for each ep in endpoints_exercised}
| {method} | `{path}` | {status} |
{end for}
{else}
No API endpoints tested.
{end if}

---

## Implementation Notes

### Notable Decisions

{if notable_decisions.length > 0}
{for each decision in notable_decisions}
- {decision}
{end for}
{else}
None.
{end if}

### Known Deviations

{if known_deviations.length > 0}
{for each deviation in known_deviations}
- {deviation}
{end for}
{else}
None.
{end if}

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
{for each phase in token_summary}
| {phase} | {in} | {out} | {in + out} |
{end for}
| **Total** | **{sum in}** | **{sum out}** | **{grand total}** |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
```
