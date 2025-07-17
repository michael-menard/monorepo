import { Router, Request, Response } from 'express';
import { authMiddleware } from './authMiddleware';
import { z } from 'zod';
import { getUserById } from '../db/user';

const router = Router();

const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
});

router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const profile = await getUserById(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    const validated = UserProfileSchema.parse(profile);
    res.json(validated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router; 