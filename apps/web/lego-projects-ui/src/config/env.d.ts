/**
 * Environment Configuration Helper with Zod Validation
 * Provides type-safe access to environment variables with validation and defaults
 */
import { z } from 'zod';
declare const EnvSchema: z.ZodObject<{
    VITE_APP_NAME: z.ZodDefault<z.ZodString>;
    VITE_APP_VERSION: z.ZodDefault<z.ZodString>;
    VITE_APP_DESCRIPTION: z.ZodDefault<z.ZodString>;
    VITE_API_URL: z.ZodDefault<z.ZodString>;
    VITE_API_TIMEOUT: z.ZodDefault<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>, z.ZodNumber>>;
    VITE_AUTH_SERVICE_URL: z.ZodDefault<z.ZodString>;
    VITE_AUTH_TOKEN_KEY: z.ZodDefault<z.ZodString>;
    VITE_AUTH_REFRESH_TOKEN_KEY: z.ZodDefault<z.ZodString>;
    VITE_FEATURE_GALLERY_ENABLED: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_FEATURE_WISHLIST_ENABLED: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_FEATURE_MOC_INSTRUCTIONS_ENABLED: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_FEATURE_PROFILE_ENABLED: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_FEATURE_DARK_MODE_ENABLED: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_ENABLE_DEV_TOOLS: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_ENABLE_REDUX_DEVTOOLS: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_ENABLE_REACT_QUERY_DEVTOOLS: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_ANALYTICS_ENABLED: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_ANALYTICS_ID: z.ZodOptional<z.ZodString>;
    VITE_SENTRY_DSN: z.ZodOptional<z.ZodString>;
    VITE_SENTRY_ENVIRONMENT: z.ZodOptional<z.ZodString>;
    VITE_STORAGE_TYPE: z.ZodDefault<z.ZodEnum<{
        localStorage: "localStorage";
        sessionStorage: "sessionStorage";
        indexedDB: "indexedDB";
    }>>;
    VITE_STORAGE_PREFIX: z.ZodDefault<z.ZodString>;
    VITE_IMAGE_CDN_URL: z.ZodOptional<z.ZodString>;
    VITE_MAX_IMAGE_SIZE: z.ZodDefault<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>, z.ZodNumber>>;
    VITE_SUPPORTED_IMAGE_TYPES: z.ZodOptional<z.ZodString>;
    VITE_GOOGLE_CLIENT_ID: z.ZodOptional<z.ZodString>;
    VITE_FACEBOOK_APP_ID: z.ZodOptional<z.ZodString>;
    VITE_GITHUB_CLIENT_ID: z.ZodOptional<z.ZodString>;
    VITE_ENABLE_SERVICE_WORKER: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_CACHE_TIMEOUT: z.ZodDefault<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>, z.ZodNumber>>;
    VITE_BUILD_TARGET: z.ZodOptional<z.ZodString>;
    VITE_SOURCE_MAPS: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    VITE_BUNDLE_ANALYZER: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    MODE: z.ZodDefault<z.ZodEnum<{
        development: "development";
        staging: "staging";
        production: "production";
        test: "test";
    }>>;
}, z.core.$strip>;
declare const env: {
    VITE_APP_NAME: string;
    VITE_APP_VERSION: string;
    VITE_APP_DESCRIPTION: string;
    VITE_API_URL: string;
    VITE_API_TIMEOUT: number;
    VITE_AUTH_SERVICE_URL: string;
    VITE_AUTH_TOKEN_KEY: string;
    VITE_AUTH_REFRESH_TOKEN_KEY: string;
    VITE_FEATURE_GALLERY_ENABLED: boolean;
    VITE_FEATURE_WISHLIST_ENABLED: boolean;
    VITE_FEATURE_MOC_INSTRUCTIONS_ENABLED: boolean;
    VITE_FEATURE_PROFILE_ENABLED: boolean;
    VITE_FEATURE_DARK_MODE_ENABLED: boolean;
    VITE_ANALYTICS_ENABLED: boolean;
    VITE_STORAGE_TYPE: "localStorage" | "sessionStorage" | "indexedDB";
    VITE_STORAGE_PREFIX: string;
    VITE_MAX_IMAGE_SIZE: number;
    VITE_ENABLE_SERVICE_WORKER: boolean;
    VITE_CACHE_TIMEOUT: number;
    VITE_BUNDLE_ANALYZER: boolean;
    MODE: "development" | "staging" | "production" | "test";
    VITE_ENABLE_DEV_TOOLS?: boolean | undefined;
    VITE_ENABLE_REDUX_DEVTOOLS?: boolean | undefined;
    VITE_ENABLE_REACT_QUERY_DEVTOOLS?: boolean | undefined;
    VITE_ANALYTICS_ID?: string | undefined;
    VITE_SENTRY_DSN?: string | undefined;
    VITE_SENTRY_ENVIRONMENT?: string | undefined;
    VITE_IMAGE_CDN_URL?: string | undefined;
    VITE_SUPPORTED_IMAGE_TYPES?: string | undefined;
    VITE_GOOGLE_CLIENT_ID?: string | undefined;
    VITE_FACEBOOK_APP_ID?: string | undefined;
    VITE_GITHUB_CLIENT_ID?: string | undefined;
    VITE_BUILD_TARGET?: string | undefined;
    VITE_SOURCE_MAPS?: boolean | undefined;
};
export declare const app: {
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly buildVersion: string;
    readonly buildTime: string;
};
export declare const api: {
    readonly baseUrl: string;
    readonly timeout: number;
};
export declare const auth: {
    readonly serviceUrl: string;
    readonly tokenKey: string;
    readonly refreshTokenKey: string;
};
export declare const features: {
    readonly gallery: boolean;
    readonly wishlist: boolean;
    readonly mocInstructions: boolean;
    readonly profile: boolean;
    readonly darkMode: boolean;
};
export declare const devTools: {
    readonly enabled: boolean;
    readonly reduxDevtools: boolean;
    readonly reactQueryDevtools: boolean;
};
export declare const analytics: {
    readonly enabled: boolean;
    readonly id: string;
    readonly sentry: {
        readonly dsn: string;
        readonly environment: string;
    };
};
export declare const storage: {
    readonly type: "localStorage" | "sessionStorage" | "indexedDB";
    readonly prefix: string;
};
export declare const assets: {
    readonly imageCdnUrl: string;
    readonly maxImageSize: number;
    readonly supportedImageTypes: string[];
};
export declare const socialLogin: {
    readonly google: {
        readonly clientId: string;
    };
    readonly facebook: {
        readonly appId: string;
    };
    readonly github: {
        readonly clientId: string;
    };
};
export declare const performance: {
    readonly serviceWorker: boolean;
    readonly cacheTimeout: number;
};
export declare const build: {
    readonly target: string;
    readonly sourceMaps: boolean;
    readonly bundleAnalyzer: boolean;
};
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isStaging: boolean;
export declare const isTest: boolean;
export declare const validateEnvironment: () => boolean;
export declare const getEnvVar: <T extends keyof typeof env>(key: T) => (typeof env)[T];
export declare const config: {
    readonly app: {
        readonly name: string;
        readonly version: string;
        readonly description: string;
        readonly buildVersion: string;
        readonly buildTime: string;
    };
    readonly api: {
        readonly baseUrl: string;
        readonly timeout: number;
    };
    readonly auth: {
        readonly serviceUrl: string;
        readonly tokenKey: string;
        readonly refreshTokenKey: string;
    };
    readonly features: {
        readonly gallery: boolean;
        readonly wishlist: boolean;
        readonly mocInstructions: boolean;
        readonly profile: boolean;
        readonly darkMode: boolean;
    };
    readonly devTools: {
        readonly enabled: boolean;
        readonly reduxDevtools: boolean;
        readonly reactQueryDevtools: boolean;
    };
    readonly analytics: {
        readonly enabled: boolean;
        readonly id: string;
        readonly sentry: {
            readonly dsn: string;
            readonly environment: string;
        };
    };
    readonly storage: {
        readonly type: "localStorage" | "sessionStorage" | "indexedDB";
        readonly prefix: string;
    };
    readonly assets: {
        readonly imageCdnUrl: string;
        readonly maxImageSize: number;
        readonly supportedImageTypes: string[];
    };
    readonly socialLogin: {
        readonly google: {
            readonly clientId: string;
        };
        readonly facebook: {
            readonly appId: string;
        };
        readonly github: {
            readonly clientId: string;
        };
    };
    readonly performance: {
        readonly serviceWorker: boolean;
        readonly cacheTimeout: number;
    };
    readonly build: {
        readonly target: string;
        readonly sourceMaps: boolean;
        readonly bundleAnalyzer: boolean;
    };
    readonly isDevelopment: boolean;
    readonly isProduction: boolean;
    readonly isStaging: boolean;
    readonly isTest: boolean;
    readonly validateEnvironment: () => boolean;
    readonly getEnvVar: <T extends keyof typeof env>(key: T) => (typeof env)[T];
};
export type AppConfig = typeof config;
export type EnvVars = z.infer<typeof EnvSchema>;
export default config;
