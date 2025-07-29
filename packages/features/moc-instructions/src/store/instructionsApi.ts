import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  MockInstruction,
  CreateMockInstruction,
  UpdateMockInstruction,
  MockInstructionFilter,
  MockInstructionReview,
  CreateMockInstructionReview,
  MockInstructionPartsList,
  CreateMockInstructionPartsList,
  MockInstructionImageUpload,
} from '../schemas';

const baseUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api/instructions'
  : '/api/instructions';

export const instructionsApi = createApi({
  reducerPath: 'instructionsApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
  }),
  tagTypes: ['MockInstruction', 'MockInstructionReview', 'MockInstructionPartsList'],
  endpoints: (builder) => ({
    // Instructions
    getInstructions: builder.query<MockInstruction[], MockInstructionFilter>({
      query: (filters) => ({
        url: '/instructions',
        params: filters,
      }),
      providesTags: ['MockInstruction'],
    }),
    getInstruction: builder.query<MockInstruction, string>({
      query: (id) => `/instructions/${id}`,
      providesTags: (result, error, id) => [{ type: 'MockInstruction', id }],
    }),
    createInstruction: builder.mutation<MockInstruction, CreateMockInstruction>({
      query: (body) => ({
        url: '/instructions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MockInstruction'],
    }),
    updateInstruction: builder.mutation<
      MockInstruction,
      { id: string; data: UpdateMockInstruction }
    >({
      query: ({ id, data }) => ({
        url: `/instructions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'MockInstruction', id }],
    }),
    deleteInstruction: builder.mutation<void, string>({
      query: (id) => ({
        url: `/instructions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MockInstruction'],
    }),

    // Instructions Reviews
    getInstructionsReviews: builder.query<MockInstructionReview[], string>({
      query: (instructionsId) => `/instructions/${instructionsId}/reviews`,
      providesTags: (result, error, instructionsId) => [{ type: 'MockInstructionReview', id: instructionsId }],
    }),
    createInstructionsReview: builder.mutation<MockInstructionReview, { instructionsId: string; data: CreateMockInstructionReview }>({
      query: ({ instructionsId, data }) => ({
        url: `/instructions/${instructionsId}/reviews`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { instructionsId }) => [
        { type: 'MockInstructionReview', id: instructionsId },
        { type: 'MockInstruction', id: instructionsId },
      ],
    }),

    // Instructions Parts Lists
    getInstructionsPartsLists: builder.query<MockInstructionPartsList[], string>({
      query: (instructionsId) => `/instructions/${instructionsId}/parts-lists`,
      providesTags: (result, error, instructionsId) => [{ type: 'MockInstructionPartsList', id: instructionsId }],
    }),
    createInstructionsPartsList: builder.mutation<MockInstructionPartsList, { instructionsId: string; data: CreateMockInstructionPartsList }>({
      query: ({ instructionsId, data }) => ({
        url: `/instructions/${instructionsId}/parts-lists`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { instructionsId }) => [{ type: 'MockInstructionPartsList', id: instructionsId }],
    }),

    // Image Upload
    uploadInstructionsImage: builder.mutation<{ imageUrl: string }, MockInstructionImageUpload>({
      query: (body) => ({
        url: '/upload-image',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetInstructionsQuery,
  useGetInstructionQuery,
  useCreateInstructionMutation,
  useUpdateInstructionMutation,
  useDeleteInstructionMutation,
  useGetInstructionsReviewsQuery,
  useCreateInstructionsReviewMutation,
  useGetInstructionsPartsListsQuery,
  useCreateInstructionsPartsListMutation,
  useUploadInstructionsImageMutation,
} = instructionsApi; 