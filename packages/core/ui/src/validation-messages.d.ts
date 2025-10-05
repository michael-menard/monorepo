import { z } from 'zod';
export declare const validationMessages: {
    readonly required: (fieldName: string) => string;
    readonly minLength: (fieldName: string, min: number) => string;
    readonly maxLength: (fieldName: string, max: number) => string;
    readonly exactLength: (fieldName: string, length: number) => string;
    readonly email: () => string;
    readonly url: () => string;
    readonly password: {
        readonly minLength: (min: number) => string;
        readonly complexity: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character";
        readonly match: "Passwords do not match";
        readonly weak: "Password is too weak. Please choose a stronger password";
        readonly medium: "Password strength is medium. Consider adding more complexity";
        readonly strong: "Password strength is good";
    };
    readonly number: {
        readonly positive: (fieldName: string) => string;
        readonly min: (fieldName: string, min: number) => string;
        readonly max: (fieldName: string, max: number) => string;
        readonly integer: (fieldName: string) => string;
        readonly decimal: (fieldName: string, decimals: number) => string;
    };
    readonly date: {
        readonly past: (fieldName: string) => string;
        readonly future: (fieldName: string) => string;
        readonly min: (fieldName: string, date: string) => string;
        readonly max: (fieldName: string, date: string) => string;
    };
    readonly file: {
        readonly size: (maxSize: string) => string;
        readonly type: (allowedTypes: string[]) => string;
        readonly required: (fieldName: string) => string;
    };
    readonly phone: "Please enter a valid phone number";
    readonly postalCode: "Please enter a valid postal code";
    readonly username: {
        readonly minLength: (min: number) => string;
        readonly maxLength: (max: number) => string;
        readonly format: "Username can only contain letters, numbers, and underscores";
        readonly taken: "This username is already taken";
    };
    readonly confirmPassword: "Please confirm your password";
    readonly terms: "You must accept the terms and conditions";
    readonly privacy: "You must accept the privacy policy";
    readonly captcha: "Please complete the captcha verification";
    readonly unique: (fieldName: string) => string;
    readonly invalid: (fieldName: string) => string;
    readonly network: "Network error. Please check your connection and try again";
    readonly server: "Server error. Please try again later";
    readonly timeout: "Request timed out. Please try again";
    readonly unauthorized: "You are not authorized to perform this action";
    readonly forbidden: "Access denied. You do not have permission for this action";
    readonly notFound: "The requested resource was not found";
    readonly validation: "Please check your input and try again";
    readonly unknown: "An unexpected error occurred. Please try again";
};
export declare const createEnhancedSchemas: {
    readonly email: (fieldName?: string) => z.ZodString;
    readonly password: (fieldName?: string, minLength?: number) => z.ZodString;
    readonly confirmPassword: (fieldName?: string) => z.ZodString;
    readonly name: (fieldName?: string, maxLength?: number) => z.ZodString;
    readonly username: (fieldName?: string) => z.ZodString;
    readonly phone: (fieldName?: string) => z.ZodString;
    readonly url: (fieldName?: string) => z.ZodOptional<z.ZodString>;
    readonly number: (fieldName?: string, min?: number, max?: number) => z.ZodNumber;
    readonly price: (fieldName?: string) => z.ZodOptional<z.ZodNumber>;
    readonly requiredString: (fieldName: string, maxLength?: number) => z.ZodString;
    readonly optionalString: (fieldName: string, maxLength?: number) => z.ZodOptional<z.ZodString>;
    readonly terms: () => z.ZodEffects<z.ZodBoolean, boolean, boolean>;
};
export declare const validatePasswordStrength: (password: string) => {
    isValid: boolean;
    strength: "weak" | "medium" | "strong";
    message: string;
    score: number;
};
export declare const validateFile: (file: File, options?: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
}) => {
    isValid: boolean;
    message?: string;
};
export declare const getNetworkErrorMessage: (error: any) => string;
export declare const createFormValidationHelpers: {
    passwordConfirmation: (passwordFieldName?: string, confirmFieldName?: string) => z.ZodEffects<z.ZodObject<{
        [x: string]: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        [x: string]: string;
    }, {
        [x: string]: string;
    }>, {
        [x: string]: string;
    }, {
        [x: string]: string;
    }>;
    conditionalRequired: <T extends z.ZodTypeAny>(schema: T, condition: (data: any) => boolean, fieldName: string) => z.ZodEffects<T, any, any>;
    uniqueField: <T extends z.ZodTypeAny>(schema: T, checkUnique: (value: string) => Promise<boolean>, fieldName: string) => z.ZodEffects<T, any, any>;
};
//# sourceMappingURL=validation-messages.d.ts.map