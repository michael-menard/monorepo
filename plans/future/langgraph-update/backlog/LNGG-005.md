---
story_id: LNGG-005
title: KB Writing Adapter - Knowledge Base Integration
status: backlog
created: 2026-02-13
updated: 2026-02-13
epic: LangGraph Integration Adapters
phase: 1-Enhancement
size: medium
effort_hours: 6
complexity: medium
risk_level: low
blocked_by: []
blocks: []
priority: P1
---

# LNGG-005: KB Writing Adapter - Knowledge Base Integration

## Context

Claude Code `/elab-story --autonomous` mode writes non-blocking findings to Knowledge Base for future reference. Example:

```typescript
// Finding classified as non-blocking
if (!finding.mvpBlocking) {
  await spawnKBWriter({
    category: 'future-opportunity',
    storyId: 'INST-1008',
    finding: finding.description,
    tags: ['api', 'rtk-query', 'optimization']
  })
}
```

**Problem:** LangGraph has no KB integration. Non-blocking findings are lost instead of captured for future stories.

---

## Goal

Create adapter for writing findings to Knowledge Base with categorization, tagging, and deduplication.

---

## Acceptance Criteria

### AC1: Write KB Entry
```typescript
await kbAdapter.writeEntry({
  category: 'future-opportunity',
  storyId: 'INST-1008',
  title: 'Consider request batching',
  content: 'RTK Query could batch multiple requests...',
  tags: ['performance', 'api'],
  severity: 'low'
})
```

### AC2: Categorization
Support categories:
- `future-opportunity` - Enhancements for later
- `anti-pattern` - Things to avoid
- `lesson-learned` - Insights from implementation
- `best-practice` - Recommended patterns

### AC3: Deduplication
```typescript
// Check for similar entries before writing
const similar = await kbAdapter.findSimilar(entry, 0.85)
if (similar.length > 0) {
  // Merge or skip
}
```

---

## Technical Design

```typescript
export class KBAdapter {
  constructor(
    private options: {
      backend: 'db' | 'mcp' | 'file'
      db?: Pool
      similarityThreshold?: number
    }
  ) {}

  async writeEntry(entry: KBEntry): Promise<string> {
    // 1. Validate
    const validated = KBEntrySchema.parse(entry)

    // 2. Check for duplicates
    const similar = await this.findSimilar(validated)
    if (similar.length > 0) {
      return similar[0].id // Return existing
    }

    // 3. Write to backend
    if (this.options.backend === 'db') {
      return await this.writeToDb(validated)
    } else if (this.options.backend === 'file') {
      return await this.writeToFile(validated)
    }
    // MCP integration future
  }

  async findSimilar(entry: KBEntry, threshold = 0.85): Promise<KBEntry[]> {
    // Simple text similarity for now
    // Future: use embeddings
  }
}

export const KBEntrySchema = z.object({
  category: z.enum(['future-opportunity', 'anti-pattern', 'lesson-learned', 'best-practice']),
  storyId: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  metadata: z.record(z.unknown()).optional()
})
```

---

## Test Plan

```typescript
describe('KBAdapter', () => {
  it('writes entry to KB')
  it('categorizes correctly')
  it('detects duplicates')
  it('tags entries')
  it('works with file backend')
  it('works with DB backend')
})
```

---

## Estimated Effort

**6 hours** (backend integration, deduplication logic)
