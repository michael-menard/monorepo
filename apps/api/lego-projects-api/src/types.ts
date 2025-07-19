import { z } from 'zod';

// For file validation, we define a minimal AvatarFile type for Node.js context.
// In a real app, you might use multer or another upload middleware.
export type AvatarFile = {
  type: string;
  size: number;
};

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Name must be at least 1 character').max(100, 'Name must be less than 100 characters').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

export const AvatarUploadSchema = z.object({
  file: z
    .custom<AvatarFile>()
    .refine(file => ['image/jpeg', 'image/heic'].includes(file.type), {
      message: 'Only .jpg or .heic files are supported',
    })
    .refine(file => file.size <= 10 * 1024 * 1024, {
      message: 'File size must be less than 10MB',
    }),
});
export type AvatarUpload = z.infer<typeof AvatarUploadSchema>;

// --- MOC INSTRUCTIONS TYPES ---
export const MocInstructionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().url().optional(),
  instructionFileUrl: z.string().url().optional(),
  partsListFiles: z.array(z.string().url()).optional(),
  galleryImageIds: z.array(z.string().uuid()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMocSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().url().optional(),
  galleryImageIds: z.array(z.string().uuid()).optional(),
});

export const UpdateMocSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().url().optional(),
  galleryImageIds: z.array(z.string().uuid()).optional(),
});

export const FileUploadSchema = z.object({
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail']),
  file: z.custom<AvatarFile>(),
});

export type MocInstruction = z.infer<typeof MocInstructionSchema>;
export type CreateMoc = z.infer<typeof CreateMocSchema>;
export type UpdateMoc = z.infer<typeof UpdateMocSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>; 