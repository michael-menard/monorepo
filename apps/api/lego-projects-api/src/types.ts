import { z } from 'zod';

// For file validation, we define a minimal AvatarFile type for Node.js context.
// In a real app, you might use multer or another upload middleware.
export type AvatarFile = {
  type: string;
};

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().optional(),
  bio: z.string().optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

export const AvatarUploadSchema = z.object({
  file: z
    .custom<AvatarFile>()
    .refine(file => ['image/jpeg', 'image/heic'].includes(file.type), {
      message: 'Only .jpg or .heic files are supported',
    }),
});
export type AvatarUpload = z.infer<typeof AvatarUploadSchema>; 