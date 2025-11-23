#!/bin/bash

# BMAD Resume Workflow Commands
# Quick commands to resume workflows from any state

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Source the main helpers
source "$(dirname "$0")/bmad-workflow-helpers.sh"

# Quick resume for active development
bmad_resume_dev() {
    echo -e "${GREEN}🚀 Resuming Development Workflow${NC}"
    echo "================================="
    echo ""
    
    local state=$(bmad_detect_state)
    
    if [ "$state" != "ACTIVE_DEVELOPMENT" ] && [ "$state" != "STORIES_READY" ]; then
        echo -e "${RED}❌ Not ready for development. Current state: $state${NC}"
        echo "Run 'bmad_resume' for state-specific guidance"
        return 1
    fi
    
    echo -e "${BLUE}📝 Available stories for development:${NC}"
    bmad_pick_story
    
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Choose a story from the list above"
    echo "2. Terminal 4 (Dev): @dev"
    echo "3. Terminal 4: *develop-story {story-name}"
    echo ""
    echo "Example:"
    echo "  @dev"
    echo "  *develop-story fe-migration-1.story"
    echo ""
}

# Quick resume for story creation
bmad_resume_stories() {
    echo -e "${BLUE}📝 Resuming Story Creation Workflow${NC}"
    echo "==================================="
    echo ""
    
    local state=$(bmad_detect_state)
    
    if [ "$state" != "PLANNING_COMPLETE" ] && [ "$state" != "PRD_READY" ]; then
        echo -e "${RED}❌ Not ready for story creation. Current state: $state${NC}"
        echo "Run 'bmad_resume' for state-specific guidance"
        return 1
    fi
    
    echo -e "${GREEN}📋 Available PRDs for story creation:${NC}"
    if [ -d "docs/prd" ]; then
        find docs/prd -name "*.md" -type f | while read prd; do
            prd_name=$(basename "$(dirname "$prd")")
            echo "  • $prd_name"
        done
    fi
    
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Terminal 3 (Stories): @sm"
    echo "2. Terminal 3: *draft"
    echo "3. Review and approve created stories"
    echo ""
    echo "For brownfield enhancements:"
    echo "  @sm"
    echo "  *brownfield-create-story    # Single story"
    echo "  *brownfield-create-epic     # Multiple stories"
    echo ""
}

# Quick resume for QA workflow
bmad_resume_qa() {
    echo -e "${PURPLE}🧪 Resuming QA Workflow${NC}"
    echo "======================="
    echo ""
    
    local state=$(bmad_detect_state)
    
    if [ "$state" != "ACTIVE_DEVELOPMENT" ] && [ "$state" != "STORIES_READY" ]; then
        echo -e "${RED}❌ No stories ready for QA. Current state: $state${NC}"
        echo "Run 'bmad_resume' for state-specific guidance"
        return 1
    fi
    
    echo -e "${GREEN}📝 Stories available for QA review:${NC}"
    if [ -d "docs/stories" ]; then
        find docs/stories -name "*.md" -type f | head -10 | while read story; do
            story_name=$(basename "$story" .md)
            
            # Check if already has QA gate
            local gate_file="docs/qa/gates/${story_name}.yml"
            if [ -f "$gate_file" ]; then
                echo "  • $story_name [Has QA Gate]"
            else
                echo "  • $story_name [Needs QA Review]"
            fi
        done
    fi
    
    echo ""
    echo -e "${YELLOW}QA Workflow Commands:${NC}"
    echo "Terminal 5 (QA): @qa"
    echo ""
    echo "For high-risk stories:"
    echo "  *risk {story-name}      # Risk assessment"
    echo "  *design {story-name}    # Test design"
    echo ""
    echo "For completed stories:"
    echo "  *review {story-name}    # Comprehensive review"
    echo "  *gate {story-name}      # Quality gate decision"
    echo ""
    echo "For performance-critical:"
    echo "  *nfr {story-name}       # Non-functional requirements"
    echo "  *trace {story-name}     # Requirements traceability"
    echo ""
}

# Quick resume for planning workflow
bmad_resume_planning() {
    echo -e "${CYAN}📋 Resuming Planning Workflow${NC}"
    echo "=============================="
    echo ""
    
    local state=$(bmad_detect_state)
    
    echo -e "${BLUE}Current state: $state${NC}"
    echo ""
    
    case $state in
        "GREENFIELD")
            echo -e "${YELLOW}Starting fresh project:${NC}"
            echo "1. Terminal 1: @bmad-orchestrator"
            echo "2. Terminal 1: *workflow-start greenfield-fullstack"
            echo "3. Follow orchestrator guidance"
            ;;
        "ARCHITECTURE_ONLY")
            echo -e "${YELLOW}Need PRD creation:${NC}"
            echo "1. Terminal 2: @pm"
            echo "2. Create PRDs based on existing architecture"
            echo "3. Terminal 1: @bmad-orchestrator → *workflow-start brownfield-fullstack"
            ;;
        "PRD_READY")
            echo -e "${YELLOW}Need architecture review:${NC}"
            echo "1. Terminal 2: @architect"
            echo "2. Review PRDs and create/update architecture"
            echo "3. Terminal 1: @bmad-orchestrator → *workflow-resume"
            ;;
        *)
            echo -e "${GREEN}Planning appears complete${NC}"
            echo "Consider moving to story creation or development"
            echo "Run 'bmad_resume_stories' or 'bmad_resume_dev'"
            ;;
    esac
    echo ""
}

# Show all resume options
bmad_resume_help() {
    echo -e "${CYAN}🔄 BMAD Resume Workflow Commands${NC}"
    echo "================================="
    echo ""
    echo "Quick resume commands:"
    echo "  bmad_resume_dev       - Resume development workflow"
    echo "  bmad_resume_stories   - Resume story creation workflow"
    echo "  bmad_resume_qa        - Resume QA workflow"
    echo "  bmad_resume_planning  - Resume planning workflow"
    echo ""
    echo "General commands:"
    echo "  bmad_resume           - Smart resume based on current state"
    echo "  bmad_status           - Analyze current project state"
    echo "  bmad_pick_story       - Help select next story"
    echo ""
    echo "Setup commands:"
    echo "  ./scripts/setup-all-terminals.sh    - Open all terminals"
    echo ""
}

# If script is run directly, show help
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    bmad_resume_help
fi
