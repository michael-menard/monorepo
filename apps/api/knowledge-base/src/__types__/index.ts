/**
 * Knowledge Base Type Schemas
 *
 * Zod schemas for runtime validation of knowledge entries and embeddings.
 * All types are inferred from Zod schemas following monorepo conventions.
 *
 * @see CLAUDE.md for Zod-first types requirement
 */

import { z } from 'zod'

/**
 * Valid roles for knowledge entries.
 *
 * - 'pm': Product manager knowledge
 * - 'dev': Developer knowledge
 * - 'qa': QA/testing knowledge
 * - 'all': Universal knowledge applicable to all roles
 */
export const KnowledgeRoleSchema = z.enum(['pm', 'dev', 'qa', 'all'])
export type KnowledgeRole = z.infer<typeof KnowledgeRoleSchema>

/**
 * Valid entry types for knowledge entries.
 *
 * Part of the KBMEM 3-bucket memory architecture:
 * - 'note': General notes and documentation (default)
 * - 'decision': Architecture Decision Records (ADRs)
 * - 'constraint': Project/epic/story constraints
 * - 'runbook': Step-by-step operational procedures
 * - 'lesson': Lessons learned from implementation
 *
 * @see KBMEM-001 for implementation details
 * @see plans/future/kb-memory-architecture/PLAN.md
 */
export const KnowledgeEntryTypeSchema = z.enum([
  'note',
  'decision',
  'constraint',
  'runbook',
  'lesson',
  'feedback',
  'calibration',
])
export type KnowledgeEntryType = z.infer<typeof KnowledgeEntryTypeSchema>

// ============================================================================
// Feedback Schemas (WKFL-004 - Human Feedback Capture)
// ============================================================================

/**
 * Valid feedback types for agent finding feedback.
 *
 * Part of the WKFL-004 workflow learning system:
 * - 'false_positive': Finding was incorrect or not applicable
 * - 'helpful': Finding was accurate and valuable
 * - 'missing': Finding should have caught more issues
 * - 'severity_wrong': Finding severity was inaccurate
 *
 * @see WKFL-004 for implementation details
 */
export const FeedbackTypeSchema = z.enum(['false_positive', 'helpful', 'missing', 'severity_wrong'])
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>

/**
 * Valid severity levels for findings (used in feedback).
 */
export const FindingSeveritySchema = z.enum(['critical', 'high', 'medium', 'low'])
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>

/**
 * Feedback content schema for human judgment on agent findings.
 *
 * Used to capture explicit feedback on verification findings,
 * enabling calibration and heuristic improvement.
 *
 * @see WKFL-004 AC-1 through AC-5
 */
export const FeedbackContentSchema = z
  .object({
    /** Finding identifier from VERIFICATION.yaml */
    finding_id: z.string().min(1, 'Finding ID required'),

    /** Agent that generated the finding */
    agent_id: z.string().min(1, 'Agent ID required'),

    /** Story context for the finding */
    story_id: z.string().min(1, 'Story ID required'),

    /** Type of feedback being provided */
    feedback_type: FeedbackTypeSchema,

    /** Original severity from the finding */
    original_severity: FindingSeveritySchema.optional(),

    /** Suggested corrected severity (required for severity_wrong feedback) */
    suggested_severity: FindingSeveritySchema.optional(),

    /** Human explanation/context for the feedback */
    note: z.string(),

    /** ISO 8601 timestamp when feedback was created */
    created_at: z.string().datetime(),
  })
  .refine(
    data => {
      // severity_wrong feedback MUST include suggested_severity
      if (data.feedback_type === 'severity_wrong' && !data.suggested_severity) {
        return false
      }
      return true
    },
    {
      message: 'suggested_severity is required when feedback_type is severity_wrong',
      path: ['suggested_severity'],
    },
  )

export type FeedbackContent = z.infer<typeof FeedbackContentSchema>

// ============================================================================
// Calibration Schemas (WKFL-002 - Confidence Calibration)
// ============================================================================

/**
 * Valid confidence levels for agent findings.
 *
 * Part of the WKFL-002 confidence calibration system:
 * - 'high': Agent was very confident in the finding
 * - 'medium': Agent had moderate confidence
 * - 'low': Agent flagged with low confidence
 *
 * @see WKFL-002 for implementation details
 */
export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low'])
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>

/**
 * Valid actual outcomes for calibration.
 *
 * Part of the WKFL-002 confidence calibration system:
 * - 'correct': Finding was accurate and valuable
 * - 'false_positive': Finding was incorrect or not applicable
 * - 'severity_wrong': Finding severity was inaccurate
 *
 * @see WKFL-002 for implementation details
 */
export const ActualOutcomeSchema = z.enum(['correct', 'false_positive', 'severity_wrong'])
export type ActualOutcome = z.infer<typeof ActualOutcomeSchema>

/**
 * Calibration entry schema for tracking agent confidence accuracy.
 *
 * Used to measure how well agent confidence levels match actual outcomes,
 * enabling threshold adjustment and heuristic improvement.
 *
 * @see WKFL-002 AC-1 through AC-5
 */
export const CalibrationEntrySchema = z.object({
  /** Agent that generated the finding */
  agent_id: z.string().min(1, 'Agent ID required'),

  /** Finding identifier from VERIFICATION.yaml */
  finding_id: z.string().min(1, 'Finding ID required'),

  /** Story context for the finding */
  story_id: z.string().min(1, 'Story ID required'),

  /** Confidence level stated by the agent */
  stated_confidence: ConfidenceLevelSchema,

  /** Actual outcome after human review */
  actual_outcome: ActualOutcomeSchema,

  /** ISO 8601 timestamp when calibration was recorded */
  timestamp: z.string().datetime(),
})

export type CalibrationEntry = z.infer<typeof CalibrationEntrySchema>

// ============================================================================
// Proposal Schemas (WKFL-010 - Improvement Proposal Generator)
// ============================================================================

/**
 * Valid proposal status values.
 *
 * Part of the WKFL-010 improvement proposal tracking system:
 * - 'proposed': Initial state, awaiting review
 * - 'accepted': Proposal approved for implementation
 * - 'rejected': Proposal declined
 * - 'implemented': Proposal has been applied to workflow
 *
 * @see WKFL-010 for implementation details
 */
export const ProposalStatusSchema = z.enum(['proposed', 'accepted', 'rejected', 'implemented'])
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>

/**
 * Valid impact levels for proposals.
 *
 * Used in ROI calculation: (impact/effort) * (10/9)
 * - 'high': Major improvement potential (score: 9)
 * - 'medium': Moderate improvement (score: 5)
 * - 'low': Minor improvement (score: 2)
 */
export const ProposalImpactSchema = z.enum(['high', 'medium', 'low'])
export type ProposalImpact = z.infer<typeof ProposalImpactSchema>

/**
 * Valid effort levels for proposals.
 *
 * Used in ROI calculation: (impact/effort) * (10/9)
 * - 'low': Quick change (score: 1)
 * - 'medium': Moderate work (score: 3)
 * - 'high': Significant effort (score: 9)
 */
export const ProposalEffortSchema = z.enum(['low', 'medium', 'high'])
export type ProposalEffort = z.infer<typeof ProposalEffortSchema>

/**
 * Valid proposal sources.
 *
 * Tracks which learning component generated the proposal:
 * - 'calibration': From confidence calibration analysis (WKFL-002)
 * - 'pattern': From pattern mining (WKFL-006)
 * - 'heuristic': From heuristic evolution (WKFL-003)
 * - 'experiment': From A/B testing (WKFL-008)
 * - 'feedback': From human feedback (WKFL-004)
 * - 'retro': From workflow retrospectives (WKFL-001)
 */
export const ProposalSourceSchema = z.enum([
  'calibration',
  'pattern',
  'heuristic',
  'experiment',
  'feedback',
  'retro',
])
export type ProposalSource = z.infer<typeof ProposalSourceSchema>

/**
 * Proposal entry schema for tracking workflow improvement proposals.
 *
 * Used to persist proposals from improvement-proposer agent,
 * enabling lifecycle tracking and meta-learning.
 *
 * @see WKFL-010 AC-1 through AC-5
 */
export const ProposalEntrySchema = z.object({
  /** Unique proposal ID (e.g., P-001, P-042) */
  proposal_id: z.string().min(1, 'Proposal ID required'),

  /** Proposal title (1-2 sentences) */
  title: z.string().min(1, 'Title required'),

  /** Source learning component that generated the proposal */
  source: ProposalSourceSchema,

  /** Current proposal status */
  status: ProposalStatusSchema,

  /** Impact level for ROI calculation */
  impact: ProposalImpactSchema,

  /** Effort level for ROI calculation */
  effort: ProposalEffortSchema,

  /** ROI score: (impact/effort) * (10/9), range 2.2-10.0 */
  roi_score: z.number().min(0).max(10),

  /** Evidence backing the proposal (sample count, correlation, etc.) */
  evidence: z.string().optional(),

  /** ISO 8601 timestamp when proposal was created */
  created_at: z.string().datetime(),

  /** ISO 8601 timestamp when proposal was accepted */
  accepted_at: z.string().datetime().optional().nullable(),

  /** ISO 8601 timestamp when proposal was implemented */
  implemented_at: z.string().datetime().optional().nullable(),

  /** Reason for rejection (required if status is 'rejected') */
  rejection_reason: z.string().optional().nullable(),

  /** Tags for categorization and querying */
  tags: z.array(z.string()).optional().default([]),
})

export type ProposalEntry = z.infer<typeof ProposalEntrySchema>

/**
 * Vector embedding schema.
 *
 * Validates that embedding is an array of numbers with exactly 1536 dimensions
 * (matching OpenAI text-embedding-3-small output).
 */
export const EmbeddingSchema = z
  .array(z.number())
  .length(1536, 'Embedding must have exactly 1536 dimensions (OpenAI text-embedding-3-small)')

export type Embedding = z.infer<typeof EmbeddingSchema>

/**
 * Knowledge entry schema for validation.
 *
 * Used for validating knowledge entries before database operations.
 */
export const KnowledgeEntrySchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1, 'Content cannot be empty'),
  embedding: EmbeddingSchema,
  role: KnowledgeRoleSchema,
  entryType: KnowledgeEntryTypeSchema.optional().default('note'),
  storyId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  verified: z.boolean().optional().default(false),
  verifiedAt: z.date().optional().nullable(),
  verifiedBy: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export type KnowledgeEntryInput = z.infer<typeof KnowledgeEntrySchema>

/**
 * Schema for creating a new knowledge entry.
 *
 * Excludes auto-generated fields (id, timestamps).
 */
export const NewKnowledgeEntrySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  embedding: EmbeddingSchema,
  role: KnowledgeRoleSchema,
  entryType: KnowledgeEntryTypeSchema.optional().default('note'),
  storyId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
})

export type NewKnowledgeEntryInput = z.infer<typeof NewKnowledgeEntrySchema>

/**
 * Schema for updating a knowledge entry.
 *
 * All fields are optional to support partial updates.
 */
export const UpdateKnowledgeEntrySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').optional(),
  embedding: EmbeddingSchema.optional(),
  role: KnowledgeRoleSchema.optional(),
  entryType: KnowledgeEntryTypeSchema.optional(),
  storyId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  verified: z.boolean().optional(),
  verifiedAt: z.date().optional().nullable(),
  verifiedBy: z.string().optional().nullable(),
})

export type UpdateKnowledgeEntryInput = z.infer<typeof UpdateKnowledgeEntrySchema>

/**
 * Embedding cache entry schema.
 */
export const EmbeddingCacheEntrySchema = z.object({
  contentHash: z.string().min(1, 'Content hash cannot be empty'),
  embedding: EmbeddingSchema,
  createdAt: z.date().optional(),
})

export type EmbeddingCacheEntryInput = z.infer<typeof EmbeddingCacheEntrySchema>

/**
 * Schema for new embedding cache entry.
 */
export const NewEmbeddingCacheEntrySchema = z.object({
  contentHash: z.string().min(1, 'Content hash cannot be empty'),
  embedding: EmbeddingSchema,
})

export type NewEmbeddingCacheEntryInput = z.infer<typeof NewEmbeddingCacheEntrySchema>

/**
 * Schema for vector similarity search parameters.
 */
export const SimilaritySearchParamsSchema = z.object({
  /** The query embedding vector */
  queryEmbedding: EmbeddingSchema,

  /** Maximum number of results to return */
  limit: z.number().int().positive().max(100).default(10),

  /** Optional role filter */
  role: KnowledgeRoleSchema.optional(),

  /** Optional tags filter (entries must have at least one matching tag) */
  tags: z.array(z.string()).optional(),

  /** Minimum similarity threshold (0-1) */
  minSimilarity: z.number().min(0).max(1).optional(),
})

export type SimilaritySearchParams = z.infer<typeof SimilaritySearchParamsSchema>

/**
 * Schema for similarity search result.
 */
export const SimilaritySearchResultSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).nullable(),

  /** Cosine similarity score (0-1, higher is more similar) */
  similarity: z.number().min(0).max(1),
})

export type SimilaritySearchResult = z.infer<typeof SimilaritySearchResultSchema>

// ============================================================================
// KB Compression Schemas (WKFL-009 - Knowledge Compressor)
// ============================================================================

/**
 * Schema for a canonical (merged) KB entry created by compression.
 *
 * Canonical entries are the deduplicated version of similar entries,
 * combining all unique information from the cluster.
 *
 * @see WKFL-009 for implementation details
 */
export const CanonicalEntrySchema = z.object({
  /** Title of the canonical entry */
  title: z.string().min(1),

  /** Unified recommendation combining all cluster members */
  recommendation: z.string().min(1),

  /** IDs of the original entries that were merged */
  merged_from: z.array(z.string().uuid()).min(2),

  /** Combined examples from all cluster members */
  examples: z.array(
    z.object({
      /** Story where this example originated */
      story: z.string(),
      /** Context describing the example */
      context: z.string(),
    }),
  ),

  /** Union of all tags from cluster members */
  tags: z.array(z.string()),
})

export type CanonicalEntry = z.infer<typeof CanonicalEntrySchema>

/**
 * Schema for archive metadata applied to original entries after compression.
 *
 * @see WKFL-009 AC-3
 */
export const ArchiveMetadataSchema = z.object({
  /** Whether the entry has been archived */
  archived: z.boolean(),

  /** When the entry was archived */
  archived_at: z.date(),

  /** UUID of the canonical entry that replaced this one */
  canonical_id: z.string().uuid(),
})

export type ArchiveMetadata = z.infer<typeof ArchiveMetadataSchema>

/**
 * Schema for the compression report output.
 *
 * @see WKFL-009 AC-4
 */
export const CompressionReportSchema = z.object({
  /** ISO date when compression was run */
  run_date: z.string(),

  /** Similarity threshold used */
  threshold: z.number().min(0).max(1),

  /** Entry counts before compression */
  before: z.object({
    total_entries: z.number().int().min(0),
    lessons: z.number().int().min(0),
    decisions: z.number().int().min(0),
    feedback: z.number().int().min(0),
    other: z.number().int().min(0),
  }),

  /** Entry counts after compression */
  after: z.object({
    total_entries: z.number().int().min(0),
    canonical_entries: z.number().int().min(0),
    archived_entries: z.number().int().min(0),
  }),

  /** Compression statistics */
  compression: z.object({
    ratio: z.number().min(0).max(1),
    estimated_token_savings: z.number().int().min(0),
  }),

  /** Clusters that were created */
  clusters_created: z.array(
    z.object({
      id: z.string().uuid(),
      size: z.number().int().min(2),
      topic: z.string(),
      members: z.array(z.string().uuid()),
    }),
  ),

  /** Entries that did not cluster */
  no_cluster: z.object({
    count: z.number().int().min(0),
    reason: z.string(),
  }),

  /** Whether this was a dry run (no changes made) */
  dry_run: z.boolean(),
})

export type CompressionReport = z.infer<typeof CompressionReportSchema>

// ============================================================================
// Task Schemas (Bucket C - Task Backlog)
// ============================================================================

/**
 * Valid task types for the task backlog.
 *
 * @see KBMEM-002 for implementation details
 */
export const TaskTypeSchema = z.enum([
  'follow_up',
  'improvement',
  'bug',
  'tech_debt',
  'feature_idea',
])
export type TaskType = z.infer<typeof TaskTypeSchema>

/**
 * Valid priority levels for tasks.
 */
export const TaskPrioritySchema = z.enum(['p0', 'p1', 'p2', 'p3'])
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

/**
 * Valid status values for tasks.
 */
export const TaskStatusSchema = z.enum([
  'open',
  'triaged',
  'in_progress',
  'blocked',
  'done',
  'wont_do',
  'promoted',
])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

/**
 * Valid effort estimates for tasks.
 */
export const TaskEffortSchema = z.enum(['xs', 's', 'm', 'l', 'xl'])
export type TaskEffort = z.infer<typeof TaskEffortSchema>

/**
 * Task schema for validation.
 */
export const TaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().optional().nullable(),
  sourceStoryId: z.string().optional().nullable(),
  sourcePhase: z.string().optional().nullable(),
  sourceAgent: z.string().optional().nullable(),
  taskType: TaskTypeSchema,
  priority: TaskPrioritySchema.optional().nullable(),
  status: TaskStatusSchema.default('open'),
  blockedBy: z.string().uuid().optional().nullable(),
  relatedKbEntries: z.array(z.string().uuid()).optional().nullable(),
  promotedToStory: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  estimatedEffort: TaskEffortSchema.optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  completedAt: z.date().optional().nullable(),
})

export type TaskInput = z.infer<typeof TaskSchema>

/**
 * Schema for creating a new task.
 */
export const NewTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().optional().nullable(),
  sourceStoryId: z.string().optional().nullable(),
  sourcePhase: z.string().optional().nullable(),
  sourceAgent: z.string().optional().nullable(),
  taskType: TaskTypeSchema,
  priority: TaskPrioritySchema.optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  estimatedEffort: TaskEffortSchema.optional().nullable(),
})

export type NewTaskInput = z.infer<typeof NewTaskSchema>

/**
 * Schema for updating a task.
 */
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: TaskPrioritySchema.optional().nullable(),
  status: TaskStatusSchema.optional(),
  blockedBy: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  estimatedEffort: TaskEffortSchema.optional().nullable(),
})

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>

// ============================================================================
// Work State Schemas (Bucket B - Session State)
// ============================================================================

/**
 * Valid workflow phases for work state.
 *
 * @see KBMEM-003 for implementation details
 */
export const WorkPhaseSchema = z.enum([
  'planning',
  'in-elaboration',
  'ready-to-work',
  'implementation',
  'ready-for-code-review',
  'review',
  'ready-for-qa',
  'in-qa',
  'verification',
  'uat',
  'complete',
])
export type WorkPhase = z.infer<typeof WorkPhaseSchema>

/**
 * Schema for a constraint in work state.
 */
export const WorkConstraintSchema = z.object({
  constraint: z.string(),
  source: z.string().optional(),
  priority: z.number().optional(),
})

export type WorkConstraint = z.infer<typeof WorkConstraintSchema>

/**
 * Schema for a recent action in work state.
 */
export const RecentActionSchema = z.object({
  action: z.string(),
  completed: z.boolean().default(false),
  timestamp: z.string().optional(),
})

export type RecentAction = z.infer<typeof RecentActionSchema>

/**
 * Schema for a blocker in work state.
 */
export const BlockerSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  waitingOn: z.string().optional(),
})

export type Blocker = z.infer<typeof BlockerSchema>

/**
 * Work state schema for validation.
 */
export const WorkStateSchema = z.object({
  id: z.string().uuid().optional(),
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  branch: z.string().optional().nullable(),
  phase: WorkPhaseSchema.optional().nullable(),
  constraints: z.array(WorkConstraintSchema).optional().default([]),
  recentActions: z.array(RecentActionSchema).optional().default([]),
  nextSteps: z.array(z.string()).optional().default([]),
  blockers: z.array(BlockerSchema).optional().default([]),
  kbReferences: z.record(z.string().uuid()).optional().default({}),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export type WorkStateInput = z.infer<typeof WorkStateSchema>

/**
 * Schema for updating work state.
 */
export const UpdateWorkStateSchema = z.object({
  branch: z.string().optional().nullable(),
  phase: WorkPhaseSchema.optional().nullable(),
  constraints: z.array(WorkConstraintSchema).optional(),
  recentActions: z.array(RecentActionSchema).optional(),
  nextSteps: z.array(z.string()).optional(),
  blockers: z.array(BlockerSchema).optional(),
  kbReferences: z.record(z.string().uuid()).optional(),
})

export type UpdateWorkStateInput = z.infer<typeof UpdateWorkStateSchema>

/**
 * Validate a knowledge entry.
 *
 * @param data - Data to validate
 * @returns Validated knowledge entry
 * @throws ZodError if validation fails
 */
export function validateKnowledgeEntry(data: unknown): KnowledgeEntryInput {
  return KnowledgeEntrySchema.parse(data)
}

/**
 * Validate embedding dimensions.
 *
 * @param embedding - Embedding array to validate
 * @returns true if valid
 * @throws ZodError if validation fails
 */
export function validateEmbedding(embedding: unknown): Embedding {
  return EmbeddingSchema.parse(embedding)
}

/**
 * Safely validate a knowledge entry.
 *
 * @param data - Data to validate
 * @returns Result object with success flag and data or error
 */
export function safeValidateKnowledgeEntry(data: unknown) {
  return KnowledgeEntrySchema.safeParse(data)
}

// ============================================================================
// Story Schemas (KBAR-001 - KB Story & Artifact Migration)
// ============================================================================

/**
 * Valid story types.
 *
 * @see KBAR-001 for implementation details
 */
export const StoryTypeSchema = z.enum(['feature', 'bug', 'spike', 'chore', 'tech_debt'])
export type StoryType = z.infer<typeof StoryTypeSchema>

/**
 * Valid story priority levels.
 */
export const StoryPrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])
export type StoryPriority = z.infer<typeof StoryPrioritySchema>

/**
 * Valid story workflow states.
 *
 * Lifecycle: backlog → ready → in_progress → ready_for_review → in_review →
 *            ready_for_qa → in_qa → completed/cancelled/deferred
 */
export const StoryStateSchema = z.enum([
  'backlog',
  'ready',
  'in_progress',
  'ready_for_review',
  'in_review',
  'ready_for_qa',
  'in_qa',
  'completed',
  'cancelled',
  'deferred',
])
export type StoryState = z.infer<typeof StoryStateSchema>

/**
 * Valid story implementation phases.
 */
export const StoryPhaseSchema = z.enum([
  'setup',
  'analysis',
  'planning',
  'implementation',
  'code_review',
  'qa_verification',
  'completion',
])
export type StoryPhase = z.infer<typeof StoryPhaseSchema>

/**
 * Valid dependency relationship types.
 */
export const DependencyTypeSchema = z.enum([
  'depends_on',
  'blocked_by',
  'follow_up_from',
  'enables',
])
export type DependencyType = z.infer<typeof DependencyTypeSchema>

/**
 * Valid artifact types for story artifacts.
 */
export const ArtifactTypeSchema = z.enum([
  'checkpoint',
  'scope',
  'plan',
  'evidence',
  'verification',
  'analysis',
  'context',
  'fix_summary',
  'proof',
  'elaboration',
  'review',
  'qa_gate',
  'completion_report',
])
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>

/**
 * Story schema for validation.
 */
export const StorySchema = z.object({
  id: z.string().uuid().optional(),
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  feature: z.string().optional().nullable(),
  epic: z.string().optional().nullable(),
  title: z.string().min(1, 'Title cannot be empty'),
  storyDir: z.string().optional().nullable(),
  storyFile: z.string().optional().default('story.yaml'),
  storyType: StoryTypeSchema.optional().nullable(),
  points: z.number().int().positive().optional().nullable(),
  priority: StoryPrioritySchema.optional().nullable(),
  state: StoryStateSchema.optional().nullable(),
  phase: StoryPhaseSchema.optional().nullable(),
  iteration: z.number().int().min(0).optional().default(0),
  blocked: z.boolean().optional().default(false),
  blockedReason: z.string().optional().nullable(),
  blockedByStory: z.string().optional().nullable(),
  touchesBackend: z.boolean().optional().default(false),
  touchesFrontend: z.boolean().optional().default(false),
  touchesDatabase: z.boolean().optional().default(false),
  touchesInfra: z.boolean().optional().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  startedAt: z.date().optional().nullable(),
  completedAt: z.date().optional().nullable(),
  fileSyncedAt: z.date().optional().nullable(),
  fileHash: z.string().optional().nullable(),
})

export type StoryInput = z.infer<typeof StorySchema>

/**
 * Schema for creating a new story.
 */
export const NewStorySchema = z.object({
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  feature: z.string().optional().nullable(),
  epic: z.string().optional().nullable(),
  title: z.string().min(1, 'Title cannot be empty'),
  storyDir: z.string().optional().nullable(),
  storyFile: z.string().optional().default('story.yaml'),
  storyType: StoryTypeSchema.optional().nullable(),
  points: z.number().int().positive().optional().nullable(),
  priority: StoryPrioritySchema.optional().nullable(),
  state: StoryStateSchema.optional().nullable(),
  phase: StoryPhaseSchema.optional().nullable(),
  iteration: z.number().int().min(0).optional().default(0),
  blocked: z.boolean().optional().default(false),
  blockedReason: z.string().optional().nullable(),
  blockedByStory: z.string().optional().nullable(),
  touchesBackend: z.boolean().optional().default(false),
  touchesFrontend: z.boolean().optional().default(false),
  touchesDatabase: z.boolean().optional().default(false),
  touchesInfra: z.boolean().optional().default(false),
  fileHash: z.string().optional().nullable(),
})

export type NewStoryInput = z.infer<typeof NewStorySchema>

/**
 * Schema for updating a story.
 */
export const UpdateStorySchema = z.object({
  feature: z.string().optional().nullable(),
  epic: z.string().optional().nullable(),
  title: z.string().min(1).optional(),
  storyDir: z.string().optional().nullable(),
  storyFile: z.string().optional(),
  storyType: StoryTypeSchema.optional().nullable(),
  points: z.number().int().positive().optional().nullable(),
  priority: StoryPrioritySchema.optional().nullable(),
  state: StoryStateSchema.optional().nullable(),
  phase: StoryPhaseSchema.optional().nullable(),
  iteration: z.number().int().min(0).optional(),
  blocked: z.boolean().optional(),
  blockedReason: z.string().optional().nullable(),
  blockedByStory: z.string().optional().nullable(),
  touchesBackend: z.boolean().optional(),
  touchesFrontend: z.boolean().optional(),
  touchesDatabase: z.boolean().optional(),
  touchesInfra: z.boolean().optional(),
  startedAt: z.date().optional().nullable(),
  completedAt: z.date().optional().nullable(),
  fileSyncedAt: z.date().optional().nullable(),
  fileHash: z.string().optional().nullable(),
})

export type UpdateStoryInput = z.infer<typeof UpdateStorySchema>

/**
 * Story dependency schema for validation.
 */
export const StoryDependencySchema = z.object({
  id: z.string().uuid().optional(),
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  targetStoryId: z.string().min(1, 'Target story ID cannot be empty'),
  dependencyType: DependencyTypeSchema,
  satisfied: z.boolean().optional().default(false),
  createdAt: z.date().optional(),
})

export type StoryDependencyInput = z.infer<typeof StoryDependencySchema>

/**
 * Schema for creating a new story dependency.
 */
export const NewStoryDependencySchema = z.object({
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  targetStoryId: z.string().min(1, 'Target story ID cannot be empty'),
  dependencyType: DependencyTypeSchema,
  satisfied: z.boolean().optional().default(false),
})

export type NewStoryDependencyInput = z.infer<typeof NewStoryDependencySchema>

/**
 * Story artifact schema for validation.
 */
export const StoryArtifactSchema = z.object({
  id: z.string().uuid().optional(),
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  artifactType: ArtifactTypeSchema,
  artifactName: z.string().optional().nullable(),
  kbEntryId: z.string().uuid().optional().nullable(),
  filePath: z.string().optional().nullable(),
  phase: StoryPhaseSchema.optional().nullable(),
  iteration: z.number().int().min(0).optional().nullable(),
  summary: z.record(z.unknown()).optional().nullable(),
  /** Full artifact content as JSONB (replaces file-based storage) */
  content: z.record(z.unknown()).optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export type StoryArtifactInput = z.infer<typeof StoryArtifactSchema>

/**
 * Schema for creating a new story artifact.
 */
export const NewStoryArtifactSchema = z.object({
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  artifactType: ArtifactTypeSchema,
  artifactName: z.string().optional().nullable(),
  kbEntryId: z.string().uuid().optional().nullable(),
  filePath: z.string().optional().nullable(),
  phase: StoryPhaseSchema.optional().nullable(),
  iteration: z.number().int().min(0).optional().nullable(),
  summary: z.record(z.unknown()).optional().nullable(),
  /** Full artifact content as JSONB (replaces file-based storage) */
  content: z.record(z.unknown()).optional().nullable(),
})

export type NewStoryArtifactInput = z.infer<typeof NewStoryArtifactSchema>

/**
 * Schema for updating a story artifact.
 */
export const UpdateStoryArtifactSchema = z.object({
  artifactName: z.string().optional().nullable(),
  kbEntryId: z.string().uuid().optional().nullable(),
  filePath: z.string().optional().nullable(),
  phase: StoryPhaseSchema.optional().nullable(),
  iteration: z.number().int().min(0).optional().nullable(),
  summary: z.record(z.unknown()).optional().nullable(),
  /** Full artifact content as JSONB (replaces file-based storage) */
  content: z.record(z.unknown()).optional().nullable(),
})

export type UpdateStoryArtifactInput = z.infer<typeof UpdateStoryArtifactSchema>

// ============================================================================
// Token Usage Schemas (Story Token Tracking)
// ============================================================================

/**
 * Valid workflow phases for token logging.
 *
 * Phases are grouped by workflow stage:
 * - PM phases: pm-generate, pm-elaborate, pm-refine
 * - Dev phases: dev-setup, dev-implementation, dev-fix
 * - Review phases: code-review, qa-verification, qa-gate, architect-review
 * - Other: catch-all for custom phases
 */
export const TokenPhaseSchema = z.enum([
  'pm-generate',
  'pm-elaborate',
  'pm-refine',
  'dev-setup',
  'dev-implementation',
  'dev-fix',
  'code-review',
  'qa-verification',
  'qa-gate',
  'architect-review',
  'other',
])
export type TokenPhase = z.infer<typeof TokenPhaseSchema>

/**
 * Schema for logging token usage.
 */
export const TokenUsageSchema = z.object({
  id: z.string().uuid().optional(),
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  feature: z.string().optional().nullable(),
  phase: TokenPhaseSchema,
  agent: z.string().optional().nullable(),
  iteration: z.number().int().min(0).optional().default(0),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0).optional(),
  loggedAt: z.date().optional(),
  createdAt: z.date().optional(),
})

export type TokenUsageInput = z.infer<typeof TokenUsageSchema>

/**
 * Schema for creating a new token usage entry.
 */
export const NewTokenUsageSchema = z.object({
  storyId: z.string().min(1, 'Story ID cannot be empty'),
  feature: z.string().optional().nullable(),
  phase: TokenPhaseSchema,
  agent: z.string().optional().nullable(),
  iteration: z.number().int().min(0).optional().default(0),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
})

export type NewTokenUsageInput = z.infer<typeof NewTokenUsageSchema>

/**
 * Valid grouping dimensions for token analytics.
 */
export const TokenGroupBySchema = z.enum(['phase', 'feature', 'story', 'agent'])
export type TokenGroupBy = z.infer<typeof TokenGroupBySchema>
