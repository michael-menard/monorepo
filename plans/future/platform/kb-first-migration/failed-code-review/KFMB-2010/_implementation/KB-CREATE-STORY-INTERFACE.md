# kb_create_story Interface Discovery (KFMB-1020)

## Discovery Status
- **Tool Status**: Does NOT exist yet (as of 2026-03-06)
- **Location**: Will be in `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`
- **Registration**: Will be in `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` and `tool-schemas.ts`
- **Deliverer**: KFMB-1020 (currently ready-to-work, not yet shipped)

## Interface Discovered from KFMB-1020 Test Plan

### Input Schema
From KFMB-1020 happy path test HP-1:
```javascript
kb_create_story({
  story_id: 'TEST-001',      // REQUIRED
  title: 'Test Story',       // REQUIRED
  feature: 'test',           // optional
  epic?: string,             // optional
  priority?: 'medium',       // optional
  state?: 'backlog',         // optional
  phase?: number,            // optional
  story_dir?: string,        // optional
  story_file?: string,       // optional
  depends_on?: string[],     // optional, array
  risk_notes?: string,       // optional
  sizing_warning?: boolean   // optional
})
```

### Output Schema
From KFMB-1020 happy path test HP-1:
```javascript
{
  ...story_row,              // all story table columns
  created: true              // boolean indicating if fresh insert (true) or upsert (false)
}
```

### Idempotent Semantics
From KFMB-1020 happy path test HP-2 (partial merge):
- Re-call with `story_id: 'TEST-001', title: 'Updated Title'` (omitting description)
- Expected: `created: false`, title updated, description preserved
- **Critical behavior**: Omitted fields do NOT overwrite existing DB values (no clobbering)
- Must use Drizzle `onConflictDoUpdate` with dynamic set clause

### Content Fields
From KFMB-1020 happy path test HP-3 and HP-4:
The tool should support four new content fields added by KFMB-1010 migration:
- `description?: string`
- `acceptance_criteria?: string`
- `non_goals?: string`
- `packages?: string[]`

## Implementation Pattern Reference
Canonical Drizzle pattern for this tool (follow `kb_upsert_plan` as reference):
```typescript
import { eq, sql } from 'drizzle-orm'
import { stories } from '../db/schema'

export async function kb_create_story(
  db: NodePgDatabase,
  input: z.infer<typeof KbCreateStoryInputSchema>
): Promise<KbCreateStoryResult> {
  // Build dynamic set object — only include fields where value !== undefined
  const updateSet = {}
  if (input.title !== undefined) updateSet.title = input.title
  if (input.feature !== undefined) updateSet.feature = input.feature
  // ... etc for all optional fields
  
  // Upsert: INSERT ... ON CONFLICT (story_id) DO UPDATE SET ...
  const result = await db
    .insert(stories)
    .values({
      story_id: input.story_id,
      title: input.title,
      ...Object.keys(input)
        .filter(key => input[key] !== undefined && key !== 'story_id' && key !== 'title')
        .reduce((acc, key) => ({ ...acc, [key]: input[key] }), {})
    })
    .onConflictDoUpdate({
      target: stories.story_id,
      set: updateSet
    })
    .returning()
  
  return {
    ...result[0],
    created: result[0].created_at === new Date() // or similar sentinel
  }
}
```

## Known Constraints (from STORY-SEED.md)
1. Partial-merge upsert correctness is critical — ED-1 test in KFMB-1020 validates no-clobbering
2. Access control: all roles can call kb_create_story (AC-6 in KFMB-1020)
3. Dependency edge creation: NOT handled by kb_create_story; `depends_on` field is for future dependency logic
4. Idempotency: calling twice for same story_id must produce exactly 1 row, not 2

## Files That Reference kb_create_story (Post-KFMB-1020)
- `.claude/agents/pm-bootstrap-generation-leader.agent.md` (KFMB-2010 scope) — will call this tool
- Any other PM workflow agents that need to bootstrap stories

## Verification Checklist (When KFMB-1020 Ships)
- [ ] Tool registered in tool-handlers.ts
- [ ] Input schema in tool-schemas.ts matches expected interface
- [ ] Return type includes `created: boolean` field
- [ ] Partial-merge upsert works (omitted fields preserve existing values)
- [ ] kb_get_story can retrieve content fields after kb_create_story writes them
- [ ] All roles can call without AccessDenied error
