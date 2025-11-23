# BMAD Optimized Multi-Terminal Workflow

## Terminal Setup Strategy

### 5-Terminal Layout (Recommended)

```
Terminal 1: 🎭 Orchestrator (Workflow Management)
Terminal 2: 📋 Planning (PM/Architect/UX/Analyst)
Terminal 3: 📝 Stories (SM Agent Only)
Terminal 4: 💻 Development (Dev Agent Only)
Terminal 5: 🧪 Quality (QA Agent Only)
```

## Quick Start Commands

### Terminal 1: Orchestrator Hub

```bash
# Load orchestrator for workflow management
@bmad-orchestrator

# Key commands:
*help                    # Show all commands
*workflow               # List available workflows
*workflow-start {name}  # Start specific workflow
*workflow-next          # Show next recommended step
*status                 # Current workflow status
*agent {name}           # Transform to specific agent
```

### Terminal 2: Planning Session

```bash
# Load planning agents as needed:
@pm         # Project management, requirements
@architect  # Technical architecture, system design
@ux-expert  # User experience, interface design
@analyst    # Business analysis, research

# Common planning tasks:
*create-doc     # Generate project documents
*brainstorm     # Facilitate brainstorming sessions
*research       # Deep research and analysis
```

### Terminal 3: Story Creation

```bash
# ONLY use SM agent here
@sm

# Story workflow:
*draft                    # Create next story (create-next-story task)
*validate {story-name}    # Validate story completeness
*help                     # Show all SM commands
```

### Terminal 4: Development

```bash
# ONLY use Dev agent here
@dev

# Development workflow:
*develop-story {story-name}  # Execute full development checklist
*help                        # Show all dev commands
```

### Terminal 5: Quality Assurance

```bash
# ONLY use QA agent here
@qa

# QA workflow commands:
*risk {story}      # Risk assessment
*design {story}    # Test design
*review {story}    # Comprehensive review
*gate {story}      # Quality gate decision
*nfr {story}       # Non-functional requirements
*trace {story}     # Requirements traceability
```

## Workflow Patterns

### Pattern 1: New Feature Development

1. **Terminal 1**: `*workflow-start greenfield-fullstack`
2. **Terminal 2**: Follow orchestrator guidance for planning
3. **Terminal 3**: Create stories when planning complete
4. **Terminal 4**: Implement stories
5. **Terminal 5**: QA review and gates

### Pattern 2: Brownfield Enhancement

1. **Terminal 1**: `*workflow-start brownfield-fullstack`
2. **Terminal 2**: Analyze existing system
3. **Terminal 3**: Create enhancement stories
4. **Terminal 4**: Implement changes
5. **Terminal 5**: Integration testing and review

### Pattern 3: Quick Story Implementation

1. **Terminal 3**: `*draft` (create story)
2. **Terminal 4**: `*develop-story {name}` (implement)
3. **Terminal 5**: `*review {name}` (quality check)

## Context Switching Rules

### ✅ DO:

- Keep each terminal focused on one agent type
- Use orchestrator to plan workflow transitions
- Pass artifacts between terminals via file system
- Start new conversations for each major phase

### ❌ DON'T:

- Switch agents within the same terminal/chat
- Load multiple agents in one conversation
- Skip the orchestrator for complex workflows
- Mix planning and implementation in same session

## File-Based Handoffs

### Documents Flow:

```
Planning (Terminal 2) → docs/prd.md, docs/architecture.md
Stories (Terminal 3)  → docs/stories/{story-name}.md
Dev (Terminal 4)      → Implementation + updates to story
QA (Terminal 5)       → docs/qa/gates/{story}.yml
```

## Time-Saving Tips

1. **Pre-load terminals** with agents at start of day
2. **Use workflow commands** instead of manual switching
3. **Batch similar work** in each terminal
4. **Keep contexts separate** - no cross-contamination
5. **Use file system** for artifact handoffs
6. **Follow the enhanced IDE workflow** for standard patterns

## Next Steps

1. Open 5 terminal windows/tabs
2. Load appropriate agents in each
3. Start with Terminal 1 orchestrator
4. Follow workflow guidance
5. Keep terminals focused on their roles
