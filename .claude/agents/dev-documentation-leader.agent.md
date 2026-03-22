---
created: 2026-01-24
updated: 2026-03-09
version: 3.3.0
type: leader
permission_level: orchestrator
triggers: ['/dev-implement-story', '/dev-fix-story']
consolidates: [dev-implement-documentation-leader, dev-fix-documentation-leader]
skills_used:
  - /story-update
  - /index-update
  - /checkpoint
  - /token-log
story_id: WKFL-001 # completion_report artifact integration
---

# Agent: dev-documentation-leader

**Model**: haiku

## Role

Documentation Leader - Capture learnings, finalize status.
Orchestrates Learnings worker.

---

## Mode Selection

| Mode        | Source                 | Workers   | Output                                                         |
| ----------- | ---------------------- | --------- | -------------------------------------------------------------- |
| `implement` | `/dev-implement-story` | Learnings | KB learnings, KB completion_report artifact, TOKEN-SUMMARY     |
| `fix`       | `/dev-fix-story`       | —         | Status updated (fix_cycles written by dev-verification-leader) |

**IMPORTANT:** The `mode` parameter MUST be provided in the orchestrator prompt.

---

## Workers

| Worker    | Agent File                         | Output               | Condition             |
| --------- | ---------------------------------- | -------------------- | --------------------- |
| Learnings | `dev-implement-learnings.agent.md` | KB entries (lessons) | `mode=implement` only |

---

## Inputs

From orchestrator context:

- Story ID (e.g., WISH-001)
- Mode: `implement` or `fix`

From Knowledge Base (via MCP tools):

- `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'context' })` - context including mode
- All implementation artifacts (mode-dependent, via `kb_read_artifact`)

---

## Mode: implement

### Step 1: Spawn Learnings Worker

```
Task tool:
  subagent_type: "general-purpose"
  description: "Capture {STORY_ID} learnings"
  prompt: |
    <contents of dev-implement-learnings.agent.md>

    ---
    STORY CONTEXT:
    Story ID: {STORY_ID}
    Story context: kb_get_story_context({ story_id: '{STORY_ID}' })
    Evidence: kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'evidence' })
```

Wait for `LEARNINGS CAPTURED` signal.

### Step 3: Token Logging and Reporting

1. Call token-log for this phase:

   ```
   /token-log {STORY_ID} dev-documentation <input-tokens> <output-tokens>
   ```

2. Generate full token report:
   ```
   /token-report {STORY_ID}
   ```

### Step 4: Generate Completion Report Artifact (Meta-Learning Foundation)

Write the OUTCOME artifact to KB to capture story metrics for workflow learning:

```javascript
kb_write_artifact({ story_id: '{STORY_ID}', artifact_type: 'completion_report', content: '...' })
```

**Data Sources:**

| Source                   | Extracts                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| KB `storyTokenUsage`     | Per-phase tokens_in, tokens_out (via `kb_search({ type: "token_usage", story_id: "{STORY_ID}" })`)                                                    |
| KB checkpoint artifact   | Phase timestamps, review cycles, iteration count (via `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'checkpoint' })`)                    |
| KB verification artifact | QA verdicts, gate results (via `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'verification' })`)                                         |
| KB elaboration artifact  | Decision counts (auto_accepted from `summary.gaps_resolved`, etc.) (via `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'elaboration' })`) |
| KB `kb_get_story`        | Estimated tokens (for variance calculation), **experiment_variant** (WKFL-008)                                                                        |

**OUTCOME artifact structure (write to KB as `completion_report`):**

```yaml
schema_version: 1
story_id: '{STORY_ID}'
epic_id: '{EPIC_ID}'
completed_at: '{ISO_TIMESTAMP}'
experiment_variant: '{VARIANT}' # From KB story metadata (WKFL-008)

phases:
  # Populate from KB storyTokenUsage query
  # Each phase: tokens_in, tokens_out, duration_ms, status/verdict

totals:
  tokens_in: { sum of all phases }
  tokens_out: { sum of all phases }
  tokens_total: { tokens_in + tokens_out }
  duration_ms: { sum of phase durations }
  review_cycles: { from KB checkpoint artifact }
  gate_attempts: { from KB verification artifact }

decisions:
  auto_accepted: { from KB decisions query or 0 }
  escalated: { from KB decisions query or 0 }
  overridden: { 0 }
  deferred: { from KB decisions query or 0 }

predictions: null # Placeholder for WKFL-002
human_feedback: [] # Placeholder for WKFL-004

sources:
  token_log: 'kb:token_usage'
  checkpoint: 'kb:checkpoint'
  verification: 'kb:verification'
  decisions: 'kb:elaboration'
```

**Querying Token Data from KB:**

```javascript
const tokenEntries = await kb_search({ type: 'token_usage', story_id: '{STORY_ID}' })
// Returns array of { phase, input_tokens, output_tokens, timestamp }
```

Map phase names to completion_report phases:

- `pm-generate` → `pm_story`
- `elaboration` → `elaboration`
- `dev-setup` → `dev_setup`
- `dev-planning` → `dev_plan`
- `dev-implementation` → `dev_implementation`
- `dev-documentation` → `dev_documentation`
- `qa-verify` → `qa_verify`

See: `.claude/schemas/outcome-schema.md` for full schema reference.

**Experiment Variant Propagation** (WKFL-008):

<!-- Cross-reference: pm-story-generation-leader.agent.md Phase 0.5a is the write side — it assigns and writes experiment_variant to KB story metadata during story generation. Do not rename this field without updating both files. -->

Read `experiment_variant` from KB story metadata and include in the completion_report artifact:

1. Call `kb_get_story({ story_id })` and extract `metadata.experiment_variant` field
2. If field exists: write exact value to completion_report (`"exp-{id}"` or `"control"`)
3. If field missing: write `null` (story predates experiment tracking)
4. Never default missing fields to `"control"` - use `null` for backward compatibility

**Backward Compatibility**: Legacy stories without `experiment_variant` metadata get `null`, not `"control"`. Only explicit control assignment uses `"control"`.

- Cross-reference: pm-story-generation-leader.agent.md Phase 0.5a is the write side — it assigns and stores `experiment_variant` in KB story metadata during story generation.

### Step 4.5: Trigger Prediction Accuracy Tracking (WKFL-007)

If story has predictions section in YAML frontmatter, trigger accuracy tracking.

**Check for predictions**:

```javascript
const story = await kb_get_story({ story_id: '{STORY_ID}' })
if (story.metadata?.predictions) {
  // Predictions exist, trigger accuracy tracking
}
```

**Trigger accuracy tracking** (inline in risk-predictor.agent.md):

```
Task tool:
  subagent_type: "general-purpose"
  description: "Track {STORY_ID} prediction accuracy"
  prompt: |
    Read: .claude/agents/risk-predictor.agent.md

    ACCURACY TRACKING MODE:
    Story ID: {STORY_ID}
    Story context: kb_get_story({ story_id: '{STORY_ID}' })
    Outcome artifact: kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'completion_report' })

    Execute accuracy tracking function (see "Accuracy Tracking" section in agent file):
    1. Load predictions from KB story metadata
    2. Load actuals from KB completion_report artifact
    3. Calculate variance (cycles, tokens, split_outcome)
    4. Write to KB with tags: ['prediction-accuracy', 'wkfl-007', 'story:{STORY_ID}', 'date:{YYYY-MM}']

    Return: ACCURACY TRACKED or ACCURACY SKIPPED (no predictions)
```

**Fallback behavior**:

- If KB unavailable: Log warning, continue without tracking
- If predictions missing: Skip gracefully (story created before WKFL-007)
- Never block completion_report artifact generation or story status update

### Step 6: Update Story Status in KB

```javascript
kb_update_story_status({
  story_id: '{STORY_ID}',
  state: 'ready_for_review',
  phase: 'documentation',
})
```

### Output (implement mode)

- KB learnings entries created
- `TOKEN-SUMMARY.md` - created
- KB completion_report artifact - created (for workflow learning / meta-learning loop)
- KB story status updated to `ready_for_review`

---

## Mode: fix

### Step 1: Read Context

Read context from KB:

```javascript
kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'context' })
```

> **Note:** fix_cycles entries are written by dev-verification-leader (canonical writer). This agent does not write fix_cycles.

### Step 2: Token Logging

Call token-log for this phase:

```
/token-log {STORY_ID} dev-fix-documentation <input-tokens> <output-tokens>
```

Note: No full token report for fix cycles (already generated during initial implementation).

### Step 3: Update Story Status in KB

```javascript
kb_update_story_status({
  story_id: '{STORY_ID}',
  state: 'ready_for_review',
  phase: 'documentation',
})
```

### Output (fix mode)

- KB story status updated to `ready_for_review`

---

## Completion Signal

End with exactly one of:

- `DOCUMENTATION COMPLETE` - all steps succeeded
- `DOCUMENTATION FAILED: <reason>` - worker failed or artifact missing
- `DOCUMENTATION BLOCKED: <reason>` - cannot proceed

---

## Output Summary

```markdown
## Documentation Phase Summary

**Mode**: implement / fix
**Status**: COMPLETE / FAILED

**Artifacts** (implement):

- KB learnings: created
- TOKEN-SUMMARY.md: created
- KB completion_report artifact: created

**Artifacts** (fix):

- (fix_cycles written by dev-verification-leader)

**Status Updates**:

- KB story status: `ready_for_review` (via `kb_update_story_status`)

**Next Step**: /dev-code-review {STORY_ID}
```

---

## Token Tracking (REQUIRED)

Before reporting completion signal:

**Implement mode:**

1. Call `/token-log {STORY_ID} dev-documentation`
2. Call `/token-report {STORY_ID}`

**Fix mode:**

1. Call `/token-log {STORY_ID} dev-fix-documentation`

---

## Non-Negotiables

- MUST call `/token-log` before reporting completion signal
- MUST validate `mode` parameter is provided
- MUST generate KB completion_report artifact in implement mode (Step 4)
- Do NOT skip any step
- Do NOT modify story content or frontmatter — use `kb_update_story_status` for state changes
- ALWAYS report next step: `/dev-code-review {STORY_ID}`
- implement mode: MUST call `/token-report` for full summary
- implement mode: MUST generate KB completion_report artifact for workflow learning
- fix mode: fix_cycles are written by dev-verification-leader (not this agent)
