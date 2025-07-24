/**
 * Auth API Slice (RTK Query)
 * Handles authentication endpoints: login, signup, get current user
 */
import { z } from 'zod';
export declare const LoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export declare const SignupRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    username: z.ZodString;
}, z.core.$strip>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    username: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type User = z.infer<typeof UserSchema>;
export declare const AuthResponseSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        username: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
    token: z.ZodString;
}, z.core.$strip>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export declare const authApi: import("@reduxjs/toolkit/query").Api<import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, {
    login: import("@reduxjs/toolkit/query").MutationDefinition<{
        email: string;
        password: string;
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    }, "api", unknown>;
    signup: import("@reduxjs/toolkit/query").MutationDefinition<{
        email: string;
        password: string;
        username: string;
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    }, "api", unknown>;
    getCurrentUser: import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    }, "api", unknown>;
}, "api", "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", typeof import("@reduxjs/toolkit/query").coreModuleName | typeof import("@reduxjs/toolkit/query/react").reactHooksModuleName>;
export declare const useLoginMutation: <R extends Record<string, any> = ({
    requestId?: undefined;
    status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
    data?: undefined;
    error?: undefined;
    endpointName?: string;
    startedTimeStamp?: undefined;
    fulfilledTimeStamp?: undefined;
} & {
    status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
    isUninitialized: true;
    isLoading: false;
    isSuccess: false;
    isError: false;
}) | ({
    status: import("@reduxjs/toolkit/query").QueryStatus.fulfilled;
} & Omit<{
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "data" | "fulfilledTimeStamp"> & Required<Pick<{
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "data" | "fulfilledTimeStamp">> & {
    error: undefined;
} & {
    status: import("@reduxjs/toolkit/query").QueryStatus.fulfilled;
    isUninitialized: false;
    isLoading: false;
    isSuccess: true;
    isError: false;
}) | ({
    status: import("@reduxjs/toolkit/query").QueryStatus.pending;
} & {
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
} & {
    data?: undefined;
} & {
    status: import("@reduxjs/toolkit/query").QueryStatus.pending;
    isUninitialized: false;
    isLoading: true;
    isSuccess: false;
    isError: false;
}) | ({
    status: import("@reduxjs/toolkit/query").QueryStatus.rejected;
} & Omit<{
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "error"> & Required<Pick<{
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "error">> & {
    status: import("@reduxjs/toolkit/query").QueryStatus.rejected;
    isUninitialized: false;
    isLoading: false;
    isSuccess: false;
    isError: true;
})>(options?: {
    selectFromResult?: (state: ({
        requestId?: undefined;
        status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
        data?: undefined;
        error?: undefined;
        endpointName?: string;
        startedTimeStamp?: undefined;
        fulfilledTimeStamp?: undefined;
    } & {
        status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
        isUninitialized: true;
        isLoading: false;
        isSuccess: false;
        isError: false;
    }) | ({
        status: import("@reduxjs/toolkit/query").QueryStatus.fulfilled;
    } & Omit<{
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "data" | "fulfilledTimeStamp"> & Required<Pick<{
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "data" | "fulfilledTimeStamp">> & {
        error: undefined;
    } & {
        status: import("@reduxjs/toolkit/query").QueryStatus.fulfilled;
        isUninitialized: false;
        isLoading: false;
        isSuccess: true;
        isError: false;
    }) | ({
        status: import("@reduxjs/toolkit/query").QueryStatus.pending;
    } & {
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    } & {
        data?: undefined;
    } & {
        status: import("@reduxjs/toolkit/query").QueryStatus.pending;
        isUninitialized: false;
        isLoading: true;
        isSuccess: false;
        isError: false;
    }) | ({
        status: import("@reduxjs/toolkit/query").QueryStatus.rejected;
    } & Omit<{
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "error"> & Required<Pick<{
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "error">> & {
        status: import("@reduxjs/toolkit/query").QueryStatus.rejected;
        isUninitialized: false;
        isLoading: false;
        isSuccess: false;
        isError: true;
    })) => R;
    fixedCacheKey?: string;
}) => readonly [(arg: {
    email: string;
    password: string;
}) => import("@reduxjs/toolkit/query").MutationActionCreatorResult<import("@reduxjs/toolkit/query").MutationDefinition<{
    email: string;
    password: string;
}, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    user: {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    };
    token: string;
}, "api", unknown>>, import("@reduxjs/toolkit/query").TSHelpersNoInfer<R> & {
    originalArgs?: {
        email: string;
        password: string;
    };
    reset: () => void;
}], useSignupMutation: <R extends Record<string, any> = ({
    requestId?: undefined;
    status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
    data?: undefined;
    error?: undefined;
    endpointName?: string;
    startedTimeStamp?: undefined;
    fulfilledTimeStamp?: undefined;
} & {
    status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
    isUninitialized: true;
    isLoading: false;
    isSuccess: false;
    isError: false;
}) | ({
    status: import("@reduxjs/toolkit/query").QueryStatus.fulfilled;
} & Omit<{
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "data" | "fulfilledTimeStamp"> & Required<Pick<{
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "data" | "fulfilledTimeStamp">> & {
    error: undefined;
} & {
    status: import("@reduxjs/toolkit/query").QueryStatus.fulfilled;
    isUninitialized: false;
    isLoading: false;
    isSuccess: true;
    isError: false;
}) | ({
    status: import("@reduxjs/toolkit/query").QueryStatus.pending;
} & {
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
} & {
    data?: undefined;
} & {
    status: import("@reduxjs/toolkit/query").QueryStatus.pending;
    isUninitialized: false;
    isLoading: true;
    isSuccess: false;
    isError: false;
}) | ({
    status: import("@reduxjs/toolkit/query").QueryStatus.rejected;
} & Omit<{
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "error"> & Required<Pick<{
    requestId: string;
    data?: {
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        token: string;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "error">> & {
    status: import("@reduxjs/toolkit/query").QueryStatus.rejected;
    isUninitialized: false;
    isLoading: false;
    isSuccess: false;
    isError: true;
})>(options?: {
    selectFromResult?: (state: ({
        requestId?: undefined;
        status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
        data?: undefined;
        error?: undefined;
        endpointName?: string;
        startedTimeStamp?: undefined;
        fulfilledTimeStamp?: undefined;
    } & {
        status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
        isUninitialized: true;
        isLoading: false;
        isSuccess: false;
        isError: false;
    }) | ({
        status: import("@reduxjs/toolkit/query").QueryStatus.fulfilled;
    } & Omit<{
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "data" | "fulfilledTimeStamp"> & Required<Pick<{
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "data" | "fulfilledTimeStamp">> & {
        error: undefined;
    } & {
        status: import("@reduxjs/toolkit/query").QueryStatus.fulfilled;
        isUninitialized: false;
        isLoading: false;
        isSuccess: true;
        isError: false;
    }) | ({
        status: import("@reduxjs/toolkit/query").QueryStatus.pending;
    } & {
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    } & {
        data?: undefined;
    } & {
        status: import("@reduxjs/toolkit/query").QueryStatus.pending;
        isUninitialized: false;
        isLoading: true;
        isSuccess: false;
        isError: false;
    }) | ({
        status: import("@reduxjs/toolkit/query").QueryStatus.rejected;
    } & Omit<{
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "error"> & Required<Pick<{
        requestId: string;
        data?: {
            user: {
                id: string;
                email: string;
                username: string;
                createdAt: string;
                updatedAt: string;
            };
            token: string;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "error">> & {
        status: import("@reduxjs/toolkit/query").QueryStatus.rejected;
        isUninitialized: false;
        isLoading: false;
        isSuccess: false;
        isError: true;
    })) => R;
    fixedCacheKey?: string;
}) => readonly [(arg: {
    email: string;
    password: string;
    username: string;
}) => import("@reduxjs/toolkit/query").MutationActionCreatorResult<import("@reduxjs/toolkit/query").MutationDefinition<{
    email: string;
    password: string;
    username: string;
}, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    user: {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    };
    token: string;
}, "api", unknown>>, import("@reduxjs/toolkit/query").TSHelpersNoInfer<R> & {
    originalArgs?: {
        email: string;
        password: string;
        username: string;
    };
    reset: () => void;
}], useGetCurrentUserQuery: <R extends Record<string, any> = import("@reduxjs/toolkit/query").TSHelpersId<(Omit<{
    status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
    originalArgs?: undefined;
    data?: undefined;
    error?: undefined;
    requestId?: undefined;
    endpointName?: string;
    startedTimeStamp?: undefined;
    fulfilledTimeStamp?: undefined;
} & {
    currentData?: {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    };
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "isUninitialized"> & {
    isUninitialized: true;
}) | import("@reduxjs/toolkit/query").TSHelpersOverride<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    email: string;
    username: string;
    createdAt: string;
    updatedAt: string;
}, "api", unknown>> & {
    currentData?: {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    };
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, {
    isLoading: true;
    isFetching: boolean;
    data: undefined;
} | ({
    isSuccess: true;
    isFetching: true;
    error: undefined;
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    email: string;
    username: string;
    createdAt: string;
    updatedAt: string;
}, "api", unknown>> & {
    currentData?: {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    };
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "data" | "fulfilledTimeStamp">>) | ({
    isSuccess: true;
    isFetching: false;
    error: undefined;
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    email: string;
    username: string;
    createdAt: string;
    updatedAt: string;
}, "api", unknown>> & {
    currentData?: {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    };
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "data" | "fulfilledTimeStamp" | "currentData">>) | ({
    isError: true;
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    email: string;
    username: string;
    createdAt: string;
    updatedAt: string;
}, "api", unknown>> & {
    currentData?: {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    };
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "error">>)>> & {
    status: import("@reduxjs/toolkit/query").QueryStatus;
}>(arg: void | typeof import("@reduxjs/toolkit/query").skipToken, options?: import("@reduxjs/toolkit/query").SubscriptionOptions & {
    skip?: boolean;
    refetchOnMountOrArgChange?: boolean | number;
} & {
    skip?: boolean;
    selectFromResult?: (state: import("@reduxjs/toolkit/query").TSHelpersId<(Omit<{
        status: import("@reduxjs/toolkit/query").QueryStatus.uninitialized;
        originalArgs?: undefined;
        data?: undefined;
        error?: undefined;
        requestId?: undefined;
        endpointName?: string;
        startedTimeStamp?: undefined;
        fulfilledTimeStamp?: undefined;
    } & {
        currentData?: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "isUninitialized"> & {
        isUninitialized: true;
    }) | import("@reduxjs/toolkit/query").TSHelpersOverride<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    }, "api", unknown>> & {
        currentData?: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, {
        isLoading: true;
        isFetching: boolean;
        data: undefined;
    } | ({
        isSuccess: true;
        isFetching: true;
        error: undefined;
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    }, "api", unknown>> & {
        currentData?: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "data" | "fulfilledTimeStamp">>) | ({
        isSuccess: true;
        isFetching: false;
        error: undefined;
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    }, "api", unknown>> & {
        currentData?: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "data" | "fulfilledTimeStamp" | "currentData">>) | ({
        isError: true;
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    }, "api", unknown>> & {
        currentData?: {
            id: string;
            email: string;
            username: string;
            createdAt: string;
            updatedAt: string;
        };
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "error">>)>> & {
        status: import("@reduxjs/toolkit/query").QueryStatus;
    }) => R;
}) => [R][R extends any ? 0 : never] & {
    refetch: () => import("@reduxjs/toolkit/query").QueryActionCreatorResult<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        updatedAt: string;
    }, "api", unknown>>;
};
