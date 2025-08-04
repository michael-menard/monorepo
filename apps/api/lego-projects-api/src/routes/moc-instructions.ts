import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db/client';
import { mocInstructions, mocFiles } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import {
  createMoc,
  updateMoc,
  uploadMocFile,
  deleteMocFile,
  searchMocs,
  getMoc,
  deleteMoc,
  linkGalleryImageToMoc,
  unlinkGalleryImageFromMoc,
  getMocGalleryImages,
} from '../handlers/moc';
import {
  mocFileUpload,
  saveMocFile,
  MOC_FILE_TYPES,
  validateFileType,
  getMocFileDownloadInfo,
  streamLocalMocFile,
  checkMocFileExists,
  type MocFileType,
} from '../storage/moc-storage';
import { mocCache, mocCacheInvalidation } from '../middleware/cache';

const router = Router();

// POST /api/mocs - Create new MOC with metadata
router.post('/', requireAuth, mocCacheInvalidation, createMoc);

// PATCH /api/mocs/:id - Update MOC metadata
router.patch('/:id', requireAuth, mocCacheInvalidation, updateMoc);

// POST /api/mocs/:id/files - Upload instruction or parts list file
router.post(
  '/:id/files',
  requireAuth,
  mocFileUpload.single('file'),
  mocCacheInvalidation,
  uploadMocFile,
);

// DELETE /api/mocs/:id/files/:fileId - Delete file
router.delete('/:id/files/:fileId', requireAuth, mocCacheInvalidation, deleteMocFile);

// GET /api/mocs/search - Full-text search via Elasticsearch
router.get('/search', requireAuth, mocCache, searchMocs);

// GET /api/mocs/:id - Get specific MOC
router.get('/:id', requireAuth, mocCache, getMoc);

// DELETE /api/mocs/:id - Delete MOC
router.delete('/:id', requireAuth, mocCacheInvalidation, deleteMoc);

// POST /api/mocs/:id/gallery-images - Link gallery image to MOC
router.post('/:id/gallery-images', requireAuth, mocCacheInvalidation, linkGalleryImageToMoc);

// DELETE /api/mocs/:id/gallery-images/:galleryImageId - Unlink gallery image from MOC
router.delete(
  '/:id/gallery-images/:galleryImageId',
  requireAuth,
  mocCacheInvalidation,
  unlinkGalleryImageFromMoc,
);

// GET /api/mocs/:id/gallery-images - Get linked gallery images for MOC
router.get('/:id/gallery-images', requireAuth, mocCache, getMocGalleryImages);

// GET /api/mocs/:id/files/:fileId/download-info - Get download information for a file
router.get('/:id/files/:fileId/download-info', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: mocId, fileId } = req.params;

    // Check if MOC exists and user owns it
    const existingMoc = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1);
    if (existingMoc.length === 0) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    if (existingMoc[0].userId !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You can only access files from your own MOCs' });
    }

    // Check if file exists
    const existingFile = await db
      .select()
      .from(mocFiles)
      .where(and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, mocId)))
      .limit(1);

    if (existingFile.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = existingFile[0];
    const downloadInfo = await getMocFileDownloadInfo(
      file.fileUrl,
      file.originalFilename || 'unknown-file',
      file.mimeType || 'application/octet-stream',
    );

    res.json({
      file,
      downloadInfo,
    });
  } catch (err: any) {
    console.error('Get download info error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/mocs/:id/files/:fileId/download - Download a file
router.get('/:id/files/:fileId/download', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: mocId, fileId } = req.params;

    // Check if MOC exists and user owns it
    const existingMoc = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1);
    if (existingMoc.length === 0) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    if (existingMoc[0].userId !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You can only download files from your own MOCs' });
    }

    // Check if file exists
    const existingFile = await db
      .select()
      .from(mocFiles)
      .where(and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, mocId)))
      .limit(1);

    if (existingFile.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = existingFile[0];

    // Check if file exists in storage
    const fileExists = await checkMocFileExists(file.fileUrl);
    if (!fileExists) {
      return res.status(404).json({ error: 'File not found in storage' });
    }

    // Stream the file
    const fileStream = streamLocalMocFile(file.fileUrl);
    if (!fileStream) {
      return res.status(404).json({ error: 'File not found in storage' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', fileStream.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.originalFilename || fileStream.filename}"`,
    );

    // Pipe the stream to response
    fileStream.stream.pipe(res);
  } catch (err: any) {
    console.error('File download error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
