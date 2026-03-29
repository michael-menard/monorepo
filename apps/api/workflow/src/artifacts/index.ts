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

// Example Entry - examples framework for agent learning (WINT-0180)
export {
  ExampleEntrySchema,
  ExampleCategorySchema,
  ExampleLifecycleStateSchema,
  ExampleTypeSchema,
  createExampleEntry,
  validateExampleEntry,
  deprecateExampleEntry,
  recordExampleUsage,
  type ExampleEntry,
  type ExampleCategory,
  type ExampleLifecycleState,
  type ExampleType,
} from './example-entry.js'

// Example Outcome - outcome tracking for examples (WINT-0180)
export {
  ExampleOutcomeEventSchema,
  ExampleOutcomeMetricsSchema,
  OutcomeEventTypeSchema,
  createOutcomeEvent,
  createOutcomeMetrics,
  updateOutcomeMetrics,
  calculateEffectivenessScore,
  type ExampleOutcomeEvent,
  type ExampleOutcomeMetrics,
  type OutcomeEventType,
} from './example-outcome.js'

// Audit Findings - code audit results from multi-lens analysis
export {
  // Main schemas
  AuditFindingsSchema,
  LensResultSchema,
  ChallengeResultSchema,
  RoundtableResultSchema,
  DedupResultSchema,
  TrendSnapshotSchema,
  DebtMapSchema,
  // Supporting schemas
  AuditSeveritySchema,
  AuditConfidenceSchema,
  AuditLensSchema,
  AuditScopeSchema,
  AuditModeSchema,
  DedupVerdictSchema,
  FindingStatusSchema,
  DevilsAdvocateDecisionSchema,
  DedupCheckSchema,
  DevilsAdvocateResultSchema,
  AuditFindingSchema,
  SeveritySummarySchema,
  TrendDeltaSchema,
  AuditSummarySchema,
  AuditMetricsSchema,
  TrendEntrySchema,
  TrendDirectionSchema,
  DebtFileEntrySchema,
  // Factory functions
  createAuditFindings,
  addLensFindings,
  calculateTrend,
  // Types
  type AuditFindings,
  type LensResult,
  type ChallengeResult,
  type RoundtableResult,
  type DedupResult,
  type TrendSnapshot,
  type DebtMap,
  type AuditSeverity,
  type AuditConfidence,
  type AuditLens,
  type AuditScope,
  type AuditMode,
  type DedupVerdict,
  type FindingStatus,
  type DevilsAdvocateDecision,
  type DedupCheck,
  type DevilsAdvocateResult,
  type AuditFinding,
  type SeveritySummary,
  type TrendDelta,
  type AuditSummary,
  type AuditMetrics,
  type TrendEntry,
  type TrendDirection,
  type DebtFileEntry,
} from './audit-findings.js'

// Gaps - MVP-blocking and non-blocking elaboration gaps (WINT-4150)
export {
  GapsSchema,
  GapItemSchema,
  GapSeveritySchema,
  createGaps,
  type Gaps,
  type GapItem,
  type GapSeverity,
} from './gaps.js'

// Cohesion Findings - PO cohesion check results, max(5) findings, max(2) blocking (WINT-4150)
export {
  CohesionFindingsSchema,
  CohesionFindingSchema,
  CohesionSeveritySchema,
  createCohesionFindings,
  type CohesionFindings,
  type CohesionFinding,
  type CohesionSeverity,
} from './cohesion-findings.js'

// Scope Challenges - scope challenge analysis, max(5) challenges (WINT-4150)
export {
  ScopeChallengesSchema,
  ScopeChallengeSchema,
  RecommendationSchema,
  RiskIfDeferredSchema,
  createScopeChallenges,
  type ScopeChallenges,
  type ScopeChallenge,
  type Recommendation,
  type RiskIfDeferred,
} from './scope-challenges.js'

// MVP Slice - included/excluded ACs for MVP (WINT-4150)
export { MvpSliceSchema, createMvpSlice, type MvpSlice } from './mvp-slice.js'

// Final Scope - formalized final scope after elaboration, z.literal('1.0') (WINT-4150)
export {
  FinalScopeSchema,
  FinalAcSchema,
  FollowupSchema,
  createFinalScope,
  type FinalScope,
  type FinalAc,
  type Followup,
} from './final-scope.js'

// Evidence Expectations - expected evidence items for AC verification (WINT-4150)
export {
  EvidenceExpectationsSchema,
  ExpectationSchema,
  EvidenceTypeSchema,
  createEvidenceExpectations,
  type EvidenceExpectations,
  type Expectation,
  type EvidenceType,
} from './evidence-expectations.js'

// User Flows - re-export from __types__/user-flows.ts (AC-3, WINT-4150)
export {
  UserFlowsSchema,
  UserFlowSchema,
  UserFlowStepSchema,
  UserFlowStateEnum,
  UserFlowCapabilityEnum,
  type UserFlows,
  type UserFlow,
  type UserFlowStep,
  type UserFlowState,
  type UserFlowCapability,
} from './__types__/user-flows.js'
