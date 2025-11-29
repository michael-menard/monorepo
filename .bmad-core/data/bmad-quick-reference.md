# BMAD Quick Reference Guide

## 🚀 Quick Setup

```bash
# 1. Run the setup script to create all terminals
./scripts/setup-all-terminals.sh

# 2. Or manually open 5 terminals and load:
# Terminal 1: @bmad-orchestrator
# Terminal 2: @pm (or @architect, @ux-expert, @analyst)
# Terminal 3: @sm
# Terminal 4: @dev
# Terminal 5: @qa
```

## 🎭 Agent Commands by Terminal

### Terminal 1: Orchestrator

```bash
@bmad-orchestrator
*help                    # Show all commands
*workflow               # List workflows
*workflow-start {name}  # Start workflow
*workflow-next          # Next step
*status                 # Current status
*agent {name}           # Transform to agent
```

### Terminal 2: Planning

```bash
@pm                     # Project management
@architect              # Technical architecture
@ux-expert              # User experience
@analyst                # Business analysis

*create-doc             # Generate documents
*brainstorm             # Brainstorming session
*research               # Deep research
*help                   # Show agent commands
```

### Terminal 3: Stories

```bash
@sm                     # Scrum Master ONLY
*draft                  # Create next story
*validate {story}       # Validate story
*help                   # Show SM commands
```

### Terminal 4: Development

```bash
@dev                    # Developer ONLY
*develop-story {story}  # Full dev workflow
*help                   # Show dev commands
```

### Terminal 5: Quality

```bash
@qa                     # QA ONLY
*risk {story}           # Risk assessment
*design {story}         # Test design
*review {story}         # Full review
*gate {story}           # Quality gate
*nfr {story}            # Non-functional reqs
*trace {story}          # Requirements trace
```

## 🔄 Common Workflows

### New Feature (Greenfield)

```
T1: *workflow-start greenfield-fullstack
T2: Follow orchestrator → create docs
T3: *draft → create stories
T4: *develop-story {name} → implement
T5: *review {name} → quality check
```

### Enhancement (Brownfield)

```
T1: *workflow-start brownfield-fullstack
T2: Analyze system → document changes
T3: Create enhancement stories
T4: Implement changes
T5: Integration testing
```

### Quick Story

```
T3: *draft
T4: *develop-story {name}
T5: *review {name}
```

## 📁 File Locations

```
docs/prd.md                    # Product requirements
docs/architecture.md           # System architecture
docs/stories/{story}.md        # User stories
docs/qa/gates/{story}.yml      # Quality gates
.bmad-core/core-config.yaml    # BMAD configuration
```

## ⚡ Helper Commands

```bash
# Source workflow helpers
source scripts/bmad-workflow-helpers.sh

bmad_status      # Show current status & project state
bmad_resume      # Resume workflow from current state
bmad_pick_story  # Help select next story to work on
bmad_terminals   # Terminal layout guide
bmad_patterns    # Workflow patterns
bmad_check       # Validate setup
bmad_help        # Helper commands
```

## 🔄 Mid-Stream Workflow (Existing Projects)

### Quick State Detection

```bash
bmad_status      # Analyze current project state
bmad_resume      # Get state-specific recommendations
```

### Project States & Actions

| State                  | What You Have       | Next Action          |
| ---------------------- | ------------------- | -------------------- |
| **ACTIVE_DEVELOPMENT** | PRDs + Stories + QA | Continue development |
| **STORIES_READY**      | PRDs + Stories      | Start development    |
| **PLANNING_COMPLETE**  | PRDs + Architecture | Create stories       |
| **PRD_READY**          | PRDs only           | Review architecture  |

### Resume Commands

```bash
# For existing projects with stories
bmad_pick_story                    # Select story to work on
# Terminal 4: *develop-story {name}

# For projects with PRDs but no stories
# Terminal 3: @sm → *draft

# For projects needing architecture
# Terminal 2: @architect → review PRDs
```

## 🎯 Workflow Shortcuts

```bash
./scripts/start-greenfield.sh   # New feature workflow
./scripts/start-brownfield.sh   # Enhancement workflow
./scripts/terminal-{name}.sh    # Individual terminals
```

## ✅ Best Practices

### DO:

- ✅ Keep each terminal focused on one agent
- ✅ Use orchestrator for workflow planning
- ✅ Pass artifacts via file system
- ✅ Start new chats for major phases
- ✅ Follow the 5-terminal pattern

### DON'T:

- ❌ Switch agents in same terminal
- ❌ Load multiple agents per chat
- ❌ Skip orchestrator for complex work
- ❌ Mix planning and coding sessions

## 🆘 Troubleshooting

### Context Switching Issues

- Open new terminal/chat for each agent
- Use file system for handoffs
- Keep contexts separate

### Token Waste

- Use workflow commands instead of manual switching
- Batch similar work in each terminal
- Pre-load terminals at start of day

### Lost in Workflow

- Check Terminal 1 orchestrator
- Run `*status` and `*workflow-next`
- Use `bmad_status` helper command

## 📖 Documentation

- `docs/bmad-quick-reference.md` - This quick reference
- `docs/bmad-optimized-workflow.md` - Complete multi-terminal guide
- `docs/bmad-mid-stream-workflow.md` - Mid-stream/existing project guide
- `.bmad-core/enhanced-ide-development-workflow.md` - Standard patterns
- `.bmad-core/user-guide.md` - Full BMAD documentation

## 🎉 Getting Started

1. Run `./scripts/bmad-terminal-setup.sh` to create all scripts
2. Run `./scripts/setup-all-terminals.sh` to open terminals
3. Start with Terminal 1 orchestrator
4. Follow workflow guidance
5. Keep terminals focused on their roles
