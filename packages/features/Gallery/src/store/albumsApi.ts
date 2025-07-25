import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { EndpointBuilder } from '@reduxjs/toolkit/query';

export interface GalleryAlbum {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coverImageId?: string;
  createdAt: string;
  lastUpdatedAt: string;
  images?: GalleryImage[];
}

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

export interface GalleryAlbumResponse {
  album: GalleryAlbum;
  images: GalleryImage[];
}

export interface GalleryAlbumsResponse {
  albums: GalleryAlbum[];
}

const baseUrl = 'http://localhost/api'; // Base URL for the API

export const albumsApi = createApi({
  reducerPath: 'albumsApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers: Headers) => {
      // Add auth token if needed
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['GalleryAlbum'],
  endpoints: (builder: EndpointBuilder<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>, 'GalleryAlbum', 'albumsApi'>) => ({
    getAlbums: builder.query<GalleryAlbumsResponse, { withImages?: boolean }>({
      query: (params) => ({
        url: '/albums',
        ...(params.withImages && { params: { withImages: 'true' } }),
      }),
      providesTags: (result: GalleryAlbumsResponse | undefined) =>
        result?.albums
          ? [
              ...result.albums.map(({ id }: { id: string }) => ({ type: 'GalleryAlbum' as const, id })),
              { type: 'GalleryAlbum', id: 'LIST' },
            ]
          : [{ type: 'GalleryAlbum', id: 'LIST' }],
    }),
    getAlbumById: builder.query<GalleryAlbumResponse, string>({
      query: (id: string) => `/albums/${id}`,
      providesTags: (result: GalleryAlbumResponse | undefined, error: unknown, id: string) => [
        { type: 'GalleryAlbum', id },
        { type: 'GalleryAlbum', id: 'LIST' },
      ],
    }),
    createAlbum: builder.mutation<GalleryAlbumResponse, Partial<GalleryAlbum>>({
      query: (albumData) => ({
        url: '/albums',
        method: 'POST',
        body: albumData,
      }),
      invalidatesTags: [{ type: 'GalleryAlbum', id: 'LIST' }],
    }),
    updateAlbum: builder.mutation<GalleryAlbumResponse, { id: string; data: Partial<GalleryAlbum> }>({
      query: ({ id, data }) => ({
        url: `/albums/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result: GalleryAlbumResponse | undefined, error: unknown, arg: { id: string; data: Partial<GalleryAlbum> }) => [
        { type: 'GalleryAlbum', id: arg.id },
        { type: 'GalleryAlbum', id: 'LIST' },
      ],
    }),
    deleteAlbum: builder.mutation<{ message: string }, string>({
      query: (id: string) => ({
        url: `/albums/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result: { message: string } | undefined, error: unknown, id: string) => [
        { type: 'GalleryAlbum', id },
        { type: 'GalleryAlbum', id: 'LIST' },
      ],
    }),
    addImageToAlbum: builder.mutation<GalleryAlbumResponse, { albumId: string; imageId: string }>({
      query: ({ albumId, imageId }) => ({
        url: `/albums/${albumId}/images`,
        method: 'POST',
        body: { imageId },
      }),
      invalidatesTags: (result: GalleryAlbumResponse | undefined, error: unknown, arg: { albumId: string; imageId: string }) => [
        { type: 'GalleryAlbum', id: arg.albumId },
        { type: 'GalleryAlbum', id: 'LIST' },
      ],
    }),
    removeImageFromAlbum: builder.mutation<GalleryAlbumResponse, { albumId: string; imageId: string }>({
      query: ({ albumId, imageId }) => ({
        url: `/albums/${albumId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result: GalleryAlbumResponse | undefined, error: unknown, arg: { albumId: string; imageId: string }) => [
        { type: 'GalleryAlbum', id: arg.albumId },
        { type: 'GalleryAlbum', id: 'LIST' },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetAlbumsQuery,
  useGetAlbumByIdQuery,
  useCreateAlbumMutation,
  useUpdateAlbumMutation,
  useDeleteAlbumMutation,
  useAddImageToAlbumMutation,
  useRemoveImageFromAlbumMutation,
} = albumsApi; 