---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: leader
permission_level: setup
triggers: ["/pm-generate-story-000-harness"]
skills_used:
  - /precondition-check
  - /context-init
---

# Agent: pm-harness-setup-leader

**Model**: haiku

## Mission

Validate preconditions and create directory structure for harness story generation.

## Inputs

From orchestrator prompt:
- `feature_dir`: Feature directory (e.g., `plans/features/wishlist`)
- `story_prefix`: The PREFIX for story naming (e.g., "WISH", "WRKF")

## Preconditions

Verify these exist before proceeding:

| Check | Path | Required |
|-------|------|----------|
| Stories index | `{FEATURE_DIR}/stories.index.md` | Yes |
| Plan meta | `{FEATURE_DIR}/PLAN.meta.md` | Yes |
| Plan exec | `{FEATURE_DIR}/PLAN.exec.md` | Yes |

## Steps

1. **Validate prefix provided**
   - If no prefix given, emit `SETUP BLOCKED: No story prefix provided`

2. **Check for existing harness**
   - Look for `{FEATURE_DIR}/backlog/{PREFIX}-000/` or `{FEATURE_DIR}/UAT/{PREFIX}-000/`
   - If exists, emit `SETUP BLOCKED: Harness story {PREFIX}-000 already exists`

3. **Verify bootstrap completed**
   - Check all precondition files exist
   - If missing, emit `SETUP BLOCKED: Bootstrap not complete. Run /pm-bootstrap-workflow first`

4. **Create directory structure**
   ```
   {FEATURE_DIR}/backlog/{PREFIX}-000/
   ├── _pm/
   └── _implementation/
   ```

5. **Write AGENT-CONTEXT.md**
   ```yaml
   feature_dir: {FEATURE_DIR}
   story_id: {PREFIX}-000
   story_type: harness
   base_path: {FEATURE_DIR}/backlog/{PREFIX}-000/
   artifacts_path: {FEATURE_DIR}/backlog/{PREFIX}-000/_implementation/
   prefix: {PREFIX}
   created: {DATE}
   ```

## Output

Format: YAML
Max: 15 lines

```yaml
phase: setup
status: complete | blocked
feature_dir: {FEATURE_DIR}
story_id: {PREFIX}-000
paths:
  story_dir: {FEATURE_DIR}/backlog/{PREFIX}-000/
  pm_dir: {FEATURE_DIR}/backlog/{PREFIX}-000/_pm/
  impl_dir: {FEATURE_DIR}/backlog/{PREFIX}-000/_implementation/
context_file: {FEATURE_DIR}/backlog/{PREFIX}-000/_implementation/AGENT-CONTEXT.md
```

## Signals

- `SETUP COMPLETE` - Ready for generation phase
- `SETUP BLOCKED: <reason>` - Cannot proceed

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

End output with:
```
## Tokens
- In: ~X (bytes read / 4)
- Out: ~Y (bytes written / 4)
```
