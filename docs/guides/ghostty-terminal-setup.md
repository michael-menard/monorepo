# Ghostty Terminal Setup for BMAD Workflow

## Problem Solved

The original BMAD terminal setup scripts were designed for Terminal.app and GNOME Terminal, but didn't work properly with Ghostty terminal emulator. Terminal tabs weren't being renamed correctly.

## Solution

Updated the terminal setup scripts to properly detect and work with Ghostty using the correct command-line syntax.

## Key Changes Made

### 1. Updated `scripts/setup-all-terminals.sh`

- Added Ghostty detection (both in PATH and as app bundle)
- Uses correct Ghostty command syntax: `--working-directory` and `--title` flags
- Proper `open` command syntax for macOS app bundles: `open -na ghostty --args`

### 2. Updated Individual Terminal Scripts

All terminal scripts now set their titles using escape sequences:

- `scripts/terminal-orchestrator.sh` → 🎭 Orchestrator
- `scripts/terminal-planning.sh` → 📋 Planning
- `scripts/terminal-stories.sh` → 📝 Stories
- `scripts/terminal-development.sh` → 💻 Development
- `scripts/terminal-quality.sh` → 🧪 Quality

### 3. Created Ghostty-Specific Scripts

- `scripts/ghostty-setup.sh` - Dedicated Ghostty setup script
- `scripts/ghostty-helpers.sh` - Shell functions for easy title management
- `scripts/test-ghostty-title.sh` - Test script to verify functionality

## Usage

### Quick Setup Options

**Separate Windows (Default):**

```bash
./scripts/setup-all-terminals.sh
# or explicitly:
./scripts/setup-all-terminals.sh --windows
```

**Single Window with Tabs (manual setup):**

```bash
./scripts/setup-all-terminals.sh --tabs
```

_Note: Opens one window and provides step-by-step instructions for creating tabs manually_

**Help:**

```bash
./scripts/setup-all-terminals.sh --help
```

### Alternative Setup Scripts

**Ghostty-Specific Setup (separate windows):**

```bash
./scripts/ghostty-setup.sh
```

**Manual Tab Setup with Instructions:**

```bash
./scripts/setup-ghostty-tabs-manual.sh
```

**AppleScript Tab Creation (requires accessibility permissions):**

```bash
./scripts/setup-ghostty-tabs-applescript.sh
```

### Test Terminal Titles

```bash
./scripts/test-ghostty-title.sh
```

### Manual Terminal Title Setting

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Load BMAD Ghostty helpers
source /path/to/your/project/scripts/ghostty-helpers.sh

# Quick title shortcuts
alias title-orch='set_terminal_title "🎭 Orchestrator"'
alias title-plan='set_terminal_title "📋 Planning"'
alias title-story='set_terminal_title "📝 Stories"'
alias title-dev='set_terminal_title "💻 Development"'
alias title-qa='set_terminal_title "🧪 Quality"'
```

## Technical Details

### Ghostty Limitations

**Tab Creation from Command Line:**

- Ghostty does not currently support creating tabs in existing windows from the command line
- This feature is tracked in GitHub issue #2353 (Scripting API)
- Our tab solution uses AppleScript to simulate keyboard shortcuts (macOS only)

### Ghostty Command Syntax

```bash
# Direct command (if ghostty in PATH)
ghostty --working-directory="/path/to/dir" --title="Window Title"

# Via open command (for app bundle)
open -na ghostty --args --working-directory="/path/to/dir" --title="Window Title"
```

### Escape Sequence for Dynamic Titles

```bash
printf '\e]0;Your Title Here\e\\'
```

### AppleScript Tab Creation (macOS)

The `--tabs` option uses AppleScript to:

1. Open initial Ghostty window
2. Send Cmd+T keystrokes to create new tabs
3. Execute title-setting commands in each tab
4. Navigate back to the first tab

## Verification

After running the setup, you should see 5 Ghostty windows/tabs with these titles:

- 🎭 Orchestrator
- 📋 Planning
- 📝 Stories
- 💻 Development
- 🧪 Quality

Each window opens in the correct working directory and displays the appropriate agent loading instructions.
