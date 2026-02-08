-- Knowledge Base Seed Data
-- This file runs automatically on first database creation
-- Idempotent: uses ON CONFLICT DO NOTHING

-- Helper function to generate placeholder embedding (1536 zeros)
-- Real embeddings will be generated when the embedding client is used

-- Seed knowledge entries
INSERT INTO knowledge_entries (content, embedding, role, tags)
VALUES
(
    E'# Story Workflow Overview\n\nThe development workflow follows these phases:\n1. **Elaboration**: PM creates stories with acceptance criteria\n2. **Planning**: Architect creates implementation plan\n3. **Implementation**: Developers implement the story\n4. **Verification**: QA verifies against acceptance criteria\n5. **Completion**: Story is marked complete and merged\n\nEach phase has specific entry and exit criteria documented in FEATURE-DEVELOPMENT-WORKFLOW.md.',
    (SELECT array_agg(0)::vector FROM generate_series(1, 1536)),
    'all',
    ARRAY['workflow', 'process', 'overview']
),
(
    E'# Creating a New Story\n\nTo create a new story:\n\n1. Use the /pm-story command with the ''create'' action\n2. Provide a descriptive title and context\n3. Define clear acceptance criteria\n4. Specify dependencies (if any)\n5. Assign priority (P0-P3)\n\nExample:\n```\n/pm-story create --title "Add user authentication" --priority P1\n```\n\nStories should be small enough to complete in 1-2 days.',
    (SELECT array_agg(0)::vector FROM generate_series(1, 1536)),
    'pm',
    ARRAY['story', 'creation', 'pm-workflow']
),
(
    E'# Implementing Backend Code\n\nWhen implementing backend code:\n\n1. **Follow existing patterns** - Check apps/api/ for similar implementations\n2. **Use Drizzle ORM** - All database operations use Drizzle\n3. **Validate with Zod** - All inputs must be validated with Zod schemas\n4. **Write tests first** - Use Vitest for unit tests\n5. **Handle errors** - Return meaningful error messages\n\nKey files:\n- Schema: apps/api/core/database/schema/\n- Handlers: apps/api/core/functions/\n- Types: packages/shared/*/\n\nAlways run `pnpm check-types` after changes.',
    (SELECT array_agg(0)::vector FROM generate_series(1, 1536)),
    'dev',
    ARRAY['backend', 'implementation', 'best-practice']
),
(
    E'# Testing Requirements\n\nAll code changes must include tests:\n\n1. **Unit tests** - Test individual functions in isolation\n2. **Integration tests** - Test database operations\n3. **E2E tests** - Test user flows (for frontend changes)\n\nMinimum coverage: 45% global\n\nTest commands:\n- `pnpm test` - Run all tests\n- `pnpm test:coverage` - Run with coverage report\n- `pnpm test:watch` - Watch mode for development\n\nUse semantic queries in React tests: getByRole, getByLabelText.',
    (SELECT array_agg(0)::vector FROM generate_series(1, 1536)),
    'qa',
    ARRAY['testing', 'coverage', 'quality']
),
(
    E'# Using the Logger\n\nNever use console.log in production code. Always use the logger:\n\n```typescript\nimport { logger } from ''@repo/logger''\n\n// Different log levels\nlogger.info(''Operation completed'', { userId, action })\nlogger.warn(''Deprecated feature used'', { feature })\nlogger.error(''Operation failed'', { error, context })\nlogger.debug(''Debug info'', { data })\n```\n\nThe logger is configured for:\n- Structured JSON output in production\n- Pretty printing in development\n- Automatic context enrichment',
    (SELECT array_agg(0)::vector FROM generate_series(1, 1536)),
    'dev',
    ARRAY['logging', 'best-practice', 'debugging']
)
ON CONFLICT DO NOTHING;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Knowledge base seeded with % entries', (SELECT COUNT(*) FROM knowledge_entries);
END $$;
