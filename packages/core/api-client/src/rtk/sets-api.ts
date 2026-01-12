import { createApi } from '@reduxjs/toolkit/query/react'
import { createAuthenticatedBaseQuery } from '../auth/rtk-auth-integration'
import type {
  Set,
  SetListQuery,
  SetListResponse,
  CreateSetInput,
  UpdateSetInput,
} from '../types/sets'
import { SetListResponseSchema, SetSchema } from '../types/sets'

// Note: this assumes you will create ../types/sets.ts that re-exports
// the Zod-derived types and schemas from apps/api/endpoints/sets/schemas

export const setsApi = createApi({
  reducerPath: 'setsApi',
  baseQuery: createAuthenticatedBaseQuery({
    baseUrl:
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVERLESS_API_BASE_URL) ||
      '/api',
  }),
  tagTypes: ['Set'],
  endpoints: builder => ({
    getSets: builder.query<SetListResponse, Partial<SetListQuery>>({
      query: params => ({
        url: '/sets',
        params,
      }),
      transformResponse: response => SetListResponseSchema.parse(response),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Set' as const, id })),
              { type: 'Set' as const, id: 'LIST' },
            ]
          : [{ type: 'Set' as const, id: 'LIST' }],
    }),

    getSetById: builder.query<Set, string>({
      query: id => `/sets/${id}`,
      transformResponse: response =>
        // backend returns { success, data } or raw set; support both
        SetSchema.parse((response as any).data ?? response),
      providesTags: (result, _error, id) => [{ type: 'Set' as const, id }],
    }),

    addSet: builder.mutation<Set, CreateSetInput>({
      query: body => ({
        url: '/sets',
        method: 'POST',
        body,
      }),
      transformResponse: response => SetSchema.parse((response as any).data ?? response),
      invalidatesTags: [{ type: 'Set' as const, id: 'LIST' }],
    }),

    updateSet: builder.mutation<Set, { id: string; data: UpdateSetInput }>({
      query: ({ id, data }) => ({
        url: `/sets/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: response => SetSchema.parse((response as any).data ?? response),
      invalidatesTags: (result, _error, { id }) => [
        { type: 'Set' as const, id },
        { type: 'Set' as const, id: 'LIST' },
      ],
    }),

    deleteSet: builder.mutation<void, string>({
      query: id => ({
        url: `/sets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, _error, id) => [
        { type: 'Set' as const, id },
        { type: 'Set' as const, id: 'LIST' },
      ],
    }),

    presignSetImage: builder.mutation<
      { uploadUrl: string; imageUrl: string; key: string; expiresIn: number },
      { setId: string; filename: string; contentType: string }
    >({
      query: ({ setId, ...body }) => ({
        url: `/sets/${setId}/images/presign`,
        method: 'POST',
        body,
      }),
    }),

    registerSetImage: builder.mutation<
      { id: string; imageUrl: string; thumbnailUrl?: string | null; position: number },
      { setId: string; imageUrl: string; key: string; thumbnailUrl?: string }
    >({
      query: ({ setId, ...body }) => ({
        url: `/sets/${setId}/images`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { setId }) => [{ type: 'Set' as const, id: setId }],
    }),

    deleteSetImage: builder.mutation<void, { setId: string; imageId: string }>({
      query: ({ setId, imageId }) => ({
        url: `/sets/${setId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { setId }) => [{ type: 'Set' as const, id: setId }],
    }),
  }),
})

export const {
  useGetSetsQuery,
  useGetSetByIdQuery,
  useAddSetMutation,
  useUpdateSetMutation,
  useDeleteSetMutation,
  usePresignSetImageMutation,
  useRegisterSetImageMutation,
  useDeleteSetImageMutation,
} = setsApi
