import type { Result } from '@repo/api-core'
import type { CreateMocRequest, ListMocsQuery } from '../types.js'

export interface Moc {
  id: string
  userId: string
  title: string
  description: string | null
  theme: string | null
  tags: string[] | null
  slug: string | null
  type: string
  thumbnailUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MocListItem extends Moc {
  // Additional fields for list view
  mocId: string | null
  author: string | null
  partsCount: number | null
  minifigCount: number | null
  themeId: number | null
  subtheme: string | null
  uploadedDate: Date | null
  brand: string | null
  setNumber: string | null
  releaseYear: number | null
  retired: boolean | null
  designer: unknown | null
  dimensions: unknown | null
  instructionsMetadata: unknown | null
  features: unknown | null
  descriptionHtml: string | null
  shortDescription: string | null
  difficulty: string | null
  buildTimeHours: number | null
  ageRecommendation: string | null
  status: string
  visibility: string
  isFeatured: boolean
  isVerified: boolean
  thumbnailUrl: string | null
  totalPieceCount: number | null
  publishedAt: Date | null
}

export interface MocListResult {
  items: MocListItem[]
  total: number
}

export interface MocFile {
  id: string
  mocId: string
  fileType: string
  fileUrl: string
  originalFilename: string | null
  mimeType: string | null
  createdAt: Date
  updatedAt: Date | null
}

export interface MocWithFiles extends Moc {
  files: MocFile[]
  totalPieceCount: number | null
}

export interface MocRepository {
  create(userId: string, data: CreateMocRequest): Promise<Moc>
  findBySlug(slug: string, userId: string): Promise<Moc | null>
  getMocById(id: string, userId: string): Promise<MocWithFiles | null>
  list(userId: string, query: ListMocsQuery): Promise<MocListResult>
  updateThumbnail(mocId: string, userId: string, thumbnailUrl: string): Promise<void>
}

/**
 * MOC Image Storage Port
 * (INST-1103: AC54)
 */
export interface MocImageStorage {
  /**
   * Upload a thumbnail image
   * @param userId - User ID for S3 key pattern
   * @param mocId - MOC ID for S3 key pattern
   * @param file - File buffer and metadata
   * @returns S3 key of uploaded file
   */
  uploadThumbnail(
    userId: string,
    mocId: string,
    file: { buffer: Buffer; filename: string; mimetype: string },
  ): Promise<
    Result<{ key: string; url: string }, 'UPLOAD_FAILED' | 'INVALID_IMAGE' | 'IMAGE_TOO_LARGE'>
  >

  /**
   * Delete a thumbnail from S3
   * @param key - S3 key of the file to delete
   */
  deleteThumbnail(key: string): Promise<Result<void, 'DELETE_FAILED'>>

  /**
   * Extract S3 key from a CloudFront or S3 URL
   * @param url - The URL to extract the key from
   */
  extractKeyFromUrl(url: string): string | null
}
