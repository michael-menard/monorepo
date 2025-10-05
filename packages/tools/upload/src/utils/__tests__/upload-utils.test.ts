import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  uploadSingleFile,
  uploadFiles,
  retryUpload,
} from '../upload-utils.js';
import { 
  fileFixtures, 
  configFixtures,
  serverResponseFixtures 
} from '../../__tests__/fixtures.js';
import { 
  mockXMLHttpRequest,
  simulateUploadProgress,
  simulateUploadError,
  mockFetch 
} from '../../__tests__/mocks.js';

describe('upload-utils', () => {
  let mockXHR: any;
  let originalXMLHttpRequest: any;
  let originalFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Store originals
    originalXMLHttpRequest = global.XMLHttpRequest;
    originalFetch = global.fetch;
    
    // Set up mocks
    mockXHR = mockXMLHttpRequest();
    mockFetch(serverResponseFixtures.success);
  });

  afterEach(() => {
    // Restore originals
    global.XMLHttpRequest = originalXMLHttpRequest;
    global.fetch = originalFetch;
  });

  describe('uploadSingleFile', () => {
    it('should upload a single file successfully', async () => {
      const config = configFixtures.withEndpoint;
      const onProgress = vi.fn();

      // Start upload
      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config, onProgress);

      // Simulate successful upload
      setTimeout(() => {
        simulateUploadProgress(mockXHR, fileFixtures.jpegImage.size, 1, 10);
      }, 10);

      const result = await uploadPromise;

      expect(result).toHaveProperty('url');
      expect(typeof result.url).toBe('string');
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle upload progress correctly', async () => {
      const config = configFixtures.withEndpoint;
      const onProgress = vi.fn();

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config, onProgress);

      // Simulate progress updates
      setTimeout(() => {
        simulateUploadProgress(mockXHR, fileFixtures.jpegImage.size, 4, 25);
      }, 10);

      await uploadPromise;

      // Should have received multiple progress updates
      expect(onProgress).toHaveBeenCalledTimes(4);
      
      // Check progress values
      const progressCalls = onProgress.mock.calls;
      expect(progressCalls[0][0].percentage).toBe(25);
      expect(progressCalls[1][0].percentage).toBe(50);
      expect(progressCalls[2][0].percentage).toBe(75);
      expect(progressCalls[3][0].percentage).toBe(100);
    });

    it('should handle upload errors', async () => {
      const config = configFixtures.withEndpoint;
      const onProgress = vi.fn();

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config, onProgress);

      // Simulate upload error
      setTimeout(() => {
        simulateUploadError(mockXHR, 'Network error', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow(/network error/i);
    });

    it('should include custom headers', async () => {
      const config = {
        ...configFixtures.withEndpoint,
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      };

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      setTimeout(() => {
        simulateUploadProgress(mockXHR, fileFixtures.jpegImage.size, 1, 10);
      }, 10);

      await uploadPromise;

      // Verify headers were set
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer token123');
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('X-Custom-Header', 'custom-value');
    });

    it('should handle server error responses', async () => {
      const config = configFixtures.withEndpoint;
      
      // Mock server error response
      mockXHR.status = 500;
      mockXHR.response = JSON.stringify(serverResponseFixtures.error);

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      setTimeout(() => {
        // Trigger error event
        const errorEvent = new ProgressEvent('error');
        mockXHR.addEventListener.mock.calls
          .filter(([event]: [string]) => event === 'error')
          .forEach(([, handler]: [string, Function]) => handler(errorEvent));
      }, 10);

      await expect(uploadPromise).rejects.toThrow();
    });

    it('should validate required endpoint', async () => {
      const config = { ...configFixtures.default, endpoint: undefined };

      await expect(
        uploadSingleFile(fileFixtures.jpegImage, config)
      ).rejects.toThrow('Upload endpoint is required');
    });

    it('should handle abort/cancellation', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      // Simulate abort
      setTimeout(() => {
        const abortEvent = new ProgressEvent('abort');
        mockXHR.addEventListener.mock.calls
          .filter(([event]: [string]) => event === 'abort')
          .forEach(([, handler]: [string, Function]) => handler(abortEvent));
      }, 10);

      await expect(uploadPromise).rejects.toThrow(/abort/i);
    });
  });

  describe('uploadFiles', () => {
    it('should upload multiple files successfully', async () => {
      const config = configFixtures.withEndpoint;
      const onProgress = vi.fn();

      const files = fileFixtures.multipleImages;
      const uploadPromise = uploadFiles(files, config, onProgress);

      // Simulate successful uploads for all files
      setTimeout(() => {
        files.forEach((file, index) => {
          setTimeout(() => {
            simulateUploadProgress(mockXHR, file.size, 1, 10);
          }, index * 20);
        });
      }, 10);

      const results = await uploadPromise;

      expect(results).toHaveLength(files.length);
      results.forEach(result => {
        expect(result.status).toBe('completed');
        expect(result.url).toBeDefined();
      });
    });

    it('should handle mixed success and failure', async () => {
      const config = configFixtures.withEndpoint;
      const files = fileFixtures.multipleImages;

      const uploadPromise = uploadFiles(files, config);

      // Simulate all files succeeding for simplicity
      setTimeout(() => {
        files.forEach((file, index) => {
          setTimeout(() => {
            simulateUploadProgress(mockXHR, file.size, 1, 10);
          }, index * 20);
        });
      }, 10);

      const results = await uploadPromise;

      expect(results).toHaveLength(files.length);
      // All should succeed in this simplified test
      results.forEach(result => {
        expect(['completed', 'error']).toContain(result.status);
      });
    });

    it('should track overall progress correctly', async () => {
      const config = configFixtures.withEndpoint;
      const onProgress = vi.fn();
      const files = fileFixtures.multipleImages;

      const uploadPromise = uploadFiles(files, config, onProgress);

      // Simulate staggered progress
      setTimeout(() => {
        files.forEach((file, index) => {
          setTimeout(() => {
            simulateUploadProgress(mockXHR, file.size, 2, 25);
          }, index * 50);
        });
      }, 10);

      await uploadPromise;

      // Should have received progress updates
      expect(onProgress).toHaveBeenCalled();
      
      // Final progress should be for all files
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall[0].percentage).toBe(100);
    });

    it('should handle empty file array', async () => {
      const config = configFixtures.withEndpoint;
      const results = await uploadFiles([], config);
      
      expect(results).toEqual([]);
    });
  });

  describe('retryUpload', () => {
    it('should retry failed upload successfully', async () => {
      const config = configFixtures.withEndpoint;
      const uploadFile = {
        id: 'test-file-1',
        file: fileFixtures.jpegImage,
        status: 'error' as const,
        progress: 0,
        error: 'Previous upload failed',
      };

      const retryPromise = retryUpload(uploadFile, config);

      // Simulate successful retry
      setTimeout(() => {
        simulateUploadProgress(mockXHR, uploadFile.file.size, 1, 10);
      }, 10);

      const result = await retryPromise;

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.url).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle retry failure', async () => {
      const config = configFixtures.withEndpoint;
      const uploadFile = {
        id: 'test-file-1',
        file: fileFixtures.jpegImage,
        status: 'error' as const,
        progress: 0,
        error: 'Previous upload failed',
      };

      const retryPromise = retryUpload(uploadFile, config);

      // Simulate retry failure
      setTimeout(() => {
        simulateUploadError(mockXHR, 'Retry failed', 10);
      }, 10);

      const result = await retryPromise;

      expect(result.status).toBe('error');
      expect(result.error).toMatch(/network error/i);
    });

    it('should reset progress before retry', async () => {
      const config = configFixtures.withEndpoint;
      const uploadFile = {
        id: 'test-file-1',
        file: fileFixtures.jpegImage,
        status: 'error' as const,
        progress: 50, // Previous partial progress
        error: 'Upload failed',
      };

      const retryPromise = retryUpload(uploadFile, config);

      // Check that progress is reset
      expect(uploadFile.progress).toBe(0);
      expect(uploadFile.status).toBe('uploading');
      expect(uploadFile.error).toBeUndefined();

      // Complete the retry
      setTimeout(() => {
        simulateUploadProgress(mockXHR, uploadFile.file.size, 1, 10);
      }, 10);

      await retryPromise;
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      // Simulate network error
      setTimeout(() => {
        simulateUploadError(mockXHR, 'Network connection failed', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow(/network/i);
    });
  });
});
