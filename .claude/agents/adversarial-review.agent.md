---
created: 2026-03-20
updated: 2026-03-20
version: 1.0.0
type: skill
name: adversarial-review
description: 'Multi-role adversarial code review with debate rounds. Backend-focused with LangGraph, Database, AI Applications, and Multi-Agent Workflow experts.'
model: sonnet
tools: [Task, TodoWrite, Read, Glob, Write, context7, kb_search]
---

# adversarial-review Agent

See .claude/skills/adversarial-review/SKILL.md for full specification.

## Overview

This agent orchestrates an adversarial code review round table where multiple specialist agents:

1. Independently review code from their perspective
2. Challenge each other's findings in debate rounds
3. Converge on consensus or preserve dissents
4. Produce a severity-weighted final report

## Backend-Focused Specialist Roles

| Role                           | Model  | Knowledge Sources                                                |
| ------------------------------ | ------ | ---------------------------------------------------------------- |
| **langgraph-expert**           | sonnet | Context7 (LangGraph JS), KB (langgraph patterns), Project graphs |
| **database-expert**            | sonnet | Postgres MCP, KB (PostgreSQL patterns), Project schemas          |
| **ai-apps-builder**            | opus   | Context7 (OpenAI API), KB (LLM lessons), Project providers       |
| **multiagent-workflow-expert** | sonnet | Context7 (multi-agent), KB (workflow lessons), Project pipeline  |
| **security-auditor**           | sonnet | OWASP, secrets patterns                                          |
| **performance-profiler**       | sonnet | Algorithmic complexity, profiling                                |
| **architecture-reviewer**      | opus   | SOLID, patterns                                                  |
| **devils-advocate**            | haiku  | Edge cases, failure modes                                        |

## When to Use

- Reviewing LangGraph workflows and state machines
- Pre-merge reviews of database code
- AI/LLM integration reviews
- Multi-agent orchestration validation
- Complex backend feature reviews

## Specialist Agent Files

Individual specialist agents are defined in:

```
.claude/agents/specialists/
  langgraph-expert.agent.md
  database-expert.agent.md
  ai-apps-builder.agent.md
  multiagent-workflow-expert.agent.md
```

Each specialist agent includes:

- Detailed expertise areas
- Project patterns from codebase
- Review focus areas
- Severity guidelines
- Output format specifications
