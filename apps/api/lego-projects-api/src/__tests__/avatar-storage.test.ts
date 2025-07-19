import { describe, it, expect } from '@jest/globals';
import { 
  validateAvatarFileType,
  validateAvatarFileExtension,
  validateAvatarMimeType,
  validateAvatarFileSize,
  MAX_AVATAR_SIZE,
  ALLOWED_AVATAR_EXTENSIONS,
  ALLOWED_AVATAR_MIME_TYPES,
  AVATAR_FILE_TYPES
} from '../storage/avatar-storage';

describe('Avatar Storage Validation', () => {
  describe('validateAvatarFileType', () => {
    it('should return true for valid file type', () => {
      const result = validateAvatarFileType('avatar');
      expect(result).toBe(true);
    });

    it('should return false for invalid file type', () => {
      const result = validateAvatarFileType('invalid');
      expect(result).toBe(false);
    });
  });

  describe('validateAvatarFileExtension', () => {
    it('should return true for valid extensions', () => {
      expect(validateAvatarFileExtension('avatar.jpg', AVATAR_FILE_TYPES.AVATAR)).toBe(true);
      expect(validateAvatarFileExtension('avatar.jpeg', AVATAR_FILE_TYPES.AVATAR)).toBe(true);
      expect(validateAvatarFileExtension('avatar.heic', AVATAR_FILE_TYPES.AVATAR)).toBe(true);
    });

    it('should return false for invalid extensions', () => {
      expect(validateAvatarFileExtension('avatar.png', AVATAR_FILE_TYPES.AVATAR)).toBe(false);
      expect(validateAvatarFileExtension('avatar.gif', AVATAR_FILE_TYPES.AVATAR)).toBe(false);
      expect(validateAvatarFileExtension('avatar.pdf', AVATAR_FILE_TYPES.AVATAR)).toBe(false);
    });
  });

  describe('validateAvatarMimeType', () => {
    it('should return true for valid MIME types', () => {
      expect(validateAvatarMimeType('image/jpeg', AVATAR_FILE_TYPES.AVATAR)).toBe(true);
      expect(validateAvatarMimeType('image/jpg', AVATAR_FILE_TYPES.AVATAR)).toBe(true);
      expect(validateAvatarMimeType('image/heic', AVATAR_FILE_TYPES.AVATAR)).toBe(true);
    });

    it('should return false for invalid MIME types', () => {
      expect(validateAvatarMimeType('image/png', AVATAR_FILE_TYPES.AVATAR)).toBe(false);
      expect(validateAvatarMimeType('image/gif', AVATAR_FILE_TYPES.AVATAR)).toBe(false);
      expect(validateAvatarMimeType('application/pdf', AVATAR_FILE_TYPES.AVATAR)).toBe(false);
    });
  });

  describe('validateAvatarFileSize', () => {
    it('should return true for valid file sizes', () => {
      expect(validateAvatarFileSize(1024)).toBe(true); // 1KB
      expect(validateAvatarFileSize(MAX_AVATAR_SIZE)).toBe(true); // Exactly 10MB
      expect(validateAvatarFileSize(MAX_AVATAR_SIZE - 1)).toBe(true); // Just under 10MB
    });

    it('should return false for files too large', () => {
      expect(validateAvatarFileSize(MAX_AVATAR_SIZE + 1)).toBe(false); // Just over 10MB
      expect(validateAvatarFileSize(MAX_AVATAR_SIZE * 2)).toBe(false); // 20MB
    });
  });

  describe('Constants', () => {
    it('should have correct MAX_AVATAR_SIZE', () => {
      expect(MAX_AVATAR_SIZE).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should have correct allowed extensions', () => {
      expect(ALLOWED_AVATAR_EXTENSIONS[AVATAR_FILE_TYPES.AVATAR]).toEqual(['.jpg', '.jpeg', '.heic']);
    });

    it('should have correct allowed MIME types', () => {
      expect(ALLOWED_AVATAR_MIME_TYPES[AVATAR_FILE_TYPES.AVATAR]).toEqual(['image/jpeg', 'image/jpg', 'image/heic']);
    });
  });
}); 