# Future Opportunities - LNGG-0080

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No adapter caching layer | Medium | Medium | Current nodes create new adapter instances on each invocation. For long-running workflows with many node calls, consider singleton adapter registry to reuse instances. **Trade-off:** Simplicity vs. performance. **When:** If profiling shows adapter instantiation is >5% of workflow time. |
| 2 | No batch operation support in nodes | Low | Low | Nodes call adapters one story at a time. Multi-story workflows (e.g., batch validation) could benefit from batch read/write. **When:** If batch workflows (LNGG-0085+) are added. **Effort:** Add `readBatch()` and `writeBatch()` methods to nodes, delegate to existing adapter batch operations. |
| 3 | No telemetry/observability hooks | Medium | Medium | Nodes log to @repo/logger but don't emit metrics (operation duration, error counts). **When:** Production monitoring needed. **Effort:** Add OpenTelemetry spans or custom metric emission. |
| 4 | No retry logic for transient failures | Low | Medium | Nodes fail immediately on adapter errors (e.g., ENOSPC, network timeouts). Transient failures could auto-retry. **Trade-off:** Complexity vs. resilience. **When:** Production deployment shows transient failures. **Pattern:** Exponential backoff with max 3 retries. |
| 5 | No node composition helpers | Low | Low | Each node is standalone. Common patterns (load story → validate → update index) could be composed into higher-level utilities. **When:** Graph code shows repetitive node sequencing. **Effort:** Create `composeNodes()` helper function. |
| 6 | Limited error context in state | Low | Low | Nodes return `state.error` as `Error` object. Rich error context (e.g., validation details, file paths, operation type) lost in serialization. **When:** Debugging production workflows. **Fix:** Extend state with `errorDetails: Record<string, any>` field. |
| 7 | No dry-run mode for destructive operations | Medium | Low | Stage movement node moves directories without preview. Dry-run flag could log intended changes without executing. **When:** User requests preview capability. **Effort:** Add `dryRun: boolean` to node config, skip writes when enabled. |
| 8 | No rollback checkpoint for multi-node failures | High | High | If workflow fails after checkpoint-node but before stage-movement-node, no automatic rollback. Manual cleanup required. **When:** Reliability requirements increase. **Effort:** Implement transaction log with automatic rollback on workflow abortion. **Complexity:** Requires distributed transaction semantics. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Parallel node execution | High | Medium | Current graphs run nodes sequentially. Independent operations (e.g., KB write + index update) could run in parallel. **When:** Workflow latency becomes issue. **Effort:** Use LangGraph parallel edges for independent nodes. **Caution:** Ensure atomicity guarantees maintained. |
| 2 | Node result caching | Medium | Medium | Repeated reads of same story within workflow (e.g., story-file-node called multiple times) could cache result. **When:** Profiling shows duplicate reads. **Effort:** Add LRU cache with workflow-scoped lifetime. **Trade-off:** Memory vs. I/O. |
| 3 | Streaming progress updates | Medium | High | Nodes complete asynchronously but don't stream progress. Long-running operations (stage movement with large directories) appear frozen. **When:** UX improvement priority. **Effort:** Implement server-sent events or websocket progress channel. |
| 4 | Configuration validation at graph construction | Low | Low | Node configs validated at runtime. Early validation at graph build time would catch errors before execution. **When:** Developer experience improvement. **Effort:** Add Zod validation to `createToolNode()` with config schema parameter. |
| 5 | Node performance profiling built-in | Medium | Low | Performance targets exist (LNGG-0070) but no automatic profiling. **When:** Performance regression tracking needed. **Effort:** Wrap node functions with timing instrumentation, log to performance metrics database. |
| 6 | Decision callback node with webhook support | Low | Medium | Current decision callbacks use CLI prompts or auto-rules. Webhook integration could enable external approval systems (Slack, PagerDuty). **When:** Enterprise deployment with approval workflows. **Effort:** Add WebhookDecisionCallback implementation. |
| 7 | KB writer node with real-time sync | Low | High | Current KB writer defers writes to YAML. Real-time database sync could enable immediate KB search. **When:** KB becomes primary knowledge repository (LNGG-0073+). **Effort:** Integrate with real KB adapter when available. |
| 8 | Stage movement node with conflict resolution | Medium | Medium | If target directory exists (edge case: concurrent workflows), node fails. Conflict resolution strategies (merge, skip, prompt) could improve robustness. **When:** Concurrent workflow support needed. **Effort:** Add conflict resolution strategy to node config. |
| 9 | Checkpoint node with branching support | High | High | Current checkpoint is linear (one resume point). Branching workflows (e.g., A/B test variants) could checkpoint multiple paths. **When:** Workflow experimentation framework built. **Effort:** Extend checkpoint schema with branch identifiers. |
| 10 | Visual workflow debugger | High | Very High | LangGraph graphs are text-based. Visual debugger showing node execution trace, state transitions, and error paths would improve development experience. **When:** Complex multi-graph workflows emerge. **Effort:** Build UI for LangGraph execution visualization (likely external tool). |

## Categories

### Edge Cases
- **Gap 2:** Batch operation support - handles workflows processing >10 stories simultaneously
- **Gap 4:** Retry logic - handles transient file system or network failures
- **Gap 7:** Dry-run mode - allows preview of destructive operations
- **Gap 8:** Rollback checkpoint - handles partial workflow failures
- **Enhancement 8:** Stage movement conflict resolution - handles concurrent workflow collisions

### UX Polish
- **Enhancement 3:** Streaming progress updates - real-time feedback for long operations
- **Enhancement 10:** Visual workflow debugger - improves developer experience

### Performance
- **Gap 1:** Adapter caching - reduces instantiation overhead
- **Enhancement 1:** Parallel node execution - reduces total workflow latency
- **Enhancement 2:** Node result caching - eliminates duplicate file reads
- **Enhancement 5:** Built-in profiling - tracks performance regressions

### Observability
- **Gap 3:** Telemetry hooks - enables production monitoring
- **Gap 6:** Rich error context - improves debugging
- **Enhancement 5:** Performance profiling - tracks latency and throughput

### Integrations
- **Enhancement 6:** Webhook decision callbacks - integrates with external approval systems
- **Enhancement 7:** Real-time KB sync - integrates with knowledge base database (future)

### Architecture
- **Gap 5:** Node composition helpers - reduces boilerplate
- **Enhancement 4:** Configuration validation - catches errors earlier
- **Enhancement 9:** Checkpoint branching - enables A/B testing workflows

## Prioritization Recommendations

### High Impact, Low Effort (Quick Wins)
1. **Gap 7:** Dry-run mode (AC-3 extension) - Simple boolean flag, high user value
2. **Enhancement 4:** Config validation at graph construction - Prevents runtime errors
3. **Enhancement 5:** Built-in profiling - Low overhead, high observability value

### High Impact, Medium Effort (Next Iteration)
1. **Enhancement 1:** Parallel node execution - Significant latency reduction for independent operations
2. **Gap 1:** Adapter caching - Performance improvement for high-throughput workflows
3. **Gap 3:** Telemetry hooks - Production readiness requirement

### High Impact, High Effort (Long Term)
1. **Gap 8:** Rollback checkpoint - Critical for production reliability but requires distributed transaction design
2. **Enhancement 9:** Checkpoint branching - Enables workflow experimentation framework
3. **Enhancement 10:** Visual debugger - Developer experience transformation

### Low Priority (Deferred)
1. **Gap 2:** Batch operations - Only needed if batch workflows emerge (LNGG-0085+)
2. **Gap 5:** Node composition helpers - Wait for patterns to emerge organically
3. **Enhancement 6:** Webhook callbacks - Enterprise feature, not immediate need

## Implementation Notes

### If Pursuing Parallel Execution (Enhancement 1):
```typescript
// Example: Parallel KB write + index update
const graph = new StateGraph(WorkflowState)
  .addNode('kb_write', kbWriterNode)
  .addNode('index_update', indexNode)
  .addEdge(START, 'kb_write')  // Both start together
  .addEdge(START, 'index_update')
  .addEdge('kb_write', END)
  .addEdge('index_update', END)

// Caution: Ensure nodes are truly independent (no shared state writes)
```

### If Pursuing Adapter Caching (Gap 1):
```typescript
// Singleton adapter registry pattern
class AdapterRegistry {
  private static adapters = new Map<string, any>()

  static getStoryFileAdapter(): StoryFileAdapter {
    if (!this.adapters.has('story-file')) {
      this.adapters.set('story-file', new StoryFileAdapter())
    }
    return this.adapters.get('story-file')!
  }
}

// Use in nodes:
const adapter = AdapterRegistry.getStoryFileAdapter()
```

### If Pursuing Dry-Run Mode (Gap 7):
```typescript
// Extend stage-movement-node config
export const StageMovementConfigSchema = z.object({
  dryRun: z.boolean().default(false),
  // ...existing config
})

// In node implementation:
if (config.dryRun) {
  logger.info('DRY RUN: Would move story', { from, to })
  return { moved: false, dryRun: true }
}
// ...actual move
```

## Future Story Candidates

Based on findings above, potential future stories:

- **LNGG-0081:** Adapter Performance Optimization (Gap 1, Enhancement 2, Enhancement 5)
- **LNGG-0082:** Workflow Observability (Gap 3, Gap 6, Enhancement 5)
- **LNGG-0083:** Parallel Node Execution (Enhancement 1)
- **LNGG-0084:** Dry-Run Mode for Destructive Operations (Gap 7)
- **LNGG-0085:** Batch Workflow Support (Gap 2, Enhancement 2)
- **LNGG-0086:** Workflow Resilience (Gap 4, Gap 8, Enhancement 8)
- **LNGG-0087:** Visual Workflow Debugger (Enhancement 10)
- **LNGG-0088:** Checkpoint Branching for A/B Testing (Enhancement 9)

## References

- **LNGG-0070 Integration Tests:** Source of performance baselines and test patterns
- **doc-sync.ts:** Reference implementation for node wrapper pattern
- **LangGraph Parallel Edges:** https://langchain-ai.github.io/langgraphjs/docs/concepts/parallel-execution
- **OpenTelemetry JS:** https://opentelemetry.io/docs/instrumentation/js/ (for Gap 3)
