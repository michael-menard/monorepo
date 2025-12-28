# AI-Empowered Developer Automation PRD

## 1. Goals and Background Context

### Goals

- Reduce time-to-implementation for common development tasks by 10x through AI orchestration
- Ensure consistency across codebase by encoding patterns into skills and MCP context
- Enable natural language development workflows: "Add bulk delete to wishlist" → working code
- Build composable automation layers: MCP (context) → Skills (orchestration) → Agents (complex tasks)
- Maintain human oversight: AI proposes, developer reviews and approves

### Background Context

- Current state: Turbo generators exist for scaffolding (`gen:lambda`, `gen:component`, etc.) but require manual customization, wiring, and cross-file updates
- Drizzle-to-Zod codegen already implemented via `drizzle-zod` in `packages/backend/db`
- BMAD workflow skills (`/implement`, `/qa-gate`, `/review`) demonstrate skill-based automation
- Gap: No AI-aware context layer (MCP), no intelligent orchestration of generators, no cross-cutting automation

### Vision

```
Developer Intent          AI Automation Stack              Output
─────────────────────    ───────────────────────────      ─────────────────
                         ┌─────────────────────────┐
"Add priority field      │  MCP Servers            │      • Drizzle migration
 to wishlist with        │  (Schema, Config, API)  │      • Zod schema update
 sort capability"        ├─────────────────────────┤      • RTK Query update
        │                │  Skills                 │      • Lambda handler
        └───────────────►│  (/scaffold-endpoint)   │      • UI component
                         ├─────────────────────────┤      • Tests with fixtures
                         │  Agents                 │      • serverless.yml entry
                         │  (implement, refactor)  │      • OpenAPI spec update
                         └─────────────────────────┘
```

### Change Log

| Date       | Version | Description                                         | Author       |
| ---------- | ------- | --------------------------------------------------- | ------------ |
| 2025-12-27 | 0.1     | Initial PRD draft                                   | Claude/Human |

## 2. Requirements

### Functional Requirements (FR)

#### MCP Servers

- FR1: Drizzle MCP server exposes `list_tables`, `get_table_schema`, `get_relations`, `get_zod_schema` tools
- FR2: Serverless MCP server exposes `list_functions`, `get_function_config`, `add_function`, `get_iam_permissions` tools
- FR3: Turbo MCP server exposes `list_generators`, `get_generator_templates`, `run_generator` tools
- FR4: Story MCP server exposes `list_stories`, `get_story`, `get_acceptance_criteria`, `update_story_status` tools
- FR5: All MCP servers provide read access; write operations require explicit confirmation
- FR6: MCP servers cache results for performance; invalidate on file changes

#### Skills

- FR7: `/scaffold-endpoint` generates complete Lambda handler from natural language description
- FR8: `/scaffold-feature` generates full vertical slice (API + UI + tests) for a feature
- FR9: `/add-field` adds a field across Drizzle schema, Zod types, API, and UI atomically
- FR10: `/add-endpoint` adds single endpoint with handler, tests, serverless.yml entry, and RTK Query hook
- FR11: `/sync-types` ensures frontend types match backend schemas, reports drift
- FR12: `/gen-fixtures` generates valid test fixtures from Zod schemas using `@anatine/zod-mock`
- FR13: Skills invoke existing Turbo generators when applicable, customize output for context
- FR14: Skills validate generated code compiles and tests pass before presenting to user

#### Agents

- FR15: Enhanced `/implement` spawns specialized sub-agents (API, UI, Test, QA) in parallel
- FR16: `/refactor` agent handles cross-cutting changes with analysis → migration → validation phases
- FR17: `/migrate-schema` agent handles database migrations with data migration scripts
- FR18: Sub-agents share context via structured handoff, not re-reading files
- FR19: Agents checkpoint progress; can resume after interruption

#### Integration

- FR20: Skills can query MCP servers for real-time project state
- FR21: Skills can invoke other skills (composition)
- FR22: Generated code follows all CLAUDE.md conventions (Zod-first, no barrel files, @repo/ui, etc.)
- FR23: All automation respects .gitignore patterns and project structure

### Non-Functional Requirements (NFR)

- NFR1: MCP server responses < 500ms for schema queries
- NFR2: Skill execution provides progress updates for operations > 5 seconds
- NFR3: Generated code must pass `pnpm check-types` and `pnpm lint` before presentation
- NFR4: All MCP tools include descriptive help text for Claude context
- NFR5: Skills are documented with examples in SKILL.md format
- NFR6: Error messages from skills are actionable ("Field 'priority' already exists in wishlistItems")
- NFR7: MCP servers handle malformed schemas gracefully; report issues, don't crash
- NFR8: Skills support `--dry-run` flag to preview changes without writing
- NFR9: Automation maintains test coverage ≥45% for generated code
- NFR10: All generated code includes appropriate comments explaining AI generation

## 3. User Interface Design Goals

### Interaction Paradigms

- **Natural Language First**: Developer describes intent, AI determines implementation
- **Confirmation Gates**: AI proposes, shows diff, developer approves
- **Progressive Disclosure**: Simple commands for common cases, flags for customization
- **Composable Commands**: Skills can be chained or run in parallel

### Command Examples

```bash
# Simple scaffolding
/scaffold-endpoint "bulk delete wishlist items"
/add-field wishlistItems priority integer "sort order for display"

# Feature development
/scaffold-feature "wishlist priority sorting with drag-drop reorder"

# Cross-cutting changes
/add-field --all-tables "deletedAt timestamp for soft deletes"

# Analysis
/impact "adding user preferences table"
/sync-types --check  # Report drift without fixing
```

### Output Format

```
┌─ /scaffold-endpoint "bulk delete wishlist items" ──────────────────────┐
│                                                                         │
│  Analyzing request...                                                   │
│  ✓ Found wishlistItems table (12 columns)                              │
│  ✓ Identified existing CRUD pattern from list/get endpoints            │
│  ✓ Detected authentication pattern (getUserIdFromEvent)                │
│                                                                         │
│  Proposed changes:                                                      │
│                                                                         │
│  CREATE  endpoints/wishlist/bulk-delete/handler.ts                     │
│  CREATE  endpoints/wishlist/bulk-delete/__tests__/handler.test.ts      │
│  MODIFY  apps/api/serverless.yml (+8 lines)                            │
│  MODIFY  packages/core/api-client/src/rtk/wishlist-api.ts (+15 lines)  │
│  MODIFY  packages/backend/db/src/generated-schemas.ts (+5 lines)       │
│                                                                         │
│  [View Diff] [Apply Changes] [Modify Request] [Cancel]                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4. Technical Architecture

### MCP Server Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Claude Code                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  MCP Client                                                      │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │   │
│  │  │ drizzle-mcp  │ │ sls-mcp      │ │ turbo-mcp    │             │   │
│  │  │              │ │              │ │              │             │   │
│  │  │ • Tables     │ │ • Functions  │ │ • Generators │             │   │
│  │  │ • Schemas    │ │ • Config     │ │ • Templates  │             │   │
│  │  │ • Relations  │ │ • IAM        │ │ • Run        │             │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  File System                                                     │   │
│  │  packages/backend/db/src/schema.ts                              │   │
│  │  apps/api/serverless.yml                                        │   │
│  │  turbo/generators/                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Skill Architecture

```typescript
// .claude/skills/scaffold-endpoint/SKILL.md structure
// 1. Parse natural language intent
// 2. Query MCP for context (schemas, existing patterns)
// 3. Decide: use generator or custom generation
// 4. Generate code following project patterns
// 5. Validate (types, lint, tests)
// 6. Present diff for approval
// 7. Apply changes atomically
```

### MCP Server Implementation

```typescript
// tools/mcp-servers/drizzle-mcp/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new Server({
  name: 'drizzle-mcp',
  version: '1.0.0',
}, {
  capabilities: { tools: {} }
})

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_tables',
      description: 'List all Drizzle table definitions',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_table_schema',
      description: 'Get column definitions, types, and constraints for a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' }
        },
        required: ['table']
      }
    },
    // ... more tools
  ]
}))
```

### Directory Structure

```
tools/
  mcp-servers/
    drizzle-mcp/
      src/
        index.ts           # Server entry
        tools/
          list-tables.ts
          get-schema.ts
          get-relations.ts
        utils/
          schema-parser.ts
      package.json
      tsconfig.json
    serverless-mcp/
      src/
        index.ts
        tools/
          list-functions.ts
          add-function.ts
      package.json
    turbo-mcp/
      ...

.claude/
  skills/
    scaffold/
      endpoint/
        SKILL.md           # Skill definition
        examples.md        # Usage examples
      feature/
        SKILL.md
      component/
        SKILL.md
    modify/
      add-field/
        SKILL.md
      add-endpoint/
        SKILL.md
    analyze/
      impact/
        SKILL.md
      sync-types/
        SKILL.md
```

## 5. Epic List

| Epic | Name | Description | Priority |
|------|------|-------------|----------|
| 1 | MCP Foundation | Core MCP servers for schema, serverless, and turbo context | P0 |
| 2 | Scaffold Skills | Skills for generating endpoints, features, and components | P0 |
| 3 | Modify Skills | Skills for cross-cutting field additions and type sync | P1 |
| 4 | Agent Enhancement | Enhanced /implement with sub-agents and checkpointing | P1 |
| 5 | Analysis Skills | Impact analysis and drift detection | P2 |
| 6 | Advanced Automation | Schema migration agents, refactoring agents | P2 |

## 6. Epic 1: MCP Foundation

### Story 1.1: Drizzle MCP Server

**Description**: Create MCP server that exposes Drizzle schema information to Claude

**Acceptance Criteria**:
- [ ] `list_tables` returns all table names with brief description
- [ ] `get_table_schema` returns columns, types, constraints, defaults
- [ ] `get_relations` returns foreign keys and join relationships
- [ ] `get_zod_schema` returns generated Zod schema for a table
- [ ] Handles missing/malformed schema files gracefully
- [ ] Response time < 200ms for cached queries
- [ ] Configured in `.claude/settings.json` for project

**Technical Notes**:
- Parse `packages/backend/db/src/schema.ts` using ts-morph or regex
- Cache parsed schema; invalidate on file change (fs.watch)
- Return structured JSON matching MCP tool response format

### Story 1.2: Serverless MCP Server

**Description**: Create MCP server that exposes serverless.yml configuration

**Acceptance Criteria**:
- [ ] `list_functions` returns all Lambda function names and paths
- [ ] `get_function_config` returns handler, events, environment for a function
- [ ] `get_iam_permissions` returns IAM statements for a function
- [ ] `add_function` generates YAML snippet for new function (preview only)
- [ ] Parses serverless.yml correctly including variable references

**Technical Notes**:
- Use `js-yaml` for parsing
- Handle `${self:...}` and `${env:...}` variable syntax
- Return resolved values where possible

### Story 1.3: Turbo Generator MCP Server

**Description**: Create MCP server that exposes Turbo generator capabilities

**Acceptance Criteria**:
- [ ] `list_generators` returns available generators with descriptions
- [ ] `get_generator_config` returns prompts and options for a generator
- [ ] `get_template_files` returns template file list for a generator
- [ ] `run_generator` executes generator with provided answers (with confirmation)

**Technical Notes**:
- Parse `turbo/generators/config.js`
- List templates from `turbo/generators/templates/`

### Story 1.4: MCP Integration Testing

**Description**: Ensure MCP servers work correctly with Claude Code

**Acceptance Criteria**:
- [ ] All servers start without errors
- [ ] Claude can query each tool successfully
- [ ] Errors are reported clearly (not silent failures)
- [ ] Documentation for adding servers to `.claude/settings.json`

## 7. Epic 2: Scaffold Skills

### Story 2.1: /scaffold-endpoint Skill

**Description**: Create skill that generates complete Lambda endpoint from description

**Acceptance Criteria**:
- [ ] Parses natural language to identify: HTTP method, resource, operation
- [ ] Queries Drizzle MCP for relevant table schema
- [ ] Generates handler following existing endpoint patterns
- [ ] Generates Zod request/response schemas
- [ ] Generates test file with valid fixtures
- [ ] Adds entry to serverless.yml
- [ ] Adds RTK Query hook to api-client
- [ ] Validates all generated code compiles
- [ ] Presents diff for approval before applying

**Examples**:
```bash
/scaffold-endpoint "list all wishlist items for current user"
/scaffold-endpoint "bulk delete wishlist items by IDs"
/scaffold-endpoint "update wishlist item priority"
```

### Story 2.2: /scaffold-feature Skill

**Description**: Create skill that generates full vertical slice for a feature

**Acceptance Criteria**:
- [ ] Generates API endpoints (CRUD or custom as needed)
- [ ] Generates UI components in appropriate app
- [ ] Generates shared types in appropriate package
- [ ] Generates tests for all layers
- [ ] Wires up RTK Query hooks
- [ ] Updates routing if needed
- [ ] Provides implementation order guidance

**Examples**:
```bash
/scaffold-feature "wishlist priority sorting with drag-drop"
/scaffold-feature "inspiration album management"
```

### Story 2.3: /scaffold-component Skill

**Description**: Create skill that generates React component with context awareness

**Acceptance Criteria**:
- [ ] Generates component following project patterns
- [ ] Adds appropriate tests
- [ ] Uses @repo/ui primitives correctly
- [ ] Follows component directory structure (index.tsx, __tests__/, __types__/)
- [ ] Infers props from description, generates Zod schema

**Examples**:
```bash
/scaffold-component "priority badge showing 1-5 stars"
/scaffold-component "sortable list with drag handles"
```

### Story 2.4: Test Fixture Generation

**Description**: Add capability to generate valid test fixtures from Zod schemas

**Acceptance Criteria**:
- [ ] Integrates `@anatine/zod-mock` or similar
- [ ] Generates fixtures respecting all Zod constraints
- [ ] Supports custom overrides for specific fields
- [ ] Generates edge case fixtures (min/max values, empty arrays)

## 8. Epic 3: Modify Skills

### Story 3.1: /add-field Skill

**Description**: Create skill that adds field across all layers atomically

**Acceptance Criteria**:
- [ ] Adds column to Drizzle schema
- [ ] Generates migration file
- [ ] Updates Zod schemas (generated and custom)
- [ ] Updates TypeScript types
- [ ] Updates API handlers if field is user-facing
- [ ] Updates UI forms if field is editable
- [ ] All changes are atomic (all or nothing)

**Examples**:
```bash
/add-field wishlistItems priority "integer default 0, sort order"
/add-field mocInstructions viewCount "integer default 0, read-only counter"
```

### Story 3.2: /add-endpoint Skill

**Description**: Create skill that adds single endpoint with minimal input

**Acceptance Criteria**:
- [ ] Generates handler from HTTP method + path + description
- [ ] Infers table from path (e.g., `/wishlist` → wishlistItems)
- [ ] Generates appropriate Zod schemas
- [ ] Adds serverless.yml entry
- [ ] Adds RTK Query hook
- [ ] Generates tests

**Examples**:
```bash
/add-endpoint POST /api/wishlist/:id/priority "update priority field"
/add-endpoint GET /api/wishlist/stats "return count and priority distribution"
```

### Story 3.3: /sync-types Skill

**Description**: Create skill that ensures type consistency across layers

**Acceptance Criteria**:
- [ ] Compares Drizzle schema to Zod schemas
- [ ] Compares backend Zod to frontend types
- [ ] Reports drift with specific field mismatches
- [ ] `--fix` flag applies corrections
- [ ] `--check` flag for CI integration (exit 1 on drift)

## 9. Epic 4: Agent Enhancement

### Story 4.1: Parallel Sub-Agent Architecture

**Description**: Enhance /implement to spawn specialized sub-agents

**Acceptance Criteria**:
- [ ] API Agent handles backend implementation
- [ ] UI Agent handles frontend implementation
- [ ] Test Agent generates comprehensive tests
- [ ] QA Agent reviews all generated code
- [ ] Sub-agents run in parallel where independent
- [ ] Structured handoff between agents (not file re-reading)

### Story 4.2: Agent Checkpointing

**Description**: Add checkpoint/resume capability to long-running agents

**Acceptance Criteria**:
- [ ] Agents save progress at defined checkpoints
- [ ] Interrupted agents can resume from last checkpoint
- [ ] Checkpoint includes: completed steps, generated files, context
- [ ] `--resume` flag continues from checkpoint

### Story 4.3: /refactor Agent

**Description**: Create agent for cross-cutting refactoring tasks

**Acceptance Criteria**:
- [ ] Analyzes scope of refactoring
- [ ] Creates migration plan
- [ ] Executes changes across all affected files
- [ ] Validates no regressions (tests pass)
- [ ] Supports rollback if issues detected

**Examples**:
```bash
/refactor "rename userId to ownerId across codebase"
/refactor "extract common pagination logic to shared util"
```

## 10. Epic 5: Analysis Skills

### Story 5.1: /impact Skill

**Description**: Create skill that analyzes impact of proposed changes

**Acceptance Criteria**:
- [ ] Identifies all files that would be affected
- [ ] Estimates scope (files, lines, complexity)
- [ ] Identifies potential breaking changes
- [ ] Suggests implementation order
- [ ] No actual changes made (analysis only)

**Examples**:
```bash
/impact "adding soft delete to all tables"
/impact "switching from Cognito to Auth0"
```

### Story 5.2: /coverage Skill

**Description**: Create skill that identifies gaps in implementation

**Acceptance Criteria**:
- [ ] Compares schema to API endpoints (missing CRUD?)
- [ ] Compares API to frontend hooks (missing integration?)
- [ ] Compares code to tests (missing coverage?)
- [ ] Prioritizes gaps by importance

## 11. Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Time to implement endpoint | 2-4 hours | 15-30 min | Developer survey |
| Cross-file consistency | Manual review | Automated | /sync-types in CI |
| Pattern adherence | Variable | 100% | Linting + review |
| New developer onboarding | 1-2 weeks | 2-3 days | Time to first PR |
| Test fixture creation | 15-30 min | < 1 min | /gen-fixtures |

## 12. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Generated code doesn't follow patterns | Medium | High | Validate against existing code, lint checks |
| MCP server crashes block workflow | Low | Medium | Graceful fallback to file reading |
| Over-reliance on automation | Medium | Medium | Require review gates, don't auto-commit |
| Schema parser doesn't handle edge cases | Medium | Low | Comprehensive test suite, manual fallback |
| Skills become outdated as codebase evolves | High | Medium | Version skills, include self-update checks |

## 13. Implementation Order

### Phase 1: Foundation (Week 1)
1. Story 1.1: Drizzle MCP Server
2. Story 1.2: Serverless MCP Server
3. Story 1.4: MCP Integration Testing

### Phase 2: Core Skills (Week 2)
4. Story 2.1: /scaffold-endpoint Skill
5. Story 2.4: Test Fixture Generation
6. Story 3.2: /add-endpoint Skill

### Phase 3: Full Automation (Week 3)
7. Story 2.2: /scaffold-feature Skill
8. Story 3.1: /add-field Skill
9. Story 3.3: /sync-types Skill

### Phase 4: Advanced (Week 4+)
10. Story 4.1: Parallel Sub-Agent Architecture
11. Story 5.1: /impact Skill
12. Story 4.3: /refactor Agent

## 14. Next Steps

1. **Architect Review**: Validate MCP server architecture and integration approach
2. **Prototype**: Build drizzle-mcp as proof-of-concept
3. **Skill Template**: Create standard SKILL.md template for consistency
4. **Story Creation**: Break epics into detailed implementation stories
5. **Developer Feedback**: Validate skill commands match developer mental model

## 15. Appendix: MCP Tool Definitions

### drizzle-mcp Tools

```typescript
interface ListTablesResponse {
  tables: Array<{
    name: string
    description?: string
    columnCount: number
  }>
}

interface GetTableSchemaResponse {
  name: string
  columns: Array<{
    name: string
    type: string  // 'text' | 'integer' | 'boolean' | 'timestamp' | 'uuid' | 'jsonb'
    nullable: boolean
    default?: string
    primaryKey?: boolean
    references?: { table: string; column: string }
  }>
  indexes: Array<{
    name: string
    columns: string[]
    unique: boolean
  }>
}

interface GetZodSchemaResponse {
  select: string   // Zod schema code for select
  insert: string   // Zod schema code for insert
  update: string   // Zod schema code for update
}
```

### serverless-mcp Tools

```typescript
interface ListFunctionsResponse {
  functions: Array<{
    name: string
    handler: string
    httpMethod?: string
    httpPath?: string
    description?: string
  }>
}

interface AddFunctionRequest {
  name: string
  handler: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  authorizer?: string
  environment?: Record<string, string>
}

interface AddFunctionResponse {
  yaml: string  // YAML snippet to add
  location: string  // Where in file to add
}
```
