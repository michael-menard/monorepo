import { z } from 'zod';
export const MocFormSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    tags: z.array(z.string()).optional(),
    thumbnail_url: z.string().url().optional(),
    instruction_file_url: z.string().url().optional(),
    parts_list_files: z.array(z.string().url()).optional(),
    gallery_image_ids: z.array(z.string().uuid()).optional(),
});
