// If you see a type error for '@reduxjs/toolkit/query/react', ensure you have @reduxjs/toolkit installed.
import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
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

export interface SearchFilters {
  query?: string;
  tags?: string[];
  category?: string;
  from?: number;
  size?: number;
}

export interface SearchResponse {
  data: GalleryImage[];
  total: number;
  source: 'elasticsearch' | 'database';
  message?: string;
}

// New interfaces for unified gallery with pagination
export interface GalleryItem {
  id: string;
  type: 'image' | 'album';
  url?: string;
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface GalleryFilters {
  type?: 'album' | 'image' | 'all';
  tag?: string;
  albumId?: string;
  flagged?: boolean;
  search?: string;
  limit?: number;
  cursor?: number;
}

export interface GalleryResponse {
  items: GalleryItem[];
  nextCursor: number | null;
  hasMore: boolean;
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
  tagTypes: ['GalleryImage', 'GalleryAlbum', 'GalleryItem'],
  endpoints: (
    builder: EndpointBuilder<
      BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>,
      'GalleryImage' | 'GalleryAlbum' | 'GalleryItem',
      'galleryApi'
    >,
  ) => ({
    // New unified gallery endpoint with infinite scroll support
    getGallery: builder.query<GalleryResponse, GalleryFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.tag) params.append('tag', filters.tag);
        if (filters.albumId) params.append('albumId', filters.albumId);
        if (filters.flagged !== undefined) params.append('flagged', filters.flagged.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.cursor !== undefined) params.append('cursor', filters.cursor.toString());

        return `/?${params.toString()}`;
      },
      providesTags: (result: GalleryResponse | undefined) =>
        result?.items
          ? [
              ...result.items.map(({ id, type }) => ({
                type: type === 'image' ? 'GalleryImage' : 'GalleryAlbum',
                id,
              })),
              { type: 'GalleryItem', id: 'LIST' },
            ]
          : [{ type: 'GalleryItem', id: 'LIST' }],
    }),

    getImages: builder.query<GalleryImagesResponse, void>({
      query: () => '/',
      providesTags: (result: GalleryImagesResponse | undefined) =>
        result?.data
          ? [
              ...result.data.map(({ id }: { id: string }) => ({
                type: 'GalleryImage' as const,
                id,
              })),
              { type: 'GalleryImage', id: 'LIST' },
            ]
          : [{ type: 'GalleryImage', id: 'LIST' }],
    }),
    getImageById: builder.query<GalleryImageResponse, string>({
      query: (id: string) => `/${id}`,
      providesTags: (result: GalleryImageResponse | undefined, error: unknown, id: string) => [
        { type: 'GalleryImage', id },
      ],
    }),
    searchImages: builder.query<SearchResponse, SearchFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.query) params.append('q', filters.query);
        if (filters.tags && filters.tags.length > 0) {
          filters.tags.forEach((tag) => params.append('tag', tag));
        }
        if (filters.category) params.append('category', filters.category);
        if (filters.from !== undefined) params.append('from', filters.from.toString());
        if (filters.size !== undefined) params.append('size', filters.size.toString());

        return `/search?${params.toString()}`;
      },
      providesTags: (result: SearchResponse | undefined) =>
        result?.data
          ? [
              ...result.data.map(({ id }: { id: string }) => ({
                type: 'GalleryImage' as const,
                id,
              })),
              { type: 'GalleryImage', id: 'LIST' },
            ]
          : [{ type: 'GalleryImage', id: 'LIST' }],
    }),
    getAvailableTags: builder.query<string[], void>({
      query: () => '/tags',
      providesTags: ['GalleryImage'],
    }),
    getAvailableCategories: builder.query<string[], void>({
      query: () => '/categories',
      providesTags: ['GalleryImage'],
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
      invalidatesTags: [
        { type: 'GalleryImage', id: 'LIST' },
        { type: 'GalleryItem', id: 'LIST' },
      ],
    }),
    updateImage: builder.mutation<
      GalleryImageResponse,
      { id: string; data: Partial<GalleryImage> }
    >({
      query: ({ id, data }: { id: string; data: Partial<GalleryImage> }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (
        result: GalleryImageResponse | undefined,
        error: unknown,
        arg: { id: string; data: Partial<GalleryImage> },
      ) => [{ type: 'GalleryImage', id: arg.id }],
    }),
    deleteImage: builder.mutation<{ message: string }, string>({
      query: (id: string) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result: { message: string } | undefined, error: unknown, id: string) => [
        { type: 'GalleryImage', id },
        { type: 'GalleryImage', id: 'LIST' },
        { type: 'GalleryItem', id: 'LIST' },
      ],
    }),
    batchDeleteImages: builder.mutation<{ message: string; deletedIds: string[] }, string[]>({
      query: (imageIds: string[]) => ({
        url: '/batch-delete',
        method: 'DELETE',
        body: { imageIds },
      }),
      invalidatesTags: (
        result: { message: string; deletedIds: string[] } | undefined,
        error: unknown,
        imageIds: string[],
      ) => [
        ...imageIds.map((id) => ({ type: 'GalleryImage' as const, id })),
        { type: 'GalleryImage', id: 'LIST' },
        { type: 'GalleryItem', id: 'LIST' },
      ],
    }),
    batchAddImagesToAlbum: builder.mutation<
      { message: string; albumId: string; addedIds: string[] },
      { albumId: string; imageIds: string[] }
    >({
      query: ({ albumId, imageIds }) => ({
        url: `/albums/${albumId}/batch-add`,
        method: 'POST',
        body: { imageIds },
      }),
      invalidatesTags: (
        result: { message: string; albumId: string; addedIds: string[] } | undefined,
        error: unknown,
        arg: { albumId: string; imageIds: string[] },
      ) => [
        { type: 'GalleryAlbum', id: arg.albumId },
        { type: 'GalleryAlbum', id: 'LIST' },
        ...arg.imageIds.map((id) => ({ type: 'GalleryImage' as const, id })),
        { type: 'GalleryImage', id: 'LIST' },
        { type: 'GalleryItem', id: 'LIST' },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetGalleryQuery,
  useGetImagesQuery,
  useGetImageByIdQuery,
  useSearchImagesQuery,
  useGetAvailableTagsQuery,
  useGetAvailableCategoriesQuery,
  useUploadImageMutation,
  useUpdateImageMutation,
  useDeleteImageMutation,
  useBatchDeleteImagesMutation,
  useBatchAddImagesToAlbumMutation,
} = galleryApi;

// For testing: mock fetchBaseQuery or use MSW to mock endpoints
