---
generated: "2026-02-13"
baseline_used: "../../baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: LNGG-0050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found in codebase, no prior lessons learned available in KB

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Deployed |
| KB Schema with vector embeddings | `apps/api/knowledge-base/src/db/schema.ts` | Active |
| `knowledgeEntries` table | PostgreSQL port 5433 | Deployed |
| `persist-learnings` node | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Implemented |
| `load-knowledge-context` node | `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` | Implemented |
| KB migration script | `apps/api/knowledge-base/src/scripts/migrate-workflow-knowledge.ts` | Implemented |
| Embedding client with OpenAI | KB service | Deployed |

### Active In-Progress Work

| Story | Title | Status | Overlap Risk |
|-------|-------|--------|--------------|
| LNGG-0030 | Decision Callback System | in-progress | Low - different subsystem |

### Constraints to Respect

**Database Schema (Protected):**
- `knowledgeEntries` table structure is production schema (do not modify)
- Vector dimension: 1536 (OpenAI text-embedding-3-small)
- Fields: `content`, `embedding`, `role`, `entryType`, `storyId`, `tags`, `verified`, `archived`, `canonicalId`, `isCanonical`

**Code Conventions (CLAUDE.md):**
- Zod-first types required (no TypeScript interfaces)
- Use `@repo/logger` for logging (never `console.log`)
- Functional components, named exports only
- No barrel files (import directly from source)
- Directory structure: `index.tsx`, `__tests__/`, `__types__/`, `utils/`

**Orchestrator Package Structure (Protected):**
- Add to `packages/backend/orchestrator/src/adapters/` (do not restructure)
- Existing adapters directory does not yet exist - will be created by LNGG stories
- LangGraph graphs at `packages/backend/orchestrator/src/graphs/` should not be modified by this story

---

## Retrieved Context

### Related Endpoints
- KB Write Functions: `apps/api/knowledge-base/src/seed/kb-bulk-import.ts` (bulk import with deduplication)
- KB Search Functions: Used by `load-knowledge-context.ts` node (exists but not in adapter form)

### Related Components

**Existing KB Writing Infrastructure:**
- `persist-learnings.ts` node: Factory pattern for creating node with KB dependencies
  - `LearningSchema`, `LearningCategorySchema` (Zod schemas)
  - `persistLearnings()` function with deduplication (>0.85 similarity threshold)
  - `formatLearningContent()`, `generateLearningTags()` helpers
  - `createPersistLearningsNode()` factory for dependency injection

- `load-knowledge-context.ts` node: Loads lessons from KB during workflow setup
  - `getLessonsFromKB()` function with KB search integration
  - `KbSearchInput`, `KbSearchResult` types
  - `getDefaultLessonsLearned()` fallback when KB unavailable

- `migrate-workflow-knowledge.ts`: YAML → KB migration script
  - `kbBulkImport()` integration
  - Content hash deduplication
  - Embedding client usage pattern

**KB Schema:**
- `knowledgeEntries` table with pgvector (1536 dimensions)
- Roles: `pm`, `dev`, `qa`, `all`
- Entry types: `note`, `decision`, `constraint`, `runbook`, `lesson`
- Tags: text[] array for categorization
- Verification fields: `verified`, `verifiedAt`, `verifiedBy`
- Compression fields: `archived`, `archivedAt`, `canonicalId`, `isCanonical`

### Reuse Candidates

**Patterns to Reuse:**
1. **Dependency Injection via Factory Pattern** (`createPersistLearningsNode()`)
   - Config object with optional `kbDeps` (db, embeddingClient, kbSearchFn, kbAddFn)
   - Graceful fallback when dependencies missing
   - Zod schema validation for config

2. **Deduplication via Similarity Search**
   - Query KB for similar content before writing
   - Threshold: 0.85 similarity score
   - Skip write if duplicate found

3. **KB Dependencies Type Pattern**
   ```typescript
   type KbDeps = {
     db: unknown
     embeddingClient: unknown
   }

   type KbAddInput = {
     content: string
     role: string
     tags?: string[]
   }

   type KbAddResult = {
     id: string
     success: boolean
     error?: string
   }
   ```

4. **Content Formatting for KB Storage**
   - Header with story ID and category: `**[STORY-ID] CATEGORY**`
   - Structured tags: `lesson-learned`, `story:xxx`, `category:xxx`, `date:YYYY-MM`

5. **Discriminated Union Result Types**
   - `{ persisted: boolean, ...metadata }` pattern from `persist-learnings.ts`

**Packages Available:**
- `zod` - Schema validation (already in orchestrator)
- `@repo/logger` - Logging (already in orchestrator)
- `drizzle-orm` - Database access (via kbDeps injection)

---

## Knowledge Context

### Lessons Learned

**Note:** No lessons loaded from Knowledge Base (KB empty for LNGG epic). Using baseline and codebase analysis.

### Blockers to Avoid (from codebase patterns)
- Hardcoding KB client creation - use dependency injection
- Skipping deduplication before write - causes KB bloat
- Not handling KB unavailability gracefully - workflow should not fail
- Embedding large files directly - embeddings are for content only (not binary data)
- Missing error handling for network/DB failures - KB writes can fail

### Architecture Decisions (ADRs)

No ADR-LOG.md file found in codebase. No architectural constraints specific to this story beyond general code conventions.

### Patterns to Follow
- **Factory pattern with dependency injection** - Seen in `createPersistLearningsNode()` and `createKnowledgeContextNode()`
- **Optional KB dependencies** - Workflow nodes must work without KB (graceful degradation)
- **Zod schema validation** - All input/output types defined via Zod
- **Deduplication before write** - Search existing KB entries to avoid duplicates
- **Structured tagging** - Use consistent tag schema for categorization
- **Discriminated unions for results** - Clear success/error states

### Patterns to Avoid
- **Direct database access in adapters** - Always inject db via kbDeps
- **Synchronous embedding generation** - Use embeddingClient (async)
- **Hardcoded role/entryType values** - Use Zod enums
- **Skipping content validation** - Always validate before KB write
- **Global singletons for KB client** - Use dependency injection

---

## Conflict Analysis

**No conflicts detected.**

---

## Story Seed

### Title
KB Writing Adapter - Unified Interface for Knowledge Base Write Operations

### Description

**Context:**

The orchestrator package currently has KB writing capabilities embedded directly in workflow nodes (`persist-learnings.ts`, `migrate-workflow-knowledge.ts`), but no unified adapter interface. As the LNGG epic builds out LangGraph infrastructure, we need a clean abstraction for KB write operations that:
1. Decouples workflow logic from KB implementation details
2. Provides a consistent interface for all KB write operations
3. Enables dependency injection for testing and flexibility
4. Handles deduplication, error handling, and logging uniformly

**Current State:**

- KB write logic exists in `persist-learnings.ts` (learnings only)
- KB schema defined at `apps/api/knowledge-base/src/db/schema.ts`
- Embedding client exists but not formalized in adapter pattern
- No centralized interface for KB writes across different entry types (lessons, decisions, constraints, etc.)

**Problem:**

Without a KB Writing Adapter:
- Workflow nodes duplicate KB write logic
- Testing requires mocking multiple KB functions independently
- No consistent deduplication strategy across all KB writes
- Error handling varies between different KB write paths
- Adding new entry types requires modifying multiple files
- No single source of truth for KB write operations

**Proposed Solution:**

Create a KB Writing Adapter at `packages/backend/orchestrator/src/adapters/kb-writer/` that:
1. Exposes a unified `KbWriter` interface with methods for each entry type
2. Handles embedding generation, deduplication, and persistence
3. Provides factory function for dependency injection
4. Supports all KB entry types: lessons, decisions, constraints, runbooks, notes
5. Includes comprehensive error handling and logging
6. Works gracefully when KB is unavailable (fallback mode)

### Initial Acceptance Criteria

- [ ] **AC-1**: Define `KbWriter` interface with Zod schemas
  - Write methods: `addLesson()`, `addDecision()`, `addConstraint()`, `addRunbook()`, `addNote()`
  - All inputs/outputs use Zod schemas (no TypeScript interfaces)
  - Support batch writes: `addMany()` method

- [ ] **AC-2**: Implement `KbWriterAdapter` class with deduplication
  - Query KB for similar content (cosine similarity > 0.85 threshold)
  - Skip writes for duplicates, return metadata (skipped count)
  - Use embeddingClient for vector generation
  - Log all write operations via `@repo/logger`

- [ ] **AC-3**: Create factory function `createKbWriter()` with dependency injection
  - Accept config: `{ kbDeps?: { db, embeddingClient, kbAddFn?, kbSearchFn? } }`
  - Return no-op writer when dependencies missing (graceful fallback)
  - Validate config with Zod schema

- [ ] **AC-4**: Add helper functions for content formatting
  - `formatLearning()`, `formatDecision()`, `formatConstraint()`, etc.
  - `generateTags()` for each entry type
  - Consistent header format: `**[STORY-ID] TYPE**`

- [ ] **AC-5**: Support all KB entry types from schema
  - `entryType`: `note`, `decision`, `constraint`, `runbook`, `lesson`
  - `role`: `pm`, `dev`, `qa`, `all`
  - Optional fields: `storyId`, `tags`, `verified`

- [ ] **AC-6**: Write comprehensive unit tests (>80% coverage)
  - Test deduplication logic (similarity threshold)
  - Test error handling (DB failures, embedding failures)
  - Test graceful fallback when KB unavailable
  - Test batch writes with partial failures
  - Mock KB dependencies (db, embeddingClient)

- [ ] **AC-7**: Add integration tests with real KB schema
  - Test end-to-end write to KB with deduplication
  - Test similarity search before write
  - Test content hash generation
  - Verify embeddings stored correctly (1536 dimensions)

### Non-Goals

**Explicitly Out of Scope:**
- KB read operations (separate adapter, may already exist in `load-knowledge-context.ts`)
- KB compression/archiving (separate story in WINT epic)
- KB verification workflows (separate story)
- Migration from YAML files (already implemented in `migrate-workflow-knowledge.ts`)
- Web API endpoints for KB writes (backend-only adapter)
- Multi-tenancy support (single KB for now)
- Custom embedding models (OpenAI text-embedding-3-small only)

**Protected Features (Do Not Modify):**
- KB database schema (`apps/api/knowledge-base/src/db/schema.ts`)
- Existing `persist-learnings.ts` node (may refactor to use adapter later)
- `load-knowledge-context.ts` node (read operations)
- KB migration script functionality

**Deferred Work:**
- Refactoring existing nodes to use new adapter (follow-up story)
- KB read adapter standardization (separate story)
- Batch processing optimizations (defer to performance story)

### Reuse Plan

**Components to Reuse:**
- Deduplication logic from `persist-learnings.ts` (`kbSearchFn` pattern)
- Content formatting from `formatLearningContent()` and `generateLearningTags()`
- KB dependency types (`KbDeps`, `KbAddInput`, `KbAddResult`)
- Factory pattern from `createPersistLearningsNode()`
- Zod schemas for config validation

**Patterns to Reuse:**
- Dependency injection via config object
- Optional KB dependencies with graceful fallback
- Discriminated union result types
- Similarity-based deduplication (>0.85 threshold)
- Structured tagging schema

**Packages to Leverage:**
- `zod` (schema validation)
- `@repo/logger` (logging)
- `drizzle-orm` (via injected db dependency)
- Embedding client (via injected embeddingClient dependency)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Focus Areas:**
1. **Deduplication Logic**: Critical to test similarity threshold edge cases (0.84, 0.85, 0.86)
2. **Error Handling**: KB writes can fail - test network errors, DB errors, embedding errors
3. **Batch Operations**: Test partial failures in batch writes (some succeed, some fail)
4. **Graceful Degradation**: Verify no-op writer works when KB unavailable
5. **Schema Validation**: Test invalid inputs are rejected with clear Zod errors

**Integration Testing:**
- Requires real KB instance (port 5433) with `knowledgeEntries` table
- Test with actual OpenAI embedding generation (or mock embeddingClient)
- Verify IVFFlat vector index works with inserted embeddings

**Performance Considerations:**
- Batch writes should be faster than individual writes (single DB transaction)
- Embedding generation is slow (~100ms per call) - consider batching
- Similarity search scales with KB size (may need optimization at >10k entries)

### For UI/UX Advisor

**Note:** This story is backend-only (no UI component). The adapter will be used by workflow nodes which may have CLI output.

**Logging UX:**
- Use `@repo/logger.info()` for successful writes (include KB entry ID)
- Use `@repo/logger.warn()` for duplicates skipped (include similarity score)
- Use `@repo/logger.error()` for failures (include error details)
- Log batch operation summaries (total, succeeded, failed, skipped)

### For Dev Feasibility

**Technical Risks:**

1. **Embedding Generation Performance**
   - Risk: OpenAI API latency (100-200ms per call)
   - Mitigation: Support batch embedding calls in future (deferred for now)

2. **KB Deduplication at Scale**
   - Risk: Similarity search slows down with large KB (>10k entries)
   - Mitigation: IVFFlat index already configured, acceptable for initial implementation

3. **Dependency Injection Complexity**
   - Risk: Many optional dependencies (db, embeddingClient, kbAddFn, kbSearchFn)
   - Mitigation: Zod schema validation catches missing dependencies early

**Implementation Notes:**
- Use factory pattern consistently (same as `createPersistLearningsNode()`)
- Deduplication threshold (0.85) is hardcoded for now (no config override needed)
- KB write failures should not crash workflow - log error and return failure result
- No retry logic needed initially (defer to reliability story)

**File Structure:**
```
packages/backend/orchestrator/src/adapters/kb-writer/
├── index.ts              # Main exports
├── __types__/
│   └── index.ts          # Zod schemas (KbWriterConfig, KbWriteRequest, KbWriteResult)
├── kb-writer-adapter.ts  # Implementation class
├── factory.ts            # createKbWriter() factory
├── utils/
│   ├── content-formatter.ts  # formatLesson(), formatDecision(), etc.
│   ├── tag-generator.ts      # generateTags() for each type
│   └── index.ts
└── __tests__/
    ├── kb-writer-adapter.test.ts
    ├── factory.test.ts
    ├── content-formatter.test.ts
    ├── tag-generator.test.ts
    └── integration.test.ts
```

**Dependencies:**
- Existing: `zod`, `@repo/logger`, `drizzle-orm`
- No new packages needed

---

## Completion Signal

STORY-SEED COMPLETE
