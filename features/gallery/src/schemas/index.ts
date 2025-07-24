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
