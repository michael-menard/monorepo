import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { User } from '@repo/auth';

// Types moved from authService.ts
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  status: string;
  Status: number;
  message: string;
  data?: {
    user?: User;
    token?: string;
    refreshToken?: string;
  };
}

export interface AuthError {
  status: string;
  Status: number;
  message: string;
}

export const AuthErrorType = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVER_ERROR: 'SERVER_ERROR'
} as const;

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001',
    credentials: 'include', // for HTTP-only cookies
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    signup: builder.mutation<AuthResponse, SignupData>({
      query: (userData) => ({
        url: '/auth/signup',
        method: 'POST',
        body: userData,
      }),
    }),
    refreshToken: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
    }),
    logout: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    verifyEmail: builder.mutation<AuthResponse, { otp: string }>({
      query: ({ otp }) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body: { otp },
      }),
    }),
    forgotPassword: builder.mutation<AuthResponse, { email: string }>({
      query: ({ email }) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),
    resetPassword: builder.mutation<AuthResponse, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: { token, password },
      }),
    }),
    socialLogin: builder.mutation<AuthResponse, { provider: 'google' | 'twitter' | 'facebook' | 'github' }>({
      query: ({ provider }) => ({
        url: `/auth/social/${provider}`,
        method: 'GET',
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSocialLoginMutation,
} = authApi; 