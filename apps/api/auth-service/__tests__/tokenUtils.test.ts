import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'crypto';
import {
  generateSecureToken,
  generateSecureVerificationCode,
  verifyToken,
} from '../utils/tokenUtils';

// Mock the crypto module to use the real implementation
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return actual;
});

describe('tokenUtils', () => {
  describe('generateSecureToken', () => {
    it('should generate a token object with raw and hash properties', () => {
      const result = generateSecureToken();
      
      expect(result).toHaveProperty('raw');
      expect(result).toHaveProperty('hash');
      expect(typeof result.raw).toBe('string');
      expect(typeof result.hash).toBe('string');
    });

    it('should generate a 64-character hex raw token', () => {
      const result = generateSecureToken();
      
      expect(result.raw).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(result.raw)).toBe(true);
    });

    it('should generate a 64-character hex hash', () => {
      const result = generateSecureToken();
      
      expect(result.hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(result.hash)).toBe(true);
    });

    it('should generate different tokens on multiple calls', () => {
      const result1 = generateSecureToken();
      const result2 = generateSecureToken();
      
      expect(result1.raw).not.toBe(result2.raw);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should generate hash that matches SHA-256 of raw token', () => {
      const result = generateSecureToken();
      const expectedHash = createHash('sha256').update(result.raw).digest('hex');
      
      expect(result.hash).toBe(expectedHash);
    });
  });

  describe('generateSecureVerificationCode', () => {
    it('should generate a verification code object with raw and hash properties', () => {
      const result = generateSecureVerificationCode();
      
      expect(result).toHaveProperty('raw');
      expect(result).toHaveProperty('hash');
      expect(typeof result.raw).toBe('string');
      expect(typeof result.hash).toBe('string');
    });

    it('should generate a 6-digit raw code', () => {
      const result = generateSecureVerificationCode();
      
      expect(result.raw).toHaveLength(6);
      expect(/^\d{6}$/.test(result.raw)).toBe(true);
      
      const codeNumber = parseInt(result.raw, 10);
      expect(codeNumber).toBeGreaterThanOrEqual(100000);
      expect(codeNumber).toBeLessThanOrEqual(999999);
    });

    it('should generate a 64-character hex hash', () => {
      const result = generateSecureVerificationCode();
      
      expect(result.hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(result.hash)).toBe(true);
    });

    it('should generate different codes on multiple calls', () => {
      const result1 = generateSecureVerificationCode();
      const result2 = generateSecureVerificationCode();
      
      // Note: There's a very small chance these could be the same, but extremely unlikely
      expect(result1.raw).not.toBe(result2.raw);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should generate hash that matches SHA-256 of raw code', () => {
      const result = generateSecureVerificationCode();
      const expectedHash = createHash('sha256').update(result.raw).digest('hex');
      
      expect(result.hash).toBe(expectedHash);
    });

    it('should generate codes within valid 6-digit range multiple times', () => {
      // Test multiple generations to ensure consistent behavior
      for (let i = 0; i < 10; i++) {
        const result = generateSecureVerificationCode();
        const codeNumber = parseInt(result.raw, 10);
        
        expect(codeNumber).toBeGreaterThanOrEqual(100000);
        expect(codeNumber).toBeLessThanOrEqual(999999);
        expect(result.raw).toHaveLength(6);
      }
    });
  });

  describe('verifyToken', () => {
    it('should return true for matching token and hash', () => {
      const { raw, hash } = generateSecureToken();
      
      expect(verifyToken(raw, hash)).toBe(true);
    });

    it('should return true for matching verification code and hash', () => {
      const { raw, hash } = generateSecureVerificationCode();
      
      expect(verifyToken(raw, hash)).toBe(true);
    });

    it('should return false for non-matching token and hash', () => {
      const { raw } = generateSecureToken();
      const { hash } = generateSecureToken(); // Different hash
      
      expect(verifyToken(raw, hash)).toBe(false);
    });

    it('should return false for empty raw token', () => {
      const { hash } = generateSecureToken();
      
      expect(verifyToken('', hash)).toBe(false);
    });

    it('should return false for empty hash', () => {
      const { raw } = generateSecureToken();
      
      expect(verifyToken(raw, '')).toBe(false);
    });

    it('should return false for null raw token', () => {
      const { hash } = generateSecureToken();
      
      expect(verifyToken(null as any, hash)).toBe(false);
    });

    it('should return false for null hash', () => {
      const { raw } = generateSecureToken();
      
      expect(verifyToken(raw, null as any)).toBe(false);
    });

    it('should return false for undefined raw token', () => {
      const { hash } = generateSecureToken();
      
      expect(verifyToken(undefined as any, hash)).toBe(false);
    });

    it('should return false for undefined hash', () => {
      const { raw } = generateSecureToken();
      
      expect(verifyToken(raw, undefined as any)).toBe(false);
    });

    it('should return false for tampered hash', () => {
      const { raw, hash } = generateSecureToken();
      const tamperedHash = hash.slice(0, -1) + '0'; // Change last character
      
      expect(verifyToken(raw, tamperedHash)).toBe(false);
    });

    it('should return false for tampered raw token', () => {
      const { raw, hash } = generateSecureToken();
      const tamperedRaw = raw.slice(0, -1) + '0'; // Change last character
      
      expect(verifyToken(tamperedRaw, hash)).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      const { raw, hash } = generateSecureToken();
      
      // Hash should be lowercase hex, test that uppercase doesn't match
      const uppercaseHash = hash.toUpperCase();
      expect(verifyToken(raw, uppercaseHash)).toBe(false);
    });

    it('should work with manually created hash', () => {
      const rawToken = 'test-token-123';
      const manualHash = createHash('sha256').update(rawToken).digest('hex');
      
      expect(verifyToken(rawToken, manualHash)).toBe(true);
    });

    it('should handle special characters in raw token', () => {
      const rawToken = 'test-token!@#$%^&*()';
      const hash = createHash('sha256').update(rawToken).digest('hex');
      
      expect(verifyToken(rawToken, hash)).toBe(true);
    });
  });
});
