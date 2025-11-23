#!/bin/bash

# BMAD Ghostty Single Window Setup
# Opens one Ghostty window and provides instructions for manual tab creation

echo "👻 BMAD Ghostty Single Window Setup"
echo "==================================="
echo ""

# Check if Ghostty is available
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
echo "🚀 Opening initial Ghostty window..."

# Open the first window (Orchestrator)
$GHOSTTY_CMD --working-directory="$(pwd)" --title="🎭 Orchestrator" &

echo ""
echo "✅ Opened Ghostty window with title: 🎭 Orchestrator"
echo ""
echo "📋 MANUAL SETUP REQUIRED:"
echo "========================="
echo ""
echo "Since Ghostty doesn't support opening tabs from command line yet,"
echo "please manually create 4 additional tabs using Cmd+T and set their titles:"
echo ""
echo "1. 🎭 Orchestrator (already open)"
echo "   - Load with: @bmad-orchestrator"
echo "   - Commands: *workflow, *status, *workflow-next"
echo ""
echo "2. 📋 Planning (create new tab: Cmd+T)"
echo "   - Set title: printf '\\e]0;📋 Planning\\e\\\\'"
echo "   - Load with: @pm, @architect, @ux-expert, @analyst"
echo "   - Commands: *create-doc, *brainstorm, *research"
echo ""
echo "3. 📝 Stories (create new tab: Cmd+T)"
echo "   - Set title: printf '\\e]0;📝 Stories\\e\\\\'"
echo "   - Load with: @sm"
echo "   - Commands: *draft, *validate"
echo ""
echo "4. 💻 Development (create new tab: Cmd+T)"
echo "   - Set title: printf '\\e]0;💻 Development\\e\\\\'"
echo "   - Load with: @dev"
echo "   - Commands: *develop-story, *help"
echo ""
echo "5. 🧪 Quality (create new tab: Cmd+T)"
echo "   - Set title: printf '\\e]0;🧪 Quality\\e\\\\'"
echo "   - Load with: @qa"
echo "   - Commands: *risk, *design, *review, *gate"
echo ""
echo "💡 Pro tip: You can also use the helper functions:"
echo "   source scripts/ghostty-helpers.sh"
echo "   title-orchestrator, title-planning, title-stories, title-development, title-quality"
