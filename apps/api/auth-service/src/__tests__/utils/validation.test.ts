import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '../../utils/validation';

describe('validation utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('123@numbers.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@example')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongPass123!')).toBe(true);
      expect(validatePassword('MyP@ssw0rd')).toBe(true);
      expect(validatePassword('Secure123#')).toBe(true);
    });

    it('should reject weak passwords', () => {
      // Too short
      expect(validatePassword('Abc1!')).toBe(false);
      
      // Too long
      expect(validatePassword('A'.repeat(129) + 'b1!')).toBe(false);
      
      // Missing uppercase
      expect(validatePassword('lowercase123!')).toBe(false);
      
      // Missing lowercase
      expect(validatePassword('UPPERCASE123!')).toBe(false);
      
      // Missing number
      expect(validatePassword('NoNumbers!')).toBe(false);
      
      // Missing special character
      expect(validatePassword('NoSpecial123')).toBe(false);
      
      // Empty or null
      expect(validatePassword('')).toBe(false);
      expect(validatePassword(null as any)).toBe(false);
    });

    it('should accept passwords with various special characters', () => {
      expect(validatePassword('Test123@')).toBe(true);
      expect(validatePassword('Test123#')).toBe(true);
      expect(validatePassword('Test123$')).toBe(true);
      expect(validatePassword('Test123%')).toBe(true);
      expect(validatePassword('Test123^')).toBe(true);
      expect(validatePassword('Test123&')).toBe(true);
      expect(validatePassword('Test123*')).toBe(true);
    });
  });
}); 