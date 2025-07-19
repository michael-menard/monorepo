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

// --- WISHLIST TYPES ---

// Common LEGO categories for validation
const LEGO_CATEGORIES = [
  'Speed Champions', 'Modular', 'Star Wars', 'Creator Expert', 'Technic', 
  'Architecture', 'Ideas', 'Harry Potter', 'Marvel', 'DC', 'Friends', 
  'City', 'Ninjago', 'Minecraft', 'Disney', 'Super Mario', 'Avatar',
  'Jurassic World', 'Batman', 'Creator 3-in-1', 'Classic', 'Duplo',
  'Art', 'Botanical Collection', 'Seasonal', 'Other'
] as const;

export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  productLink: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  sortOrder: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  productLink: z.string().url('Product link must be a valid URL').optional(),
  imageUrl: z.string().url('Image URL must be a valid URL').optional(),
  category: z.string().min(1, 'Category cannot be empty').max(100, 'Category must be less than 100 characters').optional(),
  sortOrder: z.string().min(1, 'Sort order is required'),
});

export const UpdateWishlistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  productLink: z.string().url('Product link must be a valid URL').optional(),
  imageUrl: z.string().url('Image URL must be a valid URL').optional(),
  category: z.string().min(1, 'Category cannot be empty').max(100, 'Category must be less than 100 characters').optional(),
  sortOrder: z.string().min(1, 'Sort order is required').optional(),
});

// Export the categories for use in frontend and documentation
export const WISHLIST_CATEGORIES = LEGO_CATEGORIES;

export const WishlistImageUploadSchema = z.object({
  file: z
    .custom<AvatarFile>()
    .refine(file => ['image/jpeg', 'image/jpg', 'image/heic'].includes(file.type), {
      message: 'Only .jpg, .jpeg, or .heic files are supported',
    })
    .refine(file => file.size <= 20 * 1024 * 1024, {
      message: 'File size must be less than 20MB',
    }),
});

export type WishlistItem = z.infer<typeof WishlistItemSchema>;
export type CreateWishlistItem = z.infer<typeof CreateWishlistItemSchema>;
export type UpdateWishlistItem = z.infer<typeof UpdateWishlistItemSchema>;

// --- MOC PARTS LIST TYPES ---
export const MocPartsListSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  built: z.boolean(),
  purchased: z.boolean(),
  inventoryPercentage: z.string().regex(/^\d{1,3}\.\d{2}$/, 'Must be a decimal with 2 decimal places (0.00-100.00)'),
  totalPartsCount: z.string().optional(),
  acquiredPartsCount: z.string(),
  costEstimate: z.string().optional(),
  actualCost: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMocPartsListSchema = z.object({
  mocId: z.string().uuid(),
  fileId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  totalPartsCount: z.string().optional(),
  costEstimate: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateMocPartsListSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  built: z.boolean().optional(),
  purchased: z.boolean().optional(),
  inventoryPercentage: z.string().regex(/^\d{1,3}\.\d{2}$/, 'Must be a decimal with 2 decimal places (0.00-100.00)').optional(),
  totalPartsCount: z.string().optional(),
  acquiredPartsCount: z.string().optional(),
  costEstimate: z.string().optional(),
  actualCost: z.string().optional(),
  notes: z.string().optional(),
});

export type MocPartsList = z.infer<typeof MocPartsListSchema>;
export type CreateMocPartsList = z.infer<typeof CreateMocPartsListSchema>;
export type UpdateMocPartsList = z.infer<typeof UpdateMocPartsListSchema>;
export type WishlistImageUpload = z.infer<typeof WishlistImageUploadSchema>; 