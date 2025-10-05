import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  clearMessage,
  setCheckingAuth,
  setMessage,
  updateSessionTimeout,
  resetAuthState,
  updateLastActivity,
  checkSessionTimeout,
  selectIsCheckingAuth,
  selectMessage,
  selectLastActivity,
  selectSessionTimeout,
  selectIsSessionExpired,
  selectTimeUntilSessionExpiry,
  initialState,
} from '../authSlice';

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
};

describe('Auth Slice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state).toEqual(initialState);
    });
  });

  describe('Reducers', () => {
    it('should handle clearMessage', () => {
      // Set a message first
      store.dispatch(setMessage('Test message'));
      expect(selectMessage(store.getState())).toBe('Test message');

      // Clear the message
      store.dispatch(clearMessage(undefined));
      expect(selectMessage(store.getState())).toBeNull();
    });

    it('should handle setCheckingAuth', () => {
      store.dispatch(setCheckingAuth(true));
      expect(selectIsCheckingAuth(store.getState())).toBe(true);

      store.dispatch(setCheckingAuth(false));
      expect(selectIsCheckingAuth(store.getState())).toBe(false);
    });

    it('should handle setMessage', () => {
      store.dispatch(setMessage('Test message'));
      expect(selectMessage(store.getState())).toBe('Test message');

      store.dispatch(setMessage(null));
      expect(selectMessage(store.getState())).toBeNull();
    });

    it('should handle updateSessionTimeout', () => {
      const newTimeout = 60 * 60 * 1000; // 1 hour
      store.dispatch(updateSessionTimeout(newTimeout));
      expect(selectSessionTimeout(store.getState())).toBe(newTimeout);
    });

    it('should handle resetAuthState', () => {
      // Set some state first
      store.dispatch(setMessage('Test message'));
      store.dispatch(setCheckingAuth(false));

      // Reset state
      store.dispatch(resetAuthState());

      expect(store.getState().auth).toEqual(initialState);
    });
  });

  describe('Async Thunks', () => {
    it('should handle updateLastActivity', async () => {
      const beforeTime = Date.now();
      await store.dispatch(updateLastActivity(undefined));
      const afterTime = Date.now();

      const lastActivity = selectLastActivity(store.getState());
      expect(lastActivity).toBeGreaterThanOrEqual(beforeTime);
      expect(lastActivity).toBeLessThanOrEqual(afterTime);
    });

    it('should handle checkSessionTimeout when session is valid', async () => {
      // Set last activity
      await store.dispatch(updateLastActivity(undefined));

      await store.dispatch(checkSessionTimeout(undefined));

      const lastActivity = selectLastActivity(store.getState());
      expect(lastActivity).toBeGreaterThan(0);
    });

    it('should handle checkSessionTimeout when session is expired', async () => {
      // Set short timeout
      store.dispatch(updateSessionTimeout(1000)); // 1 second timeout
      
      // Set last activity to 2 seconds ago
      const oldTime = Date.now() - 2000;
      store.dispatch(updateLastActivity.fulfilled(oldTime, '', undefined));

      await store.dispatch(checkSessionTimeout(undefined));

      expect(selectLastActivity(store.getState())).toBeNull();
      expect(selectMessage(store.getState())).toBe('Session expired');
    });

    it('should handle checkSessionTimeout when no last activity', async () => {
      await store.dispatch(checkSessionTimeout(undefined));

      const lastActivity = selectLastActivity(store.getState());
      expect(lastActivity).toBeGreaterThan(0);
    });
  });

  describe('Selectors', () => {
    it('should select isCheckingAuth correctly', () => {
      expect(selectIsCheckingAuth(store.getState())).toBe(true);
      
      store.dispatch(setCheckingAuth(false));
      expect(selectIsCheckingAuth(store.getState())).toBe(false);
    });

    it('should select message correctly', () => {
      expect(selectMessage(store.getState())).toBeNull();
      
      store.dispatch(setMessage('Test message'));
      expect(selectMessage(store.getState())).toBe('Test message');
    });

    it('should select lastActivity correctly', async () => {
      expect(selectLastActivity(store.getState())).toBeNull();
      
      await store.dispatch(updateLastActivity(undefined));
      expect(selectLastActivity(store.getState())).toBeGreaterThan(0);
    });

    it('should select sessionTimeout correctly', () => {
      expect(selectSessionTimeout(store.getState())).toBe(30 * 60 * 1000);
      
      const newTimeout = 60 * 60 * 1000;
      store.dispatch(updateSessionTimeout(newTimeout));
      expect(selectSessionTimeout(store.getState())).toBe(newTimeout);
    });

    it('should select isSessionExpired correctly', () => {
      expect(selectIsSessionExpired(store.getState())).toBe(false);
      
      // Set user and old last activity
      store.dispatch(updateSessionTimeout(1000)); // 1 second timeout
      
      const oldTime = Date.now() - 2000;
      store.dispatch(updateLastActivity.fulfilled(oldTime, '', undefined));
      
      expect(selectIsSessionExpired(store.getState())).toBe(true);
    });

    it('should select timeUntilSessionExpiry correctly', () => {
      expect(selectTimeUntilSessionExpiry(store.getState())).toBeNull();
      
      // Set recent activity
      store.dispatch(updateSessionTimeout(5000)); // 5 second timeout
      
      const recentTime = Date.now() - 1000; // 1 second ago
      store.dispatch(updateLastActivity.fulfilled(recentTime, '', undefined));
      
      const timeRemaining = selectTimeUntilSessionExpiry(store.getState());
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(4000); // Should be less than 4 seconds
    });
  });

  describe('State Transitions', () => {
    it('should handle complete auth check flow', () => {
      // Initial state
      expect(selectIsCheckingAuth(store.getState())).toBe(true);

      // Auth check completed
      store.dispatch(setCheckingAuth(false));

      expect(selectIsCheckingAuth(store.getState())).toBe(false);
    });

    it('should handle session management', async () => {
      // Update last activity
      await store.dispatch(updateLastActivity(undefined));
      expect(selectLastActivity(store.getState())).toBeGreaterThan(0);

      // Update session timeout
      const newTimeout = 60 * 60 * 1000;
      store.dispatch(updateSessionTimeout(newTimeout));
      expect(selectSessionTimeout(store.getState())).toBe(newTimeout);
    });

    it('should handle message state', () => {
      store.dispatch(setMessage('Authentication successful'));
      expect(selectMessage(store.getState())).toBe('Authentication successful');

      store.dispatch(clearMessage(undefined));
      expect(selectMessage(store.getState())).toBeNull();
    });
  });
}); 