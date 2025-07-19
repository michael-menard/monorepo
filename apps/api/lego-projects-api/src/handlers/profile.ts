import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { z } from 'zod';
import { uploadAvatar as uploadAvatarFile, deleteAvatar as deleteAvatarFile } from '../storage/avatar-storage';
import { ProfileUpdateSchema, AvatarUploadSchema } from '../types';

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: Response, next: any) => {
  if (error && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 20MB.' });
  }
  if (error && error.message === 'Only JPEG, PNG, and HEIC files are supported') {
    return res.status(400).json({ error: 'Invalid file format. Only JPEG, PNG, and HEIC files are supported.' });
  }
  if (error) {
    return res.status(500).json({ error: 'Upload failed', details: error.message });
  }
  next();
};

export const getProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.select().from(users).where(eq(users.id, id));
    const user = result[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: (error as Error).message });
  }
};

export const createProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, email, preferredName, bio } = req.body;
  const { file } = req;

  // Validate input - create a schema that includes all profile fields
  const ProfileCreateSchema = ProfileUpdateSchema.extend({
    email: z.string().email('Invalid email format'),
    preferredName: z.string().min(1, 'Preferred name must be at least 1 character').max(100, 'Preferred name must be less than 100 characters').optional(),
  });
  const parsed = ProfileCreateSchema.safeParse({ username, email, preferredName, bio });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (!file) {
    return res.status(400).json({ error: 'Avatar file is required' });
  }

  // File validation is now handled by security middleware
  // (validateFileContent, virusScanFile)

  try {
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.id, id));
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Upload avatar (S3 or local)
    const avatarUrl = await uploadAvatarFile(id, file);

    // Insert new user
    const [user] = await db.insert(users).values({
      id,
      username: parsed.data.username,
      email,
      preferredName,
      bio: parsed.data.bio,
      avatarUrl: avatarUrl,
    }).returning();

    res.status(201).json(user);
  } catch (error) {
    // Log error for debugging
    console.error('createProfile error:', error);
    res.status(500).json({ error: 'Database error', details: (error as Error).message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, email, preferredName, bio } = req.body;

  // Validate input - create a schema that includes all profile fields
  const ProfileUpdateFullSchema = ProfileUpdateSchema.extend({
    email: z.string().email('Invalid email format').optional(),
    preferredName: z.string().min(1, 'Preferred name must be at least 1 character').max(100, 'Preferred name must be less than 100 characters').optional(),
  });
  const parsed = ProfileUpdateFullSchema.safeParse({ username, email, preferredName, bio });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile
    const updateData: any = { updatedAt: new Date() };
    if (parsed.data.username !== undefined) updateData.username = parsed.data.username;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
    if (parsed.data.preferredName !== undefined) updateData.preferredName = parsed.data.preferredName;
    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: (error as Error).message });
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { file } = req;

  if (!file) {
    return res.status(400).json({ error: 'Avatar file is required' });
  }

  // File validation is now handled by security middleware
  // (validateFileContent, virusScanFile)

  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = existing[0];

    // Delete old avatar if it exists
    if (user.avatarUrl) {
      await deleteAvatarFile(user.avatarUrl);
    }

    // Upload new avatar
    const avatarUrl = await uploadAvatarFile(id, file);

    // Update user with new avatar
    const [updatedUser] = await db
      .update(users)
      .set({ avatarUrl: avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    res.json({ 
      message: 'Avatar uploaded successfully', 
      avatarUrl,
      user: updatedUser 
    });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: (error as Error).message 
    });
  }
};

export const deleteAvatar = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = existing[0];

    // Delete avatar file if it exists
    if (user.avatarUrl) {
      await deleteAvatarFile(user.avatarUrl);
    }

    // Update user to remove avatar reference
    const [updatedUser] = await db
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    res.json({ message: 'Avatar deleted successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: (error as Error).message });
  }
}; 