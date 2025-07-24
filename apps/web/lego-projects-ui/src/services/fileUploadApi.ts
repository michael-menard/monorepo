import { baseApi } from '@/store/api';

// Types for file upload operations
export interface FileUploadResponse {
  success: boolean;
  fileUrl?: string;
  message: string;
}

export interface FileUploadRequest {
  file: File;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  uploadTimestamp?: number;
}

// File upload API slice
export const fileUploadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Upload file
    uploadFile: builder.mutation<FileUploadResponse, FileUploadRequest>({
      query: ({ file, fileName, fileSize, fileType, uploadTimestamp }) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const headers: Record<string, string> = {};
        if (fileName) headers['X-File-Name'] = fileName;
        if (fileSize) headers['X-File-Size'] = fileSize.toString();
        if (fileType) headers['X-File-Type'] = fileType;
        if (uploadTimestamp) headers['X-Upload-Timestamp'] = uploadTimestamp.toString();
        
        return {
          url: '/api/upload', // This should be replaced with your actual upload endpoint
          method: 'POST',
          body: formData,
          headers,
          // Don't set Content-Type header for FormData
          prepareHeaders: (headers: Headers) => {
            headers.delete('Content-Type');
            return headers;
          },
        };
      },
      invalidatesTags: ['FileUpload'],
    }),
  }),
});

export const {
  useUploadFileMutation,
} = fileUploadApi; 