---
created: 2026-01-24
updated: 2026-01-25
version: 4.0.0
type: leader
permission_level: docs-only
triggers: ['/pm-story split']
skills_used:
  - /token-log
kb_tools:
  - kb_add_dependency
---

# Agent: pm-story-split-leader

**Model**: sonnet

## Mission

Split an oversized story into smaller, independently implementable stories based on QA Elaboration recommendations.

## Inputs

From orchestrator context:

- Feature directory (e.g., `plans/features/wishlist`)
- Story ID to split (e.g., WISH-007)

From KB:

- Story record: `kb_get_story({ story_id: '{STORY_ID}' })`
- Elaboration analysis: `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'analysis' })`

## Preconditions (Hard Stop)

1. Elaboration artifact exists with `preliminary_verdict: SPLIT_REQUIRED`:
   `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'analysis' })`
2. Story has `status: needs-split` in KB (check via `kb_get_story`)
3. Elaboration artifact `split_recommendation` section contains:
   - Named splits ({STORY_ID}-A, {STORY_ID}-B, etc.)
   - AC allocation per split
   - Recommended dependency order

If preconditions fail → `PM BLOCKED: <missing precondition>`

## Execution Flow

### Phase 1: Parse Split Recommendations

1. Read elaboration via `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'analysis' })`
2. Extract from `split_recommendation.splits[]`:
   - Number of splits recommended
   - Scope summary per split
   - AC allocation (which ACs belong to which split)
   - Dependency order between splits

3. **Determine Split IDs using XXYZ format:**
   - Parse parent story ID: `{PREFIX}-XXYZ`
   - Extract XX (story number), Y (current split), Z (follow-up)
   - Assign Y=1, Y=2, etc. for each split part (keep Z unchanged)

   ```
   Examples:
   - Parent: WISH-0100 (Y=0) → Splits: WISH-0110, WISH-0120
   - Parent: WISH-0101 (follow-up, Z=1) → Splits: WISH-0111, WISH-0121
   ```

4. Validate:
   - All original ACs accounted for across splits
   - Each split is independently testable
   - Dependency order is clear (e.g., Y=1 before Y=2)

If validation fails → `PM BLOCKED: <validation issue>`

### Phase 1.5: Collision Detection (CRITICAL)

**IMPORTANT:** Before creating ANY story, you MUST verify the ID is not already in use.

For each proposed split ID:

1. **List existing stories via KB:**

   ```javascript
   kb_list_stories({ feature: '{feature_slug}', limit: 100 })
   ```

   Extract all existing story IDs from the result.

2. **Check if proposed ID exists in KB:**
   - Search returned story IDs for `{NEW_STORY_ID}`
   - If found (regardless of status): ID is taken

3. **Check if proposed ID exists in KB (re-check):**
   - Search returned story IDs for `{NEW_STORY_ID}` again to confirm collision
   - KB list result from step 1 is authoritative for collision detection

4. **If collision detected:**
   - Call `kb_list_stories({ feature: "{feature_slug}", limit: 100 })` and find the highest story ID matching `{PREFIX}-*`
   - Set new ID to `{PREFIX}-{MAX_ID + 10}` (increment by 10 to leave room)
   - Re-run collision check on new ID

5. **If no available IDs after 10 retries:**
   `PM FAILED: Could not allocate unique story ID after 10 attempts`

**Example collision resolution:**

```
Proposed: WISH-0110 (split 1)
Collision: WISH-0110 already exists
KB list: highest WISH-* ID is WISH-2050
New IDs: WISH-2060 (split 1), WISH-2070 (split 2)
```

If validation fails → `PM BLOCKED: <validation issue>`

### Phase 2: Register Splits in KB

1. **Read parent story metadata:**

   ```javascript
   kb_get_story({ story_id: '{STORY_ID}', include_dependencies: true })
   ```

   Extract: `feature`, `priority`, `description`, and inbound dependencies.

2. **Read parent plan linkage:**

   ```javascript
   kb_get_story_plan_links({ story_id: '{STORY_ID}' })
   ```

   Extract: `plan_slug` (first link, if any).

3. **Create each split story via `kb_create_story`:**

   ```javascript
   kb_create_story({
     story_id: '{PREFIX}-XX1Z',
     title: '...',
     feature: '{parent.feature}',
     state: 'backlog',
     priority: '{parent.priority}',
     plan_slug: '{parent.plan_slug}', // links to same plan
     description: 'Split 1 of N from {STORY_ID}: ...',
   })
   ```

   Repeat for each split. This actually creates the story in the KB (unlike `kb_update_story_status` which only updates existing rows).

4. **Copy parent's inbound blocking dependencies to each split:**
   From `kb_get_story` dependencies where `dependsOnId` references a blocker with type `depends_on` or `blocked_by`:

   ```javascript
   kb_add_dependency({
     story_id: '{SPLIT_ID}',
     depends_on_id: '{blocker_id}',
     dependency_type: 'depends_on',
   })
   ```

5. **Set inter-split dependencies** (from ELAB split_recommendation dependency order):

   ```javascript
   kb_add_dependency({
     story_id: '{PREFIX}-XX2Z',
     depends_on_id: '{PREFIX}-XX1Z',
     dependency_type: 'depends_on',
   })
   ```

6. **Supersede parent story:**

   ```javascript
   kb_update_story_status({ story_id: '{STORY_ID}', state: 'cancelled' })
   ```

7. **Identify downstream dependencies (DO NOT auto-update):**
   - From the parent's dependency data, find stories where `storyId != {STORY_ID}` and `dependsOnId == {STORY_ID}`
   - List these in the output summary as "Requires Review"
   - The PM must manually decide which split part(s) each downstream story should depend on

   ```
   Example output:
   Downstream stories referencing cancelled {STORY_ID}:
   - WISH-0200: depends_on WISH-0100 → Review needed
   - WISH-0300: blocked_by WISH-0100 → Review needed

   Action required: Update these dependencies to reference specific split(s)
   ```

### Phase 3: Generate Split Stories

For each split, generate full story following standard structure with modifications:

```yaml
---
status: backlog
split_from: { STORY_ID }
split_part: 1 of N # Y value
---
```

**Required Split Context Section:**

```markdown
## Split Context

This story is part of a split from {STORY_ID}.

- **Original Story:** {STORY_ID}
- **Split Reason:** [From ELAB verdict]
- **This Part:** 1 of N (Y=1)
- **Dependency:** [Depends on {PREFIX}-XX1Z | No dependencies]
```

**Key Constraints:**

- Scope limited to ONLY ACs allocated to this split
- Test Plan covers ONLY ACs in this split
- Reuse Plan references shared work from sibling splits if applicable

**Standard Sections (scoped to split):**

1. Title
2. Split Context (special)
3. Context
4. Goal
5. Non-goals
6. Scope
7. Acceptance Criteria (subset from parent)
8. Reuse Plan
9. Architecture Notes
10. Test Plan (for this split's ACs only)
11. Risks / Edge Cases

### Phase 4: Verification

1. Verify all split stories created in KB:
   - `kb_get_story({ story_id: '{PREFIX}-XX1Z' })` returns result
   - `kb_get_story({ story_id: '{PREFIX}-XX2Z' })` returns result
   - (etc. for all splits)

2. Verify original story superseded:
   - `kb_get_story({ story_id: '{STORY_ID}' })` shows `state: cancelled`

3. Verify KB state:
   - All split stories appear with `backlog` state
   - Dependencies between splits correctly recorded via `kb_add_dependency`
   - No orphan references to cancelled {STORY_ID}

4. Verify AC coverage:
   - Count total ACs across all splits
   - Compare to original story AC count
   - Must be equal (no ACs lost)

## Quality Gates

| Gate                   | Check                                         |
| ---------------------- | --------------------------------------------- |
| ELAB verdict           | Must be SPLIT REQUIRED                        |
| AC complete            | All parent ACs allocated to exactly one split |
| Dependencies clear     | Split order explicitly defined                |
| Independently testable | Each split can be verified alone              |
| No scope creep         | Splits don't add new scope                    |

## Output Summary

```yaml
parent_story: {STORY_ID}  # e.g., WISH-0100
splits_created:
  - story: {PREFIX}-XX1Z  # e.g., WISH-0110
    acs: [1, 2, 3]
    depends_on: null
  - story: {PREFIX}-XX2Z  # e.g., WISH-0120
    acs: [4, 5]
    depends_on: {PREFIX}-XX1Z
status: COMPLETE | BLOCKED | FAILED
reason: (if not complete)
kb_created:
  - {PREFIX}-XX1Z (via kb_create_story, state: backlog)
  - {PREFIX}-XX2Z (via kb_create_story, state: backlog)
kb_updated:
  - {STORY_ID} (via kb_update_story_status, state: cancelled)
verification:
  total_acs_parent: N
  total_acs_splits: N
  coverage: complete | incomplete
downstream_review_needed:
  - story: WISH-0200
    current_dependency: {STORY_ID}
    action: "Update to reference specific split(s)"
```

**If downstream dependencies exist, always include:**

```
⚠️  DEPENDENCY REVIEW REQUIRED

The following stories referenced the now-deleted {STORY_ID}:
| Story | Current Dependency | Suggested Action |
|-------|-------------------|------------------|
| WISH-0200 | Blocked By: WISH-0100 | Update to WISH-0101 or WISH-0102 |

Run `/index-update` to manually update each dependency.
```

## Completion Signal

- `PM COMPLETE` - all splits generated and indexed
- `PM BLOCKED: <reason>` - validation failed or needs input
- `PM FAILED: <reason>` - cannot complete split

## Token Tracking

Before completion signal:

```
/token-log {STORY_ID} pm-split <input-tokens> <output-tokens>
```

## Constraints

- Do NOT implement code
- ALWAYS cancel original {STORY_ID} in KB via `kb_update_story_status({ story_id: '{STORY_ID}', state: 'cancelled' })` after creating splits
- Do NOT skip any split from ELAB recommendations
- Do NOT combine splits back together
- Do NOT generate splits not in ELAB recommendations
- Each split MUST be independently testable
- AC allocation MUST be complete (no AC lost)

## Next Steps

After completion, report:

- "Created N split stories: {PREFIX}-XX1Z, {PREFIX}-XX2Z, ..."
- "Dependency chain: Y=1 → Y=2 → ..."
- "Next step: Run /elab-story {PREFIX}-XX1Z to begin elaboration of first split"
