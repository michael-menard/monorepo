<!-- Powered by BMAD™ Core -->

# Aggregate Results Task

## Purpose

Collect and synthesize outputs from multiple worker sub-agents into a cohesive final deliverable. This task is executed by the coordinator when all workers have completed their tasks.

## Prerequisites

- All workers have reported completion
- Completion reports are available
- Worker artifacts are accessible
- No critical conflicts remain unresolved

## Instructions

### Step 1: Collect Worker Outputs

Gather all deliverables from workers:

1. **Read completion reports**
   - Scan `.bmad-state/messages/{session_id}/` for completion-report messages
   - Parse each worker's completion report
   - Extract deliverables, quality metrics, and notes

2. **Inventory artifacts**
   - List all files created by workers
   - List all files modified by workers
   - Identify documentation updates
   - Collect test results

3. **Assess quality**
   - Check test pass rates across all workers
   - Verify lint/type-check status
   - Review code coverage
   - Identify any quality issues

### Step 2: Validate Consistency

Ensure worker outputs are compatible:

1. **Check interfaces**
   - Verify APIs between components match
   - Ensure type definitions are consistent
   - Validate data models align

2. **Check dependencies**
   - Verify all dependencies are satisfied
   - Ensure import statements are correct
   - Check for circular dependencies

3. **Check integration**
   - Verify components work together
   - Check for naming conflicts
   - Ensure configuration is consistent

### Step 3: Merge Artifacts

Combine worker outputs into final deliverable:

1. **Merge code changes**
   - If workers modified different files: Simple collection
   - If workers modified same files: Apply merge strategy
   - Resolve any remaining conflicts

2. **Consolidate documentation**
   - Combine documentation updates
   - Ensure consistent style and format
   - Remove duplicates

3. **Aggregate tests**
   - Collect all test files
   - Ensure no duplicate test names
   - Verify test coverage is comprehensive

### Step 4: Run Integration Validation

Validate the combined output:

1. **Run all tests**
   - Execute full test suite
   - Verify all tests pass
   - Check coverage meets threshold

2. **Run quality checks**
   - Execute linter on all code
   - Run type checker
   - Verify build succeeds

3. **Identify integration issues**
   - Note any failures
   - Determine root cause
   - Assign fixes if needed

### Step 5: Synthesize Summary

Create comprehensive summary of work completed:

1. **Aggregate metrics**
   ```yaml
   summary:
     total_workers: {count}
     total_tasks: {count}
     total_duration: {duration}
     
     artifacts:
       files_created: {count}
       files_modified: {count}
       lines_of_code: {total_loc}
       
     quality:
       tests_written: {count}
       tests_passing: {count}
       coverage: {percentage}
       lint_status: {status}
       type_check_status: {status}
       
     efficiency:
       estimated_time_sequential: {duration}
       actual_time_parallel: {duration}
       time_saved: {duration}
       speedup_factor: {factor}
   ```

2. **Compile work summary**
   - List all completed tasks
   - Highlight key accomplishments
   - Note challenges overcome
   - Document decisions made

3. **Identify follow-up items**
   - List any incomplete items
   - Note recommendations from workers
   - Identify next steps
   - Flag risks or concerns

### Step 6: Generate Final Report

Create comprehensive completion report:

1. **Executive summary**
   - High-level overview of work completed
   - Key metrics and achievements
   - Overall status (success, partial, issues)

2. **Detailed breakdown**
   - Per-worker summary
   - Per-task details
   - Artifact inventory
   - Quality metrics

3. **Integration results**
   - Integration test results
   - Compatibility verification
   - Known issues or limitations

4. **Handoff information**
   - What was delivered
   - How to use/test it
   - Next steps
   - Who should review

### Step 7: Clean Up State

Clean up coordination state:

1. **Archive worker states**
   - Move worker state files to archive
   - Preserve for debugging/analysis
   - Clean up active state directory

2. **Release resource locks**
   - Delete all lock files created by workers
   - Verify no orphaned locks remain

3. **Archive messages**
   - Move messages to archive directory
   - Preserve coordination history
   - Clean up active message directory

4. **Update coordinator state**
   - Mark coordination session as complete
   - Record final metrics
   - Archive coordinator state

## Output Format

### Aggregated Deliverables

```
=== Sub-Agent Coordination Complete ===

Session: {session_id}
Coordinator: {coordinator_id}
Duration: {duration}

WORKERS:
- {worker_id_1}: {task_1} - COMPLETE
- {worker_id_2}: {task_2} - COMPLETE
- {worker_id_3}: {task_3} - COMPLETE

DELIVERABLES:
Files Created: {count}
  - {file_path_1}
  - {file_path_2}
  - ...

Files Modified: {count}
  - {file_path_1} ({changes})
  - {file_path_2} ({changes})
  - ...

Documentation Updated:
  - {doc_path_1}
  - {doc_path_2}

QUALITY METRICS:
Tests: {passing}/{total} passing ({coverage}% coverage)
Lint: {status}
Type Check: {status}
Build: {status}

INTEGRATION:
✓ All components integrate successfully
✓ All tests pass
✓ No conflicts remain

EFFICIENCY:
Sequential Estimate: {seq_time}
Parallel Actual: {parallel_time}
Time Saved: {saved_time} ({speedup}x faster)

NEXT STEPS:
- {next_step_1}
- {next_step_2}

HANDOFF:
Ready for: {next_agent}
Review focus: {focus_areas}
Known limitations: {limitations}
```

## Error Handling

- **Integration failures**: Identify root cause, assign fixes
- **Quality gate failures**: Report to user, suggest remediation
- **Merge conflicts**: Escalate to user for resolution
- **Missing artifacts**: Request worker to complete or escalate

