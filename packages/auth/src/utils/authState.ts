import type { User } from '../types/auth.js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  lastUpdated: number;
}

const AUTH_STATE_KEY = 'auth_state';

export const authStateManager = {
  // Get current auth state
  getAuthState(): AuthState {
    try {
      const stored = localStorage.getItem(AUTH_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          user: parsed.user || null,
          isAuthenticated: !!parsed.user,
          lastUpdated: parsed.lastUpdated || Date.now(),
        };
      }
    } catch (error) {
      console.warn('Failed to parse auth state:', error);
    }
    
    return {
      user: null,
      isAuthenticated: false,
      lastUpdated: Date.now(),
    };
  },

  // Set auth state
  setAuthState(user: User | null): void {
    try {
      const authState: AuthState = {
        user,
        isAuthenticated: !!user,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
    } catch (error) {
      console.warn('Failed to save auth state:', error);
    }
  },

  // Clear auth state
  clearAuthState(): void {
    try {
      localStorage.removeItem(AUTH_STATE_KEY);
    } catch (error) {
      console.warn('Failed to clear auth state:', error);
    }
  },

  // Check if auth state is valid (not expired)
  isAuthStateValid(maxAge: number = 24 * 60 * 60 * 1000): boolean {
    const state = this.getAuthState();
    if (!state.isAuthenticated) return false;
    
    const now = Date.now();
    const age = now - state.lastUpdated;
    return age < maxAge;
  },

  // Get user from auth state
  getUser(): User | null {
    return this.getAuthState().user;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getAuthState().isAuthenticated && this.isAuthStateValid();
  },
}; 