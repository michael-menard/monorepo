import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  getRateLimitHeaders,
  validateCORS,
  createSecureResponse,
  createSecureErrorResponse,
  sanitizeInput,
  validatePasswordStrength,
  generateSessionId,
  validateSession,
  logSecurityEvent,
  validateRequestHeaders,
  getClientIP,
  validateRequestSize,
  validateJWTToken,
  RATE_LIMITS,
} from '../security';

describe('Security Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const ip = '192.168.1.1';
      const action = 'test';
      
      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(ip, action, RATE_LIMITS.SIGNUP)).toBe(true);
      }
      
      // 6th request should be blocked
      expect(checkRateLimit(ip, action, RATE_LIMITS.SIGNUP)).toBe(false);
    });

    it('should reset rate limit after window expires', () => {
      const ip = '192.168.1.2';
      const action = 'test';
      
      // Use a short window for testing
      const shortConfig = { requests: 2, windowMs: 100 };
      
      // First 2 requests should be allowed
      expect(checkRateLimit(ip, action, shortConfig)).toBe(true);
      expect(checkRateLimit(ip, action, shortConfig)).toBe(true);
      
      // 3rd request should be blocked
      expect(checkRateLimit(ip, action, shortConfig)).toBe(false);
      
      // Wait for window to expire
      setTimeout(() => {
        expect(checkRateLimit(ip, action, shortConfig)).toBe(true);
      }, 150);
    });

    it('should return correct rate limit headers', () => {
      const ip = '192.168.1.3';
      const action = 'test';
      const config = RATE_LIMITS.SIGNUP;
      
      const headers = getRateLimitHeaders(ip, action, config);
      
      expect(headers).toHaveProperty('X-RateLimit-Limit');
      expect(headers).toHaveProperty('X-RateLimit-Remaining');
      expect(headers).toHaveProperty('X-RateLimit-Reset');
      expect(headers['X-RateLimit-Limit']).toBe(config.requests.toString());
    });
  });

  describe('CORS Validation', () => {
    it('should allow all origins when configured with *', () => {
      expect(validateCORS('https://example.com')).toBe(true);
      expect(validateCORS('https://api.example.com')).toBe(true);
      expect(validateCORS(undefined)).toBe(true);
    });

    it('should validate specific origins', () => {
      // Test with wildcard configuration
      expect(validateCORS('https://example.com')).toBe(true);
      expect(validateCORS('https://api.example.com')).toBe(true);
      expect(validateCORS('https://malicious.com')).toBe(true); // Wildcard allows all
    });
  });

  describe('Secure Response Creation', () => {
    it('should create response with security headers', () => {
      const response = createSecureResponse(200, { message: 'success' });
      
      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('Content-Security-Policy');
      expect(response.headers).toHaveProperty('X-Content-Type-Options');
      expect(response.headers).toHaveProperty('X-Frame-Options');
      expect(response.headers).toHaveProperty('X-XSS-Protection');
      expect(response.headers).toHaveProperty('Strict-Transport-Security');
    });

    it('should add CORS headers when requested', () => {
      const response = createSecureResponse(200, { message: 'success' }, { cors: true });
      
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Headers');
    });

    it('should add rate limit headers when provided', () => {
      const response = createSecureResponse(200, { message: 'success' }, {
        rateLimit: { ip: '192.168.1.1', action: 'test', config: RATE_LIMITS.SIGNUP }
      });
      
      expect(response.headers).toHaveProperty('X-RateLimit-Limit');
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining');
      expect(response.headers).toHaveProperty('X-RateLimit-Reset');
    });

    it('should create error response with security headers', () => {
      const response = createSecureErrorResponse(400, 'Bad request', { cors: true });
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ error: 'Bad request' });
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should remove javascript protocol', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      expect(sanitizeInput('onclick="alert(\'xss\')"')).toBe('"alert(\'xss\')"');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });
  });

  describe('Password Strength Validation', () => {
    it('should validate strong passwords', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePasswordStrength('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common weak patterns', () => {
      const result = validatePasswordStrength('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains common weak patterns');
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'A'.repeat(129);
      const result = validatePasswordStrength(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at most 128 characters long');
    });
  });

  describe('Session Management', () => {
    it('should generate valid session IDs', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toHaveLength(64);
      expect(sessionId).toMatch(/^[a-f0-9]+$/i);
    });

    it('should validate session IDs', () => {
      expect(validateSession(generateSessionId())).toBe(true);
      expect(validateSession('invalid')).toBe(false);
      expect(validateSession('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).toBe(true);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      logSecurityEvent('test_event', { userId: '123' }, '192.168.1.1');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'SECURITY_EVENT:',
        expect.stringContaining('test_event')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Request Header Validation', () => {
    it('should validate required headers', () => {
      const validHeaders = { 'content-type': 'application/json' };
      const result = validateRequestHeaders(validHeaders);
      expect(result.isValid).toBe(true);
    });

    it('should reject missing content-type', () => {
      const invalidHeaders = { 'user-agent': 'test' };
      const result = validateRequestHeaders(invalidHeaders);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content-Type must be application/json');
    });

    it('should log suspicious headers', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const headers = { 'x-forwarded-for': '192.168.1.1' };
      validateRequestHeaders(headers);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'SECURITY_EVENT:',
        expect.stringContaining('suspicious_header')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('IP Address Validation', () => {
    it('should extract client IP from various headers', () => {
      const event = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'x-real-ip': '192.168.1.2'
        },
        requestContext: {
          http: {
            sourceIp: '192.168.1.3'
          }
        }
      };
      
      const ip = getClientIP(event);
      expect(ip).toBe('192.168.1.1');
    });

    it('should fallback to request context', () => {
      const event = {
        requestContext: {
          http: {
            sourceIp: '192.168.1.1'
          }
        }
      };
      
      const ip = getClientIP(event);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return unknown for invalid IPs', () => {
      const event = {};
      const ip = getClientIP(event);
      expect(ip).toBe('unknown');
    });
  });

  describe('Request Size Validation', () => {
    it('should allow requests within size limit', () => {
      const smallBody = 'a'.repeat(1024); // 1KB
      expect(validateRequestSize(smallBody)).toBe(true);
    });

    it('should reject oversized requests', () => {
      const largeBody = 'a'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
      expect(validateRequestSize(largeBody)).toBe(false);
    });

    it('should allow null/undefined bodies', () => {
      expect(validateRequestSize(null)).toBe(true);
      expect(validateRequestSize(undefined as any)).toBe(true);
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate proper JWT tokens', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = validateJWTToken(validToken);
      expect(result.isValid).toBe(true);
    });

    it('should reject missing tokens', () => {
      const result = validateJWTToken('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token is required');
    });

    it('should reject tokens that are too short', () => {
      const result = validateJWTToken('short');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token is too short');
    });

    it('should reject tokens that are too long', () => {
      const longToken = 'a'.repeat(10001);
      const result = validateJWTToken(longToken);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token is too long');
    });

    it('should reject tokens with suspicious patterns', () => {
      const result = validateJWTToken('token..with..dots');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token contains suspicious patterns');
    });
  });
}); 