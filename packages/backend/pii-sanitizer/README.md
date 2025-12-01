# @monorepo/pii-sanitizer

A comprehensive PII (Personally Identifiable Information) sanitization library for protecting sensitive data in logs, errors, analytics, and CloudWatch.

## Features

- **Multiple PII Pattern Detection**: Emails, phone numbers, credit cards, SSN, IP addresses, API keys, JWT tokens, AWS keys
- **Configurable Sanitization**: Enable/disable specific PII types
- **Partial Redaction**: Show last N characters (e.g., `****-****-****-1234`)
- **Custom Patterns**: Add your own regex patterns and keywords
- **Deep Object Sanitization**: Recursively sanitize nested objects and arrays
- **HTTP-Aware**: Sanitize URLs, headers, and query parameters
- **Error Sanitization**: Clean error messages and stack traces
- **TypeScript**: Full type definitions included

## Installation

```bash
pnpm add @monorepo/pii-sanitizer
```

## Usage

### Basic String Sanitization

```typescript
import { sanitizeString } from '@monorepo/pii-sanitizer'

const message = 'Contact user@example.com or call 555-123-4567'
const sanitized = sanitizeString(message)
// Result: 'Contact [REDACTED] or call [REDACTED]'
```

### Object Sanitization

```typescript
import { sanitizeObject } from '@monorepo/pii-sanitizer'

const data = {
  user: {
    email: 'user@example.com',
    phone: '555-123-4567',
  },
  password: 'secret123', // Field name detected as sensitive
}

const sanitized = sanitizeObject(data)
// Result: {
//   user: {
//     email: '[REDACTED]',
//     phone: '[REDACTED]'
//   },
//   password: '[REDACTED]'
// }
```

### Error Sanitization

```typescript
import { sanitizeError } from '@monorepo/pii-sanitizer'

try {
  throw new Error('Failed to process user@example.com')
} catch (error) {
  const sanitized = sanitizeError(error as Error)
  console.error(sanitized)
  // Message: 'Failed to process [REDACTED]'
}
```

### Partial Redaction

```typescript
import { sanitizeCreditCard } from '@monorepo/pii-sanitizer'

const card = '4532-1234-5678-9010'
const sanitized = sanitizeCreditCard(card, {
  partialRedaction: true,
  preserveChars: 4,
})
// Result: '****-****-****-9010'
```

### Custom Configuration

```typescript
import { sanitizeObject } from '@monorepo/pii-sanitizer'

const options = {
  replacement: '***HIDDEN***',
  sanitizeEmails: true,
  sanitizePhoneNumbers: false, // Don't sanitize phones
  customKeywords: ['accountNumber', 'socialSecurityNumber'],
  customPatterns: [/REF-\d+/g],
}

const sanitized = sanitizeObject(data, options)
```

### URL Sanitization

```typescript
import { sanitizeUrl } from '@monorepo/pii-sanitizer'

const url = 'https://api.example.com/data?token=secret123&id=456'
const sanitized = sanitizeUrl(url)
// Result: 'https://api.example.com/data?token=[REDACTED]&id=456'
```

### Header Sanitization

```typescript
import { sanitizeHeaders } from '@monorepo/pii-sanitizer'

const headers = {
  Authorization: 'Bearer token123',
  'Content-Type': 'application/json',
  'X-API-Key': 'secret-key',
}

const sanitized = sanitizeHeaders(headers)
// Result: {
//   'Authorization': '[REDACTED]',
//   'Content-Type': 'application/json',
//   'X-API-Key': '[REDACTED]'
// }
```

## API Reference

### Main Functions

#### `sanitizeString(value: string, options?: SanitizationOptions): string`

Sanitize a string value based on detected PII patterns.

#### `sanitizeObject<T>(obj: T, options?: SanitizationOptions): T`

Recursively sanitize an object, detecting PII in values and sensitive field names.

#### `sanitizeError(error: Error, options?: SanitizationOptions): Error`

Sanitize an Error object including message, stack trace, and additional properties.

#### `sanitizeStackTrace(stackTrace: string, options?: SanitizationOptions): string`

Sanitize a stack trace string by removing PII and sensitive URL parameters.

#### `sanitizeUrl(url: string, options?: SanitizationOptions): string`

Sanitize a URL by redacting sensitive query parameters.

#### `sanitizeHeaders(headers: Record<string, string>, options?: SanitizationOptions): Record<string, string>`

Sanitize HTTP headers by redacting sensitive header values.

### Specific Sanitizers

#### `sanitizeEmail(email: string, options?: SanitizationOptions): string`

#### `sanitizePhoneNumber(phone: string, options?: SanitizationOptions): string`

#### `sanitizeCreditCard(cardNumber: string, options?: SanitizationOptions): string`

#### `sanitizeIPAddress(ip: string, options?: SanitizationOptions): string`

#### `sanitizeUserAgent(userAgent: string, options?: SanitizationOptions): string`

### Validators

#### `isEmail(value: string): boolean`

#### `isPhoneNumber(value: string): boolean`

#### `isCreditCard(value: string): boolean`

#### `isIPAddress(value: string): boolean`

#### `isSSN(value: string): boolean`

#### `isAPIKey(value: string): boolean`

#### `isJWT(value: string): boolean`

#### `isAWSKey(value: string): boolean`

#### `containsSensitiveKeyword(fieldName: string, customKeywords?: string[]): boolean`

## Configuration Options

```typescript
interface SanitizationOptions {
  replacement?: string // Default: '[REDACTED]'
  sanitizeEmails?: boolean // Default: true
  sanitizePhoneNumbers?: boolean // Default: true
  sanitizeCreditCards?: boolean // Default: true
  sanitizeIPAddresses?: boolean // Default: false
  sanitizeSSN?: boolean // Default: true
  sanitizeAPIKeys?: boolean // Default: true
  sanitizeJWT?: boolean // Default: true
  sanitizeAWSKeys?: boolean // Default: true
  customPatterns?: RegExp[]
  customKeywords?: string[]
  partialRedaction?: boolean // Default: false
  preserveChars?: number // Default: 4
}
```

## Detected Patterns

### Sensitive Field Names

- password, passwd, pwd
- secret, token
- api_key, apikey, access_token, auth_token
- private_key, client_secret, refresh_token
- session_id, csrf_token
- authorization, bearer

### Sensitive HTTP Headers

- authorization, cookie, set-cookie
- x-api-key, x-auth-token
- x-csrf-token, x-xsrf-token
- proxy-authorization, www-authenticate

### Sensitive Query Parameters

- token, key, secret, password
- auth, api_key, apikey
- access_token, refresh_token
- session, sid

## Use Cases

### CloudWatch Logging

```typescript
import { sanitizeObject } from '@monorepo/pii-sanitizer'
import { logger } from '@monorepo/logger'

function logEvent(event: unknown) {
  const sanitized = sanitizeObject(event)
  logger.info('Event received', sanitized)
}
```

### Error Reporting

```typescript
import { sanitizeError } from '@monorepo/pii-sanitizer'

window.addEventListener('error', event => {
  const sanitized = sanitizeError(event.error)
  // Send to error tracking service
  errorTracker.report(sanitized)
})
```

### Analytics

```typescript
import { sanitizeObject } from '@monorepo/pii-sanitizer'

function trackEvent(eventName: string, properties: Record<string, unknown>) {
  const sanitized = sanitizeObject(properties)
  analytics.track(eventName, sanitized)
}
```

### API Request Logging

```typescript
import { sanitizeHeaders, sanitizeUrl } from '@monorepo/pii-sanitizer'

function logRequest(req: Request) {
  const sanitizedHeaders = sanitizeHeaders(req.headers)
  const sanitizedUrl = sanitizeUrl(req.url)

  logger.info('API request', {
    url: sanitizedUrl,
    headers: sanitizedHeaders,
  })
}
```

## License

MIT
