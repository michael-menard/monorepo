import { LambdaResponse } from '../types';

// Enhanced security headers for Lambda responses (Helmet-like)
export const getEnhancedSecurityHeaders = (): Record<string, string> => {
  return {
    // Content Security Policy
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' https: data:; object-src 'none'; media-src 'self'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; prefetch-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
    
    // Cross-Origin Policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    
    // DNS Prefetch Control
    'X-DNS-Prefetch-Control': 'off',
    
    // Expect-CT
    'Expect-CT': 'enforce, max-age=30, report-uri="https://example.com/report"',
    
    // Frame Options
    'X-Frame-Options': 'DENY',
    
    // Hide Powered-By
    'X-Powered-By': '',
    
    // HSTS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // IE No Open
    'X-Download-Options': 'noopen',
    
    // No Sniff
    'X-Content-Type-Options': 'nosniff',
    
    // Permissions Policy
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), encrypted-media=(), fullscreen=(), picture-in-picture=(), sync-xhr=(), clipboard-read=(), clipboard-write=(), web-share=(), xr-spatial-tracking=()',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Cache Control for sensitive data
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    
    // Additional security headers
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Disposition': 'attachment',
    'X-Requested-With': 'XMLHttpRequest',
  };
};

// Apply Helmet headers to Lambda response
export const applyHelmetHeaders = (response: LambdaResponse): LambdaResponse => {
  const securityHeaders = getEnhancedSecurityHeaders();
  
  return {
    ...response,
    headers: {
      ...response.headers,
      ...securityHeaders,
    },
  };
};

// Helmet middleware for Lambda handlers
export const withHelmet = (handler: Function) => {
  return async (event: any, context: any) => {
    try {
      // Apply Helmet security headers
      const result = await handler(event, context);
      
      if (result && typeof result === 'object' && 'statusCode' in result) {
        return applyHelmetHeaders(result as LambdaResponse);
      }
      
      return result;
    } catch (error) {
      console.error('Helmet middleware error:', error);
      throw error;
    }
  };
};

// Security configuration for different environments
export const getSecurityConfig = (environment: string = 'production') => {
  const baseConfig = {
    // Basic security settings
    enableHSTS: true,
    enableCSP: true,
    enableXSSProtection: true,
    enableFrameGuard: true,
    enableNoSniff: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
  };

  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        enableHSTS: false, // Disable HSTS in development
        enableCSP: false, // Relax CSP in development
      };
    case 'staging':
      return {
        ...baseConfig,
        enableHSTS: true,
        enableCSP: true,
      };
    case 'production':
    default:
      return {
        ...baseConfig,
        enableHSTS: true,
        enableCSP: true,
        enableXSSProtection: true,
        enableFrameGuard: true,
        enableNoSniff: true,
        enableReferrerPolicy: true,
        enablePermissionsPolicy: true,
      };
  }
};

// Dynamic security headers based on environment
export const getDynamicSecurityHeaders = (environment: string = 'production'): Record<string, string> => {
  const config = getSecurityConfig(environment);
  const headers: Record<string, string> = {};

  if (config.enableHSTS) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  if (config.enableCSP) {
    headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' https: data:; object-src 'none'; media-src 'self'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; prefetch-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
  }

  if (config.enableXSSProtection) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }

  if (config.enableFrameGuard) {
    headers['X-Frame-Options'] = 'DENY';
  }

  if (config.enableNoSniff) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  if (config.enableReferrerPolicy) {
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  }

  if (config.enablePermissionsPolicy) {
    headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), encrypted-media=(), fullscreen=(), picture-in-picture=(), sync-xhr=(), clipboard-read=(), clipboard-write=(), web-share=(), xr-spatial-tracking=()';
  }

  // Always include these headers
  headers['X-Powered-By'] = '';
  headers['X-Download-Options'] = 'noopen';
  headers['X-Permitted-Cross-Domain-Policies'] = 'none';
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';

  return headers;
};

// Security validation utilities
export const validateSecurityHeaders = (headers: Record<string, string>): {
  isValid: boolean;
  missingHeaders: string[];
  recommendations: string[];
} => {
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Referrer-Policy',
    'Permissions-Policy',
  ];

  const missingHeaders: string[] = [];
  const recommendations: string[] = [];

  for (const header of requiredHeaders) {
    if (!headers[header]) {
      missingHeaders.push(header);
    }
  }

  // Check for weak configurations
  if (headers['X-Frame-Options'] && headers['X-Frame-Options'] !== 'DENY') {
    recommendations.push('Consider setting X-Frame-Options to DENY for maximum security');
  }

  if (headers['X-Content-Type-Options'] && headers['X-Content-Type-Options'] !== 'nosniff') {
    recommendations.push('Consider setting X-Content-Type-Options to nosniff');
  }

  if (headers['X-XSS-Protection'] && !headers['X-XSS-Protection'].includes('mode=block')) {
    recommendations.push('Consider adding mode=block to X-XSS-Protection');
  }

  return {
    isValid: missingHeaders.length === 0,
    missingHeaders,
    recommendations,
  };
};

// Helmet-like security middleware for Lambda
export const helmetMiddleware = {
  // Apply security headers to response
  applyHeaders: applyHelmetHeaders,
  
  // Wrap handler with security headers
  withHelmet,
  
  // Get security headers
  getHeaders: getEnhancedSecurityHeaders,
  
  // Get dynamic headers based on environment
  getDynamicHeaders: getDynamicSecurityHeaders,
  
  // Validate security headers
  validateHeaders: validateSecurityHeaders,
  
  // Get security configuration
  getConfig: getSecurityConfig,
}; 