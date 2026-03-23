# WINT-3090 Setup Log — Phase 0

**Story:** Add Scoreboard Metrics to Telemetry
**Phase:** Setup (Phase 0)
**Status:** IN PROGRESS
**Date:** 2026-03-20

## Story Overview

Implement `kb_get_scoreboard` MCP tool to compute composite workflow health metrics from telemetry infrastructure:

- Stories completed per week (throughput)
- Average cycle time (started_at → completed_at)
- First-pass success rate (no code review or QA iterations)
- Cost efficiency (tokens per completed story)
- Agent reliability (success rate by agent)

Also create `/scoreboard` CLI skill for human-readable output.

## Key Context

### Elaboration Subtask DAG

1. ✅ T1: TBDs resolved
2. ⬜ T2: Implement kb_get_scoreboard with Zod schemas
3. ⬜ T3: Register tool (tool-schemas.ts, tool-handlers.ts)
4. ⬜ T4: Add ToolName to access-control.ts
5. ⬜ T5: Create /scoreboard SKILL.md
6. ⬜ T6: Unit tests (>=80% coverage)

### Implementation Notes (from elaboration)

- **G1 (Cost source):** Use workflow.story_outcomes.estimated_total_cost (not analytics.token_dashboard)
- **G2 (Cycle time):** stories.completed_at - stories.started_at
- **G3 (Agent reliability):** agent_invocations.status = 'success' vs total invocations per agent_name

### Acceptance Criteria

- **AC1:** 5 metric sections returned (throughput, cycle_time, first_pass_success_rate, cost_efficiency, agent_reliability_rates)
- **AC2:** Graceful null/zero handling when no data exists
- **AC3:** Optional date_range filter (start_date, end_date) on all metrics
- **AC4:** Optional feature filter on all metrics
- **AC5:** Tool registered in all 3 locations with pm+dev roles
- **AC6:** /scoreboard skill with markdown table formatting
- **AC7:** Unit tests >= 80% coverage

## Architecture Analysis

### Source Schema Tables

#### workflow.stories

- storyId (PK), feature, title, description
- createdAt, updatedAt, startedAt, completedAt
- state, priority, tags, packages
- Key: startedAt/completedAt for cycle_time calculation

#### workflow.story_outcomes

- storyId (FK), finalVerdict, qualityScore
- totalInputTokens, totalOutputTokens, totalCachedTokens
- **estimatedTotalCost** (numeric) ← Use for cost_efficiency
- reviewIterations, qaIterations ← Use for first_pass_success_rate
- durationMs, primaryBlocker
- completedAt ← Sync point with stories.completedAt

#### workflow.agent_invocations

- agentName (text), storyId (FK), phase
- status (text) ← 'success' vs others
- inputTokens, outputTokens, cachedTokens, totalTokens
- estimatedCost, modelName
- startedAt, completedAt
- Key: status = 'success' for reliability calculation

#### analytics.story_token_usage

- storyId, feature, phase, agent
- inputTokens, outputTokens, totalTokens
- loggedAt, createdAt
- Note: This is partitioned by logged_at (monthly)
- Use for detailed token breakdowns if needed

### Implementation Working Set

**Files to Create:**

1. `apps/api/knowledge-base/src/crud-operations/analytics-operations.ts` — Add kb_get_scoreboard function + schemas

**Files to Modify:**

1. `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — Add KbGetScoreboardInputSchema + export + tool definition
2. `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — Add handle_kb_get_scoreboard handler + register in dispatch
3. `apps/api/knowledge-base/src/mcp-server/access-control.ts` — Add 'kb_get_scoreboard' to ToolNameSchema enum + ACCESS_MATRIX
4. `.claude/skills/scoreboard/SKILL.md` — New skill definition

**Files to Create (Tests):**

1. `apps/api/knowledge-base/src/crud-operations/__tests__/scoreboard-operations.test.ts` — Unit tests for kb_get_scoreboard

## Implementation Pattern Reference

### Existing Analytics Tools Pattern (from analytics-operations.ts)

```typescript
// 1. Input Schema
export const KbGetTokenSummaryInputSchema = z.object({
  group_by: TokenGroupBySchema,
  feature: z.string().optional(),
  story_id: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
})

// 2. Function Signature
export async function kb_get_token_summary(
  deps: AnalyticsDeps,
  input: KbGetTokenSummaryInput,
): Promise<{ results: [...], total: number, message: string }>

// 3. Drizzle Query Pattern
const result = await deps.db
  .select({ ... })
  .from(storyTokenUsage)
  .where(whereCondition)
  .groupBy(groupColumn)
  .orderBy(desc(...))
  .limit(validated.limit)
```

### Tool Registration Pattern (from tool-schemas.ts)

```typescript
// Export schema
export const KbGetTokenSummaryInputSchema = z.object({ ... })
export type KbGetTokenSummaryInput = z.infer<typeof KbGetTokenSummaryInputSchema>

// Tool definition with zodToMcpSchema conversion
export const kbGetTokenSummaryToolDefinition: McpToolDefinition = {
  name: 'kb_get_token_summary',
  description: '...',
  inputSchema: zodToMcpSchema(KbGetTokenSummaryInputSchema),
}
```

### Handler Registration Pattern (from tool-handlers.ts)

```typescript
// Import
import { kb_get_token_summary } from '../crud-operations/analytics-operations.js'

// Handler function
async function handle_kb_get_token_summary(
  context: AgentContext,
  deps: ToolDependencies,
  input: unknown,
): Promise<string> {
  // validation, authorization, call, return JSON string
}

// Registration in toolHandlers map
export const toolHandlers: Record<ToolName, ToolHandler> = {
  kb_get_token_summary: handle_kb_get_token_summary,
  // ...
}
```

### Access Control Pattern (from access-control.ts)

```typescript
export const ToolNameSchema = z.enum([
  'kb_get_token_summary',
  'kb_get_bottleneck_analysis',
  'kb_get_churn_analysis',
  // ...
])

const ACCESS_MATRIX: Record<ToolName, Set<AgentRole>> = {
  kb_get_token_summary: new Set(['pm', 'dev']),
  kb_get_bottleneck_analysis: new Set(['pm', 'dev']),
  kb_get_churn_analysis: new Set(['pm', 'dev']),
  // ...
}
```

## Key Constraints & Notes

1. **No Barrel Files** - Import directly from source files, never use index.ts re-exports
2. **Zod-First** - All types must use z.infer<> from Zod schemas, never TypeScript interfaces
3. **Logger** - Use @repo/logger, never console.log
4. **Test Coverage** - Minimum 80% for scoreboard tool
5. **Graceful Handling** - Return zero/null values when no data, never fail
6. **Query Patterns** - Use Drizzle ORM with proper WHERE conditions and null handling

## Next Steps (T2 Implementation)

1. Define KbGetScoreboardInputSchema in analytics-operations.ts
   - start_date (optional, coerce to date)
   - end_date (optional, coerce to date)
   - feature (optional string filter)

2. Define output schemas for 5 metrics:
   - throughput: { week: string, stories_completed: number, avg_per_day: number }
   - cycle_time: { mean_days: number, median_days: number, p95_days: number }
   - first_pass_success_rate: { rate: number, stories_passed: number, stories_total: number }
   - cost_efficiency: { avg_cost_per_story: number, total_tokens_per_story: number }
   - agent_reliability_rates: { agent_name: string, success_rate: number, invocation_count: number }[]

3. Implement kb_get_scoreboard function with aggregation queries

4. Register tool in 3 files

5. Create /scoreboard skill

6. Write comprehensive unit tests

---

**Setup Log Created:** 2026-03-20 20:35 UTC
**Ready for T2 Implementation:** ✅
