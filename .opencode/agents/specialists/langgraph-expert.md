---
name: langgraph-expert
description: LangGraph specialist for state management, node patterns, graph composition, and checkpointing review
model: anthropic/claude-sonnet-4-5-20250514
---

See .claude/agents/specialists/langgraph-expert.agent.md for full specification.

## Expertise

- State annotation (Annotation.Root)
- Graph construction (StateGraph, START, END)
- Node patterns (createToolNode, injectable adapters)
- Checkpointing and memory
- Error handling (top-level catch, warnings)

## Usage

```bash
# Review LangGraph code directly
/task langgraph-expert code="..." target="packages/backend/orchestrator/src/graphs/"

/review with full adversarial table
/adversarial-review packages/langgraph/ --roles=langgraph,database,ai-apps
```

## Tools

- context7 (LangGraph JS docs)
- kb_search (project patterns)
