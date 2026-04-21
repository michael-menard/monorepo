import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type {
  SetRepository,
  SetImageRepository,
  SetInstanceRepository,
  StoreRepository,
  ImageStorage,
} from '../ports/index.js'
import type {
  Set,
  SetImage,
  SetInstance,
  Store,
  CreateSetInput,
  UpdateSetInput,
  CreateSetInstanceInput,
  UpdateSetInstanceInput,
  ReorderInput,
  PurchaseInput,
  CreateSetImageInput,
  RegisterSetImageInput,
  UploadedFile,
  SetError,
  BuildStatus,
} from '../types.js'
import { generateSetImageKey, generateSetThumbnailKey } from '../adapters/storage.js'

// ─────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────

export interface SetsServiceDeps {
  setRepo: SetRepository
  setImageRepo: SetImageRepository
  setInstanceRepo: SetInstanceRepository
  storeRepo: StoreRepository
  imageStorage: ImageStorage
}

// ─────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────

export function createSetsService(deps: SetsServiceDeps) {
  const { setRepo, setImageRepo, setInstanceRepo, storeRepo, imageStorage } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Store Operations
    // ─────────────────────────────────────────────────────────────────────

    async listStores(): Promise<Store[]> {
      return storeRepo.findAll()
    },

    // ─────────────────────────────────────────────────────────────────────
    // Set CRUD
    // ─────────────────────────────────────────────────────────────────────

    async createSet(userId: string, input: CreateSetInput): Promise<Result<Set, SetError>> {
      try {
        // For wanted items, auto-assign sort order
        let sortOrder: number | null = null
        if (input.status === 'wanted') {
          const maxSort = await setRepo.getMaxSortOrder(userId)
          sortOrder = maxSort + 1
        }

        const set = await setRepo.insert({
          userId,
          status: input.status ?? 'wanted',
          statusChangedAt: null,
          title: input.title,
          setNumber: input.setNumber ?? null,
          sourceUrl: input.sourceUrl ?? null,
          storeId: input.storeId ?? null,
          pieceCount: input.pieceCount ?? null,
          releaseDate: input.releaseDate ?? null,
          notes: input.notes ?? null,
          condition: input.condition ?? null,
          completeness: input.completeness ?? null,
          buildStatus: input.buildStatus ?? (input.status === 'owned' ? 'not_started' : null),
          purchasePrice: input.purchasePrice ?? null,
          purchaseTax: input.purchaseTax ?? null,
          purchaseShipping: input.purchaseShipping ?? null,
          purchaseDate: input.purchaseDate ?? null,
          quantity: input.quantity ?? 1,
          priority: input.priority ?? (input.status === 'wanted' ? 0 : null),
          sortOrder,
          imageUrl: input.imageUrl ?? null,
          imageVariants: null,
        })

        return ok(set)
      } catch (error) {
        console.error('Failed to create set:', error)
        return err('DB_ERROR')
      }
    },

    async getSet(userId: string, setId: string): Promise<Result<Set, SetError>> {
      const result = await setRepo.findById(setId)

      if (!result.ok) {
        return result
      }

      if (result.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return result
    },

    async getSetWithImages(
      userId: string,
      setId: string,
    ): Promise<Result<{ set: Set; images: SetImage[]; instances: SetInstance[] }, SetError>> {
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) {
        return setResult
      }

      const [images, instances] = await Promise.all([
        setImageRepo.findBySetId(setId),
        setInstanceRepo.findBySetId(setId),
      ])

      return ok({
        set: setResult.data,
        images,
        instances,
      })
    },

    async listSets(
      userId: string,
      pagination: PaginationInput,
      filters?: {
        search?: string
        status?: 'wanted' | 'owned'
        storeId?: string
        tags?: string[]
        priority?: number
        priorityRange?: { min: number; max: number }
        priceRange?: { min: number; max: number }
        isBuilt?: boolean
        sort?: string
        order?: 'asc' | 'desc'
      },
    ): Promise<PaginatedResult<Set>> {
      return setRepo.findByUserId(userId, pagination, filters)
    },

    async updateSet(
      userId: string,
      setId: string,
      input: UpdateSetInput,
    ): Promise<Result<Set, SetError>> {
      const existing = await setRepo.findById(setId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      const updateData: Record<string, unknown> = {}

      if (input.status !== undefined) {
        updateData.status = input.status
        updateData.statusChangedAt = new Date()
      }
      if (input.title !== undefined) updateData.title = input.title
      if (input.setNumber !== undefined) updateData.setNumber = input.setNumber
      if (input.sourceUrl !== undefined) updateData.sourceUrl = input.sourceUrl
      if (input.storeId !== undefined) updateData.storeId = input.storeId
      if (input.pieceCount !== undefined) updateData.pieceCount = input.pieceCount
      if (input.theme !== undefined) updateData.theme = input.theme
      if (input.description !== undefined) updateData.description = input.description
      if (input.dimensions !== undefined) updateData.dimensions = input.dimensions
      if (input.releaseDate !== undefined) updateData.releaseDate = input.releaseDate
      if (input.tags !== undefined) updateData.tags = input.tags
      if (input.notes !== undefined) updateData.notes = input.notes
      if (input.condition !== undefined) updateData.condition = input.condition
      if (input.completeness !== undefined) updateData.completeness = input.completeness
      if (input.buildStatus !== undefined) updateData.buildStatus = input.buildStatus
      if (input.purchasePrice !== undefined) updateData.purchasePrice = input.purchasePrice
      if (input.purchaseTax !== undefined) updateData.purchaseTax = input.purchaseTax
      if (input.purchaseShipping !== undefined) updateData.purchaseShipping = input.purchaseShipping
      if (input.purchaseDate !== undefined) updateData.purchaseDate = input.purchaseDate
      if (input.quantity !== undefined) updateData.quantity = input.quantity
      if (input.priority !== undefined) updateData.priority = input.priority
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl
      if (input.msrpPrice !== undefined) updateData.msrpPrice = input.msrpPrice
      if (input.msrpCurrency !== undefined) updateData.msrpCurrency = input.msrpCurrency
      if (input.weight !== undefined) updateData.weight = input.weight
      if (input.availabilityStatus !== undefined)
        updateData.availabilityStatus = input.availabilityStatus
      if (input.quantityWanted !== undefined) updateData.quantityWanted = input.quantityWanted
      if (input.lastScrapedAt !== undefined) updateData.lastScrapedAt = input.lastScrapedAt
      if (input.lastScrapedSource !== undefined)
        updateData.lastScrapedSource = input.lastScrapedSource

      return setRepo.update(setId, updateData)
    },

    async deleteSet(userId: string, setId: string): Promise<Result<void, SetError>> {
      const existing = await setRepo.findById(setId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Delete images from S3
      const images = await setImageRepo.findBySetId(setId)
      for (const image of images) {
        const mainKey = imageStorage.extractKeyFromUrl(image.imageUrl)
        const thumbKey = image.thumbnailUrl
          ? imageStorage.extractKeyFromUrl(image.thumbnailUrl)
          : null

        if (mainKey) await imageStorage.delete(mainKey)
        if (thumbKey) await imageStorage.delete(thumbKey)
      }

      await setImageRepo.deleteBySetId(setId)
      return setRepo.delete(setId)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Reorder (wanted items)
    // ─────────────────────────────────────────────────────────────────────

    async reorderSets(
      userId: string,
      input: ReorderInput,
    ): Promise<Result<{ updated: number }, SetError>> {
      const itemIds = input.items.map(item => item.id)
      const ownsAll = await setRepo.verifyOwnership(userId, itemIds)

      if (!ownsAll) {
        return err('VALIDATION_ERROR')
      }

      const result = await setRepo.updateSortOrders(userId, input.items)

      if (!result.ok) {
        return result
      }

      return ok({ updated: result.data })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Purchase (wanted → owned)
    // ─────────────────────────────────────────────────────────────────────

    async purchaseSet(
      userId: string,
      setId: string,
      input: PurchaseInput,
    ): Promise<Result<Set, SetError>> {
      const existing = await setRepo.findById(setId)
      if (!existing.ok) return existing
      if (existing.data.userId !== userId) return err('FORBIDDEN')

      if (existing.data.status !== 'wanted') {
        return err('INVALID_STATUS')
      }

      const now = new Date()
      const updateData: Record<string, unknown> = {
        status: 'owned',
        statusChangedAt: now,
        purchaseDate: input.purchaseDate ?? now,
        purchasePrice: input.purchasePrice ?? null,
        purchaseTax: input.purchaseTax ?? null,
        purchaseShipping: input.purchaseShipping ?? null,
        condition: input.condition ?? null,
        completeness: input.completeness ?? null,
        buildStatus: input.buildStatus ?? 'not_started',
      }

      return setRepo.update(setId, updateData)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Build Status
    // ─────────────────────────────────────────────────────────────────────

    async updateBuildStatus(
      userId: string,
      setId: string,
      buildStatus: BuildStatus,
    ): Promise<Result<Set, SetError>> {
      const existing = await setRepo.findById(setId)
      if (!existing.ok) return existing
      if (existing.data.userId !== userId) return err('FORBIDDEN')

      if (existing.data.status !== 'owned') {
        return err('INVALID_STATUS')
      }

      return setRepo.update(setId, { buildStatus })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Set Instance Operations
    // ─────────────────────────────────────────────────────────────────────

    async listSetInstances(
      userId: string,
      setId: string,
    ): Promise<Result<SetInstance[], SetError>> {
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) return setResult

      const instances = await setInstanceRepo.findBySetId(setId)
      return ok(instances)
    },

    async createSetInstance(
      userId: string,
      setId: string,
      input: CreateSetInstanceInput,
    ): Promise<Result<SetInstance, SetError>> {
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) return setResult

      try {
        // Auto-flip: if this is the first instance and set is 'wanted', flip to 'owned'
        const currentCount = await setInstanceRepo.countBySetId(setId)
        if (currentCount === 0 && setResult.data.status === 'wanted') {
          await setRepo.update(setId, {
            status: 'owned',
            statusChangedAt: new Date(),
          })
        }

        const instance = await setInstanceRepo.insert({
          ...input,
          setId,
          userId,
        })

        return ok(instance)
      } catch (error) {
        console.error('Failed to create set instance:', error)
        return err('DB_ERROR')
      }
    },

    async updateSetInstance(
      userId: string,
      instanceId: string,
      input: UpdateSetInstanceInput,
    ): Promise<Result<SetInstance, SetError>> {
      // Verify instance exists
      const instanceResult = await setInstanceRepo.findById(instanceId)
      if (!instanceResult.ok) return instanceResult

      // Verify ownership via set
      const setResult = await this.getSet(userId, instanceResult.data.setId)
      if (!setResult.ok) return setResult

      return setInstanceRepo.update(instanceId, input)
    },

    async deleteSetInstance(
      userId: string,
      instanceId: string,
    ): Promise<Result<void, SetError>> {
      // Verify instance exists
      const instanceResult = await setInstanceRepo.findById(instanceId)
      if (!instanceResult.ok) return instanceResult

      // Verify ownership via set
      const setResult = await this.getSet(userId, instanceResult.data.setId)
      if (!setResult.ok) return setResult

      // Do NOT auto-flip status back on delete
      return setInstanceRepo.delete(instanceId)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Image Operations
    // ─────────────────────────────────────────────────────────────────────

    async presignSetImage(
      userId: string,
      setId: string,
      filename: string,
      contentType: string,
    ): Promise<Result<{ uploadUrl: string; imageUrl: string; key: string }, SetError>> {
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) return setResult

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(contentType)) {
        return err('INVALID_FILE')
      }

      const imageId = crypto.randomUUID()
      const extension = filename.split('.').pop()?.toLowerCase() || 'webp'
      const key = `sets/${userId}/${setId}/${imageId}.${extension}`

      const result = await imageStorage.generatePresignedUrl(key, contentType)
      if (!result.ok) return err('UPLOAD_FAILED')

      return ok({
        uploadUrl: result.data.uploadUrl,
        imageUrl: result.data.imageUrl,
        key,
      })
    },

    async registerSetImage(
      userId: string,
      setId: string,
      input: RegisterSetImageInput,
    ): Promise<Result<SetImage, SetError>> {
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) return setResult

      const position = await setImageRepo.getNextPosition(setId)

      try {
        const image = await setImageRepo.insert({
          setId,
          imageUrl: input.imageUrl,
          thumbnailUrl: input.thumbnailUrl ?? null,
          position,
        })

        return ok(image)
      } catch (error) {
        console.error('Failed to register set image:', error)
        return err('DB_ERROR')
      }
    },

    async uploadSetImage(
      userId: string,
      setId: string,
      file: UploadedFile,
      input?: Partial<CreateSetImageInput>,
    ): Promise<Result<SetImage, SetError>> {
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) return setResult

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.mimetype)) return err('INVALID_FILE')

      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) return err('INVALID_FILE')

      const imageId = crypto.randomUUID()
      const mainKey = generateSetImageKey(userId, setId, imageId)
      const thumbKey = generateSetThumbnailKey(userId, setId, imageId)

      const uploadResult = await imageStorage.upload(mainKey, file.buffer, file.mimetype)
      if (!uploadResult.ok) return err('UPLOAD_FAILED')

      const thumbResult = await imageStorage.upload(thumbKey, file.buffer, file.mimetype)
      if (!thumbResult.ok) {
        await imageStorage.delete(mainKey)
        return err('UPLOAD_FAILED')
      }

      const position = input?.position ?? (await setImageRepo.getNextPosition(setId))

      try {
        const image = await setImageRepo.insert({
          setId,
          imageUrl: uploadResult.data.url,
          thumbnailUrl: thumbResult.data.url,
          position,
        })

        return ok(image)
      } catch (error) {
        await imageStorage.delete(mainKey)
        await imageStorage.delete(thumbKey)
        console.error('Failed to save set image to database:', error)
        return err('DB_ERROR')
      }
    },

    async getSetImage(userId: string, imageId: string): Promise<Result<SetImage, SetError>> {
      const imageResult = await setImageRepo.findById(imageId)
      if (!imageResult.ok) return imageResult

      const setResult = await setRepo.findById(imageResult.data.setId)
      if (!setResult.ok) return err('NOT_FOUND')
      if (setResult.data.userId !== userId) return err('FORBIDDEN')

      return imageResult
    },

    async listSetImages(userId: string, setId: string): Promise<Result<SetImage[], SetError>> {
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) return setResult

      const images = await setImageRepo.findBySetId(setId)
      return ok(images)
    },

    async updateSetImage(
      userId: string,
      imageId: string,
      input: { position?: number },
    ): Promise<Result<SetImage, SetError>> {
      const imageResult = await this.getSetImage(userId, imageId)
      if (!imageResult.ok) return imageResult

      return setImageRepo.update(imageId, input)
    },

    async deleteSetImage(userId: string, imageId: string): Promise<Result<void, SetError>> {
      const imageResult = await this.getSetImage(userId, imageId)
      if (!imageResult.ok) return imageResult

      const image = imageResult.data
      const mainKey = imageStorage.extractKeyFromUrl(image.imageUrl)
      const thumbKey = image.thumbnailUrl
        ? imageStorage.extractKeyFromUrl(image.thumbnailUrl)
        : null

      if (mainKey) await imageStorage.delete(mainKey)
      if (thumbKey) await imageStorage.delete(thumbKey)

      return setImageRepo.delete(imageId)
    },
  }
}

export type SetsService = ReturnType<typeof createSetsService>
