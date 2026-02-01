---
story_id: KNOW-168
title: KB Usage Monitoring
status: backlog
epic: knowledgebase-mcp
created: 2026-01-31
updated: 2026-01-31
depends_on: [KNOW-043]
blocks: []
follow_up_from: KNOW-043
assignee: null
priority: P3
story_points: 2
tags: [knowledge-base, monitoring, analytics, agents, adoption]
---

# KNOW-168: KB Usage Monitoring

## Follow-up Context

**Parent Story:** KNOW-043 (Lessons Learned Migration)

**Source:** QA Discovery Notes - Follow-up Stories Suggested #5

**Original Finding:** Track which agents use KB tools via logging. Identify agents not querying KB as expected. Monitor adoption of KB-first workflow and popular search patterns.

**Category:** Enhancement Opportunity

**Impact:** Medium - Provides visibility into KB adoption and usage patterns, enabling proactive agent instruction improvements and identifying knowledge gaps

**Effort:** Low - Leverages existing logging infrastructure; primarily analysis and dashboard work

## Context

After migrating lessons learned to the Knowledge Base (KNOW-043), we need visibility into how agents are actually using the KB. Without usage monitoring, we cannot:

1. **Verify agents are following KB-first workflow** - Identify agents that should query KB but don't
2. **Understand search effectiveness** - Identify popular search patterns and queries that return no results
3. **Measure adoption** - Track KB usage trends over time to validate migration success
4. **Improve knowledge coverage** - Identify gaps where agents need knowledge that doesn't exist in KB

This story establishes monitoring and analytics to answer the question: "Are agents successfully using the KB, and what knowledge are they looking for?"

## Goal

Implement usage monitoring for Knowledge Base MCP tools to track:

1. **Which agents** are using which KB tools (`kb_search`, `kb_add`, `kb_get`, etc.)
2. **Search patterns** - What queries are agents running, and what results are they getting?
3. **Adoption trends** - Is KB usage increasing or decreasing over time?
4. **Knowledge gaps** - What queries return no results (indicating missing knowledge)?

## Non-Goals

- **Real-time alerting** - Basic reporting is sufficient; no need for real-time alerts on usage
- **User-level tracking** - Focus on agent roles, not individual users
- **Query performance profiling** - KNOW-004 handles performance; this focuses on usage patterns
- **Custom analytics dashboard** - Simple logs and reports are sufficient; no custom UI
- **Retention beyond 30 days** - Short-term trends are sufficient for this MVP

## Scope

### Endpoints/Surfaces

**Logging (apps/api/knowledge-base/src/mcp-server):**
- `tool-handlers.ts` - Add usage logging to all 11 tool handlers
- `server.ts` - Add usage log aggregation logic

**Reporting:**
- New: `scripts/kb-usage-report.ts` - Generate usage reports from logs

### Packages/Apps Affected

- `apps/api/knowledge-base` - Add usage logging to MCP server

## Acceptance Criteria

### AC1: Tool Usage Logging
- [ ] Each KB tool invocation logs: tool name, agent role, timestamp, success/failure
- [ ] Search queries log: query text, result count, top result relevance score
- [ ] Logs are structured (JSON) for easy parsing
- [ ] Logs use `@repo/logger` with `kb-usage` category
- [ ] Log format includes: `{ tool, role, timestamp, query?, resultCount?, success }`

### AC2: Agent Adoption Tracking
- [ ] Report shows which agents (by role) are using KB tools
- [ ] Report identifies agents expected to use KB but showing zero usage
- [ ] Report aggregates usage by agent role (pm, dev, qa, all)

### AC3: Search Pattern Analysis
- [ ] Report shows top 10 most frequent search queries
- [ ] Report shows queries that returned zero results (knowledge gaps)
- [ ] Report includes search result count distribution (0 results, 1-5, 6+)

### AC4: Usage Trends
- [ ] Report shows daily KB tool usage count over last 7 days
- [ ] Report shows usage breakdown by tool type (search vs. add vs. update)
- [ ] Report calculates trend: increasing, stable, or decreasing usage

### AC5: Documentation
- [ ] Usage logging documented in knowledge-base README
- [ ] Report generation instructions documented
- [ ] Sample report output included in docs

## Reuse Plan

**Builds on KNOW-043:**
- Leverages agent KB integration from KNOW-043 (agents already using KB tools)
- Uses existing MCP tool handlers as logging injection points

**Builds on KNOW-005:**
- Uses agent role from AGENT_ROLE environment variable (established in KNOW-005)
- Logs role-based usage to identify adoption by agent type

**Reuses existing infrastructure:**
- `@repo/logger` for structured logging
- Existing MCP server request/response flow

## Architecture Notes

### Logging Flow

```
Agent → MCP Tool Handler → [Log Usage] → Execute Tool → [Log Result] → Return
                                ↓
                          Structured Logs
                                ↓
                          kb-usage-report.ts
                                ↓
                          Console Output (Markdown)
```

### Log Entry Schema

```typescript
const UsageLogEntrySchema = z.object({
  timestamp: z.string(),        // ISO 8601
  tool: z.string(),             // kb_search, kb_add, etc.
  role: z.string(),             // pm, dev, qa, all
  success: z.boolean(),         // true if tool executed successfully
  query: z.string().optional(), // For kb_search: the query text
  resultCount: z.number().optional(), // For kb_search: number of results
  topScore: z.number().optional(),    // For kb_search: top result score
})
```

### Report Format (Markdown)

```markdown
# KB Usage Report (2026-01-24 to 2026-01-31)

## Agent Adoption
- PM agents: 45 queries
- Dev agents: 12 queries
- QA agents: 8 queries
- All role: 3 queries

## Search Patterns
Top Queries:
1. "drizzle migration patterns" (12 searches)
2. "testing harness setup" (8 searches)
3. "API error handling" (5 searches)

Knowledge Gaps (0 results):
1. "Playwright visual regression" (3 searches)
2. "AWS Lambda cold start optimization" (2 searches)

## Usage Trends
- Total tool invocations: 68
- Daily average: 9.7
- Trend: Increasing (+15% week-over-week)
```

## Test Plan

### Happy Path Tests

#### Test 1: Usage Logging on Search
**Setup:** KB running, logs enabled

**Action:** Agent executes `kb_search({ query: "test query", limit: 5 })`

**Expected:**
- Log entry created with: tool=kb_search, query="test query", resultCount=X, success=true
- Log includes agent role from AGENT_ROLE env var

#### Test 2: Usage Logging on Add
**Setup:** KB running, logs enabled

**Action:** Agent executes `kb_add({ content: "test lesson", tags: ["test"] })`

**Expected:**
- Log entry created with: tool=kb_add, success=true
- No query/resultCount fields (only for search)

#### Test 3: Report Generation
**Setup:** 7 days of usage logs exist (simulated)

**Action:** Run `pnpm kb:usage-report`

**Expected:**
- Report shows agent adoption breakdown
- Report shows top queries and knowledge gaps
- Report shows usage trend

### Error Cases

#### Error 1: Tool Execution Failure
**Setup:** KB search fails (e.g., database down)

**Expected:**
- Log entry created with success=false
- Report counts failed invocations separately

#### Error 2: No Logs Available
**Setup:** No usage logs exist

**Action:** Run `pnpm kb:usage-report`

**Expected:**
- Report displays "No usage data available" message
- Script exits cleanly (no errors)

### Edge Cases

#### Edge 1: High-Frequency Queries
**Setup:** Same query executed 100 times

**Expected:**
- All invocations logged
- Report shows query in "Top Queries" with accurate count

#### Edge 2: Long Query Text
**Setup:** Agent searches with 500-character query

**Expected:**
- Log truncates query to 200 characters
- Report displays truncated version

## Risks / Edge Cases

1. **Log volume:** High KB usage could generate many logs; consider log rotation or sampling
2. **Privacy:** Search queries may contain sensitive information; ensure logs are not exposed
3. **Performance impact:** Logging should add <1ms overhead per tool invocation
4. **Report accuracy:** Report depends on complete logs; missing logs skew results

## Open Questions

None - this is a straightforward logging and reporting enhancement.

---

## Related Stories

**Depends on:** KNOW-043 (Lessons Learned Migration) - Establishes agent KB integration patterns to monitor

**Related:**
- KNOW-040 (Agent Instruction Integration) - Similar agent KB integration, another source of usage data
- KNOW-005 (MCP Server Foundation) - MCP tool handlers where logging will be added

---

## Notes

- Start simple: structured logs + basic report script
- Avoid premature optimization (custom dashboards, real-time analytics)
- Focus on actionable insights: which agents aren't using KB, what knowledge is missing
- Consider follow-up story for automated "KB health check" based on usage patterns

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| Elaboration | — | — | — |
| Implementation | — | — | — |

(To be filled during execution)
