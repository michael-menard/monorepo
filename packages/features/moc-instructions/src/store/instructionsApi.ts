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
  MockInstructionFileUpload,
  MockInstructionFile,
  CreateMockInstructionFile,
  PartsListFileUpload,
  PartsListFile,
  CreatePartsListFile,
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
  tagTypes: ['MockInstruction', 'MockInstructionReview', 'MockInstructionPartsList', 'MockInstructionFile', 'PartsListFile'],
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

    // Instructions Files
    getInstructionsFiles: builder.query<MockInstructionFile[], string>({
      query: (instructionsId) => `/instructions/${instructionsId}/files`,
      providesTags: (result, error, instructionsId) => [{ type: 'MockInstructionFile', id: instructionsId }],
    }),
    uploadInstructionsFile: builder.mutation<MockInstructionFile, MockInstructionFileUpload>({
      query: (body) => ({
        url: '/upload-file',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, body) => [{ type: 'MockInstructionFile', id: body.instructionsId }],
    }),
    deleteInstructionsFile: builder.mutation<void, { instructionsId: string; fileId: string }>({
      query: ({ instructionsId, fileId }) => ({
        url: `/instructions/${instructionsId}/files/${fileId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { instructionsId }) => [{ type: 'MockInstructionFile', id: instructionsId }],
    }),

    // Parts List Files
    getPartsListFiles: builder.query<PartsListFile[], string>({
      query: (instructionsId) => `/instructions/${instructionsId}/parts-list-files`,
      providesTags: (result, error, instructionsId) => [{ type: 'PartsListFile', id: instructionsId }],
    }),
    uploadPartsListFile: builder.mutation<PartsListFile, PartsListFileUpload>({
      query: (body) => ({
        url: '/upload-parts-list-file',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, body) => [{ type: 'PartsListFile', id: body.instructionsId }],
    }),
    deletePartsListFile: builder.mutation<void, { instructionsId: string; fileId: string }>({
      query: ({ instructionsId, fileId }) => ({
        url: `/instructions/${instructionsId}/parts-list-files/${fileId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { instructionsId }) => [{ type: 'PartsListFile', id: instructionsId }],
    }),

    // Download endpoints
    getInstructionsFileDownloadInfo: builder.query<
      { file: MockInstructionFile; downloadInfo: { url: string; filename: string; mimeType: string; size?: number; expiresAt?: Date } },
      { instructionsId: string; fileId: string }
    >({
      query: ({ instructionsId, fileId }) => `/instructions/${instructionsId}/files/${fileId}/download-info`,
      providesTags: (result, error, { instructionsId, fileId }) => [{ type: 'MockInstructionFile', id: `${instructionsId}-${fileId}` }],
    }),

    getPartsListFileDownloadInfo: builder.query<
      { file: PartsListFile; downloadInfo: { url: string; filename: string; mimeType: string; size?: number; expiresAt?: Date } },
      { instructionsId: string; fileId: string }
    >({
      query: ({ instructionsId, fileId }) => `/instructions/${instructionsId}/parts-list-files/${fileId}/download-info`,
      providesTags: (result, error, { instructionsId, fileId }) => [{ type: 'PartsListFile', id: `${instructionsId}-${fileId}` }],
    }),

    downloadInstructionsFile: builder.mutation<
      { success: boolean; filename: string; size: number; error?: string },
      { instructionsId: string; fileId: string }
    >({
      query: ({ instructionsId, fileId }) => ({
        url: `/instructions/${instructionsId}/files/${fileId}/download`,
        method: 'GET',
        responseHandler: async (response) => {
          if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download';
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          return {
            success: true,
            filename,
            size: blob.size,
          };
        },
      }),
    }),

    downloadPartsListFile: builder.mutation<
      { success: boolean; filename: string; size: number; error?: string },
      { instructionsId: string; fileId: string }
    >({
      query: ({ instructionsId, fileId }) => ({
        url: `/instructions/${instructionsId}/parts-list-files/${fileId}/download`,
        method: 'GET',
        responseHandler: async (response) => {
          if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download';
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          return {
            success: true,
            filename,
            size: blob.size,
          };
        },
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
  useGetInstructionsFilesQuery,
  useUploadInstructionsFileMutation,
  useDeleteInstructionsFileMutation,
  useGetPartsListFilesQuery,
  useUploadPartsListFileMutation,
  useDeletePartsListFileMutation,
  useGetInstructionsFileDownloadInfoQuery,
  useGetPartsListFileDownloadInfoQuery,
  useDownloadInstructionsFileMutation,
  useDownloadPartsListFileMutation,
} = instructionsApi; 