---
story_id: LNGG-001
title: Story File Adapter - YAML Read/Write/Parse
status: backlog
created: 2026-02-13
updated: 2026-02-13
epic: LangGraph Integration Adapters
phase: 0-Infrastructure
size: medium
effort_hours: 8
complexity: medium
risk_level: high
blocked_by: []
blocks: [LNGG-002, LNGG-004, LNGG-006, LNGG-007]
---

# LNGG-001: Story File Adapter - YAML Read/Write/Parse

## Context

LangGraph workflows need to read and write story files but currently have no file I/O capabilities. Story files are YAML frontmatter + Markdown content stored in a directory structure like:

```
plans/future/{feature}/{stage}/{storyId}/{storyId}.md
```

Example:
```
plans/future/instructions/backlog/INST-1008/INST-1008.md
```

**File Format:**
```markdown
---
story_id: INST-1008
title: Wire RTK Query Mutations
status: backlog
created: 2026-02-05
# ... more frontmatter fields
---

# INST-1008: Wire RTK Query Mutations

## Context
...

## Goal
...
```

**Problem:** LangGraph workflows run in isolation and cannot:
- Read existing story files for elaboration
- Write new story files after creation
- Update story frontmatter (status, dates, etc.)
- Parse and validate YAML structure

**Impact:** Blocks all LangGraph workflow migration (LNGG-002+)

---

## Goal

Create a type-safe, Zod-validated adapter that handles all story file I/O operations for LangGraph workflows.

**Requirements:**
1. Read story files from disk and parse into typed objects
2. Write story objects to disk with proper YAML frontmatter
3. Validate story structure before read/write
4. Handle missing files, corrupted YAML, permission errors gracefully
5. Support atomic writes (no partial updates)
6. Preserve formatting and comments in existing files where possible
7. Work cross-platform (macOS, Linux, Windows)

**Success Metrics:**
- ✅ Can read 100+ story files in <5 seconds
- ✅ Can write story file in <100ms
- ✅ 100% validation coverage via Zod schemas
- ✅ Zero data loss on write failures
- ✅ Works with all existing story files without modification

---

## Scope

### Files to Create

**Primary:**
- `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` - Main adapter class
- `packages/backend/orchestrator/src/adapters/__types__/story-file.ts` - Zod schemas
- `packages/backend/orchestrator/src/adapters/__tests__/story-file-adapter.test.ts` - Unit tests
- `packages/backend/orchestrator/src/adapters/index.ts` - Barrel export

**Supporting:**
- `packages/backend/orchestrator/src/adapters/utils/yaml-parser.ts` - YAML parsing utilities
- `packages/backend/orchestrator/src/adapters/utils/frontmatter-extractor.ts` - Frontmatter extraction
- `packages/backend/orchestrator/src/adapters/utils/file-utils.ts` - Atomic write, path resolution
- `packages/backend/orchestrator/src/adapters/__tests__/fixtures/` - Test story files

### Files to Modify

- `packages/backend/orchestrator/src/index.ts` - Export StoryFileAdapter
- `packages/backend/orchestrator/package.json` - Add dependencies (js-yaml, gray-matter)

---

## Acceptance Criteria

### AC1: Read Story Files
```typescript
Given a story ID and feature directory
When StoryFileAdapter.readStory(storyId, featureDir, stage) is called
Then it returns a fully-typed Story object with:
  - Parsed frontmatter (story_id, title, status, dates, etc.)
  - Markdown content sections (Context, Goal, Scope, etc.)
  - Validation via Zod schema
  - Error handling for missing/corrupted files
```

**Test:**
```typescript
const adapter = new StoryFileAdapter('/monorepo/root')
const story = await adapter.readStory(
  'INST-1008',
  'plans/future/instructions',
  'backlog'
)

expect(story.frontmatter.story_id).toBe('INST-1008')
expect(story.frontmatter.status).toBe('backlog')
expect(story.content).toContain('## Context')
```

---

### AC2: Write Story Files
```typescript
Given a Story object
When StoryFileAdapter.writeStory(story, featureDir, stage) is called
Then it:
  - Writes file to {featureDir}/{stage}/{storyId}/{storyId}.md
  - Creates directory structure if missing
  - Writes valid YAML frontmatter
  - Writes Markdown content
  - Uses atomic write (temp file + rename)
  - Returns file path
```

**Test:**
```typescript
const story: Story = {
  frontmatter: {
    story_id: 'TEST-001',
    title: 'Test Story',
    status: 'backlog',
    created: '2026-02-13',
    // ...
  },
  content: '# TEST-001: Test Story\n\n## Context\n...'
}

const path = await adapter.writeStory(
  story,
  'plans/future/test',
  'backlog'
)

expect(path).toBe('/monorepo/root/plans/future/test/backlog/TEST-001/TEST-001.md')
expect(fs.existsSync(path)).toBe(true)

// Verify re-read matches
const reread = await adapter.readStory('TEST-001', 'plans/future/test', 'backlog')
expect(reread).toEqual(story)
```

---

### AC3: Update Story Files
```typescript
Given an existing story file
When StoryFileAdapter.updateStory(storyId, updates, featureDir, stage) is called
Then it:
  - Reads current story
  - Merges updates into frontmatter
  - Preserves existing content
  - Validates updated story
  - Writes atomically
  - Returns updated story
```

**Test:**
```typescript
await adapter.updateStory(
  'INST-1008',
  { status: 'in-progress', updated: '2026-02-13' },
  'plans/future/instructions',
  'backlog'
)

const updated = await adapter.readStory('INST-1008', 'plans/future/instructions', 'backlog')
expect(updated.frontmatter.status).toBe('in-progress')
expect(updated.frontmatter.updated).toBe('2026-02-13')
expect(updated.content).toBe(originalContent) // Content unchanged
```

---

### AC4: Validate Story Structure
```typescript
Given a story object or file path
When StoryFileAdapter.validate(story) is called
Then it:
  - Validates frontmatter schema (required fields, types)
  - Validates story_id format (PREFIX-NNNN)
  - Validates status enum values
  - Validates date formats (ISO 8601)
  - Validates content structure (required sections)
  - Returns ValidationResult with errors
```

**Test:**
```typescript
const invalid = {
  frontmatter: {
    story_id: 'invalid', // Wrong format
    title: '', // Empty
    status: 'unknown', // Invalid enum
    // missing required fields
  },
  content: 'No sections'
}

const result = adapter.validate(invalid)

expect(result.valid).toBe(false)
expect(result.errors).toContain('story_id must match PREFIX-NNNN')
expect(result.errors).toContain('title cannot be empty')
expect(result.errors).toContain('status must be one of: backlog, elaboration, ...')
```

---

### AC5: Handle Errors Gracefully
```typescript
Given various error conditions
When adapter methods are called
Then they:
  - Throw typed errors with clear messages
  - Include context (file path, story ID)
  - Suggest fixes where applicable
  - Never leave partial writes
  - Log errors for debugging
```

**Test:**
```typescript
// Missing file
await expect(
  adapter.readStory('MISSING-001', 'plans/future/test', 'backlog')
).rejects.toThrow(StoryNotFoundError)

// Corrupted YAML
await expect(
  adapter.readStory('CORRUPT-001', 'plans/future/test', 'backlog')
).rejects.toThrow(InvalidYAMLError)

// Permission denied
await expect(
  adapter.writeStory(story, '/root/forbidden', 'backlog')
).rejects.toThrow(PermissionDeniedError)

// Partial writes don't occur
const writeFailed = await adapter.writeStory(invalidStory, ...).catch(() => true)
expect(writeFailed).toBe(true)
expect(fs.existsSync(tempPath)).toBe(false) // Temp file cleaned up
```

---

### AC6: Performance Requirements
```typescript
Given 100 story files in a directory
When adapter operations are performed
Then:
  - readStory() completes in <50ms (p95)
  - writeStory() completes in <100ms (p95)
  - updateStory() completes in <150ms (p95)
  - validate() completes in <10ms (p95)
  - Batch operations support parallel reads
```

**Test:**
```typescript
const stories = generateTestStories(100)

const start = performance.now()
await Promise.all(
  stories.map(s => adapter.readStory(s.id, s.feature, s.stage))
)
const duration = performance.now() - start

expect(duration).toBeLessThan(5000) // <5s for 100 reads
expect(duration / 100).toBeLessThan(50) // <50ms per read average
```

---

## Technical Design

### Class Structure

```typescript
/**
 * Adapter for reading/writing story files with YAML frontmatter
 */
export class StoryFileAdapter {
  constructor(
    private rootDir: string,
    private options?: StoryFileAdapterOptions
  ) {}

  // Core operations
  async readStory(storyId: string, featureDir: string, stage: StoryStage): Promise<Story>
  async writeStory(story: Story, featureDir: string, stage: StoryStage): Promise<string>
  async updateStory(storyId: string, updates: Partial<StoryFrontmatter>, featureDir: string, stage: StoryStage): Promise<Story>
  async deleteStory(storyId: string, featureDir: string, stage: StoryStage): Promise<void>
  async storyExists(storyId: string, featureDir: string, stage: StoryStage): Promise<boolean>

  // Validation
  validate(story: Story): ValidationResult
  validateFrontmatter(frontmatter: unknown): ValidationResult
  validateContent(content: string): ValidationResult

  // Utilities
  resolveStoryPath(storyId: string, featureDir: string, stage: StoryStage): string
  parseStoryFile(fileContent: string): Story
  serializeStory(story: Story): string

  // Batch operations
  async readStoriesInStage(featureDir: string, stage: StoryStage): Promise<Story[]>
  async listStoryIds(featureDir: string, stage: StoryStage): Promise<string[]>
}
```

### Zod Schemas

```typescript
// Story stage enum
export const StoryStageSchema = z.enum([
  'backlog',
  'elaboration',
  'ready-to-work',
  'in-progress',
  'UAT',
  'done'
])

export type StoryStage = z.infer<typeof StoryStageSchema>

// Story status enum (different from stage)
export const StoryStatusSchema = z.enum([
  'draft',
  'backlog',
  'ready-to-work',
  'in-progress',
  'blocked',
  'UAT',
  'done',
  'cancelled'
])

export type StoryStatus = z.infer<typeof StoryStatusSchema>

// Frontmatter schema
export const StoryFrontmatterSchema = z.object({
  story_id: z.string().regex(/^[A-Z]{4}-\d{4}$/), // PREFIX-NNNN
  title: z.string().min(1),
  status: StoryStatusSchema,
  created: z.string().datetime(),
  updated: z.string().datetime(),
  epic: z.string().optional(),
  phase: z.string().optional(),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'epic']).optional(),
  effort_hours: z.number().int().min(0).optional(),
  complexity: z.enum(['trivial', 'low', 'medium', 'high', 'extreme']).optional(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  blocked_by: z.array(z.string()).default([]),
  blocks: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  assignee: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
})

export type StoryFrontmatter = z.infer<typeof StoryFrontmatterSchema>

// Full story schema
export const StorySchema = z.object({
  frontmatter: StoryFrontmatterSchema,
  content: z.string().min(1), // Markdown content
  rawYaml: z.string().optional(), // Original YAML for preservation
  filePath: z.string().optional(), // Where it was read from
})

export type Story = z.infer<typeof StorySchema>

// Validation result
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>
```

### Atomic Write Implementation

```typescript
async writeStory(story: Story, featureDir: string, stage: StoryStage): Promise<string> {
  // 1. Validate
  const validation = this.validate(story)
  if (!validation.valid) {
    throw new ValidationError(validation.errors)
  }

  // 2. Resolve paths
  const targetPath = this.resolveStoryPath(story.frontmatter.story_id, featureDir, stage)
  const targetDir = dirname(targetPath)
  const tempPath = `${targetPath}.tmp`

  try {
    // 3. Create directory
    await fs.mkdir(targetDir, { recursive: true })

    // 4. Serialize story
    const content = this.serializeStory(story)

    // 5. Write to temp file
    await fs.writeFile(tempPath, content, 'utf-8')

    // 6. Atomic rename
    await fs.rename(tempPath, targetPath)

    return targetPath
  } catch (error) {
    // 7. Cleanup on failure
    try {
      await fs.unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }
    throw new StoryWriteError(`Failed to write ${story.frontmatter.story_id}`, { cause: error })
  }
}
```

### YAML Parsing

```typescript
parseStoryFile(fileContent: string): Story {
  try {
    // Use gray-matter to parse frontmatter
    const { data, content } = grayMatter(fileContent)

    // Validate frontmatter
    const frontmatter = StoryFrontmatterSchema.parse(data)

    // Validate content structure
    this.validateContent(content)

    return {
      frontmatter,
      content: content.trim(),
      rawYaml: fileContent, // Preserve original for diffing
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map(e => e.message))
    }
    throw new InvalidYAMLError('Failed to parse story file', { cause: error })
  }
}
```

---

## Test Plan

### Unit Tests (80+ coverage)

```typescript
describe('StoryFileAdapter', () => {
  describe('readStory', () => {
    it('reads valid story file')
    it('parses frontmatter correctly')
    it('extracts content sections')
    it('throws StoryNotFoundError for missing files')
    it('throws InvalidYAMLError for corrupted YAML')
    it('throws ValidationError for invalid frontmatter')
    it('handles permission errors gracefully')
  })

  describe('writeStory', () => {
    it('writes story to correct path')
    it('creates directory structure')
    it('uses atomic write (temp + rename)')
    it('preserves frontmatter field order')
    it('cleans up temp file on failure')
    it('validates before write')
    it('returns correct file path')
  })

  describe('updateStory', () => {
    it('merges updates into existing story')
    it('preserves content unchanged')
    it('updates timestamp automatically')
    it('validates after merge')
    it('is atomic (all or nothing)')
  })

  describe('validate', () => {
    it('accepts valid story')
    it('rejects invalid story_id format')
    it('rejects empty title')
    it('rejects invalid status')
    it('rejects invalid dates')
    it('rejects missing required fields')
    it('provides clear error messages')
  })

  describe('performance', () => {
    it('reads 100 stories in <5s')
    it('writes story in <100ms')
    it('supports parallel reads')
  })
})
```

### Integration Tests

```typescript
describe('StoryFileAdapter Integration', () => {
  it('writes story and re-reads identical data')
  it('updates story preserves non-updated fields')
  it('works with real INST-1008 story file')
  it('handles concurrent writes safely')
  it('works on macOS, Linux, Windows')
})
```

### Manual Testing Checklist

- [ ] Read existing INST-1008 story file
- [ ] Write new TEST-001 story file
- [ ] Update INST-1008 status
- [ ] Verify file formatting preserved
- [ ] Test with corrupted YAML file
- [ ] Test with missing permissions
- [ ] Test with 100+ story files

---

## Dependencies

**NPM Packages:**
- `gray-matter@^4.0.3` - YAML frontmatter parsing
- `js-yaml@^4.1.0` - YAML serialization
- `zod@^3.22.0` - Schema validation (already installed)

**Internal Dependencies:**
- None (foundation adapter)

**Blocks:**
- LNGG-002 (Index Adapter) - needs story read/write
- LNGG-004 (Stage Adapter) - needs story read/write
- LNGG-006 (Checkpoint Adapter) - needs story read
- LNGG-007 (Integration Tests) - needs story read/write

---

## Non-Goals

This story does NOT include:

❌ **Story creation logic** - Only I/O, not workflow logic
❌ **Index updates** - That's LNGG-002
❌ **Stage movement** - That's LNGG-004
❌ **Checkpoint management** - That's LNGG-006
❌ **Decision prompts** - That's LNGG-003
❌ **KB writing** - That's LNGG-005
❌ **File watching** - Future enhancement
❌ **Concurrent write locking** - Assume single-writer for now
❌ **Version history** - Use git for history

---

## Error Handling

### Custom Error Classes

```typescript
export class StoryFileError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message)
    this.name = 'StoryFileError'
  }
}

export class StoryNotFoundError extends StoryFileError {
  constructor(storyId: string, featureDir: string, stage: string) {
    super(`Story not found: ${storyId}`, { storyId, featureDir, stage })
    this.name = 'StoryNotFoundError'
  }
}

export class InvalidYAMLError extends StoryFileError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'InvalidYAMLError'
  }
}

export class ValidationError extends StoryFileError {
  constructor(public errors: string[]) {
    super(`Validation failed:\n${errors.join('\n')}`)
    this.name = 'ValidationError'
  }
}

export class StoryWriteError extends StoryFileError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'StoryWriteError'
  }
}

export class PermissionDeniedError extends StoryFileError {
  constructor(path: string) {
    super(`Permission denied: ${path}`, { path })
    this.name = 'PermissionDeniedError'
  }
}
```

---

## Implementation Checklist

### Setup
- [ ] Create `src/adapters/` directory
- [ ] Install dependencies (gray-matter, js-yaml)
- [ ] Create test fixtures

### Core Implementation
- [ ] Implement StoryFileAdapter class
- [ ] Implement readStory()
- [ ] Implement writeStory()
- [ ] Implement updateStory()
- [ ] Implement validate()
- [ ] Implement error classes

### Utilities
- [ ] Implement yaml-parser.ts
- [ ] Implement frontmatter-extractor.ts
- [ ] Implement file-utils.ts (atomic write)
- [ ] Implement path resolution

### Schemas
- [ ] Define StoryFrontmatterSchema
- [ ] Define StorySchema
- [ ] Define ValidationResultSchema
- [ ] Define StoryStageSchema

### Tests
- [ ] Write unit tests (readStory)
- [ ] Write unit tests (writeStory)
- [ ] Write unit tests (updateStory)
- [ ] Write unit tests (validate)
- [ ] Write integration tests
- [ ] Write performance tests
- [ ] Add test fixtures

### Documentation
- [ ] Add JSDoc comments to all public methods
- [ ] Create usage examples
- [ ] Update src/adapters/README.md
- [ ] Add to main index.ts exports

### Quality Gates
- [ ] All tests passing
- [ ] Coverage >80%
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Manual testing complete
- [ ] Code review approved

---

## Estimated Effort

- **Design:** 1 hour
- **Implementation:** 4 hours
- **Testing:** 2 hours
- **Documentation:** 1 hour
- **Total:** **8 hours**

---

## Notes

- Preserve YAML formatting where possible (gray-matter does this)
- Use `gray-matter` for parsing, `js-yaml` for serialization
- Atomic writes prevent corruption on crash/interrupt
- Validation happens before any write operation
- All file paths are resolved from rootDir (monorepo root)
- Cross-platform path handling (use `path.join`, not string concat)

---

## References

- WORKFLOW_STATE_DIAGRAMS.md - Gap analysis section 6
- Existing story files in `plans/future/*/backlog/`
- gray-matter: https://github.com/jonschlinkert/gray-matter
- js-yaml: https://github.com/nodeca/js-yaml
