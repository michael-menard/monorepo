import { getSecurityConfig, getDynamicSecurityHeaders } from '../utils/helmet';

// Helmet configuration for different environments
export const helmetConfig = {
  // Development environment (relaxed security for debugging)
  development: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "http:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        prefetchSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    hsts: false, // Disable HSTS in development
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  },

  // Staging environment (balanced security)
  staging: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        prefetchSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false, // Don't preload in staging
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
  },

  // Production environment (maximum security)
  production: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        prefetchSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
  },
};

// Get Helmet configuration for current environment
export const getHelmetConfig = (environment: string = process.env['NODE_ENV'] || 'production') => {
  return helmetConfig[environment as keyof typeof helmetConfig] || helmetConfig.production;
};

// Security policies for different API endpoints
export const endpointSecurityPolicies = {
  // Public endpoints (signup, login)
  public: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        prefetchSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  },

  // Protected endpoints (require authentication)
  protected: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        prefetchSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  },

  // Admin endpoints (highest security)
  admin: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        prefetchSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  },
};

// Get security policy for endpoint type
export const getEndpointSecurityPolicy = (endpointType: keyof typeof endpointSecurityPolicies) => {
  return endpointSecurityPolicies[endpointType];
};

// Security headers configuration
export const securityHeadersConfig = {
  // Basic security headers (always applied)
  basic: [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'X-Powered-By',
    'X-Download-Options',
    'X-Permitted-Cross-Domain-Policies',
  ],

  // Advanced security headers (applied based on environment)
  advanced: [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'Referrer-Policy',
    'Permissions-Policy',
    'Cross-Origin-Embedder-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Resource-Policy',
    'Expect-CT',
    'X-DNS-Prefetch-Control',
  ],

  // Cache control headers
  cache: [
    'Cache-Control',
    'Pragma',
    'Expires',
  ],
};

// Security validation rules
export const securityValidationRules = {
  // Required headers for production
  production: [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Referrer-Policy',
    'Permissions-Policy',
  ],

  // Required headers for staging
  staging: [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
  ],

  // Required headers for development
  development: [
    'X-Content-Type-Options',
    'X-XSS-Protection',
  ],
};

// Get required headers for environment
export const getRequiredHeaders = (environment: string = process.env['NODE_ENV'] || 'production') => {
  return securityValidationRules[environment as keyof typeof securityValidationRules] || securityValidationRules.production;
};

// Security recommendations
export const securityRecommendations = {
  production: [
    'Enable HSTS with preload',
    'Use strict CSP policies',
    'Enable all security headers',
    'Use HTTPS only',
    'Implement rate limiting',
    'Enable audit logging',
  ],
  staging: [
    'Enable HSTS without preload',
    'Use moderate CSP policies',
    'Enable basic security headers',
    'Monitor security events',
  ],
  development: [
    'Disable HSTS for local development',
    'Use relaxed CSP policies',
    'Enable basic security headers',
    'Log security events for debugging',
  ],
};

// Get security recommendations for environment
export const getSecurityRecommendations = (environment: string = process.env['NODE_ENV'] || 'production') => {
  return securityRecommendations[environment as keyof typeof securityRecommendations] || securityRecommendations.production;
}; 