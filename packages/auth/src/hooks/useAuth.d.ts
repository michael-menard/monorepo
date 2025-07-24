export declare const useAuth: () => {
    user: {
        name?: string;
        email?: string;
        id?: string;
        role?: string;
        avatarUrl?: string;
        emailVerified?: boolean;
        isVerified?: boolean;
        createdAt?: string;
        updatedAt?: string;
    };
    isAuthenticated: boolean;
    isLoading: boolean;
    isCheckingAuth: boolean;
    error: string;
    message: string;
    signup: (arg: import("..").SignupRequest) => import("@reduxjs/toolkit/query").MutationActionCreatorResult<import("@reduxjs/toolkit/query").MutationDefinition<import("..").SignupRequest, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, never, import("..").AuthResponse, "authApi", unknown>>;
    login: (arg: import("..").LoginRequest) => import("@reduxjs/toolkit/query").MutationActionCreatorResult<import("@reduxjs/toolkit/query").MutationDefinition<import("..").LoginRequest, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, never, import("..").AuthResponse, "authApi", unknown>>;
    logout: (arg: void) => import("@reduxjs/toolkit/query").MutationActionCreatorResult<import("@reduxjs/toolkit/query").MutationDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, never, void, "authApi", unknown>>;
    verifyEmail: (arg: import("../types/auth").VerifyEmailRequest) => import("@reduxjs/toolkit/query").MutationActionCreatorResult<import("@reduxjs/toolkit/query").MutationDefinition<import("../types/auth").VerifyEmailRequest, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, never, import("..").AuthResponse, "authApi", unknown>>;
    checkAuth: () => void;
    resetPassword: (arg: import("..").ResetPasswordRequest) => import("@reduxjs/toolkit/query").MutationActionCreatorResult<import("@reduxjs/toolkit/query").MutationDefinition<import("..").ResetPasswordRequest, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, never, import("..").AuthResponse, "authApi", unknown>>;
    clearError: () => {
        payload: any;
        type: `${string}/${string}`;
    };
    clearMessage: () => {
        payload: any;
        type: `${string}/${string}`;
    };
};
