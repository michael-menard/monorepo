import { Router } from 'express';
import { getProfile, createProfile, updateProfile, deleteAvatar, upload, handleUploadError } from '../handlers/profile';
import { requireAuth, canModifyProfile } from '../middleware/auth';

const router = Router();

// GET /api/users/:id - Fetch user profile (public)
router.get('/:id', getProfile);

// POST /api/users/:id - Upload profile (with avatar) - requires auth
router.post('/:id', requireAuth, canModifyProfile, upload.single('avatar'), handleUploadError, createProfile);

// PATCH /api/users/:id - Update profile info - requires auth
router.patch('/:id', requireAuth, canModifyProfile, updateProfile);

// DELETE /api/users/:id/avatar - Delete avatar image - requires auth
router.delete('/:id/avatar', requireAuth, canModifyProfile, deleteAvatar);

export default router; 