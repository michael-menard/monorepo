# Token Management Utilities

This module provides comprehensive token management utilities for handling JWT tokens with HTTP-only cookies and RTK Query integration.

## Features

- **HTTP-only Cookie Support**: Secure token storage using HTTP-only cookies
- **RTK Query Integration**: Seamless integration with RTK Query for token refresh
- **Automatic Retry Logic**: Exponential backoff retry mechanism for failed refresh attempts
- **Zod Schema Validation**: Type-safe token validation and response parsing
- **Token Expiry Management**: Automatic detection and handling of token expiration
- **Deduplication**: Prevents multiple simultaneous refresh attempts

## API Reference

### Core Functions

#### `getToken(): string | null`
Returns the current token. For HTTP-only cookies, this always returns `null` as tokens are not accessible from client-side JavaScript.

#### `setToken(token: string): void`
Sets a token. For HTTP-only cookies, this logs a warning as tokens should be set by server responses.

#### `removeToken(): void`
Removes a token. For HTTP-only cookies, this logs a warning as tokens should be removed by server logout endpoints.

#### `parseTokenPayload(token: string): TokenInfo | null`
Safely parses a JWT token payload and validates it against the `TokenInfoSchema`.

**Returns**: Parsed token information or `null` if invalid.

#### `isTokenExpired(token: string): boolean`
Checks if a JWT token is expired.

**Returns**: `true` if expired or invalid, `false` if valid.

#### `getTokenExpiry(token: string): number | null`
Gets the expiry time of a token in milliseconds.

**Returns**: Expiry timestamp in milliseconds or `null` if invalid.

#### `shouldRefreshToken(token: string): boolean`
Determines if a token should be refreshed based on the configured threshold.

**Returns**: `true` if token expires within the refresh threshold, `false` otherwise.

#### `getTimeUntilExpiry(token: string): number | null`
Calculates the time remaining until token expiry.

**Returns**: Time in milliseconds until expiry, `0` if expired, or `null` if invalid.

### Token Refresh Functions

#### `refreshToken(): Promise<string | null>`
Refreshes the current token using RTK Query. Includes deduplication to prevent multiple simultaneous refresh attempts.

**Returns**: New access token or `null` if refresh failed.

#### `refreshTokenWithRetry(): Promise<string | null>`
Refreshes the token with automatic retry logic and exponential backoff.

**Returns**: New access token or `null` if all retry attempts failed.

### Token Validation Functions

#### `isTokenValid(token: string): boolean`
Comprehensive token validation checking format, expiration, and structure.

**Returns**: `true` if token is valid and not expired, `false` otherwise.

#### `getTokenSubject(token: string): string | null`
Extracts the subject (user ID) from a token.

**Returns**: User ID or `null` if invalid.

#### `getTokenIssuer(token: string): string | null`
Extracts the issuer from a token.

**Returns**: Issuer or `null` if not present or invalid.

### Configuration Functions

#### `getTokenConfig(): TokenConfig`
Returns the current token configuration.

#### `updateTokenConfig(config: Partial<TokenConfig>): void`
Updates the token configuration.

#### `clearRefreshState(): void`
Clears the refresh state (useful for testing and logout).

## Zod Schemas

### `TokenConfigSchema`
Validates token configuration:
```typescript
{
  refreshThreshold: number, // 1 second to 5 minutes
  maxRefreshAttempts: number, // 1 to 10
  retryDelayBase: number // 100ms to 10 seconds
}
```

### `TokenRefreshResponseSchema`
Validates token refresh API responses:
```typescript
{
  success: boolean,
  message: string,
  data?: {
    tokens?: {
      accessToken: string,
      refreshToken: string,
      expiresIn: number
    }
  }
}
```

### `TokenInfoSchema`
Validates JWT token payload:
```typescript
{
  exp: number, // Expiration timestamp
  iat: number, // Issued at timestamp
  sub: string, // Subject (user ID)
  iss?: string, // Issuer (optional)
  aud?: string // Audience (optional)
}
```

## Configuration

Default configuration:
```typescript
{
  refreshThreshold: 5 * 60 * 1000, // 5 minutes
  maxRefreshAttempts: 3,
  retryDelayBase: 1000 // 1 second
}
```

## Usage Examples

### Basic Token Validation
```typescript
import { isTokenValid, isTokenExpired } from './token.js';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

if (isTokenValid(token)) {
  console.log('Token is valid');
} else if (isTokenExpired(token)) {
  console.log('Token is expired');
} else {
  console.log('Token is invalid');
}
```

### Automatic Token Refresh
```typescript
import { refreshToken, refreshTokenWithRetry } from './token.js';

// Simple refresh
const newToken = await refreshToken();

// Refresh with retry logic
const newToken = await refreshTokenWithRetry();
```

### Token Information Extraction
```typescript
import { getTokenSubject, getTokenIssuer, getTokenExpiry } from './token.js';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const userId = getTokenSubject(token);
const issuer = getTokenIssuer(token);
const expiry = getTokenExpiry(token);

console.log(`User: ${userId}, Issuer: ${issuer}, Expires: ${new Date(expiry)}`);
```

### Configuration Management
```typescript
import { getTokenConfig, updateTokenConfig } from './token.js';

// Get current config
const config = getTokenConfig();
console.log('Current refresh threshold:', config.refreshThreshold);

// Update config
updateTokenConfig({ refreshThreshold: 2 * 60 * 1000 }); // 2 minutes
```

## Security Considerations

1. **HTTP-only Cookies**: Tokens are stored in HTTP-only cookies for security
2. **Server-side Management**: Token setting and removal should be handled by server endpoints
3. **Automatic Refresh**: Tokens are automatically refreshed before expiration
4. **Deduplication**: Prevents multiple simultaneous refresh attempts
5. **Exponential Backoff**: Retry logic uses exponential backoff to prevent server overload

## RTK Query Integration

The token utilities are designed to work seamlessly with RTK Query:

1. **Store Integration**: Uses the Redux store to dispatch refresh actions
2. **Response Validation**: Validates API responses using Zod schemas
3. **Error Handling**: Proper error handling for failed refresh attempts
4. **Type Safety**: Full TypeScript support with Zod schema validation

## Testing

The module includes comprehensive tests covering:
- Token parsing and validation
- Expiry detection
- Refresh logic with retry
- RTK Query integration
- Zod schema validation
- Error handling scenarios

Run tests with:
```bash
pnpm vitest run src/utils/__tests__/token.test.ts
```

## Error Handling

The utilities handle various error scenarios:
- Invalid JWT format
- Expired tokens
- Network failures during refresh
- Invalid API responses
- Configuration errors

All errors are logged to the console for debugging purposes. 