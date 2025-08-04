import profileRouter from './profile-routes';
import { Router } from 'express';
import { galleryUpload } from '../storage';
import { uploadGalleryImage } from '../handlers/gallery';
import { updateGalleryImage } from '../handlers/gallery';
import { deleteGalleryImage } from '../handlers/gallery';
import { getAlbum } from '../handlers/gallery';
import { flagImage } from '../handlers/gallery';
import { requireAuth } from '../middleware/auth';
import { getAllAlbums, getAllImages } from '../handlers/gallery';
import { getGallery } from '../handlers/gallery';
import mocInstructionsRouter from './moc-instructions';
import wishlistRouter from './wishlist';
import {
  galleryCache,
  galleryCacheInvalidation,
  mocCache,
  mocCacheInvalidation,
  wishlistCache,
  wishlistCacheInvalidation,
  profileCache,
  profileCacheInvalidation,
} from '../middleware/cache';

const router = Router();

// POST /api/images - upload gallery image
router.post(
  '/api/images',
  requireAuth,
  galleryUpload.single('image'),
  galleryCacheInvalidation,
  uploadGalleryImage,
);

// PATCH /api/images/:id - update image metadata
router.patch('/api/images/:id', requireAuth, galleryCacheInvalidation, updateGalleryImage);

// DELETE /api/images/:id - delete gallery image
router.delete('/api/images/:id', requireAuth, galleryCacheInvalidation, deleteGalleryImage);

// GET /api/albums/:id - get album data and images
router.get('/api/albums/:id', requireAuth, galleryCache, getAlbum);

// GET /api/albums - list all albums for user
router.get('/api/albums', requireAuth, galleryCache, getAllAlbums);

// GET /api/images - list all images for user
router.get('/api/images', requireAuth, galleryCache, getAllImages);

// GET /api/gallery - unified gallery endpoint
router.get('/api/gallery', requireAuth, galleryCache, getGallery);

// POST /api/flag - flag an image for moderation
router.post('/api/flag', requireAuth, galleryCacheInvalidation, flagImage);

// Register MOC Instructions router
router.use('/api/mocs', mocInstructionsRouter);

// Register Profile router
router.use('/api/users', profileRouter);

// Register Wishlist router
router.use('/api/wishlist', wishlistRouter);

export default router;
