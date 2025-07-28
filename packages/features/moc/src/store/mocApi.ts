import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  MocInstruction,
  CreateMocInstruction,
  UpdateMocInstruction,
  MocFilter,
  MocReview,
  CreateMocReview,
  MocPartsList,
  CreateMocPartsList,
  MocImageUpload,
} from '../schemas';

const baseUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api/moc'
  : '/api/moc';

export const mocApi = createApi({
  reducerPath: 'mocApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
  }),
  tagTypes: ['MocInstruction', 'MocReview', 'MocPartsList'],
  endpoints: (builder) => ({
    // MOC Instructions
    getMocInstructions: builder.query<MocInstruction[], MocFilter>({
      query: (filters) => ({
        url: '/instructions',
        params: filters,
      }),
      providesTags: ['MocInstruction'],
    }),
    getMocInstruction: builder.query<MocInstruction, string>({
      query: (id) => `/instructions/${id}`,
      providesTags: (result, error, id) => [{ type: 'MocInstruction', id }],
    }),
    createMocInstruction: builder.mutation<MocInstruction, CreateMocInstruction>({
      query: (body) => ({
        url: '/instructions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MocInstruction'],
    }),
    updateMocInstruction: builder.mutation<MocInstruction, { id: string; data: UpdateMocInstruction }>({
      query: ({ id, data }) => ({
        url: `/instructions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'MocInstruction', id }],
    }),
    deleteMocInstruction: builder.mutation<void, string>({
      query: (id) => ({
        url: `/instructions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MocInstruction'],
    }),

    // MOC Reviews
    getMocReviews: builder.query<MocReview[], string>({
      query: (mocId) => `/instructions/${mocId}/reviews`,
      providesTags: (result, error, mocId) => [{ type: 'MocReview', id: mocId }],
    }),
    createMocReview: builder.mutation<MocReview, { mocId: string; data: CreateMocReview }>({
      query: ({ mocId, data }) => ({
        url: `/instructions/${mocId}/reviews`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { mocId }) => [
        { type: 'MocReview', id: mocId },
        { type: 'MocInstruction', id: mocId },
      ],
    }),

    // MOC Parts Lists
    getMocPartsLists: builder.query<MocPartsList[], string>({
      query: (mocId) => `/instructions/${mocId}/parts-lists`,
      providesTags: (result, error, mocId) => [{ type: 'MocPartsList', id: mocId }],
    }),
    createMocPartsList: builder.mutation<MocPartsList, { mocId: string; data: CreateMocPartsList }>({
      query: ({ mocId, data }) => ({
        url: `/instructions/${mocId}/parts-lists`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { mocId }) => [{ type: 'MocPartsList', id: mocId }],
    }),

    // Image Upload
    uploadMocImage: builder.mutation<{ imageUrl: string }, MocImageUpload>({
      query: (body) => ({
        url: '/upload-image',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetMocInstructionsQuery,
  useGetMocInstructionQuery,
  useCreateMocInstructionMutation,
  useUpdateMocInstructionMutation,
  useDeleteMocInstructionMutation,
  useGetMocReviewsQuery,
  useCreateMocReviewMutation,
  useGetMocPartsListsQuery,
  useCreateMocPartsListMutation,
  useUploadMocImageMutation,
} = mocApi; 