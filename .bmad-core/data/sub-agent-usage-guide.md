<!-- Powered by BMAD™ Core -->

# Sub-Agent System Usage Guide

## Overview

The BMAD sub-agent system enables **parallel execution** of development tasks through autonomous AI worker agents coordinated by specialized coordinator agents. This dramatically reduces time-to-completion for complex work.

## Quick Start

### Parallel Story Development

```bash
# Activate dev agent
@dev

# Implement 3 stories in parallel (instead of sequentially)
*parallel-develop stories=[1.1,1.2,1.3]

# Result: 3 stories implemented in ~20 minutes instead of ~60 minutes
```

### Epic Explosion (Parallel Story Creation)

```bash
# Activate SM agent
@sm

# Create all stories for an epic in parallel
*explode-epic epic=user-authentication

# Result: 8 stories created in ~15 minutes instead of ~2 hours
```

### Deep Code Review (Multi-Specialist Analysis)

```bash
# Activate QA agent
@qa

# Get security, performance, and accessibility analysis in parallel
*deep-review target=auth-system

# Result: Comprehensive multi-perspective review in ~10 minutes
```

## Core Concepts

### Agent Types

1. **Coordinator Agents** - Orchestrate and manage sub-agents
   - `dev-coordinator` - Coordinates parallel development
   - `sm-coordinator` - Coordinates parallel story creation
   - `qa-coordinator` - Coordinates parallel testing/review
   - `architect-coordinator` - Coordinates parallel analysis

2. **Worker Sub-Agents** - Execute assigned tasks autonomously
   - `dev-worker` - Implements individual stories
   - `sm-story-worker` - Creates individual stories
   - `qa-test-worker` - Executes test suites

3. **Specialist Sub-Agents** - Provide deep domain expertise
   - `security-specialist` - Security analysis
   - `performance-specialist` - Performance analysis
   - `accessibility-specialist` - A11y compliance

### Coordination Patterns

#### 1. Coordinator-Worker Pattern
**Use for:** Parallel execution of similar tasks

```
Coordinator
├── Worker 1 (Story 1.1)
├── Worker 2 (Story 1.2)
└── Worker 3 (Story 1.3)
```

**Example:** `*parallel-develop stories=[1.1,1.2,1.3]`

#### 2. Specialist Swarm Pattern
**Use for:** Multi-perspective analysis

```
Coordinator
├── Security Specialist
├── Performance Specialist
└── Accessibility Specialist
```

**Example:** `*swarm-refactor target=auth-system`

#### 3. Pipeline Pattern
**Use for:** Multi-stage workflows with parallel execution per stage

```
Stage 1: Analysis (3 specialists in parallel)
   ↓
Stage 2: Implementation (5 workers in parallel)
   ↓
Stage 3: Testing (3 test workers in parallel)
```

#### 4. Persistent Watchers
**Use for:** Continuous background monitoring

```
Watcher Agent (runs continuously)
├── Monitors codebase
├── Detects issues
└── Reports findings
```

**Example:** `*watch-mode target=security`

## Available Commands

### Dev Agent Sub-Agent Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `*parallel-develop` | Implement multiple stories in parallel | `*parallel-develop stories=[1.1,1.2,1.3]` |
| `*auto-fix` | Fix multiple issues in parallel | `*auto-fix issues=[bug-1,bug-2,bug-3]` |
| `*swarm-refactor` | Multi-specialist refactoring analysis | `*swarm-refactor target=auth-system` |

### SM Agent Sub-Agent Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `*explode-epic` | Create all epic stories in parallel | `*explode-epic epic=user-auth` |
| `*batch-create` | Create multiple stories in parallel | `*batch-create stories=[s1,s2,s3]` |
| `*validate-epic` | Validate epic completeness | `*validate-epic epic=user-auth` |

### QA Agent Sub-Agent Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `*deep-review` | Multi-specialist code review | `*deep-review target=auth-system` |
| `*parallel-test` | Run test suites in parallel | `*parallel-test suites=[unit,e2e,integration]` |
| `*continuous-watch` | Start background quality monitoring | `*continuous-watch` |

## How It Works

### 1. Initialization Phase

Coordinator analyzes the request:
- Validates prerequisites
- Identifies dependencies
- Detects potential conflicts
- Creates execution plan

### 2. Worker Spawning Phase

Coordinator spawns sub-agents:
- Creates worker state files
- Sends task assignments
- Establishes resource locks
- Initializes monitoring

### 3. Parallel Execution Phase

Workers execute autonomously:
- Load assigned tasks
- Implement requirements
- Report progress regularly
- Detect and report conflicts
- Complete work independently

Coordinator monitors continuously:
- Tracks progress
- Resolves conflicts
- Manages dependencies
- Handles failures

### 4. Integration Phase

Coordinator aggregates results:
- Collects all deliverables
- Validates integration
- Runs quality gates
- Generates summary report

## Monitoring

### Real-Time Dashboard

When sub-agents are active, you'll see a live dashboard:

```
=== Dev Coordination Dashboard ===
Session: dev-coord-20251221-100000
Workers: 3 active, 0 complete, 0 blocked

[▶] dev-worker-1: Story 1.1 (Auth Login) - 65%
    Current: Writing tests
    ETA: 8 minutes
    
[▶] dev-worker-2: Story 1.2 (Auth Register) - 45%
    Current: Implementing validation
    ETA: 12 minutes
    
[▶] dev-worker-3: Story 1.3 (Password Reset) - 30%
    Current: Analyzing requirements
    ETA: 15 minutes

Overall Progress: 47%
Estimated Completion: 15 minutes

Conflicts: 0 pending
Quality: All workers passing gates
```

### Manual Monitoring

```bash
# View current coordination status
*monitor

# Check specific worker
*worker-status worker-id=dev-worker-1
```

## Conflict Resolution

### Automatic Resolution

The system automatically resolves:
- **Non-overlapping file edits** - Auto-merge
- **Dependency ordering** - Auto-reorder
- **Shared resource access** - Grant shared access

### Manual Resolution

Some conflicts require user input:
- **Overlapping file edits** - User chooses merge strategy
- **Logical conflicts** - User resolves design conflicts
- **Scope ambiguity** - User clarifies requirements

```bash
# Manually resolve a conflict
*resolve-conflict conflict-id=CONF-001
```

## Best Practices

### When to Use Sub-Agents

✅ **Good Use Cases:**
- Multiple independent stories
- Epic explosion (creating many stories)
- Large refactoring needing multi-perspective analysis
- Batch operations (creating issues, running tests)
- Time-sensitive deliveries

❌ **Poor Use Cases:**
- Single story implementation
- Highly interdependent tasks
- Exploratory work requiring frequent user input
- Tasks requiring deep context sharing

### Maximizing Efficiency

1. **Minimize Dependencies** - Independent stories parallelize better
2. **Clear Acceptance Criteria** - Reduces worker blockers
3. **Avoid Resource Conflicts** - Don't modify same files in parallel
4. **Trust the System** - Let workers work autonomously
5. **Monitor Progress** - Check dashboard periodically

### Quality Assurance

Sub-agents maintain the same quality standards:
- ✅ All tests must pass
- ✅ Lint must pass
- ✅ Type check must pass
- ✅ 100% coverage on new code
- ✅ All acceptance criteria met

## Troubleshooting

### Worker Stuck/Blocked

```bash
# Check worker status
*monitor

# If blocked, check blocker reason
# Coordinator will escalate if needed
```

### Integration Failures

```bash
# Manually trigger aggregation
*aggregate

# Review integration report
# Fix conflicts and retry
```

### Performance Issues

- Reduce `max_parallel_workers` in coordinator config
- Increase `progress_check_interval` to reduce overhead
- Ensure adequate system resources

## Architecture

See `.bmad-core/data/sub-agent-architecture.md` for complete technical details.

## Examples

See `.bmad-core/workflows/parallel/` for workflow examples.

