import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Profile, UpdateProfile, AvatarUpload } from '../schemas';

const baseUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api/profile'
  : '/api/profile';

export const profileApi = createApi({
  reducerPath: 'profileApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
  }),
  tagTypes: ['Profile'],
  endpoints: (builder) => ({
    getProfile: builder.query<Profile, void>({
      query: () => '/',
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation<Profile, UpdateProfile>({
      query: (body) => ({
        url: '/',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    uploadAvatar: builder.mutation<{ avatarUrl: string }, AvatarUpload>({
      query: (body) => ({
        url: '/avatar',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    deleteAvatar: builder.mutation<void, void>({
      query: () => ({
        url: '/avatar',
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),
    changePassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string; confirmPassword: string }>({
      query: (body) => ({
        url: '/change-password',
        method: 'POST',
        body,
      }),
    }),
    changeEmail: builder.mutation<{ message: string }, { currentEmail: string; newEmail: string; password: string }>({
      query: (body) => ({
        url: '/change-email',
        method: 'POST',
        body,
      }),
    }),
    deleteAccount: builder.mutation<{ message: string }, { password: string; confirmation: string }>({
      query: (body) => ({
        url: '/delete-account',
        method: 'DELETE',
        body,
      }),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  useChangePasswordMutation,
  useChangeEmailMutation,
  useDeleteAccountMutation,
} = profileApi; 