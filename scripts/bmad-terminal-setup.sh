#!/bin/bash

# BMAD Multi-Terminal Setup Script
# This script helps you quickly set up the optimized 5-terminal BMAD workflow

set -e

echo "🎭 BMAD Multi-Terminal Workflow Setup"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f ".bmad-core/core-config.yaml" ]; then
    echo "❌ Error: Not in BMAD project root. Please run from project directory."
    exit 1
fi

echo "✅ BMAD project detected"
echo ""

# Function to create terminal session files
create_session_template() {
    local terminal_name=$1
    local agent_command=$2
    local description=$3
    
    cat > "scripts/terminal-${terminal_name}.sh" << EOF
#!/bin/bash
# ${description}
# Auto-generated terminal session for ${terminal_name}

echo "🚀 Starting ${terminal_name} Terminal"
echo "Agent: ${agent_command}"
echo "Description: ${description}"
echo ""
echo "Quick commands to get started:"
echo "  ${agent_command}"
echo "  *help"
echo ""
echo "Press Enter to continue..."
read

# You can add auto-loading here if desired
# echo "${agent_command}"
EOF
    
    chmod +x "scripts/terminal-${terminal_name}.sh"
    echo "✅ Created scripts/terminal-${terminal_name}.sh"
}

# Create scripts directory if it doesn't exist
mkdir -p scripts

echo "📝 Creating terminal session templates..."
echo ""

# Create individual terminal templates
create_session_template "orchestrator" "@bmad-orchestrator" "Workflow Management & Coordination"
create_session_template "planning" "@pm" "Planning, Architecture, UX, Analysis"
create_session_template "stories" "@sm" "Story Creation & Management"
create_session_template "development" "@dev" "Code Implementation"
create_session_template "quality" "@qa" "Quality Assurance & Testing"

echo ""
echo "🎯 Creating workflow shortcuts..."

# Create workflow shortcut scripts
cat > "scripts/start-greenfield.sh" << 'EOF'
#!/bin/bash
echo "🌱 Starting Greenfield Development Workflow"
echo ""
echo "Recommended sequence:"
echo "1. Terminal 1 (Orchestrator): *workflow-start greenfield-fullstack"
echo "2. Terminal 2 (Planning): Follow orchestrator guidance"
echo "3. Terminal 3 (Stories): Create stories when planning complete"
echo "4. Terminal 4 (Dev): Implement stories"
echo "5. Terminal 5 (QA): Review and quality gates"
echo ""
echo "Press Enter to open orchestrator terminal..."
read
./scripts/terminal-orchestrator.sh
EOF

cat > "scripts/start-brownfield.sh" << 'EOF'
#!/bin/bash
echo "🏗️ Starting Brownfield Enhancement Workflow"
echo ""
echo "Recommended sequence:"
echo "1. Terminal 1 (Orchestrator): *workflow-start brownfield-fullstack"
echo "2. Terminal 2 (Planning): Analyze existing system"
echo "3. Terminal 3 (Stories): Create enhancement stories"
echo "4. Terminal 4 (Dev): Implement changes"
echo "5. Terminal 5 (QA): Integration testing and review"
echo ""
echo "Press Enter to open orchestrator terminal..."
read
./scripts/terminal-orchestrator.sh
EOF

chmod +x scripts/start-*.sh

echo "✅ Created workflow shortcuts"
echo ""

# Create a master setup script
cat > "scripts/setup-all-terminals.sh" << 'EOF'
#!/bin/bash
echo "🎭 Opening all BMAD terminals..."
echo ""

# Check if we're on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use Terminal.app
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
EOF

chmod +x scripts/setup-all-terminals.sh

echo "✅ Created master setup script"
echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Available commands:"
echo "  ./scripts/setup-all-terminals.sh    # Open all 5 terminals at once"
echo "  ./scripts/start-greenfield.sh       # Start greenfield workflow"
echo "  ./scripts/start-brownfield.sh       # Start brownfield workflow"
echo ""
echo "Individual terminal scripts:"
echo "  ./scripts/terminal-orchestrator.sh  # Workflow management"
echo "  ./scripts/terminal-planning.sh      # Planning & architecture"
echo "  ./scripts/terminal-stories.sh       # Story creation"
echo "  ./scripts/terminal-development.sh   # Code implementation"
echo "  ./scripts/terminal-quality.sh       # Quality assurance"
echo ""
echo "📖 See docs/bmad-optimized-workflow.md for detailed usage guide"
