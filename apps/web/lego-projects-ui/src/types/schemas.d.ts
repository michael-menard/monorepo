import { z } from 'zod';
export declare const EmailSchema: z.ZodString;
export declare const PasswordSchema: z.ZodString;
export declare const TokenSchema: z.ZodString;
export declare const IdSchema: z.ZodString;
export declare const NumericIdSchema: z.ZodNumber;
export declare const SlugSchema: z.ZodString;
export declare const DateStringSchema: z.ZodString;
export declare const DateSchema: z.ZodDate;
export declare const ImageFileSchema: z.ZodObject<{
    file: z.ZodCustom<File, File>;
    preview: z.ZodOptional<z.ZodString>;
    size: z.ZodNumber;
    type: z.ZodEnum<{
        "image/jpeg": "image/jpeg";
        "image/png": "image/png";
        "image/webp": "image/webp";
    }>;
}, z.core.$strip>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const SignupSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    acceptTerms: z.ZodBoolean;
}, z.core.$strip>;
export declare const ForgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const ResetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export declare const ChangePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export declare const UserProfileSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    username: z.ZodString;
    avatar: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    website: z.ZodOptional<z.ZodString>;
    socialLinks: z.ZodOptional<z.ZodObject<{
        instagram: z.ZodOptional<z.ZodString>;
        youtube: z.ZodOptional<z.ZodString>;
        flickr: z.ZodOptional<z.ZodString>;
        rebrickable: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    preferences: z.ZodOptional<z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<{
            light: "light";
            dark: "dark";
            system: "system";
        }>>;
        emailNotifications: z.ZodDefault<z.ZodBoolean>;
        publicProfile: z.ZodDefault<z.ZodBoolean>;
        showEmail: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const UpdateProfileSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bio: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    location: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    website: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    socialLinks: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        instagram: z.ZodOptional<z.ZodString>;
        youtube: z.ZodOptional<z.ZodString>;
        flickr: z.ZodOptional<z.ZodString>;
        rebrickable: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    preferences: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<{
            light: "light";
            dark: "dark";
            system: "system";
        }>>;
        emailNotifications: z.ZodDefault<z.ZodBoolean>;
        publicProfile: z.ZodDefault<z.ZodBoolean>;
        showEmail: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const LegoSetSchema: z.ZodObject<{
    id: z.ZodString;
    setNumber: z.ZodString;
    name: z.ZodString;
    theme: z.ZodString;
    subtheme: z.ZodOptional<z.ZodString>;
    year: z.ZodNumber;
    pieces: z.ZodNumber;
    minifigs: z.ZodNumber;
    price: z.ZodOptional<z.ZodObject<{
        retail: z.ZodOptional<z.ZodNumber>;
        current: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    availability: z.ZodEnum<{
        available: "available";
        retiring: "retiring";
        retired: "retired";
        exclusive: "exclusive";
    }>;
    images: z.ZodArray<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const MocSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    difficulty: z.ZodEnum<{
        beginner: "beginner";
        intermediate: "intermediate";
        advanced: "advanced";
        expert: "expert";
    }>;
    estimatedTime: z.ZodObject<{
        hours: z.ZodNumber;
        minutes: z.ZodNumber;
    }, z.core.$strip>;
    pieces: z.ZodNumber;
    instructions: z.ZodObject<{
        format: z.ZodEnum<{
            images: "images";
            pdf: "pdf";
            "stud.io": "stud.io";
            ldraw: "ldraw";
        }>;
        url: z.ZodOptional<z.ZodString>;
        file: z.ZodOptional<z.ZodCustom<File, File>>;
        steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            stepNumber: z.ZodNumber;
            description: z.ZodString;
            image: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    images: z.ZodArray<z.ZodObject<{
        file: z.ZodCustom<File, File>;
        preview: z.ZodOptional<z.ZodString>;
        size: z.ZodNumber;
        type: z.ZodEnum<{
            "image/jpeg": "image/jpeg";
            "image/png": "image/png";
            "image/webp": "image/webp";
        }>;
    }, z.core.$strip>>;
    partsLists: z.ZodOptional<z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        partName: z.ZodString;
        quantity: z.ZodNumber;
        color: z.ZodString;
        category: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    isPublic: z.ZodDefault<z.ZodBoolean>;
    allowComments: z.ZodDefault<z.ZodBoolean>;
    createdBy: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const CreateMocSchema: z.ZodObject<{
    pieces: z.ZodNumber;
    images: z.ZodArray<z.ZodObject<{
        file: z.ZodCustom<File, File>;
        preview: z.ZodOptional<z.ZodString>;
        size: z.ZodNumber;
        type: z.ZodEnum<{
            "image/jpeg": "image/jpeg";
            "image/png": "image/png";
            "image/webp": "image/webp";
        }>;
    }, z.core.$strip>>;
    description: z.ZodString;
    instructions: z.ZodObject<{
        format: z.ZodEnum<{
            images: "images";
            pdf: "pdf";
            "stud.io": "stud.io";
            ldraw: "ldraw";
        }>;
        url: z.ZodOptional<z.ZodString>;
        file: z.ZodOptional<z.ZodCustom<File, File>>;
        steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            stepNumber: z.ZodNumber;
            description: z.ZodString;
            image: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    title: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    difficulty: z.ZodEnum<{
        beginner: "beginner";
        intermediate: "intermediate";
        advanced: "advanced";
        expert: "expert";
    }>;
    estimatedTime: z.ZodObject<{
        hours: z.ZodNumber;
        minutes: z.ZodNumber;
    }, z.core.$strip>;
    partsLists: z.ZodOptional<z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        partName: z.ZodString;
        quantity: z.ZodNumber;
        color: z.ZodString;
        category: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    isPublic: z.ZodDefault<z.ZodBoolean>;
    allowComments: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const WishlistItemSchema: z.ZodObject<{
    id: z.ZodString;
    setId: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
        urgent: "urgent";
    }>>;
    notes: z.ZodOptional<z.ZodString>;
    targetPrice: z.ZodOptional<z.ZodNumber>;
    addedAt: z.ZodString;
    acquiredAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CreateWishlistItemSchema: z.ZodObject<{
    setId: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
        urgent: "urgent";
    }>>;
    notes: z.ZodOptional<z.ZodString>;
    targetPrice: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const CollectionItemSchema: z.ZodObject<{
    id: z.ZodString;
    setId: z.ZodString;
    condition: z.ZodEnum<{
        new: "new";
        "like-new": "like-new";
        good: "good";
        fair: "fair";
        poor: "poor";
    }>;
    completeness: z.ZodEnum<{
        complete: "complete";
        "missing-pieces": "missing-pieces";
        "missing-minifigs": "missing-minifigs";
        "instructions-only": "instructions-only";
    }>;
    purchasePrice: z.ZodOptional<z.ZodNumber>;
    purchaseDate: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    isForSale: z.ZodDefault<z.ZodBoolean>;
    salePrice: z.ZodOptional<z.ZodNumber>;
    images: z.ZodOptional<z.ZodArray<z.ZodString>>;
    addedAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const CreateCollectionItemSchema: z.ZodObject<{
    location: z.ZodOptional<z.ZodString>;
    images: z.ZodOptional<z.ZodArray<z.ZodString>>;
    setId: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    condition: z.ZodEnum<{
        new: "new";
        "like-new": "like-new";
        good: "good";
        fair: "fair";
        poor: "poor";
    }>;
    completeness: z.ZodEnum<{
        complete: "complete";
        "missing-pieces": "missing-pieces";
        "missing-minifigs": "missing-minifigs";
        "instructions-only": "instructions-only";
    }>;
    purchasePrice: z.ZodOptional<z.ZodNumber>;
    purchaseDate: z.ZodOptional<z.ZodString>;
    isForSale: z.ZodDefault<z.ZodBoolean>;
    salePrice: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const ApiErrorSchema: z.ZodObject<{
    status: z.ZodNumber;
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodUnknown>;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const ApiSuccessSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    status: z.ZodNumber;
    message: z.ZodString;
    data: T;
    meta: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const PaginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    items: z.ZodArray<T>;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const SearchFormSchema: z.ZodObject<{
    query: z.ZodString;
    filters: z.ZodOptional<z.ZodObject<{
        theme: z.ZodOptional<z.ZodString>;
        year: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        pieces: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        price: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        availability: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            available: "available";
            retiring: "retiring";
            retired: "retired";
            exclusive: "exclusive";
        }>>>;
    }, z.core.$strip>>;
    sort: z.ZodOptional<z.ZodObject<{
        field: z.ZodDefault<z.ZodEnum<{
            name: "name";
            year: "year";
            pieces: "pieces";
            price: "price";
            relevance: "relevance";
        }>>;
        order: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ContactFormSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    subject: z.ZodString;
    message: z.ZodString;
    category: z.ZodDefault<z.ZodEnum<{
        general: "general";
        support: "support";
        feedback: "feedback";
        "bug-report": "bug-report";
    }>>;
}, z.core.$strip>;
export type Login = z.infer<typeof LoginSchema>;
export type Signup = z.infer<typeof SignupSchema>;
export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>;
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type LegoSet = z.infer<typeof LegoSetSchema>;
export type Moc = z.infer<typeof MocSchema>;
export type CreateMoc = z.infer<typeof CreateMocSchema>;
export type WishlistItem = z.infer<typeof WishlistItemSchema>;
export type CreateWishlistItem = z.infer<typeof CreateWishlistItemSchema>;
export type CollectionItem = z.infer<typeof CollectionItemSchema>;
export type CreateCollectionItem = z.infer<typeof CreateCollectionItemSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type SearchForm = z.infer<typeof SearchFormSchema>;
export type ContactForm = z.infer<typeof ContactFormSchema>;
export type ImageFile = z.infer<typeof ImageFileSchema>;
export type ApiSuccess<T> = {
    status: number;
    message: string;
    data: T;
    meta?: {
        timestamp: string;
        requestId?: string;
        version?: string;
    };
};
export type PaginatedResponse<T> = {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
};
