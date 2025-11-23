#!/bin/bash

# BMAD Workflow Helper Functions
# Source this file to get helpful workflow commands

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to show current workflow status
bmad_status() {
    echo -e "${BLUE}🎭 BMAD Workflow Status${NC}"
    echo "========================"
    echo ""

    # Analyze project state
    local project_state=$(bmad_detect_state)
    echo -e "${CYAN}📊 Project State: ${project_state}${NC}"
    echo ""

    # Check for PRDs
    if [ -d "docs/prd" ]; then
        echo -e "${GREEN}📋 Available PRDs:${NC}"
        find docs/prd -name "*.md" -type f | head -5 | while read prd; do
            prd_name=$(basename "$(dirname "$prd")")
            echo "  • $prd_name"
        done
        echo ""
    fi

    # Check for active stories
    if [ -d "docs/stories" ]; then
        local story_count=$(find docs/stories -name "*.md" -type f | wc -l)
        echo -e "${GREEN}📝 Stories: ${story_count} total${NC}"

        # Show recent stories
        echo "Recent stories:"
        find docs/stories -name "*.md" -type f -exec ls -t {} + | head -5 | while read story; do
            story_name=$(basename "$story" .md)
            echo "  • $story_name"
        done
        echo ""
    fi

    # Check for QA gates
    if [ -d "docs/qa/gates" ]; then
        echo -e "${PURPLE}🧪 Recent QA Gates:${NC}"
        find docs/qa/gates -name "*.yml" -type f | head -3 | while read gate; do
            gate_name=$(basename "$gate" .yml)
            echo "  • $gate_name"
        done
        echo ""
    fi

    # Show recommended next steps based on state
    bmad_recommend_next_steps "$project_state"
}

# Function to quickly check which terminals should be running what
bmad_terminals() {
    echo -e "${CYAN}🖥️  BMAD Terminal Layout${NC}"
    echo "========================"
    echo ""
    echo -e "${BLUE}Terminal 1:${NC} 🎭 Orchestrator (@bmad-orchestrator)"
    echo "  Commands: *workflow, *status, *workflow-next"
    echo ""
    echo -e "${GREEN}Terminal 2:${NC} 📋 Planning (@pm, @architect, @ux-expert, @analyst)"
    echo "  Commands: *create-doc, *brainstorm, *research"
    echo ""
    echo -e "${YELLOW}Terminal 3:${NC} 📝 Stories (@sm)"
    echo "  Commands: *draft, *validate"
    echo ""
    echo -e "${PURPLE}Terminal 4:${NC} 💻 Development (@dev)"
    echo "  Commands: *develop-story, *help"
    echo ""
    echo -e "${RED}Terminal 5:${NC} 🧪 Quality (@qa)"
    echo "  Commands: *risk, *design, *review, *gate, *nfr, *trace"
    echo ""
}

# Function to show workflow patterns
bmad_patterns() {
    echo -e "${CYAN}🔄 BMAD Workflow Patterns${NC}"
    echo "========================="
    echo ""
    echo -e "${GREEN}Pattern 1: New Feature (Greenfield)${NC}"
    echo "  1. Terminal 1: *workflow-start greenfield-fullstack"
    echo "  2. Terminal 2: Follow orchestrator for planning"
    echo "  3. Terminal 3: *draft (create stories)"
    echo "  4. Terminal 4: *develop-story {name}"
    echo "  5. Terminal 5: *review {name}"
    echo ""
    echo -e "${YELLOW}Pattern 2: Enhancement (Brownfield)${NC}"
    echo "  1. Terminal 1: *workflow-start brownfield-fullstack"
    echo "  2. Terminal 2: Analyze existing system"
    echo "  3. Terminal 3: Create enhancement stories"
    echo "  4. Terminal 4: Implement changes"
    echo "  5. Terminal 5: Integration testing"
    echo ""
    echo -e "${BLUE}Pattern 3: Quick Story${NC}"
    echo "  1. Terminal 3: *draft"
    echo "  2. Terminal 4: *develop-story {name}"
    echo "  3. Terminal 5: *review {name}"
    echo ""
}

# Function to validate BMAD setup
bmad_check() {
    echo -e "${BLUE}🔍 BMAD Setup Validation${NC}"
    echo "======================="
    echo ""
    
    local all_good=true
    
    # Check for core config
    if [ -f ".bmad-core/core-config.yaml" ]; then
        echo -e "${GREEN}✅ Core config found${NC}"
    else
        echo -e "${RED}❌ Missing .bmad-core/core-config.yaml${NC}"
        all_good=false
    fi
    
    # Check for agents
    if [ -d ".bmad-core/agents" ]; then
        agent_count=$(find .bmad-core/agents -name "*.md" | wc -l)
        echo -e "${GREEN}✅ Found $agent_count agents${NC}"
    else
        echo -e "${RED}❌ Missing .bmad-core/agents directory${NC}"
        all_good=false
    fi
    
    # Check for workflows
    if [ -d ".bmad-core/workflows" ]; then
        workflow_count=$(find .bmad-core/workflows -name "*.yaml" | wc -l)
        echo -e "${GREEN}✅ Found $workflow_count workflows${NC}"
    else
        echo -e "${RED}❌ Missing .bmad-core/workflows directory${NC}"
        all_good=false
    fi
    
    # Check for docs structure
    if [ -d "docs" ]; then
        echo -e "${GREEN}✅ Docs directory exists${NC}"
        
        # Check subdirectories
        [ -d "docs/stories" ] && echo -e "${GREEN}  ✅ Stories directory${NC}" || echo -e "${YELLOW}  ⚠️  No stories directory${NC}"
        [ -d "docs/qa" ] && echo -e "${GREEN}  ✅ QA directory${NC}" || echo -e "${YELLOW}  ⚠️  No QA directory${NC}"
        [ -d "docs/architecture" ] && echo -e "${GREEN}  ✅ Architecture directory${NC}" || echo -e "${YELLOW}  ⚠️  No architecture directory${NC}"
    else
        echo -e "${YELLOW}⚠️  No docs directory (will be created as needed)${NC}"
    fi
    
    echo ""
    if [ "$all_good" = true ]; then
        echo -e "${GREEN}🎉 BMAD setup looks good!${NC}"
        echo "Run './scripts/setup-all-terminals.sh' to get started"
    else
        echo -e "${RED}⚠️  Some issues found. Please check your BMAD installation.${NC}"
    fi
    echo ""
}

# Function to show quick help
bmad_help() {
    echo -e "${CYAN}🎭 BMAD Workflow Helpers${NC}"
    echo "======================="
    echo ""
    echo "Available commands:"
    echo "  bmad_status     - Show current workflow status & project state"
    echo "  bmad_resume     - Resume workflow from current state"
    echo "  bmad_pick_story - Help select next story to work on"
    echo "  bmad_terminals  - Show terminal layout guide"
    echo "  bmad_patterns   - Show workflow patterns"
    echo "  bmad_check      - Validate BMAD setup"
    echo "  bmad_help       - Show this help"
    echo ""
    echo "Quick setup:"
    echo "  ./scripts/setup-all-terminals.sh    - Open all terminals"
    echo "  ./scripts/start-greenfield.sh       - Start greenfield workflow"
    echo "  ./scripts/start-brownfield.sh       - Start brownfield workflow"
    echo ""
    echo "Mid-stream workflow:"
    echo "  bmad_status     - Analyze current project state"
    echo "  bmad_resume     - Get recommendations for next steps"
    echo "  bmad_pick_story - Select story for development"
    echo ""
    echo "Documentation:"
    echo "  docs/bmad-optimized-workflow.md     - Complete workflow guide"
    echo "  docs/bmad-quick-reference.md        - Quick reference"
    echo ""
}

# Function to detect current project state
bmad_detect_state() {
    local has_prds=false
    local has_stories=false
    local has_architecture=false
    local has_qa_gates=false

    [ -d "docs/prd" ] && [ "$(find docs/prd -name "*.md" | wc -l)" -gt 0 ] && has_prds=true
    [ -d "docs/stories" ] && [ "$(find docs/stories -name "*.md" | wc -l)" -gt 0 ] && has_stories=true
    [ -f "docs/architecture.md" ] || [ -d "docs/architecture" ] && has_architecture=true
    [ -d "docs/qa/gates" ] && [ "$(find docs/qa/gates -name "*.yml" | wc -l)" -gt 0 ] && has_qa_gates=true

    if [ "$has_prds" = true ] && [ "$has_stories" = true ] && [ "$has_qa_gates" = true ]; then
        echo "ACTIVE_DEVELOPMENT"
    elif [ "$has_prds" = true ] && [ "$has_stories" = true ]; then
        echo "STORIES_READY"
    elif [ "$has_prds" = true ] && [ "$has_architecture" = true ]; then
        echo "PLANNING_COMPLETE"
    elif [ "$has_prds" = true ]; then
        echo "PRD_READY"
    elif [ "$has_architecture" = true ]; then
        echo "ARCHITECTURE_ONLY"
    else
        echo "GREENFIELD"
    fi
}

# Function to recommend next steps based on project state
bmad_recommend_next_steps() {
    local state=$1
    echo -e "${YELLOW}💡 Recommended Next Steps (${state}):${NC}"

    case $state in
        "ACTIVE_DEVELOPMENT")
            echo "  🚀 Continue development workflow:"
            echo "  • Terminal 4 (Dev): Pick a story and run *develop-story {name}"
            echo "  • Terminal 5 (QA): Review completed stories with *review {name}"
            echo "  • Terminal 3 (SM): Create new stories with *draft if needed"
            ;;
        "STORIES_READY")
            echo "  💻 Ready for development:"
            echo "  • Terminal 4 (Dev): *develop-story {story-name}"
            echo "  • Terminal 5 (QA): *risk {story-name} for high-risk stories"
            echo "  • Use bmad_pick_story to select next story"
            ;;
        "PLANNING_COMPLETE")
            echo "  📝 Ready for story creation:"
            echo "  • Terminal 3 (SM): *draft to create stories from PRDs"
            echo "  • Terminal 1 (Orchestrator): *workflow-resume to continue"
            ;;
        "PRD_READY")
            echo "  🏗️ Need architecture planning:"
            echo "  • Terminal 2 (Architect): Review PRDs and create architecture"
            echo "  • Terminal 1 (Orchestrator): *workflow-resume brownfield-fullstack"
            ;;
        "ARCHITECTURE_ONLY")
            echo "  📋 Need PRD creation:"
            echo "  • Terminal 2 (PM): Create PRDs based on architecture"
            echo "  • Terminal 1 (Orchestrator): *workflow-start brownfield-fullstack"
            ;;
        "GREENFIELD")
            echo "  🌱 Start from beginning:"
            echo "  • Terminal 1 (Orchestrator): *workflow-start greenfield-fullstack"
            echo "  • Or use ./scripts/start-greenfield.sh"
            ;;
    esac
    echo ""
}

# Function to help pick next story to work on
bmad_pick_story() {
    echo -e "${CYAN}📝 Story Selection Helper${NC}"
    echo "========================="
    echo ""

    if [ ! -d "docs/stories" ]; then
        echo -e "${RED}❌ No stories directory found${NC}"
        return 1
    fi

    echo -e "${GREEN}Available stories:${NC}"
    local i=1
    find docs/stories -name "*.md" -type f | sort | while read story_path; do
        local story_name=$(basename "$story_path" .md)

        # Try to detect story status
        local status="Unknown"
        if grep -q "Status.*Draft" "$story_path" 2>/dev/null; then
            status="Draft"
        elif grep -q "Status.*Approved" "$story_path" 2>/dev/null; then
            status="Approved"
        elif grep -q "Status.*In Progress" "$story_path" 2>/dev/null; then
            status="In Progress"
        elif grep -q "Status.*Complete" "$story_path" 2>/dev/null; then
            status="Complete"
        fi

        printf "%2d. %-50s [%s]\n" "$i" "$story_name" "$status"
        i=$((i+1))
    done

    echo ""
    echo "Commands to use:"
    echo "  Terminal 4 (Dev): *develop-story {story-name}"
    echo "  Terminal 5 (QA): *review {story-name}"
    echo "  Terminal 3 (SM): *validate {story-name}"
    echo ""
}

# Function for mid-stream workflow resume
bmad_resume() {
    echo -e "${BLUE}🔄 BMAD Workflow Resume${NC}"
    echo "======================"
    echo ""

    local state=$(bmad_detect_state)
    echo -e "${CYAN}Current State: ${state}${NC}"
    echo ""

    case $state in
        "ACTIVE_DEVELOPMENT")
            echo -e "${GREEN}✅ You're in active development mode${NC}"
            echo ""
            echo "Quick actions:"
            echo "  1. Pick next story: bmad_pick_story"
            echo "  2. Continue development: Terminal 4 → *develop-story {name}"
            echo "  3. Review completed work: Terminal 5 → *review {name}"
            ;;
        "STORIES_READY")
            echo -e "${YELLOW}📝 Stories are ready for development${NC}"
            echo ""
            echo "Recommended workflow:"
            echo "  1. Terminal 1: @bmad-orchestrator → *workflow-resume"
            echo "  2. Terminal 4: @dev → *develop-story {story-name}"
            echo "  3. Use bmad_pick_story to select which story to work on"
            ;;
        "PLANNING_COMPLETE")
            echo -e "${BLUE}📋 Planning is complete, ready for stories${NC}"
            echo ""
            echo "Next steps:"
            echo "  1. Terminal 3: @sm → *draft"
            echo "  2. Terminal 1: @bmad-orchestrator → *workflow-resume"
            ;;
        *)
            echo -e "${PURPLE}🎯 Custom workflow needed${NC}"
            echo ""
            echo "Options:"
            echo "  1. Terminal 1: @bmad-orchestrator → *workflow-resume"
            echo "  2. Terminal 1: @bmad-orchestrator → *status"
            echo "  3. Use specific workflow: ./scripts/start-{type}.sh"
            ;;
    esac
    echo ""
}

# Auto-run help if sourced
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    echo -e "${GREEN}🎭 BMAD Workflow Helpers loaded!${NC}"
    echo "Type 'bmad_help' for available commands"
fi
