#!/bin/bash

# BMAD Ghostty Helper Functions
# Add these to your ~/.zshrc or ~/.bashrc for easy terminal title management

# Function to set terminal title
set_terminal_title() {
    if [ -n "$1" ]; then
        printf '\e]0;%s\e\\' "$1"
    else
        echo "Usage: set_terminal_title 'Your Title Here'"
    fi
}

# Alias for shorter command
alias set-title='set_terminal_title'

# BMAD-specific title shortcuts
alias title-orchestrator='set_terminal_title "🎭 Orchestrator"'
alias title-planning='set_terminal_title "📋 Planning"'
alias title-stories='set_terminal_title "📝 Stories"'
alias title-development='set_terminal_title "💻 Development"'
alias title-quality='set_terminal_title "🧪 Quality"'

# Function to show current BMAD terminal layout
bmad_terminal_layout() {
    echo "🎭 BMAD Terminal Layout for Ghostty"
    echo "=================================="
    echo ""
    echo "Use these commands to set terminal titles:"
    echo "  title-orchestrator  # 🎭 Orchestrator"
    echo "  title-planning      # 📋 Planning"
    echo "  title-stories       # 📝 Stories"
    echo "  title-development   # 💻 Development"
    echo "  title-quality       # 🧪 Quality"
    echo ""
    echo "Or use: set-title 'Custom Title'"
}

# Function to set up a BMAD terminal session
bmad_setup_terminal() {
    local role="$1"
    
    case "$role" in
        "orchestrator"|"orch")
            title-orchestrator
            echo "🎭 Orchestrator Terminal Ready"
            echo "Load with: @bmad-orchestrator"
            echo "Commands: *workflow, *status, *workflow-next"
            ;;
        "planning"|"plan")
            title-planning
            echo "📋 Planning Terminal Ready"
            echo "Load with: @pm, @architect, @ux-expert, @analyst"
            echo "Commands: *create-doc, *brainstorm, *research"
            ;;
        "stories"|"story")
            title-stories
            echo "📝 Stories Terminal Ready"
            echo "Load with: @sm"
            echo "Commands: *draft, *validate"
            ;;
        "development"|"dev")
            title-development
            echo "💻 Development Terminal Ready"
            echo "Load with: @dev"
            echo "Commands: *develop-story, *help"
            ;;
        "quality"|"qa")
            title-quality
            echo "🧪 Quality Terminal Ready"
            echo "Load with: @qa"
            echo "Commands: *risk, *design, *review, *gate"
            ;;
        *)
            echo "Usage: bmad_setup_terminal [orchestrator|planning|stories|development|quality]"
            echo "Short forms: orch, plan, story, dev, qa"
            ;;
    esac
}

# Alias for shorter command
alias bmad-setup='bmad_setup_terminal'

echo "🎭 BMAD Ghostty helpers loaded!"
echo "Run 'bmad_terminal_layout' to see available commands"
