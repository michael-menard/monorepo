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
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
    }),
    signup: builder.mutation<AuthResponse, SignupRequest>({
      query: (body) => ({
        url: '/signup',
        method: 'POST',
        body,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
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
    }),
    checkAuth: builder.query<AuthResponse, void>({
      query: () => ({
        url: '/check-auth',
        method: 'GET',
      }),
    }),
    verifyEmail: builder.mutation<AuthResponse, VerifyEmailRequest>({
      query: (body) => ({
        url: '/verify-email',
        method: 'POST',
        body,
      }),
    }),
    socialLogin: builder.mutation<AuthResponse, { provider: 'google' | 'twitter' | 'facebook' | 'github' }>({
      query: ({ provider }) => ({
        url: `/social/${provider}`,
        method: 'GET',
      }),
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
  useSocialLoginMutation,
} = authApi; 