import { z } from 'zod';
export declare const MocFormSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    thumbnail_url: z.ZodOptional<z.ZodString>;
    instruction_file_url: z.ZodOptional<z.ZodString>;
    parts_list_files: z.ZodOptional<z.ZodArray<z.ZodString>>;
    gallery_image_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
