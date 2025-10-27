import { Router } from 'express'
import { eq, and, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { mocInstructions, mocFiles } from '../db/schema'

// Temporary in-memory store for recently created MOCs (for testing)
const recentMocs: any[] = [
  // Add some test data to verify gallery is working - using your actual user ID
  {
    id: 'test-moc-1',
    userId: '68c6461c9455937e4440bb41', // Your actual user ID from stan.marsh@southpark.co
    title: 'Test MOC Castle',
    description: 'A beautiful test castle',
    tags: ['castle', 'medieval'],
    thumbnailUrl: 'https://via.placeholder.com/400x300/129990/ffffff?text=Castle',
    images: [
      {
        id: 'img-1',
        url: 'https://via.placeholder.com/400x300/129990/ffffff?text=Castle+View+1',
        alt: 'Castle front view',
        caption: 'Front view of the castle',
      },
      {
        id: 'img-2',
        url: 'https://via.placeholder.com/400x300/5A827E/ffffff?text=Castle+View+2',
        alt: 'Castle side view',
        caption: 'Side view of the castle',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'test-moc-2',
    userId: '68c6461c9455937e4440bb41', // Your actual user ID from stan.marsh@southpark.co
    title: 'Test MOC Spaceship',
    description: 'An awesome test spaceship',
    tags: ['space', 'sci-fi'],
    thumbnailUrl: 'https://via.placeholder.com/400x300/178B7A/ffffff?text=Spaceship',
    images: [
      {
        id: 'img-3',
        url: 'https://via.placeholder.com/400x300/178B7A/ffffff?text=Spaceship+View+1',
        alt: 'Spaceship front view',
        caption: 'Front view of the spaceship',
      },
      {
        id: 'img-4',
        url: 'https://via.placeholder.com/400x300/FAEAB1/333333?text=Spaceship+View+2',
        alt: 'Spaceship side view',
        caption: 'Side view of the spaceship',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
import {
  createMoc,
  createMocWithFiles,
  updateMoc,
  uploadMocFile,
  deleteMocFile,
  searchMocs,
  getMoc,
  deleteMoc,
  linkGalleryImageToMoc,
  unlinkGalleryImageFromMoc,
  getMocGalleryImages,
  uploadPartsList,
  getMocStatsByCategory,
  getMocUploadsOverTime,
} from '../handlers/moc'
import {
  mocFileUpload,
  mocModalUpload,
  partsListUpload,
  saveMocFile,
  MOC_FILE_TYPES,
  validateFileType,
  getMocFileDownloadInfo,
  streamLocalMocFile,
  checkMocFileExists,
  type MocFileType,
} from '../storage/moc-storage'
import { mocCache, mocCacheInvalidation } from '../middleware/cache'

const router = Router()

// TEST ENDPOINT: Generate auth token for testing
router.post('/test-auth', async (req, res) => {
  try {
    const testUserId = uuidv4()
    const token = jwt.sign(
      {
        sub: testUserId,
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000, // 1 hour
    })

    return res.json({
      message: 'Test auth token generated',
      userId: testUserId,
      token, // Also return in response for manual testing
    })
  } catch (error) {
    console.error('Test auth error:', error)
    return res.status(500).json({ error: 'Failed to generate test token' })
  }
})

// POST /api/mocs - Create new MOC with metadata only
router.post('/', requireAuth, mocCacheInvalidation, createMoc)

// POST /api/mocs/with-files - Create new MOC with metadata and file uploads
router.post(
  '/with-files',
  requireAuth,
  mocModalUpload.fields([
    { name: 'instructionsFile', maxCount: 10 }, // Required: 1 or more instruction files (PDF or .io)
    { name: 'partsLists', maxCount: 10 }, // Optional: 0-10 parts list files
    { name: 'images', maxCount: 3 }, // Optional: 0-3 images
  ]),
  mocCacheInvalidation,
  createMocWithFiles,
)

// POST /api/mocs/upload-parts-list - Upload parts list file to existing MOC
router.post(
  '/upload-parts-list',
  requireAuth,
  partsListUpload.single('partsListFile'),
  mocCacheInvalidation,
  uploadPartsList,
)

// Test CORS endpoint
router.post('/test-cors', (req, res) => {
  console.log('🧪 CORS test endpoint hit')
  console.log('📋 Headers:', req.headers)
  res.json({ message: 'CORS test successful', timestamp: new Date().toISOString() })
})

// PATCH /api/mocs/:id - Update MOC metadata
router.patch('/:id', requireAuth, mocCacheInvalidation, updateMoc)

// POST /api/mocs/:id/files - Upload instruction or parts list file
router.post(
  '/:id/files',
  requireAuth,
  mocFileUpload.single('file'),
  mocCacheInvalidation,
  uploadMocFile,
)

// DELETE /api/mocs/:id/files/:fileId - Delete file
router.delete('/:id/files/:fileId', requireAuth, mocCacheInvalidation, deleteMocFile)

// GET /api/mocs/stats/by-category - Get MOC statistics grouped by category
router.get('/stats/by-category', requireAuth, getMocStatsByCategory)

// GET /api/mocs/stats/uploads-over-time - Get MOC upload statistics over time
router.get('/stats/uploads-over-time', requireAuth, getMocUploadsOverTime)

// GET /api/mocs/search - Full-text search with database query
router.get('/search', async (req, res) => {
  try {
    const { q: query, from = '0', size = '20' } = req.query

    console.log('🔍 Gallery search - querying database for MOCs')

    // Query database for MOCs with their image files
    const dbMocs = await db.select().from(mocInstructions).orderBy(mocInstructions.createdAt)

    console.log('🔍 Database MOCs found:', dbMocs.length)

    // Convert to proper format for frontend
    const allMocs = await Promise.all(
      dbMocs.map(async moc => {
        // Get image files for this MOC (thumbnail and gallery images only)
        const imageFiles = await db
          .select()
          .from(mocFiles)
          .where(
            and(
              eq(mocFiles.mocId, moc.id),
              sql`${mocFiles.fileType} IN ('thumbnail', 'gallery-image')`,
            ),
          )

        // Convert files to image format expected by frontend
        const images = imageFiles.map(file => ({
          id: file.id,
          url: file.fileUrl,
          alt: file.originalFilename || 'MOC Image',
          caption: file.originalFilename || 'MOC Image',
        }))

        return {
          ...moc,
          createdAt: moc.createdAt.toISOString(),
          updatedAt: moc.updatedAt.toISOString(),
          images: images, // Use actual image files
        }
      }),
    )

    // Apply basic filtering if query is provided
    let filteredMocs = allMocs
    if (query && typeof query === 'string' && query.trim()) {
      filteredMocs = allMocs.filter(
        moc =>
          moc.title.toLowerCase().includes(query.toLowerCase()) ||
          (moc.description && moc.description.toLowerCase().includes(query.toLowerCase())),
      )
    }

    // Apply pagination
    const fromNum = parseInt(from as string) || 0
    const sizeNum = parseInt(size as string) || 20
    const paginatedMocs = filteredMocs.slice(fromNum, fromNum + sizeNum)

    return res.json({
      mocs: paginatedMocs,
      total: filteredMocs.length,
      source: 'database',
      message: `Found ${filteredMocs.length} MOCs in database`,
    })
  } catch (error) {
    console.error('Search error:', error)
    return res.json({
      mocs: [],
      total: 0,
      source: 'error',
      message: 'Database search failed',
    })
  }
})

// GET /api/mocs/:id - Get specific MOC (public access)
router.get('/:id', mocCache, getMoc)

// DELETE /api/mocs/:id - Delete MOC
router.delete('/:id', requireAuth, mocCacheInvalidation, deleteMoc)

// POST /api/mocs/:id/gallery-images - Link gallery image to MOC
router.post('/:id/gallery-images', requireAuth, mocCacheInvalidation, linkGalleryImageToMoc)

// DELETE /api/mocs/:id/gallery-images/:galleryImageId - Unlink gallery image from MOC
router.delete(
  '/:id/gallery-images/:galleryImageId',
  requireAuth,
  mocCacheInvalidation,
  unlinkGalleryImageFromMoc,
)

// GET /api/mocs/:id/gallery-images - Get linked gallery images for MOC
router.get('/:id/gallery-images', requireAuth, mocCache, getMocGalleryImages)

// GET /api/mocs/:id/files/:fileId/download-info - Get download information for a file
// TEMPORARILY DISABLED - Upload package needs to be fixed
// router.get('/:id/files/:fileId/download-info', requireAuth, async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) return res.status(401).json({ error: 'Unauthorized' });

//     const { id: mocId, fileId } = req.params;

//     // Check if MOC exists and user owns it
//     const existingMoc = await db
//       .select()
//       .from(mocInstructions)
//       .where(eq(mocInstructions.id, mocId))
//       .limit(1);
//     if (existingMoc.length === 0) {
//       return res.status(404).json({ error: 'MOC not found' });
//     }
//     if (existingMoc[0].userId !== userId) {
//       return res
//         .status(403)
//         .json({ error: 'Forbidden: You can only access files from your own MOCs' });
//     }

//     // Check if file exists
//     const existingFile = await db
//       .select()
//       .from(mocFiles)
//       .where(and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, mocId)))
//       .limit(1);

//     if (existingFile.length === 0) {
//       return res.status(404).json({ error: 'File not found' });
//     }

//     const file = existingFile[0];
//     const downloadInfo = await getMocFileDownloadInfo(
//       file.fileUrl,
//       file.originalFilename || 'unknown-file',
//       file.mimeType || 'application/octet-stream',
//     );

//     res.json({
//       file,
//       downloadInfo,
//     });
//   } catch (err: any) {
//     console.error('Get download info error:', err);
//     res.status(500).json({ error: 'Internal server error', details: err.message });
//   }
// });

// GET /api/mocs/:id/files/:fileId/download - Download a file
// TEMPORARILY DISABLED - Upload package needs to be fixed
// router.get('/:id/files/:fileId/download', requireAuth, async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) return res.status(401).json({ error: 'Unauthorized' });

//     const { id: mocId, fileId } = req.params;

//     // Check if MOC exists and user owns it
//     const existingMoc = await db
//       .select()
//       .from(mocInstructions)
//       .where(eq(mocInstructions.id, mocId))
//       .limit(1);
//     if (existingMoc.length === 0) {
//       return res.status(404).json({ error: 'MOC not found' });
//     }
//     if (existingMoc[0].userId !== userId) {
//       return res
//         .status(403)
//         .json({ error: 'Forbidden: You can only download files from your own MOCs' });
//     }

//     // Check if file exists
//     const existingFile = await db
//       .select()
//       .from(mocFiles)
//       .where(and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, mocId)))
//       .limit(1);

//     if (existingFile.length === 0) {
//       return res.status(404).json({ error: 'File not found' });
//     }

//     const file = existingFile[0];

//     // Check if file exists in storage
//     const fileExists = await checkMocFileExists(file.fileUrl);
//     if (!fileExists) {
//       return res.status(404).json({ error: 'File not found in storage' });
//     }

//     // Stream the file
//     const fileStream = streamLocalMocFile(file.fileUrl);
//     if (!fileStream) {
//       return res.status(404).json({ error: 'File not found in storage' });
//     }

//     // Set headers for file download
//     res.setHeader('Content-Type', fileStream.mimeType);
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename="${file.originalFilename || fileStream.filename}"`,
//     );

//     // Pipe the stream to response
//     fileStream.stream.pipe(res);
//   } catch (err: any) {
//     console.error('File download error:', err);
//     res.status(500).json({ error: 'Internal server error', details: err.message });
//   }
// });

export default router
