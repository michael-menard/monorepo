import { z } from 'zod';
import { store } from '../store/store.js';
import { authApi } from '../store/authApi.js';

// Zod schemas for token management
export const TokenConfigSchema = z.object({
  refreshThreshold: z.number().min(1000).max(300000), // 1 second to 5 minutes
  maxRefreshAttempts: z.number().min(1).max(10),
  retryDelayBase: z.number().min(100).max(10000), // Base delay for exponential backoff
});

export const TokenRefreshResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z
    .object({
      tokens: z
        .object({
          accessToken: z.string(),
          refreshToken: z.string(),
          expiresIn: z.number(),
        })
        .optional(),
    })
    .optional(),
});

// Schema for successful token refresh responses
export const SuccessfulTokenRefreshResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    tokens: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number(),
    }),
  }),
});

export const TokenInfoSchema = z.object({
  exp: z.number(),
  iat: z.number(),
  sub: z.string(),
  iss: z.string().optional(),
  aud: z.string().optional(),
});

// Configuration for token management
const TOKEN_CONFIG = TokenConfigSchema.parse({
  refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  maxRefreshAttempts: 3,
  retryDelayBase: 1000, // 1 second base delay
});

let refreshPromise: Promise<string | null> | null = null;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 1000; // 1 second cooldown between refresh attempts
let disableCooldown = false; // For testing purposes

// TypeScript types from Zod schemas
export type TokenConfig = z.infer<typeof TokenConfigSchema>;
export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;
export type SuccessfulTokenRefreshResponse = z.infer<typeof SuccessfulTokenRefreshResponseSchema>;
export type TokenInfo = z.infer<typeof TokenInfoSchema>;

// Get token from cookies (client-side: only non-HTTP-only tokens are accessible)
export function getToken(): string | null {
  // For HTTP-only cookies, token is not accessible from JS. Use server-side or rely on API.
  return null;
}

// Set token in cookies (client-side: only non-HTTP-only tokens are accessible)
export function setToken(_token: string): void {
  // For HTTP-only cookies, set via server response only
  console.warn('setToken: HTTP-only cookies should be set by server response, not client-side');
}

// Remove token from cookies
export function removeToken(): void {
  // For HTTP-only cookies, removal should be handled by server logout endpoint
  console.warn('removeToken: HTTP-only cookies should be removed by server logout endpoint');
}

// Parse JWT token payload safely
export function parseTokenPayload(token: string): TokenInfo | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(atob(parts[1]));
    return TokenInfoSchema.parse(payload);
  } catch (error) {
    console.error('Error parsing JWT token payload:', error);
    return null;
  }
}

// Check if JWT token is expired
export function isTokenExpired(token: string): boolean {
  const payload = parseTokenPayload(token);
  if (!payload) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

// Get token expiry time in milliseconds
export function getTokenExpiry(token: string): number | null {
  const payload = parseTokenPayload(token);
  if (!payload) return null;

  return payload.exp * 1000; // Convert to milliseconds
}

// Check if token should be refreshed (within threshold of expiry)
export function shouldRefreshToken(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;

  const timeUntilExpiry = expiry - Date.now();
  return timeUntilExpiry <= TOKEN_CONFIG.refreshThreshold;
}

// Get time until token expiry in milliseconds
export function getTimeUntilExpiry(token: string): number | null {
  const expiry = getTokenExpiry(token);
  if (!expiry) return null;

  return Math.max(0, expiry - Date.now());
}

// Automatic token refresh using RTK Query
export async function refreshToken(): Promise<string | null> {
  // Prevent multiple simultaneous refresh attempts
  if (refreshPromise) {
    return refreshPromise;
  }

  // Implement cooldown to prevent rapid refresh attempts
  const now = Date.now();
  if (!disableCooldown && now - lastRefreshTime < REFRESH_COOLDOWN) {
    console.warn('Token refresh attempted too quickly, skipping');
    return null;
  }

  refreshPromise = (async () => {
    try {
      lastRefreshTime = now;

      // Use RTK Query's dispatch to trigger refresh
      const result = await store.dispatch(authApi.endpoints.refresh.initiate());

      if ('data' in result) {
        const response = result.data;

        // First validate the basic response structure
        const validatedResponse = TokenRefreshResponseSchema.parse(response);

        // If it's a successful response, validate it has the required tokens
        if (validatedResponse.success && validatedResponse.data?.tokens) {
          try {
            const successfulResponse = SuccessfulTokenRefreshResponseSchema.parse(response);
            return successfulResponse.data.tokens.accessToken;
          } catch (error) {
            console.error('Token refresh response validation failed:', error);
            return null;
          }
        }
      }

      if ('error' in result) {
        console.error('Token refresh failed:', result.error);
      }

      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    } finally {
      // Clear the promise so future calls can attempt refresh again
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Refresh token with retry logic and exponential backoff
export async function refreshTokenWithRetry(): Promise<string | null> {
  for (let attempt = 1; attempt <= TOKEN_CONFIG.maxRefreshAttempts; attempt++) {
    try {
      const result = await refreshToken();
      if (result !== null) {
        return result;
      }

      // If we get here, refresh failed but didn't throw
      console.error(`Token refresh attempt ${attempt} failed`);

      // Wait before retrying (exponential backoff)
      if (attempt < TOKEN_CONFIG.maxRefreshAttempts) {
        const delay = TOKEN_CONFIG.retryDelayBase * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Token refresh attempt ${attempt} error:`, error);

      // Wait before retrying (exponential backoff)
      if (attempt < TOKEN_CONFIG.maxRefreshAttempts) {
        const delay = TOKEN_CONFIG.retryDelayBase * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`Token refresh failed after ${TOKEN_CONFIG.maxRefreshAttempts} attempts`);
  return null;
}

// Check if a token is valid (not expired and properly formatted)
export function isTokenValid(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const payload = parseTokenPayload(token);
  if (!payload) {
    return false;
  }

  return !isTokenExpired(token);
}

// Get token subject (user ID) from token
export function getTokenSubject(token: string): string | null {
  const payload = parseTokenPayload(token);
  return payload?.sub || null;
}

// Get token issuer from token
export function getTokenIssuer(token: string): string | null {
  const payload = parseTokenPayload(token);
  return payload?.iss || null;
}

// Clear refresh state (useful for testing and logout)
export function clearRefreshState(): void {
  refreshPromise = null;
  lastRefreshTime = 0;
}

// Disable cooldown for testing (useful for unit tests)
export function disableRefreshCooldown(): void {
  disableCooldown = true;
}

// Enable cooldown (default behavior)
export function enableRefreshCooldown(): void {
  disableCooldown = false;
}

// Get current token configuration
export function getTokenConfig(): TokenConfig {
  return { ...TOKEN_CONFIG };
}

// Update token configuration (useful for testing)
export function updateTokenConfig(config: Partial<TokenConfig>): void {
  Object.assign(TOKEN_CONFIG, config);
}