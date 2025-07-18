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

const router = Router();

// POST /api/images - upload gallery image
router.post('/api/images', requireAuth, galleryUpload.single('image'), uploadGalleryImage);

// PATCH /api/images/:id - update image metadata
router.patch('/api/images/:id', requireAuth, updateGalleryImage);

// DELETE /api/images/:id - delete gallery image
router.delete('/api/images/:id', requireAuth, deleteGalleryImage);

// GET /api/albums/:id - get album data and images
router.get('/api/albums/:id', requireAuth, getAlbum);

// GET /api/albums - list all albums for user
router.get('/api/albums', requireAuth, getAllAlbums);

// GET /api/images - list all images for user
router.get('/api/images', requireAuth, getAllImages);

// GET /api/gallery - unified gallery endpoint
router.get('/api/gallery', requireAuth, getGallery);

// POST /api/flag - flag an image for moderation
router.post('/api/flag', requireAuth, flagImage);

export default router; 