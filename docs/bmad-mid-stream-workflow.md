# BMAD Mid-Stream Workflow Guide

## 🎯 Starting in the Middle

When you have existing PRDs, stories, or partially completed work, BMAD can intelligently detect your project state and recommend the optimal next steps.

## 🔍 Project State Detection

Run this command to analyze your current state:

```bash
source scripts/bmad-workflow-helpers.sh
bmad_status
```

### Project States

| State                  | Description              | What You Have             |
| ---------------------- | ------------------------ | ------------------------- |
| **ACTIVE_DEVELOPMENT** | Full workflow active     | PRDs + Stories + QA Gates |
| **STORIES_READY**      | Ready for development    | PRDs + Stories            |
| **PLANNING_COMPLETE**  | Ready for story creation | PRDs + Architecture       |
| **PRD_READY**          | Need architecture        | PRDs only                 |
| **ARCHITECTURE_ONLY**  | Need PRDs                | Architecture docs only    |
| **GREENFIELD**         | Starting fresh           | Nothing yet               |

## 🚀 Quick Resume Commands

### For Any State

```bash
bmad_resume          # Get state-specific recommendations
bmad_pick_story      # Help select next story to work on
bmad_status          # Full project analysis
```

## 📋 State-Specific Workflows

### ACTIVE_DEVELOPMENT State

**You have: PRDs + Stories + QA Gates**

```bash
# 1. Set up terminals
./scripts/setup-all-terminals.sh

# 2. Continue development
# Terminal 4 (Dev): Pick and develop a story
bmad_pick_story
@dev
*develop-story {selected-story}

# 3. Review completed work
# Terminal 5 (QA): Review stories
@qa
*review {completed-story}
```

### STORIES_READY State

**You have: PRDs + Stories (no QA yet)**

```bash
# 1. Resume workflow
# Terminal 1 (Orchestrator)
@bmad-orchestrator
*workflow-resume

# 2. Start development
# Terminal 4 (Dev)
bmad_pick_story
@dev
*develop-story {story-name}

# 3. Begin QA process
# Terminal 5 (QA)
@qa
*risk {story-name}    # For high-risk stories
*review {story-name}  # For completed stories
```

### PLANNING_COMPLETE State

**You have: PRDs + Architecture**

```bash
# 1. Create stories from existing PRDs
# Terminal 3 (Stories)
@sm
*draft    # Creates next story from PRD

# 2. Resume workflow coordination
# Terminal 1 (Orchestrator)
@bmad-orchestrator
*workflow-resume

# 3. Continue with development once stories exist
```

### PRD_READY State

**You have: PRDs only**

```bash
# 1. Determine if architecture is needed
# Terminal 1 (Orchestrator)
@bmad-orchestrator
*workflow-resume brownfield-fullstack

# 2. Create architecture if needed
# Terminal 2 (Planning)
@architect
# Follow orchestrator guidance

# 3. Or skip to story creation if architecture exists
# Terminal 3 (Stories)
@sm
*draft
```

## 🎯 Working with Existing Stories

### Story Selection Strategy

```bash
# List all stories with status
bmad_pick_story

# Common story states:
# - Draft: Needs review/approval
# - Approved: Ready for development
# - In Progress: Currently being worked
# - Complete: Ready for QA review
```

### Story Development Workflow

```bash
# 1. Pick a story
bmad_pick_story

# 2. Develop (Terminal 4)
@dev
*develop-story {story-name}

# 3. QA Review (Terminal 5)
@qa
*review {story-name}
*gate {story-name}    # Quality gate decision
```

## 🔄 Brownfield Enhancement Patterns

### Small Enhancement (Single Story)

```bash
# Terminal 3 (Stories)
@sm
*brownfield-create-story    # For small changes

# Terminal 4 (Dev)
@dev
*develop-story {story-name}
```

### Medium Enhancement (Epic)

```bash
# Terminal 2 (Planning)
@pm
*brownfield-create-epic     # For 2-3 coordinated stories

# Then follow normal story → dev → QA flow
```

### Large Enhancement (Full PRD)

```bash
# Terminal 1 (Orchestrator)
@bmad-orchestrator
*workflow-start brownfield-fullstack

# Follow orchestrator guidance through full process
```

## 🎭 Multi-Terminal Strategy for Existing Projects

### Terminal Assignment

```
Terminal 1: 🎭 Orchestrator - Workflow coordination & resume
Terminal 2: 📋 Planning - Architecture updates, PRD modifications
Terminal 3: 📝 Stories - Story creation from existing PRDs
Terminal 4: 💻 Development - Story implementation
Terminal 5: 🧪 Quality - Story review and quality gates
```

### Efficient Context Switching

- **Keep terminals focused**: Don't switch agents within terminals
- **Use file handoffs**: Stories and PRDs are your context bridges
- **Resume workflows**: Use `*workflow-resume` instead of starting over
- **State detection**: Let the system guide you with `bmad_resume`

## 🆘 Common Mid-Stream Scenarios

### "I have 20 stories, which should I work on?"

```bash
bmad_pick_story    # Shows all stories with status
# Pick approved stories first, then drafts
```

### "I'm not sure what state my project is in"

```bash
bmad_status        # Full project analysis
bmad_resume        # Get specific recommendations
```

### "I want to add a small feature to existing project"

```bash
# Terminal 3 (Stories)
@sm
*brownfield-create-story    # Single story for small changes
```

### "I need to continue a partially completed epic"

```bash
# Terminal 1 (Orchestrator)
@bmad-orchestrator
*workflow-resume           # Will detect current state
*workflow-next            # Show next recommended step
```

## 💡 Pro Tips for Mid-Stream Work

1. **Always start with state detection**: `bmad_status`
2. **Use workflow resume**: `*workflow-resume` instead of `*workflow-start`
3. **Pick stories strategically**: Focus on approved stories first
4. **Keep QA in the loop**: Review completed stories promptly
5. **Update story status**: Keep story files current with progress
