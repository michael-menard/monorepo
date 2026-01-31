---
created: 2026-01-20
updated: 2026-01-27
version: 3.2.0
type: orchestrator
agents: ["elab-setup-leader.agent.md", "elab-analyst.agent.md", "elab-completion-leader.agent.md", "pm-story-followup-leader.agent.md"]
skills_chained: ["pm-story split", "pm-story followup"]
---

/elab-story {FEATURE_DIR} {STORY_ID}

QA agent performing Story Elaboration before implementation. HARD GATE - stories must pass before dev.

## Usage

```
/elab-story plans/future/wishlist WISH-001
```

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `elab-setup-leader.agent.md` | haiku | `ELAB-SETUP COMPLETE` |
| 1 | `elab-analyst.agent.md` | sonnet | `ANALYSIS COMPLETE` |
| — | (Interactive) | — | User decisions collected |
| 2 | `elab-completion-leader.agent.md` | haiku | `ELABORATION COMPLETE: <verdict>` |
| 3 | `pm-story-followup-leader.agent.md` (parallel workers) | sonnet | `PM COMPLETE` per worker |
| 4a | `pm-story-split-leader.agent.md` (if SPLIT REQUIRED) | sonnet | `PM COMPLETE` |
| 4b | Recursive `/elab-story` (parallel workers per split) | sonnet | `ELABORATION COMPLETE` per worker |

## Execution

### Phase 0: Setup

```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 0 Elab-Setup {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/elab-setup-leader.agent.md
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
```

Wait for `ELAB-SETUP COMPLETE`. If BLOCKED → STOP.

### Phase 1: Analysis

Move story from backlog to elaboration:
```bash
mv {FEATURE_DIR}/backlog/{STORY_ID} {FEATURE_DIR}/elaboration/{STORY_ID}
mkdir -p {FEATURE_DIR}/elaboration/{STORY_ID}/_implementation
```

```
Task tool:
  subagent_type: "general-purpose"
  model: sonnet
  description: "Phase 1 Analysis {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/elab-analyst.agent.md
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
```

Wait for `ANALYSIS COMPLETE`. If BLOCKED → STOP.

### Interactive Discussion (Orchestrator Direct)

1. Read `{FEATURE_DIR}/elaboration/{STORY_ID}/_implementation/ANALYSIS.md`
2. Count gaps and enhancements
3. Ask: "I've identified [N] gaps and [M] enhancements. Discuss before finalizing? (yes/no)"

**If YES**: Present each finding one at a time (format in reference doc). Collect decision:
- (1) Add as AC
- (2) Follow-up story
- (3) Out-of-scope
- (4) Skip

**If NO**: Mark all "Not Reviewed"

### Phase 2: Completion

Determine verdict from ANALYSIS.md preliminary verdict.

```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 2 Completion {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/elab-completion-leader.agent.md
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Final verdict: <PASS|CONDITIONAL PASS|FAIL|SPLIT REQUIRED>
    User decisions: <JSON from interactive phase>
```

Wait for `ELABORATION COMPLETE: <verdict>`.

On PASS/CONDITIONAL PASS, move story to ready-to-work:
```bash
mv {FEATURE_DIR}/elaboration/{STORY_ID} {FEATURE_DIR}/ready-to-work/{STORY_ID}
```

### Phase 3: Follow-up Story Creation (PASS/CONDITIONAL PASS only)

After moving to ready-to-work, check for follow-up stories:

1. Read `{FEATURE_DIR}/ready-to-work/{STORY_ID}/ELAB-{STORY_ID}.md`
2. Parse the `### Follow-up Stories Suggested` section
3. Count unchecked items (`- [ ]`)

**If follow-ups exist (count > 0):**

Ask user with AskUserQuestion:
```
Question: "I found {N} follow-up story suggestion(s) from elaboration. Would you like to create them now?"
Header: "Follow-ups"
Options:
  - label: "Yes, create all now"
    description: "Spawn workers to create each follow-up story in parallel"
  - label: "No, I'll create later"
    description: "Skip for now - run /pm-story followup later"
```

**If "Yes, create all now":**

**CRITICAL: Pre-allocate Story IDs Before Spawning Workers**

Before spawning parallel workers, the orchestrator MUST:

1. **Scan stories.index.md for existing IDs:**
   ```bash
   grep -E "^## {PREFIX}-[0-9]+:" {FEATURE_DIR}/stories.index.md | sed 's/## \({PREFIX}-[0-9]*\):.*/\1/'
   ```

2. **Find highest existing ID:**
   - Extract numeric portion from each ID
   - Find MAX (e.g., if WISH-2050 exists, MAX=2050)

3. **Pre-allocate IDs for all follow-ups:**
   - Follow-up 1: `{PREFIX}-{MAX + 10}` (e.g., WISH-2060)
   - Follow-up 2: `{PREFIX}-{MAX + 20}` (e.g., WISH-2070)
   - Follow-up N: `{PREFIX}-{MAX + N*10}`

4. **Pass pre-allocated ID to each worker:**

For EACH follow-up item, spawn a worker in parallel with its PRE-ALLOCATED ID:
```
Task tool (spawn all in single message for parallelization):
  subagent_type: "general-purpose"
  model: sonnet
  description: "Create follow-up {N} for {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/pm-story-followup-leader.agent.md

    CONTEXT:
    Feature directory: {FEATURE_DIR}
    Source story ID: {STORY_ID}
    Finding number: {N}

    **PRE-ALLOCATED STORY ID: {ALLOCATED_ID}**

    IMPORTANT: Use the pre-allocated ID above. Do NOT calculate a new ID.
    The orchestrator has already verified this ID is unique.

    Create the follow-up story for finding #{N} only.

    IMPORTANT: You MUST update the stories.index.md file:
    1. Add the new story entry with status: pending
    2. Set Depends On: {STORY_ID} (parent story)
    3. Update the Progress Summary counts
```

**Example ID allocation for 6 follow-ups from WISH-2022:**
```
Scan index: highest ID is WISH-2050
Allocate:
  - Follow-up 1 → WISH-2060
  - Follow-up 2 → WISH-2070
  - Follow-up 3 → WISH-2080
  - Follow-up 4 → WISH-2090
  - Follow-up 5 → WISH-2100
  - Follow-up 6 → WISH-2110
```

Wait for all workers to complete. Collect results:
```yaml
follow_ups_created:
  - finding: 1
    new_story: {PREFIX}-XX10
    status: PM COMPLETE
    index_updated: true
  - finding: 2
    new_story: {PREFIX}-XX20
    status: PM COMPLETE
    index_updated: true
```

Report to user:
```
Follow-up stories created and added to stories.index.md:
- {PREFIX}-XX10: [title from finding 1] (depends on {STORY_ID})
- {PREFIX}-XX20: [title from finding 2] (depends on {STORY_ID})

Next: Run /elab-story on each follow-up when ready.
```

**If "No, I'll create later":**
- Report: "Skipped follow-up creation. Run `/pm-story followup {FEATURE_DIR} {STORY_ID}` when ready."

### Phase 4: Split Handling (SPLIT REQUIRED only)

If verdict is `SPLIT REQUIRED`:

1. Update story status to `needs-split`:
   - Update `{FEATURE_DIR}/stories.index.md` entry for {STORY_ID}
   - Set `**Status:** needs-split`

2. Ask user with AskUserQuestion:
   ```
   Question: "Story requires splitting. Would you like to split it now?"
   Header: "Split"
   Options:
     - label: "Yes, split now"
       description: "Run /pm-story split to create smaller stories (original will be deleted)"
     - label: "No, I'll split later"
       description: "Leave story in elaboration with needs-split status"
   ```

3. **If "Yes, split now"**:
   ```
   Skill tool:
     skill: "pm-story"
     args: "split {FEATURE_DIR} {STORY_ID}"
   ```

   The split agent will:
   - Create split story files in `backlog/`
   - **Update stories.index.md**:
     - **DELETE original {STORY_ID} entry** (superseded stories are removed, not kept)
     - **ADD new entries** for each split ({PREFIX}-XX01, {PREFIX}-XX02, etc.)
     - Update Progress Summary counts
   - **Identify downstream dependencies** that referenced the original story
   - **DELETE the original story directory** (`rm -rf {FEATURE_DIR}/*/{STORY_ID}/`)

   After split completes, collect:
   - List of created split story IDs (e.g., `{PREFIX}-XX01`, `{PREFIX}-XX02`)
   - List of downstream stories needing dependency updates

4. **Handle dependency updates** (after successful split):

   If the split agent reported downstream dependencies needing review:

   Ask user with AskUserQuestion:
   ```
   Question: "The following stories had dependencies on {STORY_ID} (now deleted). Update them now?"
   Header: "Dependencies"
   Options:
     - label: "Yes, update dependencies"
       description: "Review and update each downstream story's dependencies"
     - label: "No, I'll update later"
       description: "Skip - run /index-update manually for each"
   ```

   **If "Yes, update dependencies":**

   For each downstream story, ask which split it should depend on:
   ```
   AskUserQuestion:
     Question: "{DOWNSTREAM_ID} depended on {STORY_ID}. Which split should it depend on?"
     Header: "Dependency"
     Options:
       - label: "{PREFIX}-XX01"
         description: "First split - [scope summary]"
       - label: "{PREFIX}-XX02"
         description: "Second split - [scope summary]"
       - label: "All splits (last one)"
         description: "Depend on final split {PREFIX}-XX0N"
       - label: "Remove dependency"
         description: "No longer needs this dependency"
   ```

   After collecting choices, run `/index-update` for each:
   ```bash
   /index-update {FEATURE_DIR} {DOWNSTREAM_ID} --remove-dep={STORY_ID} --add-dep={CHOSEN_SPLIT}
   ```

   Report: "Updated dependencies for {N} downstream stories in stories.index.md."

5. **Ask to elaborate splits** (after split and dependency handling):

   Ask user with AskUserQuestion:
   ```
   Question: "Split complete. Created {N} stories: {list}. Would you like to elaborate them now?"
   Header: "Elaborate"
   Options:
     - label: "Yes, elaborate all now"
       description: "Spawn workers to run /elab-story on each split in parallel"
     - label: "No, I'll elaborate later"
       description: "Skip for now - run /elab-story on each split manually"
   ```

   **If "Yes, elaborate all now":**

   For EACH split story, spawn a worker in parallel:
   ```
   Task tool (spawn all in single message for parallelization):
     subagent_type: "general-purpose"
     model: sonnet
     description: "Elaborate split {SPLIT_ID}"
     prompt: |
       Run the /elab-story workflow for this split story.

       Feature directory: {FEATURE_DIR}
       Story ID: {SPLIT_ID}

       Follow the full elaboration process:
       1. Read .claude/commands/elab-story.md
       2. Execute all phases (setup, analysis, interactive, completion)
       3. Update stories.index.md with status changes
       4. Report final verdict
   ```

   Wait for all workers to complete. Collect results:
   ```yaml
   splits_elaborated:
     - story: {PREFIX}-XX01
       verdict: PASS
       index_updated: true
     - story: {PREFIX}-XX02
       verdict: CONDITIONAL PASS
       index_updated: true
   ```

   Report to user:
   ```
   Split stories elaborated (stories.index.md updated):
   - {PREFIX}-XX01: PASS → ready for /dev-implement-story
   - {PREFIX}-XX02: CONDITIONAL PASS → ready for /dev-implement-story

   Any FAIL verdicts require /pm-fix-story before implementation.
   ```

   **If "No, I'll elaborate later":**
   - Report: "Split complete. Original {STORY_ID} deleted. Run `/elab-story {FEATURE_DIR} {SPLIT_ID}` for each split when ready."

6. **If "No, I'll split later"** (from step 2):
   - Report: "Story {STORY_ID} marked as needs-split. Run `/pm-story split {FEATURE_DIR} {STORY_ID}` when ready."

## Error Handling

| Signal | Action |
|--------|--------|
| `BLOCKED` | Stop, report reason |
| `FAIL` verdict | Story stays in elaboration, run `/pm-fix-story` |
| `SPLIT REQUIRED` | Offer to run split (Phase 4) |
| `PM FAILED` (follow-up) | Report which follow-up failed, continue with others |
| `PM FAILED` (split) | Report split failure, story stays in needs-split status |
| Split elab `FAIL` | Report which split failed elaboration, others continue |

## Token Report

After completion: `/token-report {STORY_ID}`

## Done

Stop when:
- `ELABORATION COMPLETE` received
- Follow-up stories created (if any, and user approved)
- Split stories created and elaborated (if SPLIT REQUIRED and user approved)
- Token report generated
- User notified of verdict and next steps

**Next steps by verdict:**
- PASS/CONDITIONAL PASS → `/dev-implement-story {FEATURE_DIR} {STORY_ID}`
  - If follow-ups created → also `/elab-story` on each follow-up when ready
- FAIL → `/pm-fix-story {FEATURE_DIR} {STORY_ID}`
- SPLIT REQUIRED → Split created (Phase 4), optionally elaborated by parallel workers
  - If splits elaborated with PASS → `/dev-implement-story` on each
  - If any split FAIL → `/pm-fix-story` on failed splits

## Ref

`.claude/docs/elab-story-reference.md`
