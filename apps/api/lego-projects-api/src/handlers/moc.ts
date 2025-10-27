import { Request, Response } from 'express'
import { eq, and, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/client'
import {
  mocInstructions,
  mocFiles,
  mocGalleryImages,
  galleryImages,
  mocPartsLists,
} from '../db/schema'
import { apiResponse } from '../utils/response'
import {
  indexMoc,
  updateMoc as updateMocES,
  deleteMoc as deleteMocES,
  searchMocs as searchMocsES,
  initializeMocIndex,
} from '../utils/elasticsearch'
import {
  CreateMocSchema,
  CreateMocWithFilesSchema,
  UpdateMocSchema,
  FileUploadSchema,
  type MocInstruction,
  type CreateMoc,
  type CreateMocWithFiles,
  type UpdateMoc,
} from '../types'

// Initialize MOC index on startup
initializeMocIndex()

// POST /api/mocs - Create new MOC with metadata
export const createMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate input
    const parse = CreateMocSchema.safeParse(req.body)
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() })
    }

    const mocData = parse.data
    const mocId = uuidv4()
    const now = new Date()

    // Insert into database
    const [moc] = await db
      .insert(mocInstructions)
      .values({
        id: mocId,
        userId,
        type: 'moc', // Add required type field
        title: mocData.title,
        description: mocData.description || null,
        tags: mocData.tags || null,
        thumbnailUrl: mocData.thumbnailUrl || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    // Index in Elasticsearch
    await indexMoc(moc)

    return res.status(201).json({
      message: 'MOC created successfully',
      moc,
    })
  } catch (error) {
    console.error('createMoc error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to create MOC', details: (error as Error).message })
  }
}

// POST /api/mocs/with-files - Create new MOC with metadata and file uploads
export const createMocWithFiles = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Parse tags if they're sent as JSON string
    const parsedBody = { ...req.body }
    if (typeof req.body.tags === 'string') {
      try {
        parsedBody.tags = JSON.parse(req.body.tags)
      } catch (error) {
        console.warn('Failed to parse tags JSON:', error)
        parsedBody.tags = []
      }
    }

    // Parse uploadedDate if it's a string
    if (typeof req.body.uploadedDate === 'string') {
      try {
        parsedBody.uploadedDate = new Date(req.body.uploadedDate)
      } catch (error) {
        console.warn('Failed to parse uploadedDate:', error)
        parsedBody.uploadedDate = new Date() // Default to now
      }
    }

    // Parse partsCount if it's a string
    if (typeof req.body.partsCount === 'string') {
      parsedBody.partsCount = parseInt(req.body.partsCount, 10)
    }

    // Validate input
    const parse = CreateMocWithFilesSchema.safeParse(parsedBody)
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() })
    }

    const mocData = parse.data
    const mocId = uuidv4()
    const now = new Date()

    // Get uploaded files from multer
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    console.log('📁 Received files:', files)
    console.log('📝 Received data:', mocData)

    // Validate required files
    if (!files?.instructionsFile || files.instructionsFile.length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one instructions file is required (PDF or .io format)' })
    }

    // Images are optional (0-3 allowed)
    // Parts lists are optional (0-10 allowed)
    // Instructions files: 1 or more allowed (up to 10)

    // Insert MOC/Set metadata into database
    const baseValues = {
      id: mocId,
      userId,
      title: mocData.title,
      description: mocData.description || null,
      type: mocData.type,
      tags: mocData.tags || null,
      thumbnailUrl: null, // Will be set from first uploaded image
      createdAt: now,
      updatedAt: now,
    }

    // Add type-specific fields
    const values =
      mocData.type === 'moc'
        ? {
            ...baseValues,
            author: mocData.author,
            setNumber: mocData.setNumber, // MOC ID like "MOC-172552"
            partsCount: mocData.partsCount,
            theme: mocData.theme,
            subtheme: mocData.subtheme || null,
            uploadedDate: mocData.uploadedDate ? new Date(mocData.uploadedDate) : now,
            brand: null,
            releaseYear: null,
            retired: null,
          }
        : {
            ...baseValues,
            author: null,
            brand: mocData.brand,
            theme: mocData.theme,
            setNumber: mocData.setNumber || null,
            releaseYear: mocData.releaseYear || null,
            retired: mocData.retired || false,
            partsCount: null,
            subtheme: null,
            uploadedDate: null,
          }

    const [moc] = await db.insert(mocInstructions).values(values).returning()

    // Process and save files
    const savedFiles: any[] = []

    // Save instruction files (1 or more)
    for (const instructionsFile of files.instructionsFile) {
      const instructionsFileId = uuidv4()

      // Generate filename if not provided (happens with memory storage)
      let filename = instructionsFile.filename
      if (!filename) {
        const ext = instructionsFile.originalname
          ? instructionsFile.originalname.split('.').pop()
          : 'bin'
        const baseName = instructionsFile.originalname
          ? instructionsFile.originalname.replace(/\.[^/.]+$/, '')
          : 'file'
        // Sanitize filename: replace spaces and special characters with hyphens
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
        filename = `${sanitizedBaseName}-${uuidv4()}.${ext}`
      }

      // Use the actual file path from multer for local storage, or generate URL for memory storage
      const instructionsFileUrl = instructionsFile.path
        ? instructionsFile.path.replace(/^uploads\//, '/uploads/')
        : `/uploads/moc-files/${userId}/instructions/${filename}`

      console.log('🔍 Processing instruction file:', {
        originalname: instructionsFile.originalname,
        filename: instructionsFile.filename,
        generatedFilename: filename,
        path: instructionsFile.path,
        finalUrl: instructionsFileUrl,
      })

      const [savedInstructionsFile] = await db
        .insert(mocFiles)
        .values({
          id: instructionsFileId,
          mocId,
          fileType: 'instruction',
          fileUrl: instructionsFileUrl,
          originalFilename: instructionsFile.originalname,
          mimeType: instructionsFile.mimetype,
          createdAt: now,
        })
        .returning()

      savedFiles.push(savedInstructionsFile)
    }

    // Save parts list files (if any)
    if (files.partsLists && files.partsLists.length > 0) {
      for (const partsListFile of files.partsLists) {
        const partsListFileId = uuidv4()

        // Generate filename if not provided (happens with memory storage)
        let filename = partsListFile.filename
        if (!filename) {
          const ext = partsListFile.originalname
            ? partsListFile.originalname.split('.').pop()
            : 'bin'
          const baseName = partsListFile.originalname
            ? partsListFile.originalname.replace(/\.[^/.]+$/, '')
            : 'file'
          // Sanitize filename: replace spaces and special characters with hyphens
          const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
          filename = `${sanitizedBaseName}-${uuidv4()}.${ext}`
        }

        const partsListFileUrl = partsListFile.path
          ? partsListFile.path.replace(/^uploads\//, '/uploads/')
          : `/uploads/moc-files/${userId}/parts-lists/${filename}`

        const [savedPartsListFile] = await db
          .insert(mocFiles)
          .values({
            id: partsListFileId,
            mocId,
            fileType: 'parts-list',
            fileUrl: partsListFileUrl,
            originalFilename: partsListFile.originalname,
            mimeType: partsListFile.mimetype,
            createdAt: now,
          })
          .returning()

        savedFiles.push(savedPartsListFile)
      }
    }

    // Save image files (optional - 0 to 3 images)
    let thumbnailUrl = null
    if (files.images && files.images.length > 0) {
      for (let i = 0; i < files.images.length; i++) {
        const imageFile = files.images[i]
        const imageFileId = uuidv4()

        // Generate filename if not provided (happens with memory storage)
        let filename = imageFile.filename
        if (!filename) {
          const ext = imageFile.originalname ? imageFile.originalname.split('.').pop() : 'bin'
          const baseName = imageFile.originalname
            ? imageFile.originalname.replace(/\.[^/.]+$/, '')
            : 'file'
          // Sanitize filename: replace spaces and special characters with hyphens
          const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
          filename = `${sanitizedBaseName}-${uuidv4()}.${ext}`
        }

        const imageFileUrl = imageFile.path
          ? imageFile.path.replace(/^uploads\//, '/uploads/')
          : `/uploads/moc-files/${userId}/images/${filename}`

        // Use first image as thumbnail
        if (i === 0) {
          thumbnailUrl = imageFileUrl
        }

        const [savedImageFile] = await db
          .insert(mocFiles)
          .values({
            id: imageFileId,
            mocId,
            fileType: i === 0 ? 'thumbnail' : 'gallery-image',
            fileUrl: imageFileUrl,
            originalFilename: imageFile.originalname,
            mimeType: imageFile.mimetype,
            createdAt: now,
          })
          .returning()

        savedFiles.push(savedImageFile)
      }
    }

    // Update MOC with thumbnail URL
    if (thumbnailUrl) {
      await db
        .update(mocInstructions)
        .set({ thumbnailUrl, updatedAt: now })
        .where(eq(mocInstructions.id, mocId))

      moc.thumbnailUrl = thumbnailUrl
    }

    // Index in Elasticsearch
    await indexMoc(moc)

    // Create images array for frontend consistency (same format as search endpoint)
    const images = savedFiles
      .filter(file => file.fileType === 'thumbnail' || file.fileType === 'gallery-image')
      .map(file => ({
        id: file.id,
        url: file.fileUrl,
        alt: file.originalFilename || 'MOC Image',
        caption: file.originalFilename || 'MOC Image',
      }))

    return res.status(201).json({
      message: 'MOC created successfully with files',
      moc: {
        ...moc,
        files: savedFiles,
        images: images, // Add images array for frontend consistency
      },
    })
  } catch (error) {
    console.error('createMocWithFiles error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to create MOC with files', details: (error as Error).message })
  }
}

// PATCH /api/mocs/:id - Update MOC metadata
export const updateMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id))
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' })
    }

    // Only owner or admin can edit
    if (moc.userId !== userId && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to edit this MOC' })
    }

    // Validate input
    const parse = UpdateMocSchema.safeParse(req.body)
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() })
    }

    const updateData = { ...parse.data, updatedAt: new Date() }

    // Update DB
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set(updateData)
      .where(eq(mocInstructions.id, id))
      .returning()

    // Update in Elasticsearch
    await updateMocES(updatedMoc)

    return res.json({
      message: 'MOC metadata updated',
      moc: updatedMoc,
    })
  } catch (error) {
    console.error('updateMoc error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to update MOC', details: (error as Error).message })
  }
}

// POST /api/mocs/:id/files - Upload instruction or parts list file
export const uploadMocFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id))
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' })
    }

    // Only owner or admin can upload files
    if (moc.userId !== userId && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to upload files to this MOC' })
    }

    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'File is required' })
    }

    // Validate file type
    const fileType = req.body.fileType
    if (!fileType || !['instruction', 'parts-list', 'thumbnail'].includes(fileType)) {
      return res
        .status(400)
        .json({ error: 'Invalid file type. Must be instruction, parts-list, or thumbnail' })
    }

    // Enforce file type restrictions
    const allowedTypes = {
      instruction: ['application/pdf', 'application/octet-stream'], // .io files
      'parts-list': [
        'text/csv',
        'application/json',
        'text/plain',
        'application/xml',
        'text/xml',
        'application/octet-stream',
      ], // CSV, JSON, TXT, XML files
      thumbnail: ['image/jpeg', 'image/png', 'image/heic'],
    }

    if (!allowedTypes[fileType as keyof typeof allowedTypes].includes(file.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type for ${fileType}. Allowed: ${allowedTypes[fileType as keyof typeof allowedTypes].join(', ')}`,
      })
    }

    // Enforce one instruction file per MOC
    if (fileType === 'instruction') {
      const existingInstruction = await db
        .select()
        .from(mocFiles)
        .where(and(eq(mocFiles.mocId, id), eq(mocFiles.fileType, 'instruction')))
      if (existingInstruction.length > 0) {
        return res
          .status(409)
          .json({ error: 'MOC already has an instruction file. Delete the existing one first.' })
      }
    }

    // Enforce max file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' })
    }

    // Save file (in a real implementation, this would be S3)
    const fileId = uuidv4()
    const ext = file.originalname ? file.originalname.split('.').pop() : 'bin'
    const filename = `${fileId}.${ext}`
    const fileUrl = `/uploads/mocs/${userId}/${id}/${filename}` // This would be S3 URL in production

    // Insert file record
    const [mocFile] = await db
      .insert(mocFiles)
      .values({
        id: fileId,
        mocId: id,
        fileType,
        fileUrl,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        createdAt: new Date(),
      })
      .returning()

    // Update MOC's updatedAt timestamp
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set({ updatedAt: new Date() })
      .where(eq(mocInstructions.id, id))
      .returning()

    // Update in Elasticsearch
    await updateMocES(updatedMoc)

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: mocFile,
      moc: updatedMoc,
    })
  } catch (error) {
    console.error('uploadMocFile error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to upload file', details: (error as Error).message })
  }
}

// DELETE /api/mocs/:id/files/:fileId - Delete file
export const deleteMocFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { id, fileId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id))
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' })
    }

    // Only owner or admin can delete files
    if (moc.userId !== userId && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to delete files from this MOC' })
    }

    // Fetch file record
    const [mocFile] = await db
      .select()
      .from(mocFiles)
      .where(and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, id)))

    if (!mocFile) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Delete file record
    const [deletedFile] = await db.delete(mocFiles).where(eq(mocFiles.id, fileId)).returning()

    // Update MOC's updatedAt timestamp
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set({ updatedAt: new Date() })
      .where(eq(mocInstructions.id, id))
      .returning()

    // Update in Elasticsearch
    await updateMocES(updatedMoc)

    return res.json({
      message: 'File deleted successfully',
      file: deletedFile,
      moc: updatedMoc,
    })
  } catch (error) {
    console.error('deleteMocFile error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to delete file', details: (error as Error).message })
  }
}

// GET /api/mocs/search - Full-text search via Elasticsearch (public access)
export const searchMocs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id // Optional - for authenticated users
    const { q: query, tag, from = '0', size = '20' } = req.query

    // Try Elasticsearch first
    const esResult = await searchMocsES({
      userId: userId || null, // Allow null for public search
      query: query as string,
      tag: tag as string,
      from: parseInt(from as string),
      size: parseInt(size as string),
    })

    if (esResult) {
      return res.json({
        mocs: esResult.hits,
        total: esResult.total,
        source: 'elasticsearch',
      })
    }

    // Fallback to database search
    console.log('Elasticsearch unavailable, falling back to database search')

    // For public access, show all MOCs; for authenticated users, show their MOCs
    const whereClause = userId ? eq(mocInstructions.userId, userId) : undefined

    const mocs = await db
      .select()
      .from(mocInstructions)
      .where(whereClause)
      .limit(parseInt(size as string))
      .offset(parseInt(from as string))

    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(mocInstructions)
      .where(whereClause)

    return res.json({
      mocs,
      total: totalResult[0]?.count || 0,
      source: 'database',
    })
  } catch (error) {
    console.error('searchMocs error:', error)
    // For now, return empty results instead of error to allow frontend testing
    return res.json({
      mocs: [],
      total: 0,
      source: 'fallback',
      message: 'Database not yet populated with MOCs',
    })
  }
}

// GET /api/mocs/:id - Get specific MOC (public access)
export const getMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id // Optional - for authenticated users
    const userRole = req.user?.role
    const { id } = req.params

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id))
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' })
    }

    // For public access, allow viewing all MOCs
    // For authenticated users, they can view their own MOCs or if they're admin
    const canView = !userId || moc.userId === userId || userRole === 'admin'
    if (!canView) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to view this MOC' })
    }

    // Fetch associated files
    const files = await db.select().from(mocFiles).where(eq(mocFiles.mocId, id))

    return res.json(
      apiResponse(200, 'MOC retrieved successfully', {
        ...moc,
        files,
      }),
    )
  } catch (error) {
    console.error('getMoc error:', error)
    return res.status(500).json({ error: 'Failed to get MOC', details: (error as Error).message })
  }
}

// DELETE /api/mocs/:id - Delete MOC
export const deleteMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id))
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' })
    }

    // Only owner or admin can delete
    if (moc.userId !== userId && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to delete this MOC' })
    }

    // Remove from DB (cascade will handle related files)
    const [deletedMoc] = await db
      .delete(mocInstructions)
      .where(eq(mocInstructions.id, id))
      .returning()

    // Remove from Elasticsearch
    await deleteMocES(id)

    return res.json({
      message: 'MOC deleted successfully',
      moc: deletedMoc,
    })
  } catch (error) {
    console.error('deleteMoc error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to delete MOC', details: (error as Error).message })
  }
}

// POST /api/mocs/:id/gallery-images - Link gallery image to MOC
export const linkGalleryImageToMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const { id: mocId } = req.params
    const { galleryImageId } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!galleryImageId) {
      return res.status(400).json({ error: 'Gallery image ID is required' })
    }

    // Check if MOC exists and user owns it
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, mocId))
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' })
    }
    if (moc.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only link images to your own MOCs' })
    }

    // Check if gallery image exists
    const [galleryImage] = await db
      .select()
      .from(mocGalleryImages)
      .where(eq(mocGalleryImages.id, galleryImageId))
    if (!galleryImage) {
      return res.status(404).json({ error: 'Gallery image not found' })
    }

    // Check if link already exists
    const [existingLink] = await db
      .select()
      .from(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )

    if (existingLink) {
      return res.status(409).json({ error: 'Image is already linked to this MOC' })
    }

    // Create the link
    const [link] = await db
      .insert(mocGalleryImages)
      .values({
        mocId,
        galleryImageId,
      })
      .returning()

    return res.status(201).json({
      message: 'Gallery image linked successfully',
      link,
    })
  } catch (error) {
    console.error('linkGalleryImageToMoc error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to link gallery image', details: (error as Error).message })
  }
}

// DELETE /api/mocs/:id/gallery-images/:galleryImageId - Unlink gallery image from MOC
export const unlinkGalleryImageFromMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const { id: mocId, galleryImageId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if MOC exists and user owns it
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, mocId))
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' })
    }
    if (moc.userId !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You can only unlink images from your own MOCs' })
    }

    // Check if link exists
    const [existingLink] = await db
      .select()
      .from(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )

    if (!existingLink) {
      return res.status(404).json({ error: 'Image is not linked to this MOC' })
    }

    // Remove the link
    await db
      .delete(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )

    return res.status(200).json({
      message: 'Gallery image unlinked successfully',
    })
  } catch (error) {
    console.error('unlinkGalleryImageFromMoc error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to unlink gallery image', details: (error as Error).message })
  }
}

// GET /api/mocs/:id/gallery-images - Get linked gallery images for MOC
export const getMocGalleryImages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const { id: mocId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if MOC exists and user owns it
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, mocId))
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' })
    }
    if (moc.userId !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You can only view images from your own MOCs' })
    }

    // Get linked gallery images with full image data
    const linkedImages = await db
      .select({
        id: galleryImages.id,
        title: galleryImages.title,
        description: galleryImages.description,
        url: galleryImages.imageUrl,
        tags: galleryImages.tags,
        createdAt: galleryImages.createdAt,
        lastUpdatedAt: galleryImages.lastUpdatedAt,
        linkedAt: mocGalleryImages.id, // Using the link ID as linkedAt timestamp
      })
      .from(mocGalleryImages)
      .innerJoin(galleryImages, eq(mocGalleryImages.galleryImageId, galleryImages.id))
      .where(eq(mocGalleryImages.mocId, mocId))
      .orderBy(galleryImages.createdAt)

    return res.status(200).json({
      message: 'Linked gallery images retrieved successfully',
      images: linkedImages,
    })
  } catch (error) {
    console.error('getMocGalleryImages error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to get linked gallery images', details: (error as Error).message })
  }
}

// POST /api/mocs/upload-parts-list - Upload parts list file with parsing and piece count calculation
export const uploadPartsList = async (req: Request, res: Response) => {
  try {
    console.log('🚀 uploadPartsList handler called')
    console.log('📋 Request headers:', req.headers)
    console.log('📋 Request body:', req.body)
    console.log('📋 Request file:', req.file)
    console.log('📋 User:', req.user)

    const { mocId, fileType } = req.body
    const partsListFile = req.file

    if (!mocId || !partsListFile) {
      console.log('❌ Missing required fields:', { mocId: !!mocId, partsListFile: !!partsListFile })
      return res.status(400).json({
        error: 'Missing required fields: mocId and partsListFile',
        code: 'MISSING_FIELDS',
      })
    }

    console.log('📤 Processing parts list file:', {
      mocId,
      fileName: partsListFile.originalname,
      fileSize: partsListFile.size,
      mimeType: partsListFile.mimetype,
    })

    // Check if MOC exists and user has permission
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, req.user?.sub || '')))

    if (!moc) {
      return res.status(404).json({
        error: 'MOC not found or access denied',
        code: 'MOC_NOT_FOUND',
      })
    }

    // Parse the parts list file
    console.log('🔍 Parsing parts list file...')
    const { parsePartsListFile } = await import('../utils/parts-list-parser')
    const parseResult = await parsePartsListFile(partsListFile)

    if (!parseResult.success) {
      console.log('❌ Parts list parsing failed:', parseResult.errors)
      return res.status(400).json({
        error: 'Failed to parse parts list file',
        code: 'PARSING_FAILED',
        details: parseResult.errors,
      })
    }

    const { totalPieceCount, parts, format } = parseResult.data!
    console.log(
      `✅ Parts list parsed successfully: ${totalPieceCount} pieces, ${parts.length} unique parts`,
    )

    // Create file record in database
    const fileUrl = partsListFile.path
      ? `/${partsListFile.path}`
      : `/uploads/moc-files/${req.user?.sub}/parts-list/${partsListFile.filename}`
    const [fileRecord] = await db
      .insert(mocFiles)
      .values({
        mocId,
        fileType: 'parts-list',
        fileUrl,
        originalFilename: partsListFile.originalname,
        mimeType: partsListFile.mimetype,
      })
      .returning()

    // Update MOC with total piece count
    console.log('📊 Updating MOC with piece count...')
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set({
        totalPieceCount,
        updatedAt: new Date(),
      })
      .where(eq(mocInstructions.id, mocId))
      .returning()

    // Create parts list record with parsed data
    const [partsListRecord] = await db
      .insert(mocPartsLists)
      .values({
        mocId,
        fileId: fileRecord.id,
        title: `Parts List - ${partsListFile.originalname}`,
        description: `Parsed ${format.toUpperCase()} parts list with ${totalPieceCount} total pieces`,
        totalPartsCount: totalPieceCount.toString(),
      })
      .returning()

    console.log('✅ Parts list processed successfully:', {
      fileId: fileRecord.id,
      partsListId: partsListRecord.id,
      totalPieceCount,
      uniqueParts: parts.length,
    })

    return res.status(201).json({
      message: 'Parts list uploaded and processed successfully',
      data: {
        file: fileRecord,
        partsList: partsListRecord,
        parsing: {
          totalPieceCount,
          uniqueParts: parts.length,
          format,
          success: true,
        },
        moc: {
          id: updatedMoc.id,
          totalPieceCount: updatedMoc.totalPieceCount,
        },
      },
    })
  } catch (error) {
    console.error('❌ Parts list upload error:', error)
    return res.status(500).json({
      error: 'Failed to upload and process parts list',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// GET /api/mocs/stats/by-category - Get MOC statistics grouped by category
export const getMocStatsByCategory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    console.log('📊 MOC stats endpoint called, userId:', userId)

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    console.log('📊 Getting MOC stats by category for user:', userId)

    // Since we don't have a category field yet, we'll use theme field for now
    // and also count by tags for additional categorization

    // Get stats by theme (for sets) and by tags (for MOCs)
    const themeStats = await db
      .select({
        category: mocInstructions.theme,
        count: sql<number>`count(*)::int`,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          sql`${mocInstructions.theme} IS NOT NULL AND ${mocInstructions.theme} != ''`,
        ),
      )
      .groupBy(mocInstructions.theme)

    // For MOCs without themes, we'll extract categories from tags
    // This is a temporary solution until we add a proper category field
    const mocsWithTags = await db
      .select({
        tags: mocInstructions.tags,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          eq(mocInstructions.type, 'moc'),
          sql`${mocInstructions.tags} IS NOT NULL`,
        ),
      )

    // Process tags to extract categories
    const tagCounts: Record<string, number> = {}
    mocsWithTags.forEach(moc => {
      if (moc.tags && Array.isArray(moc.tags)) {
        moc.tags.forEach(tag => {
          const category = String(tag).toLowerCase()
          tagCounts[category] = (tagCounts[category] || 0) + 1
        })
      }
    })

    // Convert tag counts to the same format as theme stats
    const tagStats = Object.entries(tagCounts).map(([category, count]) => ({
      category,
      count,
    }))

    // Combine theme stats and tag stats, avoiding duplicates
    const allStats = [...themeStats]
    tagStats.forEach(tagStat => {
      const existingTheme = allStats.find(
        stat => stat.category?.toLowerCase() === tagStat.category.toLowerCase(),
      )
      if (!existingTheme) {
        allStats.push(tagStat)
      }
    })

    // Sort by count descending and take top categories
    const sortedStats = allStats
      .filter(stat => stat.category && stat.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 categories

    console.log('📊 MOC stats by category:', sortedStats)

    return res.json({
      success: true,
      data: sortedStats,
      total: sortedStats.reduce((sum, stat) => sum + stat.count, 0),
    })
  } catch (error) {
    console.error('❌ Get MOC stats by category error:', error)
    return res.status(500).json({
      error: 'Failed to get MOC statistics',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// GET /api/mocs/stats/uploads-over-time - Get MOC upload statistics over time by category
export const getMocUploadsOverTime = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    console.log('📈 MOC uploads over time endpoint called, userId:', userId)

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    console.log('📈 Getting MOC uploads over time for user:', userId)

    // First, let's see what MOCs exist for this user
    const allUserMocs = await db
      .select({
        id: mocInstructions.id,
        title: mocInstructions.title,
        theme: mocInstructions.theme,
        createdAt: mocInstructions.createdAt,
      })
      .from(mocInstructions)
      .where(eq(mocInstructions.userId, userId))

    console.log('📈 All MOCs for user:', allUserMocs)

    // Get MOCs grouped by month and category - only return actual data
    const uploadsData = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${mocInstructions.createdAt})::text`,
        category: mocInstructions.theme,
        count: sql<number>`count(*)::int`,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          sql`${mocInstructions.createdAt} >= NOW() - INTERVAL '12 months'`, // Last 12 months
        ),
      )
      .groupBy(sql`DATE_TRUNC('month', ${mocInstructions.createdAt})`, mocInstructions.theme)
      .orderBy(sql`DATE_TRUNC('month', ${mocInstructions.createdAt})`)

    console.log('📈 Raw uploads data from DB:', uploadsData)

    // Transform to the format expected by frontend: array of {date, category, count}
    const timeSeriesData = uploadsData
      .map(row => ({
        date: row.month ? row.month.substring(0, 7) : '', // YYYY-MM format
        category: row.category || 'Unknown',
        count: row.count,
      }))
      .filter(item => item.date && item.count > 0)

    console.log('📈 Transformed time series data:', timeSeriesData)

    return res.json({
      success: true,
      data: timeSeriesData,
    })
  } catch (error) {
    console.error('❌ Get MOC uploads over time error:', error)
    return res.status(500).json({
      error: 'Failed to get MOC upload statistics',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
