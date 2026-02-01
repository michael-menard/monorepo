/**
 * API Test Fixtures
 *
 * Test data factories for wishlist API tests.
 * Provides valid and invalid payloads for comprehensive test coverage.
 *
 * @module utils/api-fixtures
 */

import type {
  CreateWishlistItemInput,
  UpdateWishlistItemInput,
  ReorderInput,
  MarkAsPurchasedInput,
  WishlistSortField,
  WishlistStore,
} from './api-client'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid store values
 */
export const VALID_STORES: WishlistStore[] = ['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other']

/**
 * Valid currency codes
 */
export const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

/**
 * Valid sort fields including smart sorting
 */
export const VALID_SORT_FIELDS: WishlistSortField[] = [
  'createdAt',
  'title',
  'price',
  'pieceCount',
  'sortOrder',
  'priority',
  'bestValue',
  'expiringSoon',
  'hiddenGems',
]

/**
 * Smart sort fields (WISH-2014)
 */
export const SMART_SORT_FIELDS: WishlistSortField[] = ['bestValue', 'expiringSoon', 'hiddenGems']

/**
 * Standard sort fields
 */
export const STANDARD_SORT_FIELDS: WishlistSortField[] = [
  'createdAt',
  'title',
  'price',
  'pieceCount',
  'sortOrder',
  'priority',
]

/**
 * Valid MIME types for image upload
 */
export const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/**
 * Valid file extensions for image upload
 */
export const VALID_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// ─────────────────────────────────────────────────────────────────────────────
// Test Item Data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sample LEGO sets for testing
 */
export const SAMPLE_SETS = {
  millenniumFalcon: {
    title: 'Millennium Falcon',
    setNumber: '75192',
    store: 'LEGO' as const,
    price: '849.99',
    currency: 'USD',
    pieceCount: 7541,
    priority: 5,
    tags: ['Star Wars', 'UCS', 'Ultimate Collector Series'],
    sourceUrl: 'https://www.lego.com/en-us/product/millennium-falcon-75192',
  },
  atAt: {
    title: 'AT-AT',
    setNumber: '75313',
    store: 'LEGO' as const,
    price: '849.99',
    currency: 'USD',
    pieceCount: 6785,
    priority: 4,
    tags: ['Star Wars', 'UCS'],
    sourceUrl: 'https://www.lego.com/en-us/product/at-at-75313',
  },
  hogwartsCastle: {
    title: "Hogwarts Castle",
    setNumber: '71043',
    store: 'LEGO' as const,
    price: '469.99',
    currency: 'USD',
    pieceCount: 6020,
    priority: 3,
    tags: ['Harry Potter', 'Castle'],
  },
  barweerFalcon: {
    title: 'Millennium Falcon (MOC)',
    setNumber: 'BW-7541',
    store: 'Barweer' as const,
    price: '299.99',
    currency: 'USD',
    pieceCount: 7500,
    priority: 3,
    tags: ['Star Wars', 'MOC', 'Alternative'],
  },
  smallSet: {
    title: 'Small Polybag',
    setNumber: '30654',
    store: 'LEGO' as const,
    price: '4.99',
    currency: 'USD',
    pieceCount: 65,
    priority: 1,
    tags: ['Polybag', 'Small'],
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions - Create Input
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a valid wishlist item input with all fields
 */
export function createValidWishlistItem(
  overrides?: Partial<CreateWishlistItemInput>,
): CreateWishlistItemInput {
  return {
    title: 'Test Set',
    store: 'LEGO',
    setNumber: '12345',
    sourceUrl: 'https://example.com/set',
    imageUrl: 'https://example.com/image.jpg',
    price: '99.99',
    currency: 'USD',
    pieceCount: 500,
    releaseDate: new Date().toISOString(),
    tags: ['test', 'automation'],
    priority: 3,
    notes: 'Test notes',
    ...overrides,
  }
}

/**
 * Create a minimal valid wishlist item (only required fields)
 */
export function createMinimalWishlistItem(
  overrides?: Partial<CreateWishlistItemInput>,
): CreateWishlistItemInput {
  return {
    title: 'Minimal Test Set',
    store: 'LEGO',
    ...overrides,
  }
}

/**
 * Create a wishlist item from a sample set
 */
export function createFromSample(
  sampleKey: keyof typeof SAMPLE_SETS,
  overrides?: Partial<CreateWishlistItemInput>,
): CreateWishlistItemInput {
  return {
    ...SAMPLE_SETS[sampleKey],
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions - Invalid Inputs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invalid create payloads for validation testing
 */
export const INVALID_CREATE_PAYLOADS = {
  missingTitle: {
    payload: { store: 'LEGO' },
    expectedError: 'Title is required',
    field: 'title',
  },
  missingStore: {
    payload: { title: 'Test Set' },
    expectedError: 'Store is required',
    field: 'store',
  },
  emptyTitle: {
    payload: { title: '', store: 'LEGO' },
    expectedError: 'Title is required',
    field: 'title',
  },
  emptyStore: {
    payload: { title: 'Test Set', store: '' },
    expectedError: 'Store is required',
    field: 'store',
  },
  invalidPrice: {
    payload: { title: 'Test Set', store: 'LEGO', price: 'not-a-number' },
    expectedError: 'Price must be a valid decimal',
    field: 'price',
  },
  negativePrice: {
    payload: { title: 'Test Set', store: 'LEGO', price: '-10.00' },
    expectedError: 'Price must be a valid decimal',
    field: 'price',
  },
  invalidUrl: {
    payload: { title: 'Test Set', store: 'LEGO', sourceUrl: 'not-a-url' },
    expectedError: 'Invalid URL',
    field: 'sourceUrl',
  },
  invalidPriority: {
    payload: { title: 'Test Set', store: 'LEGO', priority: 10 },
    expectedError: 'priority',
    field: 'priority',
  },
  negativePriority: {
    payload: { title: 'Test Set', store: 'LEGO', priority: -1 },
    expectedError: 'priority',
    field: 'priority',
  },
  titleTooLong: {
    payload: { title: 'A'.repeat(201), store: 'LEGO' },
    expectedError: 'Title must be less than 200 characters',
    field: 'title',
  },
  notesTooLong: {
    payload: { title: 'Test Set', store: 'LEGO', notes: 'A'.repeat(2001) },
    expectedError: 'Notes must be less than 2000 characters',
    field: 'notes',
  },
} as const

/**
 * Get all invalid create payloads as array for parameterized tests
 */
export function getInvalidCreatePayloads(): Array<{
  name: string
  payload: unknown
  expectedError: string
  field: string
}> {
  return Object.entries(INVALID_CREATE_PAYLOADS).map(([name, data]) => ({
    name,
    ...data,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions - Update Input
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a valid update input
 */
export function createValidUpdate(
  overrides?: Partial<UpdateWishlistItemInput>,
): UpdateWishlistItemInput {
  return {
    title: 'Updated Title',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions - Reorder Input
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a valid reorder input
 */
export function createValidReorderInput(
  items: Array<{ id: string; sortOrder: number }>,
): ReorderInput {
  return { items }
}

/**
 * Invalid reorder payloads for validation testing
 */
export const INVALID_REORDER_PAYLOADS = {
  emptyItems: {
    payload: { items: [] },
    expectedError: 'At least one item is required',
  },
  missingId: {
    payload: { items: [{ sortOrder: 0 }] },
    expectedError: 'Invalid item ID',
  },
  invalidId: {
    payload: { items: [{ id: 'not-a-uuid', sortOrder: 0 }] },
    expectedError: 'Invalid item ID',
  },
  negativeSortOrder: {
    payload: { items: [{ id: '00000000-0000-0000-0000-000000000001', sortOrder: -1 }] },
    expectedError: 'Sort order must be a non-negative integer',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions - Purchase Input
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a valid purchase input
 */
export function createValidPurchaseInput(
  overrides?: Partial<MarkAsPurchasedInput>,
): MarkAsPurchasedInput {
  return {
    pricePaid: '99.99',
    tax: '8.00',
    shipping: '5.99',
    quantity: 1,
    purchaseDate: new Date().toISOString(),
    keepOnWishlist: false,
    ...overrides,
  }
}

/**
 * Create a minimal purchase input
 */
export function createMinimalPurchaseInput(
  overrides?: Partial<MarkAsPurchasedInput>,
): MarkAsPurchasedInput {
  return {
    quantity: 1,
    ...overrides,
  }
}

/**
 * Invalid purchase payloads for validation testing
 */
export const INVALID_PURCHASE_PAYLOADS = {
  invalidPrice: {
    payload: { pricePaid: 'not-a-number' },
    expectedError: 'Price must be a valid decimal',
  },
  negativePrice: {
    payload: { pricePaid: '-10.00' },
    expectedError: 'Price must be >= 0',
  },
  invalidTax: {
    payload: { tax: 'abc' },
    expectedError: 'Tax must be a valid decimal',
  },
  invalidShipping: {
    payload: { shipping: 'abc' },
    expectedError: 'Shipping must be a valid decimal',
  },
  zeroQuantity: {
    payload: { quantity: 0 },
    expectedError: 'Quantity must be at least 1',
  },
  negativeQuantity: {
    payload: { quantity: -1 },
    expectedError: 'Quantity must be at least 1',
  },
  futurePurchaseDate: {
    payload: { purchaseDate: new Date(Date.now() + 86400000 * 7).toISOString() },
    expectedError: 'Purchase date cannot be in the future',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions - Presign Input
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create valid presign parameters
 */
export function createValidPresignParams(
  overrides?: Partial<{ fileName: string; mimeType: string; fileSize: number }>,
) {
  return {
    fileName: 'test-image.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024 * 1024, // 1MB
    ...overrides,
  }
}

/**
 * Invalid presign payloads for validation testing
 */
export const INVALID_PRESIGN_PAYLOADS = {
  missingFileName: {
    params: { mimeType: 'image/jpeg' },
    expectedError: 'File name is required',
  },
  missingMimeType: {
    params: { fileName: 'test.jpg' },
    expectedError: 'MIME type is required',
  },
  invalidMimeType: {
    params: { fileName: 'test.gif', mimeType: 'image/gif' },
    expectedError: 'Unsupported file type',
  },
  invalidExtension: {
    params: { fileName: 'test.exe', mimeType: 'application/octet-stream' },
    expectedError: 'Invalid file extension',
  },
  fileTooLarge: {
    params: { fileName: 'test.jpg', mimeType: 'image/jpeg', fileSize: 20 * 1024 * 1024 },
    expectedError: 'File size exceeds maximum',
  },
  fileTooSmall: {
    params: { fileName: 'test.jpg', mimeType: 'image/jpeg', fileSize: 0 },
    expectedError: 'File cannot be empty',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random UUID for testing
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Generate a unique test item name
 */
export function uniqueItemName(prefix = 'Test'): string {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Create multiple test items for batch testing
 */
export function createTestItems(
  count: number,
  baseOverrides?: Partial<CreateWishlistItemInput>,
): CreateWishlistItemInput[] {
  return Array.from({ length: count }, (_, i) =>
    createValidWishlistItem({
      title: `Test Item ${i + 1}`,
      sortOrder: i,
      ...baseOverrides,
    }),
  )
}
