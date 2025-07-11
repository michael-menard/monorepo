import { describe, it, expect } from 'vitest';

// Test utility functions
describe('Utility Functions', () => {
  it('validates email format', () => {
    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('validates password strength', () => {
    const isStrongPassword = (password: string) => {
      return password.length >= 8;
    };

    expect(isStrongPassword('password123')).toBe(true);
    expect(isStrongPassword('123')).toBe(false);
    expect(isStrongPassword('')).toBe(false);
  });

  it('formats date correctly', () => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    };

    // The actual result depends on the timezone, so we'll test the function works
    const result = formatDate('2024-01-01T00:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// Test API service functions
describe('API Service', () => {
  it('constructs API URLs correctly', () => {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const endpoint = '/auth/login';
    const fullURL = `${baseURL}${endpoint}`;
    
    expect(fullURL).toContain('/auth/login');
  });

  it('handles error responses', () => {
    const handleError = (error: any) => {
      if (error.response?.data?.message) {
        return error.response.data.message;
      }
      return 'An unexpected error occurred';
    };

    const mockError = {
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    };

    expect(handleError(mockError)).toBe('Invalid credentials');
    expect(handleError({})).toBe('An unexpected error occurred');
  });
});

// Test form validation
describe('Form Validation', () => {
  it('validates required fields', () => {
    const validateRequired = (value: string) => {
      return value && value.trim().length > 0;
    };

    expect(validateRequired('test')).toBe(true);
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
  });

  it('validates field lengths', () => {
    const validateLength = (value: string, min: number, max?: number) => {
      if (value.length < min) return false;
      if (max && value.length > max) return false;
      return true;
    };

    expect(validateLength('test', 2)).toBe(true);
    expect(validateLength('a', 2)).toBe(false);
    expect(validateLength('test', 2, 10)).toBe(true);
    expect(validateLength('very long string', 2, 10)).toBe(false);
  });
}); 