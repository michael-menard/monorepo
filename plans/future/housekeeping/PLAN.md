# Epic 0: Housekeeping

## Overview

This epic consolidates technical debt, infrastructure improvements, and testing initiatives that support the overall platform quality and developer productivity.

## Epic Structure

The housekeeping epic is organized into 5 work streams:

| Stream | Stories | Priority | Description |
|--------|---------|----------|-------------|
| Auth E2E Tests | HSKP-1000 to HSKP-1003 | P1 | E2E test coverage for authentication flows |
| API Portability | HSKP-2000 to HSKP-2001 | P0 | Service extraction and local development |
| MCP Infrastructure | HSKP-2002 to HSKP-2004 | P0/P1 | AI-powered developer tools |
| Scaffold Skills | HSKP-2005 to HSKP-2006 | P0 | Code generation automation |
| Wishlist Tech Debt | HSKP-2007 to HSKP-2009 | P1 | Bug fixes, schema consolidation, tests |

---

## Stream 1: Authentication E2E Tests

### Purpose
Comprehensive Playwright test coverage for all authentication flows to catch regressions and ensure auth functionality works correctly.

### Stories

#### HSKP-1000: Auth E2E Test Suite - Validation & Completion
**Status:** Approved | **Priority:** P1 | **Effort:** 3-4 days

Parent story orchestrating auth E2E test implementation:
- Validate existing tests (signup, login, email-verification)
- Implement forgot password tests (HSKP-1001)
- Implement reset password tests (HSKP-1002)
- Add logout tests
- Ensure proper test user cleanup via Cognito admin utilities

**Key Files:**
- `apps/web/playwright/features/auth/*.feature`
- `apps/web/playwright/steps/*.steps.ts`
- `apps/web/playwright/utils/cognito-admin.ts`

#### HSKP-1001: Forgot Password Tests
**Status:** Approved | **Priority:** P1 | **Effort:** 0.5 day

Playwright tests for forgot password flow:
- UI element verification
- Email validation scenarios
- Happy path (successful reset request)
- Navigation tests
- Button state tests

#### HSKP-1002: Reset Password Tests
**Status:** Approved | **Priority:** P1 | **Effort:** 0.5 day

Playwright tests for reset password flow:
- UI element verification
- Verification code validation
- Password strength requirements
- Happy path (successful password reset)
- Error handling (invalid/expired codes)

#### HSKP-1003: Bug - Login Form Not Submitting in E2E Tests
**Status:** Fixed | **Priority:** P1 | **Effort:** Completed

Root cause identified and fixed:
- Selector strategy mismatch (getByRole vs CSS selector)
- Radix Checkbox registration issue with react-hook-form
- Resolution: Updated selectors and used Controller for Checkbox

---

## Stream 2: API Portability

### Purpose
Enable local development without AWS Lambda deployment, improve code organization, and prepare for platform flexibility.

### Stories

#### HSKP-2000: API Service Extraction
**Status:** Draft | **Priority:** P0 | **Effort:** 3-4 days | **Dependencies:** None

Foundation story implementing Hexagonal Architecture (Ports & Adapters):

**New Packages:**
- `@repo/api-services` - Domain layer with business logic
- `@repo/api-handlers` - Application layer with unified Request/Response handlers
- `@repo/lambda-adapter` - Lambda-specific event conversion

**Scope:**
- Extract MOC, Gallery, Wishlist, Parts List services
- Update all 45 Lambda handlers to use new packages
- Create shared utilities (errors, pagination, response formatters)

**Handler Pattern:**
```typescript
// Unified handler using web standards
export async function handleListMocs(
  request: Request,
  ctx: HandlerContext
): Promise<Response>
```

#### HSKP-2001: Express Local Development Server
**Status:** Draft | **Priority:** P0 | **Effort:** 2-3 days | **Dependencies:** HSKP-2000

Local development environment with Docker:

**Components:**
- Docker Compose with PostgreSQL 16
- `apps/api-express` Express server
- Cognito JWT middleware
- Express-to-web Request/Response adapters

**Development Workflow:**
```bash
docker compose -f docker/docker-compose.local.yml up -d
pnpm dev:local  # Starts Express API + Frontend
```

---

## Stream 3: MCP Server Infrastructure

### Purpose
Enable Claude Code to understand the codebase deeply through MCP (Model Context Protocol) servers that expose database schema and serverless configuration.

### Stories

#### HSKP-2002: MCP Server Infrastructure
**Status:** Draft | **Priority:** P0 | **Effort:** 1-2 days | **Dependencies:** None

Foundation for all MCP servers:

**Components:**
- `tools/mcp-servers/shared/` - Common utilities
- Server factory pattern
- Error handling (McpError hierarchy)
- Response caching with file-watching invalidation
- Claude Code integration via `.claude/settings.json`

#### HSKP-2003: Drizzle MCP Server
**Status:** Draft | **Priority:** P0 | **Effort:** 2-3 days | **Dependencies:** HSKP-2002

Database schema exposure for AI context:

**Tools:**
- `list_tables` - All table names with column counts
- `get_table_schema` - Complete column definitions, types, constraints
- `get_relations` - Foreign key relationships and join information
- `get_zod_schema` - Generated Zod schema code for any table

**Target:** Sub-200ms response times with caching.

#### HSKP-2004: Serverless MCP Server
**Status:** Draft | **Priority:** P1 | **Effort:** 2 days | **Dependencies:** HSKP-2002

Serverless.yml configuration exposure:

**Tools:**
- `list_functions` - All Lambda function names with HTTP paths
- `get_function_config` - Complete function configuration
- `get_iam_permissions` - IAM statements for a function

**Features:** Handles `${self:...}`, `${env:...}`, `${file(...)}` variable references.

---

## Stream 4: Scaffold Skills

### Purpose
Natural language code generation for API endpoints and full feature implementations, dramatically accelerating development.

### Stories

#### HSKP-2005: Scaffold Endpoint Skill
**Status:** Draft | **Priority:** P0 | **Effort:** 2-3 days | **Dependencies:** HSKP-2002, HSKP-2003, HSKP-2004

Generate complete Lambda endpoints from natural language:

**Usage:**
```
/scaffold-endpoint "list all wishlist items for current user"
/scaffold-endpoint "bulk delete wishlist items by IDs"
```

**Generates:**
1. Lambda handler with business logic
2. Zod request/response schemas
3. Test file with fixtures
4. serverless.yml entry
5. RTK Query hook

**Workflow:** Parse intent -> Query MCP for context -> Generate code -> Validate -> Present diff for approval

#### HSKP-2006: Scaffold Feature Skill
**Status:** Draft | **Priority:** P0 | **Effort:** 3-4 days | **Dependencies:** HSKP-2002, HSKP-2003, HSKP-2004, HSKP-2005 (parallel)

Generate complete vertical slices from feature descriptions:

**Usage:**
```
/scaffold-feature "wishlist priority sorting with drag-drop reorder"
/scaffold-feature "MOC soft delete with restore capability"
```

**Generates:**
- **API Layer:** Handlers, schemas, serverless.yml entries, tests
- **Frontend Layer:** Components, RTK hooks, routes
- **Shared:** Zod schemas, TypeScript types
- **Database:** Migration files if needed

**Features:** Implementation order guidance, incremental apply option.

---

## Stream 5: Wishlist Technical Debt

### Purpose
Address issues discovered during wish-2000 QA review - runtime crashes, schema duplication, and missing tests.

### Stories

#### HSKP-2007: Fix Redis Dependency in Wishlist Handlers
**Status:** Approved | **Priority:** P1 | **Effort:** 0.5 day

**Problem:** All wishlist handlers import `getRedisClient()` which throws at runtime since Redis was disabled.

**Solution:** Remove or stub Redis cache invalidation calls:
- Option A (Recommended): Remove `invalidateWishlistCaches()` entirely
- Option B: Replace with no-op stub that logs

**Affected Files:** 8 wishlist handlers

#### HSKP-2008: Consolidate Wishlist Schemas to Single Source
**Status:** Approved | **Priority:** P1 | **Effort:** 1 day

**Problem:** Schema duplication between:
- `packages/core/api-client/src/schemas/wishlist.ts`
- `apps/api/endpoints/wishlist/schemas/index.ts`

**Solution:** Consolidate to `@repo/api-client` as canonical source, update all handler imports.

**Schema Alignment Needed:**
| Field | Resolution |
|-------|------------|
| userId | Use z.string() (Cognito sub not always UUID) |
| createdAt/updatedAt | Use z.string().datetime() for JSON |
| store/currency | Add enum schemas |

#### HSKP-2009: Wishlist Handler Integration Tests
**Status:** Approved | **Priority:** P1 | **Effort:** 2-3 days

**Problem:** Zero integration tests for 8 wishlist API handlers, violating 45% coverage requirement.

**Scope:** Create tests for all handlers:
- create-item, list, get-item, update-item, delete-item, reorder, search, upload-image
- Cover happy path, validation errors, authorization
- Use mocked database and auth

---

## Implementation Order

### Phase 1: Foundations (Parallel)
1. **HSKP-2007** - Fix Redis dependency (unblocks wishlist work)
2. **HSKP-2002** - MCP Server Infrastructure (enables AI tools)
3. **HSKP-2000** - API Service Extraction (enables local dev)

### Phase 2: Infrastructure Build-Out
4. **HSKP-2003** - Drizzle MCP Server
5. **HSKP-2004** - Serverless MCP Server
6. **HSKP-2001** - Express Local Development Server

### Phase 3: Developer Productivity
7. **HSKP-2005** - Scaffold Endpoint Skill
8. **HSKP-2006** - Scaffold Feature Skill

### Phase 4: Quality Improvements
9. **HSKP-2008** - Consolidate Wishlist Schemas
10. **HSKP-2009** - Wishlist Handler Integration Tests
11. **HSKP-1000** - Auth E2E Test Suite (includes HSKP-1001, HSKP-1002)

---

## Dependency Graph

```
                    ┌─────────────────────────────────────────────────────┐
                    │                                                     │
HSKP-2000 ─────────►│ HSKP-2001                                          │
(API Services)      │ (Express Local Dev)                                │
                    │                                                     │
                    └─────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────────┐
                    │                                                     │
HSKP-2002 ─────────►│ HSKP-2003 ──────┬──────► HSKP-2005 ──┐             │
(MCP Infra)         │ (Drizzle MCP)   │        (Endpoint)  │             │
                    │                  │                    ├──► Combined │
                    │ HSKP-2004 ──────┘        HSKP-2006 ──┘   Skills    │
                    │ (Serverless MCP)         (Feature)                  │
                    └─────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────────┐
                    │ HSKP-2007 ──► HSKP-2008 ──► HSKP-2009              │
                    │ (Redis Fix)   (Schemas)     (Tests)                 │
                    └─────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────────┐
                    │ HSKP-1000 (Parent)                                  │
                    │   ├── HSKP-1001 (Forgot Password)                   │
                    │   ├── HSKP-1002 (Reset Password)                    │
                    │   └── HSKP-1003 (Bug - Fixed)                       │
                    └─────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Auth E2E Test Coverage | 100% of auth flows | All auth features have passing E2E tests |
| Local Dev Setup Time | < 5 minutes | Time from clone to running dev environment |
| MCP Response Time | < 200ms | Cached query response latency |
| Scaffold Skill Usage | 80% adoption | Developer usage for new endpoints/features |
| Wishlist Test Coverage | >= 45% | vitest --coverage report |
| Runtime Errors | 0 | No Redis-related crashes in wishlist handlers |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API Service Extraction breaks Lambda | Medium | High | Staged migration, comprehensive tests |
| MCP parsing misses edge cases | Medium | Medium | Test with real schema/serverless files |
| Scaffold generates incorrect patterns | Medium | High | Extensive MCP context, diff approval |
| Schema consolidation causes type mismatches | Low | Medium | Thorough type-check verification |

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-24 | 1.0 | Consolidated plan from individual stories | Claude |
