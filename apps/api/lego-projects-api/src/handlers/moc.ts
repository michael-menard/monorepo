import { Request, Response } from 'express';
import { db } from '../db/client';
import { mocInstructions, mocFiles, mocGalleryImages, galleryImages } from '../db/schema';
import {
  indexMoc,
  updateMoc as updateMocES,
  deleteMoc as deleteMocES,
  searchMocs as searchMocsES,
  initializeMocIndex,
} from '../utils/elasticsearch';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateMocSchema,
  CreateMocWithFilesSchema,
  UpdateMocSchema,
  FileUploadSchema,
  type MocInstruction,
  type CreateMoc,
  type CreateMocWithFiles,
  type UpdateMoc,
} from '../types';

// Initialize MOC index on startup
initializeMocIndex();

// POST /api/mocs - Create new MOC with metadata
export const createMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate input
    const parse = CreateMocSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
    }

    const mocData = parse.data;
    const mocId = uuidv4();
    const now = new Date();

    // Insert into database
    const [moc] = await db
      .insert(mocInstructions)
      .values({
        id: mocId,
        userId,
        title: mocData.title,
        description: mocData.description || null,
        tags: mocData.tags || null,
        thumbnailUrl: mocData.thumbnailUrl || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Index in Elasticsearch
    await indexMoc(moc);

    return res.status(201).json({
      message: 'MOC created successfully',
      moc,
    });
  } catch (error) {
    console.error('createMoc error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to create MOC', details: (error as Error).message });
  }
};

// POST /api/mocs/with-files - Create new MOC with metadata and file uploads
export const createMocWithFiles = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate input
    const parse = CreateMocWithFilesSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
    }

    const mocData = parse.data;
    const mocId = uuidv4();
    const now = new Date();

    // Get uploaded files from multer
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    console.log('📁 Received files:', files);
    console.log('📝 Received data:', mocData);

    // Validate required files
    if (!files?.instructionsFile || files.instructionsFile.length === 0) {
      return res.status(400).json({ error: 'Instructions file is required' });
    }

    if (!files?.images || files.images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    // Insert MOC metadata into database
    const [moc] = await db
      .insert(mocInstructions)
      .values({
        id: mocId,
        userId,
        title: mocData.title,
        description: mocData.description || null,
        tags: mocData.tags || null,
        thumbnailUrl: null, // Will be set from first uploaded image
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Process and save files
    const savedFiles: any[] = [];

    // Save instructions file
    const instructionsFile = files.instructionsFile[0];
    const instructionsFileId = uuidv4();
    // Use the actual file path from multer for local storage
    const instructionsFileUrl = instructionsFile.path ?
      instructionsFile.path.replace(/^uploads\//, '/uploads/') :
      `/uploads/moc-files/${userId}/instructions/${instructionsFile.filename}`;

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
      .returning();

    savedFiles.push(savedInstructionsFile);

    // Save parts list files (if any)
    if (files.partsLists && files.partsLists.length > 0) {
      for (const partsListFile of files.partsLists) {
        const partsListFileId = uuidv4();
        const partsListFileUrl = partsListFile.path ?
          partsListFile.path.replace(/^uploads\//, '/uploads/') :
          `/uploads/moc-files/${userId}/parts-lists/${partsListFile.filename}`;

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
          .returning();

        savedFiles.push(savedPartsListFile);
      }
    }

    // Save image files
    let thumbnailUrl = null;
    for (let i = 0; i < files.images.length; i++) {
      const imageFile = files.images[i];
      const imageFileId = uuidv4();
      const imageFileUrl = imageFile.path ?
        imageFile.path.replace(/^uploads\//, '/uploads/') :
        `/uploads/moc-files/${userId}/images/${imageFile.filename}`;

      // Use first image as thumbnail
      if (i === 0) {
        thumbnailUrl = imageFileUrl;
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
        .returning();

      savedFiles.push(savedImageFile);
    }

    // Update MOC with thumbnail URL
    if (thumbnailUrl) {
      await db
        .update(mocInstructions)
        .set({ thumbnailUrl, updatedAt: now })
        .where(eq(mocInstructions.id, mocId));

      moc.thumbnailUrl = thumbnailUrl;
    }

    // Index in Elasticsearch
    await indexMoc(moc);

    return res.status(201).json({
      message: 'MOC created successfully with files',
      moc: {
        ...moc,
        files: savedFiles,
      },
    });
  } catch (error) {
    console.error('createMocWithFiles error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to create MOC with files', details: (error as Error).message });
  }
};

// PATCH /api/mocs/:id - Update MOC metadata
export const updateMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id));
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' });
    }

    // Only owner or admin can edit
    if (moc.userId !== userId && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to edit this MOC' });
    }

    // Validate input
    const parse = UpdateMocSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
    }

    const updateData = { ...parse.data, updatedAt: new Date() };

    // Update DB
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set(updateData)
      .where(eq(mocInstructions.id, id))
      .returning();

    // Update in Elasticsearch
    await updateMocES(updatedMoc);

    return res.json({
      message: 'MOC metadata updated',
      moc: updatedMoc,
    });
  } catch (error) {
    console.error('updateMoc error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update MOC', details: (error as Error).message });
  }
};

// POST /api/mocs/:id/files - Upload instruction or parts list file
export const uploadMocFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id));
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' });
    }

    // Only owner or admin can upload files
    if (moc.userId !== userId && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to upload files to this MOC' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Validate file type
    const fileType = req.body.fileType;
    if (!fileType || !['instruction', 'parts-list', 'thumbnail'].includes(fileType)) {
      return res
        .status(400)
        .json({ error: 'Invalid file type. Must be instruction, parts-list, or thumbnail' });
    }

    // Enforce file type restrictions
    const allowedTypes = {
      instruction: ['application/pdf', 'application/octet-stream'], // .io files
      'parts-list': ['text/csv', 'application/json'],
      thumbnail: ['image/jpeg', 'image/png', 'image/heic'],
    };

    if (!allowedTypes[fileType as keyof typeof allowedTypes].includes(file.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type for ${fileType}. Allowed: ${allowedTypes[fileType as keyof typeof allowedTypes].join(', ')}`,
      });
    }

    // Enforce one instruction file per MOC
    if (fileType === 'instruction') {
      const existingInstruction = await db
        .select()
        .from(mocFiles)
        .where(and(eq(mocFiles.mocId, id), eq(mocFiles.fileType, 'instruction')));
      if (existingInstruction.length > 0) {
        return res
          .status(409)
          .json({ error: 'MOC already has an instruction file. Delete the existing one first.' });
      }
    }

    // Enforce max file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    }

    // Save file (in a real implementation, this would be S3)
    const fileId = uuidv4();
    const ext = file.originalname ? file.originalname.split('.').pop() : 'bin';
    const filename = `${fileId}.${ext}`;
    const fileUrl = `/uploads/mocs/${userId}/${id}/${filename}`; // This would be S3 URL in production

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
      .returning();

    // Update MOC's updatedAt timestamp
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set({ updatedAt: new Date() })
      .where(eq(mocInstructions.id, id))
      .returning();

    // Update in Elasticsearch
    await updateMocES(updatedMoc);

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: mocFile,
      moc: updatedMoc,
    });
  } catch (error) {
    console.error('uploadMocFile error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to upload file', details: (error as Error).message });
  }
};

// DELETE /api/mocs/:id/files/:fileId - Delete file
export const deleteMocFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id, fileId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id));
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' });
    }

    // Only owner or admin can delete files
    if (moc.userId !== userId && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to delete files from this MOC' });
    }

    // Fetch file record
    const [mocFile] = await db
      .select()
      .from(mocFiles)
      .where(and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, id)));

    if (!mocFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file record
    const [deletedFile] = await db.delete(mocFiles).where(eq(mocFiles.id, fileId)).returning();

    // Update MOC's updatedAt timestamp
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set({ updatedAt: new Date() })
      .where(eq(mocInstructions.id, id))
      .returning();

    // Update in Elasticsearch
    await updateMocES(updatedMoc);

    return res.json({
      message: 'File deleted successfully',
      file: deletedFile,
      moc: updatedMoc,
    });
  } catch (error) {
    console.error('deleteMocFile error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to delete file', details: (error as Error).message });
  }
};

// GET /api/mocs/search - Full-text search via Elasticsearch (public access)
export const searchMocs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Optional - for authenticated users
    const { q: query, tag, from = '0', size = '20' } = req.query;

    // Try Elasticsearch first
    const esResult = await searchMocsES({
      userId: userId || null, // Allow null for public search
      query: query as string,
      tag: tag as string,
      from: parseInt(from as string),
      size: parseInt(size as string),
    });

    if (esResult) {
      return res.json({
        mocs: esResult.hits,
        total: esResult.total,
        source: 'elasticsearch',
      });
    }

    // Fallback to database search
    console.log('Elasticsearch unavailable, falling back to database search');

    // For public access, show all MOCs; for authenticated users, show their MOCs
    const whereClause = userId ? eq(mocInstructions.userId, userId) : undefined;

    const mocs = await db
      .select()
      .from(mocInstructions)
      .where(whereClause)
      .limit(parseInt(size as string))
      .offset(parseInt(from as string));

    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(mocInstructions)
      .where(whereClause);

    return res.json({
      mocs,
      total: totalResult[0]?.count || 0,
      source: 'database',
    });
  } catch (error) {
    console.error('searchMocs error:', error);
    // For now, return empty results instead of error to allow frontend testing
    return res.json({
      mocs: [],
      total: 0,
      source: 'fallback',
      message: 'Database not yet populated with MOCs'
    });
  }
};

// GET /api/mocs/:id - Get specific MOC (public access)
export const getMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Optional - for authenticated users
    const userRole = req.user?.role;
    const { id } = req.params;

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id));
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' });
    }

    // For public access, allow viewing all MOCs
    // For authenticated users, they can view their own MOCs or if they're admin
    const canView = !userId || moc.userId === userId || userRole === 'admin';
    if (!canView) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to view this MOC' });
    }

    // Fetch associated files
    const files = await db.select().from(mocFiles).where(eq(mocFiles.mocId, id));

    return res.json({
      moc: {
        ...moc,
        files,
      },
    });
  } catch (error) {
    console.error('getMoc error:', error);
    return res.status(500).json({ error: 'Failed to get MOC', details: (error as Error).message });
  }
};

// DELETE /api/mocs/:id - Delete MOC
export const deleteMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch MOC from DB
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, id));
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' });
    }

    // Only owner or admin can delete
    if (moc.userId !== userId && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to delete this MOC' });
    }

    // Remove from DB (cascade will handle related files)
    const [deletedMoc] = await db
      .delete(mocInstructions)
      .where(eq(mocInstructions.id, id))
      .returning();

    // Remove from Elasticsearch
    await deleteMocES(id);

    return res.json({
      message: 'MOC deleted successfully',
      moc: deletedMoc,
    });
  } catch (error) {
    console.error('deleteMoc error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to delete MOC', details: (error as Error).message });
  }
};

// POST /api/mocs/:id/gallery-images - Link gallery image to MOC
export const linkGalleryImageToMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: mocId } = req.params;
    const { galleryImageId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!galleryImageId) {
      return res.status(400).json({ error: 'Gallery image ID is required' });
    }

    // Check if MOC exists and user owns it
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, mocId));
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    if (moc.userId !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You can only link images to your own MOCs' });
    }

    // Check if gallery image exists
    const [galleryImage] = await db
      .select()
      .from(mocGalleryImages)
      .where(eq(mocGalleryImages.id, galleryImageId));
    if (!galleryImage) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }

    // Check if link already exists
    const [existingLink] = await db
      .select()
      .from(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      );

    if (existingLink) {
      return res.status(409).json({ error: 'Image is already linked to this MOC' });
    }

    // Create the link
    const [link] = await db
      .insert(mocGalleryImages)
      .values({
        mocId,
        galleryImageId,
      })
      .returning();

    return res.status(201).json({
      message: 'Gallery image linked successfully',
      link,
    });
  } catch (error) {
    console.error('linkGalleryImageToMoc error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to link gallery image', details: (error as Error).message });
  }
};

// DELETE /api/mocs/:id/gallery-images/:galleryImageId - Unlink gallery image from MOC
export const unlinkGalleryImageFromMoc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: mocId, galleryImageId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if MOC exists and user owns it
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, mocId));
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    if (moc.userId !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You can only unlink images from your own MOCs' });
    }

    // Check if link exists
    const [existingLink] = await db
      .select()
      .from(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      );

    if (!existingLink) {
      return res.status(404).json({ error: 'Image is not linked to this MOC' });
    }

    // Remove the link
    await db
      .delete(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      );

    return res.status(200).json({
      message: 'Gallery image unlinked successfully',
    });
  } catch (error) {
    console.error('unlinkGalleryImageFromMoc error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to unlink gallery image', details: (error as Error).message });
  }
};

// GET /api/mocs/:id/gallery-images - Get linked gallery images for MOC
export const getMocGalleryImages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: mocId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if MOC exists and user owns it
    const [moc] = await db.select().from(mocInstructions).where(eq(mocInstructions.id, mocId));
    if (!moc) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    if (moc.userId !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You can only view images from your own MOCs' });
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
      .orderBy(galleryImages.createdAt);

    return res.status(200).json({
      message: 'Linked gallery images retrieved successfully',
      images: linkedImages,
    });
  } catch (error) {
    console.error('getMocGalleryImages error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get linked gallery images', details: (error as Error).message });
  }
};
