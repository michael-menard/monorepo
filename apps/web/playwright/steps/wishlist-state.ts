/**
 * Shared wishlist test state for Playwright BDD steps.
 *
 * Centralizes scenario flags so that multiple step definition files
 * (e.g. wishlist.steps.ts, wishlist-reorder.steps.ts) can coordinate
 * MSW behavior via URL query parameters.
 */

export type WishlistScenario = 'empty' | 'error' | 'many' | null

export interface WishlistTestState {
  scenario: WishlistScenario
  delayMs: number | null
}

export const wishlistState: WishlistTestState = {
  scenario: null,
  delayMs: null,
}
