import type { Slice } from '@reduxjs/toolkit';
import type { AuthState } from '../types/auth';
export declare const authSlice: Slice<AuthState>;
export declare const clearError: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<`${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPayload<any, `${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, any> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, any>, clearMessage: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<`${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPayload<any, `${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, any> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, any>, setUser: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<`${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPayload<any, `${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, any> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, any>, logoutSuccess: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<`${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPayload<any, `${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, any> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, any>, setLoading: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<`${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPayload<any, `${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, any> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, any>, setCheckingAuth: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<`${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPayload<any, `${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, any> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, any>, setError: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<`${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPayload<any, `${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, any> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, any>, setMessage: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<`${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPayload<any, `${string}/${string}`> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, never, any> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, never> | import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<any[], any, `${string}/${string}`, any, any>;
export declare const selectUser: (state: {
    auth: AuthState;
}) => {
    email: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    role: string;
    avatarUrl?: string | undefined;
    emailVerified?: boolean | undefined;
    isVerified?: boolean | undefined;
} | null;
export declare const selectIsAuthenticated: (state: {
    auth: AuthState;
}) => boolean;
export declare const selectIsLoading: (state: {
    auth: AuthState;
}) => boolean;
export declare const selectIsCheckingAuth: (state: {
    auth: AuthState;
}) => boolean | undefined;
export declare const selectError: (state: {
    auth: AuthState;
}) => string | null;
export declare const selectMessage: (state: {
    auth: AuthState;
}) => string | null | undefined;
declare const _default: import("@reduxjs/toolkit").Reducer<AuthState>;
export default _default;
