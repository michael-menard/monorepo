import { z } from 'zod';
export declare const ProfileUpdateSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    bio: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    firstName?: string;
    bio?: string;
    lastName?: string;
}, {
    email?: string;
    firstName?: string;
    bio?: string;
    lastName?: string;
}>;
export declare const AvatarUploadSchema: z.ZodObject<{
    file: z.ZodType<File, z.ZodTypeDef, File>;
    fileType: z.ZodEnum<["image/jpeg", "image/png", "image/heic"]>;
    fileSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    file?: File;
    fileType?: "image/jpeg" | "image/png" | "image/heic";
    fileSize?: number;
}, {
    file?: File;
    fileType?: "image/jpeg" | "image/png" | "image/heic";
    fileSize?: number;
}>;
