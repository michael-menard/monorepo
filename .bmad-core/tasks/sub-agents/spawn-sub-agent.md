<!-- Powered by BMAD™ Core -->

# Spawn Sub-Agent Task

## Purpose

Spawn a worker or specialist sub-agent to execute a specific task autonomously. This task is used by coordinator agents to delegate work to sub-agents.

## Prerequisites

- Coordinator agent must be active
- Task definition must be clear and scoped
- Required context must be available
- State directory must exist (`.bmad-state/`)

## Instructions

### Step 1: Validate Spawning Conditions

Check that spawning is appropriate:

1. **Task is suitable for delegation**
   - Clear, well-defined scope
   - Sufficient context available
   - No critical dependencies on coordinator judgment

2. **Resources available**
   - No conflicting workers on same resources
   - Dependencies are met or can be managed
   - State directory is accessible

3. **Parallelization is beneficial**
   - Task can run independently
   - Coordination overhead is justified
   - Expected time savings > coordination cost

### Step 2: Prepare Task Assignment

Create task assignment using `task-assignment-tmpl.yaml`:

1. **Generate unique IDs**
   ```
   worker_id: {agent-type}-worker-{timestamp}-{random}
   task_id: {task-type}-{work-item-id}-{timestamp}
   message_id: msg-{timestamp}-{random}
   session_id: {coordinator-session-id}
   ```

2. **Define work item**
   - Type: story, epic, file, codebase-section, analysis-target
   - ID: Unique identifier for the work item
   - File path: Location of primary work artifact

3. **Provide context**
   - Description: Clear explanation of what needs to be done
   - Acceptance criteria: How to know when done
   - Technical context: Relevant technical details
   - Related files: Files worker should be aware of

4. **Set constraints**
   - Time limit: Maximum time for task
   - Scope boundaries: What worker should NOT do
   - Quality gates: Tests, lint, type-check requirements

5. **Define dependencies**
   - Required tasks: Must complete before this task
   - Optional tasks: Helpful if complete
   - Shared resources: Files/resources others may access

6. **Specify expected outputs**
   - Artifacts: Files to create/modify
   - Documentation: Docs to update
   - Tests: Tests to write

### Step 3: Initialize Worker State

Create worker state file in `.bmad-state/workers/{worker_id}.yaml`:

```yaml
worker_id: {worker_id}
coordinator_id: {coordinator_id}
status: initializing
created_at: {timestamp}

assigned_task:
  type: {task_type}
  task_id: {task_id}
  work_item_id: {work_item_id}
  work_item_file: {file_path}

progress:
  completion_pct: 0
  current_step: "Initializing"
  steps_completed: []
  steps_remaining: []

artifacts_created: []
blockers: []
dependencies: []
```

### Step 4: Create Resource Locks

If task involves exclusive resources, create locks:

1. **Identify exclusive resources**
   - Files that will be modified
   - Shared state that will be updated
   - External resources (DB, API)

2. **Create lock files** in `.bmad-state/locks/`
   ```yaml
   resource_id: {resource_identifier}
   locked_by: {worker_id}
   locked_at: {timestamp}
   lock_type: exclusive  # or shared
   expires_at: {expiry_timestamp}
   ```

3. **Check for conflicts**
   - Scan existing locks
   - Report conflicts to coordinator
   - Wait or escalate as needed

### Step 5: Send Task Assignment

1. **Write task assignment message**
   - Save to `.bmad-state/messages/{session_id}/{timestamp}-task-assignment-{coordinator_id}-{worker_id}.yaml`
   - Use `task-assignment-tmpl.yaml` template

2. **Simulate worker activation**
   - In IDE: Instruct user to open new chat with worker context
   - In automation: Spawn new AI instance with worker persona
   - Provide worker with task assignment message

3. **Update coordinator state**
   - Add worker to active sub-agents list
   - Record task assignment
   - Set monitoring schedule

### Step 6: Establish Monitoring

Set up progress monitoring:

1. **Define check-in schedule**
   - Frequency: Every N minutes or on milestones
   - Timeout: Maximum time before escalation
   - Milestones: Key checkpoints to verify

2. **Monitor for messages**
   - Progress reports
   - Conflict reports
   - Completion reports
   - Coordination requests

3. **Track worker state**
   - Read worker state file periodically
   - Detect blockers or failures
   - Identify coordination needs

## Output

- Worker state file created
- Task assignment message sent
- Resource locks established (if needed)
- Coordinator state updated with new worker
- Monitoring schedule established

## Error Handling

- **Resource conflicts**: Report to coordinator, suggest resolution
- **Invalid task definition**: Reject spawn, request clarification
- **State directory issues**: Create directories, retry
- **Worker initialization failure**: Clean up state, report failure

## Notes

- Workers should be spawned with minimal context (lean)
- Coordinator retains full context and decision authority
- Workers report back frequently to enable coordination
- Failed workers should clean up their state and locks

