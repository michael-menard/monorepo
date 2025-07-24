export declare const SECURITY_CONFIG: {
    readonly TOKEN: {
        readonly ACCESS_TOKEN_KEY: "access_token";
        readonly REFRESH_TOKEN_KEY: "refresh_token";
        readonly TOKEN_EXPIRY_BUFFER: number;
    };
    readonly PASSWORD: {
        readonly MIN_LENGTH: 8;
        readonly REQUIRE_UPPERCASE: true;
        readonly REQUIRE_LOWERCASE: true;
        readonly REQUIRE_NUMBERS: true;
        readonly REQUIRE_SPECIAL_CHARS: true;
        readonly SPECIAL_CHARS: RegExp;
    };
    readonly RATE_LIMIT: {
        readonly LOGIN_ATTEMPTS: 5;
        readonly LOGIN_TIMEOUT: number;
        readonly SIGNUP_ATTEMPTS: 3;
        readonly SIGNUP_TIMEOUT: number;
    };
    readonly SESSION: {
        readonly INACTIVITY_TIMEOUT: number;
        readonly MAX_SESSION_DURATION: number;
    };
    readonly PROTECTED_ROUTES: readonly ["/api/auth/refresh", "/api/auth/logout", "/api/user/profile", "/api/user/settings"];
    readonly CORS: {
        readonly ALLOWED_ORIGINS: readonly ["http://localhost:3000", "http://localhost:5173", "https://yourdomain.com"];
        readonly ALLOWED_METHODS: readonly ["GET", "POST", "PUT", "DELETE"];
        readonly ALLOWED_HEADERS: readonly ["Content-Type", "Authorization"];
        readonly CREDENTIALS: true;
    };
};
export declare const SecurityUtils: {
    validatePassword: (password: string) => {
        isValid: boolean;
        errors: string[];
    };
    sanitizeInput: (input: string) => string;
    validateEmail: (email: string) => boolean;
    generateSecureToken: (length?: number) => string;
    isTokenExpired: (token: string) => boolean;
};
export declare class RateLimiter {
    private attempts;
    isAllowed(key: string, maxAttempts: number, timeout: number): boolean;
    clearAttempts(key: string): void;
    getRemainingAttempts(key: string): number;
}
export declare const rateLimiter: RateLimiter;
