# KB Story & Artifact Migration Plan

## Overview

Implement a **hybrid storage architecture** for stories and artifacts:
- **Files**: Human-readable content (story.yaml, *.md) - preserved for editing and version control
- **Database**: Status tracking, dependencies, blockers, relationships - fast queries
- **Knowledge Base**: Semantic search, lessons learned, cross-story patterns - AI-searchable

This enables:
1. Fast status queries across all stories via DB
2. Semantic search for patterns and solutions via KB
3. Human-readable files for editing and review
4. Automatic lesson extraction from completed stories

---

## Current State

### Existing Infrastructure

The KB already has these tables (see `src/db/schema.ts`):

| Table | Purpose | Status |
|-------|---------|--------|
| `knowledge_entries` | Semantic search with embeddings | Active |
| `embedding_cache` | Cache embeddings by content hash | Active |
| `audit_log` | Audit trail for KB entries | Active |
| `tasks` | Follow-up tasks, bugs, improvements | Active |
| `work_state` | Session state per story | Active |
| `work_state_history` | Archived work states | Active |
| `task_audit_log` | Audit trail for tasks | Active |

### Current File Structure

```
plans/future/wish/
├── stories.index.md           # Epic-level index (generated)
├── PLAN.md                    # Epic description
├── _epic-elab/
│   └── DECISIONS.yaml         # Epic-level decisions
├── backlog/
│   └── WISH-2XXX/
│       ├── WISH-2XXX.md       # Human-readable story
│       └── story.yaml         # Machine-readable metadata
├── ready-to-work/
│   └── WISH-2XXX/
│       ├── story.yaml
│       ├── elaboration.yaml   # PM elaboration
│       └── _implementation/
│           ├── ANALYSIS.md
│           └── TOKEN-LOG.md
├── UAT/
│   └── WISH-2XXX/
│       ├── story.yaml
│       ├── context.yaml       # Agent context
│       ├── plan.yaml          # Implementation plan
│       ├── verification.yaml  # Test results & AC verification
│       ├── proof.yaml         # Completion proof
│       ├── tokens.yaml        # Token usage
│       ├── PROOF-WISH-2XXX.md # Human-readable proof
│       └── _implementation/
│           ├── CHECKPOINT.md
│           ├── SCOPE.md
│           ├── IMPLEMENTATION-PLAN.md
│           ├── VERIFICATION.md
│           └── ...
└── completed/
    └── WISH-2XXX/
        └── ...
```

---

## Target Architecture

### Storage Strategy by Data Type

| Data Type | Primary Storage | Secondary Storage | Query Method |
|-----------|----------------|-------------------|--------------|
| Story metadata | Files (story.yaml) | DB (`stories` table) | DB queries |
| Story content | Files (*.md) | - | File read |
| Dependencies | Files (story.yaml) | DB (`story_dependencies`) | DB queries |
| Status/phase | DB (`stories` table) | Files (CHECKPOINT.yaml) | DB queries |
| Artifacts (impl) | Files (_implementation/) | KB (searchable) | KB semantic search |
| Lessons learned | KB only | - | KB semantic search |
| Work state | DB (`work_state`) | - | DB queries |

### Artifact Classification

| Artifact | File Storage | KB Entry? | Purpose |
|----------|-------------|-----------|---------|
| story.yaml | Yes | No | Story definition |
| context.yaml | Yes | No | Agent context |
| plan.yaml | Yes | Yes (searchable) | Implementation plan |
| verification.yaml | Yes | Yes (searchable) | Test results |
| proof.yaml | Yes | No | Completion proof |
| EVIDENCE.yaml | Yes | Yes (searchable) | Execution evidence |
| CHECKPOINT.yaml | Yes | No | Phase tracking |
| SCOPE.yaml | Yes | Yes (searchable) | Impact analysis |
| REVIEW.yaml | Yes | Yes (searchable) | Code review findings |
| ARCH-DECISIONS.yaml | Yes | Yes (permanent) | Architectural decisions |
| BACKEND-LOG.md | Yes | No (ephemeral) | Worker change logs |
| FRONTEND-LOG.md | Yes | No (ephemeral) | Worker change logs |
| PROOF-*.md | Yes | No (human-readable) | Proof document |
| Lessons (extracted) | No | Yes (permanent) | Cross-story patterns |

---

## New Database Tables

### 1. `stories` Table

Track story metadata and status.

```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  story_id TEXT NOT NULL UNIQUE,        -- e.g., "WISH-2047"
  feature TEXT NOT NULL,                 -- e.g., "wish", "cognito-scopes"
  epic TEXT,                             -- e.g., "Epic 6: Wishlist"

  -- Content paths
  story_dir TEXT NOT NULL,              -- e.g., "plans/future/wish/UAT/WISH-2047"
  story_file TEXT DEFAULT 'story.yaml',

  -- Metadata
  title TEXT NOT NULL,
  story_type TEXT DEFAULT 'feature',    -- feature | bug | tech_debt | infra | docs
  points INTEGER,
  priority TEXT,                         -- P0 | P1 | P2 | P3

  -- Status tracking
  state TEXT NOT NULL DEFAULT 'backlog',
  phase TEXT,                            -- Current workflow phase
  iteration INTEGER DEFAULT 0,

  -- Blockers
  blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  blocked_by_story TEXT,

  -- Scope flags
  touches_backend BOOLEAN DEFAULT false,
  touches_frontend BOOLEAN DEFAULT false,
  touches_database BOOLEAN DEFAULT false,
  touches_infra BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Sync tracking
  file_synced_at TIMESTAMPTZ,
  file_hash TEXT
);

CREATE INDEX idx_stories_feature ON stories(feature);
CREATE INDEX idx_stories_state ON stories(state);
CREATE INDEX idx_stories_priority ON stories(priority);
CREATE INDEX idx_stories_blocked ON stories(blocked) WHERE blocked = true;
```

**State Values:**
```
backlog → elaboration → ready-to-work → in-progress →
ready-for-code-review → review → ready-for-qa → in-qa →
uat → completed | cancelled | deferred
```

### 2. `story_dependencies` Table

Track relationships between stories.

```sql
CREATE TABLE story_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL REFERENCES stories(story_id) ON DELETE CASCADE,
  target_story_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL,  -- depends_on | blocked_by | follow_up_from | enables
  satisfied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(story_id, target_story_id, dependency_type)
);

CREATE INDEX idx_story_deps_story ON story_dependencies(story_id);
CREATE INDEX idx_story_deps_target ON story_dependencies(target_story_id);
CREATE INDEX idx_story_deps_unsatisfied ON story_dependencies(satisfied) WHERE satisfied = false;
```

### 3. `story_artifacts` Table

Link stories to artifacts (KB entries and files).

```sql
CREATE TABLE story_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL REFERENCES stories(story_id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  artifact_name TEXT,
  kb_entry_id UUID REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  file_path TEXT,
  phase TEXT,
  iteration INTEGER,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(story_id, artifact_type, iteration)
);

CREATE INDEX idx_story_artifacts_story ON story_artifacts(story_id);
CREATE INDEX idx_story_artifacts_type ON story_artifacts(artifact_type);
CREATE INDEX idx_story_artifacts_kb ON story_artifacts(kb_entry_id) WHERE kb_entry_id IS NOT NULL;
```

**Artifact Types:**
```
checkpoint | scope | plan | evidence | verification | review | proof | qa_verify |
backend_log | frontend_log | context | fix_context | architectural_decisions |
analysis | token_log | blockers | ui_ux_findings
```

---

## New MCP Tools

### Story Management Tools

#### `story_get`
```typescript
story_get({
  story_id: string,
  include_artifacts?: boolean,
  include_dependencies?: boolean,
})
```

#### `story_list`
```typescript
story_list({
  feature?: string,
  state?: string | string[],
  blocked?: boolean,
  priority?: string,
  limit?: number,
})
```

#### `story_update`
```typescript
story_update({
  story_id: string,
  state?: string,
  phase?: string,
  blocked?: boolean,
  blocked_reason?: string,
  iteration?: number,
})
```

#### `story_ready_to_start`
```typescript
story_ready_to_start({
  feature?: string,
  limit?: number,
})
// Returns stories where state='ready-to-work' AND blocked=false
// AND all depends_on are satisfied
```

### Artifact Tools

#### `artifact_write`
Write artifact to file + optionally KB.

```typescript
artifact_write({
  story_id: string,
  artifact_type: ArtifactType,
  content: object | string,
  to_kb?: boolean,  // Also create KB entry (default: based on type)
  summary?: object,
})
```

#### `artifact_read`
```typescript
artifact_read({
  story_id: string,
  artifact_type: ArtifactType,
  iteration?: number,
})
```

#### `artifact_search`
Search artifacts across stories using KB semantic search.

```typescript
artifact_search({
  query: string,
  artifact_types?: ArtifactType[],
  features?: string[],
  states?: string[],
  limit?: number,
})
```

---

## File-to-DB Sync Strategy

### Story Sync

```typescript
async function syncStoryFromFiles(storyDir: string): Promise<void> {
  const storyYaml = await readYaml(`${storyDir}/story.yaml`)

  await db.insert(stories).values({
    story_id: storyYaml.id,
    feature: storyYaml.feature,
    title: storyYaml.title,
    state: storyYaml.state,
    story_dir: storyDir,
    touches_backend: storyYaml.scope?.surfaces?.includes('backend'),
    touches_frontend: storyYaml.scope?.surfaces?.includes('frontend'),
    file_synced_at: new Date(),
    file_hash: hashFile(`${storyDir}/story.yaml`),
  }).onConflictDoUpdate({
    target: stories.story_id,
    set: { /* updated fields */ }
  })

  // Sync dependencies
  for (const dep of storyYaml.depends_on ?? []) {
    await db.insert(storyDependencies).values({
      story_id: storyYaml.id,
      target_story_id: dep,
      dependency_type: 'depends_on',
    }).onConflictDoNothing()
  }

  // Scan for artifacts
  await syncArtifactsFromFiles(storyYaml.id, storyDir)
}
```

### CLI Commands

```bash
# Sync all stories in an epic
pnpm sync:epic --feature=wish

# Sync a single story
pnpm sync:story --story=WISH-2047

# Regenerate stories.index.md from DB
pnpm regenerate:index --feature=wish

# Dry run
pnpm sync:epic --feature=wish --dry-run
```

---

## KB Tagging Convention

```
artifact:{type}     - e.g., artifact:evidence, artifact:plan
story:{id}          - e.g., story:wish-2047
feature:{name}      - e.g., feature:wish
phase:{name}        - e.g., phase:execute
status:{state}      - e.g., status:completed
iteration:{n}       - e.g., iteration:2
```

---

## Agent Updates

### Writing Pattern

**Before (file-only):**
```markdown
Use Write tool to create `_implementation/CHECKPOINT.yaml`
```

**After (hybrid):**
```markdown
Use `artifact_write` tool:
artifact_write({
  story_id: "{STORY_ID}",
  artifact_type: "checkpoint",
  content: { current_phase: "execute", ... }
})

This will:
1. Write to `_implementation/CHECKPOINT.yaml`
2. Update `story_artifacts` table with summary
3. Update `stories.phase` field
```

### Agent Files to Update

| Agent | Artifacts Written |
|-------|-------------------|
| `dev-setup-leader.agent.md` | CHECKPOINT, SCOPE |
| `dev-plan-leader.agent.md` | PLAN, ARCH-DECISIONS |
| `dev-execute-leader.agent.md` | EVIDENCE |
| `dev-implement-backend-coder.agent.md` | BACKEND-LOG |
| `dev-implement-frontend-coder.agent.md` | FRONTEND-LOG |
| `code-review-*.agent.md` | REVIEW |
| `dev-fix-fix-leader.agent.md` | FIX-CONTEXT |
| `qa-verify-*.agent.md` | QA-VERIFY |
| `knowledge-context-loader.agent.md` | Uses `artifact_search` |

---

## Implementation Phases

### Phase 1: Database Schema (2 stories)
- [ ] Create migrations for `stories`, `story_dependencies`, `story_artifacts` tables
- [ ] Add Drizzle schema definitions
- [ ] Write tests for schema

### Phase 2: Sync Infrastructure (2-3 stories)
- [ ] Implement `syncStoryFromFiles()` function
- [ ] Implement `syncArtifactsFromFiles()` function
- [ ] Create CLI commands: `sync:story`, `sync:epic`
- [ ] Test with existing wish stories

### Phase 3: MCP Tools - Stories (2 stories)
- [ ] Implement `story_get`, `story_list`, `story_update`
- [ ] Implement `story_dependencies`, `story_ready_to_start`
- [ ] Add to MCP server tool registry
- [ ] Write integration tests

### Phase 4: MCP Tools - Artifacts (2-3 stories)
- [ ] Implement `artifact_write` with file + KB dual-write
- [ ] Implement `artifact_read` with fallback logic
- [ ] Implement `artifact_search` using KB semantic search
- [ ] Add summary extraction for each artifact type

### Phase 5: Agent Updates (3-4 stories)
- [ ] Update setup/plan/execute leaders to use new tools
- [ ] Update code-review agents
- [ ] Update QA agents
- [ ] Update knowledge-context-loader for pattern search
- [ ] Update orchestrator commands

### Phase 6: Index Generation (1 story)
- [ ] Implement `generateStoriesIndex()` from DB
- [ ] Add `regenerate:index` CLI command

### Phase 7: Lesson Extraction (1-2 stories)
- [ ] Implement automatic lesson extraction from completed EVIDENCE
- [ ] Extract patterns from architectural decisions
- [ ] Add to story completion workflow

**Total: 13-17 stories**

---

## Migration Path for Existing Stories

### One-Time Migration

```bash
# 1. Sync all existing stories to DB
pnpm sync:epic --feature=wish --all
pnpm sync:epic --feature=cognito-scopes --all

# 2. Verify sync
pnpm story:list --feature=wish --count

# 3. Regenerate indexes from DB
pnpm regenerate:index --feature=wish
```

### Dual-Mode Transition

During transition:
1. File writes continue (backward compatible)
2. DB syncs on read operations
3. Agents prefer MCP tools when available
4. Fall back to file operations if DB unavailable

---

## Files to Create/Modify

### New Files

| Path | Purpose |
|------|---------|
| `src/db/migrations/XXX_add_stories.sql` | Migration for new tables |
| `src/stories/__types__/index.ts` | Zod schemas |
| `src/stories/story-sync.ts` | File-to-DB sync functions |
| `src/stories/story-tools.ts` | MCP tool handlers |
| `src/artifacts/artifact-tools.ts` | Artifact MCP tools |
| `scripts/sync-epic.ts` | CLI for epic sync |
| `scripts/regenerate-index.ts` | CLI for index regeneration |

### Modified Files

| Path | Changes |
|------|---------|
| `src/db/schema.ts` | Add stories, story_dependencies, story_artifacts tables |
| `src/mcp-server/tool-schemas.ts` | Add story and artifact tools |
| `src/mcp-server/tool-handlers.ts` | Add handlers |
| `.claude/agents/*.agent.md` | Update to use MCP tools |
| `.claude/commands/*.md` | Update to use MCP tools |

---

## Success Metrics

1. **Query Performance**: Story list queries < 50ms
2. **Sync Accuracy**: 100% match between files and DB state
3. **Search Utility**: Artifact search returns relevant results
4. **Adoption**: >90% of story operations use MCP tools within 4 weeks
5. **Lesson Extraction**: Automatic extraction covers >60% of manual patterns

---

## Rollback Plan

If migration fails:
1. Agents fall back to file-only operations automatically
2. DB tables can be dropped without affecting files
3. Stories remain fully functional via files
4. Re-run sync after fixing issues

---

## Related Documents

- `.claude/KB-AGENT-INTEGRATION.md` - Current KB integration guide
- `apps/api/knowledge-base/README.md` - KB package documentation
- `apps/api/knowledge-base/src/db/schema.ts` - Existing DB schema
- `.claude/agents/knowledge-context-loader.agent.md` - KB loader agent
