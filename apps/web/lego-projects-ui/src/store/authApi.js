/**
 * Auth API Slice (RTK Query)
 * Handles authentication endpoints: login, signup, get current user
 */
import { z } from 'zod';
import { baseApi } from './api';
// Zod schemas for request/response validation
export const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
export const SignupRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    username: z.string().min(2),
});
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    username: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const AuthResponseSchema = z.object({
    user: UserSchema,
    token: z.string(),
});
export const authApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        login: build.mutation({
            query: (body) => ({
                url: '/auth/login',
                method: 'POST',
                body,
            }),
            transformResponse: (response) => AuthResponseSchema.parse(response),
        }),
        signup: build.mutation({
            query: (body) => ({
                url: '/auth/signup',
                method: 'POST',
                body,
            }),
            transformResponse: (response) => AuthResponseSchema.parse(response),
        }),
        getCurrentUser: build.query({
            query: () => '/auth/me',
            transformResponse: (response) => UserSchema.parse(response),
        }),
    }),
    overrideExisting: false,
});
export const { useLoginMutation, useSignupMutation, useGetCurrentUserQuery, } = authApi;
