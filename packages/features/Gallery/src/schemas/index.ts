import { z } from 'zod';

// Gallery Image Schema
export const GalleryImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Album Schema
export const AlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  images: z.array(GalleryImageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Album Creation Data Schema
export const AlbumCreationDataSchema = z.object({
  name: z.string().min(1, 'Album name is required'),
  description: z.string().optional(),
});

// Drag and Drop Data Schema
export const DragDropDataSchema = z.object({
  type: z.enum(['gallery-image']),
  imageIds: z.array(z.string()),
  source: z.string(),
});

// Gallery Layout Schema
export const GalleryLayoutSchema = z.enum(['grid', 'masonry']);

// Gallery Props Schema
export const GalleryPropsSchema = z.object({
  images: z.array(GalleryImageSchema),
  layout: GalleryLayoutSchema.optional().default('grid'),
  className: z.string().optional().default(''),
  onImageClick: z.function().args(z.instanceof(Object)).returns(z.void()).optional(),
  onImageLike: z.function().args(z.string(), z.boolean()).returns(z.void()).optional(),
  onImageShare: z.function().args(z.string()).returns(z.void()).optional(),
  onImageDelete: z.function().args(z.string()).returns(z.void()).optional(),
  onImageDownload: z.function().args(z.string()).returns(z.void()).optional(),
  onImageAddToAlbum: z.function().args(z.string()).returns(z.void()).optional(),
  onImagesSelected: z.function().args(z.array(z.string())).returns(z.void()).optional(),
  selectedImages: z.array(z.string()).optional().default([]),
  onImagesDeleted: z.function().args(z.array(z.string())).returns(z.void()).optional(),
  onImagesAddedToAlbum: z
    .function()
    .args(z.array(z.string()), z.string())
    .returns(z.void())
    .optional(),
  onImagesDownloaded: z.function().args(z.array(z.string())).returns(z.void()).optional(),
  onImagesShared: z.function().args(z.array(z.string())).returns(z.void()).optional(),
});

// Gallery Image Card Props Schema
export const GalleryImageCardPropsSchema = z.object({
  image: GalleryImageSchema,
  onLike: z.function().args(z.string()).returns(z.void()).optional(),
  onShare: z.function().args(z.string()).returns(z.void()).optional(),
  className: z.string().optional(),
});

// Create Album Dialog Props Schema
export const CreateAlbumDialogPropsSchema = z.object({
  isOpen: z.boolean(),
  onClose: z.function().args().returns(z.void()),
  onAlbumCreated: z
    .function()
    .args(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .returns(z.void()),
});

// Animation Config Schema
export const AnimationConfigSchema = z.object({
  duration: z.number().min(0.1).max(2.0).default(0.3),
  delay: z.number().min(0).max(1.0).default(0.05),
  easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).default('easeOut'),
  stagger: z.boolean().default(true),
});

// Export types derived from schemas
export type GalleryImage = z.infer<typeof GalleryImageSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type AlbumCreationData = z.infer<typeof AlbumCreationDataSchema>;
export type DragDropData = z.infer<typeof DragDropDataSchema>;
export type GalleryLayout = z.infer<typeof GalleryLayoutSchema>;
export type GalleryProps = z.infer<typeof GalleryPropsSchema>;
export type GalleryImageCardProps = z.infer<typeof GalleryImageCardPropsSchema>;
export type CreateAlbumDialogProps = z.infer<typeof CreateAlbumDialogPropsSchema>;
export type AnimationConfig = z.infer<typeof AnimationConfigSchema>;
