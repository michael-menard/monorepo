# Scope - KNOW-040

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | No API or service changes |
| frontend | false | No UI changes |
| infra | false | No infrastructure changes |

## Scope Summary

This is a documentation-only story. It modifies 5 agent instruction files (`.md` files in `.claude/agents/`) to add Knowledge Base integration sections, and creates a new integration guide at `.claude/KB-AGENT-INTEGRATION.md`. No code changes are required - agent instruction files are read at runtime.

## Files to Modify

1. `.claude/agents/dev-implement-implementation-leader.agent.md`
2. `.claude/agents/dev-setup-leader.agent.md`
3. `.claude/agents/qa-verify-verification-leader.agent.md`
4. `.claude/agents/elab-analyst.agent.md`
5. `.claude/agents/dev-implement-learnings.agent.md`

## Files to Create

1. `.claude/KB-AGENT-INTEGRATION.md` - Integration guide with template and best practices
