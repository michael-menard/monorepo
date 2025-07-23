import { describe, it, expect, vi } from 'vitest';
import { isTokenExpired, refreshToken, getToken, setToken, removeToken } from '../token';

describe('token utilities', () => {
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
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 1000 })),
      'signature',
    ].join('.');
    expect(isTokenExpired(validToken)).toBe(false);
  });

  it('returns true for invalid JWT', () => {
    expect(isTokenExpired('invalid.token')).toBe(true);
  });

  it('getToken always returns null (HTTP-only cookie)', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken does not throw', () => {
    expect(() => setToken('token')).not.toThrow();
  });

  it('removeToken does not throw', () => {
    expect(() => removeToken()).not.toThrow();
  });

  it('refreshToken returns null (placeholder)', async () => {
    const result = await refreshToken();
    expect(result).toBeNull();
  });
}); 