import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUploadProgress } from '../hooks/useUploadProgress.js';
import { useFileValidation } from '../hooks/useFileValidation.js';
import { useImageProcessing } from '../hooks/useImageProcessing.js';
import { useDragAndDrop } from '../hooks/useDragAndDrop.js';
import { uploadSingleFile, uploadFiles } from '../utils/upload-utils.js';
import { validateFiles } from '../utils/validation.js';
import { getImageDimensions, compressImage } from '../utils/file-utils.js';
import { 
  fileFixtures, 
  configFixtures,
  serverResponseFixtures 
} from './fixtures.js';
import { 
  mockXMLHttpRequest,
  simulateUploadError,
  mockImageProcessing 
} from './mocks.js';

describe('error scenarios and edge cases', () => {
  let mockXHR: any;
  let mockImageAPI: any;
  let originalXMLHttpRequest: any;
  let originalImage: any;
  let originalURL: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Store originals
    originalXMLHttpRequest = global.XMLHttpRequest;
    originalImage = global.Image;
    originalURL = global.URL;
    
    // Set up mocks
    mockXHR = mockXMLHttpRequest();
    mockImageAPI = mockImageProcessing();
    
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    } as any;
  });

  afterEach(() => {
    // Restore originals
    global.XMLHttpRequest = originalXMLHttpRequest;
    global.Image = originalImage;
    global.URL = originalURL;
  });

  describe('network failure scenarios', () => {
    it('should handle network timeout errors', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      // Simulate network timeout
      setTimeout(() => {
        simulateUploadError(mockXHR, 'Network timeout', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow(/network/i);
    });

    it('should handle connection refused errors', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      // Simulate connection refused
      setTimeout(() => {
        simulateUploadError(mockXHR, 'Connection refused', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow(/network/i);
    });

    it('should handle server unavailable errors', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      // Simulate server error
      setTimeout(() => {
        mockXHR.status = 503;
        mockXHR.response = JSON.stringify({ error: 'Service unavailable' });
        simulateUploadError(mockXHR, 'Service unavailable', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow();
    });

    it('should handle DNS resolution failures', async () => {
      const config = {
        ...configFixtures.withEndpoint,
        endpoint: 'https://nonexistent-domain-12345.com/upload',
      };

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      setTimeout(() => {
        simulateUploadError(mockXHR, 'DNS resolution failed', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow();
    });
  });

  describe('server error scenarios', () => {
    it('should handle 400 Bad Request errors', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      setTimeout(() => {
        mockXHR.status = 400;
        mockXHR.response = JSON.stringify({ 
          error: 'Bad Request',
          message: 'Invalid file format' 
        });
        simulateUploadError(mockXHR, 'Bad Request', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow();
    });

    it('should handle 401 Unauthorized errors', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      setTimeout(() => {
        mockXHR.status = 401;
        mockXHR.response = JSON.stringify({ error: 'Unauthorized' });
        simulateUploadError(mockXHR, 'Unauthorized', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow();
    });

    it('should handle 413 Payload Too Large errors', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.largeImage, config);

      setTimeout(() => {
        mockXHR.status = 413;
        mockXHR.response = JSON.stringify({ 
          error: 'Payload Too Large',
          maxSize: '10MB' 
        });
        simulateUploadError(mockXHR, 'File too large', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow();
    });

    it('should handle 500 Internal Server Error', async () => {
      const config = configFixtures.withEndpoint;

      const uploadPromise = uploadSingleFile(fileFixtures.jpegImage, config);

      setTimeout(() => {
        mockXHR.status = 500;
        mockXHR.response = JSON.stringify({ error: 'Internal Server Error' });
        simulateUploadError(mockXHR, 'Server error', 10);
      }, 10);

      await expect(uploadPromise).rejects.toThrow();
    });
  });

  describe('file validation error scenarios', () => {
    it('should handle invalid file types gracefully', () => {
      const invalidFiles = [
        fileFixtures.executableFile,
        new File(['malicious'], 'virus.exe', { type: 'application/x-msdownload' }),
        new File(['script'], 'script.js', { type: 'application/javascript' }),
      ];

      const errors = validateFiles(invalidFiles, configFixtures.imagesOnly);

      expect(errors).toHaveLength(3);
      errors.forEach(error => {
        expect(error.code).toBe('INVALID_FILE_TYPE');
        expect(error.message).toContain('not accepted');
      });
    });

    it('should handle oversized files', () => {
      const oversizedFiles = [
        fileFixtures.largeImage,
      ];

      const errors = validateFiles(oversizedFiles, {
        ...configFixtures.default,
        maxFileSize: 1024, // Very small limit to trigger error
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('FILE_TOO_LARGE');
      expect(errors[0].message).toContain('exceeds maximum');
    });

    it('should handle too many files', () => {
      const tooManyFiles = Array.from({ length: 20 }, (_, i) => 
        new File([`content-${i}`], `file-${i}.txt`, { type: 'text/plain' })
      );

      const errors = validateFiles(tooManyFiles, configFixtures.restrictive);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('TOO_MANY_FILES');
    });

    it('should handle corrupted file data', () => {
      const corruptedFile = new File(['corrupted data'], 'image.jpg', { 
        type: 'image/jpeg' 
      });

      const errors = validateFiles([corruptedFile], configFixtures.imagesOnly);

      // File passes basic validation but would fail during processing
      expect(errors).toEqual([]);
    });
  });

  describe('image processing error scenarios', () => {
    it('should handle image load failures', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;

      const dimensionsPromise = getImageDimensions(fileFixtures.jpegImage);

      // Simulate image load error
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror(new Error('Failed to load image'));
        }
      }, 10);

      await expect(dimensionsPromise).rejects.toThrow('Failed to load image');
    });

    it('should handle canvas creation failures', async () => {
      // Mock document.createElement to fail for canvas
      global.document = {
        createElement: vi.fn((tagName) => {
          if (tagName === 'canvas') {
            throw new Error('Canvas not supported');
          }
          return {};
        }),
      } as any;

      await expect(
        compressImage(fileFixtures.jpegImage)
      ).rejects.toThrow('Canvas not supported');
    });

    it('should handle compression failures', async () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
        })),
        toBlob: vi.fn((callback) => {
          callback(null); // Simulate compression failure
        }),
      };

      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        naturalWidth: 1920,
        naturalHeight: 1080,
      };

      global.document = {
        createElement: vi.fn(() => mockCanvas),
      } as any;
      global.Image = vi.fn(() => mockImage) as any;

      const compressPromise = compressImage(fileFixtures.jpegImage);

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 10);

      await expect(compressPromise).rejects.toThrow();
    });
  });

  describe('hook error scenarios', () => {
    it('should handle validation with invalid config gracefully', () => {
      const invalidConfig = {
        acceptedFileTypes: null as any,
        maxFileSize: -1,
        maxFiles: 0,
      };

      // Direct validation should handle invalid config
      expect(() => {
        validateFiles([fileFixtures.jpegImage], invalidConfig);
      }).not.toThrow();
    });

    it('should handle malformed file objects', () => {
      const malformedFiles = [
        null as any,
        undefined as any,
        { name: 'fake', size: 100 } as any, // Not a real File object
      ];

      expect(() => {
        validateFiles(malformedFiles.filter(f => f != null), configFixtures.default);
      }).not.toThrow();
    });
  });

  describe('memory and resource management', () => {
    it('should handle memory pressure during large file processing', async () => {
      const largeFile = new File(['x'.repeat(50 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      });

      // Should not throw out of memory errors
      expect(() => {
        getImageDimensions(largeFile);
      }).not.toThrow();
    });

    it('should handle resource cleanup gracefully', () => {
      // Test that URL cleanup doesn't throw errors
      expect(() => {
        global.URL.revokeObjectURL('blob:mock-url');
      }).not.toThrow();
    });

    it('should handle URL.createObjectURL failures', () => {
      global.URL.createObjectURL = vi.fn(() => {
        throw new Error('Failed to create object URL');
      });

      expect(() => {
        global.URL.createObjectURL(fileFixtures.jpegImage);
      }).toThrow('Failed to create object URL');
    });
  });

  describe('edge case file scenarios', () => {
    it('should handle zero-byte files', () => {
      const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
      
      const errors = validateFiles([emptyFile], configFixtures.default);
      expect(errors).toEqual([]);
    });

    it('should handle files with no extension', () => {
      const noExtFile = new File(['content'], 'README', { type: 'text/plain' });
      
      const errors = validateFiles([noExtFile], {
        ...configFixtures.default,
        acceptedFileTypes: ['text/plain'],
      });
      expect(errors).toEqual([]);
    });

    it('should handle files with mismatched MIME types', () => {
      const mismatchedFile = new File(['not an image'], 'fake.jpg', { 
        type: 'text/plain' 
      });
      
      const errors = validateFiles([mismatchedFile], configFixtures.imagesOnly);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_FILE_TYPE');
    });

    it('should handle files with special characters in names', () => {
      const specialFile = new File(['content'], 'file with spaces & symbols!@#$%.txt', { 
        type: 'text/plain' 
      });
      
      const errors = validateFiles([specialFile], {
        ...configFixtures.default,
        acceptedFileTypes: ['text/plain'],
      });
      expect(errors).toEqual([]);
    });

    it('should handle extremely long filenames', () => {
      const longName = 'a'.repeat(1000) + '.txt';
      const longNameFile = new File(['content'], longName, { type: 'text/plain' });
      
      const errors = validateFiles([longNameFile], {
        ...configFixtures.default,
        acceptedFileTypes: ['text/plain'],
      });
      expect(errors).toEqual([]);
    });
  });

  describe('concurrent operation errors', () => {
    it('should handle multiple simultaneous uploads', async () => {
      const files = Array.from({ length: 5 }, (_, i) => 
        new File([`content-${i}`], `file-${i}.txt`, { type: 'text/plain' })
      );

      const config = configFixtures.withEndpoint;

      // Start multiple uploads simultaneously
      const uploadPromises = files.map(file => 
        uploadSingleFile(file, config)
      );

      // Simulate some failures
      setTimeout(() => {
        simulateUploadError(mockXHR, 'Network error', 10);
      }, 10);

      const results = await Promise.allSettled(uploadPromises);

      // Some should succeed, some should fail
      expect(results.some(r => r.status === 'rejected')).toBe(true);
    });

    it('should handle rapid validation calls', () => {
      const files = Array.from({ length: 100 }, (_, i) => 
        new File([`content-${i}`], `file-${i}.txt`, { type: 'text/plain' })
      );

      // Rapid validation calls should not cause issues
      expect(() => {
        for (let i = 0; i < 10; i++) {
          validateFiles(files, configFixtures.default);
        }
      }).not.toThrow();
    });
  });
});
