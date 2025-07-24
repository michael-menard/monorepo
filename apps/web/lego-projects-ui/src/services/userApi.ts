import { baseApi } from '../store/api.js';

// Types for user operations
export interface AvatarUploadResponse {
  avatarUrl: string;
  message: string;
}

export interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  stats: {
    projects: number;
    followers: number;
    following: number;
  };
  bio?: string;
  email?: string;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

export interface ProfileUpdateRequest {
  displayName?: string;
  bio?: string;
  email?: string;
}

// User API slice
export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Upload avatar
    uploadAvatar: builder.mutation<AvatarUploadResponse, { userId: string; file: File }>({
      query: ({ userId, file }) => {
        const formData = new FormData();
        formData.append('avatar', file);
        
        return {
          url: `/api/users/${userId}/avatar`,
          method: 'POST',
          body: formData,
          // Don't set Content-Type header for FormData
          prepareHeaders: (headers: Headers) => {
            headers.delete('Content-Type');
            return headers;
          },
        };
      },
      invalidatesTags: ['User'],
    }),

    // Get user profile
    getUserProfile: builder.query<ProfileData, string>({
      query: (userId) => `/api/users/${userId}/profile`,
      providesTags: (result, error, userId) => [{ type: 'User', id: userId }],
    }),

    // Update user profile
    updateUserProfile: builder.mutation<ProfileData, { userId: string; data: ProfileUpdateRequest }>({
      query: ({ userId, data }) => ({
        url: `/api/users/${userId}/profile`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { userId }) => [{ type: 'User', id: userId }],
    }),
  }),
});

export const {
  useUploadAvatarMutation,
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
} = userApi; 