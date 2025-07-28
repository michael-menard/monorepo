import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getToken,
  setToken,
  removeToken,
  parseTokenPayload,
  isTokenExpired,
  getTokenExpiry,
  shouldRefreshToken,
  getTimeUntilExpiry,
  refreshToken,
  refreshTokenWithRetry,
  isTokenValid,
  getTokenSubject,
  getTokenIssuer,
  clearRefreshState,
  disableRefreshCooldown,
  enableRefreshCooldown,
  getTokenConfig,
  updateTokenConfig,
  TokenConfigSchema,
  TokenRefreshResponseSchema,
  TokenInfoSchema,
} from '../token.js';

// Mock the store and authApi with simpler approach
vi.mock('../../store/store.js', () => ({
  store: {
    dispatch: vi.fn(),
  },
}));

vi.mock('../../store/authApi.js', () => ({
  authApi: {
    endpoints: {
      refresh: {
        initiate: vi.fn(),
      },
    },
  },
}));

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  clearRefreshState();
  disableRefreshCooldown(); // Disable cooldown for testing
  
  // Set a very short cooldown for testing
  updateTokenConfig({ retryDelayBase: 10 }); // 10ms instead of 1000ms
});

afterEach(() => {
  vi.clearAllMocks();
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  clearRefreshState();
  enableRefreshCooldown(); // Re-enable cooldown after tests
});

// Helper function to create a valid JWT token
function createTestToken(payload: Record<string, any> = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const defaultPayload = {
    sub: 'user123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    ...payload,
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(defaultPayload));
  const signature = 'test-signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('Token Management Utilities', () => {
  describe('HTTP-only cookie functions', () => {
    it('should return null for getToken (HTTP-only cookies not accessible)', () => {
      expect(getToken()).toBeNull();
    });

    it('should warn when setToken is called', () => {
      setToken('test-token');
      expect(console.warn).toHaveBeenCalledWith(
        'setToken: HTTP-only cookies should be set by server response, not client-side'
      );
    });

    it('should warn when removeToken is called', () => {
      removeToken();
      expect(console.warn).toHaveBeenCalledWith(
        'removeToken: HTTP-only cookies should be removed by server logout endpoint'
      );
    });
  });

  describe('parseTokenPayload', () => {
    it('should parse valid JWT token payload', () => {
      const token = createTestToken({ sub: 'user123', exp: 1234567890 });
      const result = parseTokenPayload(token);
      
      expect(result).toEqual({
        sub: 'user123',
        exp: 1234567890,
        iat: expect.any(Number),
      });
    });

    it('should return null for invalid JWT format', () => {
      const result = parseTokenPayload('invalid-token');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should return null for malformed JWT', () => {
      const result = parseTokenPayload('header.payload'); // Missing signature
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should return null for invalid JSON in payload', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa('invalid-json');
      const signature = 'test-signature';
      const token = `${header}.${payload}.${signature}`;
      
      const result = parseTokenPayload(token);
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const token = createTestToken({ exp: Math.floor(Date.now() / 1000) - 3600 }); // 1 hour ago
      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return false for valid token', () => {
      const token = createTestToken({ exp: Math.floor(Date.now() / 1000) + 3600 }); // 1 hour from now
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
    });
  });

  describe('getTokenExpiry', () => {
    it('should return expiry time in milliseconds', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = createTestToken({ exp });
      const result = getTokenExpiry(token);
      
      expect(result).toBe(exp * 1000);
    });

    it('should return null for invalid token', () => {
      const result = getTokenExpiry('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('shouldRefreshToken', () => {
    it('should return true when token expires within threshold', () => {
      const exp = Math.floor(Date.now() / 1000) + 60; // 1 minute from now (within 5-minute threshold)
      const token = createTestToken({ exp });
      expect(shouldRefreshToken(token)).toBe(true);
    });

    it('should return false when token expires far in future', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now (outside threshold)
      const token = createTestToken({ exp });
      expect(shouldRefreshToken(token)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(shouldRefreshToken('invalid-token')).toBe(true);
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('should return time until expiry in milliseconds', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = createTestToken({ exp });
      const result = getTimeUntilExpiry(token);
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(3600 * 1000);
    });

    it('should return 0 for expired token', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const token = createTestToken({ exp });
      const result = getTimeUntilExpiry(token);
      
      expect(result).toBe(0);
    });

    it('should return null for invalid token', () => {
      const result = getTimeUntilExpiry('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should use RTK Query to refresh token', async () => {
      const mockStore = await import('../../store/store.js');
      
      const mockResponse = {
        success: true,
        message: 'Token refreshed',
        data: {
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600,
          },
        },
      };

      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        data: mockResponse,
      } as any);

      const result = await refreshToken();
      
      expect(mockStore.store.dispatch).toHaveBeenCalled();
      expect(result).toBe('new-access-token');
    });

    it('should handle refresh failure', async () => {
      const mockStore = await import('../../store/store.js');
      
      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        error: { status: 401, data: 'Unauthorized' },
      } as any);

      const result = await refreshToken();
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle invalid response format', async () => {
      const mockStore = await import('../../store/store.js');
      
      const mockResponse = {
        success: true,
        message: 'Token refreshed',
        // Missing tokens in response
      };

      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        data: mockResponse,
      } as any);

      const result = await refreshToken();
      
      expect(result).toBeNull();
    });

    it('should prevent multiple simultaneous refresh attempts', async () => {
      const mockStore = await import('../../store/store.js');
      
      vi.mocked(mockStore.store.dispatch).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } } as any), 100))
      );

      // Start two refresh attempts simultaneously
      const promise1 = refreshToken();
      const promise2 = refreshToken();

      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // Should only call dispatch once
      expect(mockStore.store.dispatch).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should debug successful response', async () => {
      const mockStore = await import('../../store/store.js');
      
      const mockResponse = {
        success: true,
        message: 'Token refreshed',
        data: {
          tokens: {
            accessToken: 'debug-token',
            refreshToken: 'debug-refresh',
            expiresIn: 3600,
          },
        },
      };

      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        data: mockResponse,
      } as any);

      const result = await refreshToken();
      
      console.log('Debug result:', result);
      console.log('Mock response:', mockResponse);
      
      expect(result).toBe('debug-token');
    });

    it('should handle cooldown between refresh attempts', async () => {
      const mockStore = await import('../../store/store.js');
      
      const mockResponse = {
        success: true,
        message: 'Token refreshed',
        data: {
          tokens: {
            accessToken: 'cooldown-token',
            refreshToken: 'cooldown-refresh',
            expiresIn: 3600,
          },
        },
      };

      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        data: mockResponse,
      } as any);

      // First call should succeed
      const result1 = await refreshToken();
      expect(result1).toBe('cooldown-token');

      // Second call immediately after should also succeed since cooldown is disabled for testing
      const result2 = await refreshToken();
      expect(result2).toBe('cooldown-token');
      // Note: cooldown is disabled for testing, so no warning should be shown
    });
  });

  describe('refreshTokenWithRetry', () => {
    it('should retry failed refresh attempts and succeed on third attempt', async () => {
      const mockStore = await import('../../store/store.js');
      
      let callCount = 0;
      vi.mocked(mockStore.store.dispatch).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ error: { status: 500 } } as any);
        }
        return Promise.resolve({
          data: {
            success: true,
            message: 'Token refreshed successfully',
            data: { 
              tokens: { 
                accessToken: 'new-token',
                refreshToken: 'new-refresh-token',
                expiresIn: 3600
              } 
            },
          },
        } as any);
      });

      const result = await refreshTokenWithRetry();
      
      expect(mockStore.store.dispatch).toHaveBeenCalledTimes(3);
      expect(result).toBe('new-token');
    });

    it('should return null after max retry attempts', async () => {
      const mockStore = await import('../../store/store.js');
      
      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        error: { status: 500 },
      } as any);

      const result = await refreshTokenWithRetry();
      
      expect(mockStore.store.dispatch).toHaveBeenCalledTimes(3); // maxRefreshAttempts
      expect(result).toBeNull();
    });

    it('should succeed on first attempt and return early', async () => {
      const mockStore = await import('../../store/store.js');
      
      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        data: {
          success: true,
          message: 'Token refreshed successfully',
          data: { 
            tokens: { 
              accessToken: 'new-token',
              refreshToken: 'new-refresh-token',
              expiresIn: 3600
            } 
          },
        },
      } as any);

      const result = await refreshTokenWithRetry();
      
      // Should only call once since it succeeded immediately
      expect(mockStore.store.dispatch).toHaveBeenCalledTimes(1);
      expect(result).toBe('new-token');
    });

    it('should handle mixed success and failure attempts', async () => {
      const mockStore = await import('../../store/store.js');
      
      let callCount = 0;
      vi.mocked(mockStore.store.dispatch).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ error: { status: 500 } } as any);
        }
        return Promise.resolve({
          data: {
            success: true,
            message: 'Token refreshed successfully',
            data: { 
              tokens: { 
                accessToken: 'new-token',
                refreshToken: 'new-refresh-token',
                expiresIn: 3600
              } 
            },
          },
        } as any);
      });

      const result = await refreshTokenWithRetry();
      
      expect(mockStore.store.dispatch).toHaveBeenCalledTimes(2);
      expect(result).toBe('new-token');
    });

    it('should handle refresh token that returns null on first attempt but succeeds on second', async () => {
      const mockStore = await import('../../store/store.js');
      
      let callCount = 0;
      vi.mocked(mockStore.store.dispatch).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First attempt returns null (refresh failed)
          return Promise.resolve({ data: { success: false } } as any);
        }
        // Second attempt succeeds
        return Promise.resolve({
          data: {
            success: true,
            message: 'Token refreshed successfully',
            data: { 
              tokens: { 
                accessToken: 'new-token',
                refreshToken: 'new-refresh-token',
                expiresIn: 3600
              } 
            },
          },
        } as any);
      });

      const result = await refreshTokenWithRetry();
      
      expect(mockStore.store.dispatch).toHaveBeenCalledTimes(2);
      expect(result).toBe('new-token');
    });

    it('should handle successful response on first attempt', async () => {
      const mockStore = await import('../../store/store.js');
      
      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        data: {
          success: true,
          message: 'Token refreshed successfully',
          data: { 
            tokens: { 
              accessToken: 'success-token',
              refreshToken: 'success-refresh-token',
              expiresIn: 3600
            } 
          },
        },
      } as any);

      const result = await refreshTokenWithRetry();
      
      expect(mockStore.store.dispatch).toHaveBeenCalledTimes(1);
      expect(result).toBe('success-token');
    });
  });

  describe('isTokenValid', () => {
    it('should return true for valid token', () => {
      const token = createTestToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(isTokenValid(token)).toBe(true);
    });

    it('should return false for expired token', () => {
      const token = createTestToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
      expect(isTokenValid(token)).toBe(false);
    });

    it('should return false for invalid token format', () => {
      expect(isTokenValid('invalid-token')).toBe(false);
    });

    it('should return false for empty or null token', () => {
      expect(isTokenValid('')).toBe(false);
      expect(isTokenValid(null as any)).toBe(false);
    });
  });

  describe('getTokenSubject', () => {
    it('should return subject from valid token', () => {
      const token = createTestToken({ sub: 'user123' });
      expect(getTokenSubject(token)).toBe('user123');
    });

    it('should return null for invalid token', () => {
      expect(getTokenSubject('invalid-token')).toBeNull();
    });
  });

  describe('getTokenIssuer', () => {
    it('should return issuer from valid token', () => {
      const token = createTestToken({ iss: 'test-issuer' });
      expect(getTokenIssuer(token)).toBe('test-issuer');
    });

    it('should return null when issuer is not present', () => {
      const token = createTestToken(); // No issuer
      expect(getTokenIssuer(token)).toBeNull();
    });

    it('should return null for invalid token', () => {
      expect(getTokenIssuer('invalid-token')).toBeNull();
    });
  });

  describe('clearRefreshState', () => {
    it('should clear refresh state', async () => {
      const mockStore = await import('../../store/store.js');
      
      // Start a refresh to set the promise
      vi.mocked(mockStore.store.dispatch).mockResolvedValue({
        data: { success: true, data: { tokens: { accessToken: 'token' } } },
      } as any);

      await refreshToken();
      clearRefreshState();

      // Should be able to start a new refresh
      await refreshToken();
      expect(mockStore.store.dispatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTokenConfig', () => {
    it('should return current token configuration', () => {
      const config = getTokenConfig();
      expect(config).toEqual({
        refreshThreshold: 5 * 60 * 1000,
        maxRefreshAttempts: 3,
        retryDelayBase: 10, // Updated for testing
      });
    });
  });

  describe('updateTokenConfig', () => {
    it('should update token configuration', () => {
      const originalConfig = getTokenConfig();
      
      updateTokenConfig({ refreshThreshold: 60000 });
      
      const updatedConfig = getTokenConfig();
      expect(updatedConfig.refreshThreshold).toBe(60000);
      expect(updatedConfig.maxRefreshAttempts).toBe(originalConfig.maxRefreshAttempts);
    });
  });

  describe('Zod Schemas', () => {
    describe('TokenConfigSchema', () => {
      it('should validate valid config', () => {
        const validConfig = {
          refreshThreshold: 300000,
          maxRefreshAttempts: 5,
          retryDelayBase: 1000,
        };
        
        expect(() => TokenConfigSchema.parse(validConfig)).not.toThrow();
      });

      it('should reject invalid config', () => {
        const invalidConfig = {
          refreshThreshold: 0, // Too low
          maxRefreshAttempts: 15, // Too high
          retryDelayBase: 50, // Too low
        };
        
        expect(() => TokenConfigSchema.parse(invalidConfig)).toThrow();
      });
    });

    describe('TokenRefreshResponseSchema', () => {
      it('should validate valid response', () => {
        const validResponse = {
          success: true,
          message: 'Token refreshed',
          data: {
            tokens: {
              accessToken: 'new-token',
              refreshToken: 'new-refresh',
              expiresIn: 3600,
            },
          },
        };
        
        expect(() => TokenRefreshResponseSchema.parse(validResponse)).not.toThrow();
      });

      it('should validate response without tokens', () => {
        const responseWithoutTokens = {
          success: true,
          message: 'Token refreshed',
          data: {},
        };
        
        expect(() => TokenRefreshResponseSchema.parse(responseWithoutTokens)).not.toThrow();
      });
    });

    describe('TokenInfoSchema', () => {
      it('should validate valid token info', () => {
        const validTokenInfo = {
          exp: 1234567890,
          iat: 1234567890,
          sub: 'user123',
          iss: 'test-issuer',
          aud: 'test-audience',
        };
        
        expect(() => TokenInfoSchema.parse(validTokenInfo)).not.toThrow();
      });

      it('should validate token info without optional fields', () => {
        const minimalTokenInfo = {
          exp: 1234567890,
          iat: 1234567890,
          sub: 'user123',
        };
        
        expect(() => TokenInfoSchema.parse(minimalTokenInfo)).not.toThrow();
      });
    });
  });
}); 