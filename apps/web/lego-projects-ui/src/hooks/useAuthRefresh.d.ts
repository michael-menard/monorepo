export declare const useAuthRefresh: () => {
    refreshAuth: () => Promise<void>;
    isLoading: boolean;
    error: import("@reduxjs/toolkit/query").FetchBaseQueryError | import("@reduxjs/toolkit").SerializedError | undefined;
};
