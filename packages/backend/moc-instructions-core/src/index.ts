/**
 * MOC Instructions Core Package
 *
 * Platform-agnostic business logic for MOC Instructions read operations.
 * Follows ports & adapters pattern - core functions accept DB client via DI.
 */

// ============================================================
// CORE FUNCTIONS
// ============================================================

export { getMoc } from './get-moc.js'
export type { GetMocDbClient, GetMocSchema, GetMocResult } from './get-moc.js'

export { listMocs } from './list-mocs.js'
export type { ListMocsDbClient, ListMocsSchema, ListMocsResult } from './list-mocs.js'

export { getMocStatsByCategory } from './get-moc-stats-by-category.js'
export type {
  GetMocStatsByCategoryDbClient,
  GetMocStatsByCategorySchema,
  GetMocStatsByCategoryResult,
} from './get-moc-stats-by-category.js'

export { getMocUploadsOverTime } from './get-moc-uploads-over-time.js'
export type {
  GetMocUploadsOverTimeDbClient,
  GetMocUploadsOverTimeSchema,
  GetMocUploadsOverTimeResult,
} from './get-moc-uploads-over-time.js'

// STORY-015: Initialize and Finalize with Files
export { initializeWithFiles } from './initialize-with-files.js'
export { finalizeWithFiles } from './finalize-with-files.js'

// STORY-016: MOC File Upload Management
export { deleteMocFile } from './delete-moc-file.js'
export { uploadPartsList } from './upload-parts-list.js'
export { editPresign } from './edit-presign.js'
export { editFinalize } from './edit-finalize.js'
export { parsePartsListFile, validatePartsListFile } from './parts-list-parser.js'
export type {
  PartEntry,
  ParsedPartsList,
  ParsingError,
  ParsingResult,
} from './parts-list-parser.js'

// ============================================================
// TYPES
// ============================================================

export type {
  MocRow,
  MocFileRow,
  MocDetail,
  ListMocsFilters,
  ListMocsResponse,
  CategoryStat,
  CategoryStatsResponse,
  UploadOverTime,
  UploadsOverTimeResponse,
  // STORY-015: Initialize/Finalize types
  FileMetadata,
  InitializeMocInput,
  PresignedUploadUrl,
  InitializeWithFilesSuccess,
  InitializeErrorCode,
  InitializeWithFilesResult,
  FinalizeUploadedFile,
  FinalizeMocInput,
  FileValidationResult,
  FinalizeErrorCode,
  FinalizeWithFilesSuccess,
  FinalizeWithFilesResult,
  RateLimitCheckResult,
  UploadConfigSubset,
  InitializeWithFilesDeps,
  FinalizeWithFilesDeps,
  PartsValidationResult,
  // STORY-016: Delete/Edit/Upload types
  DeleteMocFileErrorCode,
  DeleteMocFileSuccess,
  DeleteMocFileResult,
  DeleteMocFileDeps,
  MocPartsListRow,
  UploadPartsListErrorCode,
  UploadPartsListSuccess,
  UploadPartsListResult,
  UploadPartsListDeps,
  EditFileMetadata,
  EditPresignInput,
  EditPresignedFile,
  EditPresignErrorCode,
  EditPresignSuccess,
  EditPresignResult,
  EditPresignDeps,
  EditNewFile,
  EditFinalizeInput,
  EditFinalizeErrorCode,
  EditFinalizeFile,
  EditFinalizeSuccess,
  EditFinalizeResult,
  EditFinalizeDeps,
  TxClient,
} from './__types__/index.js'

export {
  MocRowSchema,
  MocFileRowSchema,
  MocDetailSchema,
  ListMocsFiltersSchema,
  ListMocsResponseSchema,
  CategoryStatSchema,
  CategoryStatsResponseSchema,
  UploadOverTimeSchema,
  UploadsOverTimeResponseSchema,
  // STORY-015: Initialize/Finalize schemas
  FileMetadataSchema,
  InitializeMocInputSchema,
  PresignedUploadUrlSchema,
  InitializeWithFilesSuccessSchema,
  InitializeErrorCodeSchema,
  FinalizeUploadedFileSchema,
  FinalizeMocInputSchema,
  FileValidationResultSchema,
  FinalizeErrorCodeSchema,
  FinalizeWithFilesSuccessSchema,
  // STORY-016: Delete/Edit/Upload schemas
  DeleteMocFileErrorCodeSchema,
  DeleteMocFileSuccessSchema,
  MocPartsListRowSchema,
  PartsListParseResultSchema,
  UploadPartsListErrorCodeSchema,
  UploadPartsListSuccessSchema,
  EditFileMetadataSchema,
  EditPresignInputSchema,
  EditPresignedFileSchema,
  EditPresignErrorCodeSchema,
  EditPresignSuccessSchema,
  EditNewFileSchema,
  EditFinalizeInputSchema,
  EditFinalizeErrorCodeSchema,
  EditFinalizeFileSchema,
  EditFinalizeSuccessSchema,
} from './__types__/index.js'
