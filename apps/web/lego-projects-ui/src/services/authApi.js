import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const AuthErrorType = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    SERVER_ERROR: 'SERVER_ERROR'
};
export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api/auth',
        credentials: 'include', // for HTTP-only cookies
    }),
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
        }),
        signup: builder.mutation({
            query: (userData) => ({
                url: '/auth/signup',
                method: 'POST',
                body: userData,
            }),
        }),
        refreshToken: builder.mutation({
            query: () => ({
                url: '/auth/refresh',
                method: 'POST',
            }),
        }),
        logout: builder.mutation({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
        }),
        verifyEmail: builder.mutation({
            query: ({ otp }) => ({
                url: '/auth/verify-email',
                method: 'POST',
                body: { otp },
            }),
        }),
        forgotPassword: builder.mutation({
            query: ({ email }) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                body: { email },
            }),
        }),
        resetPassword: builder.mutation({
            query: ({ token, password }) => ({
                url: '/auth/reset-password',
                method: 'POST',
                body: { token, password },
            }),
        }),
    }),
});
console.log('authApi endpoints at module load:', Object.keys(authApi.endpoints));
export const { useLoginMutation, useSignupMutation, useRefreshTokenMutation, useLogoutMutation, useVerifyEmailMutation, useForgotPasswordMutation, useResetPasswordMutation, } = authApi;
