import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateFileId,
  createUploadFile,
  createFilePreviewUrl,
  getImageDimensions,
  compressImage,
} from '../file-utils.js';
import {
  fileFixtures
} from '../../__tests__/fixtures.js';
import {
  createMockUploadFile
} from '../../__tests__/test-utils.js';

describe('file-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateFileId', () => {
    it('should create unique IDs', () => {
      const id1 = generateFileId();
      const id2 = generateFileId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should create valid UUID format', () => {
      const id = generateFileId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
  });

  describe('createFilePreviewUrl', () => {
    it('should create preview URL for file', () => {
      // Mock URL.createObjectURL
      const mockURL = 'blob:http://localhost/preview-123';
      global.URL.createObjectURL = vi.fn(() => mockURL);

      const previewUrl = createFilePreviewUrl(fileFixtures.jpegImage);

      expect(previewUrl).toBe(mockURL);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(fileFixtures.jpegImage);
    });

    it('should create different URLs for different files', () => {
      let counter = 0;
      global.URL.createObjectURL = vi.fn(() => `blob:preview-${++counter}`);

      const preview1 = createFilePreviewUrl(fileFixtures.jpegImage);
      const preview2 = createFilePreviewUrl(fileFixtures.pngImage);

      expect(preview1).not.toBe(preview2);
    });
  });

  describe('createUploadFile', () => {
    it('should create upload file with default values', () => {
      const uploadFile = createUploadFile(fileFixtures.jpegImage);

      expect(uploadFile).toEqual({
        id: expect.any(String),
        file: fileFixtures.jpegImage,
        status: 'pending',
        progress: 0,
      });
    });

    it('should create unique IDs for different files', () => {
      const uploadFile1 = createUploadFile(fileFixtures.jpegImage);
      const uploadFile2 = createUploadFile(fileFixtures.pngImage);

      expect(uploadFile1.id).not.toBe(uploadFile2.id);
    });

    it('should handle file properties correctly', () => {
      const uploadFile = createUploadFile(fileFixtures.jpegImage);

      expect(uploadFile.file).toBe(fileFixtures.jpegImage);
      expect(uploadFile.file.name).toBe(fileFixtures.jpegImage.name);
      expect(uploadFile.file.type).toBe(fileFixtures.jpegImage.type);
    });
  });

  describe('getImageDimensions', () => {
    it('should get dimensions from image file', async () => {
      // Mock Image constructor
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        naturalWidth: 800,
        naturalHeight: 600,
      };

      global.Image = vi.fn(() => mockImage) as any;

      const dimensionsPromise = getImageDimensions(fileFixtures.jpegImage);

      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 10);

      const dimensions = await dimensionsPromise;

      expect(dimensions).toEqual({
        width: mockImage.naturalWidth,
        height: mockImage.naturalHeight,
      });
    });

    it('should reject non-image files', async () => {
      await expect(
        getImageDimensions(fileFixtures.pdfDocument)
      ).rejects.toThrow('File is not an image');
    });
  });

  describe('compressImage', () => {
    it('should compress image with default settings', async () => {
      // Mock canvas and image
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
        })),
        toBlob: vi.fn((callback) => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }));
        }),
      };

      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        width: 1920,
        height: 1080,
      };

      global.document.createElement = vi.fn(() => mockCanvas as any);
      global.Image = vi.fn(() => mockImage) as any;
      global.URL.createObjectURL = vi.fn(() => 'blob:url');
      global.URL.revokeObjectURL = vi.fn();

      const compressPromise = compressImage(fileFixtures.jpegImage);

      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 10);

      const result = await compressPromise;

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/jpeg');
    });

    it('should handle compression errors', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;
      global.URL.createObjectURL = vi.fn(() => 'blob:url');

      const compressPromise = compressImage(fileFixtures.jpegImage);

      // Simulate image error
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror(new Error('Failed to load image'));
        }
      }, 10);

      await expect(compressPromise).rejects.toThrow('Failed to load image');
    });
  });
});
