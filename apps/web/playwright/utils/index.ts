/**
 * Playwright Test Utilities
 *
 * Re-exports all utility functions for easy importing in tests
 */

export {
  adminConfirmSignUp,
  adminDeleteUser,
  adminGetUser,
  generateTestEmail,
  cleanupTestUser,
} from './cognito-admin'

export {
  setupUploadMocks,
  setupSessionMock,
  setupAuthMock,
  clearMocks,
  mockResponses,
} from './api-mocks'

export {
  setupWishlistMocks,
  clearWishlistMocks,
  wishlistMockResponses,
  mockWishlistItems,
} from './wishlist-mocks'
export type { MockWishlistItem, MockWishlistListResponse, WishlistMockOptions } from './wishlist-mocks'
