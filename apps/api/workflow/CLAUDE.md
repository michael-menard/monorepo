# apps/api/workflow

## Status: Being Rearchitected

This system (LangGraph-based story execution pipeline) is being rearchitected from scratch. The existing code represents the old approach and is not the target state.

**Do not:**

- Build new features on the existing patterns
- Assume the story state model or agent orchestration is current
- Invest time fixing issues in this codebase without asking the user first

**The KB MCP server (`apps/api/knowledge-base/`) is still active and in use** — only the workflow orchestration layer is being rearchitected.

If you need to work here, ask the user for direction first.
