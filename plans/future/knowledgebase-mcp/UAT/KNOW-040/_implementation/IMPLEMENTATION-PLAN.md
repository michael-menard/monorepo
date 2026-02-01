# Implementation Plan - KNOW-040

## Overview

Add Knowledge Base integration sections to 5 agent instruction files and create an integration guide. This is a documentation-only story with no code changes.

## Phase 1: Agent File Modifications

### Target Files

| # | File | Role | KB Query Focus |
|---|------|------|----------------|
| 1 | `dev-implement-implementation-leader.agent.md` | Implementation Leader | Architecture decisions, patterns |
| 2 | `dev-setup-leader.agent.md` | Setup Leader | Setup patterns, common issues |
| 3 | `qa-verify-verification-leader.agent.md` | QA Verification | Test strategies, edge cases |
| 4 | `elab-analyst.agent.md` | Elaboration Analyst | Story patterns, audit criteria |
| 5 | `dev-implement-learnings.agent.md` | Learnings Worker | Retrospective patterns |

### Section Template

Each agent receives a "## Knowledge Base Integration" section placed after "Mission" and before "Inputs" or "Execution Flow". The section follows this structure:

```markdown
## Knowledge Base Integration

Before [agent-specific action], query the knowledge base for relevant context.

### When to Query

| Trigger | Query Pattern |
|---------|--------------|
| [trigger 1] | [pattern 1] |
| [trigger 2] | [pattern 2] |
| [trigger 3] | [pattern 3] |

### Example Queries

**[Use Case 1]:**
```javascript
kb_search({ query: "...", role: "...", limit: N })
```

**[Use Case 2]:**
```javascript
kb_search({ query: "...", tags: ["..."], limit: N })
```

### Applying Results

Cite KB sources: "Per KB entry {ID}: {summary}"

### Fallback Behavior

- No results: Proceed with best judgment
- KB unavailable: Log warning, continue without KB context
```

### Character Budget

Each KB integration block MUST be ≤1500 characters total. Budget allocation:
- Header + intro: ~100 chars
- Trigger table: ~400 chars
- Examples (2-3): ~700 chars
- Applying results: ~100 chars
- Fallback: ~200 chars

## Phase 2: Integration Guide Creation

Create `.claude/KB-AGENT-INTEGRATION.md` with:

1. **Overview** - Why KB integration matters
2. **Template Section** - Copy-pasteable markdown
3. **Agent Types** - Which agents benefit from KB
4. **Workflow Analysis** - How to identify query injection points
5. **Testing Checklist** - 5 validation items
6. **Citation Format** - Standard format with examples
7. **Error Handling** - Patterns for failures

## Phase 3: Validation

### Character Count Validation

For each modified file:
```bash
# Extract KB integration section and count characters
grep -A 100 "## Knowledge Base Integration" file.md | head -n $(grep -n "^## " file.md | head -2 | tail -1 | cut -d: -f1) | wc -c
```

### Section Placement Validation

Verify all 5 files have KB integration section:
- After "Mission" or "Role" section
- Before "Inputs" or "Execution Flow"
- Using "## Knowledge Base Integration" header

### Parameter Validation

All kb_search examples must use valid parameters:
- `query` (string, required)
- `role` (string, optional)
- `tags` (array, optional)
- `limit` (number, optional)

## Implementation Order

1. Create KB integration section for dev-implement-implementation-leader.agent.md (canonical template)
2. Adapt template for remaining 4 agents
3. Create KB-AGENT-INTEGRATION.md guide
4. Validate all acceptance criteria
5. Create proof documentation

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Section too long | Use concise trigger tables, limit examples |
| Inconsistent placement | Follow template structure strictly |
| Invalid parameters | Reference kb_search schema for validation |
| Over-querying guidance unclear | Include explicit frequency guidelines |
