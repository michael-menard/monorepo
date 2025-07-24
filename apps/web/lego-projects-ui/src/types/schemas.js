import { z } from 'zod';
// =============================================================================
// BASE SCHEMAS
// =============================================================================
// Common patterns
export const EmailSchema = z.string().email('Please enter a valid email address');
export const PasswordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const TokenSchema = z.string().min(1);
export const IdSchema = z.string().uuid();
export const NumericIdSchema = z.number().int().positive();
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens');
// Date schemas
export const DateStringSchema = z.string().datetime();
export const DateSchema = z.date();
// File schemas
export const ImageFileSchema = z.object({
    file: z.instanceof(File),
    preview: z.string().url().optional(),
    size: z.number().max(5 * 1024 * 1024, 'File must be less than 5MB'),
    type: z.enum(['image/jpeg', 'image/png', 'image/webp'])
});
// =============================================================================
// AUTHENTICATION SCHEMAS
// =============================================================================
export const LoginSchema = z.object({
    email: EmailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false)
});
export const SignupSchema = z.object({
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms')
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});
export const ForgotPasswordSchema = z.object({
    email: EmailSchema
});
export const ResetPasswordSchema = z.object({
    token: TokenSchema,
    password: PasswordSchema,
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});
export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: PasswordSchema,
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});
// =============================================================================
// USER SCHEMAS
// =============================================================================
export const UserProfileSchema = z.object({
    id: IdSchema,
    email: EmailSchema,
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    avatar: z.string().url().optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    website: z.string().url().optional(),
    socialLinks: z.object({
        instagram: z.string().url().optional(),
        youtube: z.string().url().optional(),
        flickr: z.string().url().optional(),
        rebrickable: z.string().url().optional()
    }).optional(),
    preferences: z.object({
        theme: z.enum(['light', 'dark', 'system']).default('system'),
        emailNotifications: z.boolean().default(true),
        publicProfile: z.boolean().default(true),
        showEmail: z.boolean().default(false)
    }).optional(),
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema
});
export const UpdateProfileSchema = UserProfileSchema.omit({
    id: true,
    email: true,
    createdAt: true,
    updatedAt: true
}).partial();
// =============================================================================
// LEGO-SPECIFIC SCHEMAS
// =============================================================================
// LEGO Set Schema
export const LegoSetSchema = z.object({
    id: IdSchema,
    setNumber: z.string().regex(/^\d{4,5}-\d$/, 'Invalid LEGO set number format'),
    name: z.string().min(1),
    theme: z.string().min(1),
    subtheme: z.string().optional(),
    year: z.number().int().min(1950).max(new Date().getFullYear() + 5),
    pieces: z.number().int().positive(),
    minifigs: z.number().int().min(0),
    price: z.object({
        retail: z.number().positive().optional(),
        current: z.number().positive().optional(),
        currency: z.string().length(3).default('USD')
    }).optional(),
    availability: z.enum(['available', 'retiring', 'retired', 'exclusive']),
    images: z.array(z.string().url()),
    description: z.string().optional(),
    instructions: z.string().url().optional(),
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema
});
// MOC (My Own Creation) Schema
export const MocSchema = z.object({
    id: IdSchema,
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    estimatedTime: z.object({
        hours: z.number().int().min(0).max(999),
        minutes: z.number().int().min(0).max(59)
    }),
    pieces: z.number().int().positive(),
    instructions: z.object({
        format: z.enum(['pdf', 'stud.io', 'ldraw', 'images']),
        url: z.string().url().optional(),
        file: z.instanceof(File).optional(),
        steps: z.array(z.object({
            stepNumber: z.number().int().positive(),
            description: z.string(),
            image: z.string().url().optional()
        })).optional()
    }),
    images: z.array(ImageFileSchema).min(1, 'At least one image is required'),
    partsLists: z.array(z.object({
        partId: z.string(),
        partName: z.string(),
        quantity: z.number().int().positive(),
        color: z.string(),
        category: z.string().optional()
    })).optional(),
    isPublic: z.boolean().default(true),
    allowComments: z.boolean().default(true),
    createdBy: IdSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema
});
export const CreateMocSchema = MocSchema.omit({
    id: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true
});
// Wishlist Schema
export const WishlistItemSchema = z.object({
    id: IdSchema,
    setId: IdSchema,
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    notes: z.string().max(500).optional(),
    targetPrice: z.number().positive().optional(),
    addedAt: DateStringSchema,
    acquiredAt: DateStringSchema.optional()
});
export const CreateWishlistItemSchema = WishlistItemSchema.omit({
    id: true,
    addedAt: true,
    acquiredAt: true
});
// Collection Schema
export const CollectionItemSchema = z.object({
    id: IdSchema,
    setId: IdSchema,
    condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor']),
    completeness: z.enum(['complete', 'missing-pieces', 'missing-minifigs', 'instructions-only']),
    purchasePrice: z.number().positive().optional(),
    purchaseDate: DateStringSchema.optional(),
    location: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
    isForSale: z.boolean().default(false),
    salePrice: z.number().positive().optional(),
    images: z.array(z.string().url()).optional(),
    addedAt: DateStringSchema,
    updatedAt: DateStringSchema
});
export const CreateCollectionItemSchema = CollectionItemSchema.omit({
    id: true,
    addedAt: true,
    updatedAt: true
});
// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================
export const ApiErrorSchema = z.object({
    status: z.number().int().min(400).max(599),
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
    timestamp: DateStringSchema
});
export const ApiSuccessSchema = (dataSchema) => z.object({
    status: z.number().int().min(200).max(299),
    message: z.string(),
    data: dataSchema,
    meta: z.object({
        timestamp: DateStringSchema,
        requestId: z.string().optional(),
        version: z.string().optional()
    }).optional()
});
export const PaginatedResponseSchema = (itemSchema) => z.object({
    items: z.array(itemSchema),
    pagination: z.object({
        page: z.number().int().positive(),
        limit: z.number().int().positive(),
        total: z.number().int().min(0),
        totalPages: z.number().int().min(0),
        hasNext: z.boolean(),
        hasPrev: z.boolean()
    })
});
// =============================================================================
// FORM SCHEMAS
// =============================================================================
export const SearchFormSchema = z.object({
    query: z.string().min(1, 'Search query is required'),
    filters: z.object({
        theme: z.string().optional(),
        year: z.object({
            min: z.number().int().min(1950).optional(),
            max: z.number().int().max(new Date().getFullYear() + 5).optional()
        }).optional(),
        pieces: z.object({
            min: z.number().int().min(1).optional(),
            max: z.number().int().max(10000).optional()
        }).optional(),
        price: z.object({
            min: z.number().positive().optional(),
            max: z.number().positive().optional()
        }).optional(),
        availability: z.array(z.enum(['available', 'retiring', 'retired', 'exclusive'])).optional()
    }).optional(),
    sort: z.object({
        field: z.enum(['name', 'year', 'pieces', 'price', 'relevance']).default('relevance'),
        order: z.enum(['asc', 'desc']).default('desc')
    }).optional()
});
export const ContactFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: EmailSchema,
    subject: z.string().min(1, 'Subject is required'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    category: z.enum(['general', 'support', 'feedback', 'bug-report']).default('general')
});
