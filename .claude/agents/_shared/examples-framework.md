# Examples Framework

**Version**: 1.0.0
**Story**: WINT-0180
**Status**: Active

---

## Overview

The Examples Framework provides a systematic approach for capturing, storing, and retrieving examples that guide agent decision-making. This framework complements the [Decision Handling Protocol](./decision-handling.md) by providing concrete examples of what to do (positive examples) and what to avoid (negative examples).

### Purpose

- **Consistency**: Ensure agents make similar decisions in similar situations
- **Learning**: Build institutional knowledge that persists across sessions
- **Efficiency**: Reduce token overhead by reusing validated decision patterns
- **Quality**: Track which examples lead to successful outcomes

### Key Concepts

- **Example Entry**: A structured pattern showing positive/negative approaches to a scenario
- **Outcome Tracking**: Metrics measuring how effective each example is
- **Lifecycle Management**: Examples evolve from created → validated → deprecated
- **Query Patterns**: Standard methods for retrieving relevant examples

---

## Storage Strategy

### Hybrid Approach (Recommended)

The framework uses a **hybrid storage strategy** balancing queryability with simplicity:

#### Database Storage (`wint.examples` table)

**Use for:**
- Common examples shared across multiple agents
- Examples used in ML training pipelines
- Cross-project learning patterns
- High-value validated patterns

**Benefits:**
- Queryable with SQL/filters
- Versioned and auditable
- Supports relational links (e.g., to `wint.agentDecisions`)
- ML pipeline ready

**Schema**: See `packages/backend/database-schema/src/schema/wint.ts`

#### Filesystem Storage (Agent-specific examples)

**Use for:**
- Agent-specific examples in `.agent.md` frontmatter
- Quick iteration during development
- Examples tightly coupled to specific agent logic
- Temporary/experimental patterns

**Format**: YAML or JSON in agent directories

**Example:**
```yaml
# In .agent.md frontmatter or adjacent examples.yaml
examples:
  - id: "dev-coder-001"
    category: "code-patterns"
    scenario: "Choosing between interface and Zod schema"
    positive_example: "Always use Zod schema with z.infer<typeof>"
    negative_example: "Never use TypeScript interfaces without Zod"
    context:
      decision_tier: 1
      tags: ["typescript", "zod"]
```

### Migration Path

1. **Start local**: Begin with filesystem examples for rapid iteration
2. **Promote valuable patterns**: Move high-value examples to database
3. **Track effectiveness**: Use outcome metrics to identify promotion candidates
4. **Deprecate stale examples**: Mark unused patterns as deprecated

---

## Example Entry Schema

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "example-001") |
| `schema_version` | string | Yes | Semver (e.g., "1.0.0") for migration support |
| `category` | enum | Yes | Decision domain (see categories below) |
| `scenario` | string | Yes | When does this example apply? |
| `positive_example` | string | Optional | What TO do |
| `negative_example` | string | Optional | What NOT to do |
| `context` | object | Optional | Additional metadata (tags, tier, etc.) |
| `outcome_metrics` | object | Optional | Effectiveness tracking |
| `status` | enum | Yes | Lifecycle state (created/validated/deprecated) |

### Categories

```typescript
type ExampleCategory =
  | 'decision-making'    // Decision handling examples
  | 'code-patterns'      // Code style and architecture
  | 'testing'            // Testing approaches
  | 'documentation'      // Documentation style
  | 'error-handling'     // Error handling patterns
  | 'validation'         // Input validation
  | 'state-management'   // State management
  | 'api-design'         // API design patterns
  | 'performance'        // Performance optimization
  | 'accessibility'      // A11y best practices
  | 'security'           // Security patterns
  | 'data-modeling'      // Database/schema design
  | 'workflow'           // Agent workflow patterns
  | 'communication'      // User communication styles
  | 'other'              // Uncategorized
```

### Full Schema

See `packages/backend/orchestrator/src/artifacts/example-entry.ts` for the complete Zod schema definition.

---

## Lifecycle Management

### States

```
created → validated → deprecated (terminal)
```

#### Created

- **Initial state** when example is first captured
- **Use**: Draft examples, unverified patterns
- **Query behavior**: Excluded from production queries by default
- **Transition**: Manual review → validated

#### Validated

- **Active state** for approved examples
- **Use**: Production agent queries
- **Query behavior**: Included in all standard queries
- **Transition**: Staleness/replacement → deprecated

#### Deprecated

- **Terminal state** - example is no longer recommended
- **Use**: Historical reference only
- **Query behavior**: Excluded from all queries
- **Metadata**: Must include `deprecation_reason` and optionally `superseded_by`

### State Diagram

```
┌─────────┐
│ created │
└────┬────┘
     │ validated_at set
     ▼
┌───────────┐
│ validated │
└────┬──────┘
     │ deprecated_at set
     ▼
┌────────────┐
│ deprecated │ (terminal)
└────────────┘
```

### Transition Rules

| From | To | Trigger | Required Fields |
|------|-----|---------|----------------|
| created | validated | Manual approval | `validated_at` |
| validated | deprecated | Staleness/replacement | `deprecated_at`, `deprecation_reason` |
| created | deprecated | Invalid/duplicate | `deprecated_at`, `deprecation_reason` |

**Note**: No transitions OUT of deprecated state (terminal).

### Deprecation Workflow

**When to deprecate:**
- Example is >6 months old without usage
- Better example supersedes this one
- Pattern is no longer recommended
- Example led to failures (low success_rate)

**How to deprecate:**
1. Set `status: 'deprecated'`
2. Set `deprecated_at: <timestamp>`
3. Set `deprecation_reason: <why>`
4. Optionally set `superseded_by: <new-example-id>`
5. Update any documentation referencing this example

---

## Query Patterns

### Function Signatures

```typescript
/**
 * Query examples by filters
 * Returns empty array if no matches (never throws)
 */
function queryExamples(filters: {
  category?: ExampleCategory
  scenario?: string  // Substring match
  role?: string      // Agent role
  tags?: string[]    // Must match all tags
  status?: ExampleLifecycleState // Default: 'validated'
  limit?: number     // Default: 10
}): ExampleEntry[]

/**
 * Get example by ID
 * Returns null if not found (never throws)
 */
function getExampleById(id: string): ExampleEntry | null

/**
 * Find similar examples based on context
 * Uses semantic similarity for matching
 * Returns empty array if no matches (never throws)
 */
function findSimilarExamples(
  context: string,
  limit?: number  // Default: 5
): ExampleEntry[]
```

### Error Handling

**Rule**: Query functions NEVER throw errors. They return empty arrays or null.

**Rationale**: Graceful degradation. Agents can continue without examples rather than crashing.

**Example**:
```typescript
const examples = queryExamples({ category: 'nonexistent' })
// Returns: []
// NOT: throw new Error("Category not found")
```

### Integration with KB Precedent Query

Examples and precedents are complementary:

- **Precedents** (from `wint.agentDecisions`): Specific decisions made on past stories
- **Examples**: Generalized patterns extracted from multiple precedents

**Query order:**
1. Query examples by category/scenario (fast, structured)
2. If no examples, query KB precedents (slower, full-text)
3. If no precedents, escalate per decision-handling.md

---

## Outcome Tracking

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `times_referenced` | number | How many times example was queried |
| `times_followed` | number | How many times agent used this example |
| `times_ignored` | number | How many times agent saw but didn't use |
| `success_rate` | number | Successes / (successes + failures) |
| `follow_rate` | number | Followed / referenced |
| `last_used_at` | timestamp | Most recent usage |

### Storage Options

**Option A: Inline (ExampleEntry.outcome_metrics)**
- Stored directly in example entry
- Updated on each usage
- Simple, no joins required
- **Best for**: Filesystem examples, low volume

**Option B: Separate Table (wint.exampleOutcomes)**
- Event log of all outcome events
- Metrics computed on-demand or denormalized
- Supports detailed analytics
- **Best for**: Database examples, high volume, ML pipeline

### Recording Usage

```typescript
// After agent queries and uses an example
const updatedExample = recordExampleUsage(
  example,
  followed: true,  // Did agent follow this example?
  success: true    // Did it work? (optional)
)
```

### Effectiveness Score

Composite metric (0-100) combining success rate and follow rate:

```
score = (0.7 * success_rate * 100) + (0.3 * follow_rate * 100) + usage_bonus
usage_bonus = min(10, log10(times_referenced) * 2)
```

**Use**: Rank examples by effectiveness for curation and promotion.

---

## Integration with Decision Handling

### Decision Tiers and Examples

Per [decision-handling.md](./decision-handling.md):

| Tier | Name | Query Examples? | When |
|------|------|----------------|------|
| 1 | Clarification | **Yes** | Check for naming/style patterns |
| 2 | Preference | **Yes** | Check for project preferences |
| 3 | Ambiguous Scope | **Yes** | Check for interpretation patterns |
| 4 | Destructive | **No** | Always escalate (never auto) |
| 5 | External Dependency | **Yes** | Check for approved packages |

### Integration Flow

**Before escalating a Tier 2-3 decision:**

1. **Query examples** by category and scenario
   ```typescript
   const examples = queryExamples({
     category: 'decision-making',
     scenario: 'choosing state management',
     status: 'validated'
   })
   ```

2. **If examples found**:
   - Present examples to user (if escalating)
   - Or auto-accept using example (if autonomous mode)
   - Log decision with `example_id` reference

3. **If no examples found**:
   - Fall back to KB precedent query
   - Proceed per normal decision-handling flow

4. **After decision**:
   - Record example usage outcome
   - Update outcome metrics
   - Consider creating new example if pattern is reusable

### Example in decision-handling.md

See [decision-handling.md § Step 2.5: Query Examples](./decision-handling.md#step-25-query-examples) for full integration details.

---

## Migration from Inline Examples

### Existing Inline Examples

Current locations:
- `.claude/agents/_shared/decision-handling.md` (4 tier examples)
- `.claude/agents/_shared/expert-intelligence.md` (unknown count)
- Various `.agent.md` files (inline examples in markdown)

### Migration Script

**Location**: `scripts/migrate-inline-examples.ts`

**Process**:
1. Parse markdown files for example patterns
2. Extract scenario, positive/negative examples, context
3. Convert to `ExampleEntry` schema
4. Validate all fields
5. Write to target storage (database or YAML)
6. Verify: original count == converted count

**Run**:
```bash
pnpm tsx scripts/migrate-inline-examples.ts --dry-run
pnpm tsx scripts/migrate-inline-examples.ts --output database
pnpm tsx scripts/migrate-inline-examples.ts --output yaml
```

### Validation

**Requirements** (AC-7):
- No data loss: all examples converted
- Count match: original == converted
- Schema validation: all examples pass `ExampleEntrySchema.parse()`
- Unique IDs: no duplicate example IDs

---

## Schema Evolution

### Versioning Strategy

**Semantic Versioning (semver)**: `MAJOR.MINOR.PATCH`

- **Major**: Breaking changes (field removal, type changes)
- **Minor**: Additive changes (new optional fields)
- **Patch**: Documentation/validation changes only

**Field**: `schema_version: string` (e.g., "1.0.0")

### Backward Compatibility

**v1 → v2 migration**:
- New fields get default values
- Old fields remain optional for legacy support
- Migration warnings logged
- `.passthrough()` allows unknown fields (lenient parsing)

**Example**:
```typescript
// v1 example loads with v2 schema
const v1Example = { id: "ex-1", scenario: "...", /* missing v2 fields */ }
const v2Example = ExampleEntrySchema.parse(v1Example) // Uses defaults
```

### Deprecation Warnings

When loading old schema versions:
```typescript
if (example.schema_version !== CURRENT_VERSION) {
  logger.warn(`Example ${example.id} uses old schema ${example.schema_version}`)
}
```

---

## Best Practices

### Creating Examples

**DO:**
- ✓ Be specific in scenario description
- ✓ Include both positive and negative examples when possible
- ✓ Add context tags for searchability
- ✓ Link to source story (`source_story_id`)
- ✓ Start with `status: 'created'`, validate later

**DON'T:**
- ✗ Create overly generic examples ("write good code")
- ✗ Skip scenario context (when does this apply?)
- ✗ Duplicate existing examples (search first)
- ✗ Leave examples unvalidated for >1 week

### Querying Examples

**DO:**
- ✓ Filter by category first (fastest)
- ✓ Use semantic search for fuzzy matching
- ✓ Limit results (default 5-10)
- ✓ Handle empty results gracefully
- ✓ Record usage after querying

**DON'T:**
- ✗ Query without category filter (slow)
- ✗ Throw errors on empty results
- ✗ Return deprecated examples (filter `status: 'validated'`)
- ✗ Skip outcome tracking

### Maintenance

**DO:**
- ✓ Review examples quarterly
- ✓ Deprecate unused examples (0 references in 6 months)
- ✓ Promote high-effectiveness filesystem examples to database
- ✓ Update examples when patterns change
- ✓ Track outcome metrics consistently

**DON'T:**
- ✗ Let deprecated examples accumulate
- ✗ Ignore low success_rate examples
- ✗ Create examples without validation plan
- ✗ Skip deprecation_reason when deprecating

---

## Future Enhancements

### Post-MVP (Future Stories)

1. **Example Recommendation System** (WINT-5xxx)
   - ML-powered context-aware retrieval
   - Proactive suggestions based on story context
   - Requires embeddings infrastructure

2. **Natural Language Example Creation** (WINT-5xxx)
   - Auto-populate from `wint.agentDecisions`
   - Self-improving system
   - Agent learns from past decisions

3. **Example Effectiveness Dashboard**
   - Visualize success_rate and follow_rate
   - Leaderboard of most-referenced examples
   - Identify stale examples automatically

4. **Cross-Project Example Sharing**
   - Central registry for multiple codebases
   - Example import/export
   - Namespace isolation

5. **Example Relationship Graph**
   - Visualize `superseded_by` chains
   - Related examples network
   - Dependency tracking

---

## Reference

### Related Documentation

- [decision-handling.md](./decision-handling.md) - Decision tier framework
- [autonomy-tiers.md](./autonomy-tiers.md) - When to escalate vs proceed
- [expert-intelligence.md](./expert-intelligence.md) - 10-point specialist framework

### Schema Definitions

- `packages/backend/orchestrator/src/artifacts/example-entry.ts` - ExampleEntry schema
- `packages/backend/orchestrator/src/artifacts/example-outcome.ts` - Outcome tracking schema

### Database Schema

- `packages/backend/database-schema/src/schema/wint.ts` - `wint.examples` table (if database storage chosen)
- `wint.agentDecisions` - Link examples via `example_id` foreign key

### Scripts

- `scripts/migrate-inline-examples.ts` - Migration script for existing examples

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-14 | Initial framework definition (WINT-0180) |
