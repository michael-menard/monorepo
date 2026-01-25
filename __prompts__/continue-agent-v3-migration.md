# Continue: Agent v3.0.0 Migration to Feature Directory Structure

## Context

We're migrating agents from v2.0.0 to v3.0.0 to use `{FEATURE_DIR}` paths instead of hardcoded `plans/stories/` paths.

## Pattern to Follow

1. Change `version: 2.0.0` → `version: 3.0.0` in YAML frontmatter
2. Replace all `plans/stories/` paths with `{FEATURE_DIR}/`
3. Replace `STORY-XXX` with `{STORY_ID}` in paths and examples
4. Add `feature_dir` to YAML context blocks where applicable
5. Update skill calls to include `--path={FEATURE_DIR}` where needed

### Path Mappings

| Old Path | New Path |
|----------|----------|
| `plans/stories/backlog/{STORY_ID}/` | `{FEATURE_DIR}/backlog/{STORY_ID}/` |
| `plans/stories/elaboration/{STORY_ID}/` | `{FEATURE_DIR}/elaboration/{STORY_ID}/` |
| `plans/stories/ready-to-work/{STORY_ID}/` | `{FEATURE_DIR}/ready-to-work/{STORY_ID}/` |
| `plans/stories/in-progress/{STORY_ID}/` | `{FEATURE_DIR}/in-progress/{STORY_ID}/` |
| `plans/stories/QA/{STORY_ID}/` | `{FEATURE_DIR}/UAT/{STORY_ID}/` |
| `plans/stories/UAT/{STORY_ID}/` | `{FEATURE_DIR}/UAT/{STORY_ID}/` |
| `plans/stories/*.stories.index.md` | `{FEATURE_DIR}/stories.index.md` |
| `plans/stories/LESSONS-LEARNED.md` | `{FEATURE_DIR}/LESSONS-LEARNED.md` |

## Completed Agents (v3.0.0)

- [x] elab-setup-leader.agent.md
- [x] elab-analyst.agent.md
- [x] elab-completion-leader.agent.md
- [x] dev-setup-leader.agent.md
- [x] dev-implement-planning-leader.agent.md
- [x] dev-implement-implementation-leader.agent.md
- [x] dev-verification-leader.agent.md
- [x] dev-documentation-leader.agent.md

## Remaining Agents to Update

### Dev Worker Agents
- [ ] dev-fix-fix-leader.agent.md (partial - version not updated)
- [ ] dev-implement-backend-coder.agent.md
- [ ] dev-implement-frontend-coder.agent.md
- [ ] dev-implement-planner.agent.md
- [ ] dev-implement-contracts.agent.md
- [ ] dev-implement-plan-validator.agent.md
- [ ] dev-implement-verifier.agent.md
- [ ] dev-implement-playwright.agent.md
- [ ] dev-implement-proof-writer.agent.md
- [ ] dev-implement-learnings.agent.md

### QA Agents
- [ ] qa-verify-setup-leader.agent.md
- [ ] qa-verify-verification-leader.agent.md
- [ ] qa-verify-completion-leader.agent.md

### PM Agents
- [ ] pm-story-fix-leader.agent.md
- [ ] pm-story-adhoc-leader.agent.md
- [ ] pm-story-followup-leader.agent.md
- [ ] pm-story-split-leader.agent.md

### Workflow Agents
- [ ] scrum-master-setup-leader.agent.md
- [ ] scrum-master-loop-leader.agent.md

### UI/UX Agents
- [ ] ui-ux-review-setup-leader.agent.md
- [ ] ui-ux-review-reviewer.agent.md
- [ ] ui-ux-review-report-leader.agent.md

## Reference: Already Updated Agent

See `pm-bootstrap-generation-leader.agent.md` for the canonical v3.0.0 pattern:
- Uses `{FEATURE_DIR}` throughout
- Includes `feature_dir` in YAML outputs
- References `{FEATURE_DIR}/stories.index.md`

## Task

Read each remaining agent file listed above and update:
1. Version to 3.0.0
2. All path references to use `{FEATURE_DIR}` instead of `plans/stories/`
3. Input sections to include "Feature directory" parameter
4. YAML context blocks to include `feature_dir`
5. Token-log calls to use `{STORY_ID}` placeholder
