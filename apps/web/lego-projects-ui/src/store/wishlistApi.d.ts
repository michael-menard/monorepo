import type { WishlistItem } from '../types/schemas.js';
export declare const wishlistApi: import("@reduxjs/toolkit/query").Api<import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, {
    updateWishlist: import("@reduxjs/toolkit/query").MutationDefinition<{
        items: WishlistItem[];
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        success: boolean;
    }, "api", unknown>;
}, "api", "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", typeof import("@reduxjs/toolkit/query").coreModuleName | typeof import("@reduxjs/toolkit/query/react").reactHooksModuleName>;
export declare const useUpdateWishlistMutation: <R extends Record<string, any> = ({
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
        success: boolean;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "data" | "fulfilledTimeStamp"> & Required<Pick<{
    requestId: string;
    data?: {
        success: boolean;
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
        success: boolean;
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
        success: boolean;
    };
    error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
    endpointName: string;
    startedTimeStamp: number;
    fulfilledTimeStamp?: number;
}, "error"> & Required<Pick<{
    requestId: string;
    data?: {
        success: boolean;
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
            success: boolean;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "data" | "fulfilledTimeStamp"> & Required<Pick<{
        requestId: string;
        data?: {
            success: boolean;
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
            success: boolean;
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
            success: boolean;
        };
        error?: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError;
        endpointName: string;
        startedTimeStamp: number;
        fulfilledTimeStamp?: number;
    }, "error"> & Required<Pick<{
        requestId: string;
        data?: {
            success: boolean;
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
    items: WishlistItem[];
}) => import("@reduxjs/toolkit/query").MutationActionCreatorResult<import("@reduxjs/toolkit/query").MutationDefinition<{
    items: WishlistItem[];
}, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    success: boolean;
}, "api", unknown>>, import("@reduxjs/toolkit/query").TSHelpersNoInfer<R> & {
    originalArgs?: {
        items: WishlistItem[];
    };
    reset: () => void;
}];
