# Shared TypeScript Types for Unified WINT Schema

This module provides a single source of truth for all WINT-related types used across LangGraph repositories and MCP tools.

## Overview

All schemas are auto-generated from Drizzle ORM tables using `drizzle-zod`, ensuring they stay in sync with the database schema defined in `@repo/database-schema`.

## Usage

### Importing Schemas

```typescript
// Import insert and select schemas
import {
  insertStorySchema,
  selectStorySchema,
  type InsertStory,
  type SelectStory,
} from '@repo/workflow-svc/__types__'

// Use schemas for validation
const newStory = insertStorySchema.parse({
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'My Story',
  epic: 'wint',
  status: 'ready-to-work',
  priority: 'P2',
  // ... other fields
})

// Use types for function signatures
function createStory(data: InsertStory): Promise<SelectStory> {
  // Implementation
}
```

### Insert vs Select Schemas

- **Insert Schemas** (`insertXSchema`): Use for creating new records. Excludes auto-generated fields like `created_at`, `updated_at`.
- **Select Schemas** (`selectXSchema`): Use for querying existing records. Includes all fields, including auto-generated ones.

```typescript
import {
  insertStorySchema,
  selectStorySchema,
  type InsertStory,
  type SelectStory,
} from '@repo/workflow-svc/__types__'

// Creating a new story - use insert schema
const newStory: InsertStory = {
  id: 'uuid-here',
  title: 'Story Title',
  epic: 'wint',
  status: 'ready-to-work',
  priority: 'P2',
  // No need for created_at, updated_at - auto-generated
}

// Query result - use select schema
const existingStory: SelectStory = await db
  .select()
  .from(stories)
  .where(eq(stories.id, 'uuid-here'))
  .then(rows => rows[0])
```

### Schema Groups

Schemas are organized into 6 groups matching the database schema:

1. **Core** - Story management (`insertStorySchema`, `selectStorySchema`, etc.)
2. **Context Cache** - Context management (`insertContextPackSchema`, etc.)
3. **Telemetry** - Agent tracking (`insertAgentInvocationSchema`, etc.)
4. **ML** - Machine learning (`insertMlModelSchema`, etc.)
5. **Graph** - Feature relationships (`insertFeatureSchema`, etc.)
6. **Workflow** - LangGraph execution (`insertWorkflowExecutionSchema`, etc.)

### Naming Convention

All exports follow a consistent pattern:

- **Schema exports**: `insert{TableName}Schema`, `select{TableName}Schema`
- **Type exports**: `Insert{TableName}`, `Select{TableName}`

Examples:

- `insertStorySchema` → `InsertStory`
- `selectStorySchema` → `SelectStory`
- `insertAgentInvocationSchema` → `InsertAgentInvocation`
- `selectAgentInvocationSchema` → `SelectAgentInvocation`

### Repository Integration

LangGraph repositories should import from this module instead of defining local schemas:

```typescript
// ❌ BEFORE - Local schema definition
import { z } from 'zod'

const StoryRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  // ... duplicated schema
})
type StoryRow = z.infer<typeof StoryRowSchema>

// ✅ AFTER - Shared types
import { selectStorySchema, type SelectStory } from '../__types__'

type StoryRow = SelectStory
```

### MCP Tool Integration

MCP tools can import shared types for input/output validation:

```typescript
import { insertStorySchema, type InsertStory, type SelectStory } from '@repo/workflow-svc/__types__'

// MCP tool handler
export async function createStoryTool(input: unknown): Promise<SelectStory> {
  // Validate input with shared schema
  const validatedInput = insertStorySchema.parse(input)

  // Create story in database
  const story = await createStory(validatedInput)

  return story
}
```

## Available Schemas

### Core Schema Group

- `insertStorySchema`, `selectStorySchema` - Main story entity
- `insertStoryStateSchema`, `selectStoryStateSchema` - Story states
- `insertStoryTransitionSchema`, `selectStoryTransitionSchema` - State transitions
- `insertStoryDependencySchema`, `selectStoryDependencySchema` - Story dependencies
- `insertStoryArtifactSchema`, `selectStoryArtifactSchema` - Generated artifacts
- `insertStoryPhaseHistorySchema`, `selectStoryPhaseHistorySchema` - Phase tracking
- `insertStoryMetadataVersionSchema`, `selectStoryMetadataVersionSchema` - Metadata versions
- `insertStoryAssignmentSchema`, `selectStoryAssignmentSchema` - Story assignments
- `insertStoryBlockerSchema`, `selectStoryBlockerSchema` - Story blockers

### Context Cache Group

- `insertContextPackSchema`, `selectContextPackSchema` - Context bundles
- `insertContextSessionSchema`, `selectContextSessionSchema` - Agent sessions
- `insertContextCacheHitSchema`, `selectContextCacheHitSchema` - Cache performance

### Telemetry Group

- `insertAgentInvocationSchema`, `selectAgentInvocationSchema` - Agent execution events
- `insertAgentDecisionSchema`, `selectAgentDecisionSchema` - Autonomous decisions
- `insertAgentOutcomeSchema`, `selectAgentOutcomeSchema` - Execution results
- `insertStateTransitionSchema`, `selectStateTransitionSchema` - State machine transitions

### ML Group

- `insertTrainingDataSchema`, `selectTrainingDataSchema` - Training datasets
- `insertMlModelSchema`, `selectMlModelSchema` - ML models
- `insertModelPredictionSchema`, `selectModelPredictionSchema` - Model predictions
- `insertModelMetricSchema`, `selectModelMetricSchema` - Model performance

### Graph Group

- `insertFeatureSchema`, `selectFeatureSchema` - System features
- `insertCapabilitySchema`, `selectCapabilitySchema` - Capabilities
- `insertFeatureRelationshipSchema`, `selectFeatureRelationshipSchema` - Feature relationships
- `insertCohesionRuleSchema`, `selectCohesionRuleSchema` - Feature grouping rules

### Workflow Group

- `insertWorkflowExecutionSchema`, `selectWorkflowExecutionSchema` - Workflow runs
- `insertWorkflowCheckpointSchema`, `selectWorkflowCheckpointSchema` - Workflow snapshots
- `insertWorkflowAuditLogSchema`, `selectWorkflowAuditLogSchema` - Workflow audit trail

## Architecture

### Type Flow

```
Drizzle Tables (database-schema)
  ↓ (drizzle-zod auto-generates)
Insert/Select Schemas (database-schema)
  ↓ (re-exported by)
Shared Types Package (workflow-svc/__types__)
  ↓ (imported by)
LangGraph Repositories + MCP Tools
```

### Build Order

1. `@repo/database-schema` builds first (provides source schemas)
2. `@repo/workflow-svc` builds second (re-exports schemas)
3. Consumers import from `@repo/workflow-svc/__types__`

### Circular Dependency Prevention

- `database-schema` → `workflow-svc` (one-way import, safe)
- `workflow-svc/__types__` → repositories (internal to package, safe)
- **Never** import `workflow-svc` in `database-schema`

## Maintenance

### Syncing with Database Schema

When database schema changes (new tables, columns, or constraints):

1. Update Drizzle tables in `@repo/database-schema/src/schema/wint.ts`
2. Run migrations: `pnpm db:migrate`
3. Rebuild database-schema: `pnpm --filter @repo/database-schema build`
4. Rebuild workflow-svc: `pnpm --filter @repo/workflow-svc build`
5. Types automatically update via drizzle-zod re-generation

### Adding Custom Schemas

If you need schemas not directly mapped to database tables:

```typescript
// In this file (workflow-svc/src/__types__/index.ts)

/**
 * Custom schema for MCP tool input that doesn't map 1:1 to a table.
 */
export const customMcpInputSchema = z.object({
  storyId: z.string().uuid(),
  action: z.enum(['create', 'update', 'delete']),
  metadata: z.record(z.unknown()).optional(),
})

export type CustomMcpInput = z.infer<typeof customMcpInputSchema>
```

## Testing

Run unit tests for schema validation:

```bash
pnpm --filter @repo/workflow-svc test src/__types__/__tests__/index.test.ts
```

## References

- Database schema: `packages/backend/database-schema/src/schema/wint.ts`
- Drizzle ORM: https://orm.drizzle.team/
- drizzle-zod: https://orm.drizzle.team/docs/zod
- Project guidelines: `CLAUDE.md` (Zod-First Types section)
