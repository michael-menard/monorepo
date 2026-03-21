---
name: ai-apps-builder
description: AI Applications expert for LLM integration, prompt engineering, function calling, and OpenAI API best practices (Opus-tier reasoning)
model: anthropic/claude-opus-4-5-20250514
---

See .claude/agents/specialists/ai-apps-builder.agent.md for full specification.

## Expertise

- OpenAI API and function calling
- Prompt engineering and injection prevention
- Model routing and budget management
- Token bucketing and rate limiting
- Streaming and context window management

## Usage

```bash
# Review AI integration code directly
/task ai-apps-builder code="..." target="packages/backend/orchestrator/src/providers/"

/# Review with full adversarial table
/adversarial-review packages/backend/orchestrator/src/ --roles=ai-apps
```

## Tools

- context7 (OpenAI Node.js, OpenAI API docs)
- kb_search (LLM integration patterns)
