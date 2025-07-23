/**
 * Auth API Slice (RTK Query)
 * Handles authentication endpoints: login, signup, get current user
 */
import { z } from 'zod'
import { baseApi } from './api'

// Zod schemas for request/response validation
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(2),
})
export type SignupRequest = z.infer<typeof SignupRequestSchema>

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type User = z.infer<typeof UserSchema>

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
})
export type AuthResponse = z.infer<typeof AuthResponseSchema>

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => AuthResponseSchema.parse(response),
    }),
    signup: build.mutation<AuthResponse, SignupRequest>({
      query: (body) => ({
        url: '/auth/signup',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => AuthResponseSchema.parse(response),
    }),
    getCurrentUser: build.query<User, void>({
      query: () => '/auth/me',
      transformResponse: (response: any) => UserSchema.parse(response),
    }),
  }),
  overrideExisting: false,
})

export const {
  useLoginMutation,
  useSignupMutation,
  useGetCurrentUserQuery,
} = authApi 