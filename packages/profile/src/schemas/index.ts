import { z } from 'zod';

// Profile update schema
export const ProfileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  email: z.string().email(),
});

// Avatar upload schema
export const AvatarUploadSchema = z.object({
  file: z.instanceof(File),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/heic']),
  fileSize: z.number().max(20 * 1024 * 1024), // 20MB
});
