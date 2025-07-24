import { z } from 'zod';
export declare const ProfileUpdateSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    bio: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    firstName: string;
    lastName: string;
    bio?: string | undefined;
}, {
    email: string;
    firstName: string;
    lastName: string;
    bio?: string | undefined;
}>;
export declare const AvatarUploadSchema: z.ZodObject<{
    file: z.ZodType<File, z.ZodTypeDef, File>;
    fileType: z.ZodEnum<["image/jpeg", "image/png", "image/heic"]>;
    fileSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    file: File;
    fileType: "image/jpeg" | "image/png" | "image/heic";
    fileSize: number;
}, {
    file: File;
    fileType: "image/jpeg" | "image/png" | "image/heic";
    fileSize: number;
}>;
