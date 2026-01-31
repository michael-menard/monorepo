import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type { InstructionRepository, FileRepository, FileStorage } from '../ports/index.js'
import type {
  MocInstructions,
  MocFile,
  CreateMocInput,
  UpdateMocInput,
  UploadedFile,
  InstructionsError,
} from '../types.js'
import {
  generateInstructionFileKey,
  generateThumbnailKey,
  generatePartsListKey,
} from '../adapters/storage.js'

/**
 * Instructions Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface InstructionsServiceDeps {
  instructionRepo: InstructionRepository
  fileRepo: FileRepository
  fileStorage: FileStorage
}

/**
 * Create the Instructions Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createInstructionsService(deps: InstructionsServiceDeps) {
  const { instructionRepo, fileRepo, fileStorage } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // MOC CRUD Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create a new MOC instruction
     */
    async createMoc(
      userId: string,
      input: CreateMocInput,
    ): Promise<Result<MocInstructions, InstructionsError>> {
      // Check for duplicate title
      const exists = await instructionRepo.existsByUserAndTitle(userId, input.title)
      if (exists) {
        return err('DUPLICATE_TITLE')
      }

      try {
        const moc = await instructionRepo.insert({
          userId,
          title: input.title,
          description: input.description ?? null,
          type: input.type ?? 'moc',
          mocId: null,
          slug: null,
          author: input.author ?? null,
          partsCount: input.partsCount ?? null,
          minifigCount: input.minifigCount ?? null,
          theme: input.theme ?? null,
          themeId: null,
          subtheme: input.subtheme ?? null,
          uploadedDate: null,
          brand: input.brand ?? null,
          setNumber: input.setNumber ?? null,
          releaseYear: input.releaseYear ?? null,
          retired: null,
          designer: null,
          dimensions: null,
          instructionsMetadata: null,
          features: null,
          descriptionHtml: null,
          shortDescription: null,
          difficulty: input.difficulty ?? null,
          buildTimeHours: input.buildTimeHours ?? null,
          ageRecommendation: input.ageRecommendation ?? null,
          status: input.status ?? 'draft',
          visibility: input.visibility ?? 'private',
          tags: input.tags ?? null,
          thumbnailUrl: null,
          totalPieceCount: input.partsCount ?? null,
        })

        return ok(moc)
      } catch (error) {
        console.error('Failed to create MOC:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get MOC by ID (with ownership check)
     */
    async getMoc(
      userId: string,
      mocId: string,
    ): Promise<Result<MocInstructions, InstructionsError>> {
      const result = await instructionRepo.findById(mocId)

      if (!result.ok) {
        return result
      }

      // Check ownership
      if (result.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return result
    },

    /**
     * Get MOC with its files
     */
    async getMocWithFiles(
      userId: string,
      mocId: string,
    ): Promise<Result<{ moc: MocInstructions; files: MocFile[] }, InstructionsError>> {
      const mocResult = await this.getMoc(userId, mocId)
      if (!mocResult.ok) {
        return mocResult
      }

      const files = await fileRepo.findByMocId(mocId)

      return ok({
        moc: mocResult.data,
        files,
      })
    },

    /**
     * List MOCs for a user
     */
    async listMocs(
      userId: string,
      pagination: PaginationInput,
      filters?: {
        type?: 'moc' | 'set'
        status?: string
        theme?: string
        search?: string
      },
    ): Promise<PaginatedResult<MocInstructions>> {
      return instructionRepo.findByUserId(userId, pagination, filters)
    },

    /**
     * Update a MOC
     */
    async updateMoc(
      userId: string,
      mocId: string,
      input: UpdateMocInput,
    ): Promise<Result<MocInstructions, InstructionsError>> {
      // Check ownership first
      const existing = await instructionRepo.findById(mocId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Check for duplicate title if title is being changed
      if (input.title && input.title !== existing.data.title) {
        const titleExists = await instructionRepo.existsByUserAndTitle(userId, input.title, mocId)
        if (titleExists) {
          return err('DUPLICATE_TITLE')
        }
      }

      return instructionRepo.update(mocId, input)
    },

    /**
     * Delete a MOC and all its files
     */
    async deleteMoc(userId: string, mocId: string): Promise<Result<void, InstructionsError>> {
      // Check ownership first
      const existing = await instructionRepo.findById(mocId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Get all files for this MOC
      const files = await fileRepo.findByMocId(mocId)

      // Delete S3 files
      for (const file of files) {
        const key = fileStorage.extractKeyFromUrl(file.fileUrl)
        if (key) {
          await fileStorage.delete(key)
        }
      }

      // Delete thumbnail if exists
      if (existing.data.thumbnailUrl) {
        const thumbKey = fileStorage.extractKeyFromUrl(existing.data.thumbnailUrl)
        if (thumbKey) {
          await fileStorage.delete(thumbKey)
        }
      }

      // Delete from database (cascade will delete files)
      return instructionRepo.delete(mocId)
    },

    // ─────────────────────────────────────────────────────────────────────
    // File Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Upload an instruction file
     */
    async uploadInstructionFile(
      userId: string,
      mocId: string,
      file: UploadedFile,
    ): Promise<Result<MocFile, InstructionsError>> {
      // Check MOC ownership
      const mocResult = await this.getMoc(userId, mocId)
      if (!mocResult.ok) {
        return mocResult
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/x-studio',
        'application/x-lxf',
        'application/x-ldraw',
      ]
      if (!allowedTypes.includes(file.mimetype) && !file.mimetype.startsWith('application/')) {
        return err('INVALID_FILE')
      }

      // Validate file size (100MB max for instructions)
      const maxSize = 100 * 1024 * 1024
      if (file.size > maxSize) {
        return err('INVALID_FILE')
      }

      // Generate S3 key
      const key = generateInstructionFileKey(userId, mocId, file.filename)

      // Upload to S3
      const uploadResult = await fileStorage.upload(key, file.buffer, file.mimetype)
      if (!uploadResult.ok) {
        return err('UPLOAD_FAILED')
      }

      // Save to database
      try {
        const mocFile = await fileRepo.insert({
          mocId,
          fileType: 'instruction',
          fileUrl: uploadResult.data.url,
          originalFilename: file.filename,
          mimeType: file.mimetype,
        })

        return ok(mocFile)
      } catch (error) {
        // Clean up S3 on DB error
        await fileStorage.delete(key)
        console.error('Failed to save file to database:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Upload a parts list file
     */
    async uploadPartsListFile(
      userId: string,
      mocId: string,
      file: UploadedFile,
    ): Promise<Result<MocFile, InstructionsError>> {
      // Check MOC ownership
      const mocResult = await this.getMoc(userId, mocId)
      if (!mocResult.ok) {
        return mocResult
      }

      // Validate file type (CSV, XML, etc.)
      const allowedTypes = ['text/csv', 'application/xml', 'text/xml', 'application/json']
      if (!allowedTypes.includes(file.mimetype)) {
        return err('INVALID_FILE')
      }

      // Validate file size (10MB max for parts lists)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        return err('INVALID_FILE')
      }

      // Generate S3 key
      const key = generatePartsListKey(userId, mocId, file.filename)

      // Upload to S3
      const uploadResult = await fileStorage.upload(key, file.buffer, file.mimetype)
      if (!uploadResult.ok) {
        return err('UPLOAD_FAILED')
      }

      // Save to database
      try {
        const mocFile = await fileRepo.insert({
          mocId,
          fileType: 'parts-list',
          fileUrl: uploadResult.data.url,
          originalFilename: file.filename,
          mimeType: file.mimetype,
        })

        return ok(mocFile)
      } catch (error) {
        // Clean up S3 on DB error
        await fileStorage.delete(key)
        console.error('Failed to save file to database:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Upload a thumbnail image
     */
    async uploadThumbnail(
      userId: string,
      mocId: string,
      file: UploadedFile,
    ): Promise<Result<MocInstructions, InstructionsError>> {
      // Check MOC ownership
      const mocResult = await this.getMoc(userId, mocId)
      if (!mocResult.ok) {
        return mocResult
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.mimetype)) {
        return err('INVALID_FILE')
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        return err('INVALID_FILE')
      }

      // Delete old thumbnail if exists
      if (mocResult.data.thumbnailUrl) {
        const oldKey = fileStorage.extractKeyFromUrl(mocResult.data.thumbnailUrl)
        if (oldKey) {
          await fileStorage.delete(oldKey)
        }
      }

      // Generate S3 key
      const key = generateThumbnailKey(userId, mocId)

      // Upload to S3
      const uploadResult = await fileStorage.upload(key, file.buffer, file.mimetype)
      if (!uploadResult.ok) {
        return err('UPLOAD_FAILED')
      }

      // Update MOC with new thumbnail URL
      return instructionRepo.update(mocId, { thumbnailUrl: uploadResult.data.url })
    },

    /**
     * Delete a file
     */
    async deleteFile(
      userId: string,
      mocId: string,
      fileId: string,
    ): Promise<Result<void, InstructionsError>> {
      // Check MOC ownership
      const mocResult = await this.getMoc(userId, mocId)
      if (!mocResult.ok) {
        return mocResult
      }

      // Get the file
      const fileResult = await fileRepo.findById(fileId)
      if (!fileResult.ok) {
        return fileResult
      }

      // Verify file belongs to this MOC
      if (fileResult.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      // Delete from S3
      const key = fileStorage.extractKeyFromUrl(fileResult.data.fileUrl)
      if (key) {
        await fileStorage.delete(key)
      }

      // Soft delete from database
      return fileRepo.softDelete(fileId)
    },

    /**
     * List files for a MOC
     */
    async listFiles(
      userId: string,
      mocId: string,
      fileType?: string,
    ): Promise<Result<MocFile[], InstructionsError>> {
      // Check MOC ownership
      const mocResult = await this.getMoc(userId, mocId)
      if (!mocResult.ok) {
        return mocResult
      }

      const files = await fileRepo.findByMocId(mocId, fileType)
      return ok(files)
    },
  }
}

// Export the service type for use in routes
export type InstructionsService = ReturnType<typeof createInstructionsService>
