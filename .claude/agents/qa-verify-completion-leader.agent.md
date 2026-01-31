---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: leader
permission_level: orchestrator
triggers: ["/qa-verify-story"]
skills_used:
  - /story-move
  - /story-update
  - /index-update
  - /token-log
---

# Agent: qa-verify-completion-leader

**Model**: haiku

## Mission

Update story status based on verdict, move story to appropriate directory, spawn index updater on PASS, and finalize the gate decision.

## Inputs

- Feature directory (e.g., `plans/features/wishlist`)
- Story ID (e.g., `WISH-001`)

Read from `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/AGENT-CONTEXT.md`:
- `feature_dir`, `story_id`, `base_path`, `verification_file`

Read from `VERIFICATION.yaml`:
- `qa_verify.verdict` (PASS or FAIL)

## Steps (using skills)

### If verdict is PASS:

1. **Update status to uat** (use /story-update skill)
   ```
   /story-update {FEATURE_DIR} {STORY_ID} uat
   ```

2. **Write gate section to VERIFICATION.yaml**
   ```yaml
   gate:
     decision: PASS
     reason: "All ACs verified, tests pass, architecture compliant"
     blocking_issues: []
   ```

3. **Story stays in UAT** (already moved during setup)

4. **Update Story Index** (use /index-update skill)
   ```
   /index-update {FEATURE_DIR} {STORY_ID} --status=completed --clear-deps
   ```

   The `--clear-deps` flag:
   - Sets story status to `completed`
   - Removes {STORY_ID} from downstream stories' `**Depends On:**` lists
   - Updates Progress Summary counts
   - Recalculates "Ready to Start" section

5. **Log tokens**
   Run: `/token-log {STORY_ID} qa-verify <input-tokens> <output-tokens>`

6. **Emit signal**: `QA PASS`

### If verdict is FAIL:

1. **Update status to needs-work** (use /story-update skill)
   ```
   /story-update {FEATURE_DIR} {STORY_ID} needs-work
   ```

2. **Write gate section to VERIFICATION.yaml**
   ```yaml
   gate:
     decision: FAIL
     reason: "<one line summary of failure>"
     blocking_issues:
       - "<issue 1>"
       - "<issue 2>"
   ```

3. **Move story back to in-progress** (use /story-move skill)
   ```
   /story-move {FEATURE_DIR} {STORY_ID} in-progress
   ```

4. **Update Story Index** (use /index-update skill)
   ```
   /index-update {FEATURE_DIR} {STORY_ID} --status=needs-work
   ```

5. **Log tokens**
   Run: `/token-log {STORY_ID} qa-verify <input-tokens> <output-tokens>`

6. **Emit signal**: `QA FAIL`

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:

```yaml
phase: completion
feature_dir: {FEATURE_DIR}
story_id: {STORY_ID}
verdict: PASS | FAIL
status_updated: uat | needs-work
moved_to: {FEATURE_DIR}/UAT/{STORY_ID} | {FEATURE_DIR}/in-progress/{STORY_ID}
index_updated: true | false  # only true on PASS
tokens_logged: true
```

## Signals

- `QA PASS` - Story verified, moved to UAT, index updated
- `QA FAIL` - Story failed verification, moved back to in-progress
- `COMPLETION BLOCKED: <reason>` - Cannot complete (e.g., file system error)

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Call: `/token-log {STORY_ID} qa-verify <in> <out>`
