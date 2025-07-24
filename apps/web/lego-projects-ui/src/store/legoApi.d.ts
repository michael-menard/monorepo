/**
 * LEGO Sets API Slice (RTK Query)
 * Handles endpoints for fetching LEGO sets and set details
 */
import { z } from 'zod';
export declare const LegoSetSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    theme: z.ZodString;
    year: z.ZodNumber;
    numParts: z.ZodNumber;
    imageUrl: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    isRetired: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type LegoSet = z.infer<typeof LegoSetSchema>;
export declare const LegoSetListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    theme: z.ZodString;
    year: z.ZodNumber;
    numParts: z.ZodNumber;
    imageUrl: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    isRetired: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
export declare const legoApi: import("@reduxjs/toolkit/query").Api<import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, {
    getLegoSets: import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>;
    getLegoSet: import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }, "api", unknown>;
    searchLegoSets: import("@reduxjs/toolkit/query").QueryDefinition<{
        query: string;
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>;
}, "api", "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", typeof import("@reduxjs/toolkit/query").coreModuleName | typeof import("@reduxjs/toolkit/query/react").reactHooksModuleName>;
export declare const useGetLegoSetsQuery: <R extends Record<string, any> = import("@reduxjs/toolkit/query").TSHelpersId<(Omit<{
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
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "isUninitialized"> & {
    isUninitialized: true;
}) | import("@reduxjs/toolkit/query").TSHelpersOverride<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}[], "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
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
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}[], "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
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
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}[], "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "data" | "fulfilledTimeStamp" | "currentData">>) | ({
    isError: true;
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}[], "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
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
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "isUninitialized"> & {
        isUninitialized: true;
    }) | import("@reduxjs/toolkit/query").TSHelpersOverride<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
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
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
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
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "data" | "fulfilledTimeStamp" | "currentData">>) | ({
        isError: true;
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<void, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
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
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>>;
}, useGetLegoSetQuery: <R extends Record<string, any> = import("@reduxjs/toolkit/query").TSHelpersId<(Omit<{
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
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    };
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "isUninitialized"> & {
    isUninitialized: true;
}) | import("@reduxjs/toolkit/query").TSHelpersOverride<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}, "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
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
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}, "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
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
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}, "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    };
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "data" | "fulfilledTimeStamp" | "currentData">>) | ({
    isError: true;
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}, "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    };
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "error">>)>> & {
    status: import("@reduxjs/toolkit/query").QueryStatus;
}>(arg: string | typeof import("@reduxjs/toolkit/query").skipToken, options?: import("@reduxjs/toolkit/query").SubscriptionOptions & {
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
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        };
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "isUninitialized"> & {
        isUninitialized: true;
    }) | import("@reduxjs/toolkit/query").TSHelpersOverride<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }, "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
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
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }, "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
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
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }, "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        };
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "data" | "fulfilledTimeStamp" | "currentData">>) | ({
        isError: true;
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }, "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
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
    refetch: () => import("@reduxjs/toolkit/query").QueryActionCreatorResult<import("@reduxjs/toolkit/query").QueryDefinition<string, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }, "api", unknown>>;
}, useSearchLegoSetsQuery: <R extends Record<string, any> = import("@reduxjs/toolkit/query").TSHelpersId<(Omit<{
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
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "isUninitialized"> & {
    isUninitialized: true;
}) | import("@reduxjs/toolkit/query").TSHelpersOverride<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<{
    query: string;
}, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}[], "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
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
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<{
    query: string;
}, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}[], "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "data" | "fulfilledTimeStamp">>) | ({
    isSuccess: true;
    isFetching: false;
    error: undefined;
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<{
    query: string;
}, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}[], "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "data" | "fulfilledTimeStamp" | "currentData">>) | ({
    isError: true;
} & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<{
    query: string;
}, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
    id: string;
    name: string;
    theme: string;
    year: number;
    numParts: number;
    imageUrl?: string;
    description?: string;
    isRetired?: boolean;
}[], "api", unknown>> & {
    currentData?: {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[];
    isUninitialized: false;
    isLoading: false;
    isFetching: false;
    isSuccess: false;
    isError: false;
}, "error">>)>> & {
    status: import("@reduxjs/toolkit/query").QueryStatus;
}>(arg: {
    query: string;
} | typeof import("@reduxjs/toolkit/query").skipToken, options?: import("@reduxjs/toolkit/query").SubscriptionOptions & {
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
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "isUninitialized"> & {
        isUninitialized: true;
    }) | import("@reduxjs/toolkit/query").TSHelpersOverride<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<{
        query: string;
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
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
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<{
        query: string;
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "data" | "fulfilledTimeStamp">>) | ({
        isSuccess: true;
        isFetching: false;
        error: undefined;
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<{
        query: string;
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "data" | "fulfilledTimeStamp" | "currentData">>) | ({
        isError: true;
    } & Required<Pick<import("@reduxjs/toolkit/query").QuerySubState<import("@reduxjs/toolkit/query").QueryDefinition<{
        query: string;
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>> & {
        currentData?: {
            id: string;
            name: string;
            theme: string;
            year: number;
            numParts: number;
            imageUrl?: string;
            description?: string;
            isRetired?: boolean;
        }[];
        isUninitialized: false;
        isLoading: false;
        isFetching: false;
        isSuccess: false;
        isError: false;
    }, "error">>)>> & {
        status: import("@reduxjs/toolkit/query").QueryStatus;
    }) => R;
}) => [R][R extends any ? 0 : never] & {
    refetch: () => import("@reduxjs/toolkit/query").QueryActionCreatorResult<import("@reduxjs/toolkit/query").QueryDefinition<{
        query: string;
    }, import("@reduxjs/toolkit/query").BaseQueryFn<string | import("@reduxjs/toolkit/query").FetchArgs, unknown, import("@reduxjs/toolkit/query").FetchBaseQueryError, {}, import("@reduxjs/toolkit/query").FetchBaseQueryMeta>, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", {
        id: string;
        name: string;
        theme: string;
        year: number;
        numParts: number;
        imageUrl?: string;
        description?: string;
        isRetired?: boolean;
    }[], "api", unknown>>;
};
