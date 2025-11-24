/**
 * Regular expression patterns for detecting PII
 */

// Email addresses
export const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

// Phone numbers (various formats)
export const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g

// Credit card numbers
export const CREDIT_CARD_PATTERN = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g

// IP addresses (IPv4)
export const IP_ADDRESS_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g

// Social Security Numbers (US)
export const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g

// API keys (generic patterns)
export const API_KEY_PATTERN = /\b[A-Za-z0-9]{32,}\b/g

// JWT tokens
export const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g

// AWS access keys
export const AWS_KEY_PATTERN = /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g

// Password-related keywords (for field names)
export const PASSWORD_KEYWORDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'auth_token',
  'private_key',
  'privatekey',
  'client_secret',
  'refresh_token',
  'session_id',
  'sessionid',
  'csrf_token',
  'csrftoken',
  'authorization',
  'bearer',
]

// Sensitive HTTP headers
export const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-xsrf-token',
  'proxy-authorization',
  'www-authenticate',
]

// Query parameter patterns that often contain sensitive data
export const SENSITIVE_QUERY_PARAMS = [
  'token',
  'key',
  'secret',
  'password',
  'pwd',
  'auth',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'session',
  'sid',
]
