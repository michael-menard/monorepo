# Future Risks: LNGG-0040 — Stage Movement Adapter

**Generated**: 2026-02-14
**Story**: LNGG-0040 — Stage Movement Adapter
**Context**: Non-MVP risks tracked for post-launch consideration

---

## Non-MVP Risks

### Risk 1: No Rollback Mechanism

**Impact**: If a batch move partially fails, already-moved stories cannot be automatically rolled back.

**Post-MVP Impact**:
- Manual intervention required to fix partial failures
- Could leave stories in inconsistent states during batch operations
- Operator burden increases with batch size

**Recommended Timeline**: Phase 2 (after LNGG-0070 Integration Test Suite)

**Mitigation Options**:
- Implement transaction log for batch operations
- Add `rollback()` method to undo recent moves
- Store move history in memory during batch operations
- On error, iterate backwards and revert status changes

### Risk 2: No Stage Movement History Tracking

**Impact**: Cannot audit who moved a story, when, or why.

**Post-MVP Impact**:
- Difficult to debug unexpected stage changes
- Cannot answer "who moved this story to UAT?"
- No accountability for stage transitions
- Compliance/audit trail missing

**Recommended Timeline**: Phase 3 (after WINT-0070 Workflow Tracking Tables)

**Mitigation Options**:
- Add workflow events logging (via WINT-0070)
- Store movement history in database
- Include metadata: timestamp, actor, reason
- Query history via workflow events API

### Risk 3: Performance Degradation on Very Large Batches

**Impact**: Batch operations on 100+ stories may exceed performance targets.

**Post-MVP Impact**:
- Batch moves become bottleneck for large-scale operations
- Workflow orchestration slows down
- User experience degrades for bulk operations

**Recommended Timeline**: Phase 2 (if observed in production)

**Mitigation Options**:
- Implement adaptive concurrency (start at 10, scale to 50)
- Add progress streaming for long-running batches
- Cache StoryFileAdapter instances
- Use worker threads for parallel processing

### Risk 4: No Validation of Story Metadata Before Move

**Impact**: Stories with missing required fields can be moved, potentially causing downstream errors.

**Post-MVP Impact**:
- Stories in "ready-to-work" without acceptance criteria
- Stories in "UAT" without test plans
- Workflow failures after stage movement

**Recommended Timeline**: Phase 3 (after story validation schema defined)

**Mitigation Options**:
- Add pre-move validation checks
- Define required fields per stage
- Reject moves if requirements not met
- Provide validation error details

### Risk 5: No Support for Custom Stage Workflows

**Impact**: All epics must use the same stage workflow (backlog → elaboration → ready-to-work → ...).

**Post-MVP Impact**:
- Cannot customize workflows per epic
- Cannot add new stages (e.g., "security-review")
- Rigid workflow constrains future requirements

**Recommended Timeline**: Phase 4 (if custom workflows needed)

**Mitigation Options**:
- Make stage graph configurable per epic
- Load stage transitions from config file
- Add stage graph validation on adapter init
- Support multiple workflow types

### Risk 6: No Dry-Run Mode

**Impact**: Cannot preview batch move results before committing.

**Post-MVP Impact**:
- Risk of accidental bulk moves
- Cannot verify batch operations before execution
- User confidence in bulk operations reduced

**Recommended Timeline**: Phase 2 (after user feedback)

**Mitigation Options**:
- Add `dryRun: true` option to batch operations
- Return preview results without writing files
- Show success/failure predictions
- Require confirmation for large batches (>20 stories)

### Risk 7: No Notification System for Stage Changes

**Impact**: Stakeholders not notified when stories change stages.

**Post-MVP Impact**:
- PM doesn't know when story ready for QA
- QA doesn't know when story ready for testing
- Team coordination requires manual polling

**Recommended Timeline**: Phase 5 (integration with notification system)

**Mitigation Options**:
- Emit stage change events
- Integrate with notification service (Slack, email)
- Configure notification preferences per user
- Add webhook support for external systems

---

## Scope Tightening Suggestions

### Clarification 1: Stage Transition Graph

**Current Ambiguity**: Seed doesn't explicitly define all valid transitions.

**Suggested Clarification**:
- Add explicit stage transition DAG to story
- Document special cases (UAT → in-progress for rework)
- Define lateral transitions (elaboration ↔ backlog)
- Include transition graph diagram

### Clarification 2: Batch Error Handling Strategy

**Current Ambiguity**: Seed doesn't specify batch error handling approach.

**Suggested Clarification**:
- Choose between "fail fast" and "continue on error"
- Define result object structure
- Specify how partial failures are reported
- Document retry behavior (if any)

### Clarification 3: Concurrency Limits

**Current Ambiguity**: Seed mentions "parallel processing" but no limits.

**Suggested Clarification**:
- Set concurrency limit (recommended: 10)
- Define queueing behavior for large batches
- Specify timeout behavior
- Document resource constraints

### OUT OF SCOPE Candidates for Later

**Later Stories**:
1. **Workflow State Tracking** → LNGG-0070 (Integration Test Suite) or later
2. **Stage Movement History** → WINT-0070 (Workflow Tracking Tables)
3. **Database Integration** → WINT-1030 (Populate Story Status from Directories)
4. **Notification System** → Separate story (notifications epic)
5. **Custom Workflows** → Separate story (workflow customization epic)
6. **Rollback Mechanism** → LNGG-0080 (Stage Movement Rollback) - hypothetical
7. **Dry-Run Mode** → LNGG-0090 (Stage Movement Dry-Run) - hypothetical
8. **Progress Streaming** → LNGG-0100 (Batch Operation Streaming) - hypothetical

---

## Future Requirements

### Nice-to-Have: Progress Callbacks

**Requirement**: Allow caller to provide callback for batch operation progress.

**Use Case**:
- Show progress bar in CLI
- Update dashboard in real-time
- Log intermediate results

**Implementation**:
```typescript
await adapter.batchMoveStage({
  stories: [...],
  toStage: 'in-progress',
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`)
  }
})
```

### Nice-to-Have: Stage Movement Webhooks

**Requirement**: Emit webhook events on stage changes.

**Use Case**:
- Integrate with external systems (Jira, Linear)
- Trigger downstream workflows
- Send notifications

**Implementation**:
```typescript
adapter.on('stage-moved', (event) => {
  webhookClient.post('/stage-changed', event)
})
```

### Nice-to-Have: Stage Movement Metrics

**Requirement**: Track stage movement metrics for analytics.

**Use Case**:
- Measure cycle time per stage
- Identify bottlenecks
- Generate velocity reports

**Implementation**:
```typescript
// Log metrics to telemetry system
logger.metric('stage_movement', {
  storyId,
  fromStage,
  toStage,
  elapsedMs,
  timestamp: Date.now()
})
```

### Nice-to-Have: Conditional Stage Transitions

**Requirement**: Only allow transitions if conditions met.

**Use Case**:
- Require test plan before moving to ready-to-work
- Require proof before moving to UAT
- Enforce quality gates

**Implementation**:
```typescript
const conditions = {
  'ready-to-work': (story) => !!story.testPlan,
  'UAT': (story) => !!story.proof
}

await adapter.moveStage({
  storyId: 'TEST-001',
  toStage: 'ready-to-work',
  enforceConditions: true // validate before moving
})
```

---

## Polish and Edge Case Handling

### Polish 1: Better Error Messages

**Current**: Generic error messages
**Future**: Contextual, actionable error messages

**Examples**:
- "Story TEST-001 not found. Did you mean TEST-010?" (fuzzy match)
- "Invalid transition: UAT → backlog. To deprioritize, use --force flag."
- "Permission denied writing to TEST-001.md. Check file permissions."

### Polish 2: Stage Movement Validation Summary

**Current**: Validate transitions on move
**Future**: Provide validation summary before batch move

**Example**:
```typescript
const summary = await adapter.validateBatchMove({
  stories: [...],
  toStage: 'in-progress'
})
// Returns: { valid: 15, invalid: 5, warnings: [...] }
```

### Polish 3: Stage Movement Undo

**Current**: No undo mechanism
**Future**: Allow undo of last N moves

**Example**:
```typescript
await adapter.moveStage({ /* move to in-progress */ })
await adapter.undo() // revert to previous stage
```

### Polish 4: Stage Movement Scheduling

**Current**: Immediate execution only
**Future**: Schedule stage moves for future time

**Example**:
```typescript
await adapter.moveStage({
  storyId: 'TEST-001',
  toStage: 'ready-to-work',
  scheduledAt: new Date('2026-02-20T09:00:00Z')
})
```

---

## Monitoring and Observability

### Future Metrics to Track

**Performance Metrics**:
- `stage_movement_duration_ms` (p50, p95, p99)
- `batch_move_duration_ms` (by batch size)
- `concurrent_moves_count`

**Error Metrics**:
- `stage_movement_errors_total` (by error type)
- `invalid_transitions_total` (by from/to stages)
- `story_not_found_total`

**Business Metrics**:
- `stage_transitions_total` (by from/to stages)
- `stories_per_stage` (gauge)
- `avg_time_in_stage` (by stage)

### Future Logging Enhancements

**Structured Logging**:
- Add correlation IDs for batch operations
- Include user context (who triggered move)
- Log transition reason/metadata
- Add trace IDs for distributed tracing

---

## Recommendations

**Priority 1** (Phase 2):
- Add dry-run mode for batch operations
- Implement rollback mechanism
- Add performance optimizations for large batches

**Priority 2** (Phase 3):
- Integrate with WINT-0070 (Workflow Tracking Tables) for history
- Add stage movement validation (required fields per stage)
- Implement better error messages

**Priority 3** (Phase 4):
- Add progress callbacks for batch operations
- Implement conditional stage transitions
- Support custom workflow configurations

**Priority 4** (Phase 5):
- Integrate with notification system
- Add webhook support
- Implement scheduling for future moves
