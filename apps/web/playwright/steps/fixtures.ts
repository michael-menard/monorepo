import { test as base } from 'playwright-bdd'

/**
 * Custom fixtures for BDD tests
 * Extend this to add shared state, page objects, or utilities
 */
export const test = base.extend<{
  // Add custom fixtures here as needed
  // Example: authPage: AuthPage
}>({
  // Define fixture implementations here
})
