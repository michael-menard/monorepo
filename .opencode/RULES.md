# OpenCode Rules

This file provides project context for OpenCode.

## Project Overview

TypeScript monorepo (pnpm + Turborepo) for a LEGO MOC instructions platform. React 19 frontend with Bun + Hono backend.

## Tech Stack

- **pnpm** + **Turborepo** for monorepo management
- **React 19** + **Tailwind CSS** + **shadcn/ui** for frontend
- **Bun** + **Hono** for backend API
- **PostgreSQL** + **Drizzle ORM** for database
- **MinIO** for object storage
- **AWS Cognito** for auth

## Key Files

- `CLAUDE.md` - Full project guidelines (code standards, architecture, testing)
- `PRODUCT.md` - Domain context
- `DESIGN.md` - Design and UX guidance

## MCP Tools

Configured MCP servers:

- `knowledge-base` - Project knowledge search and write
- `context7` - Library documentation

## Code Standards

- Zod-first types (never use TypeScript interfaces)
- No barrel files (import directly from source)
- Use `@repo/ui` for components
- Use `@repo/logger` for logging
- Follow component directory structure in CLAUDE.md
- Hexagonal architecture (Ports & Adapters) for backend
- All code changes require tests
