import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getEnhancedSecurityHeaders,
  applyHelmetHeaders,
  withHelmet,
  getSecurityConfig,
  getDynamicSecurityHeaders,
  validateSecurityHeaders,
  helmetMiddleware,
} from '../helmet';
import { LambdaResponse } from '../../types';

describe('Helmet Security Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Enhanced Security Headers', () => {
    it('should generate comprehensive security headers', () => {
      const headers = getEnhancedSecurityHeaders();
      
      // Check for essential security headers
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('X-XSS-Protection');
      expect(headers).toHaveProperty('Strict-Transport-Security');
      expect(headers).toHaveProperty('Referrer-Policy');
      expect(headers).toHaveProperty('Permissions-Policy');
      
      // Check for advanced security headers
      expect(headers).toHaveProperty('Cross-Origin-Embedder-Policy');
      expect(headers).toHaveProperty('Cross-Origin-Opener-Policy');
      expect(headers).toHaveProperty('Cross-Origin-Resource-Policy');
      expect(headers).toHaveProperty('Expect-CT');
      expect(headers).toHaveProperty('X-DNS-Prefetch-Control');
      
      // Check for cache control headers
      expect(headers).toHaveProperty('Cache-Control');
      expect(headers).toHaveProperty('Pragma');
      expect(headers).toHaveProperty('Expires');
    });

    it('should have proper CSP directives', () => {
      const headers = getEnhancedSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should have proper HSTS configuration', () => {
      const headers = getEnhancedSecurityHeaders();
      const hsts = headers['Strict-Transport-Security'];
      
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should hide server information', () => {
      const headers = getEnhancedSecurityHeaders();
      
      expect(headers['X-Powered-By']).toBe('');
      expect(headers['X-Download-Options']).toBe('noopen');
      expect(headers['X-Permitted-Cross-Domain-Policies']).toBe('none');
    });
  });

  describe('Apply Helmet Headers', () => {
    it('should apply security headers to Lambda response', () => {
      const originalResponse: LambdaResponse = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'success' }),
      };

      const securedResponse = applyHelmetHeaders(originalResponse);

      expect(securedResponse.statusCode).toBe(200);
      expect(securedResponse.body).toBe(originalResponse.body);
      expect(securedResponse.headers).toHaveProperty('Content-Security-Policy');
      expect(securedResponse.headers).toHaveProperty('X-Frame-Options');
      expect(securedResponse.headers).toHaveProperty('X-Content-Type-Options');
      expect(securedResponse.headers['Content-Type']).toBe('application/json');
    });

    it('should preserve existing headers', () => {
      const originalResponse: LambdaResponse = {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'custom-value',
        },
        body: JSON.stringify({ message: 'created' }),
      };

      const securedResponse = applyHelmetHeaders(originalResponse);

      expect(securedResponse.headers['Content-Type']).toBe('application/json');
      expect(securedResponse.headers['Custom-Header']).toBe('custom-value');
      expect(securedResponse.headers).toHaveProperty('Content-Security-Policy');
    });
  });

  describe('Helmet Middleware', () => {
    it('should wrap handler with security headers', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'success' }),
      });

      const securedHandler = withHelmet(mockHandler);
      const result = await securedHandler({}, {});

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty('Content-Security-Policy');
      expect(result.headers).toHaveProperty('X-Frame-Options');
      expect(mockHandler).toHaveBeenCalledWith({}, {});
    });

    it('should handle non-response results', async () => {
      const mockHandler = vi.fn().mockResolvedValue('string result');
      const securedHandler = withHelmet(mockHandler);
      const result = await securedHandler({}, {});

      expect(result).toBe('string result');
    });

    it('should handle errors gracefully', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      const securedHandler = withHelmet(mockHandler);

      await expect(securedHandler({}, {})).rejects.toThrow('Test error');
    });
  });

  describe('Security Configuration', () => {
    it('should return production config by default', () => {
      const config = getSecurityConfig();
      
      expect(config.enableHSTS).toBe(true);
      expect(config.enableCSP).toBe(true);
      expect(config.enableXSSProtection).toBe(true);
      expect(config.enableFrameGuard).toBe(true);
      expect(config.enableNoSniff).toBe(true);
      expect(config.enableReferrerPolicy).toBe(true);
      expect(config.enablePermissionsPolicy).toBe(true);
    });

    it('should return development config', () => {
      const config = getSecurityConfig('development');
      
      expect(config.enableHSTS).toBe(false);
      expect(config.enableCSP).toBe(false);
      expect(config.enableXSSProtection).toBe(true);
      expect(config.enableFrameGuard).toBe(true);
    });

    it('should return staging config', () => {
      const config = getSecurityConfig('staging');
      
      expect(config.enableHSTS).toBe(true);
      expect(config.enableCSP).toBe(true);
      expect(config.enableXSSProtection).toBe(true);
      expect(config.enableFrameGuard).toBe(true);
    });
  });

  describe('Dynamic Security Headers', () => {
    it('should generate production headers', () => {
      const headers = getDynamicSecurityHeaders('production');
      
      expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains; preload');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should generate development headers', () => {
      const headers = getDynamicSecurityHeaders('development');
      
      // HSTS should not be present in development
      expect(headers['Strict-Transport-Security']).toBeUndefined();
      expect(headers['Content-Security-Policy']).toBeUndefined();
      
      // Basic headers should still be present
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should always include basic headers', () => {
      const headers = getDynamicSecurityHeaders('development');
      
      expect(headers['X-Powered-By']).toBe('');
      expect(headers['X-Download-Options']).toBe('noopen');
      expect(headers['X-Permitted-Cross-Domain-Policies']).toBe('none');
      expect(headers['Cache-Control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(headers['Pragma']).toBe('no-cache');
      expect(headers['Expires']).toBe('0');
    });
  });

  describe('Security Header Validation', () => {
    it('should validate complete security headers', () => {
      const headers = getEnhancedSecurityHeaders();
      const validation = validateSecurityHeaders(headers);
      
      expect(validation.isValid).toBe(true);
      expect(validation.missingHeaders).toHaveLength(0);
    });

    it('should detect missing headers', () => {
      const incompleteHeaders = {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
      };
      
      const validation = validateSecurityHeaders(incompleteHeaders);
      
      expect(validation.isValid).toBe(false);
      expect(validation.missingHeaders).toContain('Content-Security-Policy');
      expect(validation.missingHeaders).toContain('X-Content-Type-Options');
      expect(validation.missingHeaders).toContain('X-XSS-Protection');
    });

    it('should provide security recommendations', () => {
      const weakHeaders = {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1',
      };
      
      const validation = validateSecurityHeaders(weakHeaders);
      
      expect(validation.recommendations).toContain('Consider setting X-Frame-Options to DENY for maximum security');
      expect(validation.recommendations).toContain('Consider adding mode=block to X-XSS-Protection');
    });
  });

  describe('Helmet Middleware Object', () => {
    it('should provide all helmet utilities', () => {
      expect(helmetMiddleware.applyHeaders).toBeDefined();
      expect(helmetMiddleware.withHelmet).toBeDefined();
      expect(helmetMiddleware.getHeaders).toBeDefined();
      expect(helmetMiddleware.getDynamicHeaders).toBeDefined();
      expect(helmetMiddleware.validateHeaders).toBeDefined();
      expect(helmetMiddleware.getConfig).toBeDefined();
    });

    it('should apply headers through middleware', () => {
      const response: LambdaResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' }),
      };

      const securedResponse = helmetMiddleware.applyHeaders(response);
      
      expect(securedResponse.headers).toHaveProperty('Content-Security-Policy');
      expect(securedResponse.headers).toHaveProperty('X-Frame-Options');
    });

    it('should validate headers through middleware', () => {
      const headers = helmetMiddleware.getHeaders();
      const validation = helmetMiddleware.validateHeaders(headers);
      
      expect(validation.isValid).toBe(true);
    });
  });
}); 