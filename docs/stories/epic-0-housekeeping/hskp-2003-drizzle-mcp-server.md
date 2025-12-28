# Story HSKP-2003: Drizzle MCP Server

## Status

Draft

## Story

**As a** developer using Claude Code,
**I want** Claude to understand my database schema,
**so that** it can generate accurate code that matches my data model.

## Epic Context

This story creates the Drizzle MCP server that exposes database schema information to Claude. It is a key component for the scaffold skills (HSKP-2005, HSKP-2006).

## Priority

P0 - Foundation for AI-powered code generation

## Estimated Effort

2-3 days

## Dependencies

- HSKP-2002: MCP Server Infrastructure (must be completed first)

## Acceptance Criteria

1. `list_tables` tool returns all table names with column counts
2. `get_table_schema` tool returns complete column definitions, types, and constraints
3. `get_relations` tool returns foreign key relationships and join information
4. `get_zod_schema` tool returns generated Zod schema code for any table
5. Query caching provides sub-200ms response times for repeated queries
6. Handles malformed or missing schema files gracefully
7. Integration test confirms Claude can query all tools successfully

## Tasks / Subtasks

- [ ] **Task 1: Create Package Structure** (AC: 1-4)
  - [ ] Create `tools/mcp-servers/drizzle-mcp/` directory
  - [ ] Create package.json with dependencies
  - [ ] Create tsconfig.json
  - [ ] Add build and start scripts

- [ ] **Task 2: Create Schema Parser** (AC: 1-4)
  - [ ] Create `src/utils/schema-parser.ts`
  - [ ] Parse Drizzle table definitions from schema.ts
  - [ ] Extract column names, types, and constraints
  - [ ] Extract foreign key relationships
  - [ ] Handle all Drizzle column types (text, integer, uuid, etc.)

- [ ] **Task 3: Implement list_tables Tool** (AC: 1)
  - [ ] Create `src/tools/list-tables.ts`
  - [ ] Return array of table names with descriptions
  - [ ] Include column count for each table
  - [ ] Cache results with file-change invalidation

- [ ] **Task 4: Implement get_table_schema Tool** (AC: 2)
  - [ ] Create `src/tools/get-table-schema.ts`
  - [ ] Accept table name as input
  - [ ] Return complete column definitions
  - [ ] Include type, nullable, default, primaryKey, references
  - [ ] Include indexes if present
  - [ ] Return 404-style error for unknown tables

- [ ] **Task 5: Implement get_relations Tool** (AC: 3)
  - [ ] Create `src/tools/get-relations.ts`
  - [ ] Accept optional table name filter
  - [ ] Return all foreign key relationships
  - [ ] Include join path information
  - [ ] Support both directions (references/referencedBy)

- [ ] **Task 6: Implement get_zod_schema Tool** (AC: 4)
  - [ ] Create `src/tools/get-zod-schema.ts`
  - [ ] Accept table name as input
  - [ ] Generate Zod select schema
  - [ ] Generate Zod insert schema
  - [ ] Generate Zod update schema (partial)
  - [ ] Use actual constraints from Drizzle schema

- [ ] **Task 7: Create Server Entry Point** (AC: 1-4)
  - [ ] Create `src/index.ts`
  - [ ] Use shared server factory
  - [ ] Register all tools
  - [ ] Configure caching

- [ ] **Task 8: Implement Caching** (AC: 5)
  - [ ] Configure cache for parsed schema
  - [ ] Watch schema.ts for changes
  - [ ] Invalidate on file change
  - [ ] Measure and verify response times

- [ ] **Task 9: Add Error Handling** (AC: 6)
  - [ ] Handle missing schema.ts file
  - [ ] Handle malformed schema definitions
  - [ ] Return helpful error messages
  - [ ] Log parsing issues for debugging

- [ ] **Task 10: Integration Testing** (AC: 7)
  - [ ] Configure in `.claude/settings.json`
  - [ ] Verify all tools appear in Claude
  - [ ] Test each tool with real schema
  - [ ] Document example queries

## Dev Notes

### Package Structure

```
tools/mcp-servers/drizzle-mcp/
├── src/
│   ├── index.ts               # Server entry
│   ├── tools/
│   │   ├── list-tables.ts
│   │   ├── get-table-schema.ts
│   │   ├── get-relations.ts
│   │   └── get-zod-schema.ts
│   └── utils/
│       └── schema-parser.ts   # Drizzle schema parsing
├── package.json
└── tsconfig.json
```

### Tool Definitions

```typescript
// list_tables
{
  name: 'list_tables',
  description: 'List all Drizzle table definitions in the project',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
}

// get_table_schema
{
  name: 'get_table_schema',
  description: 'Get column definitions, types, and constraints for a specific table',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'The table name (e.g., "mocInstructions", "wishlistItems")'
      }
    },
    required: ['table']
  }
}

// get_relations
{
  name: 'get_relations',
  description: 'Get foreign key relationships and join information',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'Optional: filter to relationships involving this table'
      }
    },
    required: []
  }
}

// get_zod_schema
{
  name: 'get_zod_schema',
  description: 'Get Zod validation schemas (select/insert/update) for a table',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'The table name'
      },
      schemaType: {
        type: 'string',
        enum: ['select', 'insert', 'update', 'all'],
        description: 'Which schema type to return (default: all)'
      }
    },
    required: ['table']
  }
}
```

### Response Schemas

```typescript
// list_tables response
interface ListTablesResponse {
  tables: Array<{
    name: string
    description?: string
    columnCount: number
  }>
}

// Example:
{
  "tables": [
    { "name": "mocInstructions", "columnCount": 12 },
    { "name": "mocFiles", "columnCount": 8 },
    { "name": "wishlistItems", "columnCount": 10 }
  ]
}

// get_table_schema response
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

// get_zod_schema response
interface GetZodSchemaResponse {
  table: string
  select: string   // Zod schema code string
  insert: string   // Zod schema code string
  update: string   // Zod schema code string (partial)
}
```

### Schema Parser Implementation

```typescript
// tools/mcp-servers/drizzle-mcp/src/utils/schema-parser.ts
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SCHEMA_PATH = 'packages/backend/db/src/schema.ts'

interface ColumnDef {
  name: string
  type: string
  nullable: boolean
  default?: string
  primaryKey?: boolean
  references?: { table: string; column: string }
}

interface TableDef {
  name: string
  columns: ColumnDef[]
  indexes: IndexDef[]
}

export function parseSchema(projectRoot: string): TableDef[] {
  const schemaPath = resolve(projectRoot, SCHEMA_PATH)
  const content = readFileSync(schemaPath, 'utf-8')

  const tables: TableDef[] = []

  // Match table definitions like:
  // export const mocInstructions = pgTable('moc_instructions', { ... })
  const tableRegex = /export const (\w+) = pgTable\(['"](\w+)['"],\s*\{([^}]+)\}/g

  let match
  while ((match = tableRegex.exec(content)) !== null) {
    const [, varName, tableName, columnsBlock] = match
    const columns = parseColumns(columnsBlock)

    tables.push({
      name: varName,
      columns,
      indexes: [], // Parse separately if needed
    })
  }

  return tables
}

function parseColumns(block: string): ColumnDef[] {
  const columns: ColumnDef[] = []

  // Match column definitions like:
  // id: uuid('id').primaryKey().defaultRandom(),
  // title: text('title').notNull(),
  const columnRegex = /(\w+):\s*(\w+)\(['"](\w+)['"]\)([^,\n]+)?/g

  let match
  while ((match = columnRegex.exec(block)) !== null) {
    const [, name, type, , modifiers] = match

    columns.push({
      name,
      type: mapDrizzleType(type),
      nullable: !modifiers?.includes('.notNull()'),
      primaryKey: modifiers?.includes('.primaryKey()'),
      default: extractDefault(modifiers),
      references: extractReference(modifiers),
    })
  }

  return columns
}

function mapDrizzleType(drizzleType: string): string {
  const mapping: Record<string, string> = {
    uuid: 'uuid',
    text: 'text',
    varchar: 'text',
    integer: 'integer',
    bigint: 'bigint',
    boolean: 'boolean',
    timestamp: 'timestamp',
    date: 'date',
    jsonb: 'jsonb',
    json: 'json',
  }
  return mapping[drizzleType] || drizzleType
}
```

### Zod Schema Generation

```typescript
// tools/mcp-servers/drizzle-mcp/src/tools/get-zod-schema.ts
function generateZodSchema(table: TableDef, type: 'select' | 'insert' | 'update'): string {
  const lines: string[] = ['z.object({']

  for (const col of table.columns) {
    let zodType = mapToZodType(col.type)

    if (type === 'insert' && col.default) {
      zodType += '.optional()'
    } else if (type === 'update') {
      zodType += '.optional()'
    } else if (col.nullable) {
      zodType += '.nullable()'
    }

    lines.push(`  ${col.name}: ${zodType},`)
  }

  lines.push('})')
  return lines.join('\n')
}

function mapToZodType(drizzleType: string): string {
  const mapping: Record<string, string> = {
    uuid: 'z.string().uuid()',
    text: 'z.string()',
    integer: 'z.number().int()',
    bigint: 'z.number().int()',
    boolean: 'z.boolean()',
    timestamp: 'z.string().datetime()',
    date: 'z.string().date()',
    jsonb: 'z.unknown()',
    json: 'z.unknown()',
  }
  return mapping[drizzleType] || 'z.unknown()'
}
```

### Usage Example

```typescript
// Claude can query like this:

// "What tables exist in this project?"
await callTool('list_tables', {})

// "Show me the wishlistItems schema"
await callTool('get_table_schema', { table: 'wishlistItems' })

// "What's the relationship between mocs and files?"
await callTool('get_relations', { table: 'mocInstructions' })

// "Generate Zod schema for wishlistItems"
await callTool('get_zod_schema', { table: 'wishlistItems' })
```

## Testing

### Test Location
- `tools/mcp-servers/drizzle-mcp/src/__tests__/`

### Test Requirements
- Unit: Schema parser handles all Drizzle column types
- Unit: Schema parser extracts foreign key references
- Unit: Zod schema generation produces valid Zod code
- Unit: Missing schema file returns appropriate error
- Unit: Unknown table returns appropriate error
- Integration: All tools return expected data for real schema
- Performance: Cached queries complete in <200ms

### Running Tests

```bash
# Build and test
pnpm --filter drizzle-mcp build
pnpm --filter drizzle-mcp test

# Manual testing
node tools/mcp-servers/drizzle-mcp/dist/index.js
# Use MCP client to call tools
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema parser misses edge cases | Medium | Medium | Comprehensive test suite with real schema |
| Drizzle syntax changes | Low | Medium | Pin Drizzle version, monitor updates |
| Large schema causes slow parsing | Low | Low | Caching, lazy parsing if needed |
| Generated Zod doesn't compile | Medium | Medium | Validate generated code in tests |

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft from AI Developer Automation PRD | SM Agent |
