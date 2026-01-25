# Command: migrate-agents-v3

Migrate remaining agents from v2.0.0 to v3.0.0 feature directory structure.

## Progress Tracking

**State file:** `.claude/agents/_migration/PROGRESS.yaml`

On start:
1. Check if state file exists
2. If exists, read and resume from last incomplete command
3. If not exists, create it and start from command 1

After each command completes:
1. Update state file with completed command
2. Continue to next command

### State File Format

```yaml
schema: 1
started_at: <timestamp>
last_updated: <timestamp>
status: in-progress | complete

commands:
  1_dev-fix-story:
    status: pending | in-progress | complete
    agents: [dev-fix-fix-leader.agent.md]
    completed_at: null
  2_dev-implement-story:
    status: pending
    agents: [list...]
    completed_at: null
  3_qa-verify-story:
    status: pending
    agents: [list...]
    completed_at: null
  4_pm-fix-story:
    status: pending
    agents: [list...]
    completed_at: null
  5_pm-story:
    status: pending
    agents: [list...]
    completed_at: null
  6_scrum-master:
    status: pending
    agents: [list...]
    completed_at: null
  7_ui-ux-review:
    status: pending
    agents: [list...]
    completed_at: null

resume_from: 1  # command number to resume from
```

---

## Pattern Reference

Read `.claude/agents/pm-bootstrap-generation-leader.agent.md` for the canonical v3.0.0 pattern.

### Key Changes

1. `version: 2.0.0` → `version: 3.0.0`
2. Replace `plans/stories/` → `{FEATURE_DIR}/`
3. Replace `STORY-XXX` → `{STORY_ID}` in paths
4. Add "Feature directory" to Inputs sections
5. Add `feature_dir` to YAML context blocks

### Path Mappings

| Old | New |
|-----|-----|
| `plans/stories/backlog/` | `{FEATURE_DIR}/backlog/` |
| `plans/stories/elaboration/` | `{FEATURE_DIR}/elaboration/` |
| `plans/stories/ready-to-work/` | `{FEATURE_DIR}/ready-to-work/` |
| `plans/stories/in-progress/` | `{FEATURE_DIR}/in-progress/` |
| `plans/stories/QA/` | `{FEATURE_DIR}/UAT/` |
| `plans/stories/UAT/` | `{FEATURE_DIR}/UAT/` |
| `plans/stories/*.stories.index.md` | `{FEATURE_DIR}/stories.index.md` |
| `plans/stories/LESSONS-LEARNED.md` | `{FEATURE_DIR}/LESSONS-LEARNED.md` |

## Execution

### Step 0: Initialize or Resume

```
1. mkdir -p .claude/agents/_migration
2. If PROGRESS.yaml exists:
   - Read resume_from
   - Report: "Resuming from command N"
3. If not exists:
   - Create PROGRESS.yaml with all commands pending
   - Set resume_from: 1
```

### Step 1-7: Process Each Command

For each command (starting from resume_from):

```
1. Update PROGRESS.yaml: command N status → in-progress
2. Spawn sub-agent for command N
3. Wait for completion signal
4. Update PROGRESS.yaml: command N status → complete, completed_at → timestamp
5. Update PROGRESS.yaml: resume_from → N+1
6. Continue to next command
```

---

### Command 1: /dev-fix-story

**Agents to update:**
- dev-fix-fix-leader.agent.md

---

### Command 2: /dev-implement-story

**Agents to update:**
- dev-implement-backend-coder.agent.md
- dev-implement-frontend-coder.agent.md
- dev-implement-planner.agent.md
- dev-implement-contracts.agent.md
- dev-implement-plan-validator.agent.md
- dev-implement-verifier.agent.md
- dev-implement-playwright.agent.md
- dev-implement-proof-writer.agent.md
- dev-implement-learnings.agent.md

---

### Command 3: /qa-verify-story

**Agents to update:**
- qa-verify-setup-leader.agent.md
- qa-verify-verification-leader.agent.md
- qa-verify-completion-leader.agent.md

---

### Command 4: /pm-fix-story

**Agents to update:**
- pm-story-fix-leader.agent.md

---

### Command 5: /pm-story (ad-hoc, followup, split)

**Agents to update:**
- pm-story-adhoc-leader.agent.md
- pm-story-followup-leader.agent.md
- pm-story-split-leader.agent.md

---

### Command 6: /scrum-master

**Agents to update:**
- scrum-master-setup-leader.agent.md
- scrum-master-loop-leader.agent.md

---

### Command 7: /ui-ux-review

**Agents to update:**
- ui-ux-review-setup-leader.agent.md
- ui-ux-review-reviewer.agent.md
- ui-ux-review-report-leader.agent.md

---

## Sub-Agent Prompt Template

For each command group, spawn a sub-agent with:

```
You are updating agent files to v3.0.0 feature directory structure.

REFERENCE: Read .claude/agents/pm-bootstrap-generation-leader.agent.md for the canonical pattern.

CHANGES TO MAKE:
1. Update version: 2.0.0 → 3.0.0 in YAML frontmatter
2. Replace ALL occurrences of plans/stories/ with {FEATURE_DIR}/
3. Replace STORY-XXX with {STORY_ID} in path examples
4. Add "Feature directory (e.g., plans/future/wishlist)" to Inputs sections
5. Add feature_dir: {FEATURE_DIR} to any YAML context blocks
6. Update /token-log calls to use {STORY_ID}

COMMAND: [command name]
FILES TO UPDATE:
[list agents for this command]

For each file:
1. Read the file
2. Apply all changes
3. Write the updated file

Signal: [COMMAND] MIGRATION COMPLETE
```

## Verification

After all commands complete, verify:
```bash
grep -r "plans/stories/" .claude/agents/ --include="*.md" | grep -v "_archive"
```

Should return no matches except in _archive/ directory.

## Final Steps

After all commands complete:
1. Update PROGRESS.yaml: status → complete
2. Run verification grep
3. Report summary

## Signals

- `COMMAND N COMPLETE` - After each command finishes
- `MIGRATION COMPLETE` - All agents updated to v3.0.0
- `MIGRATION RESUMED FROM N` - When resuming interrupted migration
