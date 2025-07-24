export declare const AuthErrorType: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly SERVER_ERROR: "SERVER_ERROR";
    readonly RATE_LIMIT: "RATE_LIMIT";
    readonly EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED";
    readonly SOCIAL_LOGIN_FAILED: "SOCIAL_LOGIN_FAILED";
};
export type AuthErrorType = typeof AuthErrorType[keyof typeof AuthErrorType];
export interface AuthError {
    type: AuthErrorType;
    message: string;
    code?: number;
    details?: unknown;
}
export declare function parseAuthError(error: unknown): AuthError;
export declare function useAuthErrorHandler(): {
    handleError: (error: unknown, context?: string) => AuthError;
    handleSuccess: (message: string) => void;
    parseAuthError: typeof parseAuthError;
};
export declare function handleFormError(error: unknown, setError: (field: string, options: {
    message: string;
}) => void, fieldMap?: Record<string, string>): AuthError;
export declare function handleApiError(error: unknown): string;
export declare const ErrorRecovery: {
    retry: <T>(fn: () => Promise<T>, maxRetries?: number, delay?: number) => Promise<T>;
    isRecoverable: (error: AuthError) => boolean;
    getRetryDelay: (error: AuthError) => number;
};
