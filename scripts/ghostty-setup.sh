#!/bin/bash

# BMAD Ghostty Terminal Setup Script
# Specifically designed for Ghostty terminal emulator

echo "👻 BMAD Ghostty Terminal Setup"
echo "=============================="
echo ""

# Check if Ghostty is available (either in PATH or as app bundle)
if command -v ghostty &> /dev/null; then
    GHOSTTY_CMD="ghostty"
    echo "✅ Ghostty detected in PATH"
elif [ -d "/Applications/Ghostty.app" ]; then
    GHOSTTY_CMD="open -na ghostty --args"
    echo "✅ Ghostty detected as app bundle"
else
    echo "❌ Error: Ghostty not found"
    echo "Please install Ghostty via Homebrew: brew install --cask ghostty"
    exit 1
fi
echo ""

# Function to set terminal title
set_terminal_title() {
    printf '\e]0;%s\e\\' "$1"
}

# Function to open a Ghostty window with title and setup
open_ghostty_terminal() {
    local title="$1"
    local agent="$2"
    local description="$3"

    $GHOSTTY_CMD --working-directory="$(pwd)" --title="$title" &
    sleep 0.5
}

echo "🚀 Opening 5 BMAD terminals in Ghostty..."
echo ""

# Open all terminals
open_ghostty_terminal "🎭 Orchestrator" "@bmad-orchestrator" "Workflow Management & Coordination"
open_ghostty_terminal "📋 Planning" "@pm, @architect, @ux-expert, @analyst" "Planning, Architecture, UX, Analysis"
open_ghostty_terminal "📝 Stories" "@sm" "Story Creation & Management"
open_ghostty_terminal "💻 Development" "@dev" "Code Implementation"
open_ghostty_terminal "🧪 Quality" "@qa" "Quality Assurance & Testing"

echo "✅ Opened 5 Ghostty terminal windows with proper titles"
echo ""
echo "📝 Terminal Layout:"
echo "  🎭 Orchestrator - Workflow management and coordination"
echo "  📋 Planning - PM, Architect, UX Expert, Analyst agents"
echo "  📝 Stories - Story Manager agent for story creation"
echo "  💻 Development - Developer agent for implementation"
echo "  🧪 Quality - QA agent for testing and review"
echo ""
echo "💡 Pro tip: Add this to your shell config for easy title setting:"
echo "   alias set-title='printf \"\\e]0;%s\\e\\\\\"'"
echo "   Usage: set-title \"My Custom Title\""
