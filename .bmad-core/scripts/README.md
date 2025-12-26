# BMAD Scripts

Utility scripts for BMAD workflow automation.

## Available Scripts

### batch-create-issues-v2.sh ⭐ RECOMMENDED

**Version 2.0** - Enhanced version with better labels and project assignment.

**Usage:**
```bash
bash .bmad-core/scripts/batch-create-issues-v2.sh
```

**What it does:**
- Scans `docs/stories/` for all `.md` files
- Skips files starting with `_` or special files
- Skips stories that already have "## GitHub Issue" section
- Creates GitHub issue for each story with:
  - Title from story file
  - Story statement and acceptance criteria in body
  - **Epic-specific labels** (e.g., `epic-3-gallery`, `epic-7-realtime`)
  - **Type labels** (e.g., `type:feature`, `type:validation`, `type:infrastructure`)
  - **Status labels** (`groomed` - ready to work)
  - **Core labels** (`story`, `bmad`)
  - **Project assignment** to "LEGO MOC Instructions App"
- Updates story file with GitHub issue section
- Provides summary report

**Label Logic:**
- **Epic labels:** Determined from filename (e.g., `3.1.1` → `epic-3-gallery`)
- **Type labels:** Determined from story content:
  - Mentions "test/testing" → `type:validation`
  - Mentions "infrastructure/setup/config" → `type:infrastructure`
  - Default → `type:feature`

**Prerequisites:**
- GitHub CLI (`gh`) installed and authenticated
- Epic labels exist in repository (script will use them)
- Project "LEGO MOC Instructions App" exists

---

### batch-create-issues.sh (Legacy)

**Version 1.0** - Original version with basic labels.

**Usage:**
```bash
bash .bmad-core/scripts/batch-create-issues.sh
```

**What it does:**
- Same as v2 but with simpler labels
- Labels: `user-story`, `bmad` only
- No project assignment

**Note:** Use v2 for new issues. This is kept for reference.

**Prerequisites:**
- GitHub CLI (`gh`) installed and authenticated
- Labels `user-story` and `bmad` exist in repository

---

### set-issue-status.sh

Updates the GitHub project status for an issue.

**Usage:**
```bash
bash .bmad-core/scripts/set-issue-status.sh <issue-number> <status>
```

**Status Options:**
- `Todo` - Story is ready to be worked on
- `InProgress` (or `In Progress`) - Developer is actively working
- `Done` - Story is complete and merged

**Examples:**
```bash
# Set issue to In Progress when starting work
bash .bmad-core/scripts/set-issue-status.sh 328 InProgress

# Set issue to Done when PR is merged
bash .bmad-core/scripts/set-issue-status.sh 328 Done

# Set issue to Todo when creating
bash .bmad-core/scripts/set-issue-status.sh 328 Todo
```

**What it does:**
- Finds the issue in the "LEGO MOC Instructions App" project
- Updates the Status field to the specified value
- Provides confirmation message

**Used by:**
- SM agent when creating issues (sets to "Todo")
- Dev agent when starting work (sets to "In Progress")
- GitHub Actions when PR is merged (sets to "Done")

**Prerequisites:**
- GitHub CLI (`gh`) installed and authenticated
- Issue must be added to the project

---

### get-next-story.sh

Automatically finds the next story to work on from the GitHub project board.

**Usage:**
```bash
bash .bmad-core/scripts/get-next-story.sh
```

**What it does:**
- Queries GitHub for all open issues with `user-story` label
- Finds the first issue with a valid story number format (X.Y.Z)
- Extracts the story number from the issue title
- Locates the corresponding story file in `docs/stories/`
- Displays story information (issue #, URL, story number, file path)
- Shows story description and acceptance criteria preview
- Outputs the story file path (last line) for automation

**Selection criteria:**
- Issues are sorted by number (lowest first)
- Only issues with story number format (X.Y.Z) in title are selected
- Skips issues without valid story numbers (e.g., bugs, tasks)

**Use case:**
- Used by Dev agent's `*next` command
- Automates story selection for developers
- Ensures work is done in priority order

**Output example:**
```
=== Next Story to Develop ===
Issue: #228
URL: https://github.com/michael-menard/monorepo/issues/228
Story: 3.1.1
File: docs/stories/3.1.1.instructions-gallery-scaffolding.md

--- Story ---
**As a** developer,
**I want** the Instructions Gallery page scaffolded,
**so that** users can browse their MOC instruction collection.

--- Acceptance Criteria (preview) ---
1. ✅ Route module created
2. ✅ InstructionsGalleryPage component renders
...

docs/stories/3.1.1.instructions-gallery-scaffolding.md
```

**Error handling:**
- No stories found: Returns error message
- Invalid story number: Skips to next issue
- Story file not found: Returns error with details

---

### add-issues-to-project.sh

Adds all existing GitHub issues to the "LEGO MOC Instructions App" project and sets their status to "Todo".

**Usage:**
```bash
bash .bmad-core/scripts/add-issues-to-project.sh
```

**What it does:**
- Scans all story files in `docs/stories/`
- Extracts GitHub issue numbers
- Gets issue node ID from GitHub
- Adds issue to project using GraphQL API
- Sets status to "Todo" using `set-issue-status.sh`
- Updates story file status to "Todo"
- Provides detailed progress and summary

**Use case:**
- One-time initialization of existing issues
- Bulk adding issues to project after batch creation
- Recovering from issues not being added to project

**Output:**
- Success count
- Failure count (with details)
- Skipped count
- Link to project board

---

### set-all-issues-todo.sh (Deprecated)

**Note:** This script is deprecated. Use `add-issues-to-project.sh` instead.

Original script that attempted to set status without adding to project first. Kept for reference.

---

### close-old-issues.sh

Closes all GitHub issues created before a specific date.

**Usage:**
```bash
bash .bmad-core/scripts/close-old-issues.sh
```

**What it does:**
- Finds all issues created before 2025-12-21
- Closes them with reason "not planned"
- Provides summary report

**Note:** Edit the script to change the date threshold.

**Prerequisites:**
- GitHub CLI (`gh`) installed and authenticated

---

## Prerequisites

All scripts require:

1. **GitHub CLI installed:**
   ```bash
   brew install gh
   ```

2. **GitHub authentication:**
   ```bash
   gh auth login
   ```

3. **Repository labels:**
   - `user-story` - User story from BMAD workflow
   - `bmad` - BMAD (Breakthrough Method of Agile AI-driven Development)
   - `epic` - Epic tracking issue

## Notes

- These scripts are safe to run multiple times
- They skip items that have already been processed
- All scripts provide detailed output and error handling
- Scripts are used by BMAD SM agent tasks but can also be run manually

