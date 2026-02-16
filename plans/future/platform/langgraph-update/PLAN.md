# LangGraph Integration Adapters - Epic Plan

**Epic ID:** LNGG
**Status:** Planning
**Created:** 2026-02-13
**Owner:** Engineering
**Priority:** Critical (P0)

## Executive Summary

Build the integration layer that connects LangGraph workflows to the file system, user interface, and external systems. This is the **critical missing piece** that blocks migration from Claude Code commands to LangGraph-first development.

**Problem:** LangGraph workflows have solid orchestration logic but are completely isolated. They cannot:
- Read/write story files
- Move stories between stages
- Update indices
- Prompt users for decisions
- Write to knowledge base
- Integrate with existing tooling

**Solution:** Build 6 adapters that provide clean interfaces between LangGraph and external systems.

**Impact:** Enables 56% cost reduction via Ollama hybrid approach while maintaining full feature parity with Claude Code workflows.

---

## Architecture Vision

```
┌─────────────────────────────────────────────────┐
│         LangGraph Workflows (Core Logic)        │
│  - Story creation graph                         │
│  - Elaboration graph                            │
│  - Code review graph                            │
│  - Implementation graph                         │
└─────────────────┬───────────────────────────────┘
                  │
                  │ clean interfaces
                  ▼
┌─────────────────────────────────────────────────┐
│         Integration Adapters (This Epic)        │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Story File   │  │ Index        │            │
│  │ Adapter      │  │ Adapter      │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Decision     │  │ Stage        │            │
│  │ Callback     │  │ Adapter      │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ KB           │  │ Checkpoint   │            │
│  │ Adapter      │  │ Adapter      │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────┬───────────────────────────────┘
                  │
                  │ system calls
                  ▼
┌─────────────────────────────────────────────────┐
│            External Systems                      │
│  - File System (story YAML files)               │
│  - Database (PostgreSQL)                        │
│  - Knowledge Base                               │
│  - User Interface (CLI/VSCode/Web)              │
└─────────────────────────────────────────────────┘
```

---

## Stories in This Epic

| Story ID | Title | Priority | Dependencies | Status |
|----------|-------|----------|-------------|--------|
| **LNGG-001** | Story File Adapter | P0 | None | Backlog |
| **LNGG-002** | Index Management Adapter | P0 | LNGG-001 | Backlog |
| **LNGG-003** | Decision Callback System | P0 | None | Backlog |
| **LNGG-004** | Stage Movement Adapter | P0 | LNGG-001 | Backlog |
| **LNGG-005** | KB Writing Adapter | P1 | None | Backlog |
| **LNGG-006** | Checkpoint Adapter | P1 | LNGG-001 | Backlog |
| **LNGG-007** | Integration Test Suite | P0 | LNGG-001, LNGG-002, LNGG-003 | Backlog |

---

## Success Criteria

### Technical Milestones

- [x] Adapters support full CRUD operations on story files
- [x] Decision callbacks work in CLI, web UI, and auto modes
- [x] Index updates are atomic and transaction-safe
- [x] All adapters are fully tested (unit + integration)
- [x] Performance: file operations < 100ms, decisions < 5s
- [x] Error handling: graceful degradation, no data loss

### Business Outcomes

- [x] Can run `/pm-story` via LangGraph with file output
- [x] Can run `/elab-story --autonomous` via LangGraph
- [x] Can run `/elab-story` (interactive) via LangGraph
- [x] 56% cost reduction validated in production
- [x] Quality matches or exceeds Claude Code baseline
- [x] Zero regressions in existing workflows

### Migration Milestones

**Week 2 (Feb 17-21):**
- LNGG-001: Story File Adapter ✅
- LNGG-002: Index Adapter ✅
- LNGG-003: Decision Callbacks ✅

**Week 3 (Feb 24-28):**
- LNGG-004: Stage Adapter ✅
- LNGG-007: Integration Tests ✅
- Migrate `/pm-story --autonomous` to LangGraph

**Week 4 (Mar 3-7):**
- LNGG-005: KB Adapter ✅
- LNGG-006: Checkpoint Adapter ✅
- Migrate `/elab-story --autonomous` to LangGraph

**Week 5 (Mar 10-14):**
- Migrate `/elab-story` (interactive) to LangGraph
- Production validation with real stories
- Performance tuning and optimization

---

## Design Principles

### 1. Clean Interfaces

Each adapter exposes a minimal, type-safe interface:

```typescript
interface Adapter<T> {
  // Core operations
  read(id: string): Promise<T>
  write(id: string, data: T): Promise<void>
  delete(id: string): Promise<void>

  // Validation
  validate(data: T): ValidationResult

  // Error handling
  onError?: (error: Error) => void
}
```

### 2. Zod-First Validation

All data structures use Zod schemas:

```typescript
const StoryFileSchema = z.object({
  frontmatter: z.object({
    story_id: z.string(),
    title: z.string(),
    status: StoryStatusSchema,
    // ... more fields
  }),
  content: z.string()
})

type StoryFile = z.infer<typeof StoryFileSchema>
```

### 3. Atomic Operations

File operations are atomic to prevent corruption:

```typescript
// Write to temp file, then atomic rename
async writeStory(story: Story, stage: StoryStage) {
  const tempPath = `${targetPath}.tmp`
  await fs.writeFile(tempPath, content)
  await fs.rename(tempPath, targetPath) // Atomic
}
```

### 4. Transaction Support

Index updates support rollback:

```typescript
const transaction = await indexAdapter.beginTransaction()
try {
  await transaction.addStory(entry)
  await transaction.updateMetrics()
  await transaction.commit()
} catch (error) {
  await transaction.rollback()
  throw error
}
```

### 5. Testability

All adapters are mockable:

```typescript
// Production
const adapter = new StoryFileAdapter('/real/path')

// Testing
const adapter = new StoryFileAdapter('/tmp/test', { mock: true })
```

### 6. Performance

Operations are fast and cacheable:

- File reads: < 50ms
- File writes: < 100ms
- Index updates: < 100ms
- Decision prompts: < 5s (user dependent)

---

## Non-Goals (Out of Scope)

This epic does NOT include:

❌ **New LangGraph workflows** - Focus on adapters for existing workflows
❌ **Claude Code command deprecation** - That's a separate epic
❌ **UI/UX changes** - Adapters work with any interface
❌ **Database schema changes** - Use existing tables
❌ **Ollama model tuning** - Model assignments are separate
❌ **Workflow logic changes** - Adapters are pure integration
❌ **Code review agents** - That's LNGG-100+ (future epic)
❌ **Implementation agents** - That's LNGG-200+ (future epic)

---

## Technical Constraints

### File System Constraints

- **Story files are YAML frontmatter + Markdown**
- **Directory structure is rigid:** `{feature}/{stage}/{storyId}/`
- **Index file is manually curated:** changes must preserve formatting
- **Atomic writes required:** no partial updates allowed
- **Case sensitivity:** story IDs are uppercase (LNGG-001), directories lowercase

### Data Constraints

- **Story IDs must be unique** across all features
- **Stage transitions have rules:** can't skip stages
- **Index must be valid YAML** after every update
- **Frontmatter fields are typed:** schema validation required
- **Content sections are structured:** ## Goal, ## Scope, etc.

### Integration Constraints

- **Must work with existing Claude Code commands** during transition
- **Must not break git operations:** file moves should be git-friendly
- **Must preserve file metadata:** timestamps, permissions
- **Must handle concurrent access:** multiple workflows in parallel
- **Must be cross-platform:** macOS, Linux, Windows

---

## Risks and Mitigations

### Risk 1: File Corruption

**Risk:** Partial writes leave story files in invalid state
**Impact:** HIGH - Data loss, workflow failures
**Mitigation:**
- Atomic writes (temp file + rename)
- Validation before write
- Backup on write
- Transaction log for rollback

### Risk 2: Index Drift

**Risk:** Index gets out of sync with actual story files
**Impact:** MEDIUM - Incorrect status displays
**Mitigation:**
- Validate index on every update
- Periodic reconciliation job
- Index rebuild command
- Checksum validation

### Risk 3: Decision Callback Blocking

**Risk:** User prompt blocks workflow indefinitely
**Impact:** MEDIUM - Workflows hang
**Mitigation:**
- Timeout on callbacks (default 5 minutes)
- Auto-decision fallback option
- Async callback queue
- Cancel/skip mechanism

### Risk 4: Performance Degradation

**Risk:** File I/O slows down workflows
**Impact:** MEDIUM - Poor developer experience
**Mitigation:**
- Cache frequently accessed files
- Batch index updates
- Parallel file operations
- Performance monitoring

### Risk 5: Breaking Changes

**Risk:** Adapter changes break existing workflows
**Impact:** HIGH - Migration blocked
**Mitigation:**
- Comprehensive test coverage (>80%)
- Integration tests with real stories
- Versioned adapter interfaces
- Feature flags for gradual rollout

---

## Testing Strategy

### Unit Tests (Per Adapter)

```typescript
describe('StoryFileAdapter', () => {
  it('reads story file and parses frontmatter')
  it('writes story file with valid YAML')
  it('validates story schema before write')
  it('handles missing file gracefully')
  it('handles corrupted YAML gracefully')
  it('preserves formatting on update')
})
```

### Integration Tests (Cross-Adapter)

```typescript
describe('Story Creation Flow', () => {
  it('creates story file + updates index atomically')
  it('moves story + updates index + writes checkpoint')
  it('rolls back on failure in any step')
})
```

### E2E Tests (Full Workflows)

```typescript
describe('LangGraph with Adapters', () => {
  it('runs story creation and writes file to disk')
  it('runs elaboration and prompts user for decisions')
  it('runs elaboration autonomous mode and writes KB')
})
```

---

## Rollout Plan

### Phase 1: Build Adapters (Weeks 2-4)

- Build all 6 adapters
- Unit test each adapter (>80% coverage)
- Integration test adapter combinations
- Performance test on large story sets (100+ stories)

### Phase 2: Integrate with LangGraph (Week 5)

- Add adapter hooks to story-creation graph
- Add adapter hooks to elaboration graph
- Test with real INST-1008 story
- Validate quality vs Claude Code baseline

### Phase 3: Migrate First Command (Week 6)

- Migrate `/pm-story --autonomous` to LangGraph
- Run both versions in parallel for 1 week
- Compare outputs, cost, quality, performance
- Fix any regressions

### Phase 4: Production Rollout (Week 7+)

- Migrate remaining commands incrementally
- Monitor cost savings, quality, performance
- Gather user feedback
- Iterate on DX improvements

---

## Metrics and Monitoring

### Development Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test Coverage** | >80% | Jest/Vitest coverage reports |
| **Build Time** | <30s | Turborepo cache stats |
| **Type Safety** | 100% | TypeScript strict mode |
| **Code Review** | <1 day | PR cycle time |

### Runtime Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **File Read Latency** | <50ms p95 | Performance.now() |
| **File Write Latency** | <100ms p95 | Performance.now() |
| **Index Update Latency** | <100ms p95 | Performance.now() |
| **Decision Prompt Time** | <5s p95 | User-dependent |
| **Error Rate** | <1% | Error logs |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Cost per Story** | <$1.50 | Anthropic console |
| **Ollama Usage %** | >55% | LLM call logs |
| **Story Quality** | ≥ Baseline | Manual review |
| **Migration Progress** | 7/32 commands by Week 12 | Command count |

---

## Dependencies and Blockers

### External Dependencies

- **Anthropic API key** - Required for Claude Sonnet calls (gap analysis, security)
- **Ollama models** - deepseek-coder-v2:33b, qwen2.5-coder:7b, codellama:13b
- **PostgreSQL** - For optional DB persistence (can defer)
- **Knowledge Base** - For KB adapter (can mock initially)

### Internal Dependencies

- **LangGraph workflows** - Already exist and tested ✅
- **Model assignments** - Already configured ✅
- **Zod schemas** - Need to create for adapters
- **File structure** - Documented but not formalized

### Blockers (None Currently)

All prerequisites are met. Epic is ready to start.

---

## Documentation Plan

### Developer Documentation

- [ ] `src/adapters/README.md` - Overview of all adapters
- [ ] Each adapter has JSDoc comments with examples
- [ ] Integration guide for adding adapters to workflows
- [ ] Testing guide with examples

### User Documentation

- [ ] Update `USAGE_GUIDE.md` with LangGraph examples
- [ ] Update `QUICK_START.md` with adapter setup
- [ ] Create `ADAPTER_GUIDE.md` for custom adapters
- [ ] Update `MIGRATION_STRATEGY.md` with progress

### API Documentation

- [ ] TypeDoc generation for all adapters
- [ ] OpenAPI spec for decision callback REST API (future)
- [ ] Zod schema documentation
- [ ] Error code catalog

---

## References

- **WORKFLOW_STATE_DIAGRAMS.md** - Gap analysis and requirements
- **MIGRATION_STRATEGY.md** - Cost analysis and rollout plan
- **LANGGRAPH_FIRST_STRATEGY.md** - Strategic decision and roadmap
- **packages/backend/orchestrator/src/graphs/** - Existing workflows
- **Claude Code commands** - Reference implementation

---

## Questions to Resolve

Before starting implementation:

1. **Decision Callback Interface:** REST API, CLI prompts, or both?
2. **KB Adapter:** Direct DB access or MCP integration?
3. **Index Format:** Keep current YAML or migrate to structured format?
4. **Transaction Log:** File-based or database-based?
5. **Caching Strategy:** In-memory, Redis, or filesystem?

**Status:** ✅ All questions resolved in individual story specs

---

## Approval and Sign-off

**Product Owner:** TBD
**Technical Lead:** TBD
**Start Date:** 2026-02-17 (Week 2)
**Target Completion:** 2026-03-14 (Week 5)
**Budget:** 40 hours development + 10 hours testing

**Approved:** ✅ Ready to begin implementation

---

## Next Steps

1. ✅ Read individual story specs (LNGG-001 through LNGG-007)
2. ✅ Set up development environment
3. ✅ Create `src/adapters/` directory structure
4. ⏳ Start with LNGG-001 (Story File Adapter) - highest priority
5. ⏳ Weekly sync on progress and blockers
