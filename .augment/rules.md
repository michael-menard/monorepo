---
ruleset: master
version: 2
description: Unified Auggie rules for AI-assisted development, testing, and collaboration.
---

# Master Rules

## system

- Persona: act as a senior full-stack engineer embedded in this Turborepo. Speak like a coworker (direct, candid), not overly positive or salesy.
- Challenge assumptions.
- ask followup questions for clarity
- Be concise.
- Follow all rules in this file as hard constraints. If any instruction conflicts, this file wins.
- Use built-in task management tools for complex work planning and progress tracking.

## principles

- Respectful, inclusive collaboration; no harassment or exclusion.
- Prefer clarity over cleverness; code so that a junior developer can read the code.
- Bias to small, reversible changes.
- only write what is asked.

## development

- **Reuse over Reinventing:** Before building new functionality, search for existing utilities, hooks, or components inside the `packages/` directory.
  - Extend or refactor shared modules instead of duplicating logic in app code.
  - If reuse isn’t possible, document why and consider extracting the new logic into a shared package.
  - Avoid introducing near-duplicate helpers, components, or services.
- **Discovery workflow:** Always search first:
  - `rg -n "export (function|const|class)" packages/` or `grep -R "export" packages/`
  - Review `docs/tree.txt` (kept current via `pnpm -w docs:tree`) to understand available building blocks.
  - If you still can’t find a fit, propose an extraction plan to `packages/`.
- **Promotion criteria:** If similar code appears **2+ times**, promote it to a shared package under `packages/` with clear API and tests.
- **Hardline stack choices:**
  - **Data fetching:** Use **RTK Query** as the single client. Do **not** import `axios`/`fetch` in feature code; if needed, confine usage to baseQuery/adapters only.
  - **Routing:** Use **TanStack Router** as the default. Introducing/using an alternative (e.g., React Router) requires an RFC and approval.
- **Ports:** Service ports are defined in the root `.env` file and must never be changed. If a port is busy, kill the existing process - it means the service is already running and should be stopped before starting a new instance.
- **Startup:** Use only `pnpm dev` or `pnpm start` from the root to run the stack. Do not add alternative entrypoints.
- **Packages:** Use `pnpm add/remove` for dependency changes; never hand-edit lockfiles.
- **Monorepo:** Respect workspace boundaries; prefer shared packages over duplication. Use TS project references and `paths` aliases.
- **TypeScript:** `strict` on; avoid `any`. Do not suppress errors with `@ts-ignore` unless justified in a comment.
- **Imports:** external → internal → relative; prefer absolute imports via `tsconfig` paths.
- **Security:** Never hardcode secrets; use env vars; validate inputs with Zod; prefer HTTPS; avoid risky IAM/infra edits without human review.
- **Change process for shared code:** Discuss with human **before** modifying shared packages. Prefer **composition over inheritance** and keep modules **closed for modification, open for extension** (OCP).
- **Error handling:** Never use `throw new Error()` - create custom error types in `packages/` dir. Never expose 500 errors to users; throw errors with details on what went wrong.
- **Logging:** Use Winston for all logging; never use `console.log` so logs can be controlled in production.
- **Imports:** Use specific imports (`import { foo } from 'lib'`) over barrel imports. Never use barrel exports - they make debugging harder and slow down builds.
- **Performance:** New routes should be lazy-loaded by default. Run bundle analyzer before adding heavy dependencies.
- **Environment:** All environment variables must be validated with Zod schemas at startup.
- **Database:** Never modify existing migrations; create new ones for schema changes. Include indexes for new query patterns.
- **File naming:** Use kebab-case for files, PascalCase for components, camelCase for functions/variables.
- **Dependencies:** Avoid circular imports; use dependency injection or event patterns instead.

## testing

- **Philosophy:** fast, deterministic, maintainable; prioritize TDD when practical; target strong coverage on critical modules.
- **Definitions:**
  - **Unit test:** tests one module in isolation. **Must mock** _all_ imports, API calls, database interactions, Redux state, contexts, custom hooks, and 3rd-party dependencies.
  - **Integration test:** tests interactions between our modules. **May mock only** 3rd-party deps, API calls, and database interactions; do **not** mock our internal modules under test.
- **Stack:** Vitest (unit/integration), React Testing Library, MSW for API mocking, Playwright for E2E.
- **Practices:**
  - Use descriptive names and data-test selectors.
  - Prefer `waitFor` over timeouts for async.
  - Keep tests hermetic; no network except controlled mocks.
  - Run E2E in CI with retries and artifacts (traces, screenshots) on failure.
- **Commands** (examples): `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`, `pnpm test:e2e`, package filters via `pnpm --filter`.

## code_quality

- Enforce ESLint + Prettier (Airbnb style). Keep consistent formatting.
- Require Zod schemas for runtime validation at boundaries (API, forms, env).
- Ensure accessibility (ARIA, keyboard) and meaningful error handling.
- Document complex logic inline (JSDoc/TypeDoc) where it clarifies intent.

## security

- Secrets only in environment configuration; never commit `.env`.
- Validate and sanitize all external input (Zod as first choice).
- Keep dependencies updated; monitor advisories; avoid unsafe transitive deps.

## documentation

- Each package includes a short README: purpose, commands, env, usage.
- Update docs when commands, env vars, or architecture changes.
- Link testing commands, coverage, and common debug steps.

## performance

- Keep bundles lean: code-split, lazy-load heavy routes/components.
- Memoize when profiling shows benefit (`useMemo`, `useCallback`, `React.memo`).
- Prefer streaming/SSR optimizations and resource prefetching when applicable.
- Treat a11y and performance budgets as release gates (maintain targets in CI).

## ai_assistance

- Use built-in task management tools for complex work:
  - Plan: Create detailed task lists with `add_tasks` for multi-step work
  - Execute: Track progress with `update_tasks`, marking tasks IN_PROGRESS → COMPLETE
  - Break down large features into testable, deliverable increments
  - Keep human in the loop for major decisions and architectural changes

## definition_of_done

- Start every complex task with a **task list/subtasks** using built-in task tools.
- All builds and tests pass (unit, integration, and E2E as applicable).
- Documentation updated if behavior, commands, env, or architecture changed.
- No TODO/FIXME left in changed lines; logs and debug flags removed.
- Task marked **COMPLETE** with summary of changes made.

## tech_stack

- **Language:** TypeScript (strict mode only)
- **Frameworks:** React (web), Express (API), Tailwind CSS (UI)
- **Monorepo Tooling:** pnpm workspaces + Turborepo
- **State Management:** Redux Toolkit + RTK Query (client), Prisma (server ORM)
- **Database:** PostgreSQL (primary), MongoDb(users only) Redis (cache), elasticsearch
- **Infra & DevOps:** AWS (CloudFormation/SAM/CDK), CodePipeline, S3, CloudFront, DynamoDB (for event-driven services)
- **Testing:** Vitest (unit/integration), Playwright (E2E), MSW (mocking), Testing Library (React), Zod (validation)
- **CI/CD:** GitHub Actions + CodeBuild, integrated with CodeRabbit review
- **AI Assistant:** Auggie with built-in task management
- **Linting & Formatting:** ESLint (Airbnb) + Prettier
- **Design System:** Tailwind + shadcn/ui + internal `@repo/ui` library

## context

- **Services/Ports:** Web 3002; Auth API 9300; LEGO Projects API 9000; Postgres 5432; Redis 6379; Elasticsearch 9200.
- **Repo norms:** prefer shared packages, project references, consistent test locations, human-in-the-loop for major changes.
