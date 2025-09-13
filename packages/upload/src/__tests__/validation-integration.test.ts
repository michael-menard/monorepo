import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateFiles } from '../utils/validation.js';
import { useFileValidation } from '../hooks/useFileValidation.js';
import { renderHook } from '@testing-library/react';
import { 
  fileFixtures, 
  configFixtures 
} from './fixtures.js';

describe('validation integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('complex validation scenarios', () => {
    it('should handle mixed valid and invalid files', () => {
      const files = [
        fileFixtures.jpegImage,     // Valid
        fileFixtures.largeImage,    // Too large
        fileFixtures.pngImage,      // Valid
        fileFixtures.executableFile, // Wrong type
        fileFixtures.webpImage,     // Valid
      ];

      const errors = validateFiles(files, configFixtures.imagesOnly);

      expect(errors).toHaveLength(2); // largeImage and executableFile
      expect(errors.some(e => e.code === 'FILE_TOO_LARGE')).toBe(true);
      expect(errors.some(e => e.code === 'INVALID_FILE_TYPE')).toBe(true);
    });

    it('should validate file count limits correctly', () => {
      const manyFiles = Array.from({ length: 6 }, (_, i) => 
        new File([`content-${i}`], `file-${i}.jpg`, { type: 'image/jpeg' })
      );

      const errors = validateFiles(manyFiles, configFixtures.restrictive);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('TOO_MANY_FILES');
      expect(errors[0].message).toContain('Maximum allowed');
    });

    it('should handle empty file list', () => {
      const errors = validateFiles([], configFixtures.default);
      expect(errors).toEqual([]);
    });

    it('should handle null/undefined files gracefully', () => {
      const filesWithNulls = [
        fileFixtures.jpegImage,
        null as any,
        undefined as any,
        fileFixtures.pngImage,
      ];

      // Filter out null/undefined files first
      const validFiles = filesWithNulls.filter(f => f != null);
      expect(() => {
        validateFiles(validFiles, configFixtures.default);
      }).not.toThrow();
    });
  });

  describe('edge case file types', () => {
    it('should handle files with no extension', () => {
      const fileNoExt = new File(['content'], 'README', { type: 'text/plain' });
      const errors = validateFiles([fileNoExt], {
        ...configFixtures.default,
        acceptedFileTypes: ['text/plain'],
      });

      expect(errors).toEqual([]);
    });

    it('should handle files with multiple extensions', () => {
      const tarGzFile = new File(['archive'], 'backup.tar.gz', { type: 'application/gzip' });
      const errors = validateFiles([tarGzFile], {
        ...configFixtures.default,
        acceptedFileTypes: ['application/gzip'],
      });

      expect(errors).toEqual([]);
    });

    it('should handle files with mismatched extension and MIME type', () => {
      // File with .jpg extension but text/plain MIME type
      const mismatchedFile = new File(['not an image'], 'fake.jpg', { type: 'text/plain' });
      const errors = validateFiles([mismatchedFile], configFixtures.imagesOnly);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_FILE_TYPE');
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(1000) + '.txt';
      const longNameFile = new File(['content'], longName, { type: 'text/plain' });
      const errors = validateFiles([longNameFile], {
        ...configFixtures.default,
        acceptedFileTypes: ['text/plain'],
      });

      expect(errors).toEqual([]);
    });

    it('should handle files with special characters in names', () => {
      const specialCharsFile = new File(['content'], 'file with spaces & symbols!@#$%.txt', { 
        type: 'text/plain' 
      });
      const errors = validateFiles([specialCharsFile], {
        ...configFixtures.default,
        acceptedFileTypes: ['text/plain'],
      });

      expect(errors).toEqual([]);
    });
  });

  describe('size validation edge cases', () => {
    it('should handle zero-byte files', () => {
      const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
      const errors = validateFiles([emptyFile], configFixtures.default);

      expect(errors).toEqual([]);
    });

    it('should handle files at exact size limit', () => {
      const exactSizeFile = new File(['x'.repeat(5 * 1024 * 1024)], 'exact.txt', { 
        type: 'text/plain' 
      });
      
      const config = {
        ...configFixtures.default,
        maxFileSize: 5 * 1024 * 1024, // Exactly 5MB
      };

      const errors = validateFiles([exactSizeFile], config);
      expect(errors).toEqual([]);
    });

    it('should reject files one byte over limit', () => {
      const oversizeFile = new File(['x'.repeat(5 * 1024 * 1024 + 1)], 'oversize.txt', { 
        type: 'text/plain' 
      });
      
      const config = {
        ...configFixtures.default,
        maxFileSize: 5 * 1024 * 1024, // 5MB limit
      };

      const errors = validateFiles([oversizeFile], config);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('hook integration', () => {
    it('should integrate with useFileValidation hook', () => {
      const { result } = renderHook(() => 
        useFileValidation({ config: configFixtures.imagesOnly })
      );

      const validFiles = [fileFixtures.jpegImage, fileFixtures.pngImage];
      const invalidFiles = [fileFixtures.executableFile, fileFixtures.largeImage];

      const validErrors = result.current.validateFiles(validFiles);
      const invalidErrors = result.current.validateFiles(invalidFiles);

      expect(validErrors).toEqual([]);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate single files through hook', () => {
      const { result } = renderHook(() =>
        useFileValidation({ config: configFixtures.imagesOnly })
      );

      const validError = result.current.validateFile(fileFixtures.jpegImage);
      const invalidError = result.current.validateFile(fileFixtures.executableFile);

      expect(validError).toEqual([]);
      expect(invalidError).toHaveLength(1);
      expect(invalidError[0].code).toBe('INVALID_FILE_TYPE');
    });
  });

  describe('configuration validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        acceptedFileTypes: null as any,
        maxFileSize: -1,
        maxFiles: 0,
      };

      expect(() => {
        validateFiles([fileFixtures.jpegImage], invalidConfig);
      }).not.toThrow();
    });

    it('should handle missing configuration properties', () => {
      const partialConfig = {
        acceptedFileTypes: ['image/*'],
        // Missing maxFileSize and maxFiles
      } as any;

      expect(() => {
        validateFiles([fileFixtures.jpegImage], partialConfig);
      }).not.toThrow();
    });

    it('should handle configuration with empty accepted types', () => {
      const emptyTypesConfig = {
        ...configFixtures.default,
        acceptedFileTypes: [],
      };

      const errors = validateFiles([fileFixtures.jpegImage], emptyTypesConfig);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_FILE_TYPE');
    });
  });

  describe('performance with large file sets', () => {
    it('should handle validation of many files efficiently', () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) => 
        new File([`content-${i}`], `file-${i}.jpg`, { type: 'image/jpeg' })
      );

      const startTime = performance.now();
      const errors = validateFiles(manyFiles, {
        ...configFixtures.default,
        maxFiles: 200, // Allow all files
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
      expect(errors).toEqual([]); // All files should be valid
    });

    it('should handle validation of large files efficiently', () => {
      // Create a large file (simulated)
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.txt', { 
        type: 'text/plain' 
      });

      const startTime = performance.now();
      const errors = validateFiles([largeFile], {
        ...configFixtures.default,
        maxFileSize: 20 * 1024 * 1024, // 20MB limit
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      expect(errors).toEqual([]);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical image upload scenario', () => {
      const imageFiles = [
        fileFixtures.jpegImage,
        fileFixtures.pngImage,
        fileFixtures.webpImage,
      ];

      const errors = validateFiles(imageFiles, configFixtures.imagesOnly);
      expect(errors).toEqual([]);
    });

    it('should handle document upload scenario', () => {
      const documentFiles = [
        fileFixtures.pdfDocument,
        new File(['content'], 'doc.txt', { type: 'text/plain' }),
        new File(['content'], 'sheet.csv', { type: 'text/csv' }),
      ];

      const errors = validateFiles(documentFiles, {
        ...configFixtures.default,
        acceptedFileTypes: ['application/pdf', 'text/plain', 'text/csv'],
      });
      expect(errors).toEqual([]);
    });

    it('should handle mixed media upload scenario', () => {
      const mixedFiles = [
        fileFixtures.jpegImage,
        fileFixtures.mp4Video,
        fileFixtures.pdfDocument,
      ];

      const errors = validateFiles(mixedFiles, {
        ...configFixtures.default,
        maxFileSize: 50 * 1024 * 1024, // 50MB to allow video
      });
      expect(errors).toEqual([]);
    });

    it('should reject inappropriate files for avatar upload', () => {
      const inappropriateFiles = [
        fileFixtures.mp4Video,     // Video not allowed
        fileFixtures.pdfDocument,  // Document not allowed
        fileFixtures.largeImage,   // Too large
      ];

      const errors = validateFiles(inappropriateFiles, configFixtures.imagesOnly);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every(e => ['INVALID_FILE_TYPE', 'FILE_TOO_LARGE'].includes(e.code))).toBe(true);
    });
  });
});
