---
created: 2026-01-24
updated: 2026-01-25
version: 3.2.0
type: orchestrator
agents: ["pm-story-generation-leader.agent.md", "pm-story-adhoc-leader.agent.md", "pm-story-followup-leader.agent.md", "pm-story-split-leader.agent.md"]
---

/pm-story <action> [args]

Unified command for all PM story generation and transformation operations. Do NOT implement directly.

## Story ID Format: `{PREFIX}-XXYZ`

Story IDs follow the pattern `{PREFIX}-XXYZ` where:

| Position | Meaning | Range | Description |
|----------|---------|-------|-------------|
| XX | Story number | 00-99 | Base story sequence number |
| Y | Follow-up | 0-9 | 0 = original, 1-9 = follow-up iteration |
| Z | Split | 0-9 | 0 = original, 1-9 = split part |

**Examples:**

| Story ID | Meaning |
|----------|---------|
| `WISH-0100` | Story 01, original |
| `WISH-0110` | Story 01, follow-up 1 |
| `WISH-0120` | Story 01, follow-up 2 |
| `WISH-0101` | Story 01, split part 1 |
| `WISH-0102` | Story 01, split part 2 |
| `WISH-0111` | Story 01, follow-up 1, split part 1 |
| `WISH-2000` | Story 20, original |
| `WISH-2010` | Story 20, follow-up 1 |

**Numbering rules:**
- New stories increment XX (e.g., 01→02→03)
- Follow-ups increment Y on the parent story (e.g., 0100→0110→0120)
- Splits increment Z on the parent story (e.g., 0100→0101, 0102)
- Ad-hoc stories use next available XX with Y=0, Z=0

## Usage

```
# By index file path (recommended) - auto-finds next available story
/pm-story generate plans/stories/WISH.stories.index.md
/pm-story generate plans/stories/WISH.stories.index.md WISH-0500

# By feature directory (legacy)
/pm-story generate plans/future/wishlist WISH-0100
/pm-story generate plans/future/wishlist next

# Follow-up: creates WISH-0110 from WISH-0100
/pm-story followup plans/stories/WISH.stories.index.md WISH-0100

# Split: creates WISH-0101, WISH-0102 from WISH-0100
/pm-story split plans/stories/WISH.stories.index.md WISH-0100

# Ad-hoc story (next available XX00)
/pm-story generate --ad-hoc plans/stories/WISH.stories.index.md
```

## Actions

| Action | Usage | Purpose |
|--------|-------|---------|
| `generate` | `/pm-story generate {INDEX_PATH} [STORY_ID]` | Create story from index (auto-finds next if no ID) |
| `generate` | `/pm-story generate {FEATURE_DIR} {STORY_ID \| next}` | Create story from feature dir (legacy) |
| `generate --ad-hoc` | `/pm-story generate --ad-hoc {INDEX_PATH}` | Create emergent/one-off story (next XX00) |
| `followup` | `/pm-story followup {INDEX_PATH} {STORY_ID}` | Create follow-up (increments Y digit) |
| `split` | `/pm-story split {INDEX_PATH} {STORY_ID}` | Split oversized story (increments Z digit)  |

### ID Generation by Action

| Action | Input ID | Output ID(s) | Logic |
|--------|----------|--------------|-------|
| `generate` | next | `XX00` | Next available XX, Y=0, Z=0 |
| `generate --ad-hoc` | — | `XX00` | Next available XX, Y=0, Z=0 |
| `followup` | `XXY0` | `XX(Y+1)0` | Increment Y, keep XX, reset Z |
| `split` | `XXY0` | `XXY1`, `XXY2`, ... | Increment Z for each part |

**Examples:**
- `followup WISH-0100` → creates `WISH-0110`
- `followup WISH-0110` → creates `WISH-0120`
- `split WISH-0100` → creates `WISH-0101`, `WISH-0102` (based on split count)
- `split WISH-0110` → creates `WISH-0111`, `WISH-0112`

## Phases

| Action | Agent | Model | Signal |
|--------|-------|-------|--------|
| generate | `pm-story-generation-leader.agent.md` | sonnet | PM COMPLETE |
| generate --ad-hoc | `pm-story-adhoc-leader.agent.md` | sonnet | PM COMPLETE |
| followup | `pm-story-followup-leader.agent.md` | sonnet | PM COMPLETE |
| split | `pm-story-split-leader.agent.md` | sonnet | PM COMPLETE |

## Execution

### Step 1: Parse Action

```
action = first argument
path_arg = second argument

# Detect if path_arg is an index file or feature directory
if path_arg ends with ".stories.index.md":
    index_path = path_arg
    feature_dir = derive from index (see Step 1b)
    story_id = third argument OR "next" (default)
else:
    feature_dir = path_arg
    story_id = third argument (required for non-adhoc)
    index_path = find *.stories.index.md in feature_dir

if action == "generate":
    if "--ad-hoc" in args → route to adhoc-leader
    else → route to generation-leader
elif action == "followup" → route to followup-leader
elif action == "split" → route to split-leader
else → show usage and STOP
```

### Step 1b: Derive Feature Directory from Index Path

When given an index file path like `plans/stories/WISH.stories.index.md`:

1. Read the index file frontmatter to get `story_prefix`
2. Look for associated plan documents referenced in the index
3. Feature directory is typically the parent of the index file OR specified in index metadata

```
index_path: plans/stories/WISH.stories.index.md
→ Read frontmatter: story_prefix: "WISH"
→ story_dir: plans/stories/WISH/ (story folder location)
→ Output for WISH-0100: plans/stories/WISH/WISH-0100/
```

### Step 1c: Find Next Available Story

When `story_id == "next"` or not provided:

1. Read the index file
2. Parse the "Stories by Phase" tables
3. Find first story matching criteria:
   - Status is `Draft`, `Pending`, or `Ready` (not yet generated/in-progress)
   - All dependencies satisfied (Blocked By is empty or all blockers are `Done`/`completed`)
4. Return that story ID

**Status eligibility for "next":**

| Status | Eligible? | Reason |
|--------|-----------|--------|
| `Draft` | YES | Not yet generated |
| `Pending` | YES | Not yet started |
| `Ready` | YES | Ready to work |
| `Created` | NO | Already generated, needs elaboration |
| `backlog` | NO | Already generated, needs elaboration |
| `In Elaboration` | NO | Currently being elaborated |
| `elaboration` | NO | Currently being elaborated |
| `Ready for Review` | NO | Already generated, in review |
| `Approved` | NO | Already approved |
| `In Progress` | NO | Currently being worked |
| `generated` | NO | Already generated |
| `completed` / `Done` | NO | Already finished |
| `Blocked` | MAYBE | Only if blockers now satisfied |

**Priority order for "next":**
1. Stories in "Ready to Start" section (if present)
2. First story in phase order with status `Draft`/`Pending`/`Ready` and satisfied dependencies
3. If all stories blocked → report `PM BLOCKED: All stories have unmet dependencies`

```
Example from WISH.stories.index.md:
- WISH-0100: Ready for Review → skip (already generated)
- WISH-0200: In Progress → skip (in progress)
- WISH-0300: Draft, blocked by WISH-0200 → skip (blocked)
- WISH-0400: Draft, no blockers → THIS IS NEXT
```

### Step 2: Spawn Leader

```
Task tool:
  subagent_type: "general-purpose"
  model: sonnet
  description: "PM <action> {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/pm-story-<action>-leader.agent.md

    CONTEXT:
    Action: <action>
    Index path: {INDEX_PATH}
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}  # Already resolved from "next" if applicable
```

### Step 3: Handle Response

- Wait for completion signal
- `PM COMPLETE` → report success, suggest next step
- `PM BLOCKED: <reason>` → report blocker to user
- `PM FAILED: <reason>` → report failure

## Error Handling

Report: "PM story action '<action>' failed: <reason>"

## Done

Report what was created and next step.

**Output format:**
```
Story created: {PREFIX}-{XXYZ}
  - XX (story): {XX}
  - Y (follow-up): {Y}
  - Z (split): {Z}

Next: /elab-story {INDEX_PATH} {STORY_ID}
```

**Next by action:**
- generate → `/elab-story {INDEX_PATH} {STORY_ID}`
- generate --ad-hoc → `/elab-story {INDEX_PATH} {NEW_ID}`
- followup → `/elab-story {INDEX_PATH} {FOLLOWUP_ID}` (e.g., WISH-0110)
- split → `/elab-story {INDEX_PATH} {FIRST_SPLIT}` (e.g., WISH-0101)

## Ref

`.claude/docs/pm-story-reference.md`
