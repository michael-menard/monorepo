<!-- Powered by BMAD™ Core -->

# Coordinate Workers Task

## Purpose

Monitor and coordinate multiple worker sub-agents executing tasks in parallel. Handle progress tracking, conflict resolution, and task dependencies.

## Prerequisites

- Coordinator agent is active
- One or more workers have been spawned
- Coordinator state file exists
- Message directory is accessible

## Instructions

### Step 1: Initialize Coordination Loop

Set up the coordination monitoring system:

1. **Load coordinator state**
   - Read `.bmad-state/coordinators/{coordinator_id}.yaml`
   - Verify all spawned workers are tracked
   - Check for any pending coordination requests

2. **Establish monitoring schedule**
   - Set check-in frequency (e.g., every 2 minutes)
   - Define timeout thresholds
   - Identify critical milestones

3. **Create coordination dashboard**
   - Display active workers and their status
   - Show progress for each task
   - Highlight blockers and conflicts

### Step 2: Monitor Worker Progress

Continuously monitor worker activity:

1. **Check for progress reports**
   - Scan `.bmad-state/messages/{session_id}/` for new progress reports
   - Parse progress-report messages from workers
   - Update coordinator state with latest progress

2. **Read worker state files**
   - Load `.bmad-state/workers/{worker_id}.yaml` for each worker
   - Check completion percentage
   - Identify current step and blockers

3. **Update coordination dashboard**
   - Refresh worker status display
   - Calculate overall progress
   - Estimate time to completion

### Step 3: Detect and Handle Conflicts

Monitor for conflicts and resolve them:

1. **Scan for conflict reports**
   - Check messages for conflict-report type
   - Parse conflict details
   - Assess severity and impact

2. **Analyze conflict type**

   **File Conflicts:**
   - Check if changes are in different sections (auto-merge)
   - Check if changes overlap (escalate or queue)
   - Determine merge strategy

   **Dependency Conflicts:**
   - Check if dependency is complete or in progress
   - Reorder tasks if possible
   - Pause dependent worker if needed

   **Resource Conflicts:**
   - Check lock files in `.bmad-state/locks/`
   - Determine if shared access is possible
   - Queue or escalate if exclusive access needed

   **Logical Conflicts:**
   - Assess incompatibility severity
   - Facilitate worker-to-worker communication
   - Escalate to user if design decision needed

3. **Execute resolution strategy**

   **Automatic Resolution:**
   - Merge non-overlapping file changes
   - Reorder tasks to resolve dependencies
   - Grant shared resource access
   - Update worker task assignments

   **Worker Negotiation:**
   - Send coordination-request messages to workers
   - Facilitate agreement on shared interfaces
   - Document agreed-upon approach

   **User Escalation:**
   - Present conflict clearly to user
   - Provide resolution options with pros/cons
   - Implement user's decision
   - Notify affected workers

### Step 4: Manage Dependencies

Ensure tasks execute in correct order:

1. **Track task dependencies**
   - Maintain dependency graph
   - Monitor completion of prerequisite tasks
   - Identify tasks ready to start

2. **Unblock waiting workers**
   - When dependency completes, notify waiting workers
   - Provide completed artifacts to dependent workers
   - Update task assignments with new context

3. **Optimize execution order**
   - Identify tasks that can run in parallel
   - Reorder tasks to minimize wait time
   - Balance worker load

### Step 5: Handle Worker Failures

Detect and recover from worker failures:

1. **Detect failures**
   - Timeout: No progress report within threshold
   - Error: Worker reports failure in completion report
   - Crash: Worker state file shows error status

2. **Assess impact**
   - Identify dependent tasks
   - Check if partial work is usable
   - Determine if retry is appropriate

3. **Execute recovery**
   - Retry with same worker (if transient error)
   - Spawn new worker (if worker crashed)
   - Escalate to user (if persistent failure)
   - Update dependent tasks

### Step 6: Aggregate Progress

Provide overall coordination status:

1. **Calculate aggregate metrics**
   - Overall completion percentage
   - Tasks complete / in progress / blocked
   - Estimated time to completion
   - Conflicts resolved / pending

2. **Generate status report**
   - Summary of all worker activity
   - Highlight completed tasks
   - List active blockers
   - Show next milestones

3. **Update user**
   - Display coordination dashboard
   - Report significant events (completions, conflicts)
   - Request decisions when needed

### Step 7: Detect Completion

Recognize when all tasks are complete:

1. **Check completion criteria**
   - All workers report complete status
   - All expected artifacts created
   - All quality gates passed
   - No pending conflicts

2. **Trigger aggregation**
   - When all tasks complete, execute `aggregate-results.md` task
   - Collect all worker outputs
   - Synthesize final deliverable

## Coordination Dashboard Format

```
=== Coordination Dashboard ===
Session: {session_id}
Coordinator: {coordinator_id}
Started: {start_time}
Elapsed: {elapsed_time}

Workers: {active_count} active, {complete_count} complete, {blocked_count} blocked

[✓] Worker-1: Story 1.1 - COMPLETE (100%)
[▶] Worker-2: Story 1.2 - IN PROGRESS (65%) - "Writing tests"
[⏸] Worker-3: Story 1.3 - BLOCKED (30%) - "Waiting for Story 1.1 API"

Overall Progress: {overall_pct}%
Estimated Completion: {eta}

Conflicts: {conflict_count} pending
- File conflict: src/auth/types.ts (Worker-1, Worker-2) - AUTO-MERGE
- Dependency: Story 1.3 needs Story 1.1 - WAITING

Next Milestone: {next_milestone}
```

## Output

- Coordination dashboard displayed
- Worker progress tracked
- Conflicts resolved or escalated
- Dependencies managed
- Failures handled
- Completion detected

## Error Handling

- **Worker timeout**: Retry or spawn replacement
- **Unresolvable conflict**: Escalate to user
- **State file corruption**: Reconstruct from messages
- **Message parsing error**: Request worker to resend

