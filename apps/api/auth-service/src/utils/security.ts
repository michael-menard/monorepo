import { LambdaResponse } from '../types';
import { getEnhancedSecurityHeaders } from './helmet';

// Security configurations
const SECURITY_HEADERS = getEnhancedSecurityHeaders();

// CORS configuration
const CORS_ORIGINS = process.env['CORS_ORIGINS']?.split(',') || ['*'];
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Amz-Date',
  'X-Api-Key',
  'X-Amz-Security-Token',
  'X-Requested-With',
];

// Rate limiting store (in production, use Redis or DynamoDB)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Enhanced rate limiting with different tiers
export const RATE_LIMITS = {
  SIGNUP: { requests: 5, windowMs: 300000 }, // 5 requests per 5 minutes
  LOGIN: { requests: 10, windowMs: 300000 }, // 10 requests per 5 minutes
  PASSWORD_RESET: { requests: 3, windowMs: 600000 }, // 3 requests per 10 minutes
  TOKEN_VERIFY: { requests: 100, windowMs: 60000 }, // 100 requests per minute
  GENERAL: { requests: 1000, windowMs: 60000 }, // 1000 requests per minute
} as const;

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

export const checkRateLimit = (
  ip: string,
  action: string,
  config: RateLimitConfig = RATE_LIMITS.GENERAL
): boolean => {
  const key = `${ip}:${action}`;
  const now = Date.now();
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 0, resetTime: now + config.windowMs });
  }
  
  const entry = rateLimitStore.get(key)!;
  
  // Reset if window has passed
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + config.windowMs;
  }
  
  // Check if limit exceeded
  if (entry.count >= config.requests) {
    return false;
  }
  
  // Increment counter
  entry.count++;
  return true;
};

export const getRateLimitHeaders = (
  ip: string,
  action: string,
  config: RateLimitConfig = RATE_LIMITS.GENERAL
): Record<string, string> => {
  const key = `${ip}:${action}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    return {
      'X-RateLimit-Limit': config.requests.toString(),
      'X-RateLimit-Remaining': config.requests.toString(),
      'X-RateLimit-Reset': (Date.now() + config.windowMs).toString(),
    };
  }
  
  const remaining = Math.max(0, config.requests - entry.count);
  
  return {
    'X-RateLimit-Limit': config.requests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': entry.resetTime.toString(),
  };
};

// CORS validation
export const validateCORS = (origin: string | undefined): boolean => {
  if (CORS_ORIGINS.includes('*')) return true;
  if (!origin) return false;
  return CORS_ORIGINS.some(allowedOrigin => {
    if (allowedOrigin === '*') return true;
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.slice(2);
      return origin.endsWith(domain);
    }
    return origin === allowedOrigin;
  });
};

// Enhanced response creation with security headers
export const createSecureResponse = (
  statusCode: number,
  body: any,
  options: {
    cors?: boolean;
    rateLimit?: { ip: string; action: string; config?: RateLimitConfig };
  } = {}
): LambdaResponse => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...SECURITY_HEADERS,
  };

  // Add CORS headers if requested
  if (options.cors) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Methods'] = ALLOWED_METHODS.join(', ');
    headers['Access-Control-Allow-Headers'] = ALLOWED_HEADERS.join(', ');
    headers['Access-Control-Max-Age'] = '86400';
  }

  // Add rate limit headers if provided
  if (options.rateLimit) {
    const rateLimitHeaders = getRateLimitHeaders(
      options.rateLimit.ip,
      options.rateLimit.action,
      options.rateLimit.config
    );
    Object.assign(headers, rateLimitHeaders);
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
};

export const createSecureErrorResponse = (
  statusCode: number,
  message: string,
  options: {
    cors?: boolean;
    rateLimit?: { ip: string; action: string; config?: RateLimitConfig };
  } = {}
): LambdaResponse => {
  return createSecureResponse(
    statusCode,
    { error: message },
    options
  );
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Password strength validation with enhanced security
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be at most 128 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i,
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common weak patterns');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Session management utilities
export const generateSessionId = (): string => {
  return require('crypto').randomBytes(32).toString('hex');
};

export const validateSession = (sessionId: string): boolean => {
  // In production, validate against database
  return sessionId.length === 64 && /^[a-f0-9]+$/i.test(sessionId);
};

// Audit logging
export const logSecurityEvent = (
  event: string,
  details: Record<string, any>,
  ip: string
): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip,
    userAgent: details['userAgent'] || 'unknown',
    ...details,
  };
  
  console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
  
  // In production, send to CloudWatch or external logging service
};

// Request validation
export const validateRequestHeaders = (headers: Record<string, string>): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Check for required headers
  if (!headers['content-type'] || !headers['content-type'].includes('application/json')) {
    errors.push('Content-Type must be application/json');
  }
  
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-forwarded-proto',
  ];
  
  for (const header of suspiciousHeaders) {
    if (headers[header]) {
      logSecurityEvent('suspicious_header', { header, value: headers[header] }, 'unknown');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// IP address validation and sanitization
export const getClientIP = (event: any): string => {
  const headers = event.headers || {};
  
  // Check various IP headers in order of preference
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];
  
  for (const header of ipHeaders) {
    const ip = headers[header];
    if (ip) {
      // Extract first IP if comma-separated
      const cleanIP = ip.split(',')[0].trim();
      if (isValidIP(cleanIP)) {
        return cleanIP;
      }
    }
  }
  
  // Fallback to request context
  return event.requestContext?.http?.sourceIp || 'unknown';
};

const isValidIP = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Request size validation
export const validateRequestSize = (body: string | null): boolean => {
  if (!body) return true;
  
  const maxSize = 1024 * 1024; // 1MB
  return body.length <= maxSize;
};

// JWT token validation with enhanced security
export const validateJWTToken = (token: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!token || typeof token !== 'string') {
    return { isValid: false, error: 'Token is required' };
  }
  
  if (token.length < 10) {
    return { isValid: false, error: 'Token is too short' };
  }
  
  if (token.length > 10000) {
    return { isValid: false, error: 'Token is too long' };
  }
  
  // Check for suspicious patterns
  if (token.includes('..') || token.includes('--')) {
    return { isValid: false, error: 'Token contains suspicious patterns' };
  }
  
  return { isValid: true };
}; 