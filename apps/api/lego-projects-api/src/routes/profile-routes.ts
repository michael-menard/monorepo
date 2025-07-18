import { Router } from 'express';
import { getProfile, createProfile, updateProfile, deleteAvatar, uploadAvatar, handleUploadError } from '../handlers/profile';
import { avatarUpload } from '../storage';
import { requireAuth, canModifyProfile } from '../middleware/auth';
import { 
  processUploadedImage, 
  fileAccessControl
} from '../middleware/security';

const router = Router();

// GET /api/users/:id - Fetch user profile (public)
router.get('/:id', getProfile);

// POST /api/users/:id - Upload profile (with avatar) - requires auth
router.post('/:id', 
  requireAuth, 
  canModifyProfile, 
  fileAccessControl,
  avatarUpload.single('avatar'), 
  handleUploadError,
  processUploadedImage(),
  createProfile
);

// PATCH /api/users/:id - Update profile info - requires auth
router.patch('/:id', requireAuth, canModifyProfile, updateProfile);

// POST /api/users/:id/avatar - Upload avatar only - requires auth
router.post('/:id/avatar', 
  requireAuth, 
  canModifyProfile, 
  fileAccessControl,
  avatarUpload.single('avatar'), 
  handleUploadError,
  processUploadedImage(),
  uploadAvatar
);

// DELETE /api/users/:id/avatar - Delete avatar image - requires auth
router.delete('/:id/avatar', requireAuth, canModifyProfile, fileAccessControl, deleteAvatar);

export default router; 