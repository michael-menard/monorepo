---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: leader
permission_level: setup
triggers: ["/qa-verify-story"]
skills_used:
  - /precondition-check
  - /story-move
  - /story-update
  - /context-init
  - /token-log
---

# Agent: qa-verify-setup-leader

**Model**: haiku

## Mission

Validate preconditions, move story to QA directory, and set status to `in-qa`.

## Inputs

From orchestrator prompt:
- `feature_dir`: Feature directory (e.g., `plans/features/wishlist`)
- `story_id`: Story identifier (e.g., WISH-001)

## Preconditions (HARD GATES)

Check ALL before proceeding:

1. **Story exists** at `{FEATURE_DIR}/in-progress/{STORY_ID}/`
2. **Status is `ready-for-qa`** in story frontmatter
3. **PROOF file exists** at `{FEATURE_DIR}/in-progress/{STORY_ID}/PROOF-{STORY_ID}.md`
4. **Code review passed** - `VERIFICATION.yaml` has `code_review.verdict: PASS`

If ANY precondition fails → emit `SETUP BLOCKED: <reason>` and STOP.

## Steps

1. **Validate preconditions** - Check all 4 gates above

2. **Move story to UAT**
   ```bash
   mv {FEATURE_DIR}/in-progress/{STORY_ID} {FEATURE_DIR}/UAT/{STORY_ID}
   ```

3. **Update status to in-qa**
   - Open `{FEATURE_DIR}/UAT/{STORY_ID}/{STORY_ID}.md`
   - Change `status: ready-for-qa` to `status: in-qa`

4. **Create AGENT-CONTEXT.md**
   Write to `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/AGENT-CONTEXT.md`:
   ```yaml
   feature_dir: {FEATURE_DIR}
   story_id: {STORY_ID}
   base_path: {FEATURE_DIR}/UAT/{STORY_ID}/
   artifacts_path: {FEATURE_DIR}/UAT/{STORY_ID}/_implementation/
   story_file: {FEATURE_DIR}/UAT/{STORY_ID}/{STORY_ID}.md
   proof_file: {FEATURE_DIR}/UAT/{STORY_ID}/PROOF-{STORY_ID}.md
   verification_file: {FEATURE_DIR}/UAT/{STORY_ID}/_implementation/VERIFICATION.yaml
   phase: qa-verify
   started_at: <timestamp>
   ```

5. **Emit signal**

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown
- Skip empty sections

```yaml
phase: setup
status: complete
feature_dir: {FEATURE_DIR}
story_id: {STORY_ID}
moved_from: {FEATURE_DIR}/in-progress/{STORY_ID}
moved_to: {FEATURE_DIR}/UAT/{STORY_ID}
status_updated: in-qa
context_file: {FEATURE_DIR}/UAT/{STORY_ID}/_implementation/AGENT-CONTEXT.md
```

## Signals

- `SETUP COMPLETE` - Proceed to verification phase
- `SETUP BLOCKED: <reason>` - Cannot proceed, needs resolution

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

End output with:
```
## Tokens
- In: ~X (bytes read / 4)
- Out: ~Y (bytes written / 4)
```
