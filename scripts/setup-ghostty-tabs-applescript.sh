#!/bin/bash

# BMAD Ghostty Tabs Setup using AppleScript
# This script opens one Ghostty window and uses AppleScript to create tabs

echo "👻 BMAD Ghostty Tabs Setup (AppleScript)"
echo "========================================"
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script only works on macOS"
    exit 1
fi

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

# Wait for Ghostty to open
sleep 2

echo ""
echo "⚠️  PERMISSION REQUIRED:"
echo "========================"
echo "macOS requires permission for AppleScript to send keystrokes."
echo "Please go to: System Preferences > Security & Privacy > Privacy > Accessibility"
echo "And add 'Terminal' (or your terminal app) to the list."
echo ""
echo "Press Enter when ready to continue with automated tab creation..."
read

# Use AppleScript to create tabs and set titles
osascript << 'APPLESCRIPT'
tell application "Ghostty"
    activate
    
    -- Create tab 2: Planning
    tell application "System Events"
        key code 17 using command down -- Cmd+T
    end tell
    delay 0.5
    tell application "System Events"
        keystroke "printf '\\e]0;📋 Planning\\e\\\\' && echo '📋 Planning Terminal - Load with: @pm, @architect, @ux-expert, @analyst'"
        key code 36 -- Enter
    end tell
    delay 0.5
    
    -- Create tab 3: Stories
    tell application "System Events"
        key code 17 using command down -- Cmd+T
    end tell
    delay 0.5
    tell application "System Events"
        keystroke "printf '\\e]0;📝 Stories\\e\\\\' && echo '📝 Stories Terminal - Load with: @sm'"
        key code 36 -- Enter
    end tell
    delay 0.5
    
    -- Create tab 4: Development
    tell application "System Events"
        key code 17 using command down -- Cmd+T
    end tell
    delay 0.5
    tell application "System Events"
        keystroke "printf '\\e]0;💻 Development\\e\\\\' && echo '💻 Development Terminal - Load with: @dev'"
        key code 36 -- Enter
    end tell
    delay 0.5
    
    -- Create tab 5: Quality
    tell application "System Events"
        key code 17 using command down -- Cmd+T
    end tell
    delay 0.5
    tell application "System Events"
        keystroke "printf '\\e]0;🧪 Quality\\e\\\\' && echo '🧪 Quality Terminal - Load with: @qa'"
        key code 36 -- Enter
    end tell
    
    -- Go back to first tab (Orchestrator)
    tell application "System Events"
        key code 18 using command down -- Cmd+1
    end tell
    delay 0.5
    tell application "System Events"
        keystroke "printf '\\e]0;🎭 Orchestrator\\e\\\\' && echo '🎭 Orchestrator Terminal - Load with: @bmad-orchestrator'"
        key code 36 -- Enter
    end tell
end tell
APPLESCRIPT

echo ""
echo "✅ Created 5 Ghostty tabs with proper titles!"
echo ""
echo "📝 Tab Layout:"
echo "  Tab 1: 🎭 Orchestrator"
echo "  Tab 2: 📋 Planning"
echo "  Tab 3: 📝 Stories"
echo "  Tab 4: 💻 Development"
echo "  Tab 5: 🧪 Quality"
echo ""
echo "💡 Use Cmd+1, Cmd+2, etc. to switch between tabs"
