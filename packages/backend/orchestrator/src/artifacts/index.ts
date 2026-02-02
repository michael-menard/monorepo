/**
 * Evidence-First Artifact Schemas
 *
 * These schemas define the YAML artifacts used in the Dev → Review → QA workflow.
 * All artifacts are designed to minimize token usage by:
 * 1. Providing structured data that can be quickly parsed
 * 2. Serving as single sources of truth to avoid re-reading original files
 * 3. Supporting deterministic resume via checkpoint tracking
 */

// Checkpoint - tracks current phase for resume
export {
  CheckpointSchema,
  PhaseSchema,
  createCheckpoint,
  advanceCheckpoint,
  type Checkpoint,
  type Phase,
} from './checkpoint.js'

// Scope - defines what surfaces the story touches
export {
  ScopeSchema,
  createScope,
  inferScopeFromContent,
  inferRiskFlags,
  type Scope,
} from './scope.js'

// Plan - structured implementation plan
export {
  PlanSchema,
  PlanStepSchema,
  FileChangeSchema,
  CommandSchema,
  AcceptanceCriteriaMapSchema,
  createPlan,
  type Plan,
  type PlanStep,
  type FileChange,
  type Command,
  type AcceptanceCriteriaMap,
} from './plan.js'

// Knowledge Context - lessons learned and ADRs
export {
  KnowledgeContextSchema,
  LessonSchema,
  AdrSchema,
  HighCostOperationSchema,
  createKnowledgeContext,
  type KnowledgeContext,
  type Lesson,
  type Adr,
  type HighCostOperation,
} from './knowledge-context.js'

// Evidence - single source of truth for implementation (v2 with E2E support)
export {
  EvidenceSchema,
  EvidenceItemSchema,
  AcceptanceCriteriaEvidenceSchema,
  TouchedFileSchema,
  CommandRunSchema,
  EndpointExercisedSchema,
  TokenSummarySchema,
  // E2E Tests (v2 - ADR-006)
  E2ETestsSchema,
  ConfigIssueSchema,
  ConfigIssueTypeSchema,
  FailedE2ETestSchema,
  // Functions
  createEvidence,
  updateAcEvidence,
  addTouchedFile,
  addCommandRun,
  allAcsPassing,
  getMissingAcs,
  // E2E helpers (v2)
  createE2ETests,
  addE2ETests,
  addConfigIssue,
  // Types
  type Evidence,
  type EvidenceItem,
  type AcceptanceCriteriaEvidence,
  type TouchedFile,
  type CommandRun,
  type EndpointExercised,
  type TokenSummary,
  // E2E Types (v2)
  type E2ETests,
  type ConfigIssue,
  type ConfigIssueType,
  type FailedE2ETest,
} from './evidence.js'

// Review - aggregated code review results
export {
  ReviewSchema,
  FindingSchema,
  WorkerResultSchema,
  RankedPatchSchema,
  createReview,
  addWorkerResult,
  carryForwardWorker,
  generateRankedPatches,
  type Review,
  type Finding,
  type WorkerResult,
  type RankedPatch,
} from './review.js'

// QA Verify - QA verification results
export {
  QaVerifySchema,
  AcVerificationSchema,
  TestResultsSchema,
  QaIssueSchema,
  createQaVerify,
  qaPassedSuccessfully,
  generateQaSummary,
  addAcVerification,
  calculateVerdict,
  type QaVerify,
  type AcVerification,
  type TestResults,
  type QaIssue,
} from './qa-verify.js'

// Story - story artifact schema (aligns with Claude's story.yaml)
export {
  StoryArtifactSchema,
  StoryTypeSchema,
  PriorityLevelSchema,
  SurfaceTypeSchema,
  StoryAcceptanceCriterionSchema,
  StoryRiskSchema,
  StoryScopeSchema,
  createStoryArtifact,
  updateStoryState,
  setStoryBlocked,
  addAcceptanceCriterion,
  addStoryRisk,
  isStoryBlocked,
  isStoryComplete,
  isStoryWorkable,
  getStoryNextState,
  type StoryArtifact,
  type StoryArtifactInput,
  type StoryType,
  type PriorityLevel,
  type SurfaceType,
  type StoryAcceptanceCriterion,
  type StoryRisk,
  type StoryScope,
} from './story.js'
