/**
 * API Client Schemas
 *
 * Zod schemas for runtime validation and type inference.
 * All types are derived from Zod schemas using z.infer<>.
 */

// Wishlist schemas
export {
  // Enums
  WishlistStoreSchema,
  CurrencySchema,
  // Item schemas
  WishlistItemSchema,
  CreateWishlistItemSchema,
  UpdateWishlistItemSchema,
  // Query/Response schemas
  WishlistQueryParamsSchema,
  PaginationSchema,
  WishlistListResponseSchema,
  // Reorder schemas
  ReorderWishlistItemSchema,
  BatchReorderSchema,
  ReorderResponseSchema,
  // Presign schemas
  PresignRequestSchema,
  PresignResponseSchema,
  // Purchase schemas (WISH-2042)
  MarkAsPurchasedInputSchema,
  GotItFormSchema,
  SetItemSchema,
  // Types
  type WishlistStore,
  type Currency,
  type WishlistItem,
  type CreateWishlistItem,
  type UpdateWishlistItem,
  type WishlistQueryParams,
  type Pagination,
  type WishlistListResponse,
  type ReorderWishlistItem,
  type BatchReorder,
  type ReorderResponse,
  type PresignRequest,
  type PresignResponse,
  type MarkAsPurchasedInput,
  type GotItFormValues,
  type SetItem,
} from './wishlist'

// Sets schemas
export {
  SetImageSchema,
  SetSchema,
  CreateSetSchema,
  UpdateSetSchema,
  SetListQuerySchema,
  SetListPaginationSchema,
  SetListFiltersSchema,
  SetListResponseSchema,
  type SetImage,
  type Set,
  type CreateSetInput,
  type UpdateSetInput,
  type SetListQuery,
  type SetListPagination,
  type SetListFilters,
  type SetListResponse,
} from './sets'

// Feature flags schemas (WISH-2009)
export {
  FeatureFlagSchema,
  FeatureFlagsResponseSchema,
  FeatureFlagDetailResponseSchema,
  UpdateFeatureFlagInputSchema,
  WishlistFlagKeys,
  type FeatureFlag,
  type FeatureFlagsResponse,
  type FeatureFlagDetailResponse,
  type UpdateFeatureFlagInput,
  type WishlistFlagKey,
} from './feature-flags'

// Admin schemas (Admin Panel)
export {
  // Enums
  BlockReasonSchema,
  CognitoUserStatusSchema,
  AuditActionTypeSchema,
  AuditResultSchema,
  // User schemas
  CognitoUserSchema,
  UserDetailSchema,
  // Response schemas
  UserListResponseSchema,
  SuccessResponseSchema,
  AuditLogEntrySchema,
  AuditLogResponseSchema,
  // Input schemas
  BlockUserInputSchema,
  ListUsersQuerySchema,
  ListAuditLogQuerySchema,
  // Types
  type BlockReason,
  type CognitoUserStatus,
  type AuditActionType,
  type AuditResult,
  type CognitoUser,
  type UserDetail,
  type UserListResponse,
  type SuccessResponse,
  type AuditLogEntry,
  type AuditLogResponse,
  type BlockUserInput,
  type ListUsersQuery,
  type ListAuditLogQuery,
} from './admin'

// Permissions schemas (Cognito Scopes / Authorization)
export {
  // Core enums
  TierSchema,
  FeatureSchema as PermissionFeatureSchema,
  QuotaTypeSchema,
  AddonTypeSchema,
  // Quota schemas
  QuotaInfoSchema,
  UserQuotasSchema,
  ActiveAddonSchema,
  // Main permissions schema
  UserPermissionsSchema,
  FeaturesResponseSchema,
  // Error schemas
  AuthorizationErrorCodeSchema,
  FeatureErrorResponseSchema,
  QuotaErrorResponseSchema,
  SuspendedErrorResponseSchema,
  // Constants
  TIER_FEATURES,
  FEATURE_REQUIRED_TIER,
  TIER_DISPLAY_NAMES,
  FEATURE_DISPLAY_NAMES,
  QUOTA_DISPLAY_NAMES,
  // Types
  type Tier,
  type Feature as PermissionFeature,
  type QuotaType,
  type AddonType,
  type QuotaInfo,
  type UserQuotas,
  type ActiveAddon,
  type UserPermissions,
  type FeaturesResponse,
  type AuthorizationErrorCode,
  type FeatureErrorResponse,
  type QuotaErrorResponse,
  type SuspendedErrorResponse,
} from './permissions'

// Inspiration Gallery schemas (Epic 5)
export {
  // Item schemas
  InspirationSchema,
  AlbumSchema,
  AlbumWithMetadataSchema,
  // List response schemas
  InspirationListResponseSchema,
  AlbumListResponseSchema,
  PaginationSchema as InspirationPaginationSchema,
  // Input schemas
  CreateInspirationSchema,
  UpdateInspirationSchema,
  CreateAlbumSchema,
  UpdateAlbumSchema,
  CreateAlbumFromStackSchema,
  // Query schemas
  InspirationQueryParamsSchema,
  AlbumQueryParamsSchema,
  // Reorder schemas
  ReorderItemSchema,
  BatchReorderInspirationsSchema,
  BatchReorderAlbumsSchema,
  ReorderResponseSchema as InspirationReorderResponseSchema,
  // Album items schemas
  AddToAlbumSchema,
  RemoveFromAlbumSchema,
  AlbumItemsResponseSchema,
  // Album hierarchy schemas
  AddAlbumParentSchema,
  BreadcrumbsResponseSchema,
  // Upload schemas
  PresignRequestSchema as InspirationPresignRequestSchema,
  PresignResponseSchema as InspirationPresignResponseSchema,
  // MOC linking schemas
  LinkToMocSchema,
  // Types
  type Inspiration,
  type Album,
  type AlbumWithMetadata,
  type InspirationListResponse,
  type AlbumListResponse,
  type Pagination as InspirationPagination,
  type CreateInspiration,
  type UpdateInspiration,
  type CreateAlbum,
  type UpdateAlbum,
  type CreateAlbumFromStack,
  type InspirationQueryParams,
  type AlbumQueryParams,
  type BatchReorderInspirations,
  type BatchReorderAlbums,
  type ReorderResponse as InspirationReorderResponse,
  type AddToAlbum,
  type RemoveFromAlbum,
  type AlbumItemsResponse,
  type AddAlbumParent,
  type BreadcrumbsResponse,
  type PresignRequest as InspirationPresignRequest,
  type PresignResponse as InspirationPresignResponse,
  type LinkToMoc,
} from './inspiration'

// Instructions/MOC schemas (INST-1008, INST-1101)
export {
  // Enums
  InstructionTypeSchema,
  DifficultySchema,
  StatusSchema,
  VisibilitySchema,
  FileTypeSchema,
  // Nested schemas
  DesignerSchema,
  DimensionsSchema,
  InstructionsMetadataSchema,
  MocFeatureSchema,
  // Entity schemas
  MocInstructionsSchema,
  MocFileSchema,
  // Input schemas
  CreateMocInputSchema,
  UpdateMocInputSchema,
  // List/Query schemas
  ListMocsQuerySchema,
  PaginationSchema as MocPaginationSchema,
  MocListResponseSchema,
  // File upload schemas
  UploadFileInputSchema,
  DeleteFileInputSchema,
  // Detail response schemas (INST-1101)
  MocDetailFileSchema,
  MocStatsSchema,
  GetMocDetailResponseSchema,
  // Upload response schemas (INST-1103)
  UploadThumbnailResponseSchema,
  // Types
  type InstructionType,
  type Difficulty,
  type Status,
  type Visibility,
  type FileType,
  type Designer,
  type Dimensions,
  type MocFeature,
  type MocInstructions,
  type MocFile,
  type CreateMocInput,
  type UpdateMocInput,
  type ListMocsQuery,
  type Pagination as MocPagination,
  type MocListResponse,
  type UploadFileInput,
  type DeleteFileInput,
  type MocDetailFile,
  type MocStats,
  type GetMocDetailResponse,
  type UploadThumbnailResponse,
} from './instructions'
