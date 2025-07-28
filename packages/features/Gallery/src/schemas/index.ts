import { z } from 'zod';

// Gallery image form schema
export const GalleryImageFormSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  file: z.instanceof(File),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/heic']),
  fileSize: z.number().max(20 * 1024 * 1024), // 20MB
});

// Album form schema
export const AlbumFormSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

// CreateAlbumDialog props schema
export const CreateAlbumDialogPropsSchema = z.object({
  isOpen: z.boolean(),
  onClose: z.function().args().returns(z.void()),
  selectedImages: z.array(
    z.object({
      id: z.string(),
      url: z.string().url(),
      title: z.string(),
      description: z.string().optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      createdAt: z.string().optional(),
    }),
  ),
  onAlbumCreated: z.function().args(z.string()).returns(z.void()).optional(),
});

// Drag and drop data schema
export const DragDropDataSchema = z.object({
  type: z.literal('gallery-image'),
  imageIds: z.array(z.string()),
  source: z.enum(['gallery', 'album', 'selection']),
});

// Album creation data schema
export const AlbumCreationDataSchema = z.object({
  title: z.string().min(1, 'Album title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  imageIds: z.array(z.string()).min(1, 'At least one image is required'),
});

// Export types derived from schemas
export type CreateAlbumDialogProps = z.infer<typeof CreateAlbumDialogPropsSchema>;
export type DragDropData = z.infer<typeof DragDropDataSchema>;
export type AlbumCreationData = z.infer<typeof AlbumCreationDataSchema>;
