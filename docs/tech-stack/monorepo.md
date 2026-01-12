# Monorepo Tooling

## Overview

This document describes how the monorepo is structured and how we use pnpm and Turborepo.

## Goals

- Fast feedback loops (build, test, lint)
- Clear boundaries between apps and packages
- Simple developer ergonomics for common tasks

## Structure

- `apps/` — user-facing applications (APIs, web apps)
- `packages/` — shared libraries (UI, core utilities, backend helpers)

## pnpm

- Workspace management for all apps and packages
- Shared lockfile at the repo root
- Use `workspace:*` for internal dependencies

### Common Commands

- `pnpm install` — install dependencies
- `pnpm dev` — start the full dev environment
- `pnpm build` — build all apps and packages

## Turborepo

- Task orchestration across apps and packages
- Caching and parallelization for builds, tests, and lint

### Pipelines

- `build` — builds all affected projects
- `lint` — runs linting on affected projects
- `test` — runs tests on affected projects

## Best Practices

- Prefer running tasks via `pnpm` scripts at the root
- Keep tasks declarative in `turbo.json`
- Avoid per-package duplication of common scripts where possible
