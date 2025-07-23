// If you see a type error for '@reduxjs/toolkit/query/react', ensure you have @reduxjs/toolkit installed.
import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { EndpointBuilder } from '@reduxjs/toolkit/query';

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description?: string;
  author?: string;
  uploadDate: string;
  tags?: string[];
  [key: string]: any;
}

export interface GalleryImageResponse {
  data: GalleryImage;
  message?: string;
}

export interface GalleryImagesResponse {
  data: GalleryImage[];
  message?: string;
}

const baseUrl = 'http://localhost/api/gallery'; // Always use absolute URL for consistency in tests and dev

export const galleryApi = createApi({
  reducerPath: 'galleryApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers: Headers) => {
      // Example: Add auth token if needed
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['GalleryImage'],
  endpoints: (builder: EndpointBuilder<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>, 'GalleryImage', 'galleryApi'>) => ({
    getImages: builder.query<GalleryImagesResponse, void>({
      query: () => '/',
      providesTags: (result: GalleryImagesResponse | undefined) =>
        result?.data
          ? [
              ...result.data.map(({ id }: { id: string }) => ({ type: 'GalleryImage' as const, id })),
              { type: 'GalleryImage', id: 'LIST' },
            ]
          : [{ type: 'GalleryImage', id: 'LIST' }],
    }),
    getImageById: builder.query<GalleryImageResponse, string>({
      query: (id: string) => `/${id}`,
      providesTags: (result: GalleryImageResponse | undefined, error: unknown, id: string) => [{ type: 'GalleryImage', id }],
    }),
    uploadImage: builder.mutation<GalleryImageResponse, Partial<GalleryImage> & { file: File }>({
      query: (body: Partial<GalleryImage> & { file: File }) => {
        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => {
          if (key === 'file' && value instanceof File) {
            formData.append('file', value);
          } else if (value !== undefined) {
            formData.append(key, value as string);
          }
        });
        return {
          url: '/',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: [{ type: 'GalleryImage', id: 'LIST' }],
    }),
    updateImage: builder.mutation<GalleryImageResponse, { id: string; data: Partial<GalleryImage> }>({
      query: ({ id, data }: { id: string; data: Partial<GalleryImage> }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result: GalleryImageResponse | undefined, error: unknown, arg: { id: string; data: Partial<GalleryImage> }) => [
        { type: 'GalleryImage', id: arg.id },
      ],
    }),
    deleteImage: builder.mutation<{ message: string }, string>({
      query: (id: string) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result: { message: string } | undefined, error: unknown, id: string) => [
        { type: 'GalleryImage', id },
        { type: 'GalleryImage', id: 'LIST' },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetImagesQuery,
  useGetImageByIdQuery,
  useUploadImageMutation,
  useUpdateImageMutation,
  useDeleteImageMutation,
} = galleryApi;

// For testing: mock fetchBaseQuery or use MSW to mock endpoints 