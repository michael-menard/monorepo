---
name: adversarial-review
description: Multi-role adversarial code review with debate rounds. Backend-focused with LangGraph, Database, AI Apps, and Multi-Agent Workflow experts.
model: anthropic/claude-sonnet-4-5-20250514
---

# /adversarial-review

See .claude/skills/adversarial-review/SKILL.md for full specification.

Backend-focused adversarial code review with multi-role specialists and 3 debate rounds. Arbiter makes binding rulings on contested findings - no forced consensus.

## Specialist Roles

| Role                           | Model  | Focus                                       |
| ------------------------------ | ------ | ------------------------------------------- |
| **langgraph-expert**           | sonnet | State management, nodes, checkpointing      |
| **database-expert**            | sonnet | Queries, schemas, indexes, integrity        |
| **ai-apps-builder**            | opus   | LLM integration, prompts, function calling  |
| **multiagent-workflow-expert** | sonnet | Orchestration, handoffs, parallel execution |
| **security-auditor**           | sonnet | Auth, injection, secrets                    |
| **performance-profiler**       | sonnet | Complexity, N+1, memory                     |
| **architecture-reviewer**      | opus   | SOLID, coupling, patterns                   |
| **devils-advocate**            | haiku  | Edge cases, assumptions                     |

## Quick Usage

```bash
# Review LangGraph workflow directory
/adversarial-review packages/backend/orchestrator/src/graphs/

# Review with glob pattern
/adversarial-review "packages/**/*graph*.ts"

# Quick scan (4 roles, 1 debate round)
/adversarial-review src/auth.ts --quick

# Deep analysis (all roles, 3 debate rounds)
/adversarial-review packages/langgraph/ --deep

# Custom roles only
/adversarial-review src/api.ts --roles=langgraph,database,ai-apps
```

## Options

- `--quick` - 4 roles (LG, DB, SEC, DAVE), 1 debate round
- `--deep` - 8 roles (all), 3 debate rounds
- `--roles=langgraph,database,ai-apps,multiagent` - Custom roles

## Knowledge Empowerment

Each specialist loads context from:

- **Context7**: Library docs (LangGraph, OpenAI, multi-agent patterns)
- **KB**: Project-specific patterns and lessons
- **Project Code**: Existing patterns in codebase

See individual agent files in `.claude/agents/specialists/` for detailed role specifications.
