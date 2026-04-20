/**
 * Story REPA-016: Instructions Schema Exports
 *
 * Re-exports all instruction-related schemas, types, and utilities.
 * Maintains backward compatibility with existing imports.
 *
 * Name collision handling:
 * - Form schemas use "Moc" prefix (MocFeatureSchema, MocFeature, etc.)
 * - API schemas use original names for backward compatibility
 */

// Form schemas and types (with Moc prefix to avoid collisions)
export {
  DesignerStatsSchema,
  SocialLinksSchema,
  DesignerSchema,
  DimensionMeasurementSchema,
  WidthDimensionSchema,
  WeightSchema,
  DimensionsSchema,
  InstructionsMetadataSchema,
  AlternateBuildSchema,
  MocFeatureSchema,
  SourcePlatformSchema,
  EventBadgeSchema,
  ModerationSchema,
  MocInstructionFormSchema,
  type MocInstructionForm,
  type MocForm,
  type SetForm,
  type MocInstructionFormInput,
  type MocFormInput,
  type SetFormInput,
  type Designer,
  type Dimensions,
  type MocFeature,
  type AlternateBuild,
  type SourcePlatform,
  type EventBadge,
} from './form'

// API-specific exports (avoid form collisions)
export {
  InstructionTypeSchema,
  type InstructionType,
  DifficultySchema,
  type Difficulty,
  StatusSchema,
  type Status,
  VisibilitySchema,
  type Visibility,
  FileTypeSchema,
  type FileType,
  // Renamed exports to avoid collision with form schemas
  FeatureSchema as ApiFeatureSchema,
  type Feature as ApiFeature,
  // Main API schemas
  MocInstructionsSchema,
  type MocInstructions,
  MocFileSchema,
  type MocFile,
  CreateMocInputSchema,
  type CreateMocInput,
  UpdateMocInputSchema,
  type UpdateMocInput,
  UpdateMocResponseSchema,
  type UpdateMocResponse,
  ListMocsQuerySchema,
  type ListMocsQuery,
  PaginationSchema,
  type Pagination,
  MocListResponseSchema,
  type MocListResponse,
  UploadFileInputSchema,
  type UploadFileInput,
  DeleteFileInputSchema,
  type DeleteFileInput,
  MocDetailFileSchema,
  type MocDetailFile,
  MocStatsSchema,
  type MocStats,
  GetMocDetailResponseSchema,
  type GetMocDetailResponse,
  UploadThumbnailResponseSchema,
  type UploadThumbnailResponse,
  GetFileDownloadUrlResponseSchema,
  type GetFileDownloadUrlResponse,
  // INST-1105: Upload session schemas
  CreateUploadSessionRequestSchema,
  type CreateUploadSessionRequest,
  CreateUploadSessionResponseSchema,
  type CreateUploadSessionResponse,
  CompleteUploadSessionResponseSchema,
  type CompleteUploadSessionResponse,
  // Build Status & Review System
  BuildStatusSchema,
  type BuildStatus,
  ReviewStatusSchema,
  type ReviewStatus,
  BrandSchema,
  type Brand,
  PartsQualitySectionSchema,
  type PartsQualitySection,
  InstructionsSectionSchema,
  type InstructionsSection,
  MinifigsSectionSchema,
  type MinifigsSection,
  StickersSectionSchema,
  type StickersSection,
  ValueSectionSchema,
  type ValueSection,
  BuildExperienceSectionSchema,
  type BuildExperienceSection,
  DesignSectionSchema,
  type DesignSection,
  ReviewSectionsSchema,
  type ReviewSections,
  MocReviewSchema,
  type MocReview,
  UpdateReviewRequestSchema,
  type UpdateReviewRequest,
} from './api'

// Utility functions
export * from './utils'
