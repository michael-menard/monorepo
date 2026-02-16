---
story_id: LNGG-006
title: Checkpoint Adapter - Resume Support
status: backlog
created: 2026-02-13
updated: 2026-02-13
epic: LangGraph Integration Adapters
phase: 1-Enhancement
size: small
effort_hours: 4
complexity: low
risk_level: low
blocked_by: [LNGG-001]
blocks: [LNGG-007]
priority: P1
---

# LNGG-006: Checkpoint Adapter - Resume Support

## Context

Claude Code workflows write `CHECKPOINT.md` files to track workflow progress, phase completion, and enable resume capability:

```markdown
# Checkpoint: INST-1008

## Phase 0: Setup
✅ COMPLETED - 2026-02-10 15:32:45
- Story file validated
- Dependencies checked
- Tokens used: 2,450

## Phase 1: Elaboration
✅ COMPLETED - 2026-02-10 15:45:22
- PM gaps analyzed: 3 found
- UX review completed
- Tokens used: 8,920

## Phase 2: Implementation
⏳ IN PROGRESS - Started 2026-02-10 16:00:00
- Backend code: ✅
- Frontend code: ⏳
- Tests: ⏳
- Tokens used: 12,340

## Resume Info
- Last phase: 2-Implementation
- Next step: Complete frontend code
- Total tokens: 23,710
```

**Problem:** LangGraph has no checkpoint persistence. If a workflow fails or is interrupted, all progress is lost. No ability to resume from last completed phase.

**Impact:** Wasted tokens, lost work, poor developer experience when debugging long workflows.

---

## Goal

Create adapter for reading/writing checkpoint files with:
1. Phase tracking (completed, in-progress, pending)
2. Token usage logging per phase
3. Resume-from support
4. Workflow metadata capture
5. Atomic updates

---

## Acceptance Criteria

### AC1: Write Checkpoint
```typescript
Given a workflow in progress
When CheckpointAdapter.writeCheckpoint(checkpoint, featureDir, storyId) is called
Then it:
  - Creates/updates CHECKPOINT.md file
  - Records phase status and timestamps
  - Logs token usage
  - Preserves formatting
  - Writes atomically
```

**Test:**
```typescript
const adapter = new CheckpointAdapter('/monorepo/root')

await adapter.writeCheckpoint({
  storyId: 'INST-1008',
  phases: [
    {
      id: 0,
      name: 'Setup',
      status: 'completed',
      completedAt: '2026-02-10T15:32:45Z',
      tokensUsed: 2450,
      notes: ['Story file validated', 'Dependencies checked']
    },
    {
      id: 1,
      name: 'Elaboration',
      status: 'in-progress',
      startedAt: '2026-02-10T15:35:00Z',
      tokensUsed: 5200
    }
  ],
  resumeInfo: {
    lastPhase: 1,
    nextStep: 'Complete PM gap analysis'
  },
  totalTokens: 7650
}, 'plans/future/instructions', 'INST-1008')

const checkpoint = await adapter.readCheckpoint('plans/future/instructions', 'INST-1008')
expect(checkpoint.phases[0].status).toBe('completed')
expect(checkpoint.totalTokens).toBe(7650)
```

---

### AC2: Read Checkpoint
```typescript
Given an existing CHECKPOINT.md file
When CheckpointAdapter.readCheckpoint(featureDir, storyId) is called
Then it:
  - Parses checkpoint file
  - Returns structured Checkpoint object
  - Validates schema
  - Returns null if file doesn't exist
```

**Test:**
```typescript
const checkpoint = await adapter.readCheckpoint('plans/future/instructions', 'INST-1008')

expect(checkpoint).toBeDefined()
expect(checkpoint.storyId).toBe('INST-1008')
expect(checkpoint.phases).toHaveLength(3)
expect(checkpoint.resumeInfo.lastPhase).toBe(2)
```

---

### AC3: Update Phase Status
```typescript
Given an existing checkpoint
When CheckpointAdapter.updatePhase(storyId, phaseId, updates, featureDir) is called
Then it:
  - Updates specific phase status
  - Updates timestamps
  - Increments token count
  - Preserves other phases
  - Writes atomically
```

**Test:**
```typescript
await adapter.updatePhase('INST-1008', 1, {
  status: 'completed',
  completedAt: '2026-02-10T15:45:22Z',
  tokensUsed: 8920,
  notes: ['PM gaps analyzed: 3 found', 'UX review completed']
}, 'plans/future/instructions')

const checkpoint = await adapter.readCheckpoint('plans/future/instructions', 'INST-1008')
const phase = checkpoint.phases.find(p => p.id === 1)

expect(phase.status).toBe('completed')
expect(phase.completedAt).toBe('2026-02-10T15:45:22Z')
expect(phase.tokensUsed).toBe(8920)
```

---

### AC4: Resume Support
```typescript
Given a checkpoint with completed/failed phases
When CheckpointAdapter.getResumePoint(featureDir, storyId) is called
Then it:
  - Returns last completed phase
  - Returns next phase to execute
  - Includes resume context
  - Handles edge cases (all done, all pending)
```

**Test:**
```typescript
const resumePoint = await adapter.getResumePoint('plans/future/instructions', 'INST-1008')

expect(resumePoint.lastCompletedPhase).toBe(1)
expect(resumePoint.nextPhase).toBe(2)
expect(resumePoint.context.totalTokensUsed).toBe(11370)
expect(resumePoint.canResume).toBe(true)
```

---

### AC5: Token Tracking
```typescript
Given checkpoint updates
When tokens are logged
Then it:
  - Tracks tokens per phase
  - Calculates cumulative total
  - Updates checkpoint file
  - Provides token breakdown
```

**Test:**
```typescript
await adapter.logTokens('INST-1008', 2, 4500, 'plans/future/instructions')

const checkpoint = await adapter.readCheckpoint('plans/future/instructions', 'INST-1008')

expect(checkpoint.totalTokens).toBe(15870) // 11370 + 4500
expect(checkpoint.phases.find(p => p.id === 2).tokensUsed).toBe(4500)
```

---

## Technical Design

### Class Structure

```typescript
export class CheckpointAdapter {
  constructor(
    private rootDir: string,
    private storyFileAdapter?: StoryFileAdapter
  ) {}

  // Core operations
  async readCheckpoint(featureDir: string, storyId: string): Promise<Checkpoint | null>
  async writeCheckpoint(checkpoint: Checkpoint, featureDir: string, storyId: string): Promise<void>
  async updatePhase(
    storyId: string,
    phaseId: number,
    updates: PhaseUpdate,
    featureDir: string
  ): Promise<void>
  async logTokens(storyId: string, phaseId: number, tokens: number, featureDir: string): Promise<void>

  // Resume support
  async getResumePoint(featureDir: string, storyId: string): Promise<ResumePoint>
  async markPhaseComplete(storyId: string, phaseId: number, featureDir: string, notes?: string[]): Promise<void>
  async markPhaseFailed(storyId: string, phaseId: number, featureDir: string, error: string): Promise<void>

  // Utilities
  resolveCheckpointPath(featureDir: string, storyId: string): string
  parseCheckpointFile(content: string): Checkpoint
  serializeCheckpoint(checkpoint: Checkpoint): string
  validate(checkpoint: Checkpoint): ValidationResult
}
```

### Zod Schemas

```typescript
export const PhaseStatusSchema = z.enum(['pending', 'in-progress', 'completed', 'failed', 'skipped'])

export const CheckpointPhaseSchema = z.object({
  id: z.number().int().min(0),
  name: z.string(),
  status: PhaseStatusSchema,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  failedAt: z.string().datetime().optional(),
  tokensUsed: z.number().int().min(0).default(0),
  notes: z.array(z.string()).default([]),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type CheckpointPhase = z.infer<typeof CheckpointPhaseSchema>

export const ResumeInfoSchema = z.object({
  lastPhase: z.number().int().min(0),
  nextPhase: z.number().int().min(0).optional(),
  nextStep: z.string().optional(),
  canAutoResume: z.boolean().default(true),
  blockedReason: z.string().optional(),
})

export type ResumeInfo = z.infer<typeof ResumeInfoSchema>

export const CheckpointSchema = z.object({
  storyId: z.string().regex(/^[A-Z]{4}-\d{4}$/),
  workflowName: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  phases: z.array(CheckpointPhaseSchema),
  resumeInfo: ResumeInfoSchema,
  totalTokens: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).optional(),
})

export type Checkpoint = z.infer<typeof CheckpointSchema>

export const ResumePointSchema = z.object({
  lastCompletedPhase: z.number().int().min(-1), // -1 = none completed
  nextPhase: z.number().int().min(0).optional(),
  canResume: z.boolean(),
  reason: z.string().optional(), // If canResume=false, why?
  context: z.object({
    totalTokensUsed: z.number().int(),
    phasesCompleted: z.number().int(),
    phasesRemaining: z.number().int(),
    lastUpdate: z.string().datetime(),
  }),
})

export type ResumePoint = z.infer<typeof ResumePointSchema>
```

### Implementation Details

```typescript
export class CheckpointAdapter {
  constructor(
    private rootDir: string,
    private storyFileAdapter?: StoryFileAdapter
  ) {}

  async readCheckpoint(featureDir: string, storyId: string): Promise<Checkpoint | null> {
    const checkpointPath = this.resolveCheckpointPath(featureDir, storyId)

    if (!await fs.exists(checkpointPath)) {
      return null
    }

    const content = await fs.readFile(checkpointPath, 'utf-8')
    const checkpoint = this.parseCheckpointFile(content)

    // Validate
    const validation = this.validate(checkpoint)
    if (!validation.valid) {
      throw new InvalidCheckpointError(storyId, validation.errors)
    }

    return checkpoint
  }

  async writeCheckpoint(checkpoint: Checkpoint, featureDir: string, storyId: string): Promise<void> {
    // Validate before write
    const validation = this.validate(checkpoint)
    if (!validation.valid) {
      throw new InvalidCheckpointError(storyId, validation.errors)
    }

    const checkpointPath = this.resolveCheckpointPath(featureDir, storyId)
    const content = this.serializeCheckpoint(checkpoint)

    // Atomic write
    const tempPath = `${checkpointPath}.tmp`
    try {
      await fs.writeFile(tempPath, content, 'utf-8')
      await fs.rename(tempPath, checkpointPath)
    } catch (error) {
      await fs.rm(tempPath, { force: true })
      throw new CheckpointWriteError(storyId, { cause: error })
    }
  }

  async updatePhase(
    storyId: string,
    phaseId: number,
    updates: Partial<CheckpointPhase>,
    featureDir: string
  ): Promise<void> {
    const checkpoint = await this.readCheckpoint(featureDir, storyId)
    if (!checkpoint) {
      throw new CheckpointNotFoundError(storyId, featureDir)
    }

    const phase = checkpoint.phases.find(p => p.id === phaseId)
    if (!phase) {
      throw new PhaseNotFoundError(storyId, phaseId)
    }

    // Update phase
    Object.assign(phase, updates)
    checkpoint.updatedAt = new Date().toISOString()

    // Recalculate resume info
    checkpoint.resumeInfo = this.calculateResumeInfo(checkpoint.phases)

    // Recalculate total tokens
    checkpoint.totalTokens = checkpoint.phases.reduce((sum, p) => sum + p.tokensUsed, 0)

    await this.writeCheckpoint(checkpoint, featureDir, storyId)
  }

  async getResumePoint(featureDir: string, storyId: string): Promise<ResumePoint> {
    const checkpoint = await this.readCheckpoint(featureDir, storyId)

    if (!checkpoint) {
      return {
        lastCompletedPhase: -1,
        canResume: false,
        reason: 'No checkpoint found',
        context: {
          totalTokensUsed: 0,
          phasesCompleted: 0,
          phasesRemaining: 0,
          lastUpdate: new Date().toISOString(),
        },
      }
    }

    const completedPhases = checkpoint.phases.filter(p => p.status === 'completed')
    const failedPhases = checkpoint.phases.filter(p => p.status === 'failed')
    const pendingPhases = checkpoint.phases.filter(p =>
      p.status === 'pending' || p.status === 'in-progress'
    )

    const lastCompletedPhase = completedPhases.length > 0
      ? Math.max(...completedPhases.map(p => p.id))
      : -1

    const nextPhase = pendingPhases.length > 0
      ? Math.min(...pendingPhases.map(p => p.id))
      : undefined

    const canResume = failedPhases.length === 0 && pendingPhases.length > 0

    return {
      lastCompletedPhase,
      nextPhase,
      canResume,
      reason: canResume ? undefined : (failedPhases.length > 0 ? 'Phase failed' : 'All phases complete'),
      context: {
        totalTokensUsed: checkpoint.totalTokens,
        phasesCompleted: completedPhases.length,
        phasesRemaining: pendingPhases.length,
        lastUpdate: checkpoint.updatedAt,
      },
    }
  }

  private calculateResumeInfo(phases: CheckpointPhase[]): ResumeInfo {
    const completedPhases = phases.filter(p => p.status === 'completed')
    const lastCompleted = completedPhases.length > 0
      ? Math.max(...completedPhases.map(p => p.id))
      : -1

    const nextPhase = phases.find(p =>
      p.status === 'pending' || p.status === 'in-progress'
    )

    const failedPhases = phases.filter(p => p.status === 'failed')
    const canAutoResume = failedPhases.length === 0

    return {
      lastPhase: lastCompleted,
      nextPhase: nextPhase?.id,
      nextStep: nextPhase ? `Execute ${nextPhase.name}` : undefined,
      canAutoResume,
      blockedReason: failedPhases.length > 0
        ? `Phase ${failedPhases[0].id} failed: ${failedPhases[0].error}`
        : undefined,
    }
  }

  serializeCheckpoint(checkpoint: Checkpoint): string {
    const lines = [
      `# Checkpoint: ${checkpoint.storyId}`,
      '',
      `**Workflow:** ${checkpoint.workflowName || 'Unknown'}`,
      `**Created:** ${checkpoint.createdAt}`,
      `**Updated:** ${checkpoint.updatedAt}`,
      `**Total Tokens:** ${checkpoint.totalTokens.toLocaleString()}`,
      '',
    ]

    // Phases
    for (const phase of checkpoint.phases) {
      const icon = phase.status === 'completed' ? '✅'
        : phase.status === 'in-progress' ? '⏳'
        : phase.status === 'failed' ? '❌'
        : '⏸️'

      lines.push(`## Phase ${phase.id}: ${phase.name}`)
      lines.push(`${icon} ${phase.status.toUpperCase()}${phase.completedAt ? ` - ${phase.completedAt}` : ''}`)

      if (phase.notes.length > 0) {
        phase.notes.forEach(note => lines.push(`- ${note}`))
      }

      if (phase.tokensUsed > 0) {
        lines.push(`- Tokens used: ${phase.tokensUsed.toLocaleString()}`)
      }

      if (phase.error) {
        lines.push(`- **Error:** ${phase.error}`)
      }

      lines.push('')
    }

    // Resume info
    lines.push('## Resume Info')
    lines.push(`- Last phase: ${checkpoint.resumeInfo.lastPhase}`)
    if (checkpoint.resumeInfo.nextPhase !== undefined) {
      lines.push(`- Next phase: ${checkpoint.resumeInfo.nextPhase}`)
    }
    if (checkpoint.resumeInfo.nextStep) {
      lines.push(`- Next step: ${checkpoint.resumeInfo.nextStep}`)
    }
    lines.push(`- Can auto-resume: ${checkpoint.resumeInfo.canAutoResume ? 'Yes' : 'No'}`)
    if (checkpoint.resumeInfo.blockedReason) {
      lines.push(`- Blocked: ${checkpoint.resumeInfo.blockedReason}`)
    }

    return lines.join('\n')
  }

  parseCheckpointFile(content: string): Checkpoint {
    // Simplified parser - real implementation would be more robust
    const lines = content.split('\n')

    // Extract metadata
    const storyIdMatch = content.match(/# Checkpoint: ([A-Z]{4}-\d{4})/)
    if (!storyIdMatch) {
      throw new Error('Invalid checkpoint: missing story ID')
    }

    // Parse phases and resume info from markdown
    // This is a simplified version - real implementation would parse all fields

    return CheckpointSchema.parse({
      storyId: storyIdMatch[1],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phases: [],
      resumeInfo: {
        lastPhase: -1,
      },
      totalTokens: 0,
    })
  }

  resolveCheckpointPath(featureDir: string, storyId: string): string {
    // Checkpoints live in the story directory
    return path.join(this.rootDir, featureDir, storyId, 'CHECKPOINT.md')
  }

  validate(checkpoint: Checkpoint): ValidationResult {
    try {
      CheckpointSchema.parse(checkpoint)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        }
      }
      return { valid: false, errors: [error.message] }
    }
  }
}
```

---

## Test Plan

```typescript
describe('CheckpointAdapter', () => {
  describe('readCheckpoint', () => {
    it('reads existing checkpoint file')
    it('returns null if file does not exist')
    it('validates checkpoint schema')
    it('throws on invalid checkpoint')
  })

  describe('writeCheckpoint', () => {
    it('writes checkpoint file atomically')
    it('creates parent directory if needed')
    it('validates before write')
    it('formats markdown correctly')
  })

  describe('updatePhase', () => {
    it('updates phase status')
    it('updates timestamps')
    it('recalculates total tokens')
    it('updates resume info')
    it('preserves other phases')
  })

  describe('getResumePoint', () => {
    it('returns last completed phase')
    it('returns next phase to execute')
    it('handles no completed phases')
    it('handles all phases complete')
    it('handles failed phase')
  })

  describe('logTokens', () => {
    it('increments phase tokens')
    it('updates total tokens')
    it('preserves other data')
  })

  describe('markPhaseComplete', () => {
    it('sets status to completed')
    it('records completion timestamp')
    it('updates resume info')
  })

  describe('serializeCheckpoint', () => {
    it('formats markdown with all fields')
    it('includes phase icons')
    it('formats token counts with commas')
    it('includes resume info section')
  })
})
```

---

## Dependencies

- LNGG-001 (Story File Adapter) - for story directory resolution

**NPM Packages:**
- `gray-matter` (already used by StoryFileAdapter)

---

## Non-Goals

❌ **Version history** - Just latest checkpoint, no history
❌ **Distributed checkpoints** - Single-machine only
❌ **Checkpoint compression** - Store full data
❌ **Checkpoint encryption** - Plain text files
❌ **Multi-workflow checkpoints** - One checkpoint per story

---

## Estimated Effort

**4 hours** (simple file I/O, validation, formatting)

