import { Router } from 'express'
import { z } from 'zod'
import { galleryUpload } from '../storage'
import {
  uploadGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  getAlbum,
  flagImage,
  getAllAlbums,
  getAllImages,
  getGallery,
} from '../handlers/gallery'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import {
  galleryCache,
  galleryCacheInvalidation,
  mocCache,
  mocCacheInvalidation,
  wishlistCache,
  wishlistCacheInvalidation,
} from '../middleware/cache'
import { validateFileContent, virusScanFile } from '../middleware/security'
import mocInstructionsRouter from './moc-instructions'
import wishlistRouter from './wishlist'

const router = Router()

// Validation schemas
const uploadImageSchema = {
  body: z.object({
    albumId: z.string().optional(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
  }),
}

const updateImageSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    albumId: z.string().optional().nullable(),
  }),
}

const deleteImageSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
}

const flagSchema = {
  body: z.object({
    imageId: z.string().uuid(),
    reason: z.string().optional(),
  }),
}

// POST /api/images - upload gallery image
router.post(
  '/api/images',
  requireAuth,
  galleryUpload.single('image'),
  validate(uploadImageSchema),
  validateFileContent,
  virusScanFile,
  galleryCacheInvalidation,
  uploadGalleryImage,
)

// PATCH /api/images/:id - update image metadata
router.patch(
  '/api/images/:id',
  requireAuth,
  validate(updateImageSchema),
  galleryCacheInvalidation,
  updateGalleryImage,
)

// DELETE /api/images/:id - delete gallery image
router.delete(
  '/api/images/:id',
  requireAuth,
  validate(deleteImageSchema),
  galleryCacheInvalidation,
  deleteGalleryImage,
)

// GET /api/albums/:id - get album data and images
router.get('/api/albums/:id', requireAuth, galleryCache, getAlbum)

// GET /api/albums - list all albums for user
router.get('/api/albums', requireAuth, galleryCache, getAllAlbums)

// GET /api/images - list all images for user
router.get('/api/images', requireAuth, galleryCache, getAllImages)

// GET /api/gallery - unified gallery endpoint
router.get('/api/gallery', requireAuth, galleryCache, getGallery)

// POST /api/flag - flag an image for moderation
router.post('/api/flag', requireAuth, validate(flagSchema), galleryCacheInvalidation, flagImage)

// Register MOC Instructions router
router.use('/api/mocs', mocInstructionsRouter)

// Register Wishlist router
router.use('/api/wishlist', wishlistRouter)

export default router
