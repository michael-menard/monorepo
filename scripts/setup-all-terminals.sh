#!/bin/bash
echo "🎭 BMAD Terminal Setup"
echo "====================="
echo ""

# Check for command line arguments
if [[ "$1" == "--tabs" ]]; then
    USE_TABS=true
    echo "📑 Tab mode requested (single window with multiple tabs)"
elif [[ "$1" == "--windows" ]]; then
    USE_TABS=false
    echo "🪟 Window mode requested (multiple separate windows)"
elif [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Usage: $0 [--tabs|--windows|--help]"
    echo ""
    echo "Options:"
    echo "  --tabs     Open tabs in a single Ghostty window (macOS only, uses AppleScript)"
    echo "  --windows  Open separate Ghostty windows (default)"
    echo "  --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                # Default: separate windows"
    echo "  $0 --windows      # Explicit: separate windows"
    echo "  $0 --tabs         # Single window with tabs (macOS only)"
    exit 0
else
    USE_TABS=false
    echo "🪟 Using default mode: separate windows"
    echo "💡 Use --tabs for single window with tabs, or --help for options"
fi

echo ""

# Check if we're on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check if Ghostty is available (either in PATH or as app bundle)
    if command -v ghostty &> /dev/null || [ -d "/Applications/Ghostty.app" ]; then

        # Determine Ghostty command path
        if command -v ghostty &> /dev/null; then
            GHOSTTY_CMD="ghostty"
        else
            GHOSTTY_CMD="open -na ghostty --args"
        fi

        if [[ "$USE_TABS" == "true" ]]; then
            echo "👻 Detected Ghostty - setting up single window with tabs..."
            # Use the manual approach for tabs (more reliable)
            exec ./scripts/setup-ghostty-tabs-manual.sh
        else
            echo "👻 Detected Ghostty - opening 5 separate terminal windows..."
        fi

        # Ghostty - open multiple windows with titles
        if command -v ghostty &> /dev/null; then
            # Direct ghostty command
            ghostty --working-directory="$(pwd)" --title="🎭 Orchestrator" &
            sleep 0.5
            ghostty --working-directory="$(pwd)" --title="📋 Planning" &
            sleep 0.5
            ghostty --working-directory="$(pwd)" --title="📝 Stories" &
            sleep 0.5
            ghostty --working-directory="$(pwd)" --title="💻 Development" &
            sleep 0.5
            ghostty --working-directory="$(pwd)" --title="🧪 Quality" &
        else
            # Using open command for app bundle (correct syntax for macOS)
            open -na ghostty --args --working-directory="$(pwd)" --title="🎭 Orchestrator" &
            sleep 0.5
            open -na ghostty --args --working-directory="$(pwd)" --title="📋 Planning" &
            sleep 0.5
            open -na ghostty --args --working-directory="$(pwd)" --title="📝 Stories" &
            sleep 0.5
            open -na ghostty --args --working-directory="$(pwd)" --title="💻 Development" &
            sleep 0.5
            open -na ghostty --args --working-directory="$(pwd)" --title="🧪 Quality" &
        fi

        echo "✅ Opened 5 Ghostty terminal windows with proper titles"

    # Fallback to Terminal.app if Ghostty not available
    elif command -v osascript &> /dev/null; then
        osascript << 'APPLESCRIPT'
tell application "Terminal"
    activate

    -- Terminal 1: Orchestrator
    do script "cd " & (do shell script "pwd") & " && echo '🎭 Orchestrator Terminal' && echo 'Load with: @bmad-orchestrator'"

    -- Terminal 2: Planning
    do script "cd " & (do shell script "pwd") & " && echo '📋 Planning Terminal' && echo 'Load with: @pm, @architect, @ux-expert, @analyst'"

    -- Terminal 3: Stories
    do script "cd " & (do shell script "pwd") & " && echo '📝 Stories Terminal' && echo 'Load with: @sm'"

    -- Terminal 4: Development
    do script "cd " & (do shell script "pwd") & " && echo '💻 Development Terminal' && echo 'Load with: @dev'"

    -- Terminal 5: Quality
    do script "cd " & (do shell script "pwd") & " && echo '🧪 Quality Terminal' && echo 'Load with: @qa'"
end tell
APPLESCRIPT

        echo "✅ Opened 5 terminal windows in Terminal.app"
    else
        echo "⚠️  Neither Ghostty nor Terminal.app found."
    fi

elif command -v gnome-terminal &> /dev/null; then
    # Linux with GNOME Terminal
    gnome-terminal --tab --title="🎭 Orchestrator" -- bash -c "echo '🎭 Orchestrator Terminal - Load with: @bmad-orchestrator'; bash"
    gnome-terminal --tab --title="📋 Planning" -- bash -c "echo '📋 Planning Terminal - Load with: @pm, @architect, @ux-expert, @analyst'; bash"
    gnome-terminal --tab --title="📝 Stories" -- bash -c "echo '📝 Stories Terminal - Load with: @sm'; bash"
    gnome-terminal --tab --title="💻 Development" -- bash -c "echo '💻 Development Terminal - Load with: @dev'; bash"
    gnome-terminal --tab --title="🧪 Quality" -- bash -c "echo '🧪 Quality Terminal - Load with: @qa'; bash"

    echo "✅ Opened 5 terminal tabs in GNOME Terminal"

else
    echo "⚠️  Automatic terminal opening not supported on this system."
    echo "Please manually open 5 terminals and run the individual scripts:"
    echo "  ./scripts/terminal-orchestrator.sh"
    echo "  ./scripts/terminal-planning.sh"
    echo "  ./scripts/terminal-stories.sh"
    echo "  ./scripts/terminal-development.sh"
    echo "  ./scripts/terminal-quality.sh"
fi
