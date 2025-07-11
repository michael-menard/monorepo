import helmet from 'helmet';

// Security headers configuration for frontend
export const securityHeaders = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https://api.example.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // XSS Protection
  xssFilter: true,
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Prevent clickjacking
  frameguard: {
    action: 'deny',
  },
  
  // Hide powered by header
  hidePoweredBy: true,
  
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  
  // Permissions Policy
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
  
  // Content Type Options
  contentTypeOptions: true,
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: 'same-site',
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: {
    policy: 'require-corp',
  },
  
  // Origin Agent Cluster
  originAgentCluster: true,
};

// Create Helmet configuration
export const createHelmetConfig = (customConfig?: any) => {
  return helmet({
    ...securityHeaders,
    ...customConfig,
  });
};

// Default Helmet configuration
export const defaultHelmetConfig = createHelmetConfig();

// Security middleware for Express (if used in SSR)
export const securityMiddleware = (app: any) => {
  app.use(defaultHelmetConfig);
  
  // Additional security headers
  app.use((req: any, res: any, next: any) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    next();
  });
};

// Utility function to apply security headers to HTML
export const applySecurityHeaders = (html: string): string => {
  const securityMetaTags = `
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
    <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()">
  `;
  
  return html.replace('</head>', `${securityMetaTags}</head>`);
}; 