import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  LoginRequest,
  SignupRequest,
  ResetPasswordRequest,
  ConfirmResetRequest,
  AuthResponse,
  VerifyEmailRequest,
} from '../types/auth.js';

const baseUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api/auth'
  : '/api/auth';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include', // for cookies
  }),
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    signup: builder.mutation<AuthResponse, SignupRequest>({
      query: (body) => ({
        url: '/signup',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    refresh: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/refresh',
        method: 'POST',
      }),
    }),
    resetPassword: builder.mutation<AuthResponse, ResetPasswordRequest>({
      query: (body) => ({
        url: '/reset-password',
        method: 'POST',
        body,
      }),
    }),
    confirmReset: builder.mutation<AuthResponse, ConfirmResetRequest>({
      query: (body) => ({
        url: '/confirm-reset',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),
    checkAuth: builder.query<AuthResponse, void>({
      query: () => ({
        url: '/check-auth',
        method: 'GET',
      }),
      providesTags: ['Auth', 'User'],
    }),
    verifyEmail: builder.mutation<AuthResponse, VerifyEmailRequest>({
      query: (body) => ({
        url: '/verify-email',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    resendVerificationCode: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/resend-verification',
        method: 'POST',
      }),
    }),
    socialLogin: builder.mutation<AuthResponse, { provider: 'google' | 'twitter' | 'facebook' | 'github' }>({
      query: ({ provider }) => ({
        url: `/social/${provider}`,
        method: 'GET',
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useRefreshMutation,
  useResetPasswordMutation,
  useConfirmResetMutation,
  useCheckAuthQuery,
  useVerifyEmailMutation,
  useResendVerificationCodeMutation,
  useSocialLoginMutation,
} = authApi; 