---
status: uat
priority: P0
replaces: KNOW-011
---

# KNOW-028: Environment Variable Documentation and Validation

## Context

The knowledge base MCP server requires several environment variables for database connections and OpenAI API access. For MVP, we're using local `.env` files rather than a secrets management service (AWS Secrets Manager deferred to post-launch via KNOW-011).

This story establishes best practices for environment variable management:
- Clear documentation of required variables
- Example template for developers
- Fail-fast validation at startup
- Protection against accidental commits

## Goal

Ensure all required environment variables are documented, validated at startup, and protected from accidental git commits.

## Non-goals

- **AWS Secrets Manager integration** - Deferred to KNOW-011 post-launch
- **Secret rotation** - Out of scope for MVP
- **Encryption of .env files** - Local development only
- **CI/CD secrets management** - Handled by deployment platform

## Scope

### Packages Affected

- `apps/api/knowledge-base/` - Add env validation at startup

### Endpoints

None - Configuration only

### Infrastructure

None - Local .env files only

## Acceptance Criteria

### AC1: Environment Variable Documentation

**Given** the knowledge base MCP server requirements
**When** a developer sets up the project
**Then**:
- README.md documents all required environment variables
- Each variable has description, format, and example value
- Required vs optional variables are clearly marked

**Variables to document:**
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings |
| `EMBEDDING_MODEL` | No | Model name (default: text-embedding-3-small) |
| `EMBEDDING_BATCH_SIZE` | No | Batch size (default: 100) |
| `LOG_LEVEL` | No | Logging level (default: info) |

### AC2: .env.example Template

**Given** the documented environment variables
**When** checking out the repository
**Then**:
- `.env.example` file exists at `apps/api/knowledge-base/.env.example`
- Contains all required variables with placeholder values
- Contains all optional variables with default values commented
- Includes instructions for copying to `.env`

**Example format:**
```bash
# Required - copy this file to .env and fill in values
DATABASE_URL=postgresql://user:password@localhost:5432/knowledge_base
OPENAI_API_KEY=sk-your-api-key-here

# Optional - uncomment to override defaults
# EMBEDDING_MODEL=text-embedding-3-small
# EMBEDDING_BATCH_SIZE=100
# LOG_LEVEL=info
```

### AC3: Startup Validation

**Given** the MCP server starting up
**When** required environment variables are missing or invalid
**Then**:
- Server fails fast with clear error message
- Error lists ALL missing/invalid variables (not just first)
- Error message includes link to setup documentation
- Validation uses Zod schema for type safety

**Implementation:**
```typescript
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_BATCH_SIZE: z.coerce.number().positive().default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type Env = z.infer<typeof EnvSchema>
```

### AC4: Git Protection

**Given** `.env` files containing secrets
**When** attempting to commit
**Then**:
- `.gitignore` includes `.env` and `.env.local` patterns
- `.env.example` is tracked (contains no real secrets)
- Pre-commit hook warns if `.env` files are staged (optional)

**Verification:**
- `git check-ignore .env` returns match
- `git check-ignore .env.local` returns match
- `git check-ignore .env.example` returns no match

### AC5: Test Configuration

**Given** the test suite needs environment variables
**When** running tests
**Then**:
- Test setup provides mock/test values automatically
- Tests don't require real `.env` file
- Test environment uses separate database URL pattern
- MSW mocks OpenAI API calls (no real API key needed)

## Reuse Plan

### Existing Patterns
- Zod schema validation (per CLAUDE.md)
- @repo/logger for error reporting

### Test Infrastructure
- Vitest setup from KNOW-001
- MSW mocks from KNOW-002

## Architecture Notes

### Validation Strategy

Environment validation happens once at startup in a dedicated module:

```
apps/api/knowledge-base/
  src/
    config/
      env.ts          # Zod schema and validation
      index.ts        # Export validated config
    index.ts          # Import config before other modules
```

### Error Message Format

```
ERROR: Missing required environment variables

  DATABASE_URL: Required PostgreSQL connection string
  OPENAI_API_KEY: Required OpenAI API key

See: apps/api/knowledge-base/README.md#environment-setup
```

## Test Plan

### Unit Tests
- Zod schema validation with valid inputs
- Zod schema validation with missing required vars
- Zod schema validation with invalid formats
- Default value application for optional vars

### Integration Tests
- Server startup with valid config
- Server startup fails gracefully with missing config
- Test environment uses mock values correctly

## Risks / Edge Cases

### Risk 1: Developer Forgets to Copy .env.example
**Mitigation:** Clear error message at startup with instructions

### Risk 2: .env.example Gets Out of Sync
**Mitigation:** Validation schema is source of truth; update both together

### Risk 3: Accidental Commit of Real Secrets
**Mitigation:** .gitignore protection; git-secrets pre-commit hook (optional enhancement)

## Definition of Done

- [ ] README.md updated with environment variable documentation
- [ ] `.env.example` created with all variables
- [ ] Zod validation schema implemented
- [ ] Startup validation with clear error messages
- [ ] `.gitignore` verified for .env protection
- [ ] Unit tests for validation schema
- [ ] Integration test for startup validation

## Story Points

**2 points** - Small, focused configuration story

---

**Notes:**
- This story replaces KNOW-011 (Secrets Management) for MVP
- KNOW-011 is deferred to post-launch for AWS Secrets Manager integration
- No dependencies on other KNOW stories

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Clarify validate-env.ts vs config/env.ts relationship | Add as AC | Story suggests creating new module but validate-env.ts already implements validation. Decide whether to enhance existing or create new. |
| 2 | Acknowledge existing .env.example | Add as AC | Story should reference existing comprehensive .env.example and specify what enhancements (if any) are needed. |
| 3 | Clarify README.md updates needed | Add as AC | Story asks for documentation but README.md already exists. Specify if updates/enhancements needed. |
| 4 | Specify test setup file location/approach | Add as AC | AC5 mentions test setup providing mock values but doesn't specify HOW. Need Vitest setup file location and implementation approach. |
| 5 | Clarify required vs optional variable handling | Add as AC | Zod schema vs .env.example formatting need alignment. Clarify behavior for optional variables in both. |
| 6 | Specify validation integration point | Add as AC | Architecture Notes show config/env.ts but don't specify where validation is called from (MCP server startup? Package export? Test setup?). |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Auto-generate docs from Zod schema | Add as AC | Generate README.md and .env.example from single source of truth to eliminate maintenance drift. |
| 2 | Pre-commit hook for .env.example completeness | Add as AC | Hook that compares .env.example against Zod schema to ensure all required variables are documented. |
| 3 | Developer onboarding script | Add as AC | Interactive setup script validates .env creation, checks Docker, validates database connection. Improves DX. |
| 4 | Environment variable override hierarchy | Out-of-scope | CLI > .env.local > .env > defaults pattern deferred for post-launch flexibility. |
| 5 | Type-safe config export | Add as AC | Export validated config object (`export const config: Env`) provides autocomplete and compile-time safety throughout codebase. |
| 6 | Health check endpoint | Add as AC | Add /health endpoint that validates all environment variables and database accessibility. Useful for deployment verification. |
| 7 | Configuration schema versioning | Add as AC | Track schema version in .env file for migrations and compatibility validation across branches. |
| 8 | Sensitive value detection (git-secrets) | Out-of-scope | Pre-commit hook using detect-secrets deferred post-launch. Story relies on .gitignore for MVP. |

### Follow-up Stories Suggested

- [ ] KNOW-028a: Implement auto-generated environment documentation from Zod schema
- [ ] KNOW-028b: Add pre-commit hook for .env.example validation
- [ ] KNOW-028c: Build developer onboarding setup script
- [ ] KNOW-011: AWS Secrets Manager integration (post-launch)

### Items Marked Out-of-Scope

- **Environment variable override hierarchy**: Deferred for post-launch flexibility. Current story focuses on MVP .env approach.
- **Sensitive value detection (git-secrets)**: Deferred post-launch. Story relies on .gitignore protection for MVP.
