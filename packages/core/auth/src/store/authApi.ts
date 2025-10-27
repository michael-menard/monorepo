import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react'
import {getRTKQueryCacheConfig} from '@repo/cache'
import type {BaseQueryFn, FetchArgs, FetchBaseQueryError} from '@reduxjs/toolkit/query'
import type {AuthResponse, ConfirmResetRequest, ForgotPasswordRequest, LoginRequest, SignupRequest, VerifyEmailRequest,} from '../types/auth.js'
import {getCSRFHeaders, isCSRFError, refreshCSRFToken} from '../utils/csrf.js'

// Environment-aware base URL function
const getAuthBaseUrl = () => {
  // Check if we're in a browser environment with Vite
  if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
    const isDev = import.meta.env.DEV
    // const environment = import.meta.env.VITE_ENVIRONMENT || (isDev ? 'development' : 'production')

    if (isDev) {
      // Development: Use local auth service
      const authPort = import.meta.env.VITE_AUTH_API_PORT || '3001'
      return `http://localhost:${authPort}/api/auth`
    } else {
      // Production/Staging: Use environment-specific URL
      const authUrl = import.meta.env.VITE_AUTH_API_URL
      if (authUrl) {
        return authUrl.endsWith('/api/auth') ? authUrl : `${authUrl}/api/auth`
      }
      // Fallback to relative URL
      return '/api/auth'
    }
  }

  // Node.js environment (tests, SSR)
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return `http://localhost:${process.env.AUTH_SERVICE_PORT || '3001'}/api/auth`
  }

  // Production fallback
  return '/api/auth'
}

const baseUrl = getAuthBaseUrl()

// Create a base query with CSRF retry logic
const baseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include', // for cookies
  prepareHeaders: async (headers, { endpoint }) => {
    // Add CSRF headers for mutation requests
    const isMutation = [
      'login',
      'signup',
      'logout',
      'refresh',
      'resetPassword',
      'confirmReset',
      'verifyEmail',
      'resendVerificationCode',
      'socialLogin',
    ].includes(endpoint)

    if (isMutation) {
      try {
        const csrfHeaders = await getCSRFHeaders()
        Object.entries(csrfHeaders).forEach(([key, value]) => {
          headers.set(key, value)
        })
      } catch (error) {
        console.warn('Failed to add CSRF token to auth request:', error)
      }
    }

    return headers
  },
})

// Enhanced base query with CSRF retry logic
const baseQueryWithCSRFRetry: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)

  // Check if this is a CSRF failure and we can retry
  if (result.error && isCSRFError(result.error)) {
    console.log('CSRF token failed on auth request, attempting to refresh and retry')

    try {
      // Get a fresh CSRF token
      await refreshCSRFToken()

      // Retry the request
      console.log('Retrying auth request with fresh CSRF token')
      result = await baseQuery(args, api, extraOptions)
    } catch (refreshError) {
      console.error('Failed to refresh CSRF token for auth retry:', refreshError)
      // Return the original error if refresh fails
    }
  }

  return result
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithCSRFRetry,
  tagTypes: ['Auth', 'User'],
  endpoints: builder => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: body => ({
        url: '/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    signup: builder.mutation<AuthResponse, SignupRequest>({
      query: body => ({
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
    forgotPassword: builder.mutation<AuthResponse, ForgotPasswordRequest>({
      query: body => ({
        url: '/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation<AuthResponse, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: `/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),
    confirmReset: builder.mutation<AuthResponse, ConfirmResetRequest>({
      query: body => ({
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
      // Disable caching for auth check to prevent stale data
      ...getRTKQueryCacheConfig('realtime'), // No cache, always refetch
    }),
    verifyEmail: builder.mutation<AuthResponse, VerifyEmailRequest>({
      query: body => ({
        url: '/verify-email',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    resendVerificationCode: builder.mutation<AuthResponse, { email: string }>({
      query: body => ({
        url: '/resend-verification',
        method: 'POST',
        body,
      }),
    }),
    fetchCSRFToken: builder.query<{ token: string }, void>({
      query: () => ({
        url: '/csrf',
        method: 'GET',
      }),
    }),
    socialLogin: builder.mutation<
      AuthResponse,
      { provider: 'google' | 'twitter' | 'facebook' | 'github' }
    >({
      query: ({ provider }) => ({
        url: `/social/${provider}`,
        method: 'GET',
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
  }),
})

export const {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useRefreshMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useConfirmResetMutation,
  useCheckAuthQuery,
  useVerifyEmailMutation,
  useResendVerificationCodeMutation,
  useFetchCSRFTokenQuery,
  useSocialLoginMutation,
} = authApi
