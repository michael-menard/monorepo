#!/bin/bash

# BMAD Ghostty Manual Tab Setup
# Opens one window and provides step-by-step instructions for creating tabs

echo "👻 BMAD Ghostty Manual Tab Setup"
echo "================================"
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

# Open the first window
$GHOSTTY_CMD --working-directory="$(pwd)" --title="🎭 Orchestrator" &

echo ""
echo "✅ Opened Ghostty window!"
echo ""
echo "📋 MANUAL TAB CREATION STEPS:"
echo "============================="
echo ""
echo "Now please follow these steps in the Ghostty window:"
echo ""
echo "1. 🎭 ORCHESTRATOR TAB (already open)"
echo "   - Run: printf '\\e]0;🎭 Orchestrator\\e\\\\'"
echo "   - Run: echo '🎭 Orchestrator Terminal - Load with: @bmad-orchestrator'"
echo ""
echo "2. 📋 PLANNING TAB"
echo "   - Press: Cmd+T (create new tab)"
echo "   - Run: printf '\\e]0;📋 Planning\\e\\\\'"
echo "   - Run: echo '📋 Planning Terminal - Load with: @pm, @architect, @ux-expert, @analyst'"
echo ""
echo "3. 📝 STORIES TAB"
echo "   - Press: Cmd+T (create new tab)"
echo "   - Run: printf '\\e]0;📝 Stories\\e\\\\'"
echo "   - Run: echo '📝 Stories Terminal - Load with: @sm'"
echo ""
echo "4. 💻 DEVELOPMENT TAB"
echo "   - Press: Cmd+T (create new tab)"
echo "   - Run: printf '\\e]0;💻 Development\\e\\\\'"
echo "   - Run: echo '💻 Development Terminal - Load with: @dev'"
echo ""
echo "5. 🧪 QUALITY TAB"
echo "   - Press: Cmd+T (create new tab)"
echo "   - Run: printf '\\e]0;🧪 Quality\\e\\\\'"
echo "   - Run: echo '🧪 Quality Terminal - Load with: @qa'"
echo ""
echo "💡 SHORTCUTS:"
echo "============="
echo "You can also use these helper commands (after sourcing ghostty-helpers.sh):"
echo "  title-orchestrator"
echo "  title-planning"
echo "  title-stories"
echo "  title-development"
echo "  title-quality"
echo ""
echo "🔄 TAB NAVIGATION:"
echo "=================="
echo "  Cmd+1, Cmd+2, Cmd+3, Cmd+4, Cmd+5 - Switch to specific tabs"
echo "  Cmd+Shift+[ or Cmd+Shift+] - Previous/Next tab"
echo ""
echo "✨ When complete, you'll have 5 properly titled tabs in one Ghostty window!"
