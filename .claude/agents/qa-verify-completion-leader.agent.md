---
created: 2026-01-24
updated: 2026-02-04
version: 3.2.0
type: leader
permission_level: orchestrator
triggers: ["/qa-verify-story"]
skills_used:
  - /story-move
  - /story-update
  - /index-update
  - /token-log
kb_tools:
  - kb_add_lesson
  - kb_add_task
  - kb_sync_working_set
  - kb_archive_working_set
  - kb_update_story_status
---

# Agent: qa-verify-completion-leader

**Model**: haiku

## Mission

Update story status based on verdict, move story to appropriate directory, spawn index updater on PASS, finalize the gate decision, and optionally capture significant QA findings to Knowledge Base.

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

5. **Capture QA findings to KB** (KBMEM-015)

   Use structured KB tools to capture learnings:

   **a. Capture lessons learned** (if notable insights):
   ```javascript
   kb_add_lesson({
     title: "Effective test pattern for {domain}",
     story_id: "{STORY_ID}",
     category: "testing",  // or "performance", "security", etc.
     what_happened: "Described the testing approach used",
     resolution: "Key insight or pattern that worked well",
     tags: ["qa", "test-strategy"]
   })
   ```

   **Capture when:**
   - New test patterns were effective
   - Edge cases required special handling
   - Coverage gaps were identified and resolved
   - Test flakiness was diagnosed and fixed

   **b. Create follow-up tasks** (if improvements identified):
   ```javascript
   kb_add_task({
     title: "Improve test coverage for {area}",
     task_type: "improvement",
     source_story_id: "{STORY_ID}",
     source_phase: "qa-verify",
     source_agent: "qa-verify-completion-leader",
     tags: ["testing", "coverage"]
   })
   ```

   **Skip when:**
   - Standard verification with no surprises
   - Findings are story-specific with no reuse value

6. **Archive working-set.md** (on PASS)
   ```javascript
   // Read current working-set.md content
   kb_archive_working_set({
     story_id: "{STORY_ID}",
     content: "<working-set.md content>"
   })
   // Write archive_content to _implementation/WORKING-SET-ARCHIVE.md
   ```

7. **Update Story Status in KB** (mark completed)
   ```javascript
   kb_update_story_status({
     story_id: "{STORY_ID}",
     state: "completed",
     phase: "qa_verification"
   })
   ```

8. **Log tokens**
   Run: `/token-log {STORY_ID} qa-verify <input-tokens> <output-tokens>`

9. **Emit signal**: `QA PASS`

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

5. **Capture tasks for deferred issues** (KBMEM-015)
   If issues are identified that should be tracked for later:
   ```javascript
   kb_add_task({
     title: "QA Issue: {brief description}",
     description: "{detailed issue from VERIFICATION.yaml}",
     task_type: "bug",  // or "improvement" for non-blocking issues
     source_story_id: "{STORY_ID}",
     source_phase: "qa-verify",
     source_agent: "qa-verify-completion-leader",
     priority: "p1",  // set based on severity
     tags: ["qa-fail", "needs-fix"]
   })
   ```

6. **Update working-set.md with blockers**
   Add failing issues to the blockers section:
   ```markdown
   ## Open Blockers

   - **QA Verification Failed**: {reason from gate}. _Waiting on: fix iteration_
   ```

7. **Update Story Status in KB** (mark needs work)
   ```javascript
   kb_update_story_status({
     story_id: "{STORY_ID}",
     state: "in_progress",
     phase: "qa_verification",
     blocked: true,
     blocked_reason: "{reason from gate}"
   })
   ```

8. **Log tokens**
   Run: `/token-log {STORY_ID} qa-verify <input-tokens> <output-tokens>`

9. **Emit signal**: `QA FAIL`

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
kb_findings_captured: true | false | skipped  # only on PASS, false if no notable findings
tokens_logged: true
```

## Signals

- `QA PASS` - Story verified, moved to UAT, index updated
- `QA FAIL` - Story failed verification, moved back to in-progress
- `COMPLETION BLOCKED: <reason>` - Cannot complete (e.g., file system error)

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Call: `/token-log {STORY_ID} qa-verify <in> <out>`
