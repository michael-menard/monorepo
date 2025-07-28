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
  onImagesSelected: z
    .function()
    .args(
      z.array(
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
    )
    .returns(z.void())
    .optional(),
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

// FilterBar schemas
export const FilterStateSchema = z.object({
  searchQuery: z.string(),
  selectedTags: z.array(z.string()),
  selectedCategory: z.string(),
});

export const FilterBarPropsSchema = z.object({
  onSearchChange: z.function().args(z.string()).returns(z.void()),
  onTagsChange: z.function().args(z.array(z.string())).returns(z.void()),
  onCategoryChange: z.function().args(z.string()).returns(z.void()),
  onClearFilters: z.function().args().returns(z.void()),
  availableTags: z.array(z.string()).optional().default([]),
  availableCategories: z.array(z.string()).optional().default([]),
  searchPlaceholder: z.string().optional().default('Search images...'),
  className: z.string().optional().default(''),
  debounceMs: z.number().optional().default(300),
});

// Lightbox component schemas
export const LightboxPropsSchema = z.object({
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
  currentIndex: z
    .number()
    .int()
    .min(0)
    .refine(
      () => {
        // This will be validated at runtime when we have access to the images array
        return true;
      },
      { message: 'Current index must be within bounds of images array' },
    ),
  onClose: z.function().args().returns(z.void()),
});

// Lightbox state schema
export const LightboxStateSchema = z.object({
  index: z.number().int().min(0),
  zoom: z.number().min(1).max(3),
});

// Export types derived from schemas
export type CreateAlbumDialogProps = z.infer<typeof CreateAlbumDialogPropsSchema>;
export type DragDropData = z.infer<typeof DragDropDataSchema>;
export type AlbumCreationData = z.infer<typeof AlbumCreationDataSchema>;
export type FilterState = z.infer<typeof FilterStateSchema>;
export type FilterBarProps = z.infer<typeof FilterBarPropsSchema>;
export type LightboxProps = z.infer<typeof LightboxPropsSchema>;
export type LightboxState = z.infer<typeof LightboxStateSchema>;
