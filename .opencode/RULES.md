# OpenCode Rules

This file provides project context for OpenCode.

## Project Overview

TypeScript monorepo (pnpm + Turborepo) for a LEGO MOC instructions platform. React 19 frontend with AWS serverless backend.

## Tech Stack

- **pnpm** + **Turborepo** for monorepo management
- **React 19** + **Tailwind CSS** + **shadcn/ui** for frontend
- **AWS Lambda** + **API Gateway** + **Aurora PostgreSQL** for backend

## Key Files

- `CLAUDE.md` - Full project guidelines
- `.claude/MCP-TOOLS.md` - MCP tool documentation
- `docs/AGENTS.md` - Agent hierarchy documentation

## MCP Tools

Configured MCP servers:

- `knowledge-base` - Project knowledge search and write
- `context7` - Library documentation

Use with: `use knowledge-base` or `use context7`

## Skills

Skills are loaded from `.claude/skills/` and `.opencode/skills/`.

Available skills:

- `/wt-new` - Create new worktree
- `/wt-switch` - Switch worktree
- `/wt-list` - List worktrees
- `/wt-status` - Worktree status
- `/wt-finish` - Finish feature (merge PR, cleanup)
- `/lint-fix` - Run ESLint with auto-fix
- `/roadmap` - Show roadmap
- `/next-actions` - Show next actions
- `/review` - Code review
- `/qa-gate` - QA gate decision

## Commands

Custom commands in `.opencode/commands/`:

- `/dev-implement-story` - Implement a story
- `/dev-fix-story` - Fix story issues
- `/pm-story` - PM story management
- `/elab-story` - Elaborate a story
- `/qa-verify-story` - QA verification
- `/dev-code-review` - Code review
- And more...

## Code Standards

- Zod-first types (never use TypeScript interfaces)
- No barrel files (import directly from source)
- Use @repo/ui for components
- Use @repo/logger for logging
- Follow component directory structure in CLAUDE.md
