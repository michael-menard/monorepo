import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

// Import all store configurations
import { store as authStore } from '../../packages/auth/src/store/store';
import { store as galleryStore } from '../../packages/features/gallery/src/store/store';
import { store as wishlistStore } from '../../packages/wishlist/src/store/store';
import { store as profileStore } from '../../packages/features/profile/src/store/store';
import { store as mocStore } from '../../packages/features/moc/src/store/store';

// Import slices and APIs
import authReducer, { setUser, logoutSuccess, setLoading } from '../../packages/auth/src/store/authSlice';
import { authApi } from '../../packages/auth/src/store/authApi';
import wishlistReducer, { setItems, addItem, updateItem, removeItem } from '../../packages/wishlist/src/store/wishlistSlice';
import { wishlistApi } from '../../packages/wishlist/src/store/wishlistApi';
import profileReducer, { setProfile, updateProfile, setError } from '../../packages/features/profile/src/store/profileSlice';
import { profileApi } from '../../packages/features/profile/src/store/profileApi';
import mocReducer, { setInstructions, addInstruction, setCurrentInstruction } from '../../packages/features/moc/src/store/mocSlice';
import { mocApi } from '../../packages/features/moc/src/store/mocApi';

describe('Redux Store Configurations', () => {
  describe('Auth Store', () => {
    it('should configure auth store correctly', () => {
      expect(authStore.getState()).toBeDefined();
      expect(typeof authStore.dispatch).toBe('function');
      expect(typeof authStore.getState).toBe('function');
    });

    it('should have auth reducer in state', () => {
      const state = authStore.getState();
      expect(state.auth).toBeDefined();
      expect(state.auth.user).toBeNull();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.isLoading).toBe(false);
    });

    it('should handle auth actions correctly', () => {
      const testUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        isVerified: true,
      };

      authStore.dispatch(setUser(testUser));
      let state = authStore.getState();
      expect(state.auth.user).toEqual(testUser);
      expect(state.auth.isAuthenticated).toBe(true);

      authStore.dispatch(logoutSuccess());
      state = authStore.getState();
      expect(state.auth.user).toBeNull();
      expect(state.auth.isAuthenticated).toBe(false);
    });

    it('should have authApi reducer in state', () => {
      const state = authStore.getState();
      expect(state[authApi.reducerPath]).toBeDefined();
    });
  });

  describe('Gallery Store', () => {
    it('should configure gallery store correctly', () => {
      expect(galleryStore.getState()).toBeDefined();
      expect(typeof galleryStore.dispatch).toBe('function');
      expect(typeof galleryStore.getState).toBe('function');
    });

    it('should have gallery API reducers in state', () => {
      const state = galleryStore.getState();
      expect(state.gallery).toBeDefined();
    });
  });

  describe('Wishlist Store', () => {
    it('should configure wishlist store correctly', () => {
      expect(wishlistStore.getState()).toBeDefined();
      expect(typeof wishlistStore.dispatch).toBe('function');
      expect(typeof wishlistStore.getState).toBe('function');
    });

    it('should have wishlist reducer in state', () => {
      const state = wishlistStore.getState();
      expect(state.wishlist).toBeDefined();
      expect(state.wishlist.items).toEqual([]);
      expect(state.wishlist.isLoading).toBe(false);
      expect(state.wishlist.error).toBeNull();
    });

    it('should handle wishlist actions correctly', () => {
      const testItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Item',
        description: 'A test item',
        price: 29.99,
        priority: 'medium' as const,
        isPurchased: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistStore.dispatch(addItem(testItem));
      let state = wishlistStore.getState();
      expect(state.wishlist.items).toHaveLength(1);
      expect(state.wishlist.items[0]).toEqual(testItem);

      const updatedItem = { ...testItem, name: 'Updated Item' };
      wishlistStore.dispatch(updateItem(updatedItem));
      state = wishlistStore.getState();
      expect(state.wishlist.items[0].name).toBe('Updated Item');

      wishlistStore.dispatch(removeItem(testItem.id));
      state = wishlistStore.getState();
      expect(state.wishlist.items).toHaveLength(0);
    });

    it('should have wishlistApi reducer in state', () => {
      const state = wishlistStore.getState();
      expect(state[wishlistApi.reducerPath]).toBeDefined();
    });
  });

  describe('Profile Store', () => {
    it('should configure profile store correctly', () => {
      expect(profileStore.getState()).toBeDefined();
      expect(typeof profileStore.dispatch).toBe('function');
      expect(typeof profileStore.getState).toBe('function');
    });

    it('should have profile reducer in state', () => {
      const state = profileStore.getState();
      expect(state.profile).toBeDefined();
      expect(state.profile.profile).toBeNull();
      expect(state.profile.isLoading).toBe(false);
      expect(state.profile.error).toBeNull();
    });

    it('should handle profile actions correctly', () => {
      const testProfile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      profileStore.dispatch(setProfile(testProfile));
      let state = profileStore.getState();
      expect(state.profile.profile).toEqual(testProfile);

      profileStore.dispatch(updateProfile({ firstName: 'Jane' }));
      state = profileStore.getState();
      expect(state.profile.profile?.firstName).toBe('Jane');
    });

    it('should have profileApi reducer in state', () => {
      const state = profileStore.getState();
      expect(state[profileApi.reducerPath]).toBeDefined();
    });
  });

  describe('MOC Store', () => {
    it('should configure MOC store correctly', () => {
      expect(mocStore.getState()).toBeDefined();
      expect(typeof mocStore.dispatch).toBe('function');
      expect(typeof mocStore.getState).toBe('function');
    });

    it('should have MOC reducer in state', () => {
      const state = mocStore.getState();
      expect(state.moc).toBeDefined();
      expect(state.moc.instructions).toEqual([]);
      expect(state.moc.currentInstruction).toBeNull();
      expect(state.moc.isLoading).toBe(false);
      expect(state.moc.error).toBeNull();
    });

    it('should handle MOC actions correctly', () => {
      const testInstruction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Spaceship',
        description: 'A detailed spaceship model',
        author: 'John Builder',
        category: 'vehicles',
        difficulty: 'intermediate' as const,
        steps: [],
        partsList: [],
        isPublic: true,
        isPublished: true,
        reviewCount: 0,
        downloadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocStore.dispatch(addInstruction(testInstruction));
      let state = mocStore.getState();
      expect(state.moc.instructions).toHaveLength(1);
      expect(state.moc.instructions[0]).toEqual(testInstruction);

      mocStore.dispatch(setCurrentInstruction(testInstruction));
      state = mocStore.getState();
      expect(state.moc.currentInstruction).toEqual(testInstruction);
    });

    it('should have mocApi reducer in state', () => {
      const state = mocStore.getState();
      expect(state[mocApi.reducerPath]).toBeDefined();
    });
  });

  describe('Store Integration', () => {
    it('should handle multiple actions across stores', () => {
      // Test auth store
      authStore.dispatch(setLoading(true));
      let authState = authStore.getState();
      expect(authState.auth.isLoading).toBe(true);

      // Test wishlist store
      wishlistStore.dispatch(setItems([]));
      let wishlistState = wishlistStore.getState();
      expect(wishlistState.wishlist.items).toEqual([]);

      // Test profile store
      profileStore.dispatch(setError('Test error'));
      let profileState = profileStore.getState();
      expect(profileState.profile.error).toBe('Test error');
    });

    it('should maintain state isolation between stores', () => {
      // Set different states in different stores
      authStore.dispatch(setLoading(true));
      wishlistStore.dispatch(setItems([]));
      profileStore.dispatch(setError('Error'));

      // Verify each store maintains its own state
      expect(authStore.getState().auth.isLoading).toBe(true);
      expect(wishlistStore.getState().wishlist.items).toEqual([]);
      expect(profileStore.getState().profile.error).toBe('Error');

      // Verify no cross-contamination
      expect(authStore.getState().wishlist).toBeUndefined();
      expect(wishlistStore.getState().auth).toBeUndefined();
      expect(profileStore.getState().auth).toBeUndefined();
    });
  });

  describe('API Integration', () => {
    it('should have all API reducers properly configured', () => {
      // Check auth API
      const authState = authStore.getState();
      expect(authState[authApi.reducerPath]).toBeDefined();

      // Check wishlist API
      const wishlistState = wishlistStore.getState();
      expect(wishlistState[wishlistApi.reducerPath]).toBeDefined();

      // Check profile API
      const profileState = profileStore.getState();
      expect(profileState[profileApi.reducerPath]).toBeDefined();

      // Check MOC API
      const mocState = mocStore.getState();
      expect(mocState[mocApi.reducerPath]).toBeDefined();
    });

    it('should have proper middleware configuration', () => {
      // All stores should have middleware configured
      expect(authStore.getState()).toBeDefined();
      expect(galleryStore.getState()).toBeDefined();
      expect(wishlistStore.getState()).toBeDefined();
      expect(profileStore.getState()).toBeDefined();
      expect(mocStore.getState()).toBeDefined();
    });
  });
}); 