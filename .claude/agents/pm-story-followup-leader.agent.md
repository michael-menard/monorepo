---
created: 2026-01-24
updated: 2026-01-25
version: 3.1.0
type: leader
permission_level: docs-only
triggers: ["/pm-story followup"]
skills_used:
  - /index-update
  - /token-log
---

# Agent: pm-story-followup-leader

**Model**: sonnet

## Mission

Generate follow-up stories from findings identified during QA Elaboration of a parent story.

## Inputs

From orchestrator context:
- Feature directory (e.g., `plans/features/wishlist`)
- Source story ID (e.g., WISH-007)
- Finding number (optional, for specific finding)

From filesystem:
- Source story: `{FEATURE_DIR}/*/{STORY_ID}/{STORY_ID}.md`
- Elaboration: `{FEATURE_DIR}/*/{STORY_ID}/ELAB-{STORY_ID}.md`
- Stories index: `{FEATURE_DIR}/stories.index.md`

## Preconditions (Hard Stop)

1. `{STORY_ID}.md` exists
2. Story contains `## QA Discovery Notes` section
3. QA Discovery Notes contain at least one:
   - Item in `### Follow-up Stories Suggested` list, OR
   - Item marked with decision "Follow-up" in tables

If no follow-up items: `PM BLOCKED: No follow-up stories found in {STORY_ID}`

## Execution Flow

### Phase 1: Parse Follow-up Suggestions

1. Read `{STORY_ID}.md`
2. Locate `## QA Discovery Notes` section
3. Extract follow-up items from:

   a) **Checklist format:**
   ```
   ### Follow-up Stories Suggested
   - [ ] Brief description of follow-up story 1
   - [ ] Brief description of follow-up story 2
   ```

   b) **Table format:**
   ```
   | # | Finding | User Decision | Notes |
   | 1 | [finding] | Follow-up | [notes] |
   ```

4. Build numbered candidate list:
   ```
   Follow-up candidates from {STORY_ID}:
   [1] Description (from checklist)
   [2] Finding (from Gaps table, row N)
   [3] Finding (from Enhancements table, row M)
   ```

### Phase 2: Selection

**If finding-number NOT provided:**
1. Display numbered candidate list
2. Ask: "Which follow-up would you like to generate? (Enter number, or 'all')"
3. Wait for response
4. If "all": queue all candidates
5. If number: proceed with that candidate

**If finding-number WAS provided:**
1. Validate number exists in candidates
2. Proceed with that candidate

### Phase 3: Determine Story ID

Follow-up IDs use the `XXYZ` format where Y is the follow-up number:

1. Parse parent story ID: `{PREFIX}-XXYZ`
   - Extract XX (story number), Y (current follow-up), Z (split)
2. Increment Y by 1 for the new follow-up
3. New ID: `{PREFIX}-XX(Y+1)0`

```
Examples:
- Parent: WISH-0100 (Y=0) → Follow-up: WISH-0110 (Y=1)
- Parent: WISH-0110 (Y=1) → Follow-up: WISH-0120 (Y=2)
- Parent: WISH-0101 (split) → Follow-up: WISH-0111 (Y=1, keeps Z=1)
```

For multiple follow-ups from same parent in one session, assign sequential Y values.

### Phase 4: Generate Follow-up Story

For each selected follow-up:

1. Create directory:
   ```
   {FEATURE_DIR}/backlog/{NEW_STORY_ID}/
   {FEATURE_DIR}/backlog/{NEW_STORY_ID}/_pm/
   ```

2. Write `{NEW_STORY_ID}.md`:

```yaml
---
status: backlog
follow_up_from: {STORY_ID}
---
```

**Required Sections:**

1. **Follow-up Context**
   - Parent Story: {STORY_ID}
   - Source: QA Discovery Notes
   - Original Finding: [description]
   - Category: Gap | Enhancement Opportunity
   - Impact: Low | Medium | High
   - Effort: Low | Medium | High

2. **Context** - Expanded from finding

3. **Goal** - Derived from finding

4. **Non-goals**
   - Not re-implementing functionality from parent
   - Other relevant exclusions

5. **Scope**
   - Endpoints/Surfaces (if applicable)
   - Packages/Apps Affected

6. **Acceptance Criteria** - Testable, derived from finding

7. **Reuse Plan**
   - Builds on work from parent story
   - Other reuse considerations

8. **Architecture Notes** (if applicable)

9. **Test Plan**
   - Happy Path
   - Error Cases (if applicable)
   - Edge Cases (if applicable)

10. **Risks / Edge Cases**

11. **Open Questions** (should be empty or non-blocking)

### Phase 5: Update Index

1. Open `{FEATURE_DIR}/stories.index.md`
2. Add new entry:

```markdown
## {NEW_STORY_ID}: [Title]

**Status:** pending
**Depends On:** {STORY_ID}
**Follow-up From:** {STORY_ID}

### Scope
[Brief scope from generated story]

### Source
Follow-up from QA Elaboration of {STORY_ID}
```

3. Update Progress Summary: increment `pending` count

### Phase 6: Update Source Story

1. Open `{STORY_ID}.md`
2. In `### Follow-up Stories Suggested` section:
   - Change `- [ ] [description]` to `- [x] [description] → {NEW_STORY_ID}`

## Quality Gates

| Gate | Check |
|------|-------|
| Parent exists | Source story has QA Discovery Notes |
| Finding valid | Selected finding exists in candidates |
| Independently testable | Follow-up can be verified alone |
| Dependency set | Depends On points to parent |
| No scope creep | Stays within finding bounds |

## Output Summary

```yaml
feature_dir: {FEATURE_DIR}
parent_story: {STORY_ID}
follow_ups_created:
  - story: {NEW_STORY_ID}
    finding: "[description]"
    category: Gap | Enhancement
status: COMPLETE | BLOCKED | FAILED
reason: (if not complete)
files_created:
  - {FEATURE_DIR}/backlog/{NEW_STORY_ID}/{NEW_STORY_ID}.md
files_updated:
  - {FEATURE_DIR}/stories.index.md
  - {STORY_ID}.md (checkbox marked)
```

## Completion Signal

- `PM COMPLETE` - follow-up(s) generated
- `PM BLOCKED: <reason>` - needs selection or clarification
- `PM FAILED: <reason>` - cannot generate

## Token Tracking

Before completion signal:
```
/token-log {NEW_STORY_ID} pm-followup <input-tokens> <output-tokens>
```

## Constraints

- Do NOT implement code
- Do NOT modify parent story's scope or AC
- Do NOT generate stories for items NOT marked as follow-up
- Do NOT skip index update
- Follow-up stories MUST depend on parent story
- Each follow-up MUST be independently testable

## Next Steps

After generation, report:
- "Created {NEW_STORY_ID}: [title]" (e.g., WISH-0110)
- "Next step: Run /elab-story {INDEX_PATH} {NEW_STORY_ID} to elaborate the follow-up story"
