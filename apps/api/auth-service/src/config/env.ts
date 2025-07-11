import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  // Database
  USERS_TABLE: process.env['USERS_TABLE'] || 'auth-service-users-dev',
  
  // JWT Configuration
  JWT_SECRET: process.env['JWT_SECRET'] || 'fallback-jwt-secret-for-development',
  
  // Password Hashing
  SALT_ROUNDS: parseInt(process.env['SALT_ROUNDS'] || '12'),
  
  // Session Configuration
  SESSION_TTL: parseInt(process.env['SESSION_TTL'] || '86400'),
  
  // AWS Configuration
  AWS_REGION: process.env['AWS_REGION'] || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env['AWS_ACCESS_KEY_ID'],
  AWS_SECRET_ACCESS_KEY: process.env['AWS_SECRET_ACCESS_KEY'],
  
  // Development
  IS_OFFLINE: process.env['IS_OFFLINE'] === 'true',
  
  // Security
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_WINDOW: 5 * 60 * 1000, // 5 minutes
  SIGNUP_RATE_LIMIT: 5,
  LOGIN_RATE_LIMIT: 10,
  
  // Token Configuration
  ACCESS_TOKEN_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  RESET_TOKEN_EXPIRY: 3600000, // 1 hour in milliseconds
  
  // Cookie Configuration
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  COOKIE_DOMAIN: process.env['COOKIE_DOMAIN'],
  COOKIE_SECURE: process.env['NODE_ENV'] === 'production',
  COOKIE_SAME_SITE: 'Strict',
  ACCESS_TOKEN_MAX_AGE: 3600, // 1 hour
  REFRESH_TOKEN_MAX_AGE: 604800, // 7 days
} as const;

// Validate required environment variables
export const validateConfig = (): void => {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Export individual config values for convenience
export const {
  USERS_TABLE,
  JWT_SECRET,
  SALT_ROUNDS,
  SESSION_TTL,
  AWS_REGION,
  IS_OFFLINE,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION,
  RATE_LIMIT_WINDOW,
  SIGNUP_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  RESET_TOKEN_EXPIRY,
  NODE_ENV,
  COOKIE_DOMAIN,
  COOKIE_SECURE,
  COOKIE_SAME_SITE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} = config; 