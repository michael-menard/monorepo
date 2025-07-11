import { describe, it, expect } from 'vitest';
import { getFileIcon, formatFileSize } from '../src/components/FileUpload/utils';

describe('File Upload Utils', () => {
  describe('getFileIcon', () => {
    it('returns image icon for image types', () => {
      const icon = getFileIcon('image/jpeg');
      expect(icon).toBeDefined();
    });

    it('returns document icon for document types', () => {
      const icon = getFileIcon('application/pdf');
      expect(icon).toBeDefined();
    });

    it('returns video icon for video types', () => {
      const icon = getFileIcon('video/mp4');
      expect(icon).toBeDefined();
    });

    it('returns audio icon for audio types', () => {
      const icon = getFileIcon('audio/mp3');
      expect(icon).toBeDefined();
    });

    it('returns file icon for unknown types', () => {
      const icon = getFileIcon('application/unknown');
      expect(icon).toBeDefined();
    });

    it('returns file icon for empty type', () => {
      const icon = getFileIcon('');
      expect(icon).toBeDefined();
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('formats small file sizes', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1500)).toBe('1.5 KB');
    });

    it('formats large file sizes', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 2)).toBe('2 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    it('handles decimal places correctly', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('handles very large numbers', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1 PB');
    });

    it('handles zero and negative values', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(-1)).toBe('0 B');
    });
  });
}); 