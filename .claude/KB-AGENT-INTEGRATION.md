# Knowledge Base Agent Integration Guide

This guide documents how to integrate Knowledge Base (KB) queries into agent instruction files.

## Overview

KB integration enables agents to query institutional knowledge before performing tasks. This "KB-first" approach ensures agents build on team learnings rather than starting from scratch.

### Benefits

- Reduced repeated mistakes
- Consistent architectural decisions
- Access to domain-specific patterns
- Traceable knowledge citations

## Template Section

Copy this template into agent instruction files. Place after "Mission" section, before "Inputs" or "Execution Flow".

```markdown
## Knowledge Base Integration

Before [agent-specific action], query KB for relevant patterns and decisions.

### When to Query

| Trigger | Query Pattern |
|---------|--------------|
| [Trigger 1] | `kb_search({ query: "...", role: "...", limit: N })` |
| [Trigger 2] | `kb_search({ query: "...", tags: ["..."], limit: N })` |
| [Trigger 3] | `kb_search({ query: "...", role: "...", limit: N })` |

### Example Queries

**[Use Case 1]:**
```javascript
kb_search({ query: "specific query string", role: "dev", limit: 5 })
```

**[Use Case 2]:**
```javascript
kb_search({ query: "another query", tags: ["tag1", "tag2"], limit: 3 })
```

### Applying Results

Cite KB sources in [output file]: "Per KB entry {ID}: {summary}"

### Fallback Behavior

- No results: Proceed with best judgment
- KB unavailable: Log warning, continue without KB context
- Consider adding new learnings to KB after task completion
```

## Agent Types That Benefit

| Agent Type | Query Focus | Priority |
|------------|-------------|----------|
| Implementation Leaders | Architecture, patterns, past decisions | High |
| Setup Leaders | Setup patterns, common blockers | High |
| QA/Verification | Test strategies, edge cases | High |
| Elaboration Analysts | Story patterns, sizing guidelines | Medium |
| Learnings Workers | Past retrospectives, optimization | Medium |
| Planning Workers | Implementation approaches | Low |

## Workflow Analysis

To identify natural KB query injection points for an agent:

1. **Map the agent workflow phases**
   - Initialization (receiving task context)
   - Analysis (understanding requirements)
   - Decision points (choosing approaches)
   - Execution (performing work)
   - Completion (reporting results)

2. **Identify high-value query points**
   - After receiving task, before analysis
   - Before making architectural decisions
   - When encountering domain-specific questions

3. **Define trigger patterns**
   - What task types does this agent handle?
   - What decisions does it make autonomously?
   - What information would improve its outputs?

4. **Avoid over-querying**
   - Query once at start (leader agents)
   - Query before major subtasks (worker agents)
   - Do NOT query continuously during execution

## Testing Checklist

Before committing KB integration changes:

- [ ] KB integration block is ≤1500 characters total
- [ ] All kb_search parameters are valid (query, role, tags, limit)
- [ ] At least 3 trigger patterns documented
- [ ] At least 2 example queries provided
- [ ] Fallback behavior addresses no-results and unavailable cases
- [ ] Citations use format "Per KB entry {ID}: {summary}"
- [ ] Section placed after "Mission", before "Inputs"

## KB Citation Format

When agents apply KB knowledge, use consistent citation format:

### Standard Format
```
Per KB entry {ENTRY_ID}: {brief summary of how knowledge is applied}
```

### Examples
```
Per KB entry kb_auth_001: Use JWT refresh tokens with 15-minute expiry.
Per KB entry kb_drizzle_042: Apply transaction wrapper for multi-table migrations.
Per KB entry kb_test_015: Include error boundary tests for async components.
```

### Citation Placement

- Cite at point of use, not just in summary
- Include entry ID for traceability
- Keep summary brief (1 sentence)

## Error Handling Patterns

### KB Search Returns No Results

```markdown
No relevant KB results found for "{query}". Proceeding with best judgment based on:
- Training data and general patterns
- Story requirements and context
- Team coding standards
```

### KB Unavailable (MCP Error)

```markdown
KB unavailable: {error type}. Continuing without institutional knowledge.
Note: Consider adding learnings to KB after task completion.
```

### Invalid Query

If kb_search returns validation error, check:
- `query` is a non-empty string
- `role` is valid (dev, qa, pm, etc.)
- `tags` is an array of strings
- `limit` is a positive number

## kb_search Schema Reference

```typescript
kb_search({
  query: string,      // Required: search query string
  role?: string,      // Optional: filter by role (dev, qa, pm)
  tags?: string[],    // Optional: filter by tags
  limit?: number      // Optional: max results (default: 5)
})
```

## Maintenance

When KB API evolves:

1. Update this guide with new parameters
2. Update examples in agent instruction files
3. Test queries against updated schema
4. Document breaking changes in CHANGELOG

## Related Stories

- KNOW-003: KB CRUD Operations
- KNOW-0052: KB Search Tools
- KNOW-040: Agent Instruction Integration (this pattern)
- KNOW-041: Query Audit Logging
- KNOW-042: KB-First Workflow Hooks
