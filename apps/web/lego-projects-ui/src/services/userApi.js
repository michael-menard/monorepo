import { baseApi } from '../store/api.js';
// User API slice
export const userApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Upload avatar
        uploadAvatar: builder.mutation({
            query: ({ userId, file }) => {
                const formData = new FormData();
                formData.append('avatar', file);
                return {
                    url: `/api/users/${userId}/avatar`,
                    method: 'POST',
                    body: formData,
                    // Don't set Content-Type header for FormData
                    prepareHeaders: (headers) => {
                        headers.delete('Content-Type');
                        return headers;
                    },
                };
            },
            invalidatesTags: ['User'],
        }),
        // Get user profile
        getUserProfile: builder.query({
            query: (userId) => `/api/users/${userId}/profile`,
            providesTags: (result, error, userId) => [{ type: 'User', id: userId }],
        }),
        // Update user profile
        updateUserProfile: builder.mutation({
            query: ({ userId, data }) => ({
                url: `/api/users/${userId}/profile`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { userId }) => [{ type: 'User', id: userId }],
        }),
    }),
});
export const { useUploadAvatarMutation, useGetUserProfileQuery, useUpdateUserProfileMutation, } = userApi;
