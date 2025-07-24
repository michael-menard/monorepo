import React from 'react';
import { z } from 'zod';
/**
 * Zod schema for MocGalleryCard data
 */
export declare const MocGalleryCardSchema: z.ZodObject<{
    title: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
    instructionsAvailable: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    designer: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type MocGalleryCardData = z.infer<typeof MocGalleryCardSchema>;
/**
 * MocGalleryCard displays a MOC gallery card with hover actions and conditional fields.
 */
export interface MocGalleryCardProps {
    data: MocGalleryCardData;
    onClick?: () => void;
    className?: string;
    'data-testid'?: string;
}
declare const MocGalleryCard: React.FC<MocGalleryCardProps>;
export default MocGalleryCard;
