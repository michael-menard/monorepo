<!-- Powered by BMAD™ Core -->

# Sub-Agent Architecture

## Overview

The BMAD Sub-Agent System enables parallel, autonomous task execution through coordinated AI instances. This architecture extends the existing single-agent persona system with multi-agent orchestration capabilities.

## Core Concepts

### Agent Types

1. **Coordinator Agents**: Orchestrate and manage sub-agents
   - Spawn worker/specialist sub-agents
   - Distribute tasks and context
   - Monitor progress and handle conflicts
   - Aggregate results and synthesize outputs

2. **Worker Sub-Agents**: Execute assigned tasks autonomously
   - Implement stories, create documents, run tests
   - Report progress to coordinator
   - Detect and report conflicts
   - Operate within defined boundaries

3. **Specialist Sub-Agents**: Provide deep domain expertise
   - Security analysis, performance optimization, accessibility
   - Focused, narrow scope
   - Contribute to multi-perspective analysis

### Coordination Patterns

#### Pattern 1: Coordinator-Worker
```
Coordinator → [Worker-1, Worker-2, Worker-3] → Coordinator
```
- Use for: Parallel story development, testing, document creation
- Coordinator distributes work, workers execute independently

#### Pattern 2: Specialist Swarm
```
Coordinator → [Specialist-A, Specialist-B, Specialist-C] → Coordinator
```
- Use for: Multi-perspective analysis, complex design decisions
- Specialists provide independent assessments, coordinator synthesizes

#### Pattern 3: Pipeline
```
Stage-1-Coordinator → [Workers] → Stage-2-Coordinator → [Workers]
```
- Use for: Multi-stage workflows with parallel execution per stage
- Each stage completes before next begins

#### Pattern 4: Persistent Watchers
```
Background-Coordinator → [Watcher-1, Watcher-2] (long-running)
```
- Use for: Continuous validation, monitoring, documentation updates
- Sub-agents run persistently, react to changes

## Communication Protocol

### Message Types

1. **Task Assignment**
   - From: Coordinator
   - To: Worker/Specialist
   - Contains: Task definition, context, constraints, dependencies

2. **Progress Update**
   - From: Worker/Specialist
   - To: Coordinator
   - Contains: Status, completion %, blockers, artifacts created

3. **Conflict Detection**
   - From: Worker/Specialist
   - To: Coordinator
   - Contains: Conflict type, affected resources, resolution needed

4. **Task Completion**
   - From: Worker/Specialist
   - To: Coordinator
   - Contains: Final artifacts, test results, summary

5. **Coordination Request**
   - From: Worker/Specialist
   - To: Coordinator or other sub-agents
   - Contains: Question, dependency need, clarification request

### Message Storage

Messages stored in `.bmad-state/messages/` as YAML files:
```
.bmad-state/
  messages/
    {session-id}/
      {timestamp}-{message-type}-{from}-{to}.yaml
```

## State Management

### Coordinator State
Location: `.bmad-state/coordinators/{coordinator-id}.yaml`

```yaml
coordinator_id: dev-coordinator-abc123
session_id: session-xyz789
status: active
created_at: 2025-12-21T10:00:00Z

task:
  type: parallel-develop
  stories: [1.1, 1.2, 1.3]
  
sub_agents:
  - id: dev-worker-1
    status: in_progress
    assigned_task: story-1.1
    progress: 65%
    
  - id: dev-worker-2
    status: complete
    assigned_task: story-1.2
    artifacts: [src/auth/login.ts, src/auth/login.test.ts]
    
  - id: dev-worker-3
    status: blocked
    assigned_task: story-1.3
    blocker: "Depends on story-1.1 completion"

conflicts: []
completed_tasks: [story-1.2]
pending_tasks: [story-1.1, story-1.3]
```

### Worker State
Location: `.bmad-state/workers/{worker-id}.yaml`

```yaml
worker_id: dev-worker-1
coordinator_id: dev-coordinator-abc123
status: in_progress
created_at: 2025-12-21T10:05:00Z

assigned_task:
  type: implement-story
  story_id: 1.1
  story_file: .bmad-stories/story-1.1.md
  
progress:
  completion_pct: 65
  current_step: "Writing tests"
  steps_completed:
    - "Read story file"
    - "Analyzed requirements"
    - "Implemented core logic"
  steps_remaining:
    - "Write tests"
    - "Update documentation"
    - "Create PR"

artifacts_created:
  - src/auth/register.ts
  - src/auth/types.ts
  
blockers: []
dependencies: []
```

## Conflict Resolution

### Conflict Types

1. **File Conflicts**: Multiple workers modifying same file
2. **Dependency Conflicts**: Worker needs output from another worker
3. **Resource Conflicts**: Shared resource access (DB, API)
4. **Logical Conflicts**: Contradictory implementations

### Resolution Strategies

1. **Automatic**: Coordinator resolves based on rules
   - File conflicts: Merge if non-overlapping, queue if overlapping
   - Dependency conflicts: Reorder execution, pause dependent worker

2. **Escalation**: Coordinator requests user decision
   - Logical conflicts requiring domain knowledge
   - Critical path decisions

3. **Negotiation**: Sub-agents communicate to resolve
   - Workers coordinate on shared interfaces
   - Specialists reconcile conflicting recommendations

## Integration with Existing BMAD System

### Backward Compatibility

- Existing single-agent commands continue to work
- Sub-agent commands are opt-in enhancements
- Workflows can mix single-agent and sub-agent steps

### Enhanced Commands

Existing agents gain new sub-agent commands:

**Dev Agent:**
- `*parallel-develop` - Spawn workers for multiple stories
- `*auto-fix` - Spawn workers to fix multiple issues
- `*swarm-refactor` - Coordinate specialists for large refactoring

**SM Agent:**
- `*explode-epic` - Spawn workers to create all epic stories
- `*auto-shard` - Spawn workers to shard large documents
- `*batch-validate` - Spawn validators for multiple stories

**QA Agent:**
- `*deep-review` - Spawn specialists for multi-perspective review
- `*parallel-test` - Spawn workers to test multiple stories
- `*continuous-watch` - Spawn persistent watchers

**Architect Agent:**
- `*analyze-codebase` - Spawn analyzers for parallel codebase analysis
- `*swarm-design` - Spawn specialists for complex design decisions

**PO Agent:**
- `*watch-mode` - Spawn persistent validators and monitors
- `*parallel-validate` - Spawn validators for multiple artifacts

### File Structure

```
.bmad-core/
  agents/
    coordinators/          # NEW: Coordinator agent definitions
      dev-coordinator.md
      sm-coordinator.md
      qa-coordinator.md
      architect-coordinator.md
      po-coordinator.md
    workers/              # NEW: Worker sub-agent definitions
      dev-worker.md
      sm-story-worker.md
      qa-test-worker.md
    specialists/          # NEW: Specialist sub-agent definitions
      security-specialist.md
      performance-specialist.md
      accessibility-specialist.md
      architecture-specialist.md
  tasks/
    sub-agents/           # NEW: Sub-agent specific tasks
      spawn-sub-agent.md
      coordinate-workers.md
      aggregate-results.md
      resolve-conflicts.md
      monitor-progress.md
  templates/
    sub-agents/           # NEW: Sub-agent communication templates
      task-assignment-tmpl.yaml
      progress-report-tmpl.yaml
      conflict-report-tmpl.yaml
      completion-report-tmpl.yaml
  workflows/
    parallel/             # NEW: Parallel-optimized workflows
      parallel-greenfield-fullstack.yaml
      parallel-epic-development.yaml

.bmad-state/              # NEW: Runtime state directory
  coordinators/           # Coordinator state files
  workers/                # Worker state files
  messages/               # Inter-agent messages
  locks/                  # Resource locks for conflict prevention
```

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
- Create sub-agent architecture documentation
- Build coordination protocol (message passing, state management)
- Create coordinator and worker agent base definitions
- Implement basic spawn/monitor/aggregate tasks

### Phase 2: Proof of Concept (Single Use Case)
- Implement parallel story development for dev agent
- Create dev-coordinator and dev-worker agents
- Build `*parallel-develop` command
- Test with 3 stories in parallel

### Phase 3: Core Use Cases (High-Value Features)
- Implement epic explosion for SM agent
- Implement deep review for QA agent
- Implement brownfield analysis for architect
- Create specialist sub-agents (security, performance, a11y)

### Phase 4: Advanced Features (Optimization)
- Implement continuous watch mode
- Build parallel workflows
- Add conflict resolution automation
- Create monitoring and observability

### Phase 5: Polish (Production Ready)
- Comprehensive documentation
- Error handling and recovery
- Performance optimization
- User experience refinements

## Technical Considerations

### IDE Integration

**Multi-Session Management:**
- Coordinators run in primary chat session
- Workers run in background or separate sessions
- Progress visible in coordinator session

**Context Isolation:**
- Each worker has isolated context (story file, relevant code)
- Coordinator has full context (all stories, dependencies)
- Specialists have domain-specific context

### Performance

**Parallelization Limits:**
- Recommend 3-5 concurrent workers (avoid overwhelming)
- Specialists can run more (lighter weight, read-only)
- Watchers are persistent but low-activity

**Resource Management:**
- File locks prevent concurrent write conflicts
- Dependency tracking ensures correct execution order
- Progress monitoring allows early failure detection

### Error Handling

**Worker Failures:**
- Coordinator detects timeout or error
- Retry with same or different worker
- Escalate to user if persistent failure

**Coordinator Failures:**
- State persisted to disk, recoverable
- User can resume from last checkpoint
- Workers continue if possible, await coordinator

**Conflict Scenarios:**
- Automatic resolution where possible
- Clear escalation path to user
- Rollback capability for failed coordination

## Success Metrics

- **Speed**: 3-5x faster for parallel-suitable tasks
- **Quality**: Multi-perspective review catches more issues
- **Scalability**: Handle 10+ stories in single session
- **Reliability**: <5% coordination failure rate
- **Usability**: Clear progress visibility, easy conflict resolution

