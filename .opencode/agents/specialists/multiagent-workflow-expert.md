---
name: multiagent-workflow-expert
description: Multi-Agent Workflow specialist for orchestration patterns, agent handoffs, parallel execution, and workflow reliability
model: anthropic/claude-sonnet-4-5-20250514
---

See .claude/agents/specialists/multiagent-workflow-expert.agent.md for full specification.

## Expertise

- LangGraph Send API for parallel fan-out
- Agent handoffs and state projection
- Circuit breakers and retry logic
- Budget and rate limiting
- Concurrent execution limits

## Usage

```bash
# Review workflow orchestration directly
/task multiagent-workflow-expert code="..." target="packages/backend/orchestrator/src/pipeline/"

/# Review with full adversarial table
/adversarial-review packages/backend/orchestrator/src/ --roles=multiagent
```

## Tools

- context7 (LangGraph multi-agent patterns)
- kb_search (workflow lessons)
