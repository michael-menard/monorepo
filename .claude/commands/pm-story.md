---
created: 2026-01-24
updated: 2026-01-31
version: 3.3.0
type: orchestrator
agents: ["pm-story-seed-agent.agent.md", "pm-story-generation-leader.agent.md", "pm-story-adhoc-leader.agent.md", "pm-story-followup-leader.agent.md", "pm-story-split-leader.agent.md"]
---

/pm-story <action> [args]

Unified command for all PM story generation and transformation operations. Do NOT implement directly.

## Story ID Format: `{PREFIX}-XXYZ`

Story IDs follow the pattern `{PREFIX}-XXYZ` where:

| Position | Meaning | Range | Description |
|----------|---------|-------|-------------|
| XX | Story number | 00-99 | Base story sequence number |
| Y | Split | 0-9 | 0 = original, 1-9 = split part |
| Z | Follow-up | 0-9 | 0 = original, 1-9 = follow-up iteration |

**Examples:**

| Story ID | Meaning |
|----------|---------|
| `WISH-0100` | Story 01, original |
| `WISH-0110` | Story 01, split 1 |
| `WISH-0120` | Story 01, split 2 |
| `WISH-0101` | Story 01, follow-up 1 |
| `WISH-0102` | Story 01, follow-up 2 |
| `WISH-0111` | Story 01, split 1, follow-up 1 |
| `WISH-2000` | Story 20, original |
| `WISH-2001` | Story 20, follow-up 1 |

**Numbering rules:**
- New stories increment XX (e.g., 01→02→03)
- Splits increment Y on the parent story (e.g., 0100→0110, 0120)
- Follow-ups increment Z on the parent story (e.g., 0100→0101→0102)
- Ad-hoc stories use next available XX with Y=0, Z=0

## Usage

```
# By index file path (recommended) - auto-finds next available story
/pm-story generate plans/stories/WISH.stories.index.md
/pm-story generate plans/stories/WISH.stories.index.md WISH-0500

# By feature directory (legacy)
/pm-story generate plans/future/wishlist WISH-0100
/pm-story generate plans/future/wishlist next

# Follow-up: creates WISH-0101 from WISH-0100 (increments Z)
/pm-story followup plans/stories/WISH.stories.index.md WISH-0100

# Split: creates WISH-0110, WISH-0120 from WISH-0100 (increments Y)
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
| `followup` | `/pm-story followup {INDEX_PATH} {STORY_ID}` | Create follow-up (increments Z digit) |
| `split` | `/pm-story split {INDEX_PATH} {STORY_ID}` | Split oversized story (increments Y digit)  |

### ID Generation by Action

| Action | Input ID | Output ID(s) | Logic |
|--------|----------|--------------|-------|
| `generate` | next | `XX00` | Next available XX, Y=0, Z=0 |
| `generate --ad-hoc` | — | `XX00` | Next available XX, Y=0, Z=0 |
| `split` | `XX0Z` | `XX1Z`, `XX2Z`, ... | Increment Y for each part, keep Z |
| `followup` | `XXY0` | `XXY1`, `XXY2`, ... | Increment Z, keep XX and Y |

**Examples:**
- `split WISH-0100` → creates `WISH-0110`, `WISH-0120` (based on split count)
- `split WISH-0101` → creates `WISH-0111`, `WISH-0121` (keeps Z=1)
- `followup WISH-0100` → creates `WISH-0101`
- `followup WISH-0101` → creates `WISH-0102`
- `followup WISH-0110` → creates `WISH-0111` (keeps Y=1)

## Collision Detection (REQUIRED)

Before generating ANY story ID, the system MUST check:

1. **Directory check**: Does `{OUTPUT_DIR}/{STORY_ID}/` already exist?
2. **Index check**: Does `stories.index.md` contain an entry for `{STORY_ID}`?

If collision detected:
- For splits: Increment Y until unique (Y=1, Y=2, ...)
- For follow-ups: Increment Z until unique (Z=1, Z=2, ...)
- For new stories: Increment XX until unique

Report if no unique ID found within range (Y/Z max=9, XX max=99).

## Phases

### Phase 0: Story Seed (Pre-Generation)

Before spawning the leader agent, the orchestrator runs the Story Seed phase to:
1. Load the most recent active baseline reality
2. Retrieve relevant codebase context for the story scope
3. Generate initial story structure (seed) grounded in reality
4. Pass seed to subsequent leader phases

| Phase | Agent | Model | Signal |
|-------|-------|-------|--------|
| Seed | `pm-story-seed-agent.agent.md` | sonnet | STORY-SEED COMPLETE |

**Seed Phase Flow:**
1. Find most recent baseline: `plans/baselines/BASELINE-REALITY-*.md` (sorted by date, take latest with `status: active`)
2. If no active baseline exists, continue with warning (seed will flag missing context)
3. Spawn seed agent with baseline path and story context
4. Wait for `STORY-SEED COMPLETE` or handle `STORY-SEED BLOCKED`
5. Pass seed output to leader agent

### Phase 1+: Leader Phases

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

### Step 2: Story Seed Phase (Phase 0)

Before spawning the main leader, run the Story Seed phase to ground the story in current reality.

**2a. Find Most Recent Baseline**

```
# Scan for baseline files
baseline_files = glob("plans/baselines/BASELINE-REALITY-*.md")

# Sort by date in filename (descending)
baseline_files.sort(by=date, desc=true)

# Find first active baseline
for file in baseline_files:
    if frontmatter(file).status == "active":
        baseline_path = file
        break

# If no active baseline, use most recent draft or null
if not baseline_path:
    if baseline_files.length > 0:
        baseline_path = baseline_files[0]  # Most recent (may be draft)
        log_warning("Using non-active baseline: {baseline_path}")
    else:
        baseline_path = null
        log_warning("No baseline reality file found")
```

**2b. Derive Output Directory**

```
# From index path, derive where story artifacts will be written
# Example: plans/stories/WISH.stories.index.md → plans/stories/WISH/{STORY_ID}/
output_dir = {INDEX_DIR}/{PREFIX}/{STORY_ID}/
```

**2c. Spawn Seed Agent**

```
Task tool:
  subagent_type: "general-purpose"
  model: sonnet
  description: "Story Seed {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/pm-story-seed-agent.agent.md

    CONTEXT:
    Baseline path: {BASELINE_PATH}  # May be null if no baseline exists
    Index path: {INDEX_PATH}
    Story ID: {STORY_ID}
    Output directory: {OUTPUT_DIR}

    Story entry from index:
    <paste relevant story entry from index>
```

**2d. Handle Seed Response**

```
if response contains "STORY-SEED BLOCKED":
    report "PM BLOCKED: Story seed failed - {reason}"
    STOP

if response contains "STORY-SEED COMPLETE WITH WARNINGS":
    log_warnings(response.warnings)
    seed_path = "{OUTPUT_DIR}/_pm/STORY-SEED.md"
    continue to Step 3

if response contains "STORY-SEED COMPLETE":
    seed_path = "{OUTPUT_DIR}/_pm/STORY-SEED.md"
    continue to Step 3
```

### Step 3: Spawn Leader

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
    Seed path: {SEED_PATH}  # Path to story seed generated in Phase 0

    IMPORTANT: Read the story seed at {SEED_PATH} before spawning workers.
    The seed contains:
    - Reality context (what exists, in-progress work, constraints)
    - Retrieved codebase context (reuse candidates, related code)
    - Conflict analysis (overlapping work, pattern violations)
    - Initial story structure (title, description, initial ACs)
    - Recommendations for each worker (Test Plan, UI/UX, Feasibility)

    Use the seed to inform worker context and ensure grounded output.
```

### Step 4: Handle Response

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
