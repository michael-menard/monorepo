import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isTokenExpired,
  refreshToken,
  getToken,
  setToken,
  removeToken,
  getTokenExpiry,
  shouldRefreshToken,
  refreshTokenWithRetry,
  clearRefreshState
} from '../token';

// Mock fetch globally
// Note: We use fetch here instead of RTK Query because this utility function
// needs to work outside of React components, and RTK Query's initiate method
// has complex typing when used in utility functions
global.fetch = vi.fn();

describe('token utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRefreshState();
  });

  describe('isTokenExpired', () => {
    it('returns true for expired JWT', () => {
      // exp in the past
      const expiredToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 1000 })),
        'signature',
      ].join('.');
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('returns false for valid JWT', () => {
      // exp in the future
      const validToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
        'signature',
      ].join('.');
      expect(isTokenExpired(validToken)).toBe(false);
    });

    it('returns true for invalid JWT', () => {
      expect(isTokenExpired('invalid.token.here')).toBe(true);
    });
  });

  describe('getTokenExpiry', () => {
    it('returns expiry time for valid JWT', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify({ exp })),
        'signature',
      ].join('.');

      expect(getTokenExpiry(token)).toBe(exp * 1000); // Convert to milliseconds
    });

    it('returns null for invalid JWT', () => {
      expect(getTokenExpiry('invalid.token.here')).toBeNull();
    });
  });

  describe('shouldRefreshToken', () => {
    it('returns true when token expires soon', () => {
      const exp = Math.floor((Date.now() + 4 * 60 * 1000) / 1000); // 4 minutes from now
      const token = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify({ exp })),
        'signature',
      ].join('.');
      expect(shouldRefreshToken(token)).toBe(true);
    });

    it('returns false when token has plenty of time', () => {
      const exp = Math.floor((Date.now() + 10 * 60 * 1000) / 1000); // 10 minutes from now
      const token = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify({ exp })),
        'signature',
      ].join('.');
      expect(shouldRefreshToken(token)).toBe(false);
    });

    it('returns true for invalid token', () => {
      expect(shouldRefreshToken('invalid.token.here')).toBe(true);
    });
  });

  describe('refreshToken', () => {
    it('successfully refreshes token', async () => {
      const mockResponse = {
        data: {
          tokens: {
            accessToken: 'new.access.token',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await refreshToken();
      expect(result).toBe('new.access.token');
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('returns null when refresh fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await refreshToken();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('returns null when refresh throws error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await refreshToken();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('deduplicates concurrent refresh requests', async () => {
      const mockResponse = {
        data: {
          tokens: {
            accessToken: 'new.access.token',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Start two concurrent refresh requests
      const promise1 = refreshToken();
      const promise2 = refreshToken();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('new.access.token');
      expect(result2).toBe('new.access.token');
      // Should only call the API once due to deduplication
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshTokenWithRetry', () => {
    it('succeeds on first attempt', async () => {
      const mockResponse = {
        data: {
          tokens: {
            accessToken: 'new.access.token',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await refreshTokenWithRetry();
      expect(result).toBe('new.access.token');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    }, 10000); // Increase timeout for retry test

    it('retries on failure and eventually succeeds', async () => {
      const mockResponse = {
        data: {
          tokens: {
            accessToken: 'new.access.token',
          },
        },
      };

      // Fail first two times, succeed on third
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

      const result = await refreshTokenWithRetry();
      expect(result).toBe('new.access.token');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout for retry test

    it('gives up after max attempts', async () => {
      // Mock fetch to always fail with a response that doesn't have a token
      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: { tokens: { accessToken: null } } })
        })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await refreshTokenWithRetry();

      expect(result).toBeNull();
      // Should make 3 attempts (max attempts)
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledTimes(4); // 4 attempts = 4 error logs
      consoleSpy.mockRestore();
    }, 15000);
  });

  describe('getToken', () => {
    it('returns null for HTTP-only cookies', () => {
      expect(getToken()).toBeNull();
    });
  });

  describe('setToken', () => {
    it('logs warning for HTTP-only cookies', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setToken('test.token.here');
      expect(consoleSpy).toHaveBeenCalledWith('setToken: HTTP-only cookies should be set by server response, not client-side');
      consoleSpy.mockRestore();
    });
  });

  describe('removeToken', () => {
    it('logs warning for HTTP-only cookies', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      removeToken();
      expect(consoleSpy).toHaveBeenCalledWith('removeToken: HTTP-only cookies should be removed by server logout endpoint');
      consoleSpy.mockRestore();
    });
  });

  describe('clearRefreshState', () => {
    it('clears refresh promise', () => {
      // This is mainly for testing purposes
      clearRefreshState();
      expect(true).toBe(true); // Just verify the function doesn't throw
    });
  });
}); 