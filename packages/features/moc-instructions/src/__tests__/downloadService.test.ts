import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  downloadFile,
  downloadMultipleFiles,
  getFileExtension,
  getFileTypeIcon,
  formatFileSize,
  validateDownloadInfo,
  downloadProgressSchema,
  downloadInfoSchema,
  downloadResultSchema,
  type DownloadInfo,
  type DownloadProgress,
  type DownloadResult,
} from '../utils/downloadService';

// Mock XMLHttpRequest
const mockXHR = {
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  responseType: '',
  timeout: 0,
  status: 200,
  statusText: 'OK',
  response: new Blob(['test content'], { type: 'text/plain' }),
  addEventListener: vi.fn(),
  upload: {
    addEventListener: vi.fn(),
  },
};

global.XMLHttpRequest = vi.fn(() => mockXHR) as any;

describe('Download Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockXHR.status = 200;
    mockXHR.response = new Blob(['test content'], { type: 'text/plain' });
  });

  describe('downloadFile', () => {
    it('should download a file successfully', async () => {
      const downloadInfo: DownloadInfo = {
        url: 'https://example.com/test.pdf',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      };

      const onProgress = vi.fn();
      const onError = vi.fn();
      const onComplete = vi.fn();

      const result = await downloadFile(downloadInfo, {
        onProgress,
        onError,
        onComplete,
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test.pdf');
      expect(result.size).toBeGreaterThan(0);
      expect(onComplete).toHaveBeenCalledWith(result);
    });

    it('should handle download errors', async () => {
      mockXHR.status = 404;
      mockXHR.statusText = 'Not Found';

      const downloadInfo: DownloadInfo = {
        url: 'https://example.com/missing.pdf',
        filename: 'missing.pdf',
        mimeType: 'application/pdf',
      };

      const onError = vi.fn();

      const result = await downloadFile(downloadInfo, { onError });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('downloadMultipleFiles', () => {
    it('should download multiple files', async () => {
      const files: DownloadInfo[] = [
        {
          url: 'https://example.com/file1.pdf',
          filename: 'file1.pdf',
          mimeType: 'application/pdf',
        },
        {
          url: 'https://example.com/file2.pdf',
          filename: 'file2.pdf',
          mimeType: 'application/pdf',
        },
      ];

      const results = await downloadMultipleFiles(files);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('Utility functions', () => {
    it('should get file extension correctly', () => {
      expect(getFileExtension('test.pdf')).toBe('pdf');
      expect(getFileExtension('document.docx')).toBe('docx');
      expect(getFileExtension('no-extension')).toBe('');
    });

    it('should get file type icon correctly', () => {
      expect(getFileTypeIcon('test.pdf')).toBe('📄');
      expect(getFileTypeIcon('data.csv')).toBe('📊');
      expect(getFileTypeIcon('image.jpg')).toBe('🖼️');
      expect(getFileTypeIcon('unknown.xyz')).toBe('📄');
    });

    it('should format file size correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should validate download info correctly', () => {
      const validInfo = {
        url: 'https://example.com/test.pdf',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      };

      expect(() => validateDownloadInfo(validInfo)).not.toThrow();

      const invalidInfo = {
        url: 'not-a-url',
        filename: '',
        mimeType: 'application/pdf',
      };

      expect(() => validateDownloadInfo(invalidInfo)).toThrow();
    });
  });

  describe('Schemas', () => {
    it('should validate download progress schema', () => {
      const validProgress: DownloadProgress = {
        loaded: 512,
        total: 1024,
        percentage: 50,
        speed: 1024,
        estimatedTime: 0.5,
      };

      expect(() => downloadProgressSchema.parse(validProgress)).not.toThrow();

      const invalidProgress = {
        loaded: -1,
        total: 1024,
        percentage: 150, // Invalid percentage
        speed: 1024,
        estimatedTime: 0.5,
      };

      expect(() => downloadProgressSchema.parse(invalidProgress)).toThrow();
    });

    it('should validate download info schema', () => {
      const validInfo: DownloadInfo = {
        url: 'https://example.com/test.pdf',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      };

      expect(() => downloadInfoSchema.parse(validInfo)).not.toThrow();

      const invalidInfo = {
        url: 'not-a-url',
        filename: '',
        mimeType: 'application/pdf',
      };

      expect(() => downloadInfoSchema.parse(invalidInfo)).toThrow();
    });

    it('should validate download result schema', () => {
      const validResult: DownloadResult = {
        success: true,
        filename: 'test.pdf',
        size: 1024,
      };

      expect(() => downloadResultSchema.parse(validResult)).not.toThrow();

      const errorResult: DownloadResult = {
        success: false,
        filename: 'test.pdf',
        size: 0,
        error: 'Download failed',
      };

      expect(() => downloadResultSchema.parse(errorResult)).not.toThrow();
    });
  });
}); 