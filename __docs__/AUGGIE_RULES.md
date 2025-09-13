# Auggie Coding Rules

This file consolidates all coding rules and standards for Auggie to follow when working on this monorepo.

## Core Principles

Follow all rules defined in:
- `.cursor/rules/global` - Core project standards
- `.clinerules/cline_rules.md` - Rule structure guidelines
- `.cursor/rules/no-touch-areas.mdc` - Protected file patterns

## Project Structure & Architecture

**Monorepo Organization:**
- This is a pnpm workspace monorepo
- Apps in `apps/` directory, packages in `packages/` directory
- Each app/package is self-contained with its own package.json
- Use path aliases for imports, prefer shared packages over duplicates

**Component Architecture:**
- Use canonical components from `packages/**` before creating new ones
- Extend existing components rather than forking/duplicating
- Components in their own directories as index files with related CSS/utils/tests

## Code Standards

**TypeScript & React:**
- Use TypeScript for all new code
- Functional components with hooks only
- Follow React best practices and modern patterns
- Use PascalCase for component files, camelCase for utilities

**Styling:**
- Use Tailwind CSS for all styling
- Prefer default Tailwind classes over arbitrary values
- Keep styling consistent with existing patterns

**Testing:**
- Follow build-first approach - ensure builds pass before feature work
- Write tests for all new functionality
- Use existing test patterns and utilities
- Reference `.cursor/rules/testing-policy.mdc` for detailed testing requirements

## File Handling Rules

**Protected Areas (DO NOT EDIT unless explicitly requested):**
- `**/dist/**`, `**/build/**`, `**/.next/**`, `**/dev-dist/**`
- `**/node_modules/**`
- Lock files: `**/*.lock`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`
- Docker files: `**/Dockerfile`, `**/docker-compose*.yml`
- Test outputs: `**/playwright-report/**`, `**/test-results/**`
- Documentation files outside `.taskmaster/**` and `.cursor/**`
- any env files `**/*.env*`

**If editing protected files is requested:**
- Provide one-line justification and ask for confirmation

## Import & Dependency Management

**Import Patterns:**
- Use configured path aliases (check tsconfig.json)
- Prefer shared packages over app-local duplicates
- Update existing modules instead of creating parallel versions
- Use proper import organization (external, internal, relative)

**Dependencies:**
- Use appropriate package managers (pnpm for this project)
- Don't manually edit package.json - use `pnpm add/remove`
- Respect workspace dependencies and peer dependencies

## Git & Commits

**Commit Standards:**
- Follow conventional commit format
- Use semantic commit messages
- Reference related issues/tasks when applicable
- Keep commits focused and atomic

## Development Workflow

**Build-First Policy:**
- Ensure all builds pass before implementing features
- Run type checking and linting
- Verify tests pass in affected areas
- Use turbo for efficient monorepo operations

**Task Integration:**
- When working with Taskmaster tasks, include task context
- Update task progress as work progresses
- Reference task requirements in implementation

## Code Quality

**Error Handling:**
- Implement proper error boundaries in React
- Use consistent error handling patterns
- Provide meaningful error messages
- Handle edge cases appropriately

**Performance:**
- Follow React performance best practices
- Use proper memoization when needed
- Optimize bundle sizes and loading patterns
- Consider accessibility in all implementations

## Self-Improvement

**Rule Evolution:**
- Identify new patterns that should be standardized
- Look for repeated implementations that could be abstracted
- Monitor for common error patterns that could be prevented
- Update rules when new tools or practices are adopted

## References

For detailed rules on specific topics, see:
- `.cursor/rules/cursor.architecture.md` - Architecture patterns
- `.cursor/rules/cursor.ui.mdc` - UI/UX guidelines  
- `.cursor/rules/cursor.testing.mdc` - Testing standards
- `.cursor/rules/cursor.ci.md` - CI/CD requirements
- `.clinerules/dev_workflow.md` - Development workflow
- `.clinerules/taskmaster.md` - Task management integration

## Usage with Auggie

Reference this file when starting Auggie sessions:
```bash
auggie --rules AUGGIE_RULES.md "Your task description"
```

Or combine with specific rule files:
```bash
auggie --rules AUGGIE_RULES.md --rules .cursor/rules/cursor.testing.mdc "Implement tests for new feature"
```
